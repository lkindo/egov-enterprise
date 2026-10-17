import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { DEEP_BLOCKER_LABELS, compositionDeepPlan, deepSummary, withoutRoot } from './project-composer-deep.mjs';
import { projectSourceTree } from './generate-reusable-base-source.mjs';
import { composerProfile } from './project-composer-source.mjs';
import { composerOwnership } from './composer-modules.mjs';
import { ComposerError } from './project-composer-errors.mjs';
import { expectedPageRoutes, readRouteRows, routeRowsFromLedger } from './reusable-page-survival.mjs';
import { assertRemovedGatesAcknowledged, removedGateAcknowledgement } from './reusable-source-gates.mjs';
import { planFrontendRemoval, pruneFrontend } from './reusable-source-frontend.mjs';
import { copySourceTree, normalize, walk } from './reusable-source-tree.mjs';
import { readPermissionSources } from './reusable-permission-projection.mjs';
import { readSourceApiContract } from './reusable-contract-projection.mjs';
import { root, catalog, modules, ownership, files, compose, atlasPaths, codes, quietly, memoizedRepositoryReader, readRepositorySource } from './project-composer-deep.test-helpers.mjs';

// 이 점검은 기억하는 읽기를 넘기지 않는다 — 정밀 점검의 기본 읽기(디스크) 경로도 계속 돈다.
test('a full product composition removes nothing and still reports a summary', () => {
  const deep = compositionDeepPlan({ root, catalog, composition: compose({ preset: 'demo' }), files });
  assert.deepEqual(deep.blockers, []);
  assert.deepEqual([deep.apiContract.removedOperations, deep.apiContract.removedSchemas, deep.apiContract.removedTags], [0, 0, 0]);
  assert.deepEqual({ java: deep.java.removedFiles, frontend: deep.frontend.removedFiles, gates: deep.removedGates }, { java: 0, frontend: 0, gates: [] });
  assert.equal(deepSummary(deep), '제거: Java 0개(연쇄 0) · 프런트 0개(연쇄 0) · 검증 게이트 0건');
  // 권한 투영은 아무것도 빼지 않는다(원본 parity).
  const sources = readPermissionSources(root);
  assert.deepEqual(deep.permissionProjection, {
    permissions: sources.catalog.permissions.length, removedPagePermissions: [], operationBindings: sources.policies.operationBindings.length, removedOperationBindings: 0,
    screens: sources.registry.screens.length, bundles: sources.bundles.bundles.map(bundle => bundle.id), reducedBundles: [], droppedBundles: [],
    generatedExclusions: [],
  });
});

/*
 * 정밀 점검 시험들이 넘기는 기억하는 읽기(readRepositorySource)는 저장소 루트 아래 파일만 한 번 읽고 기억한다. 루트 밖(임시 폴더의
 * 준비물)은 시험이 고쳐 쓰므로 늘 다시 읽는다 — 기억하면 고친 준비물을 옛 원문으로 판정한다.
 */
test('the memoizing repository reader reads a repository file once and never remembers a path outside the repository', t => {
  const counts = new Map();
  const read = path => { counts.set(path, (counts.get(path) ?? 0) + 1); return readFileSync(path, 'utf8'); };
  const reader = memoizedRepositoryReader(root, read);
  const inside = join(root, 'package.json');
  assert.equal(reader(inside), readFileSync(inside, 'utf8'));
  assert.equal(reader(inside), readFileSync(inside, 'utf8'));
  assert.equal(counts.get(inside), 1, 'a repository file is read once');
  const outside = mkdtempSync(join(tmpdir(), 'deep-reader-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const fixture = join(outside, 'Fixture.java');
  writeFileSync(fixture, 'class One {}');
  assert.equal(reader(fixture), 'class One {}');
  writeFileSync(fixture, 'class Two {}');
  assert.equal(reader(fixture), 'class Two {}', 'a fixture outside the repository is read again after it changes');
  assert.equal(counts.get(fixture), 2);
  // 시험들이 쓰는 공유 읽기도 같은 규칙이다.
  writeFileSync(fixture, 'class Three {}');
  assert.equal(readRepositorySource(fixture), 'class Three {}');
  writeFileSync(fixture, 'class Four {}');
  assert.equal(readRepositorySource(fixture), 'class Four {}');
});

/*
 * 권한 투영(10단계 10b)이 실패할 자리 — 남는 바인딩이 구성 밖 권한을 요구하거나 묶음 원장이 남는 권한을 나누지 못하면 생성기가 거버넌스
 * 투영에서 멈춘다. 정밀 점검은 같은 판정을 미리 해 PERMISSION_PROJECTION 으로 막는다(투입 원장만 바꿔 만든다).
 */
test('a permission projection failure becomes a PERMISSION_PROJECTION blocker before Docker starts', () => {
  const core = compose({ preset: 'core' });
  const sources = readPermissionSources(root);
  assert.deepEqual(codes(compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: core, files, permissionSources: sources })), []);
  // core 에 남는 사용자 조회 바인딩 하나가 메일 발송 권한(구성 밖)을 요구하게 바꾼다.
  const tampered = structuredClone(sources);
  const binding = tampered.policies.operationBindings.find(row => row.handler.includes('.UserApiController#') && row.permission === 'USER_READ');
  binding.permission = 'MAIL_SEND';
  let deep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: core, files, permissionSources: tampered });
  assert.deepEqual(codes(deep), ['PERMISSION_PROJECTION']);
  assert.equal(deep.blockers[0].label, DEEP_BLOCKER_LABELS.PERMISSION_PROJECTION);
  assert.match(deep.blockers[0].message, new RegExp(`retained operation binding ${binding.method} ${binding.path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')} needs MAIL_SEND outside the composition`, 'u'));
  assert.equal(deep.permissionProjection, null, 'a failed projection reports no counts');
  // 묶음 원장이 남는 권한을 나누지 못하면(제외 행을 지움) 같은 사유로 막는다.
  const unclassified = structuredClone(sources);
  const excludedInCore = unclassified.bundles.excluded.find(row => core.permissionCodes.includes(row.code));
  assert.ok(excludedInCore, 'the core composition holds an excluded permission for this proof');
  unclassified.bundles.excluded = unclassified.bundles.excluded.filter(row => row !== excludedInCore);
  deep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: core, files, permissionSources: unclassified });
  assert.deepEqual(codes(deep), ['PERMISSION_PROJECTION']);
  assert.match(deep.blockers[0].message, new RegExp(`does not classify composition permissions: ${excludedInCore.code}`, 'u'));
  // 생성기는 화면 목록에 없는 넘기는 page 까지 카탈로그로 판정한다(트랙 B 검토 #1). core 에 남는 넘기는 page 의 진입 권한이
  // 구성 밖 코드를 요구하면 같은 사유로 막는다.
  const redirectNeeds = structuredClone(sources);
  redirectNeeds.catalog.pagePermissions['/admin/security/role'] = [...redirectNeeds.catalog.pagePermissions['/admin/security/role'], 'MAIL_SEND'];
  deep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: core, files, permissionSources: redirectNeeds });
  assert.deepEqual(codes(deep), ['PERMISSION_PROJECTION']);
  assert.match(deep.blockers[0].message, /retained page permissions need codes outside the composition: \/admin\/security\/role needs MAIL_SEND/);
  // 대조군: 목적지가 이 구성에서 사라지는 넘기는 page 는 생성기의 거버넌스 투영이 지우므로 판정하지 않는다(화면 생존 대조와 같은 수렴).
  // 같은 page 를 core 가 지우는 화면(메일 발송)으로 넘기게 한 라우트 원장으로 기대값을 다시 만든다.
  const rows = new Map([...readRouteRows(root)].map(([route, row]) => [route,
    route === '/admin/security/role' ? { ...row, target: '/admin/collaboration/mail-send' } : row]));
  deep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: core, files, permissionSources: redirectNeeds,
    pageSurvival: { rows, expected: expectedPageRoutes(catalog, core, rows) } });
  assert.deepEqual(codes(deep), [], 'a redirect page whose destination the composition removes is not judged');
  assert.ok(deep.permissionProjection.removedPagePermissions.includes('/admin/security/role'));
});

// api-docs 연산을 판정할 수 없으면(바인딩 없음·소스 없는 핸들러) 생성기는 Java 투영 뒤에 실패한다. 정밀 점검이 Docker 전에 같은 사유로 막는다.
test('an api-docs operation the contract projection cannot judge blocks the deep plan', () => {
  const contract = readSourceApiContract(root);
  const dropped = contract.bindings.find(binding => !binding.handler.startsWith('EXTERNAL#'));
  const deep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: compose({ preset: 'core' }), files,
    apiContract: { doc: contract.doc, bindings: contract.bindings.filter(binding => binding !== dropped) } });
  assert.deepEqual(codes(deep), ['API_CONTRACT_PROJECTION']);
  assert.equal(deep.blockers[0].label, DEEP_BLOCKER_LABELS.API_CONTRACT_PROJECTION);
  assert.equal(deep.blockers[0].message, `api-docs operation has no authorization binding: ${dropped.method} ${dropped.path}`);
  assert.equal(deep.apiContract, null, 'a failed projection reports no api-docs summary');
});

// 남는 파일이 구성에서 빠지는 계약 이름을 쓰면 생성물의 tsc 가 약 10분 뒤에 깨진다(트랙 K 검토 #2). 생성기는 생성 타입을 다시 만든 직후
// 그 자리를 밝히며 멈추고, 정밀 점검이 같은 판정으로 Docker 전에 막는다. core 사용자 관리 서비스가 쓰는 연산을 core 가 지우는 컨트롤러에
// 묶어 그 서술자가 사라지게 한다.
test('a surviving file that uses a contract name the composition removes blocks the deep plan', () => {
  const contract = readSourceApiContract(root);
  const rebound = contract.bindings.map(binding => (binding.handler === 'nuri.api.controller.UserApiController#unlockUser'
    ? { ...binding, handler: 'nuri.api.controller.business.addressbook.AddressBookApiController#createAddressBook' } : binding));
  assert.notDeepEqual(rebound, contract.bindings, 'the unlock operation is bound');
  const deep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: compose({ preset: 'core' }), files, apiContract: { doc: contract.doc, bindings: rebound } });
  const blocker = deep.blockers.find(entry => entry.code === 'API_CONTRACT_REFERENCE');
  assert.equal(blocker?.label, DEEP_BLOCKER_LABELS.API_CONTRACT_REFERENCE);
  assert.ok(blocker.files.includes('frontend/src/services/foundation/system/UserAdminService.ts'), JSON.stringify(blocker.files));
  assert.match(blocker.message, /frontend\/src\/services\/foundation\/system\/UserAdminService\.ts:\d+ unlockUserOperation/);
  assert.ok(deep.apiContract.removedOperationIds.includes('unlockUser'));
});

/*
 * 승인 대조는 생성기와 정밀 점검이 같은 판정 함수를 쓴다. 정밀 점검이 차단 사유로 말하는 경우마다 생성기도 실패해야 하고,
 * 둘 다 통과하는 경우도 같아야 한다.
 */
test('every acknowledgement blocker of the deep plan is a failure of the generator acknowledgement check', () => {
  const javaGates = files => ({ removedGates: files.map(file => ({ file, reason: '시험용' })) });
  const rules = { 'historical-migration-tests': ['api-server/src/test/java/nuri/api/schema/OldMigrationIntegrationTest.java'],
    'upstream-atlas': ['scripts/atlas-catalog.test.mjs'] };
  const accepted = { acknowledgedRemovedGates: [{ file: 'a/Gate.java', reason: 'r' }],
    acknowledgedGateRemovalRules: [{ rule: 'historical-migration-tests', reason: 'r' }, { rule: 'upstream-atlas', reason: 'r' }] };
  const cases = [
    ['passes', accepted, ['a/Gate.java'], rules, [], null],
    ['invalid entry', { ...accepted, acknowledgedRemovedGates: [{ file: 'a/Gate.java' }] }, ['a/Gate.java'], rules, ['invalidEntries', 'unacknowledged'], /acknowledgedRemovedGates 항목은 \{ file, reason \}/],
    ['unknown rule', { ...accepted, acknowledgedGateRemovalRules: [...accepted.acknowledgedGateRemovalRules, { rule: 'nope', reason: 'r' }] }, ['a/Gate.java'], rules, ['invalidRules'], /acknowledgedGateRemovalRules 항목은/],
    ['unacknowledged rule', { ...accepted, acknowledgedGateRemovalRules: [] }, ['a/Gate.java'], rules, ['unacknowledgedRules'], /승인하지 않은 규칙/],
    ['stale rule', accepted, ['a/Gate.java'], { ...rules, 'historical-migration-tests': [] }, ['staleRules'], /더 이상 적용되지 않는 규칙/],
    ['unacknowledged gate', accepted, ['a/Gate.java', 'b/Other.java'], rules, ['unacknowledged'], /승인하지 않은 거버넌스 게이트를 제거한다 \(1건\)/],
    ['stale gate', accepted, [], rules, ['stale'], /더 이상 제거되지 않는 항목이 남아 있다 \(1건\)/],
    ['entries not a list', { ...accepted, acknowledgedRemovedGates: 'x' }, ['a/Gate.java'], rules, ['invalidEntries', 'unacknowledged'], /acknowledgedRemovedGates 항목은 \{ file, reason \} 이어야 한다: "x"/],
    ['rules not a list', { ...accepted, acknowledgedGateRemovalRules: {} }, ['a/Gate.java'], rules, ['invalidRules', 'unacknowledgedRules'], /acknowledgedGateRemovalRules 항목은 \{ rule, reason \}.*: \{\}/],
  ];
  for (const [name, profile, gates, ruleRemovals, fields, failure] of cases) {
    const result = removedGateAcknowledgement(profile, gates, ruleRemovals);
    const problems = ['invalidEntries', 'invalidRules', 'unacknowledgedRules', 'staleRules', 'unacknowledged', 'stale'].filter(key => result[key].length);
    assert.deepEqual(problems, fields, name);
    const check = () => quietly(() => assertRemovedGatesAcknowledged('p', profile, javaGates(gates), { removedGates: [] }, ruleRemovals));
    if (failure) assert.throws(check, failure, name);
    else assert.doesNotThrow(check, name);
  }
  // 생성기는 형식 오류로 멈추기 전에 지워지는 게이트를 먼저 말한다.
  const lines = [];
  const log = console.log;
  console.log = line => lines.push(line);
  try {
    assert.throws(() => assertRemovedGatesAcknowledged('p', { ...accepted, acknowledgedRemovedGates: 'x' }, javaGates(['a/Gate.java']), { removedGates: [] }, rules), /: "x"/);
  } finally { console.log = log; }
  assert.equal(lines[0], '[base-source] 투영에서 제거된 거버넌스 게이트: 3건');
});

/*
 * 생성물의 파일 집합은 생성기가 복사하는 파일이다. 디스크에만 있고 목록에 없는 파일(무시된 파일)은 세지 않고, 목록에만 있고
 * 디스크에 없는 파일(작업 트리에서 지운 추적 파일)은 읽지 않는다. 곧 지워질 파일의 마커 오류도 생성기처럼 차단한다.
 */
test('the deep plan sees exactly the files the generator copies and projects every frontend source first', t => {
  const fixture = mkdtempSync(join(tmpdir(), 'composer-deep-fixture-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true, maxRetries: 5 }));
  const write = (file, text) => { mkdirSync(dirname(join(fixture, file)), { recursive: true }); writeFileSync(join(fixture, file), text); };
  // 합성 저장소의 기능 소유(메일 하나)와 시작 구성 기대치. 시작 구성은 연쇄로 지우는 Java 를 승인해야 생성된다(설계서 C4) —
  // 아래 과거 마이그레이션 검증이 그 연쇄다.
  const expected = { description: '시험용', gates: [], gateRemovalRules: [{ rule: 'upstream-atlas', reason: '시험용' }],
    javaCascade: ['api-server/src/test/java/nuri/api/schema/OldMailMigrationIntegrationTest.java'] };
  const small = { files: {}, declarations: { features: { mail: {} }, supportFiles: () => new Map() },
    extras: { presetExpectations: { core: expected }, gateOwners: {}, rbac: { file: 'none', domains: [], surfaces: {} } } };
  // 시작 구성 core: 메일을 고르지 않고 demo 화면을 지운다(해석기가 기능 규칙에서 계산하는 제외 경로를 직접 준다).
  const coreOf = removePaths => ({ profile: 'core', packs: ['core'], resolvedDomains: [], frontend: { includedPaths: [], removePaths } });
  // 원본 Atlas 규칙 제거가 성공하도록 자산과 별칭을 둔다(규칙 제거는 늘 적용된다).
  const atlas = ['frontend/public/governance_harness_atlas.html', 'frontend/atlas/catalog.json', ...atlasPaths.filter(path => /\.(?:mjs|ts)$/.test(path)), 'package.json'];
  for (const file of atlas) write(file, file === 'package.json' ? '{"scripts":{"atlas:build":"x","atlas:check":"x"}}' : '// atlas\n');
  const listed = ['business-app/src/main/java/nuri/business/service/mail/MailService.java', 'frontend/src/app/layout.tsx',
    'frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx', 'frontend/src/app/demo/page.tsx', ...atlas];
  write(listed[0], 'package nuri.business.service.mail;\npublic class MailService {}\n');
  for (const file of listed.slice(1, 5)) write(file, 'export default function Page() { return null; }\n');
  write('business-app/src/main/java/nuri/business/service/mail/notes.txt', 'ignored by Git, never copied\n');
  // 제외 도메인을 참조하는 과거 마이그레이션 검증은 Java 연쇄로 먼저 지워진다. 생성기처럼 규칙 제거에는 세지 않는다.
  const cascadedHistorical = 'api-server/src/test/java/nuri/api/schema/OldMailMigrationIntegrationTest.java';
  write(cascadedHistorical, 'package nuri.api.schema;\nimport nuri.business.service.mail.MailService;\nclass OldMailMigrationIntegrationTest { MailService mail; }\n');
  listed.push(cascadedHistorical);
  // 이 합성 저장소에는 라우트 원장·카탈로그가 없다. 화면 생존 기대값을 직접 넘긴다(홈·로그인은 core 화면, demo 화면은 빠진다).
  const rows = routeRowsFromLedger({ routes: [['/', 'page.tsx'], ['/login', 'login/page.tsx'], ['/demo', 'demo/page.tsx']]
    .map(([route, page]) => ({ route, source: `frontend/src/app/${page}`, routing: { kind: 'page' } })) });
  const pageSurvival = { rows, expected: new Set(['/', '/login']) };
  // 권한 정의도 없다. 권한 투영은 늘 판정하므로 최소 입력을 직접 넘긴다 — 홈 화면을 여는 묶음 하나와 그 권한(구성 코드)이 남고,
  // 제외 도메인 핸들러의 바인딩 하나는 Java 투영이 핸들러를 지워 투영 원장에서 빠진다(구성 안 권한이라 핸들러 판정만 그 행을 뺀다).
  const permissionSources = { catalog: { permissions: [{ code: 'HOME_READ' }], pagePermissions: { '/': ['HOME_READ'], '/login': [], '/demo': [] } }, visibleTerms: { terms: [{ id: 'term-hub', sourceTerms: ['허브'], decision: 'replace-by-task-context' }] },
    bundles: { schemaVersion: 1, description: '시험용 묶음 원장', excluded: [], bundles: [
      { id: 'home-viewer', name: '홈 조회', description: '홈 조회를 맡깁니다.', protected: false, permissions: ['HOME_READ'] }] },
    registry: { screens: [{ route: '/', entry: { permissions: ['HOME_READ'], mode: 'ANY' }, permissions: [{ code: 'HOME_READ', action: 'READ', source: 'entry' }] }] },
    policies: { operationBindings: [{ method: 'GET', path: '/api/v1/mails', handler: 'nuri.business.service.mail.MailService#list',
      access: 'PERMISSION', permission: 'HOME_READ' }] } };
  // api-docs 와 인가 원장(API 계약 쪽)도 없다. 연산 없는 계약을 넘긴다(API 계약 투영은 따로 시험한다).
  const apiContract = { doc: { openapi: '3.1.0', paths: {}, components: { schemas: {} } },
    bindings: [{ method: 'GET', path: '/actuator/health', handler: 'EXTERNAL#/actuator/health' }] };
  const plan = (files = listed, expectation = pageSurvival) => compositionDeepPlan({ root: fixture, modules: small,
    composition: { ...coreOf(['src/app/demo']), permissionCodes: ['HOME_READ'] }, files, pageSurvival: expectation, permissionSources, apiContract });

  let deep = plan([...listed, 'frontend/src/app/deleted.tsx', 'business-app/src/main/java/Deleted.java']);
  assert.deepEqual(deep.blockers, []);
  assert.deepEqual(deep.java.files, [cascadedHistorical, listed[0]].sort(), 'a file Git does not list is not copied, so it is not counted as removed');
  assert.deepEqual(deep.ruleRemovals['historical-migration-tests'], [], 'a historical test already removed by the cascade is not removed again by the rule');
  assert.deepEqual(deep.frontend.files, ['frontend/src/app/demo/page.tsx']);
  assert.deepEqual([deep.java.removedFiles, deep.java.cascadeFiles, deep.frontend.removedFiles, deep.frontend.cascadeFiles], [2, 1, 1, 0]);
  assert.deepEqual([deep.permissionProjection.operationBindings, deep.permissionProjection.removedOperationBindings], [0, 1],
    'the binding of a handler the Java projection removes leaves the projected ledger');

  write('frontend/src/app/demo/page.tsx', '// reusable-base:nope:start\nexport default function Page() { return null; }\n// reusable-base:nope:end\n');
  deep = plan();
  assert.deepEqual(codes(deep), ['FRONTEND_PROJECTION'], 'the generator projects markers before it removes the page');
  assert.match(deep.blockers[0].message, /unknown marker feature: nope/);

  write('frontend/src/app/demo/page.tsx', 'export default function Page() { return null; }\n');
  deep = plan(listed.filter(file => file !== 'frontend/src/app/layout.tsx'));
  assert.deepEqual(codes(deep), ['FRONTEND_ENTRY']);
  assert.deepEqual(deep.blockers[0].files, ['frontend/src/app/layout.tsx']);
  // 복사되지 않는 화면은 남지 않는다 — 구성이 남겨야 할 화면이면 빠진 화면이다. 구성에 없는 화면이 남으면 남은 화면이다.
  deep = plan(listed.filter(file => file !== 'frontend/src/app/login/page.tsx'));
  assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL']);
  assert.deepEqual(deep.blockers[0].files, ['frontend/src/app/login/page.tsx']);
  deep = compositionDeepPlan({ root: fixture, modules: small, composition: { ...coreOf([]), permissionCodes: ['HOME_READ'] },
    files: listed, pageSurvival, permissionSources, apiContract });
  assert.deepEqual(codes(deep), ['FRONTEND_SCREEN_EXTRA']);
  assert.deepEqual(deep.blockers[0].files, ['frontend/src/app/demo/page.tsx']);
  // 정밀 점검이 이 두 사유로 막는 구성은 생성기도 같은 자리(투영 단계의 프런트 제거 뒤 화면 대조)에서 실패한다.
  const generated = (removePaths, drop = [], expectation = pageSurvival, prepare = () => {}) => {
    const output = mkdtempSync(join(tmpdir(), 'composer-deep-pages-'));
    t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
    copySourceTree(output, { sourceRoot: fixture, files: listed.filter(file => !drop.includes(file)) });
    prepare(output);
    const composition = coreOf(removePaths);
    return () => quietly(() => projectSourceTree(output, { ownership: composerOwnership(small), profile: composerProfile(small, composition),
      composition, sourceRoot: fixture, pageSurvival: expectation }));
  };
  assert.throws(generated(['src/app/demo'], ['frontend/src/app/login/page.tsx']),
    error => error instanceof ComposerError && error.code === 'SOURCE_SURVIVAL' && JSON.stringify(error.details.files) === '["frontend/src/app/login/page.tsx"]',
    'the generator fails on a lost screen and names it');
  assert.throws(generated([]), /Screens outside the composition survive projection: \/demo/);
  assert.throws(generated(['src/app/demo'], ['frontend/src/app/layout.tsx']), /frontend 필수 진입점이 projection에서 제거됐다: src\/app\/layout\.tsx/,
    'the generator fails without the root layout');
  assert.doesNotThrow(generated(['src/app/demo']));
  // 생성기도 화면을 디스크의 실제 page 파일 이름으로 본다 — 대소문자만 다른 이름(Page.tsx)은 대소문자를 가리지 않는 디스크에서도
  // 그 화면이 아니다(라우트는 이름 그대로다).
  const caseRenamed = output => renameSync(join(output, 'frontend/src/app/login/page.tsx'), join(output, 'frontend/src/app/login/Page.tsx'));
  assert.throws(generated(['src/app/demo'], [], pageSurvival, caseRenamed),
    error => error instanceof ComposerError && error.code === 'SOURCE_SURVIVAL' && JSON.stringify(error.details.files) === '["frontend/src/app/login/page.tsx"]',
    'the generator reads the page file name exactly');
  // 기대값으로 대조할 수 없으면(원장에 없는 리다이렉트 목적지) 정밀 점검은 프런트 투영 차단으로 말하고, 생성기도 같은 판정에서 실패한다.
  const uncomparable = { ...pageSurvival, rows: routeRowsFromLedger({ routes: [...rows.values()].map(row => ({ route: row.route, source: row.source,
    routing: row.route === '/login' ? { kind: 'page-redirect', target: '/nowhere' } : { kind: 'page' } })) }) };
  deep = plan(listed, uncomparable);
  assert.deepEqual(codes(deep), ['FRONTEND_PROJECTION']);
  assert.match(deep.blockers[0].message, /Redirect target was not an upstream page: \/nowhere \(\/login\)/);
  assert.throws(generated(['src/app/demo'], [], uncomparable), /Redirect target was not an upstream page: \/nowhere \(\/login\)/);
  // 판정할 수 없는 import 와 대소문자만 다른 import 대상은 정밀 점검과 생성기가 같은 자리(프런트 투영)에서 실패한다(슬롯 단계 PR-2).
  //   곧 지워질 파일이어도 같다. 해석은 디스크를 묻지 않으므로 대소문자를 가리지 않는 디스크에서도 실패한다.
  //   두 단언은 같은 판정 함수(planFrontendRemoval)를 지나므로, 판정을 지우는 변이는 정밀 점검 단언에서 먼저 붉다.
  for (const [label, text, failure] of [
    ['an unjudgeable import', "const name = './x';\nexport default function Page() { return import(name); }\n",
      /UNPARSEABLE_DYNAMIC_IMPORT frontend\/src\/app\/demo\/page\.tsx:2/],
    ['a case-only target', "import Layout from '../Layout';\nexport default function Page() { return Layout; }\n",
      /IMPORT_TARGET_CASE_MISMATCH frontend\/src\/app\/demo\/page\.tsx:1/],
  ]) {
    write('frontend/src/app/demo/page.tsx', text);
    deep = plan();
    assert.deepEqual(codes(deep), ['FRONTEND_PROJECTION'], `deep plan blocks ${label}`);
    assert.match(deep.blockers[0].message, failure);
    assert.throws(generated(['src/app/demo']), failure, `the generator fails on ${label}`);
  }
  write('frontend/src/app/demo/page.tsx', 'export default function Page() { return null; }\n');
  // 생성기는 기대값을 카탈로그나 미리 만든 기대값으로만 만든다(조용히 다시 적재하지 않는다).
  assert.throws(() => projectSourceTree(fixture, { ownership: composerOwnership(small), profile: composerProfile(small, coreOf(['src/app/demo'])),
    composition: coreOf(['src/app/demo']), sourceRoot: fixture }),
    /projectSourceTree needs the composition catalog or a page survival expectation/);

  // 규칙 판정이 예외로 멈추면 생성기는 거기서 실패하고 승인 대조까지 가지 않는다. 그 규칙을 '적용되지 않는 규칙'으로 몰면
  // 사용자가 맞는 승인을 지우고, 원인을 고친 뒤에는 승인되지 않은 규칙으로 다시 실패한다.
  expected.gateRemovalRules.push({ rule: 'historical-migration-tests', reason: '시험용' });
  const keptHistorical = 'api-server/src/test/java/nuri/api/schema/KeptMigrationIntegrationTest.java';
  write(keptHistorical, 'package nuri.api.schema;\nclass KeptMigrationIntegrationTest {}\n');
  const withHistorical = [...listed, keptHistorical];
  deep = plan(withHistorical);
  assert.deepEqual(codes(deep), []);
  assert.deepEqual(deep.ruleRemovals['historical-migration-tests'], [keptHistorical]);
  const drifted = 'api-server/src/test/java/nuri/api/schema/AuthorizationContractIntegrationTest.java';
  write(drifted, 'package nuri.api.schema;\nclass AuthorizationContractIntegrationTest { void run() { fromVersion("2.99"); } }\n');
  deep = plan([...withHistorical, drifted]);
  assert.deepEqual(codes(deep), ['RULE_REMOVAL']);
  assert.match(deep.blockers[0].message, /Historical authorization fixture changed scope; removal requires review: AuthorizationContractIntegrationTest\.java/);
  write('package.json', '{ not json');
  deep = plan(withHistorical);
  assert.deepEqual(codes(deep), ['RULE_REMOVAL']);
  assert.match(deep.blockers[0].message, /JSON/);
});

/*
 * 제외 경로는 생성기가 디스크에서 지우는 것과 같은 파일로 센다. 끝의 구분자·`./` 는 같은 경로다. 대소문자만 다르거나 frontend 밖을
 * 가리키는 경로는 디스크에 따라 결과가 갈리므로 실패한다. 제외 경로 안의 자산(.css 등)을 가져오는 파일도 연쇄로 걷는다(깨진 import 를 남기지 않는다).
 */
test('frontend remove paths are counted exactly as the generator deletes them', t => {
  const fixtureFiles = ['frontend/src/app/layout.tsx', 'frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx', 'frontend/src/app/demo/page.tsx',
    'frontend/src/app/demo/demo.module.css', 'frontend/src/app/uses-style.tsx', 'frontend/src/__tests__/demo-gate.test.ts', 'frontend/src/app/keep.tsx'];
  const make = () => {
    const output = mkdtempSync(join(tmpdir(), 'composer-deep-frontend-'));
    t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
    const write = (file, text) => { mkdirSync(dirname(join(output, file)), { recursive: true }); writeFileSync(join(output, file), text); };
    for (const file of fixtureFiles) write(file, 'export default function Page() { return null; }\n');
    write('frontend/src/app/demo/demo.module.css', '.a {}\n');
    write('frontend/src/app/uses-style.tsx', "import styles from '@/app/demo/demo.module.css';\nexport const s = styles;\n");
    write('frontend/src/__tests__/demo-gate.test.ts', "import Page from '@/app/demo/page';\nexport const p = Page;\n");
    write('outside', 'must survive\n');
    return output;
  };
  const project = (output, path) => ({
    plan: () => planFrontendRemoval({ frontendRoot: join(output, 'frontend'), files: walk(join(output, 'frontend'), () => true), directPaths: [path],
      readSource: file => readFileSync(file, 'utf8') }),
    prune: () => quietly(() => pruneFrontend(output, [path])),
  });
  const expected = ['frontend/src/__tests__/demo-gate.test.ts', 'frontend/src/app/demo/demo.module.css', 'frontend/src/app/demo/page.tsx', 'frontend/src/app/uses-style.tsx'];
  for (const path of ['src/app/demo', 'src/app/demo/', './src/app/demo', 'src/app//demo']) {
    const output = make();
    const { plan, prune } = project(output, path);
    assert.deepEqual([...plan().removed].map(file => normalize(relative(output, file))).sort(), expected, `${path}: planned removal`);
    const pruned = prune();
    assert.deepEqual(fixtureFiles.filter(file => !existsSync(join(output, file))).sort(), expected, `${path}: deleted from disk`);
    assert.deepEqual({ removed: pruned.removedFiles, cascaded: pruned.cascadedFiles, gates: pruned.removedGates },
      { removed: 4, cascaded: 2, gates: ['frontend/src/__tests__/demo-gate.test.ts'] }, `${path}: counted as deleted`);
  }
  const refused = [['src/app/Demo', /frontend removePath 의 대소문자가 실제 경로와 다르다: src\/app\/Demo \(실제: src\/app\/demo\/[^)]+\)/],
    ['../outside', /frontend removePath 는 frontend 안의 하위 경로여야 한다: \.\.\/outside/], ['.', /frontend 안의 하위 경로여야 한다: \./]];
  for (const [path, failure] of refused) {
    const output = make();
    const { plan, prune } = project(output, path);
    assert.throws(plan, failure, `${path}: planning`);
    assert.throws(prune, failure, `${path}: the generator`);
    assert.ok(existsSync(join(output, 'outside')) && fixtureFiles.every(file => existsSync(join(output, file))), `${path}: nothing is deleted`);
  }
});

/*
 * 대소문자를 가리지 않는 디스크(Windows·macOS)에서는 Git 목록과 대소문자만 다른 디스크 이름이 같은 파일이다(생성기의
 * 복사·존재 확인도 그렇게 본다). 가리는 디스크(Linux)에서는 다른 파일이고, 목록의 이름은 디스크에 없어 복사되지 않는다.
 */
test('a name that differs only in case from the Git list follows the disk, as the generator does', () => {
  const mailService = 'business-app/src/main/java/nuri/business/service/mail/MailService.java';
  const listed = files.map(file => (normalize(file) === mailService ? mailService.toLowerCase() : file));
  assert.ok(listed.includes(mailService.toLowerCase()));
  const deep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: compose({ domains: ['mail'] }), files: listed });
  if (existsSync(join(root, mailService.toLowerCase()))) {
    assert.deepEqual(deep.blockers, [], 'the survival check sees the disk name and must find the listed lower-case name');
  } else {
    assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL'], 'on a case-sensitive disk the listed name is another, absent file');
    assert.deepEqual(deep.blockers[0].files, [mailService]);
  }
});

// 차단 사유 문장은 화면에 보이므로 이 컴퓨터의 절대 경로(사용자 폴더 이름)를 저장소 기준 경로로 바꾼다.
test('blocker messages name repository paths, never this computer\'s absolute checkout path', () => {
  const windows = 'D:\\work\\egov';
  assert.equal(withoutRoot(windows, "ENOENT: open 'D:\\work\\egov\\frontend\\a.ts'"), "ENOENT: open '.\\frontend\\a.ts'");
  assert.equal(withoutRoot(windows, 'missing d:/work/egov/business-app/X.java'), 'missing ./business-app/X.java');
  assert.equal(withoutRoot(windows, 'D:\\WORK\\EGOV\\x'), '.\\x', 'the whole root is matched without case');
  assert.equal(withoutRoot(windows, JSON.stringify('D:\\work\\egov\\x')), JSON.stringify('.\\x'), 'a JSON-escaped root is hidden too');
  assert.equal(withoutRoot(windows, 'D:\\work\\egovother\\a.ts'), '.other\\a.ts', 'a sibling folder sharing the prefix is still not shown in full');
  assert.equal(withoutRoot('/home/me/egov', 'read /home/me/egov/frontend/a.ts'), 'read ./frontend/a.ts');
  assert.equal(withoutRoot('/home/me/egov', 'unknown marker feature: boarx (src/a.tsx:3)'), 'unknown marker feature: boarx (src/a.tsx:3)');
  // 루트 이름이 저장소 안 경로에도 나오면(도커 작업 폴더 /app·/src) 그 자리는 그대로 둔다. 바꾸면 없는 파일을 말한다.
  assert.equal(withoutRoot('/app', "ENOENT: open '/app/frontend/src/app/login/page.tsx' (src/app/demo/page.tsx:1)"),
    "ENOENT: open './frontend/src/app/login/page.tsx' (src/app/demo/page.tsx:1)");
  assert.equal(withoutRoot('/src', 'Missing domain support file: business-app/src/main/java/X.java'), 'Missing domain support file: business-app/src/main/java/X.java');
  // 드라이브만인 루트는 뒤에 구분자가 올 때만 경로다.
  assert.equal(withoutRoot('E:\\', "Missing domain support file: x; open 'E:\\frontend\\a.ts'"), "Missing domain support file: x; open '.\\frontend\\a.ts'");
  assert.equal(withoutRoot('E:\\', 'disk E: is full'), 'disk E: is full');
});
