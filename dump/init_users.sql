-- ============================================================
-- E2E 테스트 DB 초기화: 유저 및 스키마 권한 설정
-- Supabase 덤프는 postgres 유저로 생성됐으나,
-- 로컬에서는 egov 유저를 사용하므로 권한을 부여합니다.
-- ============================================================

-- public 스키마에 대한 권한 부여
GRANT ALL ON SCHEMA public TO egov;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO egov;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO egov;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO egov;

-- 기본 권한 설정 (향후 생성될 객체에도 적용)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO egov;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO egov;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO egov;

-- search_path 설정
ALTER DATABASE egovdb SET search_path TO public;

-- webmaster 계정이 없는 경우 기본 데이터 확인
-- (Supabase 덤프에 이미 포함되어 있어야 함)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'nemplyrinfo') THEN
    RAISE NOTICE 'nemplyrinfo table found - webmaster user data should be present';
  ELSE
    RAISE WARNING 'nemplyrinfo table not found - check dump integrity';
  END IF;
END$$;
