-- ============================================================================
-- V2_11 : RBAC 인가 사슬 시드 — 하드코딩 규칙의 DB 미러링
-- ============================================================================
-- 목적: 현재 코드에 하드코딩된 인가 규칙(URL 인가 + @PreAuthorize)을
--       DB 테이블에 그대로 미러링하여, Phase 2에서 DB 기반 인가로 전환할 기반 마련.
--
-- 영향: 이 시점에서 런타임 동작에 영향 없음 (데이터 삽입만, 런타임 미사용).
-- 원칙: 모든 INSERT는 ON CONFLICT DO NOTHING (멱등).
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. 신규 테이블: tb_role_prgrm_map (역할↔프로그램 매핑)
-- ─────────────────────────────────────────────────────────────────────────────
-- eGov 프레임워크에서 롤(역할)이 어떤 프로그램(URL)에 접근할 수 있는지를 매핑.
-- tb_prgrm_lst.prgrm_file_nm → tb_role_info.role_id 의 N:M 관계를 표현.

CREATE TABLE IF NOT EXISTS public.tb_role_prgrm_map (
    role_id        character varying(30)  NOT NULL,
    prgrm_file_nm  character varying(100) NOT NULL,
    crt_dt         timestamp without time zone DEFAULT NOW(),
    mdfcn_dt       timestamp without time zone DEFAULT NOW(),
    frst_rgtr_id   character varying(20)  DEFAULT 'system',
    last_mdfr_id   character varying(20)  DEFAULT 'system',
    CONSTRAINT pk_tb_role_prgrm_map PRIMARY KEY (role_id, prgrm_file_nm)
);

COMMENT ON TABLE  public.tb_role_prgrm_map              IS '역할프로그램매핑 (tb_role_prgrm_map)';
COMMENT ON COLUMN public.tb_role_prgrm_map.role_id       IS '역할아이디 (role_id)';
COMMENT ON COLUMN public.tb_role_prgrm_map.prgrm_file_nm IS '프로그램파일명 (prgrm_file_nm)';
COMMENT ON COLUMN public.tb_role_prgrm_map.crt_dt        IS '생성일시 (crt_dt)';
COMMENT ON COLUMN public.tb_role_prgrm_map.mdfcn_dt      IS '수정일시 (mdfcn_dt)';
COMMENT ON COLUMN public.tb_role_prgrm_map.frst_rgtr_id  IS '최초등록자아이디 (frst_rgtr_id)';
COMMENT ON COLUMN public.tb_role_prgrm_map.last_mdfr_id  IS '최종수정자아이디 (last_mdfr_id)';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1.2 마스터 데이터 보증 (ROLE_SYSTEM 등 부재 시 추가)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.tb_authrt_info (authrt_cd, authrt_nm, crt_dt)
VALUES
    ('ROLE_ADMIN',  '관리자 권한',  NOW()),
    ('ROLE_SYSTEM', '시스템 권한',  NOW()),
    ('ROLE_USER',   '사용자 권한',  NOW())
ON CONFLICT (authrt_cd) DO NOTHING;

INSERT INTO public.tb_role_info (role_id, role_nm, role_patrn, role_expln, role_type_cd, role_sort, crt_dt)
VALUES
    ('ROLE_ADMIN',  '시스템 관리자',  '/**', '시스템 관리자 역할',  'URL', 1, NOW()),
    ('ROLE_SYSTEM', '최상위 시스템',  '/**', '시스템 최고 관리자 역할', 'URL', 2, NOW()),
    ('ROLE_USER',   '일반 사용자',   '/**', '일반 사용자 역할',   'URL', 3, NOW())
ON CONFLICT (role_id) DO NOTHING;

-- FK: role_id → tb_role_info(role_id)
-- [명명 정정 2026-07-17, 사용자 승인] fk_role_prgrm_map_role → fk_tb_role_prgrm_map_tb_role_info
-- (헌법 제6조 fk_[자식]_[부모] 정합). flyway history 미등재 상태에서 라이브 RENAME CONSTRAINT 와
-- 원자 시행 — pending 실행 시 가드가 신명칭을 감지하여 중복 생성 없음.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_role_prgrm_map_tb_role_info') THEN
    ALTER TABLE public.tb_role_prgrm_map
      ADD CONSTRAINT fk_tb_role_prgrm_map_tb_role_info
      FOREIGN KEY (role_id) REFERENCES public.tb_role_info(role_id);
  END IF;
END $$;

-- FK: prgrm_file_nm → tb_prgrm_lst(prgrm_file_nm) — 위와 동일한 명명 정정 적용
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tb_role_prgrm_map_tb_prgrm_lst') THEN
    ALTER TABLE public.tb_role_prgrm_map
      ADD CONSTRAINT fk_tb_role_prgrm_map_tb_prgrm_lst
      FOREIGN KEY (prgrm_file_nm) REFERENCES public.tb_prgrm_lst(prgrm_file_nm);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. tb_authrt_role_map 시드: 권한 ↔ 롤 매핑
-- ─────────────────────────────────────────────────────────────────────────────
-- 현재 코드에서 사용하는 인가 체계:
--   ROLE_ADMIN  → 관리자
--   ROLE_SYSTEM → 시스템 (ROLE_SYSTEM > ROLE_ADMIN 상속은 tb_role_hierarchy에서 이미 정의)
--   ROLE_USER   → 일반 사용자

INSERT INTO public.tb_authrt_role_map (authrt_cd, role_cd, crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id)
VALUES
    ('ROLE_ADMIN',  'ROLE_ADMIN',  NOW(), NOW(), 'system', 'system'),
    ('ROLE_SYSTEM', 'ROLE_SYSTEM', NOW(), NOW(), 'system', 'system'),
    ('ROLE_USER',   'ROLE_USER',   NOW(), NOW(), 'system', 'system')
ON CONFLICT (authrt_cd, role_cd) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. tb_prgrm_lst 시드: 보호 대상 프로그램(URL 패턴) 레지스트리
-- ─────────────────────────────────────────────────────────────────────────────
-- 인벤토리 기반으로 모든 보호 URL 패턴을 등록한다.
-- prgrm_file_nm 은 URL 패턴의 고유 식별자(slug)로 사용.

INSERT INTO public.tb_prgrm_lst (prgrm_file_nm, prgrm_korn_nm, url, prgrm_strg_path, prgrm_expln, crt_dt, mdfcn_dt, frst_rgtr_id, last_mdfr_id)
VALUES
    -- URL 인가 (ApiSecurityConfig)
    ('ADMIN_ALL',           '관리자 전체',        '/api/v1/admin/**',    '/api/v1/admin',    'URL 인가: 관리자 전용 API 전체',     NOW(), NOW(), 'system', 'system'),
    ('ACTUATOR_ALL',        'Actuator 전체',     '/actuator/**',        '/actuator',        'URL 인가: 시스템 모니터링 전체',     NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - UserApiController (hasRole ADMIN)
    ('ADMIN_USER_LIST',     '사용자 목록 조회',    '/api/v1/admin/system/users',           '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_DETAIL',   '사용자 상세 조회',    '/api/v1/admin/system/users/{userId}',  '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_CREATE',   '사용자 등록',        '/api/v1/admin/system/users',           '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_UPDATE',   '사용자 수정',        '/api/v1/admin/system/users/{userId}',  '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_DELETE',   '사용자 삭제',        '/api/v1/admin/system/users/{userId}',  '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_BULK_DEL', '사용자 다중 삭제',    '/api/v1/admin/system/users',           '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_PWD',      '비밀번호 강제 변경',  '/api/v1/admin/system/users/{userId}/password', '/api/v1/admin/system/users', '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_STATUS',   '사용자 상태 일괄 변경', '/api/v1/admin/system/users/status',  '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_DEPT',     '사용자 부서 일괄 이동', '/api/v1/admin/system/users/dept',    '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    ('ADMIN_USER_ROLE',     '사용자 권한 일괄 변경', '/api/v1/admin/system/users/role',    '/api/v1/admin/system/users',           '@PreAuthorize: hasRole(ADMIN)',  NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - DeptApiController (hasRole ADMIN, 클래스 레벨)
    ('ADMIN_DEPT_ALL',      '부서 관리 전체',      '/api/v1/admin/system/departments/**', '/api/v1/admin/system/departments',     '@PreAuthorize: hasRole(ADMIN) 클래스', NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - DeptAuthorityApiController (hasRole ADMIN, 클래스 레벨)
    ('ADMIN_DEPT_AUTH_ALL', '부서별 권한 관리 전체', '/api/v1/admin/system/dept-authorities/**', '/api/v1/admin/system/dept-authorities', '@PreAuthorize: hasRole(ADMIN) 클래스', NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - SurveyApiController (hasAnyRole ADMIN,SYSTEM, 클래스 레벨)
    ('ADMIN_SURVEY_ALL',    '설문 관리 전체',      '/api/v1/admin/system/surveys/**',     '/api/v1/admin/system/surveys',         '@PreAuthorize: hasAnyRole(ADMIN,SYSTEM) 클래스', NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - LeaderScheduleApiController (hasAnyRole ADMIN,SYSTEM)
    ('ADMIN_LSM_ALL',       '간부일정 관리 전체',   '/api/v1/admin/lsm/**',               '/api/v1/admin/lsm',                   '@PreAuthorize: hasAnyRole(ADMIN,SYSTEM)', NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - MainImageApiController (hasAnyRole ADMIN,SYSTEM)
    ('ADMIN_IMAGE_ALL',     '메인이미지 관리 전체', '/api/v1/admin/images/**',             '/api/v1/admin/images',                '@PreAuthorize: hasAnyRole(ADMIN,SYSTEM)', NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - HelpApiController (hasAnyRole ADMIN,SYSTEM)
    ('ADMIN_HELP_ALL',      '도움말 관리 전체',     '/api/v1/admin/help/**',              '/api/v1/admin/help',                  '@PreAuthorize: hasAnyRole(ADMIN,SYSTEM)', NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - FaqApiController (hasAnyRole ADMIN,SYSTEM)
    ('ADMIN_FAQ_ALL',       'FAQ 관리 전체',       '/api/v1/admin/faq/**',               '/api/v1/admin/faq',                   '@PreAuthorize: hasAnyRole(ADMIN,SYSTEM)', NOW(), NOW(), 'system', 'system'),
    -- @PreAuthorize - RestdeApiController (hasAnyRole ADMIN,SYSTEM)
    ('ADMIN_RESTDE_ALL',    '공휴일 관리 전체',     '/api/v1/admin/restde/**',            '/api/v1/admin/restde',                '@PreAuthorize: hasAnyRole(ADMIN,SYSTEM)', NOW(), NOW(), 'system', 'system'),
    -- [보안 강화] 비-admin 별칭 경로들 (메서드 권한 제거에 대응하는 URL 가드)
    ('ADMIN_SURVEY_ALIAS',  '설문 관리 별칭',      '/api/v1/surveys/**',                 '/api/v1/surveys',                     '별칭 경로: 설문 관리 전체',          NOW(), NOW(), 'system', 'system'),
    ('ADMIN_LSM_ALIAS',     '간부일정 관리 별칭',   '/api/v1/leader-schedules/**',         '/api/v1/leader-schedules',             '별칭 경로: 간부일정 관리 전체',      NOW(), NOW(), 'system', 'system'),
    ('ADMIN_IMAGE_ALIAS',   '메인이미지 관리 별칭', '/api/v1/main-images/**',             '/api/v1/main-images',                 '별칭 경로: 메인이미지 관리 전체',    NOW(), NOW(), 'system', 'system'),
    ('ADMIN_HELP_ALIAS',    '도움말 관리 별칭',     '/api/v1/help/**',                    '/api/v1/help',                        '별칭 경로: 도움말 관리 전체',        NOW(), NOW(), 'system', 'system'),
    ('ADMIN_FAQ_ALIAS',     'FAQ 관리 별칭',       '/api/v1/faqs/**',                    '/api/v1/faqs',                        '별칭 경로: FAQ 관리 전체',           NOW(), NOW(), 'system', 'system'),
    ('ADMIN_RESTDE_ALIAS',  '공휴일 관리 별칭',     '/api/v1/calendar/holidays/**',       '/api/v1/calendar/holidays',           '별칭 경로: 공휴일 관리 전체',        NOW(), NOW(), 'system', 'system')
ON CONFLICT (prgrm_file_nm) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. tb_role_prgrm_map 시드: 롤 ↔ 프로그램 매핑
-- ─────────────────────────────────────────────────────────────────────────────
-- 현재 하드코딩 규칙을 정확히 미러링한다. 새 권한을 넣지 않는다(최소권한).
-- hasRole('ADMIN') → ROLE_ADMIN, ROLE_SYSTEM (계층 상속 포함)
-- hasAnyRole('ADMIN','SYSTEM') → ROLE_ADMIN, ROLE_SYSTEM

INSERT INTO public.tb_role_prgrm_map (role_id, prgrm_file_nm)
VALUES
    -- URL 인가 매핑
    ('ROLE_ADMIN',  'ADMIN_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_ALL'),
    ('ROLE_ADMIN',  'ACTUATOR_ALL'),
    ('ROLE_SYSTEM', 'ACTUATOR_ALL'),
    -- 별칭 경로 매핑
    ('ROLE_ADMIN',  'ADMIN_SURVEY_ALIAS'),
    ('ROLE_SYSTEM', 'ADMIN_SURVEY_ALIAS'),
    ('ROLE_ADMIN',  'ADMIN_LSM_ALIAS'),
    ('ROLE_SYSTEM', 'ADMIN_LSM_ALIAS'),
    ('ROLE_ADMIN',  'ADMIN_IMAGE_ALIAS'),
    ('ROLE_SYSTEM', 'ADMIN_IMAGE_ALIAS'),
    ('ROLE_ADMIN',  'ADMIN_HELP_ALIAS'),
    ('ROLE_SYSTEM', 'ADMIN_HELP_ALIAS'),
    ('ROLE_ADMIN',  'ADMIN_FAQ_ALIAS'),
    ('ROLE_SYSTEM', 'ADMIN_FAQ_ALIAS'),
    ('ROLE_ADMIN',  'ADMIN_RESTDE_ALIAS'),
    ('ROLE_SYSTEM', 'ADMIN_RESTDE_ALIAS'),
    -- UserApiController (hasRole ADMIN → 계층 포함 ADMIN + SYSTEM)
    ('ROLE_ADMIN',  'ADMIN_USER_LIST'),
    ('ROLE_SYSTEM', 'ADMIN_USER_LIST'),
    ('ROLE_ADMIN',  'ADMIN_USER_DETAIL'),
    ('ROLE_SYSTEM', 'ADMIN_USER_DETAIL'),
    ('ROLE_ADMIN',  'ADMIN_USER_CREATE'),
    ('ROLE_SYSTEM', 'ADMIN_USER_CREATE'),
    ('ROLE_ADMIN',  'ADMIN_USER_UPDATE'),
    ('ROLE_SYSTEM', 'ADMIN_USER_UPDATE'),
    ('ROLE_ADMIN',  'ADMIN_USER_DELETE'),
    ('ROLE_SYSTEM', 'ADMIN_USER_DELETE'),
    ('ROLE_ADMIN',  'ADMIN_USER_BULK_DEL'),
    ('ROLE_SYSTEM', 'ADMIN_USER_BULK_DEL'),
    ('ROLE_ADMIN',  'ADMIN_USER_PWD'),
    ('ROLE_SYSTEM', 'ADMIN_USER_PWD'),
    ('ROLE_ADMIN',  'ADMIN_USER_STATUS'),
    ('ROLE_SYSTEM', 'ADMIN_USER_STATUS'),
    ('ROLE_ADMIN',  'ADMIN_USER_DEPT'),
    ('ROLE_SYSTEM', 'ADMIN_USER_DEPT'),
    ('ROLE_ADMIN',  'ADMIN_USER_ROLE'),
    ('ROLE_SYSTEM', 'ADMIN_USER_ROLE'),
    -- DeptApiController (hasRole ADMIN)
    ('ROLE_ADMIN',  'ADMIN_DEPT_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_DEPT_ALL'),
    -- DeptAuthorityApiController (hasRole ADMIN)
    ('ROLE_ADMIN',  'ADMIN_DEPT_AUTH_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_DEPT_AUTH_ALL'),
    -- SurveyApiController (hasAnyRole ADMIN,SYSTEM)
    ('ROLE_ADMIN',  'ADMIN_SURVEY_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_SURVEY_ALL'),
    -- LeaderScheduleApiController
    ('ROLE_ADMIN',  'ADMIN_LSM_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_LSM_ALL'),
    -- MainImageApiController
    ('ROLE_ADMIN',  'ADMIN_IMAGE_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_IMAGE_ALL'),
    -- HelpApiController
    ('ROLE_ADMIN',  'ADMIN_HELP_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_HELP_ALL'),
    -- FaqApiController
    ('ROLE_ADMIN',  'ADMIN_FAQ_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_FAQ_ALL'),
    -- RestdeApiController
    ('ROLE_ADMIN',  'ADMIN_RESTDE_ALL'),
    ('ROLE_SYSTEM', 'ADMIN_RESTDE_ALL')
ON CONFLICT (role_id, prgrm_file_nm) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 검증 쿼리 (마이그레이션 후 확인용, 실행 영향 없음)
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT count(*) FROM tb_authrt_role_map;    -- 예상: 3 (이상)
-- SELECT count(*) FROM tb_prgrm_lst;          -- 예상: 21 (이상)
-- SELECT count(*) FROM tb_role_prgrm_map;     -- 예상: 42
