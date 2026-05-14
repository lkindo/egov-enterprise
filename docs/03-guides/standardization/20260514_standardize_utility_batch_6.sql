/*
 * DB Standardization Migration Script (Utility Domain Batch 6)
 * Targets: tb_sms_info, tb_sms_rcptn, tb_email_dsptch_manage
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_sms_info
ALTER TABLE tb_sms_info 
    RENAME COLUMN trnsmis_cn TO trsm_expln,
    ALTER COLUMN trsm_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_sms_info IS 'SMS 정보';

-- 2. tb_sms_rcptn
ALTER TABLE tb_sms_rcptn 
    RENAME COLUMN result_code TO rslt_cd,
    ALTER COLUMN rslt_cd TYPE VARCHAR(12),
    RENAME COLUMN result_mssage TO rslt_msg_expln,
    ALTER COLUMN rslt_msg_expln TYPE VARCHAR(4000);
COMMENT ON TABLE tb_sms_rcptn IS 'SMS 수신 내역';

-- 3. tb_email_dsptch_manage
ALTER TABLE tb_email_dsptch_manage 
    RENAME COLUMN mssage_id TO msg_id,
    RENAME COLUMN sj TO msg_ttl,
    ALTER COLUMN msg_ttl TYPE VARCHAR(300),
    RENAME COLUMN email_cn TO msg_expln,
    ALTER COLUMN msg_expln TYPE VARCHAR(4000),
    RENAME COLUMN sndr TO trsm_user_nm,
    RENAME COLUMN rcver TO rcptn_user_nm,
    RENAME COLUMN dsptch_dt TO trsm_dt,
    RENAME COLUMN sndng_result_code TO trsm_rslt_cd,
    ALTER COLUMN trsm_rslt_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_email_dsptch_manage IS '이메일 발신 관리';

COMMIT;
