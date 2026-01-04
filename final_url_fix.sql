-- Fix DB URLs based on actual Controller Mappings
BEGIN;
-- View: cmm/sym/ccm/EgovCcmCmmnClCodeList
UPDATE NPROGRMLIST SET URL = '/sym/ccm/ccc/EgovCcmCmmnClCodeList.do' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnClCodeList';
-- View: egovframework/com/uss/olh/faq/EgovFaqList
UPDATE NPROGRMLIST SET URL = '/uss/olh/faq/selectFaqList.do' WHERE PROGRM_FILE_NM = 'FaqListInqire';
-- View: egovframework/com/uss/olp/cns/EgovCnsltListInqire
UPDATE NPROGRMLIST SET URL = '/uss/olp/cns/CnsltListInqire.do' WHERE PROGRM_FILE_NM = 'CnsltListInqire';
-- View: egovframework/com/sym/prm/EgovProgramChgHst
UPDATE NPROGRMLIST SET URL = '/sym/prm/EgovProgramChgHstListSelect.do' WHERE PROGRM_FILE_NM = 'EgovProgramChgHstListSelect';
-- View: sec/gmt/EgovGroupManage
UPDATE NPROGRMLIST SET URL = '/sec/gmt/EgovGroupListView.do' WHERE PROGRM_FILE_NM = 'EgovGroupList';
-- View: egovframework/com/uss/ion/ecc/EgovEventCmpgnList
UPDATE NPROGRMLIST SET URL = '/uss/ion/ecc/selectEventCmpgnList.do' WHERE PROGRM_FILE_NM = 'EgovEventCmpgnList';
-- View: cmm/sym/zip/EgovCcmZipList
UPDATE NPROGRMLIST SET URL = '/sym/ccm/zip/EgovCcmZipList.do' WHERE PROGRM_FILE_NM = 'EgovCcmZipList';
-- View: cmm/sym/ccm/EgovCcmCmmnDetailCodeList
UPDATE NPROGRMLIST SET URL = '/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnDetailCodeList';
-- View: sym/mnu/mpm/EgovMenuManage
UPDATE NPROGRMLIST SET URL = '/sym/mnu/mpm/EgovMenuManageSelect.do' WHERE PROGRM_FILE_NM = 'EgovMenuListSelect';
-- View: egovframework/com/uss/ion/bnt/EgovBndtManageList
UPDATE NPROGRMLIST SET URL = '/uss/ion/bnt/insertBndtManageBnde.do' WHERE PROGRM_FILE_NM = 'EgovBndtManageList';
-- View: sec/ram/EgovAuthorManage
UPDATE NPROGRMLIST SET URL = '/sec/ram/EgovAuthorList.do' WHERE PROGRM_FILE_NM = 'EgovDeptAuthorList';
-- View: egovframework/com/uss/olp/cns/EgovCnsltAnswerListInqire
UPDATE NPROGRMLIST SET URL = '/uss/olp/cnm/CnsltAnswerListInqire.do' WHERE PROGRM_FILE_NM = 'CnsltAnswerListInqire';
-- View: egovframework/com/sym/prm/EgovProgramChangeRequstProcess
UPDATE NPROGRMLIST SET URL = '/sym/prm/EgovProgramChangeRequstProcessListSelect.do' WHERE PROGRM_FILE_NM = 'EgovProgramChangeRequstProcessListSelect';
-- View: egovframework/com/uss/ion/ans/EgovAnnvrsryMainList
UPDATE NPROGRMLIST SET URL = '/uss/ion/ans/selectAnnvrsryMainList.do' WHERE PROGRM_FILE_NM = 'selectAnnvrsryMainList';
-- View: egovframework/com/cop/smt/lsm/EgovLeaderSchdulDailyList
UPDATE NPROGRMLIST SET URL = '/cop/smt/lsm/usr/selectLeaderSchdulDailyList.do' WHERE PROGRM_FILE_NM = 'selectLeaderSchdulList';
-- View: egovframework/com/uss/olh/omm/EgovOnlineManualUserList
UPDATE NPROGRMLIST SET URL = '/uss/olh/omn/selectOnlineManualList.do' WHERE PROGRM_FILE_NM = 'OnlineManualUserList';
-- View: sts/cst/EgovConectStats
UPDATE NPROGRMLIST SET URL = '/sts/cst/selectConectStats.do' WHERE PROGRM_FILE_NM = 'selectConectStats';
-- View: egovframework/com/uss/olh/awm/EgovAdministrationWordDetail
UPDATE NPROGRMLIST SET URL = '/uss/olh/awm/selectAdministrationWordDetail.do' WHERE PROGRM_FILE_NM = 'listAdministrationWord';
-- View: egovframework/com/uss/ion/ctn/EgovCtsnnManageList
UPDATE NPROGRMLIST SET URL = '/uss/ion/ctn/selectCtsnnManageList.do' WHERE PROGRM_FILE_NM = 'selectCtsnnManageList';
-- View: egovframework/com/uss/olp/opp/EgovOnlinePollPartcptnList
UPDATE NPROGRMLIST SET URL = '/uss/olp/opp/listOnlinePollPartcptn.do' WHERE PROGRM_FILE_NM = 'listOnlinePollPartcptn';
-- View: egovframework/com/uss/ion/bnr/EgovBannerMainList
UPDATE NPROGRMLIST SET URL = '/uss/ion/bnr/selectBannerMainList.do' WHERE PROGRM_FILE_NM = 'selectBannerMainList';
-- View: egovframework/com/uss/ion/nws/EgovNewsList
UPDATE NPROGRMLIST SET URL = '/uss/ion/nws/selectNewsList.do' WHERE PROGRM_FILE_NM = 'NewsInfoListInqire';
-- View: egovframework/com/uss/ion/wik/bmk/EgovWikiBookmarkList
UPDATE NPROGRMLIST SET URL = '/uss/ion/wik/bmk/listWikiBookmark.do' WHERE PROGRM_FILE_NM = 'listWikiBookmark';
-- View: egovframework/com/utl/sys/fsm/EgovFileSysMntrngDetail
UPDATE NPROGRMLIST SET URL = '/utl/sys/fsm/selectFileSysMntrng.do' WHERE PROGRM_FILE_NM = 'selectFileSysMntrngList';
-- View: egovframework/com/cop/bbs/EgovBBSMasterList
UPDATE NPROGRMLIST SET URL = '/cop/bbs/selectBBSMasterInfs.do' WHERE PROGRM_FILE_NM = 'SelectBBSMasterInfs';
-- View: egovframework/com/sym/mnu/bmm/EgovBkmkMenuManageList
UPDATE NPROGRMLIST SET URL = '/sym/mnu/bmm/selectBkmkMenuManageList.do' WHERE PROGRM_FILE_NM = 'selectBkmkMenuManageList';
-- View: egovframework/com/uss/ion/bnr/EgovBannerList
UPDATE NPROGRMLIST SET URL = '/uss/ion/bnr/selectBannerList.do' WHERE PROGRM_FILE_NM = 'selectBannerList';
-- View: egovframework/com/uss/olh/hpc/EgovHpcmList
UPDATE NPROGRMLIST SET URL = '/uss/olh/hpc/selectHpcmList.do' WHERE PROGRM_FILE_NM = 'HpcmListInqire';
-- View: egovframework/com/uss/olh/qna/EgovQnaList
UPDATE NPROGRMLIST SET URL = '/uss/olh/qna/selectQnaList.do' WHERE PROGRM_FILE_NM = 'QnaListInqire';
-- View: egovframework/com/uss/ion/isg/EgovIntnetSvcGuidanceList
UPDATE NPROGRMLIST SET URL = '/uss/ion/isg/selectIntnetSvcGuidanceList.do' WHERE PROGRM_FILE_NM = 'selectIntnetSvcGuidanceList';
-- View: sts/EgovBbsStats
UPDATE NPROGRMLIST SET URL = '/sts/bst/selectBbsStats.do' WHERE PROGRM_FILE_NM = 'selectBbsStats';
-- View: egovframework/com/uss/ion/ans/EgovAnnvrsryManageBndeListPop
UPDATE NPROGRMLIST SET URL = '/uss/ion/ans/insertAnnvrsryManageBnde.do' WHERE PROGRM_FILE_NM = 'selectAnnvrsryManageList';
-- View: egovframework/com/uss/sam/stp/EgovStplatListInqire
UPDATE NPROGRMLIST SET URL = '/uss/sam/stp/StplatListInqire.do' WHERE PROGRM_FILE_NM = 'StplatListInqire';
-- View: egovframework/com/utl/sys/pxy/EgovProxySvcDetail
UPDATE NPROGRMLIST SET URL = '/utl/sys/pxy/addProxySvc.do' WHERE PROGRM_FILE_NM = 'selectProxySvcList';
-- View: egovframework/com/cop/scp/EgovArticleScrapDetail
UPDATE NPROGRMLIST SET URL = '/cop/scp/selectArticleScrapDetail.do' WHERE PROGRM_FILE_NM = 'selectScrapList';
-- View: egovframework/com/cop/smt/mrm/EgovMemoReprtDetail
UPDATE NPROGRMLIST SET URL = '/cop/smt/mrm/selectMemoReprt.do' WHERE PROGRM_FILE_NM = 'selectMemoReprtList';
-- View: uat/uia/EgovLoginUsr
UPDATE NPROGRMLIST SET URL = '/uat/uia/egovLoginUsr.do' WHERE PROGRM_FILE_NM = 'egovLoginUsr';
-- View: uat/uap/EgovLoginPolicyList
UPDATE NPROGRMLIST SET URL = '/uat/uap/selectLoginPolicyList.do' WHERE PROGRM_FILE_NM = 'selectLoginPolicyList';
-- View: cmm/uss/umt/EgovUserManage
UPDATE NPROGRMLIST SET URL = '/uss/umt/EgovUserManage.do' WHERE PROGRM_FILE_NM = 'EgovUserManage';
-- View: egovframework/com/sym/sym/srv/EgovServerDetail
UPDATE NPROGRMLIST SET URL = '/sym/sym/srv/addServer.do' WHERE PROGRM_FILE_NM = 'selectServerList';
-- View: egovframework/com/uss/sam/cpy/EgovCpyrhtPrtcPolicyListInqire
UPDATE NPROGRMLIST SET URL = '/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do' WHERE PROGRM_FILE_NM = 'CpyrhtPrtcPolicyListInqire';
-- View: sec/rmt/EgovRoleManage
UPDATE NPROGRMLIST SET URL = '/sec/rmt/EgovRoleList.do' WHERE PROGRM_FILE_NM = 'EgovRoleList';
-- View: egovframework/com/sts/ust/EgovUserStats
UPDATE NPROGRMLIST SET URL = '/sts/ust/selectUserStats.do' WHERE PROGRM_FILE_NM = 'selectUserStats';
-- View: egovframework/com/uss/ion/rwd/EgovRwardManageList
UPDATE NPROGRMLIST SET URL = '/uss/ion/rwd/selectRwardManageList.do' WHERE PROGRM_FILE_NM = 'selectRwardManageList';
-- View: egovframework/com/sym/tbm/tbr/EgovTroblReqstDetail
UPDATE NPROGRMLIST SET URL = '/sym/tbm/tbr/addTroblReqst.do' WHERE PROGRM_FILE_NM = 'selectTroblReqstList';
-- View: egovframework/com/utl/sys/ssy/EgovSynchrnServerDetail
UPDATE NPROGRMLIST SET URL = '/utl/sys/ssy/addSynchrnServer.do' WHERE PROGRM_FILE_NM = 'selectSynchrnServerList';
-- View: egovframework/com/sym/log/wlg/EgovWebLogDetail
UPDATE NPROGRMLIST SET URL = '/sym/log/wlg/SelectWebLogDetail.do' WHERE PROGRM_FILE_NM = 'SelectWebLogList';
-- View: egovframework/com/utl/sys/nsm/EgovNtwrkSvcMntrngDetail
UPDATE NPROGRMLIST SET URL = '/utl/sys/nsm/selectNtwrkSvcMntrng.do' WHERE PROGRM_FILE_NM = 'selectNtwrkSvcMntrngList';
-- View: egovframework/com/uss/ion/lsi/EgovLoginScrinImageList
UPDATE NPROGRMLIST SET URL = '/uss/ion/lsi/selectLoginScrinImageList.do' WHERE PROGRM_FILE_NM = 'selectLoginScrinImageList';
-- View: egovframework/com/sym/sym/srv/EgovServerEqpmnDetail
UPDATE NPROGRMLIST SET URL = '/sym/sym/srv/addServerEqpmn.do' WHERE PROGRM_FILE_NM = 'selectServerEqpmnList';
-- View: sec/ram/EgovAuthorManage
UPDATE NPROGRMLIST SET URL = '/sec/ram/EgovAuthorList.do' WHERE PROGRM_FILE_NM = 'EgovAuthorList';
-- View: egovframework/com/uss/ion/msi/EgovMainImageList
UPDATE NPROGRMLIST SET URL = '/uss/ion/msi/selectMainImageList.do' WHERE PROGRM_FILE_NM = 'selectMainImageList';
-- View: egovframework/com/cop/smt/mtm/EgovMemoTodoDetail
UPDATE NPROGRMLIST SET URL = '/cop/smt/mtm/selectMemoTodo.do' WHERE PROGRM_FILE_NM = 'selectMemoTodoList';
-- View: egovframework/com/sts/rst/EgovReprtStatsList
UPDATE NPROGRMLIST SET URL = '/sts/rst/selectReprtStatsList.do' WHERE PROGRM_FILE_NM = 'selectReprtStatsListView';
-- View: uss/ion/uas/EgovUserAbsnceList
UPDATE NPROGRMLIST SET URL = '/uss/ion/uas/selectUserAbsnceList.do' WHERE PROGRM_FILE_NM = 'selectUserAbsnceListView';
-- View: egovframework/com/sym/log/lgm/EgovSysLogDetail
UPDATE NPROGRMLIST SET URL = '/sym/log/lgm/SelectSysLogDetail.do' WHERE PROGRM_FILE_NM = 'SelectSysLogList';
-- View: egovframework/com/cop/ncm/EgovNcrdList
UPDATE NPROGRMLIST SET URL = '/cop/ncm/selectNcrdInfs.do' WHERE PROGRM_FILE_NM = 'selectNcrdInfs';
-- View: egovframework/com/uss/olh/awm/EgovAdministrationWordManageDetail
UPDATE NPROGRMLIST SET URL = '/uss/olh/awm/selectAdministrationWordManageDetail.do' WHERE PROGRM_FILE_NM = 'listAdministrationWordManage';
-- View: egovframework/com/uss/ion/mtg/EgovMtgPlaceResveManageList
UPDATE NPROGRMLIST SET URL = '/uss/ion/mtg/selectMtgPlaceResveManageList.do' WHERE PROGRM_FILE_NM = 'selectMtgPlaceResveManageList';
-- View: egovframework/com/uss/olh/wor/EgovWordDicaryList
UPDATE NPROGRMLIST SET URL = '/uss/olh/wor/selectWordDicaryList.do' WHERE PROGRM_FILE_NM = 'WordDicaryListInqire';
-- View: egovframework/com/cop/ncm/EgovMyNcrdList
UPDATE NPROGRMLIST SET URL = '/cop/ncm/selectMyNcrdUseInf.do' WHERE PROGRM_FILE_NM = 'selectMyNcrdUseInf';
-- View: egovframework/com/sts/dst/EgovDtaUseStatsDetail
UPDATE NPROGRMLIST SET URL = '/sts/dst/getDtaUseStats.do' WHERE PROGRM_FILE_NM = 'selectDtaUseStatsList';
-- View: egovframework/com/sym/log/tlg/EgovTrsmrcvLogInqire
UPDATE NPROGRMLIST SET URL = '/sym/log/tlg/InqireTrsmrcvLog.do' WHERE PROGRM_FILE_NM = 'SelectTrsmrcvLogList';
-- View: egovframework/com/sts/sst/EgovScrinStats
UPDATE NPROGRMLIST SET URL = '/sts/sst/selectScrinStats.do' WHERE PROGRM_FILE_NM = 'selectScrinStats';
-- View: egovframework/com/uss/ion/sit/EgovSiteList
UPDATE NPROGRMLIST SET URL = '/uss/ion/sit/selectSiteList.do' WHERE PROGRM_FILE_NM = 'SiteListInqire';
-- View: egovframework/com/uss/ion/rec/EgovRecomendSiteList
UPDATE NPROGRMLIST SET URL = '/uss/ion/rec/selectRecomendSiteList.do' WHERE PROGRM_FILE_NM = 'RecomendSiteListInqire';
-- View: egovframework/com/uss/ion/rsn/EgovRssTagService
UPDATE NPROGRMLIST SET URL = '/uss/ion/rsn/detailRssTagService.do' WHERE PROGRM_FILE_NM = 'listRssTagService';
-- View: egovframework/com/uss/ion/mtg/EgovMtgPlaceManageList
UPDATE NPROGRMLIST SET URL = '/uss/ion/mtg/selectMtgPlaceManageList.do' WHERE PROGRM_FILE_NM = 'selectMtgPlaceManageList';
-- View: egovframework/com/uss/ion/evt/EgovEventRceptConfm
UPDATE NPROGRMLIST SET URL = '/uss/ion/evt/selectEventRceptConfmList.do' WHERE PROGRM_FILE_NM = 'selectEventRceptConfmList';
-- View: cmm/sym/ccm/EgovCcmCmmnCodeList
UPDATE NPROGRMLIST SET URL = '/sym/ccm/cca/EgovCcmCmmnCodeList.do' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnCodeList';
-- View: egovframework/com/sym/log/ulg/EgovUserLogDetail
UPDATE NPROGRMLIST SET URL = '/sym/log/ulg/SelectUserLogDetail.do' WHERE PROGRM_FILE_NM = 'SelectUserLogList';
-- View: sym/mnu/mpm/EgovMenuManage
UPDATE NPROGRMLIST SET URL = '/sym/mnu/mpm/EgovMenuManageSelect.do' WHERE PROGRM_FILE_NM = 'EgovMenuManageSelect';
-- View: egovframework/com/sym/prm/EgovProgramChangeRequst
UPDATE NPROGRMLIST SET URL = '/sym/prm/EgovProgramChangeRequstSelect.do' WHERE PROGRM_FILE_NM = 'EgovProgramChangeRequstSelect';
-- View: egovframework/com/sym/sym/nwk/EgovNtwrkDetail
UPDATE NPROGRMLIST SET URL = '/sym/sym/nwk/addNtwrk.do' WHERE PROGRM_FILE_NM = 'selectNtwrkList';
-- View: egovframework/com/sym/tbm/tbp/EgovTroblProcessList
UPDATE NPROGRMLIST SET URL = '/sym/tbm/tbp/selectTroblProcessList.do' WHERE PROGRM_FILE_NM = 'selectTroblProcessList';
-- View: egovframework/com/utl/sys/srm/EgovMntrngServerList
UPDATE NPROGRMLIST SET URL = '/utl/sys/srm/selectMntrngServerList.do' WHERE PROGRM_FILE_NM = 'selectMntrngServerList';
COMMIT;
