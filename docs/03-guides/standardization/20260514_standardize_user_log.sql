/*
 * DB Standardization Migration Script
 * Target: tb_user_log
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_user_log 
    RENAME COLUMN outpt_cnt TO otpt_cnt,
    RENAME COLUMN creat_dt TO crt_dt,
    RENAME COLUMN occrrnc_de TO ocrn_ymd,
    ALTER COLUMN ocrn_ymd TYPE CHAR(8), -- Date Domain (C8)
    RENAME COLUMN rqester_id TO rqstr_id,
    RENAME COLUMN method_nm TO mthd_nm;

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_user_log_method_nm RENAME TO uk_user_log_ocrn_rqstr_mthd;

-- 3. Metadata (Comments) Application (Total 14 Columns)
COMMENT ON TABLE tb_user_log IS '사용자 로그 테이블';
COMMENT ON COLUMN tb_user_log.crt_cnt IS '생성수';
COMMENT ON COLUMN tb_user_log.del_cnt IS '삭제수';
COMMENT ON COLUMN tb_user_log.err_cnt IS '오류수';
COMMENT ON COLUMN tb_user_log.otpt_cnt IS '출력수';
COMMENT ON COLUMN tb_user_log.inq_cnt IS '조회수';
COMMENT ON COLUMN tb_user_log.mdfcn_cnt IS '수정수';
COMMENT ON COLUMN tb_user_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_log.last_mdfr_id IS '최종수정자아이디';
COMMENT ON COLUMN tb_user_log.ocrn_ymd IS '발생일자';
COMMENT ON COLUMN tb_user_log.rqstr_id IS '요청자아이디';
COMMENT ON COLUMN tb_user_log.mthd_nm IS '메서드명';
COMMENT ON COLUMN tb_user_log.svc_nm IS '서비스명';

COMMIT;
