/*
 * DB Standardization Migration Script
 * Target: tb_author_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_author_info 
    RENAME COLUMN author_code TO authrt_cd,
    -- (authrt_cd length remains 30 to prevent data loss, but matches _CD suffix)
    RENAME COLUMN author_nm TO authrt_nm,
    RENAME COLUMN author_dc TO authrt_expln,
    ALTER COLUMN authrt_expln TYPE VARCHAR(1000), -- Content Domain (V1000)
    RENAME COLUMN author_creat_de TO authrt_crt_ymd,
    ALTER COLUMN authrt_crt_ymd TYPE CHAR(8),     -- Date Domain (C8)
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_author_info_author_code RENAME TO pk_author_info;

-- 3. Metadata (Comments) Application
COMMENT ON TABLE tb_author_info IS '권한 정보 테이블';
COMMENT ON COLUMN tb_author_info.authrt_cd IS '권한코드';
COMMENT ON COLUMN tb_author_info.authrt_nm IS '권한명';
COMMENT ON COLUMN tb_author_info.authrt_expln IS '권한설명';
COMMENT ON COLUMN tb_author_info.authrt_crt_ymd IS '권한생성일자';
COMMENT ON COLUMN tb_author_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_author_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_author_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_author_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
