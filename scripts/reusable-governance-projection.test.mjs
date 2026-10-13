import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assertSeparateProjectionRoot, isExcludedRedirectTarget, projectUrlApproval, removeRedirectDeclarations } from './reusable-governance-projection.mjs';
import { planJavaRemoval, resolveDomainRemovalDirectory } from './reusable-source-java.mjs';
import { approvedStateItemSelectors, isUrlStateItemApproved } from './ui-url-state-census.mjs';
import { parseConfigRedirectsSource } from './ui-route-capabilities-contract.mjs';
import { projectedCodeScope } from './reusable-governance-integrity.mjs';
import { deriveProjectedReviewManifests, validateReviewScopeContract } from './reusable-review-scopes.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { ROOT, readJson, census, approval, catalog, presetComposition, reviewContract, upstreamReviews, ownership, hash, cleanupOwnedFixture } from './reusable-governance-projection.test-helpers.mjs';

test('projection restricts upstream broad names to existing records and preserves actual review evidence', () => {
  const selectors = approvedStateItemSelectors(approval, census);
  const existing = census.records.find(row => row.stateItems.some(item => isUrlStateItemApproved(row, item,
    selectors.filter(selector => selector.classId === 'presentation-state'))));
  assert.ok(existing);
  const added = { ...structuredClone(existing), id: 'URL-AAAAAAAAAAAAAA', source: 'frontend/src/new-route.ts' };
  const target = { ...census, records: [existing, added] };
  const projected = projectUrlApproval({
    upstreamCensus: census, upstreamApproval: approval, census: target,
    sourceUnchanged: () => true, retainedRoutes: new Set(),
  });
  const original = approval.classes.find(row => row.classId === 'presentation-state');
  const inherited = projected.classes.find(row => row.classId === 'presentation-state');
  assert.deepEqual(inherited.selector.recordIds, [existing.id]);
  assert.deepEqual(inherited.approvals, original.approvals);
  assert.equal(inherited.reviewBy, original.reviewBy, 'generation must not renew a human review');
  assert.equal(projected.manifestRef.sha256, hash(target));
  assert.ok(!projected.classes.some(row => row.selector.recordIds?.includes(added.id)), 'same key in a new record is not inherited');
});

test('changed record or source cannot inherit approval; mismatched upstream binding is red', () => {
  const target = structuredClone(census);
  const projected = projectUrlApproval({ upstreamCensus: census, upstreamApproval: approval, census: target,
    sourceUnchanged: () => false, retainedRoutes: new Set() });
  assert.ok(projected.classes.every(row => row.reviewState !== 'approved'));
  const invalid = structuredClone(approval);
  invalid.manifestRef.sha256 = '0'.repeat(64);
  assert.throws(() => projectUrlApproval({ upstreamCensus: census, upstreamApproval: invalid, census: target,
    sourceUnchanged: () => true, retainedRoutes: new Set() }), /not bound/);
});

test('source checkout and parent directory cannot become the projection output', () => {
  assert.throws(() => assertSeparateProjectionRoot(ROOT, ROOT), /must not contain/);
  assert.throws(() => assertSeparateProjectionRoot(ROOT, dirname(ROOT)), /must not contain/);
  assert.doesNotThrow(() => assertSeparateProjectionRoot(ROOT, join(ROOT, 'build', 'isolated-output')));
});

test('a directory junction cannot disguise the source checkout as an output', () => {
  const output = mkdtempSync(join(tmpdir(), 'egov-governance-projection-'));
  try {
    const source = join(output, 'source');
    const alias = join(output, 'alias');
    mkdirSync(source);
    symlinkSync(source, alias, process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => assertSeparateProjectionRoot(source, alias), /must not contain/);
    assert.throws(() => assertSeparateProjectionRoot(source, dirname(alias)), /must not contain/);
  } finally {
    cleanupOwnedFixture(output);
  }
});

test('domain removal rejects empty, absolute, and traversing paths before planning a deletion', () => {
  for (const domain of ['', '.', '..', '../service', 'board/../../..', '/tmp', 'C:/outside', '\\outside', 'board\\..\\..', null]) {
    assert.throws(() => resolveDomainRemovalDirectory(ROOT, 'main', 'service', domain), /domain/);
    assert.throws(() => planJavaRemoval(ROOT, { domains: [domain], supportFiles: new Map() }, { resolvedDomains: [] }, []), /domain/);
  }
  assert.equal(resolveDomainRemovalDirectory(ROOT, 'main', 'service', 'promotion/banner'),
    join(ROOT, 'business-app/src/main/java/nuri/business/service/promotion/banner'));
});

test('redirect projection removes only declared aliases and preserves CSP, rewrites, and surviving targets', () => {
  const source = readFileSync(join(ROOT, 'frontend/next.config.ts'), 'utf8');
  const original = parseConfigRedirectsSource(source);
  const [removed] = original.keys();
  const projected = removeRedirectDeclarations(source, new Set([removed]));
  const actual = parseConfigRedirectsSource(projected);
  assert.equal(actual.size, original.size - 1);
  assert.ok(!actual.has(removed));
  for (const [route, target] of actual) assert.deepEqual(target, original.get(route));
  const nonRedirect = text => text.replace(/async\s+redirects\s*\(\s*\)\s*\{[\s\S]*?\breturn\s*\[[\s\S]*?\]\s*;/u, '');
  assert.equal(nonRedirect(projected), nonRedirect(source));
});

test('only known excluded upstream destinations may be removed, including exact dynamic and query targets', () => {
  const original = new Set(['/kept', '/removed', '/detail/[id]', '/alias']);
  const retained = new Set(['/kept', '/alias']);
  assert.equal(isExcludedRedirectTarget('/kept?q=value', retained, original), false);
  assert.equal(isExcludedRedirectTarget('/removed?q=value', retained, original), true);
  assert.equal(isExcludedRedirectTarget('/detail/${id}?tab=summary', retained, original), true);
  // A chain becomes removable only after its actual upstream alias page is removed.
  assert.equal(isExcludedRedirectTarget('/alias', retained, original), false);
  assert.equal(isExcludedRedirectTarget('/alias', new Set(['/kept']), original), true);
  for (const target of ['https://example.org', '//example.org/removed', '/:path*', '/removed#fragment', '/unknown', '/detail/${unknown}']) {
    assert.throws(() => isExcludedRedirectTarget(target, retained, original), /not an upstream page/);
  }
});

test('review ownership covers every upstream item and cannot invent missing-source exclusions', () => {
  assert.doesNotThrow(() => validateReviewScopeContract(reviewContract, upstreamReviews, catalog));
  // 판정 원천은 카탈로그다 — 없으면 판정하지 않는다.
  assert.throws(() => validateReviewScopeContract(reviewContract, upstreamReviews, undefined), /requires the composition catalog/);
  for (const kind of ['scenarios', 'pilots', 'mappings']) {
    const missing = structuredClone(reviewContract);
    missing[kind].pop();
    assert.throws(() => validateReviewScopeContract(missing, upstreamReviews, catalog), /exactly cover/);
    // pack 소유를 되살리면 거부한다(11단계 C5) — 행은 기능(requiredDomains)만 둔다.
    const packOwned = structuredClone(reviewContract);
    packOwned[kind][0].requiredPacks = ['collaboration'];
    assert.throws(() => validateReviewScopeContract(packOwned, upstreamReviews, catalog), /still declares pack ownership/);
    const invalidDomains = structuredClone(reviewContract);
    invalidDomains[kind][0].requiredDomains = ['unowned'];
    assert.throws(() => validateReviewScopeContract(invalidDomains, upstreamReviews, catalog), /invalid required domains/);
    delete invalidDomains[kind][0].requiredDomains;
    assert.throws(() => validateReviewScopeContract(invalidDomains, upstreamReviews, catalog), /invalid required domains/);
  }
  // 선택 소스 예외는 그 소스를 덮는 기능 화면 규칙이 있고 그 규칙의 기능이 모두 행의 기능일 때만 선다.
  const fakeException = structuredClone(reviewContract);
  fakeException.optionalPilotSources.push({ pilotId: 'content-login', source: 'frontend/src/app/login/LoginClient.tsx', requiredDomains: ['board'] });
  assert.throws(() => validateReviewScopeContract(fakeException, upstreamReviews, catalog), /lacks declared feature removal ownership/);
  const ownerless = structuredClone(reviewContract);
  ownerless.optionalPilotSources[0] = { ...ownerless.optionalPilotSources[0], requiredDomains: [] };
  assert.throws(() => validateReviewScopeContract(ownerless, upstreamReviews, catalog), /needs a feature owner/);
  const packException = structuredClone(reviewContract);
  packException.optionalPilotSources[0] = { ...packException.optionalPilotSources[0], requiredPacks: ['collaboration'] };
  assert.throws(() => validateReviewScopeContract(packException, upstreamReviews, catalog), /Optional source still declares pack ownership/);
  const routes = readJson(ROOT, 'config/ui-route-capabilities.json');
  const removedLogin = { ...routes, routes: routes.routes.filter(row => row.route !== '/login') };
  assert.throws(() => deriveProjectedReviewManifests({ outputRoot: ROOT, upstream: upstreamReviews, contract: reviewContract,
    catalog, profile: 'demo', routes: removedLogin, composition: presetComposition('demo') }), /included route is missing/);
});

test('custom review population follows domains and fails when selected evidence disappears', () => {
  const output = mkdtempSync(join(tmpdir(), 'egov-governance-projection-'));
  try {
    const composition = resolveProjectRecipe({ schemaVersion: 1, project: { name: 'review-probe' }, sourceRef: 'v1.0.0', selection: { domains: ['survey'] } }, loadProjectComposerCatalog(ROOT));
    const excluded = new Set(reviewContract.optionalPilotSources.map(row => row.source));
    const sources = new Set([
      ...upstreamReviews.uiQuality.scenarios.flatMap(row => [...row.sourceEvidence, ...row.journeySteps.map(step => step.source)]),
      ...upstreamReviews.visibleTerms.pilotCensus.flatMap(row => row.sources),
      ...upstreamReviews.krds.mapping.flatMap(row => row.localEvidence ?? []),
    ]);
    for (const file of sources) if (!excluded.has(file)) {
      mkdirSync(dirname(join(output, file)), { recursive: true }); cpSync(join(ROOT, file), join(output, file));
    }
    const options = { outputRoot: output, upstream: upstreamReviews, contract: reviewContract, catalog, profile: 'custom',
      routes: readJson(ROOT, 'config/ui-route-capabilities.json'), composition };
    const projected = deriveProjectedReviewManifests(options);
    assert.ok(projected.reviewScopes.visibleTerms.pilotIds.includes('content-survey-create'));
    assert.ok(!projected.reviewScopes.visibleTerms.pilotIds.includes('content-schedule'), 'a survey-only composition does not select schedule');
    assert.ok(!projected.reviewScopes.uiQuality.scenarioIds.includes('board-article-composer'));
    assert.ok(projected.reviewScopes.uiQuality.excludedScenarios.every(row => row.reason === 'required-domain-not-in-composition'));
    assert.throws(() => deriveProjectedReviewManifests({ ...options, composition: undefined }), /requires the resolved composition/);
    // 구성의 프로필과 요청한 프로필이 다르면 판정하지 않는다.
    assert.throws(() => deriveProjectedReviewManifests({ ...options, profile: 'demo' }), /requires the resolved composition: demo/);
    rmSync(join(output, 'frontend/src/app/admin/survey/manage/SurveyFormDialog.tsx'));
    assert.throws(() => deriveProjectedReviewManifests(options), /included source is missing/);
  } finally { cleanupOwnedFixture(output); }
});

test('release evidence binds active CI, required checks and upstream verification history', () => {
  const output = mkdtempSync(join(tmpdir(), 'egov-governance-projection-'));
  const write = (path, text) => {
    mkdirSync(dirname(join(output, path)), { recursive: true });
    writeFileSync(join(output, path), text);
  };
  try {
    write('frontend/src/proxy.ts', '// synthetic proxy\n');
    write('frontend/next.config.ts', '// synthetic Next configuration\n');
    for (let index = 0; index < 8; index += 1) write(`frontend/src/scope-${index}.ts`, `// ${index}\n`);
    const evidence = [
      '.github/workflows/ci.yml', '.github/required-checks.json', '.githooks/pre-push',
      'config/governance/upstream-verification/index.json',
      'config/governance/upstream-verification/.github/workflows/ci.yml',
      'config/governance/upstream-verification/.githooks/pre-push',
    ];
    for (const path of evidence) write(path, 'synthetic reviewed verification content\n');
    const baseline = projectedCodeScope(output);
    for (const path of evidence) {
      write(path, 'synthetic reviewed verification content\r\n');
      assert.deepEqual(projectedCodeScope(output), baseline, `${path}: checkout line endings are not a new approval`);
      write(path, 'tampered verification scope\n');
      assert.notEqual(projectedCodeScope(output).sha256, baseline.sha256, `${path}: changed execution or history must invalidate inherited evidence`);
      write(path, 'synthetic reviewed verification content\n');
    }
    write('.github/workflows/unreviewed.yml', 'run: bypass\n');
    assert.notEqual(projectedCodeScope(output).sha256, baseline.sha256, 'new active workflows must change the certified population');
  } finally { cleanupOwnedFixture(output); }
});
