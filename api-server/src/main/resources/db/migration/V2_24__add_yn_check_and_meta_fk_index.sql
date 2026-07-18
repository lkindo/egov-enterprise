-- V2_24: _yn 불리언 컬럼 도메인 CHECK(값 무결성) + meta_standard_terms.domain_name FK 인덱스
--
-- [근거] 앱 레이어(서비스)에만 존재하던 Y/N 불변식을 DB CHECK 로 집행(quality-score §1.1 cap "CHECK 제약 0" 해소).
--        CHECK (col IN ('Y','N')) 는 NULL 을 UNKNOWN 으로 통과시키므로 NULL 허용 컬럼도 안전(기존 데이터 무손상).
-- [실측] tb_ 테이블의 varchar _yn 컬럼 60개 중, tb_menu_info.route_mdfcn_yn(값 '2' 저장 = _yn 오명명, 별도 데이터모델
--        정정 대상)만 제외한 59개는 비-NULL 값이 전부 Y/N(위반 0, 동적 UNION 검사 실측). route_mdfcn_yn 은
--        본 CHECK 대상에서 제외한다.
-- [무중단] ADD CONSTRAINT CHECK / CREATE INDEX 는 ZeroDowntimeMigrationLinterTest 비대상(DROP/ALTER TYPE/RENAME/
--        NOT NULL-no-default 만 차단). 대상 테이블이 소규모(수백 행)라 검증 lock 은 무시가능. additive·롤포워드 안전.

ALTER TABLE tb_adbk_manage ADD CONSTRAINT ck_tb_adbk_manage_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_admdst_cd ADD CONSTRAINT ck_tb_admdst_cd_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_bbs_comment ADD CONSTRAINT ck_tb_bbs_comment_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_bbs_item ADD CONSTRAINT ck_tb_bbs_item_ans_yn CHECK (ans_yn IN ('Y','N'));
ALTER TABLE tb_bbs_item ADD CONSTRAINT ck_tb_bbs_item_ntc_yn CHECK (ntc_yn IN ('Y','N'));
ALTER TABLE tb_bbs_item ADD CONSTRAINT ck_tb_bbs_item_scrt_yn CHECK (scrt_yn IN ('Y','N'));
ALTER TABLE tb_bbs_item ADD CONSTRAINT ck_tb_bbs_item_ttl_bold_yn CHECK (ttl_bold_yn IN ('Y','N'));
ALTER TABLE tb_bbs_item ADD CONSTRAINT ck_tb_bbs_item_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_ans_psblty_yn CHECK (ans_psblty_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_ans_yn CHECK (ans_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_blog_yn CHECK (blog_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_file_atch_psblty_yn CHECK (file_atch_psblty_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_stsfdg_yn CHECK (stsfdg_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master_optn ADD CONSTRAINT ck_tb_bbs_master_optn_ans_yn CHECK (ans_yn IN ('Y','N'));
ALTER TABLE tb_bbs_master_optn ADD CONSTRAINT ck_tb_bbs_master_optn_stsfdg_yn CHECK (stsfdg_yn IN ('Y','N'));
ALTER TABLE tb_bbs_scrap ADD CONSTRAINT ck_tb_bbs_scrap_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_bbs_use_info ADD CONSTRAINT ck_tb_bbs_use_info_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_blog_info ADD CONSTRAINT ck_tb_blog_info_blog_yn CHECK (blog_yn IN ('Y','N'));
ALTER TABLE tb_blog_info ADD CONSTRAINT ck_tb_blog_info_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_blog_user_map ADD CONSTRAINT ck_tb_blog_user_map_mngr_yn CHECK (mngr_yn IN ('Y','N'));
ALTER TABLE tb_blog_user_map ADD CONSTRAINT ck_tb_blog_user_map_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_bnr_info ADD CONSTRAINT ck_tb_bnr_info_rflt_yn CHECK (rflt_yn IN ('Y','N'));
ALTER TABLE tb_cmnty_info ADD CONSTRAINT ck_tb_cmnty_info_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_cmnty_user_map ADD CONSTRAINT ck_tb_cmnty_user_map_mngr_yn CHECK (mngr_yn IN ('Y','N'));
ALTER TABLE tb_cmnty_user_map ADD CONSTRAINT ck_tb_cmnty_user_map_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_com_cd ADD CONSTRAINT ck_tb_com_cd_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_com_clsf_cd ADD CONSTRAINT ck_tb_com_clsf_cd_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_com_dtl_cd ADD CONSTRAINT ck_tb_com_dtl_cd_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_dgstfn_info ADD CONSTRAINT ck_tb_dgstfn_info_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_dscsn_list ADD CONSTRAINT ck_tb_dscsn_list_eml_ans_yn CHECK (eml_ans_yn IN ('Y','N'));
ALTER TABLE tb_dscsn_list ADD CONSTRAINT ck_tb_dscsn_list_rls_yn CHECK (rls_yn IN ('Y','N'));
ALTER TABLE tb_event_info ADD CONSTRAINT ck_tb_event_info_evnt_aprv_yn CHECK (evnt_aprv_yn IN ('Y','N'));
ALTER TABLE tb_file_master ADD CONSTRAINT ck_tb_file_master_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_ifml_atrz_info ADD CONSTRAINT ck_tb_ifml_atrz_info_aprv_yn CHECK (aprv_yn IN ('Y','N'));
ALTER TABLE tb_indv_pg_conts ADD CONSTRAINT ck_tb_indv_pg_conts_cntnts_use_yn CHECK (cntnts_use_yn IN ('Y','N'));
ALTER TABLE tb_inst_cd ADD CONSTRAINT ck_tb_inst_cd_abl_yn CHECK (abl_yn IN ('Y','N'));
ALTER TABLE tb_inst_cd_rcptn_log ADD CONSTRAINT ck_tb_inst_cd_rcptn_log_abl_yn CHECK (abl_yn IN ('Y','N'));
ALTER TABLE tb_intrn_svc ADD CONSTRAINT ck_tb_intrn_svc_rflt_yn CHECK (rflt_yn IN ('Y','N'));
ALTER TABLE tb_login_log ADD CONSTRAINT ck_tb_login_log_err_ocrn_yn CHECK (err_ocrn_yn IN ('Y','N'));
ALTER TABLE tb_login_policy ADD CONSTRAINT ck_tb_login_policy_dpcn_prm_yn CHECK (dpcn_prm_yn IN ('Y','N'));
ALTER TABLE tb_login_policy ADD CONSTRAINT ck_tb_login_policy_lmt_yn CHECK (lmt_yn IN ('Y','N'));
ALTER TABLE tb_login_policy ADD CONSTRAINT ck_tb_login_policy_otp_use_yn CHECK (otp_use_yn IN ('Y','N'));
ALTER TABLE tb_main_image ADD CONSTRAINT ck_tb_main_image_rflt_yn CHECK (rflt_yn IN ('Y','N'));
ALTER TABLE tb_menu_info ADD CONSTRAINT ck_tb_menu_info_del_yn CHECK (del_yn IN ('Y','N'));
ALTER TABLE tb_menu_info ADD CONSTRAINT ck_tb_menu_info_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_note_rcptn ADD CONSTRAINT ck_tb_note_rcptn_del_yn CHECK (del_yn IN ('Y','N'));
ALTER TABLE tb_note_rcptn ADD CONSTRAINT ck_tb_note_rcptn_open_yn CHECK (open_yn IN ('Y','N'));
ALTER TABLE tb_note_sndng ADD CONSTRAINT ck_tb_note_sndng_del_yn CHECK (del_yn IN ('Y','N'));
ALTER TABLE tb_onln_poll_manage ADD CONSTRAINT ck_tb_onln_poll_manage_poll_atmc_dsuse_yn CHECK (poll_atmc_dsuse_yn IN ('Y','N'));
ALTER TABLE tb_onln_poll_manage ADD CONSTRAINT ck_tb_onln_poll_manage_poll_dsuse_yn CHECK (poll_dsuse_yn IN ('Y','N'));
ALTER TABLE tb_popup_info ADD CONSTRAINT ck_tb_popup_info_ntce_yn CHECK (ntce_yn IN ('Y','N'));
ALTER TABLE tb_popup_info ADD CONSTRAINT ck_tb_popup_info_stopvew_setup_yn CHECK (stopvew_setup_yn IN ('Y','N'));
ALTER TABLE tb_rward_manage ADD CONSTRAINT ck_tb_rward_manage_confm_yn CHECK (confm_yn IN ('Y','N'));
ALTER TABLE tb_srvy_artcl ADD CONSTRAINT ck_tb_srvy_artcl_etc_ans_yn CHECK (etc_ans_yn IN ('Y','N'));
ALTER TABLE tb_tmplt_info ADD CONSTRAINT ck_tb_tmplt_info_use_yn CHECK (use_yn IN ('Y','N'));
ALTER TABLE tb_user_absn ADD CONSTRAINT ck_tb_user_absn_user_absn_yn CHECK (user_absn_yn IN ('Y','N'));
ALTER TABLE tb_user_info ADD CONSTRAINT ck_tb_user_info_lck_yn CHECK (lck_yn IN ('Y','N'));
ALTER TABLE tb_user_noti ADD CONSTRAINT ck_tb_user_noti_read_yn CHECK (read_yn IN ('Y','N'));

-- FK 지원 인덱스: meta_standard_terms.domain_name → meta_standard_domains (전 FK 중 유일한 미인덱스 갭,
-- 13,173행 도메인 조인 + UniqueConstraintMirrorLinter 조회의 seq-scan 제거).
CREATE INDEX ix_meta_standard_terms_domain_name ON meta_standard_terms (domain_name);
