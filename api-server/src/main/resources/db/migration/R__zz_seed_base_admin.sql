-- ============================================================================
-- R__zz_seed_base_admin.sql — 생성 base 의 day-1 관리자 부트스트랩 (멱등·프로필-안전)
-- ============================================================================
-- [왜 필요한가 — 파일 수준 실측 2026-08-23]
--   reusable-base DB 번들 생성기(scripts/generate-reusable-base-db.mjs)는 V1_0 baseline 을
--   `pg_dump --schema-only` 로 만들고, 데이터는 V1_1(표준용어)과 R__seed_framework
--   (역할 2건·webmaster·EFC 분류)만 남긴다. 그래서 versioned 체인이 심은 데이터 전부가
--   생성 base 에서 소실된다:
--     · V2_2  — tb_menu_info 메뉴 트리, tb_menu_crt_dtl 권한 매핑, tb_authrt_info, tb_com_cd
--     · V2_3  — tb_role_hierarchy (ROLE_SYSTEM > ROLE_ADMIN > ROLE_USER)
--     · V2_11 — tb_prgrm_lst URL 인가 레지스트리, tb_role_prgrm_map, tb_authrt_role_map
--   그 상태로 부팅하면 관리자가 로그인해도 두 겹으로 잠긴다:
--     1) DbUrlAuthorizationManager 는 fail-closed 라 tb_prgrm_lst/tb_role_prgrm_map 이 비면
--        secure-paths(/api/v1/admin/** 등) 전체를 ROLE_ADMIN 에게도 403 으로 거부한다.
--     2) tb_menu_info 가 비어 GET /api/v1/menus 가 빈 트리를 반환 — 내비게이션이 없다.
--
-- [프로필-안전 원칙]
--   이 repeatable 은 모든 환경(제품 풀시드 포함)에서 실행되지만, 콘텐츠 블록은 대상 테이블이
--   "비어 있을 때만" 시드한다. 풀시드 DB(V2 체인)는 해당 테이블이 이미 채워져 있으므로
--   전 블록이 no-op 이다 — 데모 시드·운영 데이터에 어떤 행도 추가·변경하지 않는다.
--   마스터 행(권한/역할/계층)은 V2_2·V2_3·V2_11 과 동일 값의 멱등 INSERT 라 의미 변화가 없다.
--   (계약: api-server/src/test/java/nuri/api/schema/BaseAdminBootstrapSeedIntegrationTest)
--
-- [명명] repeatable 은 description 알파벳순으로 실행된다. zz 접두는 seed_demo →
--   seed_framework 뒤의 실행을 보장한다(dev 전용 R__zz_seed_dev_credentials 보다는 앞:
--   'zz_seed_b' < 'zz_seed_d').
--
-- [경로 계약] 아래 modern_route 는 core pack 잔존 화면만 가리킨다 —
--   config/reusable-base-profiles.json 의 demo removePaths 에 걸리면 계약 테스트가 red 다.

DO $$
DECLARE
    fresh_programs boolean;
    fresh_menus    boolean;
BEGIN
    -- ── 1. 권한/역할 마스터 (V2_2·V2_3·V2_11 값 미러 — 멱등, 인가 의미 불변) ──────────
    INSERT INTO tb_authrt_info (authrt_cd, authrt_nm, crt_dt) VALUES
        ('ROLE_ADMIN',  '관리자 권한',  NOW()),
        ('ROLE_SYSTEM', '시스템 권한',  NOW()),
        ('ROLE_USER',   '사용자 권한',  NOW())
    ON CONFLICT (authrt_cd) DO NOTHING;

    -- R__seed_framework 는 ROLE_ADMIN/ROLE_USER 만 시드한다. ROLE_SYSTEM 은 V2_11 소유라
    -- 생성 base 에서 소실되므로 여기서 보증한다(tb_role_prgrm_map FK 대상).
    INSERT INTO tb_role_info (role_id, role_nm, role_expln, role_crt_ymd) VALUES
        ('ROLE_SYSTEM', '최상위 시스템', '시스템 최고 관리자 역할', CURRENT_DATE)
    ON CONFLICT (role_id) DO NOTHING;

    INSERT INTO tb_authrt_role_map (authrt_cd, role_cd, crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id) VALUES
        ('ROLE_ADMIN',  'ROLE_ADMIN',  NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
        ('ROLE_SYSTEM', 'ROLE_SYSTEM', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
        ('ROLE_USER',   'ROLE_USER',   NOW(), NOW(), 'SYSTEM', 'SYSTEM')
    ON CONFLICT (authrt_cd, role_cd) DO NOTHING;

    -- tb_role_hierarchy 는 V2_3 에서 생성된다. 이른 target 으로 migrate 하는 스키마 검증이
    -- repeatable 을 실행해도 죽지 않도록 존재 확인 뒤에만 시드한다(미실행 분기는 plan 되지 않음).
    IF to_regclass('public.tb_role_hierarchy') IS NOT NULL THEN
        INSERT INTO tb_role_hierarchy (higher_authrt, lower_authrt, frst_rgtr_id) VALUES
            ('ROLE_SYSTEM', 'ROLE_ADMIN', 'SYSTEM'),
            ('ROLE_ADMIN',  'ROLE_USER',  'SYSTEM')
        ON CONFLICT (higher_authrt, lower_authrt) DO NOTHING;
    END IF;

    -- ── 2. URL 인가 anchor — 신규 base(tb_prgrm_lst 공백)에서만 ─────────────────────
    -- DbUrlAuthorizationManager 의 fail-closed 를 푸는 최소 매핑이다. V2_11 의
    -- ADMIN_ALL/ACTUATOR_ALL 과 동일 URL·동일 롤(ROLE_ADMIN/ROLE_SYSTEM)만 부여한다 —
    -- 별칭 경로(V2_84 에서 제거된 부류)는 재도입하지 않는다(H3: 최소 권한 보존).
    SELECT NOT EXISTS (SELECT 1 FROM tb_prgrm_lst) INTO fresh_programs;
    IF fresh_programs AND to_regclass('public.tb_role_prgrm_map') IS NOT NULL THEN
        INSERT INTO tb_prgrm_lst
            (prgrm_file_nm, prgrm_korn_nm, url, prgrm_strg_path, prgrm_expln, crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id)
        VALUES
            ('ADMIN_ALL',    '관리자 전체',    '/api/v1/admin/**', '/api/v1/admin', 'URL 인가: 관리자 전용 API 전체 (base bootstrap)', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
            ('ACTUATOR_ALL', 'Actuator 전체', '/actuator/**',     '/actuator',     'URL 인가: 시스템 모니터링 전체 (base bootstrap)', NOW(), NOW(), 'SYSTEM', 'SYSTEM')
        ON CONFLICT (prgrm_file_nm) DO NOTHING;

        INSERT INTO tb_role_prgrm_map (role_id, prgrm_file_nm) VALUES
            ('ROLE_ADMIN',  'ADMIN_ALL'),
            ('ROLE_SYSTEM', 'ADMIN_ALL'),
            ('ROLE_ADMIN',  'ACTUATOR_ALL'),
            ('ROLE_SYSTEM', 'ACTUATOR_ALL')
        ON CONFLICT (role_id, prgrm_file_nm) DO NOTHING;
    END IF;

    -- ── 3. 최소 관리자 메뉴 트리 — 신규 base(tb_menu_info 공백)에서만 ────────────────
    -- 모든 modern_route 는 core pack 잔존 화면이다(백엔드: foundation/business-core 소유).
    SELECT NOT EXISTS (SELECT 1 FROM tb_menu_info) INTO fresh_menus;
    IF fresh_menus THEN
        INSERT INTO tb_menu_info
            (menu_sn, up_menu_sn, menu_ordr, menu_nm, prgrm_file_nm, menu_expln, modern_route, use_yn, del_yn, frst_rgtr_id, crt_dt)
        VALUES
            (910, NULL, 1,  '시스템 관리 센터',   'dir', 'base 부트스트랩 관리자 메뉴', '/admin/user/manage',               'Y', 'N', 'SYSTEM', NOW()),
            (911, 910,  1,  '사용자 관리',        NULL,  NULL,                          '/admin/user/manage',               'Y', 'N', 'SYSTEM', NOW()),
            (912, 910,  2,  '부서 및 조직 관리',  NULL,  NULL,                          '/admin/user/departments',          'Y', 'N', 'SYSTEM', NOW()),
            (913, 910,  3,  '권한(보안) 정책 관리', NULL, NULL,                         '/admin/security/authority',        'Y', 'N', 'SYSTEM', NOW()),
            (914, 910,  4,  '롤 관리',            NULL,  NULL,                          '/admin/security/role',             'Y', 'N', 'SYSTEM', NOW()),
            (915, 910,  5,  '그룹 관리',          NULL,  NULL,                          '/admin/security/group',            'Y', 'N', 'SYSTEM', NOW()),
            (916, 910,  6,  '메뉴 관리',          NULL,  NULL,                          '/admin/system/menus',              'Y', 'N', 'SYSTEM', NOW()),
            (917, 910,  7,  '권한별 메뉴 관리',    NULL,  NULL,                          '/admin/system/menus/by-authority', 'Y', 'N', 'SYSTEM', NOW()),
            (918, 910,  8,  '프로그램 관리',      NULL,  NULL,                          '/admin/system/programs',           'Y', 'N', 'SYSTEM', NOW()),
            (919, 910,  9,  '공통코드 관리',      NULL,  NULL,                          '/admin/system/common-code',        'Y', 'N', 'SYSTEM', NOW()),
            (920, 910,  10, '로그 및 감사',       NULL,  NULL,                          '/admin/system/logs',               'Y', 'N', 'SYSTEM', NOW())
        ON CONFLICT (menu_sn) DO NOTHING;

        -- ROLE_ADMIN 전용 매핑 — V2_36 이 확정한 "관리 메뉴에 ROLE_USER 미부여" 의미를 따른다.
        INSERT INTO tb_menu_crt_dtl (menu_sn, authrt_cd, mapng_crt_id, crt_dt)
        SELECT m.menu_sn, 'ROLE_ADMIN', 'SYSTEM', NOW()
          FROM tb_menu_info m
         WHERE m.menu_sn BETWEEN 910 AND 920
        ON CONFLICT (menu_sn, authrt_cd) DO NOTHING;

        -- 명시 번호 시드 뒤 IDENTITY 채번 충돌 방지 (V2_76 과 동일한 규율)
        PERFORM setval('sq_menu_sn', (SELECT max(menu_sn) FROM tb_menu_info), true);
    END IF;
END $$;
