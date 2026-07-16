-- V2_3: 역할 계층(RoleHierarchy) DB 소싱 테이블 + 시드
-- Spring Security 의 RoleHierarchy 를 코드가 아닌 DB 에서 로드하기 위한 role→role 상속 엣지.
-- 상위 권한(higher_authrt)은 하위 권한(lower_authrt)의 모든 접근 권한을 상속한다.
-- 예) ROLE_SYSTEM > ROLE_ADMIN 이면, SYSTEM 사용자는 hasRole('ADMIN') 로 보호된 자원에도 접근 가능.
-- 이로써 web 경로 인가(hasAnyRole(ADMIN,SYSTEM))와 method 인가(@PreAuthorize hasRole('ADMIN')) 의
-- SYSTEM 취급 불일치를 애노테이션 수정 없이 해소한다.
CREATE TABLE IF NOT EXISTS tb_role_hierarchy (
    higher_authrt  VARCHAR(30) NOT NULL,
    lower_authrt   VARCHAR(30) NOT NULL,
    frst_rgtr_id   VARCHAR(20),
    last_mdfr_id   VARCHAR(20),
    crt_dt         TIMESTAMP DEFAULT now(),
    mdfcn_dt       TIMESTAMP,
    CONSTRAINT pk_tb_role_hierarchy PRIMARY KEY (higher_authrt, lower_authrt)
);

COMMENT ON TABLE tb_role_hierarchy IS '역할 계층(RoleHierarchy) — 상위 권한이 하위 권한 접근을 상속. 애플리케이션 기동 시 로드.';
COMMENT ON COLUMN tb_role_hierarchy.higher_authrt IS '상위 권한 코드 (ROLE_ 접두 포함)';
COMMENT ON COLUMN tb_role_hierarchy.lower_authrt IS '하위 권한 코드 (ROLE_ 접두 포함)';

INSERT INTO tb_role_hierarchy (higher_authrt, lower_authrt, frst_rgtr_id)
VALUES ('ROLE_SYSTEM', 'ROLE_ADMIN', 'SYSTEM'),
       ('ROLE_ADMIN',  'ROLE_USER',  'SYSTEM')
ON CONFLICT (higher_authrt, lower_authrt) DO NOTHING;
