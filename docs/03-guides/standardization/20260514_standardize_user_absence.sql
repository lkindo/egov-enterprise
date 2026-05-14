/*
 * DB Standardization Migration Script
 * Target: tb_user_absence
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type Adjustment
ALTER TABLE tb_user_absence 
    RENAME COLUMN user_absnce_yn TO user_absn_yn,
    ALTER COLUMN user_absn_yn TYPE CHAR(1), -- Flag Domain (C1)
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
ALTER INDEX idx_tb_user_absence_emplyr_id RENAME TO uk_user_absn_emplyr_id;

-- 3. Metadata (Comments) Application (Total 6 Columns)
COMMENT ON TABLE tb_user_absence IS '사용자 부재 정보 테이블';
COMMENT ON COLUMN tb_user_absence.user_absn_yn IS '사용자부재여부';
COMMENT ON COLUMN tb_user_absence.emplyr_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_absence.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_absence.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_absence.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_absence.last_mdfr_id IS '최종수정자아이디';

COMMIT;
