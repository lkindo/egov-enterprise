/**
 * 횡단 게이트 원장 공용 판정(scripts/pack-tagged-registry.mjs)과 그 판정이 기대는 생성기 Java 의존 판정의 계약.
 *
 * 세 원장 계약(개인정보 접근·교차 도메인 결합·입력 계약 미러)이 공유하는 성질만 여기서 한 번 증명한다:
 * 게이트 파일은 어떤 구성에서도 지워지지 않는다, 소유 파생 기대 생존은 계획과 양방향으로 대조된다, 생성기의 의존 판정은 주석·리터럴 속
 * 인용을 무시하되 실제 코드 참조는 놓치지 않는다, 계획은 파일마다 원문을 한 번만 읽고 공유한 읽기와 같은 계획을 낸다, 투영 모드는
 * 위장할 수 없다.
 * 시작 구성의 Java 게이트 제거 승인과 Java 연쇄가 presets.json 의 목록과 exact 한지(R4)는 저장소에서는
 * project-composer-preset-equivalence.test.mjs 가 정밀 점검의 차단 사유로 본다(교체·누락의 red 증명은 deep-failure-points). 여기에는
 * 그 시험이 돌지 않는 투영본(생성물)의 확인만 남는다 — 승인 목록에 적힌 파일이 실제로 없어야 한다.
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { requiresClosure, sourceOwner, stripComments } from './project-composer-integrations.mjs';
import { assertJavaCascadeAcknowledged, javaCascadeAcknowledgement } from './reusable-source-gates.mjs';
import { planJavaRemoval, stripJavaCommentsAndStringLiterals } from './reusable-source-java.mjs';
import {
  JAVA_POPULATION_FLOOR,
  compositionOwnerOf,
  evaluateExpectedSurvival,
  evaluateGateSurvival,
  evaluateRecordedPresence,
  contextSourceReader,
  ledgerEntries,
  normalize,
  readRepoJson,
  recordedSources,
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

const FIXTURE_OWNERSHIP = { domains: ['addressbook'], supportFiles: new Map() };
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
    const plan = planJavaRemoval(root, FIXTURE_OWNERSHIP, { resolvedDomains: [] }, undefined);
    return evaluateGateSurvival({ root, compositions: [{ name: 'preset core', plan }], gateFiles: [GATE] });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const gateWith = (body) => `package nuri.api.harness;\n\n${body}\n@Tag("governance-harness")\nclass SampleGateLinterTest {\n  void check() { int kept = 1; }\n}\n`;

test('저장소 모집단이 생성기 판정을 대표할 만큼 크고 구성은 시작 구성 전부다', async () => {
  const { javaFiles, projection, presets, compositions, catalog } = await repositoryContext();
  if (projection) {
    assert.ok(javaFiles.length > 0, '투영본 모집단이 비었다');
    return;
  }
  assert.ok(javaFiles.length >= JAVA_POPULATION_FLOOR, `java 모집단 ${javaFiles.length} < ${JAVA_POPULATION_FLOOR}`);
  assert.deepEqual(presets.map((row) => row.preset), catalog.presets.map((preset) => preset.id), '시작 구성을 하나도 빠뜨리지 않는다');
  assert.ok(presets.length >= 2, '시작 구성이 둘 이상이어야 남고 빠지는 기대를 가를 수 있다');
  assert.equal(compositions, presets, '대조 구성은 시작 구성뿐이다(13b 전의 설문 합성 구성은 공통 기반 + 설문 시작 구성이 대신한다)');
  // 설문 소유를 다른 기능으로 잘못 정한 원장 항목은 설문과 그 기능을 가르는 구성에서만 드러난다(DEC-OPS-090). 13b 전에는 시작 구성
  // 셋이 설문을 다른 demo 전용 기능과 늘 함께 넣거나 빼서 합성 구성을 따로 돌았다. 이제 시작 구성 가운데 하나가 그 일을 해야 한다.
  const unsplit = catalog.capabilities.map((capability) => capability.id).filter((domain) => domain !== 'survey')
    .filter((domain) => presets.every((row) => row.selected.has(domain) === row.selected.has('survey')));
  assert.deepEqual(unsplit, [], '설문과 늘 함께 들고 나는 기능이 있다 — 설문 소유 오인을 가를 시작 구성이 없다');
});

test('원장 게이트 파일은 어떤 구성에서도 제거되지 않는다', async () => {
  const { root, projection, compositions, javaFiles } = await repositoryContext();
  if (projection) {
    assert.deepEqual(PACK_TAGGED_GATE_FILES.filter((file) => !existsSync(join(root, file))), []);
    return;
  }
  assert.deepEqual(evaluateGateSurvival({ root, compositions, gateFiles: PACK_TAGGED_GATE_FILES, javaFiles }), []);
  const renamed = 'api-server/src/test/java/nuri/api/harness/RenamedAwayLinterTest.java';
  assert.deepEqual(evaluateGateSurvival({ root, compositions, gateFiles: [renamed], javaFiles }),
    [`${renamed} 가 Java 모집단에 없다 — 개명·이동이면 게이트 목록을 갱신하라`], '없는 게이트 파일은 조용히 통과하지 않는다');
});

// 시작 구성의 게이트·연쇄 제거 승인 exact 대조(R4)는 저장소에서 project-composer-preset-equivalence.test.mjs 가 본다(위 docblock).
// 이 계약이 같은 판정을 Java 게이트에만 다시 하던 사본은 걷었다(거버넌스 총량 관리). 그 시험이 돌지 않는 투영본만 여기서 확인한다.
test('투영본: 활성 구성의 승인 목록에 적힌 Java 게이트와 연쇄 제거 파일은 실제로 없다', async (t) => {
  const { root, projection, active } = await repositoryContext();
  if (!projection) {
    t.diagnostic('저장소의 exact 대조는 project-composer-preset-equivalence.test.mjs 가 정밀 점검 차단 사유로 한다');
    return;
  }
  // 투영본은 제거가 끝났다 — 활성 구성의 승인 목록에 적힌 Java 게이트와 연쇄 목록의 파일이 실제로 없어야 한다.
  const lingering = (active.expected?.gates ?? []).map((entry) => entry.file)
    .filter((file) => file.endsWith('.java') && existsSync(join(root, file)));
  assert.deepEqual(lingering, []);
  assert.deepEqual((active.expected?.javaCascade ?? []).filter((file) => existsSync(join(root, file))), []);
});

test('Java 연쇄 승인 대조는 승인 밖 연쇄, 낡은 승인, 중복, 형식 오류를 모두 낸다', () => {
  const profile = { acknowledgedJavaCascade: ['a/A.java', 'b/B.java'] };
  assert.deepEqual(javaCascadeAcknowledgement(profile, ['a/A.java', 'b/B.java']),
    { invalidEntries: [], duplicates: [], unacknowledged: [], stale: [] });
  assert.deepEqual(javaCascadeAcknowledgement(profile, ['a/A.java', 'b/B.java', 'c/C.java']).unacknowledged, ['c/C.java']);
  assert.deepEqual(javaCascadeAcknowledgement(profile, ['a/A.java']).stale, ['b/B.java']);
  assert.deepEqual(javaCascadeAcknowledgement({ acknowledgedJavaCascade: ['a/A.java', 'a/A.java'] }, ['a/A.java']).duplicates, ['a/A.java']);
  assert.deepEqual(javaCascadeAcknowledgement({ acknowledgedJavaCascade: [{ file: 'a/A.java' }, 'x.ts'] }, []).invalidEntries,
    [{ file: 'a/A.java' }, 'x.ts']);
  // 문자열 하나는 1개짜리 목록이 아니라 형식 오류다(연쇄가 정확히 1개여도 통과하지 않는다).
  assert.deepEqual(javaCascadeAcknowledgement({ acknowledgedJavaCascade: 'a/A.java' }, ['a/A.java']),
    { invalidEntries: ['a/A.java'], duplicates: [], unacknowledged: ['a/A.java'], stale: [] });
  // 목록이 없는 프로필은 연쇄가 없을 때만 통과한다(demo).
  assert.deepEqual(javaCascadeAcknowledgement({}, ['a/A.java']).unacknowledged, ['a/A.java']);

  // 생성기의 생성 시점 대조도 같은 판정이다 — 승인 밖 연쇄는 사유와 함께, 낡은 승인은 따로 실패한다.
  const java = { cascadeRemoved: [{ file: 'a/A.java', reason: 'nuri.business.service.board.BoardService 참조' }] };
  assert.doesNotThrow(() => assertJavaCascadeAcknowledged('core', { acknowledgedJavaCascade: ['a/A.java'] }, java));
  assert.throws(() => assertJavaCascadeAcknowledged('core', {}, java), /승인하지 않은 Java 파일을 연쇄로 지운다[\s\S]*BoardService 참조/u);
  assert.throws(() => assertJavaCascadeAcknowledged('core', { acknowledgedJavaCascade: ['a/A.java', 'b/B.java'] }, java),
    /더 이상 연쇄로 지워지지 않는 파일[\s\S]*b\/B\.java/u);
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
    assert.match(violations[0], /^preset core 에서 .*SampleGateLinterTest\.java 가 제거된다/);
  }
});

test('리터럴 제거는 텍스트 블록 경계만 비우고 뒤따르는 코드를 보존한다', () => {
  const source = `String a = ${TEXT_BLOCK_QUOTE}\n  "quoted" \\${TEXT_BLOCK_QUOTE} still inside\n  ${TEXT_BLOCK_QUOTE}; int after = 1; char c = '"'; String b = "x";`;
  const stripped = stripJavaCommentsAndStringLiterals(source);
  assert.ok(!stripped.includes('quoted') && !stripped.includes('still inside'), stripped);
  assert.ok(stripped.includes('int after = 1;'), stripped);
  assert.ok(stripped.includes('String b = "";'), stripped);
});

/*
 * 계획의 원문 읽기(GEN-01·F2): 한 호출 안에서 형식 판정·게이트 판정·의존 색인이 같은 원문을 쓴다. 읽기는 파일마다 한 번이고 넘긴 읽기
 * (readSource)를 지난다 — 어느 단계든 디스크를 따로 읽으면 아래 '디스크와 다른 원문' 이 그 단계에서 어긋나 붉다.
 */
const READ_DTO = 'business-app/src/main/java/nuri/business/service/addressbook/dto/AddressBookDto.java';
const READ_BOARD = 'business-app/src/main/java/nuri/business/service/board/BoardService.java';
const READ_CONSUMER = 'api-server/src/main/java/nuri/api/support/Consumer.java';
const READ_SECOND = 'api-server/src/main/java/nuri/api/support/SecondConsumer.java';
const READ_BOARD_USER = 'api-server/src/main/java/nuri/api/support/BoardUser.java';
const READ_GATE = 'api-server/src/test/java/nuri/api/schema/SampleIntegrationTest.java';
const READ_CORE = 'business-core/src/main/java/nuri/business/service/user/CoreThing.java';
const importOf = (type) => ['import', `${type};`].join(' ');
const READ_OWNERSHIP = { domains: ['addressbook', 'board'], supportFiles: new Map() };
// 계획이 봐야 하는 원문. Consumer 는 제외 기능 타입을 import 하고(연쇄), SecondConsumer 는 Consumer 를 import 하며(형식 판정이 원문의
// 패키지를 써야 이어진다), 시험 파일은 태그로만 게이트다(게이트 판정이 원문을 써야 게이트다).
const READ_SOURCES = {
  [READ_DTO]: 'package nuri.business.service.addressbook.dto;\npublic class AddressBookDto {}\n',
  [READ_BOARD]: 'package nuri.business.service.board;\npublic class BoardService {}\n',
  [READ_CONSUMER]: `package nuri.api.support;\n${importOf('nuri.business.service.addressbook.dto.AddressBookDto')}\npublic class Consumer { AddressBookDto dto; }\n`,
  [READ_SECOND]: `package nuri.api.support.second;\n${importOf('nuri.api.support.Consumer')}\npublic class SecondConsumer { Consumer consumer; }\n`,
  [READ_BOARD_USER]: `package nuri.api.support;\n${importOf('nuri.business.service.board.BoardService')}\npublic class BoardUser { BoardService service; }\n`,
  [READ_GATE]: 'package nuri.api.schema;\n@Tag("schema-validation")\nclass SampleIntegrationTest {}\n',
  [READ_CORE]: 'package nuri.business.service.user;\npublic class CoreThing {}\n',
};
const planShape = (root, plan) => {
  const rel = (path) => normalize(path.slice(root.length + 1));
  return {
    removed: [...plan.removed].map(rel).sort(), direct: [...plan.direct].map(rel).sort(),
    reasons: [...plan.removalReason].map(([path, reason]) => `${rel(path)} <- ${reason}`).sort(),
    gates: [...plan.gateSources].map(rel).sort(), types: [...plan.removedTypes].sort(),
  };
};

test('계획은 한 호출 안에서 파일마다 원문을 한 번 읽고, 모든 판정이 넘긴 읽기의 원문을 쓴다', () => {
  // 디스크에는 다른 원문을 둔다 — 연쇄 import 도, 원문 패키지도, 게이트 태그도 없다.
  const root = fixture({
    ...READ_SOURCES,
    [READ_CONSUMER]: 'package nuri.api.elsewhere;\npublic class Consumer {}\n',
    [READ_GATE]: 'package nuri.api.schema;\nclass SampleIntegrationTest {}\n',
  });
  try {
    const javaFiles = Object.keys(READ_SOURCES).map((file) => join(root, file));
    const counts = new Map();
    const readSource = (path) => {
      counts.set(path, (counts.get(path) ?? 0) + 1);
      return READ_SOURCES[normalize(path.slice(root.length + 1))];
    };
    const plan = planJavaRemoval(root, READ_OWNERSHIP, { resolvedDomains: ['board'] }, javaFiles, { readSource });
    assert.deepEqual([...counts.values()], javaFiles.map(() => 1), '파일마다 한 번만 읽는다');
    assert.deepEqual(counts.size, javaFiles.length);
    const shape = planShape(root, plan);
    assert.ok(shape.reasons.includes(`${READ_CONSUMER} <- nuri.business.service.addressbook.dto.AddressBookDto 참조`), JSON.stringify(shape));
    // 형식 판정이 디스크의 패키지(nuri.api.elsewhere)를 쓰면 SecondConsumer 는 이어지지 않는다.
    assert.ok(shape.reasons.includes(`${READ_SECOND} <- nuri.api.support.Consumer 참조`), JSON.stringify(shape));
    assert.ok(shape.gates.includes(READ_GATE), '게이트 판정이 넘긴 읽기의 원문(태그)을 쓴다');
    assert.ok(!shape.removed.includes(READ_BOARD_USER), '선택한 기능의 타입을 참조하는 파일은 남는다');
    // 대조군: 디스크 원문으로 읽으면(기본 읽기) 연쇄도 게이트도 없다 — 위 단언이 넘긴 읽기 때문에 성립했다는 증거다.
    const fromDisk = planShape(root, planJavaRemoval(root, READ_OWNERSHIP, { resolvedDomains: ['board'] }, javaFiles));
    assert.ok(!fromDisk.removed.includes(READ_CONSUMER) && !fromDisk.removed.includes(READ_SECOND) && !fromDisk.gates.includes(READ_GATE),
      JSON.stringify(fromDisk));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('문맥 하나가 공유하는 읽기와 기본 읽기는 여러 구성에서 같은 계획을 내고, 새 문맥은 고친 원문을 다시 읽는다', () => {
  const root = fixture(READ_SOURCES);
  try {
    const javaFiles = Object.keys(READ_SOURCES).map((file) => join(root, file));
    const shared = contextSourceReader();
    for (const resolvedDomains of [[], ['addressbook'], ['board'], ['addressbook', 'board']]) {
      assert.deepEqual(planShape(root, planJavaRemoval(root, READ_OWNERSHIP, { resolvedDomains }, javaFiles, { readSource: shared })),
        planShape(root, planJavaRemoval(root, READ_OWNERSHIP, { resolvedDomains }, javaFiles)), `${resolvedDomains}: 공유 읽기 = 기본 읽기`);
    }
    const before = planShape(root, planJavaRemoval(root, READ_OWNERSHIP, { resolvedDomains: ['board'] }, javaFiles));
    assert.ok(before.removed.includes(READ_CONSUMER));
    // 파일을 고친다(제외 기능 import 를 걷는다). 다음 호출의 기본 읽기와 새로 만든 문맥 읽기는 고친 원문을 본다 — 원문을 호출이나 문맥
    // 밖(모듈 전역)에 기억하면 옛 원문으로 판정해 여기서 붉다.
    writeFileSync(join(root, READ_CONSUMER), 'package nuri.api.support;\npublic class Consumer {}\n', 'utf8');
    for (const readSource of [undefined, contextSourceReader()]) {
      const after = planShape(root, planJavaRemoval(root, READ_OWNERSHIP, { resolvedDomains: ['board'] }, javaFiles, readSource ? { readSource } : {}));
      assert.ok(!after.removed.includes(READ_CONSUMER) && !after.removed.includes(READ_SECOND), JSON.stringify(after));
    }
    // 같은 문맥의 읽기는 고치기 전 원문을 계속 쓴다 — 문맥은 디스크를 바꾸지 않는 판정 한 번이라는 전제의 다른 면이다.
    assert.ok(planShape(root, planJavaRemoval(root, READ_OWNERSHIP, { resolvedDomains: ['board'] }, javaFiles, { readSource: shared }))
      .removed.includes(READ_CONSUMER));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('소유 파생 기대 생존 대조: 구성 안 소유는 남아야 하고, 구성 밖 소유는 빠져야 한다', () => {
  const compositions = [
    { name: 'preset core', selected: new Set(), plan: { removed: new Set(['/gone.java']), removalReason: new Map([['/gone.java', '합성']]) } },
    { name: 'preset demo', selected: new Set(['addressbook']), plan: { removed: new Set(), removalReason: new Map() } },
  ];
  assert.deepEqual(evaluateExpectedSurvival({ compositions, entries: [
    { label: 'kept', sources: ['/kept.java'], owners: ['core'] },
    { label: 'mixed', sources: ['/kept.java', '/gone.java'], owners: ['core', 'addressbook'] },
  ] }), []);
  const wrong = evaluateExpectedSurvival({ compositions, entries: [
    { label: 'removedCore', sources: ['/kept.java', '/gone.java'], owners: ['core', 'core'] },
    { label: 'keptOptional', sources: ['/kept.java'], owners: ['addressbook'] },
    { label: 'empty', sources: [], owners: [] },
  ] });
  assert.deepEqual(wrong, [
    'expected to survive in preset core: removedCore — 생성기가 지운다: 합성',
    'expected to be removed in preset core: keptOptional — 구성 밖 소유 기능 [addressbook] 인데 생성기가 남긴다',
    'empty: 판정할 소스 파일이 없다',
  ]);
});

/*
 * 합성 트리: 기능 디렉터리 밖의 api-server 컨트롤러가 다른 api-server 지원 타입을 거쳐 게시판 타입에 닿는다. 소유 규칙은 업무 패키지를
 * 직접 참조하지 않는 이 컨트롤러를 core 로 보지만 생성기는 연쇄로 지운다 — 'core 항목이 잘못 들어간 import 로 사라지는' 경로다(DEC-OPS-089).
 * 업무 패키지를 직접 참조하는 대조군은 소유가 그 기능이 되어 계획과 같다 — 그 경우의 신호는 시작 구성의 Java 연쇄 exact 목록이 받친다.
 */
test('합성 트리 부정 증명: 코어 소유 항목이 간접 참조로 지워지면 expected to survive 가 붉다', () => {
  const files = {
    'business-app/src/main/java/nuri/business/service/board/BoardService.java': 'package nuri.business.service.board;\npublic class BoardService {}\n',
    'api-server/src/main/java/nuri/api/support/BoardBridge.java':
      'package nuri.api.support;\nimport nuri.business.service.board.BoardService;\npublic class BoardBridge { BoardService service; }\n',
    'api-server/src/main/java/nuri/api/controller/user/UserLookupController.java':
      'package nuri.api.controller.user;\nimport nuri.api.support.BoardBridge;\npublic class UserLookupController { BoardBridge bridge; }\n',
    'api-server/src/main/java/nuri/api/controller/user/DirectBoardController.java':
      'package nuri.api.controller.user;\nimport nuri.business.service.board.BoardService;\npublic class DirectBoardController { BoardService service; }\n',
  };
  const root = fixture(files);
  try {
    const javaFiles = Object.keys(files).map((file) => join(root, file));
    const ownership = { domains: ['board'], supportFiles: new Map() };
    const plan = planJavaRemoval(root, ownership, { resolvedDomains: [] }, javaFiles);
    const features = new Set(['board']);
    const context = { root, projection: false, javaFiles, compositions: [{ name: 'preset core', selected: new Set(), plan }],
      ownerOf: compositionOwnerOf(root, { ownerOf: sourceOwner(new Map(), [...features], requiresClosure([{ id: 'board', requires: [] }])),
        features, stripComments }) };
    const { entries, violations } = ledgerEntries(context, [
      { label: 'UserLookupController#list', types: ['nuri.api.controller.user.UserLookupController'] },
      { label: 'DirectBoardController#list', types: ['nuri.api.controller.user.DirectBoardController'] },
    ]);
    assert.deepEqual(violations, []);
    assert.deepEqual(entries.map((entry) => entry.owners), [['core'], ['board']]);
    assert.deepEqual(evaluateExpectedSurvival({ entries, compositions: context.compositions }), [
      'expected to survive in preset core: UserLookupController#list — 생성기가 지운다: nuri.api.support.BoardBridge 참조',
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('소유가 기능 id 가 아니면 판정하지 않고 실패한다', () => {
  const root = fixture({ 'api-server/src/main/java/nuri/api/X.java': 'package nuri.api;\nclass X {}\n' });
  try {
    const ownerOf = compositionOwnerOf(root, { ownerOf: () => 'ghost', features: new Set(['board']), stripComments });
    assert.throws(() => ownerOf(join(root, 'api-server/src/main/java/nuri/api/X.java')), /의 소유가 기능이 아니다: ghost/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('투영본 기록 대조: 기록 없는 소스, 남김 기록인데 없는 소스, 지움 기록인데 남은 소스를 모두 낸다', () => {
  const record = {
    retained: [{ path: 'a/Kept.java', type: 'x.Kept' }, { path: 'a/Stale.java', type: 'x.Stale' }],
    removed: [{ path: 'a/Gone.java', type: 'x.Gone' }, { path: 'a/Lingering.java', type: 'x.Lingering' }],
  };
  const resolved = recordedSources(record, 'entry', { types: ['x.Kept$Inner', 'x.Gone', 'x.Ghost'], paths: ['a/Stale.java', 'a/Lingering.java'] });
  assert.deepEqual(resolved.violations, ['entry: x.Ghost 가 투영 기록(config/governance/reusable-harness-profile.json)에 정확히 한 번 있지 않다 (0건)']);
  const exists = (path) => !normalize(path).endsWith('/Gone.java') && !normalize(path).endsWith('/Stale.java');
  assert.deepEqual(evaluateRecordedPresence({ root: '/r', exists, entries: [{ label: 'entry', sources: resolved.sources }] }), [
    'entry: 투영 기록은 남겼는데 소스가 없다 — a/Stale.java',
    'entry: 투영 기록은 지웠는데 소스가 남아 있다 — a/Lingering.java',
  ]);
});

// 투영 모드 위장 차단(표지 하나로 계획 대조를 끄지 못한다)은 표지 판정의 집인 composer-modules.test.mjs 가 본다(11단계 C5).
test('경로 정규화는 구분자를 슬래시로 맞춘다', () => {
  assert.equal(normalize('a\\b'.replaceAll('\\', '/')), 'a/b');
});
