-- eGov Enterprise DB & Table & Column Comments DDL Script
-- Generated based on standard meta words and terms
-- Date: 2026-05-22T10:01:16.763Z

-- ========================================================
-- TABLE COMMENTS
-- ========================================================
COMMENT ON TABLE tb_adbk_info IS '주소록정보 (tb_adbk_info)';
COMMENT ON TABLE tb_adbk_manage IS '주소록관리 (tb_adbk_manage)';
COMMENT ON TABLE tb_admdst_cd IS '행정구역코드 (tb_admdst_cd)';
COMMENT ON TABLE tb_admdst_cd_rcptn_log IS '행정구역코드수신로그 (tb_admdst_cd_rcptn_log)';
COMMENT ON TABLE tb_auth_rfsh_tk IS '권한리프레시토큰 (tb_auth_rfsh_tk)';
COMMENT ON TABLE tb_authrt_group_info IS '권한그룹정보 (tb_authrt_group_info)';
COMMENT ON TABLE tb_authrt_info IS '권한정보 (tb_authrt_info)';
COMMENT ON TABLE tb_authrt_role_map IS '권한역할매핑 (tb_authrt_role_map)';
COMMENT ON TABLE tb_bbs_comment IS '게시판댓글 (tb_bbs_comment)';
COMMENT ON TABLE tb_bbs_item IS '게시판품목 (tb_bbs_item)';
COMMENT ON TABLE tb_bbs_master IS '게시판마스터 (tb_bbs_master)';
COMMENT ON TABLE tb_bbs_master_optn IS '게시판마스터옵션 (tb_bbs_master_optn)';
COMMENT ON TABLE tb_bbs_scrap IS '게시판스크랩 (tb_bbs_scrap)';
COMMENT ON TABLE tb_bbs_stats IS '게시판통계 (tb_bbs_stats)';
COMMENT ON TABLE tb_bbs_use_info IS '게시판사용정보 (tb_bbs_use_info)';
COMMENT ON TABLE tb_bkmk_menu_mng_rslt IS '즐겨찾기메뉴관리결과 (tb_bkmk_menu_mng_rslt)';
COMMENT ON TABLE tb_blog_info IS '블로그정보 (tb_blog_info)';
COMMENT ON TABLE tb_blog_user_map IS '블로그사용자매핑 (tb_blog_user_map)';
COMMENT ON TABLE tb_bnr_info IS '배너정보 (tb_bnr_info)';
COMMENT ON TABLE tb_club_info IS '동호회정보 (tb_club_info)';
COMMENT ON TABLE tb_club_user_map IS '동호회사용자매핑 (tb_club_user_map)';
COMMENT ON TABLE tb_cmnty_info IS '커뮤니티정보 (tb_cmnty_info)';
COMMENT ON TABLE tb_cmnty_user_map IS '커뮤니티사용자매핑 (tb_cmnty_user_map)';
COMMENT ON TABLE tb_com_cd IS '공통코드 (tb_com_cd)';
COMMENT ON TABLE tb_com_clsf_cd IS '공통분류코드 (tb_com_clsf_cd)';
COMMENT ON TABLE tb_com_dtl_cd IS '공통상세코드 (tb_com_dtl_cd)';
COMMENT ON TABLE tb_dept_job_bx IS '부서작업보관함 (tb_dept_job_bx)';
COMMENT ON TABLE tb_dept_task_info IS '부서업무정보 (tb_dept_task_info)';
COMMENT ON TABLE tb_dgstfn_info IS '만족도정보 (tb_dgstfn_info)';
COMMENT ON TABLE tb_diary_info IS '일기정보 (tb_diary_info)';
COMMENT ON TABLE tb_dscsn_list IS '상담목록 (tb_dscsn_list)';
COMMENT ON TABLE tb_dscsn_manage IS '상담관리 (tb_dscsn_manage)';
COMMENT ON TABLE tb_dta_use_stats IS '자료사용통계 (tb_dta_use_stats)';
COMMENT ON TABLE tb_email_dsptch_manage IS '이메일발신관리 (tb_email_dsptch_manage)';
COMMENT ON TABLE tb_event_info IS '이벤트정보 (tb_event_info)';
COMMENT ON TABLE tb_extrl_hr_info IS '외부시간정보 (tb_extrl_hr_info)';
COMMENT ON TABLE tb_faq_info IS 'FAQ정보 (tb_faq_info)';
COMMENT ON TABLE tb_file_detail IS '파일상세 (tb_file_detail)';
COMMENT ON TABLE tb_file_master IS '파일마스터 (tb_file_master)';
COMMENT ON TABLE tb_hldy_info IS '휴일정보 (tb_hldy_info)';
COMMENT ON TABLE tb_hlp_info IS '도움말정보 (tb_hlp_info)';
COMMENT ON TABLE tb_ifml_atrz_info IS '비공식결재정보 (tb_ifml_atrz_info)';
COMMENT ON TABLE tb_indv_pg IS '개인PG (tb_indv_pg)';
COMMENT ON TABLE tb_indv_pg_conts IS '개인PG콘텐츠 (tb_indv_pg_conts)';
COMMENT ON TABLE tb_indv_pg_set IS '개인PG설정 (tb_indv_pg_set)';
COMMENT ON TABLE tb_inst_cd IS '기관코드 (tb_inst_cd)';
COMMENT ON TABLE tb_inst_cd_rcptn_log IS '기관코드수신로그 (tb_inst_cd_rcptn_log)';
COMMENT ON TABLE tb_intrn_svc IS '인턴봉사 (tb_intrn_svc)';
COMMENT ON TABLE tb_leader_schdl IS '리더일정 (tb_leader_schdl)';
COMMENT ON TABLE tb_leader_schdl_dtl IS '리더일정상세 (tb_leader_schdl_dtl)';
COMMENT ON TABLE tb_leader_stts IS '리더상태 (tb_leader_stts)';
COMMENT ON TABLE tb_login_log IS '로그인로그 (tb_login_log)';
COMMENT ON TABLE tb_login_policy IS '로그인정책 (tb_login_policy)';
COMMENT ON TABLE tb_main_image IS '주요이미지 (tb_main_image)';
COMMENT ON TABLE tb_memo_rpt_info IS '메모보고정보 (tb_memo_rpt_info)';
COMMENT ON TABLE tb_memo_todo_info IS '메모할일정보 (tb_memo_todo_info)';
COMMENT ON TABLE tb_menu_crt_dtl IS '메뉴생성상세 (tb_menu_crt_dtl)';
COMMENT ON TABLE tb_menu_info IS '메뉴정보 (tb_menu_info)';
COMMENT ON TABLE tb_note_info IS '쪽지정보 (tb_note_info)';
COMMENT ON TABLE tb_note_rcptn IS '쪽지수신 (tb_note_rcptn)';
COMMENT ON TABLE tb_note_sndng IS '쪽지발송 (tb_note_sndng)';
COMMENT ON TABLE tb_noti_info IS '알림정보 (tb_noti_info)';
COMMENT ON TABLE tb_onln_mnl_info IS '온라인매뉴얼정보 (tb_onln_mnl_info)';
COMMENT ON TABLE tb_onln_poll_artcl IS '온라인여론조사항목 (tb_onln_poll_artcl)';
COMMENT ON TABLE tb_onln_poll_manage IS '온라인여론조사관리 (tb_onln_poll_manage)';
COMMENT ON TABLE tb_onln_poll_rslt IS '온라인여론조사결과 (tb_onln_poll_rslt)';
COMMENT ON TABLE tb_orgnzt_info IS '조직정보 (tb_orgnzt_info)';
COMMENT ON TABLE tb_plcy_manage IS '정책관리 (tb_plcy_manage)';
COMMENT ON TABLE tb_popup_info IS '팝업정보 (tb_popup_info)';
COMMENT ON TABLE tb_prgrm_lst IS '프로그램목록 (tb_prgrm_lst)';
COMMENT ON TABLE tb_privacy_log IS '개인정보로그 (tb_privacy_log)';
COMMENT ON TABLE tb_role_info IS '역할정보 (tb_role_info)';
COMMENT ON TABLE tb_role_lyr IS '역할계층 (tb_role_lyr)';
COMMENT ON TABLE tb_rpt_info IS '보고정보 (tb_rpt_info)';
COMMENT ON TABLE tb_rptp_stats IS '보고서통계 (tb_rptp_stats)';
COMMENT ON TABLE tb_rward_manage IS '포상관리 (tb_rward_manage)';
COMMENT ON TABLE tb_schdl_info IS '일정정보 (tb_schdl_info)';
COMMENT ON TABLE tb_sms_info IS 'SMS정보 (tb_sms_info)';
COMMENT ON TABLE tb_sms_rcptn IS 'SMS수신 (tb_sms_rcptn)';
COMMENT ON TABLE tb_srvy_artcl IS '설문항목 (tb_srvy_artcl)';
COMMENT ON TABLE tb_srvy_info IS '설문정보 (tb_srvy_info)';
COMMENT ON TABLE tb_srvy_qstn IS '설문질문 (tb_srvy_qstn)';
COMMENT ON TABLE tb_srvy_rslt IS '설문결과 (tb_srvy_rslt)';
COMMENT ON TABLE tb_srvy_rspdnt IS '설문응답자 (tb_srvy_rspdnt)';
COMMENT ON TABLE tb_srvy_tmplt IS '설문서식 (tb_srvy_tmplt)';
COMMENT ON TABLE tb_stmp_info IS '도장정보 (tb_stmp_info)';
COMMENT ON TABLE tb_sys_log IS '시스템로그 (tb_sys_log)';
COMMENT ON TABLE tb_tmplt_info IS '서식정보 (tb_tmplt_info)';
COMMENT ON TABLE tb_user_absn IS '사용자부재 (tb_user_absn)';
COMMENT ON TABLE tb_user_authrt_map IS '사용자권한매핑 (tb_user_authrt_map)';
COMMENT ON TABLE tb_user_info IS '사용자정보 (tb_user_info)';
COMMENT ON TABLE tb_user_log IS '사용자로그 (tb_user_log)';
COMMENT ON TABLE tb_user_mdfcn_dtls IS '사용자수정상세 (tb_user_mdfcn_dtls)';
COMMENT ON TABLE tb_user_noti IS '사용자알림 (tb_user_noti)';
COMMENT ON TABLE tb_web_log IS '웹로그 (tb_web_log)';


-- ========================================================
-- COLUMN COMMENTS
-- ========================================================

-- Comments for tb_adbk_info
COMMENT ON COLUMN tb_adbk_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_adbk_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_adbk_info.adbk_constnt_id IS '주소록상수아이디 (adbk_constnt_id)';
COMMENT ON COLUMN tb_adbk_info.adbk_id IS '주소록아이디 (adbk_id)';
COMMENT ON COLUMN tb_adbk_info.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_adbk_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_adbk_info.fax_no IS '팩스번호 (fax_no)';
COMMENT ON COLUMN tb_adbk_info.home_telno IS '자택전화번호 (home_telno)';
COMMENT ON COLUMN tb_adbk_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_adbk_info.mbl_telno IS '휴대전화번호 (mbl_telno)';
COMMENT ON COLUMN tb_adbk_info.ofc_telno IS '사무실전화번호 (ofc_telno)';
COMMENT ON COLUMN tb_adbk_info.eml_addr IS '이메일주소 (eml_addr)';
COMMENT ON COLUMN tb_adbk_info.nm IS '명 (nm)';

-- Comments for tb_adbk_manage
COMMENT ON COLUMN tb_adbk_manage.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_adbk_manage.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_adbk_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_adbk_manage.adbk_id IS '주소록아이디 (adbk_id)';
COMMENT ON COLUMN tb_adbk_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_adbk_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_adbk_manage.rls_scope_cd IS '공개범위코드 (rls_scope_cd)';
COMMENT ON COLUMN tb_adbk_manage.trget_orgnzt_id IS '대상조직아이디 (trget_orgnzt_id)';
COMMENT ON COLUMN tb_adbk_manage.wrter_id IS '작성자아이디 (wrter_id)';
COMMENT ON COLUMN tb_adbk_manage.adbk_nm IS '주소록명 (adbk_nm)';

-- Comments for tb_admdst_cd
COMMENT ON COLUMN tb_admdst_cd.admdst_cd IS '행정구역코드 (admdst_cd)';
COMMENT ON COLUMN tb_admdst_cd.up_admdst_cd IS '상위행정구역코드 (up_admdst_cd)';
COMMENT ON COLUMN tb_admdst_cd.admdst_se_cd IS '행정구역구분코드 (admdst_se_cd)';
COMMENT ON COLUMN tb_admdst_cd.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_admdst_cd.crt_ymd IS '생성일자 (crt_ymd)';
COMMENT ON COLUMN tb_admdst_cd.abl_ymd IS '폐지일자 (abl_ymd)';
COMMENT ON COLUMN tb_admdst_cd.admdst_zone_nm IS '행정구역구역명 (admdst_zone_nm)';
COMMENT ON COLUMN tb_admdst_cd.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_admdst_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_admdst_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_admdst_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_admdst_cd_rcptn_log
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_zone_se_cd IS '행정구역구역구분코드 (admdst_zone_se_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_cd IS '행정구역코드 (admdst_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.opert_sn IS '운영일련번호 (opert_sn)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.change_se_cd IS '변경구분코드 (change_se_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.proc_se_cd IS '프로세스구분코드 (proc_se_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_zone_nm IS '행정구역구역명 (admdst_zone_nm)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.lwst_admdst_zone_nm IS '최저행정구역구역명 (lwst_admdst_zone_nm)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.ctprvn_cd IS '시도코드 (ctprvn_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.signgu_cd IS '시군구코드 (signgu_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.emd_cd IS '읍면동코드 (emd_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.li_cd IS '리코드 (li_cd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.crt_ymd IS '생성일자 (crt_ymd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.abl_ymd IS '폐지일자 (abl_ymd)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.abl_yn IS '폐지여부 (abl_yn)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_auth_rfsh_tk
COMMENT ON COLUMN tb_auth_rfsh_tk.exprtn_dt IS '만료일시 (exprtn_dt)';
COMMENT ON COLUMN tb_auth_rfsh_tk.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_auth_rfsh_tk.rfsh_tkn IS '리프레시토큰 (rfsh_tkn)';
COMMENT ON COLUMN tb_auth_rfsh_tk.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_auth_rfsh_tk.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_auth_rfsh_tk.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_auth_rfsh_tk.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_authrt_group_info
COMMENT ON COLUMN tb_authrt_group_info.group_id IS '그룹아이디 (group_id)';
COMMENT ON COLUMN tb_authrt_group_info.group_nm IS '그룹명 (group_nm)';
COMMENT ON COLUMN tb_authrt_group_info.group_dc IS '그룹설명 (group_dc)';
COMMENT ON COLUMN tb_authrt_group_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_authrt_group_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_authrt_group_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_authrt_group_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_authrt_group_info.group_crt_ymd IS '그룹생성일자 (group_crt_ymd)';

-- Comments for tb_authrt_info
COMMENT ON COLUMN tb_authrt_info.authrt_cd IS '권한코드 (authrt_cd)';
COMMENT ON COLUMN tb_authrt_info.authrt_nm IS '권한명 (authrt_nm)';
COMMENT ON COLUMN tb_authrt_info.authrt_expln IS '권한설명 (authrt_expln)';
COMMENT ON COLUMN tb_authrt_info.authrt_crt_ymd IS '권한생성일자 (authrt_crt_ymd)';
COMMENT ON COLUMN tb_authrt_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_authrt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_authrt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_authrt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_authrt_role_map
COMMENT ON COLUMN tb_authrt_role_map.authrt_cd IS '권한코드 (authrt_cd)';
COMMENT ON COLUMN tb_authrt_role_map.role_cd IS '역할코드 (role_cd)';
COMMENT ON COLUMN tb_authrt_role_map.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_authrt_role_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_authrt_role_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_authrt_role_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_bbs_comment
COMMENT ON COLUMN tb_bbs_comment.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_bbs_comment.ans_sn IS '답변일련번호 (ans_sn)';
COMMENT ON COLUMN tb_bbs_comment.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bbs_comment.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bbs_comment.pst_id IS '게시물아이디 (pst_id)';
COMMENT ON COLUMN tb_bbs_comment.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_bbs_comment.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bbs_comment.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_bbs_comment.wrter_id IS '작성자아이디 (wrter_id)';
COMMENT ON COLUMN tb_bbs_comment.wrter_nm IS '작성자명 (wrter_nm)';
COMMENT ON COLUMN tb_bbs_comment.pswd IS '비밀번호 (pswd)';
COMMENT ON COLUMN tb_bbs_comment.ans_cn IS '답변내용 (ans_cn)';

-- Comments for tb_bbs_item
COMMENT ON COLUMN tb_bbs_item.ans_yn IS '답변여부 (ans_yn)';
COMMENT ON COLUMN tb_bbs_item.ans_lvl IS '답변레벨 (ans_lvl)';
COMMENT ON COLUMN tb_bbs_item.cmnt_cnt IS '댓글수 (cmnt_cnt)';
COMMENT ON COLUMN tb_bbs_item.file_cnt IS '파일수 (file_cnt)';
COMMENT ON COLUMN tb_bbs_item.ntc_yn IS '공지여부 (ntc_yn)';
COMMENT ON COLUMN tb_bbs_item.inq_cnt IS '조회수 (inq_cnt)';
COMMENT ON COLUMN tb_bbs_item.scrt_yn IS '증권여부 (scrt_yn)';
COMMENT ON COLUMN tb_bbs_item.ttl_bold_yn IS '제목볼드여부 (ttl_bold_yn)';
COMMENT ON COLUMN tb_bbs_item.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_bbs_item.evnt_dt IS '행사일시 (evnt_dt)';
COMMENT ON COLUMN tb_bbs_item.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bbs_item.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bbs_item.pst_id IS '게시물아이디 (pst_id)';
COMMENT ON COLUMN tb_bbs_item.ans_sn IS '답변일련번호 (ans_sn)';
COMMENT ON COLUMN tb_bbs_item.up_pst_id IS '상위게시물아이디 (up_pst_id)';
COMMENT ON COLUMN tb_bbs_item.sort_ordr IS '정렬주문 (sort_ordr)';
COMMENT ON COLUMN tb_bbs_item.qna_stts_cd IS '질의응답상태코드 (qna_stts_cd)';
COMMENT ON COLUMN tb_bbs_item.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_bbs_item.blog_id IS '블로그아이디 (blog_id)';
COMMENT ON COLUMN tb_bbs_item.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bbs_item.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_bbs_item.pst_bgng_ymd IS '게시물시작일자 (pst_bgng_ymd)';
COMMENT ON COLUMN tb_bbs_item.pst_end_ymd IS '게시물종료일자 (pst_end_ymd)';
COMMENT ON COLUMN tb_bbs_item.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_bbs_item.user_nm IS '사용자명 (user_nm)';
COMMENT ON COLUMN tb_bbs_item.qna_cat_cd IS '질의응답카테고리코드 (qna_cat_cd)';
COMMENT ON COLUMN tb_bbs_item.pswd IS '비밀번호 (pswd)';
COMMENT ON COLUMN tb_bbs_item.pst_ttl IS '게시물제목 (pst_ttl)';
COMMENT ON COLUMN tb_bbs_item.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_bbs_item.pst_cn IS '게시물내용 (pst_cn)';
COMMENT ON COLUMN tb_bbs_item.like_cnt IS '추천수 (like_cnt)';

-- Comments for tb_bbs_master
COMMENT ON COLUMN tb_bbs_master.atch_psblty_file_qty IS '첨부가능파일수량 (atch_psblty_file_qty)';
COMMENT ON COLUMN tb_bbs_master.blog_yn IS '블로그여부 (blog_yn)';
COMMENT ON COLUMN tb_bbs_master.file_atch_psblty_yn IS '파일첨부가능여부 (file_atch_psblty_yn)';
COMMENT ON COLUMN tb_bbs_master.ans_psblty_yn IS '답변가능여부 (ans_psblty_yn)';
COMMENT ON COLUMN tb_bbs_master.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_bbs_master.bbs_atrb_cd IS '게시판속성코드 (bbs_atrb_cd)';
COMMENT ON COLUMN tb_bbs_master.bbs_type_cd IS '게시판유형코드 (bbs_type_cd)';
COMMENT ON COLUMN tb_bbs_master.atch_psblty_file_sz IS '첨부가능파일크기 (atch_psblty_file_sz)';
COMMENT ON COLUMN tb_bbs_master.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bbs_master.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bbs_master.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_bbs_master.blog_id IS '블로그아이디 (blog_id)';
COMMENT ON COLUMN tb_bbs_master.cmnty_id IS '커뮤니티아이디 (cmnty_id)';
COMMENT ON COLUMN tb_bbs_master.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bbs_master.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_bbs_master.tmplt_id IS '서식아이디 (tmplt_id)';
COMMENT ON COLUMN tb_bbs_master.bbs_ttl IS '게시판제목 (bbs_ttl)';
COMMENT ON COLUMN tb_bbs_master.bbs_expln IS '게시판설명 (bbs_expln)';

-- Comments for tb_bbs_master_optn
COMMENT ON COLUMN tb_bbs_master_optn.ans_yn IS '답변여부 (ans_yn)';
COMMENT ON COLUMN tb_bbs_master_optn.stsfdg_yn IS '만족도여부 (stsfdg_yn)';
COMMENT ON COLUMN tb_bbs_master_optn.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bbs_master_optn.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bbs_master_optn.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_bbs_master_optn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bbs_master_optn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_bbs_scrap
COMMENT ON COLUMN tb_bbs_scrap.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_bbs_scrap.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bbs_scrap.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bbs_scrap.pst_id IS '게시물아이디 (pst_id)';
COMMENT ON COLUMN tb_bbs_scrap.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_bbs_scrap.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bbs_scrap.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_bbs_scrap.scrap_id IS '스크랩아이디 (scrap_id)';
COMMENT ON COLUMN tb_bbs_scrap.scrap_nm IS '스크랩명 (scrap_nm)';
COMMENT ON COLUMN tb_bbs_scrap.scrap_expln IS '스크랩설명 (scrap_expln)';
COMMENT ON COLUMN tb_bbs_scrap.scrap_url IS '스크랩URL (scrap_url)';

-- Comments for tb_bbs_stats
COMMENT ON COLUMN tb_bbs_stats.stats_id IS '통계아이디 (stats_id)';
COMMENT ON COLUMN tb_bbs_stats.pst_cnt IS '게시물수 (pst_cnt)';
COMMENT ON COLUMN tb_bbs_stats.avg_inq_cnt IS '평균조회수 (avg_inq_cnt)';
COMMENT ON COLUMN tb_bbs_stats.max_inq_cnt IS '최대조회수 (max_inq_cnt)';
COMMENT ON COLUMN tb_bbs_stats.min_inq_cnt IS '최소조회수 (min_inq_cnt)';
COMMENT ON COLUMN tb_bbs_stats.top_user_id IS '상위사용자아이디 (top_user_id)';
COMMENT ON COLUMN tb_bbs_stats.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bbs_stats.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bbs_stats.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bbs_stats.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_bbs_use_info
COMMENT ON COLUMN tb_bbs_use_info.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_bbs_use_info.rgstr_se_cd IS '등록자구분코드 (rgstr_se_cd)';
COMMENT ON COLUMN tb_bbs_use_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bbs_use_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bbs_use_info.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_bbs_use_info.trgt_id IS '대상아이디 (trgt_id)';
COMMENT ON COLUMN tb_bbs_use_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bbs_use_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_bkmk_menu_mng_rslt
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.menu_id IS '메뉴아이디 (menu_id)';
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.menu_nm IS '메뉴명 (menu_nm)';
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.progrm_stre_path IS '프로그램저장경로 (progrm_stre_path)';
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bkmk_menu_mng_rslt.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_blog_info
COMMENT ON COLUMN tb_blog_info.blog_yn IS '블로그여부 (blog_yn)';
COMMENT ON COLUMN tb_blog_info.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_blog_info.reg_se_cd IS '등록구분코드 (reg_se_cd)';
COMMENT ON COLUMN tb_blog_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_blog_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_blog_info.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_blog_info.blog_id IS '블로그아이디 (blog_id)';
COMMENT ON COLUMN tb_blog_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_blog_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_blog_info.tmplt_id IS '서식아이디 (tmplt_id)';
COMMENT ON COLUMN tb_blog_info.blog_intro_cn IS '블로그소개내용 (blog_intro_cn)';
COMMENT ON COLUMN tb_blog_info.blog_ttl IS '블로그제목 (blog_ttl)';

-- Comments for tb_blog_user_map
COMMENT ON COLUMN tb_blog_user_map.mbr_stts_cd IS '회원상태코드 (mbr_stts_cd)';
COMMENT ON COLUMN tb_blog_user_map.mngr_yn IS '관리자여부 (mngr_yn)';
COMMENT ON COLUMN tb_blog_user_map.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_blog_user_map.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_blog_user_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_blog_user_map.join_ymd IS '가입일자 (join_ymd)';
COMMENT ON COLUMN tb_blog_user_map.blog_id IS '블로그아이디 (blog_id)';
COMMENT ON COLUMN tb_blog_user_map.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_blog_user_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_blog_user_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_blog_user_map.whdwl_ymd IS '탈퇴일자 (whdwl_ymd)';

-- Comments for tb_bnr_info
COMMENT ON COLUMN tb_bnr_info.rflt_yn IS '반영여부 (rflt_yn)';
COMMENT ON COLUMN tb_bnr_info.sort_ordr IS '정렬주문 (sort_ordr)';
COMMENT ON COLUMN tb_bnr_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_bnr_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_bnr_info.bnr_id IS '배너아이디 (bnr_id)';
COMMENT ON COLUMN tb_bnr_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_bnr_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_bnr_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_bnr_info.bnr_img_nm IS '배너이미지명 (bnr_img_nm)';
COMMENT ON COLUMN tb_bnr_info.bnr_nm IS '배너명 (bnr_nm)';
COMMENT ON COLUMN tb_bnr_info.bnr_expln IS '배너설명 (bnr_expln)';
COMMENT ON COLUMN tb_bnr_info.link_url IS '연계URL (link_url)';

-- Comments for tb_club_info
COMMENT ON COLUMN tb_club_info.club_id IS '동호회아이디 (club_id)';
COMMENT ON COLUMN tb_club_info.cmnty_id IS '커뮤니티아이디 (cmnty_id)';
COMMENT ON COLUMN tb_club_info.club_nm IS '동호회명 (club_nm)';
COMMENT ON COLUMN tb_club_info.club_intro_cn IS '동호회소개내용 (club_intro_cn)';
COMMENT ON COLUMN tb_club_info.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_club_info.rgstr_se_cd IS '등록자구분코드 (rgstr_se_cd)';
COMMENT ON COLUMN tb_club_info.tmplt_id IS '서식아이디 (tmplt_id)';
COMMENT ON COLUMN tb_club_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_club_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_club_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_club_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_club_user_map
COMMENT ON COLUMN tb_club_user_map.club_id IS '동호회아이디 (club_id)';
COMMENT ON COLUMN tb_club_user_map.cmnty_id IS '커뮤니티아이디 (cmnty_id)';
COMMENT ON COLUMN tb_club_user_map.mngr_yn IS '관리자여부 (mngr_yn)';
COMMENT ON COLUMN tb_club_user_map.join_ymd IS '가입일자 (join_ymd)';
COMMENT ON COLUMN tb_club_user_map.whdwl_ymd IS '탈퇴일자 (whdwl_ymd)';
COMMENT ON COLUMN tb_club_user_map.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_club_user_map.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_club_user_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_club_user_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_club_user_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_club_user_map.user_id IS '사용자아이디 (user_id)';

-- Comments for tb_cmnty_info
COMMENT ON COLUMN tb_cmnty_info.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_cmnty_info.reg_se_cd IS '등록구분코드 (reg_se_cd)';
COMMENT ON COLUMN tb_cmnty_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_cmnty_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_cmnty_info.cmnty_id IS '커뮤니티아이디 (cmnty_id)';
COMMENT ON COLUMN tb_cmnty_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_cmnty_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_cmnty_info.tmplt_id IS '서식아이디 (tmplt_id)';
COMMENT ON COLUMN tb_cmnty_info.cmnty_intro_cn IS '커뮤니티소개내용 (cmnty_intro_cn)';
COMMENT ON COLUMN tb_cmnty_info.cmnty_nm IS '커뮤니티명 (cmnty_nm)';

-- Comments for tb_cmnty_user_map
COMMENT ON COLUMN tb_cmnty_user_map.mngr_yn IS '관리자여부 (mngr_yn)';
COMMENT ON COLUMN tb_cmnty_user_map.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_cmnty_user_map.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_cmnty_user_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_cmnty_user_map.join_ymd IS '가입일자 (join_ymd)';
COMMENT ON COLUMN tb_cmnty_user_map.mbr_stts_cd IS '회원상태코드 (mbr_stts_cd)';
COMMENT ON COLUMN tb_cmnty_user_map.cmnty_id IS '커뮤니티아이디 (cmnty_id)';
COMMENT ON COLUMN tb_cmnty_user_map.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_cmnty_user_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_cmnty_user_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_cmnty_user_map.whdwl_ymd IS '탈퇴일자 (whdwl_ymd)';

-- Comments for tb_com_cd
COMMENT ON COLUMN tb_com_cd.clsf_cd IS '분류코드 (clsf_cd)';
COMMENT ON COLUMN tb_com_cd.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_com_cd.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_com_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_com_cd.cd_id IS '코드아이디 (cd_id)';
COMMENT ON COLUMN tb_com_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_com_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_com_cd.cd_id_nm IS '코드아이디명 (cd_id_nm)';
COMMENT ON COLUMN tb_com_cd.cd_id_expln IS '코드아이디설명 (cd_id_expln)';

-- Comments for tb_com_clsf_cd
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd IS '분류코드 (clsf_cd)';
COMMENT ON COLUMN tb_com_clsf_cd.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_com_clsf_cd.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_com_clsf_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_com_clsf_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_com_clsf_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd_nm IS '분류코드명 (clsf_cd_nm)';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd_expln IS '분류코드설명 (clsf_cd_expln)';

-- Comments for tb_com_dtl_cd
COMMENT ON COLUMN tb_com_dtl_cd.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_com_dtl_cd.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_com_dtl_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_com_dtl_cd.cd_id IS '코드아이디 (cd_id)';
COMMENT ON COLUMN tb_com_dtl_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_com_dtl_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd IS '상세코드 (dtl_cd)';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd_nm IS '상세코드명 (dtl_cd_nm)';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd_expln IS '상세코드설명 (dtl_cd_expln)';

-- Comments for tb_dept_job_bx
COMMENT ON COLUMN tb_dept_job_bx.sort_ordr IS '정렬주문 (sort_ordr)';
COMMENT ON COLUMN tb_dept_job_bx.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_dept_job_bx.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_dept_job_bx.dept_id IS '부서아이디 (dept_id)';
COMMENT ON COLUMN tb_dept_job_bx.dept_task_box_id IS '부서업무함아이디 (dept_task_box_id)';
COMMENT ON COLUMN tb_dept_job_bx.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_dept_job_bx.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_dept_job_bx.dept_task_box_nm IS '부서업무함명 (dept_task_box_nm)';

-- Comments for tb_dept_task_info
COMMENT ON COLUMN tb_dept_task_info.prrty_rnk IS '우선순위 (prrty_rnk)';
COMMENT ON COLUMN tb_dept_task_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_dept_task_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_dept_task_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_dept_task_info.pic_id IS '담당자아이디 (pic_id)';
COMMENT ON COLUMN tb_dept_task_info.dept_task_id IS '부서업무아이디 (dept_task_id)';
COMMENT ON COLUMN tb_dept_task_info.dept_task_box_id IS '부서업무함아이디 (dept_task_box_id)';
COMMENT ON COLUMN tb_dept_task_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_dept_task_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_dept_task_info.dept_task_cn IS '부서업무내용 (dept_task_cn)';
COMMENT ON COLUMN tb_dept_task_info.dept_task_nm IS '부서업무명 (dept_task_nm)';

-- Comments for tb_dgstfn_info
COMMENT ON COLUMN tb_dgstfn_info.dgstfn_scr IS '만족도점수 (dgstfn_scr)';
COMMENT ON COLUMN tb_dgstfn_info.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_dgstfn_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_dgstfn_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_dgstfn_info.ntt_id IS '게시물아이디 (ntt_id)';
COMMENT ON COLUMN tb_dgstfn_info.dgstfn_sn IS '만족도일련번호 (dgstfn_sn)';
COMMENT ON COLUMN tb_dgstfn_info.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_dgstfn_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_dgstfn_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_dgstfn_info.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_dgstfn_info.user_nm IS '사용자명 (user_nm)';
COMMENT ON COLUMN tb_dgstfn_info.pswd IS '비밀번호 (pswd)';
COMMENT ON COLUMN tb_dgstfn_info.dgstfn_cn IS '만족도내용 (dgstfn_cn)';

-- Comments for tb_diary_info
COMMENT ON COLUMN tb_diary_info.diary_prgrs_rt IS '일기진행비율 (diary_prgrs_rt)';
COMMENT ON COLUMN tb_diary_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_diary_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_diary_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_diary_info.diary_id IS '일기아이디 (diary_id)';
COMMENT ON COLUMN tb_diary_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_diary_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_diary_info.schdl_id IS '일정아이디 (schdl_id)';
COMMENT ON COLUMN tb_diary_info.diary_nm IS '일기명 (diary_nm)';
COMMENT ON COLUMN tb_diary_info.drctn_mttr IS '지시사항 (drctn_mttr)';
COMMENT ON COLUMN tb_diary_info.excptn_mttr IS '특이사항 (excptn_mttr)';

-- Comments for tb_dscsn_list
COMMENT ON COLUMN tb_dscsn_list.area_no IS '면적번호 (area_no)';
COMMENT ON COLUMN tb_dscsn_list.eml_ans_yn IS '이메일답변여부 (eml_ans_yn)';
COMMENT ON COLUMN tb_dscsn_list.mbl_end_telno IS '휴대종료전화번호 (mbl_end_telno)';
COMMENT ON COLUMN tb_dscsn_list.end_telno IS '종료전화번호 (end_telno)';
COMMENT ON COLUMN tb_dscsn_list.mbl_frst_telno IS '휴대최초전화번호 (mbl_frst_telno)';
COMMENT ON COLUMN tb_dscsn_list.mbl_md_telno IS '휴대중간전화번호 (mbl_md_telno)';
COMMENT ON COLUMN tb_dscsn_list.md_telno IS '중간전화번호 (md_telno)';
COMMENT ON COLUMN tb_dscsn_list.rls_yn IS '공개여부 (rls_yn)';
COMMENT ON COLUMN tb_dscsn_list.qna_proc_stts_cd IS '질의응답프로세스상태코드 (qna_proc_stts_cd)';
COMMENT ON COLUMN tb_dscsn_list.inq_cnt IS '조회수 (inq_cnt)';
COMMENT ON COLUMN tb_dscsn_list.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_dscsn_list.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_dscsn_list.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_dscsn_list.dscsn_id IS '상담아이디 (dscsn_id)';
COMMENT ON COLUMN tb_dscsn_list.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_dscsn_list.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_dscsn_list.mng_ymd IS '관리일자 (mng_ymd)';
COMMENT ON COLUMN tb_dscsn_list.wrt_ymd IS '작성일자 (wrt_ymd)';
COMMENT ON COLUMN tb_dscsn_list.wrt_pswd IS '작성비밀번호 (wrt_pswd)';
COMMENT ON COLUMN tb_dscsn_list.wrter_nm IS '작성자명 (wrter_nm)';
COMMENT ON COLUMN tb_dscsn_list.eml_addr IS '이메일주소 (eml_addr)';
COMMENT ON COLUMN tb_dscsn_list.dscsn_cn IS '상담내용 (dscsn_cn)';
COMMENT ON COLUMN tb_dscsn_list.dscsn_ttl IS '상담제목 (dscsn_ttl)';
COMMENT ON COLUMN tb_dscsn_list.proc_cn IS '프로세스내용 (proc_cn)';

-- Comments for tb_dscsn_manage
COMMENT ON COLUMN tb_dscsn_manage.dscsn_id IS '상담아이디 (dscsn_id)';
COMMENT ON COLUMN tb_dscsn_manage.dscsn_ttl IS '상담제목 (dscsn_ttl)';
COMMENT ON COLUMN tb_dscsn_manage.dscsn_cn IS '상담내용 (dscsn_cn)';
COMMENT ON COLUMN tb_dscsn_manage.rls_yn IS '공개여부 (rls_yn)';
COMMENT ON COLUMN tb_dscsn_manage.wrt_ymd IS '작성일자 (wrt_ymd)';
COMMENT ON COLUMN tb_dscsn_manage.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_dscsn_manage.user_nm IS '사용자명 (user_nm)';
COMMENT ON COLUMN tb_dscsn_manage.proc_cn IS '프로세스내용 (proc_cn)';
COMMENT ON COLUMN tb_dscsn_manage.mng_ymd IS '관리일자 (mng_ymd)';
COMMENT ON COLUMN tb_dscsn_manage.qna_proc_stts_cd IS '질의응답프로세스상태코드 (qna_proc_stts_cd)';
COMMENT ON COLUMN tb_dscsn_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_dscsn_manage.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_dscsn_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_dscsn_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_dta_use_stats
COMMENT ON COLUMN tb_dta_use_stats.dta_use_stats_id IS '자료사용통계아이디 (dta_use_stats_id)';
COMMENT ON COLUMN tb_dta_use_stats.bbs_id IS '게시판아이디 (bbs_id)';
COMMENT ON COLUMN tb_dta_use_stats.ntt_id IS '게시물아이디 (ntt_id)';
COMMENT ON COLUMN tb_dta_use_stats.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_dta_use_stats.file_sn IS '파일일련번호 (file_sn)';
COMMENT ON COLUMN tb_dta_use_stats.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_dta_use_stats.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_dta_use_stats.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_dta_use_stats.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_email_dsptch_manage
COMMENT ON COLUMN tb_email_dsptch_manage.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_email_dsptch_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_email_dsptch_manage.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_email_dsptch_manage.dsptch_dt IS '발신일시 (dsptch_dt)';
COMMENT ON COLUMN tb_email_dsptch_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_email_dsptch_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_email_dsptch_manage.msg_id IS '메시지아이디 (msg_id)';
COMMENT ON COLUMN tb_email_dsptch_manage.dsptch_rslt_cd IS '발신결과코드 (dsptch_rslt_cd)';
COMMENT ON COLUMN tb_email_dsptch_manage.rcvr_nm IS '수신자명 (rcvr_nm)';
COMMENT ON COLUMN tb_email_dsptch_manage.sndpty_nm IS '발신자명 (sndpty_nm)';
COMMENT ON COLUMN tb_email_dsptch_manage.eml_cn IS '이메일내용 (eml_cn)';
COMMENT ON COLUMN tb_email_dsptch_manage.eml_ttl IS '이메일제목 (eml_ttl)';

-- Comments for tb_event_info
COMMENT ON COLUMN tb_event_info.biz_yr IS '사업연도 (biz_yr)';
COMMENT ON COLUMN tb_event_info.evnt_aprv_yn IS '행사승인여부 (evnt_aprv_yn)';
COMMENT ON COLUMN tb_event_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_event_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_event_info.evnt_use_cnt IS '행사사용수 (evnt_use_cnt)';
COMMENT ON COLUMN tb_event_info.biz_cd IS '사업코드 (biz_cd)';
COMMENT ON COLUMN tb_event_info.evnt_aprv_ymd IS '행사승인일자 (evnt_aprv_ymd)';
COMMENT ON COLUMN tb_event_info.evnt_id IS '행사아이디 (evnt_id)';
COMMENT ON COLUMN tb_event_info.evnt_bgng_ymd IS '행사시작일자 (evnt_bgng_ymd)';
COMMENT ON COLUMN tb_event_info.evnt_end_ymd IS '행사종료일자 (evnt_end_ymd)';
COMMENT ON COLUMN tb_event_info.evnt_type_cd IS '행사유형코드 (evnt_type_cd)';
COMMENT ON COLUMN tb_event_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_event_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_event_info.pic_nm IS '담당자명 (pic_nm)';
COMMENT ON COLUMN tb_event_info.evnt_cn IS '행사내용 (evnt_cn)';
COMMENT ON COLUMN tb_event_info.prep_mttr IS '전임사항 (prep_mttr)';

-- Comments for tb_extrl_hr_info
COMMENT ON COLUMN tb_extrl_hr_info.area_no IS '면적번호 (area_no)';
COMMENT ON COLUMN tb_extrl_hr_info.end_telno IS '종료전화번호 (end_telno)';
COMMENT ON COLUMN tb_extrl_hr_info.md_telno IS '중간전화번호 (md_telno)';
COMMENT ON COLUMN tb_extrl_hr_info.cr_type_cd IS '직업유형코드 (cr_type_cd)';
COMMENT ON COLUMN tb_extrl_hr_info.gndr_cd IS '성별코드 (gndr_cd)';
COMMENT ON COLUMN tb_extrl_hr_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_extrl_hr_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_extrl_hr_info.brdt_ymd IS '생년월일일자 (brdt_ymd)';
COMMENT ON COLUMN tb_extrl_hr_info.evnt_id IS '행사아이디 (evnt_id)';
COMMENT ON COLUMN tb_extrl_hr_info.otsd_hr_id IS '외부시간아이디 (otsd_hr_id)';
COMMENT ON COLUMN tb_extrl_hr_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_extrl_hr_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_extrl_hr_info.eml_addr IS '이메일주소 (eml_addr)';
COMMENT ON COLUMN tb_extrl_hr_info.otsd_hr_nm IS '외부시간명 (otsd_hr_nm)';
COMMENT ON COLUMN tb_extrl_hr_info.ogdp_inst_nm IS '소속기관명 (ogdp_inst_nm)';

-- Comments for tb_faq_info
COMMENT ON COLUMN tb_faq_info.inq_cnt IS '조회수 (inq_cnt)';
COMMENT ON COLUMN tb_faq_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_faq_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_faq_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_faq_info.faq_id IS 'FAQ아이디 (faq_id)';
COMMENT ON COLUMN tb_faq_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_faq_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_faq_info.ans_cn IS '답변내용 (ans_cn)';
COMMENT ON COLUMN tb_faq_info.qstn_cn IS '질문내용 (qstn_cn)';
COMMENT ON COLUMN tb_faq_info.qstn_ttl IS '질문제목 (qstn_ttl)';

-- Comments for tb_file_detail
COMMENT ON COLUMN tb_file_detail.atch_file_seq IS '첨부파일순서 (atch_file_seq)';
COMMENT ON COLUMN tb_file_detail.file_sz IS '파일크기 (file_sz)';
COMMENT ON COLUMN tb_file_detail.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_file_detail.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_file_detail.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_file_detail.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_file_detail.file_estn IS '파일연장 (file_estn)';
COMMENT ON COLUMN tb_file_detail.orgnl_file_nm IS '원본파일명 (orgnl_file_nm)';
COMMENT ON COLUMN tb_file_detail.strg_file_nm IS '저장파일명 (strg_file_nm)';
COMMENT ON COLUMN tb_file_detail.file_strg_path IS '파일저장경로 (file_strg_path)';
COMMENT ON COLUMN tb_file_detail.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_file_detail.file_cn IS '파일내용 (file_cn)';

-- Comments for tb_file_master
COMMENT ON COLUMN tb_file_master.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_file_master.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_file_master.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_file_master.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_file_master.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_file_master.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_hldy_info
COMMENT ON COLUMN tb_hldy_info.hldy_sn IS '휴일일련번호 (hldy_sn)';
COMMENT ON COLUMN tb_hldy_info.hldy_se_cd IS '휴일구분코드 (hldy_se_cd)';
COMMENT ON COLUMN tb_hldy_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_hldy_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_hldy_info.hldy_ymd IS '휴일일자 (hldy_ymd)';
COMMENT ON COLUMN tb_hldy_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_hldy_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_hldy_info.hldy_nm IS '휴일명 (hldy_nm)';
COMMENT ON COLUMN tb_hldy_info.hldy_expln IS '휴일설명 (hldy_expln)';

-- Comments for tb_hlp_info
COMMENT ON COLUMN tb_hlp_info.hlp_id IS '도움말아이디 (hlp_id)';
COMMENT ON COLUMN tb_hlp_info.hlp_se_cd IS '도움말구분코드 (hlp_se_cd)';
COMMENT ON COLUMN tb_hlp_info.hlp_dfn IS '도움말정의 (hlp_dfn)';
COMMENT ON COLUMN tb_hlp_info.hlp_expln IS '도움말설명 (hlp_expln)';
COMMENT ON COLUMN tb_hlp_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_hlp_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_hlp_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_hlp_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_ifml_atrz_info
COMMENT ON COLUMN tb_ifml_atrz_info.aprv_yn IS '승인여부 (aprv_yn)';
COMMENT ON COLUMN tb_ifml_atrz_info.task_se_cd IS '업무구분코드 (task_se_cd)';
COMMENT ON COLUMN tb_ifml_atrz_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_ifml_atrz_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_ifml_atrz_info.atrz_dt IS '결재일시 (atrz_dt)';
COMMENT ON COLUMN tb_ifml_atrz_info.req_ymd IS '소요일자 (req_ymd)';
COMMENT ON COLUMN tb_ifml_atrz_info.aplcnt_id IS '신청자아이디 (aplcnt_id)';
COMMENT ON COLUMN tb_ifml_atrz_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_ifml_atrz_info.ifml_atrz_id IS '비공식결재아이디 (ifml_atrz_id)';
COMMENT ON COLUMN tb_ifml_atrz_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_ifml_atrz_info.aprvr_id IS '결재자아이디 (aprvr_id)';
COMMENT ON COLUMN tb_ifml_atrz_info.rjct_rsn_cn IS '반려사유내용 (rjct_rsn_cn)';

-- Comments for tb_indv_pg
COMMENT ON COLUMN tb_indv_pg.page_id IS '쪽아이디 (page_id)';
COMMENT ON COLUMN tb_indv_pg.page_ttl IS '쪽제목 (page_ttl)';
COMMENT ON COLUMN tb_indv_pg.page_expln IS '쪽설명 (page_expln)';
COMMENT ON COLUMN tb_indv_pg.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_indv_pg.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_indv_pg.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_indv_pg.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_indv_pg.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_indv_pg_conts
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_id IS '콘텐츠아이디 (cntnts_id)';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_nm IS '콘텐츠명 (cntnts_nm)';
COMMENT ON COLUMN tb_indv_pg_conts.cntc_url IS '접촉URL (cntc_url)';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_use_yn IS '콘텐츠사용여부 (cntnts_use_yn)';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_link_url IS '콘텐츠연계URL (cntnts_link_url)';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_dc IS '콘텐츠설명 (cntnts_dc)';
COMMENT ON COLUMN tb_indv_pg_conts.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_indv_pg_conts.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_indv_pg_conts.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_indv_pg_conts.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_indv_pg_set
COMMENT ON COLUMN tb_indv_pg_set.ttl_bar_colr IS '제목바색상 (ttl_bar_colr)';
COMMENT ON COLUMN tb_indv_pg_set.sort_mthd IS '정렬방법 (sort_mthd)';
COMMENT ON COLUMN tb_indv_pg_set.sort_cnt IS '정렬수 (sort_cnt)';
COMMENT ON COLUMN tb_indv_pg_set.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_indv_pg_set.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_indv_pg_set.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_indv_pg_set.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_inst_cd
COMMENT ON COLUMN tb_inst_cd.abl_yn IS '폐지여부 (abl_yn)';
COMMENT ON COLUMN tb_inst_cd.inst_cycl IS '기관차수 (inst_cycl)';
COMMENT ON COLUMN tb_inst_cd.inst_type_lclsf IS '기관유형대분류 (inst_type_lclsf)';
COMMENT ON COLUMN tb_inst_cd.inst_type_mclsf IS '기관유형중분류 (inst_type_mclsf)';
COMMENT ON COLUMN tb_inst_cd.inst_type_sclsf IS '기관유형소분류 (inst_type_sclsf)';
COMMENT ON COLUMN tb_inst_cd.odr IS '발주자 (odr)';
COMMENT ON COLUMN tb_inst_cd.ord IS '순서 (ord)';
COMMENT ON COLUMN tb_inst_cd.sort_seq IS '정렬순서 (sort_seq)';
COMMENT ON COLUMN tb_inst_cd.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_inst_cd.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_inst_cd.top_inst_cd IS '상위기관코드 (top_inst_cd)';
COMMENT ON COLUMN tb_inst_cd.inst_cd IS '기관코드 (inst_cd)';
COMMENT ON COLUMN tb_inst_cd.rprs_inst_cd IS '대표기관코드 (rprs_inst_cd)';
COMMENT ON COLUMN tb_inst_cd.up_inst_cd IS '상위기관코드 (up_inst_cd)';
COMMENT ON COLUMN tb_inst_cd.abl_ymd IS '폐지일자 (abl_ymd)';
COMMENT ON COLUMN tb_inst_cd.crtr_ymd IS '기준일자 (crtr_ymd)';
COMMENT ON COLUMN tb_inst_cd.chg_ymd IS '변경일자 (chg_ymd)';
COMMENT ON COLUMN tb_inst_cd.chg_tm IS '변경시각 (chg_tm)';
COMMENT ON COLUMN tb_inst_cd.crt_ymd IS '생성일자 (crt_ymd)';
COMMENT ON COLUMN tb_inst_cd.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_inst_cd.fax_no IS '팩스번호 (fax_no)';
COMMENT ON COLUMN tb_inst_cd.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_inst_cd.telno IS '전화번호 (telno)';
COMMENT ON COLUMN tb_inst_cd.all_inst_nm IS '전체기관명 (all_inst_nm)';
COMMENT ON COLUMN tb_inst_cd.inst_abbr_nm IS '기관약어명 (inst_abbr_nm)';
COMMENT ON COLUMN tb_inst_cd.lwtrk_inst_nm IS '최하위기관명 (lwtrk_inst_nm)';

-- Comments for tb_inst_cd_rcptn_log
COMMENT ON COLUMN tb_inst_cd_rcptn_log.abl_yn IS '폐지여부 (abl_yn)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.chg_se_cd IS '변경구분코드 (chg_se_cd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_cycl IS '기관차수 (inst_cycl)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_type_lclsf IS '기관유형대분류 (inst_type_lclsf)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_type_mclsf IS '기관유형중분류 (inst_type_mclsf)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_type_sclsf IS '기관유형소분류 (inst_type_sclsf)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.odr IS '발주자 (odr)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.ord IS '순서 (ord)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.proc_se IS '프로세스구분 (proc_se)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.sort_ordr IS '정렬주문 (sort_ordr)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.job_sn IS '작업일련번호 (job_sn)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.top_inst_cd IS '상위기관코드 (top_inst_cd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_cd IS '기관코드 (inst_cd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.reprs_inst_cd IS '대표기관코드 (reprs_inst_cd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.upr_inst_cd IS '상위기관코드 (upr_inst_cd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.abl_ymd IS '폐지일자 (abl_ymd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.crtr_ymd IS '기준일자 (crtr_ymd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.chg_ymd IS '변경일자 (chg_ymd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.chg_tm IS '변경시각 (chg_tm)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.crt_ymd IS '생성일자 (crt_ymd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.fax_no IS '팩스번호 (fax_no)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.telno IS '전화번호 (telno)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.etc_cd IS '기타코드 (etc_cd)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.all_inst_nm IS '전체기관명 (all_inst_nm)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_abbr_nm IS '기관약어명 (inst_abbr_nm)';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.lwst_inst_nm IS '최저기관명 (lwst_inst_nm)';

-- Comments for tb_intrn_svc
COMMENT ON COLUMN tb_intrn_svc.itnt_svc_id IS '인터넷봉사아이디 (itnt_svc_id)';
COMMENT ON COLUMN tb_intrn_svc.itnt_svc_nm IS '인터넷봉사명 (itnt_svc_nm)';
COMMENT ON COLUMN tb_intrn_svc.itnt_svc_expln IS '인터넷봉사설명 (itnt_svc_expln)';
COMMENT ON COLUMN tb_intrn_svc.rflt_yn IS '반영여부 (rflt_yn)';
COMMENT ON COLUMN tb_intrn_svc.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_intrn_svc.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_intrn_svc.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_intrn_svc.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_leader_schdl
COMMENT ON COLUMN tb_leader_schdl.rept_se_cd IS '반복구분코드 (rept_se_cd)';
COMMENT ON COLUMN tb_leader_schdl.schdl_imprt_cd IS '일정중요도코드 (schdl_imprt_cd)';
COMMENT ON COLUMN tb_leader_schdl.schdl_se_cd IS '일정구분코드 (schdl_se_cd)';
COMMENT ON COLUMN tb_leader_schdl.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_leader_schdl.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_leader_schdl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_leader_schdl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_leader_schdl.leader_id IS '리더아이디 (leader_id)';
COMMENT ON COLUMN tb_leader_schdl.schdl_bgng_ymd IS '일정시작일자 (schdl_bgng_ymd)';
COMMENT ON COLUMN tb_leader_schdl.schdl_pic_id IS '일정담당자아이디 (schdl_pic_id)';
COMMENT ON COLUMN tb_leader_schdl.schdl_end_ymd IS '일정종료일자 (schdl_end_ymd)';
COMMENT ON COLUMN tb_leader_schdl.schdl_id IS '일정아이디 (schdl_id)';
COMMENT ON COLUMN tb_leader_schdl.schdl_cn IS '일정내용 (schdl_cn)';
COMMENT ON COLUMN tb_leader_schdl.schdl_nm IS '일정명 (schdl_nm)';
COMMENT ON COLUMN tb_leader_schdl.schdl_plc_nm IS '일정장소명 (schdl_plc_nm)';

-- Comments for tb_leader_schdl_dtl
COMMENT ON COLUMN tb_leader_schdl_dtl.schdl_id IS '일정아이디 (schdl_id)';
COMMENT ON COLUMN tb_leader_schdl_dtl.schdl_ymd IS '일정일자 (schdl_ymd)';
COMMENT ON COLUMN tb_leader_schdl_dtl.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_leader_schdl_dtl.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_leader_schdl_dtl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_leader_schdl_dtl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_leader_stts
COMMENT ON COLUMN tb_leader_stts.leader_stts_cd IS '리더상태코드 (leader_stts_cd)';
COMMENT ON COLUMN tb_leader_stts.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_leader_stts.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_leader_stts.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_leader_stts.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_leader_stts.leader_id IS '리더아이디 (leader_id)';

-- Comments for tb_login_log
COMMENT ON COLUMN tb_login_log.err_cd IS '오류코드 (err_cd)';
COMMENT ON COLUMN tb_login_log.err_ocrn_yn IS '오류발생여부 (err_ocrn_yn)';
COMMENT ON COLUMN tb_login_log.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_login_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_login_log.cntn_mthd_cd IS '접속방법코드 (cntn_mthd_cd)';
COMMENT ON COLUMN tb_login_log.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_login_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_login_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_login_log.log_id IS '로그아이디 (log_id)';
COMMENT ON COLUMN tb_login_log.lgn_ip_addr IS '로그인IP주소 (lgn_ip_addr)';

-- Comments for tb_login_policy
COMMENT ON COLUMN tb_login_policy.dpcn_prm_yn IS '중복허용여부 (dpcn_prm_yn)';
COMMENT ON COLUMN tb_login_policy.lmt_yn IS '제한여부 (lmt_yn)';
COMMENT ON COLUMN tb_login_policy.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_login_policy.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_login_policy.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_login_policy.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_login_policy.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_login_policy.ip_addr IS 'IP주소 (ip_addr)';
COMMENT ON COLUMN tb_login_policy.bgng_tm IS '시작시각 (bgng_tm)';
COMMENT ON COLUMN tb_login_policy.end_tm IS '종료시각 (end_tm)';
COMMENT ON COLUMN tb_login_policy.otp_use_yn IS 'OTP사용여부 (otp_use_yn)';

-- Comments for tb_main_image
COMMENT ON COLUMN tb_main_image.rflt_yn IS '반영여부 (rflt_yn)';
COMMENT ON COLUMN tb_main_image.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_main_image.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_main_image.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_main_image.img_file_nm IS '이미지파일명 (img_file_nm)';
COMMENT ON COLUMN tb_main_image.img_id IS '이미지아이디 (img_id)';
COMMENT ON COLUMN tb_main_image.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_main_image.main_img_file_path IS '주요이미지파일경로 (main_img_file_path)';
COMMENT ON COLUMN tb_main_image.img_nm IS '이미지명 (img_nm)';
COMMENT ON COLUMN tb_main_image.main_img_expln IS '주요이미지설명 (main_img_expln)';

-- Comments for tb_memo_rpt_info
COMMENT ON COLUMN tb_memo_rpt_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_memo_rpt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_memo_rpt_info.memo_rpt_ymd IS '메모보고일자 (memo_rpt_ymd)';
COMMENT ON COLUMN tb_memo_rpt_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_memo_rpt_info.drctn_mttr_reg_dt IS '지시사항등록일시 (drctn_mttr_reg_dt)';
COMMENT ON COLUMN tb_memo_rpt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_memo_rpt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_memo_rpt_info.rptr_id IS '보고자아이디 (rptr_id)';
COMMENT ON COLUMN tb_memo_rpt_info.rptr_inq_dt IS '보고자조회일시 (rptr_inq_dt)';
COMMENT ON COLUMN tb_memo_rpt_info.rpt_id IS '보고아이디 (rpt_id)';
COMMENT ON COLUMN tb_memo_rpt_info.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_memo_rpt_info.drctn_mttr IS '지시사항 (drctn_mttr)';
COMMENT ON COLUMN tb_memo_rpt_info.rpt_cn IS '보고내용 (rpt_cn)';
COMMENT ON COLUMN tb_memo_rpt_info.rpt_ttl IS '보고제목 (rpt_ttl)';

-- Comments for tb_memo_todo_info
COMMENT ON COLUMN tb_memo_todo_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_memo_todo_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_memo_todo_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_memo_todo_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_memo_todo_info.todo_bgng_tm IS '할일시작시각 (todo_bgng_tm)';
COMMENT ON COLUMN tb_memo_todo_info.todo_end_tm IS '할일종료시각 (todo_end_tm)';
COMMENT ON COLUMN tb_memo_todo_info.todo_id IS '할일아이디 (todo_id)';
COMMENT ON COLUMN tb_memo_todo_info.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_memo_todo_info.todo_cn IS '할일내용 (todo_cn)';
COMMENT ON COLUMN tb_memo_todo_info.todo_ttl IS '할일제목 (todo_ttl)';

-- Comments for tb_menu_crt_dtl
COMMENT ON COLUMN tb_menu_crt_dtl.menu_sn IS '메뉴일련번호 (menu_sn)';
COMMENT ON COLUMN tb_menu_crt_dtl.authrt_cd IS '권한코드 (authrt_cd)';
COMMENT ON COLUMN tb_menu_crt_dtl.mapng_crt_id IS '매핑생성아이디 (mapng_crt_id)';
COMMENT ON COLUMN tb_menu_crt_dtl.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_menu_crt_dtl.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_menu_crt_dtl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_menu_crt_dtl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_menu_info
COMMENT ON COLUMN tb_menu_info.menu_ordr IS '메뉴주문 (menu_ordr)';
COMMENT ON COLUMN tb_menu_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_menu_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_menu_info.menu_sn IS '메뉴일련번호 (menu_sn)';
COMMENT ON COLUMN tb_menu_info.route_mdfcn_yn IS '경로수정여부 (route_mdfcn_yn)';
COMMENT ON COLUMN tb_menu_info.up_menu_sn IS '상위메뉴일련번호 (up_menu_sn)';
COMMENT ON COLUMN tb_menu_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_menu_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_menu_info.menu_nm IS '메뉴명 (menu_nm)';
COMMENT ON COLUMN tb_menu_info.prgrm_file_nm IS '프로그램파일명 (prgrm_file_nm)';
COMMENT ON COLUMN tb_menu_info.rel_img_nm IS '관계이미지명 (rel_img_nm)';
COMMENT ON COLUMN tb_menu_info.rel_img_path IS '관계이미지경로 (rel_img_path)';
COMMENT ON COLUMN tb_menu_info.menu_expln IS '메뉴설명 (menu_expln)';
COMMENT ON COLUMN tb_menu_info.modern_route IS '모던경로 (modern_route)';

-- Comments for tb_note_info
COMMENT ON COLUMN tb_note_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_note_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_note_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_note_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_note_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_note_info.note_id IS '쪽지아이디 (note_id)';
COMMENT ON COLUMN tb_note_info.note_cn IS '쪽지내용 (note_cn)';
COMMENT ON COLUMN tb_note_info.note_ttl IS '쪽지제목 (note_ttl)';

-- Comments for tb_note_rcptn
COMMENT ON COLUMN tb_note_rcptn.open_yn IS '개봉여부 (open_yn)';
COMMENT ON COLUMN tb_note_rcptn.rcptn_se_cd IS '수신구분코드 (rcptn_se_cd)';
COMMENT ON COLUMN tb_note_rcptn.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_note_rcptn.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_note_rcptn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_note_rcptn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_note_rcptn.note_id IS '쪽지아이디 (note_id)';
COMMENT ON COLUMN tb_note_rcptn.note_rcptn_id IS '쪽지수신아이디 (note_rcptn_id)';
COMMENT ON COLUMN tb_note_rcptn.note_sndng_id IS '쪽지발송아이디 (note_sndng_id)';
COMMENT ON COLUMN tb_note_rcptn.rcvr_id IS '수신자아이디 (rcvr_id)';

-- Comments for tb_note_sndng
COMMENT ON COLUMN tb_note_sndng.del_yn IS '삭제여부 (del_yn)';
COMMENT ON COLUMN tb_note_sndng.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_note_sndng.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_note_sndng.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_note_sndng.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_note_sndng.note_id IS '쪽지아이디 (note_id)';
COMMENT ON COLUMN tb_note_sndng.note_sndng_id IS '쪽지발송아이디 (note_sndng_id)';
COMMENT ON COLUMN tb_note_sndng.sndr_id IS '발송자아이디 (sndr_id)';

-- Comments for tb_noti_info
COMMENT ON COLUMN tb_noti_info.noti_sn IS '알림일련번호 (noti_sn)';
COMMENT ON COLUMN tb_noti_info.noti_ttl IS '알림제목 (noti_ttl)';
COMMENT ON COLUMN tb_noti_info.noti_cn IS '알림내용 (noti_cn)';
COMMENT ON COLUMN tb_noti_info.noti_dt IS '알림일시 (noti_dt)';
COMMENT ON COLUMN tb_noti_info.bfhd_noti_intrvl IS '사전알림주기 (bfhd_noti_intrvl)';
COMMENT ON COLUMN tb_noti_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_noti_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_noti_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_noti_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_onln_mnl_info
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_id IS '온라인매뉴얼아이디 (onln_mnl_id)';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_se_cd IS '온라인매뉴얼구분코드 (onln_mnl_se_cd)';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_dfn IS '온라인매뉴얼정의 (onln_mnl_dfn)';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_expln IS '온라인매뉴얼설명 (onln_mnl_expln)';
COMMENT ON COLUMN tb_onln_mnl_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_onln_mnl_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_onln_mnl_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_onln_mnl_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_nm IS '온라인매뉴얼명 (onln_mnl_nm)';

-- Comments for tb_onln_poll_artcl
COMMENT ON COLUMN tb_onln_poll_artcl.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_onln_poll_artcl.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_onln_poll_artcl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_onln_poll_artcl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_id IS '여론조사아이디 (poll_id)';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_artcl_id IS '여론조사항목아이디 (poll_artcl_id)';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_artcl_nm IS '여론조사항목명 (poll_artcl_nm)';

-- Comments for tb_onln_poll_manage
COMMENT ON COLUMN tb_onln_poll_manage.poll_atmc_dsuse_yn IS '여론조사자동폐기여부 (poll_atmc_dsuse_yn)';
COMMENT ON COLUMN tb_onln_poll_manage.poll_dsuse_yn IS '여론조사폐기여부 (poll_dsuse_yn)';
COMMENT ON COLUMN tb_onln_poll_manage.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_onln_poll_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_onln_poll_manage.poll_bgng_ymd IS '여론조사시작일자 (poll_bgng_ymd)';
COMMENT ON COLUMN tb_onln_poll_manage.poll_end_ymd IS '여론조사종료일자 (poll_end_ymd)';
COMMENT ON COLUMN tb_onln_poll_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_onln_poll_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_onln_poll_manage.poll_id IS '여론조사아이디 (poll_id)';
COMMENT ON COLUMN tb_onln_poll_manage.poll_knd_cd IS '여론조사종류코드 (poll_knd_cd)';
COMMENT ON COLUMN tb_onln_poll_manage.poll_nm IS '여론조사명 (poll_nm)';

-- Comments for tb_onln_poll_rslt
COMMENT ON COLUMN tb_onln_poll_rslt.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_onln_poll_rslt.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_onln_poll_rslt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_onln_poll_rslt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_id IS '여론조사아이디 (poll_id)';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_artcl_id IS '여론조사항목아이디 (poll_artcl_id)';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_rslt_id IS '여론조사결과아이디 (poll_rslt_id)';

-- Comments for tb_orgnzt_info
COMMENT ON COLUMN tb_orgnzt_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_orgnzt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_orgnzt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_orgnzt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_orgnzt_info.ognz_id IS '조직아이디 (ognz_id)';
COMMENT ON COLUMN tb_orgnzt_info.ognz_nm IS '조직명 (ognz_nm)';
COMMENT ON COLUMN tb_orgnzt_info.ognz_expln IS '조직설명 (ognz_expln)';

-- Comments for tb_plcy_manage
COMMENT ON COLUMN tb_plcy_manage.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_plcy_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_plcy_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_plcy_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_plcy_manage.plcy_type_cd IS '정책유형코드 (plcy_type_cd)';
COMMENT ON COLUMN tb_plcy_manage.plcy_cn IS '정책내용 (plcy_cn)';
COMMENT ON COLUMN tb_plcy_manage.plcy_ttl IS '정책제목 (plcy_ttl)';

-- Comments for tb_popup_info
COMMENT ON COLUMN tb_popup_info.ntce_yn IS '공지여부 (ntce_yn)';
COMMENT ON COLUMN tb_popup_info.stopvew_setup_yn IS '그만보기설정여부 (stopvew_setup_yn)';
COMMENT ON COLUMN tb_popup_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_popup_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_popup_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_popup_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_popup_info.ntce_bgnde IS '공지시작일 (ntce_bgnde)';
COMMENT ON COLUMN tb_popup_info.ntce_endde IS '공지종료일 (ntce_endde)';
COMMENT ON COLUMN tb_popup_info.popup_id IS '팝업아이디 (popup_id)';
COMMENT ON COLUMN tb_popup_info.popup_vrtc_pstn IS '팝업세로위치 (popup_vrtc_pstn)';
COMMENT ON COLUMN tb_popup_info.popup_vrtc_sz IS '팝업세로크기 (popup_vrtc_sz)';
COMMENT ON COLUMN tb_popup_info.popup_wdth_pstn IS '팝업가로위치 (popup_wdth_pstn)';
COMMENT ON COLUMN tb_popup_info.popup_wdth_sz IS '팝업가로크기 (popup_wdth_sz)';
COMMENT ON COLUMN tb_popup_info.file_url IS '파일URL (file_url)';
COMMENT ON COLUMN tb_popup_info.popup_ttl_nm IS '팝업제목명 (popup_ttl_nm)';

-- Comments for tb_prgrm_lst
COMMENT ON COLUMN tb_prgrm_lst.prgrm_file_nm IS '프로그램파일명 (prgrm_file_nm)';
COMMENT ON COLUMN tb_prgrm_lst.prgrm_korn_nm IS '프로그램한글명 (prgrm_korn_nm)';
COMMENT ON COLUMN tb_prgrm_lst.prgrm_strg_path IS '프로그램저장경로 (prgrm_strg_path)';
COMMENT ON COLUMN tb_prgrm_lst.url IS 'URL (url)';
COMMENT ON COLUMN tb_prgrm_lst.prgrm_expln IS '프로그램설명 (prgrm_expln)';
COMMENT ON COLUMN tb_prgrm_lst.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_prgrm_lst.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_prgrm_lst.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_prgrm_lst.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_privacy_log
COMMENT ON COLUMN tb_privacy_log.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_privacy_log.inq_dt IS '조회일시 (inq_dt)';
COMMENT ON COLUMN tb_privacy_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_privacy_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_privacy_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_privacy_log.dmnd_id IS '요청아이디 (dmnd_id)';
COMMENT ON COLUMN tb_privacy_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';
COMMENT ON COLUMN tb_privacy_log.dmnd_user_ip_addr IS '요청사용자IP주소 (dmnd_user_ip_addr)';
COMMENT ON COLUMN tb_privacy_log.inq_info IS '조회정보 (inq_info)';
COMMENT ON COLUMN tb_privacy_log.srvc_nm IS '서비스명 (srvc_nm)';

-- Comments for tb_role_info
COMMENT ON COLUMN tb_role_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_role_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_role_info.role_sort IS '역할정렬 (role_sort)';
COMMENT ON COLUMN tb_role_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_role_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_role_info.role_crt_ymd IS '역할생성일자 (role_crt_ymd)';
COMMENT ON COLUMN tb_role_info.role_id IS '역할아이디 (role_id)';
COMMENT ON COLUMN tb_role_info.role_nm IS '역할명 (role_nm)';
COMMENT ON COLUMN tb_role_info.role_type_cd IS '역할유형코드 (role_type_cd)';
COMMENT ON COLUMN tb_role_info.role_expln IS '역할설명 (role_expln)';
COMMENT ON COLUMN tb_role_info.role_patrn IS '역할패턴 (role_patrn)';

-- Comments for tb_role_lyr
COMMENT ON COLUMN tb_role_lyr.prnt_role_id IS '부모역할아이디 (prnt_role_id)';
COMMENT ON COLUMN tb_role_lyr.chld_role_id IS '자녀역할아이디 (chld_role_id)';
COMMENT ON COLUMN tb_role_lyr.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_role_lyr.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_role_lyr.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_role_lyr.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_rpt_info
COMMENT ON COLUMN tb_rpt_info.rpt_se_cd IS '보고구분코드 (rpt_se_cd)';
COMMENT ON COLUMN tb_rpt_info.rpt_stts_cd IS '보고상태코드 (rpt_stts_cd)';
COMMENT ON COLUMN tb_rpt_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_rpt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_rpt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_rpt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_rpt_info.rpt_ymd IS '보고일자 (rpt_ymd)';
COMMENT ON COLUMN tb_rpt_info.rpt_id IS '보고아이디 (rpt_id)';
COMMENT ON COLUMN tb_rpt_info.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_rpt_info.rpt_cn IS '보고내용 (rpt_cn)';
COMMENT ON COLUMN tb_rpt_info.rpt_ttl IS '보고제목 (rpt_ttl)';

-- Comments for tb_rptp_stats
COMMENT ON COLUMN tb_rptp_stats.reprt_id IS '보고서아이디 (reprt_id)';
COMMENT ON COLUMN tb_rptp_stats.reprt_nm IS '보고서명 (reprt_nm)';
COMMENT ON COLUMN tb_rptp_stats.reprt_sttus IS '보고서상태 (reprt_sttus)';
COMMENT ON COLUMN tb_rptp_stats.reprt_type IS '보고서유형 (reprt_type)';
COMMENT ON COLUMN tb_rptp_stats.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_rptp_stats.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_rptp_stats.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_rptp_stats.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_rward_manage
COMMENT ON COLUMN tb_rward_manage.confm_yn IS '승인여부 (confm_yn)';
COMMENT ON COLUMN tb_rward_manage.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_rward_manage.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_rward_manage.aprv_dt IS '승인일시 (aprv_dt)';
COMMENT ON COLUMN tb_rward_manage.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_rward_manage.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_rward_manage.ifml_atrz_id IS '비공식결재아이디 (ifml_atrz_id)';
COMMENT ON COLUMN tb_rward_manage.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_rward_manage.rwrd_cd IS '포상코드 (rwrd_cd)';
COMMENT ON COLUMN tb_rward_manage.rwrd_ymd IS '포상일자 (rwrd_ymd)';
COMMENT ON COLUMN tb_rward_manage.rwrd_id IS '포상아이디 (rwrd_id)';
COMMENT ON COLUMN tb_rward_manage.rwrd_user_id IS '포상사용자아이디 (rwrd_user_id)';
COMMENT ON COLUMN tb_rward_manage.atrzr_id IS '결재자아이디 (atrzr_id)';
COMMENT ON COLUMN tb_rward_manage.rtn_rsn_cn IS '반납사유내용 (rtn_rsn_cn)';
COMMENT ON COLUMN tb_rward_manage.cntrb_cn IS '공적내용 (cntrb_cn)';
COMMENT ON COLUMN tb_rward_manage.rwrd_nm IS '포상명 (rwrd_nm)';

-- Comments for tb_schdl_info
COMMENT ON COLUMN tb_schdl_info.rept_se_cd IS '반복구분코드 (rept_se_cd)';
COMMENT ON COLUMN tb_schdl_info.schdl_imprt_cd IS '일정중요도코드 (schdl_imprt_cd)';
COMMENT ON COLUMN tb_schdl_info.schdl_knd_cd IS '일정종류코드 (schdl_knd_cd)';
COMMENT ON COLUMN tb_schdl_info.schdl_se_cd IS '일정구분코드 (schdl_se_cd)';
COMMENT ON COLUMN tb_schdl_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_schdl_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_schdl_info.atch_file_id IS '첨부파일아이디 (atch_file_id)';
COMMENT ON COLUMN tb_schdl_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_schdl_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_schdl_info.schdl_bgng_ymd IS '일정시작일자 (schdl_bgng_ymd)';
COMMENT ON COLUMN tb_schdl_info.schdl_pic_id IS '일정담당자아이디 (schdl_pic_id)';
COMMENT ON COLUMN tb_schdl_info.schdl_dept_id IS '일정부서아이디 (schdl_dept_id)';
COMMENT ON COLUMN tb_schdl_info.schdl_end_ymd IS '일정종료일자 (schdl_end_ymd)';
COMMENT ON COLUMN tb_schdl_info.schdl_id IS '일정아이디 (schdl_id)';
COMMENT ON COLUMN tb_schdl_info.schdl_cn IS '일정내용 (schdl_cn)';
COMMENT ON COLUMN tb_schdl_info.schdl_nm IS '일정명 (schdl_nm)';
COMMENT ON COLUMN tb_schdl_info.schdl_plc_nm IS '일정장소명 (schdl_plc_nm)';

-- Comments for tb_sms_info
COMMENT ON COLUMN tb_sms_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_sms_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_sms_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_sms_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_sms_info.sms_id IS 'SMS아이디 (sms_id)';
COMMENT ON COLUMN tb_sms_info.sndng_telno IS '발송전화번호 (sndng_telno)';
COMMENT ON COLUMN tb_sms_info.sndng_cn IS '발송내용 (sndng_cn)';

-- Comments for tb_sms_rcptn
COMMENT ON COLUMN tb_sms_rcptn.rslt_cd IS '결과코드 (rslt_cd)';
COMMENT ON COLUMN tb_sms_rcptn.rcptn_telno IS '수신전화번호 (rcptn_telno)';
COMMENT ON COLUMN tb_sms_rcptn.sms_id IS 'SMS아이디 (sms_id)';
COMMENT ON COLUMN tb_sms_rcptn.rslt_msg IS '결과메시지 (rslt_msg)';
COMMENT ON COLUMN tb_sms_rcptn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_sms_rcptn.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_sms_rcptn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_sms_rcptn.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_srvy_artcl
COMMENT ON COLUMN tb_srvy_artcl.etc_ans_yn IS '기타답변여부 (etc_ans_yn)';
COMMENT ON COLUMN tb_srvy_artcl.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_srvy_artcl.artcl_sn IS '항목일련번호 (artcl_sn)';
COMMENT ON COLUMN tb_srvy_artcl.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_srvy_artcl.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_srvy_artcl.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_srvy_artcl.srvy_id IS '설문아이디 (srvy_id)';
COMMENT ON COLUMN tb_srvy_artcl.srvy_artcl_id IS '설문항목아이디 (srvy_artcl_id)';
COMMENT ON COLUMN tb_srvy_artcl.srvy_qstn_id IS '설문질문아이디 (srvy_qstn_id)';
COMMENT ON COLUMN tb_srvy_artcl.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';
COMMENT ON COLUMN tb_srvy_artcl.artcl_cn IS '항목내용 (artcl_cn)';

-- Comments for tb_srvy_info
COMMENT ON COLUMN tb_srvy_info.srvy_id IS '설문아이디 (srvy_id)';
COMMENT ON COLUMN tb_srvy_info.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';
COMMENT ON COLUMN tb_srvy_info.srvy_ttl IS '설문제목 (srvy_ttl)';
COMMENT ON COLUMN tb_srvy_info.srvy_prps IS '설문목적 (srvy_prps)';
COMMENT ON COLUMN tb_srvy_info.srvy_trgt IS '설문대상 (srvy_trgt)';
COMMENT ON COLUMN tb_srvy_info.srvy_wrt_gd_cn IS '설문작성안내내용 (srvy_wrt_gd_cn)';
COMMENT ON COLUMN tb_srvy_info.srvy_bgng_ymd IS '설문시작일자 (srvy_bgng_ymd)';
COMMENT ON COLUMN tb_srvy_info.srvy_end_ymd IS '설문종료일자 (srvy_end_ymd)';
COMMENT ON COLUMN tb_srvy_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_srvy_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_srvy_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_srvy_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_srvy_qstn
COMMENT ON COLUMN tb_srvy_qstn.max_chc_cnt IS '최대선택수 (max_chc_cnt)';
COMMENT ON COLUMN tb_srvy_qstn.qstn_type_cd IS '질문유형코드 (qstn_type_cd)';
COMMENT ON COLUMN tb_srvy_qstn.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_srvy_qstn.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_srvy_qstn.qstn_sn IS '질문일련번호 (qstn_sn)';
COMMENT ON COLUMN tb_srvy_qstn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_srvy_qstn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_srvy_qstn.srvy_id IS '설문아이디 (srvy_id)';
COMMENT ON COLUMN tb_srvy_qstn.srvy_qstn_id IS '설문질문아이디 (srvy_qstn_id)';
COMMENT ON COLUMN tb_srvy_qstn.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';
COMMENT ON COLUMN tb_srvy_qstn.qstn_cn IS '질문내용 (qstn_cn)';

-- Comments for tb_srvy_rslt
COMMENT ON COLUMN tb_srvy_rslt.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_srvy_rslt.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_srvy_rslt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_srvy_rslt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_srvy_rslt.srvy_id IS '설문아이디 (srvy_id)';
COMMENT ON COLUMN tb_srvy_rslt.srvy_artcl_id IS '설문항목아이디 (srvy_artcl_id)';
COMMENT ON COLUMN tb_srvy_rslt.srvy_qstn_id IS '설문질문아이디 (srvy_qstn_id)';
COMMENT ON COLUMN tb_srvy_rslt.srvy_rspns_id IS '설문응답아이디 (srvy_rspns_id)';
COMMENT ON COLUMN tb_srvy_rslt.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';
COMMENT ON COLUMN tb_srvy_rslt.rspns_nm IS '응답명 (rspns_nm)';
COMMENT ON COLUMN tb_srvy_rslt.etc_ans_cn IS '기타답변내용 (etc_ans_cn)';
COMMENT ON COLUMN tb_srvy_rslt.rspdnt_ans_cn IS '응답자답변내용 (rspdnt_ans_cn)';

-- Comments for tb_srvy_rspdnt
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_id IS '설문아이디 (srvy_id)';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_rspdnt_id IS '설문응답자아이디 (srvy_rspdnt_id)';
COMMENT ON COLUMN tb_srvy_rspdnt.gndr_cd IS '성별코드 (gndr_cd)';
COMMENT ON COLUMN tb_srvy_rspdnt.cr_type_cd IS '직업유형코드 (cr_type_cd)';
COMMENT ON COLUMN tb_srvy_rspdnt.rspdnt_nm IS '응답자명 (rspdnt_nm)';
COMMENT ON COLUMN tb_srvy_rspdnt.brdt IS '생년월일 (brdt)';
COMMENT ON COLUMN tb_srvy_rspdnt.rgn_telno IS '지역전화번호 (rgn_telno)';
COMMENT ON COLUMN tb_srvy_rspdnt.mid_telno IS '중간전화번호 (mid_telno)';
COMMENT ON COLUMN tb_srvy_rspdnt.end_telno IS '종료전화번호 (end_telno)';
COMMENT ON COLUMN tb_srvy_rspdnt.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_srvy_rspdnt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_srvy_rspdnt.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_srvy_rspdnt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_srvy_tmplt
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_id IS '설문서식아이디 (srvy_tmplt_id)';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_type_cd IS '설문서식유형코드 (srvy_tmplt_type_cd)';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_expln IS '설문서식설명 (srvy_tmplt_expln)';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_path_nm IS '설문서식경로명 (srvy_tmplt_path_nm)';
COMMENT ON COLUMN tb_srvy_tmplt.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_srvy_tmplt.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_srvy_tmplt.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_srvy_tmplt.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_img_info IS '설문서식이미지정보 (srvy_tmplt_img_info)';

-- Comments for tb_stmp_info
COMMENT ON COLUMN tb_stmp_info.mpng_crt_id IS '매핑생성아이디 (mpng_crt_id)';
COMMENT ON COLUMN tb_stmp_info.crtr_id IS '기준아이디 (crtr_id)';
COMMENT ON COLUMN tb_stmp_info.mpng_file_nm IS '매핑파일명 (mpng_file_nm)';
COMMENT ON COLUMN tb_stmp_info.mpng_file_path IS '매핑파일경로 (mpng_file_path)';
COMMENT ON COLUMN tb_stmp_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_stmp_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_stmp_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_stmp_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_sys_log
COMMENT ON COLUMN tb_sys_log.err_se_cd IS '오류구분코드 (err_se_cd)';
COMMENT ON COLUMN tb_sys_log.prcs_se_cd IS '처리구분코드 (prcs_se_cd)';
COMMENT ON COLUMN tb_sys_log.rspns_cd IS '응답코드 (rspns_cd)';
COMMENT ON COLUMN tb_sys_log.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_sys_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_sys_log.prcs_tm IS '처리시각 (prcs_tm)';
COMMENT ON COLUMN tb_sys_log.err_cd IS '오류코드 (err_cd)';
COMMENT ON COLUMN tb_sys_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_sys_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_sys_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';
COMMENT ON COLUMN tb_sys_log.dmnd_id IS '요청아이디 (dmnd_id)';
COMMENT ON COLUMN tb_sys_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';
COMMENT ON COLUMN tb_sys_log.dmnd_user_ip_addr IS '요청사용자IP주소 (dmnd_user_ip_addr)';
COMMENT ON COLUMN tb_sys_log.mthd_nm IS '방법명 (mthd_nm)';
COMMENT ON COLUMN tb_sys_log.srvc_nm IS '서비스명 (srvc_nm)';

-- Comments for tb_tmplt_info
COMMENT ON COLUMN tb_tmplt_info.use_yn IS '사용여부 (use_yn)';
COMMENT ON COLUMN tb_tmplt_info.tmplt_se_cd IS '서식구분코드 (tmplt_se_cd)';
COMMENT ON COLUMN tb_tmplt_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_tmplt_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_tmplt_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_tmplt_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_tmplt_info.tmplt_id IS '서식아이디 (tmplt_id)';
COMMENT ON COLUMN tb_tmplt_info.tmplt_nm IS '서식명 (tmplt_nm)';
COMMENT ON COLUMN tb_tmplt_info.tmplt_path IS '서식경로 (tmplt_path)';

-- Comments for tb_user_absn
COMMENT ON COLUMN tb_user_absn.user_absn_yn IS '사용자부재여부 (user_absn_yn)';
COMMENT ON COLUMN tb_user_absn.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_user_absn.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_user_absn.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_user_absn.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_user_absn.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_user_authrt_map
COMMENT ON COLUMN tb_user_authrt_map.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_user_authrt_map.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_user_authrt_map.mbr_type_cd IS '회원유형코드 (mbr_type_cd)';
COMMENT ON COLUMN tb_user_authrt_map.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_user_authrt_map.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_user_authrt_map.scrty_dcsn_trgt_id IS '보안결정대상아이디 (scrty_dcsn_trgt_id)';
COMMENT ON COLUMN tb_user_authrt_map.authrt_id IS '권한아이디 (authrt_id)';

-- Comments for tb_user_info
COMMENT ON COLUMN tb_user_info.esntl_id IS '필수아이디 (esntl_id)';
COMMENT ON COLUMN tb_user_info.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_user_info.user_type_cd IS '사용자유형코드 (user_type_cd)';
COMMENT ON COLUMN tb_user_info.pswd IS '비밀번호 (pswd)';
COMMENT ON COLUMN tb_user_info.pswd_hint IS '비밀번호힌트 (pswd_hint)';
COMMENT ON COLUMN tb_user_info.pswd_cnsr IS '비밀번호검열 (pswd_cnsr)';
COMMENT ON COLUMN tb_user_info.chg_pswd_last_dt IS '변경비밀번호최종일시 (chg_pswd_last_dt)';
COMMENT ON COLUMN tb_user_info.chg_pwd_cnt IS '변경비밀번호수 (chg_pwd_cnt)';
COMMENT ON COLUMN tb_user_info.lck_yn IS '잠금여부 (lck_yn)';
COMMENT ON COLUMN tb_user_info.lck_cnt IS '잠금수 (lck_cnt)';
COMMENT ON COLUMN tb_user_info.lck_last_pnttm IS '잠금최종시점 (lck_last_pnttm)';
COMMENT ON COLUMN tb_user_info.otp_secret IS 'OTP비밀 (otp_secret)';
COMMENT ON COLUMN tb_user_info.crtfc_dn_value IS '인증고유명값 (crtfc_dn_value)';
COMMENT ON COLUMN tb_user_info.user_nm IS '사용자명 (user_nm)';
COMMENT ON COLUMN tb_user_info.rrno IS '주민등록번호 (rrno)';
COMMENT ON COLUMN tb_user_info.gndr_cd IS '성별코드 (gndr_cd)';
COMMENT ON COLUMN tb_user_info.brth_ymd IS '출생일자 (brth_ymd)';
COMMENT ON COLUMN tb_user_info.eml_addr IS '이메일주소 (eml_addr)';
COMMENT ON COLUMN tb_user_info.mbl_telno IS '휴대전화번호 (mbl_telno)';
COMMENT ON COLUMN tb_user_info.zip IS '우편번호 (zip)';
COMMENT ON COLUMN tb_user_info.base_addr IS '기본주소 (base_addr)';
COMMENT ON COLUMN tb_user_info.dtl_addr IS '상세주소 (dtl_addr)';
COMMENT ON COLUMN tb_user_info.area_no IS '면적번호 (area_no)';
COMMENT ON COLUMN tb_user_info.middle_telno IS '중간전화번호 (middle_telno)';
COMMENT ON COLUMN tb_user_info.end_telno IS '종료전화번호 (end_telno)';
COMMENT ON COLUMN tb_user_info.fax_no IS '팩스번호 (fax_no)';
COMMENT ON COLUMN tb_user_info.office_telno IS '사무소전화번호 (office_telno)';
COMMENT ON COLUMN tb_user_info.group_id IS '그룹아이디 (group_id)';
COMMENT ON COLUMN tb_user_info.ognz_id IS '조직아이디 (ognz_id)';
COMMENT ON COLUMN tb_user_info.pstinst_cd IS '소속기관코드 (pstinst_cd)';
COMMENT ON COLUMN tb_user_info.empl_no IS '사원번호 (empl_no)';
COMMENT ON COLUMN tb_user_info.ofcps_nm IS '직위명 (ofcps_nm)';
COMMENT ON COLUMN tb_user_info.role IS '역할 (role)';
COMMENT ON COLUMN tb_user_info.bizr_no IS '사업자번호 (bizr_no)';
COMMENT ON COLUMN tb_user_info.jurir_no IS '법인번호 (jurir_no)';
COMMENT ON COLUMN tb_user_info.cmpny_nm IS '회사명 (cmpny_nm)';
COMMENT ON COLUMN tb_user_info.rprsv_nm IS '대표자명 (rprsv_nm)';
COMMENT ON COLUMN tb_user_info.induty_cd IS '업종코드 (induty_cd)';
COMMENT ON COLUMN tb_user_info.ent_se_cd IS '기업구분코드 (ent_se_cd)';
COMMENT ON COLUMN tb_user_info.user_stts_cd IS '사용자상태코드 (user_stts_cd)';
COMMENT ON COLUMN tb_user_info.sbscrb_ymd IS '가입일자 (sbscrb_ymd)';
COMMENT ON COLUMN tb_user_info.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_user_info.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_user_info.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_user_info.mdfcn_dt IS '수정일시 (mdfcn_dt)';

-- Comments for tb_user_log
COMMENT ON COLUMN tb_user_log.crt_cnt IS '생성수 (crt_cnt)';
COMMENT ON COLUMN tb_user_log.del_cnt IS '삭제수 (del_cnt)';
COMMENT ON COLUMN tb_user_log.err_cnt IS '오류수 (err_cnt)';
COMMENT ON COLUMN tb_user_log.otpt_cnt IS '출력수 (otpt_cnt)';
COMMENT ON COLUMN tb_user_log.inq_cnt IS '조회수 (inq_cnt)';
COMMENT ON COLUMN tb_user_log.mdfcn_cnt IS '수정수 (mdfcn_cnt)';
COMMENT ON COLUMN tb_user_log.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_user_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_user_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_user_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_user_log.ocrn_ymd IS '발생일자 (ocrn_ymd)';
COMMENT ON COLUMN tb_user_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';
COMMENT ON COLUMN tb_user_log.mthd_nm IS '방법명 (mthd_nm)';
COMMENT ON COLUMN tb_user_log.srvc_nm IS '서비스명 (srvc_nm)';

-- Comments for tb_user_mdfcn_dtls
COMMENT ON COLUMN tb_user_mdfcn_dtls.user_id IS '사용자아이디 (user_id)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mdfcn_ymd IS '수정일자 (mdfcn_ymd)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.ognz_id IS '조직아이디 (ognz_id)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.group_id IS '그룹아이디 (group_id)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.empl_no IS '사원번호 (empl_no)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.gndr_cd IS '성별코드 (gndr_cd)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.brth_ymd IS '출생일자 (brth_ymd)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.fax_no IS '팩스번호 (fax_no)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_base_addr IS '자택기본주소 (home_base_addr)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_end_tel_no IS '자택종료전화번호 (home_end_tel_no)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_rgn_tel_no IS '자택지역전화번호 (home_rgn_tel_no)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.dtl_addr IS '상세주소 (dtl_addr)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.zip IS '우편번호 (zip)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.offm_telno IS '오피스텔전화번호 (offm_telno)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mbl_tel_no IS '휴대전화번호 (mbl_tel_no)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.eml_addr IS '이메일주소 (eml_addr)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_mid_tel_no IS '자택중간전화번호 (home_mid_tel_no)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.inst_id IS '기관아이디 (inst_id)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.user_stts_cd IS '사용자상태코드 (user_stts_cd)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.esntl_id IS '필수아이디 (esntl_id)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_user_mdfcn_dtls.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';

-- Comments for tb_user_noti
COMMENT ON COLUMN tb_user_noti.read_yn IS '조회여부 (read_yn)';
COMMENT ON COLUMN tb_user_noti.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_user_noti.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_user_noti.noti_ivl_val IS '알림개별값 (noti_ivl_val)';
COMMENT ON COLUMN tb_user_noti.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_user_noti.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_user_noti.noti_sn IS '알림일련번호 (noti_sn)';
COMMENT ON COLUMN tb_user_noti.noti_dt IS '알림일시 (noti_dt)';
COMMENT ON COLUMN tb_user_noti.rcvr_id IS '수신자아이디 (rcvr_id)';
COMMENT ON COLUMN tb_user_noti.noti_ttl_nm IS '알림제목명 (noti_ttl_nm)';
COMMENT ON COLUMN tb_user_noti.noti_cn IS '알림내용 (noti_cn)';
COMMENT ON COLUMN tb_user_noti.link_url IS '연계URL (link_url)';

-- Comments for tb_web_log
COMMENT ON COLUMN tb_web_log.crt_dt IS '생성일시 (crt_dt)';
COMMENT ON COLUMN tb_web_log.mdfcn_dt IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN tb_web_log.occr_ymd IS '발생일자 (occr_ymd)';
COMMENT ON COLUMN tb_web_log.frst_rgtr_id IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN tb_web_log.last_mdfr_id IS '최종수정자아이디 (last_mdfr_id)';
COMMENT ON COLUMN tb_web_log.dmnd_id IS '요청아이디 (dmnd_id)';
COMMENT ON COLUMN tb_web_log.dmnd_user_id IS '요청사용자아이디 (dmnd_user_id)';
COMMENT ON COLUMN tb_web_log.dmnd_user_ip_addr IS '요청사용자IP주소 (dmnd_user_ip_addr)';
COMMENT ON COLUMN tb_web_log.url IS 'URL (url)';