/*
 * DB Standardization Migration Script
 * Target: tb_user_info_chg_dtls
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. Column Renaming & Type/Length Adjustment (Total 24 Columns)
ALTER TABLE tb_user_info_chg_dtls 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN change_de TO chg_ymd,
    ALTER COLUMN chg_ymd TYPE CHAR(8), -- Date Domain (C8)
    RENAME COLUMN orgnzt_id TO ognz_id,
    RENAME COLUMN empl_no TO emp_no,
    RENAME COLUMN sexdstn_code TO gndr_cd,
    ALTER COLUMN gndr_cd TYPE VARCHAR(12), -- Hard-Stop (C12)
    RENAME COLUMN brthdy TO brdt,
    ALTER COLUMN brdt TYPE CHAR(8), -- Date Domain (C8)
    RENAME COLUMN fxnum TO fax_telno,
    RENAME COLUMN house_adres TO home_addr,
    RENAME COLUMN house_end_telno TO home_end_telno,
    RENAME COLUMN area_no TO rgn_telno,
    RENAME COLUMN detail_adres TO daddr,
    ALTER COLUMN zip TYPE CHAR(5), -- Zip Domain (C5)
    RENAME COLUMN offm_telno TO ofc_telno,
    RENAME COLUMN mbtlnum TO mbl_telno,
    RENAME COLUMN house_middle_telno TO home_md_telno,
    RENAME COLUMN pstinst_code TO inst_cd,
    ALTER COLUMN inst_cd TYPE VARCHAR(12), -- Hard-Stop (C12)
    RENAME COLUMN emplyr_sttus_code TO user_stts_cd,
    ALTER COLUMN user_stts_cd TYPE VARCHAR(12), -- Hard-Stop (C12)
    RENAME COLUMN creat_dt TO crt_dt;

-- 2. Index & Constraint Standardization
ALTER INDEX hemplyrinfochangedtls_pk RENAME TO pk_user_info_chg_dtls;
ALTER INDEX idx_tb_user_info_chg_dtls_change_de RENAME TO uk_user_info_chg_dtls;
ALTER INDEX idx_tb_user_info_chg_dtls_emplyr_id RENAME TO ix_user_info_chg_dtls_user_id;

-- 3. Metadata (Comments) Application (Total 24 Columns)
COMMENT ON TABLE tb_user_info_chg_dtls IS '사용자 정보 변경 이력 테이블';
COMMENT ON COLUMN tb_user_info_chg_dtls.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.chg_ymd IS '변경일자';
COMMENT ON COLUMN tb_user_info_chg_dtls.ognz_id IS '조직아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.group_id IS '그룹아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.emp_no IS '사원번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.gndr_cd IS '성별코드';
COMMENT ON COLUMN tb_user_info_chg_dtls.brdt IS '생년월일';
COMMENT ON COLUMN tb_user_info_chg_dtls.fax_telno IS '팩스전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.home_addr IS '자택주소';
COMMENT ON COLUMN tb_user_info_chg_dtls.home_end_telno IS '자택끝전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.rgn_telno IS '지역번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.daddr IS '상세주소';
COMMENT ON COLUMN tb_user_info_chg_dtls.zip IS '우편번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.ofc_telno IS '사무실전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.mbl_telno IS '이동전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.eml_addr IS '이메일주소';
COMMENT ON COLUMN tb_user_info_chg_dtls.home_md_telno IS '자택중간전화번호';
COMMENT ON COLUMN tb_user_info_chg_dtls.inst_cd IS '기관코드';
COMMENT ON COLUMN tb_user_info_chg_dtls.user_stts_cd IS '사용자상태코드';
COMMENT ON COLUMN tb_user_info_chg_dtls.esntl_id IS '고유아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_info_chg_dtls.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_info_chg_dtls.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.last_mdfr_id IS '최종수정자아이디';

COMMIT;
