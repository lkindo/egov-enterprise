-- V2_33: V2_24 가 도입한 _yn CHECK 중, 실제 코드가 쓰는 값 도메인과 모순되는 3건을 정정한다.
--
-- [근본원인] V2_24 는 "_yn = Y/N" 이라는 **명명 규약**을 **값 불변식**으로 승격했다. 그러나 아래 3개 컬럼은
--   이름만 _yn 일 뿐 실제로는 상태/구분 코드다. V2_24 헤더의 "위반 0 (동적 UNION 검사 실측)" 은
--   세 테이블이 모두 0행이었기 때문에 vacuous 하게 통과한 것이다.
--   (2026-08-01 db-bridge 실측: tb_ifml_atrz_info=0행, tb_inst_cd=0행, tb_inst_cd_rcptn_log=0행)
--
--   · tb_ifml_atrz_info.aprv_yn   : SanctionStatus = 'A'(신청) / 'C'(승인) / 'R'(반려)
--       (business-app/.../informalsanction/SanctionStatus.java:12-14)
--       → 결재 신청은 항상 'A' 를 INSERT 하므로 운영에서 100% SQLState 23514 로 실패한다.
--         게다가 GlobalExceptionHandler 가 CHECK 위반을 400 "입력이 잘못됐습니다" 로 정정 매핑하므로
--         서버 결함이 사용자 입력 오류로 위장되어 나간다.
--   · tb_inst_cd.abl_yn           : InstitutionCode = '0'(사용) / '1'(폐지)
--       (business-core/.../domain/code/InstitutionCode.java:110, :148)
--   · tb_inst_cd_rcptn_log.abl_yn : 동일 도메인(수신 로그가 tb_inst_cd 값을 그대로 운반)
--
-- [신호 은폐가 아님 — GEMINI.md §0.7-H2] 제약을 **지우는** 것이 아니라 **실제 도메인으로 정정**한다.
--   불변식은 유지되며, 오히려 코드와 일치해 처음으로 실효를 갖는다.
--   반대로 컬럼의 '_yn' 명명 자체는 오명명이다(DB 헌법 제6조5항은 _yn=Y/N 을 전제).
--   물리 컬럼 개명(aprv_sttus_cd / abl_se_cd)은 엔티티·DTO·generated-api·FE 동시 변경이라 별도 웨이브로 이월한다.
--
-- [무중단] DROP CONSTRAINT / ADD CONSTRAINT 는 DB 헌법 제7조 비대상(허용)이며
--   ZeroDowntimeMigrationLinterTest 의 FORBIDDEN_DROP 은 CONSTRAINT 를 네거티브 룩어헤드로 제외한다.
--   세 테이블 모두 0행이라 검증 lock 은 무시 가능하고, 기존 데이터 위반도 존재하지 않는다.
--
-- [게이트 공백 — GEMINI.md §0.7-H5] 이 결함을 잡을 수 있는 게이트는 저장소에 존재하지 않았다.
--   단위/통합 테스트는 H2 + ddl-auto:create-drop 이라 CHECK 가 애초에 생성되지 않고,
--   schemaValidationTest 는 매핑만 검증할 뿐 값을 쓰지 않으며, E2E 의 결재 시나리오는
--   /approvals/draft 가 API 를 호출하지 않는 목이라 통과해도 증거가 되지 않는다.
--   실 PostgreSQL 쓰기 스모크 티어(Wave 1)가 이 계층을 원리적으로 커버한다.
--
-- [멱등] DROP ... IF EXISTS 를 쓴다. 2026-08-01 에 동일 DDL 을 공유 OCI DB 에 선(先)적용했으므로,
--   Flyway 가 이 파일을 나중에 적용해도 같은 최종 상태로 수렴한다(부분 적용 상태에서도 안전).

ALTER TABLE tb_ifml_atrz_info DROP CONSTRAINT IF EXISTS ck_tb_ifml_atrz_info_aprv_yn;
ALTER TABLE tb_ifml_atrz_info ADD CONSTRAINT ck_tb_ifml_atrz_info_aprv_yn CHECK (aprv_yn IN ('A', 'C', 'R'));

ALTER TABLE tb_inst_cd DROP CONSTRAINT IF EXISTS ck_tb_inst_cd_abl_yn;
ALTER TABLE tb_inst_cd ADD CONSTRAINT ck_tb_inst_cd_abl_yn CHECK (abl_yn IN ('0', '1'));

ALTER TABLE tb_inst_cd_rcptn_log DROP CONSTRAINT IF EXISTS ck_tb_inst_cd_rcptn_log_abl_yn;
ALTER TABLE tb_inst_cd_rcptn_log ADD CONSTRAINT ck_tb_inst_cd_rcptn_log_abl_yn CHECK (abl_yn IN ('0', '1'));
