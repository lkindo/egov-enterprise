import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import {
  analyze,
  analyzeScreenReachability,
  analyzeWriteAffordance,
  analyzeWritePermissionNeeds,
  baseOperationId,
  isAliasDuplicate,
  isServiceFile,
  isTestFile,
  operationCountErrors,
  outermostFunctionAt,
  owningMethodAt,
  pathSuffix,
  readContributionEntries,
  runCensus,
  stripTsComments,
} from './operation-consumer-census.mjs';

const ts = createRequire(resolve('frontend/package.json'))('typescript');

function sourceFileOf(text) {
  return ts.createSourceFile('fixture.ts', text, ts.ScriptTarget.Latest, true);
}

/**
 * 🔌 operation consumer census 계약.
 *
 * 이 게이트는 저장소의 도달성 검사가 못 보던 축을 닫는다 — 백엔드 린터들은 "컨트롤러가 서비스를
 * 부르는가"까지만 보고, generated-boundary census 는 "호출부가 있는 것 중" 생성 경로 채택률만
 * 잰다. 그래서 프런트 호출부가 0 인 완성 도메인(ISG)이 두 게이트를 모두 통과했다.
 *
 * 아래 테스트는 green 뿐 아니라 **의도적 위반이 red 가 되는지**까지 확인한다(AGENTS H5).
 */

function fixtureOperation(operationId, overrides = {}) {
  return {
    operationId,
    tags: ['Fixture'],
    parameters: [],
    ...overrides,
  };
}

function fixtureDoc(paths) {
  return { paths };
}

test('현재 저장소의 모든 operation 이 소비·별칭·원장 중 하나로 분류된다', () => {
  const result = runCensus();
  assert.deepEqual(result.errors, [], JSON.stringify(result.errors, null, 2));

  const { summary } = result;
  assert.equal(summary.unclassified, 0);
  assert.equal(
    summary.consumed + summary.aliasDerived + summary.ledgered,
    summary.operationCount,
    '세 분류의 합이 전체와 정확히 같아야 한다 — 어느 하나라도 이중 집계되면 사각이 생긴다',
  );
  assert.ok(summary.unwired <= summary.unwiredMax);
});

test('소비자도 원장 항목도 없는 operation 은 red 다 — 이 게이트의 존재 이유', () => {
  const result = analyze({
    apiDoc: fixtureDoc({ '/api/v1/orphans': { get: fixtureOperation('getOrphans') } }),
    boundaries: { records: [] },
    ledger: { expected: { unwiredMax: 0 }, entries: [] },
  });
  assert.equal(result.summary.unclassified, 1);
  assert.deepEqual(result.errors.map((error) => error.code), ['UNCONSUMED_OPERATION']);
});

test('MFA BFF 원장은 실제 검증된 동작만 인정하고 응답 검증 제거를 red로 유지한다', () => {
  const root = mkdtempSync(join(tmpdir(), 'mfa-operation-consumer-'));
  const route = 'frontend/src/app/api/auth/mfa/[...path]/route.ts';
  try {
    const actualApi = JSON.parse(readFileSync(resolve('api-docs.json'), 'utf8'));
    const apiDoc = { ...actualApi, paths: Object.fromEntries(Object.entries(actualApi.paths)
      .filter(([path]) => path.startsWith('/api/v1/auth/mfa/'))) };
    writeFileSync(join(root, 'api-docs.json'), JSON.stringify(apiDoc));
    for (const file of [route, 'frontend/src/types/generated-operations.ts']) {
      mkdirSync(dirname(join(root, file)), { recursive: true });
      writeFileSync(join(root, file), readFileSync(resolve(file), 'utf8'));
    }
    // 서술자는 진입 파일 옆 태그 묶음 모듈에 있다(codegen-zod.js) — 진입 파일과 함께 옮긴다.
    cpSync(resolve('frontend/src/types/generated-operations'), join(root, 'frontend/src/types/generated-operations'), { recursive: true });
    const entries = Object.values(apiDoc.paths).flatMap(path => Object.values(path))
      .filter(operation => operation.operationId)
      .map(operation => ({ operationId: operation.operationId, category: 'bff-route-handler',
        note: 'Restricted MFA proof is consumed by the actual fixed-action BFF.', evidence: [route] }));
    assert.equal(entries.length, 9);
    const inspect = () => analyze({ apiDoc, boundaries: { records: [] },
      ledger: { expected: { unwiredMax: 0 }, entries }, repoRoot: root });
    assert.deepEqual(inspect().errors, []);
    const source = readFileSync(join(root, route), 'utf8');
    writeFileSync(join(root, route), source.replaceAll('parseGeneratedOperationResponse(', 'unvalidatedResponse('));
    const failures = inspect().errors.filter(error => error.code === 'UNPROVEN_EVIDENCE');
    assert.equal(failures.length, 9);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('별칭 중복은 기계 파생이다 — 기본 operation 이 소비 중일 때만, 그리고 원장 등재는 거부된다', () => {
  const paths = {
    '/api/v1/things/{id}': { get: fixtureOperation('getThing') },
    '/api/v1/admin/system/things/{id}': { get: fixtureOperation('getThing_1') },
  };

  // 기본이 소비 중이면 별칭은 자동 통과한다.
  const live = analyze({
    apiDoc: fixtureDoc(paths),
    boundaries: { records: [{ operationId: 'getThing' }] },
    ledger: { expected: { unwiredMax: 0 }, entries: [] },
  });
  assert.deepEqual(live.errors, []);
  assert.equal(live.summary.aliasDerived, 1);

  // 기본이 소비되지 않으면 별칭도 통과하지 못한다 — 둘 다 죽은 표면이기 때문이다.
  const dead = analyze({
    apiDoc: fixtureDoc(paths),
    boundaries: { records: [] },
    ledger: { expected: { unwiredMax: 0 }, entries: [] },
  });
  assert.equal(dead.summary.aliasDerived, 0);
  assert.equal(dead.errors.filter((error) => error.code === 'UNCONSUMED_OPERATION').length, 2);

  // 파생 가능한 별칭을 원장에 넣어 예외처럼 보이게 하는 것도 막는다.
  const listed = analyze({
    apiDoc: fixtureDoc(paths),
    boundaries: { records: [{ operationId: 'getThing' }] },
    ledger: {
      expected: { unwiredMax: 1 },
      entries: [{ operationId: 'getThing_1', category: 'unwired', note: 'x', evidence: [] }],
    },
  });
  assert.deepEqual(listed.errors.map((error) => error.code), ['DERIVABLE_LEDGER_ENTRY']);
});

test('접미가 같아도 메서드·태그·파라미터가 다르면 별칭이 아니다 — 이름 충돌을 별칭으로 오인하지 않는다', () => {
  const byId = new Map([
    ['save', { operationId: 'save', method: 'POST', tag: 'A', parameterKey: 'path:id' }],
  ]);
  const consumed = new Set(['save']);

  assert.equal(
    isAliasDuplicate({ operationId: 'save_1', method: 'POST', tag: 'A', parameterKey: 'path:id' }, byId, consumed),
    true,
  );
  assert.equal(
    isAliasDuplicate({ operationId: 'save_1', method: 'PUT', tag: 'A', parameterKey: 'path:id' }, byId, consumed),
    false,
    '메서드가 다르면 같은 핸들러가 아니다',
  );
  assert.equal(
    isAliasDuplicate({ operationId: 'save_1', method: 'POST', tag: 'B', parameterKey: 'path:id' }, byId, consumed),
    false,
    '태그가 다르면 같은 핸들러가 아니다',
  );
  assert.equal(
    isAliasDuplicate({ operationId: 'save_1', method: 'POST', tag: 'A', parameterKey: 'query:page' }, byId, consumed),
    false,
    '파라미터 집합이 다르면 같은 핸들러가 아니다',
  );
});

test('evidence 를 요구하는 카테고리는 이름만으로 통과하지 못한다', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'op-consumer-census-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const apiDoc = fixtureDoc({ '/api/v1/auth/login': { post: fixtureOperation('login') } });
  const boundaries = { records: [] };
  const entry = (evidence) => ({
    expected: { unwiredMax: 0 },
    entries: [{ operationId: 'login', category: 'bff-route-handler', note: 'BFF', evidence }],
  });

  // 파일이 없으면 red.
  assert.deepEqual(
    analyze({ apiDoc, boundaries, ledger: entry(['frontend/src/app/api/auth/login/route.ts']), repoRoot: root })
      .errors.map((error) => error.code),
    ['UNPROVEN_EVIDENCE'],
  );

  // 파일이 있어도 경로 접미를 참조하지 않으면 red.
  const routeFile = join(root, 'frontend/src/app/api/auth/login/route.ts');
  mkdirSync(dirname(routeFile), { recursive: true });
  writeFileSync(routeFile, 'export const POST = () => new Response();\n');
  assert.deepEqual(
    analyze({ apiDoc, boundaries, ledger: entry(['frontend/src/app/api/auth/login/route.ts']), repoRoot: root })
      .errors.map((error) => error.code),
    ['UNPROVEN_EVIDENCE'],
  );

  // 접미를 실제로 부를 때만 green.
  writeFileSync(routeFile, "await axios.post(`${BACKEND_URL}/auth/login`, body);\n");
  assert.deepEqual(
    analyze({ apiDoc, boundaries, ledger: entry(['frontend/src/app/api/auth/login/route.ts']), repoRoot: root }).errors,
    [],
  );

  // 저장소 밖을 가리키는 evidence 는 통과하지 못한다.
  assert.deepEqual(
    analyze({ apiDoc, boundaries, ledger: entry(['../outside/route.ts']), repoRoot: root })
      .errors.map((error) => error.code),
    ['UNPROVEN_EVIDENCE'],
  );
});

test('원장은 서랍이 되지 못한다 — 래칫·stale·해소된 항목·미지의 카테고리·사유 누락이 모두 red 다', () => {
  const apiDoc = fixtureDoc({
    '/api/v1/a': { get: fixtureOperation('getA') },
    '/api/v1/b': { get: fixtureOperation('getB') },
  });

  // 래칫 초과
  assert.equal(
    analyze({
      apiDoc,
      boundaries: { records: [] },
      ledger: {
        expected: { unwiredMax: 1 },
        entries: [
          { operationId: 'getA', category: 'unwired', note: 'debt', evidence: [] },
          { operationId: 'getB', category: 'unwired', note: 'debt', evidence: [] },
        ],
      },
    }).errors.some((error) => error.code === 'UNWIRED_RATCHET'),
    true,
  );

  // 사라진 operation 의 항목
  assert.deepEqual(
    analyze({
      apiDoc,
      boundaries: { records: [{ operationId: 'getA' }, { operationId: 'getB' }] },
      ledger: { expected: { unwiredMax: 1 }, entries: [{ operationId: 'gone', category: 'unwired', note: 'x', evidence: [] }] },
    }).errors.map((error) => error.code),
    ['STALE_LEDGER_ENTRY'],
  );

  // 이미 소비되기 시작한 항목은 반드시 걷어야 한다
  assert.deepEqual(
    analyze({
      apiDoc,
      boundaries: { records: [{ operationId: 'getA' }, { operationId: 'getB' }] },
      ledger: { expected: { unwiredMax: 1 }, entries: [{ operationId: 'getA', category: 'unwired', note: 'x', evidence: [] }] },
    }).errors.map((error) => error.code),
    ['RESOLVED_LEDGER_ENTRY'],
  );

  // 카테고리 어휘 밖
  assert.deepEqual(
    analyze({
      apiDoc,
      boundaries: { records: [{ operationId: 'getB' }] },
      ledger: { expected: { unwiredMax: 1 }, entries: [{ operationId: 'getA', category: 'someday', note: 'x', evidence: [] }] },
    }).errors.map((error) => error.code),
    ['UNKNOWN_CATEGORY'],
  );

  // 사유 없는 항목
  assert.deepEqual(
    analyze({
      apiDoc,
      boundaries: { records: [{ operationId: 'getB' }] },
      ledger: { expected: { unwiredMax: 1 }, entries: [{ operationId: 'getA', category: 'unwired', note: '  ', evidence: [] }] },
    }).errors.map((error) => error.code),
    ['MISSING_NOTE'],
  );

  // 같은 operation 중복 등재
  assert.equal(
    analyze({
      apiDoc,
      boundaries: { records: [{ operationId: 'getB' }] },
      ledger: {
        expected: { unwiredMax: 2 },
        entries: [
          { operationId: 'getA', category: 'unwired', note: 'x', evidence: [] },
          { operationId: 'getA', category: 'unwired', note: 'y', evidence: [] },
        ],
      },
    }).errors.some((error) => error.code === 'DUPLICATE_LEDGER_ENTRY'),
    true,
  );
});

test('operation 총계 드리프트와 잘못된 래칫 값이 red 다', () => {
  const apiDoc = fixtureDoc({ '/api/v1/a': { get: fixtureOperation('getA') } });
  const boundaries = { records: [{ operationId: 'getA' }] };

  assert.equal(
    analyze({ apiDoc, boundaries, ledger: { expected: { operationCount: 2, unwiredMax: 0 }, entries: [] } })
      .errors.map((error) => error.code)[0],
    'OPERATION_COUNT_DRIFT',
  );
  assert.equal(
    analyze({ apiDoc, boundaries, ledger: { expected: { unwiredMax: -1 }, entries: [] } })
      .errors.map((error) => error.code)[0],
    'INVALID_RATCHET',
  );
  // 같은 수를 맞추면 드리프트가 없다 — 드리프트 판정이 늘 붉은 것이 아니다.
  assert.deepEqual(
    analyze({ apiDoc, boundaries, ledger: { expected: { operationCount: 1, unwiredMax: 0 }, entries: [] } }).errors, []);
});

// operation 수의 확인 지점은 이 census 하나다(생성 operation 계약의 같은 단언은 2026-10-28 걷었다). 드리프트 대조는 값이 숫자일 때만
// 돌므로, 저장소 원장에서 키가 빠지거나 숫자가 아니면 runCensus 가 따로 붉힌다 — 걷은 단언이 잡던 그 경우다.
test('저장소 원장의 operation 수가 빠지거나 정수가 아니면 red 다 — 드리프트 대조가 조용히 사라지지 않는다', () => {
  for (const expected of [{}, { operationCount: '1' }, { operationCount: 1.5 }, { operationCount: -1 }, { operationCount: null }]) {
    assert.deepEqual(operationCountErrors({ expected }).map((error) => error.code), ['INVALID_OPERATION_COUNT'], JSON.stringify(expected));
  }
  assert.deepEqual(operationCountErrors({}).map((error) => error.code), ['INVALID_OPERATION_COUNT']);
  assert.deepEqual(operationCountErrors({ expected: { operationCount: 0 } }), []);
});

test('operationId 가 없는 문서는 조용히 넘어가지 않고 fail-closed 한다', () => {
  assert.throws(
    () => analyze({
      apiDoc: fixtureDoc({ '/api/v1/a': { get: { tags: ['X'] } } }),
      boundaries: { records: [] },
      ledger: { expected: { unwiredMax: 0 }, entries: [] },
    }),
    /operation without operationId/u,
  );
});

test('축 2 — 현재 저장소의 화면 도달성이 래칫 안에 있고 귀속 실패가 없다', () => {
  const result = runCensus();
  assert.deepEqual(result.errors, [], JSON.stringify(result.errors, null, 2));
  assert.equal(
    result.reachability.unattributed.length,
    0,
    '귀속 실패는 통과가 아니라 red 다 — 못 본 호출부를 본 것처럼 세면 래칫이 거짓으로 낮아진다',
  );
  assert.ok(result.summary.screenOrphans <= result.summary.screenOrphanMax);
  assert.ok(result.summary.serviceMethods > result.summary.screenOrphans);
});

test('소유자 귀속은 클래스 프로퍼티 화살표 함수를 놓치지 않는다 — 1차 시도의 오탐 원인', () => {
  // 정규식으로 "  name(" 만 찾으면 이 형태를 못 봐서 호출부가 생성자의 super(...) 에 귀속됐다.
  const text = [
    'class Service extends Base {',
    '  constructor() {',
    '    super("/base");',
    '  }',
    '',
    '  arrowMethod = async () => {',
    '    return this.execute();',
    '  };',
    '',
    '  async normalMethod() {',
    '    return this.execute();',
    '  }',
    '}',
  ].join('\n');
  const sourceFile = sourceFileOf(text);

  assert.equal(owningMethodAt(ts, sourceFile, 7), 'arrowMethod');
  assert.equal(owningMethodAt(ts, sourceFile, 11), 'normalMethod');
  // 생성자 안의 호출부는 화면이 부를 수 있는 '메서드' 가 아니다 — null 로 두어 귀속 실패(red)가 되게 한다.
  //   통과시키면 아무도 부를 수 없는 호출부가 조용히 도달 가능으로 집계된다.
  assert.equal(owningMethodAt(ts, sourceFile, 3), null);
});

test('객체 리터럴·변수 초기화 형태의 서비스도 소유자를 정확히 찾는다', () => {
  const objectLiteral = sourceFileOf([
    'export const svc = {',
    '  fetchThing: async () => {',
    '    return call();',
    '  },',
    '};',
  ].join('\n'));
  assert.equal(owningMethodAt(ts, objectLiteral, 3), 'fetchThing');

  const variableInit = sourceFileOf([
    'const loadThing = async () => {',
    '  return call();',
    '};',
  ].join('\n'));
  assert.equal(owningMethodAt(ts, variableInit, 2), 'loadThing');
});

test('화면 소비 판정은 접두가 같은 다른 메서드를 소비로 착각하지 않는다', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'screen-reach-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const serviceFile = join(root, 'frontend/src/services/ThingService.ts');
  mkdirSync(dirname(serviceFile), { recursive: true });
  writeFileSync(serviceFile, [
    'class ThingService {',
    '  async getThing() {',
    '    return this.executeGenerated(getThingOperation, {});',
    '  }',
    '}',
  ].join('\n'));

  // 화면은 getThingList 만 부른다 — getThing 은 부르지 않는다.
  const screenFile = join(root, 'frontend/src/app/page.tsx');
  mkdirSync(dirname(screenFile), { recursive: true });
  writeFileSync(screenFile, 'export default () => thingService.getThingList();\n');

  const boundaries = { records: [{ file: 'frontend/src/services/ThingService.ts', line: 3, operationId: 'getThing' }] };
  const result = analyzeScreenReachability({ boundaries, repoRoot: root, ts });

  assert.equal(result.unattributed.length, 0);
  assert.deepEqual(result.orphans.map((entry) => entry.method), ['getThing']);

  // 실제로 그 메서드를 부르면 통과한다.
  writeFileSync(screenFile, 'export default () => thingService.getThing();\n');
  assert.deepEqual(analyzeScreenReachability({ boundaries, repoRoot: root, ts }).orphans, []);
});

test('.bind() 재수출을 named import 로 직접 부르는 형태도 소비로 센다 — 2026-09-07 거짓 양성 정정', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'screen-reach-direct-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  // deptScheduleService 형태: 클래스 메서드를 모듈 레벨 named export 로 다시 내보낸다.
  const serviceFile = join(root, 'frontend/src/services/DirectService.ts');
  mkdirSync(dirname(serviceFile), { recursive: true });
  writeFileSync(serviceFile, [
    'class DirectService {',
    '  async loadMonthly() {',
    '    return this.executeGenerated(loadMonthlyOperation, {});',
    '  }',
    '}',
    'export const directService = new DirectService();',
    'export const loadMonthly = directService.loadMonthly.bind(directService);',
  ].join('\n'));

  const boundaries = { records: [{ file: 'frontend/src/services/DirectService.ts', line: 3, operationId: 'loadMonthly' }] };
  const screenFile = join(root, 'frontend/src/app/page.tsx');
  mkdirSync(dirname(screenFile), { recursive: true });

  // 점 없는 직접 호출 — 정정 전에는 이것을 고아로 셌다(실측: deptScheduleService 5메서드).
  writeFileSync(screenFile, [
    "import { loadMonthly } from '@/services/DirectService';",
    'export default () => loadMonthly({ yearMonth: "2026-09" });',
  ].join('\n'));
  assert.deepEqual(analyzeScreenReachability({ boundaries, repoRoot: root, ts }).orphans, []);

  // 이름이 접두로만 겹치는 다른 심볼은 소비로 세지 않는다.
  writeFileSync(screenFile, 'export default () => loadMonthlyTotals();\n');
  assert.deepEqual(
    analyzeScreenReachability({ boundaries, repoRoot: root, ts }).orphans.map((e) => e.method),
    ['loadMonthly'],
  );

  // 접미가 겹치는 속성 접근도 오인하지 않는다.
  writeFileSync(screenFile, 'export default () => x.somethingLoadMonthly();\n');
  assert.deepEqual(
    analyzeScreenReachability({ boundaries, repoRoot: root, ts }).orphans.map((e) => e.method),
    ['loadMonthly'],
  );
});

test('서비스 밖 호출부와 테스트 파일은 소비 판정에서 제외된다', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'screen-reach-scope-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  const serviceFile = join(root, 'frontend/src/services/OnlyTestedService.ts');
  mkdirSync(dirname(serviceFile), { recursive: true });
  writeFileSync(serviceFile, [
    'class OnlyTestedService {',
    '  async doThing() {',
    '    return this.executeGenerated(doThingOperation, {});',
    '  }',
    '}',
  ].join('\n'));

  // 유일한 소비자가 단위 테스트라면 고아다 — 이 게이트의 존재 이유(deleteRespondent 실측 사례).
  const testFile = join(root, 'frontend/src/services/__tests__/OnlyTestedService.test.ts');
  mkdirSync(dirname(testFile), { recursive: true });
  writeFileSync(testFile, 'await onlyTestedService.doThing();\n');

  const boundaries = { records: [{ file: 'frontend/src/services/OnlyTestedService.ts', line: 3, operationId: 'doThing' }] };
  assert.deepEqual(
    analyzeScreenReachability({ boundaries, repoRoot: root, ts }).orphans.map((e) => e.method),
    ['doThing'],
  );

  assert.equal(isServiceFile('frontend/src/services/A.ts'), true);
  assert.equal(isServiceFile('frontend/src/app/page.tsx'), false);
  assert.equal(isTestFile('frontend/src/services/__tests__/A.test.ts'), true);
  assert.equal(isTestFile('frontend/src/services/A.ts'), false);
});

test("superseded-surface 는 도피처가 아니다 — 대체자가 실재하고 소비 중이어야 통과한다", () => {
  const apiDoc = fixtureDoc({
    '/api/v1/old': { get: fixtureOperation('getOld') },
    '/api/v1/new': { get: fixtureOperation('getNew') },
    '/api/v1/alsoDead': { get: fixtureOperation('getAlsoDead') },
  });
  const boundaries = { records: [{ operationId: 'getNew' }] };
  const ledger = (supersededBy) => ({
    expected: { unwiredMax: 1 },
    entries: [
      { operationId: 'getOld', category: 'superseded-surface', note: '대체됨', supersededBy },
      { operationId: 'getAlsoDead', category: 'unwired', note: 'debt', evidence: [] },
    ],
  });

  // 살아 있는 대체자를 지목하면 통과하고, 부채로도 세지 않는다.
  const ok = analyze({ apiDoc, boundaries, ledger: ledger(['getNew']) });
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.summary.unwired, 1, 'superseded 는 unwired 부채에 들어가지 않는다');

  // 대체자를 적지 않으면 red — 기록만으로 통과시키지 않는다.
  assert.equal(
    analyze({ apiDoc, boundaries, ledger: ledger([]) }).errors.map((e) => e.code)[0],
    'MISSING_SUPERSEDED_BY',
  );

  // 없는 operation 을 대체자로 적으면 red.
  assert.equal(
    analyze({ apiDoc, boundaries, ledger: ledger(['getGhost']) }).errors.map((e) => e.code)[0],
    'UNKNOWN_SUPERSEDED_BY',
  );

  // 대체자 자신이 죽어 있으면 red — 죽은 표면으로 죽은 표면을 정당화하지 못한다.
  assert.equal(
    analyze({ apiDoc, boundaries, ledger: ledger(['getAlsoDead']) }).errors.map((e) => e.code)[0],
    'DEAD_SUPERSEDED_BY',
  );
});

test('별칭은 기본이 소비 중이거나 원장에 등재됐을 때 파생된다 — 같은 사유를 두 벌로 적지 않는다', () => {
  const apiDoc = fixtureDoc({
    '/api/v1/things': { get: fixtureOperation('getThings') },
    '/api/v1/admin/system/things': { get: fixtureOperation('getThings_1') },
  });

  // 기본이 원장에 등재되면 별칭은 자동 파생이다(별칭은 새 표면이 아니다).
  const ledgeredBase = analyze({
    apiDoc,
    boundaries: { records: [] },
    ledger: {
      expected: { unwiredMax: 1 },
      entries: [{ operationId: 'getThings', category: 'unwired', note: '화면 없음', evidence: [] }],
    },
  });
  assert.deepEqual(ledgeredBase.errors, []);
  assert.equal(ledgeredBase.summary.aliasDerived, 1);
  assert.equal(ledgeredBase.summary.unwired, 1, '별칭이 부채를 두 번 세지 않는다');

  // 그 상태에서 별칭까지 원장에 적으면 중복이라 red 다.
  assert.deepEqual(
    analyze({
      apiDoc,
      boundaries: { records: [] },
      ledger: {
        expected: { unwiredMax: 2 },
        entries: [
          { operationId: 'getThings', category: 'unwired', note: '화면 없음', evidence: [] },
          { operationId: 'getThings_1', category: 'unwired', note: '중복 기재', evidence: [] },
        ],
      },
    }).errors.map((e) => e.code),
    ['DERIVABLE_LEDGER_ENTRY'],
  );

  // 기본도 별칭도 판단이 없으면 둘 다 red 다 — 파생은 판단을 대신하지 않는다.
  assert.equal(
    analyze({
      apiDoc,
      boundaries: { records: [] },
      ledger: { expected: { unwiredMax: 0 }, entries: [] },
    }).errors.filter((e) => e.code === 'UNCONSUMED_OPERATION').length,
    2,
  );
});

test('보조 함수는 경로 접미와 springdoc 접미를 정확히 다룬다', () => {
  assert.equal(pathSuffix('/api/v1/auth/login'), '/auth/login');
  assert.equal(pathSuffix('/api/v2/things'), '/things');
  assert.equal(pathSuffix('/actuator/health'), '/actuator/health');
  assert.equal(baseOperationId('getThing_12'), 'getThing');
  assert.equal(baseOperationId('getThing'), 'getThing');
  assert.equal(baseOperationId('get_1Thing'), 'get_1Thing', '접미가 아닌 중간 밑줄은 건드리지 않는다');
});

// ───────────────────────────────────────────────────────────────────────────
// 축 3 — 쓰기 operation 의 기능 권한을 화면이 표시 판정에 쓰는가 (2026-10-01)
// ───────────────────────────────────────────────────────────────────────────

/** 쓰기 하나(DELETE /api/v1/things/{id} → THING_DELETE)를 가진 최소 저장소를 만든다. */
function affordanceFixture(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'write-affordance-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (relative, lines) => {
    const file = join(root, relative);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, Array.isArray(lines) ? lines.join('\n') : lines);
  };
  write('frontend/src/services/ThingService.ts', [
    'class ThingService {',
    '  async getThings() {',
    '    return this.executeGenerated(getThingsOperation, {});',
    '  }',
    '  async deleteThing(id) {',
    '    return this.executeGenerated(deleteThingOperation, { path: { id } });',
    '  }',
    '}',
    'export const thingService = new ThingService();',
  ]);
  for (const [relative, lines] of Object.entries(files)) write(relative, lines);
  const inputs = {
    boundaries: { records: [
      { file: 'frontend/src/services/ThingService.ts', line: 3, method: 'get', target: '/api/v1/things', operationId: 'getThings' },
      { file: 'frontend/src/services/ThingService.ts', line: 6, method: 'delete', target: '/api/v1/things/{id}', operationId: 'deleteThing' },
    ] },
    policies: { operationBindings: [
      { method: 'GET', path: '/api/v1/things', access: 'PERMISSION', permission: 'THING_READ' },
      { method: 'DELETE', path: '/api/v1/things/{id}', access: 'PERMISSION', permission: 'THING_DELETE' },
    ] },
    repoRoot: root,
    ts,
  };
  return {
    root,
    analyze: (catalog = { pagePermissions: {}, pagePermissionModes: {} }) => analyzeWriteAffordance({ ...inputs, catalog }),
    needs: () => analyzeWritePermissionNeeds(inputs),
  };
}

const SERVICE_IMPORT = "import { thingService } from '@/services/ThingService';";

test('축 3 — 현재 저장소의 쓰기 권한 표시 부채가 래칫과 정확히 같다', () => {
  const result = runCensus();
  assert.deepEqual(result.errors, [], JSON.stringify(result.errors, null, 2));
  assert.equal(result.summary.ungatedWrites, result.summary.ungatedWriteMax);
  assert.ok(result.affordance.writeMethods > 100, '쓰기 메서드를 거의 못 찾았다면 판정이 비어 있는 것이다');
});

test('축 3 — 쓰기를 부르면서 그 권한을 한 번도 보지 않는 화면은 부채로 센다', (t) => {
  const { analyze } = affordanceFixture(t, {
    'frontend/src/app/admin/things/page.tsx': 'export default function Page() { return null; }',
    'frontend/src/app/admin/things/ThingClient.tsx': [
      SERVICE_IMPORT,
      'export function ThingClient() {',
      '  return <button onClick={() => thingService.deleteThing(1)}>삭제</button>;',
      '}',
    ],
  });
  assert.deepEqual(analyze().ungated.map((entry) => [entry.file, entry.permission]), [
    ['frontend/src/app/admin/things/ThingClient.tsx', 'THING_DELETE'],
  ]);
});

test('축 3 — 조회만 부르는 화면과, 권한을 표시 판정에 쓰는 화면은 부채가 아니다', (t) => {
  const { analyze } = affordanceFixture(t, {
    'frontend/src/app/admin/things/ListOnly.tsx': [
      SERVICE_IMPORT,
      'export const ListOnly = () => <ul>{String(thingService.getThings())}</ul>;',
    ],
    'frontend/src/app/admin/things/Gated.tsx': [
      SERVICE_IMPORT,
      "export const Gated = ({ user }) => canPermission(user, 'THING_DELETE')",
      '  ? <button onClick={() => thingService.deleteThing(1)}>삭제</button> : null;',
    ],
  });
  assert.deepEqual(analyze().ungated, []);
});

test('축 3 — 다른 서비스의 동명 메서드를 부르는 화면은 세지 않는다', (t) => {
  const { analyze } = affordanceFixture(t, {
    'frontend/src/app/admin/other/Other.tsx': [
      "import { otherService } from '@/services/OtherService';",
      'export const Other = () => <button onClick={() => otherService.deleteThing(1)}>삭제</button>;',
    ],
  });
  assert.deepEqual(analyze().ungated, []);
});

test('축 3 — 같은 이름의 메서드가 두 서비스에 있으면 수신자로 가른다', (t) => {
  // 본인 댓글 삭제와 관리자 댓글 삭제처럼 이름이 같은 쓰기가 있다. 수신자를 보지 않으면 한 호출에 두 권한이 붙는다.
  const { analyze } = affordanceFixture(t, {
    'frontend/src/services/ThingAdminService.ts': [
      'class ThingAdminService {',
      '  async deleteThing(id) {',
      '    return this.executeGenerated(deleteThingAdminOperation, { path: { id } });',
      '  }',
      '}',
      'export const thingAdminService = new ThingAdminService();',
    ],
    'frontend/src/app/admin/things/Own.tsx': [
      SERVICE_IMPORT,
      "import { thingAdminService } from '@/services/ThingAdminService';",
      'export const Own = () => <><button onClick={() => thingService.deleteThing(1)}>삭제</button>{String(thingAdminService)}</>;',
    ],
  });
  // ThingAdminService 의 쓰기는 경계 기록에 없으므로(권한 없음) 이 화면이 필요로 하는 것은 THING_DELETE 하나다.
  assert.deepEqual(analyze().ungated.map((entry) => entry.via), ['ThingService.deleteThing']);
});

test('축 3 — 주석 속의 호출과 권한 코드는 세지 않는다', (t) => {
  const commentOnlyCall = affordanceFixture(t, {
    'frontend/src/app/admin/things/History.tsx': [
      SERVICE_IMPORT,
      '// 종전에는 thingService.deleteThing() 을 불렀다.',
      'export const History = () => <ul>{String(thingService.getThings())}</ul>;',
    ],
  });
  assert.deepEqual(commentOnlyCall.analyze().ungated, []);

  // 권한 코드를 주석에만 적어 놓고 버튼은 그대로 보이는 화면은 통과하지 못한다.
  const commentOnlyGate = affordanceFixture(t, {
    'frontend/src/app/admin/things/Fake.tsx': [
      SERVICE_IMPORT,
      "// canPermission(user, 'THING_DELETE')",
      'export const Fake = () => <button onClick={() => thingService.deleteThing(1)}>삭제</button>;',
    ],
  });
  assert.equal(commentOnlyGate.analyze().ungated.length, 1);

  assert.equal(stripTsComments('a(); // b()\nc("//x"); /* d() */ e();'), 'a();       \nc("//x");           e();');
});

test('축 3 — 서버 액션·조회 옵션을 거친 쓰기도 그것을 쓰는 화면에 귀속된다', (t) => {
  const { analyze } = affordanceFixture(t, {
    'frontend/src/app/actions/thingActions.ts': [
      "'use server';",
      SERVICE_IMPORT,
      'export async function removeThingAction(id) {',
      '  await thingService.deleteThing(id);',
      '}',
      'export async function listThingsAction() {',
      '  return thingService.getThings();',
      '}',
    ],
    'frontend/src/app/admin/things/ViaAction.tsx': [
      "import { removeThingAction } from '@/app/actions/thingActions';",
      'export const ViaAction = () => <button onClick={() => removeThingAction(1)}>삭제</button>;',
    ],
    'frontend/src/app/admin/things/ReadsViaAction.tsx': [
      "import { listThingsAction } from '@/app/actions/thingActions';",
      'export const ReadsViaAction = () => <button onClick={() => listThingsAction()}>새로고침</button>;',
    ],
  });
  // 중간 모듈 자신은 버튼을 그리지 않으므로 부채가 아니고, 조회 액션만 쓰는 화면도 아니다.
  assert.deepEqual(analyze().ungated.map((entry) => [entry.file, entry.permission, entry.via]), [
    ['frontend/src/app/admin/things/ViaAction.tsx', 'THING_DELETE', 'thingActions.removeThingAction'],
  ]);
});

test('축 3 — 조회 옵션 래퍼와 이름이 같은 모듈 경로를 import 해도 그 래퍼를 부른 것으로 세지 않는다 (2026-10-03)', (t) => {
  const options = [
    SERVICE_IMPORT,
    'export const thingMutationOptions = {',
    '  confirm: () => mutationOptions({',
    '    mutationFn: (id) => thingService.deleteThing(id),',
    '  }),',
    '};',
  ];
  // 확인 대화 모듈의 경로(confirm-modal)에 래퍼 이름(confirm)이 들어 있을 뿐, 이 화면은 그 래퍼를 쓰지 않는다.
  const pathOnly = affordanceFixture(t, {
    'frontend/src/queries/thing-query-options.ts': options,
    'frontend/src/app/admin/things/Draft.tsx': [
      "import { thingMutationOptions } from '@/queries/thing-query-options';",
      "import { useConfirm } from '@/app/components/ui/confirm-modal';",
      'export const Draft = () => <ul>{String(thingMutationOptions) + String(useConfirm)}</ul>;',
    ],
  });
  assert.deepEqual(pathOnly.analyze().ungated, []);

  // 대조군 — 래퍼를 실제로 쓰면 여전히 부채다.
  const used = affordanceFixture(t, {
    'frontend/src/queries/thing-query-options.ts': options,
    'frontend/src/app/admin/things/Uses.tsx': [
      "import { thingMutationOptions } from '@/queries/thing-query-options';",
      "import { useConfirm } from '@/app/components/ui/confirm-modal';",
      'export const Uses = () => <button onClick={() => useMutation(thingMutationOptions.confirm())}>{String(useConfirm)}</button>;',
    ],
  });
  assert.deepEqual(used.analyze().ungated.map((entry) => [entry.file, entry.permission, entry.via]), [
    ['frontend/src/app/admin/things/Uses.tsx', 'THING_DELETE', 'thing-query-options.confirm'],
  ]);
});

test('축 3 — 대화상자는 그것을 여는 화면이 모두 권한을 볼 때만 통과한다', (t) => {
  const dialog = [
    SERVICE_IMPORT,
    'export const ThingDeleteDialog = () => <button onClick={() => thingService.deleteThing(1)}>삭제</button>;',
  ];
  const gatedOpener = [
    "import { ThingDeleteDialog } from './ThingDeleteDialog';",
    "export const Opener = ({ user }) => canPermission(user, 'THING_DELETE') ? <ThingDeleteDialog /> : null;",
  ];
  const openOpener = [
    "import { ThingDeleteDialog } from './ThingDeleteDialog';",
    'export const OtherOpener = () => <ThingDeleteDialog />;',
  ];

  const allGated = affordanceFixture(t, {
    'frontend/src/components/things/ThingDeleteDialog.tsx': dialog,
    'frontend/src/components/things/Opener.tsx': gatedOpener,
  });
  assert.deepEqual(allGated.analyze().ungated, []);

  // 여는 화면 가운데 하나라도 권한을 보지 않으면, 그 길로는 버튼이 그대로 보인다.
  const oneOpen = affordanceFixture(t, {
    'frontend/src/components/things/ThingDeleteDialog.tsx': dialog,
    'frontend/src/components/things/Opener.tsx': gatedOpener,
    'frontend/src/components/things/OtherOpener.tsx': openOpener,
  });
  assert.deepEqual(oneOpen.analyze().ungated.map((entry) => entry.file), [
    'frontend/src/components/things/ThingDeleteDialog.tsx',
  ]);
});

test('축 3 — 권한을 보는 화면이 직접과 중간 조각을 거쳐 두 길로 여는 대화상자는 통과한다(2026-10-18 결재 기안 분리)', (t) => {
  // 결재 기안 대화상자 → 저장 결재선 패널 → 결재자 선택기, 그리고 대화상자 → 결재자 선택기. 두 번째 길에서 이미 판정한
  // 대화상자를 순환으로 보면 선택기가 부채로 잡힌다.
  const dialog = [
    SERVICE_IMPORT,
    'export const ThingDeleteDialog = () => <button onClick={() => thingService.deleteThing(1)}>삭제</button>;',
  ];
  const panel = [
    "import { ThingDeleteDialog } from './ThingDeleteDialog';",
    'export const Panel = () => <ThingDeleteDialog />;',
  ];
  const opener = [
    "import { ThingDeleteDialog } from './ThingDeleteDialog';",
    "import { Panel } from './Panel';",
    "export const Opener = ({ user }) => canPermission(user, 'THING_DELETE') ? <><ThingDeleteDialog /><Panel /></> : null;",
  ];
  const diamond = affordanceFixture(t, {
    'frontend/src/components/things/ThingDeleteDialog.tsx': dialog,
    'frontend/src/components/things/Panel.tsx': panel,
    'frontend/src/components/things/Opener.tsx': opener,
  });
  assert.deepEqual(diamond.analyze().ungated, []);

  // 중간 조각을 권한을 보지 않는 화면도 열면 그 길로는 버튼이 보인다 — 기억한 결과가 이 길을 가리지 않는다.
  const leaked = affordanceFixture(t, {
    'frontend/src/components/things/ThingDeleteDialog.tsx': dialog,
    'frontend/src/components/things/Panel.tsx': panel,
    'frontend/src/components/things/Opener.tsx': opener,
    'frontend/src/components/things/OtherOpener.tsx': [
      "import { Panel } from './Panel';",
      'export const OtherOpener = () => <Panel />;',
    ],
  });
  assert.deepEqual(leaked.analyze().ungated.map((entry) => entry.file), [
    'frontend/src/components/things/ThingDeleteDialog.tsx',
  ]);
});

/*
  [스크랩 슬롯] 슬롯 기여는 셸이 그리는 버튼의 쓰기 함수를 가리킨다. 기여 파일을 모집단에서 빼면 그 쓰기가 어느 화면에도 귀속되지
  않아 부채가 사라진 것처럼 보인다(H2). 기여를 여는 화면은 그 슬롯 레지스트리를 import 하는 화면이고, 레지스트리를 도우미(.ts)가
  읽으면 그 도우미를 import 하는 화면으로 한 번 더 잇는다.
*/
function slotFixture(t, {
  rule = "{ always: '시험' }", host, helper,
  writePath = 'frontend/src/queries/thing-post-action.ts',
  writeImport = `'${writePath.replace(/^frontend\/src\//u, '@/').replace(/\.ts$/u, '')}'`,
  contributionImport = `import { submitThing } from ${writeImport};`,
  submit = 'submitThing',
  extra = {},
} = {}) {
  return affordanceFixture(t, {
    'frontend/src/extensions/slots.ts': 'export const defineContributions = (slot, entries) => entries;',
    [writePath]: [
      SERVICE_IMPORT,
      'export async function submitThing(context) {',
      '  await thingService.deleteThing(context.id);',
      '}',
    ],
    'frontend/src/extensions/things/post-actions.ts': [
      "import { defineContributions } from '@/extensions/slots';",
      contributionImport,
      "export default defineContributions('post-actions', [",
      `  { id: 'thing', submit: ${submit}, visibleWhen: ${rule} },`,
      ']);',
    ],
    ...extra,
    'frontend/src/extensions/generated-post-actions.ts': [
      "import things from './things/post-actions';",
      'export const postActions = [things];',
    ],
    ...(helper ? {
      'frontend/src/app/components/ui/thing-actions.ts': [
        "import { postActions } from '@/extensions/generated-post-actions';",
        'export const thingActions = () => postActions.flat();',
      ],
    } : {}),
    'frontend/src/app/admin/things/page.tsx': 'export default function Page() { return null; }',
    'frontend/src/app/admin/things/ThingHost.tsx': [
      helper ? "import { thingActions } from '@/app/components/ui/thing-actions';" : "import { postActions } from '@/extensions/generated-post-actions';",
      host ?? 'export const ThingHost = () => null;',
      `export const used = ${helper ? 'thingActions' : 'postActions'};`,
    ],
  });
}

test('축 3 — 슬롯 기여의 쓰기는 기여 파일에 귀속되고, 그 기여를 여는 화면(레지스트리 importer)이 권한을 보지 않으면 부채다', (t) => {
  assert.deepEqual(slotFixture(t).analyze().ungated.map((entry) => [entry.file, entry.permission, entry.via]), [
    ['frontend/src/extensions/things/post-actions.ts', 'THING_DELETE', 'thing-post-action.submitThing'],
  ]);
  // 기여 자신의 노출 술어가 그 권한이면 가려진다.
  assert.deepEqual(slotFixture(t, { rule: "{ permissions: ['THING_DELETE'] }" }).analyze().ungated, []);
  // 레지스트리를 읽는 화면이 그 권한을 보면 가려진다.
  assert.deepEqual(slotFixture(t, { host: "export const ThingHost = ({ user }) => canPermission(user, 'THING_DELETE');" }).analyze().ungated, []);
  // 사유 문자열에 권한 이름을 따옴표 없이 적은 것은 판정이 아니다.
  assert.equal(slotFixture(t, { rule: "{ always: '저장은 서버가 THING_DELETE 로 막는다.' }" }).analyze().ungated.length, 1);
});

/*
  [허브 분해 H1·GAP-SLOT-001] 허브 탭은 허브마다 슬롯(hub-tabs-<허브>)과 레지스트리가 따로다. 기여의 쓰기는 그 허브 레지스트리를 읽는
  셸로만 이어진다 — 다른 허브 화면이 그 쓰기를 가진 것처럼 보이지 않고(권한 작업대 오표시), 판정도 엉뚱한 셸의 권한 언급에 기대지 않는다.
*/
function hubTabFixture(t, { collaboration = 'export const Hub = () => null;', monitoring = 'export const Hub = () => null;', hub = 'collaboration' } = {}) {
  const registry = (target) => (target === hub
    ? [`import things from './things/hub-tabs-${target}';`, 'export const tabs = [things];'] : ['export const tabs = [];']);
  return affordanceFixture(t, {
    'frontend/src/extensions/slots.ts': 'export const defineContributions = (slot, entries) => entries;',
    'frontend/src/app/admin/things/ThingTab.tsx': [
      SERVICE_IMPORT,
      'export const ThingTab = () => <button onClick={() => thingService.deleteThing(1)}>삭제</button>;',
    ],
    [`frontend/src/extensions/things/hub-tabs-${hub}.ts`]: [
      "import { defineContributions } from '@/extensions/slots';",
      "import { ThingTab } from '@/app/admin/things/ThingTab';",
      `export default defineContributions('hub-tabs-${hub}', [`,
      "  { id: 'THINGS', order: 10, label: '물건', view: { Component: ThingTab }, visibleWhen: { always: '시험' } },",
      ']);',
    ],
    'frontend/src/extensions/generated-hub-tabs-collaboration.ts': registry('collaboration'),
    'frontend/src/extensions/generated-hub-tabs-monitoring.ts': registry('monitoring'),
    ...(hub === 'collaboration' || hub === 'monitoring' ? {} : { [`frontend/src/extensions/generated-hub-tabs-${hub}.ts`]: registry(hub) }),
    'frontend/src/app/admin/collaboration/CollaborationHubClient.tsx': [
      "import { tabs } from '@/extensions/generated-hub-tabs-collaboration';", collaboration, 'export const used = tabs;'],
    'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx': [
      "import { tabs } from '@/extensions/generated-hub-tabs-monitoring';", monitoring, 'export const used = tabs;'],
  });
}

test('축 3 — 허브 탭 기여의 쓰기는 그 허브 레지스트리를 읽는 셸에만 귀속된다(허브 분해 H1·GAP-SLOT-001)', (t) => {
  const gate = "export const Hub = ({ user }) => canPermission(user, 'THING_DELETE');";
  // 협업 허브 셸이 권한을 보면 가려진다. 감시 허브는 다른 레지스트리를 읽으므로 판정에 끼지 않는다.
  assert.deepEqual(hubTabFixture(t, { collaboration: gate }).analyze().ungated, []);
  // 감시 허브가 권한을 봐도 협업 허브 탭의 쓰기를 가리지 못한다.
  assert.deepEqual(hubTabFixture(t, { monitoring: gate }).analyze().ungated.map((entry) => [entry.file, entry.permission]), [
    ['frontend/src/app/admin/things/ThingTab.tsx', 'THING_DELETE'],
  ]);
  // 반대 허브도 같다 — 감시 허브 기여의 쓰기는 협업 허브 셸의 권한 언급으로 가려지지 않는다.
  assert.equal(hubTabFixture(t, { collaboration: gate, hub: 'monitoring' }).analyze().ungated.length, 1);
  assert.deepEqual(hubTabFixture(t, { monitoring: gate, hub: 'monitoring' }).analyze().ungated, []);
  // 아무 셸도 읽지 않는 허브 레지스트리의 기여는 어느 셸에도 귀속되지 않아 부채로 남는다(조용히 가려지지 않는다).
  assert.equal(hubTabFixture(t, { collaboration: gate, monitoring: gate, hub: 'nowhere' }).analyze().ungated.length, 1);
});

test('축 3 — 기여의 판정은 visibleWhen.permissions 원소뿐이다: 사유 문자열에 따옴표 친 권한 이름은 판정이 아니다 (스크랩 슬롯 검토)', (t) => {
  // 기여 소스 전체에서 따옴표 친 권한 이름을 찾던 판정은, 서버 권한을 설명하는 always 사유를 노출 판정으로 셌다(거짓 감소, H2).
  for (const rule of [
    "{ always: \"저장은 서버가 'THING_DELETE' 로 막는다.\" }",
    '{ always: "저장은 서버가 `THING_DELETE` 로 막는다." }',
  ]) {
    assert.deepEqual(slotFixture(t, { rule }).analyze().ungated.map((entry) => [entry.file, entry.permission]), [
      ['frontend/src/extensions/things/post-actions.ts', 'THING_DELETE'],
    ], rule);
  }
  // 대조: 노출 술어의 권한 배열이면(as const 로 감싸도) 판정이다.
  assert.deepEqual(slotFixture(t, { rule: "{ permissions: ['THING_DELETE'] as const }" }).analyze().ungated, []);
  assert.deepEqual(slotFixture(t, { rule: "({ permissions: ['THING_DELETE'] }) as const" }).analyze().ungated, []);
});

/*
  [10단계 검토] 판독기가 읽을 수 없는 노출 술어는 실패한다. 종전에는 가져온 이름(`permissions: [CODE]`)·배열 이름·펼침·조립 문자열이 술어
  없는 항목으로 읽혀 화면 목록 귀속과 '원본 귀속 0 실패' 를 조용히 빠져나갔고, 축 3 은 판정 없는 기여로 셌다. 판독 실패를 부채나 통과로
  바꾸지 않는다.
*/
test('기여 항목의 노출 술어를 판독할 수 없으면 실패한다 — 가져온 이름·펼침·조립 값·단축 속성 (10단계 검토)', (t) => {
  const read = (rule, entry = `{ id: 'thing', visibleWhen: ${rule} }`) => readContributionEntries(ts, ts.createSourceFile(
    'frontend/src/extensions/things/post-actions.ts',
    `import { CODES, CODE, RULE, rule } from '@/app/things/codes';\nexport default [${entry}];\n`,
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
  ));
  for (const rule of ['{ permissions: [CODE] }', '{ permissions: CODES }', '{ permissions: [...CODES] }', "{ permissions: ['THING_' + 'DELETE'] }"]) {
    assert.throws(() => read(rule), /post-actions\.ts:2: 기여 항목의 visibleWhen\.permissions 가 문자열 리터럴 배열이 아니다/u, rule);
  }
  for (const rule of ['RULE', 'rule()']) assert.throws(() => read(rule), /post-actions\.ts:2: 기여 항목의 visibleWhen 이 객체 리터럴이 아니다/u, rule);
  assert.throws(() => read(null, "{ id: 'thing', visibleWhen }"), /visibleWhen 이 객체 리터럴이 아니다/u);
  // 대조: 문자열 리터럴 배열(원소를 as const 로 감싸도)은 그대로 읽고, 술어 없는 규칙은 null 이다.
  assert.deepEqual(read("{ permissions: ['THING_DELETE' as const, 'THING_READ'] }")[0].permissions, ['THING_DELETE', 'THING_READ']);
  assert.equal(read("{ page: '/admin/things' }")[0].permissions, null);
  // 축 3 도 실패한다.
  assert.throws(() => slotFixture(t, { rule: '{ permissions: [THING_CODE] }' }).analyze(), /문자열 리터럴 배열이 아니다/u);
});

test('축 3 — 기여가 가리키는 쓰기 함수는 중간 모듈 디렉터리 밖에 있어도 기여에 귀속된다 (스크랩 슬롯 검토)', (t) => {
  // 경계 계약은 기여가 자기 기능 경로 아래 어떤 모듈이든 import 하게 둔다. 쓰기 함수를 src/queries 밖으로 옮기기만 해서 부채가
  // 사라지면 안 된다(H2). 기여가 import 하는 비화면·비서비스 모듈은 어느 디렉터리에 있든 중간 모듈로 읽는다.
  for (const [writePath, writeImport] of [
    ['frontend/src/app/admin/things/thing-post-action.ts', undefined],
    ['frontend/src/lib/thing-post-action.ts', undefined],
    ['frontend/src/components/things/thing-post-action.ts', undefined],
    ['frontend/src/components/things/thing-post-action.ts', "'../../components/things/thing-post-action'"],
  ]) {
    assert.deepEqual(slotFixture(t, { writePath, writeImport }).analyze().ungated.map((entry) => [entry.file, entry.permission, entry.via]), [
      ['frontend/src/extensions/things/post-actions.ts', 'THING_DELETE', 'thing-post-action.submitThing'],
    ], writePath);
  }
  // 서비스가 .bind() 로 내보낸 쓰기 함수를 그대로 가리켜도(별칭 포함) 그 쓰기다 — 기여는 부르지 않고 값으로 둔다.
  const boundService = {
    'frontend/src/services/ThingService.ts': [
      'class ThingService {',
      '  async getThings() {',
      '    return this.executeGenerated(getThingsOperation, {});',
      '  }',
      '  async deleteThing(id) {',
      '    return this.executeGenerated(deleteThingOperation, { path: { id } });',
      '  }',
      '}',
      'export const thingService = new ThingService();',
      'export const deleteThing = thingService.deleteThing.bind(thingService);',
    ],
  };
  for (const [contributionImport, submit] of [
    ["import { deleteThing } from '@/services/ThingService';", 'deleteThing'],
    ["import { deleteThing as removeThing } from '@/services/ThingService';", 'removeThing'],
  ]) {
    assert.deepEqual(slotFixture(t, { contributionImport, submit, extra: boundService }).analyze().ungated
      .map((entry) => [entry.file, entry.permission, entry.via]), [
      ['frontend/src/extensions/things/post-actions.ts', 'THING_DELETE', 'ThingService.deleteThing'],
    ], contributionImport);
  }
  // 대조: 조회 함수만 가리키는 기여는 부채가 아니다.
  assert.deepEqual(slotFixture(t, {
    contributionImport: "import { getThings } from '@/services/ThingService';", submit: 'getThings', extra: boundService,
  }).analyze().ungated, []);
});

test('축 3 — 레지스트리를 도우미(.ts)가 읽으면 그 도우미를 import 하는 화면이 기여를 여는 화면이다', (t) => {
  const gated = slotFixture(t, { helper: true, host: "export const ThingHost = ({ user }) => canPermission(user, 'THING_DELETE');" });
  assert.deepEqual(gated.analyze().ungated, []);
  assert.equal(slotFixture(t, { helper: true }).analyze().ungated.length, 1);
});

/*
  [10단계 10a] 노출 술어는 항목 단위로 읽는다. 한 기여 파일이 배치가 다른 항목을 함께 둘 수 있다(게시판 → 통계: 셸 탭 둘과 요약 칸 하나).
  파일 단위로 합치면 요약 칸의 권한(STATS_ADMIN_READ)이 셸 탭의 것으로 읽혀, 소비자를 배치별로 나눈 표가 있어도 셸 화면에 붙는다.
*/
const MIXED_STATS_CONTRIBUTION = [
  "import { defineContributions } from '@/extensions/slots';",
  "import { ThingStatsBody } from '@/app/admin/things/ThingStatsBody';",
  "export default defineContributions('stats-panels', [",
  "  { id: 'TAB', placement: 'hub-tab', kind: 'body', Body: ThingStatsBody, visibleWhen: { page: '/admin/stats/board' } },",
  "  { id: 'CARD', placement: 'overview-card', field: 'totalPosts', visibleWhen: { permissions: ['STATS_ADMIN_READ'] as const } },",
  "  { id: 'BODY', placement: 'hub-tab', kind: 'body', Body: ThingStatsBody, visibleWhen: ({ permissions: ['SURVEY_READ_ALL'] }) satisfies object },",
  "  { id: 'ALWAYS', placement: 'hub-tab', kind: 'body', Body: ThingStatsBody, visibleWhen: { always: \"서버가 'NOTE_READ' 로 막는다.\" } },",
  ']);',
];

test('기여 항목은 항목 단위로 읽는다 — 배치가 섞인 파일의 술어를 파일 단위로 합치지 않는다 (10단계 10a)', (t) => {
  const source = ts.createSourceFile('stats-panels.ts', MIXED_STATS_CONTRIBUTION.join('\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.deepEqual(readContributionEntries(ts, source), [
    { id: 'TAB', placement: 'hub-tab', permissions: null, page: '/admin/stats/board', always: false },
    { id: 'CARD', placement: 'overview-card', permissions: ['STATS_ADMIN_READ'], page: null, always: false },
    { id: 'BODY', placement: 'hub-tab', permissions: ['SURVEY_READ_ALL'], page: null, always: false },
    // always 사유 속 따옴표 친 권한 이름은 술어가 아니다.
    { id: 'ALWAYS', placement: 'hub-tab', permissions: null, page: null, always: true },
  ]);
  // 소비자 표는 배치별이다(통계 셸 = 기능 탭, 통계 요약 = 요약 칸). 항목의 reader 는 그 배치의 소비자뿐이고, 기여의 importer 는 항목들의 합이다.
  const shell = 'frontend/src/app/admin/stats/IntelligenceHubClient.tsx';
  const overview = 'frontend/src/app/admin/stats/AdminStatsClient.tsx';
  const contribution = 'frontend/src/extensions/things/stats-panels.ts';
  const { needs } = affordanceFixture(t, {
    'frontend/src/extensions/slots.ts': 'export const defineContributions = (slot, entries) => entries;',
    'frontend/src/app/admin/things/ThingStatsBody.tsx': 'export const ThingStatsBody = () => null;',
    [contribution]: MIXED_STATS_CONTRIBUTION,
    'frontend/src/extensions/generated-stats-panels.ts': ["import things from './things/stats-panels';", 'export const statsPanels = [things];'],
    [shell]: ["import { statsPanels } from '@/extensions/generated-stats-panels';", 'export const Shell = () => statsPanels;'],
    [overview]: ["import { statsPanels } from '@/extensions/generated-stats-panels';", 'export const Overview = () => statsPanels;'],
  });
  const analysis = needs();
  assert.deepEqual(analysis.contributionFiles, [contribution]);
  const entries = analysis.visibilityOf(contribution);
  assert.deepEqual(entries.map((entry) => [entry.id, analysis.entryReadersOf(contribution, entry)]), [
    ['TAB', [shell]],
    ['CARD', [overview]],
    ['BODY', [shell]],
    ['ALWAYS', [shell]],
  ]);
  assert.deepEqual(analysis.importersOf(contribution).sort(), [overview, shell]);
  // 축 3 의 기여 판정도 항목 술어의 합이다(사유 문자열은 세지 않는다).
  assert.equal(analysis.mentions(contribution, 'STATS_ADMIN_READ'), true);
  assert.equal(analysis.mentions(contribution, 'NOTE_READ'), false);
  // 소비자 표에 없는 배치의 항목은 reader 가 없다(조용히 다른 소비자로 넘기지 않는다).
  assert.deepEqual(analysis.entryReadersOf(contribution, { ...entries[0], placement: 'bogus' }), []);
});

test('축 3 — 라우트 진입 권한이 그 권한을 보장하면 버튼을 따로 가릴 필요가 없다', (t) => {
  const { analyze } = affordanceFixture(t, {
    'frontend/src/app/admin/things/page.tsx': 'export default function Page() { return null; }',
    'frontend/src/app/admin/things/ThingClient.tsx': [
      SERVICE_IMPORT,
      'export const ThingClient = () => <button onClick={() => thingService.deleteThing(1)}>삭제</button>;',
    ],
  });
  // 요구 권한이 그것 하나뿐이면 들어온 사람은 반드시 가진다.
  assert.deepEqual(analyze({ pagePermissions: { '/admin/things': ['THING_DELETE'] }, pagePermissionModes: {} }).ungated, []);
  // 여럿 중 하나(ANY)면 보장이 아니다 — 조회 권한만으로 들어온 사람에게 삭제가 보인다.
  assert.equal(analyze({ pagePermissions: { '/admin/things': ['THING_READ', 'THING_DELETE'] }, pagePermissionModes: {} }).ungated.length, 1);
  // ALL 이면 다시 보장이다.
  assert.deepEqual(analyze({
    pagePermissions: { '/admin/things': ['THING_READ', 'THING_DELETE'] },
    pagePermissionModes: { '/admin/things': 'ALL' },
  }).ungated, []);
});

test('축 3 — 테스트 파일의 호출은 세지 않고, 가장 바깥 함수가 화면이 부르는 단위다', (t) => {
  const { analyze } = affordanceFixture(t, {
    'frontend/src/app/admin/things/__tests__/ThingClient.test.tsx': [
      SERVICE_IMPORT,
      'thingService.deleteThing(1);',
    ],
  });
  assert.deepEqual(analyze().ungated, []);

  const source = sourceFileOf([
    'export const thingMutationOptions = {',
    '  remove: () => mutationOptions({',
    '    mutationFn: (id) => thingService.deleteThing(id),',
    '  }),',
    '};',
  ].join('\n'));
  assert.equal(outermostFunctionAt(ts, source, 3), 'remove');
});
