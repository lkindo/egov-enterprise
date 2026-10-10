import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { DEEP_BLOCKER_LABELS, compositionDeepPlan, deepSummary, directoryIgnoresCase, withoutRoot } from './project-composer-deep.mjs';
import { projectSourceTree } from './generate-reusable-base-source.mjs';
import { composerProfile, domainSupportFiles } from './project-composer-source.mjs';
import { UPSTREAM_ATLAS, assertRemovedGatesAcknowledged, pruneHistoricalMigrationTests, pruneUpstreamAtlas, removedGateAcknowledgement } from './reusable-source-gates.mjs';
import { planFrontendRemoval, pruneFrontend } from './reusable-source-frontend.mjs';
import { copySourceTree, isCopyableSourceFile, normalize, trackedAndUntrackedFiles, walk } from './reusable-source-tree.mjs';
import { MESSAGE_BUNDLES } from './reusable-source-messages.mjs';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'config/reusable-base-profiles.json'), 'utf8'));
const catalog = loadProjectComposerCatalog(root);
const files = trackedAndUntrackedFiles();
const compose = (selection, from = catalog) => resolveProjectRecipe({ schemaVersion: 1, project: { name: 'deep-test' }, sourceRef: 'main', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, from);
// 투영과 규칙 제거가 보는 파일: Java·프런트, 원본 Atlas 자산·검사, package.json(Atlas 별칭), 지운 ErrorCode 의 키를 걷는 메시지 번들.
// 복사 시간을 줄이려고 이것만 복사한다.
const atlasPaths = [...UPSTREAM_ATLAS.assets, ...UPSTREAM_ATLAS.gates];
const projectionFiles = files.filter(file => {
  const path = normalize(file);
  return path.endsWith('.java') || path.startsWith('frontend/') || path === 'package.json'
    || atlasPaths.some(asset => path === asset || path.startsWith(`${asset}/`)) || MESSAGE_BUNDLES.includes(path);
});
const codes = deep => deep.blockers.map(blocker => blocker.code);
const quietly = run => {
  const log = console.log;
  console.log = () => {};
  try { return run(); } finally { console.log = log; }
};
// 대소문자 구분은 폴더마다 다를 수 있다. 시험 폴더를 가리게 만들 수 있으면(Windows NTFS 폴더 속성) 만든다. 못 만들면 원래 구분을 따른다.
const caseSensitiveDirectory = prefix => {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  if (process.platform === 'win32') {
    try { execFileSync('fsutil', ['file', 'setCaseSensitiveInfo', directory, 'enable'], { stdio: 'ignore' }); } catch { /* 지원하지 않는 디스크 */ }
  }
  return directory;
};

/*
 * 정밀 점검(설계서 10장 plan/deep, C3)은 생성기의 투영·규칙 제거·승인 판정을 디스크를 바꾸지 않고 미리 한다. 미리 본 결과가
 * 실제 생성과 다르면 '통과'라고 말한 구성이 생성 단계에서 실패하거나, 지워질 파일 수를 틀리게 말한다. 그래서 복사한 트리에
 * 생성기의 단계(projectSourceTree·규칙 제거·승인 대조)를 실제로 돌려 지워진 파일 집합·개수·게이트가 정확히 같은지 대조한다.
 */
test('the deep plan removes exactly the files, cascades and gates the generator projection removes', { timeout: 600_000 }, t => {
  // 프리셋 경로(제외 pack 선언), 직접 선택(해석기가 계산한 제거 경로), 소비자가 소유한 지원 파일을 걷는 선택을 하나씩 본다.
  const selections = [{ preset: 'core' }, { domains: ['mail'] }, { domains: ['template'] }];
  for (const selection of selections) {
    const composition = compose(selection);
    const label = JSON.stringify(selection);
    const deep = compositionDeepPlan({ root, manifest, composition, files });
    assert.deepEqual(deep.blockers, [], `${label}: the real checkout has no projection blocker`);

    const output = mkdtempSync(join(tmpdir(), 'composer-deep-'));
    t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
    copySourceTree(output, { sourceRoot: root, files: projectionFiles });
    const copied = projectionFiles.map(normalize).filter(file => isCopyableSourceFile(file, root) && (file.endsWith('.java') || file.startsWith('frontend/')));
    const profile = composerProfile(manifest, composition);
    const { java, frontend } = projectSourceTree(output, { manifest, profile: structuredClone(profile), composition, sourceRoot: root });
    const actuallyRemoved = copied.filter(file => !existsSync(join(output, file))).sort();

    assert.deepEqual([...deep.java.files, ...deep.frontend.files].filter(file => copied.includes(file)).sort(), actuallyRemoved,
      `${label}: the deep plan must name exactly the files the generator removes`);
    assert.equal(deep.java.removedFiles, java.removedFiles, `${label}: Java removal count`);
    assert.equal(deep.frontend.removedFiles, frontend.removedFiles, `${label}: frontend removal count`);
    assert.equal(deep.frontend.cascadeFiles, frontend.cascadedFiles, `${label}: frontend cascade count`);
    assert.deepEqual(deep.removedGates, [...java.removedGates.map(gate => gate.file), ...frontend.removedGates].sort(), `${label}: removed gates`);
    assert.ok(deep.java.cascadeFiles > 0 && deep.java.cascadeFiles < deep.java.removedFiles, `${label}: Java cascade is a strict part of the removal`);
    assert.match(deepSummary(deep), /^제거: Java \d+개\(연쇄 \d+\) · 프런트 \d+개\(연쇄 \d+\) · 검증 게이트 \d+건$/);

    // 규칙 제거와 승인 대조도 생성기와 같다: 같은 파일을 고르고, 정밀 점검이 통과라 말한 구성은 생성기 승인 대조도 통과한다.
    const ruleRemovals = { 'historical-migration-tests': pruneHistoricalMigrationTests(output).files, 'upstream-atlas': pruneUpstreamAtlas(output).files };
    assert.deepEqual(deep.ruleRemovals, ruleRemovals, `${label}: rule removals`);
    assert.ok(ruleRemovals['historical-migration-tests'].length > 0, `${label}: the rule selects real historical tests`);
    quietly(() => assertRemovedGatesAcknowledged(composition.profile, profile, java, frontend, ruleRemovals));
  }
});

test('a full product composition removes nothing and still reports a summary', () => {
  const deep = compositionDeepPlan({ root, manifest, composition: compose({ preset: 'demo' }), files });
  assert.deepEqual(deep.blockers, []);
  assert.deepEqual({ java: deep.java.removedFiles, frontend: deep.frontend.removedFiles, gates: deep.removedGates }, { java: 0, frontend: 0, gates: [] });
  assert.equal(deepSummary(deep), '제거: Java 0개(연쇄 0) · 프런트 0개(연쇄 0) · 검증 게이트 0건');
});

/*
 * 생성기가 실패할 자리마다 정밀 점검도 차단 사유를 낸다. 실제 저장소를 그대로 쓰고 입력(선언·파일 목록)만 바꿔 각 사유를 만든다.
 */
test('every generator failure point becomes a labelled blocker before Docker starts', () => {
  const core = compose({ preset: 'core' });
  const coreGates = manifest.profiles.core.acknowledgedRemovedGates;
  assert.ok(coreGates.length > 1, 'the core preset acknowledges removed gates');

  // 승인 목록에서 실제로 지워지는 게이트 하나를 빼면 승인되지 않은 제거다.
  const unacknowledged = structuredClone(manifest);
  unacknowledged.profiles.core.acknowledgedRemovedGates = coreGates.slice(1);
  let deep = compositionDeepPlan({ root, manifest: unacknowledged, composition: core, files });
  assert.deepEqual(codes(deep), ['GATE_UNACKNOWLEDGED']);
  assert.deepEqual(deep.blockers[0].files, [coreGates[0].file]);
  assert.equal(deep.blockers[0].label, DEEP_BLOCKER_LABELS.GATE_UNACKNOWLEDGED);

  // 지워지지 않는 게이트를 승인 목록에 두면 낡은 승인이다.
  const stale = structuredClone(manifest);
  stale.profiles.core.acknowledgedRemovedGates.push({ file: 'api-server/src/test/java/nuri/api/NotRemovedTest.java', reason: '시험용' });
  deep = compositionDeepPlan({ root, manifest: stale, composition: core, files });
  assert.deepEqual(codes(deep), ['GATE_STALE']);
  assert.deepEqual(deep.blockers[0].files, ['api-server/src/test/java/nuri/api/NotRemovedTest.java']);

  // 승인 항목의 형식(사유 없음, 모르는 규칙)은 생성기가 대조 전에 거부한다.
  const declaration = structuredClone(manifest);
  declaration.profiles.core.acknowledgedRemovedGates[0] = { file: coreGates[0].file };
  declaration.profiles.core.acknowledgedGateRemovalRules.push({ rule: 'no-such-rule', reason: '시험용' });
  deep = compositionDeepPlan({ root, manifest: declaration, composition: core, files });
  assert.deepEqual(codes(deep), ['GATE_DECLARATION', 'GATE_UNACKNOWLEDGED']);
  assert.match(deep.blockers[0].message, /no-such-rule/);

  // 규칙 제거도 승인과 대조한다: 승인하지 않은 규칙, 더 이상 적용되지 않는 규칙.
  const rules = structuredClone(manifest);
  rules.profiles.core.acknowledgedGateRemovalRules = [];
  deep = compositionDeepPlan({ root, manifest: rules, composition: core, files });
  assert.deepEqual(codes(deep), ['RULE_UNACKNOWLEDGED']);
  assert.deepEqual(deep.blockers[0].files, ['historical-migration-tests', 'upstream-atlas']);
  const historical = deep.ruleRemovals['historical-migration-tests'];
  assert.ok(historical.length > 0, 'the rule selects historical tests');
  const withoutHistorical = files.filter(file => !historical.includes(normalize(file)));
  deep = compositionDeepPlan({ root, manifest, composition: core, files: withoutHistorical });
  assert.deepEqual(codes(deep), ['RULE_STALE']);
  assert.deepEqual(deep.blockers[0].files, ['historical-migration-tests']);

  // 원본 Atlas 자산이 생성물에 없으면 생성기는 규칙 제거에서 실패한다.
  deep = compositionDeepPlan({ root, manifest, composition: core, files: files.filter(file => normalize(file) !== 'scripts/build-atlas.mjs') });
  assert.deepEqual(codes(deep), ['RULE_REMOVAL']);
  assert.match(deep.blockers[0].message, /Upstream Atlas asset is missing; review the Atlas removal rule: scripts\/build-atlas\.mjs/);

  // 제외 pack 이 화면 진입점을 지우면 생성기는 투영 뒤 진입점 검사에서 실패한다.
  const entry = structuredClone(manifest);
  entry.packs.demo.frontend.removePaths.push('src/app/login');
  deep = compositionDeepPlan({ root, manifest: entry, composition: core, files });
  assert.ok(codes(deep).includes('FRONTEND_ENTRY'), JSON.stringify(codes(deep)));
  assert.deepEqual(deep.blockers.find(blocker => blocker.code === 'FRONTEND_ENTRY').files, ['frontend/src/app/login/page.tsx']);

  // 선택한 기능의 소스가 생성물에 없으면(복사되지 않거나 연쇄로 지워지면) 생존 검사에서 실패한다.
  const mail = compose({ domains: ['mail'] });
  const mailService = 'business-app/src/main/java/nuri/business/service/mail/MailService.java';
  assert.ok(files.map(normalize).includes(mailService), 'the mail service is part of the source tree');
  deep = compositionDeepPlan({ root, manifest, composition: mail, files: files.filter(file => normalize(file) !== mailService) });
  assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL']);
  assert.deepEqual(deep.blockers[0].files, [mailService]);

  // 선언된 지원 파일이 디스크에는 있어도 복사되지 않으면 생성기는 Java 투영에서 실패한다(무시된 파일).
  const supportFile = [...domainSupportFiles(root, manifest).values()].flat()[0];
  assert.ok(supportFile, 'the manifest declares domain support files');
  deep = compositionDeepPlan({ root, manifest, composition: core, files: files.filter(file => normalize(file) !== supportFile) });
  assert.deepEqual(codes(deep), ['JAVA_PROJECTION']);
  assert.equal(deep.blockers[0].message, `Missing domain support file: ${supportFile}`);

  // 선언이 요구를 빠뜨리면 선택한 기능의 화면이 공유 import 연쇄로 지워진다. 생존 검사가 지워질 파일을 밝힌다.
  const broken = structuredClone(catalog);
  const system = broken.capabilities.find(row => row.id === 'system');
  assert.ok(system.requires.some(edge => edge.domain === 'template'), 'system -> template must exist');
  system.requires = system.requires.filter(edge => edge.domain !== 'template');
  const { catalogHash: ignored, ...body } = broken;
  broken.catalogHash = compositionDigest(body);
  deep = compositionDeepPlan({ root, manifest, composition: compose({ domains: ['system'] }, broken), files });
  const lost = deep.blockers.find(blocker => blocker.code === 'SOURCE_SURVIVAL');
  assert.ok(lost?.files.length > 0, JSON.stringify(codes(deep)));
  assert.ok(lost.files.every(file => deep.frontend.files.includes(file) || deep.java.files.includes(file)), 'every lost source is one the plan removes');
  assert.ok(lost.files.some(file => file.startsWith('frontend/')) && lost.files.some(file => file.endsWith('.java')), 'both a screen and its Java support are lost');

  // 프런트 pack 마커가 manifest 에 없는 pack 을 가리키면 생성기는 마커 투영에서 실패한다. 게이트·생존 판정은 하지 않는다.
  const unknownPack = structuredClone(manifest);
  delete unknownPack.packs.demo;
  deep = compositionDeepPlan({ root, manifest: unknownPack, composition: core, files });
  assert.deepEqual(codes(deep), ['FRONTEND_PROJECTION']);
  assert.match(deep.blockers[0].message, /알 수 없는 frontend pack marker: demo/);
  assert.equal(deep.frontend, null);

  // 지원 파일 선언이 잘못되면 생성기는 Java 투영에서 실패한다. 셀 수 없는 개수는 말하지 않는다.
  const support = structuredClone(manifest);
  support.packs.core.backend = { ...support.packs.core.backend, domainSupportFiles: { nothing: ['business-core/src/main/java/nuri/X.java'] } };
  deep = compositionDeepPlan({ root, manifest: support, composition: core, files });
  assert.deepEqual(codes(deep), ['JAVA_PROJECTION']);
  assert.equal(deep.java, null);
  assert.equal(deepSummary(deep), '투영이 실패해 지워질 파일과 검증 게이트를 셀 수 없습니다');
});

/*
 * 승인 대조는 생성기와 정밀 점검이 같은 판정 함수를 쓴다. 정밀 점검이 차단 사유로 말하는 경우마다 생성기도 실패해야 하고,
 * 둘 다 통과하는 경우도 같아야 한다.
 */
test('every acknowledgement blocker of the deep plan is a failure of the generator acknowledgement check', () => {
  const javaGates = files => ({ removedGates: files.map(file => ({ file, reason: '시험용' })) });
  const rules = { 'historical-migration-tests': ['api-server/src/test/java/nuri/api/schema/OldMigrationIntegrationTest.java'],
    'upstream-atlas': ['scripts/atlas-catalog.test.mjs'] };
  const accepted = { acknowledgedRemovedGates: [{ file: 'a/Gate.java', reason: 'r' }],
    acknowledgedGateRemovalRules: [{ rule: 'historical-migration-tests', reason: 'r' }, { rule: 'upstream-atlas', reason: 'r' }] };
  const cases = [
    ['passes', accepted, ['a/Gate.java'], rules, [], null],
    ['invalid entry', { ...accepted, acknowledgedRemovedGates: [{ file: 'a/Gate.java' }] }, ['a/Gate.java'], rules, ['invalidEntries', 'unacknowledged'], /acknowledgedRemovedGates 항목은 \{ file, reason \}/],
    ['unknown rule', { ...accepted, acknowledgedGateRemovalRules: [...accepted.acknowledgedGateRemovalRules, { rule: 'nope', reason: 'r' }] }, ['a/Gate.java'], rules, ['invalidRules'], /acknowledgedGateRemovalRules 항목은/],
    ['unacknowledged rule', { ...accepted, acknowledgedGateRemovalRules: [] }, ['a/Gate.java'], rules, ['unacknowledgedRules'], /승인하지 않은 규칙/],
    ['stale rule', accepted, ['a/Gate.java'], { ...rules, 'historical-migration-tests': [] }, ['staleRules'], /더 이상 적용되지 않는 규칙/],
    ['unacknowledged gate', accepted, ['a/Gate.java', 'b/Other.java'], rules, ['unacknowledged'], /승인하지 않은 거버넌스 게이트를 제거한다 \(1건\)/],
    ['stale gate', accepted, [], rules, ['stale'], /더 이상 제거되지 않는 항목이 남아 있다 \(1건\)/],
    ['entries not a list', { ...accepted, acknowledgedRemovedGates: 'x' }, ['a/Gate.java'], rules, ['invalidEntries', 'unacknowledged'], /acknowledgedRemovedGates 항목은 \{ file, reason \} 이어야 한다: "x"/],
    ['rules not a list', { ...accepted, acknowledgedGateRemovalRules: {} }, ['a/Gate.java'], rules, ['invalidRules', 'unacknowledgedRules'], /acknowledgedGateRemovalRules 항목은 \{ rule, reason \}.*: \{\}/],
  ];
  for (const [name, profile, gates, ruleRemovals, fields, failure] of cases) {
    const result = removedGateAcknowledgement(profile, gates, ruleRemovals);
    const problems = ['invalidEntries', 'invalidRules', 'unacknowledgedRules', 'staleRules', 'unacknowledged', 'stale'].filter(key => result[key].length);
    assert.deepEqual(problems, fields, name);
    const check = () => quietly(() => assertRemovedGatesAcknowledged('p', profile, javaGates(gates), { removedGates: [] }, ruleRemovals));
    if (failure) assert.throws(check, failure, name);
    else assert.doesNotThrow(check, name);
  }
  // 생성기는 형식 오류로 멈추기 전에 지워지는 게이트를 먼저 말한다.
  const lines = [];
  const log = console.log;
  console.log = line => lines.push(line);
  try {
    assert.throws(() => assertRemovedGatesAcknowledged('p', { ...accepted, acknowledgedRemovedGates: 'x' }, javaGates(['a/Gate.java']), { removedGates: [] }, rules), /: "x"/);
  } finally { console.log = log; }
  assert.equal(lines[0], '[base-source] 투영에서 제거된 거버넌스 게이트: 3건');
});

/*
 * 생성물의 파일 집합은 생성기가 복사하는 파일이다. 디스크에만 있고 목록에 없는 파일(무시된 파일)은 세지 않고, 목록에만 있고
 * 디스크에 없는 파일(작업 트리에서 지운 추적 파일)은 읽지 않는다. 곧 지워질 파일의 마커 오류도 생성기처럼 차단한다.
 */
test('the deep plan sees exactly the files the generator copies and projects every frontend source first', t => {
  const fixture = mkdtempSync(join(tmpdir(), 'composer-deep-fixture-'));
  t.after(() => rmSync(fixture, { recursive: true, force: true, maxRetries: 5 }));
  const write = (file, text) => { mkdirSync(dirname(join(fixture, file)), { recursive: true }); writeFileSync(join(fixture, file), text); };
  const small = { packs: { core: {}, demo: { backend: { appDomains: ['mail'] }, frontend: { removePaths: ['src/app/demo'] } } },
    profiles: { core: { packs: ['core'], acknowledgedRemovedGates: [], acknowledgedGateRemovalRules: [{ rule: 'upstream-atlas', reason: '시험용' }] } } };
  // 원본 Atlas 규칙 제거가 성공하도록 자산과 별칭을 둔다(규칙 제거는 늘 적용된다).
  const atlas = ['frontend/public/governance_harness_atlas.html', 'frontend/atlas/catalog.json', ...atlasPaths.filter(path => /\.(?:mjs|ts)$/.test(path)), 'package.json'];
  for (const file of atlas) write(file, file === 'package.json' ? '{"scripts":{"atlas:build":"x","atlas:check":"x"}}' : '// atlas\n');
  const listed = ['business-app/src/main/java/nuri/business/service/mail/MailService.java', 'frontend/src/app/layout.tsx',
    'frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx', 'frontend/src/app/demo/page.tsx', ...atlas];
  write(listed[0], 'package nuri.business.service.mail;\npublic class MailService {}\n');
  for (const file of listed.slice(1, 5)) write(file, 'export default function Page() { return null; }\n');
  write('business-app/src/main/java/nuri/business/service/mail/notes.txt', 'ignored by Git, never copied\n');
  // 제외 도메인을 참조하는 과거 마이그레이션 검증은 Java 연쇄로 먼저 지워진다. 생성기처럼 규칙 제거에는 세지 않는다.
  const cascadedHistorical = 'api-server/src/test/java/nuri/api/schema/OldMailMigrationIntegrationTest.java';
  write(cascadedHistorical, 'package nuri.api.schema;\nimport nuri.business.service.mail.MailService;\nclass OldMailMigrationIntegrationTest { MailService mail; }\n');
  listed.push(cascadedHistorical);
  const plan = (files = listed) => compositionDeepPlan({ root: fixture, manifest: small, composition: { profile: 'core' }, files });

  let deep = plan([...listed, 'frontend/src/app/deleted.tsx', 'business-app/src/main/java/Deleted.java']);
  assert.deepEqual(deep.blockers, []);
  assert.deepEqual(deep.java.files, [cascadedHistorical, listed[0]].sort(), 'a file Git does not list is not copied, so it is not counted as removed');
  assert.deepEqual(deep.ruleRemovals['historical-migration-tests'], [], 'a historical test already removed by the cascade is not removed again by the rule');
  assert.deepEqual(deep.frontend.files, ['frontend/src/app/demo/page.tsx']);
  assert.deepEqual([deep.java.removedFiles, deep.java.cascadeFiles, deep.frontend.removedFiles, deep.frontend.cascadeFiles], [2, 1, 1, 0]);

  write('frontend/src/app/demo/page.tsx', '// reusable-base:nope:start\nexport default function Page() { return null; }\n// reusable-base:nope:end\n');
  deep = plan();
  assert.deepEqual(codes(deep), ['FRONTEND_PROJECTION'], 'the generator projects markers before it removes the page');
  assert.match(deep.blockers[0].message, /알 수 없는 frontend pack marker: nope/);

  write('frontend/src/app/demo/page.tsx', 'export default function Page() { return null; }\n');
  deep = plan(listed.filter(file => file !== 'frontend/src/app/login/page.tsx'));
  assert.deepEqual(codes(deep), ['FRONTEND_ENTRY']);
  assert.deepEqual(deep.blockers[0].files, ['frontend/src/app/login/page.tsx']);

  // 규칙 판정이 예외로 멈추면 생성기는 거기서 실패하고 승인 대조까지 가지 않는다. 그 규칙을 '적용되지 않는 규칙'으로 몰면
  // 사용자가 맞는 승인을 지우고, 원인을 고친 뒤에는 승인되지 않은 규칙으로 다시 실패한다.
  small.profiles.core.acknowledgedGateRemovalRules.push({ rule: 'historical-migration-tests', reason: '시험용' });
  const keptHistorical = 'api-server/src/test/java/nuri/api/schema/KeptMigrationIntegrationTest.java';
  write(keptHistorical, 'package nuri.api.schema;\nclass KeptMigrationIntegrationTest {}\n');
  const withHistorical = [...listed, keptHistorical];
  deep = plan(withHistorical);
  assert.deepEqual(codes(deep), []);
  assert.deepEqual(deep.ruleRemovals['historical-migration-tests'], [keptHistorical]);
  const drifted = 'api-server/src/test/java/nuri/api/schema/AuthorizationContractIntegrationTest.java';
  write(drifted, 'package nuri.api.schema;\nclass AuthorizationContractIntegrationTest { void run() { fromVersion("2.99"); } }\n');
  deep = plan([...withHistorical, drifted]);
  assert.deepEqual(codes(deep), ['RULE_REMOVAL']);
  assert.match(deep.blockers[0].message, /Historical authorization fixture changed scope; removal requires review: AuthorizationContractIntegrationTest\.java/);
  write('package.json', '{ not json');
  deep = plan(withHistorical);
  assert.deepEqual(codes(deep), ['RULE_REMOVAL']);
  assert.match(deep.blockers[0].message, /JSON/);
});

/*
 * 제외 경로는 생성기가 디스크에서 지우는 것과 같은 파일로 센다. 끝의 구분자·`./` 는 같은 경로다. 대소문자만 다르거나 frontend 밖을
 * 가리키는 경로는 디스크에 따라 결과가 갈리므로 실패한다. 제외 경로 안의 자산(.css 등)을 가져오는 파일도 연쇄로 걷는다(깨진 import 를 남기지 않는다).
 */
test('frontend remove paths are counted exactly as the generator deletes them', t => {
  const fixtureFiles = ['frontend/src/app/layout.tsx', 'frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx', 'frontend/src/app/demo/page.tsx',
    'frontend/src/app/demo/demo.module.css', 'frontend/src/app/uses-style.tsx', 'frontend/src/__tests__/demo-gate.test.ts', 'frontend/src/app/keep.tsx'];
  const make = () => {
    const output = mkdtempSync(join(tmpdir(), 'composer-deep-frontend-'));
    t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
    const write = (file, text) => { mkdirSync(dirname(join(output, file)), { recursive: true }); writeFileSync(join(output, file), text); };
    for (const file of fixtureFiles) write(file, 'export default function Page() { return null; }\n');
    write('frontend/src/app/demo/demo.module.css', '.a {}\n');
    write('frontend/src/app/uses-style.tsx', "import styles from '@/app/demo/demo.module.css';\nexport const s = styles;\n");
    write('frontend/src/__tests__/demo-gate.test.ts', "import Page from '@/app/demo/page';\nexport const p = Page;\n");
    write('outside', 'must survive\n');
    return output;
  };
  const project = (output, path) => ({
    plan: () => planFrontendRemoval({ frontendRoot: join(output, 'frontend'), files: walk(join(output, 'frontend'), () => true), directPaths: [path],
      readSource: file => readFileSync(file, 'utf8') }),
    prune: () => quietly(() => pruneFrontend(output, { packs: { core: {}, demo: { frontend: { removePaths: [path] } } } }, { packs: ['core'] })),
  });
  const expected = ['frontend/src/__tests__/demo-gate.test.ts', 'frontend/src/app/demo/demo.module.css', 'frontend/src/app/demo/page.tsx', 'frontend/src/app/uses-style.tsx'];
  for (const path of ['src/app/demo', 'src/app/demo/', './src/app/demo', 'src/app//demo']) {
    const output = make();
    const { plan, prune } = project(output, path);
    assert.deepEqual([...plan().removed].map(file => normalize(relative(output, file))).sort(), expected, `${path}: planned removal`);
    const pruned = prune();
    assert.deepEqual(fixtureFiles.filter(file => !existsSync(join(output, file))).sort(), expected, `${path}: deleted from disk`);
    assert.deepEqual({ removed: pruned.removedFiles, cascaded: pruned.cascadedFiles, gates: pruned.removedGates },
      { removed: 4, cascaded: 2, gates: ['frontend/src/__tests__/demo-gate.test.ts'] }, `${path}: counted as deleted`);
  }
  const refused = [['src/app/Demo', /frontend removePath 의 대소문자가 실제 경로와 다르다: src\/app\/Demo \(실제: src\/app\/demo\/[^)]+\)/],
    ['../outside', /frontend removePath 는 frontend 안의 하위 경로여야 한다: \.\.\/outside/], ['.', /frontend 안의 하위 경로여야 한다: \./]];
  for (const [path, failure] of refused) {
    const output = make();
    const { plan, prune } = project(output, path);
    assert.throws(plan, failure, `${path}: planning`);
    assert.throws(prune, failure, `${path}: the generator`);
    assert.ok(existsSync(join(output, 'outside')) && fixtureFiles.every(file => existsSync(join(output, file))), `${path}: nothing is deleted`);
  }
});

/*
 * 대소문자를 가리지 않는 디스크(Windows·macOS)에서는 Git 목록과 대소문자만 다른 디스크 이름이 같은 파일이다(생성기의
 * 복사·존재 확인도 그렇게 본다). 가리는 디스크(Linux)에서는 다른 파일이고, 목록의 이름은 디스크에 없어 복사되지 않는다.
 */
test('a name that differs only in case from the Git list follows the disk, as the generator does', () => {
  const mailService = 'business-app/src/main/java/nuri/business/service/mail/MailService.java';
  const listed = files.map(file => (normalize(file) === mailService ? mailService.toLowerCase() : file));
  assert.ok(listed.includes(mailService.toLowerCase()));
  const deep = compositionDeepPlan({ root, manifest, composition: compose({ domains: ['mail'] }), files: listed });
  if (existsSync(join(root, mailService.toLowerCase()))) {
    assert.deepEqual(deep.blockers, [], 'the survival check sees the disk name and must find the listed lower-case name');
  } else {
    assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL'], 'on a case-sensitive disk the listed name is another, absent file');
    assert.deepEqual(deep.blockers[0].files, [mailService]);
  }
});

// 차단 사유 문장은 화면에 보이므로 이 컴퓨터의 절대 경로(사용자 폴더 이름)를 저장소 기준 경로로 바꾼다.
test('blocker messages name repository paths, never this computer\'s absolute checkout path', () => {
  const windows = 'D:\\work\\egov';
  assert.equal(withoutRoot(windows, "ENOENT: open 'D:\\work\\egov\\frontend\\a.ts'"), "ENOENT: open '.\\frontend\\a.ts'");
  assert.equal(withoutRoot(windows, 'missing d:/work/egov/business-app/X.java'), 'missing ./business-app/X.java');
  assert.equal(withoutRoot(windows, 'D:\\WORK\\EGOV\\x'), '.\\x', 'the whole root is matched without case');
  assert.equal(withoutRoot(windows, JSON.stringify('D:\\work\\egov\\x')), JSON.stringify('.\\x'), 'a JSON-escaped root is hidden too');
  assert.equal(withoutRoot(windows, 'D:\\work\\egovother\\a.ts'), '.other\\a.ts', 'a sibling folder sharing the prefix is still not shown in full');
  assert.equal(withoutRoot('/home/me/egov', 'read /home/me/egov/frontend/a.ts'), 'read ./frontend/a.ts');
  assert.equal(withoutRoot('/home/me/egov', '알 수 없는 frontend pack marker: demo (src/a.tsx:3)'), '알 수 없는 frontend pack marker: demo (src/a.tsx:3)');
  // 루트 이름이 저장소 안 경로에도 나오면(도커 작업 폴더 /app·/src) 그 자리는 그대로 둔다. 바꾸면 없는 파일을 말한다.
  assert.equal(withoutRoot('/app', "ENOENT: open '/app/frontend/src/app/login/page.tsx' (src/app/demo/page.tsx:1)"),
    "ENOENT: open './frontend/src/app/login/page.tsx' (src/app/demo/page.tsx:1)");
  assert.equal(withoutRoot('/src', 'Missing domain support file: business-app/src/main/java/X.java'), 'Missing domain support file: business-app/src/main/java/X.java');
  // 드라이브만인 루트는 뒤에 구분자가 올 때만 경로다.
  assert.equal(withoutRoot('E:\\', "Missing domain support file: x; open 'E:\\frontend\\a.ts'"), "Missing domain support file: x; open '.\\frontend\\a.ts'");
  assert.equal(withoutRoot('E:\\', 'disk E: is full'), 'disk E: is full');
});

/*
 * 생성기는 생성물 폴더에서 파일이 있는지 본다. 대소문자 구분은 폴더마다 다를 수 있고, 생성기가 만드는 폴더는 가장 가까운 기존 상위 폴더의
 * 구분을 물려받는다. 그래서 정밀 점검은 원본 체크아웃이 아니라 그 폴더에 묻는다. Git 목록의 이름이 디스크 이름과 대소문자만 다르면
 * 가리는 출력 폴더에서는 선택한 기능의 소스가 없는 것이 된다.
 */
test('letter case is judged in the folder the generator will write to, not in the checkout', t => {
  const mailService = 'business-app/src/main/java/nuri/business/service/mail/MailService.java';
  const listed = files.map(file => (normalize(file) === mailService ? mailService.toLowerCase() : file));
  const mail = compose({ domains: ['mail'] });
  for (const sensitive of [false, true]) {
    const output = sensitive ? caseSensitiveDirectory('composer-deep-case-') : mkdtempSync(join(tmpdir(), 'composer-deep-case-'));
    t.after(() => rmSync(output, { recursive: true, force: true, maxRetries: 5 }));
    writeFileSync(join(output, 'Probe.txt'), 'x');
    const outputIgnoresCase = existsSync(join(output, 'pROBE.TXT'));
    // 대소문자만 다른 두 이름이 함께 있으면 그 쌍으로는 묻지 않는다(가리는 폴더에서만 둘이 따로 있다).
    if (!outputIgnoresCase) for (const [name, text] of [['pROBE.TXT', 'y'], ['Zeta.txt', 'z']]) writeFileSync(join(output, name), text);
    const outputParent = join(output, 'build', 'reusable-base', 'source');
    assert.equal(directoryIgnoresCase(outputParent), outputIgnoresCase, 'the nearest existing folder answers for the folders the generator creates');
    const deep = compositionDeepPlan({ root, manifest, composition: mail, files: listed, outputParent });
    if (outputIgnoresCase && existsSync(join(root, mailService.toLowerCase()))) {
      assert.deepEqual(deep.blockers, [], 'a folder that ignores case finds the listed lower-case name');
    } else {
      assert.deepEqual(codes(deep), ['SOURCE_SURVIVAL'], 'a case-sensitive output folder holds only the listed name');
      assert.deepEqual(deep.blockers[0].files, [mailService]);
    }
  }
});
