/*
 * DB Standardization Migration Script (BBS & Survey Domain Master v4)
 * Targets: tb_bbs_master, tb_bbs, tb_survey_batch, tb_survey_qitem, tb_survey_ans
 * Date: 2026-05-14
 */

BEGIN;

-- 1. [BBS Domain]
ALTER TABLE tb_bbs_master 
    RENAME COLUMN bbs_nm TO bbs_ttl,
    RENAME COLUMN bbs_ty_code TO bbs_type_cd;

ALTER TABLE tb_bbs 
    RENAME COLUMN ntt_sj TO pst_ttl,
    RENAME COLUMN inqire_co TO inq_cnt;

-- 2. [Survey Domain]
ALTER TABLE tb_survey_batch 
    RENAME COLUMN qustnr_sj TO srvy_ttl,
    RENAME COLUMN qustnr_purps TO srvy_prps_expln,
    ALTER COLUMN srvy_prps_expln TYPE VARCHAR(4000),
    RENAME COLUMN qustnr_bgnde TO srvy_bgng_ymd,
    ALTER COLUMN srvy_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN qustnr_endde TO srvy_end_ymd,
    ALTER COLUMN srvy_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

ALTER TABLE tb_survey_qitem 
    RENAME COLUMN qustnr_qesitm_id TO srvy_qitem_id,
    RENAME COLUMN qestn_cn TO srvy_qitem_cn,
    ALTER COLUMN srvy_qitem_cn TYPE VARCHAR(4000),
    RENAME COLUMN mxmm_choise_co TO max_sel_cnt;

COMMIT;
