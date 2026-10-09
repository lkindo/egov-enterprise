import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { ownerIdentity, processAlive, recoverAbandonedJobs } from './project-composer-recovery.mjs';
import { createComposerEngine } from './project-composer.mjs';

const HOST = 'this-host';
const PLATFORM = 'test-platform';
const SELF = 777_777;
const DEAD = 4242;
const NOW = '2026-10-10T00:00:00.000Z';
const token = n => String(n).padStart(16, '0');

/** 작업 폴더·보고서·만들던 소스 폴더를 만든다. 보고서 값은 그대로 쓴다(정리 판정은 보고서만 본다). */
function workspace(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'composer-recovery-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const add = (name, report, { staging = true, schema = false, project = false } = {}) => {
    const directory = join(root, 'build/project-composer/jobs', name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'report.json'), typeof report === 'string' ? report : JSON.stringify(report));
    if (staging) mkdirSync(join(root, 'build/reusable-base/source', `.pending-${name}`, 'partial'), { recursive: true });
    if (schema) mkdirSync(join(root, 'build/reusable-base', `composer-${name}-db`), { recursive: true });
    if (project) mkdirSync(join(root, 'build/reusable-base/source', name), { recursive: true });
    return { report: () => JSON.parse(readFileSync(join(directory, 'report.json'), 'utf8')),
      staging: () => existsSync(join(root, 'build/reusable-base/source', `.pending-${name}`)),
      schema: () => existsSync(join(root, 'build/reusable-base', `composer-${name}-db`)),
      project: () => existsSync(join(root, 'build/reusable-base/source', name)) };
  };
  return { root, add };
}
/** 가짜 Docker. 표식이 붙은 컨테이너가 있으면 찾아 주고 지운다. down 이면 모든 호출이 실패한다. */
function docker({ containers = [], down = false } = {}) {
  const calls = [];
  const live = new Set(containers);
  const run = async args => {
    calls.push(args);
    if (down) throw new Error('Cannot connect to the Docker daemon');
    // 컨테이너 ID 는 표식을 네 번 이은 64자다. inspect 는 그 컨테이너의 표식을, rm 은 그 컨테이너만 지운다.
    if (args[0] === 'ps') {
      const wanted = args.at(-1).split('=').at(-1);
      return live.has(wanted) ? wanted.repeat(4) : '';
    }
    if (args[0] === 'inspect') return args.at(-1).slice(0, 16);
    if (args[0] === 'rm') { live.delete(args.at(-1).slice(0, 16)); return ''; }
    return '';
  };
  return { calls, run };
}
const owner = (pid = DEAD, host = HOST, extra = {}) => ({ owner: { pid, host, platform: PLATFORM, ...extra } });
const recover = (root, fake, alive = pid => pid !== DEAD) => recoverAbandonedJobs({ outputRoot: root, docker: fake.run, alive,
  identity: { pid: SELF, host: HOST, platform: PLATFORM }, now: () => NOW });

test('an unfinished job of a process that ended on this computer loses its database and staging folder and reads as abandoned', async t => {
  const { root, add } = workspace(t);
  const job = add(`demo-${token(1)}`, { result: 'verifying', ...owner() });
  const fake = docker({ containers: [token(1)] });
  assert.deepEqual(await recover(root, fake), [{ job: `demo-${token(1)}`, database: 'removed', staging: 'removed' }]);
  assert.equal(job.staging(), false);
  assert.deepEqual(job.report().recovery, { database: 'removed', staging: 'removed', at: NOW });
  assert.equal(job.report().result, 'abandoned');
  assert.deepEqual(fake.calls.map(args => args[0]), ['ps', 'inspect', 'rm']);
  assert.deepEqual(await recover(root, docker()), [], 'a finished recovery is not repeated');
});

test('jobs whose owner is alive, on another computer, unknown or malformed are never touched', async t => {
  const { root, add } = workspace(t);
  const cases = [
    add(`alive-${token(2)}`, { result: 'started', ...owner(1234) }),
    add(`other-${token(3)}`, { result: 'started', ...owner(DEAD, 'another-host') }),
    add(`old-${token(4)}`, { result: 'started' }),
    add(`bad-${token(5)}`, { result: 'started', owner: { pid: '4242', host: HOST } }),
    add(`zero-${token(6)}`, { result: 'started', owner: { pid: 0, host: HOST, platform: PLATFORM } }),
    // WSL 과 Windows 처럼 컴퓨터 이름은 같아도 프로세스 공간이 다르면 번호가 죽은 것으로 보여도 남의 작업이다.
    add(`wsl-${token(17)}`, { result: 'started', owner: { pid: DEAD, host: HOST, platform: 'other-platform' } }),
    add(`ns-${token(18)}`, { result: 'started', ...owner(DEAD, HOST, { pidNamespace: 'pid:[1]' }) }),
    add(`noplatform-${token(19)}`, { result: 'started', owner: { pid: DEAD, host: HOST } }),
    add(`passed-${token(7)}`, { result: 'passed', ...owner() }),
    add(`gone-${token(8)}`, { result: 'abandoned', ...owner() }),
  ];
  add(`broken-${token(9)}`, '{ not json');
  add(`array-${token(10)}`, '[]');
  add('not-a-job-name', { result: 'started', ...owner() });
  const fake = docker({ containers: [token(2), token(3), token(4), token(17), token(18), token(19)] });
  assert.deepEqual(await recover(root, fake), []);
  assert.deepEqual(fake.calls, []);
  for (const job of cases) {
    assert.equal(job.staging(), true);
    assert.equal(job.report().recovery, undefined);
  }
});

test('a cancelled job is cleaned again in full, a failed job only loses its database and keeps its staging folder for diagnosis', async t => {
  const { root, add } = workspace(t);
  const cancelled = add(`cancel-${token(11)}`, { result: 'cancelled', cancellation: { database: 'failed', staging: 'removed' }, ...owner() });
  const failed = add(`fail-${token(12)}`, { result: 'failed', cleanupFailure: 'x', ...owner() });
  const fake = docker({ containers: [token(11), token(12)] });
  const result = await recover(root, fake);
  assert.deepEqual(result, [{ job: `cancel-${token(11)}`, database: 'removed', staging: 'removed' },
    { job: `fail-${token(12)}`, database: 'removed', staging: 'none' }]);
  assert.equal(cancelled.staging(), false);
  assert.equal(failed.staging(), true, 'the staging folder of a failed job stays');
  assert.equal(cancelled.report().result, 'cancelled', 'the result is not rewritten');
  assert.equal(failed.report().result, 'failed');
  const again = docker();
  assert.deepEqual(await recover(root, again), [], 'a cancelled or failed job whose cleanup finished is not cleaned again');
  assert.deepEqual(again.calls, []);
});

test('the schema folder goes with an unmoved job and stays with a kept project, and this process number counts as a past process', async t => {
  const { root, add } = workspace(t);
  const unmoved = add(`unmoved-${token(20)}`, { result: 'started', ...owner(SELF) }, { schema: true });
  const kept = add(`kept-${token(21)}`, { result: 'cancelled', ...owner() }, { staging: false, schema: true, project: true });
  // 다른 모든 소유자가 살아 있는 것으로 보일 때, 이 프로세스와 번호가 같은 보고서만 지난 프로세스의 것으로 본다.
  assert.deepEqual(await recover(root, docker(), () => true), [{ job: `unmoved-${token(20)}`, database: 'none', staging: 'removed' }]);
  assert.equal(unmoved.staging(), false);
  assert.equal(unmoved.schema(), false, 'an unmoved job loses its schema folder');
  assert.deepEqual(await recover(root, docker()), [{ job: `kept-${token(21)}`, database: 'none', staging: 'none' }]);
  assert.equal(kept.project(), true);
  assert.equal(kept.schema(), true, 'a kept project keeps its schema folder');
});

test('the staging folder is rebuilt from the job name, never taken from the report', async t => {
  const { root, add } = workspace(t);
  const decoy = join(root, 'keep-me');
  mkdirSync(decoy);
  add(`decoy-${token(13)}`, { result: 'started', stagingDirectory: decoy, projectDirectory: decoy, ...owner() }, { staging: false });
  assert.deepEqual(await recover(root, docker()), [{ job: `decoy-${token(13)}`, database: 'none', staging: 'none' }]);
  assert.equal(existsSync(decoy), true);
});

test('when Docker is down the first failure stops further Docker calls, nothing reads as finished and the next start tries again', async t => {
  const { root, add } = workspace(t);
  const first = add(`one-${token(14)}`, { result: 'started', ...owner() });
  const second = add(`two-${token(15)}`, { result: 'cancelled', ...owner() });
  const down = docker({ down: true });
  assert.deepEqual(await recover(root, down), [{ job: `one-${token(14)}`, database: 'failed', staging: 'removed' },
    { job: `two-${token(15)}`, database: 'failed', staging: 'removed' }]);
  assert.equal(down.calls.length, 1, 'Docker is asked once');
  assert.equal(first.report().result, 'started', 'an unfinished job is not marked abandoned while its database may remain');
  const up = docker({ containers: [token(14)] });
  assert.deepEqual(await recover(root, up), [{ job: `one-${token(14)}`, database: 'removed', staging: 'none' },
    { job: `two-${token(15)}`, database: 'none', staging: 'none' }]);
  assert.equal(first.report().result, 'abandoned');
  assert.deepEqual(second.report().recovery, { database: 'none', staging: 'none', at: NOW });
});

test('a process that has exited is not alive, this process is, and an unknown answer counts as alive', () => {
  assert.equal(processAlive(process.pid), true);
  const ended = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))'], { encoding: 'utf8' });
  assert.equal(processAlive(Number(ended.stdout)), false);
  const kill = process.kill;
  try {
    process.kill = () => { throw Object.assign(new Error('denied'), { code: 'EPERM' }); };
    assert.equal(processAlive(1), true, 'permission denied means it exists');
  } finally { process.kill = kill; }
});

test('the engine recovers with this process space as owner and bounds every Docker call', async t => {
  const { root, add } = workspace(t);
  add(`engine-${token(16)}`, { result: 'started', owner: { ...ownerIdentity(), pid: DEAD } });
  assert.equal(ownerIdentity().host, hostname());
  assert.equal(ownerIdentity().platform, process.platform);
  if (process.platform === 'linux') assert.match(ownerIdentity().pidNamespace ?? '', /^pid:\[\d+\]$/);
  const calls = [];
  const engine = createComposerEngine({ outputRoot: root, run: async (command, args, options) => { calls.push({ command, args, options }); return ''; } });
  // 이 시험의 pid 4242 가 이 컴퓨터에 살아 있으면 정리하지 않는 것이 옳다. 그때는 호출이 없어야 한다.
  const result = await engine.recover();
  if (processAlive(DEAD)) assert.deepEqual(result, []);
  else {
    assert.deepEqual(result, [{ job: `engine-${token(16)}`, database: 'none', staging: 'removed' }]);
    assert.ok(calls.length > 0 && calls.every(call => call.command === 'docker' && call.options.timeoutMs === 10_000 && call.options.capture === true
      && call.options.signal === undefined));
  }
});
