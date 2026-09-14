-- 데모 및 고유 도메인용 시드 데이터
--
-- ⚠ 이 파일은 classpath:db/migration 에 있어 운영 DB 에도 적재된다. 여기에는 앱이 하드코딩한
--   게시판 마스터처럼 운영에서도 있어야 하는 행만 둔다.
--   [2026-09-14 DEC-OPS-092] 시스템 감사 로그 대표 12행은 실제로 일어나지 않은 요청을 운영 감사
--   로그에 남기므로 db/seed-dev/R__seed_dev_audit_logs.sql 로 옮겼다(개발·E2E 전용).

-- =====================================================================
-- [E2E 픽스처] 일반 사용자 계정 TEST1 — 이설됨
-- =====================================================================
-- [W0-02] 이 블록은 알려진 비밀번호(bcrypt('1'))를 포함하므로 운영 마이그레이션 경로에서 제거하고
--   dev/local/e2e 전용 위치로 옮겼다:
--     → api-server/src/main/resources/db/seed-dev/R__zz_seed_dev_credentials.sql
--   해당 위치는 spring.flyway.locations 가 확장된 프로파일(dev/local/e2e)과 개발용 compose 에서만 적재된다.
--   종전 주석이 '알려진 갭'으로 남겨 두었던 "demo 시드가 운영 포함 모든 환경에 적용된다" 문제의 계정 부분이
--   이로써 해소된다. 게시판/로그 데모 시드는 앱이 BBSMSTR_* 를 하드코딩하고 있어 함께 옮기면
--   도움말·지식허브 화면이 빈다 — 별건으로 남긴다.

-- =====================================================================
-- [E2E 픽스처] 게시판 마스터 3종
-- =====================================================================
-- 왜 필요한가: E2E 스펙 5개(03·04·15·21·22)가 BBSMSTR_AAAAAAAAAAAA(10회)·DDDDDDDDDDDD·EEEEEEEEEEEE 를
--   **하드코딩**한다. 그런데 시드에는 BBSMSTR_000000000120/160 만 있어, 공유 OCI DB 에 누적된 이 3종은
--   신규 DB(CI 컨테이너)에 존재하지 않는다 — 2026-07-26 CI 의 cleanup 로그가 이미
--   "Board BBSMSTR_AAAAAAAAAAAA cleanup skipped: 게시판을 찾을 수 없습니다" 로 증언했다.
--   TEST1 계정과 동일한 "로컬은 축적된 상태 덕에 통과" 유형이다.
-- 값 출처: 라이브 DB 실측을 그대로 미러링(bbs_ttl/type/atrb/tmplt 등).
-- 안전성: tb_bbs_master 에 FK 없음(CHECK+PK 만) · ON CONFLICT (bbs_id) DO NOTHING 이므로
--   R__ 재실행 시 라이브 행을 건드리지 않는다. (tmplt_id 일부는 라이브에서도 dangling — FK 없어 무해)
-- ⚠ 한계: 게시글은 시드하지 않는다. 라이브 3종에 371행이 누적돼 있고 대부분 E2E 잔재라 미러링이
--   무의미하다. 특정 pstId 를 하드코딩한 테스트(예: pstId=1108)는 **자체 생성으로 전환**해야 한다.
INSERT INTO tb_bbs_master
  (bbs_id, bbs_ttl, bbs_type_cd, bbs_atrb_cd, use_yn, ans_yn, file_atch_psblty_yn,
   atch_psblty_file_qty, tmplt_id, stsfdg_yn, ans_psblty_yn, crt_dt, frst_rgtr_id)
VALUES
  ('BBSMSTR_AAAAAAAAAAAA', '공지사항',    'BBST01', 'BBSA01', 'Y', 'N', 'Y', 3, 'TMPLAT_BOARD_DEFAULT', 'N', 'Y', CURRENT_TIMESTAMP, 'SYSTEM'),
  ('BBSMSTR_DDDDDDDDDDDD', 'Q&A 게시판',  'BBST03', 'BBSA01', 'Y', 'N', 'Y', 3, 'TMPLT_QNA',            'N', 'Y', CURRENT_TIMESTAMP, 'SYSTEM'),
  ('BBSMSTR_EEEEEEEEEEEE', '일정 게시판', 'BBST04', 'BBSA01', 'Y', 'N', 'Y', 3, 'TMPLT_CALENDAR',       'N', 'N', CURRENT_TIMESTAMP, 'SYSTEM'),
  -- [2026-07-27 추가] BBSMSTR_CCCCCCCCCCCC 는 **앱이 하드코딩**한다(KnowledgeHubClient 의 COMMUNITY 카테고리,
  --   커뮤니티 게시판 선택지 등 6개소). 신규 DB 에 없으면 /admin/community 진입만으로 404 가 6건 난다.
  --   라이브 실측값 미러링. ※ 앱이 참조하는 BBSMSTR_BBBBBBBBBBBB·NNNNNNNNNNNN·000000000001 은
  --   라이브에도 존재하지 않는다 — 선택지에 죽은 게시판이 노출되는 별도 결함으로 기록.
  ('BBSMSTR_CCCCCCCCCCCC', '업무게시판',  'BBST01', 'BBSA01', 'Y', 'N', 'Y', 3, 'TMPLAT_BOARD_DEFAULT', 'N', 'Y', CURRENT_TIMESTAMP, 'SYSTEM')
ON CONFLICT (bbs_id) DO NOTHING;

SELECT 1; -- Placeholder to ensure valid trailing SQL
