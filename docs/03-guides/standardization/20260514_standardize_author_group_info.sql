/*
 * DB Standardization Migration Script
 * Target: tb_author_group_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_author_group_info 
    RENAME COLUMN group_dc TO group_expln,
    ALTER COLUMN group_expln TYPE VARCHAR(1000), -- Standardized to Content Domain (V1000)
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_author_group_info_group_id RENAME TO pk_author_group_info;

-- 3. Metadata (Comments) Application
COMMENT ON TABLE tb_author_group_info IS '권한 그룹 정보 테이블';
COMMENT ON COLUMN tb_author_group_info.group_id IS '그룹아이디';
COMMENT ON COLUMN tb_author_group_info.group_nm IS '그룹명';
COMMENT ON COLUMN tb_author_group_info.group_expln IS '그룹설명';
COMMENT ON COLUMN tb_author_group_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_author_group_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_author_group_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_author_group_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
