import re
import os

def extract_all_data(sql_path):
    with open(sql_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract Programs
    prog_dict = {}
    prog_matches = re.finditer(r"INSERT INTO NPROGRMLIST\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in prog_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        raw_vals = re.findall(r"'[^']*'|[^,]+", match.group(2))
        vals = [v.strip().strip("'").replace('&amp;', '&') for v in raw_vals]
        data = dict(zip(cols, vals))
        if 'PROGRM_FILE_NM' in data:
            prog_dict[data['PROGRM_FILE_NM']] = data

    # Extract Menus
    menu_list = []
    menu_matches = re.finditer(r"INSERT INTO NMENUINFO\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in menu_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        raw_vals = re.findall(r"'[^']*'|[^,]+", match.group(2))
        vals = [v.strip().strip("'").replace('&amp;', '&') for v in raw_vals]
        data = dict(zip(cols, vals))
        menu_list.append(data)
        
    return menu_list, prog_dict

def get_jsp_map(root_dir):
    jsp_map = {}
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(".jsp"):
                rel_path = os.path.relpath(os.path.join(root, file), root_dir)
                jsp_map[file.lower()] = (file, rel_path.replace("\\", "/"))
    return jsp_map

if __name__ == "__main__":
    base_dir = r"d:\project\egov-enterprise"
    sql_path = os.path.join(base_dir, "egovframe-template-common-components-5.0.0", "script", "dml", "postgres", "com_DML_postgres.sql")
    
    menus, progs = extract_all_data(sql_path)
    
    # Projects JSPs
    project_jsp_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp")
    project_jsps = get_jsp_map(project_jsp_root)
    
    # Template JSPs
    template_jsp_root = os.path.join(base_dir, "egovframe-template-common-components-5.0.0", "src", "main", "webapp", "WEB-INF", "jsp")
    template_jsps = get_jsp_map(template_jsp_root)
    
    with open("full_verification_source.txt", "w", encoding="utf-8") as f:
        f.write("MENU_NO|MENU_NM|UPPER_MENU_NO|PROGRM_FILE_NM|ORIG_URL|ORIG_STRE_PATH\n")
        for m in menus:
            m_no = m.get('MENU_NO', '')
            m_nm = m.get('MENU_NM', '')
            u_no = m.get('UPPER_MENU_NO', '')
            p_nm = m.get('PROGRM_FILE_NM', '')
            p_inf = progs.get(p_nm, {})
            url = p_inf.get('URL', '')
            path = p_inf.get('PROGRM_STRE_PATH', '')
            f.write(f"{m_no}|{m_nm}|{u_no}|{p_nm}|{url}|{path}\n")

    print("Extraction complete. Output: full_verification_source.txt")
