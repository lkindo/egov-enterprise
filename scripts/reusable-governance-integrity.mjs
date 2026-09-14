#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { containedFile } from './adoption-review.mjs';
import { buildUrlStateCensus, approvedStateItemSelectors, isUrlStateItemApproved } from './ui-url-state-census.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';
import { deriveProjectedReviewManifests, REVIEW_MANIFEST_PATHS, REVIEW_SCOPE_PATH } from './reusable-review-scopes.mjs';

export const PROJECTION_PATH = 'config/governance/reusable-governance-projection.json';
export const UPSTREAM_DIRECTORY = 'config/governance/upstream-review';
export const MEMORY_PATHS = ['.agent/memory/project-context.md', '.agent/memory/decisions.md', '.agent/memory/known-gaps.md'];
export const UPSTREAM_SOURCES = Object.freeze([
  'config/ui-url-state-census.json', 'config/ui-url-state-approval.json', 'config/ui-url-state-approval.schema.json',
  'config/ui-route-capabilities.json', ...Object.values(REVIEW_MANIFEST_PATHS),
  'config/reusable-base-profiles.json', REVIEW_SCOPE_PATH, ...MEMORY_PATHS,
]);
export const ACTIVE_ARTIFACTS = Object.freeze([...UPSTREAM_SOURCES, 'config/governance/permission-catalog.json']);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HEX = /^[a-f0-9]{64}$/u;
const sha256 = value => createHash('sha256').update(value).digest('hex');
const normalizedText = (root, file) => readFileSync(containedFile(root, file), 'utf8').replace(/\r\n?/gu, '\n');
const readJson = (root, file) => JSON.parse(normalizedText(root, file));
const jsonText = value => `${JSON.stringify(value, null, 2)}\n`;
export const canonicalJsonSha256 = value => sha256(jsonText(value));
export const artifactTextSha256 = (root, file) => sha256(normalizedText(root, file));
export const snapshotPathFor = source => `${UPSTREAM_DIRECTORY}/${source.split('/').at(-1)}`;
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
  function walk(file) {
    const path = join(root, file);
    if (!existsSync(path)) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error(`Artifact source scope cannot contain a symlink: ${file}`);
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) walk(`${file}/${name}`);
    } else if (stat.isFile()) {
      if (file.startsWith('scripts/') && /\.test\.[cm]?[jt]s$/u.test(file)) return;
      const bytes = readFileSync(containedFile(root, file));
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

export function inspectReusableGovernance(root = ROOT, { requireLock = true } = {}) {
  const errors = [];
  let metadata;
  let reviewScopes;
  function check(condition, message) { if (!condition) errors.push(message); }
  try {
    metadata = readJson(root, PROJECTION_PATH);
    check(metadata.schemaVersion === 1 && metadata.authority === 'generated-reusable-governance-projection-not-environment-approval', 'Invalid projection metadata authority');
    check(['core', 'collaboration', 'demo'].includes(metadata.profile), 'Invalid projection profile');
    check(/^[a-f0-9]{40}$/u.test(metadata.sourceCommit ?? ''), 'Invalid upstream source commit');
    const snapshots = metadata.upstreamSnapshots ?? [];
    check(exact(snapshots.map(row => row.sourcePath).sort(), [...UPSTREAM_SOURCES].sort()), 'Upstream snapshot population must be exact');
    const upstream = new Map();
    for (const snapshot of snapshots) {
      check(snapshot.path === snapshotPathFor(snapshot.sourcePath), `Unexpected upstream snapshot location: ${snapshot.sourcePath}`);
      const text = normalizedText(root, snapshot.path);
      check(HEX.test(snapshot.sha256 ?? '') && sha256(text) === snapshot.sha256, `Upstream snapshot hash mismatch: ${snapshot.sourcePath}`);
      upstream.set(snapshot.sourcePath, snapshot.sourcePath.endsWith('.json') ? JSON.parse(text) : text);
    }
    const originalProfiles = upstream.get('config/reusable-base-profiles.json');
    const expectedPacks = originalProfiles?.profiles?.[metadata.profile]?.packs;
    const profileManifest = readJson(root, 'config/reusable-base-profiles.json');
    check(exact(metadata.packs, expectedPacks), 'Projection packs differ from upstream profile ownership');
    check(profileManifest.sourcePolicy.generatedProfile === metadata.profile
      && exact(Object.keys(profileManifest.profiles), [metadata.profile])
      && exact(profileManifest.profiles[metadata.profile]?.packs, expectedPacks)
      && exact(Object.keys(profileManifest.packs).sort(), [...(expectedPacks ?? [])].sort()), 'Active profile declaration differs from source artifact');
    if (requireLock) {
      const lock = readJson(root, 'reusable-base-lock.json');
      check(lock.profile === metadata.profile && lock.sourceCommit === metadata.sourceCommit && exact(lock.packs, metadata.packs), 'Source lock profile/packs/commit mismatch');
      check(lock.governance?.path === PROJECTION_PATH && lock.governance?.projectionSha256 === canonicalJsonSha256(metadata), 'Source lock projection checksum mismatch');
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
    check(exact(metadata.routes, discoverPageRoutes(root).map(({ route, source }) => ({ route, source }))), 'Projection route population differs from actual pages');
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
    const derived = deriveProjectedReviewManifests({ outputRoot: root, upstream: originals, contract: scopeContract, profiles: originalProfiles, profile: metadata.profile, routes });
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
