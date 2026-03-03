-- ============================================================
-- NMENUINFO 테이블의 modern_route 경로 정정
-- 실제 프런트엔드 물리 경로(smart-toolkit, audit 등)와 일치시킵니다.
-- ============================================================

-- 1. 로그 관리 (logs -> audit)
UPDATE NMENUINFO SET modern_route = '/admin/system/audit' WHERE modern_route = '/admin/system/logs';

-- 2. 일정 관리 (smart-toolkit 적용)
UPDATE NMENUINFO SET modern_route = '/smart-toolkit/schedule' 
WHERE progrm_file_nm LIKE '%Schdul%' OR progrm_file_nm LIKE '%IndvdlSchdul%';

UPDATE NMENUINFO SET modern_route = '/smart-toolkit/schedule/dept' 
WHERE progrm_file_nm LIKE '%DeptSchdul%';

UPDATE NMENUINFO SET modern_route = '/smart-toolkit/dept-job/selectDeptJobList' 
WHERE progrm_file_nm LIKE '%DeptJob%';

UPDATE NMENUINFO SET modern_route = '/smart-toolkit/work-report' 
WHERE progrm_file_nm LIKE '%WikMnthngReprt%' OR progrm_file_nm LIKE '%Report%';

-- 3. 휴가 관리 (단수형)
UPDATE NMENUINFO SET modern_route = '/uss/ion/vacation' WHERE modern_route = '/uss/ion/vacations';

-- 4. 설문 조사 경로 세분화
UPDATE NMENUINFO SET modern_route = '/admin/survey/manage' WHERE progrm_file_nm LIKE 'EgovQustnrManage%';
UPDATE NMENUINFO SET modern_route = '/survey/response' WHERE progrm_file_nm LIKE 'EgovQustnrRespond%';

-- 5. 커뮤니티 관리
UPDATE NMENUINFO SET modern_route = '/admin/community' 
WHERE progrm_file_nm LIKE '%BBSMaster%' OR progrm_file_nm LIKE '%Cmmnty%';

-- 6. 스크랩 관리
UPDATE NMENUINFO SET modern_route = '/cop/scp/selectScrapList' WHERE progrm_file_nm LIKE '%Scrap%';

-- 검증
SELECT modern_route, COUNT(*) FROM NMENUINFO WHERE modern_route IS NOT NULL GROUP BY modern_route;
