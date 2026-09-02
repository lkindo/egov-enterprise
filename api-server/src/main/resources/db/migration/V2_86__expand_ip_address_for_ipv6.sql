-- V2_86: IP 주소 계약을 IPv4 전용 길이에서 IPv6 전체 표기까지 확장
--
-- 2026-09-02 live information_schema 및 데이터 실측:
--   * 아래 5개 컬럼은 모두 varchar(30), nullable
--   * non-null max length는 각각 15/0/0/9/16
--   * meta_standard_terms의 주소V15 사용 29건은 모두 IP_ADDR 계열
--
-- varchar(30) -> varchar(45)는 같은 PostgreSQL base type의 typmod 확장이라 기존 값을
-- 다시 쓰지 않는다. 메타 갱신의 행/테이블 잠금은 업무 테이블을 잠그기 전에 5초로 제한한다.
-- 그 다음 ALTER TABLE에 필요한 다섯 ACCESS EXCLUSIVE 잠금을 NOWAIT로 모두 선점해 하나라도
-- 바쁘면 Flyway transaction 전체를 즉시 rollback한다. 선행 업무 테이블 잠금을 잡은 채
-- 후속 테이블이나 메타 행을 누적 대기하지 않는다.
--
-- Rollback: 30자를 넘는 IPv6가 저장된 뒤 varchar(30)으로 축소하면 손실 위험이 있으므로
-- 역방향 DDL을 수행하지 않는다. 애플리케이션은 30자 값과 하위 호환되며 문제 시 forward-fix한다.

SET LOCAL lock_timeout = '5s';

-- 메타 표준도 물리 스키마와 같은 45자 계약으로 확장한다. 주소V15는 다른 과거 참조를
-- 위해 삭제하지 않고, 영문 약어가 IP_ADDR인 용어만 새 도메인으로 옮긴다.
INSERT INTO meta_standard_domains (domain_group, domain_name, data_type, data_length)
SELECT '명칭', '주소V45', 'VARCHAR', 45
WHERE NOT EXISTS (
    SELECT 1 FROM meta_standard_domains WHERE domain_name = '주소V45'
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM meta_standard_domains
        WHERE domain_name = '주소V45'
          AND domain_group = '명칭'
          AND upper(data_type) = 'VARCHAR'
          AND data_length = 45
    ) THEN
        RAISE EXCEPTION '주소V45 메타 도메인이 VARCHAR(45) 명칭 도메인과 일치하지 않습니다';
    END IF;
END $$;

UPDATE meta_standard_terms
SET domain_name = '주소V45'
WHERE domain_name = '주소V15'
  AND (eng_abbr = 'IP_ADDR' OR eng_abbr LIKE '%!_IP_ADDR' ESCAPE '!');

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM meta_standard_terms
        WHERE eng_abbr = 'IP_ADDR' OR eng_abbr LIKE '%!_IP_ADDR' ESCAPE '!'
    ) OR EXISTS (
        SELECT 1 FROM meta_standard_terms
        WHERE (eng_abbr = 'IP_ADDR' OR eng_abbr LIKE '%!_IP_ADDR' ESCAPE '!')
          AND domain_name <> '주소V45'
    ) OR EXISTS (
        SELECT 1 FROM meta_standard_terms
        WHERE domain_name = '주소V45'
          AND NOT (eng_abbr = 'IP_ADDR' OR eng_abbr LIKE '%!_IP_ADDR' ESCAPE '!')
    ) THEN
        RAISE EXCEPTION 'IP_ADDR 표준 용어와 주소V45 도메인의 결속이 완전하지 않습니다';
    END IF;
END $$;

-- 메타 변경이 모두 끝난 뒤에만 업무 테이블 잠금을 잡는다. 한 테이블이라도 사용 중이면
-- NOWAIT 오류로 위 메타 변경까지 같은 transaction에서 rollback된다.
LOCK TABLE
    tb_login_log,
    tb_login_policy,
    tb_privacy_log,
    tb_sys_log,
    tb_web_log
IN ACCESS EXCLUSIVE MODE NOWAIT;

ALTER TABLE tb_login_log ALTER COLUMN lgn_ip_addr TYPE varchar(45); -- linter:ignore ZDM-2026-0001 기존 varchar(30)을 무손실 확장하고 5개 테이블 잠금을 NOWAIT로 사전 선점함
ALTER TABLE tb_login_policy ALTER COLUMN ip_addr TYPE varchar(45); -- linter:ignore ZDM-2026-0002 기존 varchar(30)을 무손실 확장하고 5개 테이블 잠금을 NOWAIT로 사전 선점함
ALTER TABLE tb_privacy_log ALTER COLUMN dmnd_user_ip_addr TYPE varchar(45); -- linter:ignore ZDM-2026-0003 기존 varchar(30)을 무손실 확장하고 5개 테이블 잠금을 NOWAIT로 사전 선점함
ALTER TABLE tb_sys_log ALTER COLUMN dmnd_user_ip_addr TYPE varchar(45); -- linter:ignore ZDM-2026-0004 기존 varchar(30)을 무손실 확장하고 5개 테이블 잠금을 NOWAIT로 사전 선점함
ALTER TABLE tb_web_log ALTER COLUMN dmnd_user_ip_addr TYPE varchar(45); -- linter:ignore ZDM-2026-0005 기존 varchar(30)을 무손실 확장하고 5개 테이블 잠금을 NOWAIT로 사전 선점함
