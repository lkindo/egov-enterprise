-- eGov Enterprise H2 Unit Test Init Schema (PostgreSQL Mode)
-- Generated automatically via DatabaseSchemaDumpTest

CREATE MEMORY TABLE "public"."tb_admdst_cd"(
    "use_yn" CHARACTER VARYING(1),
    "abl_ymd" CHARACTER VARYING(8),
    "crt_dt" TIMESTAMP(6),
    "crt_ymd" CHARACTER VARYING(8),
    "mdfcn_dt" TIMESTAMP(6),
    "admdst_cd" CHARACTER VARYING(12) NOT NULL,
    "admdst_se_cd" CHARACTER VARYING(12),
    "up_admdst_cd" CHARACTER VARYING(12),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "admdst_zone_nm" CHARACTER VARYING(100)
);
ALTER TABLE "public"."tb_admdst_cd" ADD CONSTRAINT "public"."CONSTRAINT_1" PRIMARY KEY("admdst_cd");
CREATE MEMORY TABLE "public"."tb_auth_rfsh_tk"(
    "exprtn_dt" TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    "user_id" CHARACTER VARYING(20) NOT NULL,
    "rfsh_tkn" CHARACTER VARYING(255) NOT NULL
);
ALTER TABLE "public"."tb_auth_rfsh_tk" ADD CONSTRAINT "public"."CONSTRAINT_64" PRIMARY KEY("user_id");
CREATE MEMORY TABLE "public"."tb_authrt_group_info"(
    "crt_dt" TIMESTAMP(6),
    "group_crt_ymd" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "group_id" CHARACTER VARYING(20) NOT NULL,
    "last_mdfr_id" CHARACTER VARYING(20),
    "group_nm" CHARACTER VARYING(60),
    "group_dc" CHARACTER VARYING(100)
);
ALTER TABLE "public"."tb_authrt_group_info" ADD CONSTRAINT "public"."CONSTRAINT_4" PRIMARY KEY("group_id");
CREATE MEMORY TABLE "public"."tb_authrt_info"(
    "authrt_crt_ymd" CHARACTER VARYING(8),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "authrt_cd" CHARACTER VARYING(30) NOT NULL,
    "authrt_nm" CHARACTER VARYING(60) NOT NULL,
    "authrt_expln" CHARACTER VARYING(200)
);
ALTER TABLE "public"."tb_authrt_info" ADD CONSTRAINT "public"."CONSTRAINT_4E" PRIMARY KEY("authrt_cd");
CREATE MEMORY TABLE "public"."tb_authrt_role_map"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "authrt_cd" CHARACTER VARYING(30) NOT NULL,
    "role_cd" CHARACTER VARYING(50) NOT NULL
);
ALTER TABLE "public"."tb_authrt_role_map" ADD CONSTRAINT "public"."CONSTRAINT_16" PRIMARY KEY("authrt_cd", "role_cd");
CREATE MEMORY TABLE "public"."tb_bkmk_menu_mng_rslt"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "menu_id" BIGINT NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "user_id" CHARACTER VARYING(20) NOT NULL,
    "menu_nm" CHARACTER VARYING(60),
    "progrm_stre_path" CHARACTER VARYING(100)
);
ALTER TABLE "public"."tb_bkmk_menu_mng_rslt" ADD CONSTRAINT "public"."CONSTRAINT_F" PRIMARY KEY("menu_id", "user_id");
CREATE MEMORY TABLE "public"."tb_bnr_info"(
    "rflt_yn" CHARACTER VARYING(1),
    "sort_ordr" INTEGER,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "atch_file_id" CHARACTER VARYING(20),
    "bnr_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "bnr_img_nm" CHARACTER VARYING(100),
    "bnr_nm" CHARACTER VARYING(100) NOT NULL,
    "bnr_expln" CHARACTER VARYING(1000),
    "link_url" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_bnr_info" ADD CONSTRAINT "public"."CONSTRAINT_48" PRIMARY KEY("bnr_id");
CREATE MEMORY TABLE "public"."tb_cmnty_info"(
    "use_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "reg_se_cd" CHARACTER VARYING(12),
    "cmnty_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "tmplt_id" CHARACTER VARYING(20),
    "cmnty_nm" CHARACTER VARYING(300),
    "cmnty_intro_cn" CHARACTER VARYING(4000)
);
ALTER TABLE "public"."tb_cmnty_info" ADD CONSTRAINT "public"."CONSTRAINT_4EC" PRIMARY KEY("cmnty_id");
CREATE MEMORY TABLE "public"."tb_cmnty_user_map"(
    "mngr_yn" CHARACTER VARYING(1),
    "use_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "join_ymd" CHARACTER VARYING(8),
    "mdfcn_dt" TIMESTAMP(6),
    "whdwl_ymd" CHARACTER VARYING(8),
    "mbr_stts_cd" CHARACTER VARYING(12),
    "cmnty_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "user_id" CHARACTER VARYING(30) NOT NULL
);
ALTER TABLE "public"."tb_cmnty_user_map" ADD CONSTRAINT "public"."CONSTRAINT_5" PRIMARY KEY("cmnty_id", "user_id");
CREATE MEMORY TABLE "public"."tb_com_cd"(
    "clsf_cd" CHARACTER VARYING(3),
    "use_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "cd_id" CHARACTER VARYING(18) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "cd_id_nm" CHARACTER VARYING(180),
    "cd_id_expln" CHARACTER VARYING(600)
);
ALTER TABLE "public"."tb_com_cd" ADD CONSTRAINT "public"."CONSTRAINT_43" PRIMARY KEY("cd_id");
CREATE MEMORY TABLE "public"."tb_com_clsf_cd"(
    "clsf_cd" CHARACTER VARYING(3) NOT NULL,
    "use_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "clsf_cd_nm" CHARACTER VARYING(180),
    "clsf_cd_expln" CHARACTER VARYING(600)
);
ALTER TABLE "public"."tb_com_clsf_cd" ADD CONSTRAINT "public"."CONSTRAINT_E" PRIMARY KEY("clsf_cd");
CREATE MEMORY TABLE "public"."tb_com_dtl_cd"(
    "use_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "cd_id" CHARACTER VARYING(18) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "dtl_cd" CHARACTER VARYING(45) NOT NULL,
    "dtl_cd_nm" CHARACTER VARYING(180),
    "dtl_cd_expln" CHARACTER VARYING(600)
);
ALTER TABLE "public"."tb_com_dtl_cd" ADD CONSTRAINT "public"."CONSTRAINT_9" PRIMARY KEY("cd_id", "dtl_cd");
CREATE MEMORY TABLE "public"."tb_dscsn_list"(
    "area_no" CHARACTER VARYING(4),
    "eml_ans_yn" CHARACTER VARYING(1),
    "end_telno" CHARACTER VARYING(4),
    "inq_cnt" INTEGER,
    "mbl_end_telno" CHARACTER VARYING(4),
    "mbl_frst_telno" CHARACTER VARYING(4),
    "mbl_md_telno" CHARACTER VARYING(4),
    "md_telno" CHARACTER VARYING(4),
    "qna_proc_stts_cd" CHARACTER VARYING(3),
    "rls_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "atch_file_id" CHARACTER VARYING(20),
    "dscsn_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "mng_ymd" CHARACTER VARYING(20),
    "wrt_pswd" CHARACTER VARYING(20),
    "wrt_ymd" CHARACTER VARYING(20),
    "wrter_nm" CHARACTER VARYING(20),
    "eml_addr" CHARACTER VARYING(50),
    "dscsn_cn" CHARACTER VARYING,
    "dscsn_ttl" CHARACTER VARYING(255),
    "proc_cn" CHARACTER VARYING
);
ALTER TABLE "public"."tb_dscsn_list" ADD CONSTRAINT "public"."CONSTRAINT_FE" PRIMARY KEY("dscsn_id");
CREATE MEMORY TABLE "public"."tb_dta_use_stats"(
    "file_sn" INTEGER,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "ntt_id" BIGINT,
    "atch_file_id" CHARACTER VARYING(20),
    "bbs_id" CHARACTER VARYING(20),
    "dta_use_stats_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20)
);
ALTER TABLE "public"."tb_dta_use_stats" ADD CONSTRAINT "public"."CONSTRAINT_1B" PRIMARY KEY("dta_use_stats_id");
CREATE MEMORY TABLE "public"."tb_event_info"(
    "biz_yr" CHARACTER VARYING(4),
    "evnt_aprv_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "evnt_use_cnt" BIGINT,
    "mdfcn_dt" TIMESTAMP(6),
    "evnt_nm" CHARACTER VARYING(200),
    "evnt_aprv_ymd" CHARACTER VARYING(20),
    "evnt_bgng_ymd" CHARACTER VARYING(20),
    "evnt_end_ymd" CHARACTER VARYING(20),
    "evnt_id" CHARACTER VARYING(20) NOT NULL,
    "evnt_type_cd" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "pic_nm" CHARACTER VARYING(60),
    "evnt_cn" CHARACTER VARYING(2500),
    "prep_mttr" CHARACTER VARYING(2500)
);
ALTER TABLE "public"."tb_event_info" ADD CONSTRAINT "public"."CONSTRAINT_8" PRIMARY KEY("evnt_id");
CREATE MEMORY TABLE "public"."tb_extrl_hr_info"(
    "area_no" CHARACTER VARYING(4),
    "cr_type_cd" CHARACTER VARYING(1),
    "end_telno" CHARACTER VARYING(4),
    "gndr_cd" CHARACTER VARYING(1),
    "md_telno" CHARACTER VARYING(4),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "brdt_ymd" CHARACTER VARYING(20),
    "evnt_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "otsd_hr_id" CHARACTER VARYING(20) NOT NULL,
    "otsd_hr_nm" CHARACTER VARYING(60),
    "ogdp_inst_nm" CHARACTER VARYING(100),
    "eml_addr" CHARACTER VARYING(300)
);
ALTER TABLE "public"."tb_extrl_hr_info" ADD CONSTRAINT "public"."CONSTRAINT_C" PRIMARY KEY("evnt_id", "otsd_hr_id");
CREATE MEMORY TABLE "public"."tb_indv_pg"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "page_id" CHARACTER VARYING(20) NOT NULL,
    "user_id" CHARACTER VARYING(30) NOT NULL,
    "page_ttl" CHARACTER VARYING(300) NOT NULL,
    "page_expln" CHARACTER VARYING(4000)
);
ALTER TABLE "public"."tb_indv_pg" ADD CONSTRAINT "public"."CONSTRAINT_7" PRIMARY KEY("page_id");
CREATE MEMORY TABLE "public"."tb_indv_pg_conts"(
    "cntnts_use_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "cntnts_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "cntnts_nm" CHARACTER VARYING(100),
    "cntc_url" CHARACTER VARYING(255),
    "cntnts_dc" CHARACTER VARYING(255),
    "cntnts_link_url" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_indv_pg_conts" ADD CONSTRAINT "public"."CONSTRAINT_B" PRIMARY KEY("cntnts_id");
CREATE MEMORY TABLE "public"."tb_inst_cd"(
    "abl_yn" CHARACTER VARYING(1),
    "inst_cycl" CHARACTER VARYING(2),
    "inst_type_lclsf" CHARACTER VARYING(2),
    "inst_type_mclsf" CHARACTER VARYING(2),
    "inst_type_sclsf" CHARACTER VARYING(2),
    "odr" CHARACTER VARYING(2),
    "ord" CHARACTER VARYING(3),
    "sort_seq" INTEGER,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "inst_cd" CHARACTER VARYING(10) NOT NULL,
    "rprs_inst_cd" CHARACTER VARYING(10),
    "up_inst_cd" CHARACTER VARYING(10),
    "abl_ymd" CHARACTER VARYING(20),
    "chg_tm" CHARACTER VARYING(20),
    "chg_ymd" CHARACTER VARYING(20),
    "crt_ymd" CHARACTER VARYING(20),
    "crtr_ymd" CHARACTER VARYING(20),
    "fax_no" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "telno" CHARACTER VARYING(20),
    "top_inst_cd" CHARACTER VARYING(30),
    "lwtrk_inst_nm" CHARACTER VARYING(180),
    "all_inst_nm" CHARACTER VARYING(300),
    "inst_abbr_nm" CHARACTER VARYING(300)
);
ALTER TABLE "public"."tb_inst_cd" ADD CONSTRAINT "public"."CONSTRAINT_74" PRIMARY KEY("inst_cd");
CREATE MEMORY TABLE "public"."tb_inst_cd_rcptn_log"(
    "abl_yn" CHARACTER VARYING(1),
    "chg_se_cd" CHARACTER VARYING(1),
    "inst_cycl" CHARACTER VARYING(2),
    "inst_type_lclsf" CHARACTER VARYING(2),
    "inst_type_mclsf" CHARACTER VARYING(2),
    "inst_type_sclsf" CHARACTER VARYING(2),
    "odr" CHARACTER VARYING(2),
    "ord" CHARACTER VARYING(3),
    "proc_se" CHARACTER VARYING(1),
    "sort_ordr" INTEGER,
    "abl_ymd" CHARACTER VARYING(8),
    "chg_ymd" CHARACTER VARYING(8),
    "crt_dt" TIMESTAMP(6),
    "crt_ymd" CHARACTER VARYING(8),
    "crtr_ymd" CHARACTER VARYING(8),
    "job_sn" BIGINT NOT NULL,
    "mdfcn_dt" TIMESTAMP(6),
    "inst_cd" CHARACTER VARYING(10) NOT NULL,
    "reprs_inst_cd" CHARACTER VARYING(10),
    "upr_inst_cd" CHARACTER VARYING(10),
    "chg_tm" CHARACTER VARYING(20),
    "fax_no" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "ocrn_ymd" CHARACTER VARYING(20) NOT NULL,
    "telno" CHARACTER VARYING(20),
    "top_inst_cd" CHARACTER VARYING(30),
    "etc_cd" CHARACTER VARYING(45),
    "lwst_inst_nm" CHARACTER VARYING(180),
    "all_inst_nm" CHARACTER VARYING(300),
    "inst_abbr_nm" CHARACTER VARYING(300)
);
ALTER TABLE "public"."tb_inst_cd_rcptn_log" ADD CONSTRAINT "public"."CONSTRAINT_CB" PRIMARY KEY("job_sn", "inst_cd", "ocrn_ymd");
CREATE MEMORY TABLE "public"."tb_intrn_svc"(
    "rflt_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "itnt_svc_id" CHARACTER VARYING(20) NOT NULL,
    "last_mdfr_id" CHARACTER VARYING(20),
    "itnt_svc_expln" CHARACTER VARYING(1000),
    "itnt_svc_nm" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_intrn_svc" ADD CONSTRAINT "public"."CONSTRAINT_57" PRIMARY KEY("itnt_svc_id");
CREATE MEMORY TABLE "public"."tb_login_log"(
    "err_cd" CHARACTER VARYING(3),
    "err_ocrn_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "cntn_mthd_cd" CHARACTER VARYING(10),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "log_id" CHARACTER VARYING(20) NOT NULL,
    "user_id" CHARACTER VARYING(20),
    "lgn_ip_addr" CHARACTER VARYING(30)
);
ALTER TABLE "public"."tb_login_log" ADD CONSTRAINT "public"."CONSTRAINT_BC" PRIMARY KEY("log_id");
CREATE MEMORY TABLE "public"."tb_login_policy"(
    "dpcn_prm_yn" CHARACTER VARYING(1),
    "lmt_yn" CHARACTER VARYING(1),
    "otp_use_yn" CHARACTER VARYING(1),
    "bgng_tm" CHARACTER VARYING(6),
    "end_tm" CHARACTER VARYING(6),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "user_id" CHARACTER VARYING(20) NOT NULL,
    "ip_addr" CHARACTER VARYING(30)
);
ALTER TABLE "public"."tb_login_policy" ADD CONSTRAINT "public"."CONSTRAINT_A" PRIMARY KEY("user_id");
CREATE MEMORY TABLE "public"."tb_menu_crt_dtl"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "menu_sn" BIGINT NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "authrt_cd" CHARACTER VARYING(30) NOT NULL,
    "mapng_crt_id" CHARACTER VARYING(30)
);
ALTER TABLE "public"."tb_menu_crt_dtl" ADD CONSTRAINT "public"."CONSTRAINT_3" PRIMARY KEY("menu_sn", "authrt_cd");
CREATE MEMORY TABLE "public"."tb_menu_info"(
    "menu_ordr" INTEGER NOT NULL,
    "route_mdfcn_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "menu_sn" BIGINT NOT NULL,
    "up_menu_sn" BIGINT,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "menu_nm" CHARACTER VARYING(60) NOT NULL,
    "prgrm_file_nm" CHARACTER VARYING(60),
    "rel_img_nm" CHARACTER VARYING(60),
    "rel_img_path" CHARACTER VARYING(100),
    "menu_expln" CHARACTER VARYING(250),
    "modern_route" CHARACTER VARYING(500)
);
ALTER TABLE "public"."tb_menu_info" ADD CONSTRAINT "public"."CONSTRAINT_C8" PRIMARY KEY("menu_sn");
CREATE MEMORY TABLE "public"."tb_onln_poll_artcl"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "poll_artcl_id" CHARACTER VARYING(20) NOT NULL,
    "poll_id" CHARACTER VARYING(20),
    "poll_artcl_nm" CHARACTER VARYING(255) NOT NULL
);
ALTER TABLE "public"."tb_onln_poll_artcl" ADD CONSTRAINT "public"."CONSTRAINT_CF" PRIMARY KEY("poll_artcl_id");
CREATE MEMORY TABLE "public"."tb_onln_poll_manage"(
    "poll_atmc_dsuse_yn" CHARACTER VARYING(1),
    "poll_dsuse_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "poll_bgng_ymd" CHARACTER VARYING(8),
    "poll_end_ymd" CHARACTER VARYING(8),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "poll_id" CHARACTER VARYING(20) NOT NULL,
    "poll_knd_cd" CHARACTER VARYING(30),
    "poll_nm" CHARACTER VARYING(300) NOT NULL
);
ALTER TABLE "public"."tb_onln_poll_manage" ADD CONSTRAINT "public"."CONSTRAINT_3C" PRIMARY KEY("poll_id");
CREATE MEMORY TABLE "public"."tb_onln_poll_rslt"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "poll_artcl_id" CHARACTER VARYING(20) NOT NULL,
    "poll_id" CHARACTER VARYING(20) NOT NULL,
    "poll_rslt_id" CHARACTER VARYING(20) NOT NULL
);
ALTER TABLE "public"."tb_onln_poll_rslt" ADD CONSTRAINT "public"."CONSTRAINT_82" PRIMARY KEY("poll_rslt_id");
CREATE MEMORY TABLE "public"."tb_orgnzt_info"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "ognz_id" CHARACTER VARYING(20) NOT NULL,
    "ognz_nm" CHARACTER VARYING(100) NOT NULL,
    "ognz_expln" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_orgnzt_info" ADD CONSTRAINT "public"."CONSTRAINT_2" PRIMARY KEY("ognz_id");
CREATE MEMORY TABLE "public"."tb_plcy_manage"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "plcy_type_cd" CHARACTER VARYING(30) NOT NULL,
    "plcy_cn" CHARACTER VARYING NOT NULL,
    "plcy_ttl" CHARACTER VARYING(255) NOT NULL
);
ALTER TABLE "public"."tb_plcy_manage" ADD CONSTRAINT "public"."CONSTRAINT_85" PRIMARY KEY("plcy_type_cd");
CREATE MEMORY TABLE "public"."tb_popup_info"(
    "ntce_bgnde" DATE,
    "ntce_endde" DATE,
    "ntce_yn" CHARACTER VARYING(1),
    "stopvew_setup_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "popup_id" CHARACTER VARYING(20) NOT NULL,
    "popup_vrtc_pstn" CHARACTER VARYING(20),
    "popup_vrtc_sz" CHARACTER VARYING(20),
    "popup_wdth_pstn" CHARACTER VARYING(20),
    "popup_wdth_sz" CHARACTER VARYING(20),
    "file_url" CHARACTER VARYING(1024),
    "popup_ttl_nm" CHARACTER VARYING(1024) NOT NULL
);
ALTER TABLE "public"."tb_popup_info" ADD CONSTRAINT "public"."CONSTRAINT_D" PRIMARY KEY("popup_id");
CREATE MEMORY TABLE "public"."tb_prgrm_lst"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "prgrm_file_nm" CHARACTER VARYING(60) NOT NULL,
    "prgrm_korn_nm" CHARACTER VARYING(60),
    "prgrm_strg_path" CHARACTER VARYING(100),
    "url" CHARACTER VARYING(100),
    "prgrm_expln" CHARACTER VARYING(200)
);
ALTER TABLE "public"."tb_prgrm_lst" ADD CONSTRAINT "public"."CONSTRAINT_54" PRIMARY KEY("prgrm_file_nm");
CREATE MEMORY TABLE "public"."tb_privacy_log"(
    "crt_dt" TIMESTAMP(6),
    "inq_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "dmnd_id" CHARACTER VARYING(20) NOT NULL,
    "dmnd_user_id" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "dmnd_user_ip_addr" CHARACTER VARYING(30),
    "inq_info" CHARACTER VARYING(255),
    "srvc_nm" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_privacy_log" ADD CONSTRAINT "public"."CONSTRAINT_DB" PRIMARY KEY("dmnd_id");
CREATE MEMORY TABLE "public"."tb_role_info"(
    "role_crt_ymd" DATE,
    "role_sort" INTEGER,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "role_id" CHARACTER VARYING(50) NOT NULL,
    "role_nm" CHARACTER VARYING(60) NOT NULL,
    "role_type_cd" CHARACTER VARYING(80),
    "role_expln" CHARACTER VARYING(200),
    "role_patrn" CHARACTER VARYING(300)
);
ALTER TABLE "public"."tb_role_info" ADD CONSTRAINT "public"."CONSTRAINT_37" PRIMARY KEY("role_id");
CREATE MEMORY TABLE "public"."tb_rptp_stats"(
    "reprt_sttus" CHARACTER VARYING(1),
    "reprt_type" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "reprt_id" CHARACTER VARYING(20) NOT NULL,
    "reprt_nm" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_rptp_stats" ADD CONSTRAINT "public"."CONSTRAINT_CC" PRIMARY KEY("reprt_id");
CREATE MEMORY TABLE "public"."tb_rward_manage"(
    "confm_yn" CHARACTER VARYING(1),
    "aprv_dt" TIMESTAMP(6),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "atch_file_id" CHARACTER VARYING(20),
    "atrzr_id" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "ifml_atrz_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "rwrd_cd" CHARACTER VARYING(20) NOT NULL,
    "rwrd_id" CHARACTER VARYING(20) NOT NULL,
    "rwrd_user_id" CHARACTER VARYING(20) NOT NULL,
    "rwrd_ymd" CHARACTER VARYING(20),
    "rtn_rsn_cn" CHARACTER VARYING(1000),
    "cntrb_cn" CHARACTER VARYING(2000),
    "rwrd_nm" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_rward_manage" ADD CONSTRAINT "public"."CONSTRAINT_DF" PRIMARY KEY("rwrd_id");
CREATE MEMORY TABLE "public"."tb_srvy_artcl"(
    "etc_ans_yn" CHARACTER VARYING(1),
    "artcl_sn" BIGINT,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "srvy_artcl_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_id" CHARACTER VARYING(20),
    "srvy_qstn_id" CHARACTER VARYING(20),
    "srvy_tmplt_id" CHARACTER VARYING(20),
    "artcl_cn" CHARACTER VARYING(2500)
);
ALTER TABLE "public"."tb_srvy_artcl" ADD CONSTRAINT "public"."CONSTRAINT_93" PRIMARY KEY("srvy_artcl_id");
CREATE MEMORY TABLE "public"."tb_srvy_info"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "srvy_bgng_ymd" CHARACTER VARYING(10),
    "srvy_end_ymd" CHARACTER VARYING(10),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "srvy_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_tmplt_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_prps" CHARACTER VARYING(1000),
    "srvy_trgt" CHARACTER VARYING(1000),
    "srvy_wrt_gd_cn" CHARACTER VARYING(2000),
    "srvy_ttl" CHARACTER VARYING(255) NOT NULL
);
ALTER TABLE "public"."tb_srvy_info" ADD CONSTRAINT "public"."CONSTRAINT_36" PRIMARY KEY("srvy_id");
CREATE MEMORY TABLE "public"."tb_srvy_qstn"(
    "max_chc_cnt" INTEGER,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "qstn_sn" BIGINT,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "qstn_type_cd" CHARACTER VARYING(20),
    "srvy_id" CHARACTER VARYING(20),
    "srvy_qstn_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_tmplt_id" CHARACTER VARYING(20),
    "qstn_cn" CHARACTER VARYING(2500)
);
ALTER TABLE "public"."tb_srvy_qstn" ADD CONSTRAINT "public"."CONSTRAINT_365" PRIMARY KEY("srvy_qstn_id");
CREATE MEMORY TABLE "public"."tb_srvy_rslt"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "srvy_artcl_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_qstn_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_rspns_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_tmplt_id" CHARACTER VARYING(20) NOT NULL,
    "rspns_nm" CHARACTER VARYING(50),
    "etc_ans_cn" CHARACTER VARYING(1000),
    "rspdnt_ans_cn" CHARACTER VARYING(1000)
);
ALTER TABLE "public"."tb_srvy_rslt" ADD CONSTRAINT "public"."CONSTRAINT_365A" PRIMARY KEY("srvy_rspns_id");
CREATE MEMORY TABLE "public"."tb_srvy_rspdnt"(
    "cr_type_cd" CHARACTER VARYING(1),
    "end_telno" CHARACTER VARYING(4),
    "gndr_cd" CHARACTER VARYING(1),
    "mid_telno" CHARACTER VARYING(4),
    "rgn_telno" CHARACTER VARYING(4),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "brdt" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "srvy_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_rspdnt_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_tmplt_id" CHARACTER VARYING(20) NOT NULL,
    "rspdnt_nm" CHARACTER VARYING(50)
);
ALTER TABLE "public"."tb_srvy_rspdnt" ADD CONSTRAINT "public"."CONSTRAINT_87" PRIMARY KEY("srvy_rspdnt_id");
CREATE MEMORY TABLE "public"."tb_srvy_tmplt"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "srvy_tmplt_id" CHARACTER VARYING(20) NOT NULL,
    "srvy_tmplt_path_nm" CHARACTER VARYING(100),
    "srvy_tmplt_type_cd" CHARACTER VARYING(100),
    "srvy_tmplt_expln" CHARACTER VARYING(2000),
    "srvy_tmplt_img_info" BINARY VARYING(255)
);
ALTER TABLE "public"."tb_srvy_tmplt" ADD CONSTRAINT "public"."CONSTRAINT_95" PRIMARY KEY("srvy_tmplt_id");
CREATE MEMORY TABLE "public"."tb_stmp_info"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "crtr_id" CHARACTER VARYING(30),
    "mpng_crt_id" CHARACTER VARYING(30) NOT NULL,
    "mpng_file_nm" CHARACTER VARYING(60),
    "mpng_file_path" CHARACTER VARYING(100)
);
ALTER TABLE "public"."tb_stmp_info" ADD CONSTRAINT "public"."CONSTRAINT_1A" PRIMARY KEY("mpng_crt_id");
CREATE MEMORY TABLE "public"."tb_sys_log"(
    "err_se_cd" CHARACTER VARYING(3),
    "prcs_se_cd" CHARACTER VARYING(3),
    "rspns_cd" CHARACTER VARYING(3),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "prcs_tm" CHARACTER VARYING(14),
    "err_cd" CHARACTER VARYING(15),
    "dmnd_id" CHARACTER VARYING(20) NOT NULL,
    "dmnd_user_id" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "ocrn_ymd" CHARACTER VARYING(20),
    "dmnd_user_ip_addr" CHARACTER VARYING(30),
    "mthd_nm" CHARACTER VARYING(100),
    "srvc_nm" CHARACTER VARYING(255)
);
ALTER TABLE "public"."tb_sys_log" ADD CONSTRAINT "public"."CONSTRAINT_98" PRIMARY KEY("dmnd_id");
CREATE MEMORY TABLE "public"."tb_tmplt_info"(
    "use_yn" CHARACTER VARYING(1),
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "tmplt_id" CHARACTER VARYING(20) NOT NULL,
    "tmplt_se_cd" CHARACTER VARYING(20) NOT NULL,
    "tmplt_path" CHARACTER VARYING(2000),
    "tmplt_nm" CHARACTER VARYING(255) NOT NULL
);
ALTER TABLE "public"."tb_tmplt_info" ADD CONSTRAINT "public"."CONSTRAINT_A7" PRIMARY KEY("tmplt_id");
CREATE MEMORY TABLE "public"."tb_user_absn"(
    "user_absn_yn" CHARACTER VARYING(1) NOT NULL,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "user_id" CHARACTER VARYING(20) NOT NULL
);
ALTER TABLE "public"."tb_user_absn" ADD CONSTRAINT "public"."CONSTRAINT_378" PRIMARY KEY("user_id");
CREATE MEMORY TABLE "public"."tb_user_authrt_map"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "mbr_type_cd" CHARACTER VARYING(15),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "scrty_dcsn_trgt_id" CHARACTER VARYING(20) NOT NULL,
    "authrt_id" CHARACTER VARYING(30) NOT NULL
);
ALTER TABLE "public"."tb_user_authrt_map" ADD CONSTRAINT "public"."CONSTRAINT_A3" PRIMARY KEY("scrty_dcsn_trgt_id");
CREATE MEMORY TABLE "public"."tb_user_info"(
    "area_no" CHARACTER VARYING(4),
    "chg_pwd_cnt" INTEGER,
    "end_telno" CHARACTER VARYING(4),
    "lck_cnt" INTEGER,
    "lck_yn" CHARACTER VARYING(1),
    "middle_telno" CHARACTER VARYING(4),
    "zip" CHARACTER VARYING(5),
    "brth_ymd" CHARACTER VARYING(8),
    "chg_pswd_last_dt" TIMESTAMP(6),
    "crt_dt" TIMESTAMP(6),
    "lck_last_pnttm" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "pstinst_cd" CHARACTER VARYING(8),
    "sbscrb_ymd" CHARACTER VARYING(8),
    "bizr_no" CHARACTER VARYING(10),
    "user_type_cd" CHARACTER VARYING(10) NOT NULL,
    "mbl_telno" CHARACTER VARYING(11),
    "jurir_no" CHARACTER VARYING(13),
    "ent_se_cd" CHARACTER VARYING(15),
    "induty_cd" CHARACTER VARYING(15),
    "empl_no" CHARACTER VARYING(20),
    "esntl_id" CHARACTER VARYING(20) NOT NULL,
    "fax_no" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "group_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "office_telno" CHARACTER VARYING(20),
    "ognz_id" CHARACTER VARYING(20),
    "gndr_cd" CHARACTER VARYING(30),
    "user_id" CHARACTER VARYING(30) NOT NULL,
    "user_stts_cd" CHARACTER VARYING(30),
    "otp_secret" CHARACTER VARYING(32),
    "cmpny_nm" CHARACTER VARYING(50),
    "rprsv_nm" CHARACTER VARYING(50),
    "ofcps_nm" CHARACTER VARYING(60),
    "crtfc_dn_value" CHARACTER VARYING(100),
    "base_addr" CHARACTER VARYING(300),
    "dtl_addr" CHARACTER VARYING(300),
    "eml_addr" CHARACTER VARYING(300),
    "pswd" CHARACTER VARYING(300) NOT NULL,
    "pswd_cnsr" CHARACTER VARYING(300),
    "pswd_hint" CHARACTER VARYING(300),
    "user_nm" CHARACTER VARYING(300) NOT NULL,
    "rrno" CHARACTER VARYING(600),
    "role" ENUM('ADMIN', 'USER')
);
ALTER TABLE "public"."tb_user_info" ADD CONSTRAINT "public"."CONSTRAINT_37843" PRIMARY KEY("esntl_id");
CREATE MEMORY TABLE "public"."tb_user_log"(
    "crt_cnt" INTEGER,
    "del_cnt" INTEGER,
    "err_cnt" INTEGER,
    "inq_cnt" INTEGER,
    "mdfcn_cnt" INTEGER,
    "otpt_cnt" INTEGER,
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "dmnd_user_id" CHARACTER VARYING(20) NOT NULL,
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "ocrn_ymd" CHARACTER VARYING(20) NOT NULL,
    "mthd_nm" CHARACTER VARYING(60) NOT NULL,
    "srvc_nm" CHARACTER VARYING(255) NOT NULL
);
ALTER TABLE "public"."tb_user_log" ADD CONSTRAINT "public"."CONSTRAINT_F1" PRIMARY KEY("dmnd_user_id", "ocrn_ymd", "mthd_nm", "srvc_nm");
CREATE MEMORY TABLE "public"."tb_web_log"(
    "crt_dt" TIMESTAMP(6),
    "mdfcn_dt" TIMESTAMP(6),
    "occr_ymd" CHARACTER VARYING(8),
    "dmnd_id" CHARACTER VARYING(20) NOT NULL,
    "dmnd_user_id" CHARACTER VARYING(20),
    "frst_rgtr_id" CHARACTER VARYING(20),
    "last_mdfr_id" CHARACTER VARYING(20),
    "dmnd_user_ip_addr" CHARACTER VARYING(30),
    "url" CHARACTER VARYING(200)
);
ALTER TABLE "public"."tb_web_log" ADD CONSTRAINT "public"."CONSTRAINT_48F" PRIMARY KEY("dmnd_id");
ALTER TABLE "public"."tb_auth_rfsh_tk" ADD CONSTRAINT "public"."CONSTRAINT_6" UNIQUE NULLS DISTINCT ("rfsh_tkn");
ALTER TABLE "public"."tb_user_info" ADD CONSTRAINT "public"."CONSTRAINT_3784" UNIQUE NULLS DISTINCT ("user_id");
ALTER TABLE "public"."tb_user_log" ADD CONSTRAINT "public"."fk6u6stdrfaxn9r39jr7u5r9b7c" FOREIGN KEY("dmnd_user_id") REFERENCES "public"."tb_user_info"("esntl_id") NOCHECK;
ALTER TABLE "public"."tb_onln_poll_artcl" ADD CONSTRAINT "public"."fkjf35a71r79nlyi01uxn276uba" FOREIGN KEY("poll_id") REFERENCES "public"."tb_onln_poll_manage"("poll_id") NOCHECK;
ALTER TABLE "public"."tb_extrl_hr_info" ADD CONSTRAINT "public"."fk4dscnoevdsp086t316dv0em8w" FOREIGN KEY("evnt_id") REFERENCES "public"."tb_event_info"("evnt_id") NOCHECK;
