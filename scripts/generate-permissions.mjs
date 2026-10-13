import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { COMPOSER_SELECTION_PATH, verifyProjectComposition } from './project-composer-recipe.mjs';
import { projectedPermissionCoverageErrors } from './reusable-permission-projection.mjs';
import { detectGeneratedComposition } from './composer-modules.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BASE_SEED = 'api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql';
/** 권한 생성기가 쓰는 파일(buildPermissionArtifacts 의 키와 같다 — 시험이 대조한다). */
export const PERMISSION_ARTIFACT_PATHS = Object.freeze([BASE_SEED,
  'business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java',
  'business-core/src/main/resources/authorization/permission-catalog.json',
  'business-core/src/main/resources/authorization/operation-bindings.json',
  'frontend/src/types/generated-permissions.ts']);
const BASE_BEGIN = '-- BEGIN GENERATED BASE OPERATION GRANTS';
const BASE_END = '-- END GENERATED BASE OPERATION GRANTS';

export function buildPermissionArtifacts(root = repoRoot) {
// Git may check text out as CRLF on Windows. Hash and emit the same LF bytes on every platform.
const catalogText = fs.readFileSync(path.join(root, 'config/governance/permission-catalog.json'), 'utf8').replace(/\r\n/g, '\n');
const catalog = JSON.parse(catalogText);
const policyText = fs.readFileSync(path.join(root, 'config/governance/authorization-policies.json'), 'utf8');
const policy = JSON.parse(policyText);
if (!Array.isArray(catalog.permissions) || !Array.isArray(policy.operationBindings)) {
  throw new Error('Permission source coverage must not collapse');
}
const codes = catalog.permissions.map(row => row.code);
if (codes.length !== new Set(codes).size || codes.some(code => !/^[A-Z][A-Z0-9_]{0,19}$/.test(code))) {
  throw new Error('Permission codes must be unique and fit the registered VARCHAR(20) domain');
}
const initialGrants = [];
let selectedPermissions;
// 생성물 표지(config/modules/presets.json 의 active, 11단계 C5). 생성물이면 구성 스냅숏이 반드시 있어야 한다 — 없으면 원본 권한
// 전체로 조용히 넓히지 않고 실패한다. 표지 판정은 lock 만 있고 표지가 없는 트리도 실패시킨다(detectGeneratedComposition).
const generated = detectGeneratedComposition(root);
const generatedProfile = generated.projection ? generated.profile : undefined;
if (generatedProfile) {
  // This immutable selection is bound by governance metadata and the source lock. Regeneration
  // rederives its scope rather than trusting an arbitrary list of requested permission codes.
  const selection = JSON.parse(fs.readFileSync(path.join(root, COMPOSER_SELECTION_PATH), 'utf8'));
  const composition = verifyProjectComposition(selection.composition, selection.catalog);
  if (composition.profile !== generatedProfile || composition.permissionCodes.some(code => !codes.includes(code))) {
    throw new Error('Permission seed must bind a valid composition and generated profile');
  }
  selectedPermissions = new Set(composition.permissionCodes);
  // [10단계 10b] 생성물은 권한 정의를 구성으로 투영했다(reusable-permission-projection.mjs). 원본 하한 대신 도출값과 정확히 비교한다 —
  // 카탈로그 = 구성 코드, 바인딩 핸들러 소스가 생성물에 있음, 하네스 census 가 있으면 그 수와 같음.
  const coverage = projectedPermissionCoverageErrors(root, { catalog, bindings: policy.operationBindings, permissionCodes: composition.permissionCodes });
  if (coverage.length) throw new Error(`Projected permission coverage does not match the composition: ${coverage.join('; ')}`);
} else if (catalog.permissions.length < 200 || policy.operationBindings.length < 350) {
  throw new Error('Permission source coverage must not collapse');
}
for (const row of catalog.permissions) {
  if (!Array.isArray(row.defaultGroups) || new Set(row.defaultGroups).size !== row.defaultGroups.length
      || row.defaultGroups.some(group => !['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER'].includes(group))) {
    throw new Error(`Invalid initial group grant: ${row.code}`);
  }
  if (!selectedPermissions || selectedPermissions.has(row.code)) {
    for (const group of row.defaultGroups) initialGrants.push(`        ('${group}', '${row.code}')`);
  }
}
const baseText = fs.readFileSync(path.join(root, BASE_SEED), 'utf8').replace(/\r\n/g, '\n');
if (baseText.split(BASE_BEGIN).length !== 2 || baseText.split(BASE_END).length !== 2
    || baseText.indexOf(BASE_BEGIN) > baseText.indexOf(BASE_END)) {
  throw new Error('Base operation grant markers must occur exactly once in order');
}
const base = baseText.slice(0, baseText.indexOf(BASE_BEGIN) + BASE_BEGIN.length)
  + '\n' + initialGrants.join(',\n') + '\n' + baseText.slice(baseText.indexOf(BASE_END));
const endpoints = new Set();
for (const row of policy.operationBindings) {
  const key = `${row.method} ${row.path}`;
  if (endpoints.has(key) || !row.handler || !row.path?.startsWith('/')
      || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE'].includes(row.method)
      || !['PUBLIC', 'AUTHENTICATED', 'PERMISSION', 'DENY'].includes(row.access)) throw new Error(`Invalid binding: ${key}`);
  endpoints.add(key);
  if (row.access === 'PERMISSION' ? !codes.includes(row.permission) : row.permission != null) throw new Error(`Unknown permission or invalid access: ${key}`);
}
for (const [route, required] of Object.entries(catalog.pagePermissions)) {
  if (!Array.isArray(required) || required.some(code => !codes.includes(code))
      || new Set(required).size !== required.length) throw new Error(`Unknown page permission: ${route}`);
}
const pageModes = catalog.pagePermissionModes ?? {};
if (!pageModes || typeof pageModes !== 'object' || Array.isArray(pageModes)) throw new Error('Invalid page permission modes');
for (const [route, mode] of Object.entries(pageModes)) {
  if (!Object.hasOwn(catalog.pagePermissions, route) || catalog.pagePermissions[route].length === 0
      || !['ANY', 'ALL'].includes(mode)) throw new Error(`Invalid page permission mode: ${route}`);
}
const version = createHash('sha256').update(catalogText).update(JSON.stringify(policy.operationBindings)).digest('hex');
const java = `package nuri.business.security.authorization;\n\n/** Generated by scripts/generate-permissions.mjs. */\npublic final class PermissionCodes {\n    private PermissionCodes() {}\n    public static final String CATALOG_VERSION = "${version}";\n${codes.map(c => `    public static final String ${c} = "${c}";`).join('\n')}\n    public static final java.util.Set<String> ALL = java.util.Set.of(\n${codes.map(c => `            ${c}`).join(',\n')});\n}\n`;
const ts = `// Generated by scripts/generate-permissions.mjs. Do not edit.\nexport const PERMISSION_CODES = ${JSON.stringify(codes, null, 2)} as const;\nexport type PermissionCode = (typeof PERMISSION_CODES)[number];\nexport const PERMISSION_CATALOG_VERSION = ${JSON.stringify(version)};\nexport const PAGE_PERMISSIONS: Readonly<Record<string, readonly PermissionCode[]>> = ${JSON.stringify(catalog.pagePermissions, null, 2)};\nexport const PAGE_PERMISSION_MODES: Readonly<Record<string, 'ANY' | 'ALL'>> = ${JSON.stringify(pageModes, null, 2)};\n`;
return {
  [BASE_SEED]: base,
  'business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java': java,
  'business-core/src/main/resources/authorization/permission-catalog.json': catalogText,
  'business-core/src/main/resources/authorization/operation-bindings.json': JSON.stringify(policy.operationBindings, null, 2) + '\n',
  'frontend/src/types/generated-permissions.ts': ts,
};
}

export function generatePermissions(root = repoRoot, check = false) {
const files = buildPermissionArtifacts(root);
for (const [name, content] of Object.entries(files)) {
  const target = path.join(root, name);
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') !== content.replace(/\r\n/g, '\n')) throw new Error(`Generated permission artifact is stale: ${name}`);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
return Object.keys(files);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const files = generatePermissions(repoRoot, process.argv.includes('--check'));
  console.log(`Permission contract: ${files.length} generated artifacts verified`);
}
