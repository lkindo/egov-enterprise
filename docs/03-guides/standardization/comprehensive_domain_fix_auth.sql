/*
 * DB Standardization - Comprehensive Domain & Abbreviation Fix
 * Domain: Auth (10 Tables)
 * Standards Enforcement: _YMD (CHAR 8), _YN (CHAR 1), _NM (V300), _CN (V4000), _CD (V12)
 */

BEGIN;

-- 1. tb_user_info
ALTER TABLE tb_user_info RENAME COLUMN user_nm TO user_nm_tmp;
ALTER TABLE tb_user_info ADD COLUMN user_nm VARCHAR(300);
UPDATE tb_user_info SET user_nm = user_nm_tmp;
ALTER TABLE tb_user_info DROP COLUMN user_nm_tmp;

ALTER TABLE tb_user_info RENAME COLUMN eml_addr TO email_addr;
ALTER TABLE tb_user_info ALTER COLUMN email_addr TYPE VARCHAR(100);

ALTER TABLE tb_user_info RENAME COLUMN sbscrb_de TO join_ymd;
ALTER TABLE tb_user_info ALTER COLUMN join_ymd TYPE CHAR(8);

ALTER TABLE tb_user_info RENAME COLUMN sexdstn_code TO gender_cd;
ALTER TABLE tb_user_info ALTER COLUMN gender_cd TYPE CHAR(1);

ALTER TABLE tb_user_info RENAME COLUMN mbtlnum TO mbl_telno;
ALTER TABLE tb_user_info RENAME COLUMN pstinst_code TO pstinst_cd;
ALTER TABLE tb_user_info RENAME COLUMN entrprs_se_code TO entrprs_se_cd;
ALTER TABLE tb_user_info RENAME COLUMN induty_code TO induty_cd;
ALTER TABLE tb_user_info RENAME COLUMN status_code TO status_cd;

ALTER TABLE tb_user_info ALTER COLUMN zip TYPE CHAR(6);
ALTER TABLE tb_user_info ALTER COLUMN lock_yn TYPE CHAR(1);

-- 2. tb_author_info
ALTER TABLE tb_author_info RENAME COLUMN author_code TO author_cd;
ALTER TABLE tb_author_info ALTER COLUMN author_cd TYPE VARCHAR(12);

-- 3. tb_author_group_info
ALTER TABLE tb_author_group_info ALTER COLUMN group_id TYPE VARCHAR(12);

-- 4. tb_role_info
ALTER TABLE tb_role_info RENAME COLUMN role_code TO role_cd;
ALTER TABLE tb_role_info ALTER COLUMN role_cd TYPE VARCHAR(12);
ALTER TABLE tb_role_info RENAME COLUMN role_creat_de TO role_reg_ymd;
ALTER TABLE tb_role_info ALTER COLUMN role_reg_ymd TYPE CHAR(8);

-- 5. tb_login_policy
ALTER TABLE tb_login_policy RENAME COLUMN dplct_use_at TO dplct_use_yn;
ALTER TABLE tb_login_policy ALTER COLUMN dplct_use_yn TYPE CHAR(1);
ALTER TABLE tb_login_policy RENAME COLUMN nm_at TO nm_yn;
ALTER TABLE tb_login_policy ALTER COLUMN nm_yn TYPE CHAR(1);

-- 6. tb_user_author_map
ALTER TABLE tb_user_author_map RENAME COLUMN author_code TO author_cd;
ALTER TABLE tb_user_author_map RENAME COLUMN mber_ty_code TO mber_ty_cd;

-- 7. tb_author_role_map
ALTER TABLE tb_author_role_map RENAME COLUMN author_code TO author_cd;
ALTER TABLE tb_author_role_map RENAME COLUMN role_code TO role_cd;

-- 8. tb_auth_rfsh_tk
ALTER TABLE tb_auth_rfsh_tk RENAME COLUMN tk_val TO rfsh_tk_val;

-- 9. tb_login_log
ALTER TABLE tb_login_log RENAME COLUMN creat_dt TO login_dt;
ALTER TABLE tb_login_log RENAME COLUMN login_mthd TO login_mthd_cd;

-- 10. tb_role_hierarchy
ALTER TABLE tb_role_hierarchy RENAME COLUMN parnts_role TO parnts_role_id;
ALTER TABLE tb_role_hierarchy RENAME COLUMN chldrn_role TO chldrn_role_id;

COMMIT;
