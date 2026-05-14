/*
 * DB Standardization Migration Script (Index Naming Master v5 Platinum+ - COMPREHENSIVE)
 * Date: 2026-05-15
 * Rule: PK -> pk_*, IX -> ix_*, UK -> uk_* + Use Standard Column Abbreviations (YMD, NM, TTL, INTRO)
 */

BEGIN;

-- 1. [User Management & Log Domain]
ALTER INDEX tb_user_info_pkey RENAME TO pk_tb_user_info;
ALTER INDEX idx_tb_user_info_user_id RENAME TO ix_tb_user_info_user_id;
ALTER INDEX idx_tb_user_info_user_nm RENAME TO ix_tb_user_info_user_nm;
ALTER INDEX idx_tb_user_info_sbscrb_de RENAME TO ix_tb_user_info_join_ymd;
ALTER INDEX idx_tb_user_info_chg_dtls_change_de RENAME TO ix_tb_user_info_chg_dtls_chg_ymd;
ALTER INDEX idx_tb_sys_log_requst_id RENAME TO ix_tb_sys_log_dmnd_id;

-- 2. [BBS & Survey Domain]
ALTER INDEX tb_bbs_item_pkey RENAME TO pk_tb_bbs_item;
ALTER INDEX idx_tb_bbs_item_ntt_sj RENAME TO ix_tb_bbs_item_pst_ttl;
ALTER INDEX idx_tb_survey_respondent_qestnr_id RENAME TO ix_tb_survey_respondent_srvy_id;
ALTER INDEX nqustnrrespondinfo_pk RENAME TO pk_tb_survey_respondent;
ALTER INDEX idx_tb_survey_qitem_qustnr_qesitm_id RENAME TO ix_tb_survey_qitem_srvy_qitem_id;

-- 3. [Auth & Role Domain]
ALTER INDEX idx_tb_author_info_author_code RENAME TO ix_tb_author_info_authrt_cd;
ALTER INDEX idx_tb_role_info_role_code RENAME TO ix_tb_role_info_role_cd;
ALTER INDEX idx_tb_menu_creat_dtls_author_code RENAME TO ix_tb_menu_creat_dtls_authrt_cd;

-- 4. [Utility & Schedule Domain]
ALTER INDEX idx_tb_leader_schdl_de_schdul_de RENAME TO ix_tb_leader_schdl_de_schdul_ymd;
ALTER INDEX nleaderschdulde_pk RENAME TO pk_tb_leader_schdl_de;
ALTER INDEX idx_tb_leader_sttus_leader_id RENAME TO ix_tb_leader_stts_leader_id;
ALTER INDEX idx_tb_note_trsm_note_trnsmit_id RENAME TO ix_tb_note_trsm_note_dsptch_id;
ALTER INDEX tb_inst_code_pkey RENAME TO pk_tb_inst_code;

-- 5. [Code & Administrative Domain]
ALTER INDEX idx_tb_com_clsf_cd_cl_code RENAME TO ix_tb_com_clsf_cd_clsf_cd;
ALTER INDEX idx_tb_admin_district_code_admdst_cd RENAME TO ix_tb_admin_district_code_admdst_cd;
ALTER INDEX cadministcoderecptnlog_pk RENAME TO pk_tb_admdst_cd_rcptn_log;

COMMIT;
