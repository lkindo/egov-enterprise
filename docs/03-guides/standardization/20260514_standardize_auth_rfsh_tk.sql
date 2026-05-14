/*
 * DB Standardization Migration Script
 * Target: tb_auth_rfsh_tk
 * Date: 2026-05-14
 * Author: Antigravity
 * Note: Replaced 'Refresh' with standard word 'RISSU' (Reissue)
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_auth_rfsh_tk 
    ALTER COLUMN user_id TYPE VARCHAR(20),
    RENAME COLUMN tk_val TO rissu_tkn_vl,
    ALTER COLUMN rissu_tkn_vl TYPE VARCHAR(512),
    RENAME COLUMN creat_dt TO crt_dt,
    ALTER COLUMN frst_rgtr_id TYPE VARCHAR(20),
    ALTER COLUMN last_mdfr_id TYPE VARCHAR(20);

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_auth_rfsh_tk_user_id RENAME TO uk_auth_rfsh_tk_user_id;
ALTER INDEX idx_tb_auth_rfsh_tk_tk_val RENAME TO uk_auth_rfsh_tk_rissu_tkn_vl;

-- 3. Metadata (Comments) Application
COMMENT ON TABLE tb_auth_rfsh_tk IS 'JWT 재발급 토큰 저장 테이블';
COMMENT ON COLUMN tb_auth_rfsh_tk.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_auth_rfsh_tk.rissu_tkn_vl IS '재발급토큰값';
COMMENT ON COLUMN tb_auth_rfsh_tk.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_auth_rfsh_tk.last_mdfr_id IS '최종수정자아이디';

COMMIT;
