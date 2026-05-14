/*
 * DB Standardization Migration Script (Utility Domain Batch 1)
 * Targets: tb_adbk_info, tb_adbk_manage, tb_inst_code, tb_inst_cd_rcptn_log
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_adbk_info
ALTER TABLE tb_adbk_info 
    ALTER COLUMN adbk_nm TYPE VARCHAR(300),
    RENAME COLUMN othbc_scope TO othbc_scope_cd,
    ALTER COLUMN othbc_scope_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_adbk_info IS '주소록 정보';

-- 2. tb_adbk_manage
ALTER TABLE tb_adbk_manage 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN nm TO user_nm,
    ALTER COLUMN user_nm TYPE VARCHAR(300),
    RENAME COLUMN email_adres TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN house_telno TO home_telno,
    RENAME COLUMN offm_telno TO office_telno,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_adbk_manage IS '주소록 관리';

-- 3. tb_inst_code
ALTER TABLE tb_inst_code 
    RENAME COLUMN best_instt_code TO best_inst_cd,
    ALTER COLUMN best_inst_cd TYPE VARCHAR(12),
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN rprs_inst_cd TO repr_inst_cd,
    ALTER COLUMN repr_inst_cd TYPE VARCHAR(12),
    ALTER COLUMN up_inst_cd TYPE VARCHAR(12),
    RENAME COLUMN all_instt_nm TO all_inst_nm,
    ALTER COLUMN all_inst_nm TYPE VARCHAR(300),
    RENAME COLUMN lowest_instt_nm TO lowest_inst_nm,
    ALTER COLUMN lowest_inst_nm TYPE VARCHAR(300),
    RENAME COLUMN instt_abrv_nm TO inst_abbr_nm,
    ALTER COLUMN inst_abbr_nm TYPE VARCHAR(300),
    RENAME COLUMN creat_de TO crt_ymd,
    ALTER COLUMN crt_ymd TYPE CHAR(8),
    RENAME COLUMN abl_de TO abl_ymd,
    ALTER COLUMN abl_ymd TYPE CHAR(8),
    RENAME COLUMN change_de TO chg_ymd,
    ALTER COLUMN chg_ymd TYPE CHAR(8),
    RENAME COLUMN change_time TO chg_tm,
    ALTER COLUMN chg_tm TYPE CHAR(6) USING REPLACE(chg_tm, ':', '') || '00',
    RENAME COLUMN bsis_de TO bsis_ymd,
    ALTER COLUMN bsis_ymd TYPE CHAR(8),
    RENAME COLUMN inst_type_lclsf TO inst_type_lclsf_cd,
    ALTER COLUMN inst_type_lclsf_cd TYPE VARCHAR(12),
    RENAME COLUMN inst_type_mclsf TO inst_type_mclsf_cd,
    ALTER COLUMN inst_type_mclsf_cd TYPE VARCHAR(12),
    RENAME COLUMN inst_type_sclsf TO inst_type_sclsf_cd,
    ALTER COLUMN inst_type_sclsf_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_inst_code IS '기관 코드 정보';

-- 4. tb_inst_cd_rcptn_log
ALTER TABLE tb_inst_cd_rcptn_log 
    RENAME COLUMN opert_sn TO opert_seq,
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN all_instt_nm TO all_inst_nm,
    RENAME COLUMN lowest_instt_nm TO lowest_inst_nm,
    RENAME COLUMN instt_abrv_nm TO inst_abbr_nm,
    RENAME COLUMN fxnum TO fxno,
    RENAME COLUMN creat_de TO crt_ymd,
    ALTER COLUMN crt_ymd TYPE CHAR(8),
    RENAME COLUMN abl_de TO abl_ymd,
    ALTER COLUMN abl_ymd TYPE CHAR(8),
    RENAME COLUMN change_de TO chg_ymd,
    ALTER COLUMN chg_ymd TYPE CHAR(8),
    RENAME COLUMN change_time TO chg_tm,
    ALTER COLUMN chg_tm TYPE CHAR(6) USING REPLACE(chg_tm, ':', '') || '00',
    RENAME COLUMN bsis_de TO bsis_ymd,
    ALTER COLUMN bsis_ymd TYPE CHAR(8),
    RENAME COLUMN reprsnt_instt_code TO repr_inst_cd,
    ALTER COLUMN repr_inst_cd TYPE VARCHAR(12),
    RENAME COLUMN etc_code TO etc_cd,
    ALTER COLUMN etc_cd TYPE VARCHAR(12);
COMMENT ON TABLE tb_inst_cd_rcptn_log IS '기관 코드 수신 로그';

COMMIT;
