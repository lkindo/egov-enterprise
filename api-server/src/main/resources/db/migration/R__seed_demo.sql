-- 데모 및 고유 도메인용 시드 데이터

-- 데모 사용자 테스트 데이터
-- 실 서비스에서는 제외되고 로컬/개발 환경에서만 데모 목적으로 적재됨
-- (실제 사용자 생성은 EgovTestDataConfig 또는 마이그레이션 스크립트로 대체 가능)

-- [E2E/데모] 시스템 감사 로그 대표 시드 (/admin/system/audit 로그 스트림 표시용)
-- Flyway-off 부트에서는 tb_sys_log가 비어 감사 화면이 공백이므로, 풀시드(Flyway-enabled) 부트 시 대표 로그를 적재한다.
-- 멱등: PK(dmnd_id) 충돌 시 무시. crt_dt는 부트 시점 기준 최근 시각으로 채워 날짜가 항상 노출되게 한다.
INSERT INTO tb_sys_log
  (dmnd_id, dmnd_user_id, dmnd_user_ip_addr, mthd_nm, srvc_nm, prcs_se_cd, rspns_cd, err_se_cd, err_cd, prcs_tm, crt_dt, ocrn_ymd, frst_rgtr_id)
VALUES
  ('SEED_SYSLOG_001','webmaster','127.0.0.1','getUserList','UserService','R','200','N',NULL,'12', CURRENT_TIMESTAMP - INTERVAL '10 minute', to_char(CURRENT_DATE,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_002','webmaster','127.0.0.1','login','AuthService','S','200','N',NULL,'45', CURRENT_TIMESTAMP - INTERVAL '35 minute', to_char(CURRENT_DATE,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_003','TEST1','127.0.0.1','getBoardPosts','BoardService','R','200','N',NULL,'23', CURRENT_TIMESTAMP - INTERVAL '1 hour', to_char(CURRENT_DATE,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_004','webmaster','127.0.0.1','createUser','UserService','I','200','N',NULL,'88', CURRENT_TIMESTAMP - INTERVAL '2 hour', to_char(CURRENT_DATE,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_005','webmaster','127.0.0.1','updateMenu','MenuService','U','200','N',NULL,'31', CURRENT_TIMESTAMP - INTERVAL '3 hour', to_char(CURRENT_DATE,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_006','TEST1','127.0.0.1','getSummary','StatisticsService','R','500','Y','C001','120', CURRENT_TIMESTAMP - INTERVAL '5 hour', to_char(CURRENT_DATE,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_007','webmaster','127.0.0.1','deletePost','BoardService','D','200','N',NULL,'19', CURRENT_TIMESTAMP - INTERVAL '8 hour', to_char(CURRENT_DATE,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_008','webmaster','127.0.0.1','getReflectedBanners','BannerService','R','200','N',NULL,'9', CURRENT_TIMESTAMP - INTERVAL '1 day', to_char(CURRENT_DATE - 1,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_009','TEST1','127.0.0.1','createNotification','NotificationService','I','200','N',NULL,'27', CURRENT_TIMESTAMP - INTERVAL '1 day', to_char(CURRENT_DATE - 1,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_010','webmaster','127.0.0.1','reissueToken','AuthService','S','401','Y','A002','5', CURRENT_TIMESTAMP - INTERVAL '2 day', to_char(CURRENT_DATE - 2,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_011','webmaster','127.0.0.1','getMenuHierarchy','MenuService','R','200','N',NULL,'14', CURRENT_TIMESTAMP - INTERVAL '2 day', to_char(CURRENT_DATE - 2,'YYYYMMDD'),'SYSTEM'),
  ('SEED_SYSLOG_012','TEST1','127.0.0.1','likePost','BoardService','U','200','N',NULL,'11', CURRENT_TIMESTAMP - INTERVAL '3 day', to_char(CURRENT_DATE - 3,'YYYYMMDD'),'SYSTEM')
ON CONFLICT (dmnd_id) DO NOTHING;

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
