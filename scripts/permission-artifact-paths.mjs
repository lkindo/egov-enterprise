export const BASE_SEED = 'api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql';
export const PERMISSION_BUNDLES_PATH = 'config/governance/permission-bundles.json';
/** 권한 생성기가 쓰는 파일(buildPermissionArtifacts 의 키와 같다 — 시험이 대조한다). */
export const PERMISSION_ARTIFACT_PATHS = Object.freeze([BASE_SEED,
  'business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java',
  'business-core/src/main/resources/authorization/permission-catalog.json',
  'business-core/src/main/resources/authorization/operation-bindings.json',
  'frontend/src/types/generated-permissions.ts']);
