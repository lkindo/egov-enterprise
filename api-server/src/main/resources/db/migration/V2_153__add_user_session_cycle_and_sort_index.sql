-- V2_153 Expand: 사용자 세션 차수(즉시 토큰 무효화)와 사용자 목록 등록일 정렬 인덱스(DEC-OPS-416 ②, 2026-11-12 사용자 승인).
--
-- [세션 차수] tb_user_info 에 세션차수(ssn_cycl, 표준 용어 세션차수 = 수N7)를 둔다. 비밀번호 변경·초기화, 계정 상태 변경,
--   로그인 실패 잠금, 권한 그룹 회수, 관리자 강제 로그아웃이 이 값을 한 문장(ssn_cycl = ssn_cycl + 1)으로 올린다. 토큰은 발급
--   때의 차수를 담고, 인증 필터는 요청마다 다시 읽는 사용자의 현재 차수와 다르면 그 토큰을 거부한다(401). 리프레시 토큰도 같은
--   차수를 확인한다 — 무효화 뒤 재발급으로 세션이 살아나지 않는다. 차수를 담지 않은 기존 토큰은 0 으로 읽는다(배포 직후 기존
--   세션은 그대로이고, 다음 무효화부터 끊긴다).
--   [이름] 세대(HH)는 표준 단어에서 가구(세대주·세대원)를 뜻해 쓰지 않는다. 같은 일을 하는 결재차수(ATRZ_CYCL)처럼 차수(CYCL,
--   수N7)로 둔다. 표준 도메인에 integer 가 없어 numeric(7,0) 이다. 세션(SSN)·차수(CYCL)는 등록된 표준 단어다.
-- [정렬 인덱스] 사용자 목록의 서버 정렬(GAP-UI-001)은 로그인 ID(uk)·이름(ix_tb_user_info_user_nm)·등록일시(crt_dt)만 받는다.
--   등록일시에는 인덱스가 없어 하나 둔다.
-- [무중단·호환성] 상수 기본값이 있는 NOT NULL 컬럼 추가는 PostgreSQL 11+ 에서 표를 다시 쓰지 않는다. 구버전 앱은 새 컬럼을 읽지
--   않는다(엔티티가 쓰기에서 빼 둔다). 인덱스는 작은 사용자 표에 원자적으로 만든다 — 잠금 획득이 늦으면 전체를 되돌린다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

INSERT INTO meta_standard_terms (term_name, eng_abbr, description, domain_name) VALUES
    ('세션차수', 'SSN_CYCL', '사용자의 로그인 세션을 한꺼번에 끊을 때마다 1씩 늘리는 차수', '수N7')
ON CONFLICT (eng_abbr) DO NOTHING;

DO $$
BEGIN
    IF (SELECT count(*) FROM meta_standard_terms t
         WHERE t.eng_abbr = 'SSN_CYCL' AND t.term_name = '세션차수'
           AND t.domain_name = '수N7' AND t.deprecated_yn = 'N') <> 1 THEN
        RAISE EXCEPTION 'V2_153: 표준 용어 SSN_CYCL (세션차수 / 수N7) 를 확인할 수 없습니다.';
    END IF;
END $$;

ALTER TABLE tb_user_info ADD COLUMN ssn_cycl numeric(7, 0) NOT NULL DEFAULT 0;
ALTER TABLE tb_user_info
    ADD CONSTRAINT ck_tb_user_info_ssn_cycl CHECK (ssn_cycl >= 0);
COMMENT ON COLUMN tb_user_info.ssn_cycl IS '세션차수 (ssn_cycl, 늘면 그 전에 발급된 토큰이 모두 거부된다)';

CREATE INDEX ix_tb_user_info_crt_dt ON tb_user_info (crt_dt);
