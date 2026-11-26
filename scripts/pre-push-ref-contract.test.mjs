import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { availableParallelism, cpus, tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { classifyChangedFiles, formatScopeFields } from './ci-change-scope.mjs';
import { frontendSourceContracts } from './frontend-source-contracts.mjs';
import { GENERATORS } from './merge-main-regenerate.mjs';

// 원문 계약 목록은 탐지기가 계산한다(사본 없음). 훅의 탐지 호출은 스텁이 이 목록을 내도록 해 시험마다 다시 계산하지 않는다.
const SOURCE_CONTRACT_FILES = frontendSourceContracts().map(({ file }) => file);
const SOURCE_CONTRACTS_DETECT = 'node scripts/frontend-source-contracts.mjs';
// [2026-10-29 DEC-OPS-390] 훅의 Vitest 세 단계는 시간 초과만 단독 재실행하는 래퍼로 돈다(scripts/vitest-timeout-rerun.mjs).
const VITEST_RERUN = 'node ../scripts/vitest-timeout-rerun.mjs';
const INVARIANTS_RUN = `${VITEST_RERUN} src/__tests__`;
const CROSS_STACK_RUN = `${VITEST_RERUN} src/__tests__/cross-stack`;
const SOURCE_CONTRACTS_RUN = `${VITEST_RERUN} ${SOURCE_CONTRACT_FILES.join(' ')}`;
const VERIFY_SOURCE_CONTRACTS = `pnpm -C frontend exec vitest run ${SOURCE_CONTRACT_FILES.join(' ')}`;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const hookPath = path.join(repoRoot, '.githooks', 'pre-push');
const hookSource = readFileSync(hookPath, 'utf8');
const ZERO_OID = '0'.repeat(40);
const LOCAL_OID = '1'.repeat(40);
const REMOTE_OID = '2'.repeat(40);

function shellPath(value) {
  if (process.platform !== 'win32') return value;
  const normalized = path.resolve(value).replaceAll('\\', '/');
  return `/${normalized[0].toLowerCase()}${normalized.slice(2)}`;
}

function findPosixShell() {
  if (process.platform !== 'win32') return 'sh';

  const located = spawnSync('git', ['--exec-path'], { encoding: 'utf8' });
  assert.equal(located.status, 0, located.stderr);
  const gitExecPath = located.stdout.trim();
  assert.notEqual(gitExecPath, '', 'Git exec path is required to locate its POSIX shell');

  const gitRoot = path.resolve(gitExecPath, '..', '..', '..');
  const candidates = [
    path.join(gitRoot, 'bin', 'sh.exe'),
    path.join(gitRoot, 'usr', 'bin', 'sh.exe'),
  ];
  const candidate = candidates.find(existsSync);
  assert.ok(candidate, `Git POSIX shell is missing below ${gitRoot}`);
  return candidate;
}

const shell = findPosixShell();

function pushLine(localRef, localOid, remoteRef, remoteOid) {
  return `${localRef} ${localOid} ${remoteRef} ${remoteOid}`;
}

const SCOPE_FIELDS_LIST = ['docsOnly', 'backend', 'migration', 'frontend'];
const MAX_HOOK_CONCURRENCY = Math.min(8, Math.max(4, typeof availableParallelism === 'function' ? availableParallelism() : cpus().length));
let activeHooks = 0;
const hookWaiters = [];
async function withHookSlot(task) {
  if (activeHooks >= MAX_HOOK_CONCURRENCY) await new Promise((resolve) => hookWaiters.push(resolve));
  activeHooks++;
  try { return await task(); } finally {
    activeHooks--;
    const next = hookWaiters.shift();
    if (next) next();
  }
}
const scopeOutputCache = new Map();
function scopeOutputFor(files) {
  const key = [...new Set(files)].sort().join('\n');
  if (!scopeOutputCache.has(key)) {
    const sortedFiles = key ? key.split('\n') : [];
    scopeOutputCache.set(key, {
      key,
      output: formatScopeFields(classifyChangedFiles(sortedFiles), SCOPE_FIELDS_LIST),
    });
  }
  return scopeOutputCache.get(key);
}
const EMPTY_SCOPE_OUTPUT = scopeOutputFor([]).output;

const sharedFixtureRoot = mkdtempSync(path.join(tmpdir(), 'pre-push-ref-contract-shared-'));
const cachedDefaultHookPath = path.join(sharedFixtureRoot, 'pre-push-default');
let cachedHookInitialized = false;
let callCounter = 0;
test.after(() => rmSync(sharedFixtureRoot, { recursive: true, force: true }));

function instrumentHook(source) {
  const stubs = `
git() {
  printf '%s\\n' "$*" >> "$HOOK_GIT_LOG"
  if [ "$1" = "diff" ]; then
    for argument in "$@"; do
      if [ "$argument" = "$HOOK_FAIL_DIFF_RANGE" ]; then
        printf '%s\\n' "$HOOK_FAILED_DIFF_OUTPUT"
        return 128
      fi
      if [ "$argument" = "$HOOK_EMPTY_DIFF_RANGE" ]; then return 0; fi
    done
    printf '%s\\n' "$HOOK_CHANGED_FILES"
  elif [ "$1" = "rev-parse" ] && [ "$2" = "--abbrev-ref" ]; then
    printf '%s\\n' 'origin/main'
  fi
  return 0
}
npm() {
  printf '%s\\n' "$*" >> "$HOOK_NPM_LOG"
  record_command "npm $*"
}
record_command() {
  printf '%s\\n' "$*" >> "$HOOK_COMMAND_LOG"
  [ "$*" != "$HOOK_FAIL_COMMAND" ]
}
pnpm() { record_command "pnpm $*"; }
npx() { record_command "npx $*"; }
sed() {
  if [ "$HOOK_REAL_SCOPE_CLI" != "true" ] && [ "$1" = "-n" ] && [ $# -eq 2 ]; then
    case "$2" in
      s/^*=//p)
        prefix=\${2#s/^}
        prefix=\${prefix%//p}
        case "$prefix" in
          [A-Za-z]*=)
            while IFS= read -r _line; do
              case "$_line" in
                "$prefix"*) printf '%s\\n' "\${_line#"$prefix"}" ;;
              esac
            done
            return 0
            ;;
        esac
        ;;
    esac
  fi
  command sed "$@"
}
test_gradle() { record_command "gradlew $*"; }
node() {
  case "$1" in
    scripts/frontend-source-contracts.mjs)
      record_command "node $*" && printf '%s\\n' "$HOOK_SOURCE_CONTRACTS"
      ;;
    ../scripts/vitest-timeout-rerun.mjs)
      record_command "node $*"
      ;;
    scripts/heavy-run-queue.mjs)
      if [ "$HOOK_REAL_QUEUE_CLI" = "true" ]; then
        command node "$@"
      elif [ "$2" = "classify" ]; then
        printf '%s\\n' 'direct'
      else
        command node "$@"
      fi
      ;;
    scripts/ci-change-scope.mjs)
      if [ "$HOOK_SCOPE_OUTPUT_SET" = "true" ]; then
        printf '%s' "$HOOK_SCOPE_OUTPUT"
        return "$HOOK_SCOPE_STATUS"
      fi
      if [ "$HOOK_REAL_SCOPE_CLI" = "true" ]; then
        command node "$@"
        return $?
      fi
      if [ "$*" = "scripts/ci-change-scope.mjs --stdin --fields docsOnly,backend,migration,frontend" ]; then
        STDIN_DATA=""
        while IFS= read -r _line || [ -n "$_line" ]; do
          if [ -n "$_line" ]; then
            STDIN_DATA="\${STDIN_DATA:+$STDIN_DATA
}$_line"
          fi
        done
        if [ -z "$STDIN_DATA" ]; then
          printf '%s' "$HOOK_SCOPE_EMPTY"
          return 0
        elif [ "$STDIN_DATA" = "$HOOK_SCOPE_FILES_KEY" ]; then
          printf '%s' "$HOOK_SCOPE_FILES"
          return 0
        elif [ -n "$HOOK_SCOPE_PARTIAL_KEY" ] && [ "$STDIN_DATA" = "$HOOK_SCOPE_PARTIAL_KEY" ]; then
          printf '%s' "$HOOK_SCOPE_PARTIAL"
          return 0
        elif [ -n "$HOOK_SCOPE_BOTH_KEY" ] && [ "$STDIN_DATA" = "$HOOK_SCOPE_BOTH_KEY" ]; then
          printf '%s' "$HOOK_SCOPE_BOTH"
          return 0
        fi
        printf '%s\n' "$STDIN_DATA" | command node "$@"
        return $?
      fi
      command node "$@"
      ;;
    *) command node "$@" ;;
  esac
}
`;
  return source.replaceAll('./gradlew ', 'test_gradle ').replace('#!/bin/sh', `#!/bin/sh${stubs}`);
}

async function runHook(input, source = hookSource, { files = ['docs/README.md'], failCommand = '',
  failDiffRange = '', failedDiffOutput = [], emptyDiffRange = '',
  scopeOutput = undefined, scopeStatus = 0, realScopeCli = false, realQueueCli = false } = {}) {
  const id = ++callCounter;
  const gitLog = path.join(sharedFixtureRoot, `git-${id}.log`);
  const npmLog = path.join(sharedFixtureRoot, `npm-${id}.log`);
  const commandLog = path.join(sharedFixtureRoot, `commands-${id}.log`);
  let fixtureHook = cachedDefaultHookPath;
  if (source === hookSource) {
    if (!cachedHookInitialized) {
      writeFileSync(cachedDefaultHookPath, instrumentHook(hookSource), 'utf8');
      cachedHookInitialized = true;
    }
  } else {
    fixtureHook = path.join(sharedFixtureRoot, `pre-push-${id}`);
    writeFileSync(fixtureHook, instrumentHook(source), 'utf8');
  }

  const filesScope = scopeOutputFor(files);
  const partialScope = failedDiffOutput.length > 0 ? scopeOutputFor(failedDiffOutput) : { key: '', output: '' };
  const bothScope = failedDiffOutput.length > 0 ? scopeOutputFor([...files, ...failedDiffOutput]) : { key: '', output: '' };
  const env = {
    ...process.env,
    HOOK_GIT_LOG: shellPath(gitLog),
    HOOK_NPM_LOG: shellPath(npmLog),
    HOOK_COMMAND_LOG: shellPath(commandLog),
    HOOK_CHANGED_FILES: files.join('\n'),
    HOOK_FAIL_COMMAND: failCommand,
    HOOK_FAIL_DIFF_RANGE: failDiffRange,
    HOOK_EMPTY_DIFF_RANGE: emptyDiffRange,
    HOOK_FAILED_DIFF_OUTPUT: failedDiffOutput.join('\n'),
    SKIP_HOOKS: '',
    SKIP_HARNESS: '',
    HOOK_SOURCE_CONTRACTS: SOURCE_CONTRACT_FILES.join('\n'),
    HOOK_SCOPE_OUTPUT_SET: String(scopeOutput !== undefined),
    HOOK_SCOPE_OUTPUT: scopeOutput ?? '',
    HOOK_SCOPE_STATUS: String(scopeStatus),
    HOOK_SCOPE_EMPTY: EMPTY_SCOPE_OUTPUT,
    HOOK_SCOPE_FILES_KEY: filesScope.key,
    HOOK_SCOPE_FILES: filesScope.output,
    HOOK_SCOPE_PARTIAL_KEY: partialScope.key,
    HOOK_SCOPE_PARTIAL: partialScope.output,
    HOOK_SCOPE_BOTH_KEY: bothScope.key,
    HOOK_SCOPE_BOTH: bothScope.output,
    HOOK_REAL_SCOPE_CLI: String(realScopeCli),
    HOOK_REAL_QUEUE_CLI: String(realQueueCli),
  };

  const status = await withHookSlot(() => new Promise((resolve, reject) => {
    const child = spawn(shell, [shellPath(fixtureHook)], {
      cwd: repoRoot,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
    child.on('error', reject);
    child.on('close', (code) => resolve({ status: code, stdout, stderr }));
  }));

  return {
    status: status.status,
    stdout: status.stdout,
    stderr: status.stderr,
    gitCalls: existsSync(gitLog) ? readFileSync(gitLog, 'utf8').trim().split(/\r?\n/u) : [],
    npmCalls: existsSync(npmLog) ? readFileSync(npmLog, 'utf8').trim().split(/\r?\n/u) : [],
    commands: existsSync(commandLog) ? readFileSync(commandLog, 'utf8').trim().split(/\r?\n/u) : [],
  };
}

function assertSuccessful(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

test('branch and tag deletion-only pushes skip every local verification command', { concurrency: true }, async () => {
  const fixtures = [
    `${pushLine('(delete)', ZERO_OID, 'refs/heads/old-branch', REMOTE_OID)}\n`,
    `${pushLine('(delete)', ZERO_OID, 'refs/tags/old-tag', REMOTE_OID)}\n`,
    [
      pushLine('(delete)', ZERO_OID, 'refs/heads/old-branch', REMOTE_OID),
      pushLine('(delete)', ZERO_OID, 'refs/tags/old-tag', LOCAL_OID),
    ].join('\n') + '\n',
  ];

  await Promise.all(fixtures.map(async (input) => {
    const result = await runHook(input);
    assertSuccessful(result);
    assert.match(result.stdout, /branch\/tag 삭제만 감지됨/u);
    assert.deepEqual(result.gitCalls, []);
    assert.deepEqual(result.npmCalls, []);
  }));
});

// [2026-11-07] 훅은 네 범위 필드를 분류기 한 번 호출로 읽는다. 값을 하나라도 true|false 로 읽지 못하거나 분류기가 실패하면
//   어떤 검사도 돌리기 전에 멈춘다 — 빈 값은 backend·frontend 검사를 건너뛰는 쪽으로 읽혀 안전측이 아니다.
test('pre-push stops before any check when the one classifier call yields an unreadable scope value', { concurrency: true }, async () => {
  const input = `${pushLine('refs/heads/feature', LOCAL_OID, 'refs/heads/feature', REMOTE_OID)}\n`;
  const files = ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts'];
  const complete = 'docsOnly=false\nbackend=true\nmigration=false\nfrontend=true\n';
  const broken = [
    ...['docsOnly', 'backend', 'migration', 'frontend'].map(field =>
      [`${field} empty`, complete.replace(new RegExp(`^${field}=.*$`, 'm'), `${field}=`)]),
    ['backend missing', complete.replace(/^backend=.*\n/m, '')],
    ['frontend invalid', complete.replace(/^frontend=.*$/m, 'frontend=yes')],
  ];
  const [proceeds, failed, ...brokenResults] = await Promise.all([
    runHook(input, hookSource, { files, scopeOutput: complete }),
    runHook(input, hookSource, { files, scopeOutput: '', scopeStatus: 1 }),
    ...broken.map(([, output]) => runHook(input, hookSource, { files, scopeOutput: output })),
  ]);
  assertSuccessful(proceeds);
  assert.ok(proceeds.commands.length > 0, 'a readable classification must run the selected checks');
  broken.forEach(([label], index) => {
    const result = brokenResults[index];
    assert.notEqual(result.status, 0, `${label} must stop the push`);
    assert.match(result.stderr, /변경 범위 분류 결과를 읽지 못했습니다/u, label);
    assert.deepEqual(result.commands, [], `${label} must not run any check`);
  });
  assert.notEqual(failed.status, 0, 'a failing classifier must stop the push');
  assert.deepEqual(failed.commands, [], 'a failing classifier must not run any check');
});

test('mixed deletion and update verifies only the object-bearing update range', { concurrency: true }, async () => {
  const result = await runHook([
    pushLine('(delete)', ZERO_OID, 'refs/heads/old-branch', REMOTE_OID),
    pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID),
  ].join('\n') + '\n');

  assertSuccessful(result);
  assert.deepEqual(result.npmCalls, ['run regen -- --check', 'run test:operational-contracts']);
  const diffCalls = result.gitCalls.filter((call) => call.startsWith('diff '));
  assert.equal(diffCalls.length, 1);
  assert.match(diffCalls[0], new RegExp(`${REMOTE_OID}\\.\\.${LOCAL_OID}$`, 'u'));
  assert.doesNotMatch(diffCalls[0], new RegExp(ZERO_OID, 'u'));
});

test('empty stdin and a new ref retain their fail-closed verification paths', { concurrency: true }, async () => {
  // 새 작업 브랜치의 첫 push 는 origin/main 과의 전체 차이를 본다. 운영 계약은 작업 브랜치 push 라 Required CI(secret-scan)로
  //   일원화하고 로컬 훅에서는 생략한다(DEC-OPS-434).
  const [emptyInput, newRef] = await Promise.all([
    runHook(''),
    runHook(`${pushLine('refs/heads/new-branch', LOCAL_OID, 'refs/heads/new-branch', ZERO_OID)}\n`),
  ]);
  assertSuccessful(emptyInput);
  assert.deepEqual(emptyInput.npmCalls, ['run regen -- --check', 'run test:operational-contracts']);
  assert.ok(emptyInput.gitCalls.some((call) => call.includes('origin/main..HEAD')));

  assertSuccessful(newRef);
  assert.deepEqual(newRef.npmCalls, ['run regen -- --check']);
  assert.match(newRef.stdout, /PR Required CI\(secret-scan[^)]*\)에서 검증한다/);
  assert.ok(newRef.gitCalls.some((call) => call.includes(`origin/main..${LOCAL_OID}`)));
});

test('the contract exposes deletion-condition regressions as reproducible red outcomes', { concurrency: true }, async () => {
  const deletion = `${pushLine('(delete)', ZERO_OID, 'refs/heads/old-branch', REMOTE_OID)}\n`;
  const mixed = [
    pushLine('(delete)', ZERO_OID, 'refs/heads/old-branch', REMOTE_OID),
    pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID),
  ].join('\n') + '\n';

  const remoteOidMutant = hookSource.replace(
    'if [ "$local_sha" = "$ZERO_OID" ]; then',
    'if [ "$remote_sha" = "$ZERO_OID" ]; then',
  );
  assert.notEqual(remoteOidMutant, hookSource);

  const anyDeletionMutant = hookSource.replace(
    'if [ "$DELETION_REFS" -gt 0 ] && [ "$OBJECT_REFS" -eq 0 ]; then',
    'if [ "$DELETION_REFS" -gt 0 ]; then',
  );
  assert.notEqual(anyDeletionMutant, hookSource);
  const [remoteRes, anyDelRes] = await Promise.all([
    runHook(deletion, remoteOidMutant),
    runHook(mixed, anyDeletionMutant),
  ]);
  assert.notDeepEqual(remoteRes.npmCalls, []);
  assert.deepEqual(anyDelRes.npmCalls, []);
});

const crossStackCommand = 'pnpm -C frontend exec vitest run src/__tests__/cross-stack';

// process.exit 는 실제처럼 실행을 멈춘다 — 기록만 하고 계속 돌면 분기 앞 조기 종료 뒤에도 명령 목록이 그대로라 놓친다.
const EXIT_SIGNAL = Symbol('process.exit');

function observeVerification(scope, { source, failCommand, env = {}, recordEvents = [] } = {}) {
  const commands = [];
  const exits = [];
  const zones = [];
  const runner = source ?? readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  try {
    runInNewContext(runner.replace(/^import [^\r\n]+ from '(?:node:[^']+|\.\/heavy-run-queue\.mjs)';\r?$/gm, ''), {
      execSync: (command, options) => {
        commands.push(command);
        recordEvents.push({ event: 'exec', command });
        zones.push(options?.env?.TZ);
        if (command === failCommand) throw new Error('deliberate verification failure');
        // 원문 계약 탐지기는 목록을 돌려준다(시험이 한 번 계산한 목록).
        if (command === SOURCE_CONTRACTS_DETECT) return `${SOURCE_CONTRACT_FILES.join('\n')}\n`;
      },
      platform: () => 'linux',
      randomBytes: () => ({ toString: () => 'fixture-only' }),
      generateKeyPairSync: () => ({ publicKey: { export: () => ({ toString: () => 'fixture-spki' }) } }),
      ensureQueued: (kind) => { recordEvents.push({ event: 'queue', kind }); return 'direct'; },
      process: {
        argv: ['node', 'scripts/verify.mjs', scope],
        env,
        cwd: () => repoRoot,
        exit: (code) => {
          exits.push(code);
          throw EXIT_SIGNAL;
        },
      },
      console: { log() {}, error() {} },
    }, { timeout: 1000 });
  } catch (error) {
    if (error !== EXIT_SIGNAL) throw error;
  }
  return { commands, exits, zones };
}

// [DEC-OPS-413] 단독 실행 대상은 검증 명령을 실행하기 전에 대기열에서 차례를 기다린다(ops 는 원격 정책 조회 하나라 줄을 서지 않는다).
test('verify queues before running any command, in every scope but ops', () => {
  for (const scope of ['docs', 'fast', 'push', 'full', 'be', 'fe', 'e2e', 'migration', 'integrate']) {
    const events = [];
    observeVerification(scope, { recordEvents: events });
    assert.deepEqual([events[0]?.event, events[0]?.kind, events[1]?.event], ['queue', 'verify', 'exec'], scope);
  }
  const ops = [];
  observeVerification('ops', { recordEvents: ops });
  assert.equal(ops.some(({ event }) => event === 'queue'), false);
  assert.equal(ops[0]?.event, 'exec');
  // 대기열 진입을 첫 명령 뒤로 옮긴 실행기는 위 단언에 걸린다(red 재현): 검증 명령을 먼저 실행한다.
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const queueLine = "if (scope !== 'ops') ensureQueued('verify');\n";
  assert.ok(runner.includes(queueLine));
  const moved = runner.replace(queueLine, '').replace('  } else if (scope === \'push\') {\n    runFastChecks();\n',
    `  } else if (scope === 'push') {\n    runFastChecks();\n    ${queueLine}`);
  assert.notEqual(moved, runner);
  const events = [];
  observeVerification('push', { source: moved, recordEvents: events });
  assert.equal(events[0]?.event, 'exec', 'the moved runner executes commands before queueing');
});

// 로컬 기본은 KST(개발 기계와 같은 조건)이고, 명시한 TZ 가 이겨 CI 러너(UTC) 조건을 그대로 재현할 수 있다.
test('verify defaults to KST and lets an explicit TZ reproduce the UTC CI runner', () => {
  for (const scope of ['docs', 'fast', 'full', 'e2e']) {
    const local = observeVerification(scope).zones;
    assert.ok(local.length > 0 && local.every(zone => zone === 'Asia/Seoul'), scope);
    const ci = observeVerification(scope, { env: { TZ: 'UTC' } }).zones;
    assert.ok(ci.length > 0 && ci.every(zone => zone === 'UTC'), scope);
  }
  // 시간대를 다시 고정하면 명시한 UTC 가 무시된다 — 위 단언이 그것을 잡는다(red 재현).
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  const pinned = runner.replace("TZ: process.env.TZ || 'Asia/Seoul'", "TZ: 'Asia/Seoul'");
  assert.notEqual(pinned, runner);
  assert.ok(observeVerification('docs', { source: pinned, env: { TZ: 'UTC' } }).zones.every(zone => zone === 'Asia/Seoul'));
});

test('verification profiles execute the full required Vitest population exactly once', () => {
  const expected = {
    docs: [],
    fast: ['pnpm -C frontend exec vitest run src/__tests__', VERIFY_SOURCE_CONTRACTS],
    push: ['pnpm -C frontend exec vitest run src/__tests__', VERIFY_SOURCE_CONTRACTS],
    be: [crossStackCommand],
    fe: ['pnpm -C frontend run test:coverage'],
    full: ['pnpm -C frontend run test:coverage'],
  };
  for (const [scope, vitest] of Object.entries(expected)) {
    const result = observeVerification(scope);
    assert.deepEqual(result.exits, [], scope);
    assert.deepEqual(result.commands.filter(command => /vitest|test:coverage/.test(command)), vitest, scope);
    assert.equal(result.commands.filter(command => command === 'npm run test:operational-contracts').length, 1, scope);
    for (const failCommand of vitest) {
      assert.deepEqual(observeVerification(scope, { failCommand }).exits, [1], `${scope} must propagate ${failCommand} failure`);
    }
  }
  // 원문 계약 탐지가 실패하면(0건 포함) 건너뛰지 않고 멈춘다 — 삼키면 원문 계약 없이 '검증 통과'로 끝난다.
  const undetected = source => ['fast', 'push'].map(scope => observeVerification(scope, { source, failCommand: SOURCE_CONTRACTS_DETECT }));
  for (const failed of undetected()) {
    assert.deepEqual(failed.exits, [1], 'a failed source-contract detection must stop verification');
    assert.equal(failed.commands.at(-1), SOURCE_CONTRACTS_DETECT);
    assert.ok(!failed.commands.includes(VERIFY_SOURCE_CONTRACTS));
  }
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  // 탐지 실패를 삼키는 변이는 위 단언에서 붉다(red 재현) — 성공 경로의 명령 목록은 그대로라 다른 단언은 못 잡는다.
  const detection = "  const list = execSync('node scripts/frontend-source-contracts.mjs', {";
  assert.ok(runner.includes(detection));
  const swallowedDetection = runner.replace(detection, `  let list = '';\n  try { list = execSync('node scripts/frontend-source-contracts.mjs', {`)
    .replace("  }).trim().split(/\\r?\\n/).join(' ');\n", "  }).trim().split(/\\r?\\n/).join(' '); } catch { return; }\n")
    .replace("  }).trim().split(/\\r?\\n/).join(' ');\r\n", "  }).trim().split(/\\r?\\n/).join(' '); } catch { return; }\r\n");
  assert.notEqual(swallowedDetection, runner);
  assert.ok(undetected(swallowedDetection).every(failed => failed.exits.length === 0), 'the swallowed-detection mutant must pass silently');
  const missingCoverage = runner.replace("run('pnpm -C frontend run test:coverage');", '');
  assert.notEqual(missingCoverage, runner);
  assert.deepEqual(observeVerification('full', { source: missingCoverage }).commands.filter(command => /vitest|test:coverage/.test(command)), [],
    'removing the sole coverage owner must lose the expected population');
});

// [2026-10-17] 실패가 잦고 짧은 정적 검사(codegen·타입·lint·폼 census, fast·push·pre-push 는 Java 컴파일 포함)가
//   운영 계약(로컬 약 11분)보다 먼저 돈다. full·be 의 Java 컴파일은 backend 전수 lane(gradle 한 줄) 안에서 계약 뒤에 돌고,
//   be·docs 는 계약이 먼저다. 운영 계약은 그것을 부르는 범위에서 한 번 돌고 ops·migration 은 부르지 않는다.
//   명령 집합과 인자는 그대로이고 순서만 바뀐다 — 성공하면 모두 실행되고, 정적 검사가 실패하면 계약을 기다리지 않는다.
// [2026-10-24] 생성물 신선도(npm run regen -- --check)는 pre-push 문서·소스 두 경로와, 운영 계약을 부르는 verify 범위의 맨 앞이다
//   (fast·push·full 은 CodeQL 근사 다음) — 운영 계약이 다시 보는 검사를 앞당길 뿐이다. 그 안의 sync-contract 가 계약 codegen 을 보므로
//   verify 의 정적 검사에서 codegen:verify(:zod)를 다시 돌리지 않는다.
const REGEN_CHECK = 'npm run regen -- --check';
const CONTRACTS = 'npm run test:operational-contracts';
const VERIFY_STATIC = [
  'pnpm -C frontend run type-check',
  'pnpm -C frontend run type-check:e2e',
  'pnpm -C frontend run lint',
  'pnpm -C frontend run test:form-validation',
];
const VERIFY_BACKEND_SUITE = './gradlew compileJava compileTestJava test :api-server:harnessTest :foundation:check jacocoRootCoverageVerification :api-server:schemaValidationTest --warning-mode fail --console=plain -Dfile.encoding=UTF-8';
const VERIFY_PACKAGING = ['pnpm -C frontend build', 'pnpm -C frontend run bundle:check', 'pnpm -C frontend run test:coverage'];
// [2026-10-20] CodeQL 근사(scripts/sast-approximation.mjs, 수 초)는 fast·push·full 의 맨 앞이다 — 가장 싼 정적 검사다.
const SAST_APPROXIMATION = 'npm run sast:approx';
// [2026-10-28] fast·push 는 pre-push 소스 경로처럼 불변식 Vitest·원문 계약(push 는 하네스까지)도 운영 계약 앞에서 돌고 계약이 마지막이다
//   (DEC-OPS-338 ① 의 확장 — 그 결정은 tsc·lint·폼 census 만 앞당겼다). 명령 집합·인자는 그대로다.
const VERIFY_FAST_CHECKS = [SAST_APPROXIMATION, REGEN_CHECK, './gradlew compileJava compileTestJava -Dfile.encoding=UTF-8', ...VERIFY_STATIC,
  'pnpm -C frontend exec vitest run src/__tests__', SOURCE_CONTRACTS_DETECT, VERIFY_SOURCE_CONTRACTS];
const VERIFY_HARNESS = './gradlew :api-server:harnessTest -Dfile.encoding=UTF-8';
const VERIFY_FAST = [...VERIFY_FAST_CHECKS, CONTRACTS];
// 갈래 통합 뒤 푸시 전 점검(오케스트레이션 프로토콜 §6.4): Flyway 충돌 → regen → 폼 census·전체 시험·하네스 → 선별 E2E. 운영 계약은 부르지 않는다.
const INTEGRATION_PRECHECK = 'node scripts/integration-precheck.mjs';
const INTEGRATION_FORMS = 'pnpm -C frontend run test:form-validation';
const INTEGRATION_BACKEND = './gradlew :api-server:test :api-server:harnessTest --console=plain -Dfile.encoding=UTF-8';
const VERIFY_INTEGRATE = [INTEGRATION_PRECHECK, 'npm run regen', INTEGRATION_FORMS, 'pnpm -C frontend exec vitest run',
  INTEGRATION_BACKEND, 'node scripts/integration-precheck.mjs --run-selected'];

test('verify profiles run static checks before the operational contracts and stop on their failure', () => {
  const expected = {
    docs: [REGEN_CHECK, CONTRACTS],
    fast: VERIFY_FAST,
    push: [...VERIFY_FAST_CHECKS, VERIFY_HARNESS, CONTRACTS],
    be: [REGEN_CHECK, CONTRACTS, VERIFY_BACKEND_SUITE, crossStackCommand],
    fe: [REGEN_CHECK, ...VERIFY_STATIC, CONTRACTS, ...VERIFY_PACKAGING],
    full: [SAST_APPROXIMATION, REGEN_CHECK, ...VERIFY_STATIC, CONTRACTS, VERIFY_BACKEND_SUITE, ...VERIFY_PACKAGING],
    e2e: [REGEN_CHECK, 'pnpm -C frontend run type-check:e2e', CONTRACTS, 'node scripts/run-isolated-e2e.mjs'],
    integrate: VERIFY_INTEGRATE,
  };
  for (const [scope, commands] of Object.entries(expected)) {
    const observed = observeVerification(scope);
    assert.deepEqual(observed.commands, commands, scope);
    assert.deepEqual(observed.exits, [], `${scope}: the success path must not exit early`);
  }
  // post-push 범위는 폐기됐다 — 알 수 없는 범위로 exit 2 거부한다(DEC-OPS-434).
  assert.deepEqual(observeVerification('post-push').exits, [2], 'retired post-push scope must fail closed with exit 2');
  // ops·migration 은 운영 계약을 부르지 않고 자기 검사만 돈다(README·verify.mjs 의 '운영 계약을 부르는 범위').
  for (const scope of ['ops', 'migration']) {
    const observed = observeVerification(scope);
    assert.deepEqual(observed.exits, [], `${scope}: the success path must not exit early`);
    assert.ok(observed.commands.length > 0 && !observed.commands.includes(CONTRACTS), `${scope} runs its own checks without the operational contracts`);
  }
  // 범위 분기 자체가 실행되는지(분기 앞 최상위 코드)는 gate registry 의 정적 분석이 보지 않고 이 관찰이 소유한다.
  // try 앞 무조건 종료와 e2e 만 거르는 종료는 정적 분석에서 green 이다 — 위 명령 목록·exits 단언이 둘 다 잡는다(red 재현).
  const source = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  for (const [early, scope] of [['process.exit(0);', 'full'], ["if (scope.startsWith('e2')) process.exit(0);", 'e2e']]) {
    const exited = source.replace(/\r?\ntry \{\r?\n/u, match => `\n${early}${match}`);
    assert.notEqual(exited, source, early);
    const observed = observeVerification(scope, { source: exited });
    assert.deepEqual([observed.commands, observed.exits], [[], [0]], early);
  }
  const typeCheck = 'pnpm -C frontend run type-check';
  for (const scope of ['fast', 'push', 'fe', 'full']) {
    const failed = observeVerification(scope, { failCommand: typeCheck });
    assert.deepEqual(failed.exits, [1], scope);
    assert.equal(failed.commands.at(-1), typeCheck, scope);
    assert.ok(!failed.commands.includes(CONTRACTS), `${scope}: a type error must not wait for the operational contracts`);
  }
  // 계약을 정적 검사 앞으로 되돌리면 타입 오류에서도 계약을 먼저 기다린다 — 위 단언이 그것을 잡는다(red 재현).
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const contractsFirst = runner.replace("  } else if (scope === 'fe') {\n    runGeneratedFreshness();\n    runFrontendStatic();\n    runOperationalContracts();\n",
    "  } else if (scope === 'fe') {\n    runGeneratedFreshness();\n    runOperationalContracts();\n    runFrontendStatic();\n");
  assert.notEqual(contractsFirst, runner);
  assert.ok(observeVerification('fe', { source: contractsFirst, failCommand: typeCheck }).commands.includes(CONTRACTS));
  // fast·push 의 불변식·원문 계약·하네스 실패도 운영 계약을 기다리지 않는다(pre-push 소스 경로와 같은 순서).
  const shortStageFailures = [['fast', 'pnpm -C frontend exec vitest run src/__tests__'], ['fast', VERIFY_SOURCE_CONTRACTS],
    ['push', 'pnpm -C frontend exec vitest run src/__tests__'], ['push', VERIFY_SOURCE_CONTRACTS], ['push', VERIFY_HARNESS]];
  const waitsForContracts = source => shortStageFailures.filter(([scope, failCommand]) => {
    const failed = observeVerification(scope, { source, failCommand });
    assert.deepEqual(failed.exits, [1], `${scope}: ${failCommand} failure must stop verification`);
    return failed.commands.includes(CONTRACTS);
  }).map(([scope, failCommand]) => `${scope}: ${failCommand}`);
  assert.deepEqual(waitsForContracts(), [], 'a short-stage failure must not wait for the operational contracts');
  // 계약을 불변식·원문 계약·하네스 앞으로 되돌린 종전 순서는 그 실패에서 계약을 먼저 기다린다 — 위 단언이 그것을 잡는다(red 재현).
  const formerOrder = runner
    .replace("  runFrontendStatic();\n  run('pnpm -C frontend exec vitest run src/__tests__');\n", "  runFrontendStatic();\n  runOperationalContracts();\n  run('pnpm -C frontend exec vitest run src/__tests__');\n")
    .replace("    runFastChecks();\n    runOperationalContracts();\n", '    runFastChecks();\n')
    .replace("    run(`${gradlew} :api-server:harnessTest -Dfile.encoding=UTF-8`);\n    runOperationalContracts();\n", "    run(`${gradlew} :api-server:harnessTest -Dfile.encoding=UTF-8`);\n");
  assert.notEqual(formerOrder, runner);
  assert.deepEqual(observeVerification('push', { source: formerOrder }).commands,
    [...VERIFY_FAST_CHECKS.slice(0, -3), CONTRACTS, ...VERIFY_FAST_CHECKS.slice(-3), VERIFY_HARNESS],
    'the former-order fixture must be the pre-2026-10-28 command order');
  assert.equal(waitsForContracts(formerOrder).length, shortStageFailures.length);
});

test('verify stops on a CodeQL approximation finding first and on a Flyway conflict before regenerating', () => {
  for (const scope of ['fast', 'push', 'full']) {
    assert.deepEqual(observeVerification(scope, { failCommand: SAST_APPROXIMATION }), { commands: [SAST_APPROXIMATION], exits: [1], zones: ['Asia/Seoul'] }, scope);
  }
  // 갈래 통합 점검은 Flyway 충돌에서 생성물을 다시 만들지 않고 멈추며, 무거운 시험이 실패해도 멈춘다. 운영 계약은 pre-push 몫이다.
  assert.deepEqual(observeVerification('integrate', { failCommand: INTEGRATION_PRECHECK }).commands, [INTEGRATION_PRECHECK]);
  assert.deepEqual(observeVerification('integrate', { failCommand: 'pnpm -C frontend exec vitest run' }).exits, [1]);
  assert.ok(!observeVerification('integrate').commands.includes(CONTRACTS));
  // 근사를 full 에서 걷거나 Flyway 점검을 regen 뒤로 옮기면 위 기대가 깨진다(red 재현).
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const withoutApproximation = runner.replace("  } else if (scope === 'full') {\n    runScriptStatic();\n", "  } else if (scope === 'full') {\n");
  assert.notEqual(withoutApproximation, runner);
  assert.notEqual(observeVerification('full', { source: withoutApproximation }).commands[0], SAST_APPROXIMATION);
  const regenFirst = runner.replace("    run('node scripts/integration-precheck.mjs');\n    run('npm run regen');\n",
    "    run('npm run regen');\n    run('node scripts/integration-precheck.mjs');\n");
  assert.notEqual(regenFirst, runner);
  assert.deepEqual(observeVerification('integrate', { source: regenFirst, failCommand: INTEGRATION_PRECHECK }).commands, ['npm run regen', INTEGRATION_PRECHECK]);
});

// [2026-10-24] 운영 계약(로컬 약 11분)을 부르는 범위는 생성물 신선도(약 20초)를 그보다 먼저 정확히 한 번 본다.
//   계약 codegen 은 그 안의 sync-contract 가 맡는다.
function freshnessViolation(scope, source) {
  const { commands } = observeVerification(scope, { source });
  const position = commands.indexOf(REGEN_CHECK);
  if (commands.filter(command => command === REGEN_CHECK).length !== 1) return `${scope}: generated freshness must run exactly once`;
  if (position !== (['fast', 'push', 'full'].includes(scope) ? 1 : 0)) return `${scope}: generated freshness must lead (after the CodeQL approximation)`;
  if (!(position < commands.indexOf(CONTRACTS))) return `${scope}: generated freshness must run before the operational contracts`;
  if (commands.some(command => /codegen:verify/.test(command))) return `${scope}: the regen check owns contract drift`;
  return null;
}

test('verify checks generated freshness before the operational contracts in every contract scope', () => {
  for (const scope of ['docs', 'fast', 'push', 'be', 'fe', 'full', 'e2e']) {
    assert.equal(freshnessViolation(scope), null);
    const failed = observeVerification(scope, { failCommand: REGEN_CHECK });
    assert.deepEqual(failed.exits, [1], scope);
    assert.equal(failed.commands.at(-1), REGEN_CHECK, scope);
    assert.ok(!failed.commands.includes(CONTRACTS), `${scope}: a stale artifact must not wait for the operational contracts`);
  }
  for (const scope of ['integrate', 'ops', 'migration']) assert.ok(!observeVerification(scope).commands.includes(REGEN_CHECK), scope);
  assert.deepEqual(observeVerification('docs').commands, [REGEN_CHECK, CONTRACTS]);
  // 호출을 걷거나, 계약 뒤로 옮기거나, 프런트 codegen 중복을 되살리면 위 판정이 붉다(red 재현).
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8').replace(/\r\n/g, '\n');
  for (const [scope, from, to, message] of [
    ['docs', 'function runDocumentationContracts() {\n  runGeneratedFreshness();\n', 'function runDocumentationContracts() {\n', /exactly once/],
    ['be', "  } else if (scope === 'be') {\n    runGeneratedFreshness();\n    runOperationalContracts();\n",
      "  } else if (scope === 'be') {\n    runOperationalContracts();\n    runGeneratedFreshness();\n", /must lead/],
    ['fe', "function runFrontendStatic() {\n", "function runFrontendStatic() {\n  run('pnpm -C frontend run codegen:verify');\n", /owns contract drift/],
  ]) {
    const mutated = runner.replace(from, to);
    assert.notEqual(mutated, runner, scope);
    assert.match(freshnessViolation(scope, mutated) ?? '', message, scope);
  }
});

test('integration propagates failures without skipping earlier stages', () => {
  for (const command of [INTEGRATION_FORMS, INTEGRATION_BACKEND, 'node scripts/integration-precheck.mjs --run-selected']) {
    const failed = observeVerification('integrate', { failCommand: command });
    assert.deepEqual(failed.exits, [1], command);
    assert.deepEqual(failed.commands, VERIFY_INTEGRATE.slice(0, VERIFY_INTEGRATE.indexOf(command) + 1), command);
  }
  const source = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  const integrateStart = source.indexOf("  } else if (scope === 'integrate') {");
  assert.ok(integrateStart > 0);
  const before = source.slice(0, integrateStart);
  const integrateAndAfter = source.slice(integrateStart);
  for (const [label, mutation] of [
    ['census omitted', integrateAndAfter.replace("    run('pnpm -C frontend run test:form-validation');", '')],
    ['harness omitted', integrateAndAfter.replace(':api-server:test :api-server:harnessTest', ':api-server:test')],
  ]) {
    assert.notEqual(mutation, integrateAndAfter, label);
    assert.throws(() => assert.deepEqual(observeVerification('integrate', { source: before + mutation }).commands, VERIFY_INTEGRATE), label);
  }
});

test('pre-push runs real heavy-run-queue and ci-change-scope CLIs cleanly (end-to-end CLI smoke)', { concurrency: true }, async () => {
  const docsInput = `${pushLine('refs/heads/feature', LOCAL_OID, 'refs/heads/feature', ZERO_OID)}\n`;
  const docsResult = await runHook(docsInput, hookSource, {
    files: ['docs/README.md'],
    realScopeCli: true,
    realQueueCli: true,
  });
  assertSuccessful(docsResult);
  assert.match(docsResult.stdout, /Fast-pass/);
});

// [2026-10-20] 소스 경로는 생성물 신선도 다음에 CodeQL 근사를 push 가 바꾼 파일에만 돈다(문서 전용 경로에는 JS·TS 가 없다).
const SAST_APPROXIMATION_HOOK = 'npm run sast:approx -- --stdin';
const PRE_PUSH_SOURCE_ORDER = [
  REGEN_CHECK,
  SAST_APPROXIMATION_HOOK,
  'gradlew compileJava compileTestJava -q',
  'pnpm run type-check',
  'npx tsc -p tsconfig.e2e.json --noEmit',
  'pnpm run lint',
  'pnpm run test:form-validation',
  INVARIANTS_RUN,
  SOURCE_CONTRACTS_DETECT,
  SOURCE_CONTRACTS_RUN,
  'gradlew :api-server:harnessTest -q',
  // [2026-10-28] 불변식·원문 계약·cross-stack·하네스도 짧고 실패가 잦아 운영 계약 앞이다 — 운영 계약이 마지막이다(DEC-OPS-338 ① 의 확장).
  CONTRACTS,
];

// 운영 계약 호출은 소스 경로의 맨 끝, 완료 문구 바로 앞이다.
const SOURCE_PATH_CONTRACTS_TAIL = /\nrun_operational_contracts\n(?=\necho "\[pre-push\] ✅)/u;
const INVARIANTS_START = '\nif [ "$SCOPE_FRONTEND" = "true" ] && [ -f frontend/package.json ]; then\n  # 빠른 저장소 불변식';

/** 종전(2026-10-28 전) 순서의 훅 — 운영 계약이 정적 검사 바로 뒤, 불변식·원문 계약·cross-stack·하네스 앞이다. red 재현용이다. */
function contractsBeforeShortStages(source) {
  const lf = source.replace(/\r\n/g, '\n');
  assert.match(lf, SOURCE_PATH_CONTRACTS_TAIL, 'the source path must end with the operational contracts');
  assert.ok(lf.includes(INVARIANTS_START), 'the frontend invariants block must follow the static checks');
  return lf.replace(SOURCE_PATH_CONTRACTS_TAIL, '\n')
    .replace(INVARIANTS_START, () => `\nrun_operational_contracts\n${INVARIANTS_START}`);
}

test('pre-push does not display an empty file when a successful ref has no changes', { concurrency: true }, async () => {
  const secondLocal = '3'.repeat(40);
  const secondRemote = '4'.repeat(40);
  const input = [
    pushLine('refs/heads/docs', LOCAL_OID, 'refs/heads/docs', REMOTE_OID),
    pushLine('refs/heads/empty', secondLocal, 'refs/heads/empty', secondRemote),
  ].join('\n') + '\n';
  const result = await runHook(input, hookSource, { emptyDiffRange: `${secondRemote}..${secondLocal}` });
  assertSuccessful(result);
  assert.match(result.stdout, /Fast-pass/);
  assert.match(result.stdout, /- docs\/README\.md/);
  assert.doesNotMatch(result.stdout, /^\s+-\s*$/m);
});

test('pre-push discards every partial diff result and runs the full gates when any ref diff fails', { concurrency: true }, async () => {
  const secondLocal = '3'.repeat(40);
  const secondRemote = '4'.repeat(40);
  const input = [
    pushLine('refs/heads/first', LOCAL_OID, 'refs/heads/first', REMOTE_OID),
    pushLine('refs/heads/second', secondLocal, 'refs/heads/second', secondRemote),
  ].join('\n') + '\n';
  const ranges = [`${REMOTE_OID}..${LOCAL_OID}`, `${secondRemote}..${secondLocal}`];
  // 두 ref 모두 작업 브랜치라 운영 계약은 push 뒤로 미룬다(DEC-OPS-410) — 그 밖의 소스 경로 전체가 돈다.
  const assertFullFallback = result => {
    assertSuccessful(result);
    assert.deepEqual(result.commands, PRE_PUSH_SOURCE_ORDER.filter(command => command !== CONTRACTS),
      'a missing ref must not retain a documentation fast-pass from any successful or partial diff');
    assert.match(result.stdout, /docsOnly=false \/ backend=true \/ migration=true \/ frontend=true/);
    assert.doesNotMatch(result.stdout, /Fast-pass/);
  };
  // 원래 pipeline은 sort의 성공으로 앞선 diff 실패를 숨긴다. 그 회귀가 같은 단언에서 red임을 확인한다.
  const swallowed = hookSource.replace(
    /  for r in \$RANGES; do\r?\n[\s\S]*?\r?\n  done\r?\n  CHANGED_FILES=[^\r\n]+/u,
    '  CHANGED_FILES=$(for r in $RANGES; do git diff --no-renames --name-only --diff-filter=ACMRD $r 2>/dev/null; done | sort -u)',
  );
  assert.notEqual(swallowed, hookSource, 'the mutant must restore the original diff pipeline');

  const pairs = ranges.flatMap(failDiffRange => [[], ['docs/partial.md']].map(failedDiffOutput => ({ failDiffRange, failedDiffOutput })));
  await Promise.all(pairs.map(async ({ failDiffRange, failedDiffOutput }) => {
    const [result, partial] = await Promise.all([
      runHook(input, hookSource, { failDiffRange, failedDiffOutput }),
      runHook(input, swallowed, { failDiffRange, failedDiffOutput }),
    ]);
    assertFullFallback(result);
    assert.match(result.stderr, /부분 목록을 버리고 전체 게이트를 실행/);
    assertSuccessful(partial);
    // 첫 ref가 출력 없이 실패하면 dash는 errexit로 루프를 멈추지만 Bash는 다음 ref를 읽는다.
    // 나머지 세 조합은 두 셸 모두 부분 목록이 남으므로 반드시 같은 단언에서 red여야 한다.
    const stoppedBeforeNextRef = failDiffRange === ranges[0] && failedDiffOutput.length === 0
      && !partial.stdout.includes('docsOnly=true');
    if (stoppedBeforeNextRef) {
      assertFullFallback(partial);
    } else {
      assert.match(partial.stdout, /docsOnly=true/);
      assert.throws(() => assertFullFallback(partial), assert.AssertionError);
    }
  }));
});

// 계약 드리프트(api-docs.json ↔ 생성 타입·zod·operations)는 맨 앞의 regen --check 가 본다. 그 생성 계약 검사는 프런트
// codegen:verify·codegen:verify:zod 와 같은 스크립트·인자라, 프런트 단계에서 다시 돌리면 한 push 안에서 같은 명령·입력이 두 번 돈다.
// 그 전제(같은 검증기)와 훅이 계약 드리프트를 한 번만 보는지를 함께 고정한다. 검사기가 갈라지면 이 시험이 붉어 중복 제거를 다시 판단한다.
test('pre-push checks contract drift once, through the regen check that runs the frontend codegen verifier', { concurrency: true }, async () => {
  const sync = GENERATORS.find(generator => generator.id === 'sync-contract');
  assert.deepEqual(sync.check, [['node', ['scripts/verify-generated-contracts.mjs', 'api']], ['node', ['scripts/verify-generated-contracts.mjs', 'zod']]],
    'the regen check must run the contract verifier for both api and zod');
  const scripts = JSON.parse(readFileSync(path.join(repoRoot, 'frontend', 'package.json'), 'utf8')).scripts;
  assert.equal(scripts['codegen:verify'], 'node ../scripts/verify-generated-contracts.mjs api');
  assert.equal(scripts['codegen:verify:zod'], 'node ../scripts/verify-generated-contracts.mjs zod');
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  // 프런트 단계에 다시 넣으면 같은 검사가 두 번 돈다 — 위 단언과 PRE_PUSH_SOURCE_ORDER 가 그것을 잡는다(red 재현).
  const doubled = hookSource.replace(/(\r?\n)( {2}# ESLint error는)/u, '$1  ( cd frontend && pnpm run codegen:verify && pnpm run codegen:verify:zod ) || exit 1$1$2');
  assert.notEqual(doubled, hookSource);
  const [normal, drifted, doubledRes] = await Promise.all([
    runHook(input, hookSource, { files: ['frontend/src/example.ts'] }),
    runHook(input, hookSource, { files: ['frontend/src/example.ts'], failCommand: REGEN_CHECK }),
    runHook(input, doubled, { files: ['frontend/src/example.ts'] }),
  ]);
  assert.deepEqual(normal.commands.filter(command => command === REGEN_CHECK || /codegen:verify/.test(command)), [REGEN_CHECK]);
  // 낡은 생성 계약은 regen --check 에서 멈춘다(그 뒤 아무것도 돌지 않는다).
  assert.deepEqual(drifted.commands, [REGEN_CHECK]);
  assert.notEqual(drifted.status, 0);
  assert.ok(doubledRes.commands.includes('pnpm run codegen:verify'));
});

test('pre-push runs static checks, invariant and source-contract Vitest, cross-stack and harness before the operational contracts', { concurrency: true }, async () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const files = ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts'];
  const shortStages = [
    ...[SAST_APPROXIMATION_HOOK, 'gradlew compileJava compileTestJava -q', 'pnpm run type-check', INVARIANTS_RUN, SOURCE_CONTRACTS_RUN,
      'gradlew :api-server:harnessTest -q'].map(failCommand => ({ files, failCommand })),
    { files: [files[0]], failCommand: CROSS_STACK_RUN },
  ];
  const waitsForContracts = async (source) => {
    const results = await Promise.all(shortStages.map(({ files: pushed, failCommand }) =>
      runHook(input, source, { files: pushed, failCommand })));
    return shortStages.filter(({ failCommand }, index) => {
      const failed = results[index];
      assert.notEqual(failed.status, 0, failCommand);
      assert.equal(failed.commands.at(-1), failCommand);
      return failed.commands.includes(CONTRACTS);
    }).map(({ failCommand }) => failCommand);
  };
  const contractsFirst = hookSource.replace(/\r\n/g, '\n')
    .replace('echo "[pre-push] AGENTS.md change-scoped source verification"', 'run_operational_contracts\necho "[pre-push] AGENTS.md change-scoped source verification"')
    .replace(SOURCE_PATH_CONTRACTS_TAIL, '\n');
  assert.notEqual(contractsFirst, hookSource.replace(/\r\n/g, '\n'));
  const formerOrder = contractsBeforeShortStages(hookSource);

  const [both, backendOnly, currentWaits, contractsFirstRes, formerCommandsRes, formerWaits] = await Promise.all([
    runHook(input, hookSource, { files }),
    runHook(input, hookSource, { files: [files[0]] }),
    waitsForContracts(hookSource),
    runHook(input, contractsFirst, { files, failCommand: 'pnpm run type-check' }),
    runHook(input, formerOrder, { files }),
    waitsForContracts(formerOrder),
  ]);
  assertSuccessful(both);
  assert.deepEqual(both.commands, PRE_PUSH_SOURCE_ORDER);
  assertSuccessful(backendOnly);
  assert.deepEqual(backendOnly.commands,
    [REGEN_CHECK, SAST_APPROXIMATION_HOOK, 'gradlew compileJava compileTestJava -q', CROSS_STACK_RUN, 'gradlew :api-server:harnessTest -q', CONTRACTS]);
  assert.deepEqual(currentWaits, [], 'a short-stage failure must not wait for the operational contracts');
  assert.ok(contractsFirstRes.commands.includes(CONTRACTS));
  assert.notDeepEqual(formerCommandsRes.commands, PRE_PUSH_SOURCE_ORDER);
  assert.deepEqual(formerWaits, shortStages.slice(3).map(({ failCommand }) => failCommand));
});

// [2026-10-29] 프런트 타입 게이트(pre-push·verify 의 type-check)는 next build 의 타입 검사와 같은 전제로 돈다 — next typegen 으로
//   .next/types 를 새로 만든 뒤 tsc 를 돌고, next dev 가 따로 갱신하는 .next/dev 사본은 tsconfig 에서 뺀다. 두 사본은 같은 전역 라우트
//   타입을 다시 선언해 하나가 낡으면 src 와 무관한 TS2344·TS2307 이 났다(10-23 build 사본 + 10-28 dev 사본, select-board-list layout).
//   실제 tsconfig 와 Next 의 경로 함수·TypeScript 로 그 사고를 재현한다.
test('the frontend type gate regenerates route types and keeps the next dev copy out of the program', () => {
  const frontendRoot = path.join(repoRoot, 'frontend');
  const frontendRequire = createRequire(path.join(frontendRoot, 'package.json'));
  const ts = frontendRequire('typescript');
  const { getDevTypesPath, getTypeDefinitionGlobPatterns } = frontendRequire('next/dist/lib/typescript/type-paths.js');
  const scripts = JSON.parse(readFileSync(path.join(frontendRoot, 'package.json'), 'utf8')).scripts;
  // [2026-11-25] typegen 은 서명 비밀을 걷는 래퍼(scripts/next-cli.mjs)로 부른다 — 순서와 `&&`(실패하면 tsc 를 돌리지 않음)는 같다.
  // [2026-11-26 PR-3b] 기본 검사 뒤 색인 접근 단계 도입(tsconfig.index-access.json, 제품 소스)을 같은 && 사슬로 잇는다.
  assert.equal(scripts['type-check'], 'node scripts/next-cli.mjs typegen && tsc --noEmit && tsc --noEmit -p tsconfig.index-access.json', 'route types must be regenerated before tsc, and a typegen failure must stop it');

  const { config, error } = ts.readConfigFile(path.join(frontendRoot, 'tsconfig.json'), ts.sys.readFile);
  assert.equal(error, undefined);
  // Next 는 이 두 glob 을 tsconfig include 에 다시 써 넣는다. dev 경로가 옮겨 가면 여기서 붉어 제외 대상을 다시 판정한다.
  for (const glob of getTypeDefinitionGlobPatterns('.next')) assert.ok(config.include.includes(glob), glob);

  const fixture = mkdtempSync(path.join(tmpdir(), 'frontend-type-gate-'));
  try {
    const write = (relative, text) => {
      const file = path.join(fixture, relative);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text, 'utf8');
    };
    const devTypes = path.relative(fixture, getDevTypesPath(fixture, '.next')).replaceAll('\\', '/');
    write('next-env.d.ts', 'import "./.next/types/routes.d.ts";\n');
    // 낡은 build 사본: 그 뒤 추가된 layout 라우트가 없는데, next-env.d.ts 가 불러 이 전역 선언이 이긴다.
    write('.next/types/routes.d.ts', 'type LayoutRoutes = "/";\n'
      + 'declare global { type LayoutProps<R extends LayoutRoutes> = { params: Promise<R> }; }\nexport {};\n');
    // dev 사본: 새 라우트가 있고, 그 뒤 지워진 페이지를 아직 import 한다.
    write(`${devTypes}/routes.d.ts`, 'export type LayoutRoutes = "/" | "/board";\n');
    write(`${devTypes}/validator.ts`, 'import type { LayoutRoutes } from "./routes.js";\n'
      + 'type LayoutConfig<Route extends LayoutRoutes> = { default: (props: LayoutProps<Route>) => unknown };\n'
      + 'export type Checked = [LayoutConfig<"/board">, typeof import("../../../src/app/gone/page.js")];\n');
    const diagnostics = exclude => {
      const parsed = ts.parseJsonConfigFileContent({ ...config, exclude }, ts.sys, fixture);
      const options = { ...parsed.options, types: [], lib: ['lib.es2020.d.ts'], noUnusedLocals: false, incremental: false };
      return ts.getPreEmitDiagnostics(ts.createProgram({ rootNames: parsed.fileNames, options }))
        .map(d => `${d.file ? path.relative(fixture, d.file.fileName).replaceAll('\\', '/') : '<global>'} TS${d.code}`)
        .sort();
    };
    assert.deepEqual(diagnostics(config.exclude), [], 'the next dev copy must stay out of the type-checked program');
    // 제외를 빼면 이번 사고의 두 오류가 그대로 난다 — 위 단언이 그것을 잡는다(red 재현).
    assert.deepEqual(diagnostics(config.exclude.filter(entry => entry !== '.next/dev')),
      [`${devTypes}/validator.ts TS2307`, `${devTypes}/validator.ts TS2344`]);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  const feCommands = observeVerification('fe').commands;
  assert.ok(feCommands.includes('pnpm -C frontend run type-check') && feCommands.includes('pnpm -C frontend run type-check:e2e'),
    feCommands.join(','));
});

test('pre-push blocks a CodeQL approximation finding before compilation, only on the source path', { concurrency: true }, async () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const files = ['scripts/example.mjs'];
  // 근사는 push 가 바꾼 파일을 표준 입력으로 받는다 — 범위 밖 파일까지 보거나 아무것도 보지 않게 바뀌면 이 줄이 사라진다.
  assert.match(hookSource, /^printf '%s\\n' "\$CHANGED_FILES" \| npm run sast:approx -- --stdin \\\r?$/mu);
  // 실패 처리에서 exit 1 을 걷으면 근사 위반으로도 push 가 지나간다 — 위 단언이 그것을 잡는다(red 재현).
  const swallowed = hookSource.replace('(근사를 이유로 CodeQL 예외 원장을 늘리지 않습니다)"; exit 1; }', '(근사를 이유로 CodeQL 예외 원장을 늘리지 않습니다)"; }');
  assert.notEqual(swallowed, hookSource);
  const [blocked, docsRes, swallowedRes] = await Promise.all([
    runHook(input, hookSource, { files, failCommand: SAST_APPROXIMATION_HOOK }),
    runHook(input, hookSource, { files: ['docs/README.md'] }),
    runHook(input, swallowed, { files, failCommand: SAST_APPROXIMATION_HOOK }),
  ]);
  assert.notEqual(blocked.status, 0);
  assert.deepEqual(blocked.commands, [REGEN_CHECK, SAST_APPROXIMATION_HOOK], '근사 위반은 컴파일·운영 계약을 기다리지 않고 막는다');
  assert.ok(!docsRes.commands.includes(SAST_APPROXIMATION_HOOK), '문서 전용 push 에는 JS·TS 가 없다');
  assert.equal(swallowedRes.status, 0);
});

test('pre-push checks generated freshness first and stops before compilation and the operational contracts', { concurrency: true }, async () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const paths = [['docs/README.md'], ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts']];
  const stops = (source) => Promise.all(paths.map(async (files) => {
    const failed = await runHook(input, source, { files, failCommand: REGEN_CHECK });
    return { status: failed.status === 0 ? 0 : 'blocked', commands: failed.commands };
  }));
  // 실패 처리에서 exit 1 을 걷으면 낡은 생성물로도 다음 단계로 넘어가고, 검사를 정적 검사 뒤로 옮기면 컴파일을 먼저 기다린다 — 위 단언이 둘 다 잡는다(red 재현).
  const swallowed = hookSource.replace("함께 커밋하세요(SAST 예외는 위 안내대로 재검토 뒤 결속)\"; exit 1; }", "함께 커밋하세요(SAST 예외는 위 안내대로 재검토 뒤 결속)\"; }");
  const regenBlock = /# 생성물·해시 결속이 낡았는지 맨 앞에서 본다[\s\S]*?exit 1; \}\n\n/u;
  const block = hookSource.replace(/\r\n/g, '\n').match(regenBlock)?.[0];
  assert.ok(block, 'pre-push 의 생성물 신선도 블록을 찾지 못했다');
  const moved = hookSource.replace(/\r\n/g, '\n').replace(block, '')
    .replace(INVARIANTS_START, () => `\n${block}${INVARIANTS_START.slice(1)}`);
  assert.notEqual(swallowed, hookSource);
  assert.notEqual(moved, hookSource);
  const [normalStops, swallowedStops, movedStops] = await Promise.all([
    stops(hookSource),
    stops(swallowed),
    stops(moved),
  ]);
  assert.deepEqual(normalStops, paths.map(() => ({ status: 'blocked', commands: [REGEN_CHECK] })),
    '낡은 생성물은 컴파일·운영 계약을 기다리지 않고 바로 막는다');
  assert.notDeepEqual(swallowedStops, paths.map(() => ({ status: 'blocked', commands: [REGEN_CHECK] })));
  assert.notDeepEqual(movedStops, paths.map(() => ({ status: 'blocked', commands: [REGEN_CHECK] })));
});

test('pre-push blocks the push when the operational contracts fail on the documentation and source paths', { concurrency: true }, async () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const sourceFiles = ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts'];
  const cases = [
    { files: ['docs/README.md'], commands: [REGEN_CHECK, CONTRACTS] },
    { files: sourceFiles, commands: PRE_PUSH_SOURCE_ORDER.slice(0, PRE_PUSH_SOURCE_ORDER.indexOf(CONTRACTS) + 1) },
  ];
  const blocks = (source) => Promise.all(cases.map(async ({ files }) => {
    const failed = await runHook(input, source, { files, failCommand: CONTRACTS });
    return { status: failed.status === 0 ? 0 : 'blocked', commands: failed.commands };
  }));
  // 실패 처리에서 exit 1 을 걷으면 문서 경로는 fast-pass 로, 소스 경로는 다음 단계로 넘어간다 — 위 단언이 그것을 잡는다(red 재현).
  const swallowed = hookSource.replace('실행 경로가 불일치합니다"; exit 1; }', '실행 경로가 불일치합니다"; }');
  assert.notEqual(swallowed, hookSource);
  const [normalBlocks, swallowedBlocks] = await Promise.all([blocks(hookSource), blocks(swallowed)]);
  assert.deepEqual(normalBlocks, cases.map(({ commands }) => ({ status: 'blocked', commands })));
  assert.ok(swallowedBlocks.every(({ status }) => status === 0));
});

/*
  [2026-11-25 DEC-OPS-434] 작업 브랜치만 push 하면 운영 계약은 PR Required CI(secret-scan)에서 검증하므로 로컬 pre-push 에서는 생략한다.
  CI 가 미리 막지 않는 ref(main·master·태그·refs/heads 밖)나 ref 를 모르는 push 가 하나라도 있으면 지금처럼 여기서 돈다.
*/
test('a branch-only push skips operational contracts for Required CI; main, master, tags, other refs and unknown pushes run them', { concurrency: true }, async () => {
  const line = (ref) => pushLine(ref, LOCAL_OID, ref, REMOTE_OID);
  const runs = async (input, source = hookSource) => (await runHook(input, source, { files: ['docs/README.md'] })).npmCalls.includes('run test:operational-contracts');
  const deferredInputs = [
    `${line('refs/heads/feature')}\n`,
    `${line('refs/heads/fix/a')}\n${line('refs/heads/chore/b')}\n`,
    // 삭제는 object 를 보내지 않으므로 판정에 들지 않는다.
    `${line('refs/heads/feature')}\n${pushLine('(delete)', ZERO_OID, 'refs/heads/main', REMOTE_OID)}\n`,
  ];
  const runningInputs = [
    `${line('refs/heads/main')}\n`,
    `${line('refs/heads/master')}\n`,
    `${line('refs/tags/v1.0.0')}\n`,
    `${line('refs/notes/commits')}\n`,
    `${line('refs/heads/feature')}\n${line('refs/heads/main')}\n`,
    `${line('refs/heads/feature')}\n${line('refs/tags/v1.0.0')}\n`,
    '',
  ];
  // red 재현: 늘 미루는 훅은 main push 에서, main·master 판정을 걷은 훅은 main 에서, ref 를 모르는 push 를 미루는 훅은 빈 입력에서 붉다.
  const lf = hookSource.replace(/\r\n/g, '\n');
  const alwaysDefer = lf.replace('  if [ "$CONTRACTS_DEFERRABLE" = "1" ]; then', '  if true; then');
  const ignoresMain = lf.replace('    refs/heads/main|refs/heads/master) CONTRACTS_DEFERRABLE=0 ;;\n', '');
  const defersUnknown = lf.replace('[ "$OBJECT_REFS" -gt 0 ] || CONTRACTS_DEFERRABLE=0\n', '');
  for (const mutant of [alwaysDefer, ignoresMain, defersUnknown]) assert.notEqual(mutant, lf);
  const files = ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts'];

  const [deferredRes, runningRes, source, mutant1, mutant2, mutant3] = await Promise.all([
    Promise.all(deferredInputs.map(input => runs(input))),
    Promise.all(runningInputs.map(input => runs(input))),
    runHook(`${line('refs/heads/feature')}\n`, hookSource, { files }),
    runs(`${line('refs/heads/main')}\n`, alwaysDefer),
    runs(`${line('refs/heads/main')}\n`, ignoresMain),
    runs('', defersUnknown),
  ]);
  deferredInputs.forEach((input, index) => assert.equal(deferredRes[index], false, `skipped: ${JSON.stringify(input)}`));
  runningInputs.forEach((input, index) => assert.equal(runningRes[index], true, `runs: ${JSON.stringify(input)}`));
  assertSuccessful(source);
  assert.deepEqual(source.commands, PRE_PUSH_SOURCE_ORDER.filter(command => command !== CONTRACTS));
  assert.match(source.stdout, /PR Required CI\(secret-scan[^)]*\)에서 검증한다/);
  assert.equal(mutant1, false);
  assert.equal(mutant2, false);
  assert.equal(mutant3, false);
});

// [2026-10-24] src/__tests__ 밖에서 저장소 파일을 직접 읽는 시험(원문 계약)은 CI 전체 vitest 에서만 돌아, 그 원문을 바꾸면 CI 에서야
//   붉었다(PR #626·2026-09-16 layout.tsx·PR #969). 프런트 축 push 는 탐지기가 계산한 목록을 불변식 다음에 돌고, 실패·탐지 실패는 막는다.
test('pre-push runs the file-reading contracts outside src/__tests__ on frontend pushes and blocks on their failure', { concurrency: true }, async () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const frontend = ['frontend/src/app/page.tsx'];
  // 실패 처리에서 exit 1 을 걷거나 목록을 고정 사본으로 바꾸면 위 단언이 붉다(red 재현).
  const swallowed = hookSource.replace('(CI frontend-coverage-scope 가 같은 시험을 돕니다)"; exit 1; }', '(CI frontend-coverage-scope 가 같은 시험을 돕니다)"; }');
  assert.notEqual(swallowed, hookSource);
  const pinned = hookSource.replace('FRONTEND_SOURCE_CONTRACTS=$(node scripts/frontend-source-contracts.mjs)', 'FRONTEND_SOURCE_CONTRACTS="src/app/login/__tests__/page.test.tsx"');
  assert.notEqual(pinned, hookSource);

  const nonFrontend = [['docs/README.md'], ['api-server/src/main/java/nuri/api/Example.java']];
  const [ran, docsCmds, backendCmds, failed, undetected, swallowedRes, pinnedRes] = await Promise.all([
    runHook(input, hookSource, { files: frontend }),
    ...nonFrontend.map(files => runHook(input, hookSource, { files })),
    runHook(input, hookSource, { files: frontend, failCommand: SOURCE_CONTRACTS_RUN }),
    runHook(input, hookSource, { files: frontend, failCommand: SOURCE_CONTRACTS_DETECT }),
    runHook(input, swallowed, { files: frontend, failCommand: SOURCE_CONTRACTS_RUN }),
    runHook(input, pinned, { files: frontend }),
  ]);
  assertSuccessful(ran);
  const after = ran.commands.slice(ran.commands.indexOf(INVARIANTS_RUN));
  assert.deepEqual(after.slice(0, 3), [INVARIANTS_RUN, SOURCE_CONTRACTS_DETECT, SOURCE_CONTRACTS_RUN]);
  for (const file of ['src/app/components/layout/__tests__/shell-accessibility-contract.test.ts', 'src/app/__tests__/dashboard-auth-error.test.tsx']) {
    assert.ok(SOURCE_CONTRACT_FILES.includes(file), file);
  }
  [docsCmds, backendCmds].forEach((res, idx) => {
    assert.ok(!res.commands.includes(SOURCE_CONTRACTS_DETECT) && !res.commands.includes(SOURCE_CONTRACTS_RUN), nonFrontend[idx].join(', '));
  });
  assert.notEqual(failed.status, 0);
  assert.equal(failed.commands.at(-1), SOURCE_CONTRACTS_RUN);
  assert.match(failed.stdout, /원문 계약 실패/u);
  assert.notEqual(undetected.status, 0);
  assert.ok(!undetected.commands.includes(SOURCE_CONTRACTS_RUN), '탐지 실패는 빈 목록으로 넘어가지 않고 막는다');
  assert.match(undetected.stdout, /원문 계약 목록을 계산하지 못했습니다/u);
  assert.equal(swallowedRes.status, 0);
  assert.ok(!pinnedRes.commands.includes(SOURCE_CONTRACTS_RUN));
});
