import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { CHILD_FAILURE_CODES, childFailureReportPath, failureReportFromArgv, readChildFailure, runReportingChild, writeChildFailure } from './project-composer-child-failure.mjs';
import { ComposerError, JOB_ERROR_CODES } from './project-composer-errors.mjs';
import { CHILD_STAGE as DB_STAGE } from './generate-reusable-base-db.mjs';
import { CHILD_STAGE as SOURCE_STAGE } from './generate-reusable-base-source.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/** 원본 저장소 모양의 임시 루트(build 아래만 보고 경로로 허용된다). */
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'egov-child-failure-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'build'));
  return root;
}

test('the report path must be a new .json file under build that stays inside the source checkout', t => {
  const root = fixture(t);
  const accepted = childFailureReportPath('build/composer/jobs/x/failures/database.json', root);
  assert.equal(accepted, join(root, 'build', 'composer', 'jobs', 'x', 'failures', 'database.json'));
  assert.equal(childFailureReportPath(join(root, 'build', 'y.json'), root), join(root, 'build', 'y.json'), 'an absolute path inside build is accepted');
  writeFileSync(join(root, 'build', 'taken.json'), '{}');
  for (const value of [undefined, '', '--allow-dirty', 'build', 'build/', 'build/x.txt', 'build/x', 'x.json', '../build/x.json',
    'build/../x.json', join(root, 'x.json'), 'build/taken.json']) {
    assert.throws(() => childFailureReportPath(value, root), undefined, JSON.stringify(value));
  }
});

test('a build directory link that leaves the checkout is refused even though the lexical path is under build', t => {
  const root = fixture(t);
  const outside = realpathSync(mkdtempSync(join(tmpdir(), 'egov-child-failure-outside-')));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  // Windows 는 관리자 권한 없이 만들 수 있는 junction, 그 밖은 디렉터리 심볼릭 링크다(type 인자는 Windows 에서만 쓰인다).
  symlinkSync(outside, join(root, 'build', 'escape'), 'junction');
  assert.throws(() => childFailureReportPath('build/escape/failures/source.json', root), /inside the source checkout/);
  assert.throws(() => childFailureReportPath('build/escape/database.json', root), /inside the source checkout/);
});

test('the flag is optional, and a repeated or valueless flag is refused before the child does any work', t => {
  const root = fixture(t);
  assert.equal(failureReportFromArgv(['--profile', 'core'], root), undefined);
  assert.equal(failureReportFromArgv(['--failure-report', 'build/a.json'], root), join(root, 'build', 'a.json'));
  assert.throws(() => failureReportFromArgv(['--failure-report', 'build/a.json', '--failure-report', 'build/b.json'], root), /only be supplied once/);
  assert.throws(() => failureReportFromArgv(['--failure-report'], root), /requires a path/);
});

test('only a coded failure that its stage may report is written, once, and an unwritable report never throws', t => {
  const root = fixture(t);
  const path = join(root, 'build', 'failures', 'database.json');
  // 코드 없는 실패·다른 단계의 코드·경로 없음은 쓰지 않는다.
  assert.equal(writeChildFailure(path, 'database', new Error('plain')), false);
  assert.equal(writeChildFailure(path, 'database', Object.assign(new Error('look-alike'), { code: 'CATALOG_DRIFT' })), false);
  assert.equal(writeChildFailure(path, 'database', new ComposerError('SOURCE_SURVIVAL', { files: ['a'] })), false);
  assert.equal(writeChildFailure(path, 'source', new ComposerError('CATALOG_DRIFT', {})), false);
  assert.equal(writeChildFailure(path, 'install', new ComposerError('CATALOG_DRIFT', {})), false);
  assert.equal(writeChildFailure(undefined, 'database', new ComposerError('CATALOG_DRIFT', {})), false);
  assert.equal(existsSync(path), false);
  assert.equal(writeChildFailure(path, 'database', new ComposerError('CATALOG_DRIFT', { violations: ['first'] })), true);
  const written = readFileSync(path, 'utf8');
  assert.deepEqual(JSON.parse(written), { schemaVersion: 1, stage: 'database', code: 'CATALOG_DRIFT', details: { violations: ['first'] } });
  // 이미 있으면 덮어쓰지 않고, 실패해도 던지지 않는다.
  assert.equal(writeChildFailure(path, 'database', new ComposerError('MENU_SNAPSHOT_STALE', {})), false);
  assert.equal(readFileSync(path, 'utf8'), written);
});

test('the engine reads only a well-formed report for its own stage and an allowed code', t => {
  const root = fixture(t);
  const report = (name, value) => {
    const path = join(root, 'build', name);
    writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value));
    return path;
  };
  const stale = readChildFailure(report('stale.json', { schemaVersion: 1, stage: 'database', code: 'MENU_SNAPSHOT_STALE', details: { x: 1 } }), 'database', root);
  assert.ok(stale instanceof ComposerError);
  assert.equal(stale.code, 'MENU_SNAPSHOT_STALE');
  assert.deepEqual(stale.details, {}, 'codes without reviewed details carry none');
  for (const [name, value, stage] of [
    ['wrong-stage.json', { schemaVersion: 1, stage: 'source', code: 'CATALOG_DRIFT' }, 'database'],
    ['stage-not-allowed.json', { schemaVersion: 1, stage: 'database', code: 'SOURCE_SURVIVAL' }, 'database'],
    ['unknown-code.json', { schemaVersion: 1, stage: 'database', code: 'DB_NOT_READY' }, 'database'],
    ['version.json', { schemaVersion: 2, stage: 'database', code: 'CATALOG_DRIFT' }, 'database'],
    ['broken.json', '{"schemaVersion":1', 'database'],
    ['array.json', '[]', 'database'],
    ['huge.json', { schemaVersion: 1, stage: 'database', code: 'CATALOG_DRIFT', details: { violations: ['x'.repeat(70 * 1024)] } }, 'database'],
  ]) assert.equal(readChildFailure(report(name, value), stage, root), null, name);
  assert.equal(readChildFailure(join(root, 'build', 'missing.json'), 'database', root), null);
});

test('survival details keep only 1..200 repository-relative files; anything else drops the details, not the code', t => {
  const root = fixture(t);
  let index = 0;
  const read = files => {
    const path = join(root, 'build', `survival-${index += 1}.json`);
    writeFileSync(path, JSON.stringify({ schemaVersion: 1, stage: 'source', code: 'SOURCE_SURVIVAL', details: { files } }));
    return readChildFailure(path, 'source', root);
  };
  assert.deepEqual(read(['frontend/src/app/page.tsx']).details, { files: ['frontend/src/app/page.tsx'] });
  assert.equal(read(Array.from({ length: 200 }, (_, n) => `a/${n}.java`)).details.files.length, 200);
  for (const files of [[], Array.from({ length: 201 }, (_, n) => `a/${n}.java`), ['/etc/passwd'], ['C:/Users/me/x.java'], ['c:x.java'],
    ['a/../b.java'], ['a\\b.java'], ['a//b.java'], ['a/'], [''], [7], 'a.java', ['x'.repeat(501)]]) {
    const error = read(files);
    assert.equal(error.code, 'SOURCE_SURVIVAL', JSON.stringify(files));
    assert.deepEqual(error.details, {}, JSON.stringify(files));
  }
});

test('a drift violation is one line, masks this computer path and is capped', t => {
  const root = fixture(t);
  let index = 0;
  const read = violations => {
    const path = join(root, 'build', `drift-${index += 1}.json`);
    writeFileSync(path, JSON.stringify({ schemaVersion: 1, stage: 'database', code: 'CATALOG_DRIFT', details: { violations } }));
    return readChildFailure(path, 'database', root);
  };
  // 첫 위반만 싣는다. 이 컴퓨터의 루트는 '.' 으로, 줄바꿈·NUL 은 공백으로 바뀐다.
  const masked = read([`bad\r\nkey in ${join(root, 'config', 'x.json')}\0`, 'second']).details.violations;
  assert.equal(masked.length, 1);
  assert.ok(!masked[0].toLowerCase().includes(root.toLowerCase()), masked[0]);
  assert.match(masked[0], /^bad key in \.[\\/]config[\\/]x\.json$/);
  assert.equal(read(['line one\r\nline two']).details.violations[0], 'line one line two');
  assert.equal(read(['x'.repeat(400)]).details.violations[0].length, 300);
  for (const violations of [[], [7], 'flat', undefined]) assert.deepEqual(read(violations).details, {}, JSON.stringify(violations));
});

test('every reportable code is a request-or-job code the server can map, and DB readiness is never self-reported', () => {
  assert.deepEqual(Object.keys(CHILD_FAILURE_CODES).sort(), ['database', 'source']);
  for (const code of Object.values(CHILD_FAILURE_CODES).flat()) assert.ok(JOB_ERROR_CODES.includes(code), `${code} is a job code`);
  assert.ok(!CHILD_FAILURE_CODES.database.includes('DB_NOT_READY'), 'the engine probes the owned container instead of trusting the child');
  assert.ok(!Object.values(CHILD_FAILURE_CODES).flat().includes('SOURCE_CHANGED'), 'the engine judges source movement itself');
});

test('each generator reports under the stage name the engine reads for it', () => {
  // 엔진은 DB 번들 생성기를 'database', 소스 생성기를 'source' 단계로 부르고 그 이름의 보고만 읽는다.
  assert.equal(DB_STAGE, 'database');
  assert.equal(SOURCE_STAGE, 'source');
});

test('the child entry point writes only coded failures, ends with code 1 and never runs main on a bad report path', async t => {
  const root = fixture(t);
  const run = async (main, argv = ['--failure-report', 'build/r/x.json']) => {
    const exits = [];
    const logs = [];
    await runReportingChild({ argv, root, stage: 'source', label: 'base-source', main, exit: code => exits.push(code), log: line => logs.push(line) });
    return { exits, logs };
  };
  const coded = await run(() => { throw new ComposerError('SOURCE_SURVIVAL', { files: ['a/b.java'] }, 'removed'); });
  assert.deepEqual(coded.exits, [1]);
  assert.deepEqual(coded.logs, ['[base-source] FAIL: removed']);
  assert.equal(readChildFailure(join(root, 'build', 'r', 'x.json'), 'source', root).code, 'SOURCE_SURVIVAL');
  rmSync(join(root, 'build', 'r'), { recursive: true });
  const rejected = await run(async () => { throw new ComposerError('SOURCE_SURVIVAL', {}, 'async'); });
  assert.deepEqual(rejected.exits, [1], 'an asynchronous main is handled the same way');
  assert.equal(existsSync(join(root, 'build', 'r', 'x.json')), true);
  rmSync(join(root, 'build', 'r'), { recursive: true });
  const plain = await run(() => { throw new Error('plain'); });
  assert.deepEqual(plain.exits, [1]);
  assert.equal(existsSync(join(root, 'build', 'r', 'x.json')), false, 'an uncoded failure writes no report');
  let called = false;
  const refused = await run(() => { called = true; }, ['--failure-report', 'outside.json']);
  assert.deepEqual(refused.exits, [1]);
  assert.equal(called, false, 'a refused report path stops before any generation work');
  const passed = await run(() => {}, []);
  assert.deepEqual(passed.exits, [], 'a successful run without a report path exits normally');
});

test('both generators refuse a report path outside build before any generation work', () => {
  for (const [script, args] of [
    ['scripts/generate-reusable-base-db.mjs', ['--profile', 'core', '--failure-report', 'x.json']],
    ['scripts/generate-reusable-base-source.mjs', ['--profile', 'core', '--db-bundle', 'build/none', '--failure-report', 'x.json']],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: ROOT, encoding: 'utf8', timeout: 60_000 });
    assert.equal(result.status, 1, `${script}: ${result.stderr}`);
    assert.match(result.stderr, /FAIL: --failure-report must be a new \.json file under build/, script);
    assert.equal(existsSync(join(ROOT, 'x.json')), false);
  }
});
