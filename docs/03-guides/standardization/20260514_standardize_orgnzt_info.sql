/*
 * DB Standardization Migration Script
 * Target: tb_orgnzt_info -> tb_ognz_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Table Renaming
ALTER TABLE tb_orgnzt_info RENAME TO tb_ognz_info;

-- 2. Column Renaming & Type Adjustment
ALTER TABLE tb_ognz_info 
    RENAME COLUMN orgnzt_id TO ognz_id,
    RENAME COLUMN orgnzt_nm TO ognz_nm,
    RENAME COLUMN orgnzt_dc TO ognz_expln,
    ALTER COLUMN ognz_expln TYPE VARCHAR(1000), -- Content Domain (V1000)
    RENAME COLUMN creat_dt TO crt_dt;

-- 3. Index & Constraint Standardization
ALTER INDEX idx_tb_orgnzt_info_orgnzt_id RENAME TO pk_ognz_info;

-- 4. Metadata (Comments) Application
COMMENT ON TABLE tb_ognz_info IS '조직 정보 테이블';
COMMENT ON COLUMN tb_ognz_info.ognz_id IS '조직아이디';
COMMENT ON COLUMN tb_ognz_info.ognz_nm IS '조직명';
COMMENT ON COLUMN tb_ognz_info.ognz_expln IS '조직설명';
COMMENT ON COLUMN tb_ognz_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_ognz_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_ognz_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_ognz_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
