-- V2_141: 게시판 운영 관리 B2(ADR-0040 결정 5·6). 게시글 상단 고정과 게시판의 고정 정책을 둔다(2026-10-23 사용자 일괄 승인,
-- DEC-OPS-379).
--
-- 상단 고정: 운영자가 고른 글을 게시판 목록의 기본·최신순 정렬 맨 앞에 고정 종료일까지 둔다. 고정·해제는 앱이 한 문장 UPDATE 로
-- 바꾸고 게시글 버전(version)과 감사 컬럼은 건드리지 않는다 — 운영자 행위는 게시판 변경 이력(V2_139)이 남긴다.
-- 고정 정책: 게시판이 새 고정을 받는지(기본 N), 고정 중인 글 수의 상한(기본 5), 종료일을 비우고 고정할 때 쓰는 기본 일수(기본 30).
--   정책을 끄거나 상한을 낮춰도 이미 고정된 글은 종료일까지 그대로이고 해제는 언제나 된다 — 이 판정은 앱이 한다.
--
-- 표준: 단어 상단(UPEND)·고정(FIX)·가능(PSBLTY)·상한(UPLMT)·건수(NOCS)·기본(BSC)·일(DAY)·수(CNT)·종료(END)·일자(YMD)·
--   여부(YN)는 V2_1 사전에 대표어로 있다. 기존 용어 UPEND_FIX_YN(상단고정여부, V2_17)을 그대로 쓰고, 새 복합 용어 네 건을
--   더한다(V2_131·V2_137·V2_140 형식, 허용값 칸은 그 선례대로 비운다). 아래 DO 블록이 단어·용어·도메인을 다시 확인하고,
--   어긋나면 컬럼을 만들기 전에 멈춘다.
-- 고정 종료일 CHECK 는 "고정(Y)이면 종료일이 8자리 yyyyMMdd" 를 coalesce 와 정규식으로 적는다 — 고정 중인 글은 종료일이 반드시
--   있고 저장 형식도 맞아야 한다(게시 기간 컬럼과 같은 저장 형식).
--
-- Expand 전용이다. 기존 행은 DEFAULT 로 고정 안 함·N·5·30 이 되고(PostgreSQL 11+ 의 빠른 기본값 — 표를 다시 쓰지 않는다),
-- 이 컬럼들을 모르는 이전 앱은 INSERT 에서 생략해도 기본값으로 채워진다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('상단','UPEND'), ('고정','FIX'), ('가능','PSBLTY'), ('상한','UPLMT'), ('건수','NOCS'), ('기본','BSC'),
        ('일','DAY'), ('수','CNT'), ('종료','END'), ('일자','YMD'), ('여부','YN')
    ) AS words(word_name,eng_abbr)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_words w
                       WHERE w.word_name=expected.word_name AND w.eng_abbr=expected.eng_abbr
                         AND w.rprs_yn='Y') THEN
            RAISE EXCEPTION 'Board pinning standard word is missing or not representative: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

INSERT INTO meta_standard_terms (term_name, eng_abbr, description, domain_name) VALUES
    ('상단고정가능여부', 'UPEND_FIX_PSBLTY_YN',
     '게시판이 게시글을 목록 맨 위에 새로 고정하는 것을 받는지 여부', '여부C1'),
    ('상단고정상한건수', 'UPEND_FIX_UPLMT_NOCS',
     '게시판 하나에 동시에 고정해 둘 수 있는 게시글 수의 상한', '수N10'),
    ('상단고정기본일수', 'UPEND_FIX_BSC_DAY_CNT',
     '고정 종료일을 비우고 고정할 때 오늘부터 고정을 유지하는 기본 일수', '수N7'),
    ('상단고정종료일자', 'UPEND_FIX_END_YMD',
     '게시글을 목록 맨 위에 고정해 두는 마지막 날짜', '연월일C8')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('UPEND_FIX_YN','상단고정여부','여부C1'),
        ('UPEND_FIX_PSBLTY_YN','상단고정가능여부','여부C1'),
        ('UPEND_FIX_UPLMT_NOCS','상단고정상한건수','수N10'),
        ('UPEND_FIX_BSC_DAY_CNT','상단고정기본일수','수N7'),
        ('UPEND_FIX_END_YMD','상단고정종료일자','연월일C8')
    ) AS terms(eng_abbr,term_name,domain_name)
    LOOP
        IF (SELECT count(*) FROM meta_standard_terms t
            WHERE t.eng_abbr=expected.eng_abbr AND t.term_name=expected.term_name
              AND t.domain_name=expected.domain_name AND t.deprecated_yn='N') <> 1 THEN
            RAISE EXCEPTION 'Board pinning standard term conflict: %',expected.eng_abbr;
        END IF;
    END LOOP;
    FOR expected IN SELECT * FROM (VALUES
        ('여부C1','VARCHAR',1), ('수N10','NUMERIC',10), ('수N7','NUMERIC',7), ('연월일C8','VARCHAR',8)
    ) AS domains(domain_name,data_type,data_length)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_domains d
                       WHERE d.domain_name=expected.domain_name AND upper(d.data_type)=expected.data_type
                         AND d.data_length=expected.data_length) THEN
            RAISE EXCEPTION 'Board pinning standard domain shape differs: %',expected.domain_name;
        END IF;
    END LOOP;
END $$;

ALTER TABLE tb_bbs_item ADD COLUMN upend_fix_yn varchar(1) NOT NULL DEFAULT 'N';
ALTER TABLE tb_bbs_item ADD COLUMN upend_fix_end_ymd varchar(8);
ALTER TABLE tb_bbs_item ADD CONSTRAINT ck_tb_bbs_item_upend_fix_yn CHECK (upend_fix_yn IN ('Y', 'N'));
ALTER TABLE tb_bbs_item ADD CONSTRAINT ck_tb_bbs_item_upend_fix_end_ymd
    CHECK (upend_fix_yn = 'N' OR coalesce(upend_fix_end_ymd, '') ~ '^[0-9]{8}$');

ALTER TABLE tb_bbs_master ADD COLUMN upend_fix_psblty_yn varchar(1) NOT NULL DEFAULT 'N';
ALTER TABLE tb_bbs_master ADD COLUMN upend_fix_uplmt_nocs numeric(10) NOT NULL DEFAULT 5;
ALTER TABLE tb_bbs_master ADD COLUMN upend_fix_bsc_day_cnt numeric(7) NOT NULL DEFAULT 30;
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_upend_fix_psblty_yn CHECK (upend_fix_psblty_yn IN ('Y', 'N'));
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_upend_fix_uplmt_nocs CHECK (upend_fix_uplmt_nocs >= 1);
ALTER TABLE tb_bbs_master ADD CONSTRAINT ck_tb_bbs_master_upend_fix_bsc_day_cnt CHECK (upend_fix_bsc_day_cnt >= 1);

COMMENT ON COLUMN tb_bbs_item.upend_fix_yn IS '상단고정여부 (Y 면 고정 종료일까지 게시판 목록 맨 위에 둔다. 고정·해제는 게시글 버전을 올리지 않는다)';
COMMENT ON COLUMN tb_bbs_item.upend_fix_end_ymd IS '상단고정종료일자 (yyyyMMdd, 고정 중일 때만 있다. 이 날까지 고정한다)';
COMMENT ON COLUMN tb_bbs_master.upend_fix_psblty_yn IS '상단고정가능여부 (Y 면 새 고정을 받는다. 꺼도 이미 고정된 글은 종료일까지 그대로다)';
COMMENT ON COLUMN tb_bbs_master.upend_fix_uplmt_nocs IS '상단고정상한건수 (고정 중인 글 수의 상한. 낮춰도 이미 고정된 글은 그대로다)';
COMMENT ON COLUMN tb_bbs_master.upend_fix_bsc_day_cnt IS '상단고정기본일수 (종료일을 비우고 고정하면 오늘부터 이 일수 뒤까지 고정한다)';
