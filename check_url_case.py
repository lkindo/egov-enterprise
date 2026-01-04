
import os
import csv
import sys

# 설정
JSP_ROOT = r'd:\project\egov-enterprise\api-server\src\main\webapp\WEB-INF\jsp'
CSV_PATH = r'd:\project\egov-enterprise\url_dump.csv'
OUTPUT_SQL = r'd:\project\egov-enterprise\fix_case_mismatch.sql'

def get_all_jsp_files(root_dir):
    """
    모든 JSP 파일의 경로(소문자 키)와 실제 경로(대소문자 포함 값)를 맵으로 반환
    """
    jsp_map = {} # Key: filename_lower, Value: {name: RealName.jsp, path: relative/path}
    
    print(f"Scanning JSP files in: {root_dir}")
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.lower().endswith('.jsp'):
                # 상대 경로 계산 (역슬래시를 슬래시로 변환)
                rel_path = os.path.relpath(root, root_dir).replace('\\', '/')
                if rel_path == '.':
                    rel_path = ''
                
                # 키는 파일명(소문자)
                key = file.lower()
                
                # 중복 파일명 체크를 위해 리스트로 저장할 수도 있으나, 
                # 여기서는 파일명 기반 매핑이므로 가장 정확한 매칭을 위해 디렉토리 정보도 활용 등 고려 필요.
                # 하지만 현재 URL 구조는 /path/FileName.do 형태이므로 FileName 일치 여부가 핵심.
                
                jsp_map[key] = {
                    'real_name': file,
                    'dir': rel_path
                }
    return jsp_map

def check_case():
    print("Loading CSV data...")
    try:
        with open(CSV_PATH, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            rows = list(reader)
    except Exception as e:
        print(f"Error reading CSV: {e}")
        return

    jsp_map = get_all_jsp_files(JSP_ROOT)
    
    mismatches = []
    
    print(f"Checking {len(rows)} URL entries against {len(jsp_map)} JSP files...")
    
    for row in rows:
        progrm_file_nm = row['progrm_file_nm']
        url = row['url']
        
        if not url or not url.endswith('.do'):
            continue
            
        # URL에서 예상되는 파일명 추출 (/path/FileName.do -> FileName)
        parts = url.split('/')
        if not parts:
            continue
            
        last_part = parts[-1] 
        expected_filename_no_ext = last_part.replace('.do', '') # FileName
        expected_jsp_name = expected_filename_no_ext + ".jsp"   # FileName.jsp
        
        expected_jsp_lower = expected_jsp_name.lower()
        
        # 파일 시스템에 존재하는지 확인
        if expected_jsp_lower in jsp_map:
            real_file_info = jsp_map[expected_jsp_lower]
            real_name = real_file_info['real_name']
            
            # 대소문자 비교
            if expected_jsp_name != real_name:
                # 불일치 발견!
                correct_url = url.replace(expected_filename_no_ext, real_name.replace('.jsp', ''))
                mismatches.append({
                    'progrm_file_nm': progrm_file_nm,
                    'current_url': url,
                    'real_file_name': real_name,
                    'correct_url': correct_url
                })
        else:
            # 파일이 아예 없는 경우 (경로 문제 등) -> 이번 검증은 대소문자 위주이므로 로깅만
            # print(f"[WARNING] File not found for URL: {url} (Expected: {expected_jsp_name})")
            pass

    # 결과 리포트 및 SQL 생성
    if mismatches:
        print(f"Found {len(mismatches)} case mismatches.")
        
        with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
            f.write("-- Auto-generated SQL to fix case mismatches \n")
            f.write("BEGIN;\n")
            for m in mismatches:
                print(f"[MISMATCH] {m['current_url']} -> Should be matches file: {m['real_file_name']}")
                sql = f"UPDATE NPROGRMLIST SET URL = '{m['correct_url']}' WHERE PROGRM_FILE_NM = '{m['progrm_file_nm']}';\n"
                f.write(sql)
            f.write("COMMIT;\n")
        print(f"SQL file generated at: {OUTPUT_SQL}")
    else:
        print("No case mismatches found. Verify complete.")

if __name__ == "__main__":
    check_case()
