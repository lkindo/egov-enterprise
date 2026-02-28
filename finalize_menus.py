
import re

input_file = r'd:\project\egov-enterprise\nmenuinfo_restore.sql'
output_file = r'd:\project\egov-enterprise\nmenuinfo_final_restore.sql'

mapping = {
    1000000: 40, # 사용자디렉토리/통합인증 -> Identity
    2000000: 40, # 보안 -> Identity
    3000000: 60, # 통계/리포팅 -> Insight
    4000000: 10, # 협업 -> Workspace
    5000000: 20, # 사용자지원 -> Operation Support
    6000000: 50, # 시스템관리 -> System Management
    7000000: 20, # 시스템/서비스연계 -> Operation Support
    8000000: 30, # 자산 관리 -> Content/Knowledge
    9000000: 50  # 요소기술 -> System Management
}

with open(input_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

final_sql = []
# Start with transaction
final_sql.append("BEGIN;")

for line in lines:
    if "('root','dir',0,0,1" in line:
        continue # Already inserted or skip root self-reference
    
    # Extract values: ('Name', 'File', menu_no, upper_menu_no, ...)
    # Use regex to find the VALUES part
    match = re.search(r"VALUES \((.*)\);", line)
    if not match:
        continue
    
    vals_str = match.group(1)
    # Split values carefully (handle quotes and commas)
    # This is a bit tricky, but since the format is consistent:
    # 'NM','FILE',M_NO,U_M_NO,ORDR,'DC','PATH','IMG'
    
    # Simplest way: split and strip
    vals = vals_str.split(',')
    
    menu_no = int(vals[2].strip())
    upper_menu_no = int(vals[3].strip())
    
    # Apply mapping if upper_menu_no is 0
    if upper_menu_no == 0:
        if menu_no in mapping:
            vals[3] = str(mapping[menu_no])
        else:
            # If it's a new root or something else, default to Workspace(10)
            vals[3] = "10"
    
    # Reconstruct the values string
    new_vals_str = ",".join(vals)
    final_sql.append(f"INSERT INTO nmenuinfo (menu_nm, progrm_file_nm, menu_no, upper_menu_no, menu_ordr, menu_dc, relate_image_path, relate_image_nm) VALUES ({new_vals_str});")

final_sql.append("COMMIT;")

with open(output_file, 'w', encoding='utf-8') as f:
    f.write("\n".join(final_sql))

print(f"Generated {len(final_sql)} SQL statements to {output_file}")
