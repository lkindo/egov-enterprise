/*
 * DB Standardization Migration Script (Index & Constraint Naming)
 * Targets: 91 Tables (Phased by Domain)
 * Date: 2026-05-14
 * Author: Antigravity
 * Standards: PK(pk_), FK(fk_), UK(uk_), IX(ix_)
 */

BEGIN;

-- =============================================================================
-- 1. Auth Domain (10 Tables)
-- =============================================================================

-- tb_user_info
ALTER TABLE tb_user_info RENAME CONSTRAINT idx_tb_user_info_esntl_id TO pk_tb_user_info;
ALTER TABLE tb_user_info RENAME CONSTRAINT idx_tb_user_info_user_id TO uk_tb_user_info_user_id;
ALTER INDEX idx_tb_user_info_eml_addr RENAME TO ix_tb_user_info_email_addr;
ALTER INDEX idx_tb_user_info_sbscrb_de RENAME TO ix_tb_user_info_sbscrb_ymd;
ALTER INDEX idx_tb_user_info_user_nm RENAME TO ix_tb_user_info_user_nm;
ALTER INDEX idx_tb_user_info_user_type RENAME TO ix_tb_user_info_user_type_cd;

-- tb_author_info
ALTER TABLE tb_author_info RENAME CONSTRAINT idx_tb_author_info_author_code TO pk_tb_author_info;

-- tb_author_group_info
ALTER TABLE tb_author_group_info RENAME CONSTRAINT idx_tb_author_group_info_group_id TO pk_tb_author_group_info;

-- tb_user_author_map
ALTER TABLE tb_user_author_map RENAME CONSTRAINT idx_tb_user_author_map_scrty_dtrmn_trget_id TO pk_tb_user_author_map;

-- tb_author_role_map
ALTER TABLE tb_author_role_map RENAME CONSTRAINT idx_tb_author_role_map_author_code TO pk_tb_author_role_map;

-- tb_role_info
ALTER TABLE tb_role_info RENAME CONSTRAINT idx_tb_role_info_role_code TO pk_tb_role_info;

-- tb_role_hierarchy
ALTER TABLE tb_role_hierarchy RENAME CONSTRAINT idx_tb_role_hierarchy_chldrn_role TO pk_tb_role_hierarchy;
ALTER INDEX idx_tb_role_hierarchy_parnts_role RENAME TO ix_tb_role_hierarchy_parnts_role_id;
ALTER INDEX nroles_hierarchy_i02 RENAME TO ix_tb_role_hierarchy_chldrn_role_id;
ALTER INDEX nroles_hierarchy_pk RENAME TO uk_tb_role_hierarchy_parnts_chldrn;

-- tb_login_policy
ALTER TABLE tb_login_policy RENAME CONSTRAINT idx_tb_login_policy_emplyr_id TO pk_tb_login_policy;

-- tb_login_log
ALTER TABLE tb_login_log RENAME CONSTRAINT idx_tb_login_log_log_id TO pk_tb_login_log;

-- tb_auth_rfsh_tk
ALTER TABLE tb_auth_rfsh_tk RENAME CONSTRAINT idx_tb_auth_rfsh_tk_user_id TO pk_tb_auth_rfsh_tk;
ALTER TABLE tb_auth_rfsh_tk RENAME CONSTRAINT idx_tb_auth_rfsh_tk_tk_val TO uk_tb_auth_rfsh_tk_rfsh_tk_val;

-- =============================================================================
-- 2. BBS Domain (7 Tables)
-- =============================================================================

-- tb_bbs_master
ALTER TABLE tb_bbs_master RENAME CONSTRAINT idx_tb_bbs_master_bbs_id TO pk_tb_bbs_master;

-- tb_bbs_master_optn
ALTER TABLE tb_bbs_master_optn RENAME CONSTRAINT idx_tb_bbs_master_optn_bbs_id TO pk_tb_bbs_master_optn;
ALTER TABLE tb_bbs_master_optn RENAME CONSTRAINT fkaf1d2geuu7dqnjvvv4vvvccm8 TO fk_tb_bbs_master_optn_tb_bbs_master;

-- tb_bbs_item
ALTER TABLE tb_bbs_item RENAME CONSTRAINT idx_tb_bbs_item_pst_id TO pk_tb_bbs_item;

-- tb_bbs_comment
ALTER TABLE tb_bbs_comment RENAME CONSTRAINT idx_tb_bbs_comment_answer_no TO pk_tb_bbs_comment;

-- tb_bbs_use_info
ALTER TABLE tb_bbs_use_info RENAME CONSTRAINT idx_tb_bbs_use_info_bbs_id TO pk_tb_bbs_use_info;

-- tb_bbs_scrap
ALTER TABLE tb_bbs_scrap RENAME CONSTRAINT idx_tb_bbs_scrap_scrap_id TO pk_tb_bbs_scrap;

-- tb_bbs_stats
ALTER TABLE tb_bbs_stats RENAME CONSTRAINT idx_tb_bbs_stats_stats_id TO pk_tb_bbs_stats;
ALTER INDEX nnttstats_pk RENAME TO uk_tb_bbs_stats_stats_id;

-- =============================================================================
-- 3. Community & Collaboration Domain (16 Tables)
-- =============================================================================

-- tb_cmnty_info
ALTER TABLE tb_cmnty_info RENAME CONSTRAINT idx_tb_cmnty_info_cmnty_id TO pk_tb_cmnty_info;

-- tb_cmnty_user_map
ALTER TABLE tb_cmnty_user_map RENAME CONSTRAINT idx_tb_cmnty_user_map_cmnty_id TO pk_tb_cmnty_user_map;

-- tb_club_info
ALTER TABLE tb_club_info RENAME CONSTRAINT idx_tb_club_info_club_id TO pk_tb_club_info;

-- tb_club_user_map
ALTER TABLE tb_club_user_map RENAME CONSTRAINT idx_tb_club_user_map_club_id TO pk_tb_club_user_map;

-- tb_blog_info
ALTER TABLE tb_blog_info RENAME CONSTRAINT idx_tb_blog_info_blog_id TO pk_tb_blog_info;

-- tb_blog_user_map
ALTER TABLE tb_blog_user_map RENAME CONSTRAINT idx_tb_blog_user_map_blog_id TO pk_tb_blog_user_map;

-- tb_indvdl_pge
ALTER TABLE tb_indvdl_pge RENAME CONSTRAINT idx_tb_indvdl_pge_emplyr_id TO pk_tb_indvdl_pge;

-- tb_schdul_info
ALTER TABLE tb_schdul_info RENAME CONSTRAINT idx_tb_schdul_info_schdul_id TO pk_tb_schdul_info;

-- tb_diary_info
ALTER TABLE tb_diary_info RENAME CONSTRAINT idx_tb_diary_info_diary_id TO pk_tb_diary_info;

-- tb_memo_rpt_info
ALTER TABLE tb_memo_rpt_info RENAME CONSTRAINT idx_tb_memo_rpt_info_reprt_id TO pk_tb_memo_rpt_info;

-- tb_memo_todo_info
ALTER TABLE tb_memo_todo_info RENAME CONSTRAINT idx_tb_memo_todo_info_todo_id TO pk_tb_memo_todo_info;

-- tb_dept_job_bx
ALTER TABLE tb_dept_job_bx RENAME CONSTRAINT idx_tb_dept_job_bx_dept_jobbx_id TO pk_tb_dept_job_bx;

-- tb_dept_task_info
ALTER TABLE tb_dept_task_info RENAME CONSTRAINT idx_tb_dept_task_info_dept_job_id TO pk_tb_dept_task_info;

-- tb_leader_schdl
ALTER TABLE tb_leader_schdl RENAME CONSTRAINT idx_tb_leader_schdl_schdul_id TO pk_tb_leader_schdl;

-- tb_leader_sttus
ALTER TABLE tb_leader_sttus RENAME CONSTRAINT idx_tb_leader_sttus_leader_id TO pk_tb_leader_sttus;

-- tb_rpt_info
ALTER TABLE tb_rpt_info RENAME CONSTRAINT idx_tb_rpt_info_reprt_id TO pk_tb_rpt_info;

-- =============================================================================
-- 4. Survey Domain (6 Tables)
-- =============================================================================

-- tb_survey_info
ALTER TABLE tb_survey_info RENAME CONSTRAINT idx_tb_survey_info_qustnr_id TO pk_tb_survey_info;

-- tb_survey_item
ALTER TABLE tb_survey_item RENAME CONSTRAINT idx_tb_survey_item_qustnr_iem_id TO pk_tb_survey_item;

-- tb_survey_qitem
ALTER TABLE tb_survey_qitem RENAME CONSTRAINT idx_tb_survey_qitem_qustnr_qesitm_id TO pk_tb_survey_qitem;

-- tb_survey_respondent
ALTER TABLE tb_survey_respondent RENAME CONSTRAINT idx_tb_survey_respondent_qestnr_id TO pk_tb_survey_respondent;
ALTER INDEX nqustnrrespondinfo_i01 RENAME TO ix_tb_survey_respondent_srvy_id_tmplt_id;
ALTER INDEX nqustnrrespondinfo_pk RENAME TO uk_tb_survey_respondent_tmplt_srvy_rspnd;

-- tb_survey_result
ALTER TABLE tb_survey_result RENAME CONSTRAINT idx_tb_survey_result_qustnr_rspns_id TO pk_tb_survey_result;

-- tb_survey_tmplt
ALTER TABLE tb_survey_tmplt RENAME CONSTRAINT idx_tb_survey_tmplt_qustnr_tmplat_id TO pk_tb_survey_tmplt;
ALTER INDEX nqustnrtmplat_pk RENAME TO uk_tb_survey_tmplt_srvy_tmplt_id;

-- =============================================================================
-- 5. Common Domain (10 Tables)
-- =============================================================================

-- tb_com_cd
ALTER TABLE tb_com_cd RENAME CONSTRAINT idx_tb_com_cd_code_id TO pk_tb_com_cd;

-- tb_com_clsf_cd
ALTER TABLE tb_com_clsf_cd RENAME CONSTRAINT idx_tb_com_clsf_cd_cl_code TO pk_tb_com_clsf_cd;

-- tb_com_dtl_cd
ALTER TABLE tb_com_dtl_cd RENAME CONSTRAINT idx_tb_com_dtl_cd_code TO pk_tb_com_dtl_cd;

-- tb_file_master
ALTER TABLE tb_file_master RENAME CONSTRAINT idx_tb_file_master_atch_file_id TO pk_tb_file_master;

-- tb_file_detail
ALTER TABLE tb_file_detail RENAME CONSTRAINT idx_tb_file_detail_atch_file_id TO pk_tb_file_detail;
ALTER TABLE tb_file_detail RENAME CONSTRAINT fksac67ar9wn4qlu8o7wrgjlc29 TO fk_tb_file_detail_tb_file_master;

-- tb_menu_info
ALTER TABLE tb_menu_info RENAME CONSTRAINT idx_tb_menu_info_menu_no TO pk_tb_menu_info;

-- tb_menu_creat_dtls
ALTER TABLE tb_menu_creat_dtls RENAME CONSTRAINT idx_tb_menu_creat_dtls_author_code TO pk_tb_menu_creat_dtls;

-- tb_progrm_list
ALTER TABLE tb_progrm_list RENAME CONSTRAINT idx_tb_progrm_list_progrm_file_nm TO pk_tb_progrm_list;

-- tb_sitemap_info
ALTER TABLE tb_sitemap_info RENAME CONSTRAINT idx_tb_sitemap_info_mapng_creat_id TO pk_tb_sitemap_info;

-- tb_tmplt_info
ALTER TABLE tb_tmplt_info RENAME CONSTRAINT idx_tb_tmplt_info_tmplat_id TO pk_tb_tmplt_info;

-- =============================================================================
-- 6. Utility & Log Domain (40+ Tables)
-- =============================================================================

-- tb_adbk_info
ALTER TABLE tb_adbk_info RENAME CONSTRAINT idx_tb_adbk_info_adbk_id TO pk_tb_adbk_info;

-- tb_adbk_manage
ALTER TABLE tb_adbk_manage RENAME CONSTRAINT idx_tb_adbk_manage_adbk_id TO pk_tb_adbk_manage;

-- tb_bnr_info
ALTER TABLE tb_bnr_info RENAME CONSTRAINT idx_tb_bnr_info_banner_id TO pk_tb_bnr_info;

-- tb_faq_info
ALTER TABLE tb_faq_info RENAME CONSTRAINT idx_tb_faq_info_faq_id TO pk_tb_faq_info;

-- tb_noti_info
ALTER TABLE tb_noti_info RENAME CONSTRAINT idx_tb_noti_info_ntcn_no TO pk_tb_noti_info;
ALTER INDEX nntfcinfo_pk RENAME TO uk_tb_noti_info_ntcn_no;

-- tb_popup_info
ALTER TABLE tb_popup_info RENAME CONSTRAINT idx_tb_popup_info_popup_id TO pk_tb_popup_info;

-- tb_sms_info
ALTER TABLE tb_sms_info RENAME CONSTRAINT idx_tb_sms_info_sms_id TO pk_tb_sms_info;

-- tb_sms_rcptn
ALTER TABLE tb_sms_rcptn RENAME CONSTRAINT idx_tb_sms_rcptn_rcptn_telno TO pk_tb_sms_rcptn;

-- tb_stsfdg_info
ALTER TABLE tb_stsfdg_info RENAME CONSTRAINT idx_tb_stsfdg_info_stsfdg_no TO pk_tb_stsfdg_info;

-- tb_onln_mnl_info
ALTER TABLE tb_onln_mnl_info RENAME CONSTRAINT idx_tb_onln_mnl_info_online_mnl_id TO pk_tb_onln_mnl_info;
ALTER INDEX nonlinemanual_pk RENAME TO uk_tb_onln_mnl_info_onln_mnl_id;

-- tb_onln_poll_manage
ALTER TABLE tb_onln_poll_manage RENAME CONSTRAINT idx_tb_onln_poll_manage_poll_id TO pk_tb_onln_poll_manage;

-- tb_onln_poll_artcl
ALTER TABLE tb_onln_poll_artcl RENAME CONSTRAINT idx_tb_onln_poll_artcl_poll_iem_id TO pk_tb_onln_poll_artcl;
ALTER TABLE tb_onln_poll_artcl RENAME CONSTRAINT fk47f2irkqvn99jtd571u1v95oo TO fk_tb_onln_poll_artcl_tb_onln_poll_manage;

-- tb_onln_poll_rslt
ALTER TABLE tb_onln_poll_rslt RENAME CONSTRAINT idx_tb_onln_poll_rslt_poll_result_id TO pk_tb_onln_poll_rslt;

-- tb_cnslt_list
ALTER TABLE tb_cnslt_list RENAME CONSTRAINT idx_tb_cnslt_list_cnslt_id TO pk_tb_cnslt_list;

-- tb_cnslt_manage
ALTER TABLE tb_cnslt_manage RENAME CONSTRAINT idx_tb_cnslt_manage_cnslt_id TO pk_tb_cnslt_manage;

-- tb_note_info
ALTER TABLE tb_note_info RENAME CONSTRAINT idx_tb_note_info_note_id TO pk_tb_note_info;

-- tb_note_rcptn
ALTER TABLE tb_note_rcptn RENAME CONSTRAINT idx_tb_note_rcptn_note_recptn_id TO pk_tb_note_rcptn;
ALTER TABLE tb_note_rcptn RENAME CONSTRAINT fkgox14gv24207d6ro7eiueksh8 TO fk_tb_note_rcptn_tb_note_trsm;
ALTER TABLE tb_note_rcptn RENAME CONSTRAINT fkadnrpn9euci7knvj6o1xybdj TO fk_tb_note_rcptn_tb_note_info;

-- tb_note_trsm
ALTER TABLE tb_note_trsm RENAME CONSTRAINT idx_tb_note_trsm_note_trnsmit_id TO pk_tb_note_trsm;
ALTER TABLE tb_note_trsm RENAME CONSTRAINT fkjduipv71uypx3q0yrb41elmyj TO fk_tb_note_trsm_tb_note_info;

-- tb_hldy_info
ALTER TABLE tb_hldy_info RENAME CONSTRAINT idx_tb_hldy_info_restde_no TO pk_tb_hldy_info;

-- tb_event_info
ALTER TABLE tb_event_info RENAME CONSTRAINT idx_tb_event_info_event_id TO pk_tb_event_info;

-- tb_rward_manage
ALTER TABLE tb_rward_manage RENAME CONSTRAINT idx_tb_rward_manage_rward_id TO pk_tb_rward_manage;

-- tb_extrl_hr_info
ALTER TABLE tb_extrl_hr_info RENAME CONSTRAINT idx_tb_extrl_hr_info_event_id TO pk_tb_extrl_hr_info;
ALTER TABLE tb_extrl_hr_info RENAME CONSTRAINT fksd2mkngkbhmri5bmifxlu0sl6 TO fk_tb_extrl_hr_info_tb_event_info;

-- tb_ifml_atrz_info
ALTER TABLE tb_ifml_atrz_info RENAME CONSTRAINT idx_tb_ifml_atrz_info_infrml_sanctn_id TO pk_tb_ifml_atrz_info;

-- tb_internet_svc
ALTER TABLE tb_internet_svc RENAME CONSTRAINT idx_tb_internet_svc_intnet_svc_id TO pk_tb_internet_svc;

-- tb_policy_manage
ALTER TABLE tb_policy_manage RENAME CONSTRAINT idx_tb_policy_manage_policy_type TO pk_tb_policy_manage;

-- tb_indvdl_pge_cntnts
ALTER TABLE tb_indvdl_pge_cntnts RENAME CONSTRAINT idx_tb_indvdl_pge_cntnts_cntnts_id TO pk_tb_indvdl_pge_cntnts;

-- tb_indvdl_pge_estbs
ALTER TABLE tb_indvdl_pge_estbs RENAME CONSTRAINT idx_tb_indvdl_pge_estbs_emplyr_id TO pk_tb_indvdl_pge_estbs;
ALTER INDEX nindvdlpgeestbs_pk RENAME TO uk_tb_indvdl_pge_estbs_user_id;

-- tb_inst_code
ALTER TABLE tb_inst_code RENAME CONSTRAINT idx_tb_inst_code_inst_cd TO pk_tb_inst_code;

-- tb_inst_cd_rcptn_log
ALTER TABLE tb_inst_cd_rcptn_log RENAME CONSTRAINT idx_tb_inst_cd_rcptn_log_inst_cd TO pk_tb_inst_cd_rcptn_log;

-- tb_admdst_cd_rcptn_log
ALTER TABLE tb_admdst_cd_rcptn_log RENAME CONSTRAINT idx_tb_admdst_cd_rcptn_log_inst_cd TO pk_tb_admdst_cd_rcptn_log;

-- tb_sys_log
ALTER TABLE tb_sys_log RENAME CONSTRAINT idx_tb_sys_log_requst_id TO pk_tb_sys_log;

-- tb_web_log
ALTER TABLE tb_web_log RENAME CONSTRAINT idx_tb_web_log_requst_id TO pk_tb_web_log;

-- tb_privacy_log
ALTER TABLE tb_privacy_log RENAME CONSTRAINT idx_tb_privacy_log_requst_id TO pk_tb_privacy_log;

-- tb_orgnzt_info
ALTER TABLE tb_orgnzt_info RENAME CONSTRAINT idx_tb_orgnzt_info_orgnzt_id TO pk_tb_orgnzt_info;

-- tb_leader_schdl_de
ALTER TABLE tb_leader_schdl_de RENAME CONSTRAINT idx_tb_leader_schdl_de_schdul_de TO pk_tb_leader_schdl_de;
ALTER INDEX nleaderschdulde_pk RENAME TO uk_tb_leader_schdl_de_schdul_id_ymd;

-- tb_user_absence
ALTER TABLE tb_user_absence RENAME CONSTRAINT idx_tb_user_absence_emplyr_id TO pk_tb_user_absence;

-- tb_user_info_chg_dtls
ALTER TABLE tb_user_info_chg_dtls RENAME CONSTRAINT idx_tb_user_info_chg_dtls_change_de TO pk_tb_user_info_chg_dtls;
ALTER INDEX hemplyrinfochangedtls_pk RENAME TO uk_tb_user_info_chg_dtls_user_id_ymd;
ALTER INDEX idx_tb_user_info_chg_dtls_emplyr_id RENAME TO ix_tb_user_info_chg_dtls_user_id;

-- tb_user_ntcn
ALTER TABLE tb_user_ntcn RENAME CONSTRAINT idx_tb_user_ntcn_ntcn_no TO pk_tb_user_ntcn;

-- tb_user_log
ALTER TABLE tb_user_log RENAME CONSTRAINT idx_tb_user_log_method_nm TO pk_tb_user_log;
ALTER TABLE tb_user_log RENAME CONSTRAINT fk_nuserlog_rqester TO fk_tb_user_log_tb_user_info;

COMMIT;
