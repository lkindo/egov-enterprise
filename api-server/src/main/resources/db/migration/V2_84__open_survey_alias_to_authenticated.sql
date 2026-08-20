-- ─────────────────────────────────────────────────────────────────────────────
-- V2_84: 설문 별칭 경로의 URL 인가 게이트 제거 (제품 결정 2026-08-20 — GAP-AUTH-001)
-- ─────────────────────────────────────────────────────────────────────────────
-- [왜] 설문 "제출"(POST /api/v1/surveys/{srvySn}/responses)은 @Authenticated 로 선언돼
-- 있었지만, V2_11 이 심은 별칭 게이트(ADMIN_SURVEY_ALIAS = /api/v1/surveys/‥)가 URL 필터
-- 단계에서 ADMIN/SYSTEM 을 요구해 일반 사용자는 핸들러에 도달하기 전에 403 을 받았다.
-- 애노테이션 의미(인증 사용자)와 실행 의미(관리자 전용)가 어긋난 상태였다.
--
-- [무엇을] 별칭 게이트 행과 그 role 매핑을 제거한다. V2_11 파일 자체는 불변(적용 완료)이므로
-- 이 마이그레이션이 DB 상태를 전진시킨다.
--
-- [방어선은 어디로 갔나 — 제거가 아니라 이동이다]
--   · 관리 기능(템플릿·설문/문항/항목 CUD): SurveyApiController 의 @AdminOrSystem 메서드 인가
--     (같은 변경에서 명시). 정식 경로 /api/v1/admin/system/surveys/‥ 게이트(ADMIN_SURVEY_ALL)는
--     그대로라 관리 UI 는 URL+메서드 이중 방어를 유지한다.
--   · 열람(목록·상세·문항)·제출·통계: @Authenticated — 제품 결정에 따른 의도된 개방이다.
-- application.yml·application-test.yml·RbacAuthorizationMatrixTest 의 secure-paths 선언도
-- 같은 변경에서 함께 좁힌다(SecurePathsDeclarationSyncLinterTest 가 3개 선언 일치를 강제).

DELETE FROM public.tb_role_prgrm_map WHERE prgrm_file_nm = 'ADMIN_SURVEY_ALIAS';
DELETE FROM public.tb_prgrm_lst WHERE prgrm_file_nm = 'ADMIN_SURVEY_ALIAS';
