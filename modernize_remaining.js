const data = [
    { "progrm_file_nm": "SelectBBSMasterInfs", "progrm_stre_path": "/cop/bbs/", "progrm_korean_nm": "게시판속성관리", "url": "/cop/bbs/SelectBBSMasterInfs.do" },
    { "progrm_file_nm": "insertSndngMailView", "progrm_stre_path": "/cop/ems/", "progrm_korean_nm": "메일발송", "url": "/cop/ems/insertSndngMailView.do" },
    { "progrm_file_nm": "selectSndngMailList", "progrm_stre_path": "/cop/ems/", "progrm_korean_nm": "발송메일내역", "url": "/cop/ems/selectSndngMailList.do" },
    { "progrm_file_nm": "selectDeptJobBxList", "progrm_stre_path": "/cop/smt/djm/", "progrm_korean_nm": "부서업무함관리", "url": "/cop/smt/djm/selectDeptJobBxList.do" },
    { "progrm_file_nm": "selectDeptJobList", "progrm_stre_path": "/cop/smt/djm/", "progrm_korean_nm": "부서업무정보", "url": "/cop/smt/djm/selectDeptJobList.do" },
    { "progrm_file_nm": "selectLeaderSchdulList", "progrm_stre_path": "/cop/smt/lsm/usr/", "progrm_korean_nm": "간부일정관리", "url": "/cop/smt/lsm/usr/selectLeaderSchdulList.do" },
    { "progrm_file_nm": "EgovAllSchdulManageList", "progrm_stre_path": "/cop/smt/sam/", "progrm_korean_nm": "전체일정관리", "url": "/cop/smt/sam/EgovAllSchdulManageList.do" },
    { "progrm_file_nm": "EgovDeptSchdulManageList", "progrm_stre_path": "/cop/smt/sdm/", "progrm_korean_nm": "부서일정관리", "url": "/cop/smt/sdm/EgovDeptSchdulManageList.do" },
    { "progrm_file_nm": "EgovIndvdlSchdulManageList", "progrm_stre_path": "/cop/smt/sim/", "progrm_korean_nm": "일정관리", "url": "/cop/smt/sim/EgovIndvdlSchdulManageList.do" },
    { "progrm_file_nm": "listRequestOffer", "progrm_stre_path": "/dam/spe/req/", "progrm_korean_nm": "지식정보제공", "url": "/dam/spe/req/listRequestOffer.do" },
    { "progrm_file_nm": "EgovGroupList", "progrm_stre_path": "/sec/gmt/", "progrm_korean_nm": "그룹관리", "url": "/sec/gmt/EgovGroupList.do" },
    { "progrm_file_nm": "getCntcInsttList", "progrm_stre_path": "/ssi/syi/iis/", "progrm_korean_nm": "연계기관관리", "url": "/ssi/syi/iis/getCntcInsttList.do" },
    { "progrm_file_nm": "getCntcMessageList", "progrm_stre_path": "/ssi/syi/ims/", "progrm_korean_nm": "연계메시지관리", "url": "/ssi/syi/ims/getCntcMessageList.do" },
    { "progrm_file_nm": "getCntcSttusList", "progrm_stre_path": "/ssi/syi/ist/", "progrm_korean_nm": "연계현황관리", "url": "/ssi/syi/ist/getCntcSttusList.do" },
    { "progrm_file_nm": "getSystemCntcList", "progrm_stre_path": "/ssi/syi/sim/", "progrm_korean_nm": "시스템연계관리", "url": "/ssi/syi/sim/getSystemCntcList.do" },
    { "progrm_file_nm": "selectBbsStats", "progrm_stre_path": "/sts/bst/", "progrm_korean_nm": "게시물통계", "url": "/sts/bst/selectBbsStats.do" },
    { "progrm_file_nm": "selectDtaUseStatsList", "progrm_stre_path": "/sts/dst/", "progrm_korean_nm": "자료이용현황통계", "url": "/sts/dst/selectDtaUseStatsList.do" },
    { "progrm_file_nm": "selectReprtStatsListView", "progrm_stre_path": "/sts/rst/", "progrm_korean_nm": "보고서통계", "url": "/sts/rst/selectReprtStatsListView.do" },
    { "progrm_file_nm": "selectUserStats", "progrm_stre_path": "/sts/ust/", "progrm_korean_nm": "사용자통계", "url": "/sts/ust/selectUserStats.do" },
    { "progrm_file_nm": "EgovCcmAdministCodeList", "progrm_stre_path": "/sym/ccm/adc/", "progrm_korean_nm": "행정코드관리", "url": "/sym/ccm/adc/EgovCcmAdministCodeList.do" },
    { "progrm_file_nm": "EgovCcmCmmnClCodeList", "progrm_stre_path": "/sym/ccm/ccc/", "progrm_korean_nm": "공통분류코드", "url": "/sym/ccm/ccc/EgovCcmCmmnClCodeList.do" },
    { "progrm_file_nm": "getInsttCodeRecptnList", "progrm_stre_path": "/sym/ccm/icr/", "progrm_korean_nm": "기관코드수신", "url": "/sym/ccm/icr/getInsttCodeRecptnList.do" },
    { "progrm_file_nm": "SelectSysHistoryList", "progrm_stre_path": "/sym/log/slg/", "progrm_korean_nm": "시스템이력관리", "url": "/sym/log/slg/SelectSysHistoryList.do" },
    { "progrm_file_nm": "selectBkmkMenuManageList", "progrm_stre_path": "/sym/mnu/bmm/", "progrm_korean_nm": "바로가기메뉴관리", "url": "/sym/mnu/bmm/selectBkmkMenuManageList.do" },
    { "progrm_file_nm": "EgovMenuCreatManageSelect", "progrm_stre_path": "/sym/mnu/mcm/", "progrm_korean_nm": "메뉴생성관리", "url": "/sym/mnu/mcm/EgovMenuCreatManageSelect.do" },
    { "progrm_file_nm": "EgovSiteMapng", "progrm_stre_path": "/sym/mnu/stm/", "progrm_korean_nm": "사이트맵", "url": "/sym/mnu/stm/EgovSiteMapng.do" },
    { "progrm_file_nm": "EgovProgramChangeRequstProcessListSelect", "progrm_stre_path": "/sym/prm/", "progrm_korean_nm": "프로그램변경요청처리", "url": "/sym/prm/EgovProgramChangeRequstProcessListSelect.do" },
    { "progrm_file_nm": "EgovProgramChangeRequstSelect", "progrm_stre_path": "/sym/prm/", "progrm_korean_nm": "프로그램변경요청관리", "url": "/sym/prm/EgovProgramChangeRequstSelect.do" },
    { "progrm_file_nm": "EgovProgramChgHstListSelect", "progrm_stre_path": "/sym/prm/", "progrm_korean_nm": "프로그램변경이력", "url": "/sym/prm/EgovProgramChgHstListSelect.do" },
    { "progrm_file_nm": "selectServerEqpmnList", "progrm_stre_path": "/sym/sym/srv/", "progrm_korean_nm": "서버정보관리", "url": "/sym/sym/srv/selectServerEqpmnList.do" },
    { "progrm_file_nm": "selectTroblProcessList", "progrm_stre_path": "/sym/tbm/tbp/", "progrm_korean_nm": "장애처리결과관리", "url": "/sym/tbm/tbp/selectTroblProcessList.do" },
    { "progrm_file_nm": "selectTroblReqstList", "progrm_stre_path": "/sym/tbm/tbr/", "progrm_korean_nm": "장애신청관리", "url": "/sym/tbm/tbr/selectTroblReqstList.do" },
    { "progrm_file_nm": "selectAnnvrsryMainList", "progrm_stre_path": "/uss/ion/ans/", "progrm_korean_nm": "기념일목록(확인용)", "url": "/uss/ion/ans/selectAnnvrsryMainList.do" },
    { "progrm_file_nm": "selectAnnvrsryManageList", "progrm_stre_path": "/uss/ion/ans/", "progrm_korean_nm": "기념일관리", "url": "/uss/ion/ans/selectAnnvrsryManageList.do" },
    { "progrm_file_nm": "EgovBndtCeckManageList", "progrm_stre_path": "/uss/ion/bnt/", "progrm_korean_nm": "당직체크관리", "url": "/uss/ion/bnt/EgovBndtCeckManageList.do" },
    { "progrm_file_nm": "EgovBndtManageList", "progrm_stre_path": "/uss/ion/bnt/", "progrm_korean_nm": "당직관리", "url": "/uss/ion/bnt/EgovBndtManageList.do" },
    { "progrm_file_nm": "EgovEventCmpgnList", "progrm_stre_path": "/uss/ion/ecc/", "progrm_korean_nm": "행사/이벤트/캠페인", "url": "/uss/ion/ecc/EgovEventCmpgnList.do" },
    { "progrm_file_nm": "EgovEventRcrptManageList", "progrm_stre_path": "/uss/ion/evt/", "progrm_korean_nm": "행사접수관리", "url": "/uss/ion/evt/EgovEventRcrptManageList.do" },
    { "progrm_file_nm": "EgovEventReqstManageList", "progrm_stre_path": "/uss/ion/evt/", "progrm_korean_nm": "행사신청관리", "url": "/uss/ion/evt/EgovEventReqstManageList.do" },
    { "progrm_file_nm": "selectMtgPlaceManageList", "progrm_stre_path": "/uss/ion/mtg/", "progrm_korean_nm": "회의실관리", "url": "/uss/ion/mtg/selectMtgPlaceManageList.do" },
    { "progrm_file_nm": "selectMtgPlaceResveManageList", "progrm_stre_path": "/uss/ion/mtg/", "progrm_korean_nm": "회의실예약관리", "url": "/uss/ion/mtg/selectMtgPlaceResveManageList.do" },
    { "progrm_file_nm": "selectUserAbsnceListView", "progrm_stre_path": "/uss/ion/uas/", "progrm_korean_nm": "사용자부재관리", "url": "/uss/ion/uas/selectUserAbsnceListView.do" },
    { "progrm_file_nm": "EgovVcatnManageList", "progrm_stre_path": "/uss/ion/vct/", "progrm_korean_nm": "휴가관리", "url": "/uss/ion/vct/EgovVcatnManageList.do" },
    { "progrm_file_nm": "EgovIndvdlpgeCntntsList", "progrm_stre_path": "/uss/mpe/", "progrm_korean_nm": "마이페이지관리", "url": "/uss/mpe/EgovIndvdlpgeCntntsList.do" },
    { "progrm_file_nm": "HpcmListInqire", "progrm_stre_path": "/uss/olh/hpc/", "progrm_korean_nm": "도움말", "url": "/uss/olh/hpc/HpcmListInqire.do" },
    { "progrm_file_nm": "WordDicaryListInqire", "progrm_stre_path": "/uss/olh/wor/", "progrm_korean_nm": "용어사전", "url": "/uss/olh/wor/WordDicaryListInqire.do" },
    { "progrm_file_nm": "EgovMeetingManageList", "progrm_stre_path": "/uss/olp/mgt/", "progrm_korean_nm": "회의관리", "url": "/uss/olp/mgt/EgovMeetingManageList.do" },
    { "progrm_file_nm": "CpyrhtPrtcPolicyListInqire", "progrm_stre_path": "/uss/sam/cpy/", "progrm_korean_nm": "저작권보호정책", "url": "/uss/sam/cpy/CpyrhtPrtcPolicyListInqire.do" },
    { "progrm_file_nm": "listIndvdlInfoPolicy", "progrm_stre_path": "/uss/sam/ipm/", "progrm_korean_nm": "개인정보보호정책확인", "url": "/uss/sam/ipm/listIndvdlInfoPolicy.do" },
    { "progrm_file_nm": "StplatListInqire", "progrm_stre_path": "/uss/sam/stp/", "progrm_korean_nm": "약관관리", "url": "/uss/sam/stp/StplatListInqire.do" },
    { "progrm_file_nm": "selectDeptManageListView", "progrm_stre_path": "/uss/umt/dpt/", "progrm_korean_nm": "부서관리", "url": "/uss/umt/dpt/selectDeptManageListView.do" },
    { "progrm_file_nm": "EgovEntrprsMberManage", "progrm_stre_path": "/uss/umt/", "progrm_korean_nm": "기업회원관리", "url": "/uss/umt/EgovEntrprsMberManage.do" },
    { "progrm_file_nm": "EgovMberManage", "progrm_stre_path": "/uss/umt/", "progrm_korean_nm": "일반회원관리", "url": "/uss/umt/EgovMberManage.do" },
    { "progrm_file_nm": "getDbMntrngList", "progrm_stre_path": "/utl/sys/dbm/", "progrm_korean_nm": "DB서비스모니터링", "url": "/utl/sys/dbm/getDbMntrngList.do" },
    { "progrm_file_nm": "selectFileSysMntrngList", "progrm_stre_path": "/utl/sys/fsm/", "progrm_korean_nm": "파일시스템모니터링", "url": "/utl/sys/fsm/selectFileSysMntrngList.do" },
    { "progrm_file_nm": "EgovComUtlHttpMonList", "progrm_stre_path": "/utl/sys/htm/", "progrm_korean_nm": "HTTP서비스모니터링", "url": "/utl/sys/htm/EgovComUtlHttpMonList.do" },
    { "progrm_file_nm": "selectNtwrkSvcMntrngList", "progrm_stre_path": "/utl/sys/nsm/", "progrm_korean_nm": "네트워크서비스모니터링", "url": "/utl/sys/nsm/selectNtwrkSvcMntrngList.do" },
    { "progrm_file_nm": "EgovComUtlProcessMonList", "progrm_stre_path": "/utl/sys/prm/", "progrm_korean_nm": "프로세스모니터링", "url": "/utl/sys/prm/EgovComUtlProcessMonList.do" },
    { "progrm_file_nm": "selectProxySvcList", "progrm_stre_path": "/utl/sys/pxy/", "progrm_korean_nm": "프록시서비스", "url": "/utl/sys/pxy/selectProxySvcList.do" },
    { "progrm_file_nm": "loginSessionView", "progrm_stre_path": "/utl/sys/rsc/", "progrm_korean_nm": "로그인세션정보체크", "url": "/utl/sys/rsc/loginSessionView.do" },
    { "progrm_file_nm": "selectMntrngServerList", "progrm_stre_path": "/utl/sys/srm/", "progrm_korean_nm": "서버자원모니터링-대상목록", "url": "/utl/sys/srm/selectMntrngServerList.do" },
    { "progrm_file_nm": "getTrsmrcvMntrngList", "progrm_stre_path": "/utl/sys/trm/", "progrm_korean_nm": "송수신모니터링", "url": "/utl/sys/trm/getTrsmrcvMntrngList.do" }
];

function toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
}

const prefixMap = {
    '/cop/': '/admin/collaboration/',
    '/dam/': '/admin/knowledge/',
    '/sec/': '/admin/security/',
    '/ssi/': '/admin/integration/',
    '/sts/': '/admin/stats/',
    '/sym/': '/admin/system/',
    '/uss/': '/admin/user/',
    '/utl/': '/admin/utility/'
};

const sqls = data.map(item => {
    let prefix = '';
    for (const key in prefixMap) {
        if (item.url.startsWith(key)) {
            prefix = prefixMap[key];
            break;
        }
    }

    let cleanName = item.progrm_file_nm
        .replace(/^Egov/, '')
        .replace(/^select/, '')
        .replace(/^get/, '')
        .replace(/^insert/, '')
        .replace(/List$/, '')
        .replace(/Manage$/, '')
        .replace(/ListView$/, '')
        .replace(/Inqire$/, '')
        .replace(/Select$/, '')
        .replace(/View$/, '');

    if (!cleanName) cleanName = item.progrm_file_nm;

    const kebabName = toKebabCase(cleanName);
    const modernPath = prefix + kebabName;

    return `UPDATE public.nprogrmlist SET url = '${modernPath}' WHERE progrm_file_nm = '${item.progrm_file_nm}';`;
});

console.log(sqls.join('\n'));
