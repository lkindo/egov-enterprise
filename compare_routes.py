import os
import json

app_dir = r"d:\project\egov-enterprise\frontend\src\app"

db_data = [{"url":"/admin/collaboration/all-schdul"},{"url":"/admin/collaboration/dept-schdul"},{"url":"dir"},{"url":"/admin/collaboration/indvdl-schdul"},{"url":"/admin/security/groups"},{"url":"/admin/system/administ-code"},{"url":"/admin/system/cmmn-cl-code"},{"url":"/admin/system/menu-creat"},{"url":"/admin/system/site-mapng"},{"url":"/admin/system/program-change-requst-process"},{"url":"/admin/system/program-change-requst"},{"url":"/admin/system/program-chg-hst"},{"url":"/admin/user/bndt-ceck"},{"url":"/admin/user/bndt"},{"url":"/admin/user/event-cmpgn"},{"url":"/admin/user/event-rcrpt"},{"url":"/admin/user/event-reqst"},{"url":"/admin/user/vcatn"},{"url":"/admin/user/indvdlpge-cntnts"},{"url":"/admin/user/meeting"},{"url":"/admin/user/cpyrht-prtc-policy"},{"url":"/admin/user/entrprs-mber"},{"url":"/admin/system/common-code/groups"},{"url":"/admin/system/common-code/details"},{"url":"/admin/dam/kno"},{"url":"/admin/security/dept-authority"},{"url":"/admin/system/holiday"},{"url":"/admin/help/faq"},{"url":"/admin/system/backup"},{"url":"/admin/user/mber"},{"url":"/admin/collaboration/bbs-master-infs"},{"url":"/admin/collaboration/sndng-mail"},{"url":"/admin/collaboration/dept-job-bx"},{"url":"/admin/collaboration/dept-job"},{"url":"/admin/collaboration/leader-schdul"},{"url":"/admin/knowledge/request-offer"},{"url":"/admin/integration/cntc-instt"},{"url":"/admin/integration/cntc-message"},{"url":"/admin/integration/cntc-sttus"},{"url":"/admin/integration/system-cntc"},{"url":"/admin/stats/bbs-stats"},{"url":"/admin/stats/dta-use-stats"},{"url":"/admin/system/instt-code-recptn"},{"url":"/admin/system/bkmk-menu"},{"url":"/admin/user/annvrsry-main"},{"url":"/admin/user/annvrsry"},{"url":"/admin/user/hpcm"},{"url":"/admin/user/indvdl-info-policy"},{"url":"/admin/user/dept-manage"},{"url":"/admin/utility/db-mntrng"},{"url":"/admin/utility/file-sys-mntrng"},{"url":"/admin/utility/com-utl-http-mon"},{"url":"/admin/utility/com-utl-process-mon"},{"url":"/admin/utility/login-session"},{"url":"/admin/utility/trsmrcv-mntrng"},{"url":"/admin/system/batch"},{"url":"/admin/help/qna"},{"url":"/admin/system/banner"},{"url":"/admin/stats/user"},{"url":"/admin/system/logs/login"},{"url":"/admin/user/login-policy"},{"url":"/admin/stats/reprt-stats"},{"url":"/admin/stats/user-stats"},{"url":"/admin/system/sys-history"},{"url":"/admin/system/server-eqpmn"},{"url":"/admin/system/trobl-process"},{"url":"/admin/system/trobl-reqst"},{"url":"/admin/user/mtg-place"},{"url":"/admin/user/mtg-place-resve"},{"url":"/admin/user/user-absnce"},{"url":"/admin/user/word-dicary"},{"url":"/admin/user/stplat"},{"url":"/admin/utility/ntwrk-svc-mntrng"},{"url":"/admin/utility/proxy-svc"},{"url":"/admin/utility/mntrng-server"},{"url":"/admin/uss/olp/cnslt-answer"},{"url":"/admin/uss/olp/cnslt"},{"url":"/admin/system/common-code/zip"},{"url":"/admin/uss/ion/ctsnn"},{"url":"/cop/smt/dsm/selectDiaryList"},{"url":"/admin/security/group"},{"url":"/admin/uss/ion/reward"},{"url":"/admin/uss/ion/external-hr"},{"url":"/admin/uss/ion/vcatn"},{"url":"/admin/uss/ion/main-image"},{"url":"/admin/uss/olh/admin-word"},{"url":"/admin/security/authority"},{"url":"/login"},{"url":"/admin/system/menus"},{"url":"/admin/system/programs"},{"url":"/admin/survey/manage"},{"url":"/admin/security/role"},{"url":"/admin/user/manage"},{"url":"/admin/system/network"},{"url":"/admin/stats/screen"},{"url":"/admin/uss/ion/note"},{"url":"/admin/uss/olh/online-manual"},{"url":"/admin/uss/olp/online-poll"},{"url":"/admin/uss/ion/popup"},{"url":"/admin/uss/ion/recent-search"},{"url":"/admin/uss/ion/rss"},{"url":"/admin/uss/ion/unity-link"},{"url":"/admin/uss/ion/wiki"},{"url":"/admin/uss/ion/news"},{"url":"/admin/uss/olh/qna-answer"},{"url":"/admin/uss/ion/site"},{"url":"/cop/com/selectBBSUseInfs"},{"url":"/admin/uss/ion/event"},{"url":"/admin/uss/ion/internet-service"},{"url":"/admin/uss/ion/login-image"},{"url":"/cop/smt/mrm/selectMemoReportList"},{"url":"/cop/smt/mtm/selectTodoList"},{"url":"/cop/ncm/selectMyNcrdList"},{"url":"/cop/ncm/selectNcrdList"},{"url":"/cop/scp/selectScrapList"},{"url":"/cop/sms/selectSmsList"},{"url":"/cop/tpl/selectTemplateList"},{"url":"/admin/uss/ion/twitter"},{"url":"/cop/smt/wmr/selectReportList"},{"url":"/admin/collaboration"},{"url":"/admin/community"},{"url":"/admin/system/ctsnn"},{"url":"/admin/notifications"},{"url":"/admin/system/reward"},{"url":"/admin/system/server"},{"url":"/admin/system/sync-server"},{"url":"/admin/system/logs/system"},{"url":"/admin/system/logs/transfer"},{"url":"/admin/system/logs/user"},{"url":"/admin/system/logs/web"}]

# 1. Get all page.tsx files
existing_routes = set()
for root, dirs, files in os.walk(app_dir):
    if "page.tsx" in files:
        rel_path = os.path.relpath(root, app_dir)
        if rel_path == ".":
            existing_routes.add("/")
        else:
            route = "/" + rel_path.replace("\\", "/")
            existing_routes.add(route)

# 3. Compare
mismatches = []
for item in db_data:
    url = item.get("url")
    if not url or url == "dir" or url.startswith("http") or url == "/login" or url == "/":
        continue
    
    norm_url = url.rstrip("/")
    if norm_url not in existing_routes:
        found = False
        parts = norm_url.strip("/").split("/")
        for route in existing_routes:
            route_parts = route.strip("/").split("/")
            if len(route_parts) == len(parts):
                match_route = True
                for p_db, p_file in zip(parts, route_parts):
                    if p_file.startswith("[") and p_file.endswith("]"): continue
                    if p_db != p_file:
                        match_route = False
                        break
                if match_route:
                    found = True
                    break
        if not found:
            mismatches.append(url)

print(json.dumps(sorted(list(set(mismatches))), indent=2, ensure_ascii=False))
