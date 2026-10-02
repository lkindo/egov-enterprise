-- 2026-10-02 사용자 사전 승인("DB 데이터 변경(메뉴명 개명, 이전 프로그램 정리)도 알아서 해") — 관리 콘솔 UX 3단계 G3b.
-- 데이터만 바꾼다. 구조 변경은 없다. 두 문장 모두 다시 실행해도 결과가 같다.
--
-- ① 메뉴명 개명: /admin/system/programs 는 메뉴가 가리키는 앱 화면 목록과 이전 프로그램 원장을 함께 보는 화면이 됐다.
--    메뉴 이름을 '프로그램 관리' 에서 '화면 관리' 로 바꾼다. 경로와 이름이 모두 시드 값 그대로인 행만 바꾸고,
--    관리자가 이미 다른 이름으로 바꾼 메뉴는 건드리지 않는다. 2026-10-02 OCI 읽기: 9010230 한 행.
--
-- ② 이전 프로그램 정리: tb_prgrm_lst 는 구 URL 인가 서술자 원장이다. 인가는 ADR-0016 이후 코드의 기능 권한이 판정하고,
--    메뉴는 화면 경로(modern_route)로 연결한다. 아래 목록만 지운다.
--    · 시드 유래 URL 인가 서술자 17건 — V2_11 이 넣고 V2_23·V2_40·V2_41·V2_84 가 정리하고 남은 행이다.
--      URL 은 V2_99 가 tb_authrt_chg_hstry(legacy_policy:program_url)에 이미 보존했다.
--    · 자동 생성 프로그램 EgovBBSMaster — 2026-09-09 에 걷은 메뉴 자동 등록 코드가 만든 행이다.
--      그 코드가 남긴 표지(저장 경로 '/auto-generated', 이름 '자동생성메뉴(…)')가 모두 있을 때만 지운다.
--      같은 이름을 도입 기관이 직접 등록했으면 표지가 없으므로 남는다.
--    어떤 메뉴라도 참조하는 행은 남긴다(fk_tb_menu_info_tb_prgrm_lst). 목록 밖 프로그램(도입 기관 등록분)은 건드리지 않는다.
--    구 역할-프로그램 매핑 표는 V2_100 이 요구하는 인가 Contract 에서 이미 사라졌으므로 다른 참조는 없다.
--    2026-10-02 OCI 읽기: tb_prgrm_lst 18행이 모두 이 목록이고 메뉴 참조는 0건이다(행 목록은 PR·결정 기록에 남긴다).
--    지운 행을 보관하는 감사 표는 없다. 되돌릴 때의 원본은 적용 직전 pg_dump 백업이다. 백업이 없으면 시드 17건은
--    V2_11 의 행에 V2_35 의 설명 정정을 반영한 값(커밋 b91157ade 의 config/project-composer-menus.json programs 17행과 같다)으로,
--    EgovBBSMaster 는 PR·결정 기록에 남긴 OCI 행 값으로 넣는다. V2_11 의 행을 그대로 넣으면 설명이 정정 전 값이 된다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 판정과 반영 사이에 메뉴·프로그램이 바뀌지 않게 쓰기만 막는다(읽기는 계속된다).
LOCK TABLE tb_menu_info, tb_prgrm_lst IN SHARE ROW EXCLUSIVE MODE;

UPDATE tb_menu_info
   SET menu_nm = '화면 관리',
       last_mdfr_id = 'SYSTEM',
       mdfcn_dt = CURRENT_TIMESTAMP
 WHERE modern_route = '/admin/system/programs'
   AND menu_nm = '프로그램 관리';

DELETE FROM tb_prgrm_lst program
 WHERE (program.prgrm_file_nm IN (
            'ACTUATOR_ALL', 'ADMIN_ALL',
            'ADMIN_DEPT_ALL', 'ADMIN_DEPT_AUTH_ALL',
            'ADMIN_HELP_ALIAS', 'ADMIN_HELP_ALL', 'ADMIN_SURVEY_ALL',
            'ADMIN_USER_BULK_DEL', 'ADMIN_USER_CREATE', 'ADMIN_USER_DELETE', 'ADMIN_USER_DEPT',
            'ADMIN_USER_DETAIL', 'ADMIN_USER_LIST', 'ADMIN_USER_PWD', 'ADMIN_USER_ROLE',
            'ADMIN_USER_STATUS', 'ADMIN_USER_UPDATE')
        OR (program.prgrm_file_nm = 'EgovBBSMaster'
            AND program.prgrm_strg_path = '/auto-generated'
            AND program.prgrm_korn_nm LIKE '자동생성메뉴(%'))
   AND NOT EXISTS (SELECT 1 FROM tb_menu_info menu WHERE menu.prgrm_file_nm = program.prgrm_file_nm);
