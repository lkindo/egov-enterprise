-- Framework 필수 시드 데이터
-- 시스템 기본 역할 및 공통 코드 데이터 정의

-- ROLE_ADMIN, ROLE_USER 등의 기본 보안 그룹
INSERT INTO tb_role_info (role_code, role_nm, role_dc, role_creat_de) 
VALUES 
('ROLE_ADMIN', '시스템 관리자', '시스템 전반의 모든 권한을 가진 최고 관리자', NOW())
ON CONFLICT (role_code) DO NOTHING;

INSERT INTO tb_role_info (role_code, role_nm, role_dc, role_creat_de) 
VALUES 
('ROLE_USER', '일반 사용자', '비즈니스 서비스 접근 권한을 가진 일반 임직원', NOW())
ON CONFLICT (role_code) DO NOTHING;
