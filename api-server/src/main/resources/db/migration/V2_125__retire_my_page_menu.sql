-- 2026-10-05 사용자 결정("그래 정리해줘") — 꺼진 '마이페이지관리' 메뉴 행과 남은 메뉴 배정을 정리한다(DEC-OPS-229).
-- 데이터만 바꾼다. 구조 변경은 없다. 다시 실행해도 결과가 같다(이미 지운 환경에서는 아무것도 하지 않는다).
--
-- [무엇이 문제인가] 메뉴 2030100 '마이페이지관리'(경로 /admin/workspace/my-page)는 화면·API 를 2026-09-08 결정
-- (PD-MYPG-001 → DEC-OPS-070)으로 걷은 뒤 V2_88 이 use_yn='N' 으로 껐다. 그 화면은 없으므로(404) 다시 켤 수 있는
-- 메뉴가 아니다. 그런데도 메뉴 관리 화면에는 존재하지 않는 화면을 가리키는 행이 남고, 그룹의 메뉴 배정에도 남는다.
-- 2026-10-05 OCI 읽기: 2030100 한 행(상위 2030000 '업무 지원', use_yn N·del_yn N, 하위 없음)과
-- (ROLE_ADMIN, NAVIGATION, '2030100') 배정 1건이 남아 있다. 빈 테이블 tb_indv_pg_conts 는 남긴다(스키마 변경은 별도 승인).
--
-- ① 대상 판정: 메뉴 2030100 이 '우리가 아는 그 행'일 때만 지운다 — 경로가 /admin/workspace/my-page 이고,
--    사용하지 않으며(use_yn='N'), 하위 메뉴가 없을 때. 셋 중 하나라도 다르면 도입 기관이 그 행을 다시 켜거나 다른
--    화면으로 바꿔 쓰는 것이므로 행·배정·즐겨찾기를 모두 그대로 둔다. 멈추지 않고 건너뛴다 — 남겨도 깨지는 것이
--    없다(V2_119·V2_120 선례. V2_124 처럼 남기면 인증이 막히는 경우와 다르다). 행이 없으면(이미 지운 환경) 아무것도
--    하지 않는다. 그때 배정만 남아 있어도 건드리지 않는다 — 그 배정이 생긴 경위는 이 변경이 판정할 수 없다.
-- ② tb_menu_info 를 가리키는 참조를 먼저 정리한다. 물리 외래 키는 메뉴 자기참조(fk_tb_menu_info_tb_menu_info_up,
--    V2_14)뿐이고 ①이 하위 없음을 요구한다. 구 메뉴-권한 매핑 표(tb_menu_crt_dtl, V2_12 의 외래 키)는 V2_100 이
--    요구하는 인가 Contract 에서 이미 사라졌다. 외래 키 없이 메뉴 번호를 담는 표는 두 개다.
--    · tb_authrt_grnt_map(NAVIGATION, authrt_grnt_cd = 메뉴 번호 문자열) — 그 메뉴의 배정을 모든 그룹에서 지우고,
--      지운 배정마다 같은 트랜잭션에서 변경 이력(REMOVE)을 남긴다(ADR-0016, V2_120·V2_124 와 같은 열·값).
--    · tb_bkmk_menu_mng_rslt(menu_id) — 즐겨찾기다. 사용하지 않는 메뉴는 즐겨찾기할 수 없어(MenuBookmarkService)
--      실제 행은 없을 것으로 본다. 남아 있으면 가리킬 메뉴가 없으므로 함께 지운다. 즐겨찾기에는 이력 표가 없다.
--      V2_100 은 퇴역 메뉴의 즐겨찾기를 보면 멈췄다 — 그때는 옮겨 갈 정본 메뉴가 있어 매핑을 정해야 했다.
--      이 메뉴는 대신 연결할 화면이 없으므로 지운다.
-- ③ 메뉴 행과 즐겨찾기에는 감사 표가 없다. 되돌리는 원본과 그 한계는 authorization-cutover-runbook.md 의
--    '마이페이지 관리 메뉴 퇴역(V2_125)' 절을 따른다(적용 직전 백업, 적용 전에 남긴 출력). 배정은 이 변경의 REMOVE
--    이력으로 되살린다.
-- 반복 시드는 이 메뉴를 다시 만들지 않는다 — R__zz_seed_base_admin 은 메뉴가 하나도 없는 신규 base 에만 910~920 을
-- 넣고, R__seed_framework·R__seed_demo 는 메뉴를 넣지 않는다.
-- plcy_ver_no 는 적용 시점 권한 원장 버전(PermissionCodes.CATALOG_VERSION)이다. 이 변경은 원장을 바꾸지 않는다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 판정과 반영 사이에 메뉴·배정·즐겨찾기가 바뀌지 않게 쓰기만 막는다(읽기는 계속된다). 잠금 순서는 앱과 같다(메뉴 → 권한).
LOCK TABLE tb_menu_info, tb_authrt_grnt_map, tb_authrt_chg_hstry, tb_bkmk_menu_mng_rslt IN SHARE ROW EXCLUSIVE MODE;

WITH retired_menu AS (
    SELECT menu.menu_sn
      FROM tb_menu_info menu
     WHERE menu.menu_sn = 2030100
       AND menu.modern_route = '/admin/workspace/my-page'
       AND menu.use_yn = 'N'
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
SELECT 'migration:2.125', '2b7eac07ccdf5c02a41091659f36fa8838266e4f9c6905c0484825cb37005991',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'NAVIGATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL, 'DEC-OPS-229: 마이페이지 관리 메뉴 퇴역', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed_grant;
