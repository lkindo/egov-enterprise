-- Framework 필수 시드 데이터 (Repeatable — 멱등)
-- 시스템 기본 역할 정의. 컬럼은 tb_role_info 실 스키마(role_id/role_nm/role_expln/role_crt_ymd)에 정합.

-- ROLE_ADMIN, ROLE_USER 기본 역할
INSERT INTO tb_role_info (role_id, role_nm, role_expln, role_crt_ymd)
VALUES ('ROLE_ADMIN', '시스템 관리자', '시스템 전반의 모든 권한을 가진 최고 관리자', CURRENT_DATE)
ON CONFLICT (role_id) DO NOTHING;

INSERT INTO tb_role_info (role_id, role_nm, role_expln, role_crt_ymd)
VALUES ('ROLE_USER', '일반 사용자', '비즈니스 서비스 접근 권한을 가진 일반 임직원', CURRENT_DATE)
ON CONFLICT (role_id) DO NOTHING;
