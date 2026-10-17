import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeHarnessBaselineEntries } from './reusable-source-harness.mjs';
import {
  DEFAULT_HEADER, MANIFEST_PATH, main as manifestTool, manifestHeader, parseManifest, renderHarnessBaselineManifest,
} from './harness-baseline-manifest.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, MANIFEST_PATH);
const META_GATE_SOURCE = 'api-server/src/test/java/nuri/api/harness/HarnessBaselineIntegrityTest.java';

/**
 * 재사용 base 투영본은 게이트가 일부 제거되므로 커밋된 harness baseline 매니페스트를 그대로 쓸 수 없고,
 * 생성기(`writeHarnessBaseline`)가 다시 쓴다. 그 계산은 메타 게이트 `HarnessBaselineIntegrityTest` 가
 * 실행 시점에 만드는 `actual` 맵의 **거울**이어야 한다 — 한 종류의 키라도 빠지면 투영본에서 메타 게이트가
 * '신설/누락/소멸' 로 red 가 되고, 산출물 전체가 못 쓰게 된다.
 *
 * ⚠ 이것은 가설이 아니라 실측이다. 2026-09-12 demo 프로필(제거 java 0) 투영본에서
 * `./gradlew :api-server:harnessTest` 를 실제로 돌리니 **신설 136 · 누락 54 · 소멸 54** 였다.
 * 원인은 DEC-OPS-027(2026-09-01)이 census 를 ArchUnit 계층·게이트 태그·`__sourceHash`·`__registry.*`·
 * testFixtures·migration-tool·숫자 상수로 넓혔는데 생성기가 따라가지 않은 것이다.
 * v0.1.0(2026-08-24) 이후 산출물을 재생성한 적이 없어 **아무도 몰랐다**.
 *
 * 이 계약은 그 드리프트를 **산출물 생성 시점이 아니라 main 에서** 잡는다: 저장소 자신에 대해
 * 생성기의 계산이 커밋된 매니페스트와 정확히 같아야 한다. 메타 게이트가 바뀌면 커밋된 매니페스트가
 * 바뀌고, 생성기를 함께 고치지 않으면 여기서 즉시 red 다.
 *
 * 같은 계산으로 매니페스트를 다시 쓰는 개발 도구(`scripts/harness-baseline-manifest.mjs`)와 생성기는 같은 렌더 함수
 * (`scripts/harness-baseline-manifest-format.mjs`)로 쓴다. 바이트 시험은 그 함수가 커밋본과 같은 키 순서(Java TreeMap 의
 * 코드 단위 순서)와 `키=값` 줄을 내는지 본다. 머리 주석은 커밋본에서 가져오고 줄 끝은 LF 로 맞춘 뒤 비교하므로 그 둘은
 * 바이트 비교의 대상이 아니다 — 머리 주석 보존과 LF 출력은 도구 fixture 시험이 보고, 기본 머리 주석(매니페스트가 없을 때
 * 쓴다)이 JVM 산출 파일의 2줄과 같은지는 바이트 시험의 별도 단언이 본다. 권위는 계속 JVM 메타 게이트다.
 *
 * 해소 방법은 둘 중 하나이며, 둘 다 diff 에 의도를 남긴다.
 *   ① 메타 게이트를 바꿨다면 생성기의 미러(HARNESS_SCAN_ROOTS·ARCH_RULE_FILE_PATTERN·GATE_REGISTRIES·
 *      GATE_HOOKS·상수 정규식·stripJavaComments)를 같은 변경에서 맞춘다.
 *   ② 소스만 바꿨다면 `node scripts/harness-baseline-manifest.mjs --write` 로 매니페스트를 다시 쓰고 바뀐 키가
 *      모두 정당한지 본다. 병합에서 같은 키가 충돌했으면 `--keys <키…>` 로 그 키의 계산값만 보고 그 값만 옮긴다
 *      (오케스트레이션 프로토콜 §6.4 — 통째로 다시 쓰지 않는다).
 */
let computed;
const computedEntries = () => (computed ??= computeHarnessBaselineEntries(ROOT));

function describeDifference(expected, actual) {
  const missing = [...expected.keys()].filter((key) => !actual.has(key));
  const added = [...actual.keys()].filter((key) => !expected.has(key));
  const changed = [...expected.entries()]
    .filter(([key, value]) => actual.has(key) && actual.get(key) !== value)
    .map(([key, value]) => `${key}: 매니페스트=${value} ↔ 생성기=${actual.get(key)}`);
  const sample = (list) => list.slice(0, 12).map((item) => `    - ${item}`).join('\n')
    + (list.length > 12 ? `\n    … 외 ${list.length - 12}건` : '');
  const sections = [];
  if (missing.length) sections.push(`  생성기가 못 만든 키 ${missing.length}건 (투영본에서 '소멸 감지'):\n${sample(missing)}`);
  if (added.length) sections.push(`  생성기만 만든 키 ${added.length}건 (투영본에서 '신설 감지'):\n${sample(added)}`);
  if (changed.length) sections.push(`  값이 다른 키 ${changed.length}건 (투영본에서 '변경 감지'):\n${sample(changed)}`);
  return sections.join('\n');
}

test('generator harness baseline mirrors the meta gate exactly for this repository', () => {
  const expected = parseManifest(readFileSync(MANIFEST, 'utf8'));
  const actual = computedEntries();

  assert.ok(
    expected.size > 300,
    `커밋된 매니페스트가 비정상적으로 작다(${expected.size}) — 이 계약이 vacuous 해진다`,
  );
  assert.ok(
    actual.size > 300,
    `생성기 계산이 비정상적으로 작다(${actual.size}) — 스캔이 조용히 붕괴했을 수 있다`,
  );

  const difference = describeDifference(expected, actual);
  assert.equal(
    difference,
    '',
    '\n생성기의 harness baseline 계산이 메타 게이트와 어긋났다.\n'
      + difference
      + '\n\n조치: 메타 게이트를 바꿨다면 scripts/reusable-source-harness.mjs 의 미러를 같은 변경에서 맞추고,\n'
      + '소스만 바꿨다면 node scripts/harness-baseline-manifest.mjs --write 로 매니페스트를 다시 쓰고 바뀐 키가 모두 정당한지 보십시오.\n'
      + '병합에서 같은 키가 충돌했으면 --keys <키…> 로 그 키의 계산값만 옮기십시오(통째로 다시 쓰지 않는다, §6.4).\n',
  );
});

test('the manifest tool writes exactly the committed bytes for this repository', () => {
  // 기본 머리 주석은 메타 게이트가 산출 파일에 쓰는 두 줄(`w.write("# …")`)과 같다.
  const jvmHeader = [...readFileSync(join(ROOT, META_GATE_SOURCE), 'utf8').matchAll(/\bw\.write\("(#[^"]*)"\)/g)]
    .map(match => match[1]);
  assert.deepEqual(jvmHeader, [...DEFAULT_HEADER],
    `기본 머리 주석이 ${META_GATE_SOURCE} 의 산출 파일 머리 주석과 다르다 — 형식 모듈의 DEFAULT_HEADER 를 함께 고친다.`);

  // 로컬 체크아웃은 core.autocrlf 로 CRLF 일 수 있다. 커밋되는 내용(LF)과 같은지를 본다 — CI 체크아웃은 그대로 LF 다.
  const committed = readFileSync(MANIFEST, 'utf8').replaceAll('\r\n', '\n');
  const rendered = renderHarnessBaselineManifest(computedEntries(), manifestHeader(committed));
  if (rendered === committed) return;
  const [left, right] = [rendered.split('\n'), committed.split('\n')];
  const at = left.findIndex((line, index) => line !== right[index]);
  assert.fail(`도구가 쓰는 매니페스트가 커밋본과 다르다(첫 차이 ${at + 1}행).\n`
    + `  도구: ${JSON.stringify(left[at]?.slice(0, 160))}\n  커밋: ${JSON.stringify(right[at]?.slice(0, 160))}\n`
    + '키 값이 다르면 위 시험의 조치를 따르고, 값이 같은데 순서·머리 주석·줄 끝만 다르면 도구의 쓰기 형식이 JVM 산출 파일에서 벗어난 것이다.');
});

test('the mirror notices a meta gate census that the generator does not follow', () => {
  const expected = parseManifest(readFileSync(MANIFEST, 'utf8'));

  // 메타 게이트가 새 키 종류를 도입했는데 생성기가 따라가지 않은 상황을 합성한다.
  const drifted = new Map(expected);
  drifted.set('api-server/SomeNewLinterTest.__sourceHash', 'deadbeefcafe');
  assert.notEqual(describeDifference(drifted, computedEntries()), '');

  // 반대로 생성기가 없는 키를 만들어 내는 상황(투영본의 '신설 감지')도 잡아야 한다.
  const shrunk = new Map(expected);
  const victim = [...shrunk.keys()].find((key) => key.endsWith('.__sourceHash'));
  assert.ok(victim, '__sourceHash 키가 하나는 있어야 이 부정 테스트가 성립한다');
  shrunk.delete(victim);
  assert.notEqual(describeDifference(shrunk, computedEntries()), '');
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
  const committed = ['# 머리 1', '# 머리 2', '__harness.classes=api-server/A,api-server/B',
    '__registry.config/governance/gates.json=111111111111', 'api-server/A.X=1:aaaaaaaaaaaa', ''].join('\n');
  writeFileSync(file, committed);
  // 원장 하나를 고치고 매니페스트를 다시 쓰지 않은 상태 — 계산값만 바뀐다.
  const actual = new Map([
    ['__harness.classes', 'api-server/A,api-server/C'],
    ['__registry.config/governance/gates.json', '222222222222'],
    ['api-server/A.X', '1:aaaaaaaaaaaa'],
    ['api-server/C.aB', '0:cccccccccccc'],
    ['api-server/C.Y_Z', '0:dddddddddddd'],
  ]);
  const run = (...argv) => {
    const out = [];
    const code = manifestTool(argv, { root, compute: () => actual, log: line => out.push(line), error: line => out.push(line) });
    return { code, out: out.join('\n') };
  };

  const check = run('--check');
  assert.equal(check.code, 1, 'a registry edit without rewriting the manifest is red');
  for (const line of ['변경 __registry.config/governance/gates.json: 111111111111 → 222222222222', '신설 api-server/C.Y_Z',
    '클래스 신설 api-server/C', '클래스 소멸 api-server/B']) {
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
  // 머리 주석은 그대로, 키는 Java TreeMap 과 같은 코드 단위 순서('C.Y_Z' < 'C.aB'), 줄 끝은 LF.
  assert.equal(readFileSync(file, 'utf8'), ['# 머리 1', '# 머리 2', '__harness.classes=api-server/A,api-server/C',
    '__registry.config/governance/gates.json=222222222222', 'api-server/A.X=1:aaaaaaaaaaaa',
    'api-server/C.Y_Z=0:dddddddddddd', 'api-server/C.aB=0:cccccccccccc', ''].join('\n'));
  assert.equal(run('--check').code, 0);

  const checkedOut = readFileSync(file, 'utf8').replaceAll('\n', '\r\n');
  writeFileSync(file, checkedOut);
  assert.equal(run('--write').code, 0);
  assert.equal(readFileSync(file, 'utf8'), checkedOut, 'a manifest that differs only in line endings is left alone');

  for (const argv of [[], ['--check', '--write'], ['--keys']]) assert.equal(run(...argv).code, 2, JSON.stringify(argv));
});
