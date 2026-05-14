/*
 * DB Standardization Migration Script (Final Version v3)
 * Target: tb_user_info
 * Date: 2026-05-14
 * Rules: 
 *   - _CD columns forced to VARCHAR(12)
 *   - Constraint/Index naming (pk_, uk_, ix_)
 */

BEGIN;

-- 1. Column Renaming & Type/Length Adjustment
ALTER TABLE tb_user_info 
    ALTER COLUMN user_id TYPE VARCHAR(20),
    RENAME COLUMN user_type TO user_type_cd,
    ALTER COLUMN user_type_cd TYPE VARCHAR(12),
    RENAME COLUMN password TO pswd,
    ALTER COLUMN pswd TYPE VARCHAR(512),
    RENAME COLUMN password_hint TO pswd_hint,
    ALTER COLUMN pswd_hint TYPE VARCHAR(100),
    RENAME COLUMN password_cnsr TO pswd_ans,
    ALTER COLUMN pswd_ans TYPE VARCHAR(100),
    RENAME COLUMN chg_pwd_last_pnttm TO pswd_chg_last_dt,
    RENAME COLUMN chg_pwd_cnt TO pswd_chg_nmtm,
    RENAME COLUMN lock_cnt TO lock_nmtm,
    RENAME COLUMN lock_last_pnttm TO lock_dt,
    RENAME COLUMN user_nm TO user_flnm,
    RENAME COLUMN ihidnum TO rrno,
    ALTER COLUMN rrno TYPE VARCHAR(512),
    RENAME COLUMN sexdstn_code TO gndr_cd,
    ALTER COLUMN gndr_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brdt,
    ALTER COLUMN brdt TYPE CHAR(8),
    RENAME COLUMN mbtlnum TO mbl_telno,
    ALTER COLUMN zip TYPE CHAR(5),
    RENAME COLUMN adres TO addr,
    RENAME COLUMN detail_adres TO daddr,
    RENAME COLUMN area_no TO rgn_telno,
    RENAME COLUMN middle_telno TO mid_telno,
    RENAME COLUMN end_telno TO end_telno,
    RENAME COLUMN fxnum TO fax_no,
    RENAME COLUMN pstinst_code TO inst_cd,
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN empl_no TO emp_no,
    RENAME COLUMN role TO auth_type_cd,
    ALTER COLUMN auth_type_cd TYPE VARCHAR(12),
    ALTER COLUMN bizrno TYPE CHAR(10),
    ALTER COLUMN jurirno TYPE CHAR(13),
    RENAME COLUMN cmpny_nm TO bzenty_nm,
    RENAME COLUMN cxfc TO rprsn_nm,
    RENAME COLUMN induty_code TO tpbiz_cd,
    ALTER COLUMN tpbiz_cd TYPE VARCHAR(12),
    RENAME COLUMN entrprs_se_code TO ent_se_cd,
    ALTER COLUMN ent_se_cd TYPE VARCHAR(12),
    RENAME COLUMN status_code TO stts_cd,
    ALTER COLUMN stts_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Constraint & Index Standardization
-- Rename Primary Key
ALTER INDEX idx_tb_user_info_esntl_id RENAME TO pk_tb_user_info;

-- Rename Unique Key
ALTER INDEX idx_tb_user_info_user_id RENAME TO uk_tb_user_info_user_id;

-- Rename Normal Indexes (Sync with new column names)
ALTER INDEX idx_tb_user_info_eml_addr RENAME TO ix_tb_user_info_eml_addr;
ALTER INDEX idx_tb_user_info_sbscrb_de RENAME TO ix_tb_user_info_sbscrb_de;
ALTER INDEX idx_tb_user_info_user_nm RENAME TO ix_tb_user_info_user_flnm;
ALTER INDEX idx_tb_user_info_user_type RENAME TO ix_tb_user_info_user_type_cd;

-- 3. Metadata (Comments) Application
COMMENT ON TABLE tb_user_info IS '통합 사용자 정보 테이블';
COMMENT ON COLUMN tb_user_info.esntl_id IS '필수아이디';
COMMENT ON COLUMN tb_user_info.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_info.user_type_cd IS '사용자유형코드';
COMMENT ON COLUMN tb_user_info.pswd IS '비밀번호';
COMMENT ON COLUMN tb_user_info.pswd_hint IS '비밀번호힌트';
COMMENT ON COLUMN tb_user_info.pswd_ans IS '비밀번호답변';
COMMENT ON COLUMN tb_user_info.pswd_chg_last_dt IS '암호변경일시';
COMMENT ON COLUMN tb_user_info.pswd_chg_nmtm IS '암호변경횟수';
COMMENT ON COLUMN tb_user_info.lock_yn IS '잠금여부';
COMMENT ON COLUMN tb_user_info.lock_nmtm IS '잠금횟수';
COMMENT ON COLUMN tb_user_info.lock_dt IS '잠금일시';
COMMENT ON COLUMN tb_user_info.user_flnm IS '사용자명';
COMMENT ON COLUMN tb_user_info.rrno IS '주민등록번호';
COMMENT ON COLUMN tb_user_info.gndr_cd IS '성별코드';
COMMENT ON COLUMN tb_user_info.brdt IS '생년월일';
COMMENT ON COLUMN tb_user_info.eml_addr IS '이메일주소';
COMMENT ON COLUMN tb_user_info.mbl_telno IS '휴대폰번호';
COMMENT ON COLUMN tb_user_info.zip IS '우편번호';
COMMENT ON COLUMN tb_user_info.addr IS '주소';
COMMENT ON COLUMN tb_user_info.daddr IS '상세주소';
COMMENT ON COLUMN tb_user_info.rgn_telno IS '지역번호';
COMMENT ON COLUMN tb_user_info.mid_telno IS '중간전화번호';
COMMENT ON COLUMN tb_user_info.end_telno IS '끝전화번호';
COMMENT ON COLUMN tb_user_info.fax_no IS '팩스번호';
COMMENT ON COLUMN tb_user_info.inst_cd IS '소속기관코드';
COMMENT ON COLUMN tb_user_info.emp_no IS '사원번호';
COMMENT ON COLUMN tb_user_info.auth_type_cd IS '권한유형코드';
COMMENT ON COLUMN tb_user_info.bzenty_nm IS '업체명';
COMMENT ON COLUMN tb_user_info.rprsn_nm IS '대표자명';
COMMENT ON COLUMN tb_user_info.tpbiz_cd IS '업종코드';
COMMENT ON COLUMN tb_user_info.ent_se_cd IS '기업구분코드';
COMMENT ON COLUMN tb_user_info.stts_cd IS '상태코드';
COMMENT ON COLUMN tb_user_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_info.mdfcn_dt IS '수정일시';

COMMIT;
