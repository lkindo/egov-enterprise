-- V2_155: 관리자가 편집하는 6개 마스터 표에 낙관적 잠금 version 컬럼을 더한다(2026-11-24 사용자 승인).
--
-- 대상: 시스템 정책(tb_plcy_manage), 메뉴(tb_menu_info), 부서(tb_ognz_info), 행정코드(tb_admdst_cd),
--       업무 사용자 그룹(tb_authrt_group_info), 로그인 정책(tb_login_policy).
-- 종전에는 두 관리자가 같은 항목을 열고 차례로 저장하면 늦은 저장이 앞 저장을 알림 없이 덮어썼다 — 법적 문서인 정책 본문이
-- 가장 영향이 컸다(2026-11-24 품질 평가 2순위). JPA @Version(정수형 기술 컬럼 예외, DEC-OPS-378·V2_133·V2_149 선례)과
-- EntityVersions.assertCurrent 로 읽은 버전과 다르면 409(CONCURRENT_MODIFICATION), 버전을 보내지 않으면 400 을 반환한다.
--
-- [무중단·호환성]
--   Expand 전용이다. PostgreSQL 11+ 의 상수 DEFAULT 0 추가는 테이블 재작성 없이 메타데이터로 즉시 반영되며,
--   이전 앱의 INSERT 도 기본값 0 으로 정상 동작한다. 이전 앱은 이 컬럼을 읽지도 쓰지도 않는다.
--
-- [일괄 경로] 메뉴 구조 저장은 구조 전체의 버전(MenuStructureSave.version, 행 잠금)으로 이미 동시 저장을 거르고, 부서 계층
--   일괄 저장은 대상 행을 잠근 뒤 바꾼다 — 두 경로는 행마다의 버전을 요구하지 않고, 바뀐 행의 버전만 오른다. 한 행을 고치는
--   편집 화면(정책·메뉴 단건·부서·행정코드·그룹·로그인 정책)이 읽은 버전을 보낸다. tb_ognz_info 는 쓰는 엔티티(DeptManage)만
--   버전을 매핑한다(조회 전용 OrganizationManage 는 매핑하지 않는다).
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

ALTER TABLE tb_plcy_manage ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_plcy_manage ADD CONSTRAINT ck_tb_plcy_manage_version CHECK (version >= 0);
COMMENT ON COLUMN tb_plcy_manage.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_menu_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_menu_info ADD CONSTRAINT ck_tb_menu_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_menu_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_ognz_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_ognz_info ADD CONSTRAINT ck_tb_ognz_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_ognz_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_admdst_cd ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_admdst_cd ADD CONSTRAINT ck_tb_admdst_cd_version CHECK (version >= 0);
COMMENT ON COLUMN tb_admdst_cd.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_authrt_group_info ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_authrt_group_info ADD CONSTRAINT ck_tb_authrt_group_info_version CHECK (version >= 0);
COMMENT ON COLUMN tb_authrt_group_info.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';

ALTER TABLE tb_login_policy ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE tb_login_policy ADD CONSTRAINT ck_tb_login_policy_version CHECK (version >= 0);
COMMENT ON COLUMN tb_login_policy.version IS '버전 (낙관적 잠금, 저장할 때마다 오른다)';
