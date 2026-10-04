-- V2_123: 비공식결재(결재) 참조자(2026-10-04 결재 동선 개선 D4).
-- 참조자는 결재하지 않고 문서를 읽기만 하는 사람이다. 기안자가 상신·재상신 때 지정하고, 기안자가 그 차수에 한 명도
--   지정하지 않았으면 지금 차례인 결재자가 더할 수 있다. 결재 표에 상태를 더하지 않고 별도 표 두 개를 둔다 —
--   대기함·대기 건수·결재 차례·결재선 제안·처리함의 질의는 결재선 표(tb_ifml_atrz_dtl)만 읽으므로 참조자가 구조적으로 섞이지 않는다.
-- 결재 표와 V2_122 표는 바꾸지 않는다(Expand 전용). 결재 첨부는 두지 않는다(GAP-DIP-001 ②).
-- 참조는 추가만 한다 — 지정은 차수 단위로 한 행이다(같은 차수에 다시 지정하면 무시한다). 어느 차수에든 행이 있는 사람은 그 문서의
--   모든 상태·모든 차수를 읽는다. 재상신에서 빠져도 이전 차수의 행은 남는다. 이전 차수 참조자를 재상신 때 다시 지정하면 새 차수의
--   행이 생긴다. 차수 단위로 남겨야 '이 차수에 기안자가 지정했는가'·'현재 차수 참조자'(최종 결과 알림 대상, 결재선과 겸할 수 없는
--   사람)를 가를 수 있다 — 문서 단위 한 행이면 다시 지정한 사람이 첫 차수에만 남아 지금 차수의 참조자로 보이지 않는다.
-- 사람은 두 축이다 — 참조자(user_id)와 지정한 사람(chg_user_idntfr)은 esntlId 이고, frst_rgtr_id 는 공통 감사 계약대로
--   지정한 사람의 로그인 ID 다(V2_121 처리 이력과 같은 형태). 지정한 사람이 기안자(tb_ifml_atrz_info.aplcnt_id)면 기안자 지정,
--   아니면 결재자 지정이다 — 구분 컬럼을 따로 두지 않는다(결재자는 기안자 본인일 수 없다).
-- 참조자(user_id)에는 사용자 FK 를 두지 않는다(tb_ifml_atrz_dtl·tb_ifml_atrz_prcs_hstry 와 같다) — 문서 기록의 일부로
--   사용자 삭제 뒤에도 남고, 지정된 적이 있는 사람을 지울 때 막히지 않는다. 지정할 때 사용 중·결재 조회 권한을 서비스가 본다.
-- 임시저장 참조자는 임시저장과 함께 지워진다(ON DELETE CASCADE — 상신 때 임시저장을 한 문장으로 지우므로 필수다).
-- H1: IFML_ATRZ_SN 일련번호N19·ATRZ_CYCL 수N7·USER_ID 명V20·CHG_USER_IDNTFR 명V20·IFML_ATRZ_TMPR_STRG_SN 일련번호N19 를
--   아래 DO 블록이 다시 확인한다. 새 용어는 없다 — 표 이름은 용어 등록 대상이 아니고, 열은 모두 등록된 용어다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 표준 단어는 이미 등록돼 있다(V2_1). 참조자는 '참조(RFRNC, 자료 참조)' 가 아니라 '참조자(RFPR, 서신을 참조로 받는 사람)' 다.
DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('비공식','IFML'), ('결재','ATRZ'), ('참조자','RFPR'), ('임시','TMPR'), ('저장','STRG')
    ) AS words(word_name,eng_abbr)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_words w
                       WHERE w.word_name=expected.word_name AND w.eng_abbr=expected.eng_abbr
                         AND w.rprs_yn='Y') THEN
            RAISE EXCEPTION 'Approval reference standard word is missing or not representative: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('IFML_ATRZ_SN','비공식결재일련번호','일련번호N19'),
        ('IFML_ATRZ_TMPR_STRG_SN','비공식결재임시저장일련번호','일련번호N19'),
        ('ATRZ_CYCL','결재차수','수N7'),
        ('USER_ID','사용자아이디','명V20'),
        ('CHG_USER_IDNTFR','변경사용자식별자','명V20'),
        ('FRST_RGTR_ID','최초등록자아이디','명V20'),
        ('LAST_MDFR_ID','최종수정자아이디','명V20'),
        ('CRT_DT','생성일시','연월일시분초D'),
        ('MDFCN_DT','수정일시','연월일시분초D')
    ) AS terms(eng_abbr,term_name,domain_name)
    LOOP
        IF (SELECT count(*) FROM meta_standard_terms t
            WHERE t.eng_abbr=expected.eng_abbr AND t.term_name=expected.term_name
              AND t.domain_name=expected.domain_name) <> 1 THEN
            RAISE EXCEPTION 'Approval reference standard term conflict: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

CREATE TABLE tb_ifml_atrz_rfpr (
    ifml_atrz_sn bigint NOT NULL,
    user_id varchar(20) NOT NULL,
    atrz_cycl numeric(7, 0) NOT NULL,
    chg_user_idntfr varchar(20) NOT NULL,
    frst_rgtr_id varchar(20) NOT NULL,
    crt_dt timestamp without time zone NOT NULL,
    CONSTRAINT pk_tb_ifml_atrz_rfpr PRIMARY KEY (ifml_atrz_sn, atrz_cycl, user_id),
    CONSTRAINT fk_tb_ifml_atrz_rfpr_tb_ifml_atrz_hstry
        FOREIGN KEY (ifml_atrz_sn, atrz_cycl) REFERENCES tb_ifml_atrz_hstry (ifml_atrz_sn, atrz_cycl)
);
-- '참조된 결재' 목록의 EXISTS(참조자 기준)를 받친다.
CREATE INDEX ix_tb_ifml_atrz_rfpr_user_id ON tb_ifml_atrz_rfpr (user_id, ifml_atrz_sn);

CREATE TABLE tb_ifml_atrz_tmpr_strg_rfpr (
    ifml_atrz_tmpr_strg_sn bigint NOT NULL,
    user_id varchar(20) NOT NULL,
    frst_rgtr_id varchar(20),
    crt_dt timestamp without time zone NOT NULL,
    last_mdfr_id varchar(20),
    mdfcn_dt timestamp without time zone NOT NULL,
    CONSTRAINT pk_tb_ifml_atrz_tmpr_strg_rfpr PRIMARY KEY (ifml_atrz_tmpr_strg_sn, user_id),
    CONSTRAINT fk_tb_ifml_atrz_tmpr_strg_rfpr_tb_ifml_atrz_tmpr_strg
        FOREIGN KEY (ifml_atrz_tmpr_strg_sn) REFERENCES tb_ifml_atrz_tmpr_strg (ifml_atrz_tmpr_strg_sn)
        ON DELETE CASCADE
);

COMMENT ON TABLE tb_ifml_atrz_rfpr IS '비공식결재참조자 (차수 단위로 추가만 한다; 어느 차수에든 지정된 사람은 그 문서의 모든 상태·모든 차수를 읽는다)';
COMMENT ON COLUMN tb_ifml_atrz_rfpr.ifml_atrz_sn IS '비공식결재일련번호';
COMMENT ON COLUMN tb_ifml_atrz_rfpr.user_id IS '사용자아이디 (참조자, esntlId; 사용자 삭제 뒤에도 남는다)';
COMMENT ON COLUMN tb_ifml_atrz_rfpr.atrz_cycl IS '결재차수 (지정된 차수)';
COMMENT ON COLUMN tb_ifml_atrz_rfpr.chg_user_idntfr IS '변경사용자식별자 (지정한 사람 esntlId — 기안자면 기안자 지정, 아니면 결재자 지정)';
COMMENT ON COLUMN tb_ifml_atrz_rfpr.frst_rgtr_id IS '최초등록자ID (지정한 사람, 공통 감사 loginId)';
COMMENT ON COLUMN tb_ifml_atrz_rfpr.crt_dt IS '생성일시 (지정한 시각)';
COMMENT ON TABLE tb_ifml_atrz_tmpr_strg_rfpr IS '비공식결재임시저장참조자 (임시저장한 참조자, 임시저장과 함께 지워진다)';
COMMENT ON COLUMN tb_ifml_atrz_tmpr_strg_rfpr.ifml_atrz_tmpr_strg_sn IS '비공식결재임시저장일련번호';
COMMENT ON COLUMN tb_ifml_atrz_tmpr_strg_rfpr.user_id IS '사용자아이디 (참조자, esntlId; 자격은 다시 열 때 판정한다)';
COMMENT ON COLUMN tb_ifml_atrz_tmpr_strg_rfpr.frst_rgtr_id IS '최초등록자ID (공통 감사 loginId)';
COMMENT ON COLUMN tb_ifml_atrz_tmpr_strg_rfpr.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_ifml_atrz_tmpr_strg_rfpr.last_mdfr_id IS '최종수정자ID (공통 감사 loginId)';
COMMENT ON COLUMN tb_ifml_atrz_tmpr_strg_rfpr.mdfcn_dt IS '수정일시';
