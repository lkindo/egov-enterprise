import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateRegistration, formatReport, KINDS, loadRegistrationInputs } from './domain-registration-doctor.mjs';

// 등록 점검기(DEC-OPS-382)의 판정 논리. 점검기는 게이트가 아니라 안내 도구다 — 실제 저장소의 등록 상태는 각 원장의 계약이
// 이미 검사하므로, 여기서는 합성 입력으로 '빠진 지점을 빠졌다고 말하는가'만 고정한다(같은 불변식을 두 번 검사하지 않는다).

function inputs(overrides = {}) {
  return {
    featureId: 'probe',
    featurePath: 'config/modules/probe.json',
    feature: {
      id: 'probe',
      owns: { tables: ['tb_probe'], routes: ['/admin/probe'], exactRoutes: [], permissionDomains: ['PROBE'] },
    },
    presets: { presets: [{ id: 'demo', domains: ['probe'] }] },
    migrations: { 'V2_999__create_tb_probe.sql': 'CREATE TABLE IF NOT EXISTS tb_probe (probe_id bigint);' },
    controllers: {
      'ProbeApiController.java': "@PreAuthorize(\"@permissionPolicy.allowed(authentication, 'nuri.api.controller.business.probe.ProbeApiController#getList')\")",
    },
    dtoFiles: [],
    permissionCatalog: {
      permissions: [{ code: 'PROBE_READ', domain: 'PROBE' }],
      pagePermissions: { '/admin/probe': ['PROBE_READ'] },
    },
    authorizationPolicies: { operationBindings: [{ handler: 'nuri.api.controller.business.probe.ProbeApiController#getList' }] },
    permissionBundles: { bundles: [{ permissions: ['PROBE_READ'] }], excluded: [] },
    routeLedger: { routes: [{ route: '/admin/probe' }] },
    inputContractCensus: {},
    ciWorkflow: '',
    responseContractSource: '',
    entityLinterSource: 'private static final int EXPECTED_ENTITY_COUNT = 1;',
    entityFileCount: 1,
    projectedHarness: false,
    ...overrides,
  };
}

const missing = (report) => report.points.filter((entry) => entry.status === 'missing').map((entry) => entry.id);

test('모든 사람 판정 지점이 등록된 기능은 빠진 지점이 없다', () => {
  assert.deepEqual(missing(evaluateRegistration(inputs())), []);
});

test('기능 선언이 없으면 그것만 알리고 멈춘다', () => {
  const report = evaluateRegistration(inputs({ feature: null }));
  assert.deepEqual(missing(report), ['feature-file']);
  assert.equal(report.points.length, 1);
});

test('표를 만드는 마이그레이션이 없으면 빠졌다고 말한다', () => {
  assert.deepEqual(missing(evaluateRegistration(inputs({ migrations: {} }))), ['table:tb_probe']);
});

test('소유 접두 아래 화면이 원장에 없거나 진입 권한이 없으면 빠졌다고 말한다', () => {
  assert.deepEqual(missing(evaluateRegistration(inputs({ routeLedger: { routes: [] } }))), ['route-ledger:/admin/probe']);
  assert.deepEqual(
    missing(evaluateRegistration(inputs({
      routeLedger: { routes: [{ route: '/admin/probe' }, { route: '/admin/probe/detail' }] },
    }))),
    ['page-permission:/admin/probe/detail'],
  );
});

test('IA 처분 행은 판정하지 않고 처분 계약을 가리킨다(승인 전 처분 원장을 실행 코드가 읽지 않는다)', () => {
  const report = evaluateRegistration(inputs());
  const disposition = report.points.filter((entry) => entry.id.startsWith('disposition'));
  assert.deepEqual(disposition.map((entry) => [entry.id, entry.status]), [['disposition', 'review']]);
  assert.equal(disposition[0].path, 'scripts/ui-navigation-disposition-contract.test.mjs');
  assert.match(disposition[0].detail, /owner PR 리뷰/u);
});

test('정확 라우트로 선언한 접두는 그 화면 하나만 덮는다', () => {
  const report = evaluateRegistration(inputs({
    feature: { id: 'probe', owns: { tables: [], routes: ['/admin/probe'], exactRoutes: ['/admin/probe'], permissionDomains: [] } },
    routeLedger: { routes: [{ route: '/admin/probe' }, { route: '/admin/probe/detail' }] },
  }));
  assert.ok(!report.points.some((entry) => entry.id === 'page-permission:/admin/probe/detail'));
});

test('바인딩이 없는 handler 와 묶음·제외 목록 밖의 권한을 빠졌다고 말한다', () => {
  assert.deepEqual(
    missing(evaluateRegistration(inputs({ authorizationPolicies: { operationBindings: [] } }))),
    ['operation-bindings:ProbeApiController.java'],
  );
  assert.deepEqual(
    missing(evaluateRegistration(inputs({ permissionBundles: { bundles: [], excluded: [] } }))),
    ['permission-bundles'],
  );
});

const CREATE_CONTROLLER = {
  'api-server/src/main/java/nuri/api/controller/business/probe/ProbeApiController.java': [
    '    @PostMapping',
    '    @ResponseStatus(HttpStatus.CREATED)',
    '    public ApiResponse<Long> create(@Valid @RequestBody ProbeDto.Request request) {',
    '    @PostMapping("/{id}/archive")',
    '    public ApiResponse<Void> archive(@PathVariable Long id) {',
  ].join('\n'),
};

test('분류되지 않은 생성 POST 를 빠졌다고 말하고, 행위형 POST 는 보지 않는다(ADR-0036)', () => {
  const report = evaluateRegistration(inputs({ controllers: CREATE_CONTROLLER }));
  const census = report.points.find((entry) => entry.id.startsWith('created-post-census:'));
  assert.equal(census.status, 'missing');
  assert.match(census.detail, /분류되지 않은 POST: create —/);
  assert.doesNotMatch(census.detail, /archive/);
  const classified = evaluateRegistration(inputs({ controllers: CREATE_CONTROLLER,
    responseContractSource: 'CONTROLLER_PREFIX + "business/probe/ProbeApiController.java#create",' }));
  assert.equal(classified.points.find((entry) => entry.id.startsWith('created-post-census:')).status, 'ok');
});

test('엔티티 수가 린터 기대와 다르면 census 재판정을 빠졌다고 말하고, 생성물은 사람 확인으로 둔다', () => {
  assert.equal(evaluateRegistration(inputs()).points.find((entry) => entry.id === 'entity-census').status, 'ok');
  assert.deepEqual(missing(evaluateRegistration(inputs({ entityFileCount: 2 }))), ['entity-census']);
  assert.equal(evaluateRegistration(inputs({ entityFileCount: 2, projectedHarness: true }))
    .points.find((entry) => entry.id === 'entity-census').status, 'review');
});

test('생성기 지점과 선택 등재는 판정하지 않고 안내만 한다', () => {
  const report = evaluateRegistration(inputs());
  const generated = report.points.filter((entry) => entry.kind === KINDS.GENERATED);
  assert.ok(generated.length >= 3);
  assert.ok(generated.every((entry) => entry.status === 'info'));
  assert.ok(report.points.some((entry) => entry.kind === KINDS.OPTIONAL && entry.id === 'pit-scope'));
  assert.match(formatReport(report), /빠진 사람 판정 지점이 없다/);
});

test('CLI 입력 읽기는 저장소 파일만 읽고 쓰지 않는다(실제 기능 하나로 형태만 본다)', () => {
  const report = evaluateRegistration(loadRegistrationInputs('scrap'));
  assert.equal(report.featureId, 'scrap');
  assert.ok(report.points.some((entry) => entry.id === 'feature-file' && entry.status === 'ok'));
});
