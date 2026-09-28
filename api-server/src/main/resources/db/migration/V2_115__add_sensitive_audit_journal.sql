-- D13 A. Additive isolated-candidate migration; no production application is implied.
-- H1 2026-09-28: SYS/ADT/LOG and all column terms/domains verified from live metadata.
-- LOG_SN=NUMERIC(22,0); state names use PRCS_STTS_NM=VARCHAR(300), without inventing a code domain.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

CREATE SEQUENCE sq_sys_adt_log START WITH 1 INCREMENT BY 1;
CREATE TABLE tb_sys_adt_log (
    log_sn NUMERIC(22, 0) DEFAULT nextval('sq_sys_adt_log') NOT NULL,
    dmnd_idntfr VARCHAR(50) NOT NULL,
    prcs_stts_nm VARCHAR(300) NOT NULL,
    job_nm VARCHAR(100) NOT NULL,
    adt_cn VARCHAR(4000) NOT NULL,
    adt_dt TIMESTAMP NOT NULL,
    frst_rgtr_id VARCHAR(20) NOT NULL,
    crt_dt TIMESTAMP NOT NULL,
    CONSTRAINT pk_tb_sys_adt_log PRIMARY KEY (log_sn),
    CONSTRAINT uk_tb_sys_adt_log_request_stage UNIQUE (dmnd_idntfr, prcs_stts_nm),
    CONSTRAINT ck_tb_sys_adt_log_prcs_stts_nm CHECK (prcs_stts_nm IN
      ('ATTEMPTED','PREPARED','SUCCEEDED','DENIED','FAILED','INTERRUPTED','NOT_MODIFIED','COMMITTED'))
);
ALTER SEQUENCE sq_sys_adt_log OWNED BY tb_sys_adt_log.log_sn;
CREATE INDEX ix_tb_sys_adt_log_adt_dt ON tb_sys_adt_log (adt_dt);
COMMENT ON TABLE tb_sys_adt_log IS '시스템 감사 로그: 민감 작업 시도·준비·서버 처리 결과. 수신 완료를 보증하지 않는다';
COMMENT ON COLUMN tb_sys_adt_log.log_sn IS '로그일련번호';
COMMENT ON COLUMN tb_sys_adt_log.dmnd_idntfr IS '요청식별자';
COMMENT ON COLUMN tb_sys_adt_log.prcs_stts_nm IS '처리상태명';
COMMENT ON COLUMN tb_sys_adt_log.job_nm IS '작업명';
COMMENT ON COLUMN tb_sys_adt_log.adt_cn IS '감사내용: 버전 및 허용된 최소 메타데이터, 자격·본문은 기록 금지';
COMMENT ON COLUMN tb_sys_adt_log.adt_dt IS '감사일시';
COMMENT ON COLUMN tb_sys_adt_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_sys_adt_log.crt_dt IS '생성일시';
