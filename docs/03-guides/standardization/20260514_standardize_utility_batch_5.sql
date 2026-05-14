/*
 * DB Standardization Migration Script (Utility Domain Batch 5)
 * Targets: tb_faq_info, tb_cnslt_list, tb_cnslt_manage, tb_stsfdg_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_faq_info
ALTER TABLE tb_faq_info 
    RENAME COLUMN qestn_sj TO qestn_ttl,
    ALTER COLUMN qestn_ttl TYPE VARCHAR(300),
    RENAME COLUMN qestn_cn TO qestn_expln,
    ALTER COLUMN qestn_expln TYPE VARCHAR(4000),
    RENAME COLUMN answer_cn TO ans_expln,
    ALTER COLUMN ans_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_faq_info IS 'FAQ 정보';

-- 2. tb_cnslt_list
ALTER TABLE tb_cnslt_list 
    RENAME COLUMN cnslt_sj TO cnslt_ttl,
    ALTER COLUMN cnslt_ttl TYPE VARCHAR(300),
    RENAME COLUMN cnslt_cn TO cnslt_expln,
    ALTER COLUMN cnslt_expln TYPE VARCHAR(4000),
    ALTER COLUMN wrter_nm TYPE VARCHAR(300),
    RENAME COLUMN writng_de TO wrt_ymd,
    ALTER COLUMN wrt_ymd TYPE CHAR(8),
    RENAME COLUMN writng_password TO wrt_pswd,
    RENAME COLUMN area_no TO area_telno,
    RENAME COLUMN middle_telno TO mtlno,
    RENAME COLUMN frst_mbtlnum TO mbl_area_telno,
    RENAME COLUMN middle_mbtlnum TO mbl_mtlno,
    RENAME COLUMN end_mbtlnum TO mbl_end_telno,
    RENAME COLUMN email_adres TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN email_answer_yn TO email_ans_yn,
    RENAME COLUMN qna_process_sttus_code TO qna_prcs_sttus_cd,
    ALTER COLUMN qna_prcs_sttus_cd TYPE VARCHAR(12),
    RENAME COLUMN proc_cn TO prcs_expln,
    ALTER COLUMN prcs_expln TYPE VARCHAR(4000),
    RENAME COLUMN managt_de TO prcs_ymd,
    ALTER COLUMN prcs_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_cnslt_list IS '상담 목록';

-- 3. tb_cnslt_manage
ALTER TABLE tb_cnslt_manage 
    RENAME COLUMN cnslt_sj TO cnslt_ttl,
    ALTER COLUMN cnslt_ttl TYPE VARCHAR(300),
    RENAME COLUMN cnslt_cn TO cnslt_expln,
    ALTER COLUMN cnslt_expln TYPE VARCHAR(4000),
    RENAME COLUMN wrter_id TO user_id,
    ALTER COLUMN wrter_nm TYPE VARCHAR(300),
    RENAME COLUMN writng_de TO wrt_ymd,
    ALTER COLUMN wrt_ymd TYPE CHAR(8),
    RENAME COLUMN qna_process_sttus_code TO qna_prcs_sttus_cd,
    ALTER COLUMN qna_prcs_sttus_cd TYPE VARCHAR(12),
    RENAME COLUMN proc_cn TO prcs_expln,
    ALTER COLUMN prcs_expln TYPE VARCHAR(4000),
    RENAME COLUMN managt_de TO prcs_ymd,
    ALTER COLUMN prcs_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_cnslt_manage IS '상담 관리';

-- 4. tb_stsfdg_info
ALTER TABLE tb_stsfdg_info 
    RENAME COLUMN wrter_id TO user_id,
    ALTER COLUMN wrter_nm TYPE VARCHAR(300),
    RENAME COLUMN password TO pswd,
    RENAME COLUMN stsfdg_cn TO stsfdg_expln,
    ALTER COLUMN stsfdg_expln TYPE VARCHAR(4000),
    RENAME COLUMN dgstfn_scr TO stsfdg_score,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_stsfdg_info IS '만족도 정보';

COMMIT;
