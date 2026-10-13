import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AUTHORIZATION_POLICY_PATH, PERMISSION_BUNDLES_PATH, PERMISSION_CATALOG_PATH, bindingHandlerSource, bindingPermissionErrors,
  generatedExclusionReason, planPermissionProjection, projectOperationBindings, projectPermissionBundleLedger, projectPermissionCatalog,
  projectScreenRegistryRows, readPermissionSources,
} from './reusable-permission-projection.mjs';
import { BASE_SEED, PERMISSION_ARTIFACT_PATHS, buildPermissionArtifacts } from './generate-permissions.mjs';
import {
  SCREEN_REGISTRY_OUTPUT, buildPermissionBundles, renderScreenRegistry, replacedTermFinder,
} from './screen-registry-model.mjs';
import { buildUnreviewedBaselineManifest, discoverPageRoutes, inspectRouteRepository } from './ui-route-capabilities-contract.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { COMPOSER_SELECTION_PATH, resolveProjectRecipe } from './project-composer-recipe.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/gu, '\n');
const readJson = file => JSON.parse(read(file));
const composerCatalog = loadProjectComposerCatalog(root);
const compose = selection => resolveProjectRecipe({ schemaVersion: 1, project: { name: 'permission-projection' }, sourceRef: 'v1.0.0', selection },
  composerCatalog);

/*
 * 재사용 생성물의 권한 투영(10단계 10b-2, DEC-OPS-287). 카탈로그·인가 원장 바인딩·묶음 원장·화면 목록을 구성으로 함께 줄인다.
 * 판정 함수 하나하나의 규칙을 작은 입력으로 고정하고, 모든 기능을 고른 구성이 원본과 바이트가 같다는 것(원본 parity)을 실제 원본으로
 * 대조한다. 생성기·정밀 점검·무결성 검사가 이 모듈을 frontend 설치 없이 적재한다는 것도 정적 import 로 고정한다.
 */

test('binding handlers resolve to exactly one Java source and external handlers have none', () => {
  const exists = file => file === 'api-server/src/main/java/nuri/api/ThingController.java';
  assert.equal(bindingHandlerSource('EXTERNAL#/actuator/health', exists), null);
  assert.equal(bindingHandlerSource('nuri.api.ThingController#list', exists), 'api-server/src/main/java/nuri/api/ThingController.java');
  assert.equal(bindingHandlerSource('nuri.api.ThingController$Inner#list', exists), 'api-server/src/main/java/nuri/api/ThingController.java');
  assert.throws(() => bindingHandlerSource('nuri.api.MissingController#list', exists), /operation binding handler has no source: nuri\.api\.MissingController#list/);
  assert.throws(() => bindingHandlerSource('nuri.api.ThingController#list', () => true), /operation binding handler source is ambiguous/);
  assert.throws(() => bindingHandlerSource('not a type#x', exists), /operation binding handler is not a Java type/);
  assert.throws(() => bindingHandlerSource('', exists), /operation binding has no handler/);
});

test('operation bindings drop only rows whose handler source the projection removes, in source order', () => {
  const bindings = [
    { method: 'GET', path: '/a', handler: 'nuri.api.AController#a', access: 'PERMISSION', permission: 'A_READ' },
    { method: 'GET', path: '/b', handler: 'nuri.api.BController#b', access: 'PERMISSION', permission: 'B_READ' },
    { method: 'GET', path: '/actuator', handler: 'EXTERNAL#/actuator', access: 'AUTHENTICATED', permission: null },
    { method: 'POST', path: '/a', handler: 'nuri.api.AController#create', access: 'PERMISSION', permission: 'A_CREATE' },
  ];
  const sourceExists = file => /\/(?:A|B)Controller\.java$/u.test(file) && file.startsWith('api-server/');
  const projected = projectOperationBindings(bindings, { sourceExists, removed: file => file.endsWith('/BController.java') });
  assert.deepEqual(projected.bindings.map(row => row.path), ['/a', '/actuator', '/a']);
  assert.deepEqual(projected.removed.map(row => row.path), ['/b']);
  assert.deepEqual(bindingPermissionErrors(projected.bindings, ['A_READ']), ['retained operation binding POST /a needs A_CREATE outside the composition']);
  assert.throws(() => projectOperationBindings([], { sourceExists, removed: () => false }), /requires the authorization operation bindings/);
});

test('the catalog keeps composition codes and pages present in the artifact, with source values and order', () => {
  const catalog = {
    permissions: [{ code: 'B_READ', action: 'READ' }, { code: 'A_READ', action: 'READ' }, { code: 'A_CREATE', action: 'CREATE' }],
    pagePermissions: { '/': [], '/a': ['A_READ'], '/b': ['B_READ'] },
    pagePermissionModes: { '/a': 'ALL', '/b': 'ANY' },
  };
  const projected = projectPermissionCatalog(catalog, { permissionCodes: ['A_READ', 'A_CREATE'], routes: new Set(['/', '/a']) });
  assert.deepEqual(projected.catalog, {
    permissions: [{ code: 'A_READ', action: 'READ' }, { code: 'A_CREATE', action: 'CREATE' }],
    pagePermissions: { '/': [], '/a': ['A_READ'] }, pagePermissionModes: { '/a': 'ALL' },
  });
  assert.deepEqual(projected.removedPagePermissions, ['/b']);
  assert.deepEqual(projected.removedPermissions, ['B_READ']);
  assert.throws(() => projectPermissionCatalog(catalog, { permissionCodes: ['A_READ', 'C_READ'], routes: new Set(['/']) }),
    /composition permission codes are not in the catalog: C_READ/);
  assert.throws(() => projectPermissionCatalog(catalog, { permissionCodes: ['A_READ'], routes: new Set(['/', '/b']) }),
    /retained page permissions need codes outside the composition: \/b needs B_READ/);
  assert.throws(() => projectPermissionCatalog(catalog, { permissionCodes: ['A_READ'], routes: new Set(['/', '/new']) }),
    /Unregistered page permission in projected artifact: \/new/);
  assert.throws(() => projectPermissionCatalog(catalog, { permissionCodes: ['A_READ', 'A_READ'], routes: new Set(['/']) }), /must be unique/);
});

// 묶음 투영 규칙의 시험용 화면 목록: /things 는 THING_READ 로 들어가고, 누구나 들어가는 / 는 등록(THING_CREATE)을 쓰기로 쓴다.
const SCREENS = [
  { route: '/', entry: { permissions: [], mode: 'ANY' }, permissions: [{ code: 'THING_CREATE', action: 'CREATE', source: 'write' }] },
  { route: '/things', entry: { permissions: ['THING_READ'], mode: 'ANY' }, permissions: [{ code: 'THING_READ', action: 'READ', source: 'entry' }] },
];
const LEDGER = { schemaVersion: 1, description: '시험용 묶음 원장', bundles: [
  { id: 'thing-viewer', name: '사물 조회', description: '사물 조회를 맡깁니다.', protected: false, permissions: ['THING_READ', 'WIDGET_READ'] },
  // 구성에 사물 조회가 없으면 등록만 남고 여는 화면은 없지만, 누구나 들어가는 홈이 등록을 쓰므로 관련 화면으로 남는다.
  { id: 'thing-creator', name: '사물 등록', description: '사물 등록을 맡깁니다.', protected: false, permissions: ['THING_CREATE', 'WIDGET_CREATE'] },
  // 여는 화면·관련 화면이 모두 없는 묶음 — 남는 권한(GADGET_READ)은 생성 제외로 옮겨진다.
  { id: 'gadget-viewer', name: '도구 조회', description: '도구 조회를 맡깁니다.', protected: false, permissions: ['GADGET_READ', 'WIDGET_DELETE'] },
  // 줄이면 사물 조회 묶음과 같은 권한만 남는다 — 같은 권한을 두 이름으로 보이지 않는다.
  { id: 'thing-viewer-plus', name: '사물 조회 확장', description: '사물과 위젯 조회를 맡깁니다.', protected: false, permissions: ['THING_READ', 'WIDGET_EXPORT'] },
  // 보호 권한만 빠지면 보호 표시도 다시 정한다.
  { id: 'thing-security', name: '사물 보안', description: '사물 보안을 맡깁니다.', protected: true, permissions: ['THING_READ', 'THING_UPDATE', 'AUTHRT_GRANT'] },
  { id: 'widget-only', name: '위젯', description: '위젯을 맡깁니다.', protected: false, permissions: ['WIDGET_ADMIN'] },
], excluded: [{ code: 'THING_DELETE', reason: '시험용 — 묶음으로 맡기지 않는다.' }, { code: 'WIDGET_PURGE', reason: '시험용 — 위젯 파기.' }] };
const CODES = ['GADGET_READ', 'THING_CREATE', 'THING_DELETE', 'THING_READ', 'THING_UPDATE'];
const TERMS = replacedTermFinder({ terms: [{ id: 'term-hub', sourceTerms: ['허브'], decision: 'replace-by-task-context' }] });

test('bundles keep reduced permissions while they open or relate a screen; the remaining permissions become generated exclusions', () => {
  const projection = projectPermissionBundleLedger(LEDGER, { codes: CODES, screens: SCREENS });
  assert.deepEqual(projection.kept, ['thing-viewer', 'thing-creator', 'thing-security']);
  assert.deepEqual(projection.dropped, [
    { id: 'gadget-viewer', reason: 'no-screen-in-composition' },
    { id: 'thing-viewer-plus', reason: 'same-permissions-as:thing-viewer' },
    { id: 'widget-only', reason: 'no-permission-in-composition' },
  ]);
  assert.deepEqual(projection.ledger.bundles.map(bundle => [bundle.id, bundle.permissions, bundle.protected]), [
    ['thing-viewer', ['THING_READ'], false],
    ['thing-creator', ['THING_CREATE'], false],
    ['thing-security', ['THING_READ', 'THING_UPDATE'], false],
  ]);
  assert.deepEqual(projection.generatedExclusions, ['GADGET_READ']);
  assert.deepEqual(projection.ledger.excluded, [
    { code: 'THING_DELETE', reason: '시험용 — 묶음으로 맡기지 않는다.' },
    { code: 'GADGET_READ', reason: generatedExclusionReason(['도구 조회']) },
  ]);
  // 투영본 규칙으로는 관련 화면만 남은 묶음이 통과하고, 생성 결과가 카탈로그를 빠짐없이 나눈다.
  const bundles = buildPermissionBundles(projection.ledger, { screens: SCREENS, catalogCodes: CODES, findReplacedTerm: TERMS, projected: true });
  assert.deepEqual(bundles.map(bundle => [bundle.id, bundle.screens, bundle.relatedScreens]),
    [['thing-viewer', ['/things'], []], ['thing-creator', [], ['/']], ['thing-security', ['/things'], []]]);
  // 원본 규칙(여는 화면 하나 이상)은 그대로다 — 투영 결과를 원본 규칙에 넣으면 실패한다.
  assert.throws(() => buildPermissionBundles(projection.ledger, { screens: SCREENS, catalogCodes: CODES, findReplacedTerm: TERMS }),
    /Permission bundle thing-creator opens no screen/);
  // 투영본에서도 여는 화면과 관련 화면이 모두 없는 묶음은 실패한다.
  assert.throws(() => buildPermissionBundles({ ...projection.ledger, bundles: [...projection.ledger.bundles,
    { id: 'gadget-viewer', name: '도구 조회', description: '도구 조회를 맡깁니다.', protected: false, permissions: ['GADGET_READ'] }],
  excluded: projection.ledger.excluded.filter(row => row.code !== 'GADGET_READ') },
  { screens: SCREENS, catalogCodes: CODES, findReplacedTerm: TERMS, projected: true }),
  /Permission bundle gadget-viewer opens no screen \(no screen's entry permissions are satisfied and no open screen writes with its permissions\)/);
});

test('a bundle ledger that does not classify a composition permission fails the projection', () => {
  const ledger = { ...LEDGER, excluded: LEDGER.excluded.filter(row => row.code !== 'THING_DELETE') };
  assert.throws(() => projectPermissionBundleLedger(ledger, { codes: CODES, screens: SCREENS }),
    /permission bundle ledger does not classify composition permissions: THING_DELETE/);
});

/*
 * 원본 parity(설계서 16.4 공통 장치): 모든 기능을 고른 구성(demo)의 투영은 카탈로그·인가 원장·묶음 원장·화면 목록·권한 생성물
 * 5종이 원본과 바이트가 같다. 생성물의 라우트 원장은 검토 전이라 화면 라벨은 원본 라우트 원장 스냅숏에서 온다 — 여기서는 원본
 * 저장소를 생성물처럼 보아 같은 입력을 준다(디스크에는 쓰지 않는다).
 */
test('the full product (demo) projection is byte-identical to the source permission sources, registry and artifacts', t => {
  const demo = compose({ preset: 'demo' });
  const sources = readPermissionSources(root);
  const routes = new Set(discoverPageRoutes(root).map(row => row.route));
  const catalog = projectPermissionCatalog(sources.catalog, { permissionCodes: demo.permissionCodes, routes }).catalog;
  assert.equal(`${JSON.stringify(catalog, null, 2)}\n`, read(PERMISSION_CATALOG_PATH));
  const bindings = projectOperationBindings(sources.policies.operationBindings, {
    sourceExists: file => fs.existsSync(path.join(root, file)), removed: () => false });
  assert.equal(`${JSON.stringify({ ...sources.policies, operationBindings: bindings.bindings }, null, 2)}\n`, read(AUTHORIZATION_POLICY_PATH));
  const ledger = buildUnreviewedBaselineManifest(inspectRouteRepository(root), {});
  const rows = projectScreenRegistryRows({ root, ledger, upstreamLedger: readJson('config/ui-route-capabilities.json'), sourceArtifact: sources.registry });
  const bundleProjection = projectPermissionBundleLedger(sources.bundles, { codes: rows.codes, screens: rows.screens });
  // 묶음 원장은 원본이 손으로 정렬한 파일이라, 내용이 같으면 생성기는 복사한 원본을 그대로 둔다(writeJsonIfChanged).
  assert.deepEqual(bundleProjection.ledger, sources.bundles);
  const bundles = buildPermissionBundles(bundleProjection.ledger, { screens: rows.screens, catalogCodes: rows.codes,
    findReplacedTerm: replacedTermFinder(sources.visibleTerms), projected: true });
  assert.equal(renderScreenRegistry(rows.screens, rows.aliases, bundles), read(SCREEN_REGISTRY_OUTPUT));
  // 권한 생성물 5종: 생성물 모사(구성 스냅숏 + 투영 원장 + 핸들러 소스 자리)에서 다시 만든 것이 원본 커밋본과 같다.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-permission-parity-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (file, text) => { fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true }); fs.writeFileSync(path.join(dir, file), text); };
  write(PERMISSION_CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`);
  write(AUTHORIZATION_POLICY_PATH, `${JSON.stringify({ ...sources.policies, operationBindings: bindings.bindings }, null, 2)}\n`);
  write(BASE_SEED, read(BASE_SEED));
  // 생성물 표지(11단계 C5): 활성 구성 하나와 그 구성의 기능 파일만 둔다.
  write('config/modules/presets.json', JSON.stringify({ schemaVersion: 2, active: demo.profile, presets: [{ id: demo.profile, domains: demo.resolvedDomains }] }));
  for (const domain of demo.resolvedDomains) write(`config/modules/${domain}.json`, JSON.stringify({ id: domain }));
  write(COMPOSER_SELECTION_PATH, JSON.stringify({ catalog: composerCatalog, composition: demo }));
  for (const row of bindings.bindings) {
    const source = bindingHandlerSource(row.handler, file => fs.existsSync(path.join(root, file)));
    if (source) write(source, '');
  }
  const artifacts = buildPermissionArtifacts(dir);
  assert.deepEqual(Object.keys(artifacts).sort(), [...PERMISSION_ARTIFACT_PATHS].sort());
  for (const file of PERMISSION_ARTIFACT_PATHS) assert.equal(artifacts[file].replace(/\r\n?/gu, '\n'), read(file), `demo parity: ${file}`);
});

/*
 * 정밀 점검의 권한 투영 판정(planPermissionProjection)은 생성기의 판정과 같은 함수를 쓴다. 원본 저장소에서 core 구성 밖 권한을 쓰는
 * 핸들러를 지워지는 것으로 모사해, 남는 바인딩·화면·넘기는 page 가 구성 밖 권한을 요구하거나 남는 page 에 카탈로그 키가 없으면 실패하는
 * 것을 확인한다(실제 구성은 정밀 점검 시험이 본다).
 */
test('the deep permission plan refuses a retained binding, screen entry or redirect page outside the composition', () => {
  const core = compose({ preset: 'core' });
  const codes = new Set(core.permissionCodes);
  const sources = readPermissionSources(root);
  // 남는 page 는 화면과 넘기는 page 를 모두 담는다(/admin/security/role 은 권한 작업대로 넘기는 page 다).
  const keptPageRoutes = new Set(['/', '/admin/system/menus', '/admin/security/role']);
  const handlerFile = row => bindingHandlerSource(row.handler, file => fs.existsSync(path.join(root, file)));
  const removedFiles = new Set(sources.policies.operationBindings.filter(row => row.access === 'PERMISSION' && !codes.has(row.permission))
    .map(handlerFile));
  const removed = file => removedFiles.has(file);
  const plan = planPermissionProjection({ sourceRoot: root, composition: core, removed, keptPageRoutes, sources });
  assert.equal(plan.permissions, core.permissionCodes.length);
  assert.ok(plan.removedOperationBindings > 0 && plan.operationBindings > 0);
  // 남는(메일 밖) 바인딩 하나가 구성 밖 권한을 요구하게 만들면 실패한다.
  const tampered = structuredClone(sources);
  const userRead = tampered.policies.operationBindings.find(row => row.permission === 'USER_READ' && !removed(handlerFile(row)));
  userRead.permission = 'MAIL_SEND';
  assert.throws(() => planPermissionProjection({ sourceRoot: root, composition: core, removed, keptPageRoutes, sources: tampered }),
    new RegExp(`retained operation binding ${userRead.method} ${userRead.path.replace(/[{}]/gu, '\\$&')} needs MAIL_SEND outside the composition`, 'u'));
  // 남는 화면의 진입 권한이 구성 밖이면 실패한다.
  const screenTampered = structuredClone(sources);
  screenTampered.registry.screens.find(screen => screen.route === '/admin/system/menus').entry.permissions.push('MAIL_SEND');
  assert.throws(() => planPermissionProjection({ sourceRoot: root, composition: core, removed, keptPageRoutes, sources: screenTampered }),
    /retained screen \/admin\/system\/menus needs entry permissions outside the composition: MAIL_SEND/);
  // 화면 목록에 없는 넘기는 page 도 생성기처럼 카탈로그로 판정한다 — 진입 권한이 구성 밖이면 실패한다(트랙 B 검토 #1).
  const redirectTampered = structuredClone(sources);
  assert.ok(!redirectTampered.registry.screens.some(screen => screen.route === '/admin/security/role'), '/admin/security/role is a redirect page');
  redirectTampered.catalog.pagePermissions['/admin/security/role'] = [...redirectTampered.catalog.pagePermissions['/admin/security/role'], 'MAIL_SEND'];
  assert.throws(() => planPermissionProjection({ sourceRoot: root, composition: core, removed, keptPageRoutes, sources: redirectTampered }),
    /retained page permissions need codes outside the composition: \/admin\/security\/role needs MAIL_SEND/);
  // 남는 page 에 카탈로그 키가 없으면 실패한다.
  const unregistered = structuredClone(sources);
  delete unregistered.catalog.pagePermissions['/admin/security/role'];
  assert.throws(() => planPermissionProjection({ sourceRoot: root, composition: core, removed, keptPageRoutes, sources: unregistered }),
    /Unregistered page permission in projected artifact: \/admin\/security\/role/);
  // 구성에 남지 않는 page 의 카탈로그 행은 판정하지 않는다(대조군 — 생성물에서 빠지는 행이다).
  assert.doesNotThrow(() => planPermissionProjection({ sourceRoot: root, composition: core, removed,
    keptPageRoutes: new Set(['/', '/admin/system/menus']), sources: redirectTampered }));
});

/*
 * 생성기·정밀 점검·생성물 무결성 검사는 frontend 의존성 없이 이 투영을 적재한다(생성기 화면은 frontend 를 설치하지 않은 곳에서도 돈다).
 * TypeScript 를 적재 시점에 읽는 모듈(화면 목록 생성기와 그 축 3 사슬)은 정적 import 닫힘에 없어야 한다.
 */
test('permission projection modules do not statically load the TypeScript-backed screen registry chain', () => {
  const tsBacked = ['scripts/generate-screen-registry.mjs', 'scripts/operation-consumer-census.mjs', 'scripts/generated-boundary-census.mjs'];
  const closure = start => {
    const seen = new Set();
    const visit = file => {
      if (seen.has(file)) return;
      seen.add(file);
      const source = read(file).replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
      // `from` 이 있는 import·export 와 부수 효과만 쓰는 맨 import(`import './x.mjs'`)를 모두 따라간다.
      for (const match of source.matchAll(/^\s*(?:(?:import|export)\b[^;]*?\bfrom\s+|import\s+)['"](\.\/[^'"]+)['"]/gmu)) {
        visit(path.posix.join(path.posix.dirname(file), match[1]));
      }
    };
    visit(start);
    return seen;
  };
  for (const start of ['scripts/reusable-permission-projection.mjs', 'scripts/screen-registry-model.mjs', 'scripts/generate-permissions.mjs',
    'scripts/reusable-governance-projection.mjs', 'scripts/reusable-governance-integrity.mjs', 'scripts/project-composer-deep.mjs']) {
    const reached = closure(start);
    assert.ok(reached.size > 1, `${start}: the import scan must follow local imports`);
    for (const module of tsBacked) assert.ok(!reached.has(module), `${start} statically reaches ${module}`);
  }
  // 대조군: 화면 목록 생성기는 그 사슬을 정적으로 적재한다(스캐너가 실제로 사슬을 따라간다).
  assert.ok(closure('scripts/generate-screen-registry.mjs').has('scripts/generated-boundary-census.mjs'));
});
