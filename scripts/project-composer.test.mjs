import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createComposerEngine, composerOutputPaths, parseComposerArgs, runComposerCommand } from './project-composer.mjs';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';

const root = resolve(import.meta.dirname, '..');
// 계약 테스트의 생성 출력은 임시 루트에만 둔다. 저장소 build/ 에 engine-contract-* 잔재를 남기지 않는다.
const outputRoot = realpathSync(mkdtempSync(join(tmpdir(), 'composer-engine-contract-')));
test.after(() => rmSync(outputRoot, { recursive: true, force: true }));
const recipe = () => ({ schemaVersion: 1, project: { name: 'engine-contract' }, sourceRef: 'HEAD',
  selection: { domains: ['mail', 'schedule'] }, database: { vendor: 'postgresql' }, backendLayout: 'single-module' });

test('the plan explains degraded integrations by missing feature and lists permissions nobody receives after generation', () => {
  const plan = createComposerEngine().plan(recipe());
  // 메일·일정만 고르면 알림과 주소록이 빠진다. 제목의 조사는 서버가 맞춘다('을(를)' 을 화면에 보내지 않는다).
  assert.deepEqual(plan.degradationNotes.map(group => group.heading), ['알림을 고르지 않아 줄어드는 동작', '주소록을 고르지 않아 줄어드는 동작']);
  assert.deepEqual(plan.degradationNotes.flatMap(group => group.reasons.map(row => `${row.from}>${group.to}`)),
    ['core>notification', 'mail>notification', 'mail>addressbook']);
  assert.ok(plan.degradationNotes.every(group => !/을\(를\)/.test(group.heading)));
  assert.deepEqual(plan.blockers, [], 'degradation never blocks generation');
  assert.deepEqual(plan.unassignedPermissions.map(row => `${row.code}:${row.owner}`), ['ADT_LOG_READ:core', 'DWORK_READ:core', 'DWORK_RETRY:core', 'MFA_RECOVER:core']);
  const recovery = plan.unassignedPermissions.find(row => row.code === 'MFA_RECOVER');
  assert.equal(recovery.protected, true);
  assert.match(recovery.howToAssign, /'계정 복구' 묶음.+보호 권한/);
  assert.equal(plan.unassignedPermissions.find(row => row.code === 'DWORK_RETRY').bundle, null);
  const withBoard = createComposerEngine().plan({ ...recipe(), selection: { domains: ['board'] } });
  assert.deepEqual(withBoard.unassignedPermissions.filter(row => row.owner === 'board').map(row => row.code), ['FAQ_EDIT', 'NOTICE_EDIT']);
});

test('unassigned-permission guidance stays exact with the permission catalog, bundles and protected set', async () => {
  const { PROTECTED_PERMISSIONS } = await import('./generate-screen-registry.mjs');
  const { UNASSIGNED_PERMISSION_GUIDANCE, validateUnassignedGuidance } = await import('./project-composer-unassigned.mjs');
  const permissions = JSON.parse(readFileSync(join(root, 'config/governance/permission-catalog.json'), 'utf8'));
  const bundles = JSON.parse(readFileSync(join(root, 'config/governance/permission-bundles.json'), 'utf8'));
  const rows = validateUnassignedGuidance({ permissions, bundles });
  for (const row of rows) assert.equal(row.protected, PROTECTED_PERMISSIONS.includes(row.code), `${row.code}: protected flag follows the protected set`);
  const withNew = structuredClone(permissions);
  withNew.permissions.push({ code: 'NEW_READ', domain: 'NEW', action: 'READ', name: '새 권한', defaultGroups: [] });
  assert.throws(() => validateUnassignedGuidance({ permissions: withNew, bundles }), /unassigned permission lacks guidance: NEW_READ/);
  const assigned = structuredClone(permissions);
  assigned.permissions.find(row => row.code === 'NOTICE_EDIT').defaultGroups = ['ROLE_ADMIN'];
  assert.throws(() => validateUnassignedGuidance({ permissions: assigned, bundles }), /guidance names a permission with default groups or no catalog row: NOTICE_EDIT/);
  const wrongBundle = { ...UNASSIGNED_PERMISSION_GUIDANCE, ADT_LOG_READ: { ...UNASSIGNED_PERMISSION_GUIDANCE.ADT_LOG_READ, bundle: 'account-recovery' } };
  assert.throws(() => validateUnassignedGuidance({ guidance: wrongBundle, permissions, bundles }), /guidance bundle does not contain the permission: ADT_LOG_READ/);
  const unbundled = { ...UNASSIGNED_PERMISSION_GUIDANCE, ADT_LOG_READ: { ...UNASSIGNED_PERMISSION_GUIDANCE.ADT_LOG_READ, bundle: null } };
  assert.throws(() => validateUnassignedGuidance({ guidance: unbundled, permissions, bundles }), /guidance without a bundle must be an excluded permission: ADT_LOG_READ/);
});

test('UI and CLI use the same side-effect-free plan and reject unsupported or unsafe inputs', () => {
  const engine = createComposerEngine();
  const before = composerOutputPaths(root, 'planning-only', '0123456789abcdef');
  const plan = engine.plan(recipe());
  assert.deepEqual(plan.resolvedDomains, ['mail', 'report', 'schedule']);
  assert.equal(plan.backendLayout, 'single-module');
  assert.ok(plan.menus.length > 0);
  assert.ok(plan.tables.includes('tb_user_info'));
  assert.equal(existsSync(before.jobDirectory), false);
  assert.throws(() => engine.plan({ ...recipe(), sourceRef: 'HEAD~1' }), /source reference/);
  assert.throws(() => engine.plan({ ...recipe(), selection: { domains: ['typo'] } }), /Unknown domain/);
  assert.throws(() => composerOutputPaths(root, '../escape', '0123456789abcdef'), /Invalid/);
  assert.throws(() => composerOutputPaths(root, 'okay', 'not-a-token'), /Invalid/);
  assert.deepEqual(parseComposerArgs(['generate', '--recipe', 'project.json']), { action: 'generate', recipeFile: 'project.json' });
  assert.throws(() => parseComposerArgs(['generate', '--recipe', 'project.json', '--shell', 'unsafe']), /Usage/);
  // 기본 출력 루트는 원본 저장소다. 테스트 이음새가 운영 경로를 바꾸지 않는다.
  assert.equal(engine.outputRoot, realpathSync(root));
});

function runner({ verificationResult = 'passed', wrongOwner = false } = {}) {
  const calls = [];
  let token;
  let staging;
  let composition;
  return {
    calls,
    get staging() { return staging; },
    run: async (command, args, options) => {
      calls.push({ command, args, root: options.root });
      if (command === 'docker') {
        if (args[0] === 'run') { token = args[args.indexOf('--label') + 1].split('=')[1]; return 'a'.repeat(64); }
        if (args[0] === 'inspect') return wrongOwner ? 'someone-else' : token;
        return '';
      }
      if (args[0] === 'scripts/generate-reusable-base-source.mjs') {
        staging = args[args.indexOf('--output') + 1];
        composition = JSON.parse(readFileSync(args[args.indexOf('--composition') + 1], 'utf8'));
        mkdirSync(join(staging, 'build/reports/reusable-base'), { recursive: true });
      }
      if (args[0] === 'scripts/verify-reusable-artifact.mjs') {
        writeFileSync(join(options.root, 'build/reports/reusable-base/full.json'), JSON.stringify({ result: verificationResult,
          sourceCommit: composition.sourceCommit, profile: composition.profile, layout: composition.backendLayout, scope: 'full' }));
      }
      if (command === 'pnpm') {
        const dependency = join(options.root, 'frontend/node_modules/.pnpm/mock-package');
        mkdirSync(dependency, { recursive: true });
        writeFileSync(join(dependency, 'entry.js'), 'verified dependency');
        symlinkSync(dependency, join(options.root, 'frontend/node_modules/mock-package'), 'junction');
      }
      return '';
    },
  };
}

test('generation publishes readiness after verification, keeps absolute dependency junctions valid, and cleans only its own container', async () => {
  const mock = runner();
  const engine = createComposerEngine({ outputRoot, run: mock.run, fingerprint: () => 'a'.repeat(64) });
  const stages = [];
  const work = engine.generate(recipe(), { onProgress: value => stages.push(value.stage) });
  await assert.rejects(() => engine.generate(recipe()), /already running/);
  const result = await work;
  assert.equal(result.verified, true);
  assert.ok(result.projectDirectory.startsWith(join(outputRoot, 'build')));
  assert.equal(existsSync(mock.staging), false);
  assert.equal(existsSync(result.projectDirectory), true);
  assert.equal(JSON.parse(readFileSync(result.reportPath, 'utf8')).result, 'passed');
  assert.equal(readFileSync(join(result.projectDirectory, 'frontend/node_modules/mock-package/entry.js'), 'utf8'), 'verified dependency');
  assert.deepEqual(stages, ['resolve', 'database', 'source', 'install', 'verify', 'complete']);
  const start = mock.calls.find(call => call.command === 'docker' && call.args[0] === 'run');
  assert.ok(!start.args.some(arg => ['--publish', '-p', '--volume', '-v'].includes(arg)));
  assert.ok(start.args.includes('POSTGRES_PASSWORD'));
  assert.equal(mock.calls.at(-1).args[0], 'rm');
});

test('failed validation retains explicit failure evidence and never publishes a ready project', async () => {
  const mock = runner({ verificationResult: 'failed' });
  const engine = createComposerEngine({ outputRoot, run: mock.run, fingerprint: () => 'a'.repeat(64) });
  await assert.rejects(() => engine.generate(recipe()), /verification report is incomplete/);
  assert.equal(existsSync(mock.staging), false);
  const final = mock.staging.replace('.pending-', '');
  assert.equal(existsSync(final), true);
  assert.equal(JSON.parse(readFileSync(join(final, 'project-generation-report.json'), 'utf8')).result, 'failed');
  const reportPath = resolve(outputRoot, 'build/project-composer/jobs', final.split(/[\\/]/).at(-1), 'report.json');
  assert.equal(JSON.parse(readFileSync(reportPath, 'utf8')).result, 'failed');
  assert.equal(mock.calls.at(-1).args[0], 'rm');
});

test('a selection that violates a required foreign key is explained in the plan and refused before any output or Docker', async () => {
  // 실제 카탈로그의 단일 선택은 모두 생성할 수 있다(Phase 0c). 위반 경로는 요구 관계 하나를 지운 합성 카탈로그로 고정한다.
  const loadCatalog = path => {
    const { catalogHash, ...body } = loadProjectComposerCatalog(path);
    body.capabilities.find(capability => capability.id === 'operation').requires = [];
    return { ...body, catalogHash: compositionDigest(body) };
  };
  const blocked = { ...recipe(), project: { name: 'engine-contract-blocked' }, selection: { domains: ['operation'] } };
  const plan = createComposerEngine({ loadCatalog }).plan(blocked);
  assert.equal(plan.blockers.length, 1);
  assert.match(plan.blockers[0], /tb_rward_manage 테이블이 .+의 tb_ifml_atrz_info 테이블을 외래 키로 참조합니다\. .+ 함께 선택해야/);
  assert.deepEqual(createComposerEngine().plan({ ...blocked, selection: { domains: ['survey'] } }).blockers, [],
    'survey alone needs no other domain');
  assert.deepEqual(createComposerEngine({ loadCatalog }).plan(recipe()).blockers, []);
  const mock = runner();
  const engine = createComposerEngine({ outputRoot, run: mock.run, fingerprint: () => 'a'.repeat(64), loadCatalog });
  await assert.rejects(() => engine.generate(blocked), error => error.code === 'FK_CLOSURE');
  assert.deepEqual(mock.calls, []);
  assert.equal(existsSync(join(outputRoot, 'build/project-composer/jobs')) && readdirSync(join(outputRoot, 'build/project-composer/jobs'))
    .some(name => name.startsWith('engine-contract-blocked-')), false);
});

test('cleanup refuses a container whose ownership label differs', async () => {
  const mock = runner({ wrongOwner: true, verificationResult: 'failed' });
  await assert.rejects(() => createComposerEngine({ outputRoot, run: mock.run, fingerprint: () => 'a'.repeat(64) }).generate(recipe()), /ownership changed/);
  assert.ok(!mock.calls.some(call => call.command === 'docker' && call.args[0] === 'rm'));
});

test('a source mutation during generation stops before install, verification or publication', async () => {
  const mock = runner();
  let reads = 0;
  const engine = createComposerEngine({ outputRoot, run: mock.run, fingerprint: () => (++reads === 1 ? 'a' : 'b').repeat(64) });
  await assert.rejects(() => engine.generate(recipe()), /Source checkout changed/);
  assert.ok(!mock.calls.some(call => call.command === 'npm' || call.args[0] === 'scripts/verify-reusable-artifact.mjs'));
  assert.equal(existsSync(mock.staging.replace('.pending-', '')), false);
});

test('child output is kept only as a masked, bounded stage log and the failure names the command and exit code', async () => {
  const directory = mkdtempSync(join(outputRoot, 'masked-log-'));
  // 개인키 블록 표지는 실행 시점에 조립한다. 소스에 연속된 표지가 있으면 비밀 탐지(gitleaks private-key)가 실제 키로 본다.
  const pemMarker = edge => ['-----', edge, ' RSA PRIVATE ', 'KEY-----'].join('');
  const script = join(directory, 'child.mjs');
  const env = { ...process.env, COMPOSER_TEST_TOKEN: 'literal-secret-0123456789' };
  const secrets = ['literal-secret-0123456789', 'hunter2hunter2', 'pa55word-in-url', 'abcdefgh.ijklmnop.qrstuvwx',
    'ghp_' + 'a'.repeat(36), 'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC', 'split-secret-value'];
  writeFileSync(script, [
    "const out = line => process.stdout.write(line + '\\n');",
    `out('connecting with ${secrets[0]} to the database');`,
    `out('DB_PASSWORD=${secrets[1]}');`,
    `out('jdbc url postgresql://admin:${secrets[2]}@localhost:5432/db');`,
    `out('Authorization: Bearer ${secrets[3]}');`,
    `out('npm token ${secrets[4]}');`,
    `out('${pemMarker('BEGIN')}');`,
    `out('${secrets[5]}');`,
    `out('${pemMarker('END')}');`,
    "out('long ' + 'y'.repeat(20000));",
    "process.stderr.write('app.secret=');",
    // process.exit() 는 아직 파이프로 나가지 않은 출력을 버린다(Linux 파이프는 비동기 쓰기). 종료 코드만 정하고 흘려보낸다.
    `setTimeout(() => { process.stderr.write('${secrets[6]} tail\\n'); out('BUILD FAILED in 3s'); process.exitCode = 7; }, 50);`,
  ].join('\n'));
  const log = join(directory, 'logs', 'verify.log');
  await assert.rejects(() => runComposerCommand('node', [script], { root: directory, env, log }), error => {
    assert.equal(error.code, 'COMMAND_FAILED');
    assert.equal(error.exitCode, 7);
    assert.equal(error.log, log);
    assert.ok(Number.isInteger(error.durationMs));
    return true;
  });
  const text = readFileSync(log, 'utf8');
  for (const secret of secrets) assert.equal(text.includes(secret), false, `secret leaked: ${secret}`);
  assert.match(text, /DB_PASSWORD=\*\*\*/);
  assert.match(text, /postgresql:\/\/\*\*\*:\*\*\*@localhost/);
  assert.match(text, /Bearer \*\*\*/);
  assert.match(text, /\[가린 개인키\]/);
  assert.match(text, /app\.secret=\*\*\* tail/, 'a secret split across writes is masked as one line');
  assert.match(text, /BUILD FAILED in 3s/);
  assert.match(text, /…\(줄 잘림\)/);
  assert.doesNotMatch(text, /줄 생략/, 'a short log keeps every line');
  assert.match(text, /\[종료 코드 7 · \d+ms · 가림 \d+건\]/);
  // 같은 단계의 다음 명령은 같은 로그 뒤에 붙는다.
  await runComposerCommand('node', ['-e', "console.log('second command')"], { root: directory, env, log });
  assert.match(readFileSync(log, 'utf8'), /second command\n\[종료 코드 0/);
});

test('a flooding command keeps only a bounded tail of its stage log', async () => {
  // 가림 검사와 나눈다. 두 파이프(stdout·stderr)는 도착 순서가 보장되지 않아, 한 실행에서 섞으면
  // 끝부분 보존 규칙이 어느 줄을 남길지 운영체제마다 달라진다(Linux CI 실측).
  const directory = mkdtempSync(join(outputRoot, 'bounded-log-'));
  const script = join(directory, 'flood.mjs');
  writeFileSync(script, [
    "const out = line => process.stdout.write(line + '\\n');",
    "for (let index = 0; index < 20000; index += 1) out('noise ' + index + ' ' + 'x'.repeat(60));",
    "out('last line');",
  ].join('\n'));
  const log = join(directory, 'logs', 'install.log');
  await runComposerCommand('node', [script], { root: directory, log });
  const text = readFileSync(log, 'utf8');
  assert.match(text, /^…앞 \d+줄 생략/m, 'the head is dropped and the tail is kept');
  assert.doesNotMatch(text, /^noise 0 /m);
  assert.match(text, /^last line\n\[종료 코드 0 /m);
  assert.ok(Buffer.byteLength(text) < 1024 * 1024 + 64 * 1024, 'the stage log stays bounded');
});

test('a failed command records its stage, command, exit code and stage log without claiming a missing verification report', async () => {
  const mock = runner();
  const logs = [];
  const run = async (command, args, options) => {
    if (options.log) logs.push(options.log);
    if (command === 'pnpm') {
      throw Object.assign(new Error('Command failed: pnpm (COMMAND_FAILED 1)'), { code: 'COMMAND_FAILED', commandId: 'pnpm', exitCode: 1,
        durationMs: 5, log: options.log });
    }
    return mock.run(command, args, options);
  };
  const engine = createComposerEngine({ outputRoot, run, fingerprint: () => 'a'.repeat(64) });
  const failed = await engine.generate(recipe()).then(() => assert.fail('generation must fail'), error => error);
  const job = resolve(outputRoot, 'build/project-composer/jobs', mock.staging.replace('.pending-', '').split(/[\\/]/).at(-1));
  const installLog = join(job, 'logs', 'install.log');
  assert.deepEqual(failed.failure, { stage: 'install', code: 'COMMAND_FAILED', commandId: 'pnpm', exitCode: 1, durationMs: 5, log: installLog });
  const report = JSON.parse(readFileSync(join(job, 'report.json'), 'utf8'));
  assert.deepEqual({ ...report.failure, message: undefined }, { ...failed.failure, message: undefined });
  assert.equal(report.failure.verificationReport, undefined, 'the verification report does not exist before the verify stage');
  assert.deepEqual([...new Set(logs.map(path => path.split(/[\\/]/).at(-1)))], ['database.log', 'source.log', 'install.log']);
  assert.ok(logs.every(path => path.startsWith(join(job, 'logs'))));
});
