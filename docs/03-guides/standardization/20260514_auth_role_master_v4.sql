/*
 * DB Standardization Migration Script (Auth & Role Master v4)
 * Targets: tb_author_info, tb_role_info, tb_author_group_info, tb_author_role_map, tb_user_author_map, tb_role_hierarchy, tb_auth_rfsh_tk, tb_login_policy
 * Date: 2026-05-14
 */

BEGIN;

-- 1. tb_author_info
ALTER TABLE tb_author_info 
    RENAME COLUMN author_nm TO authrt_nm,
    ALTER COLUMN authrt_nm TYPE VARCHAR(300),
    RENAME COLUMN author_dc TO authrt_expln,
    ALTER COLUMN authrt_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. tb_role_info
ALTER TABLE tb_role_info 
    RENAME COLUMN role_nm TO role_nm,
    ALTER COLUMN role_nm TYPE VARCHAR(300),
    RENAME COLUMN role_dc TO role_expln,
    ALTER COLUMN role_expln TYPE VARCHAR(4000),
    RENAME COLUMN role_ty_code TO role_type_cd,
    ALTER COLUMN role_type_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

-- [Mappings & Policies - Integrated from previous step]
ALTER TABLE tb_author_group_info RENAME COLUMN group_dc TO ognz_expln;
ALTER TABLE tb_author_role_map RENAME COLUMN author_code TO authrt_cd;
ALTER TABLE tb_user_author_map RENAME COLUMN author_code TO authrt_cd;
ALTER TABLE tb_auth_rfsh_tk RENAME COLUMN refresh_token TO updt_tkn;

COMMIT;
