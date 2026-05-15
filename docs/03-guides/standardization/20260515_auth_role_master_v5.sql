/*
 * DB Standardization Migration Script (Auth & Role Master v5 - PHYSICAL SYNC)
 * Targets: tb_author_info, tb_role_info, tb_author_group_info, tb_author_role_map, tb_user_author_map, tb_role_hierarchy, tb_auth_rfsh_tk, tb_login_policy
 * Date: 2026-05-15
 */

BEGIN;

-- 1. tb_author_info
-- author_code -> authrt_cd (이미 변경됨)
ALTER TABLE tb_author_info ALTER COLUMN authrt_cd TYPE VARCHAR(30);
ALTER TABLE tb_author_info RENAME COLUMN author_nm TO authrt_nm;
ALTER TABLE tb_author_info ALTER COLUMN authrt_nm TYPE VARCHAR(300);
ALTER TABLE tb_author_info RENAME COLUMN author_dc TO authrt_expln;
ALTER TABLE tb_author_info ALTER COLUMN authrt_expln TYPE VARCHAR(4000);
ALTER TABLE tb_author_info RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_author_info.authrt_cd IS '권한코드';
COMMENT ON COLUMN tb_author_info.authrt_nm IS '권한명';
COMMENT ON COLUMN tb_author_info.authrt_expln IS '권한설명';
COMMENT ON COLUMN tb_author_info.crt_dt IS '생성일시';

-- 2. tb_role_info
ALTER TABLE tb_role_info RENAME COLUMN role_code TO role_cd;
ALTER TABLE tb_role_info ALTER COLUMN role_cd TYPE VARCHAR(30);
ALTER TABLE tb_role_info RENAME COLUMN role_nm TO role_nm;
ALTER TABLE tb_role_info ALTER COLUMN role_nm TYPE VARCHAR(300);
ALTER TABLE tb_role_info RENAME COLUMN role_dc TO role_expln;
ALTER TABLE tb_role_info ALTER COLUMN role_expln TYPE VARCHAR(4000);
ALTER TABLE tb_role_info RENAME COLUMN role_ty TO role_type_cd;
ALTER TABLE tb_role_info ALTER COLUMN role_type_cd TYPE VARCHAR(30);
ALTER TABLE tb_role_info RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_role_info.role_cd IS '역할아이디';
COMMENT ON COLUMN tb_role_info.role_nm IS '역할명';
COMMENT ON COLUMN tb_role_info.role_expln IS '역할설명';
COMMENT ON COLUMN tb_role_info.role_type_cd IS '역할유형코드';
COMMENT ON COLUMN tb_role_info.crt_dt IS '생성일시';

-- 3. Mappings & Policies
ALTER TABLE tb_author_group_info RENAME COLUMN group_dc TO ognz_expln;
ALTER TABLE tb_author_role_map RENAME COLUMN author_code TO authrt_cd;
ALTER TABLE tb_user_author_map RENAME COLUMN author_code TO authrt_cd;
ALTER TABLE tb_auth_rfsh_tk RENAME COLUMN refresh_token TO updt_tkn;

COMMENT ON COLUMN tb_author_group_info.ognz_expln IS '조직설명';
COMMENT ON COLUMN tb_author_role_map.authrt_cd IS '권한코드';
COMMENT ON COLUMN tb_user_author_map.authrt_cd IS '권한코드';
COMMENT ON COLUMN tb_auth_rfsh_tk.updt_tkn IS '갱신토큰';

COMMIT;
