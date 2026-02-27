import os
import json
import re
import sys

# Ensure stdout uses utf-8
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

mismatched_urls = [
  "/admin/collaboration/all-schdul", "/admin/collaboration/bbs-master-infs", "/admin/collaboration/dept-job",
  "/admin/collaboration/dept-job-bx", "/admin/collaboration/dept-schdul", "/admin/collaboration/indvdl-schdul",
  "/admin/collaboration/leader-schdul", "/admin/collaboration/sndng-mail", "/admin/dam/kno",
  "/admin/help/faq", "/admin/help/qna", "/admin/integration/cntc-instt", "/admin/integration/cntc-message",
  "/admin/integration/cntc-sttus", "/admin/integration/system-cntc", "/admin/knowledge/request-offer",
  "/admin/security/authority", "/admin/security/dept-authority", "/admin/security/group",
  "/admin/security/groups", "/admin/security/role", "/admin/stats/bbs-stats", "/admin/stats/dta-use-stats",
  "/admin/stats/reprt-stats", "/admin/stats/user", "/admin/stats/user-stats", "/admin/survey/manage",
  "/admin/system/administ-code", "/admin/system/archives", "/admin/system/backup", "/admin/system/banner",
  "/admin/system/batch", "/admin/system/bkmk-menu", "/admin/system/cmmn-cl-code", "/admin/system/common-code/details",
  "/admin/system/common-code/groups", "/admin/system/common-code/zip", "/admin/system/ctsnn", "/admin/system/holiday",
  "/admin/system/instt-code-recptn", "/admin/system/logs/login", "/admin/system/menu-creat", "/admin/system/menus",
  "/admin/system/programs", "/admin/system/reward", "/admin/system/server", "/admin/system/server-eqpmn",
  "/admin/system/site-mapng", "/admin/system/sys-history", "/admin/system/trobl-process", "/admin/system/trobl-reqst",
  "/admin/user/annvrsry", "/admin/user/annvrsry-main", "/admin/user/bndt", "/admin/user/bndt-ceck",
  "/admin/user/cpyrht-prtc-policy", "/admin/user/dept-manage", "/admin/user/entrprs-mber", "/admin/user/event-cmpgn",
  "/admin/user/event-rcrpt", "/admin/user/event-reqst", "/admin/user/hpcm", "/admin/user/indvdl-info-policy",
  "/admin/user/indvdlpge-cntnts", "/admin/user/login-policy", "/admin/user/manage", "/admin/user/mber",
  "/admin/user/meeting", "/admin/user/mtg-place", "/admin/user/mtg-place-resve", "/admin/user/stplat",
  "/admin/user/user-absnce", "/admin/user/word-dicary", "/admin/uss/ion/ctsnn", "/admin/uss/ion/external-hr",
  "/admin/uss/ion/main-image", "/admin/uss/ion/reward", "/admin/uss/ion/vcatn", "/admin/uss/olh/admin-word",
  "/admin/uss/olp/cnslt", "/admin/uss/olp/cnslt-answer", "/admin/utility/com-utl-http-mon",
  "/admin/utility/com-utl-process-mon", "/admin/utility/db-mntrng", "/admin/utility/file-sys-mntrng",
  "/admin/utility/login-session", "/admin/utility/mntrng-server", "/admin/utility/ntwrk-svc-mntrng",
  "/admin/utility/proxy-svc", "/admin/utility/trsmrcv-mntrng", "/cop/com/selectBBSUseInfs",
  "/cop/ncm/selectMyNcrdList", "/cop/ncm/selectNcrdList", "/cop/sms/selectSmsList",
  "/cop/smt/dsm/selectDiaryList", "/cop/smt/mrm/selectMemoReportList", "/cop/smt/mtm/selectTodoList",
  "/cop/smt/wmr/selectReportList", "/cop/tpl/selectTemplateList"
]

all_pages_file = r"d:\project\egov-enterprise\all_pages.txt"
app_base = r"d:\project\egov-enterprise\frontend\src\app"

pages = []
for encoding in ['utf-16', 'utf-8', 'cp949']:
    try:
        with open(all_pages_file, "r", encoding=encoding) as f:
            pages = [line.strip() for line in f if line.strip()]
        if pages: break
    except:
        continue

routes = {}
for p in pages:
    rel = os.path.relpath(p, app_base)
    if rel == "page.tsx":
        routes["/"] = rel
    else:
        route = "/" + os.path.dirname(rel).replace("\\", "/")
        routes[route] = rel

def get_tokens(s):
    tokens = re.findall(r'[a-zA-Z]+', s.lower())
    return set([t for t in tokens if len(t) > 2 and t not in ['admin', 'select', 'get', 'list', 'manage', 'egov']])

results = []
for db_url in mismatched_urls:
    db_tokens = get_tokens(db_url)
    best_route = None
    max_score = 0
    
    for route in routes:
        route_tokens = get_tokens(route)
        common = db_tokens.intersection(route_tokens)
        score = len(common)
        
        for token in db_tokens:
            if token in route.lower():
                score += 1
        
        if score > max_score:
            max_score = score
            best_route = route
        elif score == max_score and score > 0:
            if abs(len(route) - len(db_url)) < abs(len(best_route) - len(db_url)):
                best_route = route

    results.append((db_url, best_route, max_score))

print("### DB URL vs 실제 경로 매칭 결과 ###")
print("| DB URL | 매칭된 실제 프론트엔드 경로 | 추천 수준 |")
print("| :--- | :--- | :--- |")
for db, route, score in results:
    level = "High" if score >= 3 else "Medium" if score >= 1 else "Unknown"
    match_str = f"`{route}`" if route else "N/A"
    print(f"| `{db}` | {match_str} | {level} |")
