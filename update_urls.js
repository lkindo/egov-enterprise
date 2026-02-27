const fs = require('fs');

const data = [{"progrm_file_nm":"CnsltAnswerListInqire","url":"/uss/olp/cnm/CnsltAnswerListInqire.do"},{"progrm_file_nm":"CnsltListInqire","url":"/uss/olp/cns/CnsltListInqire.do"},{"progrm_file_nm":"CpyrhtPrtcPolicyListInqire","url":"/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do"},{"progrm_file_nm":"EgovAllSchdulManageList","url":"/cop/smt/sam/EgovAllSchdulManageList.do"},{"progrm_file_nm":"EgovAuthorGroupList","url":"/sec/rgm/EgovAuthorGroupList.do"},{"progrm_file_nm":"EgovAuthorList","url":"/sec/ram/EgovAuthorList.do"},{"progrm_file_nm":"EgovBndtCeckManageList","url":"/uss/ion/bnt/EgovBndtCeckManageList.do"},{"progrm_file_nm":"EgovBndtManageList","url":"/uss/ion/bnt/EgovBndtManageList.do"},{"progrm_file_nm":"EgovCcmAdministCodeList","url":"/sym/ccm/adc/EgovCcmAdministCodeList.do"},{"progrm_file_nm":"EgovCcmCmmnClCodeList","url":"/sym/ccm/ccc/EgovCcmCmmnClCodeList.do"},{"progrm_file_nm":"EgovCcmCmmnCodeList","url":"/sym/ccm/cca/EgovCcmCmmnCodeList.do"},{"progrm_file_nm":"EgovCcmCmmnDetailCodeList","url":"/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do"},{"progrm_file_nm":"EgovCcmZipList","url":"/sym/ccm/zip/EgovCcmZipList.do"},{"progrm_file_nm":"EgovComDamAppraisalList","url":"/dam/app/EgovComDamAppraisalList.do"},{"progrm_file_nm":"EgovComDamManagementList","url":"/dam/mgm/EgovComDamManagementList.do"},{"progrm_file_nm":"EgovComDamMapMaterialList","url":"/dam/map/mat/EgovComDamMapMaterialList.do"},{"progrm_file_nm":"EgovComDamMapTeamList","url":"/dam/map/tea/EgovComDamMapTeamList.do"},{"progrm_file_nm":"EgovComDamPersonalList","url":"/dam/per/EgovComDamPersonalList.do"},{"progrm_file_nm":"EgovComDamSpecialistList","url":"/dam/spe/spe/EgovComDamSpecialistList.do"},{"progrm_file_nm":"EgovComUtlHttpMonList","url":"/utl/sys/htm/EgovComUtlHttpMonList.do"},{"progrm_file_nm":"EgovComUtlProcessMonList","url":"/utl/sys/prm/EgovComUtlProcessMonList.do"},{"progrm_file_nm":"EgovCtsnnConfmList","url":"/uss/ion/ctn/EgovCtsnnConfmList.do"},{"progrm_file_nm":"EgovDeptAuthorList","url":"/sec/drm/EgovDeptAuthorList.do"},{"progrm_file_nm":"EgovDeptSchdulManageList","url":"/cop/smt/sdm/EgovDeptSchdulManageList.do"},{"progrm_file_nm":"EgovDiaryManageList","url":"/cop/smt/dsm/EgovDiaryManageList.do"},{"progrm_file_nm":"EgovEntrprsMberManage","url":"/uss/umt/EgovEntrprsMberManage.do"},{"progrm_file_nm":"EgovEventCmpgnList","url":"/uss/ion/ecc/EgovEventCmpgnList.do"},{"progrm_file_nm":"EgovEventRcrptManageList","url":"/uss/ion/evt/EgovEventRcrptManageList.do"},{"progrm_file_nm":"EgovEventReqstManageList","url":"/uss/ion/evt/EgovEventReqstManageList.do"},{"progrm_file_nm":"EgovGroupList","url":"/sec/gmt/EgovGroupList.do"},{"progrm_file_nm":"EgovIndvdlpgeCntntsList","url":"/uss/mpe/EgovIndvdlpgeCntntsList.do"},{"progrm_file_nm":"EgovIndvdlSchdulManageList","url":"/cop/smt/sim/EgovIndvdlSchdulManageList.do"},{"progrm_file_nm":"egovLoginUsr","url":"/uat/uia/egovLoginUsr.do"},{"progrm_file_nm":"EgovMberManage","url":"/uss/umt/EgovMberManage.do"},{"progrm_file_nm":"EgovMeetingManageList","url":"/uss/olp/mgt/EgovMeetingManageList.do"},{"progrm_file_nm":"EgovMenuCreatManageSelect","url":"/sym/mnu/mcm/EgovMenuCreatManageSelect.do"},{"progrm_file_nm":"EgovMenuManageSelect","url":"/sym/mnu/mpm/EgovMenuManageSelect.do"},{"progrm_file_nm":"EgovProgramChangeRequstProcessListSelect","url":"/sym/prm/EgovProgramChangeRequstProcessListSelect.do"},{"progrm_file_nm":"EgovProgramChangeRequstSelect","url":"/sym/prm/EgovProgramChangeRequstSelect.do"},{"progrm_file_nm":"EgovProgramChgHstListSelect","url":"/sym/prm/EgovProgramChgHstListSelect.do"},{"progrm_file_nm":"EgovProgramListManageSelect","url":"/sym/prm/EgovProgramListManageSelect.do"},{"progrm_file_nm":"EgovQustnrItemManageList","url":"/uss/olp/qim/EgovQustnrItemManageList.do"},{"progrm_file_nm":"EgovQustnrManageList","url":"/uss/olp/qmc/EgovQustnrManageList.do"},{"progrm_file_nm":"EgovQustnrQestnManageList","url":"/uss/olp/qqm/EgovQustnrQestnManageList.do"},{"progrm_file_nm":"EgovQustnrRespondInfoManageList","url":"/uss/olp/qnn/EgovQustnrRespondInfoManageList.do"},{"progrm_file_nm":"EgovQustnrRespondManageList","url":"/uss/olp/qrm/EgovQustnrRespondManageList.do"},{"progrm_file_nm":"EgovQustnrTmplatManageList","url":"/uss/olp/qtm/EgovQustnrTmplatManageList.do"},{"progrm_file_nm":"EgovRestdeList","url":"/sym/cal/EgovRestdeList.do"},{"progrm_file_nm":"EgovRoleList","url":"/sec/rmt/EgovRoleList.do"},{"progrm_file_nm":"EgovRwardConfmList","url":"/uss/ion/rwd/EgovRwardConfmList.do"},{"progrm_file_nm":"EgovSiteMapng","url":"/sym/mnu/stm/EgovSiteMapng.do"},{"progrm_file_nm":"EgovTnextrlHrInfoList","url":"/uss/ion/ecc/EgovTnextrlHrInfoList.do"},{"progrm_file_nm":"EgovUserManage","url":"/uss/umt/EgovUserManage.do"},{"progrm_file_nm":"EgovVcatnConfmList","url":"/uss/ion/vct/EgovVcatnConfmList.do"},{"progrm_file_nm":"EgovVcatnManageList","url":"/uss/ion/vct/EgovVcatnManageList.do"},{"progrm_file_nm":"FaqListInqire","url":"/uss/olh/faq/FaqListInqire.do"},{"progrm_file_nm":"getBackupOpertList","url":"/sym/sym/bak/getBackupOpertList.do"},{"progrm_file_nm":"getBackupResultList","url":"/sym/sym/bak/getBackupResultList.do"},{"progrm_file_nm":"getBatchOpertList","url":"/sym/bat/getBatchOpertList.do"},{"progrm_file_nm":"getBatchResultList","url":"/sym/bat/getBatchResultList.do"},{"progrm_file_nm":"getBatchSchdulList","url":"/sym/bat/getBatchSchdulList.do"},{"progrm_file_nm":"getCntcInsttList","url":"/ssi/syi/iis/getCntcInsttList.do"},{"progrm_file_nm":"getCntcMessageList","url":"/ssi/syi/ims/getCntcMessageList.do"},{"progrm_file_nm":"getCntcSttusList","url":"/ssi/syi/ist/getCntcSttusList.do"},{"progrm_file_nm":"getDbMntrngList","url":"/utl/sys/dbm/getDbMntrngList.do"},{"progrm_file_nm":"getInsttCodeRecptnList","url":"/sym/ccm/icr/getInsttCodeRecptnList.do"},{"progrm_file_nm":"getMainImageResult","url":"/uss/ion/msi/getMainImageResult.do"},{"progrm_file_nm":"getSystemCntcList","url":"/ssi/syi/sim/getSystemCntcList.do"},{"progrm_file_nm":"getTrsmrcvMntrngList","url":"/utl/sys/trm/getTrsmrcvMntrngList.do"},{"progrm_file_nm":"HpcmListInqire","url":"/uss/olh/hpc/HpcmListInqire.do"},{"progrm_file_nm":"insertSndngMailView","url":"/cop/ems/insertSndngMailView.do"},{"progrm_file_nm":"listAdministrationWord","url":"/uss/olh/awm/listAdministrationWord.do"},{"progrm_file_nm":"listAdministrationWordManage","url":"/uss/olh/awm/listAdministrationWordManage.do"},{"progrm_file_nm":"listIndvdlInfoPolicy","url":"/uss/sam/ipm/listIndvdlInfoPolicy.do"},{"progrm_file_nm":"listNoteRecptn","url":"/uss/ion/ntr/listNoteRecptn.do"},{"progrm_file_nm":"listNoteTrnsmit","url":"/uss/ion/nts/listNoteTrnsmit.do"},{"progrm_file_nm":"listOnlineManual","url":"/uss/olh/omm/selectOnlineManualList.do"},{"progrm_file_nm":"listOnlinePollManage","url":"/uss/olp/opm/listOnlinePollManage.do"},{"progrm_file_nm":"listOnlinePollPartcptn","url":"/uss/olp/opp/listOnlinePollPartcptn.do"},{"progrm_file_nm":"listPopup","url":"/uss/ion/pwm/listPopup.do"},{"progrm_file_nm":"listRecentSrchwrd","url":"/uss/ion/rsm/listRecentSrchwrd.do"},{"progrm_file_nm":"listRequestOffer","url":"/dam/spe/req/listRequestOffer.do"},{"progrm_file_nm":"listRssTagManage","url":"/uss/ion/rss/listRssTagManage.do"},{"progrm_file_nm":"listRssTagService","url":"/uss/ion/rsn/listRssTagService.do"},{"progrm_file_nm":"listUnityLink","url":"/uss/ion/ulm/listUnityLink.do"},{"progrm_file_nm":"listWikiBookmark","url":"/uss/ion/wik/bmk/listWikiBookmark.do"},{"progrm_file_nm":"loginSessionView","url":"/utl/sys/rsc/loginSessionView.do"},{"progrm_file_nm":"NewsInfoListInqire","url":"/uss/ion/nws/NewsInfoListInqire.do"},{"progrm_file_nm":"OnlineManualUserList","url":"/uss/olh/omn/selectOnlineManualList.do"},{"progrm_file_nm":"QnaAnswerListInqire","url":"/uss/olh/qnm/QnaAnswerListInqire.do"},{"progrm_file_nm":"QnaListInqire","url":"/uss/olh/qna/QnaListInqire.do"},{"progrm_file_nm":"RecomendSiteListInqire","url":"/uss/ion/rec/RecomendSiteListInqire.do"},{"progrm_file_nm":"registEgovNoteManage","url":"/uss/ion/ntm/registEgovNoteManage.do"},{"progrm_file_nm":"selectAdbkList","url":"/cop/adb/selectAdbkList.do"},{"progrm_file_nm":"selectAnnvrsryMainList","url":"/uss/ion/ans/selectAnnvrsryMainList.do"},{"progrm_file_nm":"selectAnnvrsryManageList","url":"/uss/ion/ans/selectAnnvrsryManageList.do"},{"progrm_file_nm":"selectBannerList","url":"/uss/ion/bnr/selectBannerList.do"},{"progrm_file_nm":"selectBannerMainList","url":"/uss/ion/bnr/selectBannerMainList.do"},{"progrm_file_nm":"SelectBBSMasterInfs","url":"/cop/bbs/SelectBBSMasterInfs.do"},{"progrm_file_nm":"selectBbsStats","url":"/sts/bst/selectBbsStats.do"},{"progrm_file_nm":"selectBBSUseInfs","url":"/cop/com/selectBBSUseInfs.do"},{"progrm_file_nm":"selectBkmkMenuManageList","url":"/sym/mnu/bmm/selectBkmkMenuManageList.do"},{"progrm_file_nm":"selectCmmntyInfs","url":"/cop/cmy/selectCmmntyInfs.do"},{"progrm_file_nm":"selectConectStats","url":"/sts/cst/selectConectStats.do"},{"progrm_file_nm":"selectCtsnnManageList","url":"/uss/ion/ctn/selectCtsnnManageList.do"},{"progrm_file_nm":"selectDeptJobBxList","url":"/cop/smt/djm/selectDeptJobBxList.do"},{"progrm_file_nm":"selectDeptJobList","url":"/cop/smt/djm/selectDeptJobList.do"},{"progrm_file_nm":"selectDeptManageListView","url":"/uss/umt/dpt/selectDeptManageListView.do"},{"progrm_file_nm":"selectDtaUseStatsList","url":"/sts/dst/selectDtaUseStatsList.do"},{"progrm_file_nm":"selectEventRceptConfmList","url":"/uss/ion/evt/selectEventRceptConfmList.do"},{"progrm_file_nm":"selectFileSysMntrngList","url":"/utl/sys/fsm/selectFileSysMntrngList.do"},{"progrm_file_nm":"selectIntnetSvcGuidanceList","url":"/uss/ion/isg/selectIntnetSvcGuidanceList.do"},{"progrm_file_nm":"selectLeaderSchdulList","url":"/cop/smt/lsm/usr/selectLeaderSchdulList.do"},{"progrm_file_nm":"SelectLoginLogList","url":"/sym/log/clg/SelectLoginLogList.do"},{"progrm_file_nm":"selectLoginPolicyList","url":"/uat/uap/selectLoginPolicyList.do"},{"progrm_file_nm":"selectLoginScrinImageList","url":"/uss/ion/lsi/selectLoginScrinImageList.do"},{"progrm_file_nm":"selectMainImageList","url":"/uss/ion/msi/selectMainImageList.do"},{"progrm_file_nm":"selectMemoReprtList","url":"/cop/smt/mrm/selectMemoReprtList.do"},{"progrm_file_nm":"selectMemoTodoList","url":"/cop/smt/mtm/selectMemoTodoList.do"},{"progrm_file_nm":"selectMntrngServerList","url":"/utl/sys/srm/selectMntrngServerList.do"},{"progrm_file_nm":"selectMtgPlaceManageList","url":"/uss/ion/mtg/selectMtgPlaceManageList.do"},{"progrm_file_nm":"selectMtgPlaceResveManageList","url":"/uss/ion/mtg/selectMtgPlaceResveManageList.do"},{"progrm_file_nm":"selectMyNcrdUseInf","url":"/cop/ncm/selectMyNcrdUseInf.do"},{"progrm_file_nm":"selectNcrdInfs","url":"/cop/ncm/selectNcrdInfs.do"},{"progrm_file_nm":"selectNotificationList","url":"/uss/ion/noi/selectNotificationList.do"},{"progrm_file_nm":"selectNtwrkList","url":"/sym/sym/nwk/selectNtwrkList.do"},{"progrm_file_nm":"selectNtwrkSvcMntrngList","url":"/utl/sys/nsm/selectNtwrkSvcMntrngList.do"},{"progrm_file_nm":"selectProxySvcList","url":"/utl/sys/pxy/selectProxySvcList.do"},{"progrm_file_nm":"selectReprtStatsListView","url":"/sts/rst/selectReprtStatsListView.do"},{"progrm_file_nm":"selectRwardManageList","url":"/uss/ion/rwd/selectRwardManageList.do"},{"progrm_file_nm":"selectScrapList","url":"/cop/scp/selectScrapList.do"},{"progrm_file_nm":"selectScrinStats","url":"/sts/sst/selectScrinStats.do"},{"progrm_file_nm":"selectServerEqpmnList","url":"/sym/sym/srv/selectServerEqpmnList.do"},{"progrm_file_nm":"selectServerList","url":"/sym/sym/srv/selectServerList.do"},{"progrm_file_nm":"selectSmsList","url":"/cop/sms/selectSmsList.do"},{"progrm_file_nm":"selectSndngMailList","url":"/cop/ems/selectSndngMailList.do"},{"progrm_file_nm":"selectSynchrnServerList","url":"/utl/sys/ssy/selectSynchrnServerList.do"},{"progrm_file_nm":"SelectSysHistoryList","url":"/sym/log/slg/SelectSysHistoryList.do"},{"progrm_file_nm":"SelectSysLogList","url":"/sym/log/lgm/SelectSysLogList.do"},{"progrm_file_nm":"selectTemplateInfs","url":"/cop/tpl/selectTemplateInfs.do"},{"progrm_file_nm":"selectTroblProcessList","url":"/sym/tbm/tbp/selectTroblProcessList.do"},{"progrm_file_nm":"selectTroblReqstList","url":"/sym/tbm/tbr/selectTroblReqstList.do"},{"progrm_file_nm":"SelectTrsmrcvLogList","url":"/sym/log/tlg/SelectTrsmrcvLogList.do"},{"progrm_file_nm":"selectTwitterMain","url":"/uss/ion/tir/selectTwitterMain.do"},{"progrm_file_nm":"selectUserAbsnceListView","url":"/uss/ion/uas/selectUserAbsnceListView.do"},{"progrm_file_nm":"SelectUserLogList","url":"/sym/log/ulg/SelectUserLogList.do"},{"progrm_file_nm":"selectUserStats","url":"/sts/ust/selectUserStats.do"},{"progrm_file_nm":"SelectWebLogList","url":"/sym/log/wlg/SelectWebLogList.do"},{"progrm_file_nm":"selectWikMnthngReprtList","url":"/cop/smt/wmr/selectWikMnthngReprtList.do"},{"progrm_file_nm":"SiteListInqire","url":"/uss/ion/sit/SiteListInqire.do"},{"progrm_file_nm":"StplatListInqire","url":"/uss/sam/stp/StplatListInqire.do"},{"progrm_file_nm":"WordDicaryListInqire","url":"/uss/olh/wor/WordDicaryListInqire.do"},{"progrm_file_nm":"EgovMenuListSelect","url":"/sym/mnu/mpm/EgovMenuListSelect.do"}];

const mapLegacyUrl = (url) => {
  if (!url || url === '#') return '#';

  if (url.includes('selectBoardList.do')) {
    let bbsId = '';
    try { bbsId = new URLSearchParams(url.split('?')[1]).get('bbsId'); } catch(e){}
    return '/cop/bbs/selectBoardList' + (bbsId ? '?bbsId=' + bbsId : '');
  }

  if (url.includes('selectBoardArticle.do')) {
    let bbsId = '', nttId = '';
    try { 
      const params = new URLSearchParams(url.split('?')[1]);
      bbsId = params.get('bbsId');
      nttId = params.get('nttId');
    } catch(e){}
    return '/cop/bbs/selectBoardArticle/' + nttId + '?bbsId=' + bbsId;
  }

  // Notification / Banner / Login Image
  if (url.includes('selectNotificationList.do')) return '/admin/uss/ion/notification';
  if (url.includes('selectBannerMainList.do')) return '/admin/uss/ion/banner';
  if (url.includes('selectLoginScrinImageList.do')) return '/admin/uss/ion/login-image';
  
  // Search / Main Image / Links
  if (url.includes('listRecentSrchwrd.do')) return '/admin/uss/ion/recent-search';
  if (url.includes('selectMainImageList.do') || url.includes('getMainImageResult.do')) return '/admin/uss/ion/main-image';
  if (url.includes('listUnityLink.do')) return '/admin/uss/ion/unity-link';
  if (url.includes('selectIntnetSvcGuidanceList.do')) return '/admin/uss/ion/internet-service';
  
  // Wiki / RSS / Twitter
  if (url.includes('listWikiBookmark.do')) return '/admin/uss/ion/wiki';
  if (url.includes('listRssTagManage.do') || url.includes('listRssTagService.do')) return '/admin/uss/ion/rss';
  if (url.includes('selectTwitterMain.do')) return '/admin/uss/ion/twitter';
  
  // Note (Message) Management
  if (url.includes('registEgovNoteManage.do') || url.includes('listNoteRecptn.do') || url.includes('listNoteTrnsmit.do')) return '/admin/uss/ion/note';
  
  // Employee Services (Ctsnn, Vcatn, Reward, Event)
  if (url.includes('selectCtsnnManageList.do') || url.includes('EgovCtsnnConfmList.do')) return '/admin/uss/ion/ctsnn';
  if (url.includes('EgovVcatnConfmList.do') || url.includes('selectVcatnManageList.do')) return '/admin/uss/ion/vcatn';
  if (url.includes('selectRwardManageList.do') || url.includes('EgovRwardConfmList.do')) return '/admin/uss/ion/reward';
  if (url.includes('selectEventRceptConfmList.do') || url.includes('selectEventManageList.do')) return '/admin/uss/ion/event';

  // Info Services
  if (url.includes('NewsInfoListInqire.do')) return '/admin/uss/ion/news';
  if (url.includes('SiteListInqire.do')) return '/admin/uss/ion/site';
  if (url.includes('RecomendSiteListInqire.do')) return '/admin/uss/ion/recommend-site';
  if (url.includes('EgovTnextrlHrInfoList.do')) return '/admin/uss/ion/external-hr';
  if (url.includes('listPopup.do')) return '/admin/uss/ion/popup';

  // --- Online Help
  if (url.includes('QnaAnswerListInqire.do')) return '/admin/uss/olh/qna-answer';
  if (url.includes('listAdministrationWord')) return '/admin/uss/olh/admin-word';
  if (url.includes('selectOnlineManualList.do')) return '/admin/uss/olh/online-manual';

  // --- Support / Survey
  if (url.includes('CnsltListInqire.do')) return '/admin/uss/olp/cnslt';
  if (url.includes('CnsltAnswerListInqire.do')) return '/admin/uss/olp/cnslt-answer';
  if (url.includes('EgovQustnrManageList.do') || url.includes('EgovQustnrRespondInfoManageList.do')) return '/admin/uss/olp/qustnr';
  if (url.includes('EgovQustnrTmplatManageList.do')) return '/admin/uss/olp/qustnr-tmpl';
  if (url.includes('EgovQustnrRespondManageList.do')) return '/admin/uss/olp/qustnr-resp';
  if (url.includes('EgovQustnrQestnManageList.do')) return '/admin/uss/olp/qustnr-qestn';
  if (url.includes('EgovQustnrItemManageList.do')) return '/admin/uss/olp/qustnr-item';
  if (url.includes('listOnlinePoll')) return '/admin/uss/olp/online-poll';

  // --- Collaboration (cop) Mapping ---
  if (url.includes('EgovCmmntyList.do') || url.includes('selectCmmntyInfs.do')) return '/cop/cmy/selectCommunityList';
  if (url.includes('selectTemplateInfs.do')) return '/cop/tpl/selectTemplateList';
  if (url.includes('selectBBSUseInfs.do')) return '/cop/com/selectBBSUseInfs';
  if (url.includes('EgovAddressBookList.do') || url.includes('selectAdbkList.do')) return '/cop/adb/selectAddressBookList';
  if (url.includes('EgovSchdulManageList.do')) return '/cop/smt/sim/selectScheduleList';
  if (url.includes('EgovScrapList.do') || url.includes('selectScrapList.do')) return '/cop/scp/selectScrapList';
  if (url.includes('selectSmsList.do')) return '/cop/sms/selectSmsList';
  if (url.includes('selectNcrdInfs.do')) return '/cop/ncm/selectNcrdList';
  if (url.includes('selectMyNcrdUseInf.do')) return '/cop/ncm/selectMyNcrdList';
  if (url.includes('EgovDiaryManageList.do')) return '/cop/smt/dsm/selectDiaryList';
  if (url.includes('selectWikMnthngReprtList.do')) return '/cop/smt/wmr/selectReportList';
  if (url.includes('selectMemoTodoList.do')) return '/cop/smt/mtm/selectTodoList';
  if (url.includes('selectMemoReprtList.do')) return '/cop/smt/mrm/selectMemoReportList';
  if (url.includes('EgovDeptJobBxList.do')) return '/cop/smt/djm/selectDeptJobList';
  if (url.includes('EgovQustnrRespondInfoList.do')) return '/survey';

  // --- Admin / System (sym) Mapping ---
  if (url.includes('EgovAuthorList.do')) return '/admin/security/authority';
  if (url.includes('EgovAuthorGroupList.do')) return '/admin/security/group';
  if (url.includes('EgovRoleList.do')) return '/admin/security/role';
  if (url.includes('EgovUserManage.do')) return '/admin/user/manage';
  if (url.includes('EgovMenuManageSelect.do') || url.includes('EgovMenuListSelect.do')) return '/admin/system/menus';
  if (url.includes('EgovProgramListManageSelect.do')) return '/admin/system/programs';
  if (url.includes('EgovCcmZipList.do')) return '/admin/system/common-code/zip';
  if (url.includes('egovLoginUsr.do')) return '/login';

  return null;
};

const statements = [];
for (const item of data) {
  const mapped = mapLegacyUrl(item.url);
  if (mapped && mapped !== item.url) {
    statements.push(`UPDATE public.nprogrmlist SET url = '${mapped}' WHERE progrm_file_nm = '${item.progrm_file_nm}';`);
  }
}
fs.writeFileSync('C:\\Users\\lkind\\.gemini\\antigravity\\brain\\update_urls.sql', statements.join('\n'));
console.log('SQL generated. Count: ' + statements.length);
