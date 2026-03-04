import os
import re

# 설정
TARGET_ROOT = r"d:\project\egov-enterprise\frontend"
EXTENSIONS = {".ts", ".tsx", ".css", ".scss", ".json", ".js"}
# frontend에서 확실히 제외해야 할 폴더들
EXCLUDE_DIRS = {"node_modules", ".next", "dist", "build", ".git", "out"}

def clean_file(file_path):
    try:
        content = None
        for encoding in ['utf-8', 'cp949', 'euc-kr']:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                break
            except UnicodeDecodeError:
                continue
        
        if content is None: return False
        
        original_content = content
        # 1. 깨진 유니코드 제거
        content = content.replace("\ufffd", "")
        # 2. 줄 끝 공백 제거
        lines = content.splitlines()
        content = "\n".join([line.rstrip() for line in lines])
        # 3. 연속 빈 줄 정리
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
                f.write(content)
            return True
        return False
    except:
        return False

def main():
    print(f"Starting focused cleanup for Frontend...")
    count_processed = 0
    count_modified = 0
    
    for root, dirs, files in os.walk(TARGET_ROOT):
        # 제외 폴더 필터링
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in EXTENSIONS:
                file_path = os.path.join(root, file)
                count_processed += 1
                if clean_file(file_path):
                    count_modified += 1
                    
    print(f"\n--- FRONTEND REPORT ---")
    print(f"Scanned: {count_processed}")
    print(f"Modified: {count_modified}")

if __name__ == "__main__":
    main()
