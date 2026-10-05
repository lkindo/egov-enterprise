-- 2026-10-05 사용자 승인("승인할테니 진행할 부분 다 진행") — 프로그램 원장 참조 퇴역의 Expand 단계(GAP-PROGRAM-001).
-- 데이터만 바꾼다. 구조 변경은 없다. 다시 실행해도 결과가 같다(채울 행이 없으면 아무것도 하지 않는다).
--
-- [왜 필요한가] 앱은 이 변경부터 tb_menu_info.prgrm_file_nm 을 매핑하지 않는다. 종전 앱은 기동할 때마다 경로(modern_route)가
-- NULL 인 메뉴에 그 레거시 파일명으로 추정한 경로를 채웠다(MenuService.migrateModernRoutes·inferModernRoute). 그 일을 이
-- 마이그레이션이 한 번 한다. 앱보다 먼저 실행되므로(Flyway → JPA) 새 앱이 뜰 때는 추정할 수 있는 경로가 모두 채워져 있다.
-- 컬럼·외래 키·tb_prgrm_lst 를 지우는 Contract 는 이 Expand 가 실린 릴리스를 7일 관측한 뒤 별도 마이그레이션으로 한다
-- (ZDM 린터의 expandRelease 규칙).
--
-- 규칙은 종전 Java 와 같다.
--  · 대상: modern_route 가 NULL 인 메뉴(사용 여부·하위 여부와 무관). 빈 문자열('')은 관리자가 경로를 비운 것이므로 채우지
--    않는다 — 앱이 경로를 비울 때 NULL 이 아니라 빈 문자열을 저장하는 이유가 이것이다(Menu.replaceProperties).
--  · 추정: 파일명에 아래 이름이 들어 있으면(대소문자 구분, 부분 일치) 그 경로다. 위에서부터 처음 맞는 것을 쓴다
--    (예: BoardManage 를 BBSMaster 보다, MenuCreat 를 MenuList 보다 먼저 본다). 맞는 것이 없으면 채우지 않는다.
--  · 감사 열: 종전 기동 보정과 같이 수정 일시는 지금, 수정자는 SYSTEM 이다(기동 때는 인증 주체가 없었다).
--
-- [바뀌는 응답] 경로가 없는 메뉴의 chkURL 은 종전에 파일명으로 추정하지 못하면 '/' 였고 이제 '#' 이다(MenuService.calculateUrl).
-- 화면은 경로가 없으면 chkURL 로 이동하지 않으므로(resolveMenuInternalRoute) 사용자가 보는 동작은 같다.
-- 2026-10-05 OCI 읽기: tb_prgrm_lst 0행이라 외래 키 때문에 모든 메뉴의 prgrm_file_nm 이 NULL — 채울 행 0개.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 판정과 반영 사이에 메뉴가 바뀌지 않게 쓰기만 막는다(읽기는 계속된다).
LOCK TABLE tb_menu_info IN SHARE ROW EXCLUSIVE MODE;

WITH inferred AS (
    SELECT menu.menu_sn,
           CASE
               WHEN strpos(menu.prgrm_file_nm, 'BoardManage') > 0 THEN '/admin/community/boards'
               WHEN strpos(menu.prgrm_file_nm, 'BBSMaster') > 0 THEN '/admin/community'
               WHEN strpos(menu.prgrm_file_nm, 'CmmCode') > 0 THEN '/admin/system/common-code'
               WHEN strpos(menu.prgrm_file_nm, 'GroupList') > 0 THEN '/admin/security/group'
               WHEN strpos(menu.prgrm_file_nm, 'RoleList') > 0 THEN '/admin/security/role'
               WHEN strpos(menu.prgrm_file_nm, 'AuthorGroup') > 0 THEN '/admin/security/authority'
               WHEN strpos(menu.prgrm_file_nm, 'QustnrManage') > 0 THEN '/admin/survey/manage'
               WHEN strpos(menu.prgrm_file_nm, 'QustnrTmplat') > 0 THEN '/admin/survey/templates'
               WHEN strpos(menu.prgrm_file_nm, 'AdbkList') > 0 THEN '/admin/collaboration/address-book'
               WHEN strpos(menu.prgrm_file_nm, 'FaqList') > 0 THEN '/admin/help/faq'
               WHEN strpos(menu.prgrm_file_nm, 'CnsltList') > 0 THEN '/admin/help/qna'
               WHEN strpos(menu.prgrm_file_nm, 'MainImage') > 0 THEN '/admin/system/banner'
               WHEN strpos(menu.prgrm_file_nm, 'FileMng') > 0 THEN '/admin/system/files'
               WHEN strpos(menu.prgrm_file_nm, 'ProgramList') > 0 THEN '/admin/system/programs'
               WHEN strpos(menu.prgrm_file_nm, 'MenuCreat') > 0 THEN '/admin/system/menus/by-authority'
               WHEN strpos(menu.prgrm_file_nm, 'MenuList') > 0 THEN '/admin/system/menus'
           END AS route
      FROM tb_menu_info menu
     WHERE menu.modern_route IS NULL
       AND menu.prgrm_file_nm IS NOT NULL
)
UPDATE tb_menu_info menu
   SET modern_route = inferred.route,
       mdfcn_dt = CURRENT_TIMESTAMP,
       last_mdfr_id = 'SYSTEM'
  FROM inferred
 WHERE menu.menu_sn = inferred.menu_sn
   AND inferred.route IS NOT NULL;
