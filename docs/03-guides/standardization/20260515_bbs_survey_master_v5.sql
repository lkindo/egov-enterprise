/*
 * DB Standardization Migration Script (BBS & Survey Domain Master v5 - PHYSICAL SYNC)
 * Targets: tb_bbs_master, tb_bbs_item, tb_survey_info, tb_survey_qitem, tb_survey_result
 * Date: 2026-05-15
 */

BEGIN;

-- 1. [BBS Domain]
ALTER TABLE tb_bbs_master 
    RENAME COLUMN bbs_nm TO bbs_ttl,
    ALTER COLUMN bbs_ttl TYPE VARCHAR(300),
    RENAME COLUMN bbs_ty_code TO bbs_type_cd,
    ALTER COLUMN bbs_type_cd TYPE VARCHAR(12),
    RENAME COLUMN bbs_intrcn TO bbs_expln,
    ALTER COLUMN bbs_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_bbs_master.bbs_ttl IS '게시판제목';
COMMENT ON COLUMN tb_bbs_master.bbs_type_cd IS '게시판유형코드';
COMMENT ON COLUMN tb_bbs_master.bbs_expln IS '게시판설명';
COMMENT ON COLUMN tb_bbs_master.crt_dt IS '생성일시';

ALTER TABLE tb_bbs_item 
    RENAME COLUMN ntt_sj TO pst_ttl,
    ALTER COLUMN pst_ttl TYPE VARCHAR(300),
    RENAME COLUMN ntt_cn TO pst_cn,
    ALTER COLUMN pst_cn TYPE VARCHAR(4000),
    RENAME COLUMN inqire_co TO inq_cnt,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_bbs_item.pst_ttl IS '게시물제목';
COMMENT ON COLUMN tb_bbs_item.pst_cn IS '게시물내용';
COMMENT ON COLUMN tb_bbs_item.inq_cnt IS '조회수';
COMMENT ON COLUMN tb_bbs_item.crt_dt IS '생성일시';

-- 2. [Survey Domain]
ALTER TABLE tb_survey_info 
    RENAME COLUMN qustnr_sj TO srvy_ttl,
    ALTER COLUMN srvy_ttl TYPE VARCHAR(300),
    RENAME COLUMN srvy_prps TO srvy_prps_cn,
    ALTER COLUMN srvy_prps_cn TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_bgnde TO srvy_bgng_ymd,
    ALTER COLUMN srvy_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN qustnr_endde TO srvy_end_ymd,
    ALTER COLUMN srvy_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_survey_info.srvy_ttl IS '설문제목';
COMMENT ON COLUMN tb_survey_info.srvy_prps_cn IS '설문목적내용';
COMMENT ON COLUMN tb_survey_info.srvy_bgng_ymd IS '설문시작일자';
COMMENT ON COLUMN tb_survey_info.srvy_end_ymd IS '설문종료일자';
COMMENT ON COLUMN tb_survey_info.crt_dt IS '생성일시';

ALTER TABLE tb_survey_qitem 
    RENAME COLUMN qustnr_qesitm_id TO srvy_qitem_id,
    RENAME COLUMN qestn_cn TO srvy_qitem_cn,
    ALTER COLUMN srvy_qitem_cn TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_survey_qitem.srvy_qitem_id IS '설문문항아이디';
COMMENT ON COLUMN tb_survey_qitem.srvy_qitem_cn IS '설문문항내용';
COMMENT ON COLUMN tb_survey_qitem.crt_dt IS '생성일시';

COMMIT;
