/*
 * DB Standardization Migration Script
 * Target: tb_user_ntcn -> tb_user_noti_info
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Table Renaming
ALTER TABLE tb_user_ntcn RENAME TO tb_user_noti_info;

-- 2. Register Missing Standard Word (INTVL)
INSERT INTO meta_standard_words (word_name, eng_abbr, word_dc)
SELECT '간격', 'INTVL', 'Interval'
WHERE NOT EXISTS (SELECT 1 FROM meta_standard_words WHERE word_name = '간격');

-- 3. Column Renaming & Type Adjustment (Total 12 Columns)
ALTER TABLE tb_user_noti_info 
    RENAME COLUMN ntcn_no TO noti_no,
    ALTER COLUMN noti_no TYPE VARCHAR(20), -- Domain Alignment (50 -> 20)
    RENAME COLUMN ntcn_dt TO noti_dt,
    RENAME COLUMN rcvr_id TO rcvr_id,
    ALTER COLUMN rcvr_id TYPE VARCHAR(20), -- Domain Alignment (50 -> 20)
    RENAME COLUMN ntcn_ttl_nm TO noti_ttl,
    RENAME COLUMN ntcn_cn TO noti_cn,
    RENAME COLUMN link_url TO link_url,
    RENAME COLUMN read_yn TO read_yn,
    RENAME COLUMN ntcn_ivl_val TO noti_intvl_vl,
    RENAME COLUMN creat_dt TO crt_dt,
    RENAME COLUMN frst_rgtr_id TO frst_rgtr_id,
    ALTER COLUMN frst_rgtr_id TYPE VARCHAR(20), -- Domain Alignment (50 -> 20)
    RENAME COLUMN last_mdfr_id TO last_mdfr_id,
    ALTER COLUMN last_mdfr_id TYPE VARCHAR(20); -- Domain Alignment (50 -> 20)

-- 4. Index & Constraint Standardization
ALTER INDEX idx_tb_user_ntcn_ntcn_no RENAME TO pk_user_noti_info;

-- 5. Metadata (Comments) Application
COMMENT ON TABLE tb_user_noti_info IS '사용자 알림 정보 테이블';
COMMENT ON COLUMN tb_user_noti_info.noti_no IS '알림번호';
COMMENT ON COLUMN tb_user_noti_info.noti_dt IS '알림일시';
COMMENT ON COLUMN tb_user_noti_info.rcvr_id IS '수신자아이디';
COMMENT ON COLUMN tb_user_noti_info.noti_ttl IS '알림제목';
COMMENT ON COLUMN tb_user_noti_info.noti_cn IS '알림내용';
COMMENT ON COLUMN tb_user_noti_info.link_url IS '링크URL';
COMMENT ON COLUMN tb_user_noti_info.read_yn IS '읽음여부';
COMMENT ON COLUMN tb_user_noti_info.noti_intvl_vl IS '알림간격값';
COMMENT ON COLUMN tb_user_noti_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_noti_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_noti_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_noti_info.last_mdfr_id IS '최종수정자아이디';

COMMIT;
