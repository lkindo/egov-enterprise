import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeHarnessBaselineEntries } from './generate-reusable-base-source.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(ROOT, 'api-server/src/test/resources/harness/baseline-manifest.properties');

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
 * 해소 방법은 둘 중 하나이며, 둘 다 diff 에 의도를 남긴다.
 *   ① 메타 게이트를 바꿨다면 생성기의 미러(HARNESS_SCAN_ROOTS·ARCH_RULE_FILE_PATTERN·GATE_REGISTRIES·
 *      GATE_HOOKS·상수 정규식·stripJavaComments)를 같은 변경에서 맞춘다.
 *   ② 소스만 바꿨다면 `./gradlew :api-server:harnessTest` 가 산출한
 *      `api-server/build/harness/baseline-manifest.actual.properties` 를 매니페스트로 복사한다
 *      (경로가 api-server/ 아래인 것은 그 테스트의 작업 디렉터리가 모듈 루트이기 때문이다).
 */
function parseManifest(text) {
  const entries = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const separator = line.indexOf('=');
    if (separator < 0) continue;
    entries.set(line.slice(0, separator), line.slice(separator + 1));
  }
  return entries;
}

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
  const actual = computeHarnessBaselineEntries(ROOT);

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
      + '\n\n조치: 메타 게이트를 바꿨다면 scripts/generate-reusable-base-source.mjs 의 미러를 같은 변경에서 맞추고,\n'
      + '소스만 바꿨다면 ./gradlew :api-server:harnessTest 의 api-server/build/harness/baseline-manifest.actual.properties 를\n'
      + 'api-server/src/test/resources/harness/baseline-manifest.properties 로 복사하십시오.\n',
  );
});

test('the mirror notices a meta gate census that the generator does not follow', () => {
  const expected = parseManifest(readFileSync(MANIFEST, 'utf8'));

  // 메타 게이트가 새 키 종류를 도입했는데 생성기가 따라가지 않은 상황을 합성한다.
  const drifted = new Map(expected);
  drifted.set('api-server/SomeNewLinterTest.__sourceHash', 'deadbeefcafe');
  assert.notEqual(describeDifference(drifted, computeHarnessBaselineEntries(ROOT)), '');

  // 반대로 생성기가 없는 키를 만들어 내는 상황(투영본의 '신설 감지')도 잡아야 한다.
  const shrunk = new Map(expected);
  const victim = [...shrunk.keys()].find((key) => key.endsWith('.__sourceHash'));
  assert.ok(victim, '__sourceHash 키가 하나는 있어야 이 부정 테스트가 성립한다');
  shrunk.delete(victim);
  assert.notEqual(describeDifference(shrunk, computeHarnessBaselineEntries(ROOT)), '');
});
