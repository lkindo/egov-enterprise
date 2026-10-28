/**
 * 생성물 재생성 한 명령(scripts/regenerate.mjs, `npm run regen`)의 계약.
 *
 * 순서가 이 명령의 존재 이유다 — 손 결속(SAST 예외) 확인과 하네스 기준선은 생성기 사슬 뒤, Atlas 는 그 뒤다. 실패한 push 의 대부분이
 * 이 순서를 어겨 11분짜리 운영 계약 뒤에야 드러났다. 생성기 목록과 검사 명령은 merge-main-regenerate.mjs 의 GENERATORS 가 정본이고,
 * 이 시험은 그 목록을 다시 적지 않고 읽는다.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { GENERATORS, HARNESS_MANIFEST, HARNESS_MANIFEST_TOOL, URL_APPROVAL, URL_CENSUS } from './merge-main-regenerate.mjs';
import {
  ATLAS_STEP, SAST_LEDGER, checkGenerated, checkTasks, main, rebindSastLedgerText, regenerate, regenerationSteps, staleSastExceptions,
} from './regenerate.mjs';
import { sourceHash } from './sast-exceptions.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function scratch(t, prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => {
    const owned = resolve(root);
    assert.equal(dirname(owned), resolve(tmpdir()));
    assert.ok(basename(owned).startsWith(prefix));
    rmSync(owned, { recursive: true, force: true });
  });
  return root;
}

const put = (root, file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };

/** 재생성 순서의 불변식. 어기면 무엇이 무엇보다 앞서야 하는지를 말한다. */
function assertRegenerationOrder(ids) {
  const generatorIds = GENERATORS.map(generator => generator.id);
  assert.deepEqual(ids.filter(id => generatorIds.includes(id)), generatorIds, '생성기는 GENERATORS 순서로 한 번씩 돈다');
  const at = id => ids.indexOf(id);
  const lastGenerator = Math.max(...generatorIds.filter(id => id !== ATLAS_STEP).map(at));
  assert.ok(at('sast-exceptions') > lastGenerator, 'SAST 예외 해시 확인은 생성기 사슬 뒤다');
  assert.ok(at('harness-baseline') > at('sast-exceptions'), '하네스 기준선은 손 결속(SAST 예외) 확인 뒤다 — 기준선이 그 원장의 해시를 담는다');
  assert.equal(at(ATLAS_STEP), ids.length - 1, 'Atlas 가 마지막이다 — 문서·게이트 원장·훅을 읽는다');
  assert.equal(at('harness-baseline'), ids.length - 2, '하네스 기준선은 Atlas 바로 앞, 나머지 재생성 뒤다');
}

test('재생성 순서: 생성기 사슬 → SAST 예외 해시 확인 → 하네스 기준선 → Atlas', () => {
  const steps = regenerationSteps();
  assertRegenerationOrder(steps.map(step => step.id));
  const harness = steps.find(step => step.id === 'harness-baseline');
  assert.deepEqual(harness.command, ['node', [HARNESS_MANIFEST_TOOL, '--write']]);
  assert.deepEqual(harness.files(), [HARNESS_MANIFEST]);
  // URL census 뒤에는 승인 해시를 다시 결속한다(GENERATORS 의 표지를 그대로 쓴다).
  assert.deepEqual(steps.filter(step => step.rebindUrlApproval).map(step => step.id), ['url-state-census']);
  // 불변식 자체가 순서 위반을 잡는다.
  const ids = steps.map(step => step.id);
  const swapped = [...ids.slice(0, -2), ids.at(-1), ids.at(-2)];
  assert.throws(() => assertRegenerationOrder(swapped), /Atlas 가 마지막이다/);
  const early = ['harness-baseline', ...ids.filter(id => id !== 'harness-baseline')];
  assert.throws(() => assertRegenerationOrder(early), /하네스 기준선은 손 결속\(SAST 예외\) 확인 뒤다/);
  // Atlas 생성기가 없는 저장소(재사용 생성물)에서는 기준선이 마지막이다.
  const withoutAtlas = regenerationSteps(GENERATORS.filter(generator => generator.id !== ATLAS_STEP)).map(step => step.id);
  assert.equal(withoutAtlas.at(-1), 'harness-baseline');
});

test('모든 생성기가 쓰지 않는 검사 명령을 갖고, 그 명령은 저장소의 스크립트를 부른다', () => {
  for (const generator of GENERATORS) {
    assert.ok(Array.isArray(generator.check) && generator.check.length > 0, `${generator.id}: 검사 명령(check)이 없다`);
    for (const [command, args] of generator.check) {
      assert.equal(command, 'node', `${generator.id}: 검사는 node 스크립트다(셸·패키지 관리자를 거치지 않는다)`);
      assert.ok(existsSync(join(ROOT, args[0])), `${generator.id}: ${args[0]} 이 없다`);
      assert.ok(!args.includes('--write'), `${generator.id}: 검사 명령이 쓰기 모드다`);
    }
  }
  const tasks = checkTasks(ROOT).map(task => task.id);
  for (const id of [...GENERATORS.map(generator => generator.id), 'url-state-census:approval', 'sast-exceptions', 'harness-baseline']) {
    assert.ok(tasks.includes(id), `--check 가 ${id} 를 보지 않는다`);
  }
  // 검사 명령이 빠진 생성기는 낡았는지 알 수 없으므로 통과시키지 않는다.
  const unchecked = regenerationSteps([{ ...GENERATORS[0], check: [] }]);
  assert.throws(() => checkTasks(ROOT, unchecked), /검사 명령\(check\)이 없다/);
});

test('regen 은 단계를 순서대로 돌리고 바뀐 파일만 보이며, URL 승인 해시를 다시 결속한다', (t) => {
  const root = scratch(t, 'regenerate-write-');
  const census = '{\n  "records": []\n}\n';
  put(root, URL_CENSUS, '{"records":[1]}\n');
  put(root, URL_APPROVAL, `${JSON.stringify({ manifestRef: { path: URL_CENSUS, sha256: '0'.repeat(64) } }, null, 2)}\n`);
  put(root, SAST_LEDGER, `${JSON.stringify({ findings: [] }, null, 2)}\n`);
  put(root, 'same.txt', 'same\n');
  const steps = [
    { id: 'first', kind: 'generator', command: ['first'], files: () => ['out/first.txt'] },
    { id: 'url-state-census', kind: 'generator', command: ['census'], rebindUrlApproval: true, files: () => [URL_CENSUS, URL_APPROVAL] },
    { id: 'sast-exceptions', kind: 'sast', files: () => [] },
    { id: 'harness-baseline', kind: 'generator', command: ['harness'], files: () => ['same.txt'] },
    { id: ATLAS_STEP, kind: 'generator', command: ['atlas'], files: () => ['out/atlas.html'] },
  ];
  const ran = [];
  const runCommand = (cwd, [command]) => {
    ran.push(command);
    if (command === 'first') put(cwd, 'out/first.txt', 'new\n');
    if (command === 'census') put(cwd, URL_CENSUS, census);
    if (command === 'harness') put(cwd, 'same.txt', 'same\r\n'); // 줄 끝만 다르다
    if (command === 'atlas') put(cwd, 'out/atlas.html', '<html>\n');
  };
  const logs = [];
  const result = regenerate({ cwd: root, steps, runCommand, log: line => logs.push(line) });
  assert.equal(result.status, 'ready');
  assert.deepEqual(ran, ['first', 'census', 'harness', 'atlas']);
  assert.deepEqual(result.changed, ['config/ui-url-state-approval.json', 'config/ui-url-state-census.json', 'out/atlas.html', 'out/first.txt']);
  assert.match(logs.join('\n'), /바뀐 파일\(4\)/);
  assert.notEqual(JSON.parse(readFileSync(join(root, URL_APPROVAL), 'utf8')).manifestRef.sha256, '0'.repeat(64));
});

test('SAST 예외 해시가 낡았으면 자동으로 결속하지 않고 하네스 기준선 앞에서 멈춘다', (t) => {
  const root = scratch(t, 'regenerate-sast-');
  put(root, 'src/Guarded.java', 'class Guarded {}\n');
  put(root, 'src/Defense.java', 'class Defense {}\n');
  const ledger = {
    schemaVersion: 1,
    findings: [{
      id: 'SAST-FP-001', file: 'src/Guarded.java', sourceSha256: sourceHash(root, 'src/Guarded.java'),
      supportingSources: [{ file: 'src/Defense.java', sha256: sourceHash(root, 'src/Defense.java') }], reason: 'Reviewed defense boundary holds.',
    }],
  };
  const ledgerText = `${JSON.stringify(ledger, null, 2)}\n`;
  put(root, SAST_LEDGER, ledgerText);
  assert.deepEqual(staleSastExceptions(root), []);
  put(root, 'src/Defense.java', 'class Defense { void tightened() {} }\n');
  assert.deepEqual(staleSastExceptions(root), [{ id: 'SAST-FP-001', files: ['src/Defense.java'] }]);

  const ran = [];
  const steps = regenerationSteps([{ id: 'only', command: ['only'], outputs: [], check: [['node', ['x']]] }])
    .map(step => (step.id === 'harness-baseline' ? { ...step, requires: undefined } : step));
  const logs = [];
  const result = regenerate({ cwd: root, steps, runCommand: (cwd, [command]) => ran.push(command), log: line => logs.push(line) });
  assert.equal(result.status, 'sast-stale');
  assert.deepEqual(ran, ['only'], '하네스 기준선을 쓰지 않았다');
  assert.equal(readFileSync(join(root, SAST_LEDGER), 'utf8'), ledgerText, '원장을 자동으로 다시 결속하지 않는다');
  assert.match(logs.join('\n'), /SAST-FP-001: src\/Defense\.java/);
  assert.match(logs.join('\n'), /npm run regen -- --rebind-sast SAST-FP-001 --note "Re-reviewed \d{4}-\d{2}-\d{2}:/);

  // 사람이 재검토한 항목만, 재검토 문장과 함께 다시 결속한다.
  assert.throws(() => rebindSastLedgerText(ledgerText, { ids: ['SAST-FP-001'], note: 'ok', cwd: root }), /Re-reviewed YYYY-MM-DD/);
  assert.throws(() => rebindSastLedgerText(ledgerText, { ids: ['SAST-FP-009'], note: 'Re-reviewed 2026-10-19: the defense is unchanged here.', cwd: root }),
    /SAST-FP-009 는 결속 해시가 낡은 항목이 아니다/);
  const rebound = JSON.parse(rebindSastLedgerText(ledgerText,
    { ids: ['SAST-FP-001'], note: 'Re-reviewed 2026-10-19: tightened() adds no input path; Origin defense unchanged.', cwd: root }));
  assert.equal(rebound.findings[0].supportingSources[0].sha256, sourceHash(root, 'src/Defense.java'));
  assert.match(rebound.findings[0].reason, /^Reviewed defense boundary holds\. Re-reviewed 2026-10-19: tightened\(\)/);
  assert.deepEqual(staleSastExceptions(root, rebound), []);
});

test('--check 는 쓰지 않고, 검사 하나라도 실패하면 실패하며 그 출력을 보인다', async (t) => {
  const root = scratch(t, 'regenerate-check-');
  put(root, 'kept.txt', 'kept\n');
  const tasks = [
    { id: 'fresh', label: 'fresh', run: async () => ({ ok: true, output: '' }) },
    { id: 'stale', label: 'stale', run: async () => ({ ok: false, output: 'stale output\nGenerated artifact is stale: x' }) },
    { id: 'thrown', label: 'thrown', run: async () => { throw new Error('crashed'); } },
  ];
  const logs = [];
  const result = await checkGenerated({ cwd: root, tasks, log: line => logs.push(line), concurrency: 2 });
  assert.equal(result.ok, false);
  assert.deepEqual(result.results.map(row => [row.id, row.ok]), [['fresh', true], ['stale', false], ['thrown', false]]);
  assert.match(logs.join('\n'), /Generated artifact is stale: x/);
  assert.match(logs.join('\n'), /crashed/);
  assert.match(logs.join('\n'), /`npm run regen` 으로 다시 만들고/);
  assert.equal(readFileSync(join(root, 'kept.txt'), 'utf8'), 'kept\n');
  const fresh = await checkGenerated({ cwd: root, tasks: tasks.slice(0, 1), log: () => {} });
  assert.equal(fresh.ok, true);
});

test('CLI 는 세 형태만 받는다', async () => {
  const errors = [];
  for (const argv of [['--write'], ['--check', '--rebind-sast'], ['--rebind-sast', 'SAST-FP-001']]) {
    assert.equal(await main(argv, { log: () => {}, error: line => errors.push(line) }), 2, JSON.stringify(argv));
  }
  assert.match(errors[0], /사용법: npm run regen/);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.regen, 'node scripts/regenerate.mjs');
});

// PowerShell 의 npm 래퍼는 `npm run regen -- --check` 의 `--` 를 지운다 — npm 이 `--check` 를 npm_config_check 로 먹고 스크립트는
// 인자 없이 돈다. 인자 없는 실행은 쓰기 재생성이라, 검사만 하려던 명령이 생성물을 다시 쓴다. 그 흔적이 있으면 쓰지 않고 멈춘다.
test('npm 이 플래그를 삼켜 인자 없이 불리면 쓰기 재생성 대신 직접 호출을 안내하고 종료 코드 2 로 멈춘다', async () => {
  const run = async (env) => {
    const errors = [];
    let wrote = 0;
    const code = await main([], { env, log: () => {}, error: line => errors.push(line),
      write: () => { wrote += 1; return { status: 'ready' }; } });
    return { code, wrote, errors: errors.join('\n') };
  };
  for (const flag of ['npm_config_check', 'npm_config_rebind_sast', 'npm_config_note']) {
    const swallowed = await run({ npm_lifecycle_event: 'regen', [flag]: 'true' });
    assert.equal(swallowed.code, 2, `${flag}: npm 이 삼킨 플래그가 남은 인자 없는 실행은 종료 코드 2 로 멈춰야 한다`);
    assert.equal(swallowed.wrote, 0, `${flag}: 쓰기 재생성을 돌리지 않는다`);
    assert.match(swallowed.errors, new RegExp(flag));
    assert.match(swallowed.errors, /node scripts\/regenerate\.mjs --check/);
  }
  // 그 흔적이 없으면 평소의 `npm run regen`(쓰기)이고, npm 밖에서 직접 부른 실행도 그대로다.
  for (const env of [{ npm_lifecycle_event: 'regen' }, { npm_config_check: 'true' }]) {
    const normal = await run(env);
    assert.deepEqual([normal.code, normal.wrote], [0, 1], JSON.stringify(env));
  }
  // 인자가 있으면(sh 의 `npm run regen -- --check`) 그 인자를 따른다 — 모르는 인자는 흔적과 상관없이 사용법으로 거절한다.
  assert.equal(await main(['--write'], { env: { npm_lifecycle_event: 'regen', npm_config_check: 'true' }, log: () => {}, error: () => {} }), 2);
});
