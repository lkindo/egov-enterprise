-- linter:disable-file
-- eGov Enterprise DB 제약조건 및 인덱스 네이밍 헌법 표준화 마이그레이션

-- 1. 중복 유니크 인덱스 제거 (PK와 100% 중복)
DROP INDEX IF EXISTS pk_tb_leader_schdl_de;
DROP INDEX IF EXISTS pk_tb_survey_respondent;
DROP INDEX IF EXISTS uk_tb_survey_tmplt_srvy_tmplat_id;
DROP INDEX IF EXISTS uk_tb_user_info_chg_dtls_chg_ymd_user_id;

-- 2. 기본키(PK) 제약조건 명칭 정정
ALTER TABLE tb_ognz_info RENAME CONSTRAINT pk_tb_orgnzt_info TO pk_tb_ognz_info;

-- 3. 일반 인덱스(IX) 명칭 정정
ALTER INDEX IF EXISTS ix_tb_survey_respondent_qestnr_id_srvy_tmplat_id RENAME TO ix_tb_srvy_rspdnt_srvy_id_srvy_tmplt_id;
ALTER INDEX IF EXISTS ix_tb_user_info_chg_dtls_user_id RENAME TO ix_tb_user_mdfcn_dtls_user_id;
