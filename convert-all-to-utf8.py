# -*- coding: utf-8 -*-
"""
프로젝트 전체 Java 파일들을 UTF-8 로 변환하는 스크립트
CP949 로 저장된 파일들을 UTF-8 로 변환하며, 이미 UTF-8 인 파일들은 건너뜀
"""
import os
import sys
import chardet

# 콘솔 출력을 UTF-8 로 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def detect_encoding(file_path):
    """파일의 인코딩을 감지"""
    try:
        with open(file_path, 'rb') as f:
            raw_data = f.read(10000)  # 처음 10KB 만 읽어서 감지
            result = chardet.detect(raw_data)
            return result['encoding'], result['confidence']
    except Exception as e:
        return None, 0

def convert_file(file_path, verbose=False):
    """CP949 파일을 UTF-8 로 변환"""
    # 인코딩 감지
    detected_enc, confidence = detect_encoding(file_path)
    
    if detected_enc is None:
        if verbose:
            print(f"  [UNKNOWN] {file_path}")
        return None
    
    # 이미 UTF-8 인 경우 건너뜀
    if detected_enc.upper() in ['UTF-8', 'UTF8']:
        if verbose:
            print(f"  [UTF-8] {file_path}")
        return 'skipped'
    
    # CP949 또는 EUC-KR 인 경우 변환
    if detected_enc.upper() in ['CP949', 'EUC-KR', 'ISO-8859-2', 'WINDOWS-1252']:
        try:
            # CP949 로 읽기
            with open(file_path, 'r', encoding='cp949') as f:
                content = f.read()
            
            # UTF-8 로 저장 (BOM 없음)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            if verbose:
                print(f"  [CONVERTED] {file_path} ({detected_enc} -> UTF-8)")
            return 'converted'
        except UnicodeDecodeError as e:
            # UTF-8 로 이미 저장된 경우
            if verbose:
                print(f"  [UTF-8] {file_path}")
            return 'skipped'
        except Exception as e:
            if verbose:
                print(f"  [ERROR] {file_path} - {e}")
            return 'error'
    
    # 기타 인코딩
    if verbose:
        print(f"  [OTHER ({detected_enc})] {file_path}")
    return 'other'

def main():
    base_dir = r"D:\project\egov-enterprise"
    
    # 변환할 모듈 디렉토리
    target_dirs = [
        os.path.join(base_dir, "common-core", "src", "main", "java"),
        os.path.join(base_dir, "common-domain", "src", "main", "java"),
        os.path.join(base_dir, "common-service", "src", "main", "java"),
        os.path.join(base_dir, "common-security", "src", "main", "java"),
        os.path.join(base_dir, "api-server", "src", "main", "java"),
        os.path.join(base_dir, "api-server", "src", "test", "java"),
    ]
    
    total_count = 0
    converted_count = 0
    skipped_count = 0
    error_count = 0
    other_count = 0
    
    print("=" * 60)
    print("프로젝트 전체 Java 파일 UTF-8 인코딩 변환")
    print("=" * 60)
    
    for target_dir in target_dirs:
        if not os.path.exists(target_dir):
            print(f"\n[WARN] 디렉토리 없음: {target_dir}")
            continue
        
        print(f"\n[DIR] 처리 중: {target_dir}")
        print("-" * 60)
        
        for root, dirs, files in os.walk(target_dir):
            # .git 또는 build 폴더는 건너뜀
            if '.git' in root or 'build' in root:
                continue
                
            for file in files:
                if file.endswith('.java'):
                    file_path = os.path.join(root, file)
                    total_count += 1
                    result = convert_file(file_path, verbose=True)
                    
                    if result == 'converted':
                        converted_count += 1
                    elif result == 'skipped':
                        skipped_count += 1
                    elif result == 'error':
                        error_count += 1
                    else:
                        other_count += 1
    
    print("\n" + "=" * 60)
    print("변환 완료 요약")
    print("=" * 60)
    print(f"총 파일 수: {total_count}개")
    print(f"[OK] 변환 완료 (CP949->UTF-8): {converted_count}개")
    print(f"[SKIP] 건너뜀 (이미 UTF-8): {skipped_count}개")
    print(f"[ERR] 오류 발생: {error_count}개")
    print(f"[OTHER] 기타 인코딩: {other_count}개")
    print("=" * 60)

if __name__ == "__main__":
    # chardet 라이브러리 확인
    try:
        import chardet
    except ImportError:
        print("chardet 라이브러리가 설치되어 있지 않습니다.")
        print("다음 명령어로 설치하세요: pip install chardet")
        sys.exit(1)
    
    main()
