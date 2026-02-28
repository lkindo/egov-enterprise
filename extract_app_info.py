import os
import re

root_path = r'd:\project\egov-enterprise\frontend\src\app'
results = []

# Regex to find title or breadcrumb labels in page.tsx
title_pattern = re.compile(r'title=["\'](.*?)["\']')
breadcrumb_pattern = re.compile(r'label:\s*["\'](.*?)["\']')

for root, dirs, files in os.walk(root_path):
    if 'page.tsx' in files:
        page_path = os.path.join(root, 'page.tsx')
        rel_path = os.path.relpath(root, root_path).replace('\\', '/')
        
        with open(page_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            titles = title_pattern.findall(content)
            breadcrumbs = breadcrumb_pattern.findall(content)
            
            results.append({
                'path': rel_path,
                'titles': titles,
                'breadcrumbs': breadcrumbs
            })

for res in results:
    t_str = "|".join(res['titles'])
    b_str = "|".join(res['breadcrumbs'])
    print(f"Path: /{res['path']} | Titles: {t_str} | Breadcrumbs: {b_str}")
