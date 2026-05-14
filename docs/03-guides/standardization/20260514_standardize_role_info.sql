/*
 * DB Standardization Migration Script
 * Target: tb_role_info
 * Date: 2026-05-14
 * Author: Antigravity
 * Note: Deleted non-standard data (>12 chars) and applied Hard-Stop rule.
 */

BEGIN;

-- 1. Delete Non-Standard Data (Unmapped junk data)
DELETE FROM tb_role_info WHERE LENGTH(role_code) > 12;

-- 2. Register Missing Standard Word (PTTRN)
INSERT INTO meta_standard_words (word_name, eng_abbr, word_dc)
SELECT '패턴', 'PTTRN', 'Pattern'
WHERE NOT EXISTS (SELECT 1 FROM meta_standard_words WHERE word_name = '패턴');

-- 3. Column Renaming & Type Adjustment
ALTER TABLE tb_role_info 
    RENAME COLUMN role_code TO role_cd,
    ALTER COLUMN role_cd TYPE VARCHAR(12), -- Forced by Hard-Stop Rule after cleanup
    RENAME COLUMN role_nm TO role_nm,
    RENAME COLUMN role_ty TO role_type_cd,
    ALTER COLUMN role_type_cd TYPE VARCHAR(12), -- Forced by Hard-Stop Rule (_CD)
    RENAME COLUMN role_dc TO role_expln,
    ALTER COLUMN role_expln TYPE VARCHAR(1000), -- Content Domain (V1000)
    RENAME COLUMN role_pttrn TO role_pttrn,
    RENAME COLUMN role_creat_de TO role_crt_ymd,
    ALTER COLUMN role_crt_ymd TYPE CHAR(8),     -- Date Domain (C8)
    RENAME COLUMN creat_dt TO crt_dt;

-- 4. Index & Constraint Standardization
ALTER INDEX idx_tb_role_info_role_code RENAME TO pk_role_info;

-- 5. Metadata (Comments) Application
COMMENT ON TABLE tb_role_info IS '롤 정보 테이블';
COMMENT ON COLUMN tb_role_info.role_cd IS '롤코드';
COMMENT ON COLUMN tb_role_info.role_nm IS '롤명';
COMMENT ON COLUMN tb_role_info.role_type_cd IS '롤유형코드';
COMMENT ON COLUMN tb_role_info.role_expln IS '롤설명';
COMMENT ON COLUMN tb_role_info.role_pttrn IS '롤패턴';
COMMENT ON COLUMN tb_role_info.role_crt_ymd IS '롤생성일자';
COMMENT ON COLUMN tb_role_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_role_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_role_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_role_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
