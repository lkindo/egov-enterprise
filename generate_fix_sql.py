
import os
import csv
import json

# 설정
JSP_ROOT = r'd:\project\egov-enterprise\api-server\src\main\webapp\WEB-INF\jsp'
CSV_PATH = r'd:\project\egov-enterprise\url_dump.csv'
VIEW_MAP_PATH = r'd:\project\egov-enterprise\view_url_map.json'
OUTPUT_SQL = r'd:\project\egov-enterprise\final_url_fix.sql'

def normalize_path(path):
    return path.replace('\\', '/')

def main():
    print("Loading data...")
    
    # 1. View -> URL Map 로드
    with open(VIEW_MAP_PATH, 'r', encoding='utf-8') as f:
        view_url_map = json.load(f)
        
    # 2. JSP 파일 스캔 (JSP Filename Lower -> {ViewName})
    jsp_map = {}
    for root, dirs, files in os.walk(JSP_ROOT):
        for file in files:
            if file.lower().endswith('.jsp'):
                # View Name 계산: /WEB-INF/jsp/ 이후의 경로 + 파일명(확장자 제외)
                # rel_path includes filename
                rel_path = os.path.relpath(os.path.join(root, file), JSP_ROOT)
                rel_path = normalize_path(rel_path)
                
                # 확장자 제거 (.jsp)
                view_name = rel_path[:-4] 
                
                # Key: 파일명(소문자) -> Value: ViewName
                # 파일명이 고유하다고 가정 (PROGRM_FILE_NM이 파일명 기준이므로)
                filename_lower = file.lower()
                
                # 중복시 덮어씀 (일단 단순하게)
                jsp_map[filename_lower] = view_name
                
    # 3. DB URL 비교 및 SQL 생성
    print("Processing DB URLs...")
    
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        
    updates = []
    
    stats = {
        'total': 0,
        'jsp_not_found': 0,
        'view_not_found': 0,
        'url_match': 0,
        'update_needed': 0
    }
    
    for row in rows:
        stats['total'] += 1
        progrm_file_nm = row['progrm_file_nm']
        current_url = row['url']
        
        # URL에서 JSP 파일명 추출 (예: /path/File.do -> File)
        # 1. 마지막 / 이후 추출
        basename_with_ext = current_url.split('/')[-1]
        # 2. .do 제거
        basename = basename_with_ext.replace('.do', '')
        
        # 예상 JSP 파일명
        expected_jsp = basename.lower() + ".jsp"
        
        if expected_jsp in jsp_map:
            view_name = jsp_map[expected_jsp]
            
            if view_name in view_url_map:
                real_url = view_url_map[view_name]
                if current_url != real_url:
                    stats['update_needed'] += 1
                    updates.append({
                        'progrm_file_nm': progrm_file_nm,
                        'old': current_url,
                        'new': real_url,
                        'view': view_name
                    })
                else:
                    stats['url_match'] += 1
            else:
                stats['view_not_found'] += 1
        else:
            stats['jsp_not_found'] += 1
            if stats['jsp_not_found'] <= 5:
                print(f"DEBUG: JSP Not Found. Expected: {expected_jsp}")

    print("\nProcessing Stats:")
    print(f"Total Rows in CSV: {stats['total']}")
    print(f"JSP Map Size: {len(jsp_map)}")
    if len(jsp_map) > 0:
        print(f"Sample JSP keys: {list(jsp_map.keys())[:5]}")
    print(f"JSP Found & URL Match (Already Correct): {stats['url_match']}")
    print(f"Update Needed (Case/Path mismatch): {stats['update_needed']}")
    print(f"Skipped - View Name Not Found in Map: {stats['view_not_found']}")
    print(f"Skipped - JSP File Not Found: {stats['jsp_not_found']}")
    
    # SQL 작성
    if updates:
        print(f"Generating SQL for {len(updates)} fixes...")
        with open(OUTPUT_SQL, 'w', encoding='utf-8') as f:
            f.write("-- Fix DB URLs based on actual Controller Mappings\n")
            f.write("BEGIN;\n")
            for u in updates:
                f.write(f"-- View: {u['view']}\n")
                f.write(f"UPDATE NPROGRMLIST SET URL = '{u['new']}' WHERE PROGRM_FILE_NM = '{u['progrm_file_nm']}';\n")
            f.write("COMMIT;\n")
        print(f"SQL generated: {OUTPUT_SQL}")
    else:
        print("No updates needed.")

if __name__ == "__main__":
    main()
