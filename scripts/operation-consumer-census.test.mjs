import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  analyze,
  baseOperationId,
  isAliasDuplicate,
  pathSuffix,
  runCensus,
} from './operation-consumer-census.mjs';

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

test('보조 함수는 경로 접미와 springdoc 접미를 정확히 다룬다', () => {
  assert.equal(pathSuffix('/api/v1/auth/login'), '/auth/login');
  assert.equal(pathSuffix('/api/v2/things'), '/things');
  assert.equal(pathSuffix('/actuator/health'), '/actuator/health');
  assert.equal(baseOperationId('getThing_12'), 'getThing');
  assert.equal(baseOperationId('getThing'), 'getThing');
  assert.equal(baseOperationId('get_1Thing'), 'get_1Thing', '접미가 아닌 중간 밑줄은 건드리지 않는다');
});
