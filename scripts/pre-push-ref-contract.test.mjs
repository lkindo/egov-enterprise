import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { GENERATORS } from './merge-main-regenerate.mjs';

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

function instrumentHook(source) {
  const stubs = `
git() {
  printf '%s\\n' "$*" >> "$HOOK_GIT_LOG"
  if [ "$1" = "diff" ]; then
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
test_gradle() { record_command "gradlew $*"; }
`;
  return source.replaceAll('./gradlew ', 'test_gradle ').replace('#!/bin/sh', `#!/bin/sh${stubs}`);
}

function runHook(input, source = hookSource, { files = ['docs/README.md'], failCommand = '' } = {}) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), 'pre-push-ref-contract-'));
  const gitLog = path.join(fixtureRoot, 'git.log');
  const npmLog = path.join(fixtureRoot, 'npm.log');
  const commandLog = path.join(fixtureRoot, 'commands.log');
  const fixtureHook = path.join(fixtureRoot, 'pre-push');
  writeFileSync(fixtureHook, instrumentHook(source), 'utf8');

  const result = spawnSync(shell, [shellPath(fixtureHook)], {
    cwd: repoRoot,
    input,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOOK_GIT_LOG: shellPath(gitLog),
      HOOK_NPM_LOG: shellPath(npmLog),
      HOOK_COMMAND_LOG: shellPath(commandLog),
      HOOK_CHANGED_FILES: files.join('\n'),
      HOOK_FAIL_COMMAND: failCommand,
      SKIP_HOOKS: '',
      SKIP_HARNESS: '',
    },
  });

  const output = {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    gitCalls: existsSync(gitLog) ? readFileSync(gitLog, 'utf8').trim().split(/\r?\n/u) : [],
    npmCalls: existsSync(npmLog) ? readFileSync(npmLog, 'utf8').trim().split(/\r?\n/u) : [],
    commands: existsSync(commandLog) ? readFileSync(commandLog, 'utf8').trim().split(/\r?\n/u) : [],
  };
  rmSync(fixtureRoot, { recursive: true, force: true });
  return output;
}

function assertSuccessful(result) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

test('branch and tag deletion-only pushes skip every local verification command', () => {
  const fixtures = [
    `${pushLine('(delete)', ZERO_OID, 'refs/heads/old-branch', REMOTE_OID)}\n`,
    `${pushLine('(delete)', ZERO_OID, 'refs/tags/old-tag', REMOTE_OID)}\n`,
    [
      pushLine('(delete)', ZERO_OID, 'refs/heads/old-branch', REMOTE_OID),
      pushLine('(delete)', ZERO_OID, 'refs/tags/old-tag', LOCAL_OID),
    ].join('\n') + '\n',
  ];

  for (const input of fixtures) {
    const result = runHook(input);
    assertSuccessful(result);
    assert.match(result.stdout, /branch\/tag 삭제만 감지됨/u);
    assert.deepEqual(result.gitCalls, []);
    assert.deepEqual(result.npmCalls, []);
  }
});

test('mixed deletion and update verifies only the object-bearing update range', () => {
  const result = runHook([
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

test('empty stdin and a new ref retain their fail-closed verification paths', () => {
  const emptyInput = runHook('');
  assertSuccessful(emptyInput);
  assert.deepEqual(emptyInput.npmCalls, ['run regen -- --check', 'run test:operational-contracts']);
  assert.ok(emptyInput.gitCalls.some((call) => call.includes('origin/main..HEAD')));

  const newRef = runHook(
    `${pushLine('refs/heads/new-branch', LOCAL_OID, 'refs/heads/new-branch', ZERO_OID)}\n`,
  );
  assertSuccessful(newRef);
  assert.deepEqual(newRef.npmCalls, ['run regen -- --check', 'run test:operational-contracts']);
  assert.ok(newRef.gitCalls.some((call) => call.includes(`origin/main..${LOCAL_OID}`)));
});

test('the contract exposes deletion-condition regressions as reproducible red outcomes', () => {
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
  assert.notDeepEqual(runHook(deletion, remoteOidMutant).npmCalls, []);

  const anyDeletionMutant = hookSource.replace(
    'if [ "$DELETION_REFS" -gt 0 ] && [ "$OBJECT_REFS" -eq 0 ]; then',
    'if [ "$DELETION_REFS" -gt 0 ]; then',
  );
  assert.notEqual(anyDeletionMutant, hookSource);
  assert.deepEqual(runHook(mixed, anyDeletionMutant).npmCalls, []);
});

const atlasCommand = 'pnpm -C frontend exec vitest run src/__tests__/cross-stack/governance-atlas-contract.test.ts';
const crossStackCommand = 'pnpm -C frontend exec vitest run src/__tests__/cross-stack';

// process.exit 는 실제처럼 실행을 멈춘다 — 기록만 하고 계속 돌면 분기 앞 조기 종료 뒤에도 명령 목록이 그대로라 놓친다.
const EXIT_SIGNAL = Symbol('process.exit');

function observeVerification(scope, { source, failCommand, env = {} } = {}) {
  const commands = [];
  const exits = [];
  const zones = [];
  const runner = source ?? readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  try {
    runInNewContext(runner.replace(/^import [^\r\n]+ from 'node:[^']+';\r?$/gm, ''), {
      execSync: (command, options) => {
        commands.push(command);
        zones.push(options?.env?.TZ);
        if (command === failCommand) throw new Error('deliberate verification failure');
      },
      platform: () => 'linux',
      randomBytes: () => ({ toString: () => 'fixture-only' }),
      process: {
        argv: ['node', 'scripts/verify.mjs', scope],
        env,
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
    docs: [atlasCommand],
    fast: ['pnpm -C frontend exec vitest run src/__tests__'],
    push: ['pnpm -C frontend exec vitest run src/__tests__'],
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
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  const missingCoverage = runner.replace("run('pnpm -C frontend run test:coverage');", '');
  assert.notEqual(missingCoverage, runner);
  assert.deepEqual(observeVerification('full', { source: missingCoverage }).commands.filter(command => /vitest|test:coverage/.test(command)), [],
    'removing the sole coverage owner must lose the expected population');
});

// [2026-10-17] 실패가 잦고 짧은 정적 검사(codegen·타입·lint·폼 census, fast·push·pre-push 는 Java 컴파일 포함)가
//   운영 계약(로컬 약 11분)보다 먼저 돈다. full·be 의 Java 컴파일은 backend 전수 lane(gradle 한 줄) 안에서 계약 뒤에 돌고,
//   be·docs 는 계약이 먼저다. 운영 계약은 그것을 부르는 범위에서 한 번 돌고 ops·migration 은 부르지 않는다.
//   명령 집합과 인자는 그대로이고 순서만 바뀐다 — 성공하면 모두 실행되고, 정적 검사가 실패하면 계약을 기다리지 않는다.
const CONTRACTS = 'npm run test:operational-contracts';
const VERIFY_STATIC = [
  'pnpm -C frontend run codegen:verify',
  'pnpm -C frontend run codegen:verify:zod',
  'pnpm -C frontend exec tsc --noEmit',
  'pnpm -C frontend run type-check:e2e',
  'pnpm -C frontend run lint',
  'pnpm -C frontend run test:form-validation',
];
const VERIFY_BACKEND_SUITE = './gradlew compileJava compileTestJava test :api-server:harnessTest :foundation:check jacocoRootCoverageVerification :api-server:schemaValidationTest --warning-mode fail --console=plain -Dfile.encoding=UTF-8';
const VERIFY_PACKAGING = ['pnpm -C frontend build', 'pnpm -C frontend run bundle:check', 'pnpm -C frontend run test:coverage'];
// [2026-10-20] CodeQL 근사(scripts/sast-approximation.mjs, 수 초)는 fast·push·full 의 맨 앞이다 — 가장 싼 정적 검사다.
const SAST_APPROXIMATION = 'npm run sast:approx';
const VERIFY_FAST = [SAST_APPROXIMATION, './gradlew compileJava compileTestJava -Dfile.encoding=UTF-8', ...VERIFY_STATIC, CONTRACTS, 'pnpm -C frontend exec vitest run src/__tests__'];
// 갈래 통합 뒤 푸시 전 점검(오케스트레이션 프로토콜 §6.4): Flyway 충돌 → regen → 폼 census·전체 시험·하네스 → 선별 E2E. 운영 계약은 부르지 않는다.
const INTEGRATION_PRECHECK = 'node scripts/integration-precheck.mjs';
const INTEGRATION_FORMS = 'pnpm -C frontend run test:form-validation';
const INTEGRATION_BACKEND = './gradlew :api-server:test :api-server:harnessTest --console=plain -Dfile.encoding=UTF-8';
const VERIFY_INTEGRATE = [INTEGRATION_PRECHECK, 'npm run regen', INTEGRATION_FORMS, 'pnpm -C frontend exec vitest run',
  INTEGRATION_BACKEND, 'node scripts/integration-precheck.mjs --run-selected'];

test('verify profiles run static checks before the operational contracts and stop on their failure', () => {
  const expected = {
    docs: [CONTRACTS, atlasCommand],
    fast: VERIFY_FAST,
    push: [...VERIFY_FAST, './gradlew :api-server:harnessTest -Dfile.encoding=UTF-8'],
    be: [CONTRACTS, VERIFY_BACKEND_SUITE, crossStackCommand],
    fe: [...VERIFY_STATIC, CONTRACTS, ...VERIFY_PACKAGING],
    full: [SAST_APPROXIMATION, ...VERIFY_STATIC, CONTRACTS, VERIFY_BACKEND_SUITE, ...VERIFY_PACKAGING],
    e2e: ['pnpm -C frontend run type-check:e2e', CONTRACTS, 'node scripts/run-isolated-e2e.mjs'],
    integrate: VERIFY_INTEGRATE,
  };
  for (const [scope, commands] of Object.entries(expected)) {
    const observed = observeVerification(scope);
    assert.deepEqual(observed.commands, commands, scope);
    assert.deepEqual(observed.exits, [], `${scope}: the success path must not exit early`);
  }
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
  const typeCheck = 'pnpm -C frontend exec tsc --noEmit';
  for (const scope of ['fast', 'push', 'fe', 'full']) {
    const failed = observeVerification(scope, { failCommand: typeCheck });
    assert.deepEqual(failed.exits, [1], scope);
    assert.equal(failed.commands.at(-1), typeCheck, scope);
    assert.ok(!failed.commands.includes(CONTRACTS), `${scope}: a type error must not wait for the operational contracts`);
  }
  // 계약을 정적 검사 앞으로 되돌리면 타입 오류에서도 계약을 먼저 기다린다 — 위 단언이 그것을 잡는다(red 재현).
  const runner = readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const contractsFirst = runner.replace("  } else if (scope === 'fe') {\n    runFrontendStatic();\n    runOperationalContracts();\n",
    "  } else if (scope === 'fe') {\n    runOperationalContracts();\n    runFrontendStatic();\n");
  assert.notEqual(contractsFirst, runner);
  assert.ok(observeVerification('fe', { source: contractsFirst, failCommand: typeCheck }).commands.includes(CONTRACTS));
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

test('integration runs the form census and full harness before selected E2E, and propagates their failures', () => {
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

// 생성물 신선도(npm run regen -- --check)는 문서·소스 두 경로 모두 맨 앞이다 — 운영 계약이 다시 보는 검사를 앞당길 뿐이다.
const REGEN_CHECK = 'npm run regen -- --check';
// [2026-10-20] 소스 경로는 생성물 신선도 다음에 CodeQL 근사를 push 가 바꾼 파일에만 돈다(문서 전용 경로에는 JS·TS 가 없다).
const SAST_APPROXIMATION_HOOK = 'npm run sast:approx -- --stdin';
const PRE_PUSH_SOURCE_ORDER = [
  REGEN_CHECK,
  SAST_APPROXIMATION_HOOK,
  'gradlew compileJava compileTestJava -q',
  'npx tsc --noEmit',
  'npx tsc -p tsconfig.e2e.json --noEmit',
  'pnpm run lint',
  'pnpm run test:form-validation',
  CONTRACTS,
  'npx vitest run src/__tests__',
  'gradlew :api-server:harnessTest -q',
];

// 계약 드리프트(api-docs.json ↔ 생성 타입·zod·operations)는 맨 앞의 regen --check 가 본다. 그 생성 계약 검사는 프런트
// codegen:verify·codegen:verify:zod 와 같은 스크립트·인자라, 프런트 단계에서 다시 돌리면 한 push 안에서 같은 명령·입력이 두 번 돈다.
// 그 전제(같은 검증기)와 훅이 계약 드리프트를 한 번만 보는지를 함께 고정한다. 검사기가 갈라지면 이 시험이 붉어 중복 제거를 다시 판단한다.
test('pre-push checks contract drift once, through the regen check that runs the frontend codegen verifier', () => {
  const sync = GENERATORS.find(generator => generator.id === 'sync-contract');
  assert.deepEqual(sync.check, [['node', ['scripts/verify-generated-contracts.mjs', 'api']], ['node', ['scripts/verify-generated-contracts.mjs', 'zod']]],
    'the regen check must run the contract verifier for both api and zod');
  const scripts = JSON.parse(readFileSync(path.join(repoRoot, 'frontend', 'package.json'), 'utf8')).scripts;
  assert.equal(scripts['codegen:verify'], 'node ../scripts/verify-generated-contracts.mjs api');
  assert.equal(scripts['codegen:verify:zod'], 'node ../scripts/verify-generated-contracts.mjs zod');
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const drift = command => runHook(input, hookSource, { files: ['frontend/src/example.ts'], failCommand: command });
  const commands = runHook(input, hookSource, { files: ['frontend/src/example.ts'] }).commands;
  assert.deepEqual(commands.filter(command => command === REGEN_CHECK || /codegen:verify/.test(command)), [REGEN_CHECK]);
  // 낡은 생성 계약은 regen --check 에서 멈춘다(그 뒤 아무것도 돌지 않는다).
  assert.deepEqual(drift(REGEN_CHECK).commands, [REGEN_CHECK]);
  assert.notEqual(drift(REGEN_CHECK).status, 0);
  // 프런트 단계에 다시 넣으면 같은 검사가 두 번 돈다 — 위 단언과 PRE_PUSH_SOURCE_ORDER 가 그것을 잡는다(red 재현).
  const doubled = hookSource.replace(/(\r?\n)( {2}# ESLint error는)/u, '$1  ( cd frontend && pnpm run codegen:verify && pnpm run codegen:verify:zod ) || exit 1$1$2');
  assert.notEqual(doubled, hookSource);
  assert.ok(runHook(input, doubled, { files: ['frontend/src/example.ts'] }).commands.includes('pnpm run codegen:verify'));
});

test('pre-push runs static checks before the operational contracts and stops on their failure', () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const files = ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts'];
  const both = runHook(input, hookSource, { files });
  assertSuccessful(both);
  assert.deepEqual(both.commands, PRE_PUSH_SOURCE_ORDER);
  const backendOnly = runHook(input, hookSource, { files: [files[0]] });
  assertSuccessful(backendOnly);
  assert.deepEqual(backendOnly.commands,
    [REGEN_CHECK, SAST_APPROXIMATION_HOOK, 'gradlew compileJava compileTestJava -q', CONTRACTS, 'npx vitest run src/__tests__/cross-stack', 'gradlew :api-server:harnessTest -q']);
  for (const failCommand of [SAST_APPROXIMATION_HOOK, 'gradlew compileJava compileTestJava -q', 'npx tsc --noEmit']) {
    const failed = runHook(input, hookSource, { files, failCommand });
    assert.notEqual(failed.status, 0, failCommand);
    assert.equal(failed.commands.at(-1), failCommand);
    assert.ok(!failed.commands.includes(CONTRACTS), `${failCommand} failure must not wait for the operational contracts`);
  }
  // 계약 호출을 정적 검사 앞으로 옮긴 훅은 타입 오류에서도 계약을 먼저 부른다 — 위 단언이 그것을 잡는다(red 재현).
  const contractsFirst = hookSource
    .replace('echo "[pre-push] AGENTS.md change-scoped source verification"', 'run_operational_contracts\necho "[pre-push] AGENTS.md change-scoped source verification"')
    .replace(/# 정적 검사를 모두 통과한 뒤에 비싼 운영 계약을 돌린다\.\r?\nrun_operational_contracts\r?\n/u, '');
  assert.notEqual(contractsFirst, hookSource);
  assert.ok(runHook(input, contractsFirst, { files, failCommand: 'npx tsc --noEmit' }).commands.includes(CONTRACTS));
});

test('pre-push blocks a CodeQL approximation finding before compilation, only on the source path', () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const files = ['scripts/example.mjs'];
  const blocked = runHook(input, hookSource, { files, failCommand: SAST_APPROXIMATION_HOOK });
  assert.notEqual(blocked.status, 0);
  assert.deepEqual(blocked.commands, [REGEN_CHECK, SAST_APPROXIMATION_HOOK], '근사 위반은 컴파일·운영 계약을 기다리지 않고 막는다');
  assert.ok(!runHook(input, hookSource, { files: ['docs/README.md'] }).commands.includes(SAST_APPROXIMATION_HOOK), '문서 전용 push 에는 JS·TS 가 없다');
  // 근사는 push 가 바꾼 파일을 표준 입력으로 받는다 — 범위 밖 파일까지 보거나 아무것도 보지 않게 바뀌면 이 줄이 사라진다.
  assert.match(hookSource, /^printf '%s\\n' "\$CHANGED_FILES" \| npm run sast:approx -- --stdin \\\r?$/mu);
  // 실패 처리에서 exit 1 을 걷으면 근사 위반으로도 push 가 지나간다 — 위 단언이 그것을 잡는다(red 재현).
  const swallowed = hookSource.replace('(근사를 이유로 CodeQL 예외 원장을 늘리지 않습니다)"; exit 1; }', '(근사를 이유로 CodeQL 예외 원장을 늘리지 않습니다)"; }');
  assert.notEqual(swallowed, hookSource);
  assert.equal(runHook(input, swallowed, { files, failCommand: SAST_APPROXIMATION_HOOK }).status, 0);
});

test('pre-push checks generated freshness first and stops before compilation and the operational contracts', () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const paths = [['docs/README.md'], ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts']];
  const stops = source => paths.map(files => {
    const failed = runHook(input, source, { files, failCommand: REGEN_CHECK });
    return { status: failed.status === 0 ? 0 : 'blocked', commands: failed.commands };
  });
  assert.deepEqual(stops(hookSource), paths.map(() => ({ status: 'blocked', commands: [REGEN_CHECK] })),
    '낡은 생성물은 컴파일·운영 계약을 기다리지 않고 바로 막는다');
  // 실패 처리에서 exit 1 을 걷으면 낡은 생성물로도 다음 단계로 넘어가고, 검사를 정적 검사 뒤로 옮기면 컴파일을 먼저 기다린다 — 위 단언이 둘 다 잡는다(red 재현).
  const swallowed = hookSource.replace("함께 커밋하세요(SAST 예외는 위 안내대로 재검토 뒤 결속)\"; exit 1; }", "함께 커밋하세요(SAST 예외는 위 안내대로 재검토 뒤 결속)\"; }");
  const regenBlock = /# 생성물·해시 결속이 낡았는지 맨 앞에서 본다[\s\S]*?exit 1; \}\n\n/u;
  const block = hookSource.replace(/\r\n/g, '\n').match(regenBlock)?.[0];
  assert.ok(block, 'pre-push 의 생성물 신선도 블록을 찾지 못했다');
  const moved = hookSource.replace(/\r\n/g, '\n').replace(block, '')
    .replace('# 정적 검사를 모두 통과한 뒤에 비싼 운영 계약을 돌린다.\n', `${block}# 정적 검사를 모두 통과한 뒤에 비싼 운영 계약을 돌린다.\n`);
  for (const mutant of [swallowed, moved]) {
    assert.notEqual(mutant, hookSource);
    assert.notDeepEqual(stops(mutant), paths.map(() => ({ status: 'blocked', commands: [REGEN_CHECK] })));
  }
});

test('pre-push blocks the push when the operational contracts fail on the documentation and source paths', () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const sourceFiles = ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts'];
  const cases = [
    { files: ['docs/README.md'], commands: [REGEN_CHECK, CONTRACTS] },
    { files: ['frontend/public/governance_harness_atlas.html'], commands: [REGEN_CHECK, CONTRACTS] },
    { files: sourceFiles, commands: PRE_PUSH_SOURCE_ORDER.slice(0, PRE_PUSH_SOURCE_ORDER.indexOf(CONTRACTS) + 1) },
  ];
  const blocks = (source) => cases.map(({ files }) => {
    const failed = runHook(input, source, { files, failCommand: CONTRACTS });
    return { status: failed.status === 0 ? 0 : 'blocked', commands: failed.commands };
  });
  assert.deepEqual(blocks(hookSource), cases.map(({ commands }) => ({ status: 'blocked', commands })));
  // 실패 처리에서 exit 1 을 걷으면 문서 경로는 fast-pass 로, 소스 경로는 다음 단계로 넘어간다 — 위 단언이 그것을 잡는다(red 재현).
  const swallowed = hookSource.replace('실행 경로가 불일치합니다"; exit 1; }', '실행 경로가 불일치합니다"; }');
  assert.notEqual(swallowed, hookSource);
  assert.ok(blocks(swallowed).every(({ status }) => status === 0));
});

test('pre-push selects one Atlas owner and keeps its failure blocking in every scope', () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const atlas = 'frontend/public/governance_harness_atlas.html';
  const cases = [
    { files: [atlas], command: atlasCommand },
    { files: [atlas, 'api-server/src/test/java/ExampleTest.java'], command: 'npx vitest run src/__tests__/cross-stack' },
    { files: [atlas, 'frontend/src/example.ts'], command: 'npx vitest run src/__tests__' },
    { files: [atlas, 'unclassified/new-tool.mjs'], command: 'npx vitest run src/__tests__' },
    // 독립 이관만 함께 바뀌면 frontend·cross-stack 실행이 없어 소스 경로의 단독 Atlas 실행이 유일한 owner 다.
    { files: [atlas, 'migration-tool/src/main/java/X.java'], command: atlasCommand },
  ];
  for (const { files, command } of cases) {
    const result = runHook(input, hookSource, { files });
    assertSuccessful(result);
    assert.deepEqual(result.commands.filter(value => value.includes('vitest')), [command], files.join(', '));
    assert.equal(result.commands.filter(value => value === 'npm run test:operational-contracts').length, 1);
    assert.notEqual(runHook(input, hookSource, { files, failCommand: command }).status, 0,
      `${command} failure must block the push`);
  }
  // 이관 범위에서도 Atlas 를 생략하거나 소스 경로의 단독 실행을 걷으면 이관+Atlas push 에서 Atlas 가 돌지 않는다 — 위 단언이 잡는다(red 재현).
  const migrationAtlas = [atlas, 'migration-tool/src/main/java/X.java'];
  const skippedForMigration = hookSource.replace('[ "$SCOPE_FRONTEND" = "true" ]; }; then', '[ "$SCOPE_FRONTEND" = "true" ] || [ "$SCOPE_MIGRATION" = "true" ]; }; then');
  const sourcePathOwnerRemoved = hookSource.replace(/(# 정적 검사를 모두 통과한 뒤에 비싼 운영 계약을 돌린다\.\r?\nrun_operational_contracts\r?\n)run_atlas_contract\r?\n/u, '$1');
  for (const mutant of [skippedForMigration, sourcePathOwnerRemoved]) {
    assert.notEqual(mutant, hookSource);
    assert.deepEqual(runHook(input, mutant, { files: migrationAtlas }).commands.filter(value => value.includes('vitest')), []);
  }
});
