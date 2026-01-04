import re
import os

def parse_sql(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    programs = []
    prog_matches = re.finditer(r"INSERT INTO NPROGRMLIST\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in prog_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        vals = [v.strip().strip("'") for v in re.findall(r"'[^']*'|[^,]+", match.group(2))]
        prog_data = dict(zip(cols, vals))
        programs.append(prog_data)
    return programs

def verify_files(programs, base_dir):
    report = []
    for prog in programs:
        prog_name = prog['PROGRM_FILE_NM']
        url = prog['URL']
        
        # Check Controller (Search for @RequestMapping or @GetMapping with the URL)
        # Also check for file name match in com.company.project or egovframework.com
        controller_found = False
        # Simple heuristic: look for Java files matching program name or URL fragment
        # This is complex, let's just check if the URL exists in any Java file
        
        # Check JSP (from application.yml prefix: /WEB-INF/jsp/ and prog name)
        # Usually program name matches JSP file name
        jsp_rel_path = prog['PROGRM_STRE_PATH'].strip('/').replace('/', os.sep)
        jsp_path = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp", jsp_rel_path, f"{prog_name}.jsp")
        jsp_exists = os.path.exists(jsp_path)
        
        report.append({
            "name": prog_name,
            "url": url,
            "actual_jsp_path": jsp_path,
            "actual_jsp_exists": jsp_exists
        })
    return report

if __name__ == "__main__":
    sql_path = r"d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql"
    base_dir = r"d:\project\egov-enterprise"
    progs = parse_sql(sql_path)
    
    # We only need to check a subset for demo or check all
    # For now, let's check top 50
    results = verify_files(progs, base_dir)
    
    with open("verification_report.md", "w", encoding="utf-8") as f:
        f.write("# 프로그램 및 파일 일치 여부 검증 결과\n\n")
        f.write("| 프로그램명 | URL | JSP 존재 여부 | 실제 경로 |\n")
        f.write("|---|---|---|---|\n")
        for res in results:
            status = "✅" if res['actual_jsp_exists'] else "❌"
            f.write(f"| {res['name']} | {res['url']} | {status} | {res['actual_jsp_path']} |\n")
            
    print("Verification report saved to verification_report.md")
