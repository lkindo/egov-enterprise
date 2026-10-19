import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_HEADER, HARNESS_SCAN_ROOTS, MANIFEST_PATH, MINIMUM_GATE_SOURCES, REGISTERED_ABSENT_PREFIX, UNREGISTERED_CLASS_PREFIX,
  computeHarnessBaselineEntries, diffHarnessBaseline, formatHarnessBaselineDiff, main as manifestTool, manifestHeader, parseManifest,
  renderHarnessBaselineManifest,
} from './harness-baseline-manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, MANIFEST_PATH);
const META_GATE_SOURCE = 'api-server/src/test/java/nuri/api/harness/HarnessBaselineIntegrityTest.java';

/**
 * 하네스 기준선 매니페스트의 계산은 scripts/harness-baseline-manifest.mjs 하나다(2026-10-19 — 그 전에는 메타 게이트(Java)와 재사용 투영
 * 생성기(node)가 같은 계산을 따로 구현하고 이 파일이 거울로 맞췄다 — 파일 이름은 그때 것이고, 결정 보관본이 이 경로를 가리켜 그대로 둔다).
 * 메타 게이트 HarnessBaselineIntegrityTest 는 그 도구의 `--check` 를 실행하고, 생성기는 그 계산으로 생성물의 매니페스트를 쓴다.
 *
 * 이 계약은 같은 대조를 **늘 도는 경로**에서 한다 — 운영 계약은 CI 의 무조건 잡과 pre-push 에서 돌고, 메타 게이트는 backend 축이 켜질 때와
 * 생성물 하네스에서 돈다. 저장소 자신에 대해 계산값이 커밋된 매니페스트와 정확히 같아야 한다. 소스를 바꾸고 매니페스트를 다시 쓰지
 * 않았으면 여기서 red 다 — `node scripts/harness-baseline-manifest.mjs --write`(또는 `npm run regen`)로 다시 쓰고 바뀐 키가 모두 정당한지
 * 본다. 병합에서 같은 키가 충돌했으면 `--keys <키…>` 로 그 키의 계산값만 보고 그 값만 옮긴다(오케스트레이션 프로토콜 §6.4).
 */
let computed;
const computedEntries = () => (computed ??= computeHarnessBaselineEntries(ROOT, { minimumGateSources: MINIMUM_GATE_SOURCES }));

test('the committed manifest equals the census computed from this repository, and the meta gate reads the completion line', () => {
  const expected = parseManifest(readFileSync(MANIFEST, 'utf8'));
  assert.ok(expected.size > 300, `커밋된 매니페스트가 비정상적으로 작다(${expected.size}) — 이 계약이 vacuous 해진다`);
  assert.ok(computedEntries().size > 300, `계산이 비정상적으로 작다(${computedEntries().size}) — 스캔이 조용히 붕괴했을 수 있다`);

  const out = [];
  const code = manifestTool(['--check'], { compute: () => computedEntries(), log: line => out.push(line), error: line => out.push(line) });
  assert.equal(code, 0, `\n${out.join('\n')}\n\n조치: 정당한 변경이면 node scripts/harness-baseline-manifest.mjs --write(또는 npm run regen)로 다시 쓰고`
    + ' 바뀐 키가 모두 정당한지 본다. 병합에서 같은 키가 충돌했으면 --keys <키…> 로 그 키의 계산값만 옮긴다(§6.4).\n');
  // 메타 게이트는 종료 코드와 함께 이 완료 문장을 요구한다 — 문장을 바꾸면 그 게이트가 통과할 수 없다.
  const checked = readFileSync(join(ROOT, META_GATE_SOURCE), 'utf8').match(/static final String CHECKED = "([^"]+)";/)?.[1];
  assert.ok(checked, `${META_GATE_SOURCE} 의 완료 문장 상수(CHECKED)를 찾지 못했다`);
  assert.ok(out.join('\n').includes(checked), `도구의 완료 문장이 메타 게이트가 찾는 "${checked}" 를 담지 않는다:\n${out.join('\n')}`);
});

test('the manifest tool writes exactly the committed bytes for this repository', () => {
  assert.deepEqual(manifestHeader(undefined), [...DEFAULT_HEADER], '매니페스트가 없을 때는 기본 머리 주석으로 쓴다');
  // 로컬 체크아웃은 core.autocrlf 로 CRLF 일 수 있다. 커밋되는 내용(LF)과 같은지를 본다 — CI 체크아웃은 그대로 LF 다.
  const committed = readFileSync(MANIFEST, 'utf8').replaceAll('\r\n', '\n');
  const rendered = renderHarnessBaselineManifest(computedEntries(), manifestHeader(committed));
  if (rendered === committed) return;
  const [left, right] = [rendered.split('\n'), committed.split('\n')];
  const at = left.findIndex((line, index) => line !== right[index]);
  assert.fail(`도구가 쓰는 매니페스트가 커밋본과 다르다(첫 차이 ${at + 1}행).\n`
    + `  도구: ${JSON.stringify(left[at]?.slice(0, 160))}\n  커밋: ${JSON.stringify(right[at]?.slice(0, 160))}\n`
    + '키 값이 다르면 위 시험의 조치를 따르고, 값이 같은데 순서·머리 주석·줄 끝만 다르면 도구의 쓰기 형식이 커밋본에서 벗어난 것이다.');
});

test('the census freezes its own definition and the meta gate that runs it', () => {
  const entries = computedEntries();
  for (const key of ['__registry.scripts/harness-baseline-manifest.mjs', '__registry.scripts/harness-baseline-manifest-format.mjs',
    'api-server/HarnessBaselineIntegrityTest.__sourceHash', 'api-server/HarnessBaselineIntegrityTest.MANIFEST_TOOL']) {
    assert.ok(entries.has(key) && entries.get(key) !== 'MISSING',
      `${key} 가 계산에 없다 — census 정의나 그것을 실행하는 메타 게이트를 약하게 고쳐도 매니페스트가 바뀌지 않는다`);
  }
});

test('the manifest tool checks drift, shows conflicted keys without writing, and never rewrites a conflicted manifest', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'harness-baseline-manifest-'));
  t.after(() => {
    const owned = resolve(root);
    assert.equal(dirname(owned), resolve(tmpdir()));
    assert.ok(basename(owned).startsWith('harness-baseline-manifest-'));
    rmSync(owned, { recursive: true, force: true });
  });
  const file = join(root, MANIFEST_PATH);
  mkdirSync(dirname(file), { recursive: true });
  const scanRoot = 'api-server/src/test/java';
  const committed = ['# 머리 1', '# 머리 2', `${UNREGISTERED_CLASS_PREFIX}api-server/A=${scanRoot}`, `${UNREGISTERED_CLASS_PREFIX}api-server/B=${scanRoot}`,
    '__registry.config/governance/gates.json=111111111111', 'api-server/A.X=1:aaaaaaaaaaaa', ''].join('\n');
  // 원장 하나를 고치고 매니페스트를 다시 쓰지 않은 상태 — 계산값만 바뀐다.
  const actual = new Map([
    [`${REGISTERED_ABSENT_PREFIX}api-server/R`, 'MISSING'],
    [`${UNREGISTERED_CLASS_PREFIX}api-server/A`, scanRoot],
    [`${UNREGISTERED_CLASS_PREFIX}api-server/C`, scanRoot],
    ['__registry.config/governance/gates.json', '222222222222'],
    ['api-server/A.X', '1:aaaaaaaaaaaa'],
    ['api-server/C.aB', '0:cccccccccccc'],
    ['api-server/C.Y_Z', '0:dddddddddddd'],
  ]);
  const options = [];
  const run = (...argv) => {
    const out = [];
    const code = manifestTool(argv, { root, compute: (_root, option) => { options.push(option); return actual; },
      log: line => out.push(line), error: line => out.push(line) });
    return { code, out: out.join('\n') };
  };

  // 매니페스트가 없으면 대조할 기준선이 없다 — 모든 키가 신설로 보이는 대신 그 사실을 말하고 붉다.
  const absent = run('--check');
  assert.equal(absent.code, 1);
  assert.match(absent.out, /없거나 비어 있다/);
  assert.deepEqual(options.at(-1), { minimumGateSources: MINIMUM_GATE_SOURCES }, 'CLI 는 게이트 소스 스캔 하한을 넘긴다');

  writeFileSync(file, committed);
  const check = run('--check');
  assert.equal(check.code, 1, 'a registry edit without rewriting the manifest is red');
  for (const line of ['변경 __registry.config/governance/gates.json: 111111111111 → 222222222222', '신설 api-server/C.Y_Z',
    '클래스 신설 api-server/C', '클래스 소멸 api-server/B', '등록 게이트 소멸 api-server/R']) {
    assert.ok(check.out.includes(line), `${line}\n${check.out}`);
  }
  assert.equal(readFileSync(file, 'utf8'), committed, '--check never writes');

  const keys = run('--keys', '__registry.config/governance/gates.json', 'api-server/Gone.X');
  assert.equal(keys.code, 0);
  assert.ok(keys.out.includes('__registry.config/governance/gates.json=222222222222'), keys.out);
  assert.ok(keys.out.includes('# api-server/Gone.X: 계산에 없는 키다'), keys.out);
  assert.ok(!keys.out.includes('api-server/C.aB'), 'only the requested keys are shown');
  assert.equal(readFileSync(file, 'utf8'), committed, '--keys never writes');

  const conflicted = committed.replace('__registry.config/governance/gates.json=111111111111\n',
    '<<<<<<< HEAD\n__registry.config/governance/gates.json=111111111111\n=======\n'
      + '__registry.config/governance/gates.json=333333333333\n>>>>>>> origin/main\n');
  writeFileSync(file, conflicted);
  const refused = run('--write');
  assert.equal(refused.code, 1);
  assert.match(refused.out, /충돌 표기가 남아 있다/);
  assert.equal(readFileSync(file, 'utf8'), conflicted, 'a conflicted manifest is never rewritten as a whole');
  assert.equal(run('--keys', '__registry.config/governance/gates.json').code, 0, 'the conflicted key can still be read');

  writeFileSync(file, committed);
  assert.equal(run('--write').code, 0);
  // 머리 주석은 그대로, 키는 코드 단위 순서('C.Y_Z' < 'C.aB'), 줄 끝은 LF.
  // 게이트 클래스는 한 줄에 하나다 — 병합에서 서로 다른 클래스를 더해도 같은 줄을 고치지 않는다.
  assert.equal(readFileSync(file, 'utf8'), ['# 머리 1', '# 머리 2', `${REGISTERED_ABSENT_PREFIX}api-server/R=MISSING`,
    `${UNREGISTERED_CLASS_PREFIX}api-server/A=${scanRoot}`, `${UNREGISTERED_CLASS_PREFIX}api-server/C=${scanRoot}`,
    '__registry.config/governance/gates.json=222222222222', 'api-server/A.X=1:aaaaaaaaaaaa',
    'api-server/C.Y_Z=0:dddddddddddd', 'api-server/C.aB=0:cccccccccccc', ''].join('\n'));
  const green = run('--check');
  assert.equal(green.code, 0);
  assert.match(green.out, /는 계산값과 같다\(7개 키\)/);

  const checkedOut = readFileSync(file, 'utf8').replaceAll('\n', '\r\n');
  writeFileSync(file, checkedOut);
  assert.equal(run('--write').code, 0);
  assert.equal(readFileSync(file, 'utf8'), checkedOut, 'a manifest that differs only in line endings is left alone');

  for (const argv of [[], ['--check', '--write'], ['--keys']]) assert.equal(run(...argv).code, 2, JSON.stringify(argv));
});

/*
 * 게이트 클래스 census 는 registry(gates.json 의 gateSets[].rules[].source) 밖의 게이트 소스만 매니페스트에 한 줄씩 적는다(2026-10-19).
 * 걷은 것은 registry 가 이미 exact 로 등재한 같은 목록의 두 번째 사본(한 줄 172개)이지 검출이 아니다 — 등록 게이트 삭제, 미등록
 * 지원 파일 삭제, 미등록 게이트 신설, 동결 상수·census 정의의 변경이 모두 계산값 차이로 드러나야 한다. 메타 게이트는 이 차이를 그대로 낸다.
 */
test('the census notices gate deletion, support file deletion, unregistered gates, constant edits and edits to its own definition', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'harness-baseline-classes-'));
  t.after(() => {
    const owned = resolve(root);
    assert.equal(dirname(owned), resolve(tmpdir()));
    assert.ok(basename(owned).startsWith('harness-baseline-classes-'));
    rmSync(owned, { recursive: true, force: true });
  });
  for (const scanRoot of HARNESS_SCAN_ROOTS) mkdirSync(join(root, scanRoot), { recursive: true });
  const harness = 'api-server/src/test/java/nuri/api/harness';
  const registered = `${harness}/RegisteredLinterTest.java`;
  const support = `${harness}/SupportIndex.java`;
  const put = (file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };
  const registry = sources => `${JSON.stringify({ gateSets: [{ id: 'GATESET-X', rules: sources.map((source, index) => ({ id: `GH-X-${index}`, source })) }] }, null, 2)}\n`;
  const gate = (body = '') => `package nuri.api.harness;\n@Tag("governance-harness")\nclass RegisteredLinterTest {\n${body}  void check() {}\n}\n`;
  put(registered, gate('  private static final int FLOOR = 40;\n'));
  put(support, 'package nuri.api.harness;\nfinal class SupportIndex {}\n');
  put('config/governance/gates.json', registry([registered]));
  put('scripts/harness-baseline-manifest.mjs', 'census v1\n');

  const baseline = computeHarnessBaselineEntries(root);
  const classKeys = map => [...map.keys()].filter(key => key.startsWith(UNREGISTERED_CLASS_PREFIX) || key.startsWith(REGISTERED_ABSENT_PREFIX));
  assert.deepEqual(classKeys(baseline), [`${UNREGISTERED_CLASS_PREFIX}api-server/SupportIndex`],
    'registry 에 등록된 게이트는 다시 적지 않고, registry 밖의 게이트 소스만 한 줄씩 적는다');
  assert.equal(baseline.get(`${UNREGISTERED_CLASS_PREFIX}api-server/SupportIndex`), 'api-server/src/test/java');
  const drift = () => formatHarnessBaselineDiff(diffHarnessBaseline(baseline, computeHarnessBaselineEntries(root)));
  assert.equal(drift(), '');

  // (a) 등록 게이트 파일을 지우면 registry 를 그대로 둔 채로도 부재 키가 생긴다.
  rmSync(join(root, registered));
  assert.match(drift(), /등록 게이트 소멸 api-server\/RegisteredLinterTest/);
  // registry 에서도 함께 지우면 그 해시가 바뀐다 — 매니페스트를 다시 쓰지 않고는 조용할 수 없다.
  put('config/governance/gates.json', registry([]));
  assert.match(drift(), /변경 __registry\.config\/governance\/gates\.json/);
  put('config/governance/gates.json', registry([registered]));
  put(registered, gate('  private static final int FLOOR = 40;\n'));
  assert.equal(drift(), '');

  // (b) registry 밖에 남긴 지원 파일을 지우면 그 줄이 소멸한다.
  rmSync(join(root, support));
  assert.match(drift(), /클래스 소멸 api-server\/SupportIndex/);
  put(support, 'package nuri.api.harness;\nfinal class SupportIndex {}\n');

  // (c) registry 에도 매니페스트에도 없는 게이트를 더하면 줄이 신설된다.
  put(`${harness}/NewProbeLinterTest.java`, 'package nuri.api.harness;\nclass NewProbeLinterTest {}\n');
  assert.match(drift(), /클래스 신설 api-server\/NewProbeLinterTest/);
  rmSync(join(root, `${harness}/NewProbeLinterTest.java`));
  assert.equal(drift(), '');

  // (d) 동결 상수를 낮추거나 census 정의(이 도구)를 고치면 그 키가 바뀐다.
  put(registered, gate('  private static final int FLOOR = 1;\n'));
  assert.match(drift(), /변경 api-server\/RegisteredLinterTest\.FLOOR: /);
  put(registered, gate('  private static final int FLOOR = 40;\n'));
  put('scripts/harness-baseline-manifest.mjs', 'census v2\n');
  assert.match(drift(), /변경 __registry\.scripts\/harness-baseline-manifest\.mjs: /);
  put('scripts/harness-baseline-manifest.mjs', 'census v1\n');
  assert.equal(drift(), '');

  // 스캔이 조용히 붕괴하면 빈 대조가 통과한다 — CLI 가 넘기는 하한 아래면 계산하지 않는다.
  assert.throws(() => computeHarnessBaselineEntries(root, { minimumGateSources: 3 }), /게이트 소스 스캔 건수\(2\)가 하한\(3\) 미만/);

  // 투영본은 원본 registry 를 그대로 두고 게이트를 지운다 — 부재를 기록한 매니페스트는 그 상태에서 계산값과 같다.
  rmSync(join(root, registered));
  const projected = computeHarnessBaselineEntries(root);
  assert.equal(projected.get(`${REGISTERED_ABSENT_PREFIX}api-server/RegisteredLinterTest`), 'MISSING');
  assert.equal(formatHarnessBaselineDiff(diffHarnessBaseline(projected, computeHarnessBaselineEntries(root))), '');

  // 등록 판정을 못 하면 대조하지 않는다.
  put('config/governance/gates.json', '{ not json');
  assert.throws(() => computeHarnessBaselineEntries(root), /gates\.json 를 JSON 으로 읽지 못했다/);
});
