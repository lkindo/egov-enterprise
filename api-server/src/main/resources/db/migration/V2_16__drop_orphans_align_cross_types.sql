-- =====================================================================
-- V2_16: 고아 테이블 10개 정리 + cross-type 분열 정렬 + 잔재 정비 (P5)
-- =====================================================================
-- 근거: docs/02-architecture/db-standardization-assessment.md §3 MEDIUM + 2026-07-17 P5 재검증
--   (3개 영역 병렬: 전 대상 0행·코드참조 0·인바운드 FK/뷰/트리거/시퀀스 0 실측). 사용자 승인: 전부(2026-07-17).
-- 복원: 전 테이블 정의는 git(V2_0__baseline.sql)에 보존 — 필요 시 재생성 가능. 대상 전건 0행이라 데이터 손실 없음.
-- 비고: 의도적으로 CASCADE 미사용 — 미지의 의존이 출현하면 실패로 드러나는 안전장치.
--   V2_0 baseline 은 무수정 존치(별도 슬리밍 과제): fresh DB 는 생성→본 파일이 즉시 삭제 (기능상 무해).
--   ⚠ baseline 슬리밍 시 본 파일의 DROP 도 no-op 화됨을 함께 확인할 것.
-- 동반 코드(동일 릴리스): DtaUseStats.pstId String / SysLog.prcsTm Long(+LogManageService 경계 변환) /
--   OrganizationManage.ognzNm nullable=false / MenuRepositoryImpl 루트 센티널 isNull 정정.

-- ---------------------------------------------------------------
-- 1) 고아 테이블 10개 DROP (전건 0행·코드참조 0·인바운드 의존 0 — 2026-07-17 재실측)
-- ---------------------------------------------------------------
DROP TABLE IF EXISTS tb_admdst_cd_rcptn_log; -- linter:ignore (0행·코드참조 0·의존 0 실측 — 행정구역코드 수신로그 미구현)
DROP TABLE IF EXISTS tb_bbs_stats; -- linter:ignore (0행·참조 0 실측 — getBbsStats API 는 tb_dta_use_stats 기반, 본 테이블 미사용)
DROP TABLE IF EXISTS tb_club_info; -- linter:ignore (0행·참조 0 실측 — 동호회 도메인 미구현)
DROP TABLE IF EXISTS tb_club_user_map; -- linter:ignore (0행·참조 0 실측 — 아웃바운드 FK 는 DROP 과 함께 소멸, 피참조 아님)
DROP TABLE IF EXISTS tb_dscsn_manage; -- linter:ignore (0행·참조 0·의존 0 실측 — 상담관리 미구현)
DROP TABLE IF EXISTS tb_indv_pg_set; -- linter:ignore (0행·참조 0·식별컬럼/PK/인덱스 전무 실측 — 실사용은 tb_indv_pg/tb_indv_pg_conts)
DROP TABLE IF EXISTS tb_leader_schdl_dtl; -- linter:ignore (0행·참조 0·의존 0 실측)
DROP TABLE IF EXISTS tb_noti_info; -- linter:ignore (0행·참조 0 실측 — 실사용은 tb_user_noti, noti_sn cross-type 충돌 자연 해소)
DROP TABLE IF EXISTS tb_role_lyr; -- linter:ignore (0행·참조 0 실측 — tb_role_hierarchy(실사용 SSOT)와 개념중복 死 테이블)
DROP TABLE IF EXISTS tb_user_mdfcn_dtls; -- linter:ignore (0행·참조 0·의존 0 실측 — 사용자수정이력 미구현)

-- ---------------------------------------------------------------
-- 2) 고아 시퀀스 정리 — 예외 대장 §4 '제거 후보' 이행
-- ---------------------------------------------------------------
DROP SEQUENCE IF EXISTS sq_ntt_id; -- linter:ignore (코드 소비 0·컬럼 DEFAULT 0·pg_depend 0·ids 채번행 0 — 4중 실측 2026-07-17)

-- ---------------------------------------------------------------
-- 3) cross-type 분열 정렬 (감사 HIGH/LOW — 동일 용어 동일 도메인 원칙)
-- ---------------------------------------------------------------
-- 3-1) pst_id: 게시판 4테이블 varchar(20)과 일치 (0행 무손실 — V2_13 가비지 정리로 공표면)
ALTER TABLE tb_dta_use_stats ALTER COLUMN pst_id TYPE varchar(20) USING pst_id::varchar; -- linter:ignore (0행 실측·무손실·DtaUseStats.pstId String 동일 릴리스 동기화)

-- 3-2) prcs_tm: 의미는 양쪽 '처리 소요시간(ms)' 동일 실측 확정 — tb_web_log(bigint)와 타입 통일
--      [멱등 가드] 재실행 시 USING 의 '' 리터럴이 이미 변환된 bigint 와 충돌하므로 타입 검사 후 실행
DO $$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'tb_sys_log' AND column_name = 'prcs_tm') <> 'bigint' THEN
    ALTER TABLE tb_sys_log ALTER COLUMN prcs_tm TYPE bigint USING NULLIF(prcs_tm, '')::bigint; -- linter:ignore (12행 전수 숫자 실측·무손실·SysLog.prcsTm Long 동일 릴리스 동기화)
  END IF;
END $$;
COMMENT ON COLUMN tb_sys_log.prcs_tm IS '처리 소요시간(ms)';
COMMENT ON COLUMN tb_web_log.prcs_tm IS '처리 소요시간(ms) — AuditEvent.durationMs 기록';

-- ---------------------------------------------------------------
-- 4) tb_ognz_info 계약 정합 — 이중 매핑 엔티티(DeptManage nullable=false)·물리 3자 일치
--    (실측: 1행·NULL 0건·쓰기경로 @NotBlank 방어 — 즉시 적용 무부담)
-- ---------------------------------------------------------------
ALTER TABLE tb_ognz_info ALTER COLUMN ognz_nm SET NOT NULL;

-- 검증(참고): 적용 후 기대 — public BASE TABLE 104→94, sq_ntt_id 부재,
--   tb_dta_use_stats.pst_id=varchar(20), tb_sys_log.prcs_tm=bigint, ognz_nm NOT NULL
