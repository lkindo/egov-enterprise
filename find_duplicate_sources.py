import os

def get_rel_path(root_dir, search_sub):
    res = {}
    base = os.path.join(root_dir, search_sub)
    if not os.path.exists(base): return {}
    for root, dirs, files in os.walk(base):
        for f in files:
            if f.endswith('.java'):
                full = os.path.join(root, f)
                rel = os.path.relpath(full, base)
                res[rel] = full
    return res

api = get_rel_path(r"d:\project\egov-enterprise\api-server", "src\\main\\java")
common = get_rel_path(r"d:\project\egov-enterprise\common-service", "src\\main\\java")

duplicates = []
for rel in api:
    if rel in common:
        duplicates.append(rel)

if duplicates:
    print(f"Found {len(duplicates)} duplicate Java files:")
    for d in duplicates:
        print(f"- {d}")
else:
    print("No duplicates found.")
