/*
 * DB Standardization Migration Script (Unified Utility Domain v5 - PHYSICAL SYNC)
 * Targets: tb_adbk_info, tb_inst_code, tb_sys_log, tb_note_trsm, tb_note_rcptn, tb_sms_info, tb_email_dsptch_manage, tb_onln_poll_manage, tb_stsfdg_info, tb_extrl_hr_info
 * Date: 2026-05-15
 */

BEGIN;

-- 1. [Address/Organization]
ALTER TABLE tb_adbk_info 
    RENAME COLUMN othbc_scope TO rls_scp_cd,
    ALTER COLUMN rls_scp_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_adbk_info.rls_scp_cd IS '공개범위코드';
COMMENT ON COLUMN tb_adbk_info.crt_dt IS '생성일시';

ALTER TABLE tb_inst_code 
    RENAME COLUMN best_instt_code TO best_inst_cd,
    ALTER COLUMN best_inst_cd TYPE VARCHAR(12),
    RENAME COLUMN all_instt_nm TO all_inst_nm,
    ALTER COLUMN all_inst_nm TYPE VARCHAR(300),
    RENAME COLUMN instt_abrv_nm TO inst_abbr_nm,
    ALTER COLUMN inst_abbr_nm TYPE VARCHAR(300),
    RENAME COLUMN creat_de TO crt_ymd,
    ALTER COLUMN crt_ymd TYPE CHAR(8);

COMMENT ON COLUMN tb_inst_code.best_inst_cd IS '최상위기관코드';
COMMENT ON COLUMN tb_inst_code.all_inst_nm IS '전체기관명';
COMMENT ON COLUMN tb_inst_code.inst_abbr_nm IS '기관약어명';
COMMENT ON COLUMN tb_inst_code.crt_ymd IS '생성일자';

-- 2. [Log/System]
ALTER TABLE tb_sys_log 
    RENAME COLUMN requst_id TO dmnd_id,
    RENAME COLUMN occrrnc_de TO ocrn_ymd,
    ALTER COLUMN ocrn_ymd TYPE CHAR(8),
    RENAME COLUMN rqester_id TO dmnd_user_id,
    RENAME COLUMN process_time TO prcs_tm,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_sys_log.dmnd_id IS '요청아이디';
COMMENT ON COLUMN tb_sys_log.ocrn_ymd IS '발생일자';
COMMENT ON COLUMN tb_sys_log.dmnd_user_id IS '요청사용자아이디';
COMMENT ON COLUMN tb_sys_log.prcs_tm IS '처리시각';
COMMENT ON COLUMN tb_sys_log.crt_dt IS '생성일시';

-- 3. [Message/Note]
ALTER TABLE tb_note_trsm 
    RENAME COLUMN note_trnsmit_id TO note_dsptch_id,
    RENAME COLUMN trnsmiter_id TO dsptch_user_id,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_note_trsm.note_dsptch_id IS '쪽지발신아이디';
COMMENT ON COLUMN tb_note_trsm.dsptch_user_id IS '발신사용자아이디';
COMMENT ON COLUMN tb_note_trsm.crt_dt IS '생성일시';

ALTER TABLE tb_note_rcptn 
    RENAME COLUMN note_trnsmit_id TO note_dsptch_id,
    RENAME COLUMN rcptn_se TO rcptn_se_cd,
    ALTER COLUMN rcptn_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_note_rcptn.note_dsptch_id IS '쪽지발신아이디';
COMMENT ON COLUMN tb_note_rcptn.rcptn_se_cd IS '수신구분코드';
COMMENT ON COLUMN tb_note_rcptn.crt_dt IS '생성일시';

ALTER TABLE tb_sms_info 
    RENAME COLUMN trnsmis_cn TO dsptch_cn,
    ALTER COLUMN dsptch_cn TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_sms_info.dsptch_cn IS '발신내용';
COMMENT ON COLUMN tb_sms_info.crt_dt IS '생성일시';

ALTER TABLE tb_email_dsptch_manage 
    RENAME COLUMN email_cn TO eml_cn,
    ALTER COLUMN eml_cn TYPE VARCHAR(4000),
    RENAME COLUMN sndng_result_code TO dsptch_rslt_cd,
    ALTER COLUMN dsptch_rslt_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_email_dsptch_manage.eml_cn IS '이메일내용';
COMMENT ON COLUMN tb_email_dsptch_manage.dsptch_rslt_cd IS '발신결과코드';
COMMENT ON COLUMN tb_email_dsptch_manage.crt_dt IS '생성일시';

-- 4. [Poll/Survey]
ALTER TABLE tb_onln_poll_manage 
    RENAME COLUMN poll_nm TO poll_ttl,
    ALTER COLUMN poll_ttl TYPE VARCHAR(300),
    RENAME COLUMN poll_knd TO poll_knd_cd,
    ALTER COLUMN poll_knd_cd TYPE VARCHAR(12),
    ALTER COLUMN poll_bgng_ymd TYPE CHAR(8),
    ALTER COLUMN poll_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_onln_poll_manage.poll_ttl IS '투표제목';
COMMENT ON COLUMN tb_onln_poll_manage.poll_knd_cd IS '투표종류코드';
COMMENT ON COLUMN tb_onln_poll_manage.poll_bgng_ymd IS '투표시작일자';
COMMENT ON COLUMN tb_onln_poll_manage.poll_end_ymd IS '투표종료일자';
COMMENT ON COLUMN tb_onln_poll_manage.crt_dt IS '생성일시';

ALTER TABLE tb_stsfdg_info 
    RENAME COLUMN stsfdg_cn TO dgstfn_cn,
    ALTER COLUMN dgstfn_cn TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_stsfdg_info.dgstfn_cn IS '만족도내용';
COMMENT ON COLUMN tb_stsfdg_info.crt_dt IS '생성일시';

-- 5. [HR/Etc]
ALTER TABLE tb_extrl_hr_info 
    RENAME COLUMN sexdstn_code TO gndr_cd,
    ALTER COLUMN gndr_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN eml_addr TO eml_addr,
    ALTER COLUMN eml_addr TYPE VARCHAR(300),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_extrl_hr_info.gndr_cd IS '성별코드';
COMMENT ON COLUMN tb_extrl_hr_info.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_extrl_hr_info.eml_addr IS '이메일주소';
COMMENT ON COLUMN tb_extrl_hr_info.crt_dt IS '생성일시';

COMMIT;
