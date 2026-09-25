import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { generatePermissions } from './generate-permissions.mjs';
import { aggregateCapabilityStatus, buildUnreviewedBaselineManifest, discoverPageRoutes, expectedRouting, inspectRouteRepository, parseConfigRedirectsSource, validateRouteCapabilities } from './ui-route-capabilities-contract.mjs';
import { approvedStateItemSelectors, buildUrlStateCensus, isUrlStateItemApproved, validateUrlStateCensus } from './ui-url-state-census.mjs';
import { createPendingAdoptionReview } from './adoption-review.mjs';
import { ACTIVE_ARTIFACTS, UPSTREAM_SOURCES, artifactTextSha256, buildGeneratedMemory, projectedCodeScope, snapshotPathFor } from './reusable-governance-integrity.mjs';
import { deriveProjectedReviewManifests, REVIEW_MANIFEST_PATHS, REVIEW_SCOPE_PATH } from './reusable-review-scopes.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { COMPOSER_SELECTION_PATH, verifyProjectComposition } from './project-composer-recipe.mjs';
import { COMPOSER_MENU_SNAPSHOT_PATH, loadProjectComposerMenus } from './project-composer-menu-preview.mjs';

export const PROJECTION_PATH = 'config/governance/reusable-governance-projection.json';
const URL_PATH = 'config/ui-url-state-census.json';
const APPROVAL_PATH = 'config/ui-url-state-approval.json';
const ROUTE_PATH = 'config/ui-route-capabilities.json';
// [2026-09-25 DEC-OPS-130] 검색어를 URL 에 싣던 same-view 훅(use-search-state.ts)은 유일한 소비자
//   (/admin/community/[id])가 정본으로의 redirect 가 되며 함께 걷었다. 없는 파일을 통제 소스로 두면
//   "바뀌었다" 로 판정돼 모든 URL 승인이 파생 제품으로 넘어가지 않는다.
const CONTROL_SOURCES = [
  'frontend/src/proxy.ts',
  'frontend/next.config.ts',
  'frontend/src/lib/auth/page-authorization.ts',
];

function normalizedText(root, file) {
  return readFileSync(join(root, file), 'utf8').replace(/\r\n?/gu, '\n');
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readJson(root, file) {
  return JSON.parse(normalizedText(root, file));
}

function writeJson(root, file, value) {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, jsonText(value), 'utf8');
}

/** No caller may project over the source checkout, or into its ancestors. */
export function assertSeparateProjectionRoot(sourceRoot, outputRoot) {
  const realPath = value => {
    let existing = resolve(value);
    while (!existsSync(existing)) {
      const parent = dirname(existing);
      if (parent === existing) throw new Error(`Cannot resolve projection path: ${value}`);
      existing = parent;
    }
    return resolve(realpathSync(existing), relative(existing, resolve(value)));
  };
  const source = realPath(sourceRoot);
  const output = realPath(outputRoot);
  const sourceWithinOutput = relative(output, source);
  if (sourceWithinOutput === '' || (!isAbsolute(sourceWithinOutput)
    && sourceWithinOutput !== '..' && !sourceWithinOutput.startsWith(`..${sep}`))) {
    throw new Error('Governance projection output must not contain the source checkout');
  }
}

function recordContract(record) {
  // Review dates and profile observations are not URL implementation semantics.
  return JSON.stringify({
    id: record.id, source: record.source, routePattern: record.routePattern,
    kind: record.kind, operation: record.operation, targetCandidate: record.targetCandidate,
    stateItems: record.stateItems, riskSignals: record.riskSignals,
    detector: record.evidence?.detector, occurrenceCount: record.evidence?.occurrenceCount,
  });
}

/** Restrict existing decisions to exactly retained, unchanged observations. Never invent a review. */
export function projectUrlApproval({ upstreamCensus, upstreamApproval, census, sourceUnchanged, retainedRoutes }) {
  if (upstreamApproval?.manifestRef?.sha256 !== sha256(jsonText(upstreamCensus))) {
    throw new Error('Upstream URL approval is not bound to its census');
  }
  const selectors = approvedStateItemSelectors(upstreamApproval, upstreamCensus);
  if (selectors.length !== upstreamApproval.classes.filter(row => row.reviewState === 'approved').length) {
    throw new Error('Upstream URL approval contains an invalid approved class');
  }
  const prior = new Map(upstreamCensus.records.map(record => [record.id, record]));
  const unchanged = census.records.filter(record => {
    const original = prior.get(record.id);
    return original && recordContract(original) === recordContract(record) && sourceUnchanged(record.source);
  });
  const classes = upstreamApproval.classes.flatMap(original => {
    if (original.reviewState !== 'approved') return [structuredClone(original)];
    const selector = selectors.filter(row => row.classId === original.classId);
    const recordIds = unchanged.filter(record => record.stateItems.some(item => isUrlStateItemApproved(record, item, selector)))
      .map(record => record.id).sort();
    if (recordIds.length === 0) return [];
    const projected = structuredClone(original);
    projected.selector.recordIds = recordIds;
    if (projected.selector.routeKeyBindings) {
      projected.selector.routeKeyBindings = projected.selector.routeKeyBindings
        .filter(binding => retainedRoutes.has(binding.routePattern) && binding.sources.every(sourceUnchanged));
      if (projected.selector.routeKeyBindings.length === 0) return [];
    }
    return [projected];
  });
  return {
    ...structuredClone(upstreamApproval),
    manifestRef: { path: URL_PATH, sha256: sha256(jsonText(census)) },
    classes,
  };
}

/** Preserve page authorization values exactly; remove only pages absent from the artifact. */
export function projectPagePermissions(outputRoot) {
  const path = 'config/governance/permission-catalog.json';
  const catalog = readJson(outputRoot, path);
  const routes = new Set(discoverPageRoutes(outputRoot).map(row => row.route));
  if (routes.size === 0) throw new Error('Cannot project an empty online route population');
  for (const route of routes) {
    if (!Object.hasOwn(catalog.pagePermissions ?? {}, route)) {
      throw new Error(`Unregistered page permission in projected artifact: ${route}`);
    }
  }
  const removed = Object.keys(catalog.pagePermissions).filter(route => !routes.has(route));
  catalog.pagePermissions = Object.fromEntries(Object.entries(catalog.pagePermissions).filter(([route]) => routes.has(route)));
  writeJson(outputRoot, path, catalog);
  // The catalog hash is shared by Java and TS: use its canonical generator, not a hand-edited TS map.
  generatePermissions(outputRoot);
  return removed.sort();
}

export function removeRedirectDeclarations(source, removedSources) {
  // Use the same supported literal grammar as the route inspector; never edit rewrites or CSP.
  parseConfigRedirectsSource(source);
  return source.replace(/(async\s+redirects\s*\(\s*\)\s*\{[\s\S]*?\breturn\s*\[)([\s\S]*?)(\]\s*;)/u,
    (_match, start, body, end) => start + body.replace(/\{\s*source:\s*['"]([^'"]+)['"]\s*,\s*destination:\s*['"]([^'"]+)['"]\s*,\s*permanent:\s*(true|false)\s*,?\s*\}\s*,?/gu,
      (declaration, route) => removedSources.has(route) ? '' : declaration) + end);
}

/** Removed features must not leave executable aliases pointing at absent pages. */
export function isExcludedRedirectTarget(target, currentRoutes, upstreamRoutes) {
  const path = target.split('?')[0].replace(/\$\{([^}]+)\}/gu, '[$1]');
  if (currentRoutes.has(path)) return false;
  if (!upstreamRoutes.has(path)) {
    throw new Error(`Redirect target was not an upstream page; cannot silently remove it: ${target}`);
  }
  return true;
}

export function projectRemovedRouteAliases(outputRoot, upstreamRoutes) {
  const removedRedirects = [];
  const removedRedirectPages = [];
  let remainingBudget;
  for (;;) {
    const repository = inspectRouteRepository(outputRoot);
    remainingBudget ??= repository.pages.length + repository.configRedirects.redirects.size + 1;
    if (remainingBudget-- <= 0) throw new Error('Redirect projection did not converge');
    const pages = new Set(repository.pages.map(row => row.route));
    const missingTarget = routing => isExcludedRedirectTarget(routing.target, pages, upstreamRoutes);
    const redirects = [...repository.configRedirects.redirects.entries()].filter(([, routing]) => missingTarget(routing));
    const pageRedirects = repository.pages.map(page => ({ ...page, routing: expectedRouting(repository, page.route, page.source) }))
      .filter(page => page.routing.kind !== 'page' && missingTarget(page.routing));
    if (redirects.length === 0 && pageRedirects.length === 0) break;
    if (redirects.length) {
      const config = 'frontend/next.config.ts';
      const projected = removeRedirectDeclarations(normalizedText(outputRoot, config), new Set(redirects.map(([route]) => route)));
      const remaining = parseConfigRedirectsSource(projected);
      if (remaining.size !== repository.configRedirects.redirects.size - redirects.length
        || redirects.some(([route]) => remaining.has(route))) {
        throw new Error('Redirect projection made no exact removal progress');
      }
      writeFileSync(join(outputRoot, config), projected, 'utf8');
      removedRedirects.push(...redirects.map(([route, routing]) => ({ route, target: routing.target, reason: 'destination-page-excluded-by-profile' })));
    }
    for (const page of pageRedirects) {
      const appRoot = resolve(outputRoot, 'frontend/src/app');
      const target = resolve(outputRoot, page.source);
      const child = relative(appRoot, target);
      if (child === '' || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
        throw new Error(`Redirect page removal is outside the artifact app tree: ${page.source}`);
      }
      rmSync(target); // One discovered page file; no recursive source-directory deletion.
      removedRedirectPages.push({ route: page.route, source: page.source, target: page.routing.target, reason: 'destination-page-excluded-by-profile' });
    }
  }
  return { removedRedirects, removedRedirectPages };
}

export function projectReusableGovernance({ sourceRoot, outputRoot, profile, sourceCommit, composition, projectSource = (_file, text) => text }) {
  assertSeparateProjectionRoot(sourceRoot, outputRoot);
  if (!['core', 'collaboration', 'demo', 'custom'].includes(profile) || !/^[a-f0-9]{40}$/u.test(sourceCommit)) {
    throw new Error('Governance projection requires a known profile and exact upstream commit');
  }
  if (profile === 'custom' && !composition) throw new Error('Custom governance projection requires a resolved composition');
  let compositionProvenance;
  if (composition) {
    const catalog = loadProjectComposerCatalog(sourceRoot);
    const verified = verifyProjectComposition(composition, catalog);
    if (verified.profile !== profile || (composition.sourceCommit && composition.sourceCommit !== sourceCommit)) {
      throw new Error('Governance composition profile or source commit mismatch');
    }
    composition = verified;
    // The generated artifact no longer contains all upstream migrations, so bind the
    // validated producer inventory before projecting its selected bootstrap rows.
    loadProjectComposerMenus(sourceRoot);
    const menuSnapshotSha256 = artifactTextSha256(sourceRoot, COMPOSER_MENU_SNAPSHOT_PATH);
    if (artifactTextSha256(outputRoot, COMPOSER_MENU_SNAPSHOT_PATH) !== menuSnapshotSha256) {
      throw new Error('Composer menu snapshot differs from the validated upstream inventory');
    }
    writeJson(outputRoot, COMPOSER_SELECTION_PATH, { catalog, composition });
    compositionProvenance = { path: COMPOSER_SELECTION_PATH, sha256: artifactTextSha256(outputRoot, COMPOSER_SELECTION_PATH),
      catalogHash: composition.catalogHash, recipeHash: composition.recipeHash, compositionHash: composition.compositionHash,
      menuSnapshotSha256 };
  }
  const snapshots = UPSTREAM_SOURCES.map(path => {
    const content = normalizedText(sourceRoot, path);
    const snapshotPath = snapshotPathFor(path);
    mkdirSync(dirname(join(outputRoot, snapshotPath)), { recursive: true });
    writeFileSync(join(outputRoot, snapshotPath), content, 'utf8');
    return { sourcePath: path, path: snapshotPath, sha256: sha256(content) };
  });
  const upstreamCensus = readJson(sourceRoot, URL_PATH);
  const upstreamApproval = readJson(sourceRoot, APPROVAL_PATH);
  const upstreamRoutes = readJson(sourceRoot, ROUTE_PATH);
  if (JSON.stringify(upstreamCensus) !== JSON.stringify(buildUrlStateCensus({ repoRoot: sourceRoot }))) {
    throw new Error('Upstream URL census drifted from the current source; projection cannot rebind stale approval');
  }
  const aliases = projectRemovedRouteAliases(outputRoot, new Set(upstreamRoutes.routes.map(row => row.route)));
  const removedPagePermissions = projectPagePermissions(outputRoot);
  const sourceBindings = new Map();
  const sourceUnchanged = file => {
    if (sourceBindings.has(file)) return sourceBindings.get(file).matches;
    if (!existsSync(join(sourceRoot, file)) || !existsSync(join(outputRoot, file))) return false;
    const original = normalizedText(sourceRoot, file);
    const projected = normalizedText(outputRoot, file);
    let expected = projectSource(file, original).replace(/\r\n?/gu, '\n');
    if (file === 'frontend/next.config.ts') expected = removeRedirectDeclarations(expected, new Set(aliases.removedRedirects.map(row => row.route)));
    const matches = expected === projected;
    sourceBindings.set(file, {
      source: file, upstreamSha256: sha256(original), projectedSha256: sha256(projected), matches,
      transformation: original === projected ? 'unchanged' : file === 'frontend/next.config.ts' ? 'excluded-destination-redirect-projection' : 'declared-pack-marker-projection',
    });
    return matches;
  };
  const repository = inspectRouteRepository(outputRoot);
  const routes = buildUnreviewedBaselineManifest(repository, {
    asOf: upstreamRoutes.asOf,
    reviewBy: upstreamRoutes.menuSnapshot.review.reviewBy,
  });
  const unreviewedCapabilities = [];
  const originalRoutes = new Map(upstreamRoutes.routes.map(row => [row.route, row]));
  for (const route of routes.routes) {
    const original = originalRoutes.get(route.route);
    if (!original) throw new Error(`Projected page has no upstream route evidence: ${route.route}`);
    // Copy source observations from the current census, not hardcoded historical builder examples.
    // E4/E5 and absent evidence never become adopter deployment claims.
    const usable = original.capabilities.every(capability => !['E4', 'E5'].includes(capability.evidenceLevel)
      && capability.evidence.every(sourceUnchanged));
    if (!usable) unreviewedCapabilities.push({ route: route.route, reason: 'upstream-runtime-evidence-or-source-scope-does-not-transfer',
      changedOrMissingEvidence: [...new Set(original.capabilities.flatMap(row => row.evidence))].filter(file => !sourceUnchanged(file)).sort() });
    route.capabilities = usable ? structuredClone(original.capabilities) : [{
      id: 'route-capability-review', status: 'unverified', dataSource: 'unverified', actions: [],
      unsupportedVisibleActions: [], actorScope: 'UNVERIFIED', visibleLabel: 'unverified', primaryTask: true,
      decisionSafe: false, evidenceLevel: 'E0', lastVerifiedAt: upstreamRoutes.asOf,
      owner: 'adopter product/UX + domain owner', evidence: [route.source],
    }];
    route.status = aggregateCapabilityStatus(route.capabilities);
    const sources = [...new Set(route.capabilities.map(row => row.dataSource))];
    route.dataSource = sources.length === 1 ? sources[0] : 'mixed';
    route.supportedActions = [...new Set(route.capabilities.flatMap(row => row.actions))].sort();
    route.decisionSafe = false;
    if (!usable) route.unverifiedFields = [...new Set([...route.unverifiedFields, 'status', 'dataSource', 'supportedActions'])].sort();
  }
  // These are upstream observation dates, not a claim that the adopter was reviewed today.
  routes.menuSnapshot.review.reason = 'Adopter menu visibility and environment have not been reviewed. Upstream observations remain in the immutable source snapshot.';
  const routeErrors = validateRouteCapabilities(routes, repository).errors;
  if (routeErrors.length) throw new Error(`Projected route contract failed:\n${routeErrors.join('\n')}`);
  writeJson(outputRoot, ROUTE_PATH, routes);
  const census = buildUrlStateCensus({ repoRoot: outputRoot });
  const controlsUnchanged = CONTROL_SOURCES.every(sourceUnchanged);
  const approval = projectUrlApproval({
    upstreamCensus, upstreamApproval, census,
    sourceUnchanged: file => controlsUnchanged && sourceUnchanged(file),
    retainedRoutes: new Set(routes.routes.map(row => row.route)),
  });
  const urlErrors = validateUrlStateCensus(census, { repoRoot: outputRoot, approvalOverlay: approval });
  if (urlErrors.length) throw new Error(`Projected URL contract failed:\n${urlErrors.join('\n')}`);
  writeJson(outputRoot, URL_PATH, census);
  writeJson(outputRoot, APPROVAL_PATH, approval);
  const originalProfiles = readJson(sourceRoot, 'config/reusable-base-profiles.json');
  const reviewProjection = deriveProjectedReviewManifests({
    outputRoot, profile, routes, profiles: originalProfiles, composition,
    contract: readJson(sourceRoot, REVIEW_SCOPE_PATH),
    upstream: Object.fromEntries(Object.entries(REVIEW_MANIFEST_PATHS).map(([key, path]) => [key, readJson(sourceRoot, path)])),
  });
  for (const [key, path] of Object.entries(REVIEW_MANIFEST_PATHS)) writeJson(outputRoot, path, reviewProjection.manifests[key]);
  writeJson(outputRoot, 'config/governance/adoption-review.json', createPendingAdoptionReview({ product: 'online', profile }));
  writeJson(outputRoot, 'config/governance/migration-adoption-review.json', createPendingAdoptionReview({ product: 'migration-tool', profile: null }));
  for (const [path, content] of Object.entries(buildGeneratedMemory({ profile, sourceCommit }))) {
    mkdirSync(dirname(join(outputRoot, path)), { recursive: true });
    writeFileSync(join(outputRoot, path), content, 'utf8');
  }
  const inheritedRecordIds = [...new Set(approval.classes.filter(row => row.reviewState === 'approved')
    .flatMap(row => row.selector.recordIds))].sort();
  const inherited = new Set(inheritedRecordIds);
  const metadata = {
    schemaVersion: 1,
    authority: 'generated-reusable-governance-projection-not-environment-approval',
    profile, packs: composition?.packs ?? originalProfiles.profiles[profile].packs, sourceCommit, upstreamSnapshots: snapshots,
    ...(compositionProvenance ? { composition: compositionProvenance } : {}),
    routes: routes.routes.map(({ route, source }) => ({ route, source })),
    urlRecordIds: census.records.map(record => record.id).sort(),
    inheritedUrlRecordIds: inheritedRecordIds,
    unreviewedUrlRecordIds: census.records.filter(record => !inherited.has(record.id)).map(record => record.id).sort(),
    sourceBindings: [...sourceBindings.values()].sort((a, b) => a.source.localeCompare(b.source)),
    removedPagePermissions, unreviewedCapabilities, ...aliases,
    projectedReviewScopes: reviewProjection.reviewScopes,
    codeScope: projectedCodeScope(outputRoot),
    activeArtifacts: ACTIVE_ARTIFACTS.map(path => ({ path, sha256: artifactTextSha256(outputRoot, path) })),
    environmentReview: { path: 'config/governance/adoption-review.json', inherited: false },
    migrationEnvironmentReview: { path: 'config/governance/migration-adoption-review.json', inherited: false },
    limitations: [
      'Upstream decisions are retained code evidence only; they never approve adopter data, logging, authorization deployment, or accessibility.',
      'Routes are regenerated with unverified adopter roles and menu exposure; upstream route reviews remain historical evidence.',
      'This projection validates route and URL contracts; other reusable-base harness, compilation, and runtime checks remain separate.',
    ],
  };
  writeJson(outputRoot, PROJECTION_PATH, metadata);
  return metadata;
}
