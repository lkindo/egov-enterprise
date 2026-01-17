# 전 메뉴 프로그램 정밀 전수 검사 보고서

모든 메뉴 아이템(164건)에 대해 원본 프로그램명과 실제 JSP 소스 파일을 1:1로 대조한 결과입니다.

| 메뉴번호 | 메뉴명 | 원본 프로그램 | 매칭 JSP | 실제 경로 | 상태 |
|---|---|---|---|---|---|
| 0 | root | dir | **없음** | 📁 폴더 | 정상 |
| 1000000 | 사용자디렉토리/통합인증 | dir | **없음** | 📁 폴더 | 정상 |
| 1010000 | 로그인 | egovLoginUsr | **EgovLoginUsr.jsp** | /uat/uia/EgovLoginUsr.jsp | ✅ 정상 |
| 1020000 | 로그인정책관리 | selectLoginPolicyList | **EgovLoginPolicyList.jsp** | /uat/uap/EgovLoginPolicyList.jsp | ⚠️ 파일명 상이 |
| 2000000 | 보안 | dir | **없음** | 📁 폴더 | 정상 |
| 2010000 | 권한관리 | EgovAuthorList | **EgovAuthorManage.jsp** | /sec/ram/EgovAuthorManage.jsp | ⚠️ 파일명 상이 |
| 2020000 | 권한그룹관리 | EgovAuthorGroupList | **EgovAuthorGroupManage.jsp** | /sec/rgm/EgovAuthorGroupManage.jsp | ⚠️ 파일명 상이 |
| 2030000 | 그룹관리 | EgovGroupList | **EgovGroupManage.jsp** | /sec/gmt/EgovGroupManage.jsp | ⚠️ 파일명 상이 |
| 2040000 | 롤관리 | EgovRoleList | **EgovRoleManage.jsp** | /sec/rmt/EgovRoleManage.jsp | ⚠️ 파일명 상이 |
| 2050000 | 부서권한관리 | EgovDeptAuthorList | **EgovAuthorManage.jsp** | /sec/ram/EgovAuthorManage.jsp | ⚠️ 파일명 상이 |
| 3000000 | 통계/리포팅 | dir | **없음** | 📁 폴더 | 정상 |
| 3010000 | 게시물통계 | selectBbsStats | **EgovBbsStats.jsp** | /sts/EgovBbsStats.jsp | ⚠️ 파일명 상이 |
| 3020000 | 사용자통계 | selectUserStats | **EgovUserStats.jsp** | /egovframework/com/sts/ust/EgovUserStats.jsp | ❌ 이관완료 |
| 3030000 | 접속통계 | selectConectStats | **EgovConectStats.jsp** | /sts/cst/EgovConectStats.jsp | ⚠️ 파일명 상이 |
| 3040000 | 화면통계 | selectScrinStats | **EgovScrinStats.jsp** | /egovframework/com/sts/sst/EgovScrinStats.jsp | ❌ 이관완료 |
| 3050000 | 보고서통계 | selectReprtStatsListView | **EgovReprtStatsList.jsp** | /egovframework/com/sts/rst/EgovReprtStatsList.jsp | ❌ 이관완료 |
| 3060000 | 자료이용현황통계 | selectDtaUseStatsList | **EgovDtaUseStatsDetail.jsp** | /egovframework/com/sts/dst/EgovDtaUseStatsDetail.jsp | ❌ 이관완료 |
| 4000000 | 협업 | dir | **없음** | 📁 폴더 | 정상 |
| 4010000 | 게시판속성관리 | SelectBBSMasterInfs | **EgovBBSMasterList.jsp** | /egovframework/com/cop/bbs/EgovBBSMasterList.jsp | ❌ 이관완료 |
| 4020000 | 게시판사용정보 | selectBBSUseInfs | **EgovArticleList.jsp** | /cop/bbs/EgovArticleList.jsp | ⚠️ 파일명 상이 |
| 4030000 | 템플릿관리 | selectTemplateInfs | **EgovTemplateInqirePopup.jsp** | /cop/com/EgovTemplateInqirePopup.jsp | ⚠️ 파일명 상이 |
| 4040000 | 스크랩 목록 | selectScrapList | **EgovArticleScrapDetail.jsp** | /egovframework/com/cop/scp/EgovArticleScrapDetail.jsp | ❌ 이관완료 |
| 4050000 | 커뮤니티관리 | selectCmmntyInfs | **EgovCommuMain.jsp** | /egovframework/com/cop/cmy/EgovCommuMain.jsp | ❌ 이관완료 |
| 4060000 | 문자메시지 | selectSmsList | **EgovSmsInfoList.jsp** | /egovframework/com/cop/sms/EgovSmsInfoList.jsp | ❌ 이관완료 |
| 4070000 | 부서일정관리 | EgovDeptSchdulManageList | **EgovDeptSchdulManageList.jsp** | /egovframework/com/cop/smt/sdm/EgovDeptSchdulManageList.jsp | ❌ 이관완료 |
| 4080000 | 일정관리 | EgovIndvdlSchdulManageList | **EgovIndvdlSchdulManageList.jsp** | /egovframework/com/cop/smt/sim/EgovIndvdlSchdulManageList.jsp | ❌ 이관완료 |
| 4090000 | 일지관리 | EgovDiaryManageList | **EgovDiaryManageList.jsp** | /egovframework/com/cop/smt/dsm/EgovDiaryManageList.jsp | ❌ 이관완료 |
| 4100000 | 전체일정관리 | EgovAllSchdulManageList | **EgovAllSchdulManageList.jsp** | /egovframework/com/cop/smt/sam/EgovAllSchdulManageList.jsp | ❌ 이관완료 |
| 4110000 | 메일발송 | insertSndngMailView | **EgovMailRegist.jsp** | /egovframework/com/cop/ems/EgovMailRegist.jsp | ❌ 이관완료 |
| 4120000 | 발송메일내역 | selectSndngMailList | **EgovMailDtls.jsp** | /egovframework/com/cop/ems/EgovMailDtls.jsp | ❌ 이관완료 |
| 4130000 | 명함관리 | selectNcrdInfs | **EgovNcrdList.jsp** | /egovframework/com/cop/ncm/EgovNcrdList.jsp | ❌ 이관완료 |
| 4140000 | 내명함목록 | selectMyNcrdUseInf | **EgovMyNcrdList.jsp** | /egovframework/com/cop/ncm/EgovMyNcrdList.jsp | ❌ 이관완료 |
| 4150000 | 주소록관리 | selectAdbkList | **EgovAddressBookList.jsp** | /egovframework/com/cop/adb/EgovAddressBookList.jsp | ❌ 이관완료 |
| 4160000 | 간부일정관리 | selectLeaderSchdulList | **EgovLeaderSchdulDailyList.jsp** | /egovframework/com/cop/smt/lsm/EgovLeaderSchdulDailyList.jsp | ❌ 이관완료 |
| 4170000 | 부서업무함관리 | selectDeptJobBxList | **EgovDeptJobBxList.jsp** | /egovframework/com/cop/smt/djm/EgovDeptJobBxList.jsp | ❌ 이관완료 |
| 4180000 | 부서업무정보 | selectDeptJobList | **EgovDeptJobBxList.jsp** | /egovframework/com/cop/smt/djm/EgovDeptJobBxList.jsp | ❌ 이관완료 |
| 4190000 | 주간/월간보고관리 | selectWikMnthngReprtList | **EgovWikMnthngReprtDetail.jsp** | /egovframework/com/cop/smt/wmr/EgovWikMnthngReprtDetail.jsp | ❌ 이관완료 |
| 4200000 | 메모할일관리 | selectMemoTodoList | **EgovMemoTodoDetail.jsp** | /egovframework/com/cop/smt/mtm/EgovMemoTodoDetail.jsp | ❌ 이관완료 |
| 4210000 | 메모보고 | selectMemoReprtList | **EgovMemoReprtDetail.jsp** | /egovframework/com/cop/smt/mrm/EgovMemoReprtDetail.jsp | ❌ 이관완료 |
| 5000000 | 사용자지원 | dir | **없음** | 📁 폴더 | 정상 |
| 5010000 | 기업회원관리 | EgovEntrprsMberManage | **EgovEntrprsMberManage.jsp** | /egovframework/com/uss/umt/EgovEntrprsMberManage.jsp | ❌ 이관완료 |
| 5020000 | 업무사용자관리 | EgovUserManage | **EgovUserManage.jsp** | /cmm/uss/umt/EgovUserManage.jsp | ✅ 정상 |
| 5030000 | 부서관리 | selectDeptManageListView | **EgovDeptManageList.jsp** | /egovframework/com/uss/umt/EgovDeptManageList.jsp | ❌ 이관완료 |
| 5040000 | 일반회원관리 | EgovMberManage | **EgovMberManage.jsp** | /egovframework/com/uss/umt/EgovMberManage.jsp | ❌ 이관완료 |
| 5050000 | 마이페이지관리 | EgovIndvdlpgeCntntsList | **EgovIndvdlPgeList.jsp** | /egovframework/com/uss/mpe/EgovIndvdlPgeList.jsp | ❌ 이관완료 |
| 5060000 | 약관관리 | StplatListInqire | **EgovStplatListInqire.jsp** | /egovframework/com/uss/sam/stp/EgovStplatListInqire.jsp | ❌ 이관완료 |
| 5070000 | 저작권보호정책 | CpyrhtPrtcPolicyListInqire | **EgovCpyrhtPrtcPolicyListInqire.jsp** | /egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyListInqire.jsp | ❌ 이관완료 |
| 5080000 | 개인정보보호정책확인 | listIndvdlInfoPolicy | **EgovIndvdlInfoPolicyDetail.jsp** | /egovframework/com/uss/sam/ipm/EgovIndvdlInfoPolicyDetail.jsp | ❌ 이관완료 |
| 5090000 | 도움말 | HpcmListInqire | **EgovHpcmList.jsp** | /egovframework/com/uss/olh/hpc/EgovHpcmList.jsp | ❌ 이관완료 |
| 5100000 | 용어사전 | WordDicaryListInqire | **EgovWordDicaryList.jsp** | /egovframework/com/uss/olh/wor/EgovWordDicaryList.jsp | ❌ 이관완료 |
| 5110000 | FAQ관리 | FaqListInqire | **EgovFaqList.jsp** | /egovframework/com/uss/olh/faq/EgovFaqList.jsp | ❌ 이관완료 |
| 5120000 | Q&A관리 | QnaListInqire | **EgovQnaList.jsp** | /egovframework/com/uss/olh/qna/EgovQnaList.jsp | ❌ 이관완료 |
| 5130000 | Q&A답변관리 | QnaAnswerListInqire | **EgovQnaAnswerList.jsp** | /egovframework/com/uss/olh/qna/EgovQnaAnswerList.jsp | ❌ 이관완료 |
| 5140000 | 행정전문용어사전 | listAdministrationWord | **EgovAdministrationWordDetail.jsp** | /egovframework/com/uss/olh/awm/EgovAdministrationWordDetail.jsp | ❌ 이관완료 |
| 5150000 | 행정전문용어사전관리 | listAdministrationWordManage | **EgovAdministrationWordManageDetail.jsp** | /egovframework/com/uss/olh/awm/EgovAdministrationWordManageDetail.jsp | ❌ 이관완료 |
| 5160000 | 온라인매뉴얼 | listOnlineManual | **EgovOnlineManualDetail.jsp** | /egovframework/com/uss/olh/omn/EgovOnlineManualDetail.jsp | ❌ 이관완료 |
| 5170000 | 사용자온라인매뉴얼 | OnlineManualUserList | **EgovOnlineManualUserList.jsp** | /egovframework/com/uss/olh/omm/EgovOnlineManualUserList.jsp | ❌ 이관완료 |
| 5180000 | 상담관리 | CnsltListInqire | **EgovCnsltListInqire.jsp** | /egovframework/com/uss/olp/cns/EgovCnsltListInqire.jsp | ❌ 이관완료 |
| 5190000 | 상담답변관리 | CnsltAnswerListInqire | **EgovCnsltAnswerListInqire.jsp** | /egovframework/com/uss/olp/cns/EgovCnsltAnswerListInqire.jsp | ❌ 이관완료 |
| 5200000 | 설문관리 | EgovQustnrManageList | **EgovQustnrManageList.jsp** | /egovframework/com/uss/olp/qmc/EgovQustnrManageList.jsp | ❌ 이관완료 |
| 5210000 | 설문조사 | EgovQustnrRespondInfoManageList | **EgovQustnrRespondInfoManageList.jsp** | /egovframework/com/uss/olp/qnn/EgovQustnrRespondInfoManageList.jsp | ❌ 이관완료 |
| 5220000 | 설문템플릿관리 | EgovQustnrTmplatManageList | **EgovQustnrTmplatManageList.jsp** | /egovframework/com/uss/olp/qtm/EgovQustnrTmplatManageList.jsp | ❌ 이관완료 |
| 5230000 | 응답자관리 | EgovQustnrRespondManageList | **EgovQustnrRespondManageList.jsp** | /egovframework/com/uss/olp/qrm/EgovQustnrRespondManageList.jsp | ❌ 이관완료 |
| 5240000 | 질문관리 | EgovQustnrQestnManageList | **EgovQustnrQestnManageList.jsp** | /egovframework/com/uss/olp/qqm/EgovQustnrQestnManageList.jsp | ❌ 이관완료 |
| 5250000 | 항목관리 | EgovQustnrItemManageList | **EgovQustnrItemManageList.jsp** | /egovframework/com/uss/olp/qim/EgovQustnrItemManageList.jsp | ❌ 이관완료 |
| 5260000 | 회의관리 | EgovMeetingManageList | **EgovMeetingManageList.jsp** | /egovframework/com/uss/olp/mgt/EgovMeetingManageList.jsp | ❌ 이관완료 |
| 5270000 | 온라인poll관리 | listOnlinePollManage | **EgovOnlinePollManageDetail.jsp** | /egovframework/com/uss/olp/opm/EgovOnlinePollManageDetail.jsp | ❌ 이관완료 |
| 5280000 | 온라인poll참여 | listOnlinePollPartcptn | **EgovOnlinePollPartcptnList.jsp** | /egovframework/com/uss/olp/opp/EgovOnlinePollPartcptnList.jsp | ❌ 이관완료 |
| 5290000 | 뉴스관리 | NewsInfoListInqire | **EgovNewsList.jsp** | /egovframework/com/uss/ion/nws/EgovNewsList.jsp | ❌ 이관완료 |
| 5300000 | 사이트관리 | SiteListInqire | **EgovSiteList.jsp** | /egovframework/com/uss/ion/sit/EgovSiteList.jsp | ❌ 이관완료 |
| 5310000 | 추천사이트관리 | RecomendSiteListInqire | **EgovRecomendSiteList.jsp** | /egovframework/com/uss/ion/rec/EgovRecomendSiteList.jsp | ❌ 이관완료 |
| 5320000 | 행사/이벤트/캠페인 | EgovEventCmpgnList | **EgovEventCmpgnList.jsp** | /egovframework/com/uss/ion/ecc/EgovEventCmpgnList.jsp | ❌ 이관완료 |
| 5330000 | 외부인사정보 | EgovTnextrlHrInfoList | **EgovTnextrlHrList.jsp** | /egovframework/com/uss/ion/ecc/EgovTnextrlHrList.jsp | ❌ 이관완료 |
| 5340000 | 팝업창관리 | listPopup | **EgovTemplateInqirePopup.jsp** | /cop/com/EgovTemplateInqirePopup.jsp | ⚠️ 파일명 상이 |
| 5350000 | 정보알림이 | selectNotificationList | **EgovNotificationData.jsp** | /egovframework/com/uss/ion/noi/EgovNotificationData.jsp | ❌ 이관완료 |
| 5360000 | 배너관리 | selectBannerList | **EgovBannerList.jsp** | /egovframework/com/uss/ion/bnr/EgovBannerList.jsp | ❌ 이관완료 |
| 5370000 | MYPAGE배너관리 | selectBannerMainList | **EgovBannerMainList.jsp** | /egovframework/com/uss/ion/bnr/EgovBannerMainList.jsp | ❌ 이관완료 |
| 5380000 | 로그인화면이미지관리 | selectLoginScrinImageList | **EgovLoginScrinImageList.jsp** | /egovframework/com/uss/ion/lsi/EgovLoginScrinImageList.jsp | ❌ 이관완료 |
| 5390000 | 최근검색어 목록 | listRecentSrchwrd | **EgovRecentSrchwrdDetail.jsp** | /egovframework/com/uss/ion/rsm/EgovRecentSrchwrdDetail.jsp | ❌ 이관완료 |
| 5400000 | 메인이미지관리 | selectMainImageList | **EgovMainImageList.jsp** | /egovframework/com/uss/ion/msi/EgovMainImageList.jsp | ❌ 이관완료 |
| 5410000 | 메인이미지 반영결과보기 | getMainImageResult | **EgovMainImageView.jsp** | /egovframework/com/uss/ion/msi/EgovMainImageView.jsp | ❌ 이관완료 |
| 5420000 | 통합링크관리 | listUnityLink | **EgovUnityLinkDetail.jsp** | /egovframework/com/uss/ion/ulm/EgovUnityLinkDetail.jsp | ❌ 이관완료 |
| 5430000 | 사용자부재관리 | selectUserAbsnceListView | **EgovUserAbsnceList.jsp** | /egovframework/com/uss/ion/uas/EgovUserAbsnceList.jsp | ❌ 이관완료 |
| 5440000 | 인터넷서비스안내및관리 | selectIntnetSvcGuidanceList | **EgovIntnetSvcGuidanceList.jsp** | /egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceList.jsp | ❌ 이관완료 |
| 5450000 | Wiki기능 | listWikiBookmark | **EgovWikiBookmarkList.jsp** | /egovframework/com/uss/ion/wik/bmk/EgovWikiBookmarkList.jsp | ❌ 이관완료 |
| 5460000 | RSS태그관리 | listRssTagManage | **EgovRssTagManageDetail.jsp** | /egovframework/com/uss/ion/rss/EgovRssTagManageDetail.jsp | ❌ 이관완료 |
| 5470000 | RSS태그서비스 | listRssTagService | **EgovRssTagService.jsp** | /egovframework/com/uss/ion/rsn/EgovRssTagService.jsp | ❌ 이관완료 |
| 5480000 | Twitter연동 | selectTwitterMain | **EgovTwitterMain.jsp** | /egovframework/com/uss/ion/tir/EgovTwitterMain.jsp | ❌ 이관완료 |
| 5490000 | 쪽지관리 | registEgovNoteManage | **EgovNoteManage.jsp** | /egovframework/com/uss/ion/ntm/EgovNoteManage.jsp | ❌ 이관완료 |
| 5500000 | 받은쪽지함관리 | listNoteRecptn | **EgovNoteRecptnDetail.jsp** | /egovframework/com/uss/ion/ntr/EgovNoteRecptnDetail.jsp | ❌ 이관완료 |
| 5510000 | 보낸쪽지함관리 | listNoteTrnsmit | **EgovNoteTrnsmitCnfirm.jsp** | /egovframework/com/uss/ion/nts/EgovNoteTrnsmitCnfirm.jsp | ❌ 이관완료 |
| 5520000 | 회의실관리 | selectMtgPlaceManageList | **EgovMtgPlaceManageList.jsp** | /egovframework/com/uss/ion/mtg/EgovMtgPlaceManageList.jsp | ❌ 이관완료 |
| 5530000 | 회의실예약관리 | selectMtgPlaceResveManageList | **EgovMtgPlaceResveManageList.jsp** | /egovframework/com/uss/ion/mtg/EgovMtgPlaceResveManageList.jsp | ❌ 이관완료 |
| 5540000 | 직원경조사관리 | selectCtsnnManageList | **EgovCtsnnManageList.jsp** | /egovframework/com/uss/ion/ctn/EgovCtsnnManageList.jsp | ❌ 이관완료 |
| 5550000 | 직원경조사승인관리 | EgovCtsnnConfmList | **EgovCtsnnConfmList.jsp** | /egovframework/com/uss/ion/ctn/EgovCtsnnConfmList.jsp | ❌ 이관완료 |
| 5560000 | 휴가관리 | EgovVcatnManageList | **EgovVcatnManageList.jsp** | /egovframework/com/uss/ion/vct/EgovVcatnManageList.jsp | ❌ 이관완료 |
| 5570000 | 휴가승인관리 | EgovVcatnConfmList | **EgovVcatnConfmList.jsp** | /egovframework/com/uss/ion/vct/EgovVcatnConfmList.jsp | ❌ 이관완료 |
| 5580000 | 당직관리 | EgovBndtManageList | **EgovBndtManageList.jsp** | /egovframework/com/uss/ion/bnt/EgovBndtManageList.jsp | ❌ 이관완료 |
| 5590000 | 당직체크관리 | EgovBndtCeckManageList | **EgovBndtCeckManageList.jsp** | /egovframework/com/uss/ion/bnt/EgovBndtCeckManageList.jsp | ❌ 이관완료 |
| 5600000 | 포상관리 | selectRwardManageList | **EgovRwardManageList.jsp** | /egovframework/com/uss/ion/rwd/EgovRwardManageList.jsp | ❌ 이관완료 |
| 5610000 | 포상승인관리 | EgovRwardConfmList | **EgovRwardConfmList.jsp** | /egovframework/com/uss/ion/rwd/EgovRwardConfmList.jsp | ❌ 이관완료 |
| 5620000 | 기념일관리 | selectAnnvrsryManageList | **EgovAnnvrsryManageBndeListPop.jsp** | /egovframework/com/uss/ion/ans/EgovAnnvrsryManageBndeListPop.jsp | ❌ 이관완료 |
| 5630000 | 기념일목록(확인용) | selectAnnvrsryMainList | **EgovAnnvrsryMainList.jsp** | /egovframework/com/uss/ion/ans/EgovAnnvrsryMainList.jsp | ❌ 이관완료 |
| 5640000 | 행사신청관리 | EgovEventReqstManageList | **EgovEventReqstManageList.jsp** | /egovframework/com/uss/ion/evt/EgovEventReqstManageList.jsp | ❌ 이관완료 |
| 5650000 | 행사접수관리 | EgovEventRcrptManageList | **EgovEventRceptManageList.jsp** | /egovframework/com/uss/ion/evt/EgovEventRceptManageList.jsp | ❌ 이관완료 |
| 5660000 | 행사접수승인관리 | selectEventRceptConfmList | **EgovEventRceptConfm.jsp** | /egovframework/com/uss/ion/evt/EgovEventRceptConfm.jsp | ❌ 이관완료 |
| 6000000 | 시스템관리 | dir | **없음** | 📁 폴더 | 정상 |
| 6010000 | 공통분류코드 | EgovCcmCmmnClCodeList | **EgovCcmCmmnClCodeList.jsp** | /cmm/sym/ccm/EgovCcmCmmnClCodeList.jsp | ✅ 정상 |
| 6020000 | 공통상세코드 | EgovCcmCmmnDetailCodeList | **EgovCcmCmmnDetailCodeList.jsp** | /cmm/sym/ccm/EgovCcmCmmnDetailCodeList.jsp | ✅ 정상 |
| 6030000 | 공통코드 | EgovCcmCmmnCodeList | **EgovCcmCmmnCodeList.jsp** | /cmm/sym/ccm/EgovCcmCmmnCodeList.jsp | ✅ 정상 |
| 6040000 | 우편번호관리 | EgovCcmZipList | **EgovCcmZipList.jsp** | /cmm/sym/zip/EgovCcmZipList.jsp | ✅ 정상 |
| 6050000 | 행정코드관리 | EgovCcmAdministCodeList | **EgovCcmAdministCodeList.jsp** | /egovframework/com/sym/ccm/adc/EgovCcmAdministCodeList.jsp | ❌ 이관완료 |
| 6060000 | 기관코드수신 | getInsttCodeRecptnList | **EgovInsttCodeRecptnList.jsp** | /egovframework/com/sym/ccm/icr/EgovInsttCodeRecptnList.jsp | ❌ 이관완료 |
| 6070000 | 로그관리 | SelectSysLogList | **EgovSysLogDetail.jsp** | /egovframework/com/sym/log/lgm/EgovSysLogDetail.jsp | ❌ 이관완료 |
| 6080000 | 사용로그관리 | SelectUserLogList | **EgovUserLogDetail.jsp** | /egovframework/com/sym/log/ulg/EgovUserLogDetail.jsp | ❌ 이관완료 |
| 6090000 | 송/수신로그관리 | SelectTrsmrcvLogList | **EgovTrsmrcvLogInqire.jsp** | /egovframework/com/sym/log/tlg/EgovTrsmrcvLogInqire.jsp | ❌ 이관완료 |
| 6100000 | 시스템이력관리 | SelectSysHistoryList | **EgovSysHistList.jsp** | /egovframework/com/sym/log/slg/EgovSysHistList.jsp | ❌ 이관완료 |
| 6110000 | 웹로그관리 | SelectWebLogList | **EgovWebLogDetail.jsp** | /egovframework/com/sym/log/wlg/EgovWebLogDetail.jsp | ❌ 이관완료 |
| 6120000 | 접속로그관리 | SelectLoginLogList | **EgovLoginLogDetail.jsp** | /sym/log/clg/EgovLoginLogDetail.jsp | ⚠️ 파일명 상이 |
| 6130000 | 메뉴리스트관리 | EgovMenuListSelect | **EgovMenuManage.jsp** | /sym/mnu/mpm/EgovMenuManage.jsp | ⚠️ 파일명 상이 |
| 6140000 | 메뉴관리리스트 | EgovMenuManageSelect | **EgovMenuManage.jsp** | /sym/mnu/mpm/EgovMenuManage.jsp | ⚠️ 파일명 상이 |
| 6150000 | 메뉴생성관리 | EgovMenuCreatManageSelect | **EgovMenuCreatManage.jsp** | /sym/mnu/mcm/EgovMenuCreatManage.jsp | ⚠️ 파일명 상이 |
| 6160000 | 사이트맵 | EgovSiteMapng | **EgovSiteMapng.jsp** | /egovframework/com/sym/mnu/stm/EgovSiteMapng.jsp | ❌ 이관완료 |
| 6170000 | 바로가기메뉴관리 | selectBkmkMenuManageList | **EgovBkmkMenuManageList.jsp** | /egovframework/com/sym/mnu/bmm/EgovBkmkMenuManageList.jsp | ❌ 이관완료 |
| 6180000 | 프로그램관리 | EgovProgramListManageSelect | **EgovProgramListManage.jsp** | /sym/prm/EgovProgramListManage.jsp | ⚠️ 파일명 상이 |
| 6190000 | 프로그램변경요청관리 | EgovProgramChangeRequstSelect | **EgovProgramChangeRequst.jsp** | /egovframework/com/sym/prm/EgovProgramChangeRequst.jsp | ❌ 이관완료 |
| 6200000 | 프로그램변경요청처리 | EgovProgramChangeRequstProcessListSelect | **EgovProgramChangeRequstProcess.jsp** | /egovframework/com/sym/prm/EgovProgramChangeRequstProcess.jsp | ❌ 이관완료 |
| 6210000 | 프로그램변경이력 | EgovProgramChgHstListSelect | **EgovProgramChgHst.jsp** | /egovframework/com/sym/prm/EgovProgramChgHst.jsp | ❌ 이관완료 |
| 6220000 | 배치작업관리 | getBatchOpertList | **EgovBatchOpertList.jsp** | /egovframework/com/sym/bat/EgovBatchOpertList.jsp | ❌ 이관완료 |
| 6230000 | 배치결과관리 | getBatchResultList | **EgovBatchResultList.jsp** | /egovframework/com/sym/bat/EgovBatchResultList.jsp | ❌ 이관완료 |
| 6240000 | 스케줄처리 | getBatchSchdulList | **EgovBatchSchdulList.jsp** | /egovframework/com/sym/bat/EgovBatchSchdulList.jsp | ❌ 이관완료 |
| 6250000 | 백업관리 | getBackupOpertList | **EgovBackupOpertList.jsp** | /egovframework/com/sym/sym/bak/EgovBackupOpertList.jsp | ❌ 이관완료 |
| 6260000 | 백업결과관리 | getBackupResultList | **EgovBackupResultList.jsp** | /egovframework/com/sym/sym/bak/EgovBackupResultList.jsp | ❌ 이관완료 |
| 6270000 | 네트워크관리 | selectNtwrkList | **EgovNtwrkDetail.jsp** | /egovframework/com/sym/sym/nwk/EgovNtwrkDetail.jsp | ❌ 이관완료 |
| 6280000 | 서버정보관리 | selectServerEqpmnList | **EgovServerEqpmnDetail.jsp** | /egovframework/com/sym/sym/srv/EgovServerEqpmnDetail.jsp | ❌ 이관완료 |
| 6290000 | 서버(S/W)목록 | selectServerList | **EgovServerDetail.jsp** | /egovframework/com/sym/sym/srv/EgovServerDetail.jsp | ❌ 이관완료 |
| 6300000 | 장애신청관리 | selectTroblReqstList | **EgovTroblReqstDetail.jsp** | /egovframework/com/sym/tbm/tbr/EgovTroblReqstDetail.jsp | ❌ 이관완료 |
| 6310000 | 장애처리결과관리 | selectTroblProcessList | **EgovTroblProcessList.jsp** | /egovframework/com/sym/tbm/tbp/EgovTroblProcessList.jsp | ❌ 이관완료 |
| 7000000 | 시스템/서비스연계 | dir | **없음** | 📁 폴더 | 정상 |
| 7010000 | 시스템연계관리 | getSystemCntcList | **EgovSystemCntcList.jsp** | /egovframework/com/ssi/syi/sim/EgovSystemCntcList.jsp | ❌ 이관완료 |
| 7020000 | 연계현황관리 | getCntcSttusList | **EgovCntcSttusList.jsp** | /egovframework/com/ssi/syi/ist/EgovCntcSttusList.jsp | ❌ 이관완료 |
| 7030000 | 연계메시지관리 | getCntcMessageList | **EgovCntcMessageList.jsp** | /egovframework/com/ssi/syi/ims/EgovCntcMessageList.jsp | ❌ 이관완료 |
| 7040000 | 연계기관관리 | getCntcInsttList | **EgovCntcInsttList.jsp** | /egovframework/com/ssi/syi/iis/EgovCntcInsttList.jsp | ❌ 이관완료 |
| 8000000 | 자산 관리 | dir | **없음** | 📁 폴더 | 정상 |
| 8010000 | 개인지식관리 | EgovComDamPersonalList | **EgovComDamPersonalList.jsp** | /egovframework/com/dam/per/EgovComDamPersonalList.jsp | ❌ 이관완료 |
| 8020000 | 지식맵관리(유형) | EgovComDamMapMaterialList | **EgovComDamMapMaterialList.jsp** | /egovframework/com/dam/map/mat/EgovComDamMapMaterialList.jsp | ❌ 이관완료 |
| 8030000 | 지식맵관리(조직) | EgovComDamMapTeamList | **EgovComDamMapTeamList.jsp** | /egovframework/com/dam/map/tea/EgovComDamMapTeamList.jsp | ❌ 이관완료 |
| 8040000 | 지식전문가관리 | EgovComDamSpecialistList | **EgovComDamSpecialistList.jsp** | /egovframework/com/dam/spe/spe/EgovComDamSpecialistList.jsp | ❌ 이관완료 |
| 8050000 | 지식정보관리 | EgovComDamManagementList | **EgovComDamManagementList.jsp** | /egovframework/com/dam/mgm/EgovComDamManagementList.jsp | ❌ 이관완료 |
| 8060000 | 지식평가관리 | EgovComDamAppraisalList | **EgovComDamAppraisalList.jsp** | /egovframework/com/dam/app/EgovComDamAppraisalList.jsp | ❌ 이관완료 |
| 8070000 | 지식정보제공 | listRequestOffer | **EgovComDamRequestOfferDetail.jsp** | /egovframework/com/dam/spe/req/EgovComDamRequestOfferDetail.jsp | ❌ 이관완료 |
| 9000000 | 요소기술 | dir | **없음** | 📁 폴더 | 정상 |
| 9010000 | 공휴일관리(달력) | EgovRestdeList | **EgovRestdeList.jsp** | /egovframework/com/sym/cal/EgovRestdeList.jsp | ❌ 이관완료 |
| 9020000 | 송수신모니터링 | getTrsmrcvMntrngList | **EgovTrsmrcvMntrngList.jsp** | /egovframework/com/utl/sys/trm/EgovTrsmrcvMntrngList.jsp | ❌ 이관완료 |
| 9030000 | DB서비스모니터링 | getDbMntrngList | **EgovDbMntrngList.jsp** | /egovframework/com/utl/sys/dbm/EgovDbMntrngList.jsp | ❌ 이관완료 |
| 9040000 | HTTP서비스모니터링 | EgovComUtlHttpMonList | **EgovComUtlHttpMonList.jsp** | /egovframework/com/utl/sys/htm/EgovComUtlHttpMonList.jsp | ❌ 이관완료 |
| 9050000 | 프로세스모니터링 | EgovComUtlProcessMonList | **EgovComUtlProcessMonList.jsp** | /egovframework/com/utl/sys/prm/EgovComUtlProcessMonList.jsp | ❌ 이관완료 |
| 9060000 | 네트워크서비스모니터링 | selectNtwrkSvcMntrngList | **EgovNtwrkSvcMntrngDetail.jsp** | /egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngDetail.jsp | ❌ 이관완료 |
| 9070000 | 파일시스템모니터링 | selectFileSysMntrngList | **EgovFileSysMntrngDetail.jsp** | /egovframework/com/utl/sys/fsm/EgovFileSysMntrngDetail.jsp | ❌ 이관완료 |
| 9080000 | 프록시서비스 | selectProxySvcList | **EgovProxySvcDetail.jsp** | /egovframework/com/utl/sys/pxy/EgovProxySvcDetail.jsp | ❌ 이관완료 |
| 9090000 | 파일동기화(대상서버) | selectSynchrnServerList | **EgovSynchrnServerDetail.jsp** | /egovframework/com/utl/sys/ssy/EgovSynchrnServerDetail.jsp | ❌ 이관완료 |
| 9100000 | 로그인세션정보체크 | loginSessionView | **EgovLoginSesionCheck.jsp** | /egovframework/com/utl/sys/rsc/EgovLoginSesionCheck.jsp | ❌ 이관완료 |
| 9110000 | 서버자원모니터링-대상목록 | selectMntrngServerList | **EgovMntrngServerList.jsp** | /egovframework/com/utl/sys/srm/EgovMntrngServerList.jsp | ❌ 이관완료 |
