-- 메뉴 정리 Phase 3 — 잔여 숨김 정리 · 명칭 정합 · 도달 불가 화면 연결
--
-- 근거 문서: .gemini/tasks/20260806-menu-reorganization-plan.md
-- 계측 도구: node scripts/menu-census.mjs
--
-- ─────────────────────────────────────────────────────────────────────────────
-- [1] work-hub 축 A 의 숨김 탭 메뉴 5건 삭제
--
-- ⚠ 앞선 보고에서 "work-hub 이원화가 Phase 3 중 가장 실질적" 이라고 적었으나 **과장이었다.**
--   실측하니 **활성 메뉴에는 중복이 없다** — 축 B(1060100~1060300)만 활성이고 축 A 탭 메뉴는
--   5건 모두 이미 use_yn='N' 이다. 사용자가 보는 화면에는 이원화가 드러나지 않는다.
--   남은 것은 숨김 행 5건의 정리뿐이며, 그 값어치는 계측·관리화면 노이즈 제거 정도다.
--
-- 실측 구조:
--   축 A  /admin/work-hub          → 1000000 '🏢 워크스페이스' (활성, 허브 진입점 — 유지한다)
--         /admin/work-hub?tab=job      → 1010000 (숨김)
--         /admin/work-hub?tab=calendar → 1010200 (숨김)
--         /admin/work-hub?tab=report   → 1040000 · 1040100 · 1040200 (숨김, **셋이 같은 탭**)
--   축 B  /smart-toolkit/dept-job     → 1060100 (활성)
--         /smart-toolkit/schedule     → 1060200 (활성)
--         /smart-toolkit/work-report  → 1060300 (활성)
--
-- 축 B 페이지는 6줄짜리 얇은 래퍼로 같은 WorkHubClient 를 defaultTab 과 함께 렌더한다.
-- 탭 매핑은 방어적으로 구현돼 있어(includes('report')/includes('schedule')) 대소문자·명칭 차이가
-- 있어도 올바른 탭이 열린다 — 실측 확인. 즉 축 B 가 정본으로 기능하고 있다.
--
-- 삭제 근거: 숨김 5건은 되살릴 이유가 없다. 같은 탭이 활성 메뉴로 이미 도달 가능하고,
--            그중 3건은 서로 같은 탭을 가리키는 중복이다. 자식 0건(실측).
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM tb_menu_crt_dtl WHERE menu_sn IN (1010000, 1010200, 1040000, 1040100, 1040200);
DELETE FROM tb_menu_info
 WHERE menu_sn IN (1010000, 1010200, 1040000, 1040100, 1040200)
   AND use_yn = 'N'
   AND modern_route LIKE '/admin/work-hub?tab=%';

-- ─────────────────────────────────────────────────────────────────────────────
-- [2] 한/영 혼용 명칭 정정 — 화면 제목과 일치시킨다
--
-- V2_30 이 "메뉴명 '온라인poll관리' 는 한/영 혼용 레거시 명칭이다. 화면 제목('온라인 설문
-- 관리')과 어휘가 어긋나나 이번 승인 범위를 넘어서므로 개명은 별건으로 둔다" 고 미뤄 둔 항목.
--
-- 실측한 화면 제목:
--   /admin/survey/polls              → "온라인 설문 관리"  (OnlinePollAdminClient:233)
--   /admin/survey/polls/participate  → "여론조사 센터"     (OnlinePollParticipateClient:110)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE tb_menu_info SET menu_nm = '온라인 설문 관리', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 2010700 AND menu_nm = '온라인poll관리';

UPDATE tb_menu_info SET menu_nm = '여론조사 참여', mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 2010800 AND menu_nm = '온라인poll참여';

-- ─────────────────────────────────────────────────────────────────────────────
-- [3] /admin/system/audit — 도달 불가 실기능에 메뉴 부여
--
-- 실측: AuditTimelineClient(405줄, API 1) — "보안 감사 타임라인 · 전사 인프라 내의 행위 추적 및
--       무결성 검증" 이다. monitoring/hub?tab=security(9040310 이 담당)와 **다른 화면**이다.
--       그런데 이 화면을 가리키는 메뉴가 0건이었다 — Phase 0 로그 화면들과 같은 부류다.
--
-- 부여 위치: 9040000 '감사 및 통계 모니터링' — 9040310/9040320 과 같은 부모, 순번을 이어 쓴다.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO tb_menu_info
    (menu_sn, up_menu_sn, menu_nm, prgrm_file_nm, menu_ordr, menu_expln,
     route_mdfcn_yn, modern_route, use_yn, del_yn, frst_rgtr_id, crt_dt)
SELECT 9040400, 9040000, '보안 감사 타임라인', 'dir', 91, '',
       '2', '/admin/system/audit', 'Y', 'N', 'admin', CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM tb_menu_info m WHERE m.menu_sn = 9040400);

INSERT INTO tb_menu_crt_dtl (menu_sn, authrt_cd, mapng_crt_id, crt_dt)
SELECT 9040400, 'ROLE_ADMIN', 'webmaster', CURRENT_TIMESTAMP
 WHERE NOT EXISTS (
        SELECT 1 FROM tb_menu_crt_dtl d
         WHERE d.menu_sn = 9040400 AND d.authrt_cd = 'ROLE_ADMIN');

-- ─────────────────────────────────────────────────────────────────────────────
-- [의도적으로 하지 않은 것]
--
-- · /admin/observability 처분 — 허브의 OBSERVABILITY 탭(메뉴 9040330)과 **같은 /actuator 를
--   조회하지만 구현·표현이 다른 별개 화면**이다. 자체 테스트(__tests__)도 있어 유지 중인 자산이다.
--   어느 표현이 더 나은지는 제품 판단이라 추측으로 지우지 않는다. Phase 3 잔여로 남긴다.
--
-- · 1000000 '🏢 워크스페이스'(/admin/work-hub) 유지 — 허브 자체의 진입점이고 중복이 아니다.
--
-- · 고아 라우트 파일 삭제 — 문자열 URL 참조는 정적 분석 대상이 아니다(V2_30, 13개 오삭제 전례).
--   동반 커밋에서 /admin/security/audit 만 **리다이렉트**로 정리한다(6줄 래퍼라 판정이 명확).
--
-- [멱등성] INSERT 는 NOT EXISTS, UPDATE/DELETE 는 현재 값 조건을 함께 걸어 재적용 시 통과한다.
-- ─────────────────────────────────────────────────────────────────────────────
