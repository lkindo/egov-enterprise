/*
 * OCI PostgreSQL 17 - Entire Schema Comment Auto-Registration Script
 * Generated Date: 2026-05-19
 * Powered by Antigravity Governance AI Harness
 */

BEGIN;

-- Table: ecopseq (ecopseq 테이블)
COMMENT ON TABLE ecopseq IS 'ecopseq 테이블';
COMMENT ON COLUMN ecopseq.table_name IS 'table name';
COMMENT ON COLUMN ecopseq.next_id IS 'NEXT아이디';
COMMENT ON COLUMN ecopseq.frst_reg_pnttm IS '최초 등록 pnttm';
COMMENT ON COLUMN ecopseq.last_updt_pnttm IS '최종 갱신 pnttm';
COMMENT ON COLUMN ecopseq.frst_register_id IS '최초 register 아이디';
COMMENT ON COLUMN ecopseq.last_updusr_id IS '최종 updusr 아이디';

-- Table: ids (ids 테이블)
COMMENT ON TABLE ids IS 'ids 테이블';
COMMENT ON COLUMN ids.table_name IS 'table name';
COMMENT ON COLUMN ids.next_id IS 'next 아이디';
COMMENT ON COLUMN ids.frst_reg_pnttm IS '최초 등록 pnttm';
COMMENT ON COLUMN ids.last_updt_pnttm IS '최종 갱신 pnttm';
COMMENT ON COLUMN ids.frst_register_id IS '최초 register 아이디';
COMMENT ON COLUMN ids.last_updusr_id IS '최종 updusr 아이디';

-- Table: meta_standard_domains (standard domains 테이블)
COMMENT ON TABLE meta_standard_domains IS 'standard domains 테이블';
COMMENT ON COLUMN meta_standard_domains.id IS '아이디';
COMMENT ON COLUMN meta_standard_domains.domain_group IS 'domain 그룹';
COMMENT ON COLUMN meta_standard_domains.domain_name IS 'domain name';
COMMENT ON COLUMN meta_standard_domains.data_type IS '자료 유형';
COMMENT ON COLUMN meta_standard_domains.data_length IS '자료 length';

-- Table: meta_standard_terms (standard terms 테이블)
COMMENT ON TABLE meta_standard_terms IS 'standard terms 테이블';
COMMENT ON COLUMN meta_standard_terms.id IS '아이디';
COMMENT ON COLUMN meta_standard_terms.term_name IS '기한 name';
COMMENT ON COLUMN meta_standard_terms.eng_name IS '영문 name';
COMMENT ON COLUMN meta_standard_terms.eng_abbr IS '영문 약어';
COMMENT ON COLUMN meta_standard_terms.description IS 'description';

-- Table: meta_standard_words (standard words 테이블)
COMMENT ON TABLE meta_standard_words IS 'standard words 테이블';
COMMENT ON COLUMN meta_standard_words.word_name IS '단어 name';
COMMENT ON COLUMN meta_standard_words.eng_abbr IS '영문 약어';
COMMENT ON COLUMN meta_standard_words.word_dc IS '단어 설명';

-- Table: tb_adbk_info (주소록 정보 테이블)
COMMENT ON TABLE tb_adbk_info IS '주소록 정보 테이블';
COMMENT ON COLUMN tb_adbk_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_adbk_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_adbk_info.adbk_constnt_id IS '주소록 constnt 아이디';
COMMENT ON COLUMN tb_adbk_info.adbk_id IS '주소록 아이디';
COMMENT ON COLUMN tb_adbk_info.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_adbk_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_adbk_info.fax_no IS '팩스 번호';
COMMENT ON COLUMN tb_adbk_info.home_telno IS '자택 전화번호';
COMMENT ON COLUMN tb_adbk_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_adbk_info.mbl_telno IS '휴대 전화번호';
COMMENT ON COLUMN tb_adbk_info.ofc_telno IS '사무실 전화번호';
COMMENT ON COLUMN tb_adbk_info.eml_addr IS '이메일 주소';
COMMENT ON COLUMN tb_adbk_info.nm IS '명';

-- Table: tb_adbk_manage (주소록 관리 테이블)
COMMENT ON TABLE tb_adbk_manage IS '주소록 관리 테이블';
COMMENT ON COLUMN tb_adbk_manage.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_adbk_manage.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_adbk_manage.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_adbk_manage.adbk_id IS '주소록 아이디';
COMMENT ON COLUMN tb_adbk_manage.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_adbk_manage.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_adbk_manage.rls_scope_cd IS '공개 scope 코드';
COMMENT ON COLUMN tb_adbk_manage.trget_orgnzt_id IS 'trget orgnzt 아이디';
COMMENT ON COLUMN tb_adbk_manage.wrter_id IS 'wrter 아이디';
COMMENT ON COLUMN tb_adbk_manage.adbk_nm IS '주소록 명';

-- Table: tb_admdst_cd (행정구역 코드 테이블)
COMMENT ON TABLE tb_admdst_cd IS '행정구역 코드 테이블';
COMMENT ON COLUMN tb_admdst_cd.admdst_cd IS '행정구역 코드';
COMMENT ON COLUMN tb_admdst_cd.up_admdst_cd IS '상위 행정구역 코드';
COMMENT ON COLUMN tb_admdst_cd.admdst_se_cd IS '행정구역 구분 코드';
COMMENT ON COLUMN tb_admdst_cd.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_admdst_cd.crt_ymd IS '생성 일자';
COMMENT ON COLUMN tb_admdst_cd.abl_ymd IS '폐지 일자';
COMMENT ON COLUMN tb_admdst_cd.admdst_zone_nm IS '행정구역 구역 명';
COMMENT ON COLUMN tb_admdst_cd.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_admdst_cd.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_admdst_cd.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_admdst_cd.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_admdst_cd_rcptn_log (행정구역 코드 수신 로그 테이블)
COMMENT ON TABLE tb_admdst_cd_rcptn_log IS '행정구역 코드 수신 로그 테이블';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.ocrn_ymd IS 'OCCRRNC일자';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_zone_se_cd IS 'ADMINIST구역구분';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_cd IS 'ADMINIST구역코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.opert_sn IS 'OPERT일련번호';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.change_se_cd IS 'CHANGE구분코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.proc_se_cd IS 'PROCESS구분';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.admdst_zone_nm IS 'ADMINIST구역명';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.lwst_admdst_zone_nm IS 'LOWESTADMINIST구역명';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.ctprvn_cd IS '법원방지코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.signgu_cd IS 'SIGNGU코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.emd_cd IS '읍면동코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.li_cd IS '리코드';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.creat_ymd IS 'CREAT일자';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.abl_ymd IS '폐지일자';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.abl_yn IS '폐지ENNC';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.crt_dt IS '최초등록시점';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.last_mdfr_id IS '최종수정자아이디';
COMMENT ON COLUMN tb_admdst_cd_rcptn_log.mdfcn_dt IS '최종수정시점';

-- Table: tb_auth_rfsh_tk (인증 리프레시 토큰 테이블)
COMMENT ON TABLE tb_auth_rfsh_tk IS '인증 리프레시 토큰 테이블';
COMMENT ON COLUMN tb_auth_rfsh_tk.exprtn_dt IS '만료 일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.user_id IS '사용자 ID';
COMMENT ON COLUMN tb_auth_rfsh_tk.rfsh_tkn IS '리프레시 토큰';
COMMENT ON COLUMN tb_auth_rfsh_tk.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_auth_rfsh_tk.last_mdfr_id IS '최종 수정자 ID';

-- Table: tb_authrt_group_info (권한 그룹 정보 테이블)
COMMENT ON TABLE tb_authrt_group_info IS '권한 그룹 정보 테이블';
COMMENT ON COLUMN tb_authrt_group_info.group_id IS '그룹 ID';
COMMENT ON COLUMN tb_authrt_group_info.group_nm IS '그룹 명칭';
COMMENT ON COLUMN tb_authrt_group_info.group_dc IS '그룹 설명';
COMMENT ON COLUMN tb_authrt_group_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_authrt_group_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_authrt_group_info.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_authrt_group_info.last_mdfr_id IS '최종 수정자 ID';
COMMENT ON COLUMN tb_authrt_group_info.group_crt_ymd IS '그룹 생성 일시';

-- Table: tb_authrt_info (권한 정보 테이블)
COMMENT ON TABLE tb_authrt_info IS '권한 정보 테이블';
COMMENT ON COLUMN tb_authrt_info.authrt_cd IS '권한 코드';
COMMENT ON COLUMN tb_authrt_info.authrt_nm IS '권한 명칭';
COMMENT ON COLUMN tb_authrt_info.authrt_expln IS '권한 설명';
COMMENT ON COLUMN tb_authrt_info.authrt_crt_ymd IS '권한 생성 일자';
COMMENT ON COLUMN tb_authrt_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_authrt_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_authrt_info.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_authrt_info.last_mdfr_id IS '최종 수정자 ID';

-- Table: tb_authrt_role_map (권한 롤 매핑 테이블)
COMMENT ON TABLE tb_authrt_role_map IS '권한 롤 매핑 테이블';
COMMENT ON COLUMN tb_authrt_role_map.authrt_cd IS '권한 코드';
COMMENT ON COLUMN tb_authrt_role_map.role_cd IS '롤 코드';
COMMENT ON COLUMN tb_authrt_role_map.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_authrt_role_map.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_authrt_role_map.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_authrt_role_map.last_mdfr_id IS '최종 수정자 ID';

-- Table: tb_bbs_comment (게시판 comment 테이블)
COMMENT ON TABLE tb_bbs_comment IS '게시판 comment 테이블';
COMMENT ON COLUMN tb_bbs_comment.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_bbs_comment.ans_sn IS '답변 일련번호';
COMMENT ON COLUMN tb_bbs_comment.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bbs_comment.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bbs_comment.pst_id IS '게시물 아이디';
COMMENT ON COLUMN tb_bbs_comment.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_bbs_comment.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_bbs_comment.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_bbs_comment.wrter_id IS 'wrter 아이디';
COMMENT ON COLUMN tb_bbs_comment.wrter_nm IS 'wrter 명';
COMMENT ON COLUMN tb_bbs_comment.pswd IS '비밀번호';
COMMENT ON COLUMN tb_bbs_comment.ans_cn IS '답변 내용';

-- Table: tb_bbs_item (게시판 품목 테이블)
COMMENT ON TABLE tb_bbs_item IS '게시판 품목 테이블';
COMMENT ON COLUMN tb_bbs_item.reply_yn IS 'reply 여부';
COMMENT ON COLUMN tb_bbs_item.reply_lc IS 'reply 신용장';
COMMENT ON COLUMN tb_bbs_item.comment_cnt IS 'comment 수';
COMMENT ON COLUMN tb_bbs_item.file_cnt IS '파일 수';
COMMENT ON COLUMN tb_bbs_item.notice_yn IS 'notice 여부';
COMMENT ON COLUMN tb_bbs_item.inq_cnt IS '조회 수';
COMMENT ON COLUMN tb_bbs_item.secret_yn IS 'secret 여부';
COMMENT ON COLUMN tb_bbs_item.sj_bold_yn IS 'sj bold 여부';
COMMENT ON COLUMN tb_bbs_item.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_bbs_item.event_date IS 'event date';
COMMENT ON COLUMN tb_bbs_item.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bbs_item.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bbs_item.pst_id IS '게시물 아이디';
COMMENT ON COLUMN tb_bbs_item.reply_sn IS 'reply 일련번호';
COMMENT ON COLUMN tb_bbs_item.up_pst_id IS '상위 게시물 아이디';
COMMENT ON COLUMN tb_bbs_item.sort_ordr IS '정렬 주문';
COMMENT ON COLUMN tb_bbs_item.qna_stts_cd IS '질의응답 상태 코드';
COMMENT ON COLUMN tb_bbs_item.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_bbs_item.blog_id IS '블로그 아이디';
COMMENT ON COLUMN tb_bbs_item.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_bbs_item.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_bbs_item.pst_bgn_ymd IS '게시물 bgn 일자';
COMMENT ON COLUMN tb_bbs_item.pst_end_ymd IS '게시물 종료 일자';
COMMENT ON COLUMN tb_bbs_item.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_bbs_item.user_nm IS '사용자 명';
COMMENT ON COLUMN tb_bbs_item.qna_cat_cd IS '질의응답 카테고리 코드';
COMMENT ON COLUMN tb_bbs_item.pswd IS '비밀번호';
COMMENT ON COLUMN tb_bbs_item.pst_ttl IS '게시물 제목';
COMMENT ON COLUMN tb_bbs_item.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_bbs_item.pst_cn IS '게시물 내용';
COMMENT ON COLUMN tb_bbs_item.like_cnt IS 'like 수';

-- Table: tb_bbs_master (게시판 master 테이블)
COMMENT ON TABLE tb_bbs_master IS '게시판 master 테이블';
COMMENT ON COLUMN tb_bbs_master.atch_psblty_file_qty IS '첨부 가능 파일 수량';
COMMENT ON COLUMN tb_bbs_master.blog_yn IS '블로그 여부';
COMMENT ON COLUMN tb_bbs_master.file_atch_psblty_yn IS '파일 첨부 가능 여부';
COMMENT ON COLUMN tb_bbs_master.ans_psblty_yn IS '답변 가능 여부';
COMMENT ON COLUMN tb_bbs_master.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_bbs_master.bbs_atrb_cd IS '게시판 속성 코드';
COMMENT ON COLUMN tb_bbs_master.bbs_type_cd IS '게시판 유형 코드';
COMMENT ON COLUMN tb_bbs_master.atch_psblty_file_sz IS '첨부 가능 파일 크기';
COMMENT ON COLUMN tb_bbs_master.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bbs_master.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bbs_master.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_bbs_master.blog_id IS '블로그 아이디';
COMMENT ON COLUMN tb_bbs_master.cmnty_id IS '커뮤니티 아이디';
COMMENT ON COLUMN tb_bbs_master.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_bbs_master.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_bbs_master.tmplt_id IS '서식 아이디';
COMMENT ON COLUMN tb_bbs_master.bbs_ttl IS '게시판 제목';
COMMENT ON COLUMN tb_bbs_master.bbs_expln IS '게시판 설명';

-- Table: tb_bbs_master_optn (게시판 master 옵션 테이블)
COMMENT ON TABLE tb_bbs_master_optn IS '게시판 master 옵션 테이블';
COMMENT ON COLUMN tb_bbs_master_optn.ans_yn IS '답변 여부';
COMMENT ON COLUMN tb_bbs_master_optn.stsfdg_yn IS 'stsfdg 여부';
COMMENT ON COLUMN tb_bbs_master_optn.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bbs_master_optn.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bbs_master_optn.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_bbs_master_optn.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_bbs_master_optn.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_bbs_scrap (게시판 scrap 테이블)
COMMENT ON TABLE tb_bbs_scrap IS '게시판 scrap 테이블';
COMMENT ON COLUMN tb_bbs_scrap.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_bbs_scrap.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bbs_scrap.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bbs_scrap.pst_id IS '게시물 아이디';
COMMENT ON COLUMN tb_bbs_scrap.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_bbs_scrap.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_bbs_scrap.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_bbs_scrap.scrap_id IS 'scrap 아이디';
COMMENT ON COLUMN tb_bbs_scrap.scrap_nm IS 'scrap 명';
COMMENT ON COLUMN tb_bbs_scrap.scrap_expln IS 'scrap 설명';
COMMENT ON COLUMN tb_bbs_scrap.scrap_url IS 'scrap URL';

-- Table: tb_bbs_stats (게시판 통계 테이블)
COMMENT ON TABLE tb_bbs_stats IS '게시판 통계 테이블';
COMMENT ON COLUMN tb_bbs_stats.stats_id IS '통계아이디';
COMMENT ON COLUMN tb_bbs_stats.pst_cnt IS '공지수';
COMMENT ON COLUMN tb_bbs_stats.avg_inq_cnt IS '평균 조회 수';
COMMENT ON COLUMN tb_bbs_stats.max_inq_cnt IS '최대 조회 수';
COMMENT ON COLUMN tb_bbs_stats.min_inq_cnt IS '최소 조회 수';
COMMENT ON COLUMN tb_bbs_stats.top_user_id IS 'TOPNTCR아이디';
COMMENT ON COLUMN tb_bbs_stats.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bbs_stats.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bbs_stats.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_bbs_stats.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_bbs_use_info (게시판 사용 정보 테이블)
COMMENT ON TABLE tb_bbs_use_info IS '게시판 사용 정보 테이블';
COMMENT ON COLUMN tb_bbs_use_info.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_bbs_use_info.rgstr_se_cd IS 'rgstr 구분 코드';
COMMENT ON COLUMN tb_bbs_use_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bbs_use_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bbs_use_info.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_bbs_use_info.trgt_id IS '대상 아이디';

-- Table: tb_blog_info (블로그 정보 테이블)
COMMENT ON TABLE tb_blog_info IS '블로그 정보 테이블';
COMMENT ON COLUMN tb_blog_info.blog_yn IS '블로그 여부';
COMMENT ON COLUMN tb_blog_info.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_blog_info.reg_se_cd IS '등록 구분 코드';
COMMENT ON COLUMN tb_blog_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_blog_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_blog_info.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_blog_info.blog_id IS '블로그 아이디';
COMMENT ON COLUMN tb_blog_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_blog_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_blog_info.tmplt_id IS '서식 아이디';
COMMENT ON COLUMN tb_blog_info.blog_intro_cn IS '블로그 소개 내용';
COMMENT ON COLUMN tb_blog_info.blog_ttl IS '블로그 제목';

-- Table: tb_blog_user_map (블로그 사용자 매핑 테이블)
COMMENT ON TABLE tb_blog_user_map IS '블로그 사용자 매핑 테이블';
COMMENT ON COLUMN tb_blog_user_map.mbr_stts_cd IS '회원 상태 코드';
COMMENT ON COLUMN tb_blog_user_map.mngr_yn IS '관리자 여부';
COMMENT ON COLUMN tb_blog_user_map.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_blog_user_map.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_blog_user_map.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_blog_user_map.sbscrb_ymd IS 'sbscrb 일자';
COMMENT ON COLUMN tb_blog_user_map.blog_id IS '블로그 아이디';
COMMENT ON COLUMN tb_blog_user_map.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_blog_user_map.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_blog_user_map.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_blog_user_map.secsn_ymd IS 'secsn 일자';

-- Table: tb_bnr_info (배너 정보 테이블)
COMMENT ON TABLE tb_bnr_info IS '배너 정보 테이블';
COMMENT ON COLUMN tb_bnr_info.reflct_yn IS 'reflct 여부';
COMMENT ON COLUMN tb_bnr_info.sort_ordr IS '정렬 주문';
COMMENT ON COLUMN tb_bnr_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_bnr_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_bnr_info.bnr_id IS '배너 아이디';
COMMENT ON COLUMN tb_bnr_info.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_bnr_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_bnr_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_bnr_info.bnr_img_nm IS '배너 이미지 명';
COMMENT ON COLUMN tb_bnr_info.bnr_nm IS '배너 명';
COMMENT ON COLUMN tb_bnr_info.bnr_expln IS '배너 설명';
COMMENT ON COLUMN tb_bnr_info.link_url IS '연계 URL';

-- Table: tb_club_info (동호회 정보 테이블)
COMMENT ON TABLE tb_club_info IS '동호회 정보 테이블';
COMMENT ON COLUMN tb_club_info.club_id IS 'CLB아이디';
COMMENT ON COLUMN tb_club_info.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_club_info.club_nm IS 'CLB명';
COMMENT ON COLUMN tb_club_info.club_intro_cn IS 'CLB도입내용';
COMMENT ON COLUMN tb_club_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_club_info.rgstr_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_club_info.tmplt_id IS '템플릿아이디';
COMMENT ON COLUMN tb_club_info.crt_dt IS '최초등록시점';
COMMENT ON COLUMN tb_club_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_club_info.mdfcn_dt IS '최종수정시점';
COMMENT ON COLUMN tb_club_info.last_mdfr_id IS '최종수정자아이디';

-- Table: tb_club_user_map (동호회 사용자 매핑 테이블)
COMMENT ON TABLE tb_club_user_map IS '동호회 사용자 매핑 테이블';
COMMENT ON COLUMN tb_club_user_map.club_id IS 'CLB아이디';
COMMENT ON COLUMN tb_club_user_map.cmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_club_user_map.mngr_yn IS '작업자여부';
COMMENT ON COLUMN tb_club_user_map.join_ymd IS 'SBSCRB일자';
COMMENT ON COLUMN tb_club_user_map.whdwl_ymd IS 'SECSN일자';
COMMENT ON COLUMN tb_club_user_map.use_yn IS '사용여부';
COMMENT ON COLUMN tb_club_user_map.crt_dt IS '최초등록시점';
COMMENT ON COLUMN tb_club_user_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_club_user_map.mdfcn_dt IS '최종수정시점';
COMMENT ON COLUMN tb_club_user_map.last_mdfr_id IS '최종수정자아이디';
COMMENT ON COLUMN tb_club_user_map.user_id IS '사용자아이디';

-- Table: tb_cmnty_info (커뮤니티 정보 테이블)
COMMENT ON TABLE tb_cmnty_info IS '커뮤니티 정보 테이블';
COMMENT ON COLUMN tb_cmnty_info.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_cmnty_info.reg_se_cd IS '등록 구분 코드';
COMMENT ON COLUMN tb_cmnty_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_cmnty_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_cmnty_info.cmnty_id IS '커뮤니티 아이디';
COMMENT ON COLUMN tb_cmnty_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_cmnty_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_cmnty_info.tmplt_id IS '서식 아이디';
COMMENT ON COLUMN tb_cmnty_info.cmnty_intro_cn IS '커뮤니티 소개 내용';
COMMENT ON COLUMN tb_cmnty_info.cmnty_nm IS '커뮤니티 명';

-- Table: tb_cmnty_user_map (커뮤니티 사용자 매핑 테이블)
COMMENT ON TABLE tb_cmnty_user_map IS '커뮤니티 사용자 매핑 테이블';
COMMENT ON COLUMN tb_cmnty_user_map.mngr_yn IS '관리자 여부';
COMMENT ON COLUMN tb_cmnty_user_map.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_cmnty_user_map.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_cmnty_user_map.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_cmnty_user_map.join_ymd IS '가입 일자';
COMMENT ON COLUMN tb_cmnty_user_map.mbr_stts_cd IS '회원 상태 코드';
COMMENT ON COLUMN tb_cmnty_user_map.cmnty_id IS '커뮤니티 아이디';
COMMENT ON COLUMN tb_cmnty_user_map.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_cmnty_user_map.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_cmnty_user_map.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_cmnty_user_map.whdwl_ymd IS '탈퇴 일자';

-- Table: tb_com_cd (공통 코드 테이블)
COMMENT ON TABLE tb_com_cd IS '공통 코드 테이블';
COMMENT ON COLUMN tb_com_cd.clsf_cd IS '분류 코드';
COMMENT ON COLUMN tb_com_cd.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_com_cd.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_com_cd.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_com_cd.cd_id IS '코드 아이디';
COMMENT ON COLUMN tb_com_cd.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_com_cd.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_com_cd.cd_id_nm IS '코드 아이디 명';
COMMENT ON COLUMN tb_com_cd.cd_id_expln IS '코드 아이디 설명';

-- Table: tb_com_clsf_cd (공통 분류 코드 테이블)
COMMENT ON TABLE tb_com_clsf_cd IS '공통 분류 코드 테이블';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd IS '분류 코드';
COMMENT ON COLUMN tb_com_clsf_cd.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_com_clsf_cd.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_com_clsf_cd.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_com_clsf_cd.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_com_clsf_cd.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd_nm IS '분류 코드 명';
COMMENT ON COLUMN tb_com_clsf_cd.clsf_cd_expln IS '분류 코드 설명';

-- Table: tb_com_dtl_cd (공통 상세 코드 테이블)
COMMENT ON TABLE tb_com_dtl_cd IS '공통 상세 코드 테이블';
COMMENT ON COLUMN tb_com_dtl_cd.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_com_dtl_cd.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_com_dtl_cd.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_com_dtl_cd.cd_id IS '코드 아이디';
COMMENT ON COLUMN tb_com_dtl_cd.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_com_dtl_cd.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd IS '상세 코드';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd_nm IS '상세 코드 명';
COMMENT ON COLUMN tb_com_dtl_cd.dtl_cd_expln IS '상세 코드 설명';

-- Table: tb_dept_job_bx (부서 작업 bx 테이블)
COMMENT ON TABLE tb_dept_job_bx IS '부서 작업 bx 테이블';
COMMENT ON COLUMN tb_dept_job_bx.sort_ordr IS '정렬 주문';
COMMENT ON COLUMN tb_dept_job_bx.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_dept_job_bx.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_dept_job_bx.dept_id IS '부서 아이디';
COMMENT ON COLUMN tb_dept_job_bx.dept_task_box_id IS '부서 업무 box 아이디';
COMMENT ON COLUMN tb_dept_job_bx.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_dept_job_bx.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_dept_job_bx.dept_task_box_nm IS '부서 업무 box 명';

-- Table: tb_dept_task_info (부서 업무 정보 테이블)
COMMENT ON TABLE tb_dept_task_info IS '부서 업무 정보 테이블';
COMMENT ON COLUMN tb_dept_task_info.prrty_rnk IS '우선 순위';
COMMENT ON COLUMN tb_dept_task_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_dept_task_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_dept_task_info.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_dept_task_info.pic_id IS '담당자 아이디';
COMMENT ON COLUMN tb_dept_task_info.dept_task_id IS '부서 업무 아이디';
COMMENT ON COLUMN tb_dept_task_info.dept_task_box_id IS '부서 업무 box 아이디';
COMMENT ON COLUMN tb_dept_task_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_dept_task_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_dept_task_info.dept_task_cn IS '부서 업무 내용';
COMMENT ON COLUMN tb_dept_task_info.dept_task_nm IS '부서 업무 명';

-- Table: tb_dgstfn_info (만족도 정보 테이블)
COMMENT ON TABLE tb_dgstfn_info IS '만족도 정보 테이블';
COMMENT ON COLUMN tb_dgstfn_info.dgstfn_scr IS '만족도 점수';
COMMENT ON COLUMN tb_dgstfn_info.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_dgstfn_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_dgstfn_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_dgstfn_info.ntt_id IS 'ntt 아이디';
COMMENT ON COLUMN tb_dgstfn_info.dgstfn_sn IS '만족도 일련번호';
COMMENT ON COLUMN tb_dgstfn_info.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_dgstfn_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_dgstfn_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_dgstfn_info.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_dgstfn_info.user_nm IS '사용자 명';
COMMENT ON COLUMN tb_dgstfn_info.pswd IS '비밀번호';
COMMENT ON COLUMN tb_dgstfn_info.dgstfn_cn IS '만족도 내용';

-- Table: tb_diary_info (diary 정보 테이블)
COMMENT ON TABLE tb_diary_info IS 'diary 정보 테이블';
COMMENT ON COLUMN tb_diary_info.diary_prgrs_rt IS 'diary 진행 비율';
COMMENT ON COLUMN tb_diary_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_diary_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_diary_info.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_diary_info.diary_id IS 'diary 아이디';
COMMENT ON COLUMN tb_diary_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_diary_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_diary_info.schdul_id IS 'schdul 아이디';
COMMENT ON COLUMN tb_diary_info.diary_nm IS 'diary 명';
COMMENT ON COLUMN tb_diary_info.drctn_mttr IS '지시 사항';
COMMENT ON COLUMN tb_diary_info.excptn_mttr IS '특이 사항';

-- Table: tb_dscsn_list (상담 목록 테이블)
COMMENT ON TABLE tb_dscsn_list IS '상담 목록 테이블';
COMMENT ON COLUMN tb_dscsn_list.area_no IS '지역번호';
COMMENT ON COLUMN tb_dscsn_list.eml_ans_yn IS '이메일 답변 여부';
COMMENT ON COLUMN tb_dscsn_list.mbl_end_telno IS '휴대폰끝번호';
COMMENT ON COLUMN tb_dscsn_list.end_telno IS '끝전화번호';
COMMENT ON COLUMN tb_dscsn_list.mbl_frst_telno IS '휴대폰첫번호';
COMMENT ON COLUMN tb_dscsn_list.mbl_md_telno IS '휴대폰중간번호';
COMMENT ON COLUMN tb_dscsn_list.md_telno IS '중간전화번호';
COMMENT ON COLUMN tb_dscsn_list.othbc_yn IS 'othbc 여부';
COMMENT ON COLUMN tb_dscsn_list.qna_proc_stts_cd IS '질의응답 프로세스 상태 코드';
COMMENT ON COLUMN tb_dscsn_list.inq_cnt IS '조회 수';
COMMENT ON COLUMN tb_dscsn_list.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_dscsn_list.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_dscsn_list.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_dscsn_list.dscsn_id IS '상담 아이디';
COMMENT ON COLUMN tb_dscsn_list.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_dscsn_list.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_dscsn_list.managt_ymd IS 'managt 일자';
COMMENT ON COLUMN tb_dscsn_list.wrt_ymd IS '작성 일자';
COMMENT ON COLUMN tb_dscsn_list.wrt_pswd IS '작성 비밀번호';
COMMENT ON COLUMN tb_dscsn_list.wrter_nm IS 'wrter 명';
COMMENT ON COLUMN tb_dscsn_list.eml_addr IS '이메일 주소';
COMMENT ON COLUMN tb_dscsn_list.dscsn_cn IS '상담 내용';
COMMENT ON COLUMN tb_dscsn_list.dscsn_ttl IS '상담 제목';
COMMENT ON COLUMN tb_dscsn_list.proc_cn IS '프로세스 내용';

-- Table: tb_dscsn_manage (상담 관리 테이블)
COMMENT ON TABLE tb_dscsn_manage IS '상담 관리 테이블';
COMMENT ON COLUMN tb_dscsn_manage.dscsn_id IS '상담 아이디';
COMMENT ON COLUMN tb_dscsn_manage.dscsn_ttl IS '상담 제목';
COMMENT ON COLUMN tb_dscsn_manage.dscsn_cn IS '상담 내용';
COMMENT ON COLUMN tb_dscsn_manage.rls_yn IS '공개 여부';
COMMENT ON COLUMN tb_dscsn_manage.wrt_ymd IS '작성 일자';
COMMENT ON COLUMN tb_dscsn_manage.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_dscsn_manage.user_nm IS '사용자 명';
COMMENT ON COLUMN tb_dscsn_manage.proc_cn IS '프로세스 내용';
COMMENT ON COLUMN tb_dscsn_manage.mng_ymd IS '관리 일자';
COMMENT ON COLUMN tb_dscsn_manage.qna_proc_stts_cd IS '질의응답 프로세스 상태 코드';
COMMENT ON COLUMN tb_dscsn_manage.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_dscsn_manage.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_dscsn_manage.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_dscsn_manage.mdfcn_dt IS '수정 일시';

-- Table: tb_dta_use_stats (dta 사용 통계 테이블)
COMMENT ON TABLE tb_dta_use_stats IS 'dta 사용 통계 테이블';
COMMENT ON COLUMN tb_dta_use_stats.dta_use_stats_id IS 'dta 사용 통계 아이디';
COMMENT ON COLUMN tb_dta_use_stats.bbs_id IS '게시판 아이디';
COMMENT ON COLUMN tb_dta_use_stats.ntt_id IS 'ntt 아이디';
COMMENT ON COLUMN tb_dta_use_stats.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_dta_use_stats.file_sn IS '파일 일련번호';
COMMENT ON COLUMN tb_dta_use_stats.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_dta_use_stats.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_dta_use_stats.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_dta_use_stats.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_email_dsptch_manage (이메일 발신 관리 테이블)
COMMENT ON TABLE tb_email_dsptch_manage IS '이메일 발신 관리 테이블';
COMMENT ON COLUMN tb_email_dsptch_manage.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_email_dsptch_manage.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_email_dsptch_manage.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_email_dsptch_manage.dsptch_dt IS '발신 일시';
COMMENT ON COLUMN tb_email_dsptch_manage.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_email_dsptch_manage.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_email_dsptch_manage.msg_id IS '메시지 아이디';
COMMENT ON COLUMN tb_email_dsptch_manage.dsptch_rslt_cd IS '발신 결과 코드';
COMMENT ON COLUMN tb_email_dsptch_manage.rcvr_nm IS '수신자명';
COMMENT ON COLUMN tb_email_dsptch_manage.sndpty_nm IS '발신자명';
COMMENT ON COLUMN tb_email_dsptch_manage.eml_cn IS '이메일 내용';
COMMENT ON COLUMN tb_email_dsptch_manage.eml_ttl IS '이메일 제목';

-- Table: tb_event_info (event 정보 테이블)
COMMENT ON TABLE tb_event_info IS 'event 정보 테이블';
COMMENT ON COLUMN tb_event_info.biz_yr IS '사업 연도';
COMMENT ON COLUMN tb_event_info.evnt_aprv_yn IS '행사 승인 여부';
COMMENT ON COLUMN tb_event_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_event_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_event_info.evnt_use_cnt IS '행사 사용 수';
COMMENT ON COLUMN tb_event_info.biz_cd IS '사업 코드';
COMMENT ON COLUMN tb_event_info.evnt_aprv_ymd IS '행사 승인 일자';
COMMENT ON COLUMN tb_event_info.evnt_id IS '행사 아이디';
COMMENT ON COLUMN tb_event_info.evnt_bgng_ymd IS '행사 시작 일자';
COMMENT ON COLUMN tb_event_info.evnt_end_ymd IS '행사 종료 일자';
COMMENT ON COLUMN tb_event_info.evnt_type_cd IS '행사 유형 코드';
COMMENT ON COLUMN tb_event_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_event_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_event_info.pic_nm IS '담당자 명';
COMMENT ON COLUMN tb_event_info.evnt_cn IS '행사 내용';
COMMENT ON COLUMN tb_event_info.prep_mttr IS 'prep 사항';

-- Table: tb_extrl_hr_info (extrl 시간 정보 테이블)
COMMENT ON TABLE tb_extrl_hr_info IS 'extrl 시간 정보 테이블';
COMMENT ON COLUMN tb_extrl_hr_info.area_no IS '지역번호';
COMMENT ON COLUMN tb_extrl_hr_info.end_telno IS '끝전화번호';
COMMENT ON COLUMN tb_extrl_hr_info.md_telno IS '중간전화번호';
COMMENT ON COLUMN tb_extrl_hr_info.cr_type_cd IS '직업 유형 코드';
COMMENT ON COLUMN tb_extrl_hr_info.gndr_cd IS '성별 코드';
COMMENT ON COLUMN tb_extrl_hr_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_extrl_hr_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_extrl_hr_info.brdt_ymd IS '생년월일 일자';
COMMENT ON COLUMN tb_extrl_hr_info.evnt_id IS '행사 아이디';
COMMENT ON COLUMN tb_extrl_hr_info.otsd_hr_id IS '외부 시간 아이디';
COMMENT ON COLUMN tb_extrl_hr_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_extrl_hr_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_extrl_hr_info.eml_addr IS '이메일 주소';
COMMENT ON COLUMN tb_extrl_hr_info.otsd_hr_nm IS '외부 시간 명';
COMMENT ON COLUMN tb_extrl_hr_info.ogdp_inst_nm IS '소속 기관 명';

-- Table: tb_faq_info (FAQ 정보 테이블)
COMMENT ON TABLE tb_faq_info IS 'FAQ 정보 테이블';
COMMENT ON COLUMN tb_faq_info.inq_cnt IS '조회 수';
COMMENT ON COLUMN tb_faq_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_faq_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_faq_info.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_faq_info.faq_id IS 'FAQ 아이디';
COMMENT ON COLUMN tb_faq_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_faq_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_faq_info.ans_cn IS '답변 내용';
COMMENT ON COLUMN tb_faq_info.qstn_cn IS '질문 내용';
COMMENT ON COLUMN tb_faq_info.qstn_ttl IS '질문 제목';

-- Table: tb_file_detail (파일 detail 테이블)
COMMENT ON TABLE tb_file_detail IS '파일 detail 테이블';
COMMENT ON COLUMN tb_file_detail.atch_file_seq IS '첨부파일순서';
COMMENT ON COLUMN tb_file_detail.file_sz IS '파일 크기';
COMMENT ON COLUMN tb_file_detail.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_file_detail.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_file_detail.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_file_detail.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_file_detail.file_estn IS '파일 estn';
COMMENT ON COLUMN tb_file_detail.orgnl_file_nm IS '원본 파일 명';
COMMENT ON COLUMN tb_file_detail.strg_file_nm IS '저장 파일 명';
COMMENT ON COLUMN tb_file_detail.file_strg_path IS '파일 저장 경로';
COMMENT ON COLUMN tb_file_detail.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_file_detail.file_cn IS '파일 내용';

-- Table: tb_file_master (파일 master 테이블)
COMMENT ON TABLE tb_file_master IS '파일 master 테이블';
COMMENT ON COLUMN tb_file_master.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_file_master.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_file_master.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_file_master.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_file_master.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_file_master.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_hldy_info (휴일 정보 테이블)
COMMENT ON TABLE tb_hldy_info IS '휴일 정보 테이블';
COMMENT ON COLUMN tb_hldy_info.hldy_sn IS '휴일 일련번호';
COMMENT ON COLUMN tb_hldy_info.hldy_se_cd IS '휴일 구분 코드';
COMMENT ON COLUMN tb_hldy_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_hldy_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_hldy_info.hldy_ymd IS '휴일 일자';
COMMENT ON COLUMN tb_hldy_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_hldy_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_hldy_info.hldy_nm IS '휴일 명';
COMMENT ON COLUMN tb_hldy_info.hldy_expln IS '휴일 설명';

-- Table: tb_hlp_info (도움말 정보 테이블)
COMMENT ON TABLE tb_hlp_info IS '도움말 정보 테이블';
COMMENT ON COLUMN tb_hlp_info.hlp_id IS '도움말 아이디';
COMMENT ON COLUMN tb_hlp_info.hlp_se_cd IS '도움말 구분 코드';
COMMENT ON COLUMN tb_hlp_info.hlp_dfn IS '도움말 정의';
COMMENT ON COLUMN tb_hlp_info.hlp_expln IS '도움말 설명';
COMMENT ON COLUMN tb_hlp_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_hlp_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_hlp_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_hlp_info.mdfcn_dt IS '수정 일시';

-- Table: tb_ifml_atrz_info (ifml 결재 정보 테이블)
COMMENT ON TABLE tb_ifml_atrz_info IS 'ifml 결재 정보 테이블';
COMMENT ON COLUMN tb_ifml_atrz_info.aprv_yn IS '승인 여부';
COMMENT ON COLUMN tb_ifml_atrz_info.task_se_cd IS '업무 구분 코드';
COMMENT ON COLUMN tb_ifml_atrz_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_ifml_atrz_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_ifml_atrz_info.atrz_dt IS '결재 일시';
COMMENT ON COLUMN tb_ifml_atrz_info.req_ymd IS '소요 일자';
COMMENT ON COLUMN tb_ifml_atrz_info.aplcnt_id IS '신청자 아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.ifml_atrz_id IS 'ifml 결재 아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.aprvr_id IS '결재자 아이디';
COMMENT ON COLUMN tb_ifml_atrz_info.rjct_rsn_cn IS '반려 사유 내용';

-- Table: tb_indv_pg (개인 PG 테이블)
COMMENT ON TABLE tb_indv_pg IS '개인 PG 테이블';
COMMENT ON COLUMN tb_indv_pg.page_id IS '쪽 아이디';
COMMENT ON COLUMN tb_indv_pg.page_ttl IS '쪽 제목';
COMMENT ON COLUMN tb_indv_pg.page_expln IS '쪽 설명';
COMMENT ON COLUMN tb_indv_pg.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_indv_pg.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_indv_pg.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_indv_pg.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_indv_pg.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_indv_pg_conts (개인 PG 콘텐츠 테이블)
COMMENT ON TABLE tb_indv_pg_conts IS '개인 PG 콘텐츠 테이블';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_id IS 'cntnts 아이디';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_nm IS 'cntnts 명';
COMMENT ON COLUMN tb_indv_pg_conts.cntc_url IS '접촉 URL';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_use_yn IS 'cntnts 사용 여부';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_link_url IS 'cntnts 연계 URL';
COMMENT ON COLUMN tb_indv_pg_conts.cntnts_dc IS 'cntnts 설명';
COMMENT ON COLUMN tb_indv_pg_conts.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_indv_pg_conts.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_indv_pg_conts.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_indv_pg_conts.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_indv_pg_set (개인 PG set 테이블)
COMMENT ON TABLE tb_indv_pg_set IS '개인 PG set 테이블';
COMMENT ON COLUMN tb_indv_pg_set.ttl_bar_clr IS '제목 bar 접수자';
COMMENT ON COLUMN tb_indv_pg_set.sort_mthd IS '정렬 방법';
COMMENT ON COLUMN tb_indv_pg_set.sort_count IS '정렬 count';
COMMENT ON COLUMN tb_indv_pg_set.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_indv_pg_set.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_indv_pg_set.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_indv_pg_set.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_inst_cd_rcptn_log (기관 코드 수신 로그 테이블)
COMMENT ON TABLE tb_inst_cd_rcptn_log IS '기관 코드 수신 로그 테이블';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.abl_yn IS '폐지 여부';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.chg_se_cd IS '변경 구분 코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_cycl IS '기관 차수';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_type_lclsf IS '기관 유형 대분류';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_type_mclsf IS '기관 유형 중분류';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_type_sclsf IS '기관 유형 소분류';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.odr IS '발주자';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.ord IS 'ord';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.proc_se IS '프로세스 구분';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.sort_ordr IS '정렬 주문';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.job_sn IS '작업 일련번호';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.top_inst_cd IS 'top 기관 코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_cd IS '기관 코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.reprs_inst_cd IS 'reprs 기관 코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.upr_inst_cd IS 'upr 기관 코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.abl_ymd IS '폐지 일자';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.crtr_ymd IS '기준 일자';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.chg_ymd IS '변경 일자';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.chg_tm IS '변경 시각';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.crt_ymd IS '생성 일자';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.fax_no IS '팩스 번호';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.ocrn_ymd IS '발생 일자';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.telno IS '전화번호';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.etc_cd IS '기타 코드';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.all_inst_nm IS 'all 기관 명';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.inst_abbr_nm IS '기관 약어 명';
COMMENT ON COLUMN tb_inst_cd_rcptn_log.lwst_inst_nm IS 'lwst 기관 명';

-- Table: tb_inst_cd (기관 code 테이블)
COMMENT ON TABLE tb_inst_cd IS '기관 code 테이블';
COMMENT ON COLUMN tb_inst_cd.abl_yn IS '폐지 여부';
COMMENT ON COLUMN tb_inst_cd.inst_cycl IS '기관 차수';
COMMENT ON COLUMN tb_inst_cd.inst_type_lclsf IS '기관 유형 대분류';
COMMENT ON COLUMN tb_inst_cd.inst_type_mclsf IS '기관 유형 중분류';
COMMENT ON COLUMN tb_inst_cd.inst_type_sclsf IS '기관 유형 소분류';
COMMENT ON COLUMN tb_inst_cd.odr IS '발주자';
COMMENT ON COLUMN tb_inst_cd.ord IS 'ord';
COMMENT ON COLUMN tb_inst_cd.sort_seq IS '정렬 순서';
COMMENT ON COLUMN tb_inst_cd.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_inst_cd.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_inst_cd.top_inst_cd IS 'top 기관 코드';
COMMENT ON COLUMN tb_inst_cd.inst_cd IS '기관 코드';
COMMENT ON COLUMN tb_inst_cd.reprs_inst_cd IS 'reprs 기관 코드';
COMMENT ON COLUMN tb_inst_cd.up_inst_cd IS '상위 기관 코드';
COMMENT ON COLUMN tb_inst_cd.abl_ymd IS '폐지 일자';
COMMENT ON COLUMN tb_inst_cd.crtr_ymd IS '기준 일자';
COMMENT ON COLUMN tb_inst_cd.chg_ymd IS '변경 일자';
COMMENT ON COLUMN tb_inst_cd.chg_tm IS '변경 시각';
COMMENT ON COLUMN tb_inst_cd.crt_ymd IS '생성 일자';
COMMENT ON COLUMN tb_inst_cd.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_inst_cd.fax_no IS '팩스 번호';
COMMENT ON COLUMN tb_inst_cd.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_inst_cd.telno IS '전화번호';
COMMENT ON COLUMN tb_inst_cd.all_inst_nm IS 'all 기관 명';
COMMENT ON COLUMN tb_inst_cd.inst_abbr_nm IS '기관 약어 명';
COMMENT ON COLUMN tb_inst_cd.lwtrk_inst_nm IS '최하위 기관 명';

-- Table: tb_intrn_svc (intrn 봉사 테이블)
COMMENT ON TABLE tb_intrn_svc IS 'intrn 봉사 테이블';
COMMENT ON COLUMN tb_intrn_svc.itnt_svc_id IS '인터넷 봉사 아이디';
COMMENT ON COLUMN tb_intrn_svc.itnt_svc_nm IS '인터넷 봉사 명';
COMMENT ON COLUMN tb_intrn_svc.itnt_svc_expln IS '인터넷 봉사 설명';
COMMENT ON COLUMN tb_intrn_svc.rflt_yn IS '반영 여부';
COMMENT ON COLUMN tb_intrn_svc.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_intrn_svc.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_intrn_svc.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_intrn_svc.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_leader_schdl (leader 일정 테이블)
COMMENT ON TABLE tb_leader_schdl IS 'leader 일정 테이블';
COMMENT ON COLUMN tb_leader_schdl.rept_se_cd IS '반복 구분 코드';
COMMENT ON COLUMN tb_leader_schdl.schdl_imprt_cd IS '일정 중요도 코드';
COMMENT ON COLUMN tb_leader_schdl.schdl_se_cd IS '일정 구분 코드';
COMMENT ON COLUMN tb_leader_schdl.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_leader_schdl.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_leader_schdl.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_leader_schdl.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_leader_schdl.leader_id IS 'leader 아이디';
COMMENT ON COLUMN tb_leader_schdl.schdl_bgng_ymd IS '일정 시작 일자';
COMMENT ON COLUMN tb_leader_schdl.schdl_pic_id IS '일정 담당자 아이디';
COMMENT ON COLUMN tb_leader_schdl.schdl_end_ymd IS '일정 종료 일자';
COMMENT ON COLUMN tb_leader_schdl.schdl_id IS '일정 아이디';
COMMENT ON COLUMN tb_leader_schdl.schdl_cn IS '일정 내용';
COMMENT ON COLUMN tb_leader_schdl.schdl_nm IS '일정 명';
COMMENT ON COLUMN tb_leader_schdl.schdl_plc_nm IS '일정 장소 명';

-- Table: tb_leader_schdl_dtl (leader 일정 상세 테이블)
COMMENT ON TABLE tb_leader_schdl_dtl IS 'leader 일정 상세 테이블';
COMMENT ON COLUMN tb_leader_schdl_dtl.schdl_id IS '일정아이디';
COMMENT ON COLUMN tb_leader_schdl_dtl.schdl_ymd IS '일정일자';
COMMENT ON COLUMN tb_leader_schdl_dtl.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_leader_schdl_dtl.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_leader_schdl_dtl.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_leader_schdl_dtl.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_leader_stts (leader 상태 테이블)
COMMENT ON TABLE tb_leader_stts IS 'leader 상태 테이블';
COMMENT ON COLUMN tb_leader_stts.leader_stts_cd IS 'leader 상태 코드';
COMMENT ON COLUMN tb_leader_stts.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_leader_stts.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_leader_stts.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_leader_stts.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_leader_stts.leader_id IS 'leader 아이디';

-- Table: tb_login_log (login 로그 테이블)
COMMENT ON TABLE tb_login_log IS 'login 로그 테이블';
COMMENT ON COLUMN tb_login_log.err_cd IS '오류 코드';
COMMENT ON COLUMN tb_login_log.err_ocrn_yn IS '오류 발생 여부';
COMMENT ON COLUMN tb_login_log.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_login_log.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_login_log.cntn_mthd_cd IS '접속 방법 코드';
COMMENT ON COLUMN tb_login_log.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_login_log.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_login_log.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_login_log.log_id IS '로그 아이디';
COMMENT ON COLUMN tb_login_log.lgn_ip_addr IS '로그인 IP 주소';

-- Table: tb_login_policy (로그인 정책 테이블)
COMMENT ON TABLE tb_login_policy IS '로그인 정책 테이블';
COMMENT ON COLUMN tb_login_policy.dpcn_prm_yn IS '중복 허용 여부';
COMMENT ON COLUMN tb_login_policy.lmt_yn IS '제한 여부';
COMMENT ON COLUMN tb_login_policy.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_login_policy.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_login_policy.user_id IS '사용자 ID';
COMMENT ON COLUMN tb_login_policy.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_login_policy.last_mdfr_id IS '최종 수정자 ID';
COMMENT ON COLUMN tb_login_policy.ip_addr IS 'IP 주소';
COMMENT ON COLUMN tb_login_policy.bgng_tm IS '시작 시간';
COMMENT ON COLUMN tb_login_policy.end_tm IS '종료 시간';
COMMENT ON COLUMN tb_login_policy.otp_use_yn IS 'OTP 사용 여부';

-- Table: tb_main_image (주요 image 테이블)
COMMENT ON TABLE tb_main_image IS '주요 image 테이블';
COMMENT ON COLUMN tb_main_image.rflt_yn IS '반영 여부';
COMMENT ON COLUMN tb_main_image.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_main_image.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_main_image.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_main_image.img_file_nm IS '이미지 파일 명';
COMMENT ON COLUMN tb_main_image.img_id IS '이미지 아이디';
COMMENT ON COLUMN tb_main_image.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_main_image.main_img_file_path IS '주요 이미지 파일 경로';
COMMENT ON COLUMN tb_main_image.img_nm IS '이미지 명';
COMMENT ON COLUMN tb_main_image.main_img_expln IS '주요 이미지 설명';

-- Table: tb_memo_rpt_info (메모 보고 정보 테이블)
COMMENT ON TABLE tb_memo_rpt_info IS '메모 보고 정보 테이블';
COMMENT ON COLUMN tb_memo_rpt_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_memo_rpt_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_memo_rpt_info.memo_rpt_ymd IS '메모 보고 일자';
COMMENT ON COLUMN tb_memo_rpt_info.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_memo_rpt_info.drctn_mttr_reg_dt IS '지시 사항 등록 일시';
COMMENT ON COLUMN tb_memo_rpt_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_memo_rpt_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_memo_rpt_info.rptr_id IS '보고자 아이디';
COMMENT ON COLUMN tb_memo_rpt_info.rptr_inq_dt IS '보고자 조회 일시';
COMMENT ON COLUMN tb_memo_rpt_info.rpt_id IS '보고 아이디';
COMMENT ON COLUMN tb_memo_rpt_info.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_memo_rpt_info.drctn_mttr IS '지시 사항';
COMMENT ON COLUMN tb_memo_rpt_info.rpt_cn IS '보고 내용';
COMMENT ON COLUMN tb_memo_rpt_info.rpt_ttl IS '보고 제목';

-- Table: tb_memo_todo_info (메모 todo 정보 테이블)
COMMENT ON TABLE tb_memo_todo_info IS '메모 todo 정보 테이블';
COMMENT ON COLUMN tb_memo_todo_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_memo_todo_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_memo_todo_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_memo_todo_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_memo_todo_info.todo_bgng_tm IS 'todo 시작 시각';
COMMENT ON COLUMN tb_memo_todo_info.todo_end_tm IS 'todo 종료 시각';
COMMENT ON COLUMN tb_memo_todo_info.todo_id IS 'todo 아이디';
COMMENT ON COLUMN tb_memo_todo_info.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_memo_todo_info.todo_cn IS 'todo 내용';
COMMENT ON COLUMN tb_memo_todo_info.todo_ttl IS 'todo 제목';

-- Table: tb_menu_crt_dtl (메뉴 생성 상세 테이블)
COMMENT ON TABLE tb_menu_crt_dtl IS '메뉴 생성 상세 테이블';
COMMENT ON COLUMN tb_menu_crt_dtl.menu_sn IS '메뉴 일련번호';
COMMENT ON COLUMN tb_menu_crt_dtl.authrt_cd IS '권한 코드';
COMMENT ON COLUMN tb_menu_crt_dtl.mapng_crt_id IS 'mapng 생성 아이디';
COMMENT ON COLUMN tb_menu_crt_dtl.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_menu_crt_dtl.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_menu_crt_dtl.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_menu_crt_dtl.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_menu_info (메뉴 정보 테이블)
COMMENT ON TABLE tb_menu_info IS '메뉴 정보 테이블';
COMMENT ON COLUMN tb_menu_info.menu_ordr IS '메뉴 정렬 순서';
COMMENT ON COLUMN tb_menu_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_menu_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_menu_info.menu_sn IS '메뉴 일련번호';
COMMENT ON COLUMN tb_menu_info.route_mdfcn_yn IS '경로 수정 여부';
COMMENT ON COLUMN tb_menu_info.up_menu_sn IS '상위 메뉴 일련번호';
COMMENT ON COLUMN tb_menu_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_menu_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_menu_info.menu_nm IS '메뉴 명';
COMMENT ON COLUMN tb_menu_info.prgrm_file_nm IS '프로그램 파일 명';
COMMENT ON COLUMN tb_menu_info.rel_img_nm IS '관련 이미지 명';
COMMENT ON COLUMN tb_menu_info.rel_img_path IS '관련 이미지 경로';
COMMENT ON COLUMN tb_menu_info.menu_expln IS '메뉴 설명';
COMMENT ON COLUMN tb_menu_info.modern_route IS '신규 경로';

-- Table: tb_note_info (쪽지 정보 테이블)
COMMENT ON TABLE tb_note_info IS '쪽지 정보 테이블';
COMMENT ON COLUMN tb_note_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_note_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_note_info.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_note_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_note_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_note_info.note_id IS '쪽지 아이디';
COMMENT ON COLUMN tb_note_info.note_cn IS '쪽지 내용';
COMMENT ON COLUMN tb_note_info.note_ttl IS '쪽지 제목';

-- Table: tb_note_rcptn (쪽지 수신 테이블)
COMMENT ON TABLE tb_note_rcptn IS '쪽지 수신 테이블';
COMMENT ON COLUMN tb_note_rcptn.open_yn IS '개봉 여부';
COMMENT ON COLUMN tb_note_rcptn.rcptn_se_cd IS '수신 구분 코드';
COMMENT ON COLUMN tb_note_rcptn.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_note_rcptn.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_note_rcptn.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_note_rcptn.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_note_rcptn.note_id IS '쪽지 아이디';
COMMENT ON COLUMN tb_note_rcptn.note_rcptn_id IS '쪽지 수신 아이디';
COMMENT ON COLUMN tb_note_rcptn.note_sndng_id IS '쪽지 발송 아이디';
COMMENT ON COLUMN tb_note_rcptn.rcvr_id IS '수신자 아이디';

-- Table: tb_note_sndng (쪽지 발송 테이블)
COMMENT ON TABLE tb_note_sndng IS '쪽지 발송 테이블';
COMMENT ON COLUMN tb_note_sndng.del_yn IS '삭제 여부';
COMMENT ON COLUMN tb_note_sndng.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_note_sndng.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_note_sndng.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_note_sndng.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_note_sndng.note_id IS '쪽지 아이디';
COMMENT ON COLUMN tb_note_sndng.note_sndng_id IS '쪽지 발송 아이디';
COMMENT ON COLUMN tb_note_sndng.sndr_id IS '발송자 아이디';

-- Table: tb_noti_info (알림 정보 테이블)
COMMENT ON TABLE tb_noti_info IS '알림 정보 테이블';
COMMENT ON COLUMN tb_noti_info.noti_sn IS '알림 일련번호';
COMMENT ON COLUMN tb_noti_info.noti_ttl IS '알림 제목';
COMMENT ON COLUMN tb_noti_info.noti_cn IS '알림 내용';
COMMENT ON COLUMN tb_noti_info.noti_dt IS '알림 시각';
COMMENT ON COLUMN tb_noti_info.bfhd_noti_intrvl IS '사전 알림 간격';
COMMENT ON COLUMN tb_noti_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_noti_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_noti_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_noti_info.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_onln_mnl_info (온라인 매뉴얼 정보 테이블)
COMMENT ON TABLE tb_onln_mnl_info IS '온라인 매뉴얼 정보 테이블';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_id IS '온라인 매뉴얼 식별자';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_se_cd IS '온라인 매뉴얼 구분 코드';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_dfn IS '온라인 매뉴얼 정의';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_expln IS '온라인 매뉴얼 설명';
COMMENT ON COLUMN tb_onln_mnl_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_onln_mnl_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_onln_mnl_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_onln_mnl_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_onln_mnl_info.onln_mnl_nm IS '온라인 매뉴얼 명';

-- Table: tb_onln_poll_artcl (온라인 poll 항목 테이블)
COMMENT ON TABLE tb_onln_poll_artcl IS '온라인 poll 항목 테이블';
COMMENT ON COLUMN tb_onln_poll_artcl.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_onln_poll_artcl.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_onln_poll_artcl.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_onln_poll_artcl.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_id IS '설문 식별자';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_artcl_id IS '설문 항목 식별자';
COMMENT ON COLUMN tb_onln_poll_artcl.poll_artcl_nm IS '설문 항목 명';

-- Table: tb_onln_poll_manage (온라인 poll 관리 테이블)
COMMENT ON TABLE tb_onln_poll_manage IS '온라인 poll 관리 테이블';
COMMENT ON COLUMN tb_onln_poll_manage.poll_atmc_dsuse_yn IS '설문 자동 폐기 여부';
COMMENT ON COLUMN tb_onln_poll_manage.poll_dsuse_yn IS '설문 폐기 여부';
COMMENT ON COLUMN tb_onln_poll_manage.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_onln_poll_manage.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_onln_poll_manage.poll_bgng_ymd IS '설문 시작 일자';
COMMENT ON COLUMN tb_onln_poll_manage.poll_end_ymd IS '설문 종료 일자';
COMMENT ON COLUMN tb_onln_poll_manage.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_onln_poll_manage.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_onln_poll_manage.poll_id IS '설문 식별자';
COMMENT ON COLUMN tb_onln_poll_manage.poll_knd_cd IS '설문 종류 코드';
COMMENT ON COLUMN tb_onln_poll_manage.poll_nm IS '설문 명';

-- Table: tb_onln_poll_rslt (온라인 poll 결과 테이블)
COMMENT ON TABLE tb_onln_poll_rslt IS '온라인 poll 결과 테이블';
COMMENT ON COLUMN tb_onln_poll_rslt.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_onln_poll_rslt.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_onln_poll_rslt.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_id IS '설문아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_artcl_id IS '설문항목아이디';
COMMENT ON COLUMN tb_onln_poll_rslt.poll_rslt_id IS '설문결과아이디';

-- Table: tb_orgnzt_info (orgnzt 정보 테이블)
COMMENT ON TABLE tb_orgnzt_info IS 'orgnzt 정보 테이블';
COMMENT ON COLUMN tb_orgnzt_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_orgnzt_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_orgnzt_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_orgnzt_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_orgnzt_info.ognz_id IS '조직 아이디';
COMMENT ON COLUMN tb_orgnzt_info.ognz_nm IS '조직 명';
COMMENT ON COLUMN tb_orgnzt_info.ognz_expln IS '조직 설명';

-- Table: tb_plcy_manage (정책 관리 테이블)
COMMENT ON TABLE tb_plcy_manage IS '정책 관리 테이블';
COMMENT ON COLUMN tb_plcy_manage.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_plcy_manage.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_plcy_manage.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_plcy_manage.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_plcy_manage.plcy_type_cd IS '정책 유형 코드';
COMMENT ON COLUMN tb_plcy_manage.plcy_cn IS '정책 내용';
COMMENT ON COLUMN tb_plcy_manage.plcy_ttl IS '정책 제목';

-- Table: tb_popup_info (팝업 정보 테이블)
COMMENT ON TABLE tb_popup_info IS '팝업 정보 테이블';
COMMENT ON COLUMN tb_popup_info.ntce_yn IS '게시 여부';
COMMENT ON COLUMN tb_popup_info.stopvew_setup_yn IS '그만보기 설정 여부';
COMMENT ON COLUMN tb_popup_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_popup_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_popup_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_popup_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_popup_info.ntce_bgnde IS '게시 시작 일자';
COMMENT ON COLUMN tb_popup_info.ntce_endde IS '게시 종료 일자';
COMMENT ON COLUMN tb_popup_info.popup_id IS '팝업 아이디';
COMMENT ON COLUMN tb_popup_info.popup_vrtc_pstn IS '팝업 세로 위치';
COMMENT ON COLUMN tb_popup_info.popup_vrtc_sz IS '팝업 세로 크기';
COMMENT ON COLUMN tb_popup_info.popup_wdth_pstn IS '팝업 가로 위치';
COMMENT ON COLUMN tb_popup_info.popup_wdth_sz IS '팝업 가로 크기';
COMMENT ON COLUMN tb_popup_info.file_url IS '파일 URL';
COMMENT ON COLUMN tb_popup_info.popup_ttl_nm IS '팝업 제목';

-- Table: tb_prgrm_lst (프로그램 목록 테이블)
COMMENT ON TABLE tb_prgrm_lst IS '프로그램 목록 테이블';
COMMENT ON COLUMN tb_prgrm_lst.prgrm_file_nm IS '프로그램 파일 명';
COMMENT ON COLUMN tb_prgrm_lst.prgrm_korn_nm IS '프로그램 한글 명';
COMMENT ON COLUMN tb_prgrm_lst.prgrm_strg_path IS '프로그램 저장 경로';
COMMENT ON COLUMN tb_prgrm_lst.url IS 'URL';
COMMENT ON COLUMN tb_prgrm_lst.prgrm_expln IS '프로그램 설명';
COMMENT ON COLUMN tb_prgrm_lst.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_prgrm_lst.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_prgrm_lst.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_prgrm_lst.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_privacy_log (개인정보 로그 테이블)
COMMENT ON TABLE tb_privacy_log IS '개인정보 로그 테이블';
COMMENT ON COLUMN tb_privacy_log.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_privacy_log.inq_dt IS '조회 일시';
COMMENT ON COLUMN tb_privacy_log.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_privacy_log.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_privacy_log.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_privacy_log.dmnd_id IS '요청 아이디';
COMMENT ON COLUMN tb_privacy_log.dmnd_user_id IS '요청 사용자 아이디';
COMMENT ON COLUMN tb_privacy_log.dmnd_user_ip_addr IS '요청 사용자 IP 주소';
COMMENT ON COLUMN tb_privacy_log.inq_info IS '조회 정보';
COMMENT ON COLUMN tb_privacy_log.srvc_nm IS '서비스 명';

-- Table: tb_role_info (롤 정보 테이블)
COMMENT ON TABLE tb_role_info IS '롤 정보 테이블';
COMMENT ON COLUMN tb_role_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_role_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_role_info.role_sort IS '롤 정렬 순서';
COMMENT ON COLUMN tb_role_info.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_role_info.last_mdfr_id IS '최종 수정자 ID';
COMMENT ON COLUMN tb_role_info.role_crt_ymd IS '롤 생성 일자';
COMMENT ON COLUMN tb_role_info.role_id IS '롤 ID';
COMMENT ON COLUMN tb_role_info.role_nm IS '롤 명칭';
COMMENT ON COLUMN tb_role_info.role_type_cd IS '롤 유형 코드';
COMMENT ON COLUMN tb_role_info.role_expln IS '롤 설명';
COMMENT ON COLUMN tb_role_info.role_patrn IS '롤 패턴';

-- Table: tb_role_lyr (롤 계층 정보 테이블)
COMMENT ON TABLE tb_role_lyr IS '롤 계층 정보 테이블';
COMMENT ON COLUMN tb_role_lyr.prnt_role_id IS '부모 롤 ID';
COMMENT ON COLUMN tb_role_lyr.chld_role_id IS '자식 롤 ID';
COMMENT ON COLUMN tb_role_lyr.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_role_lyr.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_role_lyr.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_role_lyr.last_mdfr_id IS '최종 수정자 ID';

-- Table: tb_rpt_info (보고 정보 테이블)
COMMENT ON TABLE tb_rpt_info IS '보고 정보 테이블';
COMMENT ON COLUMN tb_rpt_info.rpt_se_cd IS '보고 구분 코드';
COMMENT ON COLUMN tb_rpt_info.rpt_stts_cd IS '보고 상태 코드';
COMMENT ON COLUMN tb_rpt_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_rpt_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_rpt_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_rpt_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_rpt_info.rpt_ymd IS '보고 일자';
COMMENT ON COLUMN tb_rpt_info.rpt_id IS '보고 아이디';
COMMENT ON COLUMN tb_rpt_info.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_rpt_info.rpt_cn IS '보고 내용';
COMMENT ON COLUMN tb_rpt_info.rpt_ttl IS '보고 제목';

-- Table: tb_rward_manage (포상 관리 테이블)
COMMENT ON TABLE tb_rward_manage IS '포상 관리 테이블';
COMMENT ON COLUMN tb_rward_manage.confm_yn IS '승인 여부';
COMMENT ON COLUMN tb_rward_manage.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_rward_manage.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_rward_manage.aprv_dt IS '승인 일시';
COMMENT ON COLUMN tb_rward_manage.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_rward_manage.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_rward_manage.ifml_atrz_id IS '비공식 결재 아이디';
COMMENT ON COLUMN tb_rward_manage.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_rward_manage.rwrd_cd IS '포상 코드';
COMMENT ON COLUMN tb_rward_manage.rwrd_ymd IS '포상 일자';
COMMENT ON COLUMN tb_rward_manage.rwrd_id IS '포상 아이디';
COMMENT ON COLUMN tb_rward_manage.rwrd_user_id IS '포상 사용자 아이디';
COMMENT ON COLUMN tb_rward_manage.atrzr_id IS '결재자 아이디';
COMMENT ON COLUMN tb_rward_manage.rtn_rsn_cn IS '반납 사유 내용';
COMMENT ON COLUMN tb_rward_manage.cntrb_cn IS '공적 내용';
COMMENT ON COLUMN tb_rward_manage.rwrd_nm IS '포상 명';

-- Table: tb_schdl_info (일정 정보 테이블)
COMMENT ON TABLE tb_schdl_info IS '일정 정보 테이블';
COMMENT ON COLUMN tb_schdl_info.rept_se_cd IS '반복 구분 코드';
COMMENT ON COLUMN tb_schdl_info.schdl_imprt_cd IS '일정 중요도 코드';
COMMENT ON COLUMN tb_schdl_info.schdl_knd_cd IS '일정 종류 코드';
COMMENT ON COLUMN tb_schdl_info.schdl_se_cd IS '일정 구분 코드';
COMMENT ON COLUMN tb_schdl_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_schdl_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_schdl_info.atch_file_id IS '첨부 파일 아이디';
COMMENT ON COLUMN tb_schdl_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_schdl_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_schdl_info.schdl_bgng_ymd IS '일정 시작 일자';
COMMENT ON COLUMN tb_schdl_info.schdl_pic_id IS '일정 담당자 아이디';
COMMENT ON COLUMN tb_schdl_info.schdl_dept_id IS '일정 부서 아이디';
COMMENT ON COLUMN tb_schdl_info.schdl_end_ymd IS '일정 종료 일자';
COMMENT ON COLUMN tb_schdl_info.schdl_id IS '일정 아이디';
COMMENT ON COLUMN tb_schdl_info.schdl_cn IS '일정 내용';
COMMENT ON COLUMN tb_schdl_info.schdl_nm IS '일정 명';
COMMENT ON COLUMN tb_schdl_info.schdl_plc_nm IS '일정 장소 명';

-- Table: tb_sms_info (SMS 정보 테이블)
COMMENT ON TABLE tb_sms_info IS 'SMS 정보 테이블';
COMMENT ON COLUMN tb_sms_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_sms_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_sms_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_sms_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_sms_info.sms_id IS 'SMS 아이디';
COMMENT ON COLUMN tb_sms_info.sndng_telno IS '발송 전화번호';
COMMENT ON COLUMN tb_sms_info.sndng_cn IS '발송 내용';

-- Table: tb_sms_rcptn (SMS 수신 테이블)
COMMENT ON TABLE tb_sms_rcptn IS 'SMS 수신 테이블';
COMMENT ON COLUMN tb_sms_rcptn.rslt_cd IS '결과 코드';
COMMENT ON COLUMN tb_sms_rcptn.rcptn_telno IS '수신 전화번호';
COMMENT ON COLUMN tb_sms_rcptn.sms_id IS 'SMS 아이디';
COMMENT ON COLUMN tb_sms_rcptn.rslt_msg IS '결과 메시지';

-- Table: tb_srvy_artcl (설문 항목 테이블)
COMMENT ON TABLE tb_srvy_artcl IS '설문 항목 테이블';
COMMENT ON COLUMN tb_srvy_artcl.etc_ans_yn IS '기타 답변 여부';
COMMENT ON COLUMN tb_srvy_artcl.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_srvy_artcl.artcl_sn IS '항목 일련번호';
COMMENT ON COLUMN tb_srvy_artcl.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_srvy_artcl.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_srvy_artcl.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_srvy_artcl.srvy_id IS '설문 아이디';
COMMENT ON COLUMN tb_srvy_artcl.srvy_artcl_id IS '설문 항목 아이디';
COMMENT ON COLUMN tb_srvy_artcl.srvy_qstn_id IS '설문 질문 아이디';
COMMENT ON COLUMN tb_srvy_artcl.srvy_tmplt_id IS '설문 서식 아이디';
COMMENT ON COLUMN tb_srvy_artcl.artcl_cn IS '항목 내용';

-- Table: tb_srvy_info (설문 정보 테이블)
COMMENT ON TABLE tb_srvy_info IS '설문 정보 테이블';
COMMENT ON COLUMN tb_srvy_info.srvy_id IS '설문 아이디';
COMMENT ON COLUMN tb_srvy_info.srvy_tmplt_id IS '설문 서식 아이디';
COMMENT ON COLUMN tb_srvy_info.srvy_ttl IS '설문 제목';
COMMENT ON COLUMN tb_srvy_info.srvy_prps IS '설문 목적';
COMMENT ON COLUMN tb_srvy_info.srvy_trgt IS '설문 대상';
COMMENT ON COLUMN tb_srvy_info.srvy_wrt_gd_cn IS '설문 작성 안내 내용';
COMMENT ON COLUMN tb_srvy_info.srvy_bgng_ymd IS '설문 시작 일자';
COMMENT ON COLUMN tb_srvy_info.srvy_end_ymd IS '설문 종료 일자';
COMMENT ON COLUMN tb_srvy_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_srvy_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_srvy_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_srvy_info.mdfcn_dt IS '수정 일시';

-- Table: tb_srvy_qstn (설문 질문 테이블)
COMMENT ON TABLE tb_srvy_qstn IS '설문 질문 테이블';
COMMENT ON COLUMN tb_srvy_qstn.max_chc_cnt IS '최대 선택 수';
COMMENT ON COLUMN tb_srvy_qstn.qstn_type_cd IS '질문 유형 코드';
COMMENT ON COLUMN tb_srvy_qstn.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_srvy_qstn.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_srvy_qstn.qstn_sn IS '질문 일련번호';
COMMENT ON COLUMN tb_srvy_qstn.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_srvy_qstn.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_srvy_qstn.srvy_id IS '설문 아이디';
COMMENT ON COLUMN tb_srvy_qstn.srvy_qstn_id IS '설문 질문 아이디';
COMMENT ON COLUMN tb_srvy_qstn.srvy_tmplt_id IS '설문 서식 아이디';
COMMENT ON COLUMN tb_srvy_qstn.qstn_cn IS '질문 내용';

-- Table: tb_srvy_rslt (설문 결과 테이블)
COMMENT ON TABLE tb_srvy_rslt IS '설문 결과 테이블';
COMMENT ON COLUMN tb_srvy_rslt.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_srvy_rslt.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_srvy_rslt.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_srvy_rslt.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_srvy_rslt.srvy_id IS '설문 아이디';
COMMENT ON COLUMN tb_srvy_rslt.srvy_artcl_id IS '설문 항목 아이디';
COMMENT ON COLUMN tb_srvy_rslt.srvy_qstn_id IS '설문 질문 아이디';
COMMENT ON COLUMN tb_srvy_rslt.srvy_rspns_id IS '설문 응답 아이디';
COMMENT ON COLUMN tb_srvy_rslt.srvy_tmplt_id IS '설문 서식 아이디';
COMMENT ON COLUMN tb_srvy_rslt.rspns_nm IS '응답 명';
COMMENT ON COLUMN tb_srvy_rslt.etc_ans_cn IS '기타 답변 내용';
COMMENT ON COLUMN tb_srvy_rslt.rspdnt_ans_cn IS '응답자 답변 내용';

-- Table: tb_srvy_rspdnt (설문 응답자 테이블)
COMMENT ON TABLE tb_srvy_rspdnt IS '설문 응답자 테이블';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_id IS '설문아이디';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_rspdnt_id IS '설문응답아이디';
COMMENT ON COLUMN tb_srvy_rspdnt.gndr_cd IS 'SEXDSTN코드';
COMMENT ON COLUMN tb_srvy_rspdnt.cr_type_cd IS 'OCCP유형코드';
COMMENT ON COLUMN tb_srvy_rspdnt.rspdnt_nm IS '응답명';
COMMENT ON COLUMN tb_srvy_rspdnt.brdt IS '생년월일';
COMMENT ON COLUMN tb_srvy_rspdnt.rgn_telno IS '지역번호';
COMMENT ON COLUMN tb_srvy_rspdnt.mid_telno IS 'MIDDLE전화번호';
COMMENT ON COLUMN tb_srvy_rspdnt.end_telno IS '종료전화번호';
COMMENT ON COLUMN tb_srvy_rspdnt.crt_dt IS '최초등록시점';
COMMENT ON COLUMN tb_srvy_rspdnt.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_srvy_rspdnt.mdfcn_dt IS '최종수정시점';
COMMENT ON COLUMN tb_srvy_rspdnt.last_mdfr_id IS '최종수정자아이디';

-- Table: tb_srvy_tmplt (설문 서식 테이블)
COMMENT ON TABLE tb_srvy_tmplt IS '설문 서식 테이블';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_id IS '설문템플릿아이디';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_type_cd IS '설문템플릿유형';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_expln IS '설문템플릿설명';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_path_nm IS '설문템플릿경로명';
COMMENT ON COLUMN tb_srvy_tmplt.crt_dt IS '최초등록시점';
COMMENT ON COLUMN tb_srvy_tmplt.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_srvy_tmplt.mdfcn_dt IS '최종수정시점';
COMMENT ON COLUMN tb_srvy_tmplt.last_mdfr_id IS '최종수정자아이디';
COMMENT ON COLUMN tb_srvy_tmplt.srvy_tmplt_img_info IS '설문템플릿IMAGE정보';

-- Table: tb_stmp_info (stmp 정보 테이블)
COMMENT ON TABLE tb_stmp_info IS 'stmp 정보 테이블';
COMMENT ON COLUMN tb_stmp_info.mpng_crt_id IS '매핑 생성 아이디';
COMMENT ON COLUMN tb_stmp_info.crtr_id IS '기준 아이디';
COMMENT ON COLUMN tb_stmp_info.mpng_file_nm IS '매핑 파일 명';
COMMENT ON COLUMN tb_stmp_info.mpng_file_path IS '매핑 파일 경로';
COMMENT ON COLUMN tb_stmp_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_stmp_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_stmp_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_stmp_info.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_sys_log (시스템 로그 테이블)
COMMENT ON TABLE tb_sys_log IS '시스템 로그 테이블';
COMMENT ON COLUMN tb_sys_log.err_se_cd IS '오류 구분 코드';
COMMENT ON COLUMN tb_sys_log.prcs_se_cd IS '처리 구분 코드';
COMMENT ON COLUMN tb_sys_log.rspns_cd IS '응답 코드';
COMMENT ON COLUMN tb_sys_log.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_sys_log.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_sys_log.prcs_tm IS '처리 시각';
COMMENT ON COLUMN tb_sys_log.err_cd IS '오류 코드';
COMMENT ON COLUMN tb_sys_log.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_sys_log.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_sys_log.ocrn_ymd IS '발생 일자';
COMMENT ON COLUMN tb_sys_log.dmnd_id IS '요청 아이디';
COMMENT ON COLUMN tb_sys_log.dmnd_user_id IS '요청 사용자 아이디';
COMMENT ON COLUMN tb_sys_log.dmnd_user_ip_addr IS '요청 사용자 IP 주소';
COMMENT ON COLUMN tb_sys_log.mthd_nm IS '방법 명';
COMMENT ON COLUMN tb_sys_log.srvc_nm IS '서비스 명';

-- Table: tb_tmplt_info (서식 정보 테이블)
COMMENT ON TABLE tb_tmplt_info IS '서식 정보 테이블';
COMMENT ON COLUMN tb_tmplt_info.use_yn IS '사용 여부';
COMMENT ON COLUMN tb_tmplt_info.tmplt_se_cd IS '서식 구분 코드';
COMMENT ON COLUMN tb_tmplt_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_tmplt_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_tmplt_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_tmplt_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_tmplt_info.tmplt_id IS '서식 아이디';
COMMENT ON COLUMN tb_tmplt_info.tmplt_nm IS '서식 명';
COMMENT ON COLUMN tb_tmplt_info.tmplt_path IS '서식 경로';

-- Table: tb_user_absn (사용자 부재 테이블)
COMMENT ON TABLE tb_user_absn IS '사용자 부재 테이블';
COMMENT ON COLUMN tb_user_absn.user_absn_yn IS '사용자 부재 여부';
COMMENT ON COLUMN tb_user_absn.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_absn.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_absn.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_user_absn.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_user_absn.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_user_authrt_map (사용자 권한 매핑 테이블)
COMMENT ON TABLE tb_user_authrt_map IS '사용자 권한 매핑 테이블';
COMMENT ON COLUMN tb_user_authrt_map.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_authrt_map.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_authrt_map.mbr_type_cd IS '회원 유형 코드';
COMMENT ON COLUMN tb_user_authrt_map.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_user_authrt_map.last_mdfr_id IS '최종 수정자 ID';
COMMENT ON COLUMN tb_user_authrt_map.scrty_dcsn_trgt_id IS '보안 결정 대상 ID';
COMMENT ON COLUMN tb_user_authrt_map.authrt_id IS '권한 ID';

-- Table: tb_user_info (사용자 정보 테이블)
COMMENT ON TABLE tb_user_info IS '사용자 정보 테이블';
COMMENT ON COLUMN tb_user_info.esntl_id IS '고유 식별값';
COMMENT ON COLUMN tb_user_info.user_id IS '로그인 아이디';
COMMENT ON COLUMN tb_user_info.user_type_cd IS '사용자 유형 코드';
COMMENT ON COLUMN tb_user_info.pswd IS '비밀번호';
COMMENT ON COLUMN tb_user_info.pswd_hint IS '비밀번호 힌트';
COMMENT ON COLUMN tb_user_info.pswd_cnsr IS '비밀번호 답변';
COMMENT ON COLUMN tb_user_info.chg_pswd_last_dt IS '비밀번호 최종 변경 시점';
COMMENT ON COLUMN tb_user_info.chg_pwd_cnt IS '비밀번호 변경 횟수';
COMMENT ON COLUMN tb_user_info.lck_yn IS '잠금 여부';
COMMENT ON COLUMN tb_user_info.lck_cnt IS '잠금 횟수';
COMMENT ON COLUMN tb_user_info.lck_last_pnttm IS '잠금 최종 시점';
COMMENT ON COLUMN tb_user_info.otp_secret IS 'OTP 비밀값';
COMMENT ON COLUMN tb_user_info.crtfc_dn_value IS '인증 DN 값';
COMMENT ON COLUMN tb_user_info.user_nm IS '사용자명';
COMMENT ON COLUMN tb_user_info.rrno IS '주민등록번호';
COMMENT ON COLUMN tb_user_info.gndr_cd IS '성별 코드';
COMMENT ON COLUMN tb_user_info.brth_ymd IS '출생 일자';
COMMENT ON COLUMN tb_user_info.eml_addr IS '이메일 주소';
COMMENT ON COLUMN tb_user_info.mbl_telno IS '휴대 전화번호';
COMMENT ON COLUMN tb_user_info.zip IS '우편번호';
COMMENT ON COLUMN tb_user_info.base_addr IS '기본 주소';
COMMENT ON COLUMN tb_user_info.dtl_addr IS '상세 주소';
COMMENT ON COLUMN tb_user_info.area_no IS '지역 번호';
COMMENT ON COLUMN tb_user_info.middle_telno IS '중간 전화번호';
COMMENT ON COLUMN tb_user_info.end_telno IS '종료 전화번호';
COMMENT ON COLUMN tb_user_info.fax_no IS '팩스 번호';
COMMENT ON COLUMN tb_user_info.office_telno IS '사무실 전화번호';
COMMENT ON COLUMN tb_user_info.group_id IS '그룹 아이디';
COMMENT ON COLUMN tb_user_info.ognz_id IS '조직 아이디';
COMMENT ON COLUMN tb_user_info.pstinst_cd IS '소속 기관 코드';
COMMENT ON COLUMN tb_user_info.empl_no IS '사원 번호';
COMMENT ON COLUMN tb_user_info.ofcps_nm IS '직위 명';
COMMENT ON COLUMN tb_user_info.role IS '시스템 권한';
COMMENT ON COLUMN tb_user_info.bizr_no IS '사업자 등록 번호';
COMMENT ON COLUMN tb_user_info.jurir_no IS '법인 등록 번호';
COMMENT ON COLUMN tb_user_info.cmpny_nm IS '회사 명';
COMMENT ON COLUMN tb_user_info.rprsv_nm IS '대표자 명';
COMMENT ON COLUMN tb_user_info.induty_cd IS '업종 코드';
COMMENT ON COLUMN tb_user_info.ent_se_cd IS '기업 구분 코드';
COMMENT ON COLUMN tb_user_info.user_stts_cd IS '사용자 상태 코드';
COMMENT ON COLUMN tb_user_info.sbscrb_ymd IS '가입 일자';
COMMENT ON COLUMN tb_user_info.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_user_info.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_user_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_info.mdfcn_dt IS '수정 일시';

-- Table: tb_user_log (사용자 로그 테이블)
COMMENT ON TABLE tb_user_log IS '사용자 로그 테이블';
COMMENT ON COLUMN tb_user_log.crt_cnt IS '생성 수';
COMMENT ON COLUMN tb_user_log.del_cnt IS '삭제 수';
COMMENT ON COLUMN tb_user_log.err_cnt IS '오류 수';
COMMENT ON COLUMN tb_user_log.otpt_cnt IS '출력 수';
COMMENT ON COLUMN tb_user_log.inq_cnt IS '조회 수';
COMMENT ON COLUMN tb_user_log.mdfcn_cnt IS '수정 수';
COMMENT ON COLUMN tb_user_log.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_log.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_log.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_user_log.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_user_log.ocrn_ymd IS '발생 일자';
COMMENT ON COLUMN tb_user_log.dmnd_user_id IS '요청 사용자 아이디';
COMMENT ON COLUMN tb_user_log.mthd_nm IS '방법 명';
COMMENT ON COLUMN tb_user_log.srvc_nm IS '서비스 명';

-- Table: tb_user_mdfcn_dtls (사용자 수정 dtls 테이블)
COMMENT ON TABLE tb_user_mdfcn_dtls IS '사용자 수정 dtls 테이블';
COMMENT ON COLUMN tb_user_mdfcn_dtls.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mdfcn_ymd IS 'CHANGE일자';
COMMENT ON COLUMN tb_user_mdfcn_dtls.ognz_id IS '조직아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.group_id IS '그룹아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.empl_no IS '사원번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.gndr_cd IS 'SEXDSTN코드';
COMMENT ON COLUMN tb_user_mdfcn_dtls.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_user_mdfcn_dtls.fax_no IS '팩스 번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_base_addr IS '택주소';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_end_tel_no IS '택종료전화번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_rgn_tel_no IS '지역번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.dtl_addr IS 'DETAIL주소';
COMMENT ON COLUMN tb_user_mdfcn_dtls.zip IS '우편번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.offm_telno IS '사무실전화번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mbl_tel_no IS '휴대폰번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.eml_addr IS '이메일주소';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_mid_tel_no IS '택MIDDLE전화번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.inst_id IS '게시물기관코드';
COMMENT ON COLUMN tb_user_mdfcn_dtls.user_stts_cd IS '사용자상태코드';
COMMENT ON COLUMN tb_user_mdfcn_dtls.esntl_id IS '필수아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_mdfcn_dtls.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_user_noti (사용자 알림 테이블)
COMMENT ON TABLE tb_user_noti IS '사용자 알림 테이블';
COMMENT ON COLUMN tb_user_noti.read_yn IS 'read 여부';
COMMENT ON COLUMN tb_user_noti.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_noti.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_noti.noti_ivl_val IS '알림 ivl 값';
COMMENT ON COLUMN tb_user_noti.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_user_noti.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_user_noti.noti_sn IS '알림 일련번호';
COMMENT ON COLUMN tb_user_noti.noti_dt IS '알림 일시';
COMMENT ON COLUMN tb_user_noti.rcvr_id IS '수신자 아이디';
COMMENT ON COLUMN tb_user_noti.noti_ttl_nm IS '알림 제목 명';
COMMENT ON COLUMN tb_user_noti.noti_cn IS '알림 내용';
COMMENT ON COLUMN tb_user_noti.link_url IS '연계 URL';

-- Table: tb_web_log (웹 로그 테이블)
COMMENT ON TABLE tb_web_log IS '웹 로그 테이블';
COMMENT ON COLUMN tb_web_log.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_web_log.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_web_log.occr_ymd IS 'occr 일자';
COMMENT ON COLUMN tb_web_log.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_web_log.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_web_log.dmnd_id IS '요청 아이디';
COMMENT ON COLUMN tb_web_log.dmnd_user_id IS '요청 사용자 아이디';
COMMENT ON COLUMN tb_web_log.dmnd_user_ip_addr IS '요청 사용자 IP 주소';
COMMENT ON COLUMN tb_web_log.url IS 'URL';

-- Table: tb_srvy_rspdnt (설문 응답자 테이블)
COMMENT ON TABLE tb_srvy_rspdnt IS '설문 응답자 테이블';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_tmplt_id IS '설문 템플릿 식별자';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_id IS '설문 식별자';
COMMENT ON COLUMN tb_srvy_rspdnt.srvy_rspdnt_id IS '설문 응답자 식별자';
COMMENT ON COLUMN tb_srvy_rspdnt.gndr_cd IS '성별 코드';
COMMENT ON COLUMN tb_srvy_rspdnt.cr_type_cd IS '직업 유형 코드';
COMMENT ON COLUMN tb_srvy_rspdnt.rspdnt_nm IS '응답자 명';
COMMENT ON COLUMN tb_srvy_rspdnt.brdt IS '생년월일';
COMMENT ON COLUMN tb_srvy_rspdnt.rgn_telno IS '지역 전화번호';
COMMENT ON COLUMN tb_srvy_rspdnt.mid_telno IS '중간 전화번호';
COMMENT ON COLUMN tb_srvy_rspdnt.end_telno IS '종료 전화번호';
COMMENT ON COLUMN tb_srvy_rspdnt.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_srvy_rspdnt.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_srvy_rspdnt.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_srvy_rspdnt.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_user_mdfcn_dtls (사용자 수정 내역 테이블)
COMMENT ON TABLE tb_user_mdfcn_dtls IS '사용자 수정 내역 테이블';
COMMENT ON COLUMN tb_user_mdfcn_dtls.user_id IS '사용자 아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mdfcn_ymd IS '수정 일자';
COMMENT ON COLUMN tb_user_mdfcn_dtls.ognz_id IS '조직 아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.group_id IS '그룹 아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.empl_no IS '사원 번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.gndr_cd IS '성별 코드';
COMMENT ON COLUMN tb_user_mdfcn_dtls.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_user_mdfcn_dtls.fax_no IS '팩스 번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_base_addr IS '자택 기본 주소';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_end_tel_no IS '자택 종료 전화번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_rgn_tel_no IS '자택 지역 전화번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.dtl_addr IS '상세 주소';
COMMENT ON COLUMN tb_user_mdfcn_dtls.zip IS '우편번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.offm_telno IS '사무실 전화번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mbl_tel_no IS '휴대폰 번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.eml_addr IS '이메일 주소';
COMMENT ON COLUMN tb_user_mdfcn_dtls.home_mid_tel_no IS '자택 중간 전화번호';
COMMENT ON COLUMN tb_user_mdfcn_dtls.inst_id IS '기관 식별자';
COMMENT ON COLUMN tb_user_mdfcn_dtls.user_stts_cd IS '사용자 상태 코드';
COMMENT ON COLUMN tb_user_mdfcn_dtls.esntl_id IS '고유 식별값';
COMMENT ON COLUMN tb_user_mdfcn_dtls.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_mdfcn_dtls.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_mdfcn_dtls.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_user_mdfcn_dtls.last_mdfr_id IS '최종 수정자 아이디';

-- Table: tb_user_noti (사용자 알림 테이블)
COMMENT ON TABLE tb_user_noti IS '사용자 알림 테이블';
COMMENT ON COLUMN tb_user_noti.read_yn IS '읽음 여부';
COMMENT ON COLUMN tb_user_noti.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_noti.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_noti.noti_ivl_val IS '알림 간격 값';
COMMENT ON COLUMN tb_user_noti.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_user_noti.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_user_noti.noti_sn IS '알림 일련번호';
COMMENT ON COLUMN tb_user_noti.noti_dt IS '알림 일시';
COMMENT ON COLUMN tb_user_noti.rcvr_id IS '수신자 아이디';
COMMENT ON COLUMN tb_user_noti.noti_ttl_nm IS '알림 제목';
COMMENT ON COLUMN tb_user_noti.noti_cn IS '알림 내용';
COMMENT ON COLUMN tb_user_noti.link_url IS '연계 URL';

-- Table: tb_web_log (웹 로그 테이블)
COMMENT ON TABLE tb_web_log IS '웹 로그 테이블';
COMMENT ON COLUMN tb_web_log.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_web_log.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_web_log.occr_ymd IS '발생 일자';
COMMENT ON COLUMN tb_web_log.frst_rgtr_id IS '최초 등록자 아이디';
COMMENT ON COLUMN tb_web_log.last_mdfr_id IS '최종 수정자 아이디';
COMMENT ON COLUMN tb_web_log.dmnd_id IS '요청 아이디';
COMMENT ON COLUMN tb_web_log.dmnd_user_id IS '요청 사용자 아이디';
COMMENT ON COLUMN tb_web_log.dmnd_user_ip_addr IS '요청 사용자 IP 주소';
COMMENT ON COLUMN tb_web_log.url IS 'URL';

COMMIT;