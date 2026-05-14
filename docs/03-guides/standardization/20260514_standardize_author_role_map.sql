/*
 * DB Standardization Migration Script
 * Target: tb_author_role_map
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_author_role_map 
    RENAME COLUMN author_code TO authrt_cd,
    -- (authrt_cd length remains 30 for Spring Security constants)
    RENAME COLUMN role_code TO role_cd,
    ALTER COLUMN role_cd TYPE VARCHAR(12), -- Forced by Hard-Stop Rule
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_author_role_map_author_code RENAME TO pk_author_role_map;

-- 3. Metadata (Comments) Application
COMMENT ON TABLE tb_author_role_map IS '권한 역할(롤) 매핑 테이블';
COMMENT ON COLUMN tb_author_role_map.authrt_cd IS '권한코드';
COMMENT ON COLUMN tb_author_role_map.role_cd IS '롤코드';
COMMENT ON COLUMN tb_author_role_map.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_author_role_map.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_author_role_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_author_role_map.last_mdfr_id IS '최종수정자아이디';

COMMIT;
