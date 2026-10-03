-- 2026-10-03 사용자 지시("따로 판단이 필요한 부분도 해결해줘야지") — 관리 콘솔 후속.
-- 데이터만 바꾼다. 구조 변경은 없다. 다시 실행해도 결과가 같다.
--
-- [무엇이 문제인가] ROLE_USER 에 '관리 센터'(9000000) 아래 '설문·투표 관리'(2010000)와 그 하위
-- 2010300·2010400·2010500·2010600 의 메뉴 배정(NAVIGATION)이 있다. 이 메뉴들이 여는 /admin/survey/hub 의 진입 권한은
-- SURVEY_READ_ALL 또는 SURVEY_RSP_READ 인데 ROLE_USER 에는 둘 다 없다. 메뉴는 보이지만 누르면 들어갈 수 없다.
-- 이 배정은 V2_98 이 옛 역할-메뉴 매핑을 그대로 옮기고 V2_100 이 새 분류에 맞춰 남긴 것이다.
-- 2026-10-03 OCI 읽기: 위 다섯 메뉴와 9000000 의 ROLE_USER 배정이 있고, 9000000 아래 다른 ROLE_USER 배정은 없다.
-- 참여 메뉴(2010800 투표 참여·2010900 설문 참여)는 '참여' 분류 아래라 이 변경과 무관하다.
--
-- ① 다섯 메뉴의 ROLE_USER 배정을 지운다. 다음은 남긴다.
--    · ROLE_USER 가 진입 권한(SURVEY_READ_ALL·SURVEY_RSP_READ) 중 하나라도 가지면 정당한 배정이므로 모두 남긴다.
--    · 경로가 /admin/survey/hub 가 아닌 메뉴(관리자가 다른 화면으로 바꾼 메뉴)는 남긴다.
--    · 메뉴 노출과 진입은 사용자가 속한 모든 그룹의 합집합으로 정해진다(MenuService·MenuRepositoryImpl).
--      ROLE_USER 구성원 가운데 다른 그룹으로 진입 권한을 받은 사람이 있고, 그 사람의 ROLE_USER 밖 그룹에 그 메뉴의
--      배정이 없으면 ROLE_USER 배정이 그 사람에게 유일한 노출 근거다. 그 메뉴는 남긴다. 판정은 지금 구성원 기준이다 —
--      이 변경 뒤 새로 진입 권한 그룹을 받는 사람의 메뉴는 그 그룹의 메뉴 배정으로 준다.
--    · 그렇게 남는 배정이 하위에 있는 메뉴는 남긴다. 메뉴 트리는 상위 배정이 없는 하위를 그리지 않으므로(MenuService)
--      상위를 지우면 남긴 메뉴가 사라진다.
-- ② ①이 9000000 아래에서 배정을 지웠고, 그 뒤 ROLE_USER 의 9000000 하위(전체 깊이)에 남은 배정이 없으면
--    9000000 배정도 지운다 — 하위 없이 분류만 남은 배정이다. 9000000 에 화면 경로가 있으면 빈 분류가 아니므로 남긴다.
--    ①의 구성원 조건이 9000000 에도 걸리면 남긴다(다른 그룹으로 받은 설문 메뉴의 상위다). ①이 비우지 않은 분류는 건드리지 않는다.
-- 지운 배정마다 같은 트랜잭션에서 변경 이력(REMOVE)을 남긴다(ADR-0016). 다른 그룹의 배정은 건드리지 않는다.
-- 재사용 base(V1 번들)는 ROLE_USER 메뉴 배정을 만들지 않는다(R__zz_seed_base_admin 은 ROLE_ADMIN 배정만 넣는다).
-- plcy_ver_no 는 적용 시점 권한 원장 버전(PermissionCodes.CATALOG_VERSION)이다. 이 변경은 원장을 바꾸지 않는다.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- 판정과 반영 사이에 메뉴·배정·구성원이 바뀌지 않게 쓰기만 막는다(읽기는 계속된다).
LOCK TABLE tb_menu_info, tb_authrt_grnt_map, tb_authrt_user_map, tb_authrt_chg_hstry IN SHARE ROW EXCLUSIVE MODE;

WITH RECURSIVE descendant(ancestor_sn, menu_sn) AS (
    SELECT menu.up_menu_sn, menu.menu_sn FROM tb_menu_info menu WHERE menu.up_menu_sn IS NOT NULL
    UNION
    SELECT descendant.ancestor_sn, child.menu_sn
      FROM descendant
      JOIN tb_menu_info child ON child.up_menu_sn = descendant.menu_sn
),
user_navigation AS (
    SELECT grant_row.authrt_grnt_cd AS menu_code
      FROM tb_authrt_grnt_map grant_row
     WHERE grant_row.authrt_cd = 'ROLE_USER'
       AND grant_row.authrt_type_cd = 'NAVIGATION'
),
-- ROLE_USER 구성원 가운데 어느 그룹으로든 설문 관리 화면에 들어갈 수 있는 사람.
entering_member AS (
    SELECT user_member.scrty_dcsn_trgt_id AS member_id
      FROM tb_authrt_user_map user_member
     WHERE user_member.authrt_cd = 'ROLE_USER'
       AND EXISTS (SELECT 1 FROM tb_authrt_user_map membership
                     JOIN tb_authrt_grnt_map entry ON entry.authrt_cd = membership.authrt_cd
                    WHERE membership.scrty_dcsn_trgt_id = user_member.scrty_dcsn_trgt_id
                      AND entry.authrt_type_cd = 'OPERATION'
                      AND entry.authrt_grnt_cd IN ('SURVEY_READ_ALL', 'SURVEY_RSP_READ'))
),
-- 그 사람에게 ROLE_USER 배정이 유일한 노출 근거인 메뉴(ROLE_USER 밖의 자기 그룹에는 배정이 없다).
member_dependent AS (
    SELECT DISTINCT navigation.menu_code
      FROM entering_member
      CROSS JOIN user_navigation navigation
     WHERE NOT EXISTS (SELECT 1 FROM tb_authrt_user_map other
                         JOIN tb_authrt_grnt_map other_navigation ON other_navigation.authrt_cd = other.authrt_cd
                        WHERE other.scrty_dcsn_trgt_id = entering_member.member_id
                          AND other.authrt_cd <> 'ROLE_USER'
                          AND other_navigation.authrt_type_cd = 'NAVIGATION'
                          AND other_navigation.authrt_grnt_cd = navigation.menu_code)
),
candidate AS (
    SELECT menu.menu_sn
      FROM tb_menu_info menu
      JOIN user_navigation navigation ON navigation.menu_code = menu.menu_sn::text
     WHERE menu.menu_sn IN (2010000, 2010300, 2010400, 2010500, 2010600)
       AND split_part(menu.modern_route, '?', 1) = '/admin/survey/hub'
       AND NOT EXISTS (SELECT 1 FROM tb_authrt_grnt_map entry
                        WHERE entry.authrt_cd = 'ROLE_USER'
                          AND entry.authrt_type_cd = 'OPERATION'
                          AND entry.authrt_grnt_cd IN ('SURVEY_READ_ALL', 'SURVEY_RSP_READ'))
       AND menu.menu_sn::text NOT IN (SELECT menu_code FROM member_dependent)
),
retired_survey AS (
    SELECT candidate.menu_sn
      FROM candidate
     WHERE NOT EXISTS (SELECT 1 FROM descendant
                         JOIN user_navigation kept ON kept.menu_code = descendant.menu_sn::text
                        WHERE descendant.ancestor_sn = candidate.menu_sn
                          AND descendant.menu_sn NOT IN (SELECT menu_sn FROM candidate))
),
retired_category AS (
    SELECT category.menu_sn
      FROM tb_menu_info category
      JOIN user_navigation navigation ON navigation.menu_code = category.menu_sn::text
     WHERE category.menu_sn = 9000000
       AND nullif(btrim(category.modern_route), '') IS NULL
       AND category.menu_sn::text NOT IN (SELECT menu_code FROM member_dependent)
       AND EXISTS (SELECT 1 FROM retired_survey
                     JOIN descendant ON descendant.menu_sn = retired_survey.menu_sn
                    WHERE descendant.ancestor_sn = category.menu_sn)
       AND NOT EXISTS (SELECT 1 FROM descendant
                         JOIN user_navigation kept ON kept.menu_code = descendant.menu_sn::text
                        WHERE descendant.ancestor_sn = category.menu_sn
                          AND descendant.menu_sn NOT IN (SELECT menu_sn FROM retired_survey))
),
removed AS (
    DELETE FROM tb_authrt_grnt_map grant_row
     WHERE grant_row.authrt_cd = 'ROLE_USER'
       AND grant_row.authrt_type_cd = 'NAVIGATION'
       AND grant_row.authrt_grnt_cd IN (SELECT menu_sn::text FROM retired_survey
                                        UNION ALL
                                        SELECT menu_sn::text FROM retired_category)
    RETURNING grant_row.authrt_cd, grant_row.authrt_grnt_cd
)
INSERT INTO tb_authrt_chg_hstry(dmnd_idntfr, plcy_ver_no, chg_trgt_type_cd, chg_type_cd, authrt_cd,
    authrt_type_cd, authrt_grnt_cd, chg_artcl_nm, chg_bfr_cn, chg_aftr_cn, chg_rsn, frst_rgtr_id, crt_dt)
SELECT 'migration:2.120', 'cb031191bae483aa9abf2f8c10de9e5b2f47821fc1a57e51184e5b7ed54a2c87',
       'GROUP_GRANT', 'REMOVE', authrt_cd, 'NAVIGATION', authrt_grnt_cd,
       'grant', authrt_grnt_cd, NULL,
       CASE authrt_grnt_cd
           WHEN '9000000' THEN '하위 메뉴 배정이 남지 않은 관리 센터 분류 배정 회수'
           ELSE '진입 권한(SURVEY_READ_ALL·SURVEY_RSP_READ) 없는 설문·투표 관리 메뉴 배정 회수'
       END,
       'SYSTEM', CURRENT_TIMESTAMP
  FROM removed;
