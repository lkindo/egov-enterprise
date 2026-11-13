-- V2_151 Expand: 약식결재 첨부와 부재 대리결재(DEC-OPS-416 ②, 2026-11-12 사용자 승인).
--
-- [첨부] 결재 문서·차수 이력·임시저장에 첨부 묶음(atch_file_sn, 표준 용어 첨부파일일련번호 = 일련번호N19 bigint)을 둔다.
--   - 문서 머리(tb_ifml_atrz_info)는 지금 차수의 묶음, 차수 이력(tb_ifml_atrz_hstry)은 그 차수에 올린 묶음이다. 제목·본문을
--     머리와 이력 양쪽에 두는 것과 같은 방식이며, 재상신으로 묶음을 바꿔도 앞 차수 결재자가 본 첨부가 남는다.
--   - 임시저장(tb_ifml_atrz_tmpr_strg)은 상신 전 묶음이다. 상신하면 같은 트랜잭션에서 임시저장 행이 지워지고 묶음이 문서로 옮겨 간다.
--   - 다른 첨부 참조 표와 같이 tb_file_master FK 와 atch_file_sn 인덱스를 둔다(첨부 열람 판정이 묶음 번호로 찾는다).
-- [대리결재] 부재 행(tb_user_absn, user_id = esntlId)에 대리결재자(sbt_aprvr_id, esntlId)와 부재 기간
--   (absn_bgng_ymd·absn_end_ymd, 표준 용어 부재시작일자·부재종료일자 = 연월일C8)을 둔다. 대리결재자를 두면 기간은 필수다(CHECK).
--   자기 지정·사용 중 아닌 계정·기간 겹침·순환은 서비스가 저장 전에 거부한다.
--   결재선 행(tb_ifml_atrz_dtl)의 sbt_aprvr_id 는 그 줄을 대신 결정한 사람이다 — 원결재자(user_id)와 실제로 결정한 사람을 따로 남긴다.
-- [표준 용어] 대리결재자아이디(SBT_APRVR_ID, 명V20)를 등록한다. 대리(SBT)·결재자(APRVR)·아이디(ID)는 등록된 대표 표준단어다.
--
-- [무중단·호환성] 모두 NULL 허용 컬럼·FK·인덱스·CHECK 추가다. 기존 행은 채우지 않는다(첨부 없음·대리결재자 없음).
--   구버전 앱은 새 컬럼을 모르므로 NULL 로 남기며 새 CHECK 를 어기지 않는다. 2026-11-12 OCI 읽기 실측: tb_user_absn 0행.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

INSERT INTO meta_standard_terms (term_name, eng_abbr, description, domain_name) VALUES
    ('대리결재자아이디', 'SBT_APRVR_ID', '부재 중인 결재자를 대신해 결재하는 사용자의 식별자(esntlId)', '명V20')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
BEGIN
    IF (SELECT count(*) FROM meta_standard_terms
         WHERE eng_abbr = 'SBT_APRVR_ID' AND term_name = '대리결재자아이디' AND domain_name = '명V20'
           AND deprecated_yn = 'N') <> 1 THEN
        RAISE EXCEPTION 'V2_151: 표준 용어 SBT_APRVR_ID(대리결재자아이디, 명V20) 등록을 확인할 수 없습니다.';
    END IF;
END $$;

ALTER TABLE tb_ifml_atrz_info ADD COLUMN atch_file_sn bigint;
ALTER TABLE tb_ifml_atrz_hstry ADD COLUMN atch_file_sn bigint;
ALTER TABLE tb_ifml_atrz_tmpr_strg ADD COLUMN atch_file_sn bigint;
ALTER TABLE tb_ifml_atrz_dtl ADD COLUMN sbt_aprvr_id varchar(20);
ALTER TABLE tb_user_absn ADD COLUMN sbt_aprvr_id varchar(20);
ALTER TABLE tb_user_absn ADD COLUMN absn_bgng_ymd varchar(8);
ALTER TABLE tb_user_absn ADD COLUMN absn_end_ymd varchar(8);

ALTER TABLE tb_ifml_atrz_info
    ADD CONSTRAINT fk_tb_ifml_atrz_info_tb_file_master FOREIGN KEY (atch_file_sn) REFERENCES tb_file_master (atch_file_sn);
ALTER TABLE tb_ifml_atrz_hstry
    ADD CONSTRAINT fk_tb_ifml_atrz_hstry_tb_file_master FOREIGN KEY (atch_file_sn) REFERENCES tb_file_master (atch_file_sn);
ALTER TABLE tb_ifml_atrz_tmpr_strg
    ADD CONSTRAINT fk_tb_ifml_atrz_tmpr_strg_tb_file_master FOREIGN KEY (atch_file_sn) REFERENCES tb_file_master (atch_file_sn);
ALTER TABLE tb_user_absn
    ADD CONSTRAINT ck_tb_user_absn_sbt_aprvr_period
    CHECK (sbt_aprvr_id IS NULL OR (absn_bgng_ymd IS NOT NULL AND absn_end_ymd IS NOT NULL));

CREATE INDEX ix_tb_ifml_atrz_info_atch_file_sn ON tb_ifml_atrz_info (atch_file_sn);
CREATE INDEX ix_tb_ifml_atrz_hstry_atch_file_sn ON tb_ifml_atrz_hstry (atch_file_sn);
CREATE INDEX ix_tb_ifml_atrz_tmpr_strg_atch_file_sn ON tb_ifml_atrz_tmpr_strg (atch_file_sn);
CREATE INDEX ix_tb_ifml_atrz_dtl_sbt_aprvr_id ON tb_ifml_atrz_dtl (sbt_aprvr_id, ifml_atrz_sn);
CREATE INDEX ix_tb_user_absn_sbt_aprvr_id ON tb_user_absn (sbt_aprvr_id);

COMMENT ON COLUMN tb_ifml_atrz_info.atch_file_sn IS '첨부파일일련번호 (atch_file_sn) — 지금 차수의 첨부 묶음';
COMMENT ON COLUMN tb_ifml_atrz_hstry.atch_file_sn IS '첨부파일일련번호 (atch_file_sn) — 그 차수에 올린 첨부 묶음';
COMMENT ON COLUMN tb_ifml_atrz_tmpr_strg.atch_file_sn IS '첨부파일일련번호 (atch_file_sn) — 상신 전 첨부 묶음';
COMMENT ON COLUMN tb_ifml_atrz_dtl.sbt_aprvr_id IS '대리결재자아이디 (sbt_aprvr_id) — 원결재자 대신 이 줄을 결정한 사용자(esntlId)';
COMMENT ON COLUMN tb_user_absn.sbt_aprvr_id IS '대리결재자아이디 (sbt_aprvr_id) — 부재 기간에 대신 결재하는 사용자(esntlId)';
COMMENT ON COLUMN tb_user_absn.absn_bgng_ymd IS '부재시작일자 (absn_bgng_ymd, yyyyMMdd 한국 날짜)';
COMMENT ON COLUMN tb_user_absn.absn_end_ymd IS '부재종료일자 (absn_end_ymd, yyyyMMdd 한국 날짜)';
