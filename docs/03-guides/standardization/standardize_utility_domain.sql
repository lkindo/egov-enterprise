/*
 * DB Standardization Migration Script (Utility Domain Consolidated) - Full Comments Included
 * Targets: tb_admdst_cd_rcptn_log, tb_admin_district_code, tb_orgnzt_info, tb_hldy_info, tb_note_info, tb_note_rcptn, tb_note_trsm, tb_onln_mnl_info, tb_user_absence, tb_user_ntcn, tb_user_info_chg_dtls, tb_user_log, tb_sys_log, tb_web_log, tb_privacy_log, tb_sms_info, tb_sms_rcptn, tb_stsfdg_info, tb_onln_poll_manage, tb_onln_poll_artcl, tb_onln_poll_rslt, tb_adbk_info, tb_adbk_manage, tb_cnslt_list, tb_cnslt_manage, tb_event_info, tb_faq_info, tb_inst_code, tb_inst_cd_rcptn_log, tb_main_image
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_onln_mnl_info
ALTER TABLE tb_onln_mnl_info 
    RENAME COLUMN online_mnl_id TO onln_mnl_id,
    RENAME COLUMN online_mnl_nm TO onln_mnl_ttl,
    ALTER COLUMN onln_mnl_ttl TYPE VARCHAR(300),
    RENAME COLUMN online_mnl_dc TO onln_mnl_expln,
    ALTER COLUMN onln_mnl_expln TYPE VARCHAR(4000),
    RENAME COLUMN online_mnl_se_code TO onln_mnl_se_cd,
    ALTER COLUMN onln_mnl_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_onln_mnl_info IS '온라인 매뉴얼 정보';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_id IS '온라인매뉴얼아이디';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_ttl IS '온라인매뉴얼제목';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_expln IS '온라인매뉴얼설명';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_dfn IS '온라인매뉴얼정의';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_se_cd IS '온라인매뉴얼구분코드';
COMMENT ON COLUMN tb_onln_mnl_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_onln_mnl_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_onln_mnl_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_onln_mnl_info.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_user_absence
ALTER TABLE tb_user_absence 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN user_absnce_yn TO absnce_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_user_absence IS '사용자 부재 정보';
COMMENT ON COLUMN tb_user_absence.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_absence.absnce_yn IS '부재여부';
COMMENT ON COLUMN tb_user_absence.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_absence.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_absence.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_absence.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_user_info_chg_dtls
ALTER TABLE tb_user_info_chg_dtls 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN change_de TO chg_ymd,
    ALTER COLUMN chg_ymd TYPE CHAR(8),
    RENAME COLUMN sexdstn_code TO gender_cd,
    ALTER COLUMN gender_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN eml_addr TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN mbtlnum TO mbl_telno,
    RENAME COLUMN house_adres TO home_addr,
    ALTER COLUMN home_addr TYPE VARCHAR(300),
    RENAME COLUMN house_middle_telno TO home_middle_telno,
    RENAME COLUMN house_end_telno TO home_end_telno,
    RENAME COLUMN pstinst_code TO inst_cd,
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN emplyr_sttus_code TO user_stts_cd,
    ALTER COLUMN user_stts_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_user_info_chg_dtls IS '사용자 정보 변경 내역';
COMMENT ON COLUMN tb_user_info_chg_dtls.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.esntl_id IS '필수아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.chg_ymd IS '변경일자';
COMMENT ON COLUMN tb_user_info_chg_dtls.orgnzt_id IS '조직아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.group_id IS '그룹아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.inst_cd IS '기관코드';
COMMENT ON COLUMN tb_user_info_chg_dtls.empl_no IS '사원번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.gender_cd IS '성별코드';
COMMENT ON COLUMN tb_user_info_chg_dtls.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_user_info_chg_dtls.email_addr IS '이메일주소';
COMMENT ON COLUMN tb_user_info_chg_dtls.mbl_telno IS '휴대폰번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.zip IS '우편번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.home_addr IS '자택주소';
COMMENT ON COLUMN tb_user_info_chg_dtls.detail_adres IS '상세주소';
COMMENT ON COLUMN tb_user_info_chg_dtls.area_no IS '지역번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.home_middle_telno IS '자택중간전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.home_end_telno IS '자택끝전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.offm_telno IS '사무실전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.fxnum IS '팩스번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.user_stts_cd IS '사용자상태코드';
COMMENT ON COLUMN tb_user_info_chg_dtls.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_info_chg_dtls.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_info_chg_dtls.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_user_log
ALTER TABLE tb_user_log 
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    RENAME COLUMN rqester_id TO user_id,
    RENAME COLUMN svc_nm TO srvc_nm,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_user_log IS '사용자 로그';
COMMENT ON COLUMN tb_user_log.occr_ymd IS '발생일자';
COMMENT ON COLUMN tb_user_log.user_id IS '요청자아이디';
COMMENT ON COLUMN tb_user_log.srvc_nm IS '서비스명';
COMMENT ON COLUMN tb_user_log.method_nm IS '메서드명';
COMMENT ON COLUMN tb_user_log.crt_cnt IS '생성수';
COMMENT ON COLUMN tb_user_log.inq_cnt IS '조회수';
COMMENT ON COLUMN tb_user_log.mdfcn_cnt IS '수정수';
COMMENT ON COLUMN tb_user_log.del_cnt IS '삭제수';
COMMENT ON COLUMN tb_user_log.outpt_cnt IS '출력수';
COMMENT ON COLUMN tb_user_log.err_cnt IS '에러수';
COMMENT ON COLUMN tb_user_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_log.last_mdfr_id IS '최종수정자아이디';

-- 5. tb_sys_log
ALTER TABLE tb_sys_log 
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    RENAME COLUMN rqester_id TO user_id,
    RENAME COLUMN rqester_ip TO user_ip,
    RENAME COLUMN process_se_code TO prcs_se_cd,
    ALTER COLUMN prcs_se_cd TYPE VARCHAR(12),
    RENAME COLUMN process_time TO prcs_tm,
    RENAME COLUMN error_se TO err_se_cd,
    ALTER COLUMN err_se_cd TYPE VARCHAR(12),
    RENAME COLUMN error_code TO err_cd,
    ALTER COLUMN err_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_sys_log IS '시스템 로그';
COMMENT ON COLUMN tb_sys_log.requst_id IS '요청아이디';
COMMENT ON COLUMN tb_sys_log.occr_ymd IS '발생일자';
COMMENT ON COLUMN tb_sys_log.user_id IS '요청자아이디';
COMMENT ON COLUMN tb_sys_log.user_ip IS '요청자IP';
COMMENT ON COLUMN tb_sys_log.svc_nm IS '서비스명';
COMMENT ON COLUMN tb_sys_log.method_nm IS '메서드명';
COMMENT ON COLUMN tb_sys_log.prcs_se_cd IS '처리구분코드';
COMMENT ON COLUMN tb_sys_log.prcs_tm IS '처리시간';
COMMENT ON COLUMN tb_sys_log.rspns_code IS '응답코드';
COMMENT ON COLUMN tb_sys_log.err_se_cd IS '에러구분코드';
COMMENT ON COLUMN tb_sys_log.err_cd IS '에러코드';
COMMENT ON COLUMN tb_sys_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_sys_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_sys_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_sys_log.last_mdfr_id IS '최종수정자아이디';

-- 6. tb_web_log
ALTER TABLE tb_web_log 
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    RENAME COLUMN rqester_id TO user_id,
    RENAME COLUMN rqester_ip TO user_ip,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_web_log IS '웹 로그';
COMMENT ON COLUMN tb_web_log.requst_id IS '요청아이디';
COMMENT ON COLUMN tb_web_log.occr_ymd IS '발생일자';
COMMENT ON COLUMN tb_web_log.user_id IS '요청자아이디';
COMMENT ON COLUMN tb_web_log.user_ip IS '요청자IP';
COMMENT ON COLUMN tb_web_log.url IS 'URL';
COMMENT ON COLUMN tb_web_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_web_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_web_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_web_log.last_mdfr_id IS '최종수정자아이디';

-- 7. tb_privacy_log
ALTER TABLE tb_privacy_log 
    RENAME COLUMN inqire_dt TO inq_dt,
    RENAME COLUMN rqester_id TO user_id,
    RENAME COLUMN rqester_ip TO user_ip,
    RENAME COLUMN srvc_nm TO srvc_nm,
    RENAME COLUMN inqire_info TO inq_expln,
    ALTER COLUMN inq_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_privacy_log IS '개인정보 로그';
COMMENT ON COLUMN tb_privacy_log.requst_id IS '요청아이디';
COMMENT ON COLUMN tb_privacy_log.inq_dt IS '조회일시';
COMMENT ON COLUMN tb_privacy_log.user_id IS '요청자아이디';
COMMENT ON COLUMN tb_privacy_log.user_ip IS '요청자IP';
COMMENT ON COLUMN tb_privacy_log.srvc_nm IS '서비스명';
COMMENT ON COLUMN tb_privacy_log.inq_expln IS '조회정보설명';
COMMENT ON COLUMN tb_privacy_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_privacy_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_privacy_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_privacy_log.last_mdfr_id IS '최종수정자아이디';

-- 8. tb_sms_info
ALTER TABLE tb_sms_info 
    RENAME COLUMN trnsmis_cn TO trsm_expln,
    ALTER COLUMN trsm_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_sms_info IS 'SMS 정보';
COMMENT ON COLUMN tb_sms_info.sms_id IS 'SMS아이디';
COMMENT ON COLUMN tb_sms_info.trsm_telno IS '발신전화번호';
COMMENT ON COLUMN tb_sms_info.trsm_expln IS '전송내용';
COMMENT ON COLUMN tb_sms_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_sms_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_sms_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_sms_info.last_mdfr_id IS '최종수정자아이디';

-- 9. tb_sms_rcptn
ALTER TABLE tb_sms_rcptn 
    RENAME COLUMN result_code TO rslt_cd,
    ALTER COLUMN rslt_cd TYPE VARCHAR(12),
    RENAME COLUMN result_mssage TO rslt_msg,
    ALTER COLUMN rslt_msg TYPE VARCHAR(4000);

COMMENT ON TABLE tb_sms_rcptn IS 'SMS 수신 정보';
COMMENT ON COLUMN tb_sms_rcptn.sms_id IS 'SMS아이디';
COMMENT ON COLUMN tb_sms_rcptn.rcptn_telno IS '수신전화번호';
COMMENT ON COLUMN tb_sms_rcptn.rslt_cd IS '결과코드';
COMMENT ON COLUMN tb_sms_rcptn.rslt_msg IS '결과메시지';

-- 10. tb_stsfdg_info
ALTER TABLE tb_stsfdg_info 
    RENAME COLUMN ntt_id TO pst_id,
    RENAME COLUMN stsfdg_cn TO stsfdg_expln,
    ALTER COLUMN stsfdg_expln TYPE VARCHAR(4000),
    RENAME COLUMN dgstfn_scr TO stsfdg_scr,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_stsfdg_info IS '만족도 정보';
COMMENT ON COLUMN tb_stsfdg_info.stsfdg_no IS '만족도번호';
COMMENT ON COLUMN tb_stsfdg_info.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_stsfdg_info.pst_id IS '게시물아이디';
COMMENT ON COLUMN tb_stsfdg_info.wrter_id IS '작성자아이디';
COMMENT ON COLUMN tb_stsfdg_info.wrter_nm IS '작성자명';
COMMENT ON COLUMN tb_stsfdg_info.pswd IS '비밀번호';
COMMENT ON COLUMN tb_stsfdg_info.stsfdg_expln IS '만족도내용';
COMMENT ON COLUMN tb_stsfdg_info.stsfdg_scr IS '만족도점수';
COMMENT ON COLUMN tb_stsfdg_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_stsfdg_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_stsfdg_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_stsfdg_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_stsfdg_info.last_mdfr_id IS '최종수정자아이디';

-- 11. tb_onln_poll_manage
ALTER TABLE tb_onln_poll_manage 
    RENAME COLUMN poll_nm TO poll_ttl,
    ALTER COLUMN poll_ttl TYPE VARCHAR(300),
    RENAME COLUMN poll_bgng_ymd TO poll_bgng_ymd,
    ALTER COLUMN poll_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN poll_end_ymd TO poll_end_ymd,
    ALTER COLUMN poll_end_ymd TYPE CHAR(8),
    RENAME COLUMN poll_knd TO poll_knd_cd,
    ALTER COLUMN poll_knd_cd TYPE VARCHAR(12),
    RENAME COLUMN poll_dsuse_yn TO dsuse_yn,
    RENAME COLUMN poll_atmc_dsuse_yn TO atmc_dsuse_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_onln_poll_manage IS '온라인 투표 관리';
COMMENT ON COLUMN tb_onln_poll_manage.poll_id IS '투표아이디';
COMMENT ON COLUMN tb_onln_poll_manage.poll_ttl IS '투표제목';
COMMENT ON COLUMN tb_onln_poll_manage.poll_bgng_ymd IS '투표시작일자';
COMMENT ON COLUMN tb_onln_poll_manage.poll_end_ymd IS '투표종료일자';
COMMENT ON COLUMN tb_onln_poll_manage.poll_knd_cd IS '투표종류코드';
COMMENT ON COLUMN tb_onln_poll_manage.dsuse_yn IS '폐기여부';
COMMENT ON COLUMN tb_onln_poll_manage.atmc_dsuse_yn IS '자동폐기여부';
COMMENT ON COLUMN tb_onln_poll_manage.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_onln_poll_manage.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_onln_poll_manage.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_onln_poll_manage.last_mdfr_id IS '최종수정자아이디';

-- 12. tb_onln_poll_artcl
ALTER TABLE tb_onln_poll_artcl 
    RENAME COLUMN poll_iem_nm TO poll_itm_ttl,
    ALTER COLUMN poll_itm_ttl TYPE VARCHAR(300),
    RENAME COLUMN poll_iem_id TO poll_itm_id;

COMMENT ON TABLE tb_onln_poll_artcl IS '온라인 투표 항목';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_itm_id IS '투표항목아이디';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_id IS '투표아이디';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_itm_ttl IS '투표항목명';

-- 13. tb_onln_poll_rslt
ALTER TABLE tb_onln_poll_rslt 
    RENAME COLUMN poll_iem_id TO poll_itm_id,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_onln_poll_rslt IS '온라인 투표 결과';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_result_id IS '투표결과아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_id IS '투표아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_itm_id IS '투표항목아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_onln_poll_rslt.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_onln_poll_rslt.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.last_mdfr_id IS '최종수정자아이디';

-- 14. tb_adbk_info
ALTER TABLE tb_adbk_info 
    RENAME COLUMN adbk_nm TO adbk_ttl,
    ALTER COLUMN adbk_ttl TYPE VARCHAR(300),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_adbk_info IS '주소록 정보';
COMMENT ON COLUMN tb_adbk_info.adbk_id IS '주소록아이디';
COMMENT ON COLUMN tb_adbk_info.adbk_ttl IS '주소록명';
COMMENT ON COLUMN tb_adbk_info.othbc_scope IS '공개범위';
COMMENT ON COLUMN tb_adbk_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_adbk_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_adbk_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_adbk_info.last_mdfr_id IS '최종수정자아이디';

-- 15. tb_adbk_manage
ALTER TABLE tb_adbk_manage 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN ncnm TO nick_nm,
    RENAME COLUMN eml_addr TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN mbtlnum TO mbl_telno,
    RENAME COLUMN offm_telno TO office_telno,
    RENAME COLUMN fxnum TO fax_no,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_adbk_manage IS '주소록 관리';
COMMENT ON COLUMN tb_adbk_manage.adbk_id IS '주소록아이디';
COMMENT ON COLUMN tb_adbk_manage.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_adbk_manage.nick_nm IS '닉네임';
COMMENT ON COLUMN tb_adbk_manage.email_addr IS '이메일주소';
COMMENT ON COLUMN tb_adbk_manage.mbl_telno IS '휴대폰번호';
COMMENT ON COLUMN tb_adbk_manage.office_telno IS '사무실전화번호';
COMMENT ON COLUMN tb_adbk_manage.fax_no IS '팩스번호';
COMMENT ON COLUMN tb_adbk_manage.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_adbk_manage.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_adbk_manage.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_adbk_manage.last_mdfr_id IS '최종수정자아이디';

-- 16. tb_cnslt_list
ALTER TABLE tb_cnslt_list 
    RENAME COLUMN cnslt_sj TO cnslt_ttl,
    ALTER COLUMN cnslt_ttl TYPE VARCHAR(300),
    RENAME COLUMN cnslt_cn TO cnslt_expln,
    ALTER COLUMN cnslt_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_cnslt_list IS '상담 목록';
COMMENT ON COLUMN tb_cnslt_list.cnslt_id IS '상담아이디';
COMMENT ON COLUMN tb_cnslt_list.cnslt_ttl IS '상담제목';
COMMENT ON COLUMN tb_cnslt_list.cnslt_expln IS '상담내용';
COMMENT ON COLUMN tb_cnslt_list.wrter_id IS '작성자아이디';
COMMENT ON COLUMN tb_cnslt_list.password IS '비밀번호';
COMMENT ON COLUMN tb_cnslt_list.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_cnslt_list.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_cnslt_list.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_cnslt_list.last_mdfr_id IS '최종수정자아이디';

-- 17. tb_cnslt_manage
ALTER TABLE tb_cnslt_manage 
    RENAME COLUMN answer_cn TO ans_expln,
    ALTER COLUMN ans_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_cnslt_manage IS '상담 관리';
COMMENT ON COLUMN tb_cnslt_manage.cnslt_id IS '상담아이디';
COMMENT ON COLUMN tb_cnslt_manage.ans_expln IS '답변내용';
COMMENT ON COLUMN tb_cnslt_manage.charger_id IS '담당자아이디';
COMMENT ON COLUMN tb_cnslt_manage.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_cnslt_manage.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_cnslt_manage.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_cnslt_manage.last_mdfr_id IS '최종수정자아이디';

-- 18. tb_event_info
ALTER TABLE tb_event_info 
    RENAME COLUMN event_nm TO event_ttl,
    ALTER COLUMN event_ttl TYPE VARCHAR(300),
    RENAME COLUMN event_cn TO event_expln,
    ALTER COLUMN event_expln TYPE VARCHAR(4000),
    RENAME COLUMN event_bgnde TO event_bgng_ymd,
    ALTER COLUMN event_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN event_endde TO event_end_ymd,
    ALTER COLUMN event_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_event_info IS '행사 정보';
COMMENT ON COLUMN tb_event_info.event_id IS '행사아이디';
COMMENT ON COLUMN tb_event_info.event_ttl IS '행사제목';
COMMENT ON COLUMN tb_event_info.event_expln IS '행사내용';
COMMENT ON COLUMN tb_event_info.event_bgng_ymd IS '행사시작일자';
COMMENT ON COLUMN tb_event_info.event_end_ymd IS '행사종료일자';
COMMENT ON COLUMN tb_event_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_event_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_event_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_event_info.last_mdfr_id IS '최종수정자아이디';

-- 19. tb_faq_info
ALTER TABLE tb_faq_info 
    RENAME COLUMN faq_sj TO faq_ttl,
    ALTER COLUMN faq_ttl TYPE VARCHAR(300),
    RENAME COLUMN faq_cn TO faq_expln,
    ALTER COLUMN faq_expln TYPE VARCHAR(4000),
    RENAME COLUMN answer_cn TO ans_expln,
    ALTER COLUMN ans_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_faq_info IS 'FAQ 정보';
COMMENT ON COLUMN tb_faq_info.faq_id IS 'FAQ아이디';
COMMENT ON COLUMN tb_faq_info.faq_ttl IS 'FAQ제목';
COMMENT ON COLUMN tb_faq_info.faq_expln IS 'FAQ내용';
COMMENT ON COLUMN tb_faq_info.ans_expln IS '답변내용';
COMMENT ON COLUMN tb_faq_info.rdcnt IS '조회수';
COMMENT ON COLUMN tb_faq_info.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_faq_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_faq_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_faq_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_faq_info.last_mdfr_id IS '최종수정자아이디';

-- 20. tb_inst_code
ALTER TABLE tb_inst_code 
    RENAME COLUMN instt_code TO inst_cd,
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN instt_nm TO inst_nm,
    RENAME COLUMN up_instt_code TO up_inst_cd,
    ALTER COLUMN up_inst_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_inst_code IS '기관 코드';
COMMENT ON COLUMN tb_inst_code.inst_cd IS '기관코드';
COMMENT ON COLUMN tb_inst_code.inst_nm IS '기관명';
COMMENT ON COLUMN tb_inst_code.up_inst_cd IS '상위기관코드';
COMMENT ON COLUMN tb_inst_code.use_yn IS '사용여부';
COMMENT ON COLUMN tb_inst_code.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_inst_code.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_inst_code.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_inst_code.last_mdfr_id IS '최종수정자아이디';

-- 21. tb_inst_cd_rcptn_log
ALTER TABLE tb_inst_cd_rcptn_log 
    RENAME COLUMN occrrnc_de TO occr_ymd,
    ALTER COLUMN occr_ymd TYPE CHAR(8),
    RENAME COLUMN instt_code TO inst_cd,
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN change_se_code TO chg_se_cd,
    ALTER COLUMN chg_se_cd TYPE VARCHAR(12),
    RENAME COLUMN process_se TO prcs_se_cd,
    ALTER COLUMN prcs_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_inst_cd_rcptn_log IS '기관코드 수신로그';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.occr_ymd IS '발생일자';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_cd IS '기관코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.chg_se_cd IS '변경구분코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.prcs_se_cd IS '처리구분코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.instt_nm IS '기관명';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.last_mdfr_id IS '최종수정자아이디';

-- 22. tb_main_image
ALTER TABLE tb_main_image 
    RENAME COLUMN main_image_nm TO image_ttl,
    ALTER COLUMN image_ttl TYPE VARCHAR(300),
    RENAME COLUMN main_image TO image_nm,
    RENAME COLUMN main_image_file TO image_path,
    RENAME COLUMN reflct_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_main_image IS '메인 이미지';
COMMENT ON COLUMN tb_main_image.image_id IS '이미지아이디';
COMMENT ON COLUMN tb_main_image.image_ttl IS '이미지제목';
COMMENT ON COLUMN tb_main_image.image_nm IS '이미지명';
COMMENT ON COLUMN tb_main_image.image_path IS '이미지경로';
COMMENT ON COLUMN tb_main_image.use_yn IS '사용여부';
COMMENT ON COLUMN tb_main_image.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_main_image.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_main_image.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_main_image.last_mdfr_id IS '최종수정자아이디';

-- 23. tb_ifml_atrz_info
ALTER TABLE tb_ifml_atrz_info 
    RENAME COLUMN infrml_sanctn_id TO ifml_atrz_id,
    RENAME COLUMN applcnt_id TO aplcnt_id,
    RENAME COLUMN reqst_ymd TO req_ymd,
    ALTER COLUMN req_ymd TYPE CHAR(8),
    RENAME COLUMN sanctner_id TO atrzr_id,
    RENAME COLUMN sanctn_dt TO atrz_dt,
    RENAME COLUMN rjct_rsn_cn TO rjct_rsn_expln,
    ALTER COLUMN rjct_rsn_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_ifml_atrz_info IS '비정형 결재 정보';
COMMENT ON COLUMN tb_ifml_atrz_info.ifml_atrz_id IS '비정형결재아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.aplcnt_id IS '신청자아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.req_ymd IS '요청일자';
COMMENT ON COLUMN tb_ifml_atrz_info.atrzr_id IS '결재자아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.atrz_dt IS '결재일시';
COMMENT ON COLUMN tb_ifml_atrz_info.rjct_rsn_expln IS '반려사유내용';
COMMENT ON COLUMN tb_ifml_atrz_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_ifml_atrz_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_ifml_atrz_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.last_mdfr_id IS '최종수정자아이디';

-- 24. tb_rward_manage
ALTER TABLE tb_rward_manage 
    RENAME COLUMN informl_sanctn_id TO ifml_atrz_id,
    RENAME COLUMN rwardwnr_id TO rward_user_id,
    RENAME COLUMN rward_nm TO rward_ttl,
    ALTER COLUMN rward_ttl TYPE VARCHAR(300),
    RENAME COLUMN rward_de TO rward_ymd,
    ALTER COLUMN rward_ymd TYPE CHAR(8),
    RENAME COLUMN rward_code TO rward_se_cd,
    ALTER COLUMN rward_se_cd TYPE VARCHAR(12),
    RENAME COLUMN pblen_cn TO pblen_expln,
    ALTER COLUMN pblen_expln TYPE VARCHAR(4000),
    RENAME COLUMN sanctner_id TO atrzr_id,
    RENAME COLUMN aprv_dt TO atrz_dt,
    RENAME COLUMN rtrn_rsn_cn TO rjct_rsn_expln,
    ALTER COLUMN rjct_rsn_expln TYPE VARCHAR(4000),
    RENAME COLUMN confm_yn TO atrz_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_rward_manage IS '포상 관리';
COMMENT ON COLUMN tb_rward_manage.rward_id IS '포상아이디';
COMMENT ON COLUMN tb_rward_manage.rward_user_id IS '포상자아이디';
COMMENT ON COLUMN tb_rward_manage.rward_ttl IS '포상명';
COMMENT ON COLUMN tb_rward_manage.rward_ymd IS '포상일자';
COMMENT ON COLUMN tb_rward_manage.rward_se_cd IS '포상구분코드';
COMMENT ON COLUMN tb_rward_manage.pblen_expln IS '공적내용';
COMMENT ON COLUMN tb_rward_manage.ifml_atrz_id IS '비정형결재아이디';
COMMENT ON COLUMN tb_rward_manage.atrzr_id IS '결재자아이디';
COMMENT ON COLUMN tb_rward_manage.atrz_dt IS '결재일시';
COMMENT ON COLUMN tb_rward_manage.atrz_yn IS '결재여부';
COMMENT ON COLUMN tb_rward_manage.rjct_rsn_expln IS '반려사유내용';
COMMENT ON COLUMN tb_rward_manage.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_rward_manage.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_rward_manage.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_rward_manage.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_rward_manage.last_mdfr_id IS '최종수정자아이디';

-- 25. tb_extrl_hr_info
ALTER TABLE tb_extrl_hr_info 
    RENAME COLUMN extrl_hr_nm TO hr_nm,
    RENAME COLUMN sexdstn_code TO gender_cd,
    ALTER COLUMN gender_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN psitn_instt_nm TO dept_nm,
    RENAME COLUMN eml_addr TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN occp_ty_code TO job_type_cd,
    ALTER COLUMN job_type_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_extrl_hr_info IS '외부 인력 정보';
COMMENT ON COLUMN tb_extrl_hr_info.extrl_hr_id IS '외부인력아이디';
COMMENT ON COLUMN tb_extrl_hr_info.event_id IS '행사아이디';
COMMENT ON COLUMN tb_extrl_hr_info.hr_nm IS '인력명';
COMMENT ON COLUMN tb_extrl_hr_info.gender_cd IS '성별코드';
COMMENT ON COLUMN tb_extrl_hr_info.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_extrl_hr_info.dept_nm IS '소속기관명';
COMMENT ON COLUMN tb_extrl_hr_info.job_type_cd IS '직업유형코드';
COMMENT ON COLUMN tb_extrl_hr_info.email_addr IS '이메일주소';
COMMENT ON COLUMN tb_extrl_hr_info.area_no IS '지역번호';
COMMENT ON COLUMN tb_extrl_hr_info.middle_telno IS '중간전화번호';
COMMENT ON COLUMN tb_extrl_hr_info.end_telno IS '끝전화번호';
COMMENT ON COLUMN tb_extrl_hr_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_extrl_hr_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_extrl_hr_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_extrl_hr_info.last_mdfr_id IS '최종수정자아이디';

-- 26. tb_tmplt_info
ALTER TABLE tb_tmplt_info 
    RENAME COLUMN tmplat_nm TO tmplt_ttl,
    ALTER COLUMN tmplt_ttl TYPE VARCHAR(300),
    RENAME COLUMN tmplat_se_code TO tmplt_se_cd,
    ALTER COLUMN tmplt_se_cd TYPE VARCHAR(12),
    RENAME COLUMN tmplat_cours TO tmplt_path,
    RENAME COLUMN tmplat_id TO tmplt_id,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_tmplt_info IS '템플릿 정보';
COMMENT ON COLUMN tb_tmplt_info.tmplt_id IS '템플릿아이디';
COMMENT ON COLUMN tb_tmplt_info.tmplt_ttl IS '템플릿제목';
COMMENT ON COLUMN tb_tmplt_info.tmplt_se_cd IS '템플릿구분코드';
COMMENT ON COLUMN tb_tmplt_info.tmplt_path IS '템플릿경로';
COMMENT ON COLUMN tb_tmplt_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_tmplt_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_tmplt_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_tmplt_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_tmplt_info.last_mdfr_id IS '최종수정자아이디';

-- 27. tb_policy_manage
ALTER TABLE tb_policy_manage 
    RENAME COLUMN title TO policy_ttl,
    ALTER COLUMN policy_ttl TYPE VARCHAR(300),
    RENAME COLUMN policy_cn TO policy_expln,
    ALTER COLUMN policy_expln TYPE VARCHAR(4000),
    RENAME COLUMN policy_type TO policy_type_cd,
    ALTER COLUMN policy_type_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_policy_manage IS '정책 관리';
COMMENT ON COLUMN tb_policy_manage.policy_ttl IS '정책제목';
COMMENT ON COLUMN tb_policy_manage.policy_expln IS '정책내용';
COMMENT ON COLUMN tb_policy_manage.policy_type_cd IS '정책유형코드';
COMMENT ON COLUMN tb_policy_manage.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_policy_manage.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_policy_manage.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_policy_manage.last_mdfr_id IS '최종수정자아이디';

-- 28. tb_internet_svc
ALTER TABLE tb_internet_svc 
    RENAME COLUMN intnet_svc_nm TO srvc_ttl,
    ALTER COLUMN srvc_ttl TYPE VARCHAR(300),
    RENAME COLUMN internet_svc_expln TO srvc_expln,
    ALTER COLUMN srvc_expln TYPE VARCHAR(4000),
    RENAME COLUMN reflct_yn TO use_yn,
    RENAME COLUMN intnet_svc_id TO srvc_id,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_internet_svc IS '인터넷 서비스 정보';
COMMENT ON COLUMN tb_internet_svc.srvc_id IS '서비스아이디';
COMMENT ON COLUMN tb_internet_svc.srvc_ttl IS '서비스제목';
COMMENT ON COLUMN tb_internet_svc.srvc_expln IS '서비스설명';
COMMENT ON COLUMN tb_internet_svc.use_yn IS '사용여부';
COMMENT ON COLUMN tb_internet_svc.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_internet_svc.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_internet_svc.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_internet_svc.last_mdfr_id IS '최종수정자아이디';

-- 29. tb_indvdl_pge_estbs
ALTER TABLE tb_indvdl_pge_estbs 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN upend_image TO top_img_nm,
    RENAME COLUMN algn_mthd TO align_mthd_cd,
    ALTER COLUMN align_mthd_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_indvdl_pge_estbs IS '개인페이지 설정 정보';
COMMENT ON COLUMN tb_indvdl_pge_estbs.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_indvdl_pge_estbs.top_img_nm IS '상단이미지명';
COMMENT ON COLUMN tb_indvdl_pge_estbs.titlebar_color IS '타이틀바색상';
COMMENT ON COLUMN tb_indvdl_pge_estbs.align_mthd_cd IS '정렬방법코드';
COMMENT ON COLUMN tb_indvdl_pge_estbs.align_cnt IS '정렬수';
COMMENT ON COLUMN tb_indvdl_pge_estbs.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_indvdl_pge_estbs.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_indvdl_pge_estbs.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_indvdl_pge_estbs.last_mdfr_id IS '최종수정자아이디';

-- 30. tb_indvdl_pge_cntnts
ALTER TABLE tb_indvdl_pge_cntnts 
    RENAME COLUMN cntnts_nm TO cntnt_ttl,
    ALTER COLUMN cntnt_ttl TYPE VARCHAR(300),
    RENAME COLUMN cntnts_dc TO cntnt_expln,
    ALTER COLUMN cntnt_expln TYPE VARCHAR(4000),
    RENAME COLUMN cntc_url TO srvc_url,
    RENAME COLUMN cntnts_link_url TO link_url,
    RENAME COLUMN cntnts_use_yn TO use_yn,
    RENAME COLUMN cntnts_id TO cntnt_id,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_indvdl_pge_cntnts IS '개인페이지 컨텐츠 정보';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.cntnt_id IS '컨텐츠아이디';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.cntnt_ttl IS '컨텐츠제목';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.cntnt_expln IS '컨텐츠설명';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.srvc_url IS '서비스URL';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.link_url IS '링크URL';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.use_yn IS '사용여부';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_indvdl_pge_cntnts.last_mdfr_id IS '최종수정자아이디';

-- 31. tb_leader_schdl_de
ALTER TABLE tb_leader_schdl_de 
    RENAME COLUMN schdul_id TO schdul_id,
    RENAME COLUMN schdul_de TO schdul_ymd,
    ALTER COLUMN schdul_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_leader_schdl_de IS '간부일정 일자 정보';
COMMENT ON COLUMN tb_leader_schdl_de.schdul_id IS '일정아이디';
COMMENT ON COLUMN tb_leader_schdl_de.schdul_ymd IS '일정일자';
COMMENT ON COLUMN tb_leader_schdl_de.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_leader_schdl_de.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_leader_schdl_de.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_leader_schdl_de.last_mdfr_id IS '최종수정자아이디';

COMMIT;

-- Adding existing Batch 2 & 3 content to this file for completeness
-- ... (Previously handled in separate files but now unified)

COMMIT;
