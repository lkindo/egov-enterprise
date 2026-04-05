import json
import os
import re

def audit():
    # 1. FS Routes
    fs_routes = set()
    root_path = r"D:\project\egov-enterprise\frontend\src\app"
    with open(r"d:\project\egov-enterprise\frontend\routes_list_utf8.txt", 'r', encoding='utf-8') as f:
        for line in f:
            if not line.strip(): continue
            rel = os.path.relpath(line.strip(), root_path)
            if rel == "page.tsx":
                fs_routes.add("/")
            else:
                # Remove \page.tsx at the end
                route = "/" + os.path.dirname(rel).replace("\\", "/")
                fs_routes.add(route.lower())

    # 2. DB Menus (from previous tool output)
    # I'll paste the menu data here for the script to use
    menu_data = [
        {"menu_nm":"🏢 워크스페이스","modern_route":"","progrm_file_nm":"dir","menu_no":"1000000","upper_menu_no":None},
        {"menu_nm":"🔍 통합 검색","modern_route":"/search","progrm_file_nm":"dir","menu_no":"1000001","upper_menu_no":"1000000"},
        {"menu_nm":"개인 및 부서 일정","modern_route":"/admin/work-hub?tab=job","progrm_file_nm":"dir","menu_no":"1010000","upper_menu_no":"1000000"},
        {"menu_nm":"부서일정관리","modern_route":"/admin/work-hub?tab=calendar","progrm_file_nm":"EgovDeptSchdulManageList","menu_no":"1010100","upper_menu_no":"1010000"},
        {"menu_nm":"일정 관리","modern_route":"/admin/work-hub?tab=calendar","progrm_file_nm":"EgovIndvdlSchdulManageList","menu_no":"1010200","upper_menu_no":"1010000"},
        {"menu_nm":"메일 및 통합 메시지 센터","modern_route":"/admin/collaboration/mail-history","progrm_file_nm":"dir","menu_no":"1020000","upper_menu_no":"1000000"},
        {"menu_nm":"문자메시지","modern_route":"/admin/uss/ion/sms","progrm_file_nm":"selectSmsList","menu_no":"1020100","upper_menu_no":"1020000"},
        {"menu_nm":"메일발송","modern_route":"/admin/collaboration/mail-send","progrm_file_nm":"insertSndngMailView","menu_no":"1020200","upper_menu_no":"1020000"},
        {"menu_nm":"쪽지함","modern_route":"/admin/collaboration/mail-history","progrm_file_nm":"listNoteTrnsmit","menu_no":"1020300","upper_menu_no":"1020000"},
        {"menu_nm":"💌 업무 쪽지함","modern_route":"/note","progrm_file_nm":"dir","menu_no":"1020400","upper_menu_no":"1020000"},
        {"menu_nm":"인적 자원 및 주소록 관리","modern_route":"/admin/collaboration/address-book","progrm_file_nm":"dir","menu_no":"1030000","upper_menu_no":"1000000"},
        {"menu_nm":"주소록관리","modern_route":"/admin/collaboration/address-book","progrm_file_nm":"selectAdbkList","menu_no":"1030100","upper_menu_no":"1030000"},
        {"menu_nm":"업무 보고 및 보고함","modern_route":"/admin/work-hub","progrm_file_nm":"dir","menu_no":"1040000","upper_menu_no":"1000000"},
        {"menu_nm":"부서 업무 관리","modern_route":"/admin/work-hub?tab=report","progrm_file_nm":"selectDeptJobBxList","menu_no":"1040100","upper_menu_no":"1040000"},
        {"menu_nm":"업무 보고 관리","modern_route":"/admin/work-hub?tab=report","progrm_file_nm":"selectWikMnthngReprtList","menu_no":"1040200","upper_menu_no":"1040000"},
        {"menu_nm":"전자결재 및 문서 관리","modern_route":"/admin/sanctn/forms","progrm_file_nm":"dir","menu_no":"1050000","upper_menu_no":"1000000"},
        {"menu_nm":"내 결재함 및 대시보드","modern_route":"/approvals","progrm_file_nm":"ApprovalDashboard","menu_no":"1050100","upper_menu_no":"1050000"},
        {"menu_nm":"🛠️ 스마트 툴킷 허브","modern_route":"","progrm_file_nm":"dir","menu_no":"1060000","upper_menu_no":"1000000"},
        {"menu_nm":"부서 업무 관리 도구","modern_route":"/smart-toolkit/dept-job","progrm_file_nm":"dir","menu_no":"1060100","upper_menu_no":"1060000"},
        {"menu_nm":"통합 일정 도구","modern_route":"/smart-toolkit/schedule","progrm_file_nm":"dir","menu_no":"1060200","upper_menu_no":"1060000"},
        {"menu_nm":"💬 커뮤니티 및 콘텐츠","modern_route":"","progrm_file_nm":"dir","menu_no":"2000000","upper_menu_no":None},
        {"menu_nm":"설문 및 여론조사 관리","modern_route":"/admin/survey/hub?tab=manage","progrm_file_nm":"dir","menu_no":"2010000","upper_menu_no":"2000000"},
        {"menu_nm":"[미사용] 서베이기능그룹","modern_route":"/admin/survey/hub?tab=manage","progrm_file_nm":"EgovQustnrManageList","menu_no":"2010100","upper_menu_no":"800000000"},
        {"menu_nm":"[미사용] 서베이기능그룹","modern_route":"/admin/survey/hub?tab=manage","progrm_file_nm":"EgovQustnrRespondInfoManageList","menu_no":"2010200","upper_menu_no":"800000000"},
        {"menu_nm":"설문 통계 및 결과 분석","modern_route":"/admin/survey/hub?tab=stats","progrm_file_nm":"dir","menu_no":"2010210","upper_menu_no":"2010000"},
        {"menu_nm":"설문템플릿관리","modern_route":"/admin/survey/hub?tab=manage","progrm_file_nm":"EgovQustnrTmplatManageList","menu_no":"2010300","upper_menu_no":"2010000"},
        {"menu_nm":"응답자관리","modern_route":"/admin/survey/hub?tab=respondents","progrm_file_nm":"EgovQustnrRespondManageList","menu_no":"2010400","upper_menu_no":"2010000"},
        {"menu_nm":"질문관리","modern_route":"/admin/survey/hub?tab=questions","progrm_file_nm":"EgovQustnrQestnManageList","menu_no":"2010500","upper_menu_no":"2010000"},
        {"menu_nm":"항목관리","modern_route":"/admin/survey/hub?tab=items","progrm_file_nm":"EgovQustnrItemManageList","menu_no":"2010600","upper_menu_no":"2010000"},
        {"menu_nm":"온라인poll관리","modern_route":"/admin/survey/hub?tab=templates","progrm_file_nm":"listOnlinePollManage","menu_no":"2010700","upper_menu_no":"2010000"},
        {"menu_nm":"온라인poll참여","modern_route":"/admin/survey/polls/participate","progrm_file_nm":"listOnlinePollPartcptn","menu_no":"2010800","upper_menu_no":"2010000"},
        {"menu_nm":"📝 온라인 설문 참여","modern_route":"/survey","progrm_file_nm":"dir","menu_no":"2010900","upper_menu_no":"2000000"},
        {"menu_nm":"협업","modern_route":"/admin/collaboration/mail-history","progrm_file_nm":"dir","menu_no":"2020000","upper_menu_no":"2000000"},
        {"menu_nm":"스크랩 목록","modern_route":"/admin/collaboration/scraps","progrm_file_nm":"selectScrapList","menu_no":"2020100","upper_menu_no":"2020000"},
        {"menu_nm":"사용자지원","modern_route":"","progrm_file_nm":"dir","menu_no":"2030000","upper_menu_no":"2000000"},
        {"menu_nm":"마이페이지관리","modern_route":"/admin/workspace/mypage","progrm_file_nm":"EgovIndvdlpgeCntntsList","menu_no":"2030100","upper_menu_no":"2030000"},
        {"menu_nm":"외부인사정보","modern_route":"/admin/operation/external-hr","progrm_file_nm":"EgovTnextrlHrInfoList","menu_no":"2030200","upper_menu_no":"2030000"},
        {"menu_nm":"포상관리","modern_route":"/admin/operation/rewards","progrm_file_nm":"selectRwardManageList","menu_no":"2030300","upper_menu_no":"2030000"},
        {"menu_nm":"시스템 알림 설정","modern_route":"/admin/notifications","progrm_file_nm":"selectNotificationList","menu_no":"2030400","upper_menu_no":"2030000"},
        {"menu_nm":"사용자부재관리","modern_route":"/admin/user/absences","progrm_file_nm":"selectUserAbsnceListView","menu_no":"2030500","upper_menu_no":"2030000"},
        {"menu_nm":"도움말","modern_route":"/admin/help/faq?tab=WIKI","progrm_file_nm":"HpcmListInqire","menu_no":"2040000","upper_menu_no":"2000000"},
        {"menu_nm":"온라인 매뉴얼 관리","modern_route":"/admin/uss/olh/online-manual","progrm_file_nm":"listOnlineManual","menu_no":"2050000","upper_menu_no":"2000000"},
        {"menu_nm":"FAQ관리","modern_route":"/admin/help/faq?tab=FAQ","progrm_file_nm":"FaqListInqire","menu_no":"2060000","upper_menu_no":"2000000"},
        {"menu_nm":"상담 관리 (Q&A)","modern_route":"/admin/help/faq?tab=QNA","progrm_file_nm":"CnsltAnswerListInqire","menu_no":"2070000","upper_menu_no":"2000000"},
        {"menu_nm":"test","modern_route":"/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000120","progrm_file_nm":"EgovBBSMaster","menu_no":"8808554","upper_menu_no":"2000000"},
        {"menu_nm":"⚙️ 시스템 관리 센터","modern_route":"","progrm_file_nm":"dir","menu_no":"9000000","upper_menu_no":None},
        {"menu_nm":"시스템 기반 설정","modern_route":"","progrm_file_nm":"dir","menu_no":"9010000","upper_menu_no":"9000000"},
        {"menu_nm":"통합 코드 관리 허브","modern_route":"/admin/system/common-code","progrm_file_nm":"dir","menu_no":"9010100","upper_menu_no":"9010000"},
        {"menu_nm":"메뉴 관리","modern_route":"/admin/system/menus","progrm_file_nm":"EgovMenuListSelect","menu_no":"9010210","upper_menu_no":"9010000"},
        {"menu_nm":"메뉴생성관리","modern_route":"/admin/system/menus/by-authority","progrm_file_nm":"EgovMenuCreatManageSelect","menu_no":"9010220","upper_menu_no":"9010000"},
        {"menu_nm":"프로그램 관리","modern_route":"/admin/system/programs","progrm_file_nm":"EgovProgramListManageSelect","menu_no":"9010230","upper_menu_no":"9010000"},
        {"menu_nm":"포털 콘텐츠 및 UI 관리","modern_route":"/admin/system/layout","progrm_file_nm":"dir","menu_no":"9010300","upper_menu_no":"9010000"},
        {"menu_nm":"배너 및 팝업 관리","modern_route":"/admin/system/banner","progrm_file_nm":"selectBannerMainList","menu_no":"9010400","upper_menu_no":"9010000"},
        {"menu_nm":"워크플로우 프로세스 설정","modern_route":"/admin/workflow","progrm_file_nm":"WorkflowEngineManage","menu_no":"9010500","upper_menu_no":"9010000"},
        {"menu_nm":"계정 및 권한 관리","modern_route":"","progrm_file_nm":"dir","menu_no":"9020000","upper_menu_no":"9000000"},
        {"menu_nm":"통합 보안 및 접속 정책","modern_route":"/admin/system/monitoring/hub?tab=security","progrm_file_nm":"dir","menu_no":"9020100","upper_menu_no":"9020000"},
        {"menu_nm":"로그인","modern_route":"/admin/system/monitoring/hub?tab=security","progrm_file_nm":"egovLoginUsr","menu_no":"9020110","upper_menu_no":"9020100"},
        {"menu_nm":"로그인정책관리","modern_route":"/admin/system/monitoring/hub?tab=policy","progrm_file_nm":"selectLoginPolicyList","menu_no":"9020120","upper_menu_no":"9020100"},
        {"menu_nm":"개인정보보호정책확인","modern_route":"/admin/user/indvdl-info-policy","progrm_file_nm":"listIndvdlInfoPolicy","menu_no":"9020130","upper_menu_no":"9020100"},
        {"menu_nm":"그룹관리","modern_route":"/admin/security/group","progrm_file_nm":"EgovGroupList","menu_no":"9020210","upper_menu_no":"9020000"},
        {"menu_nm":"롤관리","modern_route":"/admin/security/role","progrm_file_nm":"EgovRoleList","menu_no":"9020220","upper_menu_no":"9020000"},
        {"menu_nm":"부서권한관리","modern_route":"/admin/security/dept-authority","progrm_file_nm":"EgovDeptAuthorList","menu_no":"9020230","upper_menu_no":"9020000"},
        {"menu_nm":"계정 및 사용자 관리","modern_route":"/admin/user/manage","progrm_file_nm":"EgovEntrprsMberManage","menu_no":"9020310","upper_menu_no":"9020000"},
        {"menu_nm":"권한(보안) 정책 관리","modern_route":"/admin/security/authority","progrm_file_nm":"EgovAuthorList","menu_no":"9020311","upper_menu_no":"9020000"},
        {"menu_nm":"부서 및 조직 관리","modern_route":"/admin/user/departments","progrm_file_nm":"selectDeptManageListView","menu_no":"9020312","upper_menu_no":"9020000"},
        {"menu_nm":"서비스 운영 관리","modern_route":"","progrm_file_nm":"dir","menu_no":"9030000","upper_menu_no":"9000000"},
        {"menu_nm":"게시판 및 커뮤니티 관리","modern_route":"/admin/community/boards","progrm_file_nm":"dir","menu_no":"9030100","upper_menu_no":"9030000"},
        {"menu_nm":"게시판사용정보","modern_route":"/admin/community/boards","progrm_file_nm":"selectBBSUseInfs","menu_no":"9030110","upper_menu_no":"9030100"},
        {"menu_nm":"템플릿관리","modern_route":"/admin/community/templates","progrm_file_nm":"selectTemplateInfs","menu_no":"9030120","upper_menu_no":"9030100"},
        {"menu_nm":"댓글 및 평가 관리","modern_route":"/admin/system/comments","progrm_file_nm":"CommentManage","menu_no":"9030130","upper_menu_no":"9030100"},
        {"menu_nm":"통합 게시판 마스터 콘솔","modern_route":"/admin/community/boards/master","progrm_file_nm":"BoardMasterConsole","menu_no":"9030140","upper_menu_no":"9030100"},
        {"menu_nm":"결재 양식 관리","modern_route":"/admin/sanctn/forms","progrm_file_nm":"SanctnFormManage","menu_no":"9030200","upper_menu_no":"9030000"},
        {"menu_nm":"행사 정보 관리","modern_route":"/admin/operation/events","progrm_file_nm":"EventAdminService","menu_no":"9030400","upper_menu_no":"9030000"},
        {"menu_nm":"약도 관리","modern_route":"/admin/operation/rough-map","progrm_file_nm":"RoughMapAdminService","menu_no":"9030500","upper_menu_no":"9030000"},
        {"menu_nm":"메모보고 관리","modern_route":"/admin/operation/memo-reports","progrm_file_nm":"MemoReportAdminService","menu_no":"9030600","upper_menu_no":"9030000"},
        {"menu_nm":"감사 및 통계 모니터링","modern_route":"","progrm_file_nm":"dir","menu_no":"9040000","upper_menu_no":"9000000"},
        {"menu_nm":"[미사용] 통계 폴더","modern_route":"/admin/system/monitoring","progrm_file_nm":"dir","menu_no":"9040100","upper_menu_no":"800000000"},
        {"menu_nm":"게시물통계","modern_route":"/admin/stats/board","progrm_file_nm":"selectBbsStats","menu_no":"9040101","upper_menu_no":"9040000"},
        {"menu_nm":"사용자통계","modern_route":"/admin/stats/user","progrm_file_nm":"selectUserStats","menu_no":"9040102","upper_menu_no":"9040000"},
        {"menu_nm":"접속통계","modern_route":"/admin/stats/user","progrm_file_nm":"selectConectStats","menu_no":"9040103","upper_menu_no":"9040000"},
        {"menu_nm":"화면통계","modern_route":"/admin/stats/screen","progrm_file_nm":"selectScrinStats","menu_no":"9040104","upper_menu_no":"9040000"},
        {"menu_nm":"보고서통계","modern_route":"/admin/stats/report","progrm_file_nm":"selectReprtStatsListView","menu_no":"9040105","upper_menu_no":"9040000"},
        {"menu_nm":"콘텐츠 사용량 통계","modern_route":"/admin/stats/data-usage","progrm_file_nm":"selectDtaUseStatsList","menu_no":"9040106","upper_menu_no":"9040000"},
        {"menu_nm":"발송메일내역","modern_route":"/admin/collaboration/mail-history","progrm_file_nm":"selectSndngMailList","menu_no":"9040200","upper_menu_no":"9040000"},
        {"menu_nm":"보안 감사 로그","modern_route":"/admin/system/monitoring/hub?tab=security","progrm_file_nm":"SecurityAudit","menu_no":"9040310","upper_menu_no":"9040000"},
        {"menu_nm":"시스템 감사 로그","modern_route":"/admin/system/monitoring/hub?tab=system","progrm_file_nm":"SystemAudit","menu_no":"9040320","upper_menu_no":"9040000"},
        {"menu_nm":"시스템 상태 모니터링","modern_route":"/admin/system/monitoring/hub?tab=health","progrm_file_nm":"SystemObservability","menu_no":"9040330","upper_menu_no":"9040000"},
        {"menu_nm":"상세 접속 로그 (Login)","modern_route":"/admin/system/logs/login","progrm_file_nm":"dir","menu_no":"9040340","upper_menu_no":"9040000"},
        {"menu_nm":"상세 시스템 로그 (System)","modern_route":"/admin/system/logs/system","progrm_file_nm":"dir","menu_no":"9040350","upper_menu_no":"9040000"},
        {"menu_nm":"ROOT","modern_route":None,"progrm_file_nm":"dir","menu_no":"800000000","upper_menu_no":"800000000"}
    ]

    report = []
    
    # Sort by menu_no for better readability
    for item in menu_data:
        name = item['menu_nm']
        route = item['modern_route']
        if not route:
            # Check if it's a directory (no route planned)
            if item['progrm_file_nm'] == 'dir':
                status = "OK (Category/Dir)"
            else:
                status = "SUSPICIOUS (Path Empty)"
        else:
            # Strip query params
            clean_route = route.split('?')[0].lower().rstrip('/')
            if not clean_route: clean_route = "/"
            
            if clean_route in fs_routes:
                status = "OK"
            else:
                # Check for dynamic routes [id]
                matched = False
                for fs in fs_routes:
                    pattern = "^" + re.sub(r'\\\[.*?\\\]', '[^/]+', re.escape(fs)) + "$"
                    if re.match(pattern, clean_route):
                        matched = True
                        break
                
                if matched:
                    status = "OK (Dynamic Match)"
                else:
                    status = "❌ SUSPICIOUS (Missing File)"
        
        report.append((name, route, status))

    print("| Menu Name | modern_route (DB) | Status |")
    print("| :--- | :--- | :--- |")
    for r in report:
        print(f"| {r[0]} | {r[1]} | {r[2]} |")

if __name__ == "__main__":
    audit()
