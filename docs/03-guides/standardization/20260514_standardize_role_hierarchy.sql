/*
 * DB Standardization Migration Script
 * Target: tb_role_hierarchy
 * Date: 2026-05-14
 * Author: Antigravity
 * Note: Fixed corrupted comments ('강수량') and standardized hierarchy naming.
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_role_hierarchy 
    RENAME COLUMN parnts_role TO prnt_role_cd,
    RENAME COLUMN chldrn_role TO chld_role_cd,
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
-- (Consolidating duplicate unique indexes and renaming to standard)
DROP INDEX IF EXISTS idx_tb_role_hierarchy_chldrn_role;
DROP INDEX IF EXISTS nroles_hierarchy_pk;
ALTER TABLE tb_role_hierarchy ADD CONSTRAINT pk_role_hierarchy PRIMARY KEY (prnt_role_cd, chld_role_cd);

ALTER INDEX idx_tb_role_hierarchy_parnts_role RENAME TO ix_role_hierarchy_prnt_role_cd;
ALTER INDEX nroles_hierarchy_i02 RENAME TO ix_role_hierarchy_chld_role_cd;

-- 3. Metadata (Comments) Application
COMMENT ON TABLE tb_role_hierarchy IS '롤 계층 구조 테이블';
COMMENT ON COLUMN tb_role_hierarchy.prnt_role_cd IS '부모롤코드';
COMMENT ON COLUMN tb_role_hierarchy.chld_role_cd IS '자녀롤코드';
COMMENT ON COLUMN tb_role_hierarchy.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_role_hierarchy.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_role_hierarchy.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_role_hierarchy.last_mdfr_id IS '최종수정자아이디';

COMMIT;
