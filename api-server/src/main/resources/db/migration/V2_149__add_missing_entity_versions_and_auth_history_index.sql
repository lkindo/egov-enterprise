-- V2_149: 낙관적 잠금이 빠져 있던 관리·업무 9개 마스터 표에 version 컬럼을 더하고,
--         권한 변경 이력 표에 대상 사용자 조회용 복합 인덱스를 추가한다(2026-11-12 사용자 승인).
--
-- [1. 낙관적 잠금 version 컬럼 9개 표 — V2_133 후속]
--   대상: 도움말(tb_hlp_info), 온라인 매뉴얼(tb_onln_mnl_info), 행사(tb_event_info),
--         외부인사(tb_extrl_hr_info), 메모보고(tb_memo_rpt_info), 커뮤니티(tb_cmnty_info),
--         온라인투표(tb_onln_poll_manage), 설문템플릿(tb_srvy_tmplt), 게시판/커뮤니티 템플릿(tb_tmplt_info).
--   종전에는 두 관리자가 같은 항목을 열고 차례로 저장하면 늦은 저장이 앞 저장을 알림 없이 덮어썼다.
--   JPA @Version(정수형 기술 컬럼 예외, DEC-OPS-378·V2_133 선례)과 EntityVersions.assertCurrent 로
--   읽은 버전과 다르면 409(CONCURRENT_MODIFICATION), 버전을 보내지 않으면 400(INVALID_INPUT_VALUE)을 반환한다.
--
-- [2. 권한 변경 이력 복합 인덱스 — GAP-AUTH-004 종결]
--   AuthorizationAdministrationService.membershipLastChange / readDepartment / history(userId 조건)가
--   tb_authrt_chg_hstry 를 scrty_dcsn_trgt_id 조건과 authrt_chg_hstry_sn 집계·역순 정렬로 조회한다.
--   (scrty_dcsn_trgt_id, authrt_chg_hstry_sn) 복합 인덱스를 두어 이력 행 증가에 따른 전체 스캔을 제거한다.
--
-- [무중단·호환성]
--   Expand 전용이다. PostgreSQL 11+ 의 상수 DEFAULT 0 추가는 테이블 재작성 없이 메타데이터로 즉시 반영되며,
--   이전 앱의 INSERT 도 기본값 0 으로 정상 동작한다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_hlp_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_hlp_info ADD CONSTRAINT ck_tb_hlp_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_hlp_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_onln_mnl_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_onln_mnl_info ADD CONSTRAINT ck_tb_onln_mnl_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_onln_mnl_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_event_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_event_info ADD CONSTRAINT ck_tb_event_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_event_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_extrl_hr_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_extrl_hr_info ADD CONSTRAINT ck_tb_extrl_hr_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_extrl_hr_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_memo_rpt_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_memo_rpt_info ADD CONSTRAINT ck_tb_memo_rpt_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_memo_rpt_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_cmnty_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_cmnty_info ADD CONSTRAINT ck_tb_cmnty_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_cmnty_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_onln_poll_manage ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_onln_poll_manage ADD CONSTRAINT ck_tb_onln_poll_manage_version CHECK (version >= 0);
COMMENT ON COLUMN tb_onln_poll_manage.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_srvy_tmplt ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_srvy_tmplt ADD CONSTRAINT ck_tb_srvy_tmplt_version CHECK (version >= 0);
COMMENT ON COLUMN tb_srvy_tmplt.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_tmplt_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_tmplt_info ADD CONSTRAINT ck_tb_tmplt_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_tmplt_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

CREATE INDEX ix_tb_authrt_chg_hstry_scrty_dcsn_trgt_id
    ON tb_authrt_chg_hstry (scrty_dcsn_trgt_id, authrt_chg_hstry_sn);
