/*
 * DB Standardization - Comprehensive Domain & Abbreviation Fix
 * Domain: Common (12 Tables)
 * Standards Enforcement: _YMD (CHAR 8), _YN (CHAR 1), _TTL/NM (V300), _CN/EXPLN (V4000), _CD (V12)
 */

BEGIN;

-- 1. tb_com_clsf_cd
ALTER TABLE tb_com_clsf_cd ALTER COLUMN cl_code_nm TYPE VARCHAR(300);
ALTER TABLE tb_com_clsf_cd RENAME COLUMN cl_code_dc TO cl_code_expln;
ALTER TABLE tb_com_clsf_cd ALTER COLUMN cl_code_expln TYPE VARCHAR(4000);
ALTER TABLE tb_com_clsf_cd RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_com_clsf_cd ALTER COLUMN use_yn TYPE CHAR(1);

-- 2. tb_com_cd
ALTER TABLE tb_com_cd ALTER COLUMN code_id_nm TYPE VARCHAR(300);
ALTER TABLE tb_com_cd RENAME COLUMN code_id_dc TO code_id_expln;
ALTER TABLE tb_com_cd ALTER COLUMN code_id_expln TYPE VARCHAR(4000);
ALTER TABLE tb_com_cd RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_com_cd ALTER COLUMN use_yn TYPE CHAR(1);

-- 3. tb_com_dtl_cd
ALTER TABLE tb_com_dtl_cd ALTER COLUMN code_nm TYPE VARCHAR(300);
ALTER TABLE tb_com_dtl_cd RENAME COLUMN code_dc TO code_expln;
ALTER TABLE tb_com_dtl_cd ALTER COLUMN code_expln TYPE VARCHAR(4000);
ALTER TABLE tb_com_dtl_cd RENAME COLUMN use_at TO use_yn;
ALTER TABLE tb_com_dtl_cd ALTER COLUMN use_yn TYPE CHAR(1);

-- 4. tb_file_detail
ALTER TABLE tb_file_detail ALTER COLUMN file_expln TYPE VARCHAR(4000);

-- 5. tb_menu_info
ALTER TABLE tb_menu_info ALTER COLUMN menu_nm TYPE VARCHAR(300);
ALTER TABLE tb_menu_info RENAME COLUMN menu_dc TO menu_expln;
ALTER TABLE tb_menu_info ALTER COLUMN menu_expln TYPE VARCHAR(4000);

-- 6. tb_tmplt_info
ALTER TABLE tb_tmplt_info ALTER COLUMN tmplat_nm TYPE VARCHAR(300);
ALTER TABLE tb_tmplt_info RENAME COLUMN tmplat_se_code TO tmplat_se_cd;
ALTER TABLE tb_tmplt_info ALTER COLUMN tmplat_se_cd TYPE VARCHAR(12);
ALTER TABLE tb_tmplt_info ALTER COLUMN use_yn TYPE CHAR(1);

-- 7. tb_progrm_list
ALTER TABLE tb_progrm_list ALTER COLUMN progrm_korean_nm TYPE VARCHAR(300);
ALTER TABLE tb_progrm_list ALTER COLUMN progrm_dc TYPE VARCHAR(4000);

-- 8. tb_sitemap_info
ALTER TABLE tb_sitemap_info RENAME COLUMN creat_de TO reg_ymd;
ALTER TABLE tb_sitemap_info ALTER COLUMN reg_ymd TYPE CHAR(8);

COMMIT;
