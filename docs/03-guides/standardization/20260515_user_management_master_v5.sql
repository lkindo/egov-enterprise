/*
 * DB Standardization Migration Script (User Management Master v5 - PHYSICAL SYNC)
 * Targets: tb_user_info, tb_user_info_chg_dtls
 * Date: 2026-05-15
 * Status: Validated against Real DB Schema
 */

BEGIN;

-- 1. tb_user_info (사용자 기본 정보 - 실체 기반 교정)
ALTER TABLE tb_user_info ALTER COLUMN user_id TYPE VARCHAR(30);
ALTER TABLE tb_user_info ALTER COLUMN user_nm TYPE VARCHAR(300);
ALTER TABLE tb_user_info RENAME COLUMN password TO pswd;
ALTER TABLE tb_user_info ALTER COLUMN pswd TYPE VARCHAR(300);
ALTER TABLE tb_user_info ALTER COLUMN eml_addr TYPE VARCHAR(300);
ALTER TABLE tb_user_info RENAME COLUMN mbtlnum TO mbl_telno;
ALTER TABLE tb_user_info ALTER COLUMN mbl_telno TYPE VARCHAR(11); 
ALTER TABLE tb_user_info RENAME COLUMN fxnum TO fax_no;
ALTER TABLE tb_user_info ALTER COLUMN fax_no TYPE VARCHAR(20);
ALTER TABLE tb_user_info ALTER COLUMN zip TYPE CHAR(5);
ALTER TABLE tb_user_info RENAME COLUMN status_code TO user_stts_cd;
ALTER TABLE tb_user_info ALTER COLUMN user_stts_cd TYPE VARCHAR(30);
ALTER TABLE tb_user_info RENAME COLUMN sexdstn_code TO gndr_cd;
ALTER TABLE tb_user_info ALTER COLUMN gndr_cd TYPE VARCHAR(30);
ALTER TABLE tb_user_info RENAME COLUMN brthdy TO brth_ymd;
ALTER TABLE tb_user_info ALTER COLUMN brth_ymd TYPE CHAR(8);
ALTER TABLE tb_user_info RENAME COLUMN offm_telno TO office_telno;
ALTER TABLE tb_user_info RENAME COLUMN lock_yn TO lck_yn;
ALTER TABLE tb_user_info ALTER COLUMN lck_yn TYPE CHAR(1);
ALTER TABLE tb_user_info RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_user_info.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_info.user_nm IS '사용자명';
COMMENT ON COLUMN tb_user_info.pswd IS '비밀번호';
COMMENT ON COLUMN tb_user_info.user_stts_cd IS '사용자상태코드';
COMMENT ON COLUMN tb_user_info.gndr_cd IS '성별코드';
COMMENT ON COLUMN tb_user_info.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_user_info.eml_addr IS '이메일주소';
COMMENT ON COLUMN tb_user_info.mbl_telno IS '휴대전화번호';
COMMENT ON COLUMN tb_user_info.office_telno IS '사무실전화번호';
COMMENT ON COLUMN tb_user_info.fax_no IS '팩스번호';
COMMENT ON COLUMN tb_user_info.zip IS '우편번호';
COMMENT ON COLUMN tb_user_info.lck_yn IS '잠금여부';
COMMENT ON COLUMN tb_user_info.crt_dt IS '생성일시';

-- 2. tb_user_info_chg_dtls (사용자 정보 변경 내역)
ALTER TABLE tb_user_info_chg_dtls RENAME COLUMN emplyr_id TO user_id;
ALTER TABLE tb_user_info_chg_dtls ALTER COLUMN user_id TYPE VARCHAR(30);
ALTER TABLE tb_user_info_chg_dtls RENAME COLUMN change_de TO chg_ymd;
ALTER TABLE tb_user_info_chg_dtls ALTER COLUMN chg_ymd TYPE CHAR(8);
ALTER TABLE tb_user_info_chg_dtls RENAME COLUMN change_rsn_cn TO chg_rsn_cn;
ALTER TABLE tb_user_info_chg_dtls ALTER COLUMN chg_rsn_cn TYPE VARCHAR(4000);
ALTER TABLE tb_user_info_chg_dtls RENAME COLUMN change_time TO chg_tm;
ALTER TABLE tb_user_info_chg_dtls ALTER COLUMN chg_tm TYPE CHAR(6);
ALTER TABLE tb_user_info_chg_dtls RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON COLUMN tb_user_info_chg_dtls.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_user_info_chg_dtls.chg_ymd IS '변경일자';
COMMENT ON COLUMN tb_user_info_chg_dtls.chg_rsn_cn IS '변경사유내용';
COMMENT ON COLUMN tb_user_info_chg_dtls.chg_tm IS '변경시각';
COMMENT ON COLUMN tb_user_info_chg_dtls.crt_dt IS '생성일시';

COMMIT;
