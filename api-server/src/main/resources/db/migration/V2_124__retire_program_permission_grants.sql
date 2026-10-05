-- 2026-10-04 프로그램 목록 퇴역 — 화면 관리의 '이전 프로그램' 탭과 프로그램 API 를 걷으며 권한 코드
-- PROGRAM_CREATE·DELETE·READ·UPDATE 를 원장에서 뺀다. 데이터만 바꾼다. 구조 변경은 없다. 다시 실행해도 결과가 같다.
-- tb_prgrm_lst 와 tb_menu_info.prgrm_file_nm·fk_tb_menu_info_tb_prgrm_lst 는 남긴다(지우는 일은 다음 릴리스의 별도 승인).
--
-- ① 가드: 이 변경으로 기동 때 경로(modern_route)를 채울 수 없게 되는 사용 중 말단 메뉴가 있으면 멈춘다(V2_95 선례).
--    앱은 기동할 때 경로가 빈 메뉴에 경로를 채운다. 종전에는 파일명 추정(MenuService.inferModernRoute)이 실패하면
--    프로그램 원장 URL 의 레거시 접두 7종(/uss/olh/qna/ 등, 걷은 inferFromLegacyUrl)으로 한 번 더 추정했다. 앱이 원장을
--    읽지 않게 되며 이 두 번째 추정만 사라진다 — 화면 이동은 종전에도 원장 URL 을 쓰지 않았다(프런트는 경로가 없으면 .do
--    chkURL 만 받고, 서버는 .do 를 내보내지 않았다). 그래서 가드는 '파일명으로는 추정되지 않고 원장 URL 접두로만 경로를
--    얻던' 메뉴만 센다. 파일명으로 추정되는 메뉴는 앱이 계속 경로를 채우고, 사용하지 않거나 하위가 있는 메뉴와 이미 경로가
--    있는 메뉴는 잃는 것이 없다. 종전 앱이 한 번이라도 기동했던 DB 에서는 그 뒤 직접 넣은 메뉴만 해당한다.
--    2026-10-04 OCI 읽기: tb_prgrm_lst 0행이라 해당 메뉴 0개.
--    복구: 오류에 적힌 menu_sn 의 modern_route 에 화면 경로를 넣고 다시 배포한다(authorization-cutover-runbook.md 의
--    '프로그램 목록 퇴역(V2_124)' 절).
-- ② 기존 DB 의 PROGRAM_* 기능 권한 배정을 지운다. 남기면 권한 스냅샷이 원장에 없는 코드를 만나 fail-closed 로 실패해
--    그 그룹 구성원의 인증이 막히고(AuthorizationSnapshotService), 권한 관리 화면이 그룹의 전체 배정을 저장할 때
--    '알 수 없는 기능 권한' 으로 거부한다(V2_104 선례). 2026-10-04 OCI 읽기: ROLE_ADMIN·ROLE_SYSTEM × 4 = 8행.
--    지운 배정마다 같은 트랜잭션에서 변경 이력(REMOVE)을 남긴다(ADR-0016). V2_99 스냅샷은 고치지 않는다.
--    화면 관리의 진입 권한은 MENU_READ 로 옮겼다. MENU_READ 를 묵시로 주지 않는다(H3) — OCI 에서 PROGRAM_READ 를 가진
--    그룹은 모두 MENU_READ 도 가진다.
-- plcy_ver_no 는 이 변경을 반영한 권한 원장 버전(PermissionCodes.CATALOG_VERSION)이다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 판정과 반영 사이에 메뉴·배정이 바뀌지 않게 쓰기만 막는다(읽기는 계속된다). 잠금 순서는 앱과 같다(메뉴 → 권한).
LOCK TABLE tb_menu_info, tb_authrt_grnt_map, tb_authrt_chg_hstry IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
    stranded text;
BEGIN
    SELECT string_agg(menu.menu_sn::text || ':' || menu.prgrm_file_nm, ', ' ORDER BY menu.menu_sn)
      INTO stranded
      FROM tb_menu_info menu
      JOIN tb_prgrm_lst program ON program.prgrm_file_nm = menu.prgrm_file_nm
     WHERE menu.use_yn = 'Y'
       AND nullif(btrim(menu.modern_route), '') IS NULL
       AND NOT EXISTS (SELECT 1 FROM tb_menu_info child WHERE child.up_menu_sn = menu.menu_sn)
       -- 앱이 계속 하는 파일명 추정(MenuService.inferModernRoute 의 부분 일치 목록)으로 경로를 얻는 메뉴는 뺀다.
       AND menu.prgrm_file_nm !~ '(BoardManage|BBSMaster|CmmCode|GroupList|RoleList|AuthorGroup|QustnrManage|QustnrTmplat|AdbkList|FaqList|CnsltList|MainImage|FileMng|ProgramList|MenuCreat|MenuList)'
       -- 걷은 원장 URL 추정(inferFromLegacyUrl)이 경로를 주던 접두 7종만 남긴다.
       AND program.url ~ '(/uss/olh/qna/|/uss/olh/faq/|/sec/gmt/|/sec/ram/|/sym/ccm/|/uss/olp/qtm/|/uss/olp/qmc/)';
    IF stranded IS NOT NULL THEN
        RAISE EXCEPTION 'Leaf menus without modern_route got their route only from a retired program URL: %', stranded
            USING HINT = 'Set modern_route for each listed menu_sn (menu_sn:prgrm_file_nm), then redeploy. '
                || 'See docs/04-operations/authorization-cutover-runbook.md, section V2_124.';
    END IF;
END $$;

WITH removed AS (
    DELETE FROM tb_authrt_grnt_map
     WHERE authrt_type_cd = 'OPERATION'
       AND authrt_grnt_cd IN ('PROGRAM_CREATE', 'PROGRAM_DELETE', 'PROGRAM_READ', 'PROGRAM_UPDATE')
    RETURNING authrt_cd, authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'migration:2.124', '2b7eac07ccdf5c02a41091659f36fa8838266e4f9c6905c0484825cb37005991',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'OPERATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL, 'DEC-OPS-224: 프로그램 목록 퇴역', 'SYSTEM', CURRENT_TIMESTAMP
  FROM removed;
