import os
import re

def fix_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Standardize list extraction
    content = re.sub(r'data\?\.resultList \|\| data\?\.list \|\| \[\]', 'data?.list || []', content)
    # Standardize totalPage extraction
    content = re.sub(r'data\?\.totalPage \|\| data\?\.paginationInfo\?\.totalPageCount \|\| 1', 'data?.totalPage || 1', content)
    # Dashboard specific fixes
    content = re.sub(r'data\?\.totalCount \|\| data\?\.total \|\| 0', 'data?.total || 0', content)
    content = re.sub(r'data\?\.totalPage \|\| data\?\.totalPageCount \|\| 1', 'data?.totalPage || 1', content)
    # resultList || list in dashboard
    content = re.sub(r'data\?\.resultList \|\| data\?\.list \|\| \[\]', 'data?.list || []', content)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

log_dir = r'd:\project\egov-enterprise\frontend\src\app\admin\system\logs'
for root, dirs, files in os.walk(log_dir):
    for file in files:
        if file == 'page.tsx':
            full_path = os.path.join(root, file)
            print(f"Fixing: {full_path}")
            fix_file(full_path)
