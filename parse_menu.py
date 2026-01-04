import re
import json

def parse_sql(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract NPROGRMLIST
    # INSERT INTO NPROGRMLIST(PROGRM_FILE_NM, PROGRM_STRE_PATH, PROGRM_KOREAN_NM, PROGRM_DC, URL) VALUES ('...', '...', '...', '...', '...');
    programs = {}
    prog_matches = re.finditer(r"INSERT INTO NPROGRMLIST\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in prog_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        vals = [v.strip().strip("'") for v in re.findall(r"'[^']*'|[^,]+", match.group(2))]
        prog_data = dict(zip(cols, vals))
        programs[prog_data['PROGRM_FILE_NM']] = prog_data

    # Extract NMENUINFO
    menus = []
    menu_matches = re.finditer(r"INSERT INTO NMENUINFO\s*\((.*?)\)\s*VALUES\s*\((.*?)\);", content, re.DOTALL | re.IGNORECASE)
    for match in menu_matches:
        cols = [c.strip() for c in match.group(1).split(',')]
        raw_vals = re.findall(r"'[^']*'|[^,]+", match.group(2))
        vals = [v.strip().strip("'").replace('&amp;', '&') for v in raw_vals]
        menu_data = dict(zip(cols, vals))
        menus.append(menu_data)

    return programs, menus

def build_tree(menus, programs):
    menu_dict = {m['MENU_NO']: {**m, 'children': [], 'program': programs.get(m['PROGRM_FILE_NM'])} for m in menus}
    tree = []
    for menu_no, item in menu_dict.items():
        upper = item['UPPER_MENU_NO']
        if upper == '0' or upper not in menu_dict:
            tree.append(item)
        else:
            menu_dict[upper]['children'].append(item)
    
    # Sort by MENU_ORDR
    def sort_tree(nodes):
        nodes.sort(key=lambda x: int(x.get('MENU_ORDR', 0)))
        for node in nodes:
            sort_tree(node['children'])
            
    sort_tree(tree)
    return tree

def print_tree(nodes, depth=0):
    output = ""
    for node in nodes:
        url = node['program']['URL'] if node['program'] else "N/A"
        output += f"{'  ' * depth}- {node['MENU_NM']} (No: {node['MENU_NO']}, File: {node['PROGRM_FILE_NM']}, URL: {url})\n"
        output += print_tree(node['children'], depth + 1)
    return output

if __name__ == "__main__":
    sql_path = r"d:\project\egov-enterprise\egovframe-template-common-components-5.0.0\script\dml\postgres\com_DML_postgres.sql"
    progs, menus = parse_sql(sql_path)
    tree = build_tree(menus, progs)
    
    with open("menu_hierarchy.md", "w", encoding="utf-8") as f:
        f.write("# 계층형 메뉴 목록 및 프로그램 연결 현황\n\n")
        f.write(print_tree(tree))
    
    print("Menu hierarchy saved to menu_hierarchy.md")
