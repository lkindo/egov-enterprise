# -*- coding: utf-8 -*-
"""
common-service 모듈의 CP949 파일들을 UTF-8 로 변환
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
        
        return True
    except UnicodeDecodeError:
        # 이미 UTF-8 인 경우
        return False
    except Exception as e:
        print(f"Error: {file_path} - {e}")
        return None

def main():
    base_dir = r"D:\project\egov-enterprise\common-service\src\main\java"
    
    converted_count = 0
    skipped_count = 0
    error_count = 0
    total_count = 0
    
    print("=" * 60)
    print("common-service 모듈 CP949 -> UTF-8 변환")
    print("=" * 60)
    
    for root, dirs, files in os.walk(base_dir):
        # .git 또는 build 폴더는 건너뜀
        if '.git' in root or 'build' in root:
            continue
            
        for file in files:
            if file.endswith('.java'):
                file_path = os.path.join(root, file)
                total_count += 1
                result = convert_file(file_path)
                
                if result is True:
                    converted_count += 1
                    print(f"[OK] {file_path}")
                elif result is False:
                    skipped_count += 1
                else:
                    error_count += 1
    
    print("\n" + "=" * 60)
    print("변환 완료 요약")
    print("=" * 60)
    print(f"총 파일 수: {total_count}개")
    print(f"[OK] 변환 완료 (CP949->UTF-8): {converted_count}개")
    print(f"[SKIP] 건너뜀 (이미 UTF-8): {skipped_count}개")
    print(f"[ERR] 오류 발생: {error_count}개")
    print("=" * 60)

if __name__ == "__main__":
    main()
