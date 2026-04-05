
import os
import json

def generate_update_sql():
    # 1. Get existing file routes
    app_root = r"d:\project\egov-enterprise\frontend\src\app"
    existing_file_routes = set()
    for root, dirs, files in os.walk(app_root):
        if "page.tsx" in files:
            rel = os.path.relpath(root, app_root)
            if rel == ".":
                route = "/"
            else:
                route = "/" + rel.replace("\\", "/")
            existing_file_routes.add(route.lower().rstrip('/'))

    # 2. Mismatch data
    mismatches_json = """
    [{"menu_nm":"일정 관리","progrm_file_nm":"EgovIndvdlSchdulManageList","modern_route":"/admin/work-hub?tab=calendar","progrm_url":"/admin/collaboration"},{"menu_nm":"문자메시지","progrm_file_nm":"selectSmsList","modern_route":"/admin/uss/ion/sms","progrm_url":"/cop/sms/selectSmsList"},{"menu_nm":"메일발송","progrm_file_nm":"insertSndngMailView","modern_route":"/admin/collaboration/mail-send","progrm_url":"/admin/collaboration"},{"menu_nm":"쪽지함","progrm_file_nm":"listNoteTrnsmit","modern_route":"/admin/collaboration/mail-history","progrm_url":"/admin/uss/ion/note"},{"menu_nm":"주소록관리","progrm_file_nm":"selectAdbkList","modern_route":"/admin/collaboration/address-book","progrm_url":"/admin/collaboration"},{"menu_nm":"부서 업무 관리","progrm_file_nm":"selectDeptJobBxList","modern_route":"/admin/work-hub","progrm_url":"/admin/collaboration"},{"menu_nm":"업무 보고 관리","progrm_file_nm":"selectWikMnthngReprtList","modern_route":"/admin/work-hub","progrm_url":"/cop/smt/wmr/selectReportList"},{"menu_nm":"내 결재함 및 대시보드","progrm_file_nm":"ApprovalDashboard","modern_route":"/admin/sanctn/forms","progrm_url":"/approvals"},{"menu_nm":"[미사용] 서베이기능그룹","progrm_file_nm":"EgovQustnrManageList","modern_route":"/admin/survey/hub?tab=manage","progrm_url":"/admin/survey/manage"},{"menu_nm":"[미사용] 서베이기능그룹","progrm_file_nm":"EgovQustnrRespondInfoManageList","modern_route":"/admin/survey/hub?tab=manage","progrm_url":"/admin/survey/manage"},{"menu_nm":"설문템플릿관리","progrm_file_nm":"EgovQustnrTmplatManageList","modern_route":"/admin/survey/hub?tab=manage","progrm_url":"/admin/survey/manage"},{"menu_nm":"응답자관리","progrm_file_nm":"EgovQustnrRespondManageList","modern_route":"/admin/survey/hub?tab=respondents","progrm_url":"/admin/survey/manage"},{"menu_nm":"질문관리","progrm_file_nm":"EgovQustnrQestnManageList","modern_route":"/admin/survey/hub?tab=questions","progrm_url":"/admin/survey/manage"},{"menu_nm":"항목관리","progrm_file_nm":"EgovQustnrItemManageList","modern_route":"/admin/survey/hub?tab=items","progrm_url":"/admin/survey/manage"},{"menu_nm":"온라인poll관리","progrm_file_nm":"listOnlinePollManage","modern_route":"/admin/survey/hub?tab=templates","progrm_url":"/admin/uss/olp/online-poll"},{"menu_nm":"온라인poll참여","progrm_file_nm":"listOnlinePollPartcptn","modern_route":"/admin/survey/polls/participate","progrm_url":"/admin/uss/olp/online-poll"},{"menu_nm":"스크랩 목록","progrm_file_nm":"selectScrapList","modern_route":"/admin/collaboration/scraps","progrm_url":"/cop/scp/selectScrapList"},{"menu_nm":"마이페이지관리","progrm_file_nm":"EgovIndvdlpgeCntntsList","modern_route":"/admin/workspace/mypage","progrm_url":"/mypage"},{"menu_nm":"외부인사정보","progrm_file_nm":"EgovTnextrlHrInfoList","modern_route":"/admin/operation/external-hr","progrm_url":"/admin/uss/ion/external-hr"},{"menu_nm":"포상관리","progrm_file_nm":"selectRwardManageList","modern_route":"/admin/operation/rewards","progrm_url":"/admin/system/reward"},{"menu_nm":"시스템 알림 설정","progrm_file_nm":"selectNotificationList","modern_route":"/admin/help/faq","progrm_url":"/admin/notifications"},{"menu_nm":"사용자부재관리","progrm_file_nm":"selectUserAbsnceListView","modern_route":"/admin/user/absences","progrm_url":"/uss/ion/user-absences"},{"menu_nm":"도움말","progrm_file_nm":"HpcmListInqire","modern_route":"/admin/help/faq","progrm_url":"/help"},{"menu_nm":"상담 관리 (Q&A)","progrm_file_nm":"CnsltAnswerListInqire","modern_route":"/admin/help/faq","progrm_url":"/uss/olh/cnm/CnsltAnswerListInqire.do"},{"menu_nm":"배너 및 팝업 관리","progrm_file_nm":"selectBannerMainList","modern_route":"/admin/system/layout","progrm_url":"/admin/system/banner"},{"menu_nm":"워크플로우 프로세스 설정","progrm_file_nm":"WorkflowEngineManage","modern_route":"/admin/sanctn/forms","progrm_url":"/admin/workflow"},{"menu_nm":"로그인","progrm_file_nm":"egovLoginUsr","modern_route":"/admin/system/monitoring/hub?tab=security","progrm_url":"/login"},{"menu_nm":"로그인정책관리","progrm_file_nm":"selectLoginPolicyList","modern_route":"/admin/system/monitoring/hub?tab=policy","progrm_url":"/admin/user/manage"},{"menu_nm":"개인정보보호정책확인","progrm_file_nm":"listIndvdlInfoPolicy","modern_route":"/admin/system/monitoring/hub?tab=policy","progrm_url":"/admin/user/indvdl-info-policy"},{"menu_nm":"부서 및 조직 관리","progrm_file_nm":"selectDeptManageListView","modern_route":"/admin/user/departments","progrm_url":"/admin/user/dept-manage"},{"menu_nm":"게시판사용정보","progrm_file_nm":"selectBBSUseInfs","modern_route":"/admin/community/boards","progrm_url":"/cop/com/selectBBSUseInfs"},{"menu_nm":"템플릿관리","progrm_file_nm":"selectTemplateInfs","modern_route":"/admin/community/templates","progrm_url":"/cop/tpl/selectTemplateList"},{"menu_nm":"게시물통계","progrm_file_nm":"selectBbsStats","modern_route":"/admin/stats/board","progrm_url":"/admin/stats/bbs-stats"},{"menu_nm":"접속통계","progrm_file_nm":"selectConectStats","modern_route":"/admin/stats/board","progrm_url":"/admin/stats/user"},{"menu_nm":"보고서통계","progrm_file_nm":"selectReprtStatsListView","modern_route":"/admin/stats/report","progrm_url":"/admin/stats"},{"menu_nm":"콘텐츠 사용량 통계","progrm_file_nm":"selectDtaUseStatsList","modern_route":"/admin/stats/data-usage","progrm_url":"/admin/stats/dta-use-stats"},{"menu_nm":"발송메일내역","progrm_file_nm":"selectSndngMailList","modern_route":"/admin/collaboration/mail-history","progrm_url":"/admin/collaboration"},{"menu_nm":"보안 감사 로그","progrm_file_nm":"SecurityAudit","modern_route":"/admin/system/monitoring/hub?tab=security","progrm_url":"/admin/security/audit"},{"menu_nm":"시스템 감사 로그","progrm_file_nm":"SystemAudit","modern_route":"/admin/system/monitoring/hub?tab=system","progrm_url":"/admin/system/audit"},{"menu_nm":"시스템 상태 모니터링","progrm_file_nm":"SystemObservability","modern_route":"/admin/system/monitoring/hub?tab=health","progrm_url":"/admin/observability"}]
    """
    items = json.loads(mismatches_json)
    
    updates = []
    for item in items:
        name = item['menu_nm']
        prog_file = item['progrm_file_nm']
        current = item['modern_route']
        target = item['progrm_url']
        
        # Logic to decide the best route
        # 1. If progrm_url exists in filesystem, use it.
        # 2. If it's a hub case, keep it but maybe fix tab.
        
        final_route = current
        
        # Check if target exists
        clean_target = target.split('?')[0].lower().rstrip('/')
        if clean_target in existing_file_routes:
            final_route = target
        else:
            # Maybe the path is slightly different, check some variations
            # e.g. /admin/user/dept-manage -> /admin/user/departments?
            if name == "부서 및 조직 관리" and "/admin/user/departments" in existing_file_routes:
                final_route = "/admin/user/departments"
            elif name == "시스템 알림 설정" and "/admin/notifications" in existing_file_routes:
                 final_route = "/admin/notifications"
            elif name == "워크플로우 프로세스 설정" and "/admin/workflow" in existing_file_routes:
                 final_route = "/admin/workflow"
            # Add more specific logic here
        
        if final_route != current:
            updates.append((name, prog_file, final_route))

    print("-- SQL Updates for nmenuinfo")
    for u in updates:
        print(f"UPDATE nmenuinfo SET modern_route = '{u[2]}' WHERE progrm_file_nm = '{u[1]}' AND menu_nm = '{u[0]}';")

if __name__ == "__main__":
    generate_update_sql()
