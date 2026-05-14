/*
 * DB Standardization Migration Script (BBS Domain Batch)
 * Targets: tb_bbs_master_optn, tb_bbs_item, tb_bbs_comment, tb_bbs_use_info, tb_bbs_scrap, tb_bbs_stats
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_bbs_master_optn (7 Columns)
ALTER TABLE tb_bbs_master_optn 
    RENAME COLUMN answer_yn TO ans_yn,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_bbs_master_optn IS '게시판 옵션 정보';
COMMENT ON COLUMN tb_bbs_master_optn.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_master_optn.ans_yn IS '답변여부';
COMMENT ON COLUMN tb_bbs_master_optn.stsfdg_yn IS '만족도여부';
COMMENT ON COLUMN tb_bbs_master_optn.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_master_optn.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_master_optn.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_master_optn.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_bbs_item (23 Columns)
ALTER TABLE tb_bbs_item 
    RENAME COLUMN pst_ttl TO ttl,
    RENAME COLUMN pst_cn TO cn,
    RENAME COLUMN inq_cnt TO rdcnt,
    RENAME COLUMN password TO pswd,
    RENAME COLUMN sort_ordr TO sort_seq,
    RENAME COLUMN reply_sn TO rpl_sn,
    RENAME COLUMN up_pst_id TO upr_pst_id,
    RENAME COLUMN ntce_bgnde TO ntce_bgng_ymd,
    ALTER COLUMN ntce_bgng_ymd TYPE CHAR(8),
    RENAME COLUMN ntce_endde TO ntce_end_ymd,
    ALTER COLUMN ntce_end_ymd TYPE CHAR(8),
    RENAME COLUMN qna_status TO qna_stts_cd,
    ALTER COLUMN qna_stts_cd TYPE VARCHAR(12),
    RENAME COLUMN qna_category TO qna_cat_cd,
    ALTER COLUMN qna_cat_cd TYPE VARCHAR(12),
    RENAME COLUMN like_co TO like_nocs,
    RENAME COLUMN comment_co TO cmnt_nocs,
    RENAME COLUMN file_co TO file_nocs,
    RENAME COLUMN sj_bold_yn TO ttl_bold_yn,
    RENAME COLUMN event_date TO evnt_ymd,
    ALTER COLUMN evnt_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_bbs_item IS '게시판 게시물 정보';
-- [Columns Comments omitted for brevity in thought, but included in actual file for all 23 columns]
COMMENT ON COLUMN tb_bbs_item.pst_id IS '게시물아이디';
COMMENT ON COLUMN tb_bbs_item.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_item.ttl IS '제목';
COMMENT ON COLUMN tb_bbs_item.cn IS '내용';
COMMENT ON COLUMN tb_bbs_item.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_bbs_item.rdcnt IS '조회수';
COMMENT ON COLUMN tb_bbs_item.ntcr_id IS '게시자아이디';
COMMENT ON COLUMN tb_bbs_item.ntcr_nm IS '게시자명';
COMMENT ON COLUMN tb_bbs_item.pswd IS '비밀번호';
COMMENT ON COLUMN tb_bbs_item.answer_yn IS '답변여부';
COMMENT ON COLUMN tb_bbs_item.answer_lc IS '답변위치';
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
COMMENT ON COLUMN tb_bbs_item.cmnt_nocs IS '댓글수';
COMMENT ON COLUMN tb_bbs_item.file_nocs IS '파일수';
COMMENT ON COLUMN tb_bbs_item.ttl_bold_yn IS '제목굵게여부';
COMMENT ON COLUMN tb_bbs_item.evnt_ymd IS '행사일자';
COMMENT ON COLUMN tb_bbs_item.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_item.blog_id IS '블로그아이디';
COMMENT ON COLUMN tb_bbs_item.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_item.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_item.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_item.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_bbs_comment (10 Columns)
ALTER TABLE tb_bbs_comment 
    RENAME COLUMN ntt_id TO pst_id,
    RENAME COLUMN password TO pswd,
    RENAME COLUMN answer TO cn,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_bbs_comment IS '게시판 댓글 정보';
COMMENT ON COLUMN tb_bbs_comment.cmnt_id IS '댓글아이디';
COMMENT ON COLUMN tb_bbs_comment.pst_id IS '게시물아이디';
COMMENT ON COLUMN tb_bbs_comment.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_comment.wrter_id IS '작성자아이디';
COMMENT ON COLUMN tb_bbs_comment.wrter_nm IS '작성자명';
COMMENT ON COLUMN tb_bbs_comment.pswd IS '비밀번호';
COMMENT ON COLUMN tb_bbs_comment.cn IS '댓글내용';
COMMENT ON COLUMN tb_bbs_comment.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_comment.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_comment.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_comment.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_bbs_use_info (6 Columns)
ALTER TABLE tb_bbs_use_info 
    RENAME COLUMN regist_se_code TO reg_se_cd,
    ALTER COLUMN reg_se_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_bbs_use_info IS '게시판 이용 정보';
COMMENT ON COLUMN tb_bbs_use_info.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_use_info.trget_id IS '대상아이디';
COMMENT ON COLUMN tb_bbs_use_info.reg_se_cd IS '등록구분코드';
COMMENT ON COLUMN tb_bbs_use_info.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_use_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_use_info.mdfcn_dt IS '수정일시';

-- 5. tb_bbs_scrap (11 Columns)
ALTER TABLE tb_bbs_scrap 
    RENAME COLUMN ntt_id TO pst_id,
    RENAME COLUMN scrap_nm TO scrap_ttl,
    RENAME COLUMN scrap_dc TO scrap_expln,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_bbs_scrap IS '게시물 스크랩 정보';
COMMENT ON COLUMN tb_bbs_scrap.scrap_id IS '스크랩아이디';
COMMENT ON COLUMN tb_bbs_scrap.pst_id IS '게시물아이디';
COMMENT ON COLUMN tb_bbs_scrap.bbs_id IS '게시판아이디';
COMMENT ON COLUMN tb_bbs_scrap.scrap_ttl IS '스크랩제목';
COMMENT ON COLUMN tb_bbs_scrap.scrap_expln IS '스크랩설명';
COMMENT ON COLUMN tb_bbs_scrap.scrap_url IS '스크랩URL';
COMMENT ON COLUMN tb_bbs_scrap.use_yn IS '사용여부';
COMMENT ON COLUMN tb_bbs_scrap.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_scrap.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_scrap.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_scrap.last_mdfr_id IS '최종수정자아이디';

-- 6. tb_bbs_stats (11 Columns)
ALTER TABLE tb_bbs_stats 
    RENAME COLUMN ntc_cnt TO noti_nocs,
    RENAME COLUMN avg_inq_cnt TO avg_rdcnt,
    RENAME COLUMN max_inq_cnt TO max_rdcnt,
    RENAME COLUMN min_inq_cnt TO min_rdcnt,
    RENAME COLUMN top_ntcr_id TO top_wrter_id,
    RENAME COLUMN creat_dt TO crt_dt;
COMMENT ON TABLE tb_bbs_stats IS '게시판 통계 정보';
COMMENT ON COLUMN tb_bbs_stats.stats_id IS '통계아이디';
COMMENT ON COLUMN tb_bbs_stats.noti_nocs IS '공지건수';
COMMENT ON COLUMN tb_bbs_stats.avg_rdcnt IS '평균조회수';
COMMENT ON COLUMN tb_bbs_stats.max_rdcnt IS '최대조회수';
COMMENT ON COLUMN tb_bbs_stats.min_rdcnt IS '최소조회수';
COMMENT ON COLUMN tb_bbs_stats.top_wrter_id IS '최다게시자아이디';
COMMENT ON COLUMN tb_bbs_stats.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_bbs_stats.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_bbs_stats.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_bbs_stats.last_mdfr_id IS '최종수정자아이디';

COMMIT;
