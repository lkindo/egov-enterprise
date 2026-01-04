
import re
import os

def generate_update_sql(md_file_path, output_sql_path):
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
        actual_path = parts[5]
        status = parts[6]
        
        # Skip directories
        if progrm_file_nm == 'dir' or actual_path == '📁 폴더':
            continue
            
        # Normalize actual_path if it doesn't start with /egovframework/com/
        # But we must exclude cases that already have it.
        # Report has paths like /uat/uia/EgovLoginUsr.jsp
        # We want /egovframework/com/uat/uia/EgovLoginUsr.jsp
        
        path_to_use = actual_path
        if not path_to_use.startswith('/egovframework/com/'):
            # Some paths in report are /cmm/uss/umt/... we should keep /cmm/ but maybe prefix with /egovframework/com/?
            # Actually, standardizing everything to /egovframework/com/ seems safest if that's where they are.
            # Let's check where /cmm/ is usually located.
            # Based on earlier dir search: WEB-INF\jsp\egovframework\com\uat\uia\EgovLoginUsr.jsp
            # So everything is under /egovframework/com/
            path_to_use = '/egovframework/com' + path_to_use
            
        # PROGRM_STRE_PATH is the directory
        stre_path = os.path.dirname(path_to_use)
        if not stre_path.endswith('/'):
            stre_path += '/'
            
        url = path_to_use
        
        sql = f"UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '{stre_path}', URL = '{url}' WHERE PROGRM_FILE_NM = '{progrm_file_nm}';"
        updates.append(sql)

    with open(output_sql_path, 'w', encoding='utf-8') as f:
        f.write("-- NPROGRMLIST 프로그램 경로 현행화 SQL\n")
        f.write("-- 전수 조사 보고서(final_comprehensive_verification.md) 기반 생성\n\n")
        f.write("\n".join(updates))
        f.write("\n")

if __name__ == "__main__":
    md_path = r'd:\project\egov-enterprise\final_comprehensive_verification.md'
    sql_path = r'd:\project\egov-enterprise\update_nprogrmlist_paths.sql'
    generate_update_sql(md_path, sql_path)
    print(f"SQL generated to {sql_path}")
