# 메뉴명 기반 프로그램 매칭 제안서 (V4 - 템플릿 참조형)

현재 프로젝트(`api-server`)에 없는 경우 템플릿 폴더를 참조하여 최적의 이관 대상을 찾아낸 결과입니다.

| 메뉴번호 | 메뉴명 | 기존 프로그램 | 제안 프로그램 | 제안 경로 | 신뢰도 | 출처 |
|---|---|---|---|---|---|---|
| 1020000 | 로그인정책관리 | selectLoginPolicyList | **EgovLoginPolicyList** | /uat/uap/ | 36 | Project |
| 2050000 | 부서권한관리 | EgovDeptAuthorList | **EgovDeptAuthorManage** | /egovframework/com/sec/drm/ | 36 | Template (Migrate Required) |
| 3010000 | 게시물통계 | selectBbsStats | **EgovBbsStats** | /sts/ | 15 | Project |
| 3020000 | 사용자통계 | selectUserStats | **EgovUserStats** | /egovframework/com/sts/ust/ | 25 | Template (Migrate Required) |
| 3030000 | 접속통계 | selectConectStats | **EgovConectStats** | /sts/cst/ | 25 | Project |
| 3040000 | 화면통계 | selectScrinStats | **EgovScrinStats** | /egovframework/com/sts/sst/ | 25 | Template (Migrate Required) |
| 3050000 | 보고서통계 | selectReprtStatsListView | **EgovBbsStats** | /sts/ | 15 | Project |
| 3060000 | 자료이용현황통계 | selectDtaUseStatsList | **EgovDtaUseStatsList** | /egovframework/com/sts/dst/ | 25 | Template (Migrate Required) |
| 4010000 | 게시판속성관리 | SelectBBSMasterInfs | **EgovArticleList** | /cop/bbs/ | 18 | Project |
| 4020000 | 게시판사용정보 | selectBBSUseInfs | **EgovArticleList** | /cop/bbs/ | 17 | Project |
| 4070000 | 부서일정관리 | EgovDeptSchdulManageList | **EgovDeptSchdulManageList** | /egovframework/com/cop/smt/sdm/ | 27 | Template (Migrate Required) |
| 4080000 | 일정관리 | EgovIndvdlSchdulManageList | **EgovAllSchdulManageList** | /egovframework/com/cop/smt/sam/ | 17 | Template (Migrate Required) |
| 4100000 | 전체일정관리 | EgovAllSchdulManageList | **EgovAllSchdulManageList** | /egovframework/com/cop/smt/sam/ | 17 | Template (Migrate Required) |
| 4110000 | 메일발송 | insertSndngMailView | **EgovMailDtls** | /egovframework/com/cop/ems/ | 15 | Template (Migrate Required) |
| 4120000 | 발송메일내역 | selectSndngMailList | **EgovMailDtls** | /egovframework/com/cop/ems/ | 15 | Template (Migrate Required) |
| 4160000 | 간부일정관리 | selectLeaderSchdulList | **EgovAllSchdulManageList** | /egovframework/com/cop/smt/sam/ | 17 | Template (Migrate Required) |
| 4170000 | 부서업무함관리 | selectDeptJobBxList | **EgovDeptSchdulManageList** | /egovframework/com/cop/smt/sdm/ | 17 | Template (Migrate Required) |
| 4180000 | 부서업무정보 | selectDeptJobList | **EgovDeptList** | /egovframework/com/cop/smt/djm/ | 15 | Template (Migrate Required) |
| 5010000 | 기업회원관리 | EgovEntrprsMberManage | **EgovEntrprsMberManage** | /egovframework/com/uss/umt/ | 26 | Template (Migrate Required) |
| 5030000 | 부서관리 | selectDeptManageListView | **EgovDeptManageList** | /egovframework/com/uss/umt/ | 17 | Template (Migrate Required) |
| 5040000 | 일반회원관리 | EgovMberManage | **EgovUserManage** | /cmm/uss/umt/ | 16 | Project |
| 5070000 | 저작권보호정책 | CpyrhtPrtcPolicyListInqire | **EgovIndvdlInfoPolicyList** | /egovframework/com/uss/sam/ipm/ | 15 | Template (Migrate Required) |
| 5080000 | 개인정보보호정책확인 | listIndvdlInfoPolicy | **EgovIndvdlInfoPolicyList** | /egovframework/com/uss/sam/ipm/ | 15 | Template (Migrate Required) |
| 5170000 | 사용자온라인매뉴얼 | OnlineManualUserList | **EgovUserInsert** | /cmm/uss/umt/ | 15 | Project |
| 5200000 | 설문관리 | EgovQustnrManageList | **EgovQustnrRespondManageList** | /egovframework/com/uss/olp/qrm/ | 27 | Template (Migrate Required) |
| 5210000 | 설문조사 | EgovQustnrRespondInfoManageList | **EgovQustnrRespondInfoList** | /egovframework/com/uss/olp/qri/ | 25 | Template (Migrate Required) |
| 5220000 | 설문템플릿관리 | EgovQustnrTmplatManageList | **EgovQustnrRespondManageList** | /egovframework/com/uss/olp/qrm/ | 27 | Template (Migrate Required) |
| 5260000 | 회의관리 | EgovMeetingManageList | **EgovMeetingManageList** | /egovframework/com/uss/olp/mgt/ | 17 | Template (Migrate Required) |
| 5320000 | 행사/이벤트/캠페인 | EgovEventCmpgnList | **EgovEventCmpgnList** | /egovframework/com/uss/ion/ecc/ | 15 | Template (Migrate Required) |
| 5380000 | 로그인화면이미지관리 | selectLoginScrinImageList | **EgovLoginScrinImageList** | /egovframework/com/uss/ion/lsi/ | 46 | Template (Migrate Required) |
| 5430000 | 사용자부재관리 | selectUserAbsnceListView | **EgovUserManage** | /cmm/uss/umt/ | 16 | Project |
| 5520000 | 회의실관리 | selectMtgPlaceManageList | **EgovMeetingManageList** | /egovframework/com/uss/olp/mgt/ | 17 | Template (Migrate Required) |
| 5530000 | 회의실예약관리 | selectMtgPlaceResveManageList | **EgovMeetingManageList** | /egovframework/com/uss/olp/mgt/ | 17 | Template (Migrate Required) |
| 5640000 | 행사신청관리 | EgovEventReqstManageList | **EgovEventRceptManageList** | /egovframework/com/uss/ion/evt/ | 17 | Template (Migrate Required) |
| 5650000 | 행사접수관리 | EgovEventRcrptManageList | **EgovEventRceptManageList** | /egovframework/com/uss/ion/evt/ | 17 | Template (Migrate Required) |
| 5660000 | 행사접수승인관리 | selectEventRceptConfmList | **EgovEventRceptManageList** | /egovframework/com/uss/ion/evt/ | 17 | Template (Migrate Required) |
| 6050000 | 행정코드관리 | EgovCcmAdministCodeList | **EgovCcmCmmnCodeList** | /egovframework/com/sym/ccm/cca/ | 18 | Template (Migrate Required) |
| 6060000 | 기관코드수신 | getInsttCodeRecptnList | **EgovCcmCmmnCodeList** | /egovframework/com/sym/ccm/cca/ | 17 | Template (Migrate Required) |
| 6070000 | 로그관리 | SelectSysLogList | **EgovLoginLogList** | /sym/log/clg/ | 16 | Project |
| 6080000 | 사용로그관리 | SelectUserLogList | **EgovLoginLogList** | /sym/log/clg/ | 16 | Project |
| 6090000 | 송/수신로그관리 | SelectTrsmrcvLogList | **EgovLoginLogList** | /sym/log/clg/ | 16 | Project |
| 6110000 | 웹로그관리 | SelectWebLogList | **EgovLoginLogList** | /sym/log/clg/ | 16 | Project |
| 6120000 | 접속로그관리 | SelectLoginLogList | **EgovLoginLogList** | /sym/log/clg/ | 26 | Project |
| 6130000 | 메뉴리스트관리 | EgovMenuListSelect | **EgovMenuList** | /egovframework/com/sym/mnu/mpm/ | 100 | Manual (Template Required) |
| 6140000 | 메뉴관리리스트 | EgovMenuManageSelect | **EgovMenuManage** | /sym/mnu/mpm/ | 100 | Manual (Controller Verified) |
| 6150000 | 메뉴생성관리 | EgovMenuCreatManageSelect | **EgovMenuCreatManage** | /sym/mnu/mcm/ | 100 | Manual (Controller Verified) |
| 6160000 | 사이트맵 | EgovSiteMapng | **EgovSiteMap** | /egovframework/com/sym/mnu/stm/ | 15 | Template (Migrate Required) |
| 6170000 | 바로가기메뉴관리 | selectBkmkMenuManageList | **EgovBkmkMenuManageList** | /egovframework/com/sym/mnu/bmm/ | 100 | Manual (Template Required) |
| 6180000 | 프로그램관리 | EgovProgramListManageSelect | **EgovProgramListManage** | /sym/prm/ | 17 | Project |
| 6190000 | 프로그램변경요청관리 | EgovProgramChangeRequstSelect | **EgovProgramListManage** | /sym/prm/ | 17 | Project |
| 6200000 | 프로그램변경요청처리 | EgovProgramChangeRequstProcessListSelect | **EgovLoginLogList** | /sym/log/clg/ | 15 | Project |
| 6210000 | 프로그램변경이력 | EgovProgramChgHstListSelect | **EgovLoginLogList** | /sym/log/clg/ | 15 | Project |
| 9100000 | 로그인세션정보체크 | loginSessionView | **EgovLoginUsr** | /uat/uia/ | 20 | Project |
