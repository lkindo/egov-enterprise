import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { javaCascadeRemovals, planJavaRemoval } from './reusable-source-java.mjs';
import { SOURCE_EXTENSIONS, frontendDirectRemovePaths, planFrontendRemoval, projectFrontendPackMarkers } from './reusable-source-frontend.mjs';
import { HISTORICAL_SCHEMA_TEST_DIR, UPSTREAM_ATLAS, javaCascadeAcknowledgement, missingUpstreamAtlasAliases, missingUpstreamAtlasAssets,
  removedGateAcknowledgement, selectHistoricalMigrationTests } from './reusable-source-gates.mjs';
import { isCopyableSourceFile, normalize } from './reusable-source-tree.mjs';
import { assertComposerSourceSurvives, composerProfile, domainSupportFiles, projectComposerFrontend } from './project-composer-source.mjs';
import { withoutRoot } from './project-composer-errors.mjs';

/*
 * 정밀 점검(설계서 10장 POST /api/plan/deep, C3). 생성기가 소스를 복사한 뒤에야 하던 투영과 게이트 승인 판정을
 * 디스크를 바꾸지 않고 미리 한다. 판정 함수는 생성기와 같은 것을 쓴다(planJavaRemoval·planFrontendRemoval·
 * assertComposerSourceSurvives·규칙 제거 선택·removedGateAcknowledgement). 그래서 여기서 찾은 차단 사유는 생성하면
 * 같은 자리에서 실패할 사유다. 투영 뒤의 DB 번들·ZDM 원장·하네스 단계는 보지 않는다.
 * 규칙으로 걷는 게이트(과거 마이그레이션 검증·원본 Atlas)는 승인만 대조하고 제거 수에는 세지 않는다.
 */
const FRONTEND_GATE_DIR = 'frontend/src/__tests__/';
const FRONTEND_ENTRIES = ['src/app/layout.tsx', 'src/app/page.tsx', 'src/app/login/page.tsx'];
// 생성기는 복사한 트리를 디스크에서 확인한다. 대소문자를 가리지 않는 디스크(Windows·macOS 기본)에서는 같은 기준으로 대조한다.
// 판정은 플랫폼 이름이 아니라 이름의 대소문자를 바꿔 디스크에 물어서 한다. 대소문자 구분은 폴더마다 다를 수 있다(NTFS 폴더 속성,
// WSL 이 만든 폴더). 생성기가 출력을 만들 폴더는 가장 가까운 기존 상위 폴더의 구분을 물려받으므로 그 폴더에 먼저 묻는다.
const swapCase = text => text.replace(/[A-Za-z]/g, letter => (letter === letter.toLowerCase() ? letter.toUpperCase() : letter.toLowerCase()));
// 대소문자만 다른 두 이름이 함께 있으면 그 쌍으로는 물을 수 없다(가리는 폴더에서도 바꾼 이름이 있다).
const probeName = names => { const set = new Set(names); return names.find(name => swapCase(name) !== name && !set.has(swapCase(name))); };
export function directoryIgnoresCase(directory) {
  let current = resolve(directory);
  while (!existsSync(current)) {
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
  const name = probeName(readdirSync(current));
  return name === undefined ? undefined : existsSync(join(current, swapCase(name)));
}
function ignoresCase(root, files, outputParent) {
  const output = outputParent === undefined ? undefined : directoryIgnoresCase(outputParent);
  if (output !== undefined) return output;
  const sample = probeName(files);
  return sample ? existsSync(join(root, swapCase(sample))) : ['win32', 'darwin'].includes(process.platform);
}

export const DEEP_BLOCKER_LABELS = Object.freeze({
  JAVA_PROJECTION: 'Java 소스를 투영할 수 없습니다',
  FRONTEND_PROJECTION: '프런트 소스를 투영할 수 없습니다',
  FRONTEND_ENTRY: '화면의 필수 진입점이 지워집니다',
  GATE_DECLARATION: '게이트 승인 목록의 형식이 맞지 않습니다',
  GATE_UNACKNOWLEDGED: '승인되지 않은 검증 게이트가 지워집니다',
  GATE_STALE: '승인 목록에 지워지지 않는 게이트가 남아 있습니다',
  RULE_REMOVAL: '규칙으로 걷는 원본 검증·자산을 확인할 수 없습니다',
  RULE_UNACKNOWLEDGED: '승인되지 않은 규칙으로 검증 게이트가 지워집니다',
  RULE_STALE: '승인 목록에 적용되지 않는 규칙이 남아 있습니다',
  JAVA_CASCADE_DECLARATION: '연쇄 제거 승인 목록의 형식이 맞지 않습니다',
  JAVA_CASCADE_UNACKNOWLEDGED: '승인되지 않은 Java 파일이 연쇄로 지워집니다',
  JAVA_CASCADE_STALE: '연쇄 제거 승인 목록에 지워지지 않는 파일이 남아 있습니다',
  SOURCE_SURVIVAL: '선택한 기능의 소스가 투영 중 지워집니다',
});

/**
 * `files` 는 Git 이 보는 파일(추적·무시되지 않은 새 파일, build 제외)의 저장소 기준 경로다. 생성기처럼
 * 실제로 복사할 수 있는 파일만 남겨 생성물의 파일 집합으로 쓴다.
 * `outputParent` 는 생성기가 생성물 폴더를 만들 상위 폴더다(없어도 된다). 대소문자 구분을 그 자리에서 판정한다.
 * 차단 사유는 `{ code, label, files?, message? }` 로 모은다. label 은 화면이 그대로 보이는 한국어 문장이다.
 */
export function compositionDeepPlan({ root, manifest, composition, files, outputParent }) {
  const started = performance.now();
  const profile = composerProfile(manifest, composition);
  const relativeFiles = files.map(normalize).filter(file => isCopyableSourceFile(file, root));
  const pathKey = ignoresCase(root, relativeFiles, outputParent) ? path => path.toLowerCase() : path => path;
  const present = new Set(relativeFiles.map(pathKey));
  const blockers = [];
  const block = (code, detail) => blockers.push({ code, label: DEEP_BLOCKER_LABELS[code], ...detail });
  const message = error => withoutRoot(root, String(error?.message ?? error));
  const rel = path => normalize(relative(root, path));

  let java = null;
  try {
    // 제외 도메인 폴더는 디스크가 아니라 복사할 파일 목록에서 훑는다(생성기는 복사한 트리를 훑는다).
    const walkDirectory = directory => {
      const prefix = pathKey(`${directory}${sep}`);
      return relativeFiles.map(file => join(root, file)).filter(path => pathKey(path).startsWith(prefix));
    };
    const plan = planJavaRemoval(root, manifest, profile, relativeFiles.filter(file => file.endsWith('.java')).map(file => join(root, file)),
      { walkDirectory });
    // 생성기는 복사한 트리에서 선언된 지원 파일을 찾는다. 디스크에만 있고 복사되지 않는 파일이면 거기서 실패한다.
    for (const supportFiles of domainSupportFiles(root, manifest).values()) {
      for (const file of supportFiles) if (!present.has(pathKey(file))) throw new Error(`Missing domain support file: ${file}`);
    }
    java = plan;
  } catch (error) { block('JAVA_PROJECTION', { message: message(error) }); }

  const frontendRoot = join(root, 'frontend');
  const knownPacks = new Set(Object.keys(manifest.packs));
  const excludedPacks = new Set([...knownPacks].filter(pack => !profile.packs.includes(pack)));
  // 생성기처럼 모든 프런트 소스에 선택 투영(직접 선택일 때)과 pack 마커 투영을 먼저 하고, 그 내용으로 import 를 읽는다.
  // 곧 지워질 파일의 마커 오류도 생성기는 투영 단계에서 실패하므로 여기서도 차단 사유가 된다.
  const frontendFiles = relativeFiles.filter(file => file.startsWith('frontend/')).map(file => join(root, file));
  let frontend = null;
  try {
    const project = path => {
      let source = readFileSync(path, 'utf8');
      if (composition.profile === 'custom') source = projectComposerFrontend(rel(path), source, composition);
      return projectFrontendPackMarkers(source, { knownPacks, excludedPacks, label: normalize(relative(frontendRoot, path)) }).source;
    };
    const projected = new Map(frontendFiles.filter(path => SOURCE_EXTENSIONS.includes(extname(path))).map(path => [path, project(path)]));
    frontend = planFrontendRemoval({ frontendRoot, files: frontendFiles, directPaths: frontendDirectRemovePaths(manifest, profile),
      readSource: path => projected.get(path) });
  } catch (error) { block('FRONTEND_PROJECTION', { message: message(error) }); }
  const removed = new Set([...(java?.removed ?? []), ...(frontend?.removed ?? [])].map(path => pathKey(rel(path))));
  const kept = file => present.has(pathKey(file)) && !removed.has(pathKey(file));
  // 생성기는 투영 뒤 세 진입점이 디스크에 있는지 본다. 원본에 없거나 연쇄로 지워지면 같은 자리에서 실패한다.
  const lostEntries = frontend ? FRONTEND_ENTRIES.map(entry => `frontend/${entry}`).filter(file => !kept(file)) : [];
  if (lostEntries.length) block('FRONTEND_ENTRY', { files: lostEntries });

  const removedGates = [
    ...(java ? [...java.removed].filter(path => java.gateSources.has(path)).map(rel) : []),
    ...(frontend ? [...frontend.removed].map(rel).filter(file => file.startsWith(FRONTEND_GATE_DIR)) : []),
  ].sort((left, right) => left.localeCompare(right));

  // 생성기는 투영 뒤 규칙 제거(과거 마이그레이션 검증·원본 Atlas)를 하고 승인을 대조한다. 같은 판정을 남은 파일에 건다.
  // 원본 Atlas 규칙은 늘 같은 게이트를 걷는다(자산이 빠지면 생성기는 걷기 전에 실패한다). 과거 마이그레이션 검증 선택이
  // 실패하면 그 규칙이 적용되는지 알 수 없으므로, 승인 대조에서 그 규칙을 '적용되지 않는 규칙'으로 몰지 않는다.
  // 규칙 순서는 생성기와 같다(과거 마이그레이션 검증, 원본 Atlas). 승인되지 않은 규칙을 말하는 순서가 된다.
  const ruleRemovals = {};
  const undeterminedRules = new Set();
  try {
    const schemaTests = relativeFiles.filter(file => file.startsWith(`${HISTORICAL_SCHEMA_TEST_DIR}/`) && file.endsWith('.java') && kept(file));
    ruleRemovals['historical-migration-tests'] = selectHistoricalMigrationTests(schemaTests.map(file => join(root, file)),
      path => readFileSync(path, 'utf8')).map(rel).sort((left, right) => left.localeCompare(right));
  } catch (error) {
    undeterminedRules.add('historical-migration-tests');
    block('RULE_REMOVAL', { message: message(error) });
  }
  ruleRemovals['upstream-atlas'] = [...UPSTREAM_ATLAS.gates].sort((left, right) => left.localeCompare(right));
  try {
    const scripts = present.has(pathKey('package.json')) ? JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts : {};
    const missing = [
      ...missingUpstreamAtlasAssets(path => kept(path) || relativeFiles.some(file => file.startsWith(`${path}/`) && kept(file))),
      ...missingUpstreamAtlasAliases(scripts),
    ];
    if (missing.length) block('RULE_REMOVAL', { message: missing.join(' · ') });
  } catch (error) { block('RULE_REMOVAL', { message: message(error) }); }

  // 승인 대조는 지워지는 게이트를 다 알 때만 한다(투영이 실패하면 목록이 모자라 거짓 차단이 된다).
  if (java && frontend) {
    const acknowledgement = removedGateAcknowledgement(profile, removedGates, ruleRemovals);
    const declarations = [...acknowledgement.invalidEntries, ...acknowledgement.invalidRules];
    if (declarations.length) block('GATE_DECLARATION', { message: declarations.map(entry => JSON.stringify(entry)).join(' · ') });
    if (acknowledgement.unacknowledgedRules.length) block('RULE_UNACKNOWLEDGED', { files: acknowledgement.unacknowledgedRules });
    const staleRules = acknowledgement.staleRules.filter(rule => !undeterminedRules.has(rule));
    if (staleRules.length) block('RULE_STALE', { files: staleRules });
    if (acknowledgement.unacknowledged.length) block('GATE_UNACKNOWLEDGED', { files: acknowledgement.unacknowledged });
    if (acknowledgement.stale.length) block('GATE_STALE', { files: acknowledgement.stale });
  }
  // 시작 구성은 생성기가 연쇄로 지운 Java 를 커밋된 기대치와 대조한다(설계서 C4). 직접 선택은 기대치가 없다.
  // 생성기는 이 대조를 프런트 투영 뒤에 하므로, 게이트 대조처럼 두 투영이 모두 될 때만 한다.
  if (java && frontend && composition.profile !== 'custom') {
    const cascade = javaCascadeAcknowledgement(profile, javaCascadeRemovals(root, java).map(entry => entry.file));
    const declarations = [...cascade.invalidEntries.map(entry => JSON.stringify(entry)), ...cascade.duplicates];
    if (declarations.length) block('JAVA_CASCADE_DECLARATION', { message: declarations.join(' · ') });
    if (cascade.unacknowledged.length) block('JAVA_CASCADE_UNACKNOWLEDGED', { files: cascade.unacknowledged });
    if (cascade.stale.length) block('JAVA_CASCADE_STALE', { files: cascade.stale });
  }

  // 선택한 기능의 소스가 투영 뒤에도 남는지 본다. 생성기의 검사를 계획 결과에 그대로 건다.
  const missing = [];
  if (java && frontend) {
    try {
      assertComposerSourceSurvives(root, root, composition, manifest, { present: path => {
        const file = normalize(path).replaceAll('\\', '/');
        if (!kept(file)) missing.push(file);
        return true;
      } });
    } catch (error) { block('SOURCE_SURVIVAL', { message: message(error) }); }
  }
  if (missing.length) block('SOURCE_SURVIVAL', { files: [...new Set(missing)].sort() });

  const javaDirect = java ? java.direct.size : 0;
  return {
    // files 는 지워질 파일의 저장소 기준 경로다(생성기와 같은지 시험이 대조한다). 화면에는 개수만 보낸다.
    java: java && { removedFiles: java.removed.size, cascadeFiles: java.removed.size - javaDirect, files: [...java.removed].map(rel).sort() },
    frontend: frontend && { removedFiles: frontend.removed.size, cascadeFiles: frontend.removed.size - frontend.direct.size, files: [...frontend.removed].map(rel).sort() },
    removedGates,
    // 규칙으로 걷는 게이트 파일(승인만 대조하고 제거 수에는 세지 않는다). 화면에는 보내지 않는다.
    ruleRemovals,
    blockers,
    durationMs: Math.round(performance.now() - started),
  };
}

// 투영 오류 문장의 절대 경로 가리기는 오류 모듈과 같은 함수를 쓴다(오류 코드의 위반 문장도 같은 규칙으로 가린다).
export { withoutRoot };

/** 정밀 점검 결과를 확인 창에 보일 한 문장으로 바꾼다. 투영이 실패하면 셀 수 없는 개수를 말하지 않는다. */
export function deepSummary(deep) {
  if (!deep.java || !deep.frontend) return '투영이 실패해 지워질 파일과 검증 게이트를 셀 수 없습니다';
  return `제거: Java ${deep.java.removedFiles}개(연쇄 ${deep.java.cascadeFiles}) · 프런트 ${deep.frontend.removedFiles}개(연쇄 ${deep.frontend.cascadeFiles}) · 검증 게이트 ${deep.removedGates.length}건`;
}
