-- 2026-10-19 사용자 결정("메뉴와 탭을 걷기") — 보고서 통계 메뉴 행과 그 메뉴 배정·즐겨찾기를 정리한다.
-- 데이터만 바꾼다. 구조 변경은 없다. 다시 실행해도 결과가 같다(이미 지운 환경에서는 아무것도 하지 않는다).
--
-- [무엇이 문제인가] 메뉴 9040105 '보고서통계'(경로 /admin/stats/report)는 통계 허브의 '운영 보고서' 탭을 연다. 그 탭이 읽는
-- 원장 tb_rptp_stats 에는 쓰는 제품 경로가 없어(등록 메서드는 자기 단위 시험만 불렀다) 어떤 기간에도 값이 없었다. 같은 변경에서
-- 그 탭·라우트·조회 API(GET /api/v1/admin/system/statistics/report)를 걷으므로, 메뉴를 남기면 없는 화면을 가리킨다.
-- 시드 체인(V2_2, V2_100 이 상위를 9040402 로 옮김)의 모양: 한 행(사용 중, 하위 없음)과 (ROLE_ADMIN, NAVIGATION, '9040105')
-- 배정 1건. 물리 테이블 tb_rptp_stats 는 남긴다(스키마 변경은 별도 승인).
--
-- ① 대상 판정: 메뉴 9040105 가 '우리가 아는 그 행'일 때만 지운다 — 경로가 /admin/stats/report 이고 하위 메뉴가 없을 때.
--    사용 여부(use_yn)는 보지 않는다. 꺼 둔 행도 사라지는 화면을 가리키기는 같다.
--    V2_125 와 달리 다르면 건너뛰지 않고 멈춘다. 이 변경과 같은 릴리스가 그 라우트를 지우므로, 같은 경로를 가리키는 다른 메뉴나
--    하위를 둔 행을 남기면 적용 뒤 화면이 없는 메뉴가 된다. 그래서 다음 셋 중 하나면 아무것도 지우지 않고 실패한다 —
--    9040105 의 경로가 다르다, 9040105 에 하위가 있다, 다른 메뉴 행이 같은 경로를 가리킨다. 도입 기관이 그 행을 정리한 뒤
--    다시 적용한다(authorization-cutover-runbook.md '보고서 통계 메뉴 퇴역(V2_134)').
--    행이 없으면(이미 지운 환경) 아무것도 하지 않는다. 그때 배정만 남아 있어도 건드리지 않는다 — 그 배정이 생긴 경위는
--    이 변경이 판정할 수 없다(V2_125 와 같다).
-- ② tb_menu_info 를 가리키는 참조를 먼저 정리한다(V2_125 와 같은 범위). 물리 외래 키는 메뉴 자기참조뿐이고 ①이 하위
--    없음을 요구한다. 외래 키 없이 메뉴 번호를 담는 표는 두 개다.
--    · tb_authrt_grnt_map(NAVIGATION, authrt_grnt_cd = 메뉴 번호 문자열) — 그 메뉴의 배정을 모든 그룹에서 지우고, 지운
--      배정마다 같은 트랜잭션에서 변경 이력(REMOVE)을 남긴다(ADR-0016, V2_120·V2_124·V2_125 와 같은 열·값).
--    · tb_bkmk_menu_mng_rslt(menu_id) — 즐겨찾기다. 사용 중인 메뉴라 실제 행이 있을 수 있다. 가리킬 메뉴가 없어지므로
--      함께 지운다. 즐겨찾기에는 이력 표가 없다.
-- ③ 메뉴 행과 즐겨찾기에는 감사 표가 없다. 되돌리는 원본과 그 한계는 authorization-cutover-runbook.md 의 같은 절을 따른다
--    (적용 직전 백업, 적용 전에 남긴 출력). 배정은 이 변경의 REMOVE 이력으로 되살린다.
-- 반복 시드는 이 메뉴를 다시 만들지 않는다 — R__zz_seed_base_admin 은 메뉴가 하나도 없는 신규 base 에만 910~920 을
-- 넣고, R__seed_framework·R__seed_demo 는 메뉴를 넣지 않는다.
-- plcy_ver_no 는 이 변경을 반영한 권한 원장 버전(PermissionCodes.CATALOG_VERSION)이다 — 같은 변경이 화면 권한 원장에서
-- /admin/stats/report 와 그 조회 API 바인딩을 뺐다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 판정과 반영 사이에 메뉴·배정·즐겨찾기가 바뀌지 않게 쓰기만 막는다(읽기는 계속된다). 잠금 순서는 앱과 같다(메뉴 → 권한).
LOCK TABLE tb_menu_info, tb_authrt_grnt_map, tb_authrt_chg_hstry, tb_bkmk_menu_mng_rslt IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM tb_menu_info
                WHERE menu_sn = 9040105 AND modern_route IS DISTINCT FROM '/admin/stats/report') THEN
        RAISE EXCEPTION 'V2_134: menu 9040105 does not point at /admin/stats/report — review the row before retiring it';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_menu_info WHERE up_menu_sn = 9040105) THEN
        RAISE EXCEPTION 'V2_134: menu 9040105 has child menus — move or remove them before retiring it';
    END IF;
    IF EXISTS (SELECT 1 FROM tb_menu_info
                WHERE menu_sn <> 9040105 AND modern_route = '/admin/stats/report') THEN
        RAISE EXCEPTION 'V2_134: another menu row points at the retired route /admin/stats/report';
    END IF;
END
$$;

WITH retired_menu AS (
    SELECT menu.menu_sn
      FROM tb_menu_info menu
     WHERE menu.menu_sn = 9040105
       AND menu.modern_route = '/admin/stats/report'
       AND NOT EXISTS (SELECT 1 FROM tb_menu_info child WHERE child.up_menu_sn = menu.menu_sn)
),
removed_bookmark AS (
    DELETE FROM tb_bkmk_menu_mng_rslt bookmark
     USING retired_menu
     WHERE bookmark.menu_id = retired_menu.menu_sn
    RETURNING bookmark.menu_id
),
removed_menu AS (
    DELETE FROM tb_menu_info menu
     USING retired_menu
     WHERE menu.menu_sn = retired_menu.menu_sn
    RETURNING menu.menu_sn
),
removed_grant AS (
    DELETE FROM tb_authrt_grnt_map grant_row
     USING retired_menu
     WHERE grant_row.authrt_type_cd = 'NAVIGATION'
       AND grant_row.authrt_grnt_cd = retired_menu.menu_sn::text
    RETURNING grant_row.authrt_cd, grant_row.authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'migration:2.134', 'a61052901cd6ad46ef41f3620792f1fc8e605a72102cf1061e09c40e855b56c2',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'NAVIGATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL, '2026-10-19 사용자 승인: 보고서 통계 메뉴 퇴역', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed_grant;
