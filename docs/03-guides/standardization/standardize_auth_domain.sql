/*
 * DB Standardization Migration Script (Auth Domain Consolidated) - Full Comments Included
 * Targets: tb_user_info, tb_author_info, tb_author_group_info, tb_user_author_map, tb_author_role_map, tb_role_info, tb_role_hierarchy, tb_login_policy, tb_login_log, tb_auth_rfsh_tk
 * Date: 2026-05-14
 * Author: Antigravity
 */

BEGIN;

-- 1. tb_user_info
ALTER TABLE tb_user_info 
    RENAME COLUMN password TO pswd,
    RENAME COLUMN password_hint TO pswd_hint,
    RENAME COLUMN password_cnsr TO pswd_ans,
    RENAME COLUMN ihidnum TO ihid_no,
    RENAME COLUMN sexdstn_code TO gender_cd,
    ALTER COLUMN gender_cd TYPE VARCHAR(12),
    RENAME COLUMN brthdy TO brth_ymd,
    ALTER COLUMN brth_ymd TYPE CHAR(8),
    RENAME COLUMN eml_addr TO email_addr,
    ALTER COLUMN email_addr TYPE VARCHAR(300),
    RENAME COLUMN mbtlnum TO mbl_telno,
    ALTER COLUMN zip TYPE CHAR(5),
    RENAME COLUMN adres TO addr,
    ALTER COLUMN addr TYPE VARCHAR(300),
    RENAME COLUMN detail_adres TO dtl_addr,
    ALTER COLUMN dtl_addr TYPE VARCHAR(300),
    RENAME COLUMN offm_telno TO office_telno,
    RENAME COLUMN pstinst_code TO inst_cd,
    ALTER COLUMN inst_cd TYPE VARCHAR(12),
    RENAME COLUMN entrprs_se_code TO ent_se_cd,
    ALTER COLUMN ent_se_cd TYPE VARCHAR(12),
    RENAME COLUMN status_code TO stts_cd,
    ALTER COLUMN stts_cd TYPE VARCHAR(12),
    RENAME COLUMN sbscrb_de TO sbscrb_ymd,
    ALTER COLUMN sbscrb_ymd TYPE CHAR(8),
    RENAME COLUMN user_type TO user_type_cd,
    ALTER COLUMN user_type_cd TYPE VARCHAR(12),
    RENAME COLUMN role TO auth_cd,
    ALTER COLUMN auth_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_user_info IS '사용자 정보';
COMMENT ON COLUMN tb_user_info.esntl_id IS '필수아이디(내부식별)';
COMMENT ON COLUMN tb_user_info.user_id IS '사용자아이디(로그인)';
COMMENT ON COLUMN tb_user_info.user_nm IS '사용자명';
COMMENT ON COLUMN tb_user_info.pswd IS '비밀번호';
COMMENT ON COLUMN tb_user_info.pswd_hint IS '비밀번호힌트';
COMMENT ON COLUMN tb_user_info.pswd_ans IS '비밀번호정답';
COMMENT ON COLUMN tb_user_info.ihid_no IS '주민등록번호(암호화)';
COMMENT ON COLUMN tb_user_info.gender_cd IS '성별코드';
COMMENT ON COLUMN tb_user_info.brth_ymd IS '생년월일';
COMMENT ON COLUMN tb_user_info.email_addr IS '이메일주소';
COMMENT ON COLUMN tb_user_info.mbl_telno IS '휴대폰번호';
COMMENT ON COLUMN tb_user_info.zip IS '우편번호';
COMMENT ON COLUMN tb_user_info.addr IS '주소';
COMMENT ON COLUMN tb_user_info.dtl_addr IS '상세주소';
COMMENT ON COLUMN tb_user_info.area_no IS '지역번호';
COMMENT ON COLUMN tb_user_info.middle_telno IS '중간전화번호';
COMMENT ON COLUMN tb_user_info.end_telno IS '끝전화번호';
COMMENT ON COLUMN tb_user_info.office_telno IS '사무실전화번호';
COMMENT ON COLUMN tb_user_info.fxnum IS '팩스번호';
COMMENT ON COLUMN tb_user_info.group_id IS '그룹아이디';
COMMENT ON COLUMN tb_user_info.orgnzt_id IS '조직아이디';
COMMENT ON COLUMN tb_user_info.inst_cd IS '소속기관코드';
COMMENT ON COLUMN tb_user_info.empl_no IS '사원번호';
COMMENT ON COLUMN tb_user_info.ofcps_nm IS '직위명';
COMMENT ON COLUMN tb_user_info.user_type_cd IS '사용자유형코드';
COMMENT ON COLUMN tb_user_info.ent_se_cd IS '기업구분코드';
COMMENT ON COLUMN tb_user_info.bizrno IS '사업자등록번호';
COMMENT ON COLUMN tb_user_info.jurirno IS '법인등록번호';
COMMENT ON COLUMN tb_user_info.cmpny_nm IS '회사명';
COMMENT ON COLUMN tb_user_info.cxfc IS '대표자명';
COMMENT ON COLUMN tb_user_info.induty_code IS '업종코드';
COMMENT ON COLUMN tb_user_info.stts_cd IS '상태코드';
COMMENT ON COLUMN tb_user_info.sbscrb_ymd IS '가입일자';
COMMENT ON COLUMN tb_user_info.auth_cd IS '권한코드';
COMMENT ON COLUMN tb_user_info.chg_pwd_last_pnttm IS '비밀번호변경최종시점';
COMMENT ON COLUMN tb_user_info.chg_pwd_cnt IS '비밀번호변경횟수';
COMMENT ON COLUMN tb_user_info.lock_yn IS '잠금여부';
COMMENT ON COLUMN tb_user_info.lock_cnt IS '잠금횟수';
COMMENT ON COLUMN tb_user_info.lock_last_pnttm IS '잠금최종시점';
COMMENT ON COLUMN tb_user_info.otp_secret IS 'OTP비밀키';
COMMENT ON COLUMN tb_user_info.crtfc_dn_value IS '인증DN값';
COMMENT ON COLUMN tb_user_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_info.last_mdfr_id IS '최종수정자아이디';

-- 2. tb_author_info
ALTER TABLE tb_author_info 
    RENAME COLUMN author_code TO auth_cd,
    ALTER COLUMN auth_cd TYPE VARCHAR(12),
    RENAME COLUMN author_nm TO auth_ttl,
    ALTER COLUMN auth_ttl TYPE VARCHAR(300),
    RENAME COLUMN author_dc TO auth_expln,
    ALTER COLUMN auth_expln TYPE VARCHAR(4000),
    RENAME COLUMN author_creat_de TO auth_crt_ymd,
    ALTER COLUMN auth_crt_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_author_info IS '권한 정보';
COMMENT ON COLUMN tb_author_info.auth_cd IS '권한코드';
COMMENT ON COLUMN tb_author_info.auth_ttl IS '권한명';
COMMENT ON COLUMN tb_author_info.auth_expln IS '권한설명';
COMMENT ON COLUMN tb_author_info.auth_crt_ymd IS '권한생성일자';
COMMENT ON COLUMN tb_author_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_author_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_author_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_author_info.last_mdfr_id IS '최종수정자아이디';

-- 3. tb_author_group_info
ALTER TABLE tb_author_group_info 
    RENAME COLUMN group_nm TO group_ttl,
    ALTER COLUMN group_ttl TYPE VARCHAR(300),
    RENAME COLUMN group_dc TO group_expln,
    ALTER COLUMN group_expln TYPE VARCHAR(4000),
    RENAME COLUMN group_creat_de TO group_crt_ymd,
    ALTER COLUMN group_crt_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_author_group_info IS '권한 그룹 정보';
COMMENT ON COLUMN tb_author_group_info.group_id IS '그룹아이디';
COMMENT ON COLUMN tb_author_group_info.group_ttl IS '그룹명';
COMMENT ON COLUMN tb_author_group_info.group_expln IS '그룹설명';
COMMENT ON COLUMN tb_author_group_info.group_crt_ymd IS '그룹생성일자';
COMMENT ON COLUMN tb_author_group_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_author_group_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_author_group_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_author_group_info.last_mdfr_id IS '최종수정자아이디';

-- 4. tb_user_author_map
ALTER TABLE tb_user_author_map 
    RENAME COLUMN author_code TO auth_cd,
    ALTER COLUMN auth_cd TYPE VARCHAR(12),
    RENAME COLUMN mber_ty_code TO user_type_cd,
    ALTER COLUMN user_type_cd TYPE VARCHAR(12),
    RENAME COLUMN scrty_dtrmn_trget_id TO esntl_id,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_user_author_map IS '사용자 권한 매핑';
COMMENT ON COLUMN tb_user_author_map.esntl_id IS '필수아이디';
COMMENT ON COLUMN tb_user_author_map.auth_cd IS '권한코드';
COMMENT ON COLUMN tb_user_author_map.user_type_cd IS '사용자유형코드';
COMMENT ON COLUMN tb_user_author_map.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_user_author_map.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_user_author_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_user_author_map.last_mdfr_id IS '최종수정자아이디';

-- 5. tb_author_role_map
ALTER TABLE tb_author_role_map 
    RENAME COLUMN author_code TO auth_cd,
    ALTER COLUMN auth_cd TYPE VARCHAR(12),
    RENAME COLUMN role_code TO role_cd,
    ALTER COLUMN role_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_author_role_map IS '권한 롤 매핑';
COMMENT ON COLUMN tb_author_role_map.auth_cd IS '권한코드';
COMMENT ON COLUMN tb_author_role_map.role_cd IS '롤코드';
COMMENT ON COLUMN tb_author_role_map.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_author_role_map.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_author_role_map.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_author_role_map.last_mdfr_id IS '최종수정자아이디';

-- 6. tb_role_info
ALTER TABLE tb_role_info 
    RENAME COLUMN role_code TO role_cd,
    ALTER COLUMN role_cd TYPE VARCHAR(12),
    RENAME COLUMN role_nm TO role_ttl,
    ALTER COLUMN role_ttl TYPE VARCHAR(300),
    RENAME COLUMN role_dc TO role_expln,
    ALTER COLUMN role_expln TYPE VARCHAR(4000),
    RENAME COLUMN role_ty TO role_type_cd,
    ALTER COLUMN role_type_cd TYPE VARCHAR(12),
    RENAME COLUMN role_creat_de TO role_crt_ymd,
    ALTER COLUMN role_crt_ymd TYPE CHAR(8),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_role_info IS '롤 정보';
COMMENT ON COLUMN tb_role_info.role_cd IS '롤코드';
COMMENT ON COLUMN tb_role_info.role_ttl IS '롤제목';
COMMENT ON COLUMN tb_role_info.role_expln IS '롤설명';
COMMENT ON COLUMN tb_role_info.role_type_cd IS '롤유형코드';
COMMENT ON COLUMN tb_role_info.role_pttrn IS '롤패턴';
COMMENT ON COLUMN tb_role_info.role_sort IS '롤순서';
COMMENT ON COLUMN tb_role_info.role_crt_ymd IS '롤생성일자';
COMMENT ON COLUMN tb_role_info.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_role_info.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_role_info.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_role_info.last_mdfr_id IS '최종수정자아이디';

-- 7. tb_role_hierarchy
ALTER TABLE tb_role_hierarchy 
    RENAME COLUMN parnts_role TO parent_role_cd,
    RENAME COLUMN chldrn_role TO child_role_cd,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_role_hierarchy IS '롤 계층 구조';
COMMENT ON COLUMN tb_role_hierarchy.parent_role_cd IS '부모롤코드';
COMMENT ON COLUMN tb_role_hierarchy.child_role_cd IS '자식롤코드';
COMMENT ON COLUMN tb_role_hierarchy.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_role_hierarchy.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_role_hierarchy.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_role_hierarchy.last_mdfr_id IS '최종수정자아이디';

-- 8. tb_login_policy
ALTER TABLE tb_login_policy 
    RENAME COLUMN emplyr_id TO user_id,
    RENAME COLUMN strt_tm TO bgng_tm,
    ALTER COLUMN bgng_tm TYPE CHAR(6),
    RENAME COLUMN end_tm TO end_tm,
    ALTER COLUMN end_tm TYPE CHAR(6),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_login_policy IS '로그인 정책';
COMMENT ON COLUMN tb_login_policy.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_login_policy.ip_info IS 'IP정보';
COMMENT ON COLUMN tb_login_policy.bgng_tm IS '시작시각';
COMMENT ON COLUMN tb_login_policy.end_tm IS '종료시각';
COMMENT ON COLUMN tb_login_policy.otp_enabled_yn IS 'OTP활성여부';
COMMENT ON COLUMN tb_login_policy.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_login_policy.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_login_policy.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_login_policy.last_mdfr_id IS '최종수정자아이디';

-- 9. tb_login_log
ALTER TABLE tb_login_log 
    RENAME COLUMN log_id TO login_log_id,
    RENAME COLUMN login_id TO user_id,
    RENAME COLUMN login_ip TO user_ip,
    RENAME COLUMN error_occrrnc_yn TO err_yn,
    RENAME COLUMN error_code TO err_cd,
    ALTER COLUMN err_cd TYPE VARCHAR(12),
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_login_log IS '로그인 로그';
COMMENT ON COLUMN tb_login_log.login_log_id IS '로그인로그아이디';
COMMENT ON COLUMN tb_login_log.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_login_log.user_ip IS '사용자IP';
COMMENT ON COLUMN tb_login_log.conn_mthd_cd IS '접속방법코드';
COMMENT ON COLUMN tb_login_log.err_yn IS '에러여부';
COMMENT ON COLUMN tb_login_log.err_cd IS '에러코드';
COMMENT ON COLUMN tb_login_log.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_login_log.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_login_log.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_login_log.last_mdfr_id IS '최종수정자아이디';

-- 10. tb_auth_rfsh_tk
ALTER TABLE tb_auth_rfsh_tk 
    RENAME COLUMN user_id TO user_id,
    RENAME COLUMN tk_val TO rissu_tkn_vl,
    ALTER COLUMN rissu_tkn_vl TYPE VARCHAR(500),
    RENAME COLUMN expr_dt TO expr_dt,
    RENAME COLUMN creat_dt TO crt_dt;

COMMENT ON TABLE tb_auth_rfsh_tk IS '인증 갱신 토큰';
COMMENT ON COLUMN tb_auth_rfsh_tk.user_id IS '사용자아이디';
COMMENT ON COLUMN tb_auth_rfsh_tk.rissu_tkn_vl IS '재발급토큰값';
COMMENT ON COLUMN tb_auth_rfsh_tk.expr_dt IS '만료일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.crt_dt IS '생성일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.mdfcn_dt IS '수정일시';
COMMENT ON COLUMN tb_auth_rfsh_tk.frst_rgtr_id IS '최초등록자아이디';
COMMENT ON COLUMN tb_auth_rfsh_tk.last_mdfr_id IS '최종수정자아이디';

COMMIT;
