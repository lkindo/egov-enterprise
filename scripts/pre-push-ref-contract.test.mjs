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
  assert.deepEqual(result.npmCalls, ['run test:operational-contracts']);
  const diffCalls = result.gitCalls.filter((call) => call.startsWith('diff '));
  assert.equal(diffCalls.length, 1);
  assert.match(diffCalls[0], new RegExp(`${REMOTE_OID}\\.\\.${LOCAL_OID}$`, 'u'));
  assert.doesNotMatch(diffCalls[0], new RegExp(ZERO_OID, 'u'));
});

test('empty stdin and a new ref retain their fail-closed verification paths', () => {
  const emptyInput = runHook('');
  assertSuccessful(emptyInput);
  assert.deepEqual(emptyInput.npmCalls, ['run test:operational-contracts']);
  assert.ok(emptyInput.gitCalls.some((call) => call.includes('origin/main..HEAD')));

  const newRef = runHook(
    `${pushLine('refs/heads/new-branch', LOCAL_OID, 'refs/heads/new-branch', ZERO_OID)}\n`,
  );
  assertSuccessful(newRef);
  assert.deepEqual(newRef.npmCalls, ['run test:operational-contracts']);
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

function observeVerification(scope, { source, failCommand, env = {} } = {}) {
  const commands = [];
  const exits = [];
  const zones = [];
  const runner = source ?? readFileSync(path.join(repoRoot, 'scripts/verify.mjs'), 'utf8');
  runInNewContext(runner.replace(/^import [^\r\n]+ from 'node:[^']+';\r?$/gm, ''), {
    execSync: (command, options) => {
      commands.push(command);
      zones.push(options?.env?.TZ);
      if (command === failCommand) throw new Error('deliberate verification failure');
    },
    platform: () => 'linux',
    randomBytes: () => ({ toString: () => 'fixture-only' }),
    process: { argv: ['node', 'scripts/verify.mjs', scope], env, exit: code => exits.push(code) },
    console: { log() {}, error() {} },
  }, { timeout: 1000 });
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

// [2026-10-17] 실패가 잦고 짧은 정적 검사(컴파일·codegen·타입·lint·폼 census)가 운영 계약(로컬 약 11분)보다 먼저 돈다.
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
const VERIFY_FAST = ['./gradlew compileJava compileTestJava -Dfile.encoding=UTF-8', ...VERIFY_STATIC, CONTRACTS, 'pnpm -C frontend exec vitest run src/__tests__'];

test('verify profiles run static checks before the operational contracts and stop on their failure', () => {
  const expected = {
    docs: [CONTRACTS, atlasCommand],
    fast: VERIFY_FAST,
    push: [...VERIFY_FAST, './gradlew :api-server:harnessTest -Dfile.encoding=UTF-8'],
    be: [CONTRACTS, VERIFY_BACKEND_SUITE, crossStackCommand],
    fe: [...VERIFY_STATIC, CONTRACTS, ...VERIFY_PACKAGING],
    full: [...VERIFY_STATIC, CONTRACTS, VERIFY_BACKEND_SUITE, ...VERIFY_PACKAGING],
    e2e: ['pnpm -C frontend run type-check:e2e', CONTRACTS, 'node scripts/run-isolated-e2e.mjs'],
  };
  for (const [scope, commands] of Object.entries(expected)) {
    assert.deepEqual(observeVerification(scope).commands, commands, scope);
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

const PRE_PUSH_SOURCE_ORDER = [
  'gradlew compileJava compileTestJava -q',
  'npx tsc --noEmit',
  'npx tsc -p tsconfig.e2e.json --noEmit',
  'pnpm run codegen:verify',
  'pnpm run codegen:verify:zod',
  'pnpm run lint',
  'pnpm run test:form-validation',
  CONTRACTS,
  'npx vitest run src/__tests__',
  'gradlew :api-server:harnessTest -q',
];

test('pre-push runs static checks before the operational contracts and stops on their failure', () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const files = ['api-server/src/main/java/nuri/api/Example.java', 'frontend/src/example.ts'];
  const both = runHook(input, hookSource, { files });
  assertSuccessful(both);
  assert.deepEqual(both.commands, PRE_PUSH_SOURCE_ORDER);
  const backendOnly = runHook(input, hookSource, { files: [files[0]] });
  assertSuccessful(backendOnly);
  assert.deepEqual(backendOnly.commands,
    ['gradlew compileJava compileTestJava -q', CONTRACTS, 'npx vitest run src/__tests__/cross-stack', 'gradlew :api-server:harnessTest -q']);
  for (const failCommand of ['gradlew compileJava compileTestJava -q', 'npx tsc --noEmit']) {
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

test('pre-push selects one Atlas owner and keeps its failure blocking in every scope', () => {
  const input = `${pushLine('refs/heads/main', LOCAL_OID, 'refs/heads/main', REMOTE_OID)}\n`;
  const atlas = 'frontend/public/governance_harness_atlas.html';
  const cases = [
    { files: [atlas], command: atlasCommand },
    { files: [atlas, 'api-server/src/test/java/ExampleTest.java'], command: 'npx vitest run src/__tests__/cross-stack' },
    { files: [atlas, 'frontend/src/example.ts'], command: 'npx vitest run src/__tests__' },
    { files: [atlas, 'unclassified/new-tool.mjs'], command: 'npx vitest run src/__tests__' },
  ];
  for (const { files, command } of cases) {
    const result = runHook(input, hookSource, { files });
    assertSuccessful(result);
    assert.deepEqual(result.commands.filter(value => value.includes('vitest')), [command], files.join(', '));
    assert.equal(result.commands.filter(value => value === 'npm run test:operational-contracts').length, 1);
    assert.notEqual(runHook(input, hookSource, { files, failCommand: command }).status, 0,
      `${command} failure must block the push`);
  }
});
