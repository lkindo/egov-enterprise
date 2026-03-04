import os
import re
from pathlib import Path

# 설정
TARGET_ROOT = r"d:\project\egov-enterprise"
MODULES = ["api-server", "common-core", "common-domain", "common-security", "common-service", "frontend"]
EXTENSIONS = {".java", ".xml", ".yml", ".ts", ".tsx", ".css", ".scss"}
EXCLUDE_DIRS = {"src/test", "node_modules", ".git", ".gradle", "build"}

# 깨진 유니코드 패턴 (보통 \ufffd 로 표시됨)
UNICODE_REPLACEMENT_CHAR = "\ufffd"

def clean_file(file_path):
    try:
        # 1. 인코딩 확인 및 읽기 (UTF-8, CP949 순차 시도)
        content = None
        for encoding in ['utf-8', 'cp949', 'euc-kr']:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                break
            except UnicodeDecodeError:
                continue
        
        if content is None:
            return False, "Encoding Error"

        original_content = content
        modified = False

        # 2. 깨진 유니코드 문자 탐지 (단순 알림 또는 공백 제거)
        if UNICODE_REPLACEMENT_CHAR in content:
            # 깨진 문자가 발견되면 수동 확인을 위해 주석 처리하거나 기록 (여기서는 제거 시도)
            content = content.replace(UNICODE_REPLACEMENT_CHAR, "")
            modified = True

        # 3. 불필요한 공백 제거 (Trailing Whitespace)
        lines = content.splitlines()
        cleaned_lines = [line.rstrip() for line in lines]
        
        # 4. 연속된 빈 줄 정리 (최대 1줄만 허용)
        content = "\n".join(cleaned_lines)
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        if content != original_content:
            modified = True

        # 5. UTF-8 (BOM 없이) 저장
        if modified:
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            return True, "Cleaned"
        
        return False, "Already Clean"

    except Exception as e:
        return False, str(e)

def main():
    report = {}
    
    for module in MODULES:
        module_path = os.path.join(TARGET_ROOT, module)
        if not os.path.exists(module_path):
            continue
            
        print(f"Processing module: {module}...")
        count_processed = 0
        count_modified = 0
        
        for root, dirs, files in os.walk(module_path):
            # 제외 디렉토리 필터링
            dirs[:] = [d for d in dirs if not any(ex in os.path.join(root, d).replace('\\', '/') for ex in EXCLUDE_DIRS)]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in EXTENSIONS:
                    file_path = os.path.join(root, file)
                    count_processed += 1
                    is_modified, _ = clean_file(file_path)
                    if is_modified:
                        count_modified += 1
        
        report[module] = {"processed": count_processed, "modified": count_modified}
        print(f"  - {module} done: {count_processed} files scanned, {count_modified} modified.")

    print("\n--- FINAL REPORT ---")
    for mod, stats in report.items():
        print(f"{mod}: Scanned={stats['processed']}, Modified={stats['modified']}")

if __name__ == "__main__":
    main()
