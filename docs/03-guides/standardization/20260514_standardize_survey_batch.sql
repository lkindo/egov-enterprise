/*
 * DB Standardization Migration Script (Survey Domain Batch)
 * Targets: tb_survey_info, tb_survey_tmplt, tb_survey_qitem, tb_survey_item, tb_survey_respondent, tb_survey_result
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_survey_info (12 Columns)
ALTER TABLE tb_survey_info 
    RENAME COLUMN qustnr_id TO srvy_id,
    RENAME COLUMN qustnr_tmplat_id TO tmplt_id,
    RENAME COLUMN qustnr_sj TO srvy_ttl,
    ALTER COLUMN srvy_ttl TYPE VARCHAR(300),
    RENAME COLUMN srvy_prps TO srvy_purp_expln,
    ALTER COLUMN srvy_purp_expln TYPE VARCHAR(4000),
    RENAME COLUMN srvy_trgt TO srvy_trgt_expln,
    ALTER COLUMN srvy_trgt_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_writng_guidance_cn TO srvy_guide_expln,
    ALTER COLUMN srvy_guide_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_bgnde TO srvy_bgng_ymd,
    ALTER COLUMN srvy_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN qustnr_endde TO srvy_end_ymd,
    ALTER COLUMN srvy_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_survey_info IS '설문 정보';
COMMENT ON COLUMN tb_survey_info.srvy_id IS '설문아이디';
COMMENT ON COLUMN tb_survey_info.tmplt_id IS '템플릿아이디';
COMMENT ON COLUMN tb_survey_info.srvy_ttl IS '설문제목';
COMMENT ON COLUMN tb_survey_info.srvy_purp_expln IS '설문목적';
COMMENT ON COLUMN tb_survey_info.srvy_trgt_expln IS '설문대상';
COMMENT ON COLUMN tb_survey_info.srvy_guide_expln IS '설문안내내용';
COMMENT ON COLUMN tb_survey_info.srvy_bgng_ymd IS '설문시작일자';
COMMENT ON COLUMN tb_survey_info.srvy_end_ymd IS '설문종료일자';

-- 2. tb_survey_tmplt (10 Columns)
ALTER TABLE tb_survey_tmplt 
    RENAME COLUMN qustnr_tmplat_id TO tmplt_id,
    RENAME COLUMN srvy_tmplt_type TO tmplt_type_cd,
    ALTER COLUMN tmplt_type_cd TYPE VARCHAR(12),
    RENAME COLUMN qustnr_tmplat_dc TO tmplt_expln,
    ALTER COLUMN tmplt_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_tmplat_path_nm TO tmplt_path_nm,
    RENAME COLUMN srvy_tmplt_img_info TO tmplt_img_info,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_survey_tmplt IS '설문 템플릿 정보';

-- 3. tb_survey_qitem (8 Columns)
ALTER TABLE tb_survey_qitem 
    RENAME COLUMN qustnr_qesitm_id TO qitem_id,
    RENAME COLUMN qustnr_id TO srvy_id,
    RENAME COLUMN qustnr_tmplat_id TO tmplt_id,
    RENAME COLUMN qestn_cn TO qitem_expln,
    ALTER COLUMN qitem_expln TYPE VARCHAR(4000),
    RENAME COLUMN qitem_sn TO qitem_seq;
COMMENT ON TABLE tb_survey_qitem IS '설문 문항 정보';

-- 4. tb_survey_item (11 Columns)
ALTER TABLE tb_survey_item 
    RENAME COLUMN qustnr_iem_id TO iem_id,
    RENAME COLUMN qustnr_qesitm_id TO qitem_id,
    RENAME COLUMN qustnr_id TO srvy_id,
    RENAME COLUMN qustnr_tmplat_id TO tmplt_id,
    RENAME COLUMN artcl_cn TO iem_expln,
    ALTER COLUMN iem_expln TYPE VARCHAR(4000),
    RENAME COLUMN artcl_sn TO iem_seq,
    RENAME COLUMN etc_answer_yn TO etc_ans_yn,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_survey_item IS '설문 항목 정보';

-- 5. tb_survey_respondent (14 Columns)
ALTER TABLE tb_survey_respondent 
    RENAME COLUMN qustnr_respond_id TO rspns_id,
    RENAME COLUMN qestnr_id TO srvy_id,
    RENAME COLUMN qustnr_tmplat_id TO tmplt_id,
    RENAME COLUMN respond_nm TO rspns_nm,
    RENAME COLUMN sexdstn_code TO gender_cd,
    ALTER COLUMN gender_cd TYPE VARCHAR(12),
    RENAME COLUMN occp_ty_code TO occp_type_cd,
    ALTER COLUMN occp_type_cd TYPE VARCHAR(12),
    RENAME COLUMN brdt TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN mid_telno TO mtlno,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_survey_respondent IS '설문 응답자 정보';

-- 6. tb_survey_result (12 Columns)
ALTER TABLE tb_survey_result 
    RENAME COLUMN qustnr_rspns_id TO rspns_id,
    RENAME COLUMN qustnr_qesitm_id TO qitem_id,
    RENAME COLUMN qustnr_iem_id TO iem_id,
    RENAME COLUMN qestnr_id TO srvy_id,
    RENAME COLUMN qustnr_tmplat_id TO tmplt_id,
    RENAME COLUMN respond_nm TO rspns_nm,
    RENAME COLUMN etc_ans_cn TO etc_ans_expln,
    RENAME COLUMN rspdnt_ans_cn TO rspns_ans_expln,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_survey_result IS '설문 결과 정보';

COMMIT;
