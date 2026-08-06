-- 메뉴 정리 Phase 0·1 — 도달 불가 화면 연결 + 기계적 정리
--
-- 근거 문서: .gemini/tasks/20260806-menu-reorganization-plan.md (실측 기반 정리안, #310)
-- 계측 도구: node scripts/menu-census.mjs
--
-- 이 마이그레이션은 정리안의 **결정이 필요 없는 부분만** 담는다.
-- 잔여 중복 4건과 이름·경로 이원화(Phase 2·3)는 정보구조 결정이 선행돼야 하므로 제외한다.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- [Phase 0] 도달 불가 화면에 메뉴 부여
--
-- ⚠ 이 항목의 원인은 에이전트다. 2026-08-05 에 로그 API 3종을 배선하면서(#298·#299·#300)
--   API·화면·테스트까지 만들고 **메뉴를 만들지 않았다**. 그 결과 완성돼 동작하는 화면이
--   URL 직접 입력으로만 도달 가능한 상태로 남았다 — 특히 웹 로그는 28,104행이 수집되는데
--   "볼 수 없다" 는 이유로 착수한 작업이었고, 메뉴가 없어 여전히 볼 수 없었다.
--   UnreachableServiceLinterTest(#304)는 @Service 만 보므로 이 계층을 잡지 못한다.
--
-- 부여 위치: 9040000 '감사 및 통계 모니터링' — 기존 로그 메뉴 2건(9040340 접속·9040350 시스템)과
--            같은 부모. menu_sn·menu_ordr 도 그 계열을 이어 쓴다(9040360~9040390, ordr 86~89).
-- 권한:      기존 로그 메뉴와 동일하게 ROLE_ADMIN. 개인정보 로그는 백엔드가 @AdminOnly 라
--            ROLE_ADMIN 만 부여하는 것이 백엔드 인가와 정합한다.
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO tb_menu_info
    (menu_sn, up_menu_sn, menu_nm, prgrm_file_nm, menu_ordr, menu_expln,
     route_mdfcn_yn, modern_route, use_yn, del_yn, frst_rgtr_id, crt_dt)
SELECT v.menu_sn, 9040000, v.menu_nm, 'dir', v.menu_ordr, '',
       '2', v.modern_route, 'Y', 'N', 'admin', CURRENT_TIMESTAMP
  FROM (VALUES
        (9040360, '로그 통합 대시보드',      86, '/admin/system/logs'),
        (9040370, '상세 웹 로그 (Web)',      87, '/admin/system/logs/web'),
        (9040380, '상세 사용자 로그 (User)', 88, '/admin/system/logs/user'),
        (9040390, '개인정보 조회 로그',      89, '/admin/system/logs/privacy')
       ) AS v(menu_sn, menu_nm, menu_ordr, modern_route)
 WHERE NOT EXISTS (SELECT 1 FROM tb_menu_info m WHERE m.menu_sn = v.menu_sn);

INSERT INTO tb_menu_crt_dtl (menu_sn, authrt_cd, mapng_crt_id, crt_dt)
SELECT v.menu_sn, 'ROLE_ADMIN', 'webmaster', CURRENT_TIMESTAMP
  FROM (VALUES (9040360), (9040370), (9040380), (9040390)) AS v(menu_sn)
 WHERE NOT EXISTS (
        SELECT 1 FROM tb_menu_crt_dtl d
         WHERE d.menu_sn = v.menu_sn AND d.authrt_cd = 'ROLE_ADMIN');

-- 비공식결재 관리(/admin/system/ism) — 백엔드 InformalSanctionApiController 가 실재하고
-- 화면도 430줄로 동작하나 메뉴가 없었다. 서비스 운영 관리(9030000) 하위에 잇는다.
INSERT INTO tb_menu_info
    (menu_sn, up_menu_sn, menu_nm, prgrm_file_nm, menu_ordr, menu_expln,
     route_mdfcn_yn, modern_route, use_yn, del_yn, frst_rgtr_id, crt_dt)
SELECT 9030800, 9030000, '비공식 결재 관리', 'dir', 90, '',
       '2', '/admin/system/ism', 'Y', 'N', 'admin', CURRENT_TIMESTAMP
 WHERE NOT EXISTS (SELECT 1 FROM tb_menu_info m WHERE m.menu_sn = 9030800);

INSERT INTO tb_menu_crt_dtl (menu_sn, authrt_cd, mapng_crt_id, crt_dt)
SELECT 9030800, 'ROLE_ADMIN', 'webmaster', CURRENT_TIMESTAMP
 WHERE NOT EXISTS (
        SELECT 1 FROM tb_menu_crt_dtl d
         WHERE d.menu_sn = 9030800 AND d.authrt_cd = 'ROLE_ADMIN');

-- ─────────────────────────────────────────────────────────────────────────────
-- [Phase 1-1] 테스트 쓰레기 메뉴 제거
--
-- 이미 use_yn='N' 이나 행이 남아 계측·감사에 노이즈를 만든다. 이름부터가 'test'/'test1' 이고
-- 특정 bbsId 를 하드코딩한 링크라 되살릴 가치가 없다.
-- tb_menu_crt_dtl 자식 행을 먼저 지운 뒤 본체를 지운다(V2_12 FK).
-- ─────────────────────────────────────────────────────────────────────────────

DELETE FROM tb_menu_crt_dtl WHERE menu_sn IN (8744343, 8808554);
DELETE FROM tb_menu_info    WHERE menu_sn IN (8744343, 8808554) AND menu_nm IN ('test', 'test1');

-- ─────────────────────────────────────────────────────────────────────────────
-- [Phase 1-2 · 1-3] 카테고리/부모 메뉴를 순수 폴더로
--
-- 부모 메뉴가 **특정 하위 화면**을 가리켜 중복을 만들고 있었다. route 를 비우면
-- 사이드바에서 묶음 역할만 하고 자식은 그대로 노출된다.
-- 활성 메뉴 77건 중 6건이 이미 빈 route 로 폴더 역할을 하고 있어 새 관례가 아니며,
-- V2_45 가 1050000(전자결재)에 같은 처방을 적용했다.
--
-- ⚠ 부모를 use_yn='N' 으로 숨기면 안 된다 — 사이드바에서 자식까지 사라진다.
--   V2_45 작성 시 1050000 을 숨겼다면 살아 있는 결재함(/approvals)이 도달 불가가 됐을 것이다.
--
-- 이 조치로 중복 9건 중 5건이 해소된다(각 부모가 자식과 같은 경로를 가리키던 것들).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 2000000 AND modern_route = '/admin/community/boards/master';  -- ↔ 9030140

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 9000000 AND modern_route = '/admin/user/manage';              -- ↔ 9020310

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 1020000 AND modern_route = '/admin/collaboration/mail-history'; -- ↔ 1020300 외

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 1030000 AND modern_route = '/admin/collaboration/address-book'; -- ↔ 1030100

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 2030000 AND modern_route = '/admin/notifications';            -- ↔ 2030400

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 2020000 AND modern_route = '/admin/collaboration/mail-history'; -- ↔ 1020300 외

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 9020100 AND modern_route = '/admin/system/monitoring/hub?tab=security'; -- ↔ 9020110 외

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE menu_sn = 9030100 AND modern_route = '/admin/community/boards';         -- ↔ 9030110

-- ─────────────────────────────────────────────────────────────────────────────
-- [Phase 1-4] 폴더 표기를 NULL 로 통일
--
-- 실측: 활성 메뉴 77건 중 폴더 역할이 6건인데 **빈 문자열 5건 · NULL 1건으로 혼재**한다.
-- 프론트는 `modernRoute || chkURL` 로 읽어 둘 다 falsy 이므로 **동작 차이는 없다**.
-- 그러나 혼재는 계측을 왜곡한다 — `WHERE modern_route IS NOT NULL` 로 세면 빈 문자열 5건이
-- "경로 있음" 으로 잡혀 중복 목록에 빈 행이 나타난다(실측 확인).
-- V2_45 와 위 Phase 1-2 가 NULL 을 쓰므로 그쪽으로 통일한다.
--
-- ⚠ 관리자 메뉴 편집 화면(MenuAdminClient)은 저장 시 `modernRoute || ''` 로 빈 문자열을 쓴다.
--   사람이 편집하면 다시 ''가 될 수 있다 — 그래도 동작은 같고, 계측기는 아래 보강으로
--   두 형태를 모두 폴더로 인식한다(scripts/menu-census.mjs).
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE tb_menu_info SET modern_route = NULL, mdfcn_dt = CURRENT_TIMESTAMP
 WHERE modern_route = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- [의도적으로 하지 않은 것]
-- · 1000000 '🏢 워크스페이스'(/admin/work-hub) — 그 경로를 가리키는 다른 메뉴가 없어 중복이 아니다.
--   일관성만을 이유로 폴더화하는 것은 사용자 동선을 바꾸는 결정이라 제외한다.
-- · 잔여 중복 4건(mail-history 4중복 잔여 · monitoring security 잔여 · stats/user 2중복 등)
--   → 이름 정정·삭제 판단이 필요하다(Phase 2).
-- · 경로 이원화(security/login-policy ↔ user/login-policy 등) → 정본 판정 필요(Phase 3).
-- · 고아 라우트 파일 삭제 → 문자열 URL 참조는 정적 분석 대상이 아니다(V2_30, 13개 오삭제 전례).
--
-- [멱등성] INSERT 는 NOT EXISTS, UPDATE 는 현재 값 조건, DELETE 는 이름까지 확인해 재적용 시 통과한다.
-- ─────────────────────────────────────────────────────────────────────────────
