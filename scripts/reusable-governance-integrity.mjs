#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { containedFile, containedFileResolver } from './adoption-review.mjs';
import { compositionProfiles } from './composition-profiles.mjs';
import { buildUrlStateCensus, approvedStateItemSelectors, isUrlStateItemApproved } from './ui-url-state-census.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';
import { deriveProjectedReviewManifests, REVIEW_MANIFEST_PATHS, REVIEW_SCOPE_PATH } from './reusable-review-scopes.mjs';
import { compositionDigest } from './project-composer-catalog.mjs';
import { COMPOSER_SELECTION_PATH, verifyProjectComposition } from './project-composer-recipe.mjs';
import { COMPOSER_MENU_SNAPSHOT_PATH } from './project-composer-menu-preview.mjs';
import { inspectProjectionLedger } from './reusable-projection-ledger.mjs';
import { artifactScreenErrors } from './reusable-page-survival.mjs';
import { buildPermissionArtifacts } from './generate-permissions.mjs';
import { AUTHORIZATION_POLICY_PATH, PERMISSION_CATALOG_PATH, projectPermissionCatalog, projectedPermissionCoverageErrors } from './reusable-permission-projection.mjs';
import { SCREEN_REGISTRY_OUTPUT, readScreenRegistryArtifact, validateScreenRegistry } from './screen-registry-model.mjs';
import { MODULES_DIRECTORY, PRESETS_FILE, detectGeneratedComposition, hashedModuleDeclarations, projectedModuleViolations, readComposerModuleFiles } from './composer-modules.mjs';

export const PROJECTION_PATH = 'config/governance/reusable-governance-projection.json';
export const UPSTREAM_DIRECTORY = 'config/governance/upstream-review';
export const MEMORY_PATHS = ['.agent/memory/project-context.md', '.agent/memory/decisions.md', '.agent/memory/known-gaps.md'];
/**
 * 원본 기능 선언(매니페스트 v2)의 스냅숏. 생성물의 config/modules 는 구성의 기능 파일만 담으므로, 구성 카탈로그의 출처 해시
 * (provenance.modulesHash)는 원본 전체 선언의 이 스냅숏에 결속된다(11단계 C7 — 종전 v1 manifest 스냅숏을 대신한다). 디렉터리라
 * 파일 하나로 적는다: 카탈로그 해시가 덮는 선언(hashedModuleDeclarations — 화면 문구·미배정 권한 안내·CI 범위를 뺀 값)을 파일
 * 이름 → 값으로 담는다.
 */
const UPSTREAM_MODULES = MODULES_DIRECTORY;
/** 생성물의 활성 구성 선언(생성물 표지). 원본 스냅숏은 두지 않는다 — 원본 presets.json 은 시작 구성 전부라 생성물의 것과 다르다. */
const ACTIVE_COMPOSITION = `${MODULES_DIRECTORY}/${PRESETS_FILE}`;
export const UPSTREAM_SOURCES = Object.freeze([
  'config/ui-url-state-census.json', 'config/ui-url-state-approval.json', 'config/ui-url-state-approval.schema.json',
  'config/ui-route-capabilities.json', ...Object.values(REVIEW_MANIFEST_PATHS),
  UPSTREAM_MODULES, 'config/governance/permission-catalog.json', REVIEW_SCOPE_PATH, ...MEMORY_PATHS,
]);
export const ACTIVE_ARTIFACTS = Object.freeze([...UPSTREAM_SOURCES.filter(path => path !== UPSTREAM_MODULES), ACTIVE_COMPOSITION]);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HEX = /^[a-f0-9]{64}$/u;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const normalizedText = (root, file) => readFileSync(containedFile(root, file), 'utf8').replace(/\r\n?/gu, '\n');
const readJson = (root, file) => JSON.parse(normalizedText(root, file));
const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;
export const canonicalJsonSha256 = value => sha256(jsonText(value));
export const artifactTextSha256 = (root, file) => sha256(normalizedText(root, file));
export const snapshotPathFor = source => (source === UPSTREAM_MODULES ? `${UPSTREAM_DIRECTORY}/modules.json`
  : `${UPSTREAM_DIRECTORY}/${source.split('/').at(-1)}`);
/** 원본 출처의 스냅숏 본문(줄 끝 정규화). 기능 선언 디렉터리는 카탈로그 해시가 덮는 선언을 JSON 하나로 적는다(UPSTREAM_MODULES). */
export function upstreamSnapshotText(sourceRoot, source) {
  return source === UPSTREAM_MODULES ? jsonText(hashedModuleDeclarations(readComposerModuleFiles(sourceRoot))) : normalizedText(sourceRoot, source);
}
const exact = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const CODE_ROOTS = [
  ...['foundation', 'business-core', 'business-app', 'api-server'].flatMap(module => [`${module}/src/main`, `${module}/build.gradle`]),
  'frontend/src', 'frontend/next.config.ts', 'frontend/package.json', 'frontend/pnpm-lock.yaml', 'frontend/tsconfig.json',
  'build.gradle', 'settings.gradle', 'gradle.properties', 'gradle',
  'package.json', 'scripts', '.githooks/pre-push',
  '.github/workflows', '.github/required-checks.json', 'config/governance/upstream-verification',
  'config/governance/authorization-policies.json', 'config/governance/permission-catalog.json',
];
const TEXT = new Set(['.java', '.kt', '.kts', '.json', '.yaml', '.yml', '.xml', '.properties', '.sql', '.js', '.jsx', '.ts', '.tsx',
  '.mjs', '.cjs', '.css', '.scss', '.html', '.md', '.txt', '.gradle', '.toml', '.lock', '.sh', '.bat', '.ps1']);

/** Release certification binds source content, not elapsed time or an institution approval date. */
export function projectedCodeScope(root) {
  const files = new Map();
  // 수천 파일을 containedFile 과 같은 판정으로 가둔다 — 루트 실경로는 한 번만 푼다(containedFileResolver). 루트가 없으면 아래 순회가
  // 아무 파일도 찾지 않으므로 처음 파일을 만날 때 만든다.
  let contained;
  function walk(file) {
    const path = join(root, file);
    if (!existsSync(path)) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Artifact source scope cannot contain a symlink: ${file}`);
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) walk(`${file}/${name}`);
    } else if (stat.isFile()) {
      if (file.startsWith('scripts/') && /\.test\.[cm]?[jt]s$/u.test(file)) return;
      contained ??= containedFileResolver(root);
      const bytes = readFileSync(contained(file));
      const text = TEXT.has(extname(file)) || file.endsWith('/pre-push');
      files.set(file, sha256(text ? bytes.toString('utf8').replace(/\r\n?/gu, '\n') : bytes));
    }
  }
  for (const rootPath of CODE_ROOTS) walk(rootPath);
  if (!files.has('frontend/src/proxy.ts') || !files.has('frontend/next.config.ts') || files.size < 10) {
    throw new Error('Artifact code scope is missing required online sources');
  }
  const inputs = [...files].sort(([a], [b]) => a.localeCompare(b, 'en'));
  return { format: 'reusable-source-evidence-v1-lf-text-raw-binary', fileCount: inputs.length, sha256: sha256(JSON.stringify(inputs)) };
}

export function buildGeneratedMemory({ profile, sourceCommit }) {
  const titles = ['프로젝트 컨텍스트', '결정 인덱스', '미해결 위험 인덱스'];
  return Object.fromEntries(MEMORY_PATHS.map((path, index) => {
    const basename = path.split('/').at(-1);
    const kind = basename.replace(/\.md$/u, '');
    return [path, `---\nschema_version: 1\nmemory_kind: ${kind}\nauthority: derived-generated-profile-index\nscope: generated-profile\nprofile: ${profile}\nsource_commit: ${sourceCommit}\n---\n\n` +
      `# 생성물 ${titles[index]}\n\n` +
      `이 파일은 ${profile} 소스 산출물의 비규범 인덱스다. 원본 제품의 운영 실측과 기관 승인은 현재 도입 프로젝트의 사실로 승계하지 않는다.\n\n` +
      `- 원본 commit: \`${sourceCommit}\`\n` +
      `- 현재 소스·원장·제외 사유: [투영 원장](../../config/governance/reusable-governance-projection.json)\n` +
      `- 원본 기록: [upstream snapshot](../../${snapshotPathFor(path)}) — 원본 위치는 \`${path}\`이며 내부 상대 링크도 그 원본 위치를 기준으로 해석한다.\n` +
      `- 기관 온라인 승인: [현재 원장](../../config/governance/adoption-review.json)\n` +
      `- 기관 이관 승인: [현재 원장](../../config/governance/migration-adoption-review.json)\n\n` +
      `생성 시 두 기관 승인 원장은 pending으로 시작했다. 이후 상태는 위 원장이 소유한다. 기계 생성 일시나 원본의 검토자·날짜를 기관 재검토 증거로 사용하지 않는다.\n` +
      `실행한 검증과 미해결 항목은 현재 산출물에서 재확인한다. 원본 운영 메뉴 수·배포 이력·미해결 위험은 upstream 이력이며 현재 기관의 실측을 대신하지 않는다.\n`];
  }));
}

/**
 * [10단계 10b] 생성물의 권한 투영 불변식. 생성기 자신을 믿지 않고 원본 스냅숏·구성·생성물 트리에서 다시 센다.
 *   · 카탈로그 = 원본 카탈로그 스냅숏을 구성 코드와 생성물에 남는 page 로 줄인 것(값·순서 그대로).
 *   · 권한 생성물(Java·TS 코드 상수, 런타임 카탈로그·바인딩, 시드 생성 블록)이 생성물의 카탈로그·인가 원장에서 다시 만든 것과 같다 —
 *     그래서 런타임 바인딩 = 인가 원장이다.
 *   · 인가 원장 바인딩의 핸들러 소스가 생성물에 있고(외부 핸들러 제외), 하네스 census 가 있으면 카탈로그·바인딩 수가 그 도출값과 같다.
 *   · 화면 목록 산출물의 화면·별칭이 생성물 page 와 같고, 행·묶음의 권한이 카탈로그 안이며, 묶음이 묶음 원장(투영본 규칙)으로 다시
 *     계산한 것과 같다.
 */
export function projectedPermissionArtifactErrors(root, { composition, upstreamCatalog, pageRoutes }) {
  const errors = [];
  try {
    const expected = projectPermissionCatalog(upstreamCatalog, { permissionCodes: composition.permissionCodes, routes: pageRoutes }).catalog;
    const catalog = readJson(root, PERMISSION_CATALOG_PATH);
    if (!exact(catalog, expected)) errors.push('Projected permission catalog differs from the upstream catalog reduced to the composition');
    const policies = readJson(root, AUTHORIZATION_POLICY_PATH);
    errors.push(...projectedPermissionCoverageErrors(root, { catalog, bindings: policies.operationBindings ?? [],
      permissionCodes: composition.permissionCodes }));
    for (const [file, content] of Object.entries(buildPermissionArtifacts(root))) {
      if (!existsSync(join(root, file)) || normalizedText(root, file) !== content.replace(/\r\n?/gu, '\n')) {
        errors.push(`Generated permission artifact differs from the projected permission sources: ${file}`);
      }
    }
    const registry = readScreenRegistryArtifact(normalizedText(root, SCREEN_REGISTRY_OUTPUT));
    errors.push(...validateScreenRegistry(registry, root).map(error => `Projected screen registry: ${error}`));
  } catch (error) { errors.push(`Projected permission artifacts cannot be verified: ${error.message}`); }
  return errors;
}

export function inspectReusableGovernance(root = ROOT, { requireLock = true } = {}) {
  const errors = [];
  let metadata;
  let reviewScopes;
  function check(condition, message) { if (!condition) errors.push(message); }
  try {
    metadata = readJson(root, PROJECTION_PATH);
    check(metadata.schemaVersion === 1 && metadata.authority === 'generated-reusable-governance-projection-not-environment-approval', 'Invalid projection metadata authority');
    check(compositionProfiles().includes(metadata.profile), 'Invalid projection profile');
    check(/^[a-f0-9]{40}$/u.test(metadata.sourceCommit ?? ''), 'Invalid upstream source commit');
    const snapshots = metadata.upstreamSnapshots ?? [];
    check(exact(snapshots.map(row => row.sourcePath).sort(), [...UPSTREAM_SOURCES].sort()), 'Upstream snapshot population must be exact');
    const upstream = new Map();
    for (const snapshot of snapshots) {
      check(snapshot.path === snapshotPathFor(snapshot.sourcePath), `Unexpected upstream snapshot location: ${snapshot.sourcePath}`);
      const text = normalizedText(root, snapshot.path);
      check(HEX.test(snapshot.sha256 ?? '') && sha256(text) === snapshot.sha256, `Upstream snapshot hash mismatch: ${snapshot.sourcePath}`);
      upstream.set(snapshot.sourcePath, snapshot.sourcePath.endsWith('.json') || snapshot.sourcePath === UPSTREAM_MODULES ? JSON.parse(text) : text);
    }
    const originalModules = upstream.get(UPSTREAM_MODULES);
    let composition;
    let catalog;
    if (metadata.composition) {
      check(metadata.composition.path === COMPOSER_SELECTION_PATH, 'Unexpected composition snapshot location');
      check(HEX.test(metadata.composition.sha256 ?? '') && artifactTextSha256(root, COMPOSER_SELECTION_PATH) === metadata.composition.sha256,
        'Composition snapshot checksum mismatch');
      check(HEX.test(metadata.composition.menuSnapshotSha256 ?? '')
        && artifactTextSha256(root, COMPOSER_MENU_SNAPSHOT_PATH) === metadata.composition.menuSnapshotSha256,
      'Composer menu snapshot checksum mismatch');
      const selection = readJson(root, COMPOSER_SELECTION_PATH);
      catalog = selection.catalog;
      composition = verifyProjectComposition(selection.composition, catalog);
      check(composition.profile === metadata.profile, 'Composition profile differs from projection');
      check(catalog.provenance.modules === UPSTREAM_MODULES && catalog.provenance.modulesHash === compositionDigest(originalModules),
        'Composition catalog differs from upstream module declaration snapshot');
      check(catalog.provenance.permissionsHash === compositionDigest(upstream.get('config/governance/permission-catalog.json')),
        'Composition catalog differs from upstream permission snapshot');
      for (const key of ['catalogHash', 'recipeHash', 'compositionHash']) check(metadata.composition[key] === composition[key], `Composition ${key} mismatch`);
    } else {
      // 프리셋도 구성 경로로 생성한다(DEC-OPS-239). 구성 스냅숏이 없으면 어느 프로필이든 출처를 증명할 수 없다.
      check(false, 'Generated projection requires a resolved composition snapshot');
    }
    // 활성 구성은 매니페스트 v2 의 표지(presets.json 의 active)이고, 표지·구조가 구성과 맞는지 본다. 생성물 표지 판정이 실패하면
    // (표지 위장·구조 불일치, 걷은 v1 소유 선언 파일이 되살아남 — 'old ownership declaration remains') 여기서 붉다.
    // 표지 판정 실패는 오류로 적고 나머지 검사(기능 파일 집합·원장 등)를 계속한다 — 위장·구조 불일치의 원인이 함께 보이게 한다.
    let marker;
    try { marker = detectGeneratedComposition(root); } catch (error) { errors.push(error.message); }
    if (marker) check(marker.projection && marker.profile === metadata.profile, 'Generated composition marker differs from projection profile');
    // 생성물의 매니페스트 v2(config/modules)는 구성의 기능 파일·core·활성 구성 하나만 담는다(11단계 C3). 빠진 기능의 선언이 남으면
    // 생성물이 갖지 않은 기능을 있다고 말한다 — 수동 도메인 삭제 판정(domain-deletion-plan)이 그 기능을 안다.
    if (composition) {
      const directory = join(root, MODULES_DIRECTORY);
      const names = existsSync(directory) ? readdirSync(directory).filter(name => name.endsWith('.json')) : [];
      errors.push(...projectedModuleViolations({ names, read: name => readJson(root, `${MODULES_DIRECTORY}/${name}`), composition }));
    }
    if (requireLock) {
      const lock = readJson(root, 'reusable-base-lock.json');
      check(lock.profile === metadata.profile && lock.sourceCommit === metadata.sourceCommit && !Object.hasOwn(lock, 'packs'), 'Source lock profile/commit mismatch');
      check(lock.governance?.path === PROJECTION_PATH && lock.governance?.projectionSha256 === canonicalJsonSha256(metadata), 'Source lock projection checksum mismatch');
      if (composition) {
        check(exact(verifyProjectComposition(lock.composition, catalog), composition), 'Source lock composition mismatch');
        check(lock.composition.sourceCommit === metadata.sourceCommit, 'Source lock composition commit mismatch');
      } else check(!lock.composition, 'Source lock contains an unbound composition');
      errors.push(...inspectProjectionLedger(root, lock));
    }
    check(exact(metadata.codeScope, projectedCodeScope(root)), 'Source evidence scope changed; inherited approval requires review before artifact certification');
    const activeArtifacts = metadata.activeArtifacts ?? [];
    check(exact(activeArtifacts.map(row => row.path).sort(), [...ACTIVE_ARTIFACTS].sort()), 'Active artifact hash population must be exact');
    for (const artifact of activeArtifacts) {
      check(HEX.test(artifact.sha256 ?? '') && artifactTextSha256(root, artifact.path) === artifact.sha256, `Active review artifact changed: ${artifact.path}`);
    }
    const bindings = metadata.sourceBindings ?? [];
    check(bindings.length > 0 && new Set(bindings.map(row => row.source)).size === bindings.length, 'Source binding population must be nonempty and unique');
    const bindingIndex = new Map();
    for (const binding of bindings) {
      check(HEX.test(binding.upstreamSha256 ?? '') && HEX.test(binding.projectedSha256 ?? ''), `Invalid source binding hash: ${binding.source}`);
      check(artifactTextSha256(root, binding.source) === binding.projectedSha256, `Inherited source evidence changed: ${binding.source}`);
      bindingIndex.set(binding.source, binding);
    }
    const routes = readJson(root, 'config/ui-route-capabilities.json');
    const actualPages = discoverPageRoutes(root);
    check(exact(metadata.routes, actualPages.map(({ route, source }) => ({ route, source }))), 'Projection route population differs from actual pages');
    // 생성물의 화면은 구성이 남겨야 할 화면과 정확히 같다(기능 소유 + 리다이렉트 수렴, reusable-page-survival.mjs). 원천은 원본
    // 라우트 원장 스냅숏과 구성 카탈로그다. 생성기는 연쇄 직후 같은 대조를 하고, 여기서는 거버넌스 투영까지 끝난 디스크를 그대로 본다.
    if (composition) {
      errors.push(...artifactScreenErrors({ ledger: upstream.get('config/ui-route-capabilities.json'), catalog, composition,
        pageSources: new Set(actualPages.map(page => page.source)) }));
      errors.push(...projectedPermissionArtifactErrors(root, { composition, upstreamCatalog: upstream.get(PERMISSION_CATALOG_PATH),
        pageRoutes: new Set(actualPages.map(page => page.route)) }));
    }
    const census = readJson(root, 'config/ui-url-state-census.json');
    check(exact(census, buildUrlStateCensus({ repoRoot: root })), 'URL census drifted from current source');
    check(exact(metadata.urlRecordIds, census.records.map(row => row.id).sort()), 'Projection URL record population mismatch');
    const priorCensus = upstream.get('config/ui-url-state-census.json');
    const priorApproval = upstream.get('config/ui-url-state-approval.json');
    const approval = readJson(root, 'config/ui-url-state-approval.json');
    const priorSelectors = approvedStateItemSelectors(priorApproval, priorCensus);
    const currentSelectors = approvedStateItemSelectors(approval, census);
    check(priorSelectors.length === priorApproval.classes.filter(row => row.reviewState === 'approved').length, 'Upstream approval no longer binds its snapshot');
    check(currentSelectors.length === approval.classes.filter(row => row.reviewState === 'approved').length, 'Active URL approval is invalid');
    const inheritedIds = new Set();
    for (const cls of approval.classes.filter(row => row.reviewState === 'approved')) {
      const previous = priorApproval.classes.find(row => row.classId === cls.classId);
      const { selector: currentSelector, ...currentDecision } = cls;
      const { selector: priorSelector, ...priorDecision } = previous ?? {};
      check(exact(currentDecision, priorDecision), `Inherited review decision changed or was invented: ${cls.classId}`);
      check(Array.isArray(currentSelector.recordIds) && currentSelector.recordIds.length > 0, `Inherited approval must have exact record selectors: ${cls.classId}`);
      check((currentSelector.stateItemNames ?? []).every(name => priorSelector?.stateItemNames.includes(name)), `Inherited state selector widened: ${cls.classId}`);
      for (const binding of currentSelector.routeKeyBindings ?? []) {
        check((priorSelector?.routeKeyBindings ?? []).some(prior => exact(prior, binding)), `Inherited route/key binding widened: ${cls.classId}`);
      }
      for (const id of currentSelector.recordIds ?? []) {
        const current = census.records.find(row => row.id === id);
        const prior = priorCensus.records.find(row => row.id === id);
        check(Boolean(current && prior && bindingIndex.get(current.source)?.matches === true), `Inherited URL source has no matching source evidence: ${id}`);
        check(Boolean(prior?.stateItems.some(item => isUrlStateItemApproved(prior, item, priorSelectors.filter(row => row.classId === cls.classId)))), `Inherited URL record was not approved upstream: ${id}`);
        inheritedIds.add(id);
      }
    }
    check(exact(metadata.inheritedUrlRecordIds, [...inheritedIds].sort()), 'Inherited URL inventory differs from active selectors');
    check(exact(metadata.unreviewedUrlRecordIds, census.records.filter(row => !inheritedIds.has(row.id)).map(row => row.id).sort()), 'Unreviewed URL inventory differs from active selectors');
    const originals = Object.fromEntries(Object.entries(REVIEW_MANIFEST_PATHS).map(([key, path]) => [key, upstream.get(path)]));
    const scopeContract = upstream.get(REVIEW_SCOPE_PATH);
    check(exact(readJson(root, REVIEW_SCOPE_PATH), scopeContract), 'Review scope ownership changed from upstream contract');
    const derived = deriveProjectedReviewManifests({ outputRoot: root, upstream: originals, contract: scopeContract, catalog, profile: metadata.profile, routes, composition });
    reviewScopes = derived.reviewScopes;
    check(exact(metadata.projectedReviewScopes, reviewScopes), 'Projected review scope metadata drifted from feature ownership');
    for (const [key, path] of Object.entries(REVIEW_MANIFEST_PATHS)) {
      check(exact(readJson(root, path), derived.manifests[key]), `Active review manifest differs from scoped upstream evidence: ${path}`);
    }
    for (const [path, expected] of Object.entries(buildGeneratedMemory(metadata))) {
      check(normalizedText(root, path) === expected, `Generated memory must separate upstream and adopter facts: ${path}`);
    }
    for (const [path, product, profile] of [['config/governance/adoption-review.json', 'online', metadata.profile],
      ['config/governance/migration-adoption-review.json', 'migration-tool', null]]) {
      const review = readJson(root, path);
      check(review.authority === 'adopter-environment-review' && review.product === product && review.profile === profile,
        `Adoption review identity differs from artifact: ${path}`);
    }
  } catch (error) { errors.push(error.message); }
  return { errors, metadata, reviewScopes };
}

export const validateReusableGovernance = (root, options) => inspectReusableGovernance(root, options).errors;

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--root')) throw new Error('Usage: reusable-governance-integrity.mjs [--root <artifact>]');
  const result = inspectReusableGovernance(args.length ? resolve(args[1]) : ROOT);
  if (result.errors.length) { process.stderr.write(`${result.errors.join('\n')}\n`); process.exitCode = 1; }
  else process.stdout.write(`Reusable governance integrity: ${result.metadata.profile} source and review evidence verified; institution approval is separate.\n`);
}
