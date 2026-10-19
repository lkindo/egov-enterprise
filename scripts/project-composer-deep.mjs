import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { performance } from 'node:perf_hooks';
import { javaCascadeRemovals, planJavaRemoval } from './reusable-source-java.mjs';
import { FRONTEND_LAYOUT, createFrontendProjector, isFrontendModuleFile, planFrontendRemoval } from './reusable-source-frontend.mjs';
import { convergeRedirectPages, describeRoutes, pageSurvivalExpectation, pageSurvivalViolations } from './reusable-page-survival.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { HISTORICAL_SCHEMA_TEST_DIR, UPSTREAM_ATLAS, javaCascadeAcknowledgement, missingUpstreamAtlasAliases, missingUpstreamAtlasAssets,
  removedGateAcknowledgement, selectHistoricalMigrationTests } from './reusable-source-gates.mjs';
import { isCopyableSourceFile, normalize } from './reusable-source-tree.mjs';
import { assertComposerSourceSurvives, composerProfile } from './project-composer-source.mjs';
import { composerOwnership, loadComposerModules } from './composer-modules.mjs';
import { withoutRoot } from './project-composer-errors.mjs';
import { planPermissionProjection, readPermissionSources } from './reusable-permission-projection.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';
import { projectSourceApiDocs } from './reusable-contract-projection.mjs';
import { describeContractReferences, isContractScopeFile, predictFromProjection, vanishedContractReferences } from './reusable-contract-references.mjs';

/*
 * 정밀 점검(설계서 10장 POST /api/plan/deep, C3). 생성기가 소스를 복사한 뒤에야 하던 투영과 게이트 승인 판정을
 * 디스크를 바꾸지 않고 미리 한다. 판정 함수는 생성기와 같은 것을 쓴다(planJavaRemoval·createFrontendProjector·planFrontendRemoval·
 * 화면 생존 대조(pageSurvivalViolations)·assertComposerSourceSurvives·규칙 제거 선택·removedGateAcknowledgement·
 * api-docs 투영(projectSourceApiDocs)·사라진 계약 이름 참조(vanishedContractReferences)·권한 투영(planPermissionProjection)).
 * 그래서 여기서 찾은 차단 사유는 생성하면 같은 자리에서 실패할 사유다. 투영 뒤의 DB 번들·ZDM 원장·하네스 단계는 보지 않는다.
 * 규칙으로 걷는 게이트(과거 마이그레이션 검증·원본 Atlas)는 승인만 대조하고 제거 수에는 세지 않는다.
 */
const FRONTEND_GATE_DIR = 'frontend/src/__tests__/';
// 라우트가 아닌 진입점만 따로 본다. 홈·로그인 같은 화면은 아래 화면 생존 대조(core 기대 화면)가 본다.
const FRONTEND_ENTRIES = [FRONTEND_LAYOUT];
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
  API_CONTRACT_PROJECTION: 'API 계약(api-docs)을 투영할 수 없습니다',
  API_CONTRACT_REFERENCE: '남는 코드가 구성에서 빠진 API 계약 이름을 씁니다',
  FRONTEND_SCREEN_EXTRA: '구성에 없는 화면이 투영 뒤에 남습니다',
  PERMISSION_PROJECTION: '권한 정의(카탈로그·바인딩·묶음·화면 목록)를 구성으로 줄일 수 없습니다',
});

/** Compare observed removals with acknowledgements without reading/projecting the source tree again. */
export function projectionAcknowledgementBlockers(profile, { removedGates, ruleRemovals, javaCascade, undeterminedRules = new Set() }) {
  const blockers = [];
  const block = (code, detail) => blockers.push({ code, label: DEEP_BLOCKER_LABELS[code], ...detail });
  const acknowledgement = removedGateAcknowledgement(profile, removedGates, ruleRemovals);
  const declarations = [...acknowledgement.invalidEntries, ...acknowledgement.invalidRules];
  if (declarations.length) block('GATE_DECLARATION', { message: declarations.map(entry => JSON.stringify(entry)).join(' · ') });
  if (acknowledgement.unacknowledgedRules.length) block('RULE_UNACKNOWLEDGED', { files: acknowledgement.unacknowledgedRules });
  const staleRules = acknowledgement.staleRules.filter(rule => !undeterminedRules.has(rule));
  if (staleRules.length) block('RULE_STALE', { files: staleRules });
  if (acknowledgement.unacknowledged.length) block('GATE_UNACKNOWLEDGED', { files: acknowledgement.unacknowledged });
  if (acknowledgement.stale.length) block('GATE_STALE', { files: acknowledgement.stale });
  if (javaCascade !== undefined) {
    const cascade = javaCascadeAcknowledgement(profile, javaCascade);
    const declarations = [...cascade.invalidEntries.map(entry => JSON.stringify(entry)), ...cascade.duplicates];
    if (declarations.length) block('JAVA_CASCADE_DECLARATION', { message: declarations.join(' · ') });
    if (cascade.unacknowledged.length) block('JAVA_CASCADE_UNACKNOWLEDGED', { files: cascade.unacknowledged });
    if (cascade.stale.length) block('JAVA_CASCADE_STALE', { files: cascade.stale });
  }
  return blockers;
}

/**
 * `files` 는 Git 이 보는 파일(추적·무시되지 않은 새 파일, build 제외)의 저장소 기준 경로다. 생성기처럼
 * 실제로 복사할 수 있는 파일만 남겨 생성물의 파일 집합으로 쓴다.
 * `outputParent` 는 생성기가 생성물 폴더를 만들 상위 폴더다(없어도 된다). 대소문자 구분을 그 자리에서 판정한다.
 * 차단 사유는 `{ code, label, files?, message? }` 로 모은다. label 은 화면이 그대로 보이는 한국어 문장이다.
 * 화면 생존의 기대값(`pageSurvival`)은 넘기지 않으면 `root` 의 라우트 원장과 카탈로그(`catalog`, 없으면 적재)로 만든다.
 * 권한 투영 입력(`permissionSources` = 카탈로그·인가 원장·묶음 원장·화면 용어 원장·화면 목록 산출물)은 넘기지 않으면 `root` 에서 읽는다.
 * API 계약(`apiContract` = { doc, bindings })은 넘기지 않으면 `root` 의 api-docs 와 인가 원장에서 읽는다.
 * 기능 소유와 시작 구성 기대치는 매니페스트 v2 에서 읽는다(`modules` — loadComposerModules 결과, 없으면 `root` 에서 적재). 생성기와 같다
 * (11단계 C3) — 시작 구성도 직접 선택과 같은 판정이고 pack 을 보지 않는다.
 * `readSource` 는 투영이 읽는 소스 원문(Java·프런트·과거 마이그레이션 검증·계약 참조·package.json)을 읽는다. 기본은 디스크다. 한 번의 점검
 * 안에서 내용이 바뀌지 않는 트리를 여러 번 점검하는 호출자(시험)만 기억하는 읽기를 넘긴다.
 */
export function compositionDeepPlan({ root, composition, files, outputParent, catalog, pageSurvival, permissionSources,
  apiContract: apiContractSource, modules = loadComposerModules(root), readSource = path => readFileSync(path, 'utf8') }) {
  const started = performance.now();
  const profile = composerProfile(modules, composition);
  // 투영 단계(Java·프런트 제거 계획)에는 구성의 투영 필드만 넘긴다 — 승인 목록(acknowledged*)은 아래 승인 대조에만 쓴다.
  // 그래서 '제거 집합은 승인 목록과 독립' 이 주석이 아니라 코드 구조로 성립한다. 승인 목록만 바꾸는 시험이 한 번 잰 제거 집합을
  // 다시 쓰는(projectionAcknowledgementBlockers) 근거가 이것이다. 프런트 투영은 구성(composition)만 받는다.
  const projection = { resolvedDomains: profile.resolvedDomains, frontendRemovePaths: profile.frontendRemovePaths };
  const relativeFiles = files.map(normalize).filter(file => isCopyableSourceFile(file, root));
  const pathKey = ignoresCase(root, relativeFiles, outputParent) ? path => path.toLowerCase() : path => path;
  const present = new Set(relativeFiles.map(pathKey));
  const blockers = [];
  const block = (code, detail) => blockers.push({ code, label: DEEP_BLOCKER_LABELS[code], ...detail });
  const message = error => withoutRoot(root, String(error?.message ?? error));
  const rel = path => normalize(relative(root, path));

  let java = null;
  let ownership = null;
  try {
    // 지원 파일 선언은 여기서 검사하며 푼다 — 잘못된 선언은 생성기와 같은 자리(Java 투영)에서 실패한다.
    ownership = composerOwnership(modules);
    // 제외 도메인 폴더는 디스크가 아니라 복사할 파일 목록에서 훑는다(생성기는 복사한 트리를 훑는다). 폴더는 제외 기능마다 넷이라
    // 파일 목록의 절대 경로·비교 키는 처음 훑을 때 한 번만 만든다(종전에는 폴더마다 전체 목록을 다시 이었다). 순서는 목록 그대로다.
    let keyedFiles;
    const walkDirectory = directory => {
      const prefix = pathKey(`${directory}${sep}`);
      keyedFiles ??= relativeFiles.map(file => { const path = join(root, file); return [path, pathKey(path)]; });
      return keyedFiles.filter(([, key]) => key.startsWith(prefix)).map(([path]) => path);
    };
    const plan = planJavaRemoval(root, ownership, projection, relativeFiles.filter(file => file.endsWith('.java')).map(file => join(root, file)),
      { walkDirectory, readSource });
    // 생성기는 복사한 트리에서 선언된 지원 파일을 찾는다. 디스크에만 있고 복사되지 않는 파일이면 거기서 실패한다.
    for (const supportFiles of ownership.supportFiles.values()) {
      for (const file of supportFiles) if (!present.has(pathKey(file))) throw new Error(`Missing domain support file: ${file}`);
    }
    java = plan;
  } catch (error) { block('JAVA_PROJECTION', { message: message(error) }); }

  // API 계약 투영(10c-2): 핸들러 소스가 지워지는 연산을 api-docs 에서 뺀다. 생성기는 Java 투영 뒤 같은 함수로 생성물 트리를 판정하므로
  // 바인딩 없는 연산·소스를 찾지 못한 핸들러·셀 수 없는 스키마 참조는 생성하면 같은 자리에서 실패한다.
  let apiContract = null;
  let apiProjection = null;
  if (java) {
    try {
      const removedJava = new Set([...java.removed].map(path => pathKey(rel(path))));
      apiProjection = projectSourceApiDocs(root, file => removedJava.has(pathKey(file)), apiContractSource);
      apiContract = { ...apiProjection.summary, removedOperationIds: apiProjection.removedOperations.map(operation => operation.operationId).sort(),
        keptAliasesWithoutBase: apiProjection.keptAliasesWithoutBase };
    } catch (error) { block('API_CONTRACT_PROJECTION', { message: message(error) }); }
  }

  const frontendRoot = join(root, 'frontend');
  // 생성기처럼 모든 프런트 모듈 파일에 투영(구성의 화면 제외 경로와 마커 블록의 소유 기능)을 먼저 하고, 그 내용으로 import 를 읽는다.
  // 곧 지워질 파일의 마커 오류·판정할 수 없는 import 도 생성기는 투영 단계에서 실패하므로 여기서도 차단 사유가 된다.
  // 투영할 파일은 생성기와 같은 판정(isFrontendModuleFile)으로 고른다 — 연쇄 계획이 읽는 모든 파일이 이 맵에 있어야 한다.
  const frontendFiles = relativeFiles.filter(file => file.startsWith('frontend/')).map(file => join(root, file));
  let frontend = null;
  let projected = new Map();
  try {
    // 슬롯 레지스트리는 생성기처럼 복사할 파일 목록으로 렌더한다(PR-4).
    const projector = createFrontendProjector({ composition, files: relativeFiles.filter(file => file.startsWith('frontend/')) });
    const project = path => projector.project(normalize(relative(frontendRoot, path)), readSource(path)).source;
    projected = new Map(frontendFiles.filter(isFrontendModuleFile).map(path => [path, project(path)]));
    frontend = planFrontendRemoval({ frontendRoot, files: frontendFiles, directPaths: projector.directPaths,
      readSource: path => projected.get(path) });
  } catch (error) { block('FRONTEND_PROJECTION', { message: message(error) }); }
  const removed = new Set([...(java?.removed ?? []), ...(frontend?.removed ?? [])].map(path => pathKey(rel(path))));
  const kept = file => present.has(pathKey(file)) && !removed.has(pathKey(file));
  // 남는 프런트 코드가 이 구성에서 사라질 계약 이름을 쓰는지 미리 본다(트랙 K 검토 #2). 생성기는 생성 타입을 다시 만든 직후 같은 판정을
  // 생성물 트리에서 하고, 사라질 이름이 이 예측과 같은지도 본다. 내용은 투영(마커 걷기) 뒤의 것을 읽는다.
  if (apiProjection && frontend) {
    try {
      const surviving = relativeFiles.filter(file => isContractScopeFile(file) && kept(file));
      const references = vanishedContractReferences(surviving.map(file => ({ file, source: projected.get(join(root, file)) ?? readSource(join(root, file)) })),
        predictFromProjection(root, apiProjection));
      if (references.hits.length || references.issues.length) {
        block('API_CONTRACT_REFERENCE', { files: [...new Set([...references.hits, ...references.issues].map(entry => entry.file))].sort(),
          message: describeContractReferences(references).join(' · ') });
      }
    } catch (error) { block('API_CONTRACT_REFERENCE', { message: message(error) }); }
  }
  // 생성기는 투영 뒤 루트 레이아웃이 디스크에 있는지 본다(pruneFrontend). 원본에 없거나 연쇄로 지워지면 같은 자리에서 실패한다.
  // 화면(홈·로그인 포함)은 아래 화면 생존 대조가 본다.
  const lostEntries = frontend ? FRONTEND_ENTRIES.map(entry => `frontend/${entry}`).filter(file => !kept(file)) : [];
  if (lostEntries.length) block('FRONTEND_ENTRY', { files: lostEntries });
  // 연쇄 뒤 남는 화면이 구성의 기대값과 같은지 본다(리다이렉트 수렴 포함). 생성기는 같은 대조를 디스크에서 한다(projectedScreenLosses):
  // 빠진 화면은 아래 SOURCE_SURVIVAL 에 합치고, 남은 화면은 생성기가 일반 실패로 멈추는 자리다. 화면은 디렉터리·파일 이름 그대로
  // 라우트가 되므로 출력 폴더가 대소문자를 가리지 않아도 이름이 정확히 같은 page 파일만 남은 화면이다(생성기와 같다).
  const exactFiles = new Set(relativeFiles);
  const screenKept = file => exactFiles.has(file) && !removed.has(pathKey(file));
  const lostScreens = [];
  let routeRows = null;
  if (frontend) {
    try {
      const expectation = pageSurvival ?? pageSurvivalExpectation({ root, catalog: catalog ?? loadProjectComposerCatalog(root), composition });
      const { missing: screens, extra } = pageSurvivalViolations({ ...expectation, survives: screenKept });
      // 같은 원장으로 수렴할 수 없으면(위에서 실패) 권한 투영은 판정하지 않는다 — 차단 사유는 FRONTEND_PROJECTION 하나다.
      routeRows = expectation.rows;
      lostScreens.push(...screens.map(entry => entry.source));
      if (extra.length) block('FRONTEND_SCREEN_EXTRA', { files: extra.map(entry => entry.source), message: describeRoutes(extra) });
    } catch (error) { block('FRONTEND_PROJECTION', { message: message(error) }); }
  }

  // 권한 투영(10단계 10b): 생성기는 Java·프런트 투영과 리다이렉트 정리 뒤 카탈로그·인가 원장 바인딩·화면 목록·묶음 원장을 구성으로 줄인다.
  // 같은 판정(planPermissionProjection — 생성기와 같은 모듈)을 미리 한다. 남는 page(넘기는 page 포함)에 카탈로그 키가 없거나 그 진입 권한,
  // 남는 바인딩이 구성 밖 코드를 요구하거나, 묶음 원장이 남는 권한을 나누지 못하면 생성하면 같은 자리에서 실패한다.
  // 남는 page 는 생성기의 거버넌스 투영처럼 목적지가 사라진 리다이렉트 page 를 수렴할 때까지 뺀 집합이다(화면 생존 대조와 같은 규칙).
  // 두 투영과 라우트 원장 읽기가 모두 될 때만 판정한다(지워질 파일을 다 알아야 한다).
  let permissionProjection = null;
  if (java && frontend && routeRows) {
    try {
      const keptPageRoutes = convergeRedirectPages(discoverPageRoutes(root).filter(page => screenKept(page.source)).map(page => page.route), routeRows);
      permissionProjection = planPermissionProjection({ sourceRoot: root, composition, removed: file => removed.has(pathKey(file)),
        keptPageRoutes, sources: permissionSources ?? readPermissionSources(root) });
    } catch (error) { block('PERMISSION_PROJECTION', { message: message(error) }); }
  }

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
      readSource).map(rel).sort((left, right) => left.localeCompare(right));
  } catch (error) {
    undeterminedRules.add('historical-migration-tests');
    block('RULE_REMOVAL', { message: message(error) });
  }
  ruleRemovals['upstream-atlas'] = [...UPSTREAM_ATLAS.gates].sort((left, right) => left.localeCompare(right));
  try {
    const scripts = present.has(pathKey('package.json')) ? JSON.parse(readSource(join(root, 'package.json'))).scripts : {};
    const missing = [
      ...missingUpstreamAtlasAssets(path => kept(path) || relativeFiles.some(file => file.startsWith(`${path}/`) && kept(file))),
      ...missingUpstreamAtlasAliases(scripts),
    ];
    if (missing.length) block('RULE_REMOVAL', { message: missing.join(' · ') });
  } catch (error) { block('RULE_REMOVAL', { message: message(error) }); }

  // 승인 대조는 두 투영이 성공해 제거 집합을 모두 알 때만 한다. 직접 선택에는 연쇄 승인 목록이 없다.
  if (java && frontend) {
    blockers.push(...projectionAcknowledgementBlockers(profile, { removedGates, ruleRemovals, undeterminedRules,
      javaCascade: composition.profile === 'custom' ? undefined : javaCascadeRemovals(root, java).map(entry => entry.file) }));
  }

  // 선택한 기능의 소스가 투영 뒤에도 남는지 본다. 생성기의 검사를 계획 결과에 그대로 건다.
  const missing = [];
  if (java && frontend) {
    try {
      assertComposerSourceSurvives(root, root, composition, ownership, { present: path => {
        const file = normalize(path).replaceAll('\\', '/');
        if (!kept(file)) missing.push(file);
        return true;
      } });
    } catch (error) { block('SOURCE_SURVIVAL', { message: message(error) }); }
  }
  if (missing.length || lostScreens.length) block('SOURCE_SURVIVAL', { files: [...new Set([...lostScreens, ...missing])].sort() });

  const javaDirect = java ? java.direct.size : 0;
  return {
    // files 는 지워질 파일의 저장소 기준 경로다(생성기와 같은지 시험이 대조한다). 화면에는 개수만 보낸다.
    java: java && { removedFiles: java.removed.size, cascadeFiles: java.removed.size - javaDirect, files: [...java.removed].map(rel).sort() },
    frontend: frontend && { removedFiles: frontend.removed.size, cascadeFiles: frontend.removed.size - frontend.direct.size, files: [...frontend.removed].map(rel).sort() },
    removedGates,
    // 생성물의 권한 카탈로그·바인딩·화면·묶음 수와 빠지는 page 권한·묶음·생성 제외 권한(생성기와 같은지 시험이 대조한다 —
    // project-composer-deep-parity.test.mjs 가 복사한 트리에서 생성기의 권한 투영 단계를 돌려 비교한다). 화면에는 보내지 않는다.
    permissionProjection,
    // 생성물 api-docs 의 연산·스키마·태그 수와 빠지는 연산 id(생성기와 같은지 시험이 대조한다). 화면에는 보내지 않는다.
    apiContract,
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
