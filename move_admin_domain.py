import os
import shutil
import re

ROOT_DIR = r"d:\project\egov-enterprise\.worktrees\admin-migration"
WORKSPACE_DIR = os.path.join(ROOT_DIR, "module-workspace")
OPERATION_DIR = os.path.join(ROOT_DIR, "module-operation")
ADMIN_DIR = os.path.join(ROOT_DIR, "module-system-admin")

moves = [
    (WORKSPACE_DIR, "domain/popup", ADMIN_DIR, "domain/system/content/popup"),
    (WORKSPACE_DIR, "service/popup", ADMIN_DIR, "service/system/content/popup"),
    (WORKSPACE_DIR, "api/controller/popup", ADMIN_DIR, "api/controller/system/content/popup"),

    (WORKSPACE_DIR, "domain/banner", ADMIN_DIR, "domain/system/content/banner"),
    (WORKSPACE_DIR, "service/banner", ADMIN_DIR, "service/system/content/banner"),
    (WORKSPACE_DIR, "api/controller/banner", ADMIN_DIR, "api/controller/system/content/banner"),

    (WORKSPACE_DIR, "domain/community", ADMIN_DIR, "domain/system/content/community"),
    (WORKSPACE_DIR, "service/community", ADMIN_DIR, "service/system/content/community"),
    (WORKSPACE_DIR, "api/controller/community", ADMIN_DIR, "api/controller/system/content/community"),

    (WORKSPACE_DIR, "domain/qna", ADMIN_DIR, "domain/system/service/qna"),
    (WORKSPACE_DIR, "service/qna", ADMIN_DIR, "service/system/service/qna"),
    (WORKSPACE_DIR, "api/controller/qna", ADMIN_DIR, "api/controller/system/service/qna"),

    (OPERATION_DIR, "domain/survey", ADMIN_DIR, "domain/system/service/survey"),
    (OPERATION_DIR, "service/survey", ADMIN_DIR, "service/system/service/survey"),
    (OPERATION_DIR, "api/controller/survey", ADMIN_DIR, "api/controller/system/service/survey"),

    (OPERATION_DIR, "domain/consult", ADMIN_DIR, "domain/system/service/consult"),
    (OPERATION_DIR, "service/consult", ADMIN_DIR, "service/system/service/consult"),
    (OPERATION_DIR, "api/controller/consult", ADMIN_DIR, "api/controller/system/service/consult"),
]

class_renames = {} 

def path_to_pkg(path):
    return "com.company.project." + path.replace('/', '.')

def move_full_dir(src_mod, rel_src, dest_mod, rel_dest):
    src_base = os.path.join(src_mod, "src", "main", "java", "com", "company", "project", os.path.normpath(rel_src))
    dest_base = os.path.join(dest_mod, "src", "main", "java", "com", "company", "project", os.path.normpath(rel_dest))
    
    if not os.path.isdir(src_base):
        return

    os.makedirs(dest_base, exist_ok=True)
    
    old_pkg = path_to_pkg(rel_src)
    new_pkg = path_to_pkg(rel_dest)
    
    for item in os.listdir(src_base):
        src_item = os.path.join(src_base, item)
        if os.path.isfile(src_item) and item.endswith('.java'):
            class_name = item[:-5]
            class_renames[f"{old_pkg}.{class_name}"] = f"{new_pkg}.{class_name}"
            shutil.move(src_item, os.path.join(dest_base, item))
        elif os.path.isdir(src_item):
            move_full_dir(src_mod, f"{rel_src}/{item}", dest_mod, f"{rel_dest}/{item}")

for src_mod, rel_src, dest_mod, rel_dest in moves:
    move_full_dir(src_mod, rel_src, dest_mod, rel_dest)

# Note: Survey has controller inside api/controller/survey/CnsltController for some reason in earlier search!
# Let me just move CnsltController specifically if it's there.
# WAIT: my previous search found CnsltController inside api/controller/survey.
cnslt_src = os.path.join(OPERATION_DIR, "src", "main", "java", "com", "company", "project", "api", "controller", "survey", "CnsltController.java")
cnslt_dest_dir = os.path.join(ADMIN_DIR, "src", "main", "java", "com", "company", "project", "api", "controller", "system", "service", "consult")
if os.path.exists(cnslt_src):
    os.makedirs(cnslt_dest_dir, exist_ok=True)
    class_renames["com.company.project.api.controller.survey.CnsltController"] = "com.company.project.api.controller.system.service.consult.CnsltController"
    shutil.move(cnslt_src, os.path.join(cnslt_dest_dir, "CnsltController.java"))


# Find all java files
all_java_files = []
for mod in ["module-workspace", "module-operation", "module-system-admin", "module-core-iam", "api-server", "common-core", "common-security"]:
    d = os.path.join(ROOT_DIR, mod, "src")
    if os.path.isdir(d):
        for root, dirs, files in os.walk(d):
            for file in files:
                if file.endswith(".java"):
                    all_java_files.append(os.path.join(root, file))

pkg_mapping = {}
for old_full, new_full in class_renames.items():
    old_p = old_full.rsplit('.', 1)[0]
    new_p = new_full.rsplit('.', 1)[0]
    if old_p not in pkg_mapping:
        pkg_mapping[old_p] = new_p

for jf in all_java_files:
    with open(jf, 'r', encoding='utf-8') as f:
        content = f.read()
    
    orig_content = content
    
    m = re.search(r'^\s*package\s+(com\.company\.project\.[a-zA-Z0-9_.]+)\s*;', content, re.MULTILINE)
    if m:
        curr_pkg = m.group(1)
        filename = os.path.basename(jf)
        classname = filename[:-5]
        old_full = f"{curr_pkg}.{classname}"
        if old_full in class_renames:
            new_pkg = class_renames[old_full].rsplit('.', 1)[0]
            content = content.replace(f"package {curr_pkg};", f"package {new_pkg};")
            curr_pkg = new_pkg 

    for old_full, new_full in class_renames.items():
        content = re.sub(r'import\s+' + re.escape(old_full) + r'\s*;', f'import {new_full};', content)
        content = re.sub(r'(?<=[^\w\.])' + re.escape(old_full) + r'(?=[^\w\.])', new_full, content)

    for old_p, new_p in pkg_mapping.items():
        content = re.sub(r'import\s+' + re.escape(old_p) + r'\.\*\s*;', f'import {new_p}.*;', content)

    if content != orig_content:
        with open(jf, 'w', encoding='utf-8') as f:
            f.write(content)

print(f"Migration script finished. Renamed {len(class_renames)} classes.")
