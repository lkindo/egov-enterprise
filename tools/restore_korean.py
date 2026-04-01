#!/usr/bin/env python3
"""
한글 깨짐 복원 스크립트
- 기준 커밋(d628d036)의 올바른 한글 문자열을 추출
- 현재 파일의 깨진 문자열을 주변 코드 컨텍스트로 매칭하여 복원
- 로직 변경(타입, import 등)은 보존

사용법:
  python restore_korean.py [--dry-run] [--commit <hash>]
"""

import subprocess
import re
import sys
import os
import argparse
from pathlib import Path
from typing import Optional

# ─── 설정 ───────────────────────────────────────────────────
GOOD_COMMIT = "d628d036"          # 올바른 한글이 있는 기준 커밋
REPO_ROOT = Path(__file__).parent.parent
FRONTEND_SRC = "frontend/src"
FILE_EXTS = (".ts", ".tsx")

# 한글 유니코드 범위 (가-힣, ㄱ-ㅎ, ㅏ-ㅣ)
KOREAN_PATTERN = re.compile(r"[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]")

# 깨진 문자 패턴 (유니코드이지만 한글이 아닌 특수문자들)
# EUC-KR bytes 잘못 해석된 문자 범위
GARBLED_PATTERN = re.compile(
    r"[\uC000-\uCFFF\uD000-\uD7A2]"  # 특정 한글 완성형 범위 외
    r"|[\u4E00-\u9FFF]"               # CJK 한자
    r"|[\uFF00-\uFFEF]"               # 전각문자
    r"|[?\uFFFD]"                     # 치환 문자
)

# 문자열 리터럴 추출 패턴 (단순 따옴표 기준)
STRING_LITERAL = re.compile(r"(?<![`\\])(['\"])(.+?)\1")

# ─── 유틸리티 ────────────────────────────────────────────────

def contains_korean(text: str) -> bool:
    return bool(KOREAN_PATTERN.search(text))

def is_garbled(text: str) -> bool:
    """
    깨진 문자인지 판단:
    - 비ASCII 문자 포함
    - 한글 유니코드 범위 외 문자가 포함됨
    """
    non_ascii = [c for c in text if ord(c) > 127]
    if not non_ascii:
        return False
    korean = [c for c in non_ascii if KOREAN_PATTERN.match(c)]
    non_korean = [c for c in non_ascii if not KOREAN_PATTERN.match(c)]
    # 한글이 전혀 없는데 비ASCII가 있으면 깨진 것
    # 또는 한글과 비한글이 섞여 있으면 깨진 것
    return len(non_korean) > 0

def get_context(content: str, match_start: int, match_end: int, lines_before: int = 1) -> str:
    """매칭 위치 전후 컨텍스트 추출 (줄 기준)"""
    lines = content[:match_start].split('\n')
    line_num = len(lines) - 1
    start_line = max(0, line_num - lines_before)
    all_lines = content.split('\n')
    ctx_lines = all_lines[start_line:line_num + 1]
    # 마지막 줄에서 문자열 앞 부분만
    last_line = all_lines[line_num]
    prefix = last_line[:match_start - sum(len(l) + 1 for l in all_lines[:line_num])]
    return prefix.strip()

def get_file_from_commit(commit: str, filepath: str) -> Optional[str]:
    """git show로 특정 커밋의 파일 내용 가져오기 (인코딩 내성 처리)"""
    try:
        # bytes로 먼저 받아서 직접 디코딩
        result = subprocess.run(
            ["git", "show", f"{commit}:{filepath}"],
            cwd=str(REPO_ROOT),
            capture_output=True,
        )
        if result.returncode != 0:
            return None
        raw = result.stdout
        # UTF-8 우선, 실패 시 EUC-KR, 최후 replace
        for enc in ("utf-8", "euc-kr", "cp949"):
            try:
                return raw.decode(enc)
            except (UnicodeDecodeError, LookupError):
                continue
        return raw.decode("utf-8", errors="replace")
    except Exception:
        return None

def extract_korean_strings(content: str) -> list[dict]:
    """파일에서 한글 포함 문자열 리터럴 추출 (위치 및 컨텍스트 포함)"""
    results = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        for m in STRING_LITERAL.finditer(line):
            value = m.group(2)
            if contains_korean(value):
                # 컨텍스트: 해당 줄에서 문자열 앞 부분 (key: 코드 패턴)
                prefix = line[:m.start()].strip()
                results.append({
                    'line_num': i,
                    'col': m.start(),
                    'quote': m.group(1),
                    'value': value,
                    'full': m.group(0),
                    'prefix': prefix,
                    'line': line.strip()
                })
    return results

def extract_garbled_strings(content: str) -> list[dict]:
    """파일에서 깨진 문자 포함 문자열 리터럴 추출"""
    results = []
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        for m in STRING_LITERAL.finditer(line):
            value = m.group(2)
            if is_garbled(value):
                prefix = line[:m.start()].strip()
                results.append({
                    'line_num': i,
                    'col': m.start(),
                    'quote': m.group(1),
                    'value': value,
                    'full': m.group(0),
                    'prefix': prefix,
                    'line': line.strip()
                })
    return results

def match_korean_to_garbled(korean_list: list[dict], garbled_list: list[dict]) -> list[tuple]:
    """
    올바른 한글 ↔ 깨진 문자열 매칭
    전략: prefix(앞 코드) 유사도로 매칭
    """
    matches = []
    used_garbled = set()
    
    for k in korean_list:
        best_match = None
        best_score = -1
        
        for idx, g in enumerate(garbled_list):
            if idx in used_garbled:
                continue
            
            # 1순위: prefix 완전 일치
            if k['prefix'] == g['prefix']:
                score = 100 + (1 if k['line_num'] == g['line_num'] else 0)
            else:
                # prefix 부분 일치 점수
                k_words = set(re.split(r'\W+', k['prefix']))
                g_words = set(re.split(r'\W+', g['prefix']))
                common = k_words & g_words
                if not common:
                    continue
                score = len(common) / max(len(k_words), len(g_words)) * 50
            
            # 줄 번호 근접도 보너스 (±5줄 이내)
            line_diff = abs(k['line_num'] - g['line_num'])
            if line_diff <= 5:
                score += (5 - line_diff) * 2
            
            if score > best_score:
                best_score = score
                best_match = (idx, g)
        
        if best_match and best_score >= 10:
            idx, g = best_match
            used_garbled.add(idx)
            matches.append((k, g))
    
    return matches

def restore_file(old_content: str, new_content: str) -> tuple[str, int]:
    """
    old_content의 한글을 기준으로 new_content의 깨진 문자열 복원
    반환값: (복원된 내용, 교체 횟수)
    """
    korean_strings = extract_korean_strings(old_content)
    garbled_strings = extract_garbled_strings(new_content)
    
    if not korean_strings or not garbled_strings:
        return new_content, 0
    
    matches = match_korean_to_garbled(korean_strings, garbled_strings)
    
    if not matches:
        return new_content, 0
    
    # 교체 적용 (뒤에서부터 교체하여 위치 변화 방지)
    result = new_content
    replacements = []
    
    for k, g in matches:
        old_str = g['full']  # 깨진 문자열 전체 ('깨진텍스트')
        new_str = f"{k['quote']}{k['value']}{k['quote']}"  # 올바른 한글 문자열
        replacements.append((old_str, new_str))
    
    count = 0
    for old_str, new_str in replacements:
        if old_str in result:
            result = result.replace(old_str, new_str, 1)
            count += 1
    
    return result, count

# ─── 메인 ────────────────────────────────────────────────────

def get_changed_files(commit: str) -> list[str]:
    """기준 커밋 이후 변경된 frontend/src 파일 목록"""
    result = subprocess.run(
        ["git", "diff", "--name-only", commit, "HEAD", "--", FRONTEND_SRC],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        encoding="utf-8"
    )
    files = result.stdout.strip().split('\n')
    return [f for f in files if f and any(f.endswith(ext) for ext in FILE_EXTS)]

def main():
    parser = argparse.ArgumentParser(description="한글 깨짐 복원 스크립트")
    parser.add_argument("--dry-run", action="store_true", help="실제 수정 없이 미리 보기")
    parser.add_argument("--commit", default=GOOD_COMMIT, help=f"기준 커밋 (기본값: {GOOD_COMMIT})")
    parser.add_argument("--file", help="특정 파일만 처리 (예: frontend/src/app/actions/codeActions.ts)")
    parser.add_argument("--verbose", action="store_true", help="상세 출력")
    args = parser.parse_args()
    
    commit = args.commit
    dry_run = args.dry_run
    
    print(f"🔧 한글 복원 스크립트")
    print(f"   기준 커밋: {commit}")
    print(f"   모드: {'미리보기(dry-run)' if dry_run else '실제 수정'}")
    print("=" * 60)
    
    if args.file:
        changed_files = [args.file]
    else:
        changed_files = get_changed_files(commit)
    
    print(f"📁 처리 대상 파일: {len(changed_files)}개\n")
    
    total_files_fixed = 0
    total_replacements = 0
    skipped = 0
    errors = []
    
    for filepath in changed_files:
        full_path = REPO_ROOT / filepath
        
        # 현재 파일 읽기
        if not full_path.exists():
            skipped += 1
            continue
        
        try:
            raw_bytes = full_path.read_bytes()
            # UTF-8 우선, 실패 시 EUC-KR/CP949, 최후 replace
            current_content = None
            for enc in ("utf-8", "euc-kr", "cp949"):
                try:
                    current_content = raw_bytes.decode(enc)
                    break
                except (UnicodeDecodeError, LookupError):
                    continue
            if current_content is None:
                current_content = raw_bytes.decode("utf-8", errors="replace")
        except Exception as e:
            errors.append(f"{filepath}: 읽기 오류 - {e}")
            continue
        
        # 깨진 문자열이 없으면 스킵
        garbled = extract_garbled_strings(current_content)
        if not garbled:
            if args.verbose:
                print(f"  ✅ {filepath} (깨진 문자열 없음, 스킵)")
            skipped += 1
            continue
        
        # 기준 커밋에서 old 파일 가져오기
        old_content = get_file_from_commit(commit, filepath)
        if not old_content:
            if args.verbose:
                print(f"  ⚠️  {filepath} (기준 커밋에 파일 없음, 스킵)")
            skipped += 1
            continue
        
        # 한글 없으면 스킵
        if not extract_korean_strings(old_content):
            skipped += 1
            continue
        
        # 복원 실행
        restored_content, count = restore_file(old_content, current_content)
        
        if count == 0:
            if args.verbose:
                print(f"  ⚠️  {filepath} (매칭 실패: 깨진={len(garbled)}개)")
            skipped += 1
            continue
        
        # 결과 출력
        print(f"  ✅ {filepath}")
        print(f"     교체: {count}개 문자열")
        
        if args.verbose:
            k_strings = extract_korean_strings(old_content)
            g_strings = extract_garbled_strings(current_content)
            for k, g in match_korean_to_garbled(k_strings, g_strings)[:3]:  # 처음 3개만 미리보기
                print(f"     '{g['value'][:20]}...' → '{k['value'][:20]}...'")
        
        if not dry_run:
            with open(full_path, 'w', encoding='utf-8', newline='') as f:
                f.write(restored_content)
        
        total_files_fixed += 1
        total_replacements += count
    
    print("\n" + "=" * 60)
    print(f"📊 결과:")
    print(f"   수정된 파일: {total_files_fixed}개")
    print(f"   교체된 문자열: {total_replacements}개")
    print(f"   스킵: {skipped}개")
    if errors:
        print(f"   오류: {len(errors)}개")
        for e in errors[:5]:
            print(f"     - {e}")
    
    if dry_run:
        print("\n⚠️  dry-run 모드: 실제 파일은 변경되지 않았습니다.")
        print("   실제 수정: python restore_korean.py")

if __name__ == "__main__":
    main()
