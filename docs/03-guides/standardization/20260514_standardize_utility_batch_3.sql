/*
 * DB Standardization Migration Script (Utility Domain Batch 3) - Full Comments Included
 * Targets: tb_note_info, tb_note_rcptn, tb_note_trsm
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_note_info
ALTER TABLE tb_note_info 
    RENAME COLUMN note_sj TO note_ttl,
    ALTER COLUMN note_ttl TYPE VARCHAR(300),
    RENAME COLUMN note_cn TO note_expln,
    ALTER COLUMN note_expln TYPE VARCHAR(4000),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_note_info IS '쪽지 정보';
COMMENT ON COLUMN tb_note_info.note_id IS '쪽지아이디';
COMMENT ON COLUMN tb_note_info.note_ttl IS '쪽지제목';
COMMENT ON COLUMN tb_note_info.note_expln IS '쪽지내용';
COMMENT ON COLUMN tb_note_info.atch_file_id IS '첨부파일아이디';
COMMENT ON COLUMN tb_note_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_note_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_note_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_note_info.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_note_rcptn
ALTER TABLE tb_note_rcptn 
    RENAME COLUMN note_recptn_id TO note_rcptn_id,
    RENAME COLUMN note_trnsmit_id TO note_trsm_id,
    RENAME COLUMN rcver_id TO user_id,
    RENAME COLUMN recptn_se TO rcptn_se_cd,
    ALTER COLUMN rcptn_se_cd TYPE VARCHAR(12),
    RENAME COLUMN open_yn TO read_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_note_rcptn IS '쪽지 수신 정보';
COMMENT ON COLUMN tb_note_rcptn.note_rcptn_id IS '쪽지수신아이디';
COMMENT ON COLUMN tb_note_rcptn.note_id IS '쪽지아이디';
COMMENT ON COLUMN tb_note_rcptn.note_trsm_id IS '쪽지발신아이디';
COMMENT ON COLUMN tb_note_rcptn.user_id IS '수신자아이디';
COMMENT ON COLUMN tb_note_rcptn.rcptn_se_cd IS '수신구분코드';
COMMENT ON COLUMN tb_note_rcptn.read_yn IS '읽음여부';
COMMENT ON COLUMN tb_note_rcptn.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_note_rcptn.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_note_rcptn.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_note_rcptn.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_note_trsm
ALTER TABLE tb_note_trsm 
    RENAME COLUMN note_trnsmit_id TO note_trsm_id,
    RENAME COLUMN trnsmiter_id TO user_id,
    RENAME COLUMN del_yn TO use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_note_trsm IS '쪽지 발신 정보';
COMMENT ON COLUMN tb_note_trsm.note_trsm_id IS '쪽지발신아이디';
COMMENT ON COLUMN tb_note_trsm.note_id IS '쪽지아이디';
COMMENT ON COLUMN tb_note_trsm.user_id IS '발신자아이디';
COMMENT ON COLUMN tb_note_trsm.use_yn IS '사용여부(삭제미여부)';
COMMENT ON COLUMN tb_note_trsm.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_note_trsm.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_note_trsm.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_note_trsm.last_mdfr_id IS '최종수정자아이디';

COMMIT;
