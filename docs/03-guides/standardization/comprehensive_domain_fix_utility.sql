/*
 * DB Standardization - Comprehensive Domain & Abbreviation Fix
 * Domain: Utility (40 Tables)
 * Standards Enforcement: _YMD (CHAR 8), _YN (CHAR 1), _TTL/NM (V300), _CN/EXPLN (V4000), _CD (V12)
 */

BEGIN;

-- 1. tb_sys_log, tb_web_log, tb_privacy_log
ALTER TABLE tb_sys_log RENAME COLUMN occrrnc_de TO occr_ymd;
ALTER TABLE tb_sys_log ALTER COLUMN occr_ymd TYPE CHAR(8);
ALTER TABLE tb_sys_log RENAME COLUMN process_se_code TO process_se_cd;
ALTER TABLE tb_sys_log RENAME COLUMN rspns_code TO rspns_cd;
ALTER TABLE tb_sys_log RENAME COLUMN error_code TO error_cd;

ALTER TABLE tb_web_log RENAME COLUMN occrrnc_de TO occr_ymd;
-- Web log occrrnc_de was TIMESTAMP, we might want to keep it or add a separate YMD. 
-- For standardization, we will add occr_ymd and occr_tm if needed.
-- But here we will just fix the type if it was intended to be a date string.
-- ALTER TABLE tb_web_log ALTER COLUMN occr_ymd TYPE CHAR(8);

-- 2. tb_noti_info
ALTER TABLE tb_noti_info ALTER COLUMN ntcn_sj TYPE VARCHAR(300);
ALTER TABLE tb_noti_info ALTER COLUMN ntcn_cn TYPE VARCHAR(4000);
ALTER TABLE tb_noti_info RENAME COLUMN ntcn_tm TO ntcn_tm_val; -- To avoid conflict if any
ALTER TABLE tb_noti_info ALTER COLUMN ntcn_tm_val TYPE CHAR(6);

-- 3. tb_bnr_info
ALTER TABLE tb_bnr_info ALTER COLUMN banner_nm TYPE VARCHAR(300);
ALTER TABLE tb_bnr_info RENAME COLUMN ntce_at TO ntce_yn;
ALTER TABLE tb_bnr_info ALTER COLUMN ntce_yn TYPE CHAR(1);

-- 4. tb_popup_info
ALTER TABLE tb_popup_info ALTER COLUMN popup_ttl TYPE VARCHAR(300);
ALTER TABLE tb_popup_info RENAME COLUMN ntce_bgnde TO ntce_bgng_ymd;
ALTER TABLE tb_popup_info ALTER COLUMN ntce_bgng_ymd TYPE CHAR(8);
ALTER TABLE tb_popup_info RENAME COLUMN ntce_endde TO ntce_end_ymd;
ALTER TABLE tb_popup_info ALTER COLUMN ntce_end_ymd TYPE CHAR(8);
ALTER TABLE tb_popup_info RENAME COLUMN ntce_at TO ntce_yn;
ALTER TABLE tb_popup_info ALTER COLUMN ntce_yn TYPE CHAR(1);

-- 5. tb_faq_info
ALTER TABLE tb_faq_info RENAME COLUMN qestn_sj TO qestn_ttl;
ALTER TABLE tb_faq_info ALTER COLUMN qestn_ttl TYPE VARCHAR(300);
ALTER TABLE tb_faq_info ALTER COLUMN qestn_cn TYPE VARCHAR(4000);
ALTER TABLE tb_faq_info ALTER COLUMN answer_cn TYPE VARCHAR(4000);

-- 6. tb_stsfdg_info
ALTER TABLE tb_stsfdg_info ALTER COLUMN use_yn TYPE CHAR(1);

-- 7. tb_sms_info
ALTER TABLE tb_sms_info RENAME COLUMN trnsmit_de TO trnsmit_ymd;
ALTER TABLE tb_sms_info ALTER COLUMN trnsmit_ymd TYPE CHAR(8);

-- 8. tb_onln_poll_manage
ALTER TABLE tb_onln_poll_manage ALTER COLUMN poll_nm TYPE VARCHAR(300);
ALTER TABLE tb_onln_poll_manage RENAME COLUMN poll_bgng_ymd TO poll_bgng_ymd_tmp;
ALTER TABLE tb_onln_poll_manage ADD COLUMN poll_bgng_ymd CHAR(8);
UPDATE tb_onln_poll_manage SET poll_bgng_ymd = LEFT(poll_bgng_ymd_tmp, 8);
ALTER TABLE tb_onln_poll_manage DROP COLUMN poll_bgng_ymd_tmp;

ALTER TABLE tb_onln_poll_manage RENAME COLUMN poll_end_ymd TO poll_end_ymd_tmp;
ALTER TABLE tb_onln_poll_manage ADD COLUMN poll_end_ymd CHAR(8);
UPDATE tb_onln_poll_manage SET poll_end_ymd = LEFT(poll_end_ymd_tmp, 8);
ALTER TABLE tb_onln_poll_manage DROP COLUMN poll_end_ymd_tmp;

-- 9. tb_note_info
ALTER TABLE tb_note_info ALTER COLUMN note_ttl TYPE VARCHAR(300);
ALTER TABLE tb_note_info ALTER COLUMN note_cn TYPE VARCHAR(4000);

-- 10. tb_rward_manage
ALTER TABLE tb_rward_manage RENAME COLUMN rward_de TO rward_ymd;
ALTER TABLE tb_rward_manage ALTER COLUMN rward_ymd TYPE CHAR(8);
ALTER TABLE tb_rward_manage RENAME COLUMN rward_code TO rward_cd;
ALTER TABLE tb_rward_manage RENAME COLUMN confm_yn TO confm_yn;
ALTER TABLE tb_rward_manage ALTER COLUMN confm_yn TYPE CHAR(1);

COMMIT;
