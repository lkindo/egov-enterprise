DROP VIEW IF EXISTS std_common_cl_code CASCADE;
CREATE OR REPLACE VIEW std_common_cl_code AS
SELECT CAST(cl_code AS VARCHAR(10)) AS clsf_cd,
    CAST(cl_code_nm AS VARCHAR(256)) AS clsf_cd_nm,
    CAST(cl_code_dc AS VARCHAR(1000)) AS clsf_cd_expln,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ccmmnclcode;

DROP VIEW IF EXISTS std_admin_district_code CASCADE;
CREATE OR REPLACE VIEW std_admin_district_code AS
SELECT CAST(administ_zone_code AS VARCHAR(10)) AS admdst_cd,
    CAST(administ_zone_nm AS VARCHAR(256)) AS admdst_nm,
    administ_zone_se AS admdst_se,
    CAST(upper_administ_zone_code AS VARCHAR(10)) AS up_admdst_cd,
    CAST(creat_de AS VARCHAR(10)) AS crt_ymd,
    CAST(abl_de AS VARCHAR(10)) AS abl_ymd,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM cadministcode;

DROP VIEW IF EXISTS std_common_code CASCADE;
CREATE OR REPLACE VIEW std_common_code AS
SELECT CAST(code_id AS VARCHAR(50)) AS com_cd_id,
    CAST(code_id_nm AS VARCHAR(256)) AS com_cd_nm,
    CAST(code_id_dc AS VARCHAR(1000)) AS com_cd_expln,
    CAST(cl_code AS VARCHAR(10)) AS clsf_cd,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ccmmncode;

DROP VIEW IF EXISTS std_common_detail_code CASCADE;
CREATE OR REPLACE VIEW std_common_detail_code AS
SELECT CAST(code_id AS VARCHAR(50)) AS com_cd_id,
    CAST(code AS VARCHAR(10)) AS com_dtl_cd,
    CAST(code_nm AS VARCHAR(256)) AS com_dtl_cd_nm,
    CAST(code_dc AS VARCHAR(1000)) AS com_dtl_cd_expln,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ccmmndetailcode;

DROP VIEW IF EXISTS std_file_detail CASCADE;
CREATE OR REPLACE VIEW std_file_detail AS
SELECT CAST(atch_file_id AS VARCHAR(50)) AS atch_file_mng_no,
    file_sn AS atch_file_sn,
    CAST(file_stre_cours AS VARCHAR(256)) AS atch_file_path_nm,
    CAST(stre_file_nm AS VARCHAR(256)) AS strg_file_nm,
    CAST(orignl_file_nm AS VARCHAR(256)) AS orgnl_file_nm,
    CAST(file_extsn AS VARCHAR(256)) AS extn_nm,
    file_size AS file_sz,
    CAST(file_cn AS VARCHAR(1000)) AS atch_file_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nfiledetail;

DROP VIEW IF EXISTS std_dept_task_info CASCADE;
CREATE OR REPLACE VIEW std_dept_task_info AS
SELECT CAST(dept_job_id AS VARCHAR(50)) AS dept_task_id,
    CAST(dept_job_nm AS VARCHAR(256)) AS dept_task_nm,
    CAST(dept_job_cn AS VARCHAR(1000)) AS dept_task_cn,
    CAST(dept_jobbx_id AS VARCHAR(50)) AS dept_task_box_id,
    CAST(charger_id AS VARCHAR(50)) AS pic_id,
    priort AS prord,
    CAST(atch_file_id AS VARCHAR(50)) AS atch_file_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ndeptjob;

DROP VIEW IF EXISTS std_file_master CASCADE;
CREATE OR REPLACE VIEW std_file_master AS
SELECT CAST(atch_file_id AS VARCHAR(50)) AS atch_file_mng_no,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nfile;

DROP VIEW IF EXISTS std_tmplt_info CASCADE;
CREATE OR REPLACE VIEW std_tmplt_info AS
SELECT CAST(tmplat_id AS VARCHAR(50)) AS tmplt_no,
    CAST(tmplat_nm AS VARCHAR(256)) AS tmplt_nm,
    CAST(tmplat_se_code AS VARCHAR(10)) AS tmplt_se_cd,
    CAST(tmplat_cours AS VARCHAR(256)) AS tmplt_path_nm,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ntmplatinfo;

DROP VIEW IF EXISTS std_leader_schdl CASCADE;
CREATE OR REPLACE VIEW std_leader_schdl AS
SELECT CAST(schdul_id AS VARCHAR(50)) AS schdl_mng_no,
    CAST(leader_id AS VARCHAR(50)) AS leader_id,
    CAST(schdul_nm AS VARCHAR(256)) AS schdl_nm,
    CAST(schdul_cn AS VARCHAR(1000)) AS schdl_cn,
    CAST(schdul_place AS VARCHAR(256)) AS plc_nm,
    CAST(schdul_bgnde AS VARCHAR(10)) AS schdl_bgng_ymd,
    CAST(schdul_endde AS VARCHAR(10)) AS schdl_end_ymd,
    CAST(schdul_charger_id AS VARCHAR(50)) AS schdl_pic_id,
    CAST(schdul_se AS VARCHAR(10)) AS schdl_se_cd,
    CAST(schdul_ipcr_code AS VARCHAR(10)) AS schdl_imprt_cd,
    CAST(reptit_se_code AS VARCHAR(10)) AS rept_se_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nleaderschdul;

DROP VIEW IF EXISTS std_leader_schdl_de CASCADE;
CREATE OR REPLACE VIEW std_leader_schdl_de AS
SELECT CAST(schdul_id AS VARCHAR(50)) AS schdl_mng_no,
    CAST(schdul_de AS VARCHAR(10)) AS schdl_ymd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nleaderschdulde;

DROP VIEW IF EXISTS std_inst_code CASCADE;
CREATE OR REPLACE VIEW std_inst_code AS
SELECT CAST(instt_code AS VARCHAR(10)) AS inst_cd,
    CAST(all_instt_nm AS VARCHAR(256)) AS all_inst_nm,
    CAST(lowest_instt_nm AS VARCHAR(256)) AS lwtrk_inst_nm,
    CAST(instt_abrv_nm AS VARCHAR(256)) AS inst_abbr_nm,
    CAST(reprsnt_instt_code AS VARCHAR(10)) AS rprs_inst_cd,
    CAST(upper_instt_code AS VARCHAR(10)) AS up_inst_cd,
    instt_ty_lclas AS inst_type_lclsf,
    instt_ty_mlsfc AS inst_type_mclsf,
    instt_ty_sclas AS inst_type_sclsf,
    instt_odr AS inst_seq,
    sort_ordr AS sort_seq,
    telno,
    fxnum AS fxno,
    CAST(abl_ennc AS VARCHAR(10)) AS abl_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ninsttcode;

DROP VIEW IF EXISTS std_adbk_info CASCADE;
CREATE OR REPLACE VIEW std_adbk_info AS
SELECT CAST(adbk_id AS VARCHAR(50)) AS adbk_id,
    nm,
    CAST(email_adres AS VARCHAR(50)) AS eml_addr,
    mbtlnum AS mbl_telno,
    fxnum AS fxno,
    house_telno AS home_telno,
    offm_telno AS ofc_telno,
    CAST(emplyr_id AS VARCHAR(50)) AS user_id,
    CAST(adbk_constnt_id AS VARCHAR(50)) AS adbk_mbr_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nadbk;

DROP VIEW IF EXISTS std_adbk_manage CASCADE;
CREATE OR REPLACE VIEW std_adbk_manage AS
SELECT CAST(adbk_id AS VARCHAR(50)) AS adbk_id,
    CAST(adbk_nm AS VARCHAR(256)) AS adbk_nm,
    othbc_scope AS rls_scp,
    CAST(trget_orgnzt_id AS VARCHAR(50)) AS trgt_ognz_id,
    CAST(wrter_id AS VARCHAR(50)) AS wrtr_id,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nadbkmanage;

DROP VIEW IF EXISTS std_survey_info CASCADE;
CREATE OR REPLACE VIEW std_survey_info AS
SELECT CAST(qustnr_id AS VARCHAR(50)) AS srvy_id,
    CAST(qustnr_sj AS VARCHAR(256)) AS srvy_ttl,
    qustnr_purps AS srvy_prps,
    qustnr_trget AS srvy_trgt,
    CAST(qustnr_writng_guidance_cn AS VARCHAR(1000)) AS srvy_wrt_gd_cn,
    CAST(qustnr_bgnde AS VARCHAR(10)) AS bgng_ymd,
    CAST(qustnr_endde AS VARCHAR(10)) AS end_ymd,
    CAST(qustnr_tmplat_id AS VARCHAR(50)) AS srvy_tmplt_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nqustnrinfo;

DROP VIEW IF EXISTS std_event_info CASCADE;
CREATE OR REPLACE VIEW std_event_info AS
SELECT CAST(event_id AS VARCHAR(50)) AS evnt_id,
    CAST(event_cn AS VARCHAR(1000)) AS evnt_cn,
    CAST(event_svc_bgnde AS VARCHAR(10)) AS evnt_bgng_ymd,
    CAST(event_svc_endde AS VARCHAR(10)) AS evnt_end_ymd,
    CAST(event_ty_code AS VARCHAR(10)) AS evnt_type_cd,
    CAST(event_confm_at AS VARCHAR(10)) AS aprv_yn,
    CAST(event_confm_de AS VARCHAR(10)) AS aprv_ymd,
    bsns_year AS biz_yr,
    CAST(bsns_code AS VARCHAR(10)) AS biz_cd,
    svc_use_nmpr_co AS evnt_srvc_use_prsnl_cnt,
    CAST(charger_nm AS VARCHAR(256)) AS pic_nm,
    prparetg_cn AS prep_mttr,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM neventinfo;

DROP VIEW IF EXISTS std_schdul_info CASCADE;
CREATE OR REPLACE VIEW std_schdul_info AS
SELECT CAST(schdul_id AS VARCHAR(50)) AS schdl_id,
    CAST(schdul_nm AS VARCHAR(256)) AS schdl_nm,
    CAST(schdul_cn AS VARCHAR(1000)) AS schdl_cn,
    CAST(schdul_se AS VARCHAR(10)) AS schdl_se_cd,
    CAST(schdul_knd_code AS VARCHAR(10)) AS schdl_knd_cd,
    CAST(schdul_bgnde AS VARCHAR(10)) AS bgng_ymd,
    CAST(schdul_endde AS VARCHAR(10)) AS end_ymd,
    CAST(schdul_ipcr_code AS VARCHAR(10)) AS schdl_imprt_cd,
    CAST(reptit_se_code AS VARCHAR(10)) AS rept_se_cd,
    CAST(schdul_dept_id AS VARCHAR(50)) AS dept_id,
    CAST(schdul_charger_id AS VARCHAR(50)) AS schdl_pic_id,
    CAST(schdul_place AS VARCHAR(256)) AS plc_nm,
    CAST(atch_file_id AS VARCHAR(50)) AS atch_file_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nschdulinfo;

DROP VIEW IF EXISTS std_survey_item CASCADE;
CREATE OR REPLACE VIEW std_survey_item AS
SELECT CAST(qustnr_iem_id AS VARCHAR(50)) AS artcl_id,
    CAST(qustnr_qesitm_id AS VARCHAR(50)) AS qitem_id,
    CAST(qustnr_id AS VARCHAR(50)) AS srvy_id,
    iem_sn AS artcl_sn,
    CAST(iem_cn AS VARCHAR(1000)) AS artcl_cn,
    CAST(etc_answer_at AS VARCHAR(10)) AS etc_ans_yn,
    CAST(qustnr_tmplat_id AS VARCHAR(50)) AS srvy_tmplt_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nqustnriem;

DROP VIEW IF EXISTS std_survey_qitem CASCADE;
CREATE OR REPLACE VIEW std_survey_qitem AS
SELECT CAST(qustnr_qesitm_id AS VARCHAR(50)) AS qitem_id,
    CAST(qustnr_id AS VARCHAR(50)) AS srvy_id,
    qestn_sn AS qitem_sn,
    CAST(qestn_cn AS VARCHAR(1000)) AS qitem_cn,
    CAST(qestn_ty_code AS VARCHAR(10)) AS qitem_type_cd,
    mxmm_choise_co AS max_chc_cnt,
    CAST(qustnr_tmplat_id AS VARCHAR(50)) AS srvy_tmplt_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nqustnrqesitm;

DROP VIEW IF EXISTS std_author_role_map CASCADE;
CREATE OR REPLACE VIEW std_author_role_map AS
SELECT CAST(author_code AS VARCHAR(10)) AS authrt_cd,
    CAST(role_code AS VARCHAR(10)) AS role_cd,
    CAST(creat_dt AS TIMESTAMP) AS creat_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nauthorrolerelate;

DROP VIEW IF EXISTS std_author_group_info CASCADE;
CREATE OR REPLACE VIEW std_author_group_info AS
SELECT CAST(group_id AS VARCHAR(50)) AS group_id,
    CAST(group_nm AS VARCHAR(256)) AS group_nm,
    CAST(group_dc AS VARCHAR(1000)) AS group_expln,
    CAST(group_creat_de AS VARCHAR(10)) AS group_creat_ymd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nauthorgroupinfo;

DROP VIEW IF EXISTS std_role_hierarchy CASCADE;
CREATE OR REPLACE VIEW std_role_hierarchy AS
SELECT CAST(parnts_role AS VARCHAR(10)) AS up_role_cd,
    CAST(chldrn_role AS VARCHAR(10)) AS sub_role_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nroles_hierarchy;

DROP VIEW IF EXISTS std_user_author_map CASCADE;
CREATE OR REPLACE VIEW std_user_author_map AS
SELECT CAST(scrty_dtrmn_trget_id AS VARCHAR(50)) AS user_id,
    CAST(author_code AS VARCHAR(10)) AS authrt_cd,
    CAST(mber_ty_code AS VARCHAR(10)) AS user_type_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nemplyrscrtyestbs;

DROP VIEW IF EXISTS std_bnr_info CASCADE;
CREATE OR REPLACE VIEW std_bnr_info AS
SELECT CAST(banner_id AS VARCHAR(50)) AS bnr_id,
    CAST(banner_nm AS VARCHAR(256)) AS bnr_nm,
    (banner_image)::character varying(256) AS bnr_img,
    (banner_image_file)::character varying(256) AS bnr_img_file,
    CAST(banner_dc AS VARCHAR(1000)) AS bnr_expln,
    CAST(link_url AS VARCHAR(50)) AS link_url,
    (sort_ordr)::numeric(10,0) AS sort_ordr,
    CAST(reflct_at AS VARCHAR(10)) AS rflt_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nbanner;

DROP VIEW IF EXISTS std_login_policy CASCADE;
CREATE OR REPLACE VIEW std_login_policy AS
SELECT CAST(emplyr_id AS VARCHAR(50)) AS user_id,
    CAST(ip_info AS VARCHAR(50)) AS ip_addr,
    strt_tm,
    end_tm,
    CAST(dplct_perm_at AS VARCHAR(10)) AS dplct_perm_yn,
    CAST(lmtt_at AS VARCHAR(10)) AS lmtt_yn,
    CAST(otp_enabled_at AS VARCHAR(10)) AS otp_use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nloginpolicy;

DROP VIEW IF EXISTS std_login_log CASCADE;
CREATE OR REPLACE VIEW std_login_log AS
SELECT CAST(log_id AS VARCHAR(50)) AS log_id,
    CAST(conect_id AS VARCHAR(50)) AS conn_user_id,
    CAST(conect_ip AS VARCHAR(50)) AS conn_ip_addr,
    CAST(conect_mthd AS VARCHAR(10)) AS conn_mthd_cd,
    CAST(error_occrrnc_at AS VARCHAR(10)) AS err_ocrn_yn,
    CAST(error_code AS VARCHAR(10)) AS err_cd,
    CAST(creat_dt AS TIMESTAMP) AS creat_dt,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nloginlog;

DROP VIEW IF EXISTS std_survey_tmplt CASCADE;
CREATE OR REPLACE VIEW std_survey_tmplt AS
SELECT CAST(qustnr_tmplat_id AS VARCHAR(50)) AS srvy_tmplt_id,
    qustnr_tmplat_ty AS srvy_tmplt_type,
    CAST(qustnr_tmplat_dc AS VARCHAR(1000)) AS srvy_tmplt_expln,
    CAST(qustnr_tmplat_path_nm AS VARCHAR(256)) AS srvy_tmplt_path_nm,
    qustnr_tmplat_image_info AS srvy_tmplt_img_info,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nqustnrtmplat;

DROP VIEW IF EXISTS std_survey_respondent CASCADE;
CREATE OR REPLACE VIEW std_survey_respondent AS
SELECT CAST(qustnr_respond_id AS VARCHAR(50)) AS srvy_rspdnt_id,
    CAST(respond_nm AS VARCHAR(256)) AS rspdnt_nm,
    CAST(sexdstn_code AS VARCHAR(10)) AS gndr_cd,
    brthdy AS brdt,
    CAST(occp_ty_code AS VARCHAR(10)) AS ocpt_type_cd,
    area_no AS rgn_telno,
    middle_telno AS mid_telno,
    end_telno,
    CAST(qustnr_tmplat_id AS VARCHAR(50)) AS srvy_tmplt_id,
    CAST(qestnr_id AS VARCHAR(50)) AS qitem_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nqustnrrespondinfo;

DROP VIEW IF EXISTS std_survey_result CASCADE;
CREATE OR REPLACE VIEW std_survey_result AS
SELECT CAST(qustnr_rspns_id AS VARCHAR(50)) AS srvy_ans_id,
    CAST(qustnr_qesitm_id AS VARCHAR(50)) AS qitem_id,
    CAST(qustnr_iem_id AS VARCHAR(50)) AS artcl_id,
    CAST(respond_nm AS VARCHAR(256)) AS rspdnt_nm,
    CAST(respond_answer_cn AS VARCHAR(1000)) AS rspdnt_ans_cn,
    CAST(etc_answer_cn AS VARCHAR(1000)) AS etc_ans_cn,
    CAST(qustnr_tmplat_id AS VARCHAR(50)) AS srvy_tmplt_id,
    CAST(qestnr_id AS VARCHAR(50)) AS srvy_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nqustnrrspnsresult;

DROP VIEW IF EXISTS std_popup_info CASCADE;
CREATE OR REPLACE VIEW std_popup_info AS
SELECT CAST(popup_id AS VARCHAR(50)) AS popup_id,
    CAST(popup_sj_nm AS VARCHAR(256)) AS popup_ttl_nm,
    CAST(file_url AS VARCHAR(50)) AS file_url,
    (popup_vrticl_size)::numeric(10,0) AS popup_vrtc_size,
    (popup_vrticl_lc)::numeric(10,0) AS popup_vrtc_pstn,
    (popup_width_size)::numeric(10,0) AS popup_wdth_size,
    (popup_width_lc)::numeric(10,0) AS popup_wdth_pstn,
    CAST(ntce_bgnde AS VARCHAR(10)) AS pstg_bgng_ymd,
    CAST(ntce_endde AS VARCHAR(10)) AS pstg_end_ymd,
    CAST(stopvew_setup_at AS VARCHAR(10)) AS stvw_set_yn,
    CAST(ntce_at AS VARCHAR(10)) AS pstg_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM npopupmanage;

DROP VIEW IF EXISTS std_club_info CASCADE;
CREATE OR REPLACE VIEW std_club_info AS
SELECT CAST(clb_id AS VARCHAR(50)) AS club_id,
    CAST(cmmnty_id AS VARCHAR(50)) AS cmnty_id,
    CAST(clb_nm AS VARCHAR(256)) AS club_nm,
    CAST(clb_intrcn AS VARCHAR(1000)) AS club_intro_cn,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nclub;

DROP VIEW IF EXISTS std_blog_info CASCADE;
CREATE OR REPLACE VIEW std_blog_info AS
SELECT CAST(blog_id AS VARCHAR(50)) AS blog_id,
    CAST(blog_nm AS VARCHAR(256)) AS blog_nm,
    CAST(blog_intrcn AS VARCHAR(1000)) AS blog_intro_cn,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nblog;

DROP VIEW IF EXISTS std_onln_mnl_info CASCADE;
CREATE OR REPLACE VIEW std_onln_mnl_info AS
SELECT CAST(online_mnl_id AS VARCHAR(50)) AS onln_mnl_id,
    CAST(online_mnl_nm AS VARCHAR(256)) AS onln_mnl_nm,
    CAST(online_mnl_se_code AS VARCHAR(10)) AS onln_mnl_se_cd,
    online_mnl_dfn AS onln_mnl_dfn,
    CAST(online_mnl_dc AS VARCHAR(1000)) AS onln_mnl_expln,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nonlinemanual;

DROP VIEW IF EXISTS std_author_info CASCADE;
CREATE OR REPLACE VIEW std_author_info AS
SELECT CAST(author_code AS VARCHAR(10)) AS authrt_cd,
    CAST(author_nm AS VARCHAR(256)) AS authrt_nm,
    CAST(author_dc AS VARCHAR(1000)) AS authrt_expln,
    CAST(author_creat_de AS VARCHAR(10)) AS authrt_creat_ymd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nauthorinfo;

DROP VIEW IF EXISTS std_main_image CASCADE;
CREATE OR REPLACE VIEW std_main_image AS
SELECT CAST(image_id AS VARCHAR(50)) AS main_img_id,
    CAST(image_nm AS VARCHAR(256)) AS main_img_nm,
    CAST(image AS VARCHAR(50)) AS main_img_file_path,
    CAST(image_file AS VARCHAR(256)) AS main_img_file_nm,
    CAST(image_dc AS VARCHAR(1000)) AS main_img_expln,
    CAST(reflct_at AS VARCHAR(10)) AS rflt_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nmainimage;

DROP VIEW IF EXISTS std_noti_info CASCADE;
CREATE OR REPLACE VIEW std_noti_info AS
SELECT CAST(ntcn_no AS VARCHAR(50)) AS noti_no,
    CAST(ntcn_sj AS VARCHAR(256)) AS noti_ttl,
    CAST(ntcn_cn AS VARCHAR(1000)) AS noti_cn,
    (ntcn_tm)::character varying(50) AS noti_time,
    (bh_ntcn_intrvl)::character varying(50) AS bfhd_noti_intvl,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nntfcinfo;

DROP VIEW IF EXISTS std_faq_info CASCADE;
CREATE OR REPLACE VIEW std_faq_info AS
SELECT CAST(faq_id AS VARCHAR(50)) AS faq_id,
    CAST(qestn_sj AS VARCHAR(256)) AS qstn_ttl,
    CAST(qestn_cn AS VARCHAR(1000)) AS qstn_cn,
    CAST(answer_cn AS VARCHAR(1000)) AS ans_cn,
    (rdcnt)::numeric(10,0) AS inq_cnt,
    CAST(atch_file_id AS VARCHAR(50)) AS atch_file_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nfaqinfo;

DROP VIEW IF EXISTS std_sitemap_info CASCADE;
CREATE OR REPLACE VIEW std_sitemap_info AS
SELECT CAST(mapng_creat_id AS VARCHAR(50)) AS mpng_crt_id,
    CAST(mapng_file_nm AS VARCHAR(256)) AS mpng_file_nm,
    CAST(mapng_file_path AS VARCHAR(50)) AS mpng_file_path,
    CAST(creat_person_id AS VARCHAR(50)) AS crtr_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nsitemap;

DROP VIEW IF EXISTS std_stsfdg_info CASCADE;
CREATE OR REPLACE VIEW std_stsfdg_info AS
SELECT CAST(stsfdg_no AS VARCHAR(50)) AS dgstfn_no,
    CAST(ntt_id AS VARCHAR(50)) AS ntt_id,
    CAST(bbs_id AS VARCHAR(50)) AS bbs_id,
    CAST(wrter_id AS VARCHAR(50)) AS wrtr_id,
    CAST(stsfdg_cn AS VARCHAR(1000)) AS dgstfn_cn,
    stsfdg AS dgstfn_scr,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nstsfdg;

DROP VIEW IF EXISTS std_role_info CASCADE;
CREATE OR REPLACE VIEW std_role_info AS
SELECT CAST(role_code AS VARCHAR(10)) AS role_cd,
    CAST(role_nm AS VARCHAR(256)) AS role_nm,
    (role_pttrn)::character varying(500) AS role_pattrn,
    CAST(role_dc AS VARCHAR(1000)) AS role_expln,
    CAST(role_ty AS VARCHAR(10)) AS role_type_cd,
    (role_sort)::numeric(10,0) AS role_sort_ordr,
    CAST(role_creat_de AS VARCHAR(10)) AS role_creat_ymd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nroleinfo;

DROP VIEW IF EXISTS std_user_info CASCADE;
CREATE OR REPLACE VIEW std_user_info AS
SELECT CAST(user_id AS VARCHAR(50)) AS user_id,
    CAST(user_nm AS VARCHAR(256)) AS user_nm,
    (password)::character varying(256) AS pswd,
    CAST(email_adres AS VARCHAR(50)) AS eml_addr,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nuserinfo;

DROP VIEW IF EXISTS std_leader_sttus CASCADE;
CREATE OR REPLACE VIEW std_leader_sttus AS
SELECT CAST(leader_id AS VARCHAR(50)) AS leader_id,
    CAST(leader_sttus AS VARCHAR(10)) AS leader_stts_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nleadersttus;

DROP VIEW IF EXISTS std_bbs_item CASCADE;
CREATE OR REPLACE VIEW std_bbs_item AS
SELECT CAST(ntt_id AS VARCHAR(50)) AS pst_id,
    CAST(ntt_no AS VARCHAR(50)) AS pst_no,
    CAST(ntt_sj AS VARCHAR(256)) AS pst_ttl,
    CAST(ntt_cn AS VARCHAR(1000)) AS pst_cn,
    (rdcnt)::numeric(10,0) AS inq_cnt,
    CAST(ntcr_id AS VARCHAR(50)) AS wrtr_id,
    CAST(ntcr_nm AS VARCHAR(256)) AS wrtr_nm,
    (password)::character varying(256) AS pswd,
    CAST(answer_at AS VARCHAR(10)) AS ans_yn,
    CAST(parntsctt_no AS VARCHAR(50)) AS up_pst_no,
    CAST(ntce_bgnde AS VARCHAR(10)) AS ntc_bgng_ymd,
    CAST(ntce_endde AS VARCHAR(10)) AS ntc_end_ymd,
    (like_co)::numeric(10,0) AS like_cnt,
    CAST(atch_file_id AS VARCHAR(50)) AS atch_file_id,
    CAST(bbs_id AS VARCHAR(50)) AS bbs_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nbbs;

DROP VIEW IF EXISTS std_bbs_master CASCADE;
CREATE OR REPLACE VIEW std_bbs_master AS
SELECT CAST(bbs_id AS VARCHAR(50)) AS bbs_id,
    CAST(bbs_nm AS VARCHAR(256)) AS bbs_nm,
    CAST(bbs_intrcn AS VARCHAR(1000)) AS bbs_intro_cn,
    CAST(bbs_ty_code AS VARCHAR(10)) AS bbs_type_cd,
    CAST(reply_posbl_at AS VARCHAR(10)) AS reply_psblty_yn,
    CAST(file_atch_posbl_at AS VARCHAR(10)) AS file_atch_psblty_yn,
    (atch_posbl_file_number)::numeric(10,0) AS atch_psblty_file_cnt,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(tmplat_id AS VARCHAR(50)) AS tmplt_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nbbsmaster;

DROP VIEW IF EXISTS std_bbs_comment CASCADE;
CREATE OR REPLACE VIEW std_bbs_comment AS
SELECT CAST(answer_no AS VARCHAR(50)) AS cmnt_no,
    CAST(ntt_id AS VARCHAR(50)) AS pst_id,
    CAST(bbs_id AS VARCHAR(50)) AS bbs_id,
    CAST(wrter_id AS VARCHAR(50)) AS wrtr_id,
    CAST(wrter_nm AS VARCHAR(256)) AS wrtr_nm,
    CAST(answer AS VARCHAR(1000)) AS cmnt_cn,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ncomment;

DROP VIEW IF EXISTS std_onln_poll_manage CASCADE;
CREATE OR REPLACE VIEW std_onln_poll_manage AS
SELECT CAST(poll_id AS VARCHAR(50)) AS poll_id,
    CAST(poll_nm AS VARCHAR(256)) AS poll_nm,
    CAST(poll_knd AS VARCHAR(10)) AS poll_knd_cd,
    CAST(poll_bgnde AS VARCHAR(10)) AS poll_bgng_ymd,
    CAST(poll_endde AS VARCHAR(10)) AS poll_end_ymd,
    CAST(poll_atmc_dsuse_ennc AS VARCHAR(10)) AS auto_dscd_yn,
    CAST(poll_dsuse_ennc AS VARCHAR(10)) AS dscd_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nonlinepollmanage;

DROP VIEW IF EXISTS std_onln_poll_artcl CASCADE;
CREATE OR REPLACE VIEW std_onln_poll_artcl AS
SELECT CAST(poll_id AS VARCHAR(50)) AS poll_id,
    CAST(poll_iem_id AS VARCHAR(50)) AS poll_artcl_id,
    CAST(poll_iem_nm AS VARCHAR(256)) AS poll_artcl_nm,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nonlinepolliem;

DROP VIEW IF EXISTS std_onln_poll_rslt CASCADE;
CREATE OR REPLACE VIEW std_onln_poll_rslt AS
SELECT CAST(poll_id AS VARCHAR(50)) AS poll_id,
    CAST(poll_iem_id AS VARCHAR(50)) AS poll_artcl_id,
    CAST(poll_result_id AS VARCHAR(50)) AS poll_rslt_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nonlinepollresult;

DROP VIEW IF EXISTS std_note_info CASCADE;
CREATE OR REPLACE VIEW std_note_info AS
SELECT CAST(note_id AS VARCHAR(50)) AS note_id,
    CAST(note_sj AS VARCHAR(256)) AS note_ttl,
    CAST(note_cn AS VARCHAR(1000)) AS note_cn,
    CAST(atch_file_id AS VARCHAR(50)) AS atch_file_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nnote;

DROP VIEW IF EXISTS std_note_rcptn CASCADE;
CREATE OR REPLACE VIEW std_note_rcptn AS
SELECT CAST(note_recptn_id AS VARCHAR(50)) AS note_rcptn_id,
    CAST(note_id AS VARCHAR(50)) AS note_id,
    CAST(note_trnsmit_id AS VARCHAR(50)) AS note_trsm_id,
    CAST(rcver_id AS VARCHAR(50)) AS rcver_id,
    CAST(recptn_se AS VARCHAR(10)) AS rcptn_se_cd,
    CAST(open_yn AS VARCHAR(10)) AS open_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nnoterecptn;

DROP VIEW IF EXISTS std_club_user_map CASCADE;
CREATE OR REPLACE VIEW std_club_user_map AS
SELECT CAST(clb_id AS VARCHAR(50)) AS club_id,
    CAST(cmmnty_id AS VARCHAR(50)) AS cmnty_id,
    CAST(emplyr_id AS VARCHAR(50)) AS user_id,
    CAST(oprtr_at AS VARCHAR(10)) AS optr_yn,
    CAST(sbscrb_de AS VARCHAR(10)) AS join_ymd,
    CAST(secsn_de AS VARCHAR(10)) AS whdwl_ymd,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nclubuser;

DROP VIEW IF EXISTS std_cmnty_user_map CASCADE;
CREATE OR REPLACE VIEW std_cmnty_user_map AS
SELECT CAST(cmmnty_id AS VARCHAR(50)) AS cmnty_id,
    CAST(emplyr_id AS VARCHAR(50)) AS user_id,
    CAST(mngr_at AS VARCHAR(10)) AS mngr_yn,
    CAST(mber_sttus AS VARCHAR(10)) AS mbr_stts_cd,
    CAST(sbscrb_de AS VARCHAR(10)) AS join_ymd,
    CAST(secsn_de AS VARCHAR(10)) AS whdwl_ymd,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ncmmntyuser;

DROP VIEW IF EXISTS std_bbs_master_optn CASCADE;
CREATE OR REPLACE VIEW std_bbs_master_optn AS
SELECT CAST(bbs_id AS VARCHAR(50)) AS bbs_id,
    CAST(answer_at AS VARCHAR(10)) AS ans_yn,
    CAST(stsfdg_at AS VARCHAR(10)) AS dgstfn_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nbbsmasteroptn;

DROP VIEW IF EXISTS std_bbs_use_info CASCADE;
CREATE OR REPLACE VIEW std_bbs_use_info AS
SELECT CAST(bbs_id AS VARCHAR(50)) AS bbs_id,
    CAST(trget_id AS VARCHAR(50)) AS trgt_id,
    CAST(regist_se_code AS VARCHAR(10)) AS reg_se_cd,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(NULL AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(NULL AS VARCHAR(50)) AS last_mdfr_id
FROM nbbsuse;

DROP VIEW IF EXISTS std_bbs_stats CASCADE;
CREATE OR REPLACE VIEW std_bbs_stats AS
SELECT CAST(stats_id AS VARCHAR(50)) AS stats_id,
    ntce_co AS ntc_cnt,
    avrg_rdcnt AS avg_inq_cnt,
    top_rdcnt AS max_inq_cnt,
    mumm_rdcnt AS min_inq_cnt,
    CAST(top_ntcr_id AS VARCHAR(50)) AS top_wrtr_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nbbsstats;

DROP VIEW IF EXISTS std_bbs_scrap CASCADE;
CREATE OR REPLACE VIEW std_bbs_scrap AS
SELECT CAST(scrap_id AS VARCHAR(50)) AS scrp_id,
    CAST(scrap_nm AS VARCHAR(256)) AS scrp_nm,
    CAST(scrap_dc AS VARCHAR(1000)) AS scrp_expln,
    CAST(scrap_url AS VARCHAR(50)) AS scrp_url,
    CAST(ntt_id AS VARCHAR(50)) AS pst_id,
    CAST(bbs_id AS VARCHAR(50)) AS bbs_id,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nscrap;

DROP VIEW IF EXISTS std_blog_user_map CASCADE;
CREATE OR REPLACE VIEW std_blog_user_map AS
SELECT CAST(blog_id AS VARCHAR(50)) AS blog_id,
    CAST(emplyr_id AS VARCHAR(50)) AS user_id,
    CAST(mngr_at AS VARCHAR(10)) AS mngr_yn,
    CAST(mber_sttus AS VARCHAR(10)) AS mbr_stts_cd,
    CAST(sbscrb_de AS VARCHAR(10)) AS join_ymd,
    CAST(secsn_de AS VARCHAR(10)) AS whdwl_ymd,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nbloguser;

DROP VIEW IF EXISTS std_cmnty_info CASCADE;
CREATE OR REPLACE VIEW std_cmnty_info AS
SELECT CAST(cmmnty_id AS VARCHAR(50)) AS cmnty_id,
    CAST(cmmnty_nm AS VARCHAR(256)) AS cmnty_nm,
    CAST(cmmnty_intrcn AS VARCHAR(1000)) AS cmnty_intro_cn,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ncmmnty;

DROP VIEW IF EXISTS std_note_trsm CASCADE;
CREATE OR REPLACE VIEW std_note_trsm AS
SELECT CAST(note_trnsmit_id AS VARCHAR(50)) AS note_trsm_id,
    CAST(note_id AS VARCHAR(50)) AS note_id,
    CAST(trnsmiter_id AS VARCHAR(50)) AS trsmtr_id,
    CAST(delete_at AS VARCHAR(10)) AS del_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nnotetrnsmit;

DROP VIEW IF EXISTS std_sms_info CASCADE;
CREATE OR REPLACE VIEW std_sms_info AS
SELECT CAST(sms_id AS VARCHAR(50)) AS sms_id,
    trnsmis_telno AS trsm_telno,
    CAST(trnsmis_cn AS VARCHAR(1000)) AS trsm_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nsms;

DROP VIEW IF EXISTS std_sms_rcptn CASCADE;
CREATE OR REPLACE VIEW std_sms_rcptn AS
SELECT CAST(sms_id AS VARCHAR(50)) AS sms_id,
    recptn_telno AS rcptn_telno,
    CAST(result_code AS VARCHAR(10)) AS rslt_cd,
    CAST(result_mssage AS VARCHAR(1000)) AS rslt_msg_cn
FROM nsmsrecptn;

DROP VIEW IF EXISTS std_rpt_info CASCADE;
CREATE OR REPLACE VIEW std_rpt_info AS
SELECT CAST(reprt_id AS VARCHAR(50)) AS rpt_id,
    CAST(reprt_se AS VARCHAR(10)) AS rpt_se_cd,
    CAST(reprt_sj AS VARCHAR(256)) AS rpt_ttl,
    CAST(reprt_cn AS VARCHAR(1000)) AS rpt_cn,
    CAST(reprt_de AS VARCHAR(10)) AS rpt_ymd,
    CAST(wrter_id AS VARCHAR(50)) AS wrtr_id,
    CAST(reprt_sttus AS VARCHAR(10)) AS rpt_stts_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nwikmnthngreprt;

DROP VIEW IF EXISTS std_memo_rpt_info CASCADE;
CREATE OR REPLACE VIEW std_memo_rpt_info AS
SELECT CAST(reprt_id AS VARCHAR(50)) AS memo_rpt_id,
    CAST(reprt_sj AS VARCHAR(256)) AS memo_rpt_ttl,
    CAST(report_cn AS VARCHAR(1000)) AS memo_rpt_cn,
    CAST(report_de AS VARCHAR(10)) AS memo_rpt_ymd,
    CAST(wrter_id AS VARCHAR(50)) AS wrtr_id,
    CAST(reportr_id AS VARCHAR(50)) AS rptr_id,
    CAST(reportr_inqire_dt AS TIMESTAMP) AS rptr_inq_dt,
    CAST(drct_matter AS VARCHAR(1000)) AS drct_matter_cn,
    CAST(drct_matter_regist_dt AS TIMESTAMP) AS drct_matter_reg_dt,
    CAST(atch_file_id AS VARCHAR(50)) AS atch_file_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nmemoreprt;

DROP VIEW IF EXISTS std_memo_todo_info CASCADE;
CREATE OR REPLACE VIEW std_memo_todo_info AS
SELECT CAST(todo_id AS VARCHAR(50)) AS todo_id,
    CAST(todo_sj AS VARCHAR(256)) AS todo_ttl,
    CAST(todo_cn AS VARCHAR(1000)) AS todo_cn,
    (todo_begin_time)::character varying(50) AS todo_bgng_tm,
    (todo_end_time)::character varying(50) AS todo_end_tm,
    CAST(wrter_id AS VARCHAR(50)) AS wrtr_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nmemotodo;

DROP VIEW IF EXISTS std_diary_info CASCADE;
CREATE OR REPLACE VIEW std_diary_info AS
SELECT CAST(diary_id AS VARCHAR(50)) AS diary_id,
    CAST(diary_nm AS VARCHAR(256)) AS diary_nm,
    diary_progrsrt AS diary_progrs_rt,
    CAST(drct_matter AS VARCHAR(1000)) AS drct_matter_cn,
    CAST(partclr_matter AS VARCHAR(1000)) AS prtclr_matter_cn,
    CAST(schdul_id AS VARCHAR(50)) AS schdl_id,
    CAST(atch_file_id AS VARCHAR(50)) AS atch_file_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ndiaryinfo;

DROP VIEW IF EXISTS std_ifml_atrz_info CASCADE;
CREATE OR REPLACE VIEW std_ifml_atrz_info AS
SELECT CAST(infrml_sanctn_id AS VARCHAR(50)) AS ifml_atrz_id,
    CAST(job_se_code AS VARCHAR(10)) AS job_se_cd,
    CAST(applcnt_id AS VARCHAR(50)) AS aplcnt_id,
    CAST(reqst_de AS VARCHAR(10)) AS reqst_ymd,
    CAST(sanctner_id AS VARCHAR(50)) AS aprvr_id,
    CAST(sanctn_dt AS TIMESTAMP) AS atrz_dt,
    CAST(return_resn AS VARCHAR(1000)) AS rjct_rsn_cn,
    CAST(confm_at AS VARCHAR(10)) AS aprv_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ninfrmlsanctn;

DROP VIEW IF EXISTS std_web_log CASCADE;
CREATE OR REPLACE VIEW std_web_log AS
SELECT CAST(requst_id AS VARCHAR(50)) AS req_id,
    CAST(rqester_id AS VARCHAR(50)) AS rqstr_id,
    CAST(rqester_ip AS VARCHAR(50)) AS rqstr_ip_addr,
    (url)::character varying(256) AS url,
    CAST(occrrnc_de AS TIMESTAMP) AS ocur_dt,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nweblog;

DROP VIEW IF EXISTS std_user_log CASCADE;
CREATE OR REPLACE VIEW std_user_log AS
SELECT CAST(rqester_id AS VARCHAR(50)) AS rqstr_id,
    CAST(svc_nm AS VARCHAR(256)) AS svc_nm,
    CAST(method_nm AS VARCHAR(256)) AS mthd_nm,
    creat_co AS crt_cnt,
    rdcnt AS inq_cnt,
    updt_co AS mdfcn_cnt,
    delete_co AS del_cnt,
    outpt_co AS outpt_cnt,
    error_co AS err_cnt,
    CAST(occrrnc_de AS VARCHAR(10)) AS ocur_ymd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nuserlog;

DROP VIEW IF EXISTS std_privacy_log CASCADE;
CREATE OR REPLACE VIEW std_privacy_log AS
SELECT CAST(requst_id AS VARCHAR(50)) AS req_id,
    CAST(rqester_id AS VARCHAR(50)) AS rqstr_id,
    CAST(rqester_ip AS VARCHAR(50)) AS rqstr_ip_addr,
    CAST(srvc_nm AS VARCHAR(256)) AS svc_nm,
    CAST(inqire_info AS VARCHAR(1000)) AS inq_info_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nprivacylog;

DROP VIEW IF EXISTS std_http_mntrng_log CASCADE;
CREATE OR REPLACE VIEW std_http_mntrng_log AS
SELECT CAST(log_id AS VARCHAR(50)) AS log_id,
    CAST(sys_id AS VARCHAR(50)) AS sys_id,
    CAST(site_url AS VARCHAR(50)) AS site_url,
    CAST(websvc_knd AS VARCHAR(10)) AS web_svc_knd_cd,
    CAST(http_sttus_code AS VARCHAR(10)) AS http_stts_cd,
    CAST(log_info AS VARCHAR(1000)) AS log_cn,
    CAST(mngr_nm AS VARCHAR(256)) AS mngr_nm,
    CAST(mngr_email_adres AS VARCHAR(50)) AS mngr_eml_addr,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM hhttpmonloginfo;

DROP VIEW IF EXISTS std_proc_mntrng_log CASCADE;
CREATE OR REPLACE VIEW std_proc_mntrng_log AS
SELECT CAST(log_id AS VARCHAR(50)) AS log_id,
    CAST(procs_id AS VARCHAR(50)) AS proc_id,
    CAST(procs_nm AS VARCHAR(256)) AS proc_nm,
    CAST(procs_sttus AS VARCHAR(10)) AS proc_stts_cd,
    CAST(log_info AS VARCHAR(1000)) AS log_cn,
    CAST(mngr_nm AS VARCHAR(256)) AS mngr_nm,
    CAST(mngr_email_adres AS VARCHAR(50)) AS mngr_eml_addr,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nprocessmonloginfo;

DROP VIEW IF EXISTS std_file_sys_mntrng_log CASCADE;
CREATE OR REPLACE VIEW std_file_sys_mntrng_log AS
SELECT CAST(log_id AS VARCHAR(50)) AS log_id,
    CAST(file_sys_id AS VARCHAR(50)) AS file_sys_id,
    CAST(file_sys_nm AS VARCHAR(256)) AS file_sys_nm,
    CAST(file_sys_manage_nm AS VARCHAR(256)) AS file_sys_mng_nm,
    file_sys_size AS file_sys_sz,
    file_sys_thrhld AS file_sys_thrh_sz,
    file_sys_usgqty AS file_sys_usg_qty,
    CAST(mntrng_sttus AS VARCHAR(10)) AS mntr_stts_cd,
    CAST(log_info AS VARCHAR(1000)) AS log_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nfilesysmntrngloginfo;

DROP VIEW IF EXISTS std_trrc_mntrng_log CASCADE;
CREATE OR REPLACE VIEW std_trrc_mntrng_log AS
SELECT CAST(cntc_id AS VARCHAR(50)) AS cntc_id,
    CAST(test_class_nm AS VARCHAR(256)) AS test_class_nm,
    CAST(mngr_nm AS VARCHAR(256)) AS mngr_nm,
    CAST(mngr_email_adres AS VARCHAR(50)) AS mngr_eml_addr,
    CAST(mntrng_sttus AS VARCHAR(10)) AS mntr_stts_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ntrsmrcvmntrng;

DROP VIEW IF EXISTS std_server_info CASCADE;
CREATE OR REPLACE VIEW std_server_info AS
SELECT CAST(server_id AS VARCHAR(50)) AS server_id,
    CAST(server_nm AS VARCHAR(256)) AS server_nm,
    CAST(server_knd AS VARCHAR(10)) AS server_knd_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nserverinfo;

DROP VIEW IF EXISTS std_server_eqpmnt_info CASCADE;
CREATE OR REPLACE VIEW std_server_eqpmnt_info AS
SELECT CAST(server_eqpmn_id AS VARCHAR(50)) AS server_eqpmnt_id,
    CAST(server_eqpmn_nm AS VARCHAR(256)) AS server_eqpmnt_nm,
    CAST(server_eqpmn_ip AS VARCHAR(50)) AS server_eqpmnt_ip_addr,
    CAST(server_eqpmn_mngr AS VARCHAR(256)) AS server_eqpmnt_mngr_nm,
    CAST(mngr_email_adres AS VARCHAR(50)) AS mngr_eml_addr,
    CAST(opersysm_info AS VARCHAR(1000)) AS os_info_cn,
    CAST(cpu_info AS VARCHAR(1000)) AS cpu_info_cn,
    CAST(mory_info AS VARCHAR(1000)) AS mmry_info_cn,
    CAST(hddisk AS VARCHAR(1000)) AS hdd_info_cn,
    CAST(etc_info AS VARCHAR(1000)) AS etc_info_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nservereqpmninfo;

DROP VIEW IF EXISTS std_server_resrc_log CASCADE;
CREATE OR REPLACE VIEW std_server_resrc_log AS
SELECT CAST(log_id AS VARCHAR(50)) AS log_id,
    CAST(server_id AS VARCHAR(50)) AS server_id,
    CAST(server_eqpmn_id AS VARCHAR(50)) AS server_eqpmnt_id,
    cpu_use_rt,
    mory_use_rt AS mmry_use_rt,
    CAST(svc_sttus AS VARCHAR(10)) AS svc_stts_cd,
    CAST(log_info AS VARCHAR(1000)) AS log_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nserverresrceloginfo;

DROP VIEW IF EXISTS std_ntwrk_info CASCADE;
CREATE OR REPLACE VIEW std_ntwrk_info AS
SELECT CAST(ntwrk_id AS VARCHAR(50)) AS ntwrk_id,
    CAST(ntwrk_ip AS VARCHAR(50)) AS ntwrk_ip_addr,
    CAST(gtwy AS VARCHAR(50)) AS gtwy_addr,
    CAST(subnet AS VARCHAR(50)) AS sbnet_addr,
    CAST(domn_nm_server AS VARCHAR(50)) AS dns_addr,
    CAST(manage_iem AS VARCHAR(1000)) AS mng_item_cn,
    CAST(user_nm AS VARCHAR(256)) AS user_nm,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nntwrkinfo;

DROP VIEW IF EXISTS std_orgnzt_info CASCADE;
CREATE OR REPLACE VIEW std_orgnzt_info AS
SELECT CAST(orgnzt_id AS VARCHAR(50)) AS orgnzt_id,
    CAST(orgnzt_nm AS VARCHAR(256)) AS orgnzt_nm,
    CAST(orgnzt_dc AS VARCHAR(1000)) AS orgnzt_expln,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM norgnztinfo;

DROP VIEW IF EXISTS std_sys_log CASCADE;
CREATE OR REPLACE VIEW std_sys_log AS
SELECT CAST(requst_id AS VARCHAR(50)) AS req_id,
    CAST(rqester_id AS VARCHAR(50)) AS rqstr_id,
    CAST(rqester_ip AS VARCHAR(50)) AS rqstr_ip_addr,
    CAST(svc_nm AS VARCHAR(256)) AS svc_nm,
    CAST(method_nm AS VARCHAR(256)) AS mthd_nm,
    CAST(process_se_code AS VARCHAR(10)) AS proc_se_cd,
    (process_time)::character varying(50) AS proc_tm,
    CAST(rspns_code AS VARCHAR(10)) AS rspns_cd,
    CAST(occrrnc_de AS VARCHAR(10)) AS ocur_ymd,
    CAST(error_se AS VARCHAR(10)) AS err_se_cd,
    CAST(error_code AS VARCHAR(10)) AS err_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nsyslog;

DROP VIEW IF EXISTS std_trrc_log CASCADE;
CREATE OR REPLACE VIEW std_trrc_log AS
SELECT CAST(requst_id AS VARCHAR(50)) AS req_id,
    CAST(rqester_id AS VARCHAR(50)) AS rqstr_id,
    CAST(cntc_id AS VARCHAR(50)) AS cntc_id,
    CAST(trsmrcv_se_code AS VARCHAR(10)) AS trrc_se_cd,
    CAST(result_code AS VARCHAR(10)) AS rslt_cd,
    CAST(result_mssage AS VARCHAR(1000)) AS rslt_msg_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ntrsmrcvlog;

DROP VIEW IF EXISTS std_aprv_hstry CASCADE;
CREATE OR REPLACE VIEW std_aprv_hstry AS
SELECT CAST(confm_no AS VARCHAR(50)) AS aprv_no,
    CAST(confm_rqester_id AS VARCHAR(50)) AS aprv_rqstr_id,
    CAST(confmer_id AS VARCHAR(50)) AS aprvr_id,
    CAST(confm_de AS VARCHAR(10)) AS aprv_ymd,
    CAST(confm_ty_code AS VARCHAR(10)) AS aprv_type_cd,
    CAST(confm_sttus_code AS VARCHAR(10)) AS aprv_stts_cd,
    CAST(opert_ty_code AS VARCHAR(10)) AS opert_type_cd,
    CAST(opert_id AS VARCHAR(50)) AS opert_id,
    CAST(trget_job_ty_code AS VARCHAR(10)) AS trgt_job_type_cd,
    CAST(trget_job_id AS VARCHAR(50)) AS trgt_job_id,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM hconfmhistory;

DROP VIEW IF EXISTS std_db_mntrng_log CASCADE;
CREATE OR REPLACE VIEW std_db_mntrng_log AS
SELECT CAST(log_id AS VARCHAR(50)) AS log_id,
    CAST(data_sourc_nm AS VARCHAR(256)) AS ds_nm,
    CAST(server_nm AS VARCHAR(256)) AS server_nm,
    CAST(dbms_knd AS VARCHAR(10)) AS dbms_knd_cd,
    CAST(ceck_sql AS VARCHAR(1000)) AS chck_sql_cn,
    CAST(mngr_nm AS VARCHAR(256)) AS mngr_nm,
    CAST(mngr_email_adres AS VARCHAR(50)) AS mngr_eml_addr,
    CAST(mntrng_sttus AS VARCHAR(10)) AS mntr_stts_cd,
    CAST(log_info AS VARCHAR(1000)) AS log_cn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM hdbmntrngloginfo;

DROP VIEW IF EXISTS std_proxy_info CASCADE;
CREATE OR REPLACE VIEW std_proxy_info AS
SELECT CAST(proxy_id AS VARCHAR(50)) AS proxy_id,
    CAST(proxy_nm AS VARCHAR(256)) AS proxy_nm,
    CAST(proxy_ip AS VARCHAR(50)) AS proxy_ip_addr,
    CAST(proxy_port AS VARCHAR(50)) AS proxy_port_no,
    CAST(trget_svc_nm AS VARCHAR(256)) AS trgt_svc_nm,
    CAST(svc_dc AS VARCHAR(1000)) AS svc_expln,
    CAST(svc_ip AS VARCHAR(50)) AS svc_ip_addr,
    CAST(svc_port AS VARCHAR(50)) AS svc_port_no,
    CAST(svc_sttus AS VARCHAR(10)) AS svc_stts_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nproxyinfo;

DROP VIEW IF EXISTS std_proxy_log CASCADE;
CREATE OR REPLACE VIEW std_proxy_log AS
SELECT CAST(log_id AS VARCHAR(50)) AS log_id,
    CAST(proxy_id AS VARCHAR(50)) AS proxy_id,
    CAST(clnt_ip AS VARCHAR(50)) AS clnt_ip_addr,
    CAST(clnt_port AS VARCHAR(50)) AS clnt_port_no,
    (conect_time)::character varying(50) AS conn_tm,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nproxyloginfo;

DROP VIEW IF EXISTS std_fxtrs_manage CASCADE;
CREATE OR REPLACE VIEW std_fxtrs_manage AS
SELECT CAST(fxtrs_code AS VARCHAR(10)) AS fxtrs_cd,
    CAST(fxtrs_nm AS VARCHAR(256)) AS fxtrs_nm,
    CAST(makr_nm AS VARCHAR(256)) AS makr_nm,
    price AS amt,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nfxtrsmanage;

DROP VIEW IF EXISTS std_mtg_place_fxtrs CASCADE;
CREATE OR REPLACE VIEW std_mtg_place_fxtrs AS
SELECT CAST(mtgrum_id AS VARCHAR(50)) AS mtg_rm_id,
    CAST(fxtrs_code AS VARCHAR(10)) AS fxtrs_cd,
    (qy)::integer AS qty,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nmtgplacefxtrs;

DROP VIEW IF EXISTS std_bkup_schdl CASCADE;
CREATE OR REPLACE VIEW std_bkup_schdl AS
SELECT CAST(backup_opert_id AS VARCHAR(50)) AS bkup_opert_id,
    CAST(execut_schdul_dfk_se AS VARCHAR(10)) AS exec_schdl_dw_se_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM nbackupschduldfk;

DROP VIEW IF EXISTS std_trobl_info CASCADE;
CREATE OR REPLACE VIEW std_trobl_info AS
SELECT CAST(trobl_id AS VARCHAR(50)) AS dsblty_id,
    CAST(trobl_nm AS VARCHAR(256)) AS dsblty_nm,
    CAST(trobl_knd AS VARCHAR(10)) AS dsblty_knd_cd,
    CAST(trobl_dc AS VARCHAR(1000)) AS dsblty_expln,
    (trobl_occrrnc_time)::character varying(50) AS dsblty_ocur_tm,
    CAST(trobl_rqester_nm AS VARCHAR(256)) AS dsblty_rqstr_nm,
    (trobl_requst_time)::character varying(50) AS dsblty_req_tm,
    CAST(trobl_process_result AS VARCHAR(1000)) AS dsblty_proc_rslt_cn,
    CAST(trobl_opetr_nm AS VARCHAR(256)) AS dsblty_opert_nm,
    (trobl_process_time)::character varying(50) AS dsblty_proc_tm,
    CAST(process_sttus AS VARCHAR(10)) AS proc_stts_cd,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ntroblinfo;

DROP VIEW IF EXISTS std_com_clsf_cd CASCADE;
CREATE OR REPLACE VIEW std_com_clsf_cd AS
SELECT CAST(cl_code AS VARCHAR(10)) AS clsf_cd,
    CAST(cl_code_nm AS VARCHAR(256)) AS clsf_cd_nm,
    CAST(cl_code_dc AS VARCHAR(1000)) AS clsf_cd_expln,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ccmmnclcode;

DROP VIEW IF EXISTS std_com_cd CASCADE;
CREATE OR REPLACE VIEW std_com_cd AS
SELECT CAST(code_id AS VARCHAR(50)) AS com_cd_id,
    CAST(code_id_nm AS VARCHAR(256)) AS com_cd_nm,
    CAST(code_id_dc AS VARCHAR(1000)) AS com_cd_expln,
    CAST(cl_code AS VARCHAR(10)) AS clsf_cd,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ccmmncode;

DROP VIEW IF EXISTS std_com_dtl_cd CASCADE;
CREATE OR REPLACE VIEW std_com_dtl_cd AS
SELECT CAST(code AS VARCHAR(10)) AS dtl_cd,
    CAST(code_nm AS VARCHAR(256)) AS dtl_cd_nm,
    CAST(code_dc AS VARCHAR(1000)) AS dtl_cd_expln,
    CAST(code_id AS VARCHAR(50)) AS com_cd_id,
    CAST(use_at AS VARCHAR(10)) AS use_yn,
    CAST(frst_regist_pnttm AS TIMESTAMP) AS frst_reg_dt,
    CAST(last_updt_pnttm AS TIMESTAMP) AS last_mdfcn_dt,
    CAST(frst_register_id AS VARCHAR(50)) AS frst_rgtr_id,
    CAST(last_updusr_id AS VARCHAR(50)) AS last_mdfr_id
FROM ccmmndetailcode;

