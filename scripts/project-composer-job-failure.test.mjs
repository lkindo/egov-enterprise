import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { composerOutputPaths, createComposerEngine } from './project-composer.mjs';
import { ComposerError } from './project-composer-errors.mjs';
import { classifyChildFailure, failedVerificationStep, jobFailure, toRepositoryPath, verificationLogTail } from './project-composer-job-failure.mjs';
import { verificationSteps } from './verify-reusable-artifact.mjs';

// 생성 출력은 임시 루트에만 둔다(저장소 build/ 에 잔재를 남기지 않는다).
const outputRoot = realpathSync(mkdtempSync(join(tmpdir(), 'composer-job-failure-')));
test.after(() => rmSync(outputRoot, { recursive: true, force: true }));
let names = 0;
const recipe = () => ({ schemaVersion: 1, project: { name: `job-failure-${names += 1}` }, sourceRef: 'HEAD',
  selection: { domains: ['mail', 'schedule'] }, database: { vendor: 'postgresql' }, backendLayout: 'single-module' });
const commandFailed = (commandId, options, exitCode = 1) => Object.assign(new Error(`Command failed: ${commandId} (COMMAND_FAILED ${exitCode})`),
  { code: 'COMMAND_FAILED', commandId, exitCode, durationMs: 3, ...(options?.log ? { log: options.log } : {}) });

/**
 * 실패 시나리오용 가짜 실행기. docker 는 탐침(version·실행 여부)·소유 표식·정리를 흉내 낸다.
 * child(name, args, options) 는 자식 생성기 대신 실행되며 던지면 그 단계가 실패한다. verify(options, composition) 도 같다.
 */
function scenario({ dockerOs = 'linux', running = true, startError, notReady = false, probeDownAfterStart = false, rmFails = false,
  child, verify, install } = {}) {
  const calls = [];
  let token;
  let started = false;
  let composition;
  let staging;
  const run = async (command, args, options) => {
    calls.push({ command, args, options });
    if (command === 'docker') {
      if (args[0] === 'version') {
        if (probeDownAfterStart && started) throw commandFailed('docker', options);
        return dockerOs;
      }
      if (args[0] === 'run') {
        token = args[args.indexOf('--label') + 1].split('=')[1];
        if (startError) throw startError;
        started = true;
        return 'a'.repeat(64);
      }
      if (args[0] === 'exec' && notReady) throw commandFailed('docker', options);
      if (args[0] === 'inspect') return args[2] === '{{.State.Running}}' ? String(running) : token;
      if (args[0] === 'rm' && rmFails) throw commandFailed('docker', options);
      return '';
    }
    const script = args[0];
    if (script === 'scripts/generate-reusable-base-db.mjs') {
      composition = JSON.parse(readFileSync(args[args.indexOf('--composition') + 1], 'utf8'));
      await child?.('database', args, options);
    }
    if (script === 'scripts/generate-reusable-base-source.mjs') {
      staging = args[args.indexOf('--output') + 1];
      mkdirSync(join(staging, 'build/reports/reusable-base'), { recursive: true });
      await child?.('source', args, options);
    }
    if (command === 'npm') await install?.(options);
    if (script === 'scripts/verify-reusable-artifact.mjs') {
      if (verify) return verify(options, composition);
      writeFileSync(join(options.root, 'build/reports/reusable-base/full.json'), JSON.stringify({ result: 'passed', scope: 'full',
        sourceCommit: composition.sourceCommit, profile: composition.profile, layout: composition.backendLayout }));
    }
    return '';
  };
  return { run, calls, get staging() { return staging; }, docker: () => calls.filter(call => call.command === 'docker').map(call => call.args[0]) };
}
const generate = async (mock, options = {}) => createComposerEngine({ outputRoot, run: mock.run, fingerprint: () => 'a'.repeat(64),
  readiness: { attempts: 1, delayMs: 0 }, ...options }).generate(recipe()).then(() => assert.fail('generation must fail'), error => error);
const reportArg = args => {
  const at = args.indexOf('--failure-report');
  assert.ok(at >= 0 && args[at + 1], 'the engine passes a report path to the child');
  return args[at + 1];
};
const reportChild = (stage, payload) => (name, args, options) => {
  if (name !== stage) return;
  mkdirSync(resolve(reportArg(args), '..'), { recursive: true });
  writeFileSync(reportArg(args), typeof payload === 'string' ? payload : JSON.stringify(payload));
  throw commandFailed(args[0], options);
};

test('a missing docker executable is a tool problem; a spawn refusal of another kind is not', async () => {
  const missing = Object.assign(commandFailed('docker'), { code: 'TOOL_UNAVAILABLE', exitCode: null, errno: 'ENOENT' });
  const error = await generate(scenario({ startError: missing }));
  assert.ok(error instanceof ComposerError);
  assert.equal(error.failure.code, 'TOOL_UNAVAILABLE');
  assert.deepEqual(error.details, { tool: 'docker' });
  assert.equal(error.failure.causeCode, 'TOOL_UNAVAILABLE');
  const denied = await generate(scenario({ startError: Object.assign(commandFailed('docker'), { code: 'TOOL_UNAVAILABLE', exitCode: null, errno: 'EACCES' }) }));
  assert.equal(denied.failure.code, undefined, 'only a missing executable is a missing tool');
});

test('Docker in Windows container mode cannot run the database; a daemon that answers in Linux mode is not blamed', async () => {
  const start = Object.assign(commandFailed('docker', undefined, 125));
  const windows = await generate(scenario({ dockerOs: 'windows', startError: start }));
  assert.equal(windows.failure.code, 'TOOL_UNAVAILABLE');
  const linux = await generate(scenario({ startError: Object.assign(commandFailed('docker', undefined, 125)) }));
  assert.equal(linux.failure.code, undefined);
  assert.equal(linux.failure.causeCode, 'COMMAND_FAILED');
});

test('a database that never becomes ready is DB_NOT_READY only while Docker still answers, and no child runs', async () => {
  const notReady = scenario({ notReady: true });
  const error = await generate(notReady);
  assert.equal(error.failure.code, 'DB_NOT_READY');
  assert.equal(error.failure.stage, 'database');
  assert.ok(!notReady.calls.some(call => call.command === 'node'), 'no generator child runs against a database that is not ready');
  const daemonGone = await generate(scenario({ notReady: true, probeDownAfterStart: true }));
  assert.equal(daemonGone.failure.code, 'TOOL_UNAVAILABLE');
});

test('the database child reports a stale menu snapshot through its own report file', async () => {
  const mock = scenario({ child: reportChild('database', { schemaVersion: 1, stage: 'database', code: 'MENU_SNAPSHOT_STALE', details: {} }) });
  const error = await generate(mock);
  assert.equal(error.failure.code, 'MENU_SNAPSHOT_STALE');
  assert.equal(error.failure.commandId, 'scripts/generate-reusable-base-db.mjs');
  assert.match(error.failure.log, /^build\/project-composer\/jobs\/job-failure-\d+-[a-f0-9]{16}\/logs\/database\.log$/);
  const child = mock.calls.find(call => call.args[0] === 'scripts/generate-reusable-base-db.mjs');
  assert.match(reportArg(child.args).replaceAll('\\', '/'), /\/build\/project-composer\/jobs\/[^/]+\/failures\/database\.json$/);
  assert.deepEqual(mock.docker().filter(name => name === 'version'), [], 'a reported cause needs no Docker probe');
});

test('a report for another stage, a malformed report or a disallowed code is ignored; Docker state then decides', async () => {
  for (const payload of [{ schemaVersion: 1, stage: 'source', code: 'SOURCE_SURVIVAL' }, { schemaVersion: 1, stage: 'database', code: 'SOURCE_CHANGED' },
    '{"schemaVersion":1,', { schemaVersion: 1, stage: 'database', code: 'CATALOG_DRIFT', details: { violations: ['x'.repeat(70 * 1024)] } }]) {
    const error = await generate(scenario({ child: reportChild('database', payload) }));
    assert.equal(error.failure.code, undefined, JSON.stringify(payload).slice(0, 80));
    assert.equal(error.failure.causeCode, 'COMMAND_FAILED');
  }
  const stopped = await generate(scenario({ running: false, child: reportChild('database', '') }));
  assert.equal(stopped.failure.code, 'DB_NOT_READY', 'the container stopped while the child was running');
  const daemonGone = await generate(scenario({ probeDownAfterStart: true, child: reportChild('database', '') }));
  assert.equal(daemonGone.failure.code, 'TOOL_UNAVAILABLE');
});

test('a changed source outranks a child report, and a source check that cannot be made keeps the original failure', async () => {
  let reads = 0;
  const moved = await generate(scenario({ child: reportChild('database', { schemaVersion: 1, stage: 'database', code: 'CATALOG_DRIFT', details: { violations: ['v'] } }) }),
    { fingerprint: () => (++reads === 1 ? 'a' : 'b').repeat(64) });
  assert.equal(moved.failure.code, 'SOURCE_CHANGED');
  let calls = 0;
  const unknown = await generate(scenario({ child: (name, args, options) => { if (name === 'source') throw commandFailed(args[0], options); } }),
    { fingerprint: () => { if (++calls > 1) throw new Error('git failed'); return 'a'.repeat(64); } });
  assert.equal(unknown.failure.code, undefined, 'an unknown source state is not a claim that the source changed');
  assert.equal(unknown.message, 'Command failed: scripts/generate-reusable-base-source.mjs (COMMAND_FAILED 1)');
});

test('the source child reports removed selected files as repository paths only', async () => {
  const kept = await generate(scenario({ child: reportChild('source',
    { schemaVersion: 1, stage: 'source', code: 'SOURCE_SURVIVAL', details: { files: ['frontend/src/app/mail/page.tsx'] } }) }));
  assert.equal(kept.failure.code, 'SOURCE_SURVIVAL');
  assert.equal(kept.failure.stage, 'source');
  assert.deepEqual(kept.details, { files: ['frontend/src/app/mail/page.tsx'] });
  const absolute = await generate(scenario({ child: reportChild('source',
    { schemaVersion: 1, stage: 'source', code: 'SOURCE_SURVIVAL', details: { files: [join(outputRoot, 'x.java')] } }) }));
  assert.equal(absolute.failure.code, 'SOURCE_SURVIVAL');
  assert.deepEqual(absolute.details, {}, 'an absolute path is dropped, not shown');
});

test('a final output that appears during generation is OUTPUT_CONFLICT and nothing is renamed over it', async () => {
  const mock = scenario({ child: (name, args) => {
    if (name === 'source') mkdirSync(args[args.indexOf('--output') + 1].replace('.pending-', ''), { recursive: true });
  } });
  const error = await generate(mock);
  assert.equal(error.failure.code, 'OUTPUT_CONFLICT');
  assert.equal(error.failure.stage, 'source');
  assert.match(error.details.path, /^build\/reusable-base\/source\/job-failure-\d+-[a-f0-9]{16}$/);
  assert.ok(existsSync(mock.staging), 'the staged output is left where it was');
});

/** 검증기가 남기는 보고서와 로그를 흉내 낸다. override 로 신원·단계를 바꿔 판정 조건을 하나씩 깬다. */
function failingVerify({ step = 'typecheck', exitCode = 1, override = {}, lines = [] } = {}) {
  return (options, composition) => {
    const steps = verificationSteps('full', composition.backendLayout);
    const at = steps.findIndex(entry => entry.id === step);
    const command = entry => [entry.command, ...entry.args].join(' ');
    const failure = { step, command: command(steps[at]), exitCode, durationMs: 9 };
    writeFileSync(join(options.root, 'build/reports/reusable-base/full.json'), JSON.stringify({ schemaVersion: 1, result: 'failed', scope: 'full',
      sourceCommit: composition.sourceCommit, profile: composition.profile, layout: composition.backendLayout,
      checkedAt: new Date().toISOString(), steps: [...steps.slice(0, at).map(entry => ({ step: entry.id, command: command(entry), result: 'passed' })),
        { ...failure, result: 'failed' }], failure, ...override }));
    mkdirSync(resolve(options.log, '..'), { recursive: true });
    writeFileSync(options.log, [`$ node scripts/verify-reusable-artifact.mjs`,
      `[reusable-verify] ${composition.profile}/${composition.backendLayout}: ${command(steps[0])}`, 'earlier step output',
      `[reusable-verify] ${composition.profile}/${composition.backendLayout}: ${command(steps[at])}`, ...lines,
      '[종료 코드 1 · 10ms · 가림 0건]', '', ''].join('\n'));
    throw commandFailed('scripts/verify-reusable-artifact.mjs', options, 1);
  };
}

test('a verification step failure is VERIFY_FAILED with the step and a masked log tail kept out of the saved report', async () => {
  const mock = scenario({ verify: failingVerify({ lines: [`src/a.ts(3,1): error TS2322 in ${join(outputRoot, 'x', 'a.ts')}`, '\u001b[31mred\u001b[39m done'] }) });
  const error = await generate(mock);
  assert.equal(error.failure.code, 'VERIFY_FAILED');
  assert.equal(error.failure.step, 'typecheck');
  assert.equal(error.failure.commandId, 'scripts/verify-reusable-artifact.mjs');
  assert.match(error.failure.log, /^build\/project-composer\/jobs\/[^/]+\/logs\/verify\.log$/);
  assert.equal(error.failure.logTail[0].startsWith('[reusable-verify]'), true, 'the tail starts at the failed step');
  assert.ok(!error.failure.logTail.some(line => line.includes('earlier step output') || line.includes('종료 코드')));
  assert.ok(!error.failure.logTail.join('\n').includes(outputRoot), 'this computer path is not shown');
  assert.equal(error.failure.logTail.at(-1), 'red done');
  const job = resolve(outputRoot, error.failure.report);
  const saved = JSON.parse(readFileSync(job, 'utf8')).failure;
  assert.equal(saved.code, 'VERIFY_FAILED');
  assert.equal(saved.logTail, undefined, 'the saved report (a CI artifact) does not copy the log tail');
  assert.match(saved.verificationReport, /^build\/reusable-base\/source\/[^/]+\/build\/reports\/reusable-base\/full\.json$/);
});

test('a verification failure whose report is not this job’s exact failure is never VERIFY_FAILED', async () => {
  const cases = [
    { override: { sourceCommit: 'f'.repeat(40) } }, { override: { profile: 'demo' } }, { override: { layout: 'multi-module' } },
    { override: { scope: 'frontend' } }, { override: { result: 'started' } }, { override: { checkedAt: '2000-01-01T00:00:00.000Z' } },
    { exitCode: null }, { override: { failure: { step: 'rm -rf', command: 'rm -rf /', exitCode: 1 } } },
    { override: { steps: [] } }, { override: { failure: { step: 'lint', command: 'pnpm -C frontend exec tsc --noEmit', exitCode: 1 } } },
  ];
  for (const variant of cases) {
    const error = await generate(scenario({ verify: failingVerify(variant) }));
    assert.equal(error.failure.code, undefined, JSON.stringify(variant));
    assert.equal(error.failure.logTail, undefined);
  }
  const missing = await generate(scenario({ verify: (options) => { throw commandFailed('scripts/verify-reusable-artifact.mjs', options); } }));
  assert.equal(missing.failure.code, undefined, 'no report, no step');
});

test('cleanup and errno failures are never blamed on Docker or on the user', async () => {
  const cleanup = await generate(scenario({ rmFails: true }));
  assert.equal(cleanup.failure.stage, 'verify');
  assert.equal(cleanup.failure.code, undefined, 'a cleanup after a passed verification is not a Docker or verification failure');
  assert.equal(cleanup.failure.commandId, 'docker');
  const eperm = await generate(scenario({ install: () => { throw Object.assign(new Error('EPERM: operation not permitted'), { code: 'EPERM' }); } }));
  assert.equal(eperm.failure.code, undefined);
  assert.equal(eperm.failure.causeCode, 'EPERM');
});

test('an output path that already exists is OUTPUT_CONFLICT; a path outside build stays an ordinary refusal', t => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'composer-output-')));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const taken = join(base, 'build', 'reusable-base', 'source', 'taken-0123456789abcdef');
  mkdirSync(taken, { recursive: true });
  assert.throws(() => composerOutputPaths(base, 'taken', '0123456789abcdef'),
    error => error instanceof ComposerError && error.code === 'OUTPUT_CONFLICT' && error.details.path === 'build/reusable-base/source/taken-0123456789abcdef');
  assert.throws(() => composerOutputPaths(base, '../escape', '0123456789abcdef'), error => !(error instanceof ComposerError) && /Invalid/.test(error.message));
  assert.doesNotThrow(() => composerOutputPaths(base, 'fresh', '0123456789abcdef'));
});

test('repository paths never leave the base', () => {
  const base = join(outputRoot, 'base');
  assert.equal(toRepositoryPath(base, join(base, 'build', 'a.log')), 'build/a.log');
  for (const path of [base, join(outputRoot, 'other.log'), join(base, '..', 'x'), undefined, '']) assert.equal(toRepositoryPath(base, path), undefined, String(path));
});

test('the failure shape carries a code only for a branded job error', () => {
  const failure = (error, extra = {}) => jobFailure(error, { stage: 'database', outputRoot, ...extra });
  assert.equal(failure(Object.assign(new Error('x'), { code: 'DB_NOT_READY' })).code, undefined, 'an unbranded look-alike is not coded');
  assert.equal(failure(new ComposerError('INVALID_RECIPE', {})).code, undefined, 'a request code is not a job code');
  assert.equal(failure(new ComposerError('INVALID_RECIPE', {})).causeCode, 'INVALID_RECIPE');
  assert.equal(failure(Object.assign(new Error('x'), { code: 'FK_CLOSURE' })).causeCode, 'FK_CLOSURE');
  assert.equal(failure(new Error('x')).causeCode, 'COMPOSITION_FAILED');
  const cause = commandFailed('docker', { log: join(outputRoot, 'logs', 'database.log') });
  const coded = failure(Object.assign(new ComposerError('DB_NOT_READY', {}, cause.message), { cause }), { sourceCommit: 'c'.repeat(40) });
  assert.deepEqual(coded, { stage: 'database', code: 'DB_NOT_READY', causeCode: 'COMMAND_FAILED', commandId: 'docker', exitCode: 1, durationMs: 3,
    log: 'logs/database.log', sourceCommit: 'c'.repeat(40) });
  assert.equal(failure(new ComposerError('DB_NOT_READY', {}), { stage: 'database' }).logTail, undefined);
});

test('the log tail starts at the failed step, re-masks secrets, hides roots and the home folder, strips terminal codes and stays bounded', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'composer-tail-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const home = join(directory, 'Users', 'John Smith');
  const project = join(directory, 'work', 'egov', 'build', 'reusable-base', 'source', 'p-1');
  const repo = join(directory, 'work', 'egov');
  const header = { profile: 'custom', layout: 'single-module', command: 'pnpm -C frontend run lint' };
  const env = { COMPOSER_TAIL_TOKEN: 'tail-tail-tail-tail' };
  // 검증 로그 모양 그대로: 앞 단계 출력 → 실패 단계 머리줄 → 출력 → 종료 코드 줄. 줄 끝은 CRLF 다(Windows 자식 출력).
  const write = (name, body) => {
    const path = join(directory, name);
    writeFileSync(path, [`[reusable-verify] custom/single-module: node scripts/verify-reusable-governance.mjs`, 'before', 'x',
      `[reusable-verify] custom/single-module: ${header.command}`, ...body, '[종료 코드 1 · 12ms · 가림 0건]', ''].join('\r\n'));
    return verificationLogTail(path, header, { roots: [project, repo], home, env });
  };
  const bounded = write('long.log', Array.from({ length: 60 }, (_, n) => `line ${n}`));
  assert.equal(bounded.length, 40, 'only the last 40 lines are kept');
  assert.equal(bounded.at(-1), 'line 59');
  // 줄 끝에 걸친 경로는 가린 뒤에 자른다. 먼저 자르면 루트 조각이 남는다.
  const edge = `${'L'.repeat(285)} ${join(repo, 'z')}`;
  const all = write('short.log', [`error in ${join(project, 'frontend', 'a.ts')}`, `cache ${join(home, '.gradle', 'x')}`, `see ${join(repo, 'scripts', 'y.mjs')}`,
    'COMPOSER_TAIL_TOKEN value tail-tail-tail-tail leaked', 'password=hunter2hunter2', '\u001b[1m\u001b[31mbold red\u001b[0m',
    'carriage\rreturn', 'tab\there', '', '   ', 'L'.repeat(400), edge, 'pass\u001b[0mword=hunter2hunter2']);
  assert.ok(!all.includes('before'), 'output of an earlier step is not part of the tail');
  assert.equal(all[0], `[reusable-verify] custom/single-module: ${header.command}`);
  assert.match(all[1], /^error in \.[\\/]frontend[\\/]a\.ts$/);
  assert.match(all[2], /^cache ~[\\/]\.gradle[\\/]x$/, 'a home folder with a space is replaced as a whole');
  assert.match(all[3], /^see \.[\\/]scripts[\\/]y\.mjs$/);
  assert.equal(all[4], 'COMPOSER_TAIL_TOKEN value *** leaked');
  assert.equal(all[5], 'password=***');
  assert.equal(all[6], 'bold red');
  assert.equal(all[7], 'carriage return');
  assert.equal(all[8], 'tab here');
  assert.equal(all[9].length, 300, 'a long line is cut to 300 characters');
  assert.match(all[10], /^L{285} \.[\\/]z$/, 'a path at the end of a long line is masked before the line is cut');
  assert.equal(all[11], 'password=***', 'a colour code inside a secret name does not stop the masking');
  assert.equal(all.length, 12, 'blank lines are dropped');
  assert.ok(!all.some(line => line === '' || line.includes('종료 코드') || line.includes(directory)));
  assert.equal(verificationLogTail(join(directory, 'missing.log'), header, { roots: [project] }), undefined);
});

test('a source check that throws is not a claim that the source changed', async () => {
  const cause = Object.assign(new Error('child failed'), { code: 'COMMAND_FAILED' });
  const result = await classifyChildFailure(cause, { stage: 'source', reportPath: join(outputRoot, 'missing.json'), root: outputRoot,
    sourceMoved: () => { throw new Error('git failed'); } });
  assert.equal(result, cause, 'the original failure is kept');
});

test('the verification step comes only from this job’s own report', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'composer-step-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const composition = { sourceCommit: 'c'.repeat(40), backendLayout: 'multi-module', profile: 'custom' };
  const steps = verificationSteps('full', 'multi-module');
  const backend = steps.find(step => step.id === 'backend');
  const command = [backend.command, ...backend.args].join(' ');
  const write = report => {
    mkdirSync(join(directory, 'build/reports/reusable-base'), { recursive: true });
    writeFileSync(join(directory, 'build/reports/reusable-base/full.json'), JSON.stringify(report));
  };
  const valid = { result: 'failed', scope: 'full', sourceCommit: composition.sourceCommit, layout: 'multi-module', profile: 'custom',
    checkedAt: '2026-10-09T10:00:01.000Z', failure: { step: 'backend', command, exitCode: 1 }, steps: [{ step: 'backend', command, result: 'failed' }] };
  write(valid);
  assert.deepEqual(failedVerificationStep(directory, composition, '2026-10-09T10:00:00.000Z'), { step: 'backend', command });
  assert.equal(failedVerificationStep(directory, composition, 'not a date'), undefined);
  write({ ...valid, failure: { ...valid.failure, command: command.replace(':api-server:', '') } });
  assert.equal(failedVerificationStep(directory, composition, '2026-10-09T10:00:00.000Z'), undefined, 'the single-module command is not this layout');
  // 실패 단계와 마지막 단계 기록이 서로 같아도, 그 명령이 이 배치의 단계 명령이 아니면 판정하지 않는다.
  const singleModule = command.replace(':api-server:harnessTest', 'harnessTest').replace(':api-server:schemaValidationTest', 'schemaValidationTest');
  assert.notEqual(singleModule, command);
  write({ ...valid, failure: { ...valid.failure, command: singleModule }, steps: [{ step: 'backend', command: singleModule, result: 'failed' }] });
  assert.equal(failedVerificationStep(directory, composition, '2026-10-09T10:00:00.000Z'), undefined, 'the command of another layout is not this step');
  write({ ...valid, failure: { ...valid.failure, exitCode: 1.5 } });
  assert.equal(failedVerificationStep(directory, composition, '2026-10-09T10:00:00.000Z'), undefined);
});
