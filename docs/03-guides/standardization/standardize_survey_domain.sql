/*
 * DB Standardization Migration Script (Survey Domain Consolidated) - Full Comments Included
 * Targets: tb_survey_info, tb_survey_item, tb_survey_qitem, tb_survey_respondent, tb_survey_result, tb_survey_tmplt
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_survey_info
ALTER TABLE tb_survey_info 
    RENAME COLUMN qustnr_sj TO srvy_ttl,
    ALTER COLUMN srvy_ttl TYPE VARCHAR(300),
    RENAME COLUMN srvy_prps TO srvy_expln,
    ALTER COLUMN srvy_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_writng_guidance_cn TO srvy_guidance_expln,
    ALTER COLUMN srvy_guidance_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_bgnde TO srvy_bgng_ymd,
    ALTER COLUMN srvy_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN qustnr_endde TO srvy_end_ymd,
    ALTER COLUMN srvy_end_ymd TYPE CHAR(8),
    RENAME COLUMN qustnr_id TO srvy_id,
    RENAME COLUMN qustnr_tmplat_id TO srvy_tmplt_id,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_survey_info IS '설문 정보';
COMMENT ON COLUMN tb_survey_info.srvy_id IS '설문아이디';
COMMENT ON COLUMN tb_survey_info.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_survey_info.srvy_ttl IS '설문제목';
COMMENT ON COLUMN tb_survey_info.srvy_expln IS '설문설명(목적)';
COMMENT ON COLUMN tb_survey_info.srvy_trgt IS '설문대상';
COMMENT ON COLUMN tb_survey_info.srvy_guidance_expln IS '설문작성안내내용';
COMMENT ON COLUMN tb_survey_info.srvy_bgng_ymd IS '설문시작일자';
COMMENT ON COLUMN tb_survey_info.srvy_end_ymd IS '설문종료일자';
COMMENT ON COLUMN tb_survey_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_survey_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_survey_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_survey_info.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_survey_item
ALTER TABLE tb_survey_item 
    RENAME COLUMN artcl_cn TO itm_expln,
    ALTER COLUMN itm_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_id TO srvy_id,
    RENAME COLUMN qustnr_iem_id TO srvy_itm_id,
    RENAME COLUMN qustnr_qesitm_id TO srvy_qitem_id,
    RENAME COLUMN qustnr_tmplat_id TO srvy_tmplt_id,
    RENAME COLUMN artcl_sn TO itm_seq,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_survey_item
 IS '설문 항목 정보';
COMMENT ON COLUMN tb_survey_item.srvy_itm_id IS '설문항목아이디';
COMMENT ON COLUMN tb_survey_item.srvy_qitem_id IS '설문질문아이디';
COMMENT ON COLUMN tb_survey_item.srvy_id IS '설문아이디';
COMMENT ON COLUMN tb_survey_item.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_survey_item.itm_seq IS '항목순번';
COMMENT ON COLUMN tb_survey_item.itm_expln IS '항목내용';
COMMENT ON COLUMN tb_survey_item.etc_answer_yn IS '기타답변여부';
COMMENT ON COLUMN tb_survey_item.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_survey_item.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_survey_item.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_survey_item.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_survey_qitem
ALTER TABLE tb_survey_qitem 
    RENAME COLUMN qestn_cn TO qitem_expln,
    ALTER COLUMN qitem_expln TYPE VARCHAR(4000),
    RENAME COLUMN qestn_ty_code TO qitem_type_cd,
    ALTER COLUMN qitem_type_cd TYPE VARCHAR(12),
    RENAME COLUMN qustnr_id TO srvy_id,
    RENAME COLUMN qustnr_qesitm_id TO srvy_qitem_id,
    RENAME COLUMN qustnr_tmplat_id TO srvy_tmplt_id,
    RENAME COLUMN qitem_sn TO qitem_seq,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_survey_qitem IS '설문 질문 정보';
COMMENT ON COLUMN tb_survey_qitem.srvy_qitem_id IS '설문질문아이디';
COMMENT ON COLUMN tb_survey_qitem.srvy_id IS '설문아이디';
COMMENT ON COLUMN tb_survey_qitem.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_survey_qitem.qitem_seq IS '질문순번';
COMMENT ON COLUMN tb_survey_qitem.qitem_expln IS '질문내용';
COMMENT ON COLUMN tb_survey_qitem.qitem_type_cd IS '질문유형코드';
COMMENT ON COLUMN tb_survey_qitem.max_chc_cnt IS '최대선택수';
COMMENT ON COLUMN tb_survey_qitem.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_survey_qitem.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_survey_qitem.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_survey_qitem.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_survey_respondent
ALTER TABLE tb_survey_respondent 
    RENAME COLUMN qustnr_tmplat_id TO srvy_tmplt_id,
    RENAME COLUMN qestnr_id TO srvy_id,
    RENAME COLUMN qustnr_respond_id TO srvy_rspnd_id,
    RENAME COLUMN sexdstn_code TO gender_cd,
    ALTER COLUMN gender_cd TYPE VARCHAR(12),
    RENAME COLUMN occp_ty_code TO job_type_cd,
    ALTER COLUMN job_type_cd TYPE VARCHAR(12),
    RENAME COLUMN respond_nm TO rspnd_nm,
    RENAME COLUMN brdt TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN rgn_telno TO area_no,
    RENAME COLUMN mid_telno TO middle_telno,
    RENAME COLUMN end_telno TO end_telno,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_survey_respondent IS '설문 응답자 정보';
COMMENT ON COLUMN tb_survey_respondent.srvy_rspnd_id IS '설문응답아이디';
COMMENT ON COLUMN tb_survey_respondent.srvy_id IS '설문아이디';
COMMENT ON COLUMN tb_survey_respondent.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_survey_respondent.rspnd_nm IS '응답자명';
COMMENT ON COLUMN tb_survey_respondent.gender_cd IS '성별코드';
COMMENT ON COLUMN tb_survey_respondent.job_type_cd IS '직업유형코드';
COMMENT ON COLUMN tb_survey_respondent.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_survey_respondent.area_no IS '지역번호';
COMMENT ON COLUMN tb_survey_respondent.middle_telno IS '중간전화번호';
COMMENT ON COLUMN tb_survey_respondent.end_telno IS '끝전화번호';
COMMENT ON COLUMN tb_survey_respondent.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_survey_respondent.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_survey_respondent.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_survey_respondent.last_mdfr_id IS '최종수정자아이디';

-- 5. tb_survey_result
ALTER TABLE tb_survey_result 
    RENAME COLUMN qestnr_id TO srvy_id,
    RENAME COLUMN qustnr_iem_id TO srvy_itm_id,
    RENAME COLUMN qustnr_qesitm_id TO srvy_qitem_id,
    RENAME COLUMN qustnr_rspns_id TO srvy_rspnd_id,
    RENAME COLUMN qustnr_tmplat_id TO srvy_tmplt_id,
    RENAME COLUMN respond_nm TO rspnd_nm,
    RENAME COLUMN etc_ans_cn TO etc_ans_expln,
    ALTER COLUMN etc_ans_expln TYPE VARCHAR(4000),
    RENAME COLUMN rspdnt_ans_cn TO rspnd_ans_expln,
    ALTER COLUMN rspnd_ans_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_survey_result IS '설문 결과 정보';
COMMENT ON COLUMN tb_survey_result.srvy_rspnd_id IS '설문응답아이디';
COMMENT ON COLUMN tb_survey_result.srvy_qitem_id IS '설문질문아이디';
COMMENT ON COLUMN tb_survey_result.srvy_id IS '설문아이디';
COMMENT ON COLUMN tb_survey_result.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_survey_result.srvy_itm_id IS '설문항목아이디';
COMMENT ON COLUMN tb_survey_result.rspnd_nm IS '응답자명';
COMMENT ON COLUMN tb_survey_result.etc_ans_expln IS '기타답변내용';
COMMENT ON COLUMN tb_survey_result.rspnd_ans_expln IS '응답자답변내용';
COMMENT ON COLUMN tb_survey_result.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_survey_result.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_survey_result.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_survey_result.last_mdfr_id IS '최종수정자아이디';

-- 6. tb_survey_tmplt
ALTER TABLE tb_survey_tmplt 
    RENAME COLUMN qustnr_tmplat_id TO srvy_tmplt_id,
    RENAME COLUMN srvy_tmplt_type TO srvy_tmplt_type_cd,
    ALTER COLUMN srvy_tmplt_type_cd TYPE VARCHAR(12),
    RENAME COLUMN qustnr_tmplat_dc TO srvy_tmplt_expln,
    ALTER COLUMN srvy_tmplt_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_tmplat_path_nm TO srvy_tmplt_path,
    RENAME COLUMN srvy_tmplt_img_info TO srvy_tmplt_img_nm,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_survey_tmplt IS '설문 템플릿 정보';
COMMENT ON COLUMN tb_survey_tmplt.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_survey_tmplt.srvy_tmplt_type_cd IS '설문템플릿유형코드';
COMMENT ON COLUMN tb_survey_tmplt.srvy_tmplt_expln IS '설문템플릿설명';
COMMENT ON COLUMN tb_survey_tmplt.srvy_tmplt_path IS '설문템플릿경로';
COMMENT ON COLUMN tb_survey_tmplt.srvy_tmplt_img_nm IS '설문템플릿이미지명';
COMMENT ON COLUMN tb_survey_tmplt.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_survey_tmplt.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_survey_tmplt.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_survey_tmplt.last_mdfr_id IS '최종수정자아이디';

COMMIT;
