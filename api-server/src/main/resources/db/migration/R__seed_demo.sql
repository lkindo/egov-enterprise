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

SELECT 1; -- Placeholder to ensure valid trailing SQL
