-- V2_133: 동시 수정이 조용히 덮이던 관리·업무 화면 10개 표에 낙관적 잠금 버전 컬럼을 더한다(2026-10-18 사용자 승인).
-- 업무 보고·일정·부서 업무·포상·배너·팝업·설문(머리 표만, 문항·항목은 아니다)·공통코드 분류·그룹·상세 코드다.
-- 종전에는 두 사람이 같은 행을 열고 차례로 저장하면 늦은 저장이 앞 저장을 알림 없이 덮었다. 엔티티의 @Version 과
-- 화면이 돌려보내는 읽은 버전으로 서버가 409(CONCURRENT_MODIFICATION)를 낸다.
--
-- 컬럼은 결재 표(V2_0 tb_ifml_atrz_info.version)·게시글(tb_bbs_item.version)·결재 임시저장(V2_122)과 같은 비표준
-- `version integer NOT NULL DEFAULT 0` 이다 — @Version 은 정수형만 받고 표준 숫자 도메인은 NUMERIC 이라 쓸 수 없다.
-- 이 형식은 2026-10-18 사용자가 승인했다. 표준 메타 처분안(docs/04-operations/standard-metadata-disposition.md)이
-- 기존 version 컬럼에 둔 처분 C 후보(JPA @Version 기술 컬럼 예외)와 같으며, 그 처분이 정해지기 전까지 이 10개도
-- 표준 용어가 없는 컬럼으로 집계된다(GAP-STD-001).
--
-- Expand 전용이다. 기존 행은 DEFAULT 로 0 이 되고(PostgreSQL 11+ 의 빠른 기본값 — 표를 다시 쓰지 않는다), 이 컬럼을
-- 모르는 이전 앱은 INSERT 에서 생략해도 기본값으로 채워진다. 이전 앱의 UPDATE 는 버전을 올리지 않지만 새 앱이 쓰는
-- 순간부터 대조가 시작되므로 이전 앱과 섞여 도는 동안의 덮어쓰기는 종전과 같다(새 위험은 없다).
-- CHECK 는 V2_122 와 같이 음수 버전을 막는다. 기존 행이 모두 0 이라 검증 스캔은 통과한다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_rpt_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_rpt_info ADD CONSTRAINT ck_tb_rpt_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_rpt_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_schdl_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_schdl_info ADD CONSTRAINT ck_tb_schdl_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_schdl_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_dept_task_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_dept_task_info ADD CONSTRAINT ck_tb_dept_task_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_dept_task_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_rward_manage ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_rward_manage ADD CONSTRAINT ck_tb_rward_manage_version CHECK (version >= 0);
COMMENT ON COLUMN tb_rward_manage.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_bnr_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_bnr_info ADD CONSTRAINT ck_tb_bnr_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_bnr_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_popup_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_popup_info ADD CONSTRAINT ck_tb_popup_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_popup_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_srvy_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_srvy_info ADD CONSTRAINT ck_tb_srvy_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_srvy_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_com_clsf_cd ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_com_clsf_cd ADD CONSTRAINT ck_tb_com_clsf_cd_version CHECK (version >= 0);
COMMENT ON COLUMN tb_com_clsf_cd.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_com_cd ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_com_cd ADD CONSTRAINT ck_tb_com_cd_version CHECK (version >= 0);
COMMENT ON COLUMN tb_com_cd.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_com_dtl_cd ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_com_dtl_cd ADD CONSTRAINT ck_tb_com_dtl_cd_version CHECK (version >= 0);
COMMENT ON COLUMN tb_com_dtl_cd.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';
