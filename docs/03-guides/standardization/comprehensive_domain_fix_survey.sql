/*
 * DB Standardization - Comprehensive Domain & Abbreviation Fix
 * Domain: Survey (6 Tables)
 * Standards Enforcement: _YMD (CHAR 8), _YN (CHAR 1), _TTL/NM (V300), _CN/EXPLN (V4000), _CD (V12)
 */

BEGIN;

-- 1. tb_survey_info
ALTER TABLE tb_survey_info RENAME COLUMN qustnr_sj TO qustnr_ttl;
ALTER TABLE tb_survey_info ALTER COLUMN qustnr_ttl TYPE VARCHAR(300);
ALTER TABLE tb_survey_info RENAME COLUMN qustnr_purps TO qustnr_expln;
ALTER TABLE tb_survey_info ALTER COLUMN qustnr_expln TYPE VARCHAR(4000);
ALTER TABLE tb_survey_info RENAME COLUMN qustnr_bgnde TO qustnr_bgng_ymd;
ALTER TABLE tb_survey_info ALTER COLUMN qustnr_bgng_ymd TYPE CHAR(8);
ALTER TABLE tb_survey_info RENAME COLUMN qustnr_endde TO qustnr_end_ymd;
ALTER TABLE tb_survey_info ALTER COLUMN qustnr_end_ymd TYPE CHAR(8);

-- 2. tb_survey_qitem
ALTER TABLE tb_survey_qitem ALTER COLUMN qestn_cn TYPE VARCHAR(4000);
ALTER TABLE tb_survey_qitem RENAME COLUMN qestn_ty_code TO qestn_ty_cd;
ALTER TABLE tb_survey_qitem ALTER COLUMN qestn_ty_cd TYPE CHAR(1);

-- 3. tb_survey_item
ALTER TABLE tb_survey_item ALTER COLUMN iem_cn TYPE VARCHAR(4000);
ALTER TABLE tb_survey_item ALTER COLUMN etc_answer_yn TYPE CHAR(1);

-- 4. tb_survey_respondent
ALTER TABLE tb_survey_respondent RENAME COLUMN sexdstn_code TO gender_cd;
ALTER TABLE tb_survey_respondent ALTER COLUMN gender_cd TYPE CHAR(1);
ALTER TABLE tb_survey_respondent RENAME COLUMN occp_ty_code TO occp_ty_cd;
ALTER TABLE tb_survey_respondent ALTER COLUMN occp_ty_cd TYPE CHAR(1);

-- 5. tb_survey_result
ALTER TABLE tb_survey_result ALTER COLUMN qustnr_rspns_cn TYPE VARCHAR(4000);

-- 6. tb_survey_tmplt
ALTER TABLE tb_survey_tmplt ALTER COLUMN qustnr_tmplat_nm TYPE VARCHAR(300);
ALTER TABLE tb_survey_tmplt RENAME COLUMN qustnr_tmplat_purps TO qustnr_tmplat_expln;
ALTER TABLE tb_survey_tmplt ALTER COLUMN qustnr_tmplat_expln TYPE VARCHAR(4000);

COMMIT;
