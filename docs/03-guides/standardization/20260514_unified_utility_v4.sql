/*
 * DB Standardization Migration Script (Unified Utility Domain v4 - FINAL GOLD)
 * Targets: tb_adbk_info, tb_inst_code, tb_admdst_cd, tb_note_info, tb_sys_log, tb_stsfdg_info, tb_sms_info, tb_email_dsptch, tb_rward_manage, tb_poll_info
 * Date: 2026-05-14
 * Corrected by: Antigravity (Gemini 3 Flash)
 */

BEGIN;

-- 1. [Address/Organization] '대표' -> RPRS, '공개' -> RLS, '범위' -> SCP, '기관' -> INST
ALTER TABLE tb_adbk_info 
    RENAME COLUMN othbc_scope TO rls_scp_cd,
    ALTER COLUMN rls_scp_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

ALTER TABLE tb_inst_code 
    RENAME COLUMN best_instt_code TO best_inst_cd,
    RENAME COLUMN rprs_inst_cd TO rprs_inst_cd, -- Corrected from repr
    RENAME COLUMN all_instt_nm TO all_inst_nm,
    RENAME COLUMN instt_abrv_nm TO inst_abbr_nm,
    RENAME COLUMN creat_de TO crt_ymd,
    ALTER COLUMN crt_ymd TYPE CHAR(8);

-- 2. [Log/System] '요청' -> DMND (as per Meta), '발생' -> OCRN, '출력' -> OTPT
ALTER TABLE tb_sys_log 
    RENAME COLUMN requst_id TO dmnd_id,
    RENAME COLUMN occrrnc_de TO ocrn_ymd,
    ALTER COLUMN ocrn_ymd TYPE CHAR(8),
    RENAME COLUMN rqester_id TO dmnd_user_id,
    RENAME COLUMN process_time TO prcs_tm,
    RENAME COLUMN creat_dt TO crt_dt;

ALTER TABLE tb_user_log 
    RENAME COLUMN outpt_cnt TO otpt_cnt,
    RENAME COLUMN mdfcn_cnt TO mdfcn_cnt, -- Corrected from upd
    RENAME COLUMN creat_dt TO crt_dt;

-- 3. [Message/Note] '발신' -> DSPTCH (as per Meta), '항목' -> IEM, '수신' -> RCPTN
ALTER TABLE tb_note_rcptn 
    RENAME COLUMN note_trnsmit_id TO note_dsptch_id,
    RENAME COLUMN rcptn_se TO rcptn_se_cd,
    ALTER COLUMN rcptn_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

ALTER TABLE tb_sms_info 
    RENAME COLUMN trnsmis_cn TO dsptch_cn,
    ALTER COLUMN dsptch_cn TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

ALTER TABLE tb_email_dsptch_manage 
    RENAME COLUMN dsptch_dt TO dsptch_dt, -- Keep standard
    RENAME COLUMN email_cn TO eml_cn,
    ALTER COLUMN eml_cn TYPE VARCHAR(4000),
    RENAME COLUMN sndng_result_code TO dsptch_rslt_cd,
    ALTER COLUMN dsptch_rslt_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

-- 4. [Poll/Survey] '항목' -> IEM, '만족도' -> DGSTFN, '점수' -> SCR
ALTER TABLE tb_onln_poll_artcl 
    RENAME COLUMN poll_iem_id TO poll_iem_id, -- Keep standard
    RENAME COLUMN poll_iem_nm TO poll_iem_nm,
    RENAME COLUMN creat_dt TO crt_dt;

ALTER TABLE tb_stsfdg_info 
    RENAME COLUMN stsfdg_cn TO dgstfn_cn,
    ALTER COLUMN dgstfn_cn TYPE VARCHAR(4000),
    RENAME COLUMN dgstfn_scr TO dgstfn_scr, -- Keep standard
    RENAME COLUMN creat_dt TO crt_dt;

-- 5. [HR/Etc] '생년월일' -> BRTH_YMD, '성별' -> GNDR_CD, '이메일' -> EML
ALTER TABLE tb_extrl_hr_info 
    RENAME COLUMN sexdstn_code TO gndr_cd,
    ALTER COLUMN gndr_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN eml_addr TO eml_addr, -- Keep standard
    ALTER COLUMN eml_addr TYPE VARCHAR(300),
    RENAME COLUMN creat_dt TO crt_dt;

COMMIT;
