/*
 * DB Standardization Migration Script (Index Naming Master v5 - PHYSICAL SYNC)
 * Date: 2026-05-15
 * Rule: PK -> pk_*, IX -> ix_*, UK -> uk_* + Use Standard Column Abbreviations
 */

BEGIN;

-- 1. [User Management Domain]
ALTER INDEX tb_user_info_pkey RENAME TO pk_tb_user_info;
ALTER INDEX idx_tb_user_info_user_id RENAME TO ix_tb_user_info_user_id;
ALTER INDEX idx_tb_user_info_user_nm RENAME TO ix_tb_user_info_user_nm;
ALTER INDEX idx_tb_user_info_sbscrb_de RENAME TO ix_tb_user_info_join_ymd; -- sbscrb_de -> join_ymd 반영
ALTER INDEX idx_tb_user_info_eml_addr RENAME TO ix_tb_user_info_eml_addr;

-- 2. [BBS & Survey Domain]
ALTER INDEX tb_bbs_master_pkey RENAME TO pk_tb_bbs_master;
ALTER INDEX idx_tb_bbs_master_bbs_id RENAME TO ix_tb_bbs_master_bbs_id;
ALTER INDEX tb_bbs_item_pkey RENAME TO pk_tb_bbs_item;
ALTER INDEX idx_tb_bbs_item_ntt_sj RENAME TO ix_tb_bbs_item_pst_ttl; -- ntt_sj -> pst_ttl 반영

ALTER INDEX tb_survey_info_pkey RENAME TO pk_tb_survey_info;
ALTER INDEX idx_tb_survey_info_qustnr_sj RENAME TO ix_tb_survey_info_srvy_ttl; -- qustnr_sj -> srvy_ttl 반영
ALTER INDEX nqustnrtmplat_pk RENAME TO pk_tb_survey_tmplt;

-- 3. [Community & Blog Domain]
ALTER INDEX tb_cmnty_info_pkey RENAME TO pk_tb_cmnty_info;
ALTER INDEX tb_club_info_pkey RENAME TO pk_tb_club_info;
ALTER INDEX tb_blog_info_pkey RENAME TO pk_tb_blog_info;
ALTER INDEX idx_tb_blog_info_blog_nm RENAME TO ix_tb_blog_info_blog_ttl; -- blog_nm -> blog_ttl 반영

-- 4. [Utility & System Domain]
ALTER INDEX tb_sys_log_pkey RENAME TO pk_tb_sys_log;
ALTER INDEX idx_tb_sys_log_requst_id RENAME TO ix_tb_sys_log_dmnd_id; -- requst_id -> dmnd_id 반영
ALTER INDEX idx_tb_note_trsm_note_trnsmit_id RENAME TO ix_tb_note_trsm_note_dsptch_id; -- note_trnsmit_id -> note_dsptch_id 반영
ALTER INDEX tb_inst_code_pkey RENAME TO pk_tb_inst_code;

COMMIT;
