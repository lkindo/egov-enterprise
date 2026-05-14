/*
 * DB Standardization Migration Script (Final v2)
 * Target: tb_bbs_master
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type/Length Adjustment (Total 18 Columns)
ALTER TABLE tb_bbs_master 
    ALTER COLUMN bbs_nm TYPE VARCHAR(300), -- Domain: 명V300
    RENAME COLUMN bbs_intrcn TO bbs_expln,
    ALTER COLUMN bbs_expln TYPE VARCHAR(4000), -- Domain: 내용V4000
    RENAME COLUMN bbs_ty_code TO bbs_type_cd,
    ALTER COLUMN bbs_type_cd TYPE VARCHAR(12), -- Hard-Stop (C12)
    RENAME COLUMN bbs_attrb_code TO bbs_atrb_cd,
    ALTER COLUMN bbs_atrb_cd TYPE VARCHAR(12), -- Hard-Stop (C12)
    RENAME COLUMN reply_posbl_yn TO rpl_psblty_yn,
    RENAME COLUMN file_atch_posbl_yn TO file_atch_psblty_yn,
    RENAME COLUMN atch_posbl_file_number TO atch_psblty_file_nocs,
    RENAME COLUMN atch_posbl_file_size TO atch_psblty_file_sz,
    RENAME COLUMN tmplat_id TO tmplt_id,
    RENAME COLUMN cmmnty_id TO cmnty_id,
    ALTER COLUMN blog_yn TYPE CHAR(1), -- YN Domain (C1)
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_bbs_master_bbs_id RENAME TO pk_bbs_master;

-- 3. Metadata (Comments) Application (Total 18 Columns)
COMMENT ON TABLE tb_bbs_master IS '게시판 마스터 테이블';
COMMENT ON COLUMN tb_bbs_master.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_master.bbs_nm IS '게시판명';
COMMENT ON COLUMN tb_bbs_master.bbs_expln IS '게시판설명';
COMMENT ON COLUMN tb_bbs_master.bbs_type_cd IS '게시판유형코드';
COMMENT ON COLUMN tb_bbs_master.bbs_atrb_cd IS '게시판속성코드';
COMMENT ON COLUMN tb_bbs_master.rpl_psblty_yn IS '답장가능여부';
COMMENT ON COLUMN tb_bbs_master.file_atch_psblty_yn IS '파일첨부가능여부';
COMMENT ON COLUMN tb_bbs_master.atch_psblty_file_nocs IS '첨부가능파일수';
COMMENT ON COLUMN tb_bbs_master.atch_psblty_file_sz IS '첨부가능파일크기';
COMMENT ON COLUMN tb_bbs_master.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_master.tmplt_id IS '템플릿아이디';
COMMENT ON COLUMN tb_bbs_master.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_bbs_master.blog_id IS '블로그아이디';
COMMENT ON COLUMN tb_bbs_master.blog_yn IS '블로그여부';
COMMENT ON COLUMN tb_bbs_master.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_master.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_master.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_master.last_mdfr_id IS '최종수정자아이디';

COMMIT;
