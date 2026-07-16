-- =====================================================================
-- V2_18: 길이 분열 스윕 + P2/P5 후미 마감 (사용자 승인 2026-07-17)
-- =====================================================================
-- 근거: 2026-07-17 3개 컬럼군 병렬 측정(전 컬럼 데이터 max 실측 + V2_17 SSOT 도메인 체인 조회).
--   전 항목 target ≥ 데이터 max — 무손실 보장. KEEP 10건(정합 완료)·DEFER 2건(biz_cd 재모델링, etc_cd 원천 스펙)은 태스크 기록 참조.
-- 동반 코드(동일 릴리스): 엔티티 @Column length ~25파일 동기화 + EventInfoService ymd 정규화 +
--   CnsltManage.mngYmd 포맷 버그 정정 + MemoReport String→LocalDateTime(ISO 'T' 자가모순 버그 해소) 등.
-- 멱등: ALTER TYPE 동일 타입 재실행 무해 / DELETE·DROP·승격은 조건부.

-- ---------------------------------------------------------------
-- 1) [P2 키 규약] tb_auth_rfsh_tk 레거시 loginId 키 행 정리 (실측 1행 — 발급/재발급/로그아웃
--    전 경로 esntlId 키잉 확인, 생성 경로 없음. 만료성 토큰이라 삭제 시 해당 세션 재로그인뿐)
-- ---------------------------------------------------------------
DELETE FROM tb_auth_rfsh_tk t
 WHERE NOT EXISTS (SELECT 1 FROM tb_user_info u WHERE u.esntl_id = t.user_id)
   AND EXISTS (SELECT 1 FROM tb_user_info u WHERE u.user_id = t.user_id);

-- ---------------------------------------------------------------
-- 2) uk_ 명명 유니크 "인덱스" 제약 승격 + 표준 개명 (감사 MEDIUM — 유형 오표기 해소.
--    나머지 4건은 V2_16 테이블 DROP 과 함께 소멸, 본 건이 최후 1건)
-- ---------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('uk_tb_onln_mnl_info_online_mnl_id', 'uk_tb_onln_mnl_info_onln_mnl_id'))
     AND EXISTS (SELECT 1 FROM pg_class WHERE relkind = 'i' AND relname = 'uk_tb_onln_mnl_info_online_mnl_id') THEN
    ALTER TABLE tb_onln_mnl_info ADD CONSTRAINT uk_tb_onln_mnl_info_online_mnl_id
      UNIQUE USING INDEX uk_tb_onln_mnl_info_online_mnl_id;
  END IF;
  -- 명칭-실컬럼 드리프트 정정: online_mnl_id(비표준 단어) → onln_mnl_id(실컬럼)
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_tb_onln_mnl_info_online_mnl_id') THEN
    ALTER TABLE tb_onln_mnl_info RENAME CONSTRAINT uk_tb_onln_mnl_info_online_mnl_id TO uk_tb_onln_mnl_info_onln_mnl_id;
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 3) meta_standard_terms.eng_name DROP (정보량 0 — 13,173행 전량 eng_abbr 동일 실측 +
--    행안부 원본에도 영문 전체명 컬럼 부재 확인. 사용자 승인 2026-07-17)
-- ---------------------------------------------------------------
ALTER TABLE meta_standard_terms DROP COLUMN IF EXISTS eng_name; -- linter:ignore (정보량 0 실측·원본 부재·사용자 승인 — eng_abbr 가 곧 동일값 백업)

-- ---------------------------------------------------------------
-- 4) varchar(30) 이상치 + *_cd 길이 정렬 (SSOT/플릿 기준, 전건 무손실 실측)
-- ---------------------------------------------------------------
ALTER TABLE tb_event_info ALTER COLUMN frst_rgtr_id TYPE varchar(20); -- linter:ignore (107행 소형·실측 max 9, BaseEntity(20)·플릿 86컬럼 정렬)
ALTER TABLE tb_event_info ALTER COLUMN last_mdfr_id TYPE varchar(20); -- linter:ignore (실측 max 9, BaseEntity(20) 정렬)
ALTER TABLE tb_event_info ALTER COLUMN evnt_id TYPE varchar(20); -- linter:ignore (PK, 실측 max 17=EVT_+13hex 고정, 참조 FK 0건)
ALTER TABLE tb_event_info ALTER COLUMN evnt_type_cd TYPE varchar(12); -- linter:ignore (전량 NULL, 플릿 _cd 표준 12 정렬)
ALTER TABLE tb_user_info ALTER COLUMN gndr_cd TYPE varchar(12); -- linter:ignore (non-null 0건, 코드C12·자매 _cd 정렬)
ALTER TABLE tb_user_info ALTER COLUMN induty_cd TYPE varchar(12); -- linter:ignore (non-null 0건, 플릿 _cd 표준 12)
ALTER TABLE tb_user_info ALTER COLUMN pstinst_cd TYPE varchar(12); -- linter:ignore (non-null 0건; UserDto @Size 20→12 동일 릴리스 동기화)
ALTER TABLE tb_indv_pg ALTER COLUMN user_id TYPE varchar(20); -- linter:ignore (0행, SSOT 명V20·플릿 user_id 20 만장일치)
ALTER TABLE tb_inst_cd ALTER COLUMN inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7 — 행안부 기관코드 7자리)
ALTER TABLE tb_inst_cd ALTER COLUMN upr_inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7)
ALTER TABLE tb_inst_cd ALTER COLUMN top_inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7)
ALTER TABLE tb_inst_cd ALTER COLUMN reprs_inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7)
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7, 원장 정합)
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN upr_inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7)
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN top_inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7)
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN reprs_inst_cd TYPE varchar(7); -- linter:ignore (0행, SSOT 코드C7)

-- 4-1) authrt_cd / role_id 참조 그룹 — 확폭 → 참조측 → PK 순 원자 정합
--      (menu_crt_dtl 현행 12는 피참조 PK 실데이터 17자를 수용 불가한 잠재 파손 상태 — 확폭이 결함 해소)
ALTER TABLE tb_menu_crt_dtl ALTER COLUMN authrt_cd TYPE varchar(20); -- linter:ignore (확폭 12→20, 131행, 피참조 PK(20) 정합 — 실데이터 17자 수용불가 결함 해소)
ALTER TABLE tb_authrt_role_map ALTER COLUMN authrt_cd TYPE varchar(20); -- linter:ignore (3행·실측 max 11, 피참조 PK(20) 정합)
ALTER TABLE tb_authrt_info ALTER COLUMN authrt_cd TYPE varchar(20); -- linter:ignore (PK 172행·실측 max 17=ROLE_E2E_ 재생성 패턴 수용)
ALTER TABLE tb_authrt_role_map ALTER COLUMN role_cd TYPE varchar(20); -- linter:ignore (3행·실측 max 11, tb_role_info.role_id(20) 의미 결속)
ALTER TABLE tb_role_prgrm_map ALTER COLUMN role_id TYPE varchar(20); -- linter:ignore (52행·실측 max 11, 피참조 PK(20) 정합)
ALTER TABLE tb_role_info ALTER COLUMN role_id TYPE varchar(20); -- linter:ignore (PK 258행·실측 max 16=URL_E2E_ 재생성 패턴 수용)

-- ---------------------------------------------------------------
-- 5) 연월일(ymd) 도메인 정렬 — SSOT 연월일C8(varchar 8), 하이픈 유입분 USING 정규화
-- ---------------------------------------------------------------
ALTER TABLE tb_bbs_item ALTER COLUMN pst_bgng_ymd TYPE varchar(8) USING replace(pst_bgng_ymd, '-', ''); -- linter:ignore (전량 NULL 실측 — 무손실, SSOT 연월일C8)
ALTER TABLE tb_bbs_item ALTER COLUMN pst_end_ymd TYPE varchar(8) USING replace(pst_end_ymd, '-', ''); -- linter:ignore (전량 NULL 실측 — 무손실, SSOT 연월일C8)
ALTER TABLE tb_dscsn_list ALTER COLUMN mng_ymd TYPE varchar(8) USING replace(mng_ymd, '-', ''); -- linter:ignore (0행 — CnsltManage.updateAnswer 포맷 정정 동일 릴리스)
ALTER TABLE tb_dscsn_list ALTER COLUMN wrt_ymd TYPE varchar(8) USING replace(wrt_ymd, '-', ''); -- linter:ignore (0행, SSOT 연월일C8)
ALTER TABLE tb_event_info ALTER COLUMN evnt_aprv_ymd TYPE varchar(8) USING replace(evnt_aprv_ymd, '-', ''); -- linter:ignore (전량 NULL, SSOT 연월일C8)
ALTER TABLE tb_event_info ALTER COLUMN evnt_bgng_ymd TYPE varchar(8) USING replace(evnt_bgng_ymd, '-', ''); -- linter:ignore (83행: 8자리 81 + YYYY-MM-DD 2 — replace 후 전량 8자 무손실)
ALTER TABLE tb_event_info ALTER COLUMN evnt_end_ymd TYPE varchar(8) USING replace(evnt_end_ymd, '-', ''); -- linter:ignore (동일 — EventInfoService 정규화 동일 릴리스)

-- KEEP 2건 이탈 승인 문서화 (타입 변경 없음)
COMMENT ON COLUMN tb_role_info.role_crt_ymd IS '역할생성일자 (role_crt_ymd) — 표준도메인(연월일C8) 이탈 승인: 물리 date=엔티티 LocalDate 정합 (2026-07-17 실측)';
COMMENT ON COLUMN tb_authrt_group_info.group_crt_ymd IS '그룹생성일자 (group_crt_ymd) — 실체는 생성일시(timestamp). 이탈 승인: 시각부 155/155 실소비라 무손실 원칙상 축소 불가. 향후 group_crt_dt 리네임 후보 (2026-07-17 실측)';

-- ---------------------------------------------------------------
-- 6) _dt 문자형 → timestamp (0행 무손실 — MemoReport ISO 포맷 자가모순 버그도 코드에서 동시 해소)
-- ---------------------------------------------------------------
-- [멱등 가드] 재실행 시 USING 의 정규식(~)·'' 리터럴이 이미 변환된 timestamp 와 충돌하므로 타입 검사 후 실행
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tb_memo_rpt_info' AND column_name = 'drctn_mttr_reg_dt') LIKE 'character%' THEN
    ALTER TABLE tb_memo_rpt_info ALTER COLUMN drctn_mttr_reg_dt TYPE timestamp USING (CASE WHEN drctn_mttr_reg_dt ~ '^[0-9]{14}$' THEN to_timestamp(drctn_mttr_reg_dt, 'YYYYMMDDHH24MISS')::timestamp ELSE NULLIF(drctn_mttr_reg_dt, '')::timestamp END); -- linter:ignore (0행 실측 — 무손실, SSOT 일시 도메인)
  END IF;
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tb_memo_rpt_info' AND column_name = 'rptr_inq_dt') LIKE 'character%' THEN
    ALTER TABLE tb_memo_rpt_info ALTER COLUMN rptr_inq_dt TYPE timestamp USING (CASE WHEN rptr_inq_dt ~ '^[0-9]{14}$' THEN to_timestamp(rptr_inq_dt, 'YYYYMMDDHH24MISS')::timestamp ELSE NULLIF(rptr_inq_dt, '')::timestamp END); -- linter:ignore (0행 실측 — 무손실)
  END IF;
END $$;

-- ---------------------------------------------------------------
-- 7) 기타 동일 컬럼명 분열 수렴 (SSOT 도메인 기준: 팩스번호V20·전화번호V11·이메일주소V320·
--    암호화번호V256·명V100·URLV2000·내용V4000·순서N10)
-- ---------------------------------------------------------------
ALTER TABLE tb_adbk_info ALTER COLUMN fax_no TYPE varchar(20); -- linter:ignore (non-null 0건, 팩스번호V20 확폭)
ALTER TABLE tb_inst_cd ALTER COLUMN fax_no TYPE varchar(20); -- linter:ignore (0행, 팩스번호V20 확폭)
ALTER TABLE tb_user_info ALTER COLUMN fax_no TYPE varchar(20); -- linter:ignore (non-null 0건, 무손실 축소·팩스번호V20)
ALTER TABLE tb_inst_cd ALTER COLUMN telno TYPE varchar(11); -- linter:ignore (0행, 전화번호V11 — 숫자만 저장 규약)
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN telno TYPE varchar(11); -- linter:ignore (0행, 원장과 동시 정렬)
ALTER TABLE tb_user_info ALTER COLUMN mbl_telno TYPE varchar(11); -- linter:ignore (non-null 0건, 전화번호V11 — 숫자만 저장 규약)
ALTER TABLE tb_adbk_info ALTER COLUMN eml_addr TYPE varchar(320); -- linter:ignore (실측 max 36, 이메일주소V320 확폭)
ALTER TABLE tb_dscsn_list ALTER COLUMN eml_addr TYPE varchar(320); -- linter:ignore (0행, 확폭)
ALTER TABLE tb_extrl_hr_info ALTER COLUMN eml_addr TYPE varchar(320); -- linter:ignore (0행, 확폭)
ALTER TABLE tb_user_info ALTER COLUMN eml_addr TYPE varchar(320); -- linter:ignore (non-null 0건, 확폭)
ALTER TABLE tb_user_info ALTER COLUMN pswd TYPE varchar(256); -- linter:ignore (실측 max 68≤256, 암호화번호V256)
ALTER TABLE tb_bbs_item ALTER COLUMN pswd TYPE varchar(256); -- linter:ignore (실측 max 1, 암호화번호V256 확폭)
ALTER TABLE tb_bbs_comment ALTER COLUMN pswd TYPE varchar(256); -- linter:ignore (non-null 0건, 확폭)
ALTER TABLE tb_dgstfn_info ALTER COLUMN pswd TYPE varchar(256); -- linter:ignore (0행, 확폭)
ALTER TABLE tb_bkmk_menu_mng_rslt ALTER COLUMN menu_nm TYPE varchar(100); -- linter:ignore (0행, 명V100·그룹 다수값 확폭)
ALTER TABLE tb_bnr_info ALTER COLUMN link_url TYPE varchar(2000); -- linter:ignore (실측 max 23, URLV2000 확폭)
ALTER TABLE tb_user_noti ALTER COLUMN link_url TYPE varchar(2000); -- linter:ignore (non-null 0건, 확폭)
ALTER TABLE tb_bbs_comment ALTER COLUMN ans_cn TYPE varchar(4000); -- linter:ignore (text→varchar: 실측 max 36, SSOT 내용V4000 — 무손실)
ALTER TABLE tb_diary_info ALTER COLUMN drctn_mttr TYPE varchar(4000); -- linter:ignore (text→varchar: 0행, 내용V4000 준용)
ALTER TABLE tb_memo_rpt_info ALTER COLUMN drctn_mttr TYPE varchar(4000); -- linter:ignore (0행, 내용V4000 확폭)
ALTER TABLE tb_bnr_info ALTER COLUMN sort_ordr TYPE bigint; -- linter:ignore (실측 max 1, 순서N10 상향 — Banner.sortOrdr Long 동일 릴리스)
ALTER TABLE tb_dept_job_bx ALTER COLUMN sort_ordr TYPE bigint; -- linter:ignore (0행, 순서N10 상향)
ALTER TABLE tb_inst_cd ALTER COLUMN sort_ordr TYPE bigint; -- linter:ignore (0행, 순서N10 상향)
ALTER TABLE tb_inst_cd_rcptn_log ALTER COLUMN sort_ordr TYPE bigint; -- linter:ignore (0행, 순서N10 상향)
ALTER TABLE tb_inst_cd ALTER COLUMN inst_cycl TYPE varchar(2); -- linter:ignore (0행, 수N2 자릿수 정렬 — numeric 전환은 원천 스펙 확인 후 별도)
ALTER TABLE tb_rptp_stats ALTER COLUMN reprt_nm TYPE varchar(256); -- linter:ignore (0행, 명V256 계열 확폭)

-- 검증(참고): 적용 후 동일 컬럼명 cross-length 분열 그룹 0 (fax_no/telno/eml_addr/pswd/menu_nm/
--   link_url/sort_ordr/gndr_cd 등), rfsh_tk 전행 esntl 키, terms 컬럼에 eng_name 부재,
--   uk_tb_onln_mnl_info_onln_mnl_id 제약 존재
