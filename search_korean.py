import os
import re

app_dir = r"d:\project\egov-enterprise\frontend\src\app"
# Keywords to search for in Korean
targets = [
    "그룹관리", "행정코드관리", "공통분류코드", "메뉴생성관리", "공통코드", "공통상세코드", "지식평가관리", 
    "백업관리", "게시판속성관리", "메일발송", "부서업무함관리", "지식정보제공", "게시물통계", "기념일관리", 
    "도움말", "DB서비스모니터링", "배치작업관리", "접속통계", "장애처리결과관리", "회의실관리", "용어사전", 
    "약관관리", "상담관리", "포상승인관리", "휴가승인관리", "메뉴관리리스트", "프로그램관리", "설문관리"
]

results = {}

for root, dirs, files in os.walk(app_dir):
    for file in files:
        if file.endswith("page.tsx") or file.endswith("page.js"):
            full_path = os.path.join(root, file)
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    for target in targets:
                        if target in content:
                            rel_path = os.path.relpath(root, app_dir)
                            route = "/" if rel_path == "." else "/" + rel_path.replace("\\", "/")
                            if target not in results:
                                results[target] = []
                            results[target].append(route)
            except:
                continue

import json
print(json.dumps(results, indent=2, ensure_ascii=False))
