import re
import os

def parse_sql(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    programs = []
    prog_matches = re.finditer(r"INSERT INTO NPROGRMLIST\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in prog_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        vals = [v.strip().strip("'").replace('&amp;', '&') for v in re.findall(r"'[^']*'|[^,]+", match.group(2))]
        prog_data = dict(zip(cols, vals))
        programs.append(prog_data)
    return programs

def get_all_jsps(base_dir):
    jsp_files = {}
    jsp_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp")
    for root, dirs, files in os.walk(jsp_root):
        for file in files:
            if file.endswith(".jsp"):
                rel_path = os.path.relpath(os.path.join(root, file), jsp_root)
                jsp_files[file] = rel_path
    return jsp_files

if __name__ == "__main__":
    sql_path = r"d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql"
    base_dir = r"d:\project\egov-enterprise"
    
    progs = parse_sql(sql_path)
    actual_jsps = get_all_jsps(base_dir)
    
    with open("verification_report_v2.md", "w", encoding="utf-8") as f:
        f.write("# 프로그램 및 JSP 파일 매핑 검증 결과 (V2)\n\n")
        f.write("| 프로그램명 | DB 설정 경로 | 실제 파일 위치 | 일치 여부 |\n")
        f.write("|---|---|---|---|\n")
        
        for prog in progs:
            name = prog['PROGRM_FILE_NM']
            db_path = prog['PROGRM_STRE_PATH'].strip('/') + "/" + name + ".jsp"
            db_path = db_path.replace("//", "/")
            
            actual_rel_path = actual_jsps.get(f"{name}.jsp")
            
            if actual_rel_path:
                actual_rel_path = actual_rel_path.replace("\\", "/")
                # Normalize DB path for comparison
                norm_db_path = db_path.replace("\\", "/").lower().strip('/')
                norm_actual_path = actual_rel_path.lower().strip('/')
                
                status = "✅ 일치" if norm_db_path == norm_actual_path else "⚠️ 위치 다름"
                f.write(f"| {name} | {db_path} | {actual_rel_path} | {status} |\n")
            else:
                f.write(f"| {name} | {db_path} | 미발견 | ❌ 누락 |\n")
                
    print("Verification report V2 saved to verification_report_v2.md")
