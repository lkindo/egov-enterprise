/*
 * DB Standardization Migration Script (Final Version v4 - Corrected by Gemini 3 Flash)
 * Domain: Community, Organization, Notification, Absence
 * Targets: tb_cmnty_info, tb_ognz_info, tb_user_noti_info, tb_user_absn
 * Date: 2026-05-14
 */

BEGIN;

-- 1. tb_ognz_info (조직 정보)
ALTER TABLE tb_orgnzt_info RENAME TO tb_ognz_info;
ALTER TABLE tb_ognz_info 
    RENAME COLUMN orgnzt_id TO ognz_id,
    RENAME COLUMN orgnzt_nm TO ognz_nm,
    RENAME COLUMN orgnzt_dc TO ognz_expln,
    ALTER COLUMN ognz_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. tb_user_noti_info (사용자 알림)
ALTER TABLE tb_user_ntcn RENAME TO tb_user_noti_info;
ALTER TABLE tb_user_noti_info 
    RENAME COLUMN ntcn_no TO noti_no,
    RENAME COLUMN ntcn_dt TO noti_dt,
    RENAME COLUMN ntcn_ttl_nm TO noti_ttl,
    RENAME COLUMN ntcn_cn TO noti_cn,
    RENAME COLUMN ntcn_ivl_val TO noti_intvl_val,
    RENAME COLUMN creat_dt TO crt_dt;

-- 3. tb_user_absn (사용자 부재)
ALTER TABLE tb_user_absence 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN user_absnce_yn TO absn_yn,
    ALTER COLUMN absn_yn TYPE CHAR(1),
    RENAME COLUMN creat_dt TO crt_dt;

-- 4. tb_cmnty_user_map (커뮤니티 사용자 매핑)
ALTER TABLE tb_cmmnty_user_map 
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN mber_sttus TO mbr_stts_cd,
    RENAME COLUMN sbscrb_de TO join_ymd,
    ALTER COLUMN join_ymd TYPE CHAR(8),
    RENAME COLUMN secsn_de TO whdwl_ymd,
    ALTER COLUMN whdwl_ymd TYPE CHAR(8),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMIT;
