import os
import re

def generate_recovery_sql(dml_file_path, output_sql_path):
    with open(dml_file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to find NPROGRMLIST inserts
    # INSERT INTO NPROGRMLIST(PROGRM_FILE_NM, PROGRM_STRE_PATH, PROGRM_KOREAN_NM, PROGRM_DC, URL) 
    # VALUES ('EgovMain','/cmm/main/','메인페이지','메인페이지','/cmm/main/mainPage.do');
    pattern = r"INSERT INTO NPROGRMLIST.*?VALUES\s*\('(.*?)','.*?','.*?','.*?','(.*?)'\);"
    matches = re.findall(pattern, content, re.DOTALL | re.IGNORECASE)

    updates = []
    found_programs = set()
    
    for prog_nm, url in matches:
        prog_nm = prog_nm.strip()
        url = url.strip()
        sql = f"UPDATE NPROGRMLIST SET URL = '{url}' WHERE PROGRM_FILE_NM = '{prog_nm}';"
        updates.append(sql)
        found_programs.add(prog_nm)

    with open(output_sql_path, 'w', encoding='utf-8') as f:
        f.write("-- NPROGRMLIST URL 복구 SQL (.do 주소 현행화)\n")
        f.write("-- 원본 com_DML_postgres.sql 기반 추출\n\n")
        f.write("\n".join(updates))
        f.write("\n")

    print(f"Total recovery statements: {len(updates)}")

if __name__ == "__main__":
    dml_path = r'd:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql'
    sql_path = r'd:\project\egov-enterprise\recover_nprogrmlist_urls.sql'
    generate_recovery_sql(dml_path, sql_path)
