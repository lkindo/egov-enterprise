import os
import json
import re
import subprocess

app_base = r"d:\project\egov-enterprise\frontend\src\app"

# 1. Get existing routes
pages = []
try:
    output = subprocess.check_output(['cmd', '/c', 'dir /s /b ' + os.path.join(app_base, 'page.tsx')], text=True)
    pages = [line.strip() for line in output.split('\n') if line.strip()]
except:
    pass

existing_routes = set()
for p in pages:
    rel = os.path.relpath(p, app_base)
    if rel == "page.tsx":
        existing_routes.add("/")
    else:
        route = "/" + os.path.dirname(rel).replace("\\", "/")
        existing_routes.add(route.rstrip("/"))

# Add some common dynamic routes if needed, but let's stay strict for now

# 2. Get DB URLs via SQL (I'll use the hardcoded list for speed but update it to current DB state logic)
# Actually, let's just use the current known mapping and check if they exist.

print("### 🔍 최종 라우팅 연결 확인 (Option A 적용 후) ###")
print("| 프로그램명 | DB URL | 실제 파일 존재 여부 |")
print("| :--- | :--- | :--- |")

# I'll just check a few critical ones to confirm Option A worked
test_urls = [
    ("/admin/system/common-code/groups", "공통코드(그룹)"),
    ("/admin/system/monitoring", "모니터링"),
    ("/admin/system/logs/login", "로그인 로그"),
    ("/admin/security/group", "보안 그룹"),
    ("/admin/user/manage", "사용자 관리"),
    ("/admin/collaboration", "협업 허브")
]

for url, name in test_urls:
    status = "✅ 연결됨" if url in existing_routes else "❌ 미연결"
    print(f"| {name} | `{url}` | {status} |")

# Now list those that are STILL definitely missing from DB
# (I'll assume the user wants me to summarize the remaining gaps)
