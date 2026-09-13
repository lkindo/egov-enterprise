/**
 * pack 태그 원장 공용 판정(scripts/pack-tagged-registry.mjs)과 그 판정이 기대는 생성기 Java 의존 판정의 계약.
 *
 * 세 원장 계약(개인정보 접근·교차 도메인 결합·입력 계약 미러)이 공유하는 성질만 여기서 한 번 증명한다:
 * 게이트 파일은 어떤 rank 누적 프로필에서도 지워지지 않는다, 실제 프로필의 Java 게이트 제거 승인은 계획과 exact 하다,
 * 생성기의 의존 판정은 주석·리터럴 속 인용을 무시하되 실제 코드 참조는 놓치지 않는다, 투영 모드는 위장할 수 없다.
 */
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { stripJavaCommentsAndStringLiterals } from './generate-reusable-base-source.mjs';
import {
  JAVA_POPULATION_FLOOR,
  acknowledgedJavaGateMismatches,
  buildPrefixPlans,
  detectProjection,
  evaluateEntryTags,
  evaluateGateSurvival,
  evaluateProjectionPresence,
  normalize,
  repositoryContext,
} from './pack-tagged-registry.mjs';

export const PACK_TAGGED_GATE_FILES = [
  'api-server/src/test/java/nuri/api/harness/PrivacyAccessCensusLinterTest.java',
  'api-server/src/test/java/nuri/api/harness/CrossDomainCouplingLinterTest.java',
  'api-server/src/test/java/nuri/api/harness/InputContractMirrorLinterTest.java',
];

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'pack-tagged-registry-'));
  for (const [rel, source] of Object.entries(files)) {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), source, 'utf8');
  }
  return root;
}

const FIXTURE_MANIFEST = {
  packs: { core: { rank: 0 }, demo: { rank: 1, backend: { appDomains: ['addressbook'] } } },
  profiles: { core: { packs: ['core'] }, demo: { packs: ['core', 'demo'] } },
};
const REMOVED_DTO = 'business-app/src/main/java/nuri/business/service/addressbook/dto/AddressBookDto.java';
const GATE = 'api-server/src/test/java/nuri/api/harness/SampleGateLinterTest.java';
const IMPORT_LINE = ['import', 'nuri.business.service.addressbook.dto.AddressBookDto;'].join(' ');
const TEXT_BLOCK_QUOTE = '"'.repeat(3);

function gateSurvivesIn(gateSource) {
  const root = fixture({
    [REMOVED_DTO]: 'package nuri.business.service.addressbook.dto;\npublic class AddressBookDto {}\n',
    [GATE]: gateSource,
  });
  try {
    const plans = buildPrefixPlans(root, FIXTURE_MANIFEST, undefined);
    return evaluateGateSurvival({ root, prefixPlans: plans, gateFiles: [GATE] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const gateWith = (body) => `package nuri.api.harness;\n\n${body}\n@Tag("governance-harness")\nclass SampleGateLinterTest {\n  void check() { int kept = 1; }\n}\n`;

test('저장소 모집단이 생성기 판정을 대표할 만큼 크고 투영 모드가 아니다', () => {
  const { javaFiles, projection, prefixPlans } = repositoryContext();
  if (projection) {
    assert.ok(javaFiles.length > 0, '투영본 모집단이 비었다');
    return;
  }
  assert.ok(javaFiles.length >= JAVA_POPULATION_FLOOR, `java 모집단 ${javaFiles.length} < ${JAVA_POPULATION_FLOOR}`);
  assert.ok(prefixPlans.length >= 2, 'rank 누적 프로필이 둘 이상이어야 태그를 구분할 수 있다');
});

test('pack 태그 원장 게이트 파일은 어떤 rank 누적 프로필에서도 제거되지 않는다', () => {
  const { root, projection, prefixPlans, javaFiles } = repositoryContext();
  if (projection) {
    const missing = evaluateProjectionPresence({
      entries: PACK_TAGGED_GATE_FILES.map((file) => ({ label: file, pack: 'always', sources: [join(root, file)] })),
      presentPacks: new Set(['always']),
    });
    assert.deepEqual(missing, []);
    return;
  }
  assert.deepEqual(evaluateGateSurvival({ root, prefixPlans, gateFiles: PACK_TAGGED_GATE_FILES, javaFiles }), []);
  const renamed = 'api-server/src/test/java/nuri/api/harness/RenamedAwayLinterTest.java';
  assert.deepEqual(evaluateGateSurvival({ root, prefixPlans, gateFiles: [renamed], javaFiles }),
    [`${renamed} 가 Java 모집단에 없다 — 개명·이동이면 게이트 목록을 갱신하라`], '없는 게이트 파일은 조용히 통과하지 않는다');
});

test('실제 프로필의 Java 게이트 제거 승인은 계획과 exact 일치한다', () => {
  const { root, manifest, projection, javaFiles } = repositoryContext();
  if (projection) {
    // 투영본은 제거가 끝났다 — 승인 목록의 Java 파일이 실제로 없어야 한다.
    const lingering = Object.values(manifest.profiles)
      .flatMap((profile) => profile.acknowledgedRemovedGates ?? [])
      .map((entry) => entry.file)
      .filter((file) => file.endsWith('.java'))
      .filter((file) => evaluateProjectionPresence({
        entries: [{ label: file, pack: 'gone', sources: [join(root, file)] }],
        presentPacks: new Set(),
      }).length > 0);
    assert.deepEqual(lingering, []);
    return;
  }
  assert.deepEqual(acknowledgedJavaGateMismatches({ root, manifest, javaFiles }), []);
});

test('생성기 의존 판정: 주석·리터럴·텍스트 블록 속 import 인용은 게이트를 지우지 않는다', () => {
  const quotes = {
    javadoc: gateWith(`/**\n * ${IMPORT_LINE}\n */`),
    lineComment: gateWith(`// ${IMPORT_LINE}`),
    stringLiteral: gateWith(`class Holder { String s = "${IMPORT_LINE}"; }`),
    textBlock: gateWith(`class Holder { String s = ${TEXT_BLOCK_QUOTE}\n    ${IMPORT_LINE}\n    ${TEXT_BLOCK_QUOTE}; }`),
    // `\"""` 는 이스케이프된 따옴표 + 따옴표 둘이라 텍스트 블록을 닫지 않는다(`\""""` 였다면 닫힌다).
    textBlockWithQuotes: gateWith(`class Holder { String s = ${TEXT_BLOCK_QUOTE}\n    {"a":"b"} \\${TEXT_BLOCK_QUOTE}\n    ${IMPORT_LINE}\n    ${TEXT_BLOCK_QUOTE}; }`),
  };
  for (const [name, source] of Object.entries(quotes)) {
    assert.deepEqual(gateSurvivesIn(source), [], `${name}: 인용은 의존이 아니다`);
  }
});

test('생성기 의존 판정 대조군: 실제 import·코드 속 FQN·와일드카드 import 는 게이트를 지운다', () => {
  const references = {
    realImport: `package nuri.api.harness;\n${IMPORT_LINE}\n@Tag("governance-harness")\nclass SampleGateLinterTest { AddressBookDto dto; }\n`,
    inlineFqn: gateWith('class Holder { nuri.business.service.addressbook.dto.AddressBookDto dto; }'),
    wildcardImport: `package nuri.api.harness;\nimport nuri.business.service.addressbook.dto.*;\n@Tag("governance-harness")\nclass SampleGateLinterTest { AddressBookDto dto; }\n`,
    // 텍스트 블록 **뒤의** 실제 코드 참조 — 텍스트 블록 처리가 파일 끝까지 삼키면 이 경우가 조용히 통과한다.
    referenceAfterTextBlock: gateWith(`class Holder {\n  String s = ${TEXT_BLOCK_QUOTE}\n    {"a":"b"}\n    ${TEXT_BLOCK_QUOTE};\n  nuri.business.service.addressbook.dto.AddressBookDto dto;\n}`),
  };
  for (const [name, source] of Object.entries(references)) {
    const violations = gateSurvivesIn(source);
    assert.equal(violations.length, 1, `${name}: ${JSON.stringify(violations)}`);
    assert.match(violations[0], /^\[core\] 에서 .*SampleGateLinterTest\.java 가 제거된다/);
  }
});

test('리터럴 제거는 텍스트 블록 경계만 비우고 뒤따르는 코드를 보존한다', () => {
  const source = `String a = ${TEXT_BLOCK_QUOTE}\n  "quoted" \\${TEXT_BLOCK_QUOTE} still inside\n  ${TEXT_BLOCK_QUOTE}; int after = 1; char c = '"'; String b = "x";`;
  const stripped = stripJavaCommentsAndStringLiterals(source);
  assert.ok(!stripped.includes('quoted') && !stripped.includes('still inside'), stripped);
  assert.ok(stripped.includes('int after = 1;'), stripped);
  assert.ok(stripped.includes('String b = "";'), stripped);
});

test('pack 태그 대조: 소스가 모두 살아남는 것과 pack 소속이 같아야 한다', () => {
  const plans = [
    { profile: { packs: ['core'] }, plan: { removed: new Set(['/gone.java']), removalReason: new Map([['/gone.java', '합성']]) } },
    { profile: { packs: ['core', 'demo'] }, plan: { removed: new Set(), removalReason: new Map() } },
  ];
  assert.deepEqual(evaluateEntryTags({ prefixPlans: plans, entries: [
    { label: 'kept', pack: 'core', sources: ['/kept.java'] },
    { label: 'mixed', pack: 'demo', sources: ['/kept.java', '/gone.java'] },
  ] }), []);
  const wrong = evaluateEntryTags({ prefixPlans: plans, entries: [
    { label: 'mixed', pack: 'core', sources: ['/kept.java', '/gone.java'] },
    { label: 'kept', pack: 'demo', sources: ['/kept.java'] },
    { label: 'empty', pack: 'core', sources: [] },
  ] });
  assert.ok(wrong.some((line) => /^mixed \(pack=core\) 는 프로필 \[core\] 에서 제거된다 — 합성/.test(line)), wrong.join('\n'));
  assert.ok(wrong.some((line) => /^kept \(pack=demo\) 는 프로필 \[core\] 에서 남는다/.test(line)), wrong.join('\n'));
  assert.ok(wrong.some((line) => /^empty: 판정할 소스 파일이 없다/.test(line)), wrong.join('\n'));
});

test('투영본 존재 대조: 남은 pack 은 소스가 모두 있고 빠진 pack 은 하나라도 없어야 한다', () => {
  const exists = (path) => path !== '/gone.java';
  assert.deepEqual(evaluateProjectionPresence({ exists, presentPacks: new Set(['core']), entries: [
    { label: 'kept', pack: 'core', sources: ['/kept.java'] },
    { label: 'dropped', pack: 'demo', sources: ['/kept.java', '/gone.java'] },
  ] }), []);
  const wrong = evaluateProjectionPresence({ exists, presentPacks: new Set(['core']), entries: [
    { label: 'stale', pack: 'core', sources: ['/gone.java'] },
    { label: 'mistag', pack: 'demo', sources: ['/kept.java'] },
  ] });
  assert.equal(wrong.length, 2, wrong.join('\n'));
});

test('투영 모드는 manifest 필드 하나로 위장할 수 없다', () => {
  const { manifest } = repositoryContext();
  if (detectProjection(manifest).projection) return;
  const spoofed = structuredClone(manifest);
  spoofed.sourcePolicy = { ...spoofed.sourcePolicy, generatedProfile: 'core' };
  assert.throws(() => detectProjection(spoofed), /생성기 투영 구조가 아니다/);

  const projected = {
    sourcePolicy: { generatedProfile: 'core' },
    profiles: { core: { packs: ['core'] } },
    packs: { core: { rank: 0 } },
  };
  assert.deepEqual(detectProjection(projected), { projection: true, profile: 'core' });
  assert.throws(() => detectProjection({ ...projected, packs: { core: {}, demo: {} } }), /생성기 투영 구조가 아니다/);
  assert.equal(normalize('a\\b'.replaceAll('\\', '/')), 'a/b');
});
