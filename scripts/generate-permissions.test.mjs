import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { BASE_SEED, buildPermissionArtifacts, generatePermissions } from './generate-permissions.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { COMPOSER_SELECTION_PATH, resolveProjectRecipe } from './project-composer-recipe.mjs';
import { HARNESS_PROFILE_PATH, bindingHandlerSource, projectPermissionCatalog } from './reusable-permission-projection.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = 'config/governance/permission-catalog.json';
const policyPath = 'config/governance/authorization-policies.json';

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-permission-contract-'));
  t.after(() => {
    assert.equal(path.dirname(path.resolve(dir)), path.resolve(os.tmpdir()));
    assert.ok(path.basename(dir).startsWith('egov-permission-contract-'));
    fs.rmSync(dir, { recursive: true, force: true });
  });
  for (const file of [catalogPath, policyPath, BASE_SEED]) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(dir, file));
  }
  return dir;
}

function mutate(dir, file, change) {
  const target = path.join(dir, file);
  const parsed = JSON.parse(fs.readFileSync(target, 'utf8'));
  change(parsed);
  fs.writeFileSync(target, JSON.stringify(parsed));
}

test('reviewed permission sources exactly match runtime, frontend and fresh-base grant artifacts', () => {
  const files = generatePermissions(root, true);
  assert.equal(files.length, 5);
  assert.ok(files.includes(BASE_SEED));
  assert.ok(files.includes('frontend/src/types/generated-permissions.ts'));
  assert.ok(files.includes('business-core/src/main/resources/authorization/operation-bindings.json'));
});

test('LF and CRLF checkouts produce identical versions and artifacts', t => {
  const dir = fixture(t);
  for (const file of [catalogPath, policyPath, BASE_SEED]) {
    const target = path.join(dir, file);
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n'));
  }
  const lf = buildPermissionArtifacts(dir);
  generatePermissions(dir);
  for (const file of [catalogPath, policyPath, BASE_SEED]) {
    const target = path.join(dir, file);
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace(/\r?\n/g, '\r\n'));
  }
  assert.deepEqual(buildPermissionArtifacts(dir), lf);
  assert.doesNotThrow(() => generatePermissions(dir, true));
});

test('administrative statistics and workflow pages preserve their distinct access boundaries', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(root, catalogPath), 'utf8'));
  const policy = JSON.parse(fs.readFileSync(path.join(root, policyPath), 'utf8'));
  for (const code of ['STATS_ADMIN_READ', 'WORKFLOW_READ', 'BANNER_ADMIN_READ', 'POPUP_ADMIN_READ',
    'INFORMAL_APPR_ADMIN', 'DASHBOARD_ADMIN_READ', 'POLL_CREATE', 'POLL_UPDATE', 'POLL_DELETE']) {
    assert.deepEqual(catalog.permissions.find(row => row.code === code)?.defaultGroups, ['ROLE_ADMIN', 'ROLE_SYSTEM']);
  }
  for (const code of ['STATS_READ', 'APPROVAL_READ', 'POLL_READ', 'POLL_VOTE']) {
    assert.ok(catalog.permissions.find(row => row.code === code)?.defaultGroups.includes('ROLE_USER'));
  }
  const adminStats = policy.operationBindings.filter(row => row.path.startsWith('/api/v1/admin/system/statistics/'));
  assert.deepEqual(adminStats.map(row => row.path.split('/').at(-1)).sort(), ['bbs', 'connect', 'data-usage', 'report', 'summary', 'user']);
  assert.ok(adminStats.every(row => row.method === 'GET' && row.permission === 'STATS_ADMIN_READ'));
  assert.equal(policy.operationBindings.find(row => row.path === '/api/v1/statistics/connect')?.permission, 'STATS_READ');
  for (const [route, codes] of Object.entries(catalog.pagePermissions)) {
    if (route === '/admin/stats' || route.startsWith('/admin/stats/')) assert.deepEqual(codes, ['STATS_ADMIN_READ']);
  }
  for (const route of ['/admin/workflow', '/admin/sanctn/workflow']) {
    assert.deepEqual(catalog.pagePermissions[route], ['WORKFLOW_READ']);
  }
  assert.deepEqual(catalog.pagePermissions['/admin'], ['DASHBOARD_ADMIN_READ']);
  for (const route of ['/admin/survey/polls', '/admin/survey/polls/manage']) {
    assert.deepEqual(catalog.pagePermissions[route], ['POLL_READ', 'POLL_READ_ALL']);
    assert.equal(catalog.pagePermissionModes[route], 'ALL');
  }
  const ordinary = new Set(catalog.permissions.filter(row => row.defaultGroups.includes('ROLE_USER')).map(row => row.code));
  const administrative = policy.operationBindings.filter(row => row.path.startsWith('/api/v1/admin/'));
  assert.ok(administrative.length > 200);
  for (const binding of administrative) {
    assert.equal(binding.access, 'PERMISSION', binding.path);
    assert.equal(ordinary.has(binding.permission), false, binding.path);
  }
});

test('source mutation changes the shared version and stale or missing artifacts fail closed', t => {
  const dir = fixture(t);
  const before = buildPermissionArtifacts(dir);
  generatePermissions(dir);
  assert.doesNotThrow(() => generatePermissions(dir, true));
  mutate(dir, catalogPath, c => { c.permissions[0].name += ' reviewed'; });
  const after = buildPermissionArtifacts(dir);
  assert.notEqual(before['frontend/src/types/generated-permissions.ts'], after['frontend/src/types/generated-permissions.ts']);
  assert.notEqual(before['business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java'],
    after['business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java']);
  assert.throws(() => generatePermissions(dir, true), /stale/);
  generatePermissions(dir);
  fs.unlinkSync(path.join(dir, 'frontend/src/types/generated-permissions.ts'));
  assert.throws(() => generatePermissions(dir, true), /stale/);
});

test('duplicate, unknown, overlong and empty permission or endpoint sources are red', t => {
  const cases = [
    [catalogPath, c => c.permissions.push(c.permissions[0]), /unique/],
    [catalogPath, c => { c.permissions[0].code = 'X'.repeat(21); }, /VARCHAR/],
    [catalogPath, c => { c.permissions = []; }, /coverage/],
    [catalogPath, c => { c.permissions[0].defaultGroups = ['UNREVIEWED_GROUP']; }, /Invalid initial group/],
    [policyPath, p => { p.operationBindings = []; }, /coverage/],
    [policyPath, p => p.operationBindings.push(p.operationBindings[0]), /Invalid binding/],
    [policyPath, p => { p.operationBindings[0].access = 'UNKNOWN'; }, /Invalid binding/],
    [policyPath, p => { p.operationBindings[0].method = 'ANY'; }, /Invalid binding/],
    [policyPath, p => { const r = p.operationBindings.find(r => r.access === 'PERMISSION'); r.permission = 'UNKNOWN'; }, /Unknown permission/],
    [policyPath, p => { const r = p.operationBindings.find(r => r.access === 'PUBLIC'); r.permission = 'UNKNOWN'; }, /Unknown permission/],
    [catalogPath, c => { c.pagePermissions['/probe'] = ['UNKNOWN']; }, /Unknown page permission/],
    [catalogPath, c => { c.pagePermissionModes['/probe'] = 'ALL'; }, /Invalid page permission mode/],
    [catalogPath, c => { c.pagePermissionModes['/admin/survey/polls'] = 'UNKNOWN'; }, /Invalid page permission mode/],
    [catalogPath, c => { c.pagePermissions['/admin/survey/polls'] = []; }, /Invalid page permission mode/],
  ];
  for (const [file, change, expected] of cases) {
    const dir = fixture(t);
    assert.doesNotThrow(() => buildPermissionArtifacts(dir));
    mutate(dir, file, change);
    assert.throws(() => buildPermissionArtifacts(dir), expected);
  }
});

test('fresh-base grant projection preserves surrounding SQL and rejects missing markers', t => {
  const dir = fixture(t);
  const source = fs.readFileSync(path.join(dir, BASE_SEED), 'utf8').replace(/\r\n/g, '\n');
  const expected = buildPermissionArtifacts(dir)[BASE_SEED];
  const begin = '-- BEGIN GENERATED BASE OPERATION GRANTS';
  const end = '-- END GENERATED BASE OPERATION GRANTS';
  assert.equal(expected.slice(0, expected.indexOf(begin)), source.slice(0, source.indexOf(begin)));
  assert.equal(expected.slice(expected.indexOf(end)), source.slice(source.indexOf(end)));
  const catalog = JSON.parse(fs.readFileSync(path.join(dir, catalogPath), 'utf8'));
  const pairs = catalog.permissions.flatMap(row => row.defaultGroups.map(group => `${group}|${row.code}`));
  const actual = [...expected.slice(expected.indexOf(begin), expected.indexOf(end))
    .matchAll(/\('([^']+)', '([^']+)'\)/g)].map(([, group, code]) => `${group}|${code}`);
  assert.deepEqual(actual, pairs);
  fs.writeFileSync(path.join(dir, BASE_SEED), source.replace(begin, '-- removed marker'));
  assert.throws(() => buildPermissionArtifacts(dir), /markers/);
});

/*
 * 생성물 모사: 카탈로그는 구성 코드와 그 코드만 요구하는 page 로, 인가 원장은 구성 밖 권한을 요구하지 않는 바인딩으로 줄이고, 남는
 * 바인딩의 핸들러 소스 자리를 빈 파일로 둔다(권한 투영 — reusable-permission-projection.mjs 가 생성기에서 하는 일의 모양).
 */
function projectedFixture(t, composition, { stubAllHandlers = false } = {}) {
  const dir = fixture(t);
  const codes = new Set(composition.permissionCodes);
  const sourceCatalog = JSON.parse(fs.readFileSync(path.join(root, catalogPath), 'utf8'));
  const sourcePolicy = JSON.parse(fs.readFileSync(path.join(root, policyPath), 'utf8'));
  const routes = new Set(Object.entries(sourceCatalog.pagePermissions).filter(([, required]) => required.every(code => codes.has(code)))
    .map(([route]) => route));
  const projectedCatalog = projectPermissionCatalog(sourceCatalog, { permissionCodes: composition.permissionCodes, routes }).catalog;
  const keptBindings = sourcePolicy.operationBindings.filter(row => row.access !== 'PERMISSION' || codes.has(row.permission));
  const write = (file, value) => {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), typeof value === 'string' ? value : JSON.stringify(value));
  };
  for (const row of stubAllHandlers ? sourcePolicy.operationBindings : keptBindings) {
    const source = bindingHandlerSource(row.handler, file => fs.existsSync(path.join(root, file)));
    if (source) write(source, '');
  }
  write(catalogPath, projectedCatalog);
  write(policyPath, { ...sourcePolicy, operationBindings: keptBindings });
  write('config/reusable-base-profiles.json', { sourcePolicy: { generatedProfile: composition.profile } });
  write(COMPOSER_SELECTION_PATH, { catalog: loadProjectComposerCatalog(root), composition });
  return { dir, write, sourceCatalog, sourcePolicy, projectedCatalog, keptBindings };
}

test('composition bootstrap regeneration retains exactly selected grants for custom and preset recipes', t => {
  const catalog = loadProjectComposerCatalog(root);
  for (const selection of [{ domains: ['survey'] }, { preset: 'core' }]) {
    const composition = resolveProjectRecipe({ schemaVersion: 1, project: { name: 'permission-probe' }, sourceRef: 'v1.0.0', selection }, catalog);
    const { dir, write } = projectedFixture(t, composition);
    const baseline = buildPermissionArtifacts(dir);
    const block = baseline[BASE_SEED].split('-- BEGIN GENERATED BASE OPERATION GRANTS')[1].split('-- END GENERATED BASE OPERATION GRANTS')[0];
    const permissions = JSON.parse(fs.readFileSync(path.join(root, catalogPath), 'utf8')).permissions;
    const expected = permissions.filter(row => composition.permissionCodes.includes(row.code))
      .flatMap(row => row.defaultGroups.map(group => `${group}|${row.code}`));
    const actual = [...block.matchAll(/\('([^']+)', '([^']+)'\)/g)].map(([, group, code]) => `${group}|${code}`);
    assert.deepEqual(actual, expected);
    assert.ok(!actual.some(row => row.endsWith('|MAIL_SEND')));
    // [10단계 10b] 코드 상수(Java·TS)도 구성 코드뿐이다.
    const java = baseline['business-core/src/main/java/nuri/business/security/authorization/PermissionCodes.java'];
    assert.doesNotMatch(java, /MAIL_SEND/);
    assert.match(java, /USER_READ/);
    assert.doesNotMatch(baseline['frontend/src/types/generated-permissions.ts'], /"MAIL_SEND"/);
    generatePermissions(dir);
    assert.doesNotThrow(() => generatePermissions(dir, true));
    const tampered = structuredClone(composition);
    tampered.permissionCodes.push('MAIL_SEND');
    write(COMPOSER_SELECTION_PATH, { catalog, composition: tampered });
    assert.throws(() => buildPermissionArtifacts(dir), /does not match/);
    if (composition.profile === 'custom') {
      fs.unlinkSync(path.join(dir, COMPOSER_SELECTION_PATH));
      assert.throws(() => buildPermissionArtifacts(dir), /ENOENT/);
    }
  }
});

/*
 * [10단계 10b] 생성물은 원본 하한(권한 200·바인딩 350) 대신 도출값과 정확히 비교한다. 카탈로그와 바인딩 가운데 하나만 줄이거나, 지워진
 * 핸들러의 바인딩을 남기거나, 하네스 census 와 수가 다르면 권한 생성기가 멈춘다(원본은 종전 하한 그대로다).
 */
test('a projected product compares the permission catalog and bindings with derived values instead of the source floors', t => {
  const composition = resolveProjectRecipe({ schemaVersion: 1, project: { name: 'permission-probe' }, sourceRef: 'v1.0.0',
    selection: { preset: 'core' } }, loadProjectComposerCatalog(root));
  // 카탈로그만 줄이고 바인딩을 원본 그대로 두면(핸들러 소스는 모두 있게 해도) 남는 바인딩이 모르는 권한을 요구한다.
  const catalogOnly = projectedFixture(t, composition, { stubAllHandlers: true });
  catalogOnly.write(policyPath, catalogOnly.sourcePolicy);
  assert.throws(() => buildPermissionArtifacts(catalogOnly.dir), /Unknown permission or invalid access/, 'catalog-only projection');
  // 바인딩만 줄이고 카탈로그를 원본 그대로 두면 카탈로그가 구성 코드와 다르다.
  const bindingsOnly = projectedFixture(t, composition);
  bindingsOnly.write(catalogPath, bindingsOnly.sourceCatalog);
  assert.throws(() => buildPermissionArtifacts(bindingsOnly.dir), /projected permission catalog differs from the composition codes: extra \[[A-Z_, ]*MAIL_SEND/,
    'bindings-only projection');
  // 핸들러 소스가 지워진 바인딩이 원장에 남으면 실패한다.
  const stale = projectedFixture(t, composition);
  const removedHandler = stale.sourcePolicy.operationBindings.find(row => row.handler.includes('.MailApiController#'));
  stale.write(policyPath, { ...stale.sourcePolicy, operationBindings: [...stale.keptBindings, { ...removedHandler, access: 'AUTHENTICATED', permission: null }] });
  assert.throws(() => buildPermissionArtifacts(stale.dir), /operation binding handler has no source: nuri\.api\.controller\.business\.mail\.MailApiController#/u,
    'stale binding of a removed handler');
  // 하네스 census 가 있으면 수가 같아야 하고, 키가 없으면 실패한다.
  const counted = projectedFixture(t, composition);
  const census = { permissionCatalog: counted.projectedCatalog.permissions.length, operationBindings: counted.keptBindings.length };
  counted.write(HARNESS_PROFILE_PATH, { census });
  assert.doesNotThrow(() => buildPermissionArtifacts(counted.dir));
  counted.write(HARNESS_PROFILE_PATH, { census: { ...census, operationBindings: census.operationBindings + 1 } });
  assert.throws(() => buildPermissionArtifacts(counted.dir), /projected operationBindings \d+ differs from the reusable harness census/, 'census count mismatch');
  counted.write(HARNESS_PROFILE_PATH, { census: { operationBindings: census.operationBindings } });
  assert.throws(() => buildPermissionArtifacts(counted.dir), /reusable harness census does not declare permissionCatalog/, 'census key missing');
  // 원본(구성 스냅숏 없음)은 종전 하한을 지킨다.
  const source = fixture(t);
  mutate(source, catalogPath, value => { value.permissions = value.permissions.slice(0, 199); });
  assert.throws(() => buildPermissionArtifacts(source), /Permission source coverage must not collapse/);
});

test('permission freshness and red contracts run through local verify, pre-push and required CI operational tests', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['test:operational-contracts'].includes('"scripts/*.test.mjs"'));
  for (const file of ['scripts/verify.mjs', '.githooks/pre-push', '.github/workflows/ci.yml']) {
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('npm run test:operational-contracts'), file);
  }
});
