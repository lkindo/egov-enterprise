# -*- coding: utf-8 -*-
"""
CP949 로 저장된 Java 파일들을 UTF-8 로 변환하는 스크립트
"""
import os
import sys

def convert_file(file_path):
    """CP949 파일을 UTF-8 로 변환"""
    try:
        # CP949 로 읽기
        with open(file_path, 'r', encoding='cp949') as f:
            content = f.read()
        
        # UTF-8 로 저장 (BOM 없음)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"변환 완료: {file_path}")
        return True
    except UnicodeDecodeError as e:
        print(f"인코딩 오류 ({file_path}): {e}")
        return False
    except Exception as e:
        print(f"오류 ({file_path}): {e}")
        return False

def main():
    base_dir = r"D:\project\egov-enterprise"
    
    # 변환할 모듈 디렉토리
    target_dirs = [
        os.path.join(base_dir, "common-service", "src", "main", "java"),
        os.path.join(base_dir, "common-domain", "src", "main", "java"),
    ]
    
    converted_count = 0
    error_count = 0
    
    for target_dir in target_dirs:
        if not os.path.exists(target_dir):
            print(f"디렉토리 없음: {target_dir}")
            continue
            
        for root, dirs, files in os.walk(target_dir):
            for file in files:
                if file.endswith('.java'):
                    file_path = os.path.join(root, file)
                    if convert_file(file_path):
                        converted_count += 1
                    else:
                        error_count += 1
    
    print(f"\n=== 변환 완료 ===")
    print(f"성공: {converted_count}개")
    print(f"실패: {error_count}개")

if __name__ == "__main__":
    main()
