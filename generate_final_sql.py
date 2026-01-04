import os

def generate_final_sql(md_file_path, output_sql_path):
    with open(md_file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    updates = []
    # Skip header lines
    for line in lines:
        if not line.startswith('|') or '메뉴번호' in line or '---|' in line:
            continue
        
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 7:
            continue
            
        menu_no = parts[1]
        progrm_file_nm = parts[3]
        actual_path = parts[5].replace('**', '') # Remove bold markdown if any
        status = parts[6]
        
        # Skip folders or N/A
        if progrm_file_nm == 'dir' or actual_path == '📁 폴더' or 'N/A' in actual_path:
            continue
            
        # 1. Normalize Full Path (Add /egovframework/com/ if missing)
        full_path = actual_path
        if not full_path.startswith('/egovframework/com/'):
            # Prepend /egovframework/com but be careful with leading slash
            if full_path.startswith('/'):
                full_path = '/egovframework/com' + full_path
            else:
                full_path = '/egovframework/com/' + full_path
            
        # 2. PROGRM_STRE_PATH: The physical directory of the JSP
        stre_path = os.path.dirname(full_path)
        if not stre_path.endswith('/'):
            stre_path += '/'
            
        # 3. URL: The action call path (relative to /egovframework/com/, replace .jsp with .do)
        url_path = full_path.replace('/egovframework/com/', '/')
        # Ensure it has a leading slash
        if not url_path.startswith('/'):
            url_path = '/' + url_path
            
        url = url_path.replace('.jsp', '.do')
        
        sql = f"UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '{stre_path}', URL = '{url}' WHERE PROGRM_FILE_NM = '{progrm_file_nm}';"
        updates.append(sql)

    with open(output_sql_path, 'w', encoding='utf-8') as f:
        f.write("-- NPROGRMLIST 최종 경로 현행화 SQL (JSP 파일명 기반 .do 매핑)\n")
        f.write("-- 전수 조사 보고서 기반 자동 생성\n")
        f.write(f"-- 총 {len(updates)}개 항목\n\n")
        f.write("\n".join(updates))
        f.write("\n")

    print(f"Final SQL generated to {output_sql_path} ({len(updates)} statements)")

if __name__ == "__main__":
    md_path = r'd:\project\egov-enterprise\final_comprehensive_verification.md'
    sql_path = r'd:\project\egov-enterprise\final_update_nprogrmlist.sql'
    generate_final_sql(md_path, sql_path)
