/*
 * DB Standardization Migration Script (BBS Domain Consolidated) - Full Comments Included
 * Targets: tb_bbs_master, tb_bbs_master_optn, tb_bbs_item, tb_bbs_comment, tb_bbs_use_info, tb_bbs_scrap, tb_bbs_stats
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_bbs_master
ALTER TABLE tb_bbs_master 
    RENAME COLUMN bbs_nm TO bbs_ttl,
    ALTER COLUMN bbs_ttl TYPE VARCHAR(300),
    RENAME COLUMN bbs_intrcn TO bbs_expln,
    ALTER COLUMN bbs_expln TYPE VARCHAR(4000),
    RENAME COLUMN bbs_ty_code TO bbs_type_cd,
    ALTER COLUMN bbs_type_cd TYPE VARCHAR(12),
    RENAME COLUMN bbs_attrb_code TO bbs_attr_cd,
    ALTER COLUMN bbs_attr_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bbs_master IS '게시판 마스터';
COMMENT ON COLUMN tb_bbs_master.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_master.bbs_ttl IS '게시판제목';
COMMENT ON COLUMN tb_bbs_master.bbs_expln IS '게시판설명';
COMMENT ON COLUMN tb_bbs_master.bbs_type_cd IS '게시판유형코드';
COMMENT ON COLUMN tb_bbs_master.bbs_attr_cd IS '게시판속성코드';
COMMENT ON COLUMN tb_bbs_master.reply_posbl_yn IS '답장가능여부';
COMMENT ON COLUMN tb_bbs_master.file_atch_posbl_yn IS '파일첨부가능여부';
COMMENT ON COLUMN tb_bbs_master.atch_posbl_file_number IS '첨부가능파일수';
COMMENT ON COLUMN tb_bbs_master.atch_posbl_file_size IS '첨부가능파일크기';
COMMENT ON COLUMN tb_bbs_master.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_master.tmplat_id IS '템플릿아이디';
COMMENT ON COLUMN tb_bbs_master.cmmnty_id IS '커뮤니티아이디';
COMMENT ON COLUMN tb_bbs_master.blog_id IS '블로그아이디';
COMMENT ON COLUMN tb_bbs_master.blog_yn IS '블로그여부';
COMMENT ON COLUMN tb_bbs_master.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_master.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_master.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_master.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_bbs_master_optn
ALTER TABLE tb_bbs_master_optn 
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bbs_master_optn IS '게시판 옵션 정보';
COMMENT ON COLUMN tb_bbs_master_optn.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_master_optn.answer_yn IS '답변여부';
COMMENT ON COLUMN tb_bbs_master_optn.stsfdg_yn IS '만족도여부';
COMMENT ON COLUMN tb_bbs_master_optn.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_master_optn.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_master_optn.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_master_optn.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_bbs_item
ALTER TABLE tb_bbs_item 
    RENAME COLUMN pst_ttl TO ttl,
    ALTER COLUMN ttl TYPE VARCHAR(300),
    RENAME COLUMN pst_cn TO cn,
    ALTER COLUMN cn TYPE VARCHAR(4000),
    RENAME COLUMN inq_cnt TO rdcnt,
    RENAME COLUMN password TO pswd,
    RENAME COLUMN up_pst_id TO upr_pst_id,
    RENAME COLUMN reply_sn TO rpl_sn,
    RENAME COLUMN sort_ordr TO sort_seq,
    RENAME COLUMN qna_status TO qna_stts_cd,
    ALTER COLUMN qna_stts_cd TYPE VARCHAR(12),
    RENAME COLUMN qna_category TO qna_cat_cd,
    ALTER COLUMN qna_cat_cd TYPE VARCHAR(12),
    RENAME COLUMN like_co TO like_nocs,
    RENAME COLUMN sj_bold_yn TO ttl_bold_yn,
    RENAME COLUMN event_date TO evnt_ymd,
    ALTER COLUMN evnt_ymd TYPE CHAR(8),
    RENAME COLUMN ntce_bgnde TO ntce_bgng_ymd,
    ALTER COLUMN ntce_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN ntce_endde TO ntce_end_ymd,
    ALTER COLUMN ntce_end_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bbs_item IS '게시판 게시물 정보';
COMMENT ON COLUMN tb_bbs_item.pst_id IS '게시물아이디';
COMMENT ON COLUMN tb_bbs_item.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_item.ttl IS '제목';
COMMENT ON COLUMN tb_bbs_item.cn IS '내용';
COMMENT ON COLUMN tb_bbs_item.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_bbs_item.rdcnt IS '조회수';
COMMENT ON COLUMN tb_bbs_item.ntcr_id IS '게시자아이디';
COMMENT ON COLUMN tb_bbs_item.ntcr_nm IS '게시자명';
COMMENT ON COLUMN tb_bbs_item.pswd IS '비밀번호';
COMMENT ON COLUMN tb_bbs_item.secret_yn IS '비밀여부';
COMMENT ON COLUMN tb_bbs_item.notice_yn IS '공지여부';
COMMENT ON COLUMN tb_bbs_item.sort_seq IS '정렬순서';
COMMENT ON COLUMN tb_bbs_item.rpl_sn IS '답장일련번호';
COMMENT ON COLUMN tb_bbs_item.upr_pst_id IS '상위게시물아이디';
COMMENT ON COLUMN tb_bbs_item.ntce_bgng_ymd IS '게시시작일자';
COMMENT ON COLUMN tb_bbs_item.ntce_end_ymd IS '게시종료일자';
COMMENT ON COLUMN tb_bbs_item.qna_stts_cd IS 'QNA상태코드';
COMMENT ON COLUMN tb_bbs_item.qna_cat_cd IS 'QNA카테고리코드';
COMMENT ON COLUMN tb_bbs_item.like_nocs IS '추천수';
COMMENT ON COLUMN tb_bbs_item.ttl_bold_yn IS '제목굵게여부';
COMMENT ON COLUMN tb_bbs_item.evnt_ymd IS '행사일자';
COMMENT ON COLUMN tb_bbs_item.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_item.blog_id IS '블로그아이디';
COMMENT ON COLUMN tb_bbs_item.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_item.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_item.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_item.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_bbs_comment
ALTER TABLE tb_bbs_comment 
    RENAME COLUMN ntt_id TO pst_id,
    RENAME COLUMN password TO pswd,
    RENAME COLUMN answer TO cmnt_expln,
    ALTER COLUMN cmnt_expln TYPE VARCHAR(4000),
    RENAME COLUMN answer_no TO cmnt_id,
    RENAME COLUMN use_at TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bbs_comment IS '게시판 댓글 정보';
COMMENT ON COLUMN tb_bbs_comment.cmnt_id IS '댓글아이디';
COMMENT ON COLUMN tb_bbs_comment.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_comment.pst_id IS '게시물아이디';
COMMENT ON COLUMN tb_bbs_comment.wrter_id IS '작성자아이디';
COMMENT ON COLUMN tb_bbs_comment.wrter_nm IS '작성자명';
COMMENT ON COLUMN tb_bbs_comment.pswd IS '비밀번호';
COMMENT ON COLUMN tb_bbs_comment.cmnt_expln IS '댓글내용';
COMMENT ON COLUMN tb_bbs_comment.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_comment.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_comment.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_comment.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_comment.last_mdfr_id IS '최종수정자아이디';

-- 5. tb_bbs_use_info
ALTER TABLE tb_bbs_use_info 
    RENAME COLUMN regist_se_code TO regist_se_cd,
    ALTER COLUMN regist_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bbs_use_info IS '게시판 이용 정보';
COMMENT ON COLUMN tb_bbs_use_info.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_use_info.trget_id IS '대상아이디';
COMMENT ON COLUMN tb_bbs_use_info.regist_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_bbs_use_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_use_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_use_info.mdfcn_dt IS '수정일시';

-- 6. tb_bbs_scrap
ALTER TABLE tb_bbs_scrap 
    RENAME COLUMN ntt_id TO pst_id,
    RENAME COLUMN scrap_nm TO scrap_ttl,
    ALTER COLUMN scrap_ttl TYPE VARCHAR(300),
    RENAME COLUMN scrap_dc TO scrap_expln,
    ALTER COLUMN scrap_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bbs_scrap IS '게시물 스크랩 정보';
COMMENT ON COLUMN tb_bbs_scrap.scrap_id IS '스크랩아이디';
COMMENT ON COLUMN tb_bbs_scrap.user_id IS '사용자아이디'; -- Assuming frst_rgtr_id is used or adding user_id
COMMENT ON COLUMN tb_bbs_scrap.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_scrap.pst_id IS '게시물아이디';
COMMENT ON COLUMN tb_bbs_scrap.scrap_ttl IS '스크랩제목';
COMMENT ON COLUMN tb_bbs_scrap.scrap_expln IS '스크랩설명';
COMMENT ON COLUMN tb_bbs_scrap.scrap_url IS '스크랩URL';
COMMENT ON COLUMN tb_bbs_scrap.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_scrap.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_scrap.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_scrap.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_scrap.last_mdfr_id IS '최종수정자아이디';

-- 7. tb_bbs_stats
ALTER TABLE tb_bbs_stats 
    RENAME COLUMN ntc_cnt TO notice_nocs,
    RENAME COLUMN avg_inq_cnt TO avg_rdcnt,
    RENAME COLUMN max_inq_cnt TO max_rdcnt,
    RENAME COLUMN min_inq_cnt TO min_rdcnt,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_bbs_stats IS '게시판 통계 정보';
COMMENT ON COLUMN tb_bbs_stats.stats_id IS '통계아이디';
COMMENT ON COLUMN tb_bbs_stats.notice_nocs IS '공지수';
COMMENT ON COLUMN tb_bbs_stats.avg_rdcnt IS '평균조회수';
COMMENT ON COLUMN tb_bbs_stats.max_rdcnt IS '최대조회수';
COMMENT ON COLUMN tb_bbs_stats.min_rdcnt IS '최소조회수';
COMMENT ON COLUMN tb_bbs_stats.top_ntcr_id IS '최다게시자아이디';
COMMENT ON COLUMN tb_bbs_stats.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_stats.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_stats.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_stats.last_mdfr_id IS '최종수정자아이디';

COMMIT;
