import re
import os
import sys

# Force UTF-8 for output
sys.stdout.reconfigure(encoding='utf-8')

def check_menus():
    app_root = r"d:\project\egov-enterprise\frontend\src\app"
    existing_routes = set()
    
    if not os.path.exists(app_root):
        print(f"Error: {app_root} not found.")
        return

    for root, dirs, files in os.walk(app_root):
        if "page.tsx" in files:
            rel = os.path.relpath(root, app_root)
            if rel == ".":
                existing_routes.add("/")
            else:
                route = "/" + rel.replace("\\", "/")
                existing_routes.add(route.lower()) # Normalize to lower for case-insensitive match

    sql_file = r"d:\project\egov-enterprise\frontend\db_dump.sql"
    
    if not os.path.exists(sql_file):
        print(f"Error: {sql_file} not found.")
        return

    with open(sql_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.split('\n')
    in_values = False
    
    results = []
    
    for line in lines:
        if 'INSERT INTO public."nmenuinfo"' in line:
            in_values = True
            continue
        if in_values and line.strip().startswith('('):
            # Parts between single quotes
            parts = re.findall(r"'(.*?)'|NULL", line)
            if len(parts) >= 10:
                name = parts[0]
                prog = parts[1]
                m_no = parts[2]
                route = parts[9]
                
                # Filter categories and top level domains
                is_dir = prog == 'dir'
                has_route = route and route != 'dir' and route != 'NULL'
                
                if not is_dir or has_route:
                    if not has_route:
                        results.append((name, "(NULL)", "Path Missing"))
                    else:
                        clean_route = route.lower().rstrip('/')
                        if clean_route not in existing_routes:
                            # Check singular/plural variants
                            alt = clean_route + 's' if not clean_route.endswith('s') else clean_route[:-1]
                            if alt not in existing_routes:
                                results.append((name, route, "File Missing"))
                                
        if in_values and line.strip().endswith(';'):
            in_values = False

    print("| Menu Name | DB Route (modern_route) | Status |")
    print("| :--- | :--- | :--- |")
    for r in results:
        # Use simple text instead of emoji to avoid encoding issues
        print(f"| {r[0]} | {r[1]} | {r[2]} |")

if __name__ == "__main__":
    check_menus()
