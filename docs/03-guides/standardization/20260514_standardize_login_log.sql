/*
 * DB Standardization Migration Script
 * Target: tb_login_log
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type/Length Adjustment (Total 11 Columns target)
ALTER TABLE tb_login_log 
    RENAME COLUMN login_id TO lgn_id,
    RENAME COLUMN login_ip TO lgn_ip_addr,
    RENAME COLUMN conn_mthd_cd TO cntn_mthd_cd,
    ALTER COLUMN cntn_mthd_cd TYPE VARCHAR(12), -- Hard-Stop (C12)
    RENAME COLUMN error_occrrnc_yn TO err_ocrn_yn,
    RENAME COLUMN error_code TO err_cd,
    ALTER COLUMN err_cd TYPE VARCHAR(12), -- Hard-Stop (C12)
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Drop Redundant Column
ALTER TABLE tb_login_log DROP COLUMN frst_regist_pnttm;

-- 3. Index & Constraint Standardization
ALTER INDEX idx_tb_login_log_log_id RENAME TO pk_login_log;

-- 4. Metadata (Comments) Application
COMMENT ON TABLE tb_login_log IS '로그인 로그 테이블';
COMMENT ON COLUMN tb_login_log.log_id IS '로그아이디';
COMMENT ON COLUMN tb_login_log.lgn_id IS '로그인아이디';
COMMENT ON COLUMN tb_login_log.lgn_ip_addr IS '로그인IP주소';
COMMENT ON COLUMN tb_login_log.cntn_mthd_cd IS '접속방법코드';
COMMENT ON COLUMN tb_login_log.err_ocrn_yn IS '오류발생여부';
COMMENT ON COLUMN tb_login_log.err_cd IS '오류코드';
COMMENT ON COLUMN tb_login_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_login_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_login_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_login_log.last_mdfr_id IS '최종수정자아이디';

COMMIT;
