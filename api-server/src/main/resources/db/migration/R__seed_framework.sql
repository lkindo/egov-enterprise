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
--
-- [W0-02] 비밀번호를 여기서 시드하지 않는다.
--   종전에는 bcrypt('1') 해시가 이 운영 마이그레이션 경로에 동봉되어, 이 저장소로 배포된 모든
--   시스템이 공개된 관리자 비밀번호를 갖고 출발했다(저장소가 public 이므로 해시도 평문도 공개).
--   여기서 넣는 값은 어떤 입력과도 매칭되지 않는 sentinel 이다.
--   · pswd 는 NOT NULL 이라 NULL 을 넣을 수 없다.
--   · '{' 로 시작하므로 egov 레거시 해시 분기를 타지 않고, DelegatingPasswordEncoder 의
--     미매핑 prefix 예외로 귀결되어 401(BadCredentials)이 된다 — 500 이 아니다.
--
--   행 자체는 남긴다. Constants.SYSTEM_ADMIN_ESNTL_ID 와 탈퇴 사용자 콘텐츠 재귀속의 종착지라
--   행을 지우면 FK 로 탈퇴 처리가 깨진다.
--
--   운영 최초 로그인: ADMIN_INITIAL_PASSWORD 환경변수를 주면 기동 시 1회 설정된다
--   (AdminPasswordProvisioner). 미설정이면 이 계정은 로그인 불가 상태로 남는다.
--   dev/local/e2e 의 알려진 비밀번호는 classpath:db/seed-dev 에만 존재하며 운영 locations 에 없다.
INSERT INTO tb_user_info
  (esntl_id, user_id, user_nm, user_type_cd, pswd, user_stts_cd, sbscrb_ymd)
VALUES
  ('USRCNFRM_00000000001', 'webmaster', '최고관리자', 'EMP', '{disabled}NO-LOGIN-PASSWORD-NOT-PROVISIONED', 'P', to_char(CURRENT_DATE, 'YYYYMMDD'))
ON CONFLICT (esntl_id) DO NOTHING;

-- 최고관리자 역할 매핑 (webmaster -> ROLE_ADMIN)
INSERT INTO tb_user_authrt_map
  (scrty_dcsn_trgt_id, authrt_id, mbr_type_cd, crt_dt)
VALUES
  ('USRCNFRM_00000000001', 'ROLE_ADMIN', 'USR', CURRENT_TIMESTAMP)
ON CONFLICT (scrty_dcsn_trgt_id) DO NOTHING;

-- 공통코드 분류 부모 시드 (참조 무결성 완결)
-- 근거: V2_2 가 tb_com_cd 그룹헤더 78건을 전부 clsf_cd='EFC' 로 시드하나,
--       상위 분류 테이블 tb_com_clsf_cd 에 'EFC' 부모행이 없어 코드 3계층
--       (분류 tb_com_clsf_cd → 그룹 tb_com_cd → 상세 tb_com_dtl_cd) 의 최상위가 단절돼 있었다.
--       'EFC' 는 실데이터에서 100% 확정된 분류키이므로 그 부모행만 권위 있게 채운다.
-- 주의: 그룹별 상세코드값(tb_com_dtl_cd, 예: 성별 M/F) 은 repo·라이브 덤프 어디에도
--       권위 출처가 없어(DB 헌법 제9조) 여기서 임의 생성하지 않는다. 별도 표준 export 로 적재 예정.
INSERT INTO tb_com_clsf_cd
  (clsf_cd, use_yn, clsf_cd_nm, clsf_cd_expln, frst_rgtr_id, crt_dt)
VALUES
  ('EFC', 'Y', '전자정부프레임워크 공통코드분류', 'eGovFrame 표준 공통코드 그룹(tb_com_cd)의 최상위 분류', 'SYSTEM', now())
ON CONFLICT (clsf_cd) DO NOTHING;

