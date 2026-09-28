-- ADR-0025 D12/D14. Additive; production application requires a separate release approval.
-- H1: live schema and standard metadata inspected 2026-09-28. All terms/domains already registered.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
CREATE SEQUENCE sq_sys_job START WITH 1 INCREMENT BY 1;

CREATE TABLE tb_sys_job (
    job_sn NUMERIC(22,0) DEFAULT nextval('sq_sys_job') NOT NULL,
    job_mng_no VARCHAR(50) NOT NULL,
    job_se_nm VARCHAR(100) NOT NULL,
    job_cn VARCHAR(4000) NOT NULL,
    prcs_stts_nm VARCHAR(300) DEFAULT 'PENDING' NOT NULL,
    rtry_nmtm NUMERIC(10,0) DEFAULT 0 NOT NULL,
    job_no VARCHAR(20),
    job_prnmnt_dt TIMESTAMP NOT NULL,
    job_cmptn_dt TIMESTAMP,
    frst_rgtr_id VARCHAR(20),
    crt_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_mdfr_id VARCHAR(20),
    mdfcn_dt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_tb_sys_job PRIMARY KEY (job_sn),
    CONSTRAINT uk_tb_sys_job_job_mng_no UNIQUE (job_mng_no),
    CONSTRAINT ck_tb_sys_job_prcs_stts_nm CHECK (prcs_stts_nm IN ('PENDING','RUNNING','RETRY','SUCCEEDED','FAILED')),
    CONSTRAINT ck_tb_sys_job_rtry_nmtm CHECK (rtry_nmtm >= 0),
    CONSTRAINT ck_tb_sys_job_job_no CHECK ((prcs_stts_nm = 'RUNNING') = (job_no IS NOT NULL))
);
ALTER SEQUENCE sq_sys_job OWNED BY tb_sys_job.job_sn;
CREATE INDEX ix_tb_sys_job_prcs_stts_nm_job_prnmnt_dt ON tb_sys_job (prcs_stts_nm, job_prnmnt_dt);
COMMENT ON TABLE tb_sys_job IS '업무와 함께 저장하는 작업 의도 및 재시도 상태';
COMMENT ON COLUMN tb_sys_job.job_sn IS '작업일련번호';
COMMENT ON COLUMN tb_sys_job.job_mng_no IS '작업관리번호: 재시도에 유지하는 UUID';
COMMENT ON COLUMN tb_sys_job.job_se_nm IS '작업구분명';
COMMENT ON COLUMN tb_sys_job.job_cn IS '작업내용: 처리에 필요한 최소 참조';
COMMENT ON COLUMN tb_sys_job.prcs_stts_nm IS '처리상태명';
COMMENT ON COLUMN tb_sys_job.rtry_nmtm IS '재시도횟수';
COMMENT ON COLUMN tb_sys_job.job_no IS '작업번호: 현재 시도의 소유권 식별자';
COMMENT ON COLUMN tb_sys_job.job_prnmnt_dt IS '작업예정일시: 실행 예정 또는 소유권 만료, UTC';
COMMENT ON COLUMN tb_sys_job.job_cmptn_dt IS '작업완료일시: UTC';
COMMENT ON COLUMN tb_sys_job.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_sys_job.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_sys_job.last_mdfr_id IS '최종수정자아이디';
COMMENT ON COLUMN tb_sys_job.mdfcn_dt IS '수정일시';
-- Deferred removals recheck whether any attachment currently references this immutable storage key.
CREATE INDEX ix_tb_file_detail_strg_file_nm ON tb_file_detail (strg_file_nm);
