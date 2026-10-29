import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import test from 'node:test';

import {
  EXIT, ToolError, evaluateSnapshot, main, manifestBinding, parseGhJson, requiredContexts, runGh, waitForRequiredChecks,
} from './pr-checks-wait.mjs';

const repoRoot = resolve(import.meta.dirname, '..');
/** required 목록·workflow·앱은 원장에서 읽는다 — 시험도 목록을 다시 적지 않는다. */
const MANIFEST = JSON.parse(readFileSync(join(repoRoot, '.github', 'required-checks.json'), 'utf8'));
const CONTEXTS = MANIFEST.requiredChecks.map((check) => check.context);
const WORKFLOW = MANIFEST.workflow;
const APP = Number.isSafeInteger(MANIFEST.integrationId) ? MANIFEST.integrationId : 4242;
const BOUND = { ...MANIFEST, integrationId: APP };
const TARGET = CONTEXTS.at(-1);

const SHA = 'c0ffee'.padEnd(40, '0');
const NEW_SHA = 'deadbeef'.padEnd(40, '1');
const SUITE = 7001;
const OTHER_SUITE = 7002;

const ciRun = (over = {}) => ({ id: 501, path: WORKFLOW, head_sha: SHA, status: 'completed', conclusion: 'success', run_attempt: 1,
  check_suite_id: SUITE, ...over });
const otherRun = (over = {}) => ({ id: 502, path: '.github/workflows/dependency-submission.yml', head_sha: SHA, status: 'completed',
  conclusion: 'success', run_attempt: 1, check_suite_id: OTHER_SUITE, ...over });
let nextId = 1000;
function check(name, over = {}) {
  nextId += 1;
  const id = over.id ?? nextId;
  return { id, name, status: 'completed', conclusion: 'success', head_sha: SHA, app: { id: APP }, check_suite: { id: SUITE },
    html_url: `https://github.example/runs/${id}`, ...over };
}
const allGreen = (over = {}) => CONTEXTS.map((context) => check(context, over));
const running = () => ciRun({ status: 'in_progress', conclusion: null });

/** gh 가 그대로 돌려주는 실행 결과(비0 종료·JSON 이 아닌 출력·실행 실패)를 표시한다. */
const RAW = Symbol('raw');
const raw = (status, stdout = '', stderr = '', error = null) => ({ [RAW]: true, status, stdout, stderr, error });
const reply = (value, build) => (value?.[RAW] ? value : { status: 0, stdout: JSON.stringify(build(value)), stderr: '', error: null });

/**
 * 가짜 gh. polls[i] 는 i 번째 폴링(pr view 호출마다 다음 폴링)의 응답이다 — pr(덮어쓸 필드), runs, checks, runsTotal, checksTotal.
 * 마지막 폴링은 계속 되풀이한다. 네트워크를 쓰지 않는다.
 */
function fakeGh(polls) {
  const calls = [];
  let index = -1;
  const gh = (args) => {
    calls.push(args);
    if (args[0] === 'pr') index += 1;
    const poll = polls[Math.min(Math.max(index, 0), polls.length - 1)];
    if (args[0] === 'pr') {
      return reply(poll.pr ?? {}, (pr) => ({ headRefOid: SHA, state: 'OPEN', mergeStateStatus: 'CLEAN', ...pr }));
    }
    if (args[1].includes('/actions/runs?')) {
      return reply(poll.runs ?? [], (runs) => ({ total_count: poll.runsTotal ?? runs.length, workflow_runs: runs }));
    }
    const page = Number(/[?&]page=(\d+)/.exec(args[1])[1]);
    return reply(poll.checks ?? [], (checks) => ({ total_count: poll.checksTotal ?? checks.length,
      check_runs: checks.slice((page - 1) * 100, page * 100) }));
  };
  return { gh, calls };
}

function fakeClock() {
  let at = Date.UTC(2026, 9, 29, 3, 0, 0);
  return { now: () => at, sleep: async (ms) => { at += ms; } };
}

async function wait(polls, options = {}) {
  const { gh, calls } = fakeGh(polls);
  const clock = fakeClock();
  const lines = [];
  const outcome = await waitForRequiredChecks({ pr: 77, manifest: BOUND, gh, sleep: clock.sleep, now: clock.now,
    log: (line) => lines.push(line), ...options });
  return { outcome, calls, lines, last: lines.at(-1) };
}

const checkRunCalls = (calls) => calls.filter((args) => args[0] === 'api' && args[1].includes('/check-runs?'));

test('종료 코드 표: 0 은 pass 하나뿐이다', () => {
  assert.deepEqual({ ...EXIT }, { pass: 0, fail: 1, error: 2, 'head-moved': 3, timeout: 4 });
  assert.deepEqual(Object.entries(EXIT).filter(([, code]) => code === 0).map(([name]) => name), ['pass']);
});

test('ⓐ 늦은 등록: ci 실행이 진행 중이면 등록된 required 가 모두 success 여도 기다리고, 끝나서 전부 success 면 통과한다', async () => {
  // 2026-09-24 PR #735: 집계 체크가 등록되기 전 "pending 0" 을 정착으로 봤다.
  const early = { runs: [running()], checks: [check(CONTEXTS[0])] };
  const result = evaluateSnapshot({ manifest: BOUND, sha: SHA, runs: early.runs, checkRuns: early.checks });
  assert.equal(result.state, 'waiting');
  assert.equal(result.registered, 1);
  assert.equal(evaluateSnapshot({ manifest: BOUND, sha: SHA, runs: [], checkRuns: [] }).state, 'waiting', '실행이 없으면(미시작) 기다린다');

  const { outcome, lines, last, calls } = await wait([early, { runs: [ciRun()], checks: allGreen() }]);
  assert.equal(outcome.code, 0);
  assert.equal(outcome.result, 'pass');
  assert.ok(lines.some((line) => line.includes(`대기 — ${basename(WORKFLOW)} in_progress, required 등록 1/${CONTEXTS.length}·완료 1`)),
    '진행 중 상태를 한 줄로 남긴다');
  assert.equal(last, `RESULT=pass pr=77 sha=${SHA} required=${CONTEXTS.length}/${CONTEXTS.length}`);
  assert.equal(calls.filter((args) => args[0] === 'pr').length, 2);
  for (const context of CONTEXTS) {
    assert.ok(lines.some((line) => line.startsWith(`${context}\tsuccess\thttps://github.example/runs/`)), `required 마다 한 줄: ${context}`);
  }
});

test('ⓑ head 이동: 기다리는 동안 PR head 가 바뀌면 옛 SHA 가 모두 green 이어도 3 이고, 시작 때 --sha 가 head 와 다르면 바로 3 이다', async () => {
  const moved = await wait([
    { runs: [running()], checks: [] },
    { pr: { headRefOid: NEW_SHA }, runs: [ciRun()], checks: allGreen() },
  ]);
  assert.equal(moved.outcome.code, 3);
  assert.equal(moved.outcome.result, 'head-moved');
  assert.ok(moved.last.startsWith(`RESULT=head-moved pr=77 sha=${SHA} `), moved.last);
  assert.equal(moved.calls.at(-1)[0], 'pr', 'head 가 바뀐 뒤에는 옛 SHA 를 조회하지 않는다');

  const mismatch = await wait([{ pr: { headRefOid: NEW_SHA }, runs: [ciRun()], checks: allGreen() }], { sha: SHA });
  assert.equal(mismatch.outcome.code, 3);
  assert.equal(mismatch.calls.length, 1, '실행·체크를 부르지 않는다');
  assert.equal(checkRunCalls(mismatch.calls).length, 0);

  const same = await wait([{ runs: [ciRun()], checks: allGreen() }], { sha: SHA.toUpperCase() });
  assert.equal(same.outcome.code, 0, '--sha 가 head 와 같으면 그대로 기다린다');
});

test('ⓑ PR 이 병합 없이 닫히면 3 이고, 병합된 PR 은 그 head 로 판정한다', async () => {
  const closed = await wait([{ pr: { state: 'CLOSED' }, runs: [ciRun()], checks: allGreen() }]);
  assert.equal(closed.outcome.code, 3);
  assert.equal(closed.calls.length, 1);
  const merged = await wait([{ pr: { state: 'MERGED' }, runs: [ciRun()], checks: allGreen() }]);
  assert.equal(merged.outcome.code, 0);
});

test('ⓒ 판정할 수 없는 gh 출력은 기다리지 않고 첫 폴링에서 2 로 끝난다', async () => {
  // 2026-10-29: jq 가 없어 매번 파싱에 실패한 감시가 4시간 뒤 "시간 초과"로 끝나고 종료 코드를 삼켰다.
  for (const stdout of ['jq: command not found', '', '[]', 'null', '{"headRefOid":"abc","state":"OPEN","mergeStateStatus":"CLEAN"}']) {
    const { outcome, calls, last } = await wait([{ pr: raw(0, stdout) }]);
    assert.equal(outcome.code, 2, `출력: ${JSON.stringify(stdout)}`);
    assert.equal(calls.length, 1, `그 뒤 gh 를 다시 부르지 않는다: ${JSON.stringify(stdout)}`);
    assert.match(last, /^RESULT=error pr=77 /u);
  }
  const runs = await wait([{ runs: raw(0, 'jq: command not found') }]);
  assert.equal(runs.outcome.code, 2);
  assert.equal(runs.calls.length, 2);
  const checks = await wait([{ runs: [ciRun()], checks: raw(0, '{"total_count":1}') }]);
  assert.equal(checks.outcome.code, 2, 'check_runs 가 없는 모양');
  assert.equal(checks.calls.length, 3);
});

test('ⓒ gh 를 실행하지 못하면(ENOENT) 곧바로 2 다', async () => {
  const missing = Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' });
  const { outcome, calls, lines } = await wait([{ pr: raw(null, '', '', missing) }]);
  assert.equal(outcome.code, 2);
  assert.equal(calls.length, 1);
  assert.ok(lines.some((line) => line.includes('ENOENT')));
});

test('ⓓ gh 비0 종료는 일시 오류다 — 회복하면 이어 가고, 연속 3회면 2 다', async () => {
  const flaky = raw(1, '', 'HTTP 502: Bad Gateway (https://api.github.com/graphql)\nmore');
  const recovered = await wait([{ pr: flaky }, { runs: [ciRun()], checks: allGreen() }]);
  assert.equal(recovered.outcome.code, 0);
  assert.ok(recovered.lines.some((line) => line.startsWith('gh 조회 실패 1/3:') && line.includes('HTTP 502')), 'stderr 첫 줄을 남긴다');

  const dead = await wait([{ pr: flaky }, { pr: flaky }, { pr: flaky }, { runs: [ciRun()], checks: allGreen() }]);
  assert.equal(dead.outcome.code, 2);
  assert.equal(dead.calls.length, 3);

  const reset = await wait([{ pr: flaky }, { pr: flaky }, { runs: [running()] }, { pr: flaky }, { pr: flaky },
    { runs: [ciRun()], checks: allGreen() }]);
  assert.equal(reset.outcome.code, 0, '성공한 폴링 뒤에는 연속 횟수를 다시 센다');
  const runsFail = await wait([{ runs: raw(1, '', 'HTTP 500') }, { runs: [ciRun()], checks: allGreen() }]);
  assert.equal(runsFail.outcome.code, 0, '실행 조회의 일시 오류도 같다');
});

test('ⓔ required 가 success 가 아니면 1 이다 — skipped·neutral·cancelled·timed_out 도 실패다', async () => {
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'neutral', 'timed_out', 'action_required']) {
    const checks = [...allGreen().filter((entry) => entry.name !== TARGET), check(TARGET, { conclusion })];
    const { outcome, lines, last } = await wait([{ runs: [ciRun()], checks }]);
    assert.equal(outcome.code, 1, conclusion);
    assert.ok(lines.some((line) => line.startsWith(`${TARGET}\t${conclusion}\t`)), `요약 줄에 ${TARGET} 가 나온다: ${conclusion}`);
    assert.equal(last, `RESULT=fail pr=77 sha=${SHA} required=${CONTEXTS.length - 1}/${CONTEXTS.length}`);
  }
});

test('ⓕ 실행이 끝났는데 원장의 required 가 등록되지 않았으면 기다리지 않고 1 이다', async () => {
  const { outcome, lines, calls } = await wait([{ runs: [ciRun()], checks: allGreen().filter((entry) => entry.name !== TARGET) }]);
  assert.equal(outcome.code, 1);
  assert.equal(calls.filter((args) => args[0] === 'pr').length, 1);
  assert.ok(lines.some((line) => line.startsWith(`${TARGET}\tmissing\t`)));
});

test('ⓖ 다른 suite·다른 앱·다른 커밋의 같은 이름 success 는 세지 않는다(사칭)', async () => {
  const runs = [ciRun(), otherRun()];
  const impostors = {
    'other suite': { check_suite: { id: OTHER_SUITE } },
    'other app': { app: { id: APP + 1 } },
    'no app': { app: null },
    'other commit': { head_sha: NEW_SHA },
  };
  for (const [label, over] of Object.entries(impostors)) {
    const fake = allGreen(over);
    const waiting = evaluateSnapshot({ manifest: BOUND, sha: SHA, runs: [running(), otherRun()], checkRuns: fake });
    assert.equal(waiting.state, 'waiting', label);
    assert.equal(waiting.registered, 0, `${label}: 사칭 체크를 등록으로 세지 않는다`);
    const { outcome } = await wait([{ runs, checks: fake }]);
    assert.equal(outcome.code, 1, label);
  }
  // 실제 실패 뒤에 id 가 더 큰 다른 앱의 success 가 있어도 실패다.
  const shadowed = [...allGreen().filter((entry) => entry.name !== TARGET), check(TARGET, { id: 20, conclusion: 'failure' }),
    check(TARGET, { id: 9_000_000, app: { id: APP + 1 } })];
  assert.equal((await wait([{ runs, checks: shadowed }])).outcome.code, 1);
});

test('ⓗ 재실행: 실행이 다시 queued 인 동안은 옛 failure 가 남아도 기다리고, id 가 큰 새 체크가 success 면 0 이다', async () => {
  const oldFailure = check(TARGET, { id: 10, conclusion: 'failure' });
  const others = CONTEXTS.filter((context) => context !== TARGET).map((context) => check(context));
  const queued = { runs: [ciRun({ status: 'queued', conclusion: null, run_attempt: 2 })], checks: [oldFailure, ...others] };
  assert.equal(evaluateSnapshot({ manifest: BOUND, sha: SHA, runs: queued.runs, checkRuns: queued.checks }).state, 'waiting');
  const { outcome } = await wait([queued, { runs: [ciRun({ run_attempt: 2 })], checks: [oldFailure, ...others, check(TARGET, { id: 10_000_000 })] }]);
  assert.equal(outcome.code, 0);
});

test('ⓘ 시간 초과: 미시작은 start-timeout 에서, 진행 중은 timeout 에서 4 이고 호출 수는 상한 안이다', async () => {
  const intervalMs = 30_000;
  const startTimeoutMs = 15 * 60_000;
  const timeoutMs = 90 * 60_000;
  const notStarted = await wait([{ pr: { mergeStateStatus: 'DIRTY' }, runs: [] }], { intervalMs, startTimeoutMs, timeoutMs });
  assert.equal(notStarted.outcome.code, 4);
  assert.match(notStarted.last, /^RESULT=timeout /u);
  assert.ok(notStarted.lines.some((line) => line.includes('DIRTY')), '충돌로 CI 가 돌지 않을 수 있음을 알린다');
  assert.ok(notStarted.calls.length <= (startTimeoutMs / intervalMs + 1) * 2, `호출 ${notStarted.calls.length}`);
  assert.equal(checkRunCalls(notStarted.calls).length, 0, '실행이 없으면 체크를 조회하지 않는다');

  const quiet = await wait([{ runs: [] }], { intervalMs, startTimeoutMs, timeoutMs });
  assert.ok(!quiet.lines.some((line) => line.includes('DIRTY')));

  const stuck = await wait([{ runs: [running()], checks: [check(CONTEXTS[0])] }], { intervalMs, startTimeoutMs, timeoutMs });
  assert.equal(stuck.outcome.code, 4);
  assert.ok(stuck.calls.length <= (timeoutMs / intervalMs + 1) * 3, `호출 ${stuck.calls.length}`);
  assert.ok(stuck.calls.length > (startTimeoutMs / intervalMs) * 3, '진행 중이면 start-timeout 에서 끝내지 않는다');
  const progress = stuck.lines.filter((line) => line.includes('대기 —'));
  assert.ok(progress.length >= 2 && progress.length <= 12, `상태가 같으면 10분마다 한 줄이다: ${progress.length}`);
});

test('ⓙ 원장이 판정을 구동한다 — 원장 순서, 생성물 원장(integrationId null), 원장에 더한 context', async () => {
  assert.deepEqual(requiredContexts(MANIFEST), MANIFEST.requiredChecks.map((entry) => entry.context));
  assert.ok(CONTEXTS.length > 0);
  assert.deepEqual(manifestBinding(MANIFEST), { workflow: MANIFEST.workflow, integrationId: MANIFEST.integrationId });

  const generated = { requiredChecks: [{ context: 'artifact-verification' }], workflow: '.github/workflows/ci.yml', integrationId: null };
  const product = await wait([{ runs: [ciRun({ path: generated.workflow })], checks: [check('artifact-verification', { app: { id: 99 } })] }],
    { manifest: generated });
  assert.equal(product.outcome.code, 0, '생성물 원장은 suite 결속만 본다');
  assert.equal(product.last, `RESULT=pass pr=77 sha=${SHA} required=1/1`);
  const productImpostor = await wait([{ runs: [ciRun({ path: generated.workflow }), otherRun()],
    checks: [check('artifact-verification', { check_suite: { id: OTHER_SUITE } })] }], { manifest: generated });
  assert.equal(productImpostor.outcome.code, 1, '생성물 원장도 다른 suite 는 세지 않는다');

  const extended = { ...BOUND, requiredChecks: [...BOUND.requiredChecks, { context: 'new-required-check' }] };
  const added = await wait([{ runs: [ciRun()], checks: allGreen() }], { manifest: extended });
  assert.equal(added.outcome.code, 1);
  assert.ok(added.lines.some((line) => line.startsWith('new-required-check\tmissing\t')));
});

test('ⓙ 원장이 판정할 수 없는 모양이면 gh 를 부르지 않고 2 다', async () => {
  const isToolError = (error) => error instanceof ToolError && error.code === 2;
  for (const bad of [{}, { requiredChecks: [] }, { requiredChecks: [{ context: 'a' }, { context: 'a' }] }, { requiredChecks: [{ context: 1 }] }]) {
    assert.throws(() => requiredContexts(bad), isToolError, JSON.stringify(bad));
  }
  for (const integrationId of ['15368', 0, -1, 1.5, undefined]) {
    assert.throws(() => manifestBinding({ workflow: WORKFLOW, integrationId }), isToolError, String(integrationId));
  }
  assert.throws(() => manifestBinding({ workflow: 'ci.yml', integrationId: null }), isToolError);
  const { outcome, calls } = await wait([{ runs: [ciRun()], checks: allGreen() }], { manifest: { ...BOUND, requiredChecks: [] } });
  assert.equal(outcome.code, 2);
  assert.equal(calls.length, 0);
});

test('ⓚ 페이지: total_count 120 은 두 페이지로 모으고, 개수가 맞지 않으면 2 다', async () => {
  const fillers = Array.from({ length: 120 - CONTEXTS.length }, (_, index) => check(`filler-${index}`));
  // required 를 둘째 페이지에 둔다 — 첫 페이지만 읽으면 누락으로 보인다.
  const paged = await wait([{ runs: [ciRun()], checks: [...fillers, ...allGreen()] }]);
  assert.equal(paged.outcome.code, 0);
  assert.deepEqual(checkRunCalls(paged.calls).map((args) => /[?&]page=(\d+)/.exec(args[1])[1]), ['1', '2']);

  const short = await wait([{ runs: [ciRun()], checks: [...fillers, ...allGreen()], checksTotal: 130 }]);
  assert.equal(short.outcome.code, 2, '빈 페이지가 total_count 보다 먼저 오면 판정하지 않는다');
  const runsShort = await wait([{ runs: [ciRun()], runsTotal: 150, checks: allGreen() }]);
  assert.equal(runsShort.outcome.code, 2, '실행 목록을 일부만 받으면 판정하지 않는다');
  assert.equal(checkRunCalls(runsShort.calls).length, 0);
});

test('ⓚ parseGhJson 은 JSON 객체만 받는다', () => {
  assert.deepEqual(parseGhJson('{"a":1}', 'x'), { a: 1 });
  for (const stdout of ['jq: command not found', '', '[1]', '"x"', 'null']) {
    assert.throws(() => parseGhJson(stdout, 'x'), (error) => error instanceof ToolError && error.code === 2, JSON.stringify(stdout));
  }
});

test('ⓛ main(): 잘못된 인자는 gh 를 부르지 않고 2 다', async () => {
  const bad = [[], ['--pr', '12a'], ['--pr', '0'], ['--pr', '-1'], ['--pr', '1', '--sha', 'xyz'], ['--pr', '1', '--sha', 'a'.repeat(39)],
    ['--pr', '1', '--sha'], ['--pr', '1', '--pr', '2'], ['--pr', '1', '--bogus', 'x'], ['--pr', '1', '--interval-seconds', '0'],
    ['--pr', '1', '--timeout-minutes', '1e3'], ['--pr', '1;', '--sha', SHA]];
  for (const argv of bad) {
    const { gh, calls } = fakeGh([{ runs: [ciRun()], checks: allGreen() }]);
    const lines = [];
    const code = await main(argv, { gh, log: (line) => lines.push(line), sleep: async () => {}, now: () => 0, manifest: BOUND });
    assert.equal(code, 2, argv.join(' '));
    assert.equal(calls.length, 0, `gh 를 부르지 않는다: ${argv.join(' ')}`);
    assert.equal(lines.at(-1), 'RESULT=error pr=- sha=- required=0/0');
  }
});

test('ⓛ main(): 실제 원장 파일로 판정하고, 예상 밖 예외도 2 다', async () => {
  const clock = fakeClock();
  const ok = fakeGh([{ runs: [running()] }, { runs: [ciRun()], checks: allGreen() }]);
  const lines = [];
  const code = await main(['--pr', '77', '--sha', SHA, '--interval-seconds', '5'], { gh: ok.gh, log: (line) => lines.push(line), ...clock });
  assert.equal(code, 0);
  assert.equal(lines.at(-1), `RESULT=pass pr=77 sha=${SHA} required=${CONTEXTS.length}/${CONTEXTS.length}`);

  const thrown = [];
  const boom = await main(['--pr', '77'], { gh: () => { throw new Error('boom'); }, log: (line) => thrown.push(line), ...fakeClock() });
  assert.equal(boom, 2);
  assert.match(thrown.at(-1), /^RESULT=error pr=77 /u);
});

test('ⓛ runGh 는 셸 메타 문자·공백이 든 인자를 실행하지 않는다', () => {
  for (const args of [['pr', 'view', '1; rm -rf x'], ['api', 'repos/{owner}/{repo}/x y'], ['pr', '$(id)'], ['pr', 'view', '`id`'], ['pr', 7]]) {
    assert.throws(() => runGh(args), (error) => error instanceof ToolError && error.code === 2, JSON.stringify(args));
  }
});
