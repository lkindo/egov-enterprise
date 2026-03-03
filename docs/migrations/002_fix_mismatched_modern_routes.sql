-- ============================================================
-- NMENUINFO 테이블의 modern_route 경로 정정 (V3)
-- 실제 프런트엔드 물리 경로와 일치하도록 전체 매핑을 수행합니다.
-- ============================================================

-- 1. 로그 및 시스템 관제 (Audit)
UPDATE NMENUINFO SET modern_route = '/admin/system/audit' WHERE modern_route = '/admin/system/logs' OR progrm_file_nm = 'SelectSysLogList';
UPDATE NMENUINFO SET modern_route = '/admin/system/audit' WHERE progrm_file_nm IN ('SelectUserLogList', 'SelectTrsmrcvLogList', 'SelectWebLogList', 'SelectLoginLogList');

-- 2. 보안 및 권한 관리 (Security)
UPDATE NMENUINFO SET modern_route = '/admin/security/dept-authority' WHERE progrm_file_nm = 'EgovDeptAuthorList';
UPDATE NMENUINFO SET modern_route = '/admin/user/login-policy' WHERE progrm_file_nm = 'selectLoginPolicyList';

-- 3. 스마트 일정 및 업무 (Smart Toolkit)
UPDATE NMENUINFO SET modern_route = '/smart-toolkit/schedule' WHERE progrm_file_nm IN ('EgovIndvdlSchdulManageList', 'EgovAllSchdulManageList', 'selectLeaderSchdulList', 'getBatchSchdulList', 'selectLeaderSchdulList');
UPDATE NMENUINFO SET modern_route = '/smart-toolkit/schedule/dept' WHERE progrm_file_nm = 'EgovDeptSchdulManageList';
UPDATE NMENUINFO SET modern_route = '/smart-toolkit/dept-job' WHERE progrm_file_nm IN ('selectDeptJobList', 'selectDeptJobBxList');
UPDATE NMENUINFO SET modern_route = '/smart-toolkit/work-report' WHERE progrm_file_nm IN ('selectWikMnthngReprtList', 'selectMemoTodoList', 'selectMemoReprtList');

-- 4. 임직원 복지 및 근태 (USS/ION)
UPDATE NMENUINFO SET modern_route = '/uss/ion/vacation' WHERE modern_route = '/uss/ion/vacations' OR progrm_file_nm IN ('EgovVcatnManageList', 'EgovVcatnConfmList');
UPDATE NMENUINFO SET modern_route = '/uss/ion/anniversaries' WHERE progrm_file_nm IN ('selectAnnvrsryManageList', 'selectAnnvrsryMainList');
UPDATE NMENUINFO SET modern_route = '/uss/ion/duty' WHERE progrm_file_nm IN ('EgovBndtManageList', 'EgovBndtCeckManageList');
UPDATE NMENUINFO SET modern_route = '/uss/ion/events' WHERE progrm_file_nm IN ('EgovEventCmpgnList', 'EgovEventReqstManageList', 'EgovEventRcrptManageList', 'selectEventRceptConfmList');
UPDATE NMENUINFO SET modern_route = '/uss/ion/user-absences' WHERE progrm_file_nm = 'selectUserAbsnceListView';
UPDATE NMENUINFO SET modern_route = '/admin/system/reward' WHERE progrm_file_nm IN ('selectRwardManageList', 'EgovRwardConfmList');

-- 5. 시스템 설정 및 공통 코드
UPDATE NMENUINFO SET modern_route = '/admin/system/common-code/groups' WHERE progrm_file_nm = 'EgovCcmCmmnClCodeList';
UPDATE NMENUINFO SET modern_route = '/admin/system/common-code/codes' WHERE progrm_file_nm = 'EgovCcmCmmnCodeList';
UPDATE NMENUINFO SET modern_route = '/admin/system/common-code/details' WHERE progrm_file_nm = 'EgovCcmCmmnDetailCodeList';
UPDATE NMENUINFO SET modern_route = '/admin/system/menus' WHERE progrm_file_nm IN ('EgovMenuListSelect', 'EgovMenuManageSelect');
UPDATE NMENUINFO SET modern_route = '/admin/system/programs' WHERE progrm_file_nm = 'EgovProgramListManageSelect';

-- 6. 지식 아카이브 (DAM)
UPDATE NMENUINFO SET modern_route = '/admin/dam/personal' WHERE progrm_file_nm = 'EgovComDamPersonalList';
UPDATE NMENUINFO SET modern_route = '/admin/dam/map' WHERE progrm_file_nm IN ('EgovComDamMapMaterialList', 'EgovComDamMapTeamList');
UPDATE NMENUINFO SET modern_route = '/admin/dam/specialist' WHERE progrm_file_nm = 'EgovComDamSpecialistList';
UPDATE NMENUINFO SET modern_route = '/admin/dam/management' WHERE progrm_file_nm = 'EgovComDamManagementList';
UPDATE NMENUINFO SET modern_route = '/admin/dam/appraisal' WHERE progrm_file_nm = 'EgovComDamAppraisalList';

-- 7. 설문 및 투표 (Survey)
UPDATE NMENUINFO SET modern_route = '/admin/survey/manage' WHERE progrm_file_nm IN ('EgovQustnrManageList', 'EgovQustnrTmplatManageList', 'EgovQustnrRespondManageList', 'EgovQustnrQestnManageList', 'EgovQustnrItemManageList');
UPDATE NMENUINFO SET modern_route = '/survey/response' WHERE progrm_file_nm = 'EgovQustnrRespondInfoManageList';

-- 8. 도움말 및 상담 (Help)
UPDATE NMENUINFO SET modern_route = '/admin/help/faq' WHERE progrm_file_nm = 'FaqListInqire';
UPDATE NMENUINFO SET modern_route = '/admin/help/qna' WHERE progrm_file_nm IN ('CnsltListInqire', 'CnsltAnswerListInqire');

-- 9. 인사이트 및 통계 (Stats)
UPDATE NMENUINFO SET modern_route = '/admin/stats' WHERE progrm_file_nm = 'selectConectStats';

-- 10. 커뮤니티 및 게시판 (Community)
UPDATE NMENUINFO SET modern_route = '/admin/community' WHERE progrm_file_nm LIKE '%BBSMaster%' OR progrm_file_nm LIKE '%Cmmnty%';
UPDATE NMENUINFO SET modern_route = '/cop/bbs/selectBoardList' WHERE progrm_file_nm = 'selectBBSUseInfs';
UPDATE NMENUINFO SET modern_route = '/cop/scp/selectScrapList' WHERE progrm_file_nm = 'selectScrapList';

-- 검증
SELECT menu_no, menu_nm, modern_route FROM NMENUINFO WHERE modern_route IS NOT NULL;
