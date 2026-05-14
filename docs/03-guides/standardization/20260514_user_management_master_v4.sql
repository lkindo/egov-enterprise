/*
 * DB Standardization Migration Script (User Management Master v4)
 * Targets: tb_user_info, tb_user_info_chg_dtls
 * Date: 2026-05-14
 * Rules: 
 *   - '변경': CHG, '이력/상세': DTLS, '사유': RSN, '내용': CN/EXPLN
 */

BEGIN;

-- 1. tb_user_info (사용자 기본 정보)
ALTER TABLE tb_user_info 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN emplyr_nm TO user_nm,
    RENAME COLUMN password TO pswd,
    RENAME COLUMN emplyr_sttus_code TO user_stts_cd,
    ALTER COLUMN user_stts_cd TYPE VARCHAR(12),
    RENAME COLUMN sexdstn_code TO gndr_cd,
    ALTER COLUMN gndr_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN eml_addr TO eml_addr, -- Standard EML
    RENAME COLUMN offm_telno TO office_telno,
    RENAME COLUMN mbtlnum TO mbl_telno,
    RENAME COLUMN house_telno TO home_telno,
    RENAME COLUMN house_adbk TO home_addr,
    RENAME COLUMN house_end_adbk TO home_detl_addr,
    RENAME COLUMN zip TO zip,
    RENAME COLUMN lck_at TO lck_yn,
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. tb_user_info_chg_dtls (사용자 정보 변경 내역)
ALTER TABLE tb_user_info_chg_dtls 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN change_de TO chg_ymd,
    ALTER COLUMN chg_ymd TYPE CHAR(8),
    RENAME COLUMN change_rsn_cn TO chg_rsn_expln,
    ALTER COLUMN chg_rsn_expln TYPE VARCHAR(4000),
    RENAME COLUMN change_time TO chg_tm,
    ALTER COLUMN chg_tm TYPE CHAR(6),
    RENAME COLUMN creat_dt TO crt_dt;

COMMIT;
