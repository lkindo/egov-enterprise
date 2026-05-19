/*
 * DB Standardization - Comment Registration Script (Auth & Role Master)
 * Targets: tb_authrt_info, tb_role_info, tb_authrt_group_info, tb_authrt_role_map, tb_user_authrt_map, tb_role_lyr, tb_auth_rfsh_tk, tb_login_policy
 * Date: 2026-05-19
 */

BEGIN;

-- 1. tb_authrt_info (권한 정보)
COMMENT ON TABLE tb_authrt_info IS '권한 정보 테이블';
COMMENT ON COLUMN tb_authrt_info.authrt_cd IS '권한 코드';
COMMENT ON COLUMN tb_authrt_info.authrt_nm IS '권한 명칭';
COMMENT ON COLUMN tb_authrt_info.authrt_expln IS '권한 설명';
COMMENT ON COLUMN tb_authrt_info.authrt_crt_ymd IS '권한 생성 일자';
COMMENT ON COLUMN tb_authrt_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_authrt_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_authrt_info.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_authrt_info.last_mdfr_id IS '최종 수정자 ID';

-- 2. tb_role_info (롤 정보)
COMMENT ON TABLE tb_role_info IS '롤 정보 테이블';
COMMENT ON COLUMN tb_role_info.role_id IS '롤 ID';
COMMENT ON COLUMN tb_role_info.role_nm IS '롤 명칭';
COMMENT ON COLUMN tb_role_info.role_expln IS '롤 설명';
COMMENT ON COLUMN tb_role_info.role_type_cd IS '롤 유형 코드';
COMMENT ON COLUMN tb_role_info.role_patrn IS '롤 패턴';
COMMENT ON COLUMN tb_role_info.role_sort IS '롤 정렬 순서';
COMMENT ON COLUMN tb_role_info.role_crt_ymd IS '롤 생성 일자';
COMMENT ON COLUMN tb_role_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_role_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_role_info.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_role_info.last_mdfr_id IS '최종 수정자 ID';

-- 3. tb_authrt_group_info (권한 그룹 정보)
COMMENT ON TABLE tb_authrt_group_info IS '권한 그룹 정보 테이블';
COMMENT ON COLUMN tb_authrt_group_info.group_id IS '그룹 ID';
COMMENT ON COLUMN tb_authrt_group_info.group_nm IS '그룹 명칭';
COMMENT ON COLUMN tb_authrt_group_info.group_dc IS '그룹 설명';
COMMENT ON COLUMN tb_authrt_group_info.group_crt_ymd IS '그룹 생성 일시';
COMMENT ON COLUMN tb_authrt_group_info.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_authrt_group_info.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_authrt_group_info.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_authrt_group_info.last_mdfr_id IS '최종 수정자 ID';

-- 4. tb_authrt_role_map (권한 롤 매핑)
COMMENT ON TABLE tb_authrt_role_map IS '권한 롤 매핑 테이블';
COMMENT ON COLUMN tb_authrt_role_map.authrt_cd IS '권한 코드';
COMMENT ON COLUMN tb_authrt_role_map.role_cd IS '롤 코드';
COMMENT ON COLUMN tb_authrt_role_map.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_authrt_role_map.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_authrt_role_map.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_authrt_role_map.last_mdfr_id IS '최종 수정자 ID';

-- 5. tb_user_authrt_map (사용자 권한 매핑)
COMMENT ON TABLE tb_user_authrt_map IS '사용자 권한 매핑 테이블';
COMMENT ON COLUMN tb_user_authrt_map.scrty_dcsn_trgt_id IS '보안 결정 대상 ID';
COMMENT ON COLUMN tb_user_authrt_map.authrt_id IS '권한 ID';
COMMENT ON COLUMN tb_user_authrt_map.mbr_type_cd IS '회원 유형 코드';
COMMENT ON COLUMN tb_user_authrt_map.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_user_authrt_map.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_user_authrt_map.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_user_authrt_map.last_mdfr_id IS '최종 수정자 ID';

-- 6. tb_role_lyr (롤 계층 정보)
COMMENT ON TABLE tb_role_lyr IS '롤 계층 정보 테이블';
COMMENT ON COLUMN tb_role_lyr.prnt_role_id IS '부모 롤 ID';
COMMENT ON COLUMN tb_role_lyr.chld_role_id IS '자식 롤 ID';
COMMENT ON COLUMN tb_role_lyr.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_role_lyr.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_role_lyr.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_role_lyr.last_mdfr_id IS '최종 수정자 ID';

-- 7. tb_auth_rfsh_tk (인증 리프레시 토큰)
COMMENT ON TABLE tb_auth_rfsh_tk IS '인증 리프레시 토큰 테이블';
COMMENT ON COLUMN tb_auth_rfsh_tk.user_id IS '사용자 ID';
COMMENT ON COLUMN tb_auth_rfsh_tk.rfsh_tkn IS '리프레시 토큰';
COMMENT ON COLUMN tb_auth_rfsh_tk.exprtn_dt IS '만료 일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_auth_rfsh_tk.last_mdfr_id IS '최종 수정자 ID';

-- 8. tb_login_policy (로그인 정책)
COMMENT ON TABLE tb_login_policy IS '로그인 정책 테이블';
COMMENT ON COLUMN tb_login_policy.user_id IS '사용자 ID';
COMMENT ON COLUMN tb_login_policy.ip_addr IS 'IP 주소';
COMMENT ON COLUMN tb_login_policy.lmt_yn IS '제한 여부';
COMMENT ON COLUMN tb_login_policy.dpcn_prm_yn IS '중복 허용 여부';
COMMENT ON COLUMN tb_login_policy.bgng_tm IS '시작 시간';
COMMENT ON COLUMN tb_login_policy.end_tm IS '종료 시간';
COMMENT ON COLUMN tb_login_policy.otp_use_yn IS 'OTP 사용 여부';
COMMENT ON COLUMN tb_login_policy.crt_dt IS '생성 일시';
COMMENT ON COLUMN tb_login_policy.mdfcn_dt IS '수정 일시';
COMMENT ON COLUMN tb_login_policy.frst_rgtr_id IS '최초 등록자 ID';
COMMENT ON COLUMN tb_login_policy.last_mdfr_id IS '최종 수정자 ID';

COMMIT;
