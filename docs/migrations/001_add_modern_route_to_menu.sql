-- ============================================================
-- NMENUINFO 테이블에 modern_route 컬럼 추가 및 데이터 마이그레이션
-- JSP 에서 React 로 전환되면서 생긴 URL 불일치 해결
-- 
-- 실행 순서:
-- 1. 테이블 스키마 변경 (컬럼 추가)
-- 2. 주요 메뉴 50 개 일괄 업데이트
-- 3. 검증 쿼리
-- ============================================================

-- ------------------------------------------------------------
-- 1 단계: 테이블 스키마 변경
-- ------------------------------------------------------------

-- 현대적 Next.js 라우트 컬럼 추가
ALTER TABLE NMENUINFO ADD COLUMN modern_route VARCHAR(500);

-- 라우트 업데이트 시각 컬럼 추가
ALTER TABLE NMENUINFO ADD COLUMN route_updated_at TIMESTAMP;

-- 인덱스 추가 (조회 성능 최적화)
CREATE INDEX IDX_NMENUINFO_MODERN_ROUTE ON NMENUINFO(modern_route);

-- ------------------------------------------------------------
-- 2 단계: 주요 메뉴 50 개 일괄 업데이트
-- ------------------------------------------------------------

-- 2.1 시스템 관리 메뉴 (sym/mnu/mpm)
UPDATE NMENUINFO 
SET modern_route = '/admin/system/menus', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovMenuManage%'
   OR progrm_file_nm LIKE 'EgovMenuList%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/common-code', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovCmmnCode%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/programs', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovProgramList%';

-- 2.2 사용자 관리 메뉴 (uss/umt)
UPDATE NMENUINFO 
SET modern_route = '/admin/user/manage', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovUserManage%'
   OR progrm_file_nm LIKE 'EgovMber%';

UPDATE NMENUINFO 
SET modern_route = '/admin/user/login-policy', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovLoginPolicy%';

-- 2.3 권한/보안 관리 메뉴 (sec/ram, sec/gmt, sec/rmt)
UPDATE NMENUINFO 
SET modern_route = '/admin/security/authority', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovAuthor%'
   OR progrm_file_nm LIKE 'EgovAuthorRole%';

UPDATE NMENUINFO 
SET modern_route = '/admin/security/group', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovGroup%';

UPDATE NMENUINFO 
SET modern_route = '/admin/security/role', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovRole%';

-- 2.4 로그 관리 메뉴 (sym/log)
UPDATE NMENUINFO 
SET modern_route = '/admin/system/logs', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE 'EgovSysLog%'
   OR progrm_file_nm LIKE 'SelectSysLog%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/logs/login', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%LoginLog%';

-- 2.5 파일/댓글 관리 메뉴
UPDATE NMENUINFO 
SET modern_route = '/admin/system/files', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%File%'
  AND progrm_file_nm NOT LIKE '%Progrm%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/comments', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Comment%';

-- 2.6 네트워크/서버 관리 메뉴 (sym/sym)
UPDATE NMENUINFO 
SET modern_route = '/admin/system/network', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Ntwrk%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/server', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%ServerInfo%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/backup', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Backup%';

-- 2.7 모니터링 메뉴 (utl/sys)
UPDATE NMENUINFO 
SET modern_route = '/admin/system/monitoring/resource', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%ServerResrce%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/monitoring/process', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%ProcessMon%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/monitoring/db', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%DbMntrng%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/monitoring/filesys', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%FileSysMntrng%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/monitoring/http', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%HttpMon%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/monitoring/ntwrksvc', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%NtwrkSvcMntrng%';

UPDATE NMENUINFO 
SET modern_route = '/admin/system/monitoring/trsmrcv', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%TrsmrcvMntrng%';

-- 2.8 게시판 관리 메뉴 (cop/bbs)
UPDATE NMENUINFO 
SET modern_route = '/cop/bbs/selectBoardList', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Board%'
   OR progrm_file_nm LIKE '%BBS%';

UPDATE NMENUINFO 
SET modern_route = '/admin/community', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%BBSMaster%';

-- 2.9 동호회/명함 관리 메뉴 (cop/cmy, cop/adb)
UPDATE NMENUINFO 
SET modern_route = '/admin/community', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Cmmnty%';

UPDATE NMENUINFO 
SET modern_route = '/cop/adb/selectAddressBookList', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Adbk%'
   OR progrm_file_nm LIKE '%Address%';

-- 2.10 일정 관리 메뉴 (cop/smt)
UPDATE NMENUINFO 
SET modern_route = '/cop/smt/sim/selectScheduleList', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Schdul%'
   OR progrm_file_nm LIKE '%IndvdlSchdul%';

UPDATE NMENUINFO 
SET modern_route = '/cop/smt/dsm/selectDeptScheduleList', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%DeptSchdul%';

UPDATE NMENUINFO 
SET modern_route = '/cop/smt/djm/selectDeptJobList', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%DeptJob%';

UPDATE NMENUINFO 
SET modern_route = '/cop/smt/wmr/selectReportList', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%WikMnthngReprt%'
   OR progrm_file_nm LIKE '%Report%';

-- 2.11 부가 서비스 메뉴 (uss/ion)
UPDATE NMENUINFO 
SET modern_route = '/uss/ion/events', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Event%';

UPDATE NMENUINFO 
SET modern_route = '/uss/ion/vacations', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Vcatn%';

UPDATE NMENUINFO 
SET modern_route = '/uss/ion/rewards', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Rward%';

UPDATE NMENUINFO 
SET modern_route = '/uss/ion/anniversaries', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Annvrsry%';

UPDATE NMENUINFO 
SET modern_route = '/uss/ion/ctsnn', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Ctsnn%';

UPDATE NMENUINFO 
SET modern_route = '/uss/ion/user-absences', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%UserAbsnce%';

-- 2.12 쪽지 관리 메뉴 (uss/ion/ntm)
UPDATE NMENUINFO 
SET modern_route = '/note', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Note%'
   OR progrm_file_nm LIKE '%Ntm%';

-- 2.13 설문 조사 메뉴 (uss/olp)
UPDATE NMENUINFO 
SET modern_route = '/survey', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Qustnr%';

-- 2.14 도움말 메뉴 (uss/olh)
UPDATE NMENUINFO 
SET modern_route = '/admin/help', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Faq%'
   OR progrm_file_nm LIKE '%Qna%';

-- 2.15 약관 관리 메뉴 (uss/sam)
UPDATE NMENUINFO 
SET modern_route = '/admin/terms', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Stplat%';

-- 2.16 통계 메뉴 (sts)
UPDATE NMENUINFO 
SET modern_route = '/admin/stats/user', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%UserStats%'
   OR progrm_file_nm LIKE '%Ust%';

UPDATE NMENUINFO 
SET modern_route = '/admin/stats/screen', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%ScrinStats%'
   OR progrm_file_nm LIKE '%Sst%';

-- 2.17 결재 관리 메뉴 (uss/ion/ism)
UPDATE NMENUINFO 
SET modern_route = '/admin/system/ism', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%InfrmlSanctn%';

-- 2.18 스크랩 관리 메뉴 (cop/scp)
UPDATE NMENUINFO 
SET modern_route = '/cop/scp/selectScrapList', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Scrap%';

-- 2.19 장애 관리 메뉴 (sym/tbm)
UPDATE NMENUINFO 
SET modern_route = '/admin/system/trouble', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%Trobl%';

-- 2.20 서버동기화 관리 메뉴 (utl/sys/ssy)
UPDATE NMENUINFO 
SET modern_route = '/admin/system/sync-server', 
    route_updated_at = NOW()
WHERE progrm_file_nm LIKE '%SynchrnServer%';

-- ------------------------------------------------------------
-- 3 단계: 검증 쿼리
-- ------------------------------------------------------------

-- 3.1 modern_route 가 설정된 메뉴 수 확인
SELECT 
    COUNT(*) AS total_menus,
    COUNT(modern_route) AS mapped_menus,
    COUNT(*) - COUNT(modern_route) AS unmapped_menus
FROM NMENUINFO;

-- 3.2 modern_route 별 메뉴 수 확인
SELECT 
    modern_route,
    COUNT(*) AS menu_count
FROM NMENUINFO
WHERE modern_route IS NOT NULL
GROUP BY modern_route
ORDER BY menu_count DESC;

-- 3.3 아직 매핑되지 않은 메뉴 확인 (수동 매핑 필요)
SELECT 
    menu_no,
    menu_nm,
    progrm_file_nm,
    modern_route
FROM NMENUINFO
WHERE modern_route IS NULL
ORDER BY menu_no;

-- 3.4 중복 매핑 확인 (같은 modern_route 에 여러 메뉴)
SELECT 
    modern_route,
    COUNT(*) AS duplicate_count,
    STRING_AGG(menu_nm, ', ') AS menu_names
FROM NMENUINFO
WHERE modern_route IS NOT NULL
GROUP BY modern_route
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- ------------------------------------------------------------
-- 4 단계: 롤백 스크립트 (필요시 실행)
-- ------------------------------------------------------------
-- 롤백: 모든 modern_route 초기화
-- UPDATE NMENUINFO SET modern_route = NULL, route_updated_at = NULL;

-- 롤백: 컬럼 삭제
-- ALTER TABLE NMENUINFO DROP COLUMN IF EXISTS modern_route;
-- ALTER TABLE NMENUINFO DROP COLUMN IF EXISTS route_updated_at;
-- DROP INDEX IF EXISTS IDX_NMENUINFO_MODERN_ROUTE;

-- ============================================================
-- 마이그레이션 완료
-- ============================================================
