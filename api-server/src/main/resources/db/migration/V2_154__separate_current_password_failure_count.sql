-- Expand: 인증된 세션의 현재 비밀번호 불일치 횟수를 별도로 기록한다.
-- 기존 lck_cnt에는 두 실패 경로가 섞여 있어 출처를 복원할 수 없다. 기존 값은 유지하고 새 컬럼은 NULL(0회)부터 시작한다.
-- 기본값 없는 nullable 컬럼 추가로 기존 행을 다시 쓰지 않는다. 새 앱은 Flyway 적용 뒤 시작한다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM meta_standard_terms t
        JOIN meta_standard_domains d ON d.domain_name = t.domain_name
        WHERE t.eng_abbr = 'PSWD_FAIL_NMTM' AND t.term_name = '비밀번호실패횟수'
          AND t.deprecated_yn = 'N' AND d.domain_name = '수N10'
          AND d.data_type = 'NUMERIC' AND d.data_length = 10
    ) THEN
        RAISE EXCEPTION 'V2_154: 표준 용어 PSWD_FAIL_NMTM (비밀번호실패횟수 / 수N10) 를 확인할 수 없습니다.';
    END IF;
END $$;

ALTER TABLE tb_user_info ADD COLUMN pswd_fail_nmtm numeric(10, 0);
COMMENT ON COLUMN tb_user_info.pswd_fail_nmtm IS '비밀번호실패횟수 (인증된 세션의 현재 비밀번호 확인)';
