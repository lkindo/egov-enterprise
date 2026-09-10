import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { BASE_SEED, buildPermissionArtifacts, generatePermissions } from './generate-permissions.mjs';

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
    assert.deepEqual(catalog.pagePermissions[route], ['POLL_READ_ALL']);
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

test('permission freshness and red contracts run through local verify, pre-push and required CI operational tests', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts['test:operational-contracts'].includes('"scripts/*.test.mjs"'));
  for (const file of ['scripts/verify.mjs', '.githooks/pre-push', '.github/workflows/ci.yml']) {
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').includes('npm run test:operational-contracts'), file);
  }
});
