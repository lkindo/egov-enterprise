import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { judgeJUnit, judgeVitest, summarize } from './reusable-nightly-judge.mjs';
import { parseWorkflowJobs, validatePinnedWorkflowUses } from './required-checks-contract.mjs';
import {
  CONTRACT_CHECKS, catalogPlanInput, contractsOption, generatePreset, generateSelection, generationDiagnostics, gradleTestArgs, nightlyPlan,
  REPORT_DIRECTORY, runItem,
  runArguments, settingsModules, TEST_EXCLUSIONS, testPlan, testPlanErrors, testUnits, validateItem,
} from './reusable-nightly.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool'];

function scratch(t) {
  const root = mkdtempSync(join(tmpdir(), 'egov-nightly-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function write(root, rel, content) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), content);
}

const junit = (tests, { failures = 0, errors = 0, failing = [] } = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="nuri.Sample" tests="${tests}" skipped="0" failures="${failures}" errors="${errors}" timestamp="2026-10-12T00:00:00" time="0.1">
${failing.map((name) => `  <testcase name="${name}" classname="nuri.Sample" time="0.1"><failure message="boom">x</failure></testcase>`).join('\n')}
  <testcase name="passes" classname="nuri.Sample" time="0.1"/>
</testsuite>
`;

/** 생성물 흉내: 모듈마다 시험 소스를 두고, 판정할 결과 디렉터리에 XML 을 둔다. */
function fakeArtifact(root, layout, { results = 'all', sources = MODULES } = {}) {
  for (const module of sources) write(root, `${module}/src/test/java/nuri/SampleTest.java`, 'class SampleTest {}');
  const units = testUnits(layout, MODULES);
  for (const unit of units) {
    if (results === 'all' || results.includes(unit.task)) write(root, `${unit.results}/TEST-nuri.Sample.xml`, junit(3));
  }
  return units;
}

const vitestReport = (overrides = {}) => JSON.stringify({ numTotalTestSuites: 4, numFailedTestSuites: 0, numTotalTests: 12,
  numFailedTests: 0, numPendingTests: 0, success: true, testResults: [], ...overrides });

const fixtureInput = (extraPresets = []) => ({
  presets: [{ id: 'core', domains: [] }, { id: 'demo', domains: ['board', 'comment', 'survey'] }, ...extraPresets],
  domains: ['board', 'comment', 'survey'],
  closureOf: (ids) => [...new Set(ids.flatMap((id) => (id === 'board' || id === 'comment' ? ['board', 'comment'] : [id])))].sort(),
});

// ① 계획의 단독 폐포는 카탈로그의 단독 선택을 전수로 풀어 얻은 서로 다른 폐포 가운데 시작 구성과 기능 목록이 다른 것과 같아야 한다.
//    같은 목록의 폐포는 그 시작 구성이 두 레이아웃으로 덮는다(같은 목록 = 같은 결과, ADR-0028).
test('the plan holds every preset and every distinct single-selection closure of the real catalog that no preset already covers', () => {
  const catalog = loadProjectComposerCatalog(ROOT);
  const input = catalogPlanInput(catalog);
  const plan = nightlyPlan(input, { date: new Date('2026-10-12T00:00:00Z') });
  const resolveDomains = (selection) => [...resolveProjectRecipe({ schemaVersion: 1, project: { name: 'probe' }, sourceRef: 'HEAD',
    selection, database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, catalog).resolvedDomains].sort().join('+');
  const allClosures = new Set(catalog.capabilities.filter((capability) => capability.available)
    .map((capability) => resolveDomains({ domains: [capability.id] })));
  const presetLists = new Set(catalog.presets.map((preset) => resolveDomains({ preset: preset.id })));
  const expectedClosures = new Set([...allClosures].filter((closure) => !presetLists.has(closure)));
  const closures = (matrix) => new Set(matrix.include.filter((item) => item.kind === 'selection').map((item) => item.domains));
  assert.deepEqual(closures(plan), expectedClosures);
  assert.deepEqual(new Set(plan.include.filter((item) => item.kind === 'preset').map((item) => item.target)),
    new Set(catalog.presets.map((preset) => preset.id)));
  assert.equal(plan.include.length, catalog.presets.length * 2 + expectedClosures.size, 'presets run both layouts, closures one');
  // 건너뛴 폐포는 모두 같은 목록의 시작 구성이 두 레이아웃으로 덮는다. 지금은 설문·결재 시작 구성이 덮는 폐포 둘이다.
  const covered = [...allClosures].filter((closure) => presetLists.has(closure)).sort();
  assert.deepEqual(covered, ['informalsanction', 'survey']);
  for (const closure of covered) {
    assert.deepEqual(plan.include.filter((item) => item.kind === 'preset' && item.domains === closure).map((item) => item.layout),
      ['multi-module', 'single-module'], closure);
  }

  // 계획에서 기능 하나가 빠지면 폐포 집합이 달라져야 한다 — 대조가 공집합 비교로 통과하지 않는다는 대조군이다.
  const dropped = nightlyPlan({ ...input, domains: input.domains.filter((id) => id !== 'event') }, { date: new Date('2026-10-12T00:00:00Z') });
  assert.notDeepEqual(closures(dropped), expectedClosures);

  const largest = [...catalog.presets].sort((a, b) => input.presets.find((p) => p.id === b.id).domains.length
    - input.presets.find((p) => p.id === a.id).domains.length)[0].id;
  assert.deepEqual(plan.include.filter((item) => item.migrationTests).map((item) => `${item.target}/${item.layout}`),
    [`${largest}/multi-module`, `${largest}/single-module`], 'only the largest preset carries the migration tests, in both layouts');
});

// ⑨ 카탈로그에 시작 구성이 늘면 이름을 고치지 않아도 계획이 따라간다. 그 시작 구성과 기능 목록이 같은 단독 폐포는 빠지고,
//    목록이 다른 폐포와 이름으로 고른 직접 선택은 남는다.
test('a preset added to the catalog joins the plan in both layouts and covers the closure with the same list', () => {
  const plan = nightlyPlan(fixtureInput([{ id: 'approval', domains: ['survey'] }]), { date: new Date('2026-10-12T00:00:00Z') });
  assert.deepEqual(plan.include.filter((item) => item.target === 'approval').map((item) => item.layout), ['multi-module', 'single-module']);
  assert.deepEqual(plan.include.filter((item) => item.kind === 'selection').map((item) => item.id), ['select-board-comment']);
  const wider = nightlyPlan(fixtureInput([{ id: 'approval', domains: ['comment', 'survey'] }]), { date: new Date('2026-10-12T00:00:00Z') });
  assert.deepEqual(wider.include.filter((item) => item.kind === 'selection').map((item) => item.id), ['select-board-comment', 'select-survey']);
  const named = nightlyPlan(fixtureInput([{ id: 'approval', domains: ['survey'] }]), { compositions: 'survey', layout: 'multi-module' });
  assert.deepEqual(named.include.map((item) => item.id), ['select-survey']);
});

test('closures alternate their single layout by UTC day while presets keep both', () => {
  const day = (iso) => nightlyPlan(fixtureInput(), { date: new Date(iso) }).include
    .filter((item) => item.kind === 'selection').map((item) => item.layout);
  assert.deepEqual(day('2026-10-12T23:59:00Z'), day('2026-10-12T00:00:00Z'));
  assert.deepEqual(day('2026-10-13T00:00:00Z'), day('2026-10-12T00:00:00Z').map((layout) => (layout === 'multi-module' ? 'single-module' : 'multi-module')));
  for (const layout of ['both', 'multi-module', 'single-module']) {
    const plan = nightlyPlan(fixtureInput(), { layout });
    assert.ok(plan.include.every((item) => layout === 'both' || item.layout === layout), layout);
    if (layout === 'both') assert.equal(plan.include.length, 2 * 4);
  }
  assert.throws(() => nightlyPlan(fixtureInput(), { layout: 'single' }), /layout must be/);
  assert.throws(() => nightlyPlan(fixtureInput(), { date: new Date('not-a-date') }), /valid calendar date/);
  assert.throws(() => nightlyPlan({ ...fixtureInput(), presets: [] }), /declares no preset/);
});

test('a composition subset selects presets and direct selections by name and rejects unknown names', () => {
  const plan = nightlyPlan(fixtureInput(), { compositions: 'preset:core, comment survey+board', layout: 'single-module' });
  assert.deepEqual(plan.include.map((item) => [item.id, item.target, item.domains]), [
    ['preset-core', 'core', ''],
    ['select-board-comment', 'comment', 'board+comment'],
    ['select-board-comment-survey', 'board+survey', 'board+comment+survey'],
  ]);
  assert.throws(() => nightlyPlan(fixtureInput(), { compositions: 'preset:approval' }), /unknown preset: preset:approval/);
  assert.throws(() => nightlyPlan(fixtureInput(), { compositions: 'board+payroll' }), /unknown or unavailable feature: payroll/);
});

test('items must keep the plan shape before anything runs', () => {
  const item = nightlyPlan(fixtureInput(), { layout: 'multi-module' }).include[0];
  assert.equal(validateItem(item), item);
  for (const broken of [null, { ...item, id: '../x' }, { ...item, kind: 'shell' }, { ...item, layout: 'single' },
    { ...item, target: 'core; rm -rf /' }, { ...item, migrationTests: 'yes' }]) {
    assert.throws(() => validateItem(broken), /must come from the plan/);
  }
});

// ⑦·⑧ 단일 모듈의 test 는 api-server 시험만 돈다. 나머지 모듈과 이관 시험은 이름 있는 작업이며, 원장 밖으로 뺄 수 없다.
test('test plans run every suite of the layout and exclude only the ledger tasks', () => {
  const single = testPlan('single-module');
  assert.deepEqual(single.tasks, ['test', 'foundationTest', 'coreTest', 'appTest']);
  assert.deepEqual(single.excluded, ['migrationTest']);
  assert.deepEqual(testPlan('single-module', { migrationTests: true }).tasks, ['test', 'foundationTest', 'coreTest', 'appTest', 'migrationTest']);
  const multi = testPlan('multi-module', { modules: MODULES });
  assert.deepEqual(multi.tasks, ['test']);
  assert.deepEqual(multi.excluded, [':migration-tool:test']);
  assert.deepEqual(gradleTestArgs(multi).slice(0, 3), ['test', '-x', ':migration-tool:test']);
  assert.deepEqual(testPlan('multi-module', { modules: MODULES, migrationTests: true }).excluded, []);
  for (const [layout, plan] of [['single-module', single], ['multi-module', multi]]) {
    assert.deepEqual(testPlanErrors(plan, layout, MODULES), []);
    for (const task of plan.excluded) assert.ok(TEST_EXCLUSIONS[layout][task].length > 20, `${task} needs a reason`);
  }

  const outsideLedger = { ...multi, excluded: [...multi.excluded, ':foundation:test'], units: multi.units.filter((unit) => unit.task !== ':foundation:test') };
  assert.deepEqual(testPlanErrors(outsideLedger, 'multi-module', MODULES), ['test task excluded outside the ledger: :foundation:test']);
  const silentlyDropped = { ...single, units: single.units.filter((unit) => unit.task !== 'coreTest') };
  assert.deepEqual(testPlanErrors(silentlyDropped, 'single-module', MODULES), ['test task is neither judged nor excluded: coreTest']);
  const onlyApiTests = { ...single, tasks: ['test'] };
  assert.deepEqual(testPlanErrors(onlyApiTests, 'single-module', MODULES), [
    'judged test task does not run: foundationTest', 'judged test task does not run: coreTest', 'judged test task does not run: appTest']);
  assert.deepEqual(testPlanErrors({ ...multi, tasks: [] }, 'multi-module', MODULES), ['multi-module plan must run the aggregate test task']);
});

// 멀티 모듈의 판정 모집단은 settings.gradle 에서 정해진다. 형식을 못 읽어 모듈이 빠지면 공집합 통과가 되므로 거부한다.
test('the multi-module population reads every include form and an empty population fails', (t) => {
  assert.deepEqual(settingsModules("rootProject.name = 'x'\n// include 'commented'\ninclude 'foundation'\r\n"
    + "include 'business-core', \"business-app\"\ninclude(':api-server')\nincludeBuild 'tools'\n"), ['foundation', 'business-core', 'business-app', 'api-server']);
  assert.deepEqual(testPlanErrors(testPlan('multi-module'), 'multi-module', []), ['multi-module settings.gradle declares no module']);
  assert.deepEqual(testPlanErrors(testPlan('multi-module', { modules: ['foundation'] }), 'multi-module', ['foundation']),
    ['multi-module settings.gradle lacks api-server']);
  assert.deepEqual(testPlanErrors(testPlan('multi-module', { modules: ['api-server', 'app:web'] }), 'multi-module', ['api-server', 'app:web']),
    ['module is not a top-level project: app:web']);
  // 판정기 자신의 하한: 판정한 작업이 없거나 시험 소스가 모두 없으면 실패다.
  assert.deepEqual(judgeJUnit(scratch(t), []).errors, ['backend: no JUnit test was judged']);
  assert.deepEqual(judgeJUnit(scratch(t), testUnits('multi-module', MODULES)).errors, ['backend: no JUnit test was judged']);
});

test('JUnit judgment needs reports with tests and no failures for every task that kept test sources', (t) => {
  const passing = scratch(t);
  const units = fakeArtifact(passing, 'multi-module');
  assert.deepEqual(judgeJUnit(passing, units).errors, []);

  // ② 실패 1건
  const failing = scratch(t);
  fakeArtifact(failing, 'multi-module');
  write(failing, 'business-app/build/test-results/test/TEST-nuri.Sample.xml', junit(3, { failures: 1, failing: ['breaks &amp; tells'] }));
  const failed = judgeJUnit(failing, units);
  assert.deepEqual(failed.errors, [':business-app:test: 1 failed of 3']);
  assert.deepEqual(failed.suites.find((suite) => suite.task === ':business-app:test').failedTests, ['nuri.Sample#breaks & tells']);

  // ③ 보고서 없음, ④ 시험 0건, 소스가 없는 모듈은 기록만 한다
  const missing = scratch(t);
  fakeArtifact(missing, 'multi-module', { results: [':foundation:test', ':business-core:test', ':api-server:test', ':migration-tool:test'], sources: MODULES });
  write(missing, 'api-server/build/test-results/test/TEST-nuri.Sample.xml', junit(0));
  assert.deepEqual(judgeJUnit(missing, units).errors, [':business-app:test: no JUnit report in business-app/build/test-results/test',
    ':api-server:test: JUnit reports hold no test']);
  const noSources = scratch(t);
  fakeArtifact(noSources, 'multi-module', { sources: MODULES.filter((module) => module !== 'business-app'), results: [] });
  assert.equal(judgeJUnit(noSources, units).suites.find((suite) => suite.task === ':business-app:test').status, 'no-test-sources');

  const malformed = scratch(t);
  fakeArtifact(malformed, 'multi-module');
  write(malformed, 'foundation/build/test-results/test/TEST-nuri.Sample.xml', '<testsuite name="x" tests="3">');
  assert.match(judgeJUnit(malformed, units).errors.join('\n'), /lacks the failures count/);
});

// ⑦ 단일 모듈에서 test 만 돈 보고서는 나머지 모듈의 보고서가 없어 실패한다.
test('a single-module run that only executed the api-server test task fails', (t) => {
  const root = scratch(t);
  const plan = testPlan('single-module');
  fakeArtifact(root, 'single-module', { results: ['test'] });
  assert.deepEqual(judgeJUnit(root, plan.units).errors, [
    'foundationTest: no JUnit report in build/test-results/foundationTest',
    'coreTest: no JUnit report in build/test-results/coreTest',
    'appTest: no JUnit report in build/test-results/appTest',
  ]);
});

test('vitest judgment needs a successful report with tests', (t) => {
  const root = scratch(t);
  const file = join(root, 'vitest.json');
  assert.deepEqual(judgeVitest(file).errors, ['vitest: no JSON report']);
  writeFileSync(file, vitestReport());
  assert.deepEqual(judgeVitest(file).errors, []);
  // ⑤
  writeFileSync(file, vitestReport({ numFailedTests: 2, numFailedTestSuites: 1, success: false,
    testResults: [{ name: join(root, 'src/a.test.ts'), status: 'failed' }, { name: join(root, 'src/b.test.ts'), status: 'passed' }] }));
  const failed = judgeVitest(file, root);
  assert.deepEqual(failed.errors, ['vitest: 1 failed files, 1 failed suites, 2 failed tests', 'vitest: report is not successful']);
  assert.deepEqual(failed.summary.failedFiles, ['src/a.test.ts']);
  // 파일 수는 testResults 에서 센다. numFailedTestSuites 는 describe 블록까지 센 suite 수라 따로 적는다(T2 첫 실행에서 4파일이
  // '9 failed files' 로 적혔다). 남기는 파일 이름은 5개까지지만 수는 전부 센다.
  const many = Array.from({ length: 7 }, (_, index) => ({ name: join(root, `src/f${index}.test.ts`), status: 'failed' }));
  writeFileSync(file, vitestReport({ numFailedTests: 9, numFailedTestSuites: 12, success: false,
    testResults: [...many, { name: join(root, 'src/ok.test.ts'), status: 'passed' }] }));
  const suites = judgeVitest(file, root);
  assert.deepEqual(suites.errors, ['vitest: 7 failed files, 12 failed suites, 9 failed tests', 'vitest: report is not successful']);
  assert.equal(suites.summary.numFailedFiles, 7);
  assert.equal(suites.summary.numFailedTestSuites, 12);
  assert.deepEqual(suites.summary.failedFiles, ['src/f0.test.ts', 'src/f1.test.ts', 'src/f2.test.ts', 'src/f3.test.ts', 'src/f4.test.ts']);
  writeFileSync(file, vitestReport({ numTotalTestSuites: 0, numTotalTests: 0 }));
  assert.deepEqual(judgeVitest(file).errors, ['vitest: report holds no test']);
  writeFileSync(file, '{');
  assert.deepEqual(judgeVitest(file).errors, ['vitest: unreadable JSON report']);
});

// ⑥ 보고서가 없거나, 실패했거나, 계획 밖이면 summary 가 실패한다.
test('the summary fails on a missing, failed or unplanned report', (t) => {
  const root = scratch(t);
  const plan = { include: [{ id: 'preset-core', layout: 'multi-module' }, { id: 'select-survey', layout: 'single-module' }] };
  const report = (id, layout, result) => write(root, `${id}-${layout}/${id}-${layout}.json`, JSON.stringify({ schemaVersion: 1, id, layout, result,
    errors: result === 'passed' ? [] : ['gradle exited 1'], stages: { backend: { suites: [{ tests: 5 }] }, frontend: { numTotalTests: 7 } } }));
  report('preset-core', 'multi-module', 'passed');
  assert.deepEqual(summarize(plan, root).errors, ['select-survey-single-module: no report']);
  report('select-survey', 'single-module', 'failed');
  assert.deepEqual(summarize(plan, root).errors, ['select-survey-single-module: gradle exited 1']);
  report('select-survey', 'single-module', 'passed');
  const passed = summarize(plan, root);
  assert.deepEqual(passed.errors, []);
  assert.deepEqual(passed.rows[0], ['preset-core-multi-module', '통과', '백엔드 5건 · 프런트 7건']);
  report('select-mail', 'multi-module', 'passed');
  assert.deepEqual(summarize(plan, root).errors, ['select-mail-multi-module: report outside the plan']);
  assert.deepEqual(summarize({ include: [] }, root).errors, ['the nightly plan has no item']);
});

/** run 의 흐름: 생성기와 명령 실행을 주입해 실제 생성 없이 판정까지 본다. */
function fakeRun(t, { layout = 'single-module', ran = 'all', vitest = vitestReport(), contracts = [], exits = {},
  settings = MODULES.map((module) => `include '${module}'`).join('\n') } = {}) {
  const root = scratch(t);
  const artifact = join(root, 'build/reusable-base/source/nightly-0123456789-ab');
  const commands = [];
  const generators = {
    preset: async () => {
      write(artifact, 'reusable-base-lock.json', JSON.stringify({ layout, composition: { compositionHash: 'f'.repeat(64) } }));
      write(artifact, 'settings.gradle', `rootProject.name = 'x'\n${settings}\n`);
      for (const script of contracts) write(artifact, script, '');
      return artifact;
    },
    selection: async () => { throw Object.assign(new Error('source failed: password=hunter2hunter2'), { code: 'SOURCE_SURVIVAL' }); },
  };
  const run = (command, args) => {
    commands.push([command, ...args]);
    if (command === 'gradle') fakeArtifact(artifact, layout, { results: ran });
    if (command === 'pnpm') writeFileSync(args.find((arg) => arg.startsWith('--outputFile.json=')).split('=').slice(1).join('='), vitest);
    if (command === 'node') throw Object.assign(new Error('drift'), { exitCode: 1 });
    if (exits[command]) throw Object.assign(new Error('crashed'), { exitCode: exits[command] });
  };
  return { root, artifact, commands, generators, run };
}

test('a VERIFY_FAILED generation records the failed step and a masked log tail; other failures keep the plain shape', async (t) => {
  const { root, commands, run } = fakeRun(t);
  const verifyFailed = Object.assign(new Error('Command failed: node'), { code: 'VERIFY_FAILED', details: { step: 'frontend-build' },
    logTail: ['> next build', 'Error: password=hunter2hunter2 rejected', 42] });
  const failing = async () => { throw verifyFailed; };
  const report = await runItem({ id: 'select-survey', kind: 'selection', target: 'survey', domains: 'survey', layout: 'single-module',
    migrationTests: false }, { root, run, generators: { preset: failing, selection: failing } });
  assert.equal(report.result, 'failed');
  assert.equal(report.stages.generate.code, 'VERIFY_FAILED');
  assert.equal(report.stages.generate.step, 'frontend-build');
  assert.equal(report.stages.generate.logTail.length, 2, 'only string lines are kept');
  assert.equal(report.stages.generate.logTail[0], '> next build');
  assert.doesNotMatch(report.stages.generate.logTail.join(' '), /hunter2/, 'the log tail is masked again');
  assert.equal(commands.length, 0, 'nothing runs after a failed generation');
  assert.deepEqual(generationDiagnostics(Object.assign(new Error('x'), { code: 'SOURCE_SURVIVAL', logTail: ['a'], details: { step: 's' } })), {});
  assert.deepEqual(generationDiagnostics(Object.assign(new Error('x'), { code: 'VERIFY_FAILED' })), {});
});

test('run generates, tests and records a passing report', async (t) => {
  const { root, commands, generators, run } = fakeRun(t);
  const item = { id: 'preset-demo', kind: 'preset', target: 'demo', domains: 'board+comment', layout: 'single-module', migrationTests: true };
  const report = await runItem(item, { root, run, generators });
  assert.equal(report.result, 'passed', report.errors.join('\n'));
  assert.deepEqual(commands[0].slice(0, 6), ['gradle', 'test', 'foundationTest', 'coreTest', 'appTest', 'migrationTest']);
  assert.ok(commands[1].includes('vitest'));
  assert.equal(report.compositionHash, 'f'.repeat(64));
  assert.equal(report.artifact, 'build/reusable-base/source/nightly-0123456789-ab');
  assert.deepEqual(JSON.parse(readFileSync(join(root, REPORT_DIRECTORY, 'preset-demo-single-module.json'), 'utf8')).result, 'passed');
});

test('run fails on missing suites, failing vitest, failed generation and contract drift', async (t) => {
  const item = { id: 'preset-core', kind: 'preset', target: 'core', domains: '', layout: 'single-module', migrationTests: false };
  const onlyApi = fakeRun(t, { ran: ['test'] });
  const partial = await runItem(item, { root: onlyApi.root, run: onlyApi.run, generators: onlyApi.generators });
  assert.equal(partial.result, 'failed');
  assert.match(partial.errors.join('\n'), /foundationTest: no JUnit report/);
  assert.deepEqual(partial.stages.backend.excluded.map((entry) => entry.task), ['migrationTest']);

  const multi = fakeRun(t, { layout: 'multi-module', vitest: vitestReport({ numFailedTests: 1, numFailedTestSuites: 1, success: false }) });
  const red = await runItem({ ...item, layout: 'multi-module' }, { root: multi.root, run: multi.run, generators: multi.generators });
  assert.deepEqual(multi.commands[0].slice(0, 4), ['gradle', 'test', '-x', ':migration-tool:test']);
  assert.match(red.errors.join('\n'), /vitest: 0 failed files, 1 failed suites, 1 failed tests/);

  // include 형식이 달라도 모듈이 빠지지 않는다 — gradle 이 0으로 끝나고 XML 이 없으면 보고서 없음으로 실패다.
  const parenthesized = fakeRun(t, { layout: 'multi-module', ran: [], settings: "include(':foundation')\ninclude(':api-server')" });
  const quiet = await runItem({ ...item, layout: 'multi-module' }, { root: parenthesized.root, run: parenthesized.run, generators: parenthesized.generators });
  assert.deepEqual(quiet.errors, [':foundation:test: no JUnit report in foundation/build/test-results/test',
    ':api-server:test: no JUnit report in api-server/build/test-results/test', 'backend: no JUnit test was judged']);
  const unlisted = fakeRun(t, { layout: 'multi-module', settings: '// 모듈 없음' });
  const empty = await runItem({ ...item, layout: 'multi-module' }, { root: unlisted.root, run: unlisted.run, generators: unlisted.generators });
  assert.deepEqual(empty.errors, ['multi-module settings.gradle declares no module']);
  assert.equal(unlisted.commands.length, 0, 'nothing runs on an empty population');

  // 보고서가 깨끗해도 명령이 실패로 끝났으면 실패다(보고서 뒤의 단계가 깨졌을 수 있다).
  const crashed = fakeRun(t, { exits: { gradle: 1, pnpm: 137 } });
  const exited = await runItem(item, { root: crashed.root, run: crashed.run, generators: crashed.generators });
  assert.deepEqual(exited.errors, ['gradle exited 1', 'vitest exited 137']);

  const broken = fakeRun(t);
  const failed = await runItem({ id: 'select-survey', kind: 'selection', target: 'survey', domains: 'survey', layout: 'single-module',
    migrationTests: false }, { root: broken.root, run: broken.run, generators: broken.generators });
  assert.equal(failed.result, 'failed');
  assert.deepEqual(failed.stages.generate, { result: 'failed', code: 'SOURCE_SURVIVAL' });
  assert.doesNotMatch(failed.errors.join('\n'), /hunter2/, 'generator messages are masked');
  assert.equal(broken.commands.length, 0, 'nothing runs after a failed generation');

  const drift = fakeRun(t, { contracts: CONTRACT_CHECKS.slice(1).map(([, script]) => script) });
  const checked = await runItem(item, { root: drift.root, run: drift.run, generators: drift.generators, contracts: true });
  assert.deepEqual(checked.stages.contracts.map((entry) => [entry.name, entry.exitCode]), [
    ['screens', 'missing'], ['slots', 1], ['permissions', 1], ['generated-boundaries', 1], ['operation-consumers', 1]]);
  assert.match(checked.errors.join('\n'), /contract screens: scripts\/generate-screen-registry\.mjs is missing/);
  const unchecked = fakeRun(t);
  const plain = await runItem(item, { root: unchecked.root, run: unchecked.run, generators: unchecked.generators });
  assert.equal(plain.stages.contracts, undefined, 'contract regeneration is off by default');
  assert.ok(!unchecked.commands.some(([command]) => command === 'node'));
});

// 생성은 기존 진입점을 그대로 부른다. 폐포에도 투영 원장 대조를 부른다(엔진 경로는 그 대조를 하지 않는다).
test('generation reuses the preset verification and the composer engine with the projection ledger check', async () => {
  const presetCalls = [];
  const artifact = await generatePreset({ root: '/repo', item: { target: 'core', layout: 'single-module' } }, {
    verifyBase: async (options) => { presetCalls.push(options); return options.verify({ root: '/repo/build/reusable-base/source/verified-core' }); },
    verifyArtifact: ({ root }) => ({ root, result: 'passed' }),
  });
  assert.equal(artifact, '/repo/build/reusable-base/source/verified-core');
  assert.deepEqual([presetCalls[0].profile, presetCalls[0].layout], ['core', 'single-module']);
  await assert.rejects(generatePreset({ root: '/repo', item: { target: 'core', layout: 'single-module' } }, { verifyBase: async () => ({}) }),
    /did not reach the artifact verification/);

  const recipes = [];
  const ledger = [];
  const project = await generateSelection({ root: '/repo', item: { id: 'select-board-comment', target: 'board', domains: 'board+comment',
    layout: 'multi-module' } }, {
    createEngine: () => ({ catalog: () => ({ sourceRef: 'a'.repeat(40) }),
      generate: async (recipe) => { recipes.push(recipe); return { projectDirectory: '/repo/build/reusable-base/source/nightly-x' }; } }),
    checkLedger: (...args) => ledger.push(args),
  });
  assert.equal(project, '/repo/build/reusable-base/source/nightly-x');
  assert.deepEqual(recipes[0].selection, { domains: ['board'] });
  assert.equal(recipes[0].backendLayout, 'multi-module');
  assert.equal(recipes[0].sourceRef, 'a'.repeat(40));
  assert.match(recipes[0].project.name, /^nightly-[0-9a-f]{10}$/);
  assert.deepEqual(ledger, [['/repo', '/repo/build/reusable-base/source/nightly-x']]);
});

const WORKFLOW = '.github/workflows/reusable-nightly.yml';

/**
 * T2 워크플로의 모양(DEC-OPS-283). 수동 실행과 매일 예약 하나, 읽기 권한만, 비밀 0, 캐시는 읽기만, 계획이 matrix 를 만든다.
 * 계약 대조는 기본으로 켠다(Phase 2 B8 — 예약 실행은 입력이 없어 러너의 기본값을 쓴다).
 * run 줄에 `${{ }}` 를 두지 않는다 — 입력은 env 로만 넘겨 셸 주입을 막는다.
 */
function nightlyWorkflowErrors(source) {
  const errors = [];
  const text = source.replace(/\r\n/g, '\n').replace(/^\s*#.*$/gm, '');
  const block = (name) => text.match(new RegExp(`^${name}:\\n((?: {2}.*\\n|\\n)*)`, 'm'))?.[1] ?? '';
  const triggers = [...block('on').matchAll(/^ {2}([a-z_]+):/gm)].map((match) => match[1]);
  if (!triggers.includes('workflow_dispatch') || !triggers.includes('schedule')
    || triggers.some((name) => !['workflow_dispatch', 'schedule'].includes(name))) {
    errors.push('nightly verification runs only on demand and on a daily schedule');
  }
  const crons = [...text.matchAll(/^ {4}- cron: '([^']*)'/gm)].map((match) => match[1]);
  // 예약이 둘이면 같은 그룹에서 겹쳐 하나가 취소되고, 없으면 매일 돌지 않는다.
  if (crons.length !== 1) errors.push(`nightly verification has exactly one daily schedule, found ${crons.length}`);
  for (const cron of crons) {
    if (!/^(?:[1-9]|[1-5]\d) \S+ \* \* \*$/.test(cron)) errors.push(`nightly schedule must run daily off the top of the hour: ${cron}`);
  }
  if (!/^ {6}contracts:\n(?: {8}.*\n)*? {8}default: true\n/m.test(block('on'))) {
    errors.push('contract regeneration is on by default');
  }
  if (block('permissions').trim() !== 'contents: read' || /^ {4}permissions:/m.test(text)) errors.push('nightly verification keeps contents read-only');
  if (/\bsecrets\./.test(text)) errors.push('nightly verification uses no secret');
  // max-parallel 은 실행 하나에만 걸린다. 그룹이 하나여야 겹친 dispatch·예약이 동시 10잡 예산을 넘지 않는다.
  const concurrency = block('concurrency').split('\n').map((line) => line.trim()).filter(Boolean);
  if (JSON.stringify(concurrency) !== JSON.stringify(['group: reusable-nightly', 'cancel-in-progress: false']) || /^ {4}concurrency:/m.test(text)) {
    errors.push('nightly runs share one concurrency group without cancelling the running one');
  }
  const jobs = parseWorkflowJobs(text);
  if (JSON.stringify([...jobs.keys()]) !== JSON.stringify(['plan', 'verify', 'summary'])) errors.push('nightly jobs are plan, verify and summary');
  const verify = jobs.get('verify') ?? '';
  for (const line of ['    needs: plan', '    timeout-minutes: 60', '      fail-fast: false', '      max-parallel: 10',
    '      matrix: ${{ fromJSON(needs.plan.outputs.matrix) }}', '          NIGHTLY_ITEM: ${{ toJSON(matrix) }}',
    '          NIGHTLY_CONTRACTS: ${{ inputs.contracts }}',
    '        run: node scripts/reusable-nightly.mjs run --item "$NIGHTLY_ITEM" --contracts "$NIGHTLY_CONTRACTS"']) {
    if (!verify.split('\n').includes(line)) errors.push(`verify job must keep: ${line.trim()}`);
  }
  // 생성기는 원본 frontend 의 도구로 생성물의 API 계약을 다시 만든다(10c-2). 생성 단계보다 앞에서 설치해야 한다.
  const install = verify.indexOf('- name: Install source frontend tools for contract projection\n'
    + '        run: pnpm install --frozen-lockfile\n        working-directory: frontend\n');
  const generate = verify.indexOf('- name: Generate, verify and test the composition\n');
  if (install < 0 || generate < 0 || install > generate) errors.push('the verify job installs the source frontend tools before it generates');
  if (!(jobs.get('plan') ?? '').includes('run: node scripts/reusable-nightly.mjs plan ')) errors.push('the plan job computes the matrix');
  if (!/- name: Retain the composition report\n {8}if: always\(\)\n(?: {8,}.*\n)* {10}if-no-files-found: error\n/.test(verify)) {
    errors.push('every composition keeps its report, failed or not');
  }
  const summary = jobs.get('summary') ?? '';
  if (!/^ {4}if: always\(\)$/m.test(summary) || !summary.includes('node scripts/reusable-nightly.mjs summary --plan')) {
    errors.push('the summary always judges every planned composition');
  }
  const expressionLines = text.split('\n').filter((line) => line.includes('${{'));
  if (expressionLines.some((line) => !/^\s+(?:- )?[A-Za-z][\w-]*: /.test(line) || /^\s+(?:- )?run: /.test(line))) {
    errors.push('workflow expressions reach scripts only through env');
  }
  if (/continue-on-error:/.test(text)) errors.push('nightly verification never forgives a failure');
  const checkouts = [...text.matchAll(/uses: actions\/checkout@[0-9a-f]{40}.*\n(?: {8}.*\n)*/g)].map((match) => match[0]);
  if (checkouts.length !== 3 || checkouts.some((step) => !step.includes('persist-credentials: false'))) {
    errors.push('every checkout drops the job token');
  }
  errors.push(...validatePinnedWorkflowUses([{ path: WORKFLOW, content: source }]));
  return errors;
}

test('the nightly workflow runs daily and on demand, read-only, without secrets and with a read-only Gradle cache', () => {
  const source = readFileSync(join(ROOT, WORKFLOW), 'utf8');
  assert.deepEqual(nightlyWorkflowErrors(source), []);
  // 예약은 매일 06:17 KST 하나다(Phase 2 B8). 첫 수동 실행(run 38275695802)의 붉은 구성은 원인마다 담당 커밋으로 고친 뒤 켰다.
  assert.deepEqual([...source.matchAll(/^ {4}- cron: '([^']*)'/gm)].map((match) => match[1]), ['17 21 * * *']);
  const lf = source.replace(/\r\n/g, '\n');
  const cron = "    - cron: '17 21 * * *'\n";
  for (const [mutation, expected] of [
    [lf.replace('on:\n  schedule:', 'on:\n  pull_request:\n  schedule:'), /only on demand and on a daily schedule/],
    [lf.replace(`  schedule:\n${cron}`, ''), /exactly one daily schedule, found 0/],
    [lf.replace(cron, `${cron}    - cron: '47 9 * * *'\n`), /exactly one daily schedule, found 2/],
    [lf.replace("'17 21 * * *'", "'0 21 * * *'"), /off the top of the hour: 0 21/],
    [lf.replace("'17 21 * * *'", "'17 21 * * 1'"), /daily off the top of the hour: 17 21 \* \* 1/],
    [lf.replace('        default: true\n        type: boolean', '        default: false\n        type: boolean'), /on by default/],
    [lf.replace('          NIGHTLY_CONTRACTS: ${{ inputs.contracts }}\n', "          NIGHTLY_CONTRACTS: 'false'\n"), /verify job must keep: NIGHTLY_CONTRACTS/],
    [lf.replace('permissions:\n  contents: read', 'permissions:\n  contents: write'), /contents read-only/],
    [lf.replace('          NIGHTLY_LAYOUT: ${{ inputs.layout }}', '          NIGHTLY_LAYOUT: ${{ inputs.layout }}\n          TOKEN: ${{ secrets.DEPLOY_TOKEN }}'), /no secret/],
    [lf.replace('cache-read-only: true', 'cache-read-only: false'), /verify Gradle cache-read-only must be true/],
    [lf.replace('      max-parallel: 10', '      max-parallel: 20'), /max-parallel: 10/],
    [lf.replace('  group: reusable-nightly\n', '  group: reusable-nightly-${{ github.ref }}\n'), /share one concurrency group/],
    [lf.replace('  cancel-in-progress: false', '  cancel-in-progress: true'), /share one concurrency group/],
    [lf.replace('    timeout-minutes: 60\n', '    timeout-minutes: 60\n    concurrency: verify-${{ github.ref }}\n'), /share one concurrency group/],
    [lf.replace('--item "$NIGHTLY_ITEM"', "--item '${{ toJSON(matrix) }}'"), /only through env/],
    [lf.replace('\n    if: always()\n', '\n'), /always judges every planned composition/],
    [lf.replace('- name: Retain the composition report\n        if: always()\n', '- name: Retain the composition report\n'), /keeps its report/],
    [lf.replace('          if-no-files-found: error', '          if-no-files-found: warn'), /keeps its report/],
    [lf.replace('          printf', '          echo "${{ inputs.compositions }}"\n          printf'), /only through env/],
    [lf.replace('      - name: Install source frontend tools for contract projection\n        run: pnpm install --frozen-lockfile\n'
      + '        working-directory: frontend\n', ''), /installs the source frontend tools before it generates/],
  ]) {
    assert.notEqual(mutation, lf, String(expected));
    assert.match(nightlyWorkflowErrors(mutation).join('\n'), expected);
  }
  // 정각을 피한 다른 매일 시각은 모양으로는 통과한다(시각은 위 단언이 고정한다).
  assert.deepEqual(nightlyWorkflowErrors(lf.replace("'17 21 * * *'", "'47 20 * * *'")), []);
});

// 예약 실행은 워크플로 입력이 없어 --contracts 에 빈 값이 온다. 빈 값은 기본(켬)이고, 'false' 만 끈다.
test('the contracts option is on unless it says false, and a typo fails instead of silently turning it off', () => {
  for (const value of [undefined, '', 'true']) assert.equal(contractsOption(value), true, String(value));
  assert.equal(contractsOption('false'), false);
  for (const value of ['False', 'no', '0', 'ture']) assert.throws(() => contractsOption(value), /--contracts must be true or false/);
  // run 이 받는 인자 그대로: 예약 실행(빈 값)·인자 없음은 켜고, 수동 실행의 false 만 끈다.
  const item = '{"id":"preset-core"}';
  assert.deepEqual(runArguments(['--item', item, '--contracts', '']), { item: { id: 'preset-core' }, contracts: true });
  assert.equal(runArguments(['--item', item]).contracts, true);
  assert.equal(runArguments(['--item', item, '--contracts', 'false']).contracts, false);
});
