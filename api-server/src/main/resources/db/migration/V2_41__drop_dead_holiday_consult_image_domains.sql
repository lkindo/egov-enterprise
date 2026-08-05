-- =============================================================================
-- V2_41 : 死 도메인 3종 제거 (휴일 · 상담 · 메인이미지)
-- =============================================================================
--
-- [왜] 세 도메인 모두 **모든 층에서 미사용**이다. 라이브 실측(2026-08-05):
--
--                    데이터   메뉴등록   FE 호출부   인가 애노테이션
--   휴일   tb_hldy_info    0행      0        0건        0개
--   상담   tb_dscsn_list   0행      0        0건        0개
--   이미지 tb_main_image   0행      0        0건        0개
--
--   FAQ(V2_40)와 달리 **대체 구현조차 없다** — FAQ 는 게시판에 281행이 살아 있었지만
--   이 셋은 어디에도 데이터가 없다. 기능이 제품에 존재한 적이 없다.
--
--   그대로 두면 비용이 두 가지다. ① 인가 애노테이션 없는 쓰기 엔드포인트 15개가
--   secure-paths URL 목록 한 줄에만 얹혀 있다(목록에서 빠지면 함께 열린다).
--   ② 다음 사람이 "API 가 있으니 화면만 붙이면 된다" 고 오인해 死자산을 키운다.
--
-- [무엇을 지우나]
--   1. tb_hldy_info   (휴일)      0행
--   2. tb_dscsn_list  (상담)      0행
--   3. tb_main_image  (메인이미지) 0행
--   4. RBAC 프로그램 4건 + 롤 매핑
--        ADMIN_RESTDE_ALIAS  '/api/v1/calendar/holidays/**'
--        ADMIN_IMAGE_ALIAS   '/api/v1/main-images/**'
--        ADMIN_RESTDE_ALL    '/api/v1/admin/restde/**'    ← 대응 컨트롤러가 없던 死경로
--        ADMIN_IMAGE_ALL     '/api/v1/admin/images/**'    ← 대응 컨트롤러가 없던 死경로
--
-- [안전 근거]
--   · 세 테이블 모두 0행이므로 데이터 유실이 없다.
--   · tb_dscsn_list 는 첨부 참조원이었으나(AttachmentSource.CONSULT) 첨부 참조 0건이라
--     도달성 판정이 바뀌는 첨부가 없다. 레지스트리 항목도 함께 제거했다.
--   · secure-paths 에서 /api/v1/main-images·/api/v1/calendar/holidays 를 3개 선언 동시 제거
--     (SecurePathsDeclarationSyncLinterTest 가 일치를 강제한다).
--   · 상담은 /api/v1/admin/** 로 커버되던 경로라 secure-paths 변경이 없다.
--
-- [되돌리기]
--   구조 복원: V2_0__baseline.sql 의 세 CREATE TABLE 절과
--             V2_11__seed_authorization_chain.sql 의 ADMIN_RESTDE_*/ADMIN_IMAGE_* 4행 재적용.
--   데이터 복원: 불필요하다 — 전부 0행이었다.
--
-- ⚠ DROP TABLE 은 ZeroDowntimeMigrationLinterTest 가 막는 최상위 파괴 DDL 이다.
--   위 실측(0행 · 첨부 0 · FE 호출 0 · 메뉴 0)을 근거로 linter:ignore 를 명시한다.
-- =============================================================================

-- RBAC 프로그램 매핑 먼저 (FK 순서)
DELETE FROM tb_role_prgrm_map
 WHERE prgrm_file_nm IN ('ADMIN_RESTDE_ALIAS', 'ADMIN_RESTDE_ALL', 'ADMIN_IMAGE_ALIAS', 'ADMIN_IMAGE_ALL');
DELETE FROM tb_prgrm_lst
 WHERE prgrm_file_nm IN ('ADMIN_RESTDE_ALIAS', 'ADMIN_RESTDE_ALL', 'ADMIN_IMAGE_ALIAS', 'ADMIN_IMAGE_ALL');

DROP TABLE IF EXISTS tb_hldy_info;  -- linter:ignore  근거: 라이브 0행 · FE 호출 0 · 메뉴 0 (헤더 참조)
DROP TABLE IF EXISTS tb_dscsn_list; -- linter:ignore  근거: 라이브 0행 · 첨부 참조 0 · FE 호출 0 (헤더 참조)
DROP TABLE IF EXISTS tb_main_image; -- linter:ignore  근거: 라이브 0행 · FE 호출 0 · 메뉴 0 (헤더 참조)
