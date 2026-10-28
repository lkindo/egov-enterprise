#!/usr/bin/env node
/**
 * 재사용 생성물의 일반 테스트를 돌리는 야간 검증(T2 — 설계서 12단계, DEC-OPS-283).
 *
 * plan    카탈로그로 시작 구성과 서로 다른 단독 폐포를 계산해 GitHub matrix 를 낸다. 이름을 손으로 쓰지 않으므로
 *         간선·시작 구성이 바뀌어도 이 파일을 고치지 않는다.
 * run     한 구성을 기존 진입점으로 생성·산출물 검증(T1)한 뒤 일반 테스트를 돌린다. 시작 구성은 verifyReusableBase,
 *         단독 선택은 createComposerEngine().generate 다 — 판정기를 새로 두지 않는다.
 * summary 계획의 모든 항목에 통과 보고서가 있는지 본다. 보고서가 없거나 실패면 실패다.
 *
 * 판정은 종료 코드가 아니라 작업별 JUnit XML 과 vitest JSON 이다. 보고서가 없거나 모집단이 0이면 실패다.
 */
import { createHash, randomBytes } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { createLogMasker } from './project-composer-command.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { createComposerEngine } from './project-composer.mjs';
import { BACKEND_LAYOUTS, normalizeBackendLayout } from './reusable-layout.mjs';
import { judgeJUnit, judgeVitest, summarize } from './reusable-nightly-judge.mjs';
import { runCommand, verifyReusableArtifact } from './verify-reusable-artifact.mjs';
import { assertProjectionLedgerCoverage, verifyReusableBase } from './verify-reusable-base.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REPORT_DIRECTORY = 'build/reports/reusable-nightly';
const ITEM_ID = /^[a-z][a-z0-9-]{0,79}$/;
const FEATURE = /^[a-z][a-z0-9-]*$/;

/**
 * 구성 잡에서 빼는 시험 작업의 원장이다. 여기 없는 작업을 빼면 run 이 실패한다(testPlanErrors).
 * 이관 도구 시험은 구성과 무관하다 — 고정 픽스처와 자기 V1 스키마를 쓰고, PR 마다 migration-test-scope 가, 매주
 * migration-tool.yml 이 전수로 돈다. 벤더 컨테이너 4종을 구성마다 다시 띄우면 잡이 37~40분으로 는다. 그래서 가장 많은
 * 기능을 담은 시작 구성의 두 레이아웃에서만 생성물의 이관 시험 배선을 본다(nightlyPlan 의 carrier).
 */
const MIGRATION_REASON = '이관 도구 시험은 구성과 무관하다. PR(migration-test-scope)·매주(migration-tool.yml)가 전수로 돌고, '
  + '여기서는 가장 많은 기능을 담은 시작 구성의 두 레이아웃에서만 배선을 본다.';
export const TEST_EXCLUSIONS = Object.freeze({
  'multi-module': Object.freeze({ ':migration-tool:test': MIGRATION_REASON }),
  'single-module': Object.freeze({ migrationTest: MIGRATION_REASON }),
});

// 단일 모듈의 test 는 api-server 시험만 돈다. 나머지 모듈은 이름 있는 Test 작업이다(reusable-single-module.mjs).
const SINGLE_MODULE_SUITES = Object.freeze({
  test: 'api-server', foundationTest: 'foundation', coreTest: 'business-core', appTest: 'business-app', migrationTest: 'migration-tool',
});

/** 생성물에서 판정할 시험 단위. 멀티 모듈은 settings.gradle 의 모듈마다, 단일 모듈은 이름 있는 Test 작업마다다. */
export function testUnits(layout, modules = []) {
  normalizeBackendLayout(layout);
  return layout === 'single-module'
    ? Object.entries(SINGLE_MODULE_SUITES).map(([task, module]) => ({ task, source: `${module}/src/test/java`, results: `build/test-results/${task}` }))
    : modules.map((module) => ({ task: `:${module}:test`, source: `${module}/src/test/java`, results: `${module}/build/test-results/test` }));
}

export function testPlan(layout, { migrationTests = false, modules = [] } = {}) {
  const population = testUnits(layout, modules);
  const excluded = migrationTests ? [] : population.map((unit) => unit.task).filter((task) => Object.hasOwn(TEST_EXCLUSIONS[layout], task));
  const units = population.filter((unit) => !excluded.includes(unit.task));
  const tasks = layout === 'single-module' ? units.map((unit) => unit.task) : ['test'];
  return { tasks, excluded, units };
}

/**
 * 멀티 모듈 settings.gradle 이 포함하는 모듈. `include 'a'`·`include 'a', 'b'`·`include(':a')` 를 모두 읽고 앞의 ':' 는
 * 떼어 낸다. 줄 머리의 `include` 만 보므로 줄 주석은 걸리지 않는다. 판정 모집단이 여기서 정해지므로, 모듈 0개나
 * api-server 부재는 testPlanErrors 가 거부한다 — 형식을 못 읽어 모듈이 빠져도 통과하지 않게 한다.
 */
export function settingsModules(text) {
  return [...text.matchAll(/^[ \t]*include\b[ \t]*\(?([^\n]*)$/gm)]
    .flatMap(([, args]) => [...args.matchAll(/['"]([^'"]+)['"]/g)].map(([, name]) => name.replace(/^:/, '')));
}

/** 원장 밖 제외와, 돌리지 않거나 판정하지 않는 시험 작업, 모집단이 비거나 어긋난 멀티 모듈 계획을 거부한다. */
export function testPlanErrors(plan, layout, modules = []) {
  const errors = [];
  if (layout === 'multi-module') {
    if (modules.length === 0) errors.push('multi-module settings.gradle declares no module');
    else if (!modules.includes('api-server')) errors.push('multi-module settings.gradle lacks api-server');
    for (const module of modules) if (!FEATURE.test(module)) errors.push(`module is not a top-level project: ${module}`);
  }
  for (const task of plan.excluded) {
    if (!TEST_EXCLUSIONS[layout]?.[task]) errors.push(`test task excluded outside the ledger: ${task}`);
  }
  const judged = new Set(plan.units.map((unit) => unit.task));
  for (const { task } of testUnits(layout, modules)) {
    if (!plan.excluded.includes(task) && !judged.has(task)) errors.push(`test task is neither judged nor excluded: ${task}`);
    if (judged.has(task) && layout === 'single-module' && !plan.tasks.includes(task)) errors.push(`judged test task does not run: ${task}`);
  }
  if (layout === 'multi-module' && !plan.tasks.includes('test')) errors.push('multi-module plan must run the aggregate test task');
  return errors;
}

export function gradleTestArgs(plan) {
  return [...plan.tasks, ...plan.excluded.flatMap((task) => ['-x', task]), '--continue', '--no-daemon', '--console=plain', '-Dfile.encoding=UTF-8'];
}

/**
 * 생성물 안에서 계약 생성물을 다시 만들어 대조한다(--check). 기본으로 켠다(Phase 2 B8) — 권한·계약 사슬 투영이 이것들을
 * 구성으로 다시 만들므로 생성물에서 다시 만든 결과와 같아야 한다. 스크립트가 없으면 실패다.
 */
export const CONTRACT_CHECKS = Object.freeze([
  ['screens', 'scripts/generate-screen-registry.mjs', '--check'], ['slots', 'scripts/slot-registry.mjs', '--check'],
  ['permissions', 'scripts/generate-permissions.mjs', '--check'], ['generated-boundaries', 'scripts/generated-boundary-census.mjs', '--check'],
  ['operation-consumers', 'scripts/operation-consumer-census.mjs'],
]);

/** 예약 실행은 입력이 없어 빈 값이 오므로 빈 값은 켬이다. 'false' 만 끄고, 오타가 대조를 조용히 끄지 않도록 그 밖의 값은 실패다. */
export function contractsOption(value) {
  if (value === undefined || value === '' || value === 'true') return true;
  if (value === 'false') return false;
  throw new Error(`--contracts must be true or false: ${value}`);
}

export function catalogPlanInput(catalog, resolveRecipe = resolveProjectRecipe) {
  const domainsOf = (selection) => [...resolveRecipe({ schemaVersion: 1, project: { name: 'nightly-plan' }, sourceRef: 'HEAD', selection,
    database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, catalog).resolvedDomains].sort();
  return {
    presets: catalog.presets.map((preset) => ({ id: preset.id, domains: domainsOf({ preset: preset.id }) })),
    domains: catalog.capabilities.filter((capability) => capability.available).map((capability) => capability.id).sort(),
    closureOf: (ids) => domainsOf({ domains: ids }),
  };
}

function selectionItem(selection, closure) {
  const key = closure.join('-');
  const id = `select-${key}`.length <= 60 ? `select-${key}` : `select-${createHash('sha256').update(key).digest('hex').slice(0, 12)}`;
  return { id, kind: 'selection', target: selection.join('+'), domains: closure.join('+') };
}

/**
 * 시작 구성은 두 레이아웃, 단독 폐포는 (UTC 날짜 일수 + 정렬 순번) % 2 로 번갈아 한 레이아웃이다.
 * 전체 계획에서 기능 목록이 어떤 시작 구성과 같은 단독 폐포는 돌지 않는다 — 그 시작 구성이 같은 목록을 두 레이아웃으로 이미 돌고,
 * 같은 목록은 같은 결과다(ADR-0028, 시작 구성 동치 계약). 2026-10-13 설문·결재 시작 구성이 그런 폐포 둘(survey·informalsanction)을 덮는다.
 * compositions 는 'preset:<id>' 또는 '<기능>+<기능>' 토큰 목록이다(기능 브랜치의 직접 선택 검증용). 이름으로 고른 직접 선택은 건너뛰지 않는다.
 */
export function nightlyPlan({ presets, domains, closureOf }, { compositions = '', layout = 'auto', date = new Date() } = {}) {
  if (!['auto', 'both', ...BACKEND_LAYOUTS].includes(layout)) throw new Error(`layout must be auto, both, ${BACKEND_LAYOUTS.join(' or ')}`);
  if (presets.length === 0) throw new Error('the catalog declares no preset');
  if (Number.isNaN(date.getTime())) throw new Error('date must be a valid calendar date');
  const carrier = [...presets].sort((a, b) => b.domains.length - a.domains.length || a.id.localeCompare(b.id))[0].id;
  const presetItem = (preset) => ({ id: `preset-${preset.id}`, kind: 'preset', target: preset.id, domains: preset.domains.join('+') });
  const targets = new Map();
  const tokens = compositions.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) {
    for (const preset of presets) targets.set(`preset-${preset.id}`, presetItem(preset));
    const presetLists = new Set(presets.map((preset) => preset.domains.join('+')));
    for (const id of domains) {
      const item = selectionItem([id], closureOf([id]));
      if (!targets.has(item.id) && !presetLists.has(item.domains)) targets.set(item.id, item);
    }
  }
  for (const token of tokens) {
    if (token.startsWith('preset:')) {
      const preset = presets.find((candidate) => candidate.id === token.slice('preset:'.length));
      if (!preset) throw new Error(`unknown preset: ${token}`);
      targets.set(`preset-${preset.id}`, presetItem(preset));
      continue;
    }
    const selection = [...new Set(token.split('+'))].sort();
    const unknown = selection.filter((id) => !domains.includes(id));
    if (unknown.length) throw new Error(`unknown or unavailable feature: ${unknown.join(', ')}`);
    const item = selectionItem(selection, closureOf(selection));
    if (!targets.has(item.id)) targets.set(item.id, item);
  }
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  let order = 0;
  const include = [...targets.values()].flatMap((item) => {
    const layouts = layout === 'both' || (layout === 'auto' && item.kind === 'preset') ? BACKEND_LAYOUTS
      : layout === 'auto' ? [BACKEND_LAYOUTS[(day + order++) % 2]] : [layout];
    return layouts.map((value) => ({ ...item, layout: value, migrationTests: item.kind === 'preset' && item.target === carrier }));
  });
  return { include };
}

export function validateItem(item) {
  const valid = item && typeof item === 'object' && ITEM_ID.test(item.id ?? '') && ['preset', 'selection'].includes(item.kind)
    && BACKEND_LAYOUTS.includes(item.layout) && typeof item.migrationTests === 'boolean' && typeof item.domains === 'string'
    && (item.kind === 'preset' ? FEATURE.test(item.target ?? '') : String(item.target ?? '').split('+').every((id) => FEATURE.test(id)));
  if (!valid) throw new Error('nightly item must come from the plan');
  return item;
}

/** 시작 구성은 PR CI 와 같은 진입점으로 생성·산출물 검증(T1)한다. 생성물 경로는 산출물 검증에 넘어간 경로다. */
export async function generatePreset({ root, item }, { verifyBase = verifyReusableBase, verifyArtifact = verifyReusableArtifact } = {}) {
  let artifact;
  await verifyBase({ root, profile: item.target, layout: item.layout,
    verify: ({ root: output }) => { artifact = output; return verifyArtifact({ root: output }); } });
  if (!artifact) throw new Error('the preset verification did not reach the artifact verification');
  return artifact;
}

/** 단독 선택은 생성기 화면·사용자 구성 CI 와 같은 엔진으로 생성·산출물 검증(T1)한다. */
export async function generateSelection({ root, item }, { createEngine = createComposerEngine, checkLedger = assertProjectionLedgerCoverage } = {}) {
  const engine = createEngine({ root });
  const name = `nightly-${createHash('sha256').update(item.domains).digest('hex').slice(0, 10)}`;
  const result = await engine.generate({ schemaVersion: 1, project: { name }, sourceRef: engine.catalog().sourceRef,
    selection: { domains: item.target.split('+') }, database: { vendor: 'postgresql' }, backendLayout: item.layout },
  { onProgress: ({ stage, progress }) => process.stdout.write(`[reusable-nightly] ${item.id} ${stage} ${progress}%\n`) });
  // 엔진은 투영 원장 대조를 하지 않는다(시작 구성 경로만 한다). 폐포에도 불러 누락의 원인을 이름으로 남긴다.
  checkLedger(root, result.projectDirectory);
  return result.projectDirectory;
}

const exitCodeOf = (action) => { try { action(); return 0; } catch (error) { return error.exitCode ?? 'spawn'; } };

/**
 * 생성 실패의 진단 — 산출물 검증 실패(VERIFY_FAILED)면 분류기가 붙인 실패 단계와 로그 끝부분을 보고서에 싣는다(판정은 그대로다).
 * 종전에는 코드만 실어 'verify 23%' 뒤 실패의 원인(인프라·코드)을 보고서로 가를 수 없었다(T2 2026-10-20 select-promotion).
 * 로그 끝부분은 분류기가 이미 비밀을 가리고 경로를 지운 줄이며, 보고서의 다른 줄과 같은 가리개를 한 번 더 거친다.
 */
export function generationDiagnostics(error, masker = createLogMasker()) {
  if (error?.code !== 'VERIFY_FAILED') return {};
  const step = typeof error.details?.step === 'string' ? error.details.step : undefined;
  const logTail = Array.isArray(error.logTail)
    ? error.logTail.filter((line) => typeof line === 'string').map((line) => masker.line(line).slice(0, 500)) : [];
  return { ...(step ? { step } : {}), ...(logTail.length ? { logTail } : {}) };
}

export async function runItem(item, { root = ROOT, contracts = false, run = runCommand,
  generators = { preset: generatePreset, selection: generateSelection } } = {}) {
  validateItem(item);
  const masker = createLogMasker();
  const output = resolve(root, REPORT_DIRECTORY, `${item.id}-${item.layout}.json`);
  const report = { schemaVersion: 1, ...item, contracts, startedAt: new Date().toISOString(), result: 'started', stages: {}, errors: [] };
  const save = () => { mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`); };
  save();
  try {
    let artifact;
    try { artifact = await generators[item.kind]({ root, item }); report.stages.generate = { result: 'passed' }; }
    catch (error) {
      report.stages.generate = { result: 'failed', code: error.code ?? null, ...generationDiagnostics(error, masker) };
      throw error;
    }
    report.artifact = relative(root, artifact).replaceAll('\\', '/');
    const lock = JSON.parse(readFileSync(join(artifact, 'reusable-base-lock.json'), 'utf8'));
    if (normalizeBackendLayout(lock.layout) !== item.layout) throw new Error('generated layout differs from the plan');
    report.compositionHash = lock.composition?.compositionHash ?? null;
    const env = { ...process.env, TZ: 'Asia/Seoul', JWT_SECRET: process.env.JWT_SECRET || randomBytes(44).toString('hex') };

    const modules = item.layout === 'multi-module' ? settingsModules(readFileSync(join(artifact, 'settings.gradle'), 'utf8')) : [];
    const plan = testPlan(item.layout, { migrationTests: item.migrationTests, modules });
    const planErrors = testPlanErrors(plan, item.layout, modules);
    if (planErrors.length) throw new Error(planErrors.join('; '));
    const args = gradleTestArgs(plan);
    const gradleExit = exitCodeOf(() => run('gradle', args, { root: artifact, env }));
    const backend = judgeJUnit(artifact, plan.units);
    if (gradleExit !== 0) backend.errors.push(`gradle exited ${gradleExit}`);
    report.stages.backend = { command: ['gradle', ...args].join(' '), exitCode: gradleExit, suites: backend.suites, errors: backend.errors,
      excluded: plan.excluded.map((task) => ({ task, reason: TEST_EXCLUSIONS[item.layout][task] })) };

    const vitestReport = join(artifact, REPORT_DIRECTORY, 'vitest.json');
    mkdirSync(dirname(vitestReport), { recursive: true });
    const vitestExit = exitCodeOf(() => run('pnpm', ['-C', 'frontend', 'exec', 'vitest', 'run', '--reporter=default', '--reporter=json',
      `--outputFile.json=${vitestReport}`], { root: artifact, env }));
    const frontend = judgeVitest(vitestReport, join(artifact, 'frontend'));
    if (vitestExit !== 0) frontend.errors.push(`vitest exited ${vitestExit}`);
    report.stages.frontend = { exitCode: vitestExit, ...frontend.summary, errors: frontend.errors };

    const contractErrors = [];
    if (contracts) {
      report.stages.contracts = CONTRACT_CHECKS.map(([name, script, ...rest]) => {
        const exitCode = existsSync(join(artifact, script)) ? exitCodeOf(() => run('node', [script, ...rest], { root: artifact, env })) : 'missing';
        if (exitCode !== 0) contractErrors.push(`contract ${name}: ${exitCode === 'missing' ? `${script} is missing` : `exited ${exitCode}`}`);
        return { name, exitCode };
      });
    }
    report.errors = [...backend.errors, ...frontend.errors, ...contractErrors];
  } catch (error) {
    report.errors.push(masker.line(String(error.message)).slice(0, 500));
  } finally {
    report.result = report.errors.length === 0 ? 'passed' : 'failed';
    report.finishedAt = new Date().toISOString();
    save();
  }
  return report;
}

function option(argv, name, fallback = undefined) {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  if (index + 1 >= argv.length) throw new Error(`${name} needs a value`);
  return argv[index + 1];
}

/** `run` 의 인자. 워크플로는 예약 실행에도 `--contracts "$NIGHTLY_CONTRACTS"`(빈 값)를 넘긴다. */
export function runArguments(argv) {
  return { item: JSON.parse(option(argv, '--item', 'null')), contracts: contractsOption(option(argv, '--contracts')) };
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (command === 'plan') {
    const date = option(rest, '--date');
    const matrix = nightlyPlan(catalogPlanInput(loadProjectComposerCatalog(ROOT)), { compositions: option(rest, '--compositions', ''),
      layout: option(rest, '--layout', 'auto') || 'auto', ...(date ? { date: new Date(`${date}T00:00:00Z`) } : {}) });
    const githubOutput = option(rest, '--github-output');
    if (githubOutput) appendFileSync(githubOutput, `matrix=${JSON.stringify(matrix)}\n`, 'utf8');
    process.stdout.write(`${JSON.stringify(matrix, null, 2)}\n`);
  } else if (command === 'run') {
    const { item, contracts } = runArguments(rest);
    const report = await runItem(item, { contracts });
    process.stdout.write(`[reusable-nightly] ${report.id}/${report.layout}: ${report.result}\n`);
    for (const error of report.errors) process.stderr.write(`  - ${error}\n`);
    if (report.result !== 'passed') process.exitCode = 1;
  } else if (command === 'summary') {
    const { rows, errors } = summarize(JSON.parse(readFileSync(option(rest, '--plan'), 'utf8')), resolve(option(rest, '--reports')));
    const table = ['| 구성·레이아웃 | 결과 | 시험 |', '|---|---|---|', ...rows.map((row) => `| ${row.join(' | ')} |`)].join('\n');
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 재사용 야간 검증\n\n${table}\n`, 'utf8');
    process.stdout.write(`${table}\n`);
    for (const error of errors) process.stderr.write(`  - ${error}\n`);
    if (errors.length) process.exitCode = 1;
  } else {
    throw new Error('usage: reusable-nightly.mjs plan [--compositions S] [--layout auto|both|multi-module|single-module] [--date YYYY-MM-DD] '
      + '[--github-output FILE] | run --item JSON [--contracts true|false] | summary --plan FILE --reports DIR');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => { process.stderr.write(`[reusable-nightly] ${error.message}\n`); process.exitCode = 1; });
}
