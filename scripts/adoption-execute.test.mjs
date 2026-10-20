import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { containedFile, containedFileResolver } from './adoption-review.mjs';
import { executeAdoption, executionPlan } from './adoption-execute.mjs';
import { adoptionExecutionFixture as fixture } from './adoption-execute-fixtures.mjs';

// Independent migration inputs, approvals and file boundaries also run in the exported CLI product.
// Producer-only online and reusable-layout cases live in adoption-execute-products.test.mjs.

test('default check verifies the technical scope and never launches the migration process', (t) => {
  const { root, path } = fixture(t);
  const calls = [];
  const result = executeAdoption({ root, path, environmentId: 'fixture-env', run: (cmd, args) => calls.push([cmd, args]) });
  assert.deepEqual(calls, [['node', ['scripts/verify.mjs', 'migration']]]);
  assert.equal(result.executed, false);
  assert.equal(result.liveEnvironmentCertified, false);
  const execution = executionPlan(root, path, 'fixture-env');
  assert.equal(execution.command, 'java');
  assert.ok(execution.args.includes('--command=load'));
  assert.ok(execution.args.includes('--mode=dry-run'));
  assert.ok(execution.args.includes('--ack-source-freeze'));
});

test('only explicit execution after technical verification reaches the existing load entry point', (t) => {
  const { root, path } = fixture(t);
  const calls = [];
  const result = executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
    run: (cmd, args) => calls.push([cmd, args]) });
  assert.equal(result.executed, true);
  assert.deepEqual(calls.map(([cmd]) => cmd), ['node', 'java']);
  assert.equal(calls[1][1][2], '--command=load');
});

test('standalone migration approval binds the composition profile verifier source', t => {
  // 생성물이 아닌 이관 승인도 구성 이름 판정을 범위에 묶는다(트랙 C 검토 #1).
  const { root, path, write } = fixture(t);
  write('scripts/composition-profiles.mjs', `${readFileSync(join(root, 'scripts/composition-profiles.mjs'), 'utf8')}\nchanged`);
  assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
    run: () => assert.fail('unreviewed composition profiles may not run') }), /scope digest mismatch/);
});

test('the control schema upgrade acknowledgement is an optional reviewed boolean that only a commit load forwards', (t) => {
  // [ADR-0029 L3c] 이미 있는 제어 스키마를 올리는 확인 — 생략하면 넘기지 않고, true 는 commit 에서만 넘긴다.
  const { root, path, plan, approve } = fixture(t);
  assert.ok(!executionPlan(root, path, 'fixture-env').args.includes('--ack-control-schema-upgrade'));
  approve({ ...plan, migration: { ...plan.migration, mode: 'commit', ackControlSchemaUpgrade: true } });
  const commit = executionPlan(root, path, 'fixture-env');
  assert.ok(commit.args.includes('--mode=commit'));
  assert.equal(commit.args.at(-1), '--ack-control-schema-upgrade');
  approve({ ...plan, migration: { ...plan.migration, mode: 'commit', ackControlSchemaUpgrade: false } });
  assert.ok(!executionPlan(root, path, 'fixture-env').args.includes('--ack-control-schema-upgrade'));
  for (const invalid of [{ mode: 'dry-run', ackControlSchemaUpgrade: true }, { mode: 'commit', ackControlSchemaUpgrade: 'true' }]) {
    approve({ ...plan, migration: { ...plan.migration, ...invalid } });
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: () => assert.fail('an unreviewed control schema acknowledgement may not run') }), /ackControlSchemaUpgrade/);
  }
  approve({ ...plan, migration: { ...plan.migration, ackControlSchemaUpgradeX: true } });
  assert.throws(() => executionPlan(root, path, 'fixture-env'), /fields/);
});

test('the reviewed archive directory reaches load only for commit, as a normalized absolute path outside the repository', (t) => {
  // [ADR-0029 L3e] 보관 덤프·격리 키 반출 디렉터리. 원시 값 덤프가 검토 범위(저장소)에 섞이지 않게 한다.
  const { root, path, plan, approve } = fixture(t);
  const outside = mkdtempSync(join(resolve(tmpdir()), 'egov-archive-dir-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  approve({ ...plan, migration: { ...plan.migration, mode: 'commit', archiveDir: outside } });
  const execution = executionPlan(root, path, 'fixture-env');
  assert.ok(execution.args.includes('--mode=commit'));
  assert.equal(execution.args.at(-1), `--archive-dir=${outside}`);
  approve({ ...plan, migration: { ...plan.migration, mode: 'commit' } });
  assert.ok(!executionPlan(root, path, 'fixture-env').args.some(arg => arg.startsWith('--archive-dir')));
  for (const archiveDir of [join(root, 'dumps'), root, 'relative/dumps', `${outside}${sep}..${sep}${basename(outside)}`, 7, null]) {
    approve({ ...plan, migration: { ...plan.migration, mode: 'commit', archiveDir } });
    assert.throws(() => executionPlan(root, path, 'fixture-env'), /archiveDir must be a normalized absolute path outside the repository/, String(archiveDir));
  }
  approve({ ...plan, migration: { ...plan.migration, archiveDir: outside } });
  assert.throws(() => executionPlan(root, path, 'fixture-env'), /allowed only for commit/);
});

test('a commit load forwards both reviewed optional keys together: the control schema acknowledgement and the archive directory', (t) => {
  // [ADR-0029 L3c·L3e] 두 선택 키는 같은 정확한 키 집합에 있고, 함께 승인하면 load 인자에 둘 다 실린다.
  const { root, path, plan, approve } = fixture(t);
  const outside = mkdtempSync(join(resolve(tmpdir()), 'egov-archive-dir-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  approve({ ...plan, migration: { ...plan.migration, mode: 'commit', ackControlSchemaUpgrade: true, archiveDir: outside } });
  const args = executionPlan(root, path, 'fixture-env').args;
  assert.deepEqual(args.slice(-2), ['--ack-control-schema-upgrade', `--archive-dir=${outside}`]);
  assert.equal(args.filter(arg => arg === '--ack-control-schema-upgrade').length, 1);
  assert.equal(args.filter(arg => arg.startsWith('--archive-dir=')).length, 1);
});

test('wrong environment, altered execution plan and altered JAR/mapping/inventory/plan never reach verification or load', (t) => {
  const value = fixture(t);
  const { root, path, write, plan, approve } = value;
  const noRun = () => assert.fail('invalid approval may not execute a command');
  assert.throws(() => executeAdoption({ root, path, environmentId: 'another', execute: true, run: noRun }), /environment/);
  write(path, JSON.stringify({ ...plan, extra: true }));
  assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true, run: noRun }), /fields/);
  approve();
  for (const role of ['jar', 'mapping', 'inventory', 'plan']) {
    write(plan.migration[role].path, 'tampered');
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true, run: noRun }), /hash mismatch/);
    write(plan.migration[role].path, `fixture-${role}`);
  }
  approve({ ...plan, migration: { ...plan.migration, mode: 'bypass' } });
  assert.throws(() => executionPlan(root, path, 'fixture-env'), /mode/);
});

test('technical failure or source/evidence change during verification blocks the final operation', (t) => {
  for (const mutation of ['failure', 'source', 'approval', 'expiry']) {
    const { root, path, write, approvalPath } = fixture(t);
    let commands = 0;
    assert.throws(() => executeAdoption({ root, path, environmentId: 'fixture-env', execute: true,
      run: () => {
        assert.equal(++commands, 1);
        if (mutation === 'failure') throw new Error('technical failure');
        if (mutation === 'source') write('migration-tool/src/main/java/Tool.java', 'class Changed {}');
        if (mutation === 'approval') write('docs/review.md', 'changed evidence');
        if (mutation === 'expiry') {
          const approval = JSON.parse(readFileSync(join(root, approvalPath), 'utf8'));
          approval.validUntil = new Date(Date.now() - 1000).toISOString();
          write(approvalPath, JSON.stringify(approval));
        }
      } }), /failure|scope|hash mismatch|expired/);
    assert.equal(commands, 1);
  }
});

// 생성물 무결성 검사가 소스 범위 수천 파일을 가둘 때 쓰는 resolver 는 containedFile 과 같은 판정을 한다(다른 것은 비용뿐이다).
test('the contained file resolver reads and refuses exactly what containedFile reads and refuses', (t) => {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-contained-resolver-'));
  const outside = mkdtempSync(join(base, 'egov-contained-outside-'));
  t.after(() => { rmSync(root, { recursive: true, force: true }); rmSync(outside, { recursive: true, force: true }); });
  mkdirSync(join(root, 'src', 'nested'), { recursive: true });
  writeFileSync(join(root, 'src', 'nested', 'A.java'), 'class A {}');
  writeFileSync(join(outside, 'secret.txt'), 'outside the repository');
  // 디렉터리 링크로 루트 밖 파일을 루트 안 경로처럼 보이게 한다(Windows 는 권한 없이 만들 수 있는 junction).
  symlinkSync(outside, join(root, 'escape'), process.platform === 'win32' ? 'junction' : 'dir');
  const contained = containedFileResolver(root);
  assert.equal(readFileSync(contained('src/nested/A.java'), 'utf8'), readFileSync(containedFile(root, 'src/nested/A.java'), 'utf8'));
  for (const file of ['', '/src/nested/A.java', 'C:/src/nested/A.java', 'src\\nested\\A.java', 'src/../src/nested/A.java', './src/nested/A.java', 'src//nested/A.java']) {
    assert.throws(() => containedFile(root, file), /expected a repository-relative file/, `containedFile: ${file}`);
    assert.throws(() => contained(file), /expected a repository-relative file/, `resolver: ${file}`);
  }
  for (const file of ['escape/secret.txt', 'src/nested']) {
    assert.throws(() => containedFile(root, file), /file escapes repository or is not a file/, `containedFile: ${file}`);
    assert.throws(() => contained(file), /file escapes repository or is not a file/, `resolver: ${file}`);
  }
});
