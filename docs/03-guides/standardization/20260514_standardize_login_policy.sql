/*
 * DB Standardization Migration Script
 * Target: tb_login_policy
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type/Length Adjustment (Total 11 Columns)
ALTER TABLE tb_login_policy 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN ip_info TO ip_addr,
    RENAME COLUMN dplct_perm_yn TO dpcn_prm_yn,
    RENAME COLUMN lmtt_yn TO lmt_yn,
    RENAME COLUMN strt_tm TO bgng_tm,
    RENAME COLUMN otp_enabled_yn TO otp_use_yn,
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Time Domain Correction (VARCHAR 5 -> CHAR 6) with Data Migration
-- Note: Converting HH:MM to HHMM00
ALTER TABLE tb_login_policy 
    ALTER COLUMN bgng_tm TYPE CHAR(6) USING REPLACE(bgng_tm, ':', '') || '00',
    ALTER COLUMN end_tm TYPE CHAR(6) USING REPLACE(end_tm, ':', '') || '00';

-- 3. Index & Constraint Standardization
ALTER INDEX idx_tb_login_policy_emplyr_id RENAME TO uk_login_policy_user_id;

-- 4. Metadata (Comments) Application (Total 11 Columns)
COMMENT ON TABLE tb_login_policy IS '로그인 정책 테이블';
COMMENT ON COLUMN tb_login_policy.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_login_policy.ip_addr IS 'IP주소';
COMMENT ON COLUMN tb_login_policy.dpcn_prm_yn IS '중복허용여부';
COMMENT ON COLUMN tb_login_policy.lmt_yn IS '제한여부';
COMMENT ON COLUMN tb_login_policy.bgng_tm IS '시작시각';
COMMENT ON COLUMN tb_login_policy.end_tm IS '종료시각';
COMMENT ON COLUMN tb_login_policy.otp_use_yn IS 'OTP사용여부';
COMMENT ON COLUMN tb_login_policy.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_login_policy.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_login_policy.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_login_policy.last_mdfr_id IS '최종수정자아이디';

COMMIT;
