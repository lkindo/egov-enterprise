/*
 * DB Standardization Migration Script
 * Target: tb_user_author_map
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_user_author_map 
    RENAME COLUMN scrty_dtrmn_trget_id TO scrty_dcsn_trgt_id,
    RENAME COLUMN author_code TO authrt_cd,
    -- (authrt_cd length remains 30 for security framework consistency)
    RENAME COLUMN mber_ty_code TO mbr_type_cd,
    ALTER COLUMN mbr_type_cd TYPE VARCHAR(12), -- Forced by Hard-Stop Rule
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_user_author_map_scrty_dtrmn_trget_id RENAME TO uk_user_author_map_scrty_dcsn_trgt_id;

-- 3. Metadata (Comments) Application
COMMENT ON TABLE tb_user_author_map IS '사용자 권한 매핑 테이블';
COMMENT ON COLUMN tb_user_author_map.scrty_dcsn_trgt_id IS '보안결정대상아이디';
COMMENT ON COLUMN tb_user_author_map.authrt_cd IS '권한코드';
COMMENT ON COLUMN tb_user_author_map.mbr_type_cd IS '회원유형코드';
COMMENT ON COLUMN tb_user_author_map.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_author_map.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_author_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_author_map.last_mdfr_id IS '최종수정자아이디';

COMMIT;
