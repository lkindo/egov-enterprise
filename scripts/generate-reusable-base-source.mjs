#!/usr/bin/env node
/**
 * 검증된 DB bundle과 현재 릴리스 소스를 결합해 reusable-base 소스 트리를 만든다.
 * 장기 template 브랜치를 만들거나 현재 working tree를 수정하지 않는다.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectReusableGovernance } from './reusable-governance-projection.mjs';
import { canonicalJsonSha256, validateReusableGovernance } from './reusable-governance-integrity.mjs';
import { ARTIFACT_COMMAND, VERIFICATION_HISTORY, artifactAliases, projectReusableMakefile, reusableArtifactEntrypoints, verificationTextHash } from './reusable-artifact-entrypoints-contract.mjs';
import { normalizeBackendLayout } from './reusable-layout.mjs';
import { runReportingChild } from './project-composer-child-failure.mjs';
import { applySingleModuleLayout } from './reusable-single-module.mjs';
import { installMultiModuleMigrationRuntime, installSingleModuleRuntime } from './reusable-layout-runtime.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { MODULES_DIRECTORY, MODULES_SCHEMA, PRESETS_FILE, composerOwnership, detectGeneratedComposition, loadComposerModules,
  projectComposerModuleFiles } from './composer-modules.mjs';
import { resolveGeneratorComposition } from './project-composer-recipe.mjs';
import { assertCompositionDatabaseLock, composerProfile, assertComposerSourceSurvives, projectedScreenLosses,
  verifyCompositionDatabaseFiles } from './project-composer-source.mjs';
import { pageSurvivalExpectation } from './reusable-page-survival.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';
import { applyFrontendProjection, createFrontendProjector, pruneFrontend } from './reusable-source-frontend.mjs';
import { adaptGeneratedHarness, assertJavaCascadeAcknowledged, assertRemovedGatesAcknowledged, pruneHistoricalMigrationTests, pruneUpstreamAtlas,
  pruneZeroDowntimeWaivers } from './reusable-source-gates.mjs';
import { writeHarnessBaseline } from './reusable-source-harness.mjs';
import { pruneJava } from './reusable-source-java.mjs';
import { ROOT, copySourceTree, fail, git, initializeGeneratedRepository, installDatabaseBundle, isCopyableSourceFile, normalize, readTextIfPresent,
  trackedAndUntrackedFiles, walk } from './reusable-source-tree.mjs';
import { buildProjectionLedger, writeProjectionLedger } from './reusable-projection-ledger.mjs';
import { installProjectedColumnCatalog } from './reusable-migration-catalog.mjs';
import { assertFrontendToolchain, regenerateContractTypes, writeProjectedApiDocs } from './reusable-contract-projection.mjs';
import { assertContractReferencesSurvive } from './reusable-contract-references.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const OUTPUT_ROOT = join(ROOT, 'build', 'reusable-base', 'source');
/** 생성기 엔진이 이 자식을 부르는 단계 이름. 실패 보고는 이 단계에 허용된 코드만 쓴다. */
export const CHILD_STAGE = 'source';

export function parseSourceArgs(argv) {
  const args = { profile: undefined, dbBundle: undefined, output: undefined, layout: 'multi-module', allowDirty: false, allowNonReleaseRef: false };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (seen.has(arg)) fail(`중복 인자: ${arg}`);
    seen.add(arg);
    const field = { '--profile': 'profile', '--composition': 'composition', '--db-bundle': 'dbBundle', '--output': 'output', '--layout': 'layout',
      '--failure-report': 'failureReport' }[arg];
    if (field) {
      const value = argv[++index];
      if (!value || value.startsWith('--')) fail(`${arg} 값이 필요하다.`);
      args[field] = field === 'layout' ? normalizeBackendLayout(value) : value;
    }
    else if (arg === '--allow-dirty') args.allowDirty = true;
    else if (arg === '--allow-non-release-ref') args.allowNonReleaseRef = true;
    else fail(`알 수 없는 인자: ${arg}`);
  }
  if ((!args.profile && !args.composition) || (args.profile && args.composition) || !args.dbBundle) fail('--profile 또는 --composition 중 하나와 --db-bundle이 필요하다.');
  return args;
}

function safeOutputPath(requested, profile, shortSha, layout) {
  const suffix = layout === 'single-module' ? '-single-module' : '';
  const output = resolve(requested ?? join(OUTPUT_ROOT, `${profile}-${shortSha}${suffix}`));
  const rel = relative(resolve(OUTPUT_ROOT), output);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail(`산출물 경로는 ${OUTPUT_ROOT} 아래여야 한다: ${output}`);
  }
  if (existsSync(output)) fail(`기존 산출물을 덮어쓰지 않는다: ${output}`);
  let ancestor = dirname(output);
  while (!existsSync(ancestor)) ancestor = dirname(ancestor);
  const physical = relative(realpathSync(ROOT), realpathSync(ancestor));
  if (physical === '..' || physical.startsWith(`..${sep}`) || isAbsolute(physical)) fail('산출물 물리 경로가 workspace 밖이다.');
  return output;
}

export function installReusableVerification(output, layout = 'multi-module') {
  if (existsSync(join(output, VERIFICATION_HISTORY, 'index.json'))) fail('Verification history is already projected; regenerate from upstream source');
  const path = join(output, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  // 활성 구성은 생성물 표지(config/modules/presets.json 의 active, 11단계 C5)다. 생성기 흐름에서는 lock 보다 먼저 쓰인다.
  //   표지가 없는 트리(검증 설치만 다시 하는 시험 픽스처)는 lock 의 프로필을 쓴다.
  const presetsText = readTextIfPresent(join(output, MODULES_DIRECTORY, PRESETS_FILE));
  const profile = presetsText !== undefined && JSON.parse(presetsText).active !== undefined
    ? detectGeneratedComposition(output).profile
    : JSON.parse(readFileSync(join(output, 'reusable-base-lock.json'), 'utf8')).profile;
  const workflowDirectory = join(output, '.github/workflows');
  const workflows = existsSync(workflowDirectory)
    ? readdirSync(workflowDirectory).filter(name => /\.ya?ml$/.test(name)).map(name => `.github/workflows/${name}`) : [];
  const historyFiles = ['package.json', 'Makefile', '.github/required-checks.json', '.githooks/pre-push', ...workflows];
  const records = [];
  for (const source of historyFiles) {
    const original = join(output, source);
    if (!existsSync(original)) fail(`Missing upstream verification source: ${source}`);
    const content = readFileSync(original, 'utf8').replace(/\r\n/g, '\n');
    const snapshot = `${VERIFICATION_HISTORY}/${source}`;
    mkdirSync(dirname(join(output, snapshot)), { recursive: true });
    writeFileSync(join(output, snapshot), content);
    records.push({ source, path: snapshot, sha256: verificationTextHash(content) });
  }
  const sourceManifest = JSON.parse(readFileSync(join(output, '.github/required-checks.json'), 'utf8'));
  const scan = sourceManifest.criticalSteps?.find(step => step.name === 'Run gitleaks (working tree + incremental)')?.run;
  // 제품 CI 의 액션 핀은 방금 남긴 원본 ci.yml 이력에서 읽는다(검증도 같은 이력을 읽는다).
  const generated = reusableArtifactEntrypoints(profile, scan,
    readFileSync(join(output, `${VERIFICATION_HISTORY}/.github/workflows/ci.yml`), 'utf8'));
  const makefile = projectReusableMakefile(readFileSync(join(output, 'Makefile'), 'utf8'), layout);
  // Each inactive workflow has been copied and hash-bound before this single-file removal.
  for (const workflow of workflows) {
    const target = resolve(output, workflow);
    if (dirname(target) !== resolve(workflowDirectory)) fail('Workflow removal escaped the generated product');
    rmSync(target);
  }
  writeFileSync(join(output, '.github/workflows/ci.yml'), generated.workflow);
  writeFileSync(join(output, '.github/required-checks.json'), `${JSON.stringify(generated.manifest, null, 2)}\n`);
  writeFileSync(join(output, VERIFICATION_HISTORY, 'index.json'), `${JSON.stringify({
    schemaVersion: 1, authority: 'upstream-verification-history', activeProfile: profile,
    inheritedExecutionApproval: false, files: records.sort((left, right) => left.source.localeCompare(right.source)),
  }, null, 2)}\n`);
  Object.assign(pkg.scripts, artifactAliases);
  for (const alias of Object.keys(pkg.scripts)) {
    if (alias.startsWith('base:') || alias.startsWith('project:') || ['migration:export', 'verify:e2e', 'verify:ops', '//verify:ops'].includes(alias)) delete pkg.scripts[alias];
  }
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(join(output, 'Makefile'), makefile);
  // This is the adopter product hook, whose scope is the actual artifact. The producer hook is unchanged.
  mkdirSync(join(output, '.githooks'), { recursive: true });
  writeFileSync(join(output, '.githooks/pre-push'), `#!/bin/sh\nset -e\n${ARTIFACT_COMMAND}\n`);
  writeFileSync(join(output, 'REUSABLE_VERIFICATION.md'), '# Generated product verification\n\n'
    + '`npm run verify`와 생성물 CI는 현재 프로필의 원장·Java 하네스·스키마·프런트 타입·lint·build를 검증한다. CI는 working-tree·incremental gitleaks 검사도 유지한다.\n\n'
    + '`verify:docs`는 contracts, `verify:be`는 backend, `verify:fe`는 frontend이며 `verify:full`, `verify:push`, `verify:fast`는 보수적으로 full에 연결한다. 각 scope는 공통 활성 계약을 먼저 실행한다.\n\n'
    + '생산자 전용 `base:*`·`migration:export`, 기관 실행 환경이 필요한 `verify:e2e`·`verify:ops`는 제공하지 않는다. 독립 이관 제품 export는 원본 저장소에서 실행한다. 기관 브라우저 시나리오와 원격 ruleset은 기관에서 별도로 결속한다.\n\n'
    + '현재 CI의 required context 제안은 `artifact-verification` 하나이다. `.github/required-checks.json`의 remoteApplied=false는 기관 branch protection을 실제 적용하지 않았다는 뜻이다. 원본 6개 required context와 동등한 보증이 아니다.\n\n'
    + '원본 workflow·required manifest·package·hook은 `config/governance/upstream-verification/`의 비활성 이력이다. 원본 CodeQL·E2E·mutation·배포·예약 작업은 기관 범위에 맞게 재결속해야 한다. 이력을 복사한 것은 외부 발행이나 기관 운영 승인이 아니다.\n');
}

/**
 * 복사한 소스 트리에서 선택하지 않은 기능을 걷는다: Java 연쇄 제거, 프런트 투영(화면 제외 경로와 마커 블록의 소유 기능), 프런트 연쇄 제거,
 * 화면 생존 대조, 선택 기능 소스의 생존 확인. 정밀 점검(plan/deep)은 같은 판정을 디스크를 바꾸지 않고 미리 하며, 둘이 같은지
 * 시험이 대조한다. 화면 생존의 기대값은 기능 소유에서 계산한다(removePaths 로 거르지 않는다 — reusable-page-survival.mjs).
 * 시작 구성과 직접 선택이 같은 판정을 탄다 — 기능 소유(`ownership`, composerOwnership)와 구성만 보고 pack 을 보지 않는다(11단계 C3).
 */
export function projectSourceTree(output, { ownership, profile, composition, sourceRoot = ROOT, catalog, pageSurvival }) {
  // 기대값은 카탈로그(또는 미리 만든 기대값)로만 만든다. 둘 다 없으면 조용히 카탈로그를 다시 적재하지 않고 실패한다.
  if (!pageSurvival && !catalog) throw new Error('projectSourceTree needs the composition catalog or a page survival expectation');
  const expectation = pageSurvival ?? pageSurvivalExpectation({ root: sourceRoot, catalog, composition });
  const java = pruneJava(output, ownership, profile);
  // 구성의 화면 제외 경로와 마커 블록 투영을 한 번에 한다(슬롯 단계 PR-2). 정밀 점검·거버넌스 투영도 같은 projector 다.
  // 슬롯 레지스트리는 같은 패스에서 복사한 프런트 파일 목록으로 다시 렌더한다(PR-4). 투영 뒤 레지스트리와 남은 기여의 대조는 pruneFrontend 가 한다.
  const frontendRoot = join(output, 'frontend');
  const files = walk(frontendRoot, () => true).map(path => normalize(relative(frontendRoot, path)));
  const projector = createFrontendProjector({ composition, files });
  const markerBlocks = applyFrontendProjection(output, projector);
  const frontend = { ...pruneFrontend(output, projector.directPaths), markerBlocks };
  const pages = new Set(discoverPageRoutes(output).map(page => page.source));
  const lostScreens = projectedScreenLosses(expectation, source => pages.has(source));
  assertComposerSourceSurvives(sourceRoot, output, composition, ownership, { lostScreens });
  return { java, frontend };
}

/**
 * 생성물 presets.json 에 둘 활성 구성 하나. 시작 구성은 원본 선언 그대로이고, 직접 선택은 이 구성의 생성기 프로필과 실제 Java 연쇄
 * 제거로 만든다(id 'custom') — 생성물의 presets.json 은 '이 생성물이 어떤 구성이고 생성기가 무엇을 지웠는가' 다.
 */
export function activeCompositionEntry(modules, composition, profile, java) {
  if (composition.profile !== 'custom') {
    const preset = modules.files[PRESETS_FILE].presets.find(entry => entry.id === composition.profile);
    if (!preset) fail(`시작 구성 선언이 없다: ${composition.profile}`);
    return preset;
  }
  return { id: 'custom', label: '직접 선택', description: profile.description, domains: [...composition.resolvedDomains],
    expected: { gates: profile.acknowledgedRemovedGates.map(row => ({ file: row.file, reason: row.reason })).sort((left, right) => left.file.localeCompare(right.file)),
      gateRemovalRules: profile.acknowledgedGateRemovalRules.map(row => ({ rule: row.rule, reason: row.reason })),
      javaCascade: java.cascadeRemoved.map(entry => entry.file) } };
}

/**
 * 생성물의 config/modules 를 구성으로 투영한다(11단계 C3, projectComposerModuleFiles). 구성 밖 기능 파일을 지우고, 바뀐 파일(presets.json,
 * 공유 테이블을 넘겨받은 기능 파일)만 다시 쓴다 — 나머지는 복사한 원본 바이트 그대로다. 생성물의 수동 도메인 삭제 판정(domain-deletion-plan)과
 * 무결성 검사가 이 디렉터리를 읽는다.
 */
export function writeProjectedModules(output, modules, composition, active) {
  const directory = join(output, MODULES_DIRECTORY);
  const projected = projectComposerModuleFiles(modules.files, composition, active);
  for (const name of readdirSync(directory)) {
    if (name.endsWith('.json') && name !== MODULES_SCHEMA && !Object.hasOwn(projected, name)) rmSync(join(directory, name));
  }
  for (const [name, value] of Object.entries(projected)) {
    if (value !== modules.files[name]) writeFileSync(join(directory, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }
  return Object.keys(projected).sort();
}

async function main() {
  const args = parseSourceArgs(process.argv.slice(2));
  // DB 생성기와 같은 판정기로 구성을 얻는다. 프리셋도 구성 경로를 타며, 같은 커밋·레이아웃이면 같은 해시가 나온다.
  const catalog = loadProjectComposerCatalog(ROOT);
  const composition = resolveGeneratorComposition({ catalog, profile: args.composition ? undefined : args.profile,
    supplied: args.composition ? JSON.parse(readFileSync(resolve(args.composition), 'utf8')) : undefined,
    backendLayout: args.layout, layoutExplicit: process.argv.includes('--layout'), sourceCommit: git(['rev-parse', 'HEAD']),
    resolveSourceReference: ref => git(['rev-parse', '--verify', `${ref}^{commit}`]) });
  args.profile = composition.profile;
  args.layout = composition.backendLayout;
  // 투영은 매니페스트 v2(config/modules)의 기능 소유와 구성으로 한다(11단계 C3). v1 manifest 는 C7 에서 걷었다.
  const modules = loadComposerModules(ROOT);
  const ownership = composerOwnership(modules);
  const profile = composerProfile(modules, composition);

  const dirty = git(['status', '--porcelain']);
  if (dirty && !args.allowDirty) fail('공식 source artifact는 clean working tree에서만 생성한다.');
  const releaseTag = git(['tag', '--points-at', 'HEAD']).split(/\r?\n/).find((tag) => /^v\d/.test(tag));
  if (!releaseTag && !args.allowNonReleaseRef) fail('공식 source artifact는 v* 릴리스 태그에서만 생성한다.');
  const sourceCommit = git(['rev-parse', 'HEAD']);
  const dbBundle = resolve(args.dbBundle);
  const dbLockPath = join(dbBundle, 'profile-lock.json');
  if (!existsSync(dbLockPath)) fail(`DB bundle lock이 없다: ${dbLockPath}`);
  const dbLock = JSON.parse(readFileSync(dbLockPath, 'utf8'));
  if (dbLock.sourceCommit !== sourceCommit) fail(`DB bundle commit ${dbLock.sourceCommit} != source commit ${sourceCommit}`);
  assertCompositionDatabaseLock(dbLock, composition);
  verifyCompositionDatabaseFiles(join(dbBundle, 'db/migration'), dbLock);

  // API 계약 생성물은 원본 frontend 의 도구로 다시 만든다(U5-A). 출력 폴더를 만들기 전에 확인해 잔재를 남기지 않는다.
  assertFrontendToolchain(ROOT);
  const output = safeOutputPath(args.output, args.profile, sourceCommit.slice(0, 12), args.layout);
  mkdirSync(output, { recursive: true });
  console.log(`[base-source] ${args.profile}: tracked source tree를 투영한다.`);
  const copiedFiles = trackedAndUntrackedFiles().filter((rel) => isCopyableSourceFile(rel, ROOT));
  copySourceTree(output, { files: copiedFiles });
  const { java, frontend } = projectSourceTree(output, { ownership, profile, composition, catalog });
  // ⚠ 규칙 기반 제거는 **승인 검사보다 먼저** 해야 한다 — 뒤에 두면 census 가 "0건" 이라고 말한 뒤
  //   게이트 42개가 사라진다(2026-09-12 실측으로 드러난 이 census 자신의 구멍).
  const removedHistoricalMigrationTests = pruneHistoricalMigrationTests(output);
  const removedUpstreamAtlas = pruneUpstreamAtlas(output);
  const removedGates = assertRemovedGatesAcknowledged(args.profile, profile, java, frontend, {
    'historical-migration-tests': removedHistoricalMigrationTests.files,
    'upstream-atlas': removedUpstreamAtlas.files,
  });
  // 프리셋은 연쇄로 지운 Java 를 커밋된 기대치와 대조한다(설계서 C4). 직접 선택은 기대치가 없어 lock 기록(java.cascadeRemoved)만 남긴다.
  if (composition.profile !== 'custom') assertJavaCascadeAcknowledged(args.profile, profile, java);
  // API 계약(10c-2): Java 투영이 핸들러를 지운 연산을 api-docs 에서 빼고 스키마 폐포·태그를 정리한다. 정밀 점검이 같은 함수로 미리 본다.
  const apiDocs = writeProjectedApiDocs(ROOT, output);
  console.log(`[base-source] ${args.profile}: api-docs 를 구성 기준으로 다시 썼다(연산 ${apiDocs.summary.operations}개, 뺀 연산 ${apiDocs.summary.removedOperations}개).`);
  // 생성 타입 3종(zod·operations·api.d.ts)은 frontend/src 라 거버넌스 투영의 codeScope 해시보다 먼저 다시 만든다.
  const generatedTypes = regenerateContractTypes({ sourceRoot: ROOT, output });
  // 남는 프런트 코드(시험 포함, tsconfig 범위)가 이 구성에서 사라진 계약 이름을 쓰면 생성물의 tsc 가 약 10분 뒤에야 깨진다. 여기서 파일을
  //   밝히며 멈춘다. 정밀 점검이 같은 판정으로 미리 막는다(사라질 이름은 예측과 다시 만든 파일의 차이가 같아야 한다).
  const contractReferences = assertContractReferencesSurvive({ sourceRoot: ROOT, output, projection: apiDocs, files: copiedFiles });
  installDatabaseBundle(output, dbBundle);
  // 이관 카탈로그(설계서 B12): 원본 카탈로그를 그대로 두면 구성에서 빠진 표로 가는 매핑도 검증을 통과하고 적재 직전에야 실패한다.
  const migrationCatalog = installProjectedColumnCatalog(ROOT, output, dbBundle, dbLock);
  console.log(`[base-source] ${args.profile}: 이관 카탈로그(db_columns.json)를 번들 스키마로 다시 썼다(표 ${migrationCatalog.tables}개).`);
  const zdmWaivers = pruneZeroDowntimeWaivers(output);
  const projectedModules = writeProjectedModules(output, modules, composition, activeCompositionEntry(modules, composition, profile, java));
  installReusableVerification(output, args.layout);
  const layoutProjection = args.layout === 'single-module' ? applySingleModuleLayout(output) : null;
  if (args.layout === 'single-module') installSingleModuleRuntime(output);
  else installMultiModuleMigrationRuntime(output);
  // 거버넌스의 sourceUnchanged 는 '생성물 == 원본에 같은 투영' 이다. 생성기와 같은 projector 로 원본을 투영한다.
  // 레지스트리 렌더는 생성기가 복사한 같은 파일 목록을 쓴다.
  const sourceProjector = createFrontendProjector({ composition, files: copiedFiles.filter(file => file.startsWith('frontend/')) });
  const governance = projectReusableGovernance({
    sourceRoot: ROOT, outputRoot: output, profile: args.profile, sourceCommit, composition,
    projectSource: (file, source) => sourceProjector.project(file, source).source,
  });
  verifyCompositionDatabaseFiles(join(output, 'api-server/src/main/resources/db/migration'), dbLock);
  adaptGeneratedHarness(output);
  writeHarnessBaseline(output, { ownership, profile, schemaTables: dbLock.tables.length });
  // 투영 원장(Phase 2 D6): 복사한 원본 파일 가운데 지금 없는 파일. 파일을 지우는 마지막 단계(검증 설치의 워크플로 정리,
  //   거버넌스 투영의 리다이렉트 페이지 정리) 뒤에 센다 — 앞에서 세면 그 뒤에 지운 파일이 원장에 없다(검토로 드러났다).
  //   단일모듈 배치는 build.gradle·settings.gradle 만 바꾸고 소스를 옮기지 않으므로 원장 경로는 그대로 유효하다.
  const removedSourceFiles = buildProjectionLedger(output, copiedFiles);
  const projectionLedger = writeProjectionLedger(output, removedSourceFiles);
  // 경계·소비 census(10c-2)는 생성물 트리에서 다시 만든다. 소비 census 의 'consumer-not-in-composition' 근거가 투영 원장이라 그 뒤에 한다.
  //   이 모듈은 적재할 때 원본 frontend 의 TypeScript 를 읽으므로 동적 import 로만 부른다 — 정적으로 부르면 frontend 를 설치하지 않은 곳에서
  //   생성기 적재부터 실패한다(도구 확인은 출력 폴더를 만들기 전에 했다).
  const { projectContractCensuses } = await import('./reusable-contract-census.mjs');
  const contractCensus = projectContractCensuses({ sourceRoot: ROOT, output, removedFiles: removedSourceFiles.removedFiles });

  const lock = {
    schemaVersion: 1,
    profile: args.profile,
    layout: args.layout,
    layoutProjection,
    modules: projectedModules,
    composition,
    sourceCommit,
    sourceReleaseTag: releaseTag ?? null,
    localDevelopmentBuild: !releaseTag || Boolean(dirty),
    generatedAt: new Date().toISOString(),
    java,
    frontend,
    removedGates,
    removedHistoricalMigrationTests: removedHistoricalMigrationTests.count,
    projectionLedger,
    contracts: { apiDocs: { ...apiDocs.summary, keptAliasesWithoutBase: apiDocs.keptAliasesWithoutBase }, generatedTypes, contractReferences, ...contractCensus },
    zdmWaivers,
    governance: {
      path: 'config/governance/reusable-governance-projection.json',
      projectionSha256: canonicalJsonSha256(governance),
      routes: governance.routes.length,
      urlRecords: governance.urlRecordIds.length,
      inheritedUrlRecords: governance.inheritedUrlRecordIds.length,
      environmentReview: 'pending',
    },
    databaseLock: dbLock,
  };
  writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
  const governanceErrors = validateReusableGovernance(output);
  if (governanceErrors.length) fail(`산출물 거버넌스 증거 검증 실패:\n${governanceErrors.join('\n')}`);
  writeFileSync(
    join(output, 'REUSABLE_BASE.md'),
    `# Reusable Base — ${args.profile}\n\n` +
      `릴리스 \`${releaseTag ?? sourceCommit.slice(0, 12)}\`에서 생성된 일회성 산출물이다. ` +
      `\`template/reusable-base\` 장기 브랜치가 아니다.\n\n` +
      `- 기능: ${composition.resolvedDomains.join(', ') || '(공통 기반만)'}\n` +
      `- backend layout: ${args.layout}\n` +
      '- 독립 Git 저장소로 초기화되어 있다. 파일 추가·커밋·원격 연결은 도입자가 수행한다.\n' +
      (args.layout === 'single-module'
        ? '- Gradle 프로젝트는 루트 하나이며 기존 디렉터리는 논리 소스 영역이다. 테스트 자원과 offline migration 실행은 별도 source set으로 격리한다.\n' +
          '- 실행: `./gradlew bootRun`; 온라인 JAR: `./gradlew bootJar` → `build/libs/app.jar`. Windows는 `./gradlew` 대신 `gradlew.bat`을 사용한다.\n' +
          '- 전체 테스트: `./gradlew allTests`; 하네스/DB 검사: `./gradlew harnessTest schemaValidationTest`; 오프라인 이관: `npm run verify:migration`.\n' +
          '- 폴더별 `build.gradle`은 원본 출처 자료이며 활성 Gradle 설정은 루트 `build.gradle`과 `settings.gradle`이다.\n'
        : '- 기존 Gradle 모듈과 의존 경계를 유지한다.\n') +
      `- 제외 backend domains: ${java.excludedDomains.join(', ') || '(없음)'}\n` +
      `- 제거 Java files: ${java.removedFiles}\n` +
      `- 제거 frontend files: ${frontend.removedFiles}` +
        ` (선언 ${frontend.removedFiles - frontend.cascadedFiles} · 연쇄 ${frontend.cascadedFiles})\n` +
      `- 슬롯 기여: ${frontend.slots.map(({ slot, owners }) => `${slot} ← ${owners.join(', ') || '(없음)'}`).join('; ') || '(슬롯 없음)'}` +
        ' — 기여를 더하거나 뺀 뒤 `npm run slots:generate` 로 레지스트리를 다시 만든다.\n' +
      `- 제거된 거버넌스 게이트: ${removedGates.total}건` +
        (removedGates.total
          ? `\n${[
            ...removedGates.rules.map((rule) => `  - (규칙) ${rule.rule}: ${rule.count}건 — ${rule.reason}`),
            ...removedGates.files.map((gate) => `  - ${gate.file} <- ${gate.reason}`),
          ].join('\n')}\n\n`
          : '\n\n') +
      `- 현재 route/URL 모집단: ${governance.routes.length}/${governance.urlRecordIds.length}\n` +
      `- 기관 운영 검토: pending. 원본의 검토자·날짜는 upstream-review 이력이며 기관 승인이 아니다.\n` +
      `- 검토 경계: config/governance/reusable-governance-projection.json\n\n` +
      `DB migration은 신규 빈 PostgreSQL 전용이다. 운영/공유 DB 축소에 사용하지 않는다.\n`,
    'utf8',
  );
  initializeGeneratedRepository(output);
  console.log(`[base-source] PASS: ${normalize(relative(ROOT, output))}`);
  console.log(`[base-source] removed java=${java.removedFiles}, frontend=${frontend.removedFiles}`);
}

/* 계약 테스트가 이 모듈을 import 해도 생성이 시작되면 안 된다(부작용 있는 import 금지). */
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH);
if (isMain) runReportingChild({ argv: process.argv.slice(2), root: ROOT, stage: CHILD_STAGE, label: 'base-source', main });
