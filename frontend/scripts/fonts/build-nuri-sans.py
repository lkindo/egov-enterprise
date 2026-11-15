"""Nuri Sans — 저장소의 Pretendard 가변 글꼴을 글자 범위별 웹 글꼴로 나눈다.

왜: 한글 전체를 담은 가변 글꼴(약 2MB) 하나를 모든 화면이 받으면 첫 방문이 느리다(Lighthouse 모의 첫 그림 11초,
2026-11-15 실측). 브라우저는 `unicode-range` 가 화면 글자와 겹치는 조각만 받으므로, 화면 문구에 자주 나오는 글자를
앞 조각에 모으면 업무 화면 대부분이 수백 KB 이하로 그려진다.

라이선스: Pretendard 는 SIL OFL 1.1 이며 'Pretendard'·'Source'·'Inter'·'M PLUS 1' 이 예약 글꼴 이름(RFN)이다.
글자를 덜어 낸 조각은 OFL 의 수정본이라 예약 이름을 쓸 수 없다 — 글꼴 안의 이름(name 표)과 CSS 이름을
'Nuri Sans' 로 바꾸고, 저작권 고지(nameID 0)와 라이선스(13·14)는 그대로 둔다. OFL.txt 를 조각 옆에 둔다.

조각(선언 범위는 서로 겹치지 않는다 — 겹치면 브라우저가 앞 조각을 받는 동안 다음 조각까지 받는다):
  core       기본 라틴·일반 문장부호·기본 화살표·한글 호환 자모(입력 중 조합 글자)
  sym        그 밖의 기호·CJK 문장부호·전각
  ext        그 밖의 비한글(라틴 확장·그리스·키릴·사설 영역)
  ko-1       frontend/src 화면 문구(주석 제외)에 가장 자주 나오는 음절 450자
  ko-2       화면 문구에 나오는 나머지 음절
  ko-b<N>    한글 음절 영역을 연속 구간으로 나눈 조각. 선언 범위는 구간 전체(화면 문구 음절 제외)이고, 담는 글자는
             그 구간의 KS X 1001 완성형 음절뿐이다 — 이름·제목 같은 사용자 자료.
드문 음절(KS X 1001 밖 8,800여 자)은 화면 문구에 쓰인 것(ko-1·ko-2)만 담고 나머지는 시스템 글꼴로 그린다(Pretendard Std 와 같은 선택). 모두 담으려면 그 글자를
빼고 범위를 적어야 해 첫 화면이 받는 CSS 가 gzip 15KB 로 세 배가 되고(2026-11-15 실측), 구간 범위에 담으면 사용자 자료가 있는 화면이
구간마다 드문 글자 수백 개를 함께 받는다. 구간 범위에 드문 음절이 들어 있어 그 글자가 나오면 구간 조각을 받은 뒤 다음 글꼴로 넘어간다.

사용법(frontend 에서):
  python -m venv .venv-fonts && .venv-fonts/Scripts/pip install -r scripts/fonts/requirements.txt
  .venv-fonts/Scripts/python -I scripts/fonts/build-nuri-sans.py
출력: src/app/fonts/nuri-sans/*.woff2, src/app/fonts/nuri-sans.css, scripts/fonts/nuri-sans.manifest.json
조각 구성은 실행 시점의 화면 문구 빈도로 정해진다 — 문구가 바뀌어도 다시 만들 필요는 없다(덜 자주 쓰는 조각을 더 받을 뿐).
"""
import argparse
import hashlib
import io
import json
import os
import re
import shutil
import sys
from collections import Counter

import fontTools
from fontTools import subset
from fontTools.ttLib import TTFont

FAMILY = "Nuri Sans"
POSTSCRIPT_FAMILY = "NuriSans"
RESERVED_NAMES = ("pretendard", "source", "inter", "m plus")
# 글꼴을 가리키는 이름 — 예약 이름을 쓸 수 없는 자리다(1·3·4·6·16·17·18·21·22·25, 256 이상은 굵기 인스턴스·STAT 이름).
# 그 밖의 기록(저작권 0·상표 고지 7·제작사 8·디자이너 9·주소 11·12·라이선스 13·14)은 원저작자를 밝히는 고지라 원문 그대로 둔다 —
# 이름을 바꾸면 'Nuri Sans 는 원저작자의 상표다' 처럼 거짓 문장이 된다.
FONT_NAME_IDS = {1, 3, 4, 6, 16, 17, 18, 21, 22, 25}
KO_1_SIZE = 450
# 구간 조각 하나가 담는 KS X 1001 음절 수(약 40KB). 사용자 자료가 많은 화면도 구간 조각 전부(약 330KB)를 넘지 않는다.
BLOCK_GLYPHS = 220
HANGUL = range(0xAC00, 0xD7A4)
# core 범위 — 업무 화면이 거의 늘 쓰는 비한글. 화면 문구 실측(2026-11-15, 주석 제외): 가운뎃점·줄표·작은따옴표·말줄임표·화살표.
#   한글 호환 자모는 입력 중 조합 글자(ㄱ→가)라 늘 필요하다. 원문자·낫표·경고 기호는 문구에 거의 없어 sym 으로 보낸다 —
#   그 25자가 core 를 60KB 에서 86KB 로 키웠다.
CORE_RANGES = [
    (0x0000, 0x00FF), (0x0131, 0x0131), (0x0152, 0x0153), (0x02BB, 0x02BC), (0x02C6, 0x02C6), (0x02DA, 0x02DA),
    (0x02DC, 0x02DC), (0x2000, 0x206F), (0x20A9, 0x20A9), (0x20AC, 0x20AC), (0x2122, 0x2122), (0x2190, 0x2199),
    (0x2212, 0x2212), (0x2248, 0x2248), (0x2260, 0x2265), (0x3130, 0x318F), (0xFEFF, 0xFEFF), (0xFFFD, 0xFFFD),
]
# sym 범위 — 그 밖의 기호·CJK 문장부호·전각. 나머지 비한글(라틴 확장·그리스·키릴·사설 영역)은 ext.
SYM_RANGES = [(0x2100, 0x2BFF), (0x3000, 0x33FF), (0xFE30, 0xFE4F), (0xFF00, 0xFFEF)]


def is_ks_x_1001(cp):
    try:
        return len(chr(cp).encode("euc_kr")) == 2
    except UnicodeEncodeError:
        return False


def strip_comments(text):
    """TS/TSX 에서 주석만 뺀다 — 따옴표·템플릿 문자열 안의 `/*`·`//` 는 문구로 남긴다(정규식으로 지우면 문구까지 지운다).

    JSX 본문 글자는 코드 상태로 남는다(한글은 식별자에 쓰지 않으므로 코드 상태의 한글은 JSX 문구다). 정규식 리터럴·JSX 본문의
    따옴표처럼 문자열 시작으로 잘못 보이는 꼴은 빈도를 조금 흐릴 뿐 결과 글꼴의 글자 수록에는 영향이 없다 — 화면 문구 음절이
    아니어도 KS X 1001 음절은 구간 조각에 담긴다.
    """
    out = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        two = text[i:i + 2]
        if two == "//":
            end = text.find("\n", i)
            i = n if end < 0 else end
        elif two == "/*":
            end = text.find("*/", i + 2)
            i = n if end < 0 else end + 2
        elif ch in "'\"`":
            # 따옴표 문자열은 줄을 넘지 않는다 — JSX 본문의 아포스트로피(Don't)가 아래 줄까지 삼키지 않게 줄 끝에서 멈춘다.
            j = i + 1
            while j < n and text[j] != ch and (ch == "`" or text[j] != "\n"):
                j += 2 if text[j] == "\\" else 1
            out.append(text[i:j + 1])
            i = j + 1
        else:
            out.append(ch)
            i += 1
    return "".join(out)


def source_syllable_counts(src_dir):
    """화면 문구의 음절 빈도. 주석은 뺀다 — 이 저장소는 한국어 주석이 문구보다 열 배 많아(2026-11-15 실측) 순위를 흐린다."""
    counts = Counter()
    for root, dirs, files in os.walk(src_dir):
        dirs[:] = sorted(d for d in dirs if d != "__tests__" and not d.startswith("generated"))
        for name in sorted(files):
            if not name.endswith((".ts", ".tsx", ".json")) or ".test." in name or name.startswith("generated-"):
                continue
            with open(os.path.join(root, name), encoding="utf-8", errors="ignore") as handle:
                text = handle.read()
            if not name.endswith(".json"):
                text = strip_comments(text)
            counts.update(ord(ch) for ch in re.findall(r"[가-힣]", text))
    return counts


def chunks(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]


def plan(cmap, counts):
    """(이름, 담을 글자, 선언 범위) 목록. 구간 조각만 선언 범위가 담을 글자보다 넓다."""
    all_cps = set(cmap)
    hangul = {cp for cp in all_cps if cp in HANGUL}
    non_hangul = all_cps - hangul
    core = sorted(cp for cp in non_hangul if any(lo <= cp <= hi for lo, hi in CORE_RANGES))
    sym = sorted(cp for cp in non_hangul - set(core) if any(lo <= cp <= hi for lo, hi in SYM_RANGES))
    ext = sorted(non_hangul - set(core) - set(sym))
    ranked = [cp for cp, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0])) if cp in hangul]
    ko_1, ko_2 = sorted(ranked[:KO_1_SIZE]), sorted(ranked[KO_1_SIZE:])
    used = set(ranked)
    slices = [(name, cps, cps) for name, cps in
              (("core", core), ("sym", sym), ("ext", ext), ("ko-1", ko_1), ("ko-2", ko_2))]
    common = sorted(cp for cp in hangul - used if is_ks_x_1001(cp))
    parts = chunks(common, BLOCK_GLYPHS)
    for i, part in enumerate(parts):
        start = HANGUL.start if i == 0 else part[0]
        end = (parts[i + 1][0] - 1) if i + 1 < len(parts) else HANGUL.stop - 1
        declared = [cp for cp in range(start, end + 1) if cp not in used]
        slices.append((f"ko-b{i}", part, declared))
    covered = sum(counts[cp] for cp in ko_1) / max(1, sum(counts[cp] for cp in ranked))
    return slices, covered


def runs(cps):
    out = []
    for cp in sorted(cps):
        if out and out[-1][1] == cp - 1:
            out[-1][1] = cp
        else:
            out.append([cp, cp])
    return out


def unicode_range(cps):
    return ", ".join(f"U+{lo:04X}" if lo == hi else f"U+{lo:04X}-{hi:04X}" for lo, hi in runs(cps))


def rename(font, slice_name):
    """글꼴 이름에서 예약 이름을 지운다(OFL RFN). 원저작자 고지는 원문 그대로 둔다."""
    table = font["name"]
    version = table.getDebugName(5) or ""
    replacements = {
        1: FAMILY, 4: FAMILY, 16: FAMILY,
        6: f"{POSTSCRIPT_FAMILY}-Regular", 25: POSTSCRIPT_FAMILY,
        3: f"{version.split(';')[0].replace('Version ', '')};{POSTSCRIPT_FAMILY}-{slice_name}",
    }

    def names_font(record):
        return record.nameID in FONT_NAME_IDS or record.nameID >= 256

    for record in list(table.names):
        if record.nameID in replacements:
            record.string = replacements[record.nameID]
        elif names_font(record):
            text = record.toUnicode()
            for old, new in (("PretendardVariable", POSTSCRIPT_FAMILY), ("Pretendard Variable", FAMILY), ("Pretendard", FAMILY)):
                text = text.replace(old, new)
            record.string = text
    table.removeNames(nameID=10)
    table.setName(f"{FAMILY}: a subset web font modified from an SIL Open Font License 1.1 font. See OFL.txt and FONTLOG.txt.",
                  10, 3, 1, 0x409)
    for record in table.names:
        if not names_font(record):
            continue
        lowered = record.toUnicode().lower()
        for reserved in RESERVED_NAMES:
            if re.search(rf"\b{re.escape(reserved)}\b", lowered):
                raise SystemExit(f"예약 이름이 남았다: nameID {record.nameID} = {record.toUnicode()!r}")


def build_slice(source, slice_name, cps):
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["*"]
    options.name_IDs = ["*"]
    options.name_legacy = True
    options.name_languages = ["*"]
    options.notdef_outline = True
    # 저장 때 head.modified 를 현재 시각으로 바꾸지 않는다 — 같은 입력이면 같은 바이트가 나와야 생성 기록의 해시가 뜻을 가진다.
    font = TTFont(source, recalcTimestamp=False)
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=cps)
    subsetter.subset(font)
    rename(font, slice_name)
    font.flavor = "woff2"
    buffer = io.BytesIO()
    font.save(buffer)
    data = buffer.getvalue()
    check = TTFont(io.BytesIO(data))
    got = set(check.getBestCmap())
    if got != set(cps):
        raise SystemExit(f"{slice_name}: 조각의 글자 표가 계획과 다르다(빠짐 {len(set(cps) - got)}, 더함 {len(got - set(cps))})")
    return data


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    frontend = os.path.dirname(os.path.dirname(here))
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default=os.path.join(here, "PretendardVariable.woff2"))
    parser.add_argument("--src-dir", default=os.path.join(frontend, "src"))
    parser.add_argument("--out-dir", default=os.path.join(frontend, "src", "app", "fonts", "nuri-sans"))
    parser.add_argument("--css", default=os.path.join(frontend, "src", "app", "fonts", "nuri-sans.css"))
    parser.add_argument("--manifest", default=os.path.join(here, "nuri-sans.manifest.json"))
    args = parser.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

    with open(args.source, "rb") as handle:
        source_bytes = handle.read()
    source_font = TTFont(io.BytesIO(source_bytes))
    axis = next(a for a in source_font["fvar"].axes if a.axisTag == "wght")
    weight = f"{int(axis.minValue)} {int(axis.maxValue)}"
    slices, covered = plan(source_font.getBestCmap(), source_syllable_counts(args.src_dir))

    os.makedirs(args.out_dir, exist_ok=True)
    expected = {f"nuri-sans-{name}.woff2" for name, _, _ in slices}
    for stale in os.listdir(args.out_dir):
        if stale.endswith(".woff2") and stale not in expected:
            os.remove(os.path.join(args.out_dir, stale))

    declared_all = sorted(cp for _, _, declared in slices for cp in declared)
    if len(declared_all) != len(set(declared_all)):
        raise SystemExit("선언 범위가 겹친다")
    entries = []
    for name, cps, declared in slices:
        data = build_slice(io.BytesIO(source_bytes), name, cps)
        file_name = f"nuri-sans-{name}.woff2"
        with open(os.path.join(args.out_dir, file_name), "wb") as handle:
            handle.write(data)
        entries.append({"name": name, "file": file_name, "glyphs": len(cps), "bytes": len(data),
                        "sha256": hashlib.sha256(data).hexdigest(), "unicodeRange": unicode_range(declared),
                        "glyphRange": unicode_range(cps)})
        print(f"{name:8s} 글자 {len(cps):5d}  선언 {len(declared):5d}  {len(data):8d}B")

    # OFL 1.1 은 수정본에도 저작권 고지와 라이선스 전문을 함께 두게 한다. 무엇을 바꿨는지는 FONTLOG 에 적는다.
    shutil.copyfile(os.path.join(here, "OFL.txt"), os.path.join(args.out_dir, "OFL.txt"))
    version = source_font["name"].getDebugName(5)
    with open(os.path.join(args.out_dir, "FONTLOG.txt"), "w", encoding="utf-8", newline="\n") as handle:
        handle.write(
            f"{FAMILY} — FONTLOG\n\n"
            f"Original: Pretendard Variable ({version}), Copyright (c) 2021 Kil Hyung-jin, SIL Open Font License 1.1 (see OFL.txt).\n"
            f"Modification: subset by Unicode range into {len(entries)} web font files for this application;\n"
            "Hangul syllables outside KS X 1001 (except those used in this application's text) are not included.\n"
            "Outlines, metrics, variation axis and OpenType layout features of the included glyphs are unchanged.\n"
            f"Renamed to '{FAMILY}' because 'Pretendard', 'Source', 'Inter' and 'M PLUS 1' are Reserved Font Names.\n"
            "Copyright, trademark, designer and license records in the name table are kept as in the original.\n"
            f"Generator: frontend/scripts/fonts/build-nuri-sans.py (fontTools {fontTools.version}).\n"
        )

    rel_dir = os.path.relpath(args.out_dir, os.path.dirname(args.css)).replace(os.sep, "/")
    lines = [
        "/* 생성물 — frontend/scripts/fonts/build-nuri-sans.py 가 만든다. 직접 고치지 않는다.",
        " * Nuri Sans 는 Pretendard Variable 을 글자 범위별로 나눈 OFL 수정본이다(예약 이름이라 이름을 바꿨다, 라이선스는 nuri-sans/OFL.txt).",
        " * 범위는 서로 겹치지 않는다 — 브라우저는 화면 글자와 겹치는 조각만 받는다. KS X 1001 밖 드문 음절은 화면 문구에 쓰인 것만 담고",
        " * 나머지는 시스템 글꼴로 그린다. */",
    ]
    for entry in entries:
        lines += [
            "@font-face {",
            f"  font-family: '{FAMILY}';",
            "  font-style: normal;",
            f"  font-weight: {weight};",
            "  font-display: optional;",
            f"  src: url('./{rel_dir}/{entry['file']}') format('woff2');",
            f"  unicode-range: {entry['unicodeRange']};",
            "}",
        ]
    with open(args.css, "w", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(lines) + "\n")

    manifest = {
        "family": FAMILY,
        "source": {"file": os.path.relpath(args.source, frontend).replace(os.sep, "/"),
                   "sha256": hashlib.sha256(source_bytes).hexdigest(),
                   "version": source_font["name"].getDebugName(5)},
        "generator": {"fonttools": fontTools.version},
        "weight": weight,
        "ko1CoverageOfSourceSyllables": round(covered, 4),
        "slices": entries,
    }
    with open(args.manifest, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(manifest, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    total = sum(e["bytes"] for e in entries)
    print(f"조각 {len(entries)}개 합계 {total}B, ko-1 이 화면 문구 음절 출현의 {covered:.1%}")


if __name__ == "__main__":
    main()
