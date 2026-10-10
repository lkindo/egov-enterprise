#!/usr/bin/env node
/**
 * 검증된 DB bundle과 현재 릴리스 소스를 결합해 reusable-base 소스 트리를 만든다.
 * 장기 template 브랜치를 만들거나 현재 working tree를 수정하지 않는다.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectReusableGovernance } from './reusable-governance-projection.mjs';
import { canonicalJsonSha256, validateReusableGovernance } from './reusable-governance-integrity.mjs';
import { ARTIFACT_COMMAND, VERIFICATION_HISTORY, artifactAliases, projectReusableMakefile, reusableArtifactEntrypoints, verificationTextHash } from './reusable-artifact-entrypoints-contract.mjs';
import { normalizeBackendLayout } from './reusable-layout.mjs';
import { runReportingChild } from './project-composer-child-failure.mjs';
import { applySingleModuleLayout } from './reusable-single-module.mjs';
import { installMultiModuleMigrationRuntime, installSingleModuleRuntime } from './reusable-layout-runtime.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveGeneratorComposition } from './project-composer-recipe.mjs';
import { assertCompositionDatabaseLock, composerProfile, projectComposerFrontend, assertComposerSourceSurvives,
  verifyCompositionDatabaseFiles } from './project-composer-source.mjs';
import { SOURCE_EXTENSIONS, projectFrontendPackMarkers, pruneFrontend, stripExcludedFrontendPackBlocks } from './reusable-source-frontend.mjs';
import { adaptGeneratedHarness, assertRemovedGatesAcknowledged, pruneHistoricalMigrationTests, pruneUpstreamAtlas, pruneZeroDowntimeWaivers } from './reusable-source-gates.mjs';
import { writeHarnessBaseline } from './reusable-source-harness.mjs';
import { pruneJava } from './reusable-source-java.mjs';
import { MANIFEST_PATH, ROOT, copySourceTree, fail, git, initializeGeneratedRepository, installDatabaseBundle, isCopyableSourceFile, normalize, trackedAndUntrackedFiles, walk } from './reusable-source-tree.mjs';
import { buildProjectionLedger, writeProjectionLedger } from './reusable-projection-ledger.mjs';

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
  const profilePath = join(output, 'config/reusable-base-profiles.json');
  const profile = existsSync(profilePath)
    ? JSON.parse(readFileSync(profilePath, 'utf8')).sourcePolicy.generatedProfile
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
  const generated = reusableArtifactEntrypoints(profile, scan);
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

export function writeProjectedManifest(output, manifest, profileName, profile, dbLock, composition) {
  const allowedPacks = new Set(profile.packs);
  const packs = Object.fromEntries(
    Object.entries(manifest.packs).filter(([packName]) => allowedPacks.has(packName)).map(([name, pack]) => [name,
      composition?.profile === 'custom' ? {
        ...pack,
        backend: { ...pack.backend, appDomains: (pack.backend?.appDomains ?? []).filter(domain => composition.resolvedDomains.includes(domain)),
          ...(pack.backend?.domainSupportFiles ? { domainSupportFiles: Object.fromEntries(Object.entries(pack.backend.domainSupportFiles)
            .filter(([domain]) => composition.resolvedDomains.includes(domain))) } : {}) },
        database: { ...pack.database, tables: pack.database.tables.filter(table => composition.tables.includes(table)),
          sequences: (pack.database.sequences ?? []).filter(sequence => composition.explicitSequences.includes(sequence)) },
        ...(pack.frontend ? { frontend: { ...pack.frontend, removePaths: composition.frontend.includedPaths.filter(path =>
          pack.frontend.removePaths.some(parent => path === parent || path.startsWith(`${parent}/`))) } } : {}),
      } : pack]),
  );
  const ownedDomains = new Set(Object.values(packs).flatMap((pack) => pack.backend?.appDomains ?? []));
  // 소유 pack 이 구성에 없는 공유 테이블은 선택된 소비자 가운데 가장 낮은 rank 의 pack 으로 넘긴다. 넘기지 않으면 생성물의
  //   어느 pack 도 그 테이블을 소유하지 않는다(템플릿 단독 선택: collaboration 소유 tb_tmplt_info). 프리셋은 rank 누적이라
  //   소유 pack 이 늘 포함되므로 바뀌지 않는다.
  const transferredOwners = new Map();
  if (composition?.profile === 'custom') {
    const selectedTables = new Set(composition.tables);
    for (const contract of manifest.sharedTableContracts ?? []) {
      if (allowedPacks.has(contract.ownerPack) || !selectedTables.has(contract.table)) continue;
      const target = (contract.consumers ?? []).filter((consumer) => ownedDomains.has(consumer))
        .map((consumer) => Object.keys(packs).find((name) => packs[name].backend?.appDomains?.includes(consumer)))
        .sort((left, right) => packs[left].rank - packs[right].rank)[0];
      if (!target) fail(`공유 테이블 ${contract.table} 을 넘겨받을 선택 소비자 pack 이 없다.`);
      packs[target].database.tables = [...packs[target].database.tables, contract.table];
      transferredOwners.set(contract.table, target);
    }
  }
  const projected = {
    ...manifest,
    sourcePolicy: {
      ...manifest.sourcePolicy,
      generatedProfile: profileName,
    },
    profiles: {
      [profileName]: profile,
    },
    packs,
    clusters: (manifest.clusters ?? []).filter(
      (cluster) => allowedPacks.has(cluster.pack) &&
        [...(cluster.domains ?? []), ...(cluster.requiresDomains ?? [])].every((domain) => ownedDomains.has(domain)),
    ),
    sharedTableContracts: (manifest.sharedTableContracts ?? [])
      .filter((contract) => allowedPacks.has(contract.ownerPack) || transferredOwners.has(contract.table))
      .map((contract) => ({
        ...contract,
        ...(transferredOwners.has(contract.table) ? { ownerPack: transferredOwners.get(contract.table) } : {}),
        consumers: (contract.consumers ?? []).filter((consumer) => ownedDomains.has(consumer)),
      })),
    databaseSnapshot: {
      ...manifest.databaseSnapshot,
      source: `generated/${profileName}`,
      checkedAt: dbLock.generatedAt,
      physicalTableCountExcludingFlyway: dbLock.tables.length,
      physicalSequenceCount: dbLock.sequences.length,
      physicalStandaloneSequenceCount: Object.values(packs)
        .flatMap((pack) => pack.database.sequences ?? []).length,
    },
  };
  writeFileSync(
    join(output, 'config', 'reusable-base-profiles.json'),
    `${JSON.stringify(projected, null, 2)}\n`,
    'utf8',
  );
}

/**
 * 복사한 소스 트리에서 선택하지 않은 기능을 걷는다: Java 연쇄 제거, 선택 투영(직접 선택), pack 마커 블록, 프런트 연쇄 제거,
 * 선택 기능 소스의 생존 확인. 정밀 점검(plan/deep)은 같은 판정을 디스크를 바꾸지 않고 미리 하며, 둘이 같은지 시험이 대조한다.
 */
export function projectSourceTree(output, { manifest, profile, composition, sourceRoot = ROOT }) {
  const java = pruneJava(output, manifest, profile);
  if (composition?.profile === 'custom') for (const file of walk(join(output, 'frontend'), path => SOURCE_EXTENSIONS.includes(extname(path)))) {
    const source = readFileSync(file, 'utf8');
    const projected = projectComposerFrontend(normalize(relative(output, file)), source, composition);
    if (source !== projected) writeFileSync(file, projected);
  }
  const packBlocks = stripExcludedFrontendPackBlocks(output, manifest, profile);
  const frontend = { ...pruneFrontend(output, manifest, profile), packBlocks };
  assertComposerSourceSurvives(sourceRoot, output, composition, manifest);
  return { java, frontend };
}

function main() {
  const args = parseSourceArgs(process.argv.slice(2));
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  // DB 생성기와 같은 판정기로 구성을 얻는다. 프리셋도 구성 경로를 타며, 같은 커밋·레이아웃이면 같은 해시가 나온다.
  const composition = resolveGeneratorComposition({ catalog: loadProjectComposerCatalog(ROOT), profile: args.composition ? undefined : args.profile,
    supplied: args.composition ? JSON.parse(readFileSync(resolve(args.composition), 'utf8')) : undefined,
    backendLayout: args.layout, layoutExplicit: process.argv.includes('--layout'), sourceCommit: git(['rev-parse', 'HEAD']),
    resolveSourceReference: ref => git(['rev-parse', '--verify', `${ref}^{commit}`]) });
  args.profile = composition.profile;
  args.layout = composition.backendLayout;
  manifest.profiles[args.profile] = composerProfile(manifest, composition);
  const profile = manifest.profiles?.[args.profile];
  if (!profile) fail(`지원하지 않는 profile: ${args.profile}`);

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

  const output = safeOutputPath(args.output, args.profile, sourceCommit.slice(0, 12), args.layout);
  mkdirSync(output, { recursive: true });
  console.log(`[base-source] ${args.profile}: tracked source tree를 투영한다.`);
  const copiedFiles = trackedAndUntrackedFiles().filter((rel) => isCopyableSourceFile(rel, ROOT));
  copySourceTree(output, { files: copiedFiles });
  const { java, frontend } = projectSourceTree(output, { manifest, profile, composition });
  // ⚠ 규칙 기반 제거는 **승인 검사보다 먼저** 해야 한다 — 뒤에 두면 census 가 "0건" 이라고 말한 뒤
  //   게이트 42개가 사라진다(2026-09-12 실측으로 드러난 이 census 자신의 구멍).
  const removedHistoricalMigrationTests = pruneHistoricalMigrationTests(output);
  const removedUpstreamAtlas = pruneUpstreamAtlas(output);
  const removedGates = assertRemovedGatesAcknowledged(args.profile, profile, java, frontend, {
    'historical-migration-tests': removedHistoricalMigrationTests.files,
    'upstream-atlas': removedUpstreamAtlas.files,
  });
  installDatabaseBundle(output, dbBundle);
  const zdmWaivers = pruneZeroDowntimeWaivers(output);
  writeProjectedManifest(output, manifest, args.profile, profile, dbLock, composition);
  installReusableVerification(output, args.layout);
  const layoutProjection = args.layout === 'single-module' ? applySingleModuleLayout(output) : null;
  if (args.layout === 'single-module') installSingleModuleRuntime(output);
  else installMultiModuleMigrationRuntime(output);
  const governance = projectReusableGovernance({
    sourceRoot: ROOT, outputRoot: output, profile: args.profile, sourceCommit, composition,
    projectSource: (file, source) => projectFrontendPackMarkers(projectComposerFrontend(file, source, composition), {
      knownPacks: new Set(Object.keys(manifest.packs)),
      excludedPacks: new Set(Object.keys(manifest.packs).filter(pack => !profile.packs.includes(pack))),
      label: file,
    }).source,
  });
  verifyCompositionDatabaseFiles(join(output, 'api-server/src/main/resources/db/migration'), dbLock);
  adaptGeneratedHarness(output);
  writeHarnessBaseline(output, manifest);
  // 투영 원장(Phase 2 D6): 복사한 원본 파일 가운데 지금 없는 파일. 파일을 지우는 마지막 단계(검증 설치의 워크플로 정리,
  //   거버넌스 투영의 리다이렉트 페이지 정리) 뒤에 센다 — 앞에서 세면 그 뒤에 지운 파일이 원장에 없다(검토로 드러났다).
  //   단일모듈 배치는 build.gradle·settings.gradle 만 바꾸고 소스를 옮기지 않으므로 원장 경로는 그대로 유효하다.
  const projectionLedger = writeProjectionLedger(output, buildProjectionLedger(output, copiedFiles));

  const lock = {
    schemaVersion: 1,
    profile: args.profile,
    layout: args.layout,
    layoutProjection,
    packs: profile.packs,
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
      `- packs: ${profile.packs.join(', ')}\n` +
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
