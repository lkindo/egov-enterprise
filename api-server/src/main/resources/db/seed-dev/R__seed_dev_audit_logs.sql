-- =====================================================================
-- dev/local/e2e 전용 시스템 감사 로그 대표 시드 (운영 flyway locations 에 포함되지 않음)
-- =====================================================================
-- [2026-09-14 DEC-OPS-092] 종전에는 classpath:db/migration/R__seed_demo.sql 에 있어 운영 DB 에도
--   적재됐다. 아래 12행은 실제로 일어나지 않은 요청을 감사 로그에 기록하므로, 운영에서는 감사 추적의
--   무결성을 해친다(없는 사용자 TEST1·가짜 오류가 실제 기록과 섞인다). 개발·E2E 화면 확인에만 쓴다.
--   ⚠ 이 이동은 이미 운영 DB 에 들어간 행을 지우지 않는다. 그 정리는 코어 데이터 변경이라 별도 승인 대상이다.
--
-- [E2E/데모] /admin/system/audit 로그 스트림 표시용.
-- 멱등: UNIQUE 업무키(dmnd_id) 충돌 시 무시. 내부 PK(sys_log_sn)는 DB IDENTITY가 부여한다.
-- crt_dt는 부트 시점 기준 최근 시각으로 채워 날짜가 항상 노출되게 한다.
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
