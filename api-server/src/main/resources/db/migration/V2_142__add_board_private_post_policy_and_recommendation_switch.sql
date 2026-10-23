-- V2_142: 게시판 운영 관리 B3(ADR-0040 결정 6·7). 게시판 마스터에 비밀글 정책과 추천 받기 설정을 둔다(2026-10-23 사용자 일괄
-- 승인, DEC-OPS-379).
--
-- 비밀글 정책: NONE(작성 화면에 선택이 없고 서버는 요청값을 그대로 저장 — 지금 동작), OPTIONAL(작성 화면에서 글쓴이가 고른다),
--   REQUIRED(서버가 새 글과 고친 글을 늘 비밀글로 저장한다) 세 값이다. 집행은 앱이 한다. 기본값 NONE 은 지금 동작이라, 도움말
--   1:1 문의(비밀)와 지식 허브 질의응답(공개)이 같이 쓰는 Q&A 게시판도 데이터 변경 없이 NONE 으로 남는다. 정책을 바꿔도 이미 있는
--   글의 비밀 여부는 일괄로 바꾸지 않는다.
-- 추천 받기: N 이면 새 추천을 받지 않는다. 이미 받은 추천 수는 그대로이고 각자 자기 추천 취소는 받는다 — 이 판정도 앱이 한다.
--   기본값 Y 는 지금 모든 게시판이 추천을 받는 동작이다.
-- 값 목록은 CHECK 로만 둔다. 공통코드 그룹은 만들지 않는다(DEC-OPS-332, V2_137 stng_cd·V2_139 chg_type_cd 선례).
--
-- 표준: 단어 비공개(PRVT)·게시물(PST)·정책(PLCY)·코드(CD)·추천(RCMDTN)·사용(USE)·여부(YN)는 V2_1 사전에 대표어로 있다(같은
--   뜻의 비대표 영문약어도 있어 대표어 여부까지 본다). 새 복합 용어는 PRVT_PST_PLCY_CD 하나다(V2_131·V2_137·V2_140 형식, 허용값
--   칸은 그 선례대로 비운다). 추천 받기는 기존 용어 RCMDTN_USE_YN(추천사용여부, V2_17)을 그대로 쓴다. 아래 DO 블록이 단어·용어·
--   도메인을 다시 확인하고, 어긋나면 컬럼을 만들기 전에 멈춘다.
--
-- Expand 전용이다. 기존 행은 DEFAULT 로 NONE·Y 가 되고(PostgreSQL 11+ 의 빠른 기본값 — 표를 다시 쓰지 않는다), 이 컬럼들을
-- 모르는 이전 앱은 INSERT 에서 생략해도 기본값으로 채워진다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('비공개','PRVT'), ('게시물','PST'), ('정책','PLCY'), ('코드','CD'), ('추천','RCMDTN'), ('사용','USE'), ('여부','YN')
    ) AS words(word_name,eng_abbr)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_words w
                       WHERE w.word_name=expected.word_name AND w.eng_abbr=expected.eng_abbr
                         AND w.rprs_yn='Y') THEN
            RAISE EXCEPTION 'Board post policy standard word is missing or not representative: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

INSERT INTO meta_standard_terms (term_name, eng_abbr, description, domain_name)
VALUES ('비공개게시물정책코드', 'PRVT_PST_PLCY_CD',
        '게시판이 새 글과 고친 글을 비공개 게시물로 받는 방식(없음·선택·필수)을 구별하는 코드', '코드C12')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('PRVT_PST_PLCY_CD','비공개게시물정책코드','코드C12'),
        ('RCMDTN_USE_YN','추천사용여부','여부C1')
    ) AS terms(eng_abbr,term_name,domain_name)
    LOOP
        IF (SELECT count(*) FROM meta_standard_terms t
            WHERE t.eng_abbr=expected.eng_abbr AND t.term_name=expected.term_name
              AND t.domain_name=expected.domain_name AND t.deprecated_yn='N') <> 1 THEN
            RAISE EXCEPTION 'Board post policy standard term conflict: %',expected.eng_abbr;
        END IF;
    END LOOP;
    FOR expected IN SELECT * FROM (VALUES
        ('코드C12','VARCHAR',12), ('여부C1','VARCHAR',1)
    ) AS domains(domain_name,data_type,data_length)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_domains d
                       WHERE d.domain_name=expected.domain_name AND upper(d.data_type)=expected.data_type
                         AND d.data_length=expected.data_length) THEN
            RAISE EXCEPTION 'Board post policy standard domain shape differs: %',expected.domain_name;
        END IF;
    END LOOP;
END $$;

ALTER TABLE tb_bbs_master ADD COLUMN prvt_pst_plcy_cd varchar(12) NOT NULL DEFAULT 'NONE';
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_prvt_pst_plcy_cd
    CHECK (prvt_pst_plcy_cd IN ('NONE', 'OPTIONAL', 'REQUIRED'));
ALTER TABLE tb_bbs_master ADD COLUMN rcmdtn_use_yn varchar(1) NOT NULL DEFAULT 'Y';
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_rcmdtn_use_yn CHECK (rcmdtn_use_yn IN ('Y', 'N'));

COMMENT ON COLUMN tb_bbs_master.prvt_pst_plcy_cd IS '비공개게시물정책코드 (NONE 은 요청값 그대로, OPTIONAL 은 글쓴이가 고름, REQUIRED 는 새 글과 고친 글을 늘 비밀글로 저장한다. 바꿔도 이미 있는 글의 비밀 여부는 바뀌지 않는다)';
COMMENT ON COLUMN tb_bbs_master.rcmdtn_use_yn IS '추천사용여부 (N 이면 새 추천을 받지 않는다. 이미 받은 추천 수는 그대로이고 자기 추천 취소는 받는다)';
