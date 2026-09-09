-- 2026-09-09 OCI 실측: 로그인/시스템/개인정보 로그에 날짜 인덱스가 없다.
-- 작은 현재 테이블에 원자적으로 적용한다. 잠금 획득이 지연되면 전체를 롤백한다.
-- 대규모 운영 복제본은 유지보수 창에서 소요 시간을 먼저 측정한다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE INDEX ix_tb_login_log_crt_dt ON tb_login_log (crt_dt DESC);
CREATE INDEX ix_tb_sys_log_ocrn_ymd ON tb_sys_log (ocrn_ymd DESC);
-- 기존 검색은 레거시 공백 호환을 위해 trim(ocrn_ymd)을 사용한다.
CREATE INDEX ix_tb_sys_log_ocrn_ymd_trim ON tb_sys_log (btrim(ocrn_ymd));
CREATE INDEX ix_tb_privacy_log_inq_dt ON tb_privacy_log (inq_dt DESC);
