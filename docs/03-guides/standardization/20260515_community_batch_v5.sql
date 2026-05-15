/*
 * DB Standardization Migration Script (Community Domain Batch v5 - PHYSICAL SYNC)
 * Targets: tb_cmnty_info, tb_cmnty_user_map, tb_club_info, tb_club_user_map, tb_blog_info, tb_blog_user_map, tb_indvdl_pge
 * Date: 2026-05-15
 */

BEGIN;

-- 1. tb_cmnty_info
ALTER TABLE tb_cmnty_info RENAME COLUMN cmmnty_id TO cmnty_id;
ALTER TABLE tb_cmnty_info RENAME COLUMN cmmnty_nm TO cmnty_nm;
ALTER TABLE tb_cmnty_info ALTER COLUMN cmnty_nm TYPE VARCHAR(300);
ALTER TABLE tb_cmnty_info RENAME COLUMN cmmnty_intrcn TO cmnty_intro_cn;
ALTER TABLE tb_cmnty_info ALTER COLUMN cmnty_intro_cn TYPE VARCHAR(4000);
ALTER TABLE tb_cmnty_info ALTER COLUMN use_yn TYPE CHAR(1);
ALTER TABLE tb_cmnty_info RENAME COLUMN regist_se_code TO reg_se_cd;
ALTER TABLE tb_cmnty_info ALTER COLUMN reg_se_cd TYPE VARCHAR(30);
ALTER TABLE tb_cmnty_info RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_cmnty_info.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_cmnty_info.cmnty_nm IS '커뮤니티명';
COMMENT ON COLUMN tb_cmnty_info.cmnty_intro_cn IS '커뮤니티소개내용';
COMMENT ON COLUMN tb_cmnty_info.reg_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_cmnty_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_cmnty_info.crt_dt IS '생성일시';

-- 2. tb_cmnty_user_map
ALTER TABLE tb_cmnty_user_map RENAME COLUMN cmmnty_id TO cmnty_id;
ALTER TABLE tb_cmnty_user_map RENAME COLUMN emplyr_id TO user_id;
ALTER TABLE tb_cmnty_user_map ALTER COLUMN user_id TYPE VARCHAR(30);
ALTER TABLE tb_cmnty_user_map RENAME COLUMN mber_sttus TO mbr_stts_cd;
ALTER TABLE tb_cmnty_user_map ALTER COLUMN mbr_stts_cd TYPE VARCHAR(30);
ALTER TABLE tb_cmnty_user_map RENAME COLUMN sbscrb_de TO join_ymd;
ALTER TABLE tb_cmnty_user_map ALTER COLUMN join_ymd TYPE CHAR(8);
ALTER TABLE tb_cmnty_user_map RENAME COLUMN secsn_de TO whdwl_ymd;
ALTER TABLE tb_cmnty_user_map ALTER COLUMN whdwl_ymd TYPE CHAR(8);
ALTER TABLE tb_cmnty_user_map ALTER COLUMN mngr_yn TYPE CHAR(1);
ALTER TABLE tb_cmnty_user_map ALTER COLUMN use_yn TYPE CHAR(1);
ALTER TABLE tb_cmnty_user_map RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_cmnty_user_map.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_cmnty_user_map.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_cmnty_user_map.mbr_stts_cd IS '회원상태코드';
COMMENT ON COLUMN tb_cmnty_user_map.join_ymd IS '가입일자';
COMMENT ON COLUMN tb_cmnty_user_map.whdwl_ymd IS '탈퇴일자';
COMMENT ON COLUMN tb_cmnty_user_map.mngr_yn IS '관리자여부';
COMMENT ON COLUMN tb_cmnty_user_map.crt_dt IS '생성일시';

-- 3. tb_club_info
ALTER TABLE tb_club_info RENAME COLUMN cmmnty_id TO cmnty_id;
ALTER TABLE tb_club_info RENAME COLUMN clb_id TO club_id;
ALTER TABLE tb_club_info RENAME COLUMN clb_nm TO club_nm;
ALTER TABLE tb_club_info ALTER COLUMN club_nm TYPE VARCHAR(300);
ALTER TABLE tb_club_info RENAME COLUMN clb_intrcn TO club_intro_cn;
ALTER TABLE tb_club_info ALTER COLUMN club_intro_cn TYPE VARCHAR(4000);
ALTER TABLE tb_club_info RENAME COLUMN regist_se_code TO reg_se_cd;
ALTER TABLE tb_club_info ALTER COLUMN reg_se_cd TYPE VARCHAR(30);
ALTER TABLE tb_club_info ALTER COLUMN use_yn TYPE CHAR(1);
ALTER TABLE tb_club_info RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_club_info.club_id IS '동호회아이디';
COMMENT ON COLUMN tb_club_info.club_nm IS '동호회명';
COMMENT ON COLUMN tb_club_info.club_intro_cn IS '동호회소개내용';
COMMENT ON COLUMN tb_club_info.reg_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_club_info.crt_dt IS '생성일시';

-- 4. tb_club_user_map
ALTER TABLE tb_club_user_map RENAME COLUMN clb_id TO club_id;
ALTER TABLE tb_club_user_map RENAME COLUMN cmmnty_id TO cmnty_id;
ALTER TABLE tb_club_user_map RENAME COLUMN emplyr_id TO user_id;
ALTER TABLE tb_club_user_map ALTER COLUMN user_id TYPE VARCHAR(30);
ALTER TABLE tb_club_user_map RENAME COLUMN oprtr_yn TO mngr_yn;
ALTER TABLE tb_club_user_map ALTER COLUMN mngr_yn TYPE CHAR(1);
ALTER TABLE tb_club_user_map RENAME COLUMN sbscrb_de TO join_ymd;
ALTER TABLE tb_club_user_map ALTER COLUMN join_ymd TYPE CHAR(8);
ALTER TABLE tb_club_user_map RENAME COLUMN secsn_de TO whdwl_ymd;
ALTER TABLE tb_club_user_map ALTER COLUMN whdwl_ymd TYPE CHAR(8);
ALTER TABLE tb_club_user_map ALTER COLUMN use_yn TYPE CHAR(1);
ALTER TABLE tb_club_user_map RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_club_user_map.club_id IS '동호회아이디';
COMMENT ON COLUMN tb_club_user_map.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_club_user_map.mngr_yn IS '관리자여부';
COMMENT ON COLUMN tb_club_user_map.join_ymd IS '가입일자';
COMMENT ON COLUMN tb_club_user_map.crt_dt IS '생성일시';

-- 5. tb_blog_info
ALTER TABLE tb_blog_info RENAME COLUMN blog_nm TO blog_ttl;
ALTER TABLE tb_blog_info ALTER COLUMN blog_ttl TYPE VARCHAR(300);
ALTER TABLE tb_blog_info RENAME COLUMN blog_intrcn TO blog_intro_cn;
ALTER TABLE tb_blog_info ALTER COLUMN blog_intro_cn TYPE VARCHAR(4000);
ALTER TABLE tb_blog_info RENAME COLUMN regist_se_code TO reg_se_cd;
ALTER TABLE tb_blog_info ALTER COLUMN reg_se_cd TYPE VARCHAR(30);
ALTER TABLE tb_blog_info RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_blog_info.blog_ttl IS '블로그제목';
COMMENT ON COLUMN tb_blog_info.blog_intro_cn IS '블로그소개내용';
COMMENT ON COLUMN tb_blog_info.reg_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_blog_info.crt_dt IS '생성일시';

-- 6. tb_blog_user_map
ALTER TABLE tb_blog_user_map RENAME COLUMN emplyr_id TO user_id;
ALTER TABLE tb_blog_user_map ALTER COLUMN user_id TYPE VARCHAR(30);
ALTER TABLE tb_blog_user_map RENAME COLUMN mber_sttus TO mbr_stts_cd;
ALTER TABLE tb_blog_user_map ALTER COLUMN mbr_stts_cd TYPE VARCHAR(30);
ALTER TABLE tb_blog_user_map RENAME COLUMN sbscrb_de TO join_ymd;
ALTER TABLE tb_blog_user_map ALTER COLUMN join_ymd TYPE CHAR(8);
ALTER TABLE tb_blog_user_map RENAME COLUMN secsn_de TO whdwl_ymd;
ALTER TABLE tb_blog_user_map ALTER COLUMN whdwl_ymd TYPE CHAR(8);
ALTER TABLE tb_blog_user_map RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_blog_user_map.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_blog_user_map.mbr_stts_cd IS '회원상태코드';
COMMENT ON COLUMN tb_blog_user_map.join_ymd IS '가입일자';
COMMENT ON COLUMN tb_blog_user_map.crt_dt IS '생성일시';

-- 7. tb_indvdl_pge
ALTER TABLE tb_indvdl_pge RENAME COLUMN emplyr_id TO user_id;
ALTER TABLE tb_indvdl_pge ALTER COLUMN user_id TYPE VARCHAR(30);
ALTER TABLE tb_indvdl_pge RENAME COLUMN pge_nm TO page_ttl;
ALTER TABLE tb_indvdl_pge ALTER COLUMN page_ttl TYPE VARCHAR(300);
ALTER TABLE tb_indvdl_pge ALTER COLUMN page_expln TYPE VARCHAR(4000);
ALTER TABLE tb_indvdl_pge RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_indvdl_pge.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_indvdl_pge.page_ttl IS '페이지제목';
COMMENT ON COLUMN tb_indvdl_pge.page_expln IS '페이지설명';
COMMENT ON COLUMN tb_indvdl_pge.crt_dt IS '생성일시';

COMMIT;
