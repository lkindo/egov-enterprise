/*
 * DB Standardization Migration Script (Community Domain Batch) - Full Comments Included
 * Targets: tb_cmnty_info, tb_cmnty_user_map, tb_club_info, tb_club_user_map, tb_blog_info, tb_blog_user_map, tb_indvdl_pge
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_cmnty_info
ALTER TABLE tb_cmnty_info 
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN cmmnty_nm TO cmnty_ttl,
    ALTER COLUMN cmnty_ttl TYPE VARCHAR(300),
    RENAME COLUMN cmmnty_intrcn TO cmnty_expln,
    ALTER COLUMN cmnty_expln TYPE VARCHAR(4000),
    RENAME COLUMN regist_se_code TO regist_se_cd,
    ALTER COLUMN regist_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_cmnty_info IS '커뮤니티 정보';
COMMENT ON COLUMN tb_cmnty_info.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_cmnty_info.cmnty_ttl IS '커뮤니티제목';
COMMENT ON COLUMN tb_cmnty_info.cmnty_expln IS '커뮤니티설명';
COMMENT ON COLUMN tb_cmnty_info.tmplat_id IS '템플릿아이디';
COMMENT ON COLUMN tb_cmnty_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_cmnty_info.regist_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_cmnty_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_cmnty_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_cmnty_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_cmnty_info.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_cmnty_user_map
ALTER TABLE tb_cmnty_user_map 
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN mber_sttus TO mber_sttus_cd,
    ALTER COLUMN mber_sttus_cd TYPE VARCHAR(12),
    RENAME COLUMN sbscrb_de TO sbscrb_ymd,
    ALTER COLUMN sbscrb_ymd TYPE CHAR(8),
    RENAME COLUMN secsn_de TO secsn_ymd,
    ALTER COLUMN secsn_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_cmnty_user_map IS '커뮤니티 사용자 매핑';
COMMENT ON COLUMN tb_cmnty_user_map.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_cmnty_user_map.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_cmnty_user_map.mngr_yn IS '관리자여부';
COMMENT ON COLUMN tb_cmnty_user_map.mber_sttus_cd IS '회원상태코드';
COMMENT ON COLUMN tb_cmnty_user_map.sbscrb_ymd IS '가입일자';
COMMENT ON COLUMN tb_cmnty_user_map.secsn_ymd IS '탈퇴일자';
COMMENT ON COLUMN tb_cmnty_user_map.use_yn IS '사용여부';
COMMENT ON COLUMN tb_cmnty_user_map.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_cmnty_user_map.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_cmnty_user_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_cmnty_user_map.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_club_info
ALTER TABLE tb_club_info 
    RENAME COLUMN clb_id TO club_id,
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN clb_nm TO club_ttl,
    ALTER COLUMN club_ttl TYPE VARCHAR(300),
    RENAME COLUMN clb_intrcn TO club_expln,
    ALTER COLUMN club_expln TYPE VARCHAR(4000),
    RENAME COLUMN regist_se_code TO regist_se_cd,
    ALTER COLUMN regist_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_club_info IS '동호회 정보';
COMMENT ON COLUMN tb_club_info.club_id IS '동호회아이디';
COMMENT ON COLUMN tb_club_info.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_club_info.club_ttl IS '동호회제목';
COMMENT ON COLUMN tb_club_info.club_expln IS '동호회설명';
COMMENT ON COLUMN tb_club_info.tmplat_id IS '템플릿아이디';
COMMENT ON COLUMN tb_club_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_club_info.regist_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_club_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_club_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_club_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_club_info.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_club_user_map
ALTER TABLE tb_club_user_map 
    RENAME COLUMN clb_id TO club_id,
    RENAME COLUMN cmmnty_id TO cmnty_id,
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN oprtr_yn TO mngr_yn,
    RENAME COLUMN sbscrb_de TO sbscrb_ymd,
    ALTER COLUMN sbscrb_ymd TYPE CHAR(8),
    RENAME COLUMN secsn_de TO secsn_ymd,
    ALTER COLUMN secsn_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_club_user_map IS '동호회 사용자 매핑';
COMMENT ON COLUMN tb_club_user_map.club_id IS '동호회아이디';
COMMENT ON COLUMN tb_club_user_map.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_club_user_map.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_club_user_map.mngr_yn IS '관리자여부';
COMMENT ON COLUMN tb_club_user_map.sbscrb_ymd IS '가입일자';
COMMENT ON COLUMN tb_club_user_map.secsn_ymd IS '탈퇴일자';
COMMENT ON COLUMN tb_club_user_map.use_yn IS '사용여부';
COMMENT ON COLUMN tb_club_user_map.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_club_user_map.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_club_user_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_club_user_map.last_mdfr_id IS '최종수정자아이디';

-- 5. tb_blog_info
ALTER TABLE tb_blog_info 
    RENAME COLUMN blog_nm TO blog_ttl,
    ALTER COLUMN blog_ttl TYPE VARCHAR(300),
    RENAME COLUMN blog_intrcn TO blog_expln,
    ALTER COLUMN blog_expln TYPE VARCHAR(4000),
    RENAME COLUMN regist_se_code TO regist_se_cd,
    ALTER COLUMN regist_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_blog_info IS '블로그 정보';
COMMENT ON COLUMN tb_blog_info.blog_id IS '블로그아이디';
COMMENT ON COLUMN tb_blog_info.blog_ttl IS '블로그제목';
COMMENT ON COLUMN tb_blog_info.blog_expln IS '블로그설명';
COMMENT ON COLUMN tb_blog_info.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_blog_info.tmplat_id IS '템플릿아이디';
COMMENT ON COLUMN tb_blog_info.blog_yn IS '블로그여부';
COMMENT ON COLUMN tb_blog_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_blog_info.regist_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_blog_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_blog_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_blog_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_blog_info.last_mdfr_id IS '최종수정자아이디';

-- 6. tb_blog_user_map
ALTER TABLE tb_blog_user_map 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN mber_sttus TO mber_sttus_cd,
    ALTER COLUMN mber_sttus_cd TYPE VARCHAR(12),
    RENAME COLUMN sbscrb_de TO sbscrb_ymd,
    ALTER COLUMN sbscrb_ymd TYPE CHAR(8),
    RENAME COLUMN secsn_de TO secsn_ymd,
    ALTER COLUMN secsn_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_blog_user_map IS '블로그 사용자 매핑';
COMMENT ON COLUMN tb_blog_user_map.blog_id IS '블로그아이디';
COMMENT ON COLUMN tb_blog_user_map.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_blog_user_map.mngr_yn IS '관리자여부';
COMMENT ON COLUMN tb_blog_user_map.mber_sttus_cd IS '회원상태코드';
COMMENT ON COLUMN tb_blog_user_map.sbscrb_ymd IS '가입일자';
COMMENT ON COLUMN tb_blog_user_map.secsn_ymd IS '탈퇴일자';
COMMENT ON COLUMN tb_blog_user_map.use_yn IS '사용여부';
COMMENT ON COLUMN tb_blog_user_map.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_blog_user_map.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_blog_user_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_blog_user_map.last_mdfr_id IS '최종수정자아이디';

-- 7. tb_indvdl_pge
ALTER TABLE tb_indvdl_pge 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN pge_nm TO pge_ttl,
    ALTER COLUMN pge_ttl TYPE VARCHAR(300),
    RENAME COLUMN page_expln TO pge_expln,
    ALTER COLUMN pge_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_indvdl_pge IS '개인페이지 정보';
COMMENT ON COLUMN tb_indvdl_pge.pge_id IS '페이지아이디';
COMMENT ON COLUMN tb_indvdl_pge.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_indvdl_pge.pge_ttl IS '페이지제목';
COMMENT ON COLUMN tb_indvdl_pge.pge_expln IS '페이지설명';
COMMENT ON COLUMN tb_indvdl_pge.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_indvdl_pge.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_indvdl_pge.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_indvdl_pge.last_mdfr_id IS '최종수정자아이디';

COMMIT;
