import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertSeparateProjectionRoot, isExcludedRedirectTarget, projectReusableGovernance, projectUrlApproval, removeRedirectDeclarations } from './reusable-governance-projection.mjs';
import { planJavaRemoval, projectFrontendPackMarkers, pruneFrontend, pruneJava, resolveDomainRemovalDirectory, stripExcludedFrontendPackBlocks } from './generate-reusable-base-source.mjs';
import { approvedStateItemSelectors, buildUrlStateCensus, isUrlStateItemApproved } from './ui-url-state-census.mjs';
import { analyzeRouteCapabilities, parseConfigRedirectsSource } from './ui-route-capabilities-contract.mjs';
import { canonicalJsonSha256, inspectReusableGovernance, MEMORY_PATHS, projectedCodeScope } from './reusable-governance-integrity.mjs';
import { deriveProjectedReviewManifests, REVIEW_MANIFEST_PATHS, REVIEW_SCOPE_PATH, validateReviewScopeContract } from './reusable-review-scopes.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (root, path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const census = readJson(ROOT, 'config/ui-url-state-census.json');
const approval = readJson(ROOT, 'config/ui-url-state-approval.json');
const profiles = readJson(ROOT, 'config/reusable-base-profiles.json');
const reviewContract = readJson(ROOT, REVIEW_SCOPE_PATH);
const upstreamReviews = Object.fromEntries(Object.entries(REVIEW_MANIFEST_PATHS).map(([key, path]) => [key, readJson(ROOT, path)]));
const sourceCommit = 'a'.repeat(40);
const hash = value => createHash('sha256').update(`${JSON.stringify(value, null, 2)}\n`).digest('hex');

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
    assert.throws(() => planJavaRemoval(ROOT, { packs: { excluded: { backend: { appDomains: [domain] } } } }, { packs: [] }, []), /domain/);
  }
  assert.equal(resolveDomainRemovalDirectory(ROOT, 'main', 'service', 'system/content'),
    join(ROOT, 'business-app/src/main/java/nuri/business/service/system/content'));
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
  assert.doesNotThrow(() => validateReviewScopeContract(reviewContract, upstreamReviews, profiles));
  for (const kind of ['scenarios', 'pilots', 'mappings']) {
    const missing = structuredClone(reviewContract);
    missing[kind].pop();
    assert.throws(() => validateReviewScopeContract(missing, upstreamReviews, profiles), /exactly cover/);
    const unknown = structuredClone(reviewContract);
    unknown[kind][0].requiredPacks = ['nonexistent'];
    assert.throws(() => validateReviewScopeContract(unknown, upstreamReviews, profiles), /invalid required packs/);
  }
  const fakeException = structuredClone(reviewContract);
  fakeException.optionalPilotSources.push({ pilotId: 'content-login', source: 'frontend/src/app/login/LoginClient.tsx', requiredPacks: ['collaboration'] });
  assert.throws(() => validateReviewScopeContract(fakeException, upstreamReviews, profiles), /lacks declared pack removal ownership/);
  const routes = readJson(ROOT, 'config/ui-route-capabilities.json');
  const removedLogin = { ...routes, routes: routes.routes.filter(row => row.route !== '/login') };
  assert.throws(() => deriveProjectedReviewManifests({ outputRoot: ROOT, upstream: upstreamReviews, contract: reviewContract,
    profiles, profile: 'demo', routes: removedLogin }), /included route is missing/);
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

function copyInputs(output) {
  for (const path of [
    'frontend/src', 'frontend/e2e', 'frontend/next.config.ts',
    'frontend/package.json', 'frontend/pnpm-lock.yaml', 'frontend/tsconfig.json',
    'config', 'docs', 'scripts', 'package.json', '.agent/knowledge',
    'api-server/src/main/java', 'api-server/src/test/java',
    'business-app/src/main/java', 'business-app/src/test/java',
    'business-core/src/main/java', 'business-core/src/test/java',
    'foundation/src/main/java', 'foundation/src/test/java',
    'api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql',
  ]) {
    mkdirSync(dirname(join(output, path)), { recursive: true });
    cpSync(join(ROOT, path), join(output, path), { recursive: true });
  }
}

function cleanupOwnedFixture(directory) {
  const resolved = resolve(directory);
  assert.equal(dirname(resolved), resolve(tmpdir()));
  assert.ok(resolved.startsWith(join(resolve(tmpdir()), 'egov-governance-projection-')));
  rmSync(resolved, { recursive: true });
}

for (const profileName of ['core', 'collaboration', 'demo']) {
  test(`${profileName} source projection rebuilds actual census, retains provenance, and leaves adoption pending`, () => {
    const output = mkdtempSync(join(tmpdir(), 'egov-governance-projection-'));
    try {
      copyInputs(output);
      const profile = profiles.profiles[profileName];
      pruneJava(output, profiles, profile);
      stripExcludedFrontendPackBlocks(output, profiles, profile);
      pruneFrontend(output, profiles, profile);
      const manifest = { ...profiles, sourcePolicy: { ...profiles.sourcePolicy, generatedProfile: profileName },
        profiles: { [profileName]: profile }, packs: Object.fromEntries(Object.entries(profiles.packs)
          .filter(([name]) => profile.packs.includes(name))) };
      writeFileSync(join(output, 'config/reusable-base-profiles.json'), `${JSON.stringify(manifest, null, 2)}\n`);
      writeFileSync(join(output, 'config/governance/migration-adoption-review.json'), JSON.stringify({ status: 'approved', owner: 'synthetic-upstream-operator' }));
      const result = projectReusableGovernance({
        sourceRoot: ROOT, outputRoot: output, profile: profileName, sourceCommit,
        projectSource: (file, text) => projectFrontendPackMarkers(text, {
          knownPacks: new Set(Object.keys(profiles.packs)),
          excludedPacks: new Set(Object.keys(profiles.packs).filter(name => !profile.packs.includes(name))),
          label: file,
        }).source,
      });
      const lock = { schemaVersion: 1, profile: profileName, packs: profile.packs, sourceCommit,
        governance: { path: 'config/governance/reusable-governance-projection.json', projectionSha256: canonicalJsonSha256(result) } };
      writeFileSync(join(output, 'reusable-base-lock.json'), `${JSON.stringify(lock, null, 2)}\n`);
      assert.deepEqual(inspectReusableGovernance(output).errors, []);
      assert.deepEqual(analyzeRouteCapabilities(output, join(output, 'config/ui-route-capabilities.json')).result.errors, []);
      assert.deepEqual(readJson(output, 'config/ui-url-state-census.json'), buildUrlStateCensus({ repoRoot: output }));
      assert.equal(result.sourceCommit, sourceCommit);
      assert.equal(result.profile, profileName);
      const adoption = readJson(output, 'config/governance/adoption-review.json');
      assert.equal(adoption.status, 'pending');
      assert.equal(adoption.profile, profileName);
      assert.equal(adoption.reviewedAt, null);
      assert.deepEqual(adoption.evidence, []);
      const migrationAdoption = readJson(output, 'config/governance/migration-adoption-review.json');
      assert.equal(migrationAdoption.status, 'pending');
      assert.equal(migrationAdoption.owner, null);
      assert.equal(migrationAdoption.product, 'migration-tool');
      assert.equal(migrationAdoption.profile, null);
      const expectedCounts = { core: [5, 5], collaboration: [7, 6], demo: [8, 8] }[profileName];
      assert.equal(result.projectedReviewScopes.uiQuality.scenarioIds.length, expectedCounts[0]);
      assert.equal(result.projectedReviewScopes.visibleTerms.pilotIds.length, expectedCounts[1]);
      assert.deepEqual(readJson(output, REVIEW_MANIFEST_PATHS.krds).profiles, upstreamReviews.krds.profiles);
      const home = readJson(output, REVIEW_MANIFEST_PATHS.visibleTerms).pilotCensus.find(row => row.id === 'content-user-home');
      assert.ok(home, 'the retained home pilot must continue to check remaining source');
      assert.deepEqual(home.findings, upstreamReviews.visibleTerms.pilotCensus.find(row => row.id === home.id).findings);
      assert.equal(home.sources.length, profileName === 'core' ? 3 : 5);
      // Upstream owner decisions reopen as awaiting input in every generated profile (ADR-0018).
      const isDecision = finding => finding.status === 'accepted-by-owner';
      assert.ok(upstreamReviews.visibleTerms.pilotCensus.flatMap(row => row.findings ?? []).some(isDecision),
        'the upstream ledger must carry an owner decision for this proof to mean anything');
      const projectedTerms = readJson(output, REVIEW_MANIFEST_PATHS.visibleTerms).pilotCensus;
      assert.equal(projectedTerms.flatMap(row => row.findings ?? []).filter(isDecision).length, 0);
      const userLog = projectedTerms.find(row => row.id === 'content-user-log');
      const auditFields = userLog.findings.find(finding => finding.kind === 'technical-audit-fields');
      assert.equal(auditFields.status, 'blocked-input');
      assert.equal(auditFields.decisionRef, undefined);
      assert.equal(userLog.status, 'open');
      assert.ok(result.projectedReviewScopes.visibleTerms.resetDecisions
        .some(row => row.pilotId === 'content-user-log' && row.kind === 'technical-audit-fields'));
      for (const path of MEMORY_PATHS) {
        const memory = readFileSync(join(output, path), 'utf8');
        assert.match(memory, /derived-generated-profile-index/);
        assert.match(memory, /생성 시 두 기관 승인 원장은 pending/);
        assert.doesNotMatch(memory, /CTX-016|OCI V2_100/);
      }
      assert.ok(result.routes.length > 0);
      assert.ok(result.urlRecordIds.length > 0);
      if (profileName === 'demo') assert.equal(result.removedPagePermissions.length, 0);
      else assert.ok(result.removedPagePermissions.length > 0);
      const projectedPermissions = readJson(output, 'config/governance/permission-catalog.json').pagePermissions;
      const upstreamPermissions = readJson(ROOT, 'config/governance/permission-catalog.json').pagePermissions;
      for (const [route, required] of Object.entries(projectedPermissions)) {
        assert.deepEqual(required, upstreamPermissions[route], `${route} authorization must not change`);
      }
      for (const snapshot of result.upstreamSnapshots) {
        assert.ok(existsSync(join(output, snapshot.path)));
        assert.equal(readFileSync(join(output, snapshot.path), 'utf8'), readFileSync(join(ROOT, snapshot.sourcePath), 'utf8').replace(/\r\n?/gu, '\n'));
      }
      const projectedApproval = readJson(output, 'config/ui-url-state-approval.json');
      for (const row of projectedApproval.classes.filter(row => row.reviewState === 'approved')) {
        assert.deepEqual(row.approvals, approval.classes.find(original => original.classId === row.classId).approvals);
        assert.ok(row.selector.recordIds.every(id => result.urlRecordIds.includes(id)));
      }
      if (profileName === 'core') {
        function mutateFile(path, transform, expectedError) {
          const original = readFileSync(join(output, path), 'utf8');
          try {
            writeFileSync(join(output, path), transform(original));
            assert.match(inspectReusableGovernance(output).errors.join('\n'), expectedError);
          } finally { writeFileSync(join(output, path), original); }
        }
        mutateFile(result.upstreamSnapshots[0].path, text => text + '\n', /snapshot hash mismatch/);
        mutateFile('frontend/src/proxy.ts', text => text + '\n// source-evidence mutation\n', /Source evidence scope changed|Inherited source evidence changed/);
        mutateFile('reusable-base-lock.json', text => JSON.stringify({ ...JSON.parse(text), profile: 'demo' }), /lock profile/);
        mutateFile('.agent/memory/project-context.md', text => text + '\nUpstream production state is approved here.\n', /Generated memory must separate/);
        mutateFile('config/ui-url-state-approval.json', text => {
          const changed = JSON.parse(text);
          changed.classes.find(row => row.reviewState === 'approved').selector.stateItemNames.push('token');
          return JSON.stringify(changed);
        }, /Inherited state selector widened|Active URL approval is invalid/);
        // Rebinding checksums alone cannot shrink declared feature ownership.
        const metadataPath = 'config/governance/reusable-governance-projection.json';
        const oldMetadata = readFileSync(join(output, metadataPath), 'utf8');
        const oldLock = readFileSync(join(output, 'reusable-base-lock.json'), 'utf8');
        try {
          const changed = JSON.parse(oldMetadata);
          changed.projectedReviewScopes.uiQuality.scenarioIds.shift();
          writeFileSync(join(output, metadataPath), JSON.stringify(changed));
          const changedLock = JSON.parse(oldLock);
          changedLock.governance.projectionSha256 = canonicalJsonSha256(changed);
          writeFileSync(join(output, 'reusable-base-lock.json'), JSON.stringify(changedLock));
          assert.match(inspectReusableGovernance(output).errors.join('\n'), /review scope metadata drifted/);
        } finally {
          writeFileSync(join(output, metadataPath), oldMetadata);
          writeFileSync(join(output, 'reusable-base-lock.json'), oldLock);
        }
      }
      console.log(`${profileName}: routes=${result.routes.length}, URL records=${result.urlRecordIds.length}, inherited=${result.inheritedUrlRecordIds.length}, adoption=pending`);
    } finally {
      cleanupOwnedFixture(output);
    }
  });
}
