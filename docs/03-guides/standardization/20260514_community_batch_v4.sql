/*
 * DB Standardization Migration Script (Final Version v4 - Corrected by Gemini 3 Flash)
 * Domain: Community Domain Batch
 * Targets: tb_cmmnty_info, tb_cmmnty_user_map, tb_club_info, tb_club_user_map, tb_blog_info, tb_blog_user_map, tb_indvdl_pge
 * Date: 2026-05-14
 * Rules: 
 *   - Strictly follow meta_standard_terms (SSOT)
 *   - 커뮤니티: CMNTY, 회원: MBR, 가입: JOIN, 탈퇴: WHDWL, 쪽: PAGE
 */

BEGIN;

-- 1. tb_cmmnty_info
ALTER TABLE tb_cmmnty_info 
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN cmmnty_nm TO cmnty_nm,
    ALTER COLUMN cmnty_nm TYPE VARCHAR(300),
    RENAME COLUMN cmmnty_intrcn TO cmnty_expln,
    ALTER COLUMN cmnty_expln TYPE VARCHAR(4000),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. tb_cmmnty_user_map
ALTER TABLE tb_cmmnty_user_map 
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN mngr_at TO mngr_yn,
    RENAME COLUMN mber_sttus TO mbr_stts_cd,
    RENAME COLUMN sbscrb_de TO join_ymd,
    ALTER COLUMN join_ymd TYPE CHAR(8),
    RENAME COLUMN secsn_de TO whdwl_ymd,
    ALTER COLUMN whdwl_ymd TYPE CHAR(8),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

-- 3. tb_club_info
ALTER TABLE tb_club_info 
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN clb_id TO club_id,
    RENAME COLUMN clb_nm TO club_nm,
    ALTER COLUMN club_nm TYPE VARCHAR(300),
    RENAME COLUMN clb_intrcn TO club_expln,
    ALTER COLUMN club_expln TYPE VARCHAR(4000),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

-- 4. tb_club_user_map
ALTER TABLE tb_club_user_map 
    RENAME COLUMN clb_id TO club_id,
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN mber_sttus TO mbr_stts_cd,
    RENAME COLUMN sbscrb_de TO join_ymd,
    ALTER COLUMN join_ymd TYPE CHAR(8),
    RENAME COLUMN secsn_de TO whdwl_ymd,
    ALTER COLUMN whdwl_ymd TYPE CHAR(8),
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

-- 5. tb_blog_info
ALTER TABLE tb_blog_info 
    RENAME COLUMN blog_nm TO blog_ttl,
    ALTER COLUMN blog_ttl TYPE VARCHAR(300),
    RENAME COLUMN blog_intrcn TO blog_expln,
    ALTER COLUMN blog_expln TYPE VARCHAR(4000),
    RENAME COLUMN regist_se_code TO reg_se_cd,
    ALTER COLUMN reg_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

-- 6. tb_blog_user_map
ALTER TABLE tb_blog_user_map 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN mber_sttus TO mbr_stts_cd,
    RENAME COLUMN sbscrb_de TO join_ymd,
    ALTER COLUMN join_ymd TYPE CHAR(8),
    RENAME COLUMN secsn_de TO whdwl_ymd,
    ALTER COLUMN whdwl_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

-- 7. tb_indvdl_pge
ALTER TABLE tb_indvdl_pge 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN pge_nm TO page_ttl,
    ALTER COLUMN page_ttl TYPE VARCHAR(300),
    RENAME COLUMN page_expln TO page_expln,
    ALTER COLUMN page_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMIT;
