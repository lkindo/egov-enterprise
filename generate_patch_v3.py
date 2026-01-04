import re
import os

def parse_sql_programs(file_path):
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

def parse_sql_menus(file_path):
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

def get_all_jsps(base_dir):
    jsp_files = {} # filename_lower -> (actual_name, rel_path_normalized)
    jsp_root = os.path.join(base_dir, "api-server", "src", "main", "webapp", "WEB-INF", "jsp")
    for root, dirs, files in os.walk(jsp_root):
        for file in files:
            if file.endswith(".jsp"):
                rel_path = os.path.relpath(os.path.join(root, file), jsp_root)
                norm_rel_path = rel_path.replace("\\", "/")
                jsp_files[file.lower()] = (file, norm_rel_path)
    return jsp_files

def find_best_match(db_name, actual_jsps):
    db_name_lower = db_name.lower()
    
    # 1. Variants based on prefixes and common suffixes
    base_names = [db_name_lower]
    if "egov" in db_name_lower:
        base_names.append(db_name_lower.replace("egov", ""))
    else:
        base_names.append("egov" + db_name_lower)
        
    # Add List <-> Manage variants
    extended_variants = []
    for bn in base_names:
        extended_variants.append(bn)
        if "list" in bn:
            extended_variants.append(bn.replace("list", "manage"))
            extended_variants.append(bn.replace("list", ""))
        if "manage" in bn:
            extended_variants.append(bn.replace("manage", "list"))
            extended_variants.append(bn.replace("manage", ""))
            
    # Try with .jsp suffix
    for v in extended_variants:
        v_jsp = f"{v}.jsp"
        if v_jsp in actual_jsps:
            return actual_jsps[v_jsp]
            
    # Substring search (starts with or contains)
    for act_key, (act_name, act_path) in actual_jsps.items():
        act_base = act_key.replace(".jsp", "")
        if db_name_lower in act_base or act_base in db_name_lower:
            return (act_name, act_path)
            
    return None

def build_tree(menus, programs_dict):
    menu_dict = {m['MENU_NO']: {**m, 'children': [], 'program': programs_dict.get(m['PROGRM_FILE_NM'])} for m in menus}
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

def print_tree_v3(nodes, actual_jsps, depth=0):
    output = ""
    for node in nodes:
        name = node['MENU_NM']
        prog = node['program']
        status = "📁"
        detail = ""
        
        if prog:
            match = find_best_match(prog['PROGRM_FILE_NM'], actual_jsps)
            if match:
                act_name, act_path = match
                act_dir = os.path.dirname(act_path)
                original_path = prog['PROGRM_STRE_PATH'].strip('/')
                
                # Check consistency
                path_match = original_path.lower() == act_dir.lower()
                name_match = prog['PROGRM_FILE_NM'].lower() == act_name.replace(".jsp", "").lower()
                
                if path_match and name_match:
                    status = "✅"
                elif not name_match:
                    status = "⚠️" # Name mismatch
                    detail = f" [명칭변경: {prog['PROGRM_FILE_NM']} -> {act_name.replace('.jsp', '')}]"
                else:
                    status = "⚠️" # Path mismatch
                
                detail += f" (Path: /{act_dir}/)"
            else:
                status = "❌"
                detail = f" (미발견: {prog['PROGRM_FILE_NM']})"
        
        output += f"{'  ' * depth}- {status} {name}{detail}\n"
        output += print_tree_v3(node['children'], actual_jsps, depth + 1)
    return output

if __name__ == "__main__":
    sql_path = r"d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql"
    base_dir = r"d:\project\egov-enterprise"
    
    progs = parse_sql_programs(sql_path)
    progs_dict = {p['PROGRM_FILE_NM']: p for p in progs}
    menus = parse_sql_menus(sql_path)
    actual_jsps = get_all_jsps(base_dir)
    
    # Generate Patch
    path_updates = []
    name_updates = []
    
    for prog in progs:
        db_name = prog['PROGRM_FILE_NM']
        match = find_best_match(db_name, actual_jsps)
        
        if match:
            act_name, act_path = match
            act_dir = os.path.dirname(act_path)
            act_file_base = act_name.replace(".jsp", "")
            original_path = prog['PROGRM_STRE_PATH'].strip('/')
            
            # Path update
            if original_path.lower() != act_dir.lower():
                path_updates.append(f"UPDATE NPROGRMLIST SET PROGRM_STRE_PATH = '/{act_dir}/' WHERE PROGRM_FILE_NM = '{db_name}';")
            
            # Name update (Only if significantly different or specifically requested)
            if db_name.lower() != act_file_base.lower():
                # Update both tables to keep consistency
                name_updates.append(f"-- 파일명 불일치 수정: {db_name} -> {act_file_base}")
                name_updates.append(f"UPDATE NMENUINFO SET PROGRM_FILE_NM = '{act_file_base}' WHERE PROGRM_FILE_NM = '{db_name}';")
                name_updates.append(f"UPDATE NPROGRMLIST SET PROGRM_FILE_NM = '{act_file_base}' WHERE PROGRM_FILE_NM = '{db_name}';")

    with open("patch_menu_metadata_v2.sql", "w", encoding="utf-8") as f:
        f.write("-- 메뉴 및 프로그램 정합성 패치 (v2)\n")
        f.write("BEGIN;\n\n")
        f.write("-- 1. 경로 수정\n")
        f.write("\n".join(path_updates) + "\n\n")
        f.write("-- 2. 파일명 수정\n")
        f.write("\n".join(name_updates) + "\n\n")
        f.write("COMMIT;\n")
        
    # Generate Tree
    tree = build_tree(menus, progs_dict)
    with open("menu_hierarchy_v3.md", "w", encoding="utf-8") as f:
        f.write("# 계층형 메뉴 목록 및 프로그램 연결 현황 (최종)\n\n")
        f.write("범례: ✅ 정상, ⚠️ 수정필요(패치 포함), ❌ 파일 누락, 📁 폴더\n\n")
        f.write(print_tree_v3(tree, actual_jsps))
        
    print(f"Generated {len(path_updates)} path updates and {len(name_updates)//3} name updates.")
    print("Results saved to patch_menu_metadata_v2.sql and menu_hierarchy_v3.md")
