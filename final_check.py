import os
import json
import re

app_base = r"d:\project\egov-enterprise\frontend\src\app"
pages_file = r"d:\project\egov-enterprise\final_pages.txt"

# 1. Read existing routes from filesystem
pages = []
for encoding in ['utf-16', 'utf-8', 'cp949']:
    try:
        with open(pages_file, "r", encoding=encoding) as f:
            pages = [line.strip() for line in f if line.strip()]
        if pages: break
    except: continue

existing_routes = set()
for p in pages:
    rel = os.path.relpath(p, app_base)
    if rel == "page.tsx" or rel == "page.js":
        existing_routes.add("/")
    else:
        route = "/" + os.path.dirname(rel).replace("\\", "/")
        existing_routes.add(route.rstrip("/"))

# 2. Hardcoded DB List of problematic URLs (from previous steps)
db_data = [
    {"url":"/admin/collaboration/all-schdul","name":"전체일정관리"},
    {"url":"/admin/collaboration/dept-schdul","name":"부서일정관리"},
    {"url":"/admin/collaboration/indvdl-schdul","name":"일정관리"},
    {"url":"/admin/system/administ-code","name":"행정코드관리"},
    {"url":"/admin/system/cmmn-cl-code","name":"공통분류코드"},
    {"url":"/admin/system/menu-creat","name":"메뉴생성관리"},
    {"url":"/admin/system/site-mapng","name":"사이트맵"},
    {"url":"/admin/user/bndt-ceck","name":"당직체크관리"},
    {"url":"/admin/user/bndt","name":"당직관리"},
    {"url":"/admin/user/event-cmpgn","name":"행사/이벤트/캠페인"},
    {"url":"/admin/user/event-rcrpt","name":"행사접수관리"},
    {"url":"/admin/user/event-reqst","name":"행사신청관리"},
    {"url":"/admin/user/indvdlpge-cntnts","name":"마이페이지관리"},
    {"url":"/admin/user/meeting","name":"회의관리"},
    {"url":"/admin/user/cpyrht-prtc-policy","name":"저작권보호정책"},
    {"url":"/admin/user/entrprs-mber","name":"기업회원관리"},
    {"url":"/admin/system/common-code/groups","name":"공통코드"},
    {"url":"/admin/system/common-code/details","name":"공통상세코드"},
    {"url":"/admin/dam/kno","name":"지식평가관리"},
    {"url":"/admin/security/dept-authority","name":"부서권한관리"},
    {"url":"/admin/system/holiday","name":"공휴일관리(달력)"},
    {"url":"/admin/help/faq","name":"FAQ관리"},
    {"url":"/admin/system/backup","name":"백업관리"},
    {"url":"/admin/user/mber","name":"일반회원관리"},
    {"url":"/admin/collaboration/bbs-master-infs","name":"게시판속성관리"},
    {"url":"/admin/collaboration/sndng-mail","name":"메일발송"},
    {"url":"/admin/collaboration/dept-job-bx","name":"부서업무함관리"},
    {"url":"/admin/collaboration/dept-job","name":"부서업무정보"},
    {"url":"/admin/collaboration/leader-schdul","name":"간부일정관리"},
    {"url":"/admin/knowledge/request-offer","name":"지식정보제공"},
    {"url":"/admin/integration/cntc-instt","name":"연계기관관리"},
    {"url":"/admin/integration/cntc-message","name":"연계메시지관리"},
    {"url":"/admin/integration/cntc-sttus","name":"연계현황관리"},
    {"url":"/admin/integration/system-cntc","name":"시스템연계관리"},
    {"url":"/admin/stats/bbs-stats","name":"게시물통계"},
    {"url":"/admin/stats/dta-use-stats","name":"자료이용현황통계"},
    {"url":"/admin/system/instt-code-recptn","name":"기관코드수신"},
    {"url":"/admin/system/bkmk-menu","name":"바로가기메뉴관리"},
    {"url":"/admin/user/annvrsry-main","name":"기념일목록(확인용)"},
    {"url":"/admin/user/annvrsry","name":"기념일관리"},
    {"url":"/admin/user/hpcm","name":"도움말"},
    {"url":"/admin/user/indvdl-info-policy","name":"개인정보보호정책확인"},
    {"url":"/admin/user/dept-manage","name":"부서관리"},
    {"url":"/admin/utility/db-mntrng","name":"DB서비스모니터링"},
    {"url":"/admin/utility/file-sys-mntrng","name":"파일시스템모니터링"},
    {"url":"/admin/utility/com-utl-http-mon","name":"HTTP서비스모니터링"},
    {"url":"/admin/utility/com-utl-process-mon","name":"프로세스모니터링"},
    {"url":"/admin/utility/login-session","name":"로그인세션정보체크"},
    {"url":"/admin/utility/trsmrcv-mntrng","name":"송수신모니터링"},
    {"url":"/admin/system/batch","name":"배치작업관리"},
    {"url":"/admin/help/qna","name":"Q&A관리"},
    {"url":"/admin/system/banner","name":"배너관리"},
    {"url":"/admin/stats/user","name":"접속통계"},
    {"url":"/admin/system/logs/login","name":"접속로그관리"},
    {"url":"/admin/user/login-policy","name":"로그인정책관리"},
    {"url":"/admin/stats/reprt-stats","name":"보고서통계"},
    {"url":"/admin/stats/user-stats","name":"사용자통계"},
    {"url":"/admin/system/sys-history","name":"시스템이력관리"},
    {"url":"/admin/system/server-eqpmn","name":"서버정보관리"},
    {"url":"/admin/system/trobl-process","name":"장애처리결과관리"},
    {"url":"/admin/system/trobl-reqst","name":"장애신청관리"},
    {"url":"/admin/user/mtg-place","name":"회의실관리"},
    {"url":"/admin/user/mtg-place-resve","name":"회의실예약관리"},
    {"url":"/admin/user/user-absnce","name":"사용자부재관리"},
    {"url":"/admin/user/word-dicary","name":"용어사전"},
    {"url":"/admin/user/stplat","name":"약관관리"},
    {"url":"/admin/utility/ntwrk-svc-mntrng","name":"네트워크서비스모니터링"},
    {"url":"/admin/utility/proxy-svc","name":"프록시서비스"},
    {"url":"/admin/utility/mntrng-server","name":"서버자원모니터링-대상목록"},
    {"url":"/admin/uss/olp/cnslt-answer","name":"상담답변관리"},
    {"url":"/admin/uss/olp/cnslt","name":"상담관리"},
    {"url":"/admin/system/common-code/zip","name":"우편번호관리"},
    {"url":"/admin/uss/ion/ctsnn","name":"직원경조사승인관리"},
    {"url":"/cop/smt/dsm/selectDiaryList","name":"일지관리"},
    {"url":"/admin/security/group","name":"권한그룹관리"},
    {"url":"/admin/uss/ion/reward","name":"포상승인관리"},
    {"url":"/admin/uss/ion/external-hr","name":"외부인사정보"},
    {"url":"/admin/uss/ion/vcatn","name":"휴가승인관리"},
    {"url":"/admin/uss/ion/main-image","name":"메인이미지 반영결과보기"},
    {"url":"/admin/uss/olh/admin-word","name":"행정전문용어사전"},
    {"url":"/admin/security/authority","name":"권한관리"},
    {"url":"/admin/system/menus","name":"메뉴관리리스트"},
    {"url":"/admin/system/programs","name":"프로그램관리"},
    {"url":"/admin/survey/manage","name":"설문관리"},
    {"url":"/admin/security/role","name":"롤관리"},
    {"url":"/admin/user/manage","name":"업무사용자관리"},
    {"url":"/cop/com/selectBBSUseInfs","name":"게시판사용정보"},
    {"url":"/cop/smt/mrm/selectMemoReportList","name":"메모보고"},
    {"url":"/cop/smt/mtm/selectTodoList","name":"메모할일관리"},
    {"url":"/cop/ncm/selectMyNcrdList","name":"내명함목록"},
    {"url":"/cop/ncm/selectNcrdList","name":"명함관리"},
    {"url":"/cop/sms/selectSmsList","name":"문자메시지"},
    {"url":"/cop/tpl/selectTemplateList","name":"템플릿관리"},
    {"url":"/cop/smt/wmr/selectReportList","name":"주간/월간보고관리"}
]

mismatches = []
for entry in db_data:
    url = entry["url"].strip().rstrip("/")
    if not url: url = "/"
    
    match_found = url in existing_routes
    if not match_found:
        # Dynamic check
        parts = url.strip("/").split("/")
        for route in existing_routes:
            route_parts = route.strip("/").split("/")
            if len(route_parts) == len(parts):
                m = True
                for p_db, p_file in zip(parts, route_parts):
                    if p_file.startswith("[") and p_file.endswith("]"): continue
                    if p_db != p_file:
                        m = False; break
                if m:
                    match_found = True; break
    
    if not match_found:
        mismatches.append(entry)

print("### ⚠️ DB URL과 실제 파일이 연결되지 않은 메뉴 목록 ###")
print("| 프로그램명 | DB URL | 현재 상황 |")
print("| :--- | :--- | :--- |")
for m in sorted(mismatches, key=lambda x: x['url']):
    print(f"| {m['name']} | `{m['url']}` | ❌ 파일 없음 |")
