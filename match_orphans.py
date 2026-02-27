import os

app_dir = r"d:\project\egov-enterprise\frontend\src\app"
targets = {
    "기업회원관리": "/admin/user/entrprs-mber",
    "일반회원관리": "/admin/user/mber",
    "프로그램관리": "/admin/system/programs",
    "장애신청관리": "/admin/system/trobl-reqst",
    "업무사용자관리": "/admin/user/manage",
    "배너관리": "/admin/system/banner"
}

results = []

for root, dirs, files in os.walk(app_dir):
    for file in files:
        if file.endswith("page.tsx") or file.endswith("page.js"):
            full_path = os.path.join(root, file)
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    for kor, db_url in targets.items():
                        if kor in content:
                            rel_path = os.path.relpath(root, app_dir)
                            route = "/" if rel_path == "." else "/" + rel_path.replace("\\", "/")
                            results.append({"kor": kor, "db_url": db_url, "real_route": route})
            except:
                continue

import json
print(json.dumps(results, indent=2, ensure_ascii=False))
