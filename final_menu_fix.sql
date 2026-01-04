-- Auto-generated Menu-Controller Matching Fixes (Refined)
BEGIN;
-- Menu: 권한그룹관리 | Reason: Match: 권한그룹관리 (Ratio: 0.80)
UPDATE NPROGRMLIST SET URL = '/sec/rgm/EgovAuthorGroupList.do' WHERE PROGRM_FILE_NM = 'EgovAuthorGroupList';

-- Menu: 부서관리 | Reason: Match: 부서권한관리 (Ratio: 0.80)
UPDATE NPROGRMLIST SET URL = '/sec/drm/EgovDeptAuthorList.do' WHERE PROGRM_FILE_NM = 'selectDeptManageListView';

-- Menu: 시스템관리 | Reason: Match: 시스템연계관리 (Ratio: 0.83)
-- Old: dir -> New: /ssi/syi/sim/getSystemCntcList.do
UPDATE NPROGRMLIST SET URL = '/ssi/syi/sim/getSystemCntcList.do' WHERE PROGRM_FILE_NM = 'dir';

-- Menu: 공통분류코드 | Reason: Match: 공통분류코드 (Ratio: 0.80)
UPDATE NPROGRMLIST SET URL = '/sym/ccm/ccc/SelectCcmCmmnClCodeList.do' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnClCodeList';

-- Menu: 공통상세코드 | Reason: Match: 공통상세코드 (Ratio: 0.80)
UPDATE NPROGRMLIST SET URL = '/sym/ccm/cde/SelectCcmCmmnDetailCodeList.do' WHERE PROGRM_FILE_NM = 'EgovCcmCmmnDetailCodeList';

-- Menu: 로그관리 | Reason: Match: 로그관리 (Ratio: 0.75)
-- Old: /sym/log/lgm/SelectSysLogDetail.do -> New: /sym/log/lgm/SelectSysLogList.do
UPDATE NPROGRMLIST SET URL = '/sym/log/lgm/SelectSysLogList.do' WHERE PROGRM_FILE_NM = 'SelectSysLogList';

-- Menu: 사용로그관리 | Reason: Match: 사용로그관리 (Ratio: 0.80)
UPDATE NPROGRMLIST SET URL = '/sym/log/ulg/SelectUserLogList.do' WHERE PROGRM_FILE_NM = 'SelectUserLogList';

-- Menu: 송/수신로그관리 | Reason: Match: 송/수신로그관리 (Ratio: 0.67)
UPDATE NPROGRMLIST SET URL = '/sym/log/tlg/SelectTrsmrcvLogList.do' WHERE PROGRM_FILE_NM = 'SelectTrsmrcvLogList';

-- Menu: 시스템이력관리 | Reason: Match: 시스템이력관리 (Ratio: 0.71)
-- Old: /sym/log/slg/EgovSysHistList.do -> New: /sym/log/slg/SelectSysHistoryList.do
UPDATE NPROGRMLIST SET URL = '/sym/log/slg/SelectSysHistoryList.do' WHERE PROGRM_FILE_NM = 'SelectSysHistoryList';

-- Menu: 웹로그관리 | Reason: Match: 웹로그관리 (Ratio: 0.89)
UPDATE NPROGRMLIST SET URL = '/sym/log/wlg/SelectWebLogList.do' WHERE PROGRM_FILE_NM = 'SelectWebLogList';

-- Menu: 배치결과관리 | Reason: Match: 배치결과관리 (Ratio: 0.67)
UPDATE NPROGRMLIST SET URL = '/sym/bat/getBatchResultList.do' WHERE PROGRM_FILE_NM = 'getBatchResultList';

-- Menu: 백업결과관리 | Reason: Match: 배치결과관리 (Ratio: 0.67) -- 주의: 백업인데 배치? 일단 보류 (삭제됨)

-- Menu: 시스템연계관리 | Reason: Match: 시스템연계관리 (Ratio: 0.62)
UPDATE NPROGRMLIST SET URL = '/ssi/syi/sim/getSystemCntcList.do' WHERE PROGRM_FILE_NM = 'getSystemCntcList';

-- Menu: 연계현황관리 | Reason: Match: 연계현황관리 (Ratio: 0.67)
UPDATE NPROGRMLIST SET URL = '/ssi/syi/ist/getCntcSttusList.do' WHERE PROGRM_FILE_NM = 'getCntcSttusList';

-- Menu: 연계메시지관리 | Reason: Match: 연계메시지관리 (Ratio: 0.62)
UPDATE NPROGRMLIST SET URL = '/ssi/syi/ims/getCntcMessageList.do' WHERE PROGRM_FILE_NM = 'getCntcMessageList';

-- Menu: 지식정보제공 | Reason: Match: 지식정보제공 (Ratio: 0.67)
UPDATE NPROGRMLIST SET URL = '/dam/spe/req/listRequestOffer.do' WHERE PROGRM_FILE_NM = 'listRequestOffer';

-- 접속로그관리 추가 보정 (수동)
-- Menu: 접속로그관리
UPDATE NPROGRMLIST SET URL = '/sym/log/clg/SelectLoginLogList.do' WHERE PROGRM_FILE_NM = 'SelectLoginLogList';

-- 프로그램관리 추가 보정 (수동)
-- Menu: 프로그램관리
UPDATE NPROGRMLIST SET URL = '/sym/prm/EgovProgramListManageSelect.do' WHERE PROGRM_FILE_NM = 'EgovProgramListManageSelect';

COMMIT;
