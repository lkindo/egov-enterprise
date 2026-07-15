-- Framework 필수 시드 데이터 (Repeatable — 멱등)
-- 시스템 기본 역할 정의. 컬럼은 tb_role_info 실 스키마(role_id/role_nm/role_expln/role_crt_ymd)에 정합.

-- ROLE_ADMIN, ROLE_USER 기본 역할
INSERT INTO tb_role_info (role_id, role_nm, role_expln, role_crt_ymd)
VALUES ('ROLE_ADMIN', '시스템 관리자', '시스템 전반의 모든 권한을 가진 최고 관리자', CURRENT_DATE)
ON CONFLICT (role_id) DO NOTHING;

INSERT INTO tb_role_info (role_id, role_nm, role_expln, role_crt_ymd)
VALUES ('ROLE_USER', '일반 사용자', '비즈니스 서비스 접근 권한을 가진 일반 임직원', CURRENT_DATE)
ON CONFLICT (role_id) DO NOTHING;

-- 기본 어드민 사용자 생성 (webmaster / USRCNFRM_00000000001)
-- 비밀번호: 1 ({bcrypt}$2a$10$C3g3CUhTf4f0xG1jJ1LYh.zoesF5XjPevWU2Yg8i24.eoiD4uhYxu)
INSERT INTO tb_user_info 
  (esntl_id, user_id, user_nm, user_type_cd, pswd, user_stts_cd, sbscrb_ymd)
VALUES 
  ('USRCNFRM_00000000001', 'webmaster', '최고관리자', 'EMP', '{bcrypt}$2a$10$C3g3CUhTf4f0xG1jJ1LYh.zoesF5XjPevWU2Yg8i24.eoiD4uhYxu', 'P', to_char(CURRENT_DATE, 'YYYYMMDD'))
ON CONFLICT (esntl_id) DO NOTHING;

-- 최고관리자 역할 매핑 (webmaster -> ROLE_ADMIN)
INSERT INTO tb_user_authrt_map 
  (scrty_dcsn_trgt_id, authrt_id, mbr_type_cd, crt_dt)
VALUES 
  ('USRCNFRM_00000000001', 'ROLE_ADMIN', 'USR', CURRENT_TIMESTAMP)
ON CONFLICT (scrty_dcsn_trgt_id) DO NOTHING;

