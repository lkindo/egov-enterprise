-- [A-2] tb_prgrm_lst.prgrm_expln 의 거짓 서술 정정.
--
-- V2_11 은 관리자 경로 17행의 설명에 '@PreAuthorize: hasRole(ADMIN)' 등을 적어,
-- "DB URL 인가 + 컨트롤러 애노테이션" 2겹으로 보호된다고 서술했다.
-- 2026-08-02 실측 결과 그 서술이 가리키는 컨트롤러 중 인가 애노테이션을 가진 것은 **하나도 없다**:
--   DeptApiController 0건 · DeptAuthorityApiController 0건 · SurveyApiController 0건
--   MainImageApiController 0건 · HelpApiController 0건 · FaqApiController 0건 · RestdeApiController 0건
--   UserApiController 의 /admin/system/users 계열 11개 매핑 0건
--   LeaderScheduleApiController 는 **클래스 자체가 존재하지 않는다**(ADMIN_LSM_ALL 은 死 경로)
--
-- 실제 방어는 DB URL 인가(rbac.db-auth.secure-paths 의 /api/v1/admin/**) **1겹뿐**이다.
-- 이 컬럼은 인가 판정에 쓰이지 않는 설명 텍스트이므로(린터·인가 매니저는 url 컬럼만 읽는다)
-- 이 정정에 기능 영향은 없다. 그러나 "2겹이다" 라는 서술은 감사자에게 방어심층이 있다고 믿게 만들고,
-- 목록에서 경로 하나가 빠지는 순간 fail-open 이 되는 위험을 가린다 —
-- 그래서 서술을 실태에 맞춘다. (애노테이션을 실제로 붙여 2겹을 만드는 것은 별건이다.)

UPDATE tb_prgrm_lst
SET prgrm_expln = 'DB URL 인가 전용 (secure-paths /api/v1/admin/**). 컨트롤러 인가 애노테이션 없음 — 2026-08-02 실측, 방어 1겹',
    mdfcn_dt = NOW(),
    last_mdfr_id = 'system'
WHERE prgrm_expln LIKE '%PreAuthorize%';
