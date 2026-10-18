-- V2_131: 로그아웃 시각(access token 무효화 기준)과 개인정보 접근 기록의 정보주체(2026-10-18 보안·개인정보 보강, 사용자 승인).
-- 컬럼 두 개를 더한다(Expand 전용). 기존 행·기존 컬럼·제약은 바꾸지 않고 기본값도 두지 않는다 — 두 값 모두 '모른다'가 NULL 이다.
--
-- ① tb_user_info.last_lgt_dt(최종로그아웃일시, 기존 표준 용어 LAST_LGT_DT·연월일시분초D)
--    로그아웃은 refresh token 행만 지워, 이미 받은 access token 이 만료(기본 1시간)까지 통과했다. 앱이 로그아웃 때 이 시각을
--    애플리케이션 시계로 남기고, 이 시각(초 내림)보다 먼저 발급된 access token 을 거부한다(JwtTokenProvider, 비밀번호 변경 시각과
--    같은 비교). NULL 은 로그아웃한 적 없음이며 그때는 거부하지 않는다 — 배포 직후 기존 세션은 끊기지 않는다.
--    엔티티는 이 컬럼을 읽기만 하고 쓰기는 원자적 UPDATE 한 문장만 한다(전체 행 저장이 옛 값으로 덮지 않게).
-- ② tb_privacy_log.trpr_id(대상자아이디, 새 용어 TRPR_ID·명V20)
--    개인정보 접근 기록은 조회자(dmnd_user_id, loginId)만 남기고 누구의 정보를 봤는지는 남기지 않았다. 한 사람을 대상으로 한
--    조회(사용자 상세, 수신자가 한 사람인 SMS 수신자 조회)는 그 사람의 내부 키(esntlId)를 남긴다. 목록 조회는 NULL 이다.
--    tb_user_info 에 FK 를 두지 않는다 — 접근 기록은 사용자를 지운 뒤에도 보존 기간 동안 남아야 한다(보존 정책).
--    조회 인덱스는 두지 않는다 — 아직 이 칸으로 찾는 화면·질의가 없고, 로그 표 인덱스 생성은 쓰기를 막는다. 질의가 생기면 그때 둔다.
--
-- 표준: 단어 대상자(TRPR)·아이디(ID)·최종(LAST)·로그아웃(LGT)·일시(DT)는 V2_1 사전에 대표어로 있다. 새 복합 용어는 TRPR_ID 하나다
--   (V2_122·V2_129 형식). 아래 DO 블록이 단어·용어·도메인을 다시 확인하고, 어긋나면 컬럼을 만들기 전에 멈춘다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('대상자','TRPR'), ('아이디','ID'), ('최종','LAST'), ('로그아웃','LGT'), ('일시','DT')
    ) AS words(word_name,eng_abbr)
    LOOP
        IF NOT EXISTS (SELECT 1 FROM meta_standard_words w
                       WHERE w.word_name=expected.word_name AND w.eng_abbr=expected.eng_abbr
                         AND w.rprs_yn='Y') THEN
            RAISE EXCEPTION 'Logout/privacy subject standard word is missing or not representative: %',expected.eng_abbr;
        END IF;
    END LOOP;
END $$;

INSERT INTO meta_standard_terms (term_name, eng_abbr, description, domain_name)
VALUES ('대상자아이디', 'TRPR_ID',
        '어떤 처리나 조회의 대상이 된 사람(정보주체)을 시스템에서 식별하는 아이디', '명V20')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
DECLARE
    expected RECORD;
BEGIN
    FOR expected IN SELECT * FROM (VALUES
        ('TRPR_ID','대상자아이디','명V20'),
        ('LAST_LGT_DT','최종로그아웃일시','연월일시분초D')
    ) AS terms(eng_abbr,term_name,domain_name)
    LOOP
        IF (SELECT count(*) FROM meta_standard_terms t
            WHERE t.eng_abbr=expected.eng_abbr AND t.term_name=expected.term_name
              AND t.domain_name=expected.domain_name AND t.deprecated_yn='N') <> 1 THEN
            RAISE EXCEPTION 'Logout/privacy subject standard term conflict: %',expected.eng_abbr;
        END IF;
    END LOOP;
    IF NOT EXISTS (SELECT 1 FROM meta_standard_domains d
                   WHERE d.domain_name='명V20' AND upper(d.data_type)='VARCHAR' AND d.data_length=20) THEN
        RAISE EXCEPTION 'Standard domain 명V20 is not VARCHAR(20)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM meta_standard_domains d
                   WHERE d.domain_name='연월일시분초D' AND upper(d.data_type)='DATETIME') THEN
        RAISE EXCEPTION 'Standard domain 연월일시분초D is not DATETIME';
    END IF;
END $$;

ALTER TABLE tb_user_info ADD COLUMN last_lgt_dt timestamp without time zone;
ALTER TABLE tb_privacy_log ADD COLUMN trpr_id varchar(20);

COMMENT ON COLUMN tb_user_info.last_lgt_dt IS '최종로그아웃일시 (이 시각 전에 발급된 access token 은 거부한다; NULL 은 로그아웃한 적 없음)';
COMMENT ON COLUMN tb_privacy_log.trpr_id IS '대상자아이디 (조회한 개인정보의 정보주체 esntlId; 한 사람 대상 조회만, 목록은 NULL)';
