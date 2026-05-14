/*
 * DB Standardization Migration Script (Utility Domain Batch 4)
 * Targets: tb_sys_log, tb_web_log, tb_user_log, tb_login_log, tb_privacy_log
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_sys_log
ALTER TABLE tb_sys_log 
    RENAME COLUMN requst_id TO req_id,
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    RENAME COLUMN rqester_id TO user_id,
    RENAME COLUMN rqester_ip TO user_ip,
    ALTER COLUMN svc_nm TYPE VARCHAR(300),
    ALTER COLUMN method_nm TYPE VARCHAR(300),
    RENAME COLUMN process_se_code TO prcs_se_cd,
    ALTER COLUMN prcs_se_cd TYPE VARCHAR(12),
    RENAME COLUMN process_time TO prcs_tm,
    RENAME COLUMN rspns_code TO rspns_cd,
    ALTER COLUMN rspns_cd TYPE VARCHAR(12),
    RENAME COLUMN error_se TO err_se_cd,
    ALTER COLUMN err_se_cd TYPE VARCHAR(12),
    RENAME COLUMN error_code TO err_cd,
    ALTER COLUMN err_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_sys_log IS '시스템 로그';

-- 2. tb_web_log
ALTER TABLE tb_web_log 
    RENAME COLUMN requst_id TO req_id,
    RENAME COLUMN occrrnc_de TO occr_dt,
    RENAME COLUMN rqester_id TO user_id,
    RENAME COLUMN rqester_ip TO user_ip,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_web_log IS '웹 로그';

-- 3. tb_user_log
ALTER TABLE tb_user_log 
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    RENAME COLUMN rqester_id TO user_id,
    ALTER COLUMN svc_nm TYPE VARCHAR(300),
    ALTER COLUMN method_nm TYPE VARCHAR(300),
    RENAME COLUMN mdfcn_cnt TO upd_cnt,
    RENAME COLUMN outpt_cnt TO prnt_cnt,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_user_log IS '사용자 로그';

-- 4. tb_login_log
ALTER TABLE tb_login_log 
    RENAME COLUMN login_id TO user_id,
    ALTER COLUMN conn_mthd_cd TYPE VARCHAR(12),
    RENAME COLUMN error_occrrnc_yn TO err_occr_yn,
    RENAME COLUMN error_code TO err_cd,
    ALTER COLUMN err_cd TYPE VARCHAR(12),
    RENAME COLUMN frst_regist_pnttm TO crt_dt;
COMMENT ON TABLE tb_login_log IS '접속 로그';

-- 5. tb_privacy_log
ALTER TABLE tb_privacy_log 
    RENAME COLUMN requst_id TO req_id,
    RENAME COLUMN rqester_id TO user_id,
    RENAME COLUMN rqester_ip TO user_ip,
    RENAME COLUMN occrrnc_de TO occr_dt,
    RENAME COLUMN srvc_nm TO svc_nm,
    ALTER COLUMN svc_nm TYPE VARCHAR(300),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_privacy_log IS '개인정보조회 로그';

COMMIT;
