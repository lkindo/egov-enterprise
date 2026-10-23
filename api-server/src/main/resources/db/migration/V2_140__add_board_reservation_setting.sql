-- V2_140: 게시판 운영 관리 B1(ADR-0040 결정 3·6). 게시판 마스터에 예약 게시 설정을 둔다(2026-10-23 사용자 일괄 승인, DEC-OPS-379).
--
-- 예약 게시: 게시 시작일이 오늘(Asia/Seoul)보다 뒤인 글은 그날까지 작성자와 조회 대행 권한자에게만 보인다 — 이 집행은 앱이
-- 한다. 이 설정은 게시판이 새 미래 시작일을 받을지만 정한다. 꺼져 있으면(N) 서버가 새 미래 시작일을 거부하고, 켜거나 꺼도
-- 이미 있는 글의 노출은 바뀌지 않는다. 기본값 N 은 지금까지의 동작(미래 시작일을 받을 수는 있었지만 노출을 늦추지 않았다)을
-- 바꾸지 않는 쪽이 아니라, 집행이 생긴 뒤 기존 게시판이 뜻하지 않게 예약 글을 받지 않게 하는 쪽이다(설계서 D6 표).
--
-- 표준: 단어 예약(RSVT)·게시(PSTG)·가능(PSBLTY)·여부(YN)는 V2_1 사전에 대표어로 있다. 새 복합 용어는 RSVT_PSTG_PSBLTY_YN
--   하나다(V2_131·V2_137 형식, 허용값 칸은 그 선례대로 비운다). 아래 DO 블록이 단어·용어·도메인을 다시 확인하고, 어긋나면
--   컬럼을 만들기 전에 멈춘다.
--
-- Expand 전용이다. 기존 행은 DEFAULT 로 N 이 되고(PostgreSQL 11+ 의 빠른 기본값 — 표를 다시 쓰지 않는다), 이 컬럼을 모르는
-- 이전 앱은 INSERT 에서 생략해도 기본값으로 채워진다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('예약','RSVT'), ('게시','PSTG'), ('가능','PSBLTY'), ('여부','YN')
    ) AS words(word_name,eng_abbr)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_words w
                       WHERE w.word_name=expected.word_name AND w.eng_abbr=expected.eng_abbr
                         AND w.rprs_yn='Y') THEN
            RAISE EXCEPTION 'Board reservation standard word is missing or not representative: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

INSERT INTO meta_standard_terms (term_name, eng_abbr, description, domain_name)
VALUES ('예약게시가능여부', 'RSVT_PSTG_PSBLTY_YN',
        '게시판이 오늘보다 뒤의 게시 시작일을 가진 새 글(예약 게시)을 받는지 여부', '여부C1')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
BEGIN
    IF (SELECT count(*) FROM meta_standard_terms t
        WHERE t.eng_abbr='RSVT_PSTG_PSBLTY_YN' AND t.term_name='예약게시가능여부'
          AND t.domain_name='여부C1' AND t.deprecated_yn='N') <> 1 THEN
        RAISE EXCEPTION 'Board reservation standard term conflict: RSVT_PSTG_PSBLTY_YN';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM meta_standard_domains d
                   WHERE d.domain_name='여부C1' AND upper(d.data_type)='VARCHAR' AND d.data_length=1) THEN
        RAISE EXCEPTION 'Standard domain 여부C1 is not VARCHAR(1)';
    END IF;
END $$;

ALTER TABLE tb_bbs_master ADD COLUMN rsvt_pstg_psblty_yn varchar(1) NOT NULL DEFAULT 'N';
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_rsvt_pstg_psblty_yn CHECK (rsvt_pstg_psblty_yn IN ('Y', 'N'));
COMMENT ON COLUMN tb_bbs_master.rsvt_pstg_psblty_yn IS '예약게시가능여부 (Y 면 새 글의 미래 게시 시작일을 받는다. 바꿔도 이미 있는 글의 노출은 바뀌지 않는다)';
