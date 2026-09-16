-- Existing single-approver documents become the first revision of a workflow.
-- Metadata checked on the isolated PostgreSQL on 2026-09-16: DOC_TTL V256,
-- DOC_CN V4000, ATRZ_CYCL N7, ATRZ_SEQ N10, USER_ID V20, ACRD_YN V1,
-- ATRZ_OPNN_CN V4000, IFML_ATRZ_SN BIGINT. Existing document IDs are retained.
ALTER TABLE tb_ifml_atrz_info
    ADD COLUMN doc_ttl varchar(256),
    ADD COLUMN doc_cn varchar(4000),
    ADD COLUMN atrz_cycl numeric(7, 0) NOT NULL DEFAULT 1;

ALTER TABLE tb_ifml_atrz_info DROP CONSTRAINT ck_tb_ifml_atrz_info_aprv_yn;
ALTER TABLE tb_ifml_atrz_info
    ADD CONSTRAINT ck_tb_ifml_atrz_info_aprv_yn CHECK (aprv_yn IN ('A', 'C', 'R', 'W')),
    ADD CONSTRAINT ck_tb_ifml_atrz_info_atrz_cycl CHECK (atrz_cycl >= 1);

-- Legacy null status has always meant REQUESTED in the domain's fallback.
UPDATE tb_ifml_atrz_info SET aprv_yn = 'A' WHERE aprv_yn IS NULL;

CREATE TABLE tb_ifml_atrz_hstry (
    ifml_atrz_sn bigint NOT NULL,
    atrz_cycl numeric(7, 0) NOT NULL,
    doc_ttl varchar(256),
    doc_cn varchar(4000),
    task_se_cd varchar(12) NOT NULL,
    req_ymd varchar(8),
    aprv_yn varchar(1) NOT NULL,
    atrz_dt timestamp,
    rjct_rsn_cn varchar(4000),
    frst_rgtr_id varchar(20),
    crt_dt timestamp,
    last_mdfr_id varchar(20),
    mdfcn_dt timestamp,
    CONSTRAINT pk_tb_ifml_atrz_hstry PRIMARY KEY (ifml_atrz_sn, atrz_cycl),
    CONSTRAINT fk_tb_ifml_atrz_hstry_tb_ifml_atrz_info
        FOREIGN KEY (ifml_atrz_sn) REFERENCES tb_ifml_atrz_info (ifml_atrz_sn),
    CONSTRAINT ck_tb_ifml_atrz_hstry_atrz_cycl CHECK (atrz_cycl >= 1),
    CONSTRAINT ck_tb_ifml_atrz_hstry_aprv_yn CHECK (aprv_yn IN ('A', 'C', 'R', 'W'))
);

CREATE TABLE tb_ifml_atrz_dtl (
    ifml_atrz_sn bigint NOT NULL,
    atrz_cycl numeric(7, 0) NOT NULL,
    atrz_seq numeric(10, 0) NOT NULL,
    user_id varchar(20) NOT NULL,
    acrd_yn varchar(1) NOT NULL DEFAULT 'N',
    aprv_yn varchar(1) NOT NULL,
    atrz_opnn_cn varchar(4000),
    atrz_dt timestamp,
    frst_rgtr_id varchar(20),
    crt_dt timestamp,
    last_mdfr_id varchar(20),
    mdfcn_dt timestamp,
    CONSTRAINT pk_tb_ifml_atrz_dtl PRIMARY KEY (ifml_atrz_sn, atrz_cycl, atrz_seq, user_id),
    CONSTRAINT fk_tb_ifml_atrz_dtl_tb_ifml_atrz_hstry
        FOREIGN KEY (ifml_atrz_sn, atrz_cycl) REFERENCES tb_ifml_atrz_hstry (ifml_atrz_sn, atrz_cycl),
    CONSTRAINT ck_tb_ifml_atrz_dtl_atrz_seq CHECK (atrz_seq BETWEEN 1 AND 10),
    CONSTRAINT ck_tb_ifml_atrz_dtl_acrd_yn CHECK (acrd_yn IN ('N', 'Y')),
    CONSTRAINT ck_tb_ifml_atrz_dtl_aprv_yn CHECK (aprv_yn IN ('W', 'A', 'C', 'R', 'S'))
);

CREATE INDEX ix_tb_ifml_atrz_dtl_user_state ON tb_ifml_atrz_dtl (user_id, aprv_yn, ifml_atrz_sn);

INSERT INTO tb_ifml_atrz_hstry
    (ifml_atrz_sn, atrz_cycl, doc_ttl, doc_cn, task_se_cd, req_ymd, aprv_yn,
     atrz_dt, rjct_rsn_cn, frst_rgtr_id, crt_dt, last_mdfr_id, mdfcn_dt)
SELECT ifml_atrz_sn, 1, doc_ttl, doc_cn, task_se_cd, req_ymd, COALESCE(aprv_yn, 'A'),
       atrz_dt, rjct_rsn_cn, frst_rgtr_id, crt_dt, last_mdfr_id, mdfcn_dt
FROM tb_ifml_atrz_info;

INSERT INTO tb_ifml_atrz_dtl
    (ifml_atrz_sn, atrz_cycl, atrz_seq, user_id, acrd_yn, aprv_yn, atrz_opnn_cn,
     atrz_dt, frst_rgtr_id, crt_dt, last_mdfr_id, mdfcn_dt)
SELECT ifml_atrz_sn, 1, 1, aprvr_id, 'N', COALESCE(aprv_yn, 'A'), rjct_rsn_cn,
       atrz_dt, frst_rgtr_id, crt_dt, last_mdfr_id, mdfcn_dt
FROM tb_ifml_atrz_info;
