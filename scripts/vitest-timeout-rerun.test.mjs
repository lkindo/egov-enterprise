import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import OutcomeReporter, { collectOutcome, main, rerunPlan } from './vitest-timeout-rerun.mjs';

// [2026-10-29 DEC-OPS-390] pre-push Vitest 단계는 실패가 모두 Vitest 시간 초과일 때만 그 파일을 단독으로 한 번 다시 돈다.
//   실제 Vitest 를 띄우지 않고(운영 계약 동시 실행 부하 회피) 판정·재실행 인자·종료 코드를 고정한다. 실제 Vitest 증명(첫 실행에서만
//   16초 걸리는 동기 시험 등)은 PR 설명에 남긴다.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testTimeout = 'Test timed out in 15000ms.\nIf this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".';
const hookTimeout = 'Hook timed out in 10000ms.\nIf this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".';
const assertion = 'expected 1 to be 2 // Object.is equality';

const outcome = (modules, extra = {}) => ({ reason: 'failed', unhandledErrorCount: 0, modules, ...extra });
const timedOut = file => ({ file, errors: [], failed: [{ name: 'scan', errors: [testTimeout] }] });

/** 가짜 실행기: 호출 인자를 모으고 차례로 결과를 돌려준다. */
function runner(...results) {
  const calls = [];
  return { calls, runVitest: args => { calls.push(args); return results[calls.length - 1] ?? { status: 0, outcome: null }; } };
}

function drive(results, { args = ['src/__tests__'], ci = false } = {}) {
  const fake = runner(...results);
  const logs = [];
  const notes = [];
  const code = main(args, { runVitest: fake.runVitest, ci, log: message => logs.push(message), note: note => notes.push(note) });
  return { code, calls: fake.calls, logs, notes };
}

test('a run whose every failure is a Vitest timeout reruns only those files, alone, once', () => {
  const first = { status: 1, outcome: outcome([timedOut('src/__tests__/a.test.ts'), { file: 'src/__tests__/ok.test.ts', errors: [], failed: [] }]) };
  const passed = drive([first, { status: 0, outcome: null }]);
  assert.equal(passed.code, 0);
  assert.deepEqual(passed.calls, [['src/__tests__'], ['src/__tests__/a.test.ts', '--no-file-parallelism', '--bail=1']]);
  assert.deepEqual(passed.notes, [{ files: ['src/__tests__/a.test.ts'], rerunResult: 'passed' }]);
  assert.match(passed.logs.join('\n'), /src\/__tests__\/a\.test\.ts/);
  // 재실행의 어떤 실패도 막는다 — 첫 실행이 시간 초과였다는 사실이 통과를 만들지 않는다.
  const failed = drive([first, { status: 1, outcome: null }]);
  assert.equal(failed.code, 1);
  assert.deepEqual(failed.notes, [{ files: ['src/__tests__/a.test.ts'], rerunResult: 'failed' }]);
  // 경로 필터만 받는다 — 옵션(값이 따로 오는 `--testTimeout 20000` 포함)은 재실행에 옮길 수 없어 돌리지 않고 2 로 막는다.
  for (const args of [['src/__tests__', '--testTimeout', '20000'], ['--silent'], [], ['']]) {
    const rejected = drive([first, { status: 0 }], { args });
    assert.deepEqual([rejected.code, rejected.calls.length], [2, 0], JSON.stringify(args));
  }
  // beforeAll 같은 훅의 시간 초과도 같은 성질이다.
  const hook = { status: 1, outcome: outcome([{ file: 'src/__tests__/b.test.ts', errors: [hookTimeout], failed: [] }]) };
  assert.deepEqual(drive([hook, { status: 0 }]).calls.length, 2);
});

test('any other failure, an unhandled error, an interrupted or unreadable run, or CI blocks without a rerun', () => {
  const cases = [
    ['assertion and timeout mixed', outcome([timedOut('src/__tests__/a.test.ts'),
      { file: 'src/__tests__/b.test.ts', errors: [], failed: [{ name: 'x', errors: [assertion] }] }])],
    ['assertion beside a timeout in one test', outcome([{ file: 'src/__tests__/a.test.ts', errors: [], failed: [{ name: 'x', errors: [testTimeout, assertion] }] }])],
    ['module failed to load', outcome([{ file: 'src/__tests__/a.test.ts', errors: ["Cannot find module './gone'"], failed: [] }])],
    ['unhandled error', outcome([timedOut('src/__tests__/a.test.ts')], { unhandledErrorCount: 1 })],
    ['interrupted', outcome([timedOut('src/__tests__/a.test.ts')], { reason: 'interrupted' })],
    ['failed test without errors', outcome([{ file: 'src/__tests__/a.test.ts', errors: [], failed: [{ name: 'x', errors: [] }] }])],
    ['forged timeout sentence inside an assertion', outcome([{ file: 'src/__tests__/a.test.ts', errors: [],
      failed: [{ name: 'x', errors: [`AssertionError: expected 'Test timed out in 15000ms.' to be ''\n${testTimeout}`] }] }])],
    ['file outside src', outcome([timedOut('../scripts/a.test.ts')])],
    ['no outcome file', null],
  ];
  for (const [label, value] of cases) {
    const result = drive([{ status: 1, outcome: value }, { status: 0 }]);
    assert.equal(result.code, 1, label);
    assert.equal(result.calls.length, 1, `${label}: must not rerun`);
    assert.deepEqual(result.notes, [], label);
  }
  const ci = drive([{ status: 1, outcome: outcome([timedOut('src/__tests__/a.test.ts')]) }, { status: 0 }], { ci: true });
  assert.deepEqual([ci.code, ci.calls.length], [1, 1], 'CI never reruns');
  // 1 이 아닌 종료(설정 오류 등)는 그대로 돌려준다.
  assert.deepEqual([drive([{ status: 2, outcome: null }]).code, drive([{ status: null, outcome: null }]).code], [2, 1]);
  assert.deepEqual(rerunPlan(outcome([])), []);
});

test('the reporter carries module, suite and test errors and the unhandled count to the plan', () => {
  const suite = errors => ({ errors: () => errors });
  const module = {
    relativeModuleId: 'src/__tests__/a.test.ts',
    errors: () => [],
    children: {
      allSuites: () => [suite([{ message: hookTimeout }])][Symbol.iterator](),
      allTests: state => (state === 'failed' ? [{ fullName: 'a > scan', result: () => ({ state: 'failed', errors: [{ message: testTimeout }] }) }] : [])[Symbol.iterator](),
    },
  };
  const collected = collectOutcome([module], [], 'failed');
  assert.deepEqual(collected, { reason: 'failed', unhandledErrorCount: 0,
    modules: [{ file: 'src/__tests__/a.test.ts', errors: [hookTimeout], failed: [{ name: 'a > scan', errors: [testTimeout] }] }] });
  assert.deepEqual(rerunPlan(collected), ['src/__tests__/a.test.ts']);
  assert.deepEqual(rerunPlan(collectOutcome([module], [{ message: 'boom' }], 'failed')), []);
  // 변수 없이 불리면(래퍼 밖의 Vitest 실행) 아무것도 쓰지 않는다.
  const saved = process.env.EGOV_VITEST_OUTCOME;
  delete process.env.EGOV_VITEST_OUTCOME;
  try { assert.doesNotThrow(() => new OutcomeReporter().onTestRunEnd([module], [], 'failed')); } finally {
    if (saved !== undefined) process.env.EGOV_VITEST_OUTCOME = saved;
  }
});

test('only the local pre-push Vitest steps use the rerun; CI keeps its no-retry policy', () => {
  const hook = readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  for (const target of ['src/__tests__ )', '$FRONTEND_SOURCE_CONTRACTS )', 'src/__tests__/cross-stack )']) {
    assert.ok(hook.includes(`node ../scripts/vitest-timeout-rerun.mjs ${target}`), target);
  }
  assert.doesNotMatch(hook, /npx vitest run src\/__tests__|npx vitest run \$FRONTEND_SOURCE_CONTRACTS/);
  for (const workflow of ['ci.yml', 'release.yml']) {
    assert.doesNotMatch(readFileSync(path.join(repoRoot, '.github', 'workflows', workflow), 'utf8'), /vitest-timeout-rerun/, workflow);
  }
  assert.doesNotMatch(readFileSync(path.join(repoRoot, 'frontend', 'vitest.config.mts'), 'utf8'), /\bretry\s*:/, 'no Vitest-level retry');
});
