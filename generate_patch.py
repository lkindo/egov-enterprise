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
    jsp_files = {} # filename -> rel_path
    jsp_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp")
    for root, dirs, files in os.walk(jsp_root):
        for file in files:
            if file.endswith(".jsp"):
                rel_path = os.path.relpath(os.path.join(root, file), jsp_root)
                jsp_files[file.lower()] = rel_path.replace("\\", "/")
    return jsp_files

def build_tree(menus, programs, actual_jsps):
    menu_dict = {m['MENU_NO']: {**m, 'children': [], 'program': next((p for p in programs if p['PROGRM_FILE_NM'] == m['PROGRM_FILE_NM']), None)} for m in menus}
    tree = []
    for menu_no, item in menu_dict.items():
        upper = item['UPPER_MENU_NO']
        if upper == '0' or upper not in menu_dict:
            tree.append(item)
        else:
            menu_dict[upper]['children'].append(item)
    
    def sort_tree(nodes):
        nodes.sort(key=lambda x: int(x.get('MENU_ORDR', 0)))
        for node in nodes:
            sort_tree(node['children'])
            
    sort_tree(tree)
    return tree

def print_tree_with_status(nodes, actual_jsps, depth=0):
    output = ""
    for node in nodes:
        status = "📁"
        name = node['MENU_NM']
        prog = node['program']
        info = ""
        
        if prog:
            filename = f"{prog['PROGRM_FILE_NM']}.jsp".lower()
            if filename in actual_jsps:
                actual_rel_path = actual_jsps[filename]
                actual_dir = os.path.dirname(actual_rel_path)
                original_path = prog['PROGRM_STRE_PATH'].strip('/')
                
                if original_path.lower() == actual_dir.lower():
                    status = "✅"
                else:
                    status = "⚠️" # Location mismatch
                info = f" (URL: {prog['URL']}, File: {prog['PROGRM_FILE_NM']})"
            else:
                status = "❌" # Missing
                info = f" (URL: {prog['URL']}, File: {prog['PROGRM_FILE_NM']})"
        
        output += f"{'  ' * depth}- {status} {name}{info}\n"
        output += print_tree_with_status(node['children'], actual_jsps, depth + 1)
    return output

def parse_menus(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    menus = []
    menu_matches = re.finditer(r"INSERT INTO NMENUINFO\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in menu_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        raw_vals = re.findall(r"'[^']*'|[^,]+", match.group(2))
        vals = [v.strip().strip("'").replace('&amp;', '&') for v in raw_vals]
        menu_data = dict(zip(cols, vals))
        menus.append(menu_data)
    return menus

if __name__ == "__main__":
    sql_path = r"d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql"
    base_dir = r"d:\project\egov-enterprise"
    
    progs = parse_sql(sql_path)
    menus = parse_menus(sql_path)
    actual_jsps = get_all_jsps(base_dir)
    
    # Generate SQL Patch
    updates = []
    for prog in progs:
        name = prog['PROGRM_FILE_NM']
        filename = f"{name}.jsp".lower()
        if filename in actual_jsps:
            actual_rel_path = actual_jsps[filename]
            actual_dir = os.path.dirname(actual_rel_path)
            original_path = prog['PROGRM_STRE_PATH'].strip('/')
            if original_path.lower() != actual_dir.lower():
                updates.append(f"UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '/{actual_dir}/' WHERE PROGRM_FILE_NM = '{name}';")

    with open("patch_menu_metadata.sql", "w", encoding="utf-8") as f:
        f.write("-- 메뉴 프로그램 경로 및 파일명 정합성 패치\n")
        f.write("\n".join(updates))
    
    # Generate Tree View
    tree = build_tree(menus, progs, actual_jsps)
    with open("menu_hierarchy_v2.md", "w", encoding="utf-8") as f:
        f.write("# 계층형 메뉴 목록 및 프로그램 연결 현황 (상태 포함)\n\n")
        f.write("범례: ✅ 정상, ⚠️ 경로 불일치(자동수정 대상), ❌ 파일 누락, 📁 폴더\n\n")
        f.write(print_tree_with_status(tree, actual_jsps))
        
    print(f"Generated {len(updates)} SQL updates.")
    print("Results saved to patch_menu_metadata.sql and menu_hierarchy_v2.md")
