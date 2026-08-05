-- =============================================================================
-- V2_40 : 死 FAQ 도메인 제거 (tb_faq_info + RBAC 프로그램 2건)
-- =============================================================================
--
-- [왜]
--   FAQ 는 게시판(tb_bbs_item, bbs_id='BBSMSTR_AAAAAAAAAAAA')으로 통합돼 운영 중이며
--   전용 FAQ 도메인은 사용되지 않는다. 라이브 실측(2026-08-05):
--
--     tb_faq_info                                    0 행 (첨부 참조 0)
--     tb_bbs_item WHERE bbs_id='BBSMSTR_AAAA…'     281 행  ← 실제 FAQ 데이터
--
--   프론트엔드도 전용 API 를 호출하지 않는다 — `/api/v1/faqs` 사용처는 generated 타입
--   선언뿐이고 실제 호출 코드는 0건이다(`KnowledgeHubClient` 는 /boards/{bbsId} 를 쓴다).
--
--   즉 이 테이블·API·RBAC 프로그램은 **어느 것도 참조하지 않는 死자산**이다.
--   남겨두면 다음 사람이 "전용 FAQ API 가 있다" 고 오인해 그쪽으로 배선했다가
--   빈 화면을 만든다(실제로 이번에 그 직전까지 갔다).
--
-- [무엇을 지우나]
--   1. tb_faq_info                    — 0행. FK(fk_tb_faq_info_tb_file_master)·인덱스 동반 소멸
--   2. tb_prgrm_lst ADMIN_FAQ_ALIAS   — '/api/v1/faqs/**'. 대상 컨트롤러가 사라졌다
--   3. tb_prgrm_lst ADMIN_FAQ_ALL     — '/api/v1/admin/faq/**'. 애초에 대응 컨트롤러가 없던 死경로
--      (+ tb_role_prgrm_map 의 두 프로그램 매핑)
--
-- [안전 근거]
--   · 데이터 0행이므로 유실이 없다. 게시판의 FAQ 281건은 이 마이그레이션이 건드리지 않는다.
--   · secure-paths 에서 /api/v1/faqs 를 함께 제거했다(운영 yml · 테스트 yml · 매트릭스 테스트
--     3개 선언 동시 — SecurePathsDeclarationSyncLinterTest 가 정합을 강제한다).
--   · AttachmentSource.FAQ 레지스트리 항목도 함께 제거했다
--     (AttachmentSourceRegistryLinterTest 가 레지스트리 ↔ 엔티티 정합을 양방향으로 검사한다).
--
-- [되돌리기]
--   구조 복원: V2_0__baseline.sql 의 tb_faq_info CREATE TABLE 절과
--             V2_11__seed_authorization_chain.sql 의 ADMIN_FAQ_* 2행을 재적용한다.
--   데이터 복원: 불필요하다 — 0행이었다.
--
-- ⚠ DROP TABLE 은 ZeroDowntimeMigrationLinterTest 가 막는 최상위 파괴 DDL 이다.
--   위 실측(0행 · 참조 0 · FE 호출 0)을 근거로 linter:ignore 를 명시한다.
-- =============================================================================

-- RBAC 프로그램 매핑 먼저 (FK 순서)
DELETE FROM tb_role_prgrm_map WHERE prgrm_file_nm IN ('ADMIN_FAQ_ALIAS', 'ADMIN_FAQ_ALL');
DELETE FROM tb_prgrm_lst      WHERE prgrm_file_nm IN ('ADMIN_FAQ_ALIAS', 'ADMIN_FAQ_ALL');

DROP TABLE IF EXISTS tb_faq_info; -- linter:ignore  근거: 라이브 0행 · 첨부 0 · FE 호출 0 (위 헤더 참조)
