import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspectReusableGovernance } from './reusable-governance-integrity.mjs';
import { validateVisibleTerms } from './frontend-visible-terms-contract.mjs';
import { validateKrdsMapping } from './krds-profile-mapping-contract.mjs';
import { validateUiQuality, queryConsumerContractErrors } from './ui-quality-scenarios-contract.mjs';
import { validateUrlStateApproval } from './ui-url-state-approval-contract.mjs';
import { inspectRouteRepository, validateRouteCapabilities } from './ui-route-capabilities-contract.mjs';
import { validateUrlStateCensus } from './ui-url-state-census.mjs';
import { validateActiveUiContracts, verifyReusableGovernance } from './verify-reusable-governance.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = path => JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
const artifact = existsSync(join(ROOT, 'reusable-base-lock.json'))
  || existsSync(join(ROOT, 'config/governance/reusable-governance-projection.json'));
const documents = {
  routes: read('config/ui-route-capabilities.json'),
  census: read('config/ui-url-state-census.json'),
  approval: read('config/ui-url-state-approval.json'),
  approvalSchema: read('config/ui-url-state-approval.schema.json'),
  quality: read('config/ui-quality-scenarios.json'),
  terms: read('config/frontend-visible-terms.json'),
  krds: read('config/krds-profile-mapping.json'),
  upstreamTerms: read(artifact ? 'config/governance/upstream-review/frontend-visible-terms.json' : 'config/frontend-visible-terms.json'),
};
// The upstream regression suite keeps the complete reviewed product population.
// Generated artifacts must first prove their independently derived projection scope.
const inspection = artifact ? inspectReusableGovernance(ROOT, { requireLock: true }) : null;
const scopes = artifact ? inspection.reviewScopes : {
  uiQuality: { scenarioIds: ['auth-login', 'admin-shell-hub', 'dense-user-logs', 'user-management-hub',
    'board-article-composer', 'faq-admin-user-lifecycle', 'board-maker-wizard', 'first-use-onboarding'] },
  visibleTerms: { pilotIds: documents.upstreamTerms.pilotCensus.map(row => row.id) },
};
const expectedPilotRoutes = artifact
  ? documents.upstreamTerms.pilotCensus.filter(row => scopes.visibleTerms.pilotIds.includes(row.id)).map(row => row.route)
  : ['/', '/admin', '/admin/community/boards/insert-board-article', '/admin/survey/hub',
    '/admin/system/logs/user', '/admin/user/manage', '/login', '/smart-toolkit/schedule'];
const qualityErrors = manifest => validateUiQuality(manifest, documents.routes, ROOT, undefined,
  { sourceRoot: ROOT, scenarioIds: scopes.uiQuality.scenarioIds });
const termsErrors = manifest => validateVisibleTerms(manifest, { root: ROOT, expectedPilotRoutes });

function proveRed(original, validate, cases) {
  for (const [label, mutate, expected] of cases) {
    const fixture = structuredClone(original);
    mutate(fixture);
    assert.match(validate(fixture).join('\n'), expected, label);
  }
}

test('active contracts validate exact applicable populations with no environment approval claim', () => {
  if (artifact) {
    assert.deepEqual(inspection.errors, []);
    const report = verifyReusableGovernance(ROOT);
    assert.deepEqual(report.errors, []);
    assert.equal(report.verifiedContracts.length, 8);
    assert.equal(report.environmentApproved, false);
    assert.ok(['core', 'collaboration', 'demo'].includes(report.profile));
  } else {
    assert.equal(documents.quality.scenarios.length, 8, 'upstream scenarios may not be reduced');
    assert.equal(documents.terms.pilotCensus.length, 8, 'upstream pilots may not be reduced');
  }
  assert.deepEqual(validateActiveUiContracts(ROOT, scopes, documents), []);
});

test('missing projection evidence cannot produce a successful artifact report', () => {
  const root = mkdtempSync(join(tmpdir(), 'reusable-governance-missing-'));
  try {
    const report = verifyReusableGovernance(root);
    assert.ok(report.errors.length > 0);
    assert.deepEqual(report.verifiedContracts, []);
    assert.equal(report.environmentApproved, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('source validator imports without a product manifest or eager runtime evidence plan', () => {
  const root = mkdtempSync(join(tmpdir(), 'reusable-validator-import-'));
  try {
    const module = join(root, 'ui-quality-scenarios-contract.mjs');
    writeFileSync(module, readFileSync(new URL('./ui-quality-scenarios-contract.mjs', import.meta.url)));
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', 'await import(process.argv[1]);', pathToFileURL(module).href], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const measured = structuredClone(documents.quality);
    measured.scenarios[0].currentBaseline.status = 'measured';
    assert.match(qualityErrors(measured).join('\n'), /durable-readback-not-executed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('active review contracts keep the same technical result after their calendar deadlines', t => {
  const evaluate = () => [
    ...termsErrors(documents.terms),
    ...qualityErrors(documents.quality),
    ...validateKrdsMapping(documents.krds, { root: ROOT }),
    ...validateUrlStateApproval(documents.approval, documents.census, documents.approvalSchema),
  ];
  const before = evaluate();
  assert.deepEqual(before, []);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T00:00:00Z') });
  for (const date of ['2026-12-31T23:59:59Z', '2036-09-14T00:00:00Z']) {
    t.mock.timers.setTime(Date.parse(date));
    assert.deepEqual(evaluate(), before, date);
  }
});

test('remaining routes, URL records and evidence cannot disappear from the active contract', () => {
  proveRed(documents.routes, fixture => validateRouteCapabilities(fixture, inspectRouteRepository(ROOT)).errors, [
    ['missing retained route', fixture => fixture.routes.pop(), /missing filesystem route|population/],
    ['invented route', fixture => { fixture.routes[0].route = '/synthetic-ghost'; }, /filesystem route|population|unexpected/],
  ]);
  proveRed(documents.census, fixture => validateUrlStateCensus(fixture, { repoRoot: ROOT, approvalOverlay: documents.approval }), [
    ['missing retained URL observation', fixture => fixture.records.pop(), /inventoryHash/],
    ['auto-approved generated evidence', fixture => { fixture.records[0].review.status = 'approved'; }, /remain unverified/],
    ['impossible review date', fixture => { fixture.records[0].review.reviewBy = '2026-02-30'; }, /bounded reviewBy/],
  ]);
  const stateful = documents.census.records.find(record => record.stateItems.length > 0);
  assert.ok(stateful, 'active URL policy must have an exercised state item');
  const credential = structuredClone(documents.census);
  credential.records.find(record => record.id === stateful.id).stateItems[0].riskSignals.push('credential-name-signal');
  assert.match(validateUrlStateCensus(credential, { repoRoot: ROOT, approvalOverlay: documents.approval }).join('\n'), /credential-like URL state is forbidden/);
});

test('approval schema, source binding, unknown-state and reviewer boundaries stay hard requirements', () => {
  const validate = fixture => validateUrlStateApproval(fixture, documents.census, documents.approvalSchema);
  proveRed(documents.approval, validate, [
    ['stale source hash', fixture => { fixture.manifestRef.sha256 = '0'.repeat(64); }, /manifest hash|production approval matcher/],
    ['duplicate classification', fixture => fixture.classes.push(structuredClone(fixture.classes[0])), /unique|overlap/],
    ['false opaque approval', fixture => { fixture.classes.find(row => row.classId === 'opaque').reviewState = 'approved'; }, /opaque|approval schema|production approval matcher/],
    ['unowned classification', fixture => { fixture.classes[0].owner = ' '; }, /requires owner/],
    ['impossible review date', fixture => { fixture.classes[0].reviewBy = '2026-02-30'; }, /real reviewBy|production approval matcher/],
  ]);
  const approved = documents.approval.classes.find(row => row.reviewState === 'approved');
  assert.ok(approved, 'the active approval matcher must be exercised by a retained approved class');
  const missingEvidence = structuredClone(documents.approval);
  missingEvidence.classes.find(row => row.classId === approved.classId).approvals.domain = null;
  assert.match(validate(missingEvidence).join('\n'), /approval schema|production approval matcher/);
});

test('all active content retains exact state vocabulary, source evidence and draft approval boundaries', () => {
  proveRed(documents.terms, termsErrors, [
    ['missing pilot', fixture => fixture.pilotCensus.pop(), /exactly cover/],
    ['missing shared state', fixture => fixture.stateVocabulary.pop(), /state vocabulary/],
    ['missing source', fixture => { fixture.pilotCensus[0].sources[0] = 'frontend/src/missing-policy-evidence.tsx'; }, /pilot source is missing/],
    ['false content approval', fixture => { fixture.approval.contentOwnerApproved = true; }, /approval cannot be asserted/],
    ['unowned pilot', fixture => { fixture.pilotCensus[0].owner = ' '; }, /pilot is unbounded/],
    ['invalid date', fixture => { fixture.reviewBy = '2026-02-30'; }, /real reviewBy/],
    ['review ordering', fixture => { fixture.reviewBy = '2020-01-01'; }, /real reviewBy/],
    ['weakened norm policy', fixture => { fixture.normPolicy.mustNotImply = 'advisory'; }, /normPolicy/],
    ['dropped required information', fixture => { fixture.stateVocabulary.find(row => row.id === 'filtered-zero').requiredInformation.pop(); }, /state norm was weakened/],
    ['lifted format ban', fixture => { fixture.formatRules.number.unknownAsZero = 'allowed'; }, /format rule was weakened/],
    ['dropped normative source', fixture => { fixture.normativeSources.pop(); }, /normative source was dropped/],
    ['missing approval boundary', fixture => { delete fixture.approval; }, /approval boundary is missing/],
    ['unbounded norm review', fixture => { fixture.reviewBy = '2036-01-01'; }, /within 120 days/],
  ]);
});

test('all active quality scenarios retain accessibility, mutation, privacy and honest measurement contracts', () => {
  proveRed(documents.quality, qualityErrors, [
    ['missing scenario', fixture => fixture.scenarios.pop(), /scenario population/],
    ['missing step', fixture => { fixture.scenarios[0].journeySteps = []; }, /must contain journeySteps/],
    ['missing source evidence', fixture => { fixture.scenarios[0].sourceEvidence = []; }, /must cite sourceEvidence/],
    ['wrong route', fixture => { fixture.scenarios[0].journeySteps[0].route = '/synthetic-ghost'; }, /route population|missing from the exact/],
    ['unknown field', fixture => { fixture.scenarios[0].surprise = true; }, /unknown key/],
    ['disabled contrast', fixture => fixture.automation.axe.disabledRules.push('color-contrast'), /disabledRules must remain empty/],
    ['weakened task metrics', fixture => fixture.scenarios[0].taskMetricIds.pop(), /missing a required task metric/],
    ['weakened performance metrics', fixture => fixture.scenarios[0].performanceMetricIds.pop(), /missing route JS/],
    ['weakened manual checks', fixture => fixture.manualChecks.pop(), /manualChecks must exactly cover/],
    ['false measurement', fixture => { fixture.scenarios[0].currentBaseline.status = 'measured'; }, /verified current combined durable summary/],
    ['privacy leak', fixture => { fixture.scenarios[0].currentBaseline.userId = 'synthetic'; }, /privacy-forbidden/],
    ['unowned evidence', fixture => { fixture.scenarios[0].currentBaseline.owner = ' '; }, /owner must be bounded/],
    ['impossible date', fixture => { fixture.scenarios[0].currentBaseline.reviewBy = '2026-02-30'; }, /not a real calendar date/],
    ['unbounded date', fixture => { fixture.scenarios[0].currentBaseline.reviewBy = '2036-01-01'; }, /unbounded beyond 90/],
    ['review ordering', fixture => { fixture.scenarios[0].currentBaseline.reviewBy = '2020-01-01'; }, /predates its evidence/],
    ['weakened review policy', fixture => { fixture.unknownPolicy.maxReviewDays = 900; }, /exactly 90/],
  ]);
  const mutation = documents.quality.scenarios.flatMap(row => row.journeySteps).find(step => step.requiredTaskEvidenceId);
  assert.ok(mutation, 'the retained user-management mutation must exercise task binding');
  const moved = structuredClone(documents.quality);
  moved.scenarios[0].journeySteps[0].requiredTaskEvidenceId = mutation.requiredTaskEvidenceId;
  assert.match(qualityErrors(moved).join('\n'), /requiredTaskEvidenceId/);
  const query = structuredClone(documents.quality);
  query.scenarios[0].journeySteps[0].queryTemplate = '?unknownIntent={safeRelativeRoute}';
  assert.match(queryConsumerContractErrors(query, documents.census).join('\n'), /no current route consumer/);
});

test('KRDS design profiles and shared categories remain complete in every application profile', () => {
  proveRed(documents.krds, fixture => validateKrdsMapping(fixture, { root: ROOT }), [
    ['missing brand profile', fixture => fixture.profiles.pop(), /profile population/],
    ['missing category', fixture => { fixture.mapping = fixture.mapping.filter(row => row.category !== 'principle'); }, /category population/],
    ['false conformance', fixture => { fixture.profiles[0].currentClaim = 'KRDS compliant'; }, /overclaims/],
    ['fake source', fixture => { fixture.sourcePolicy.guideline.url = 'https://example.invalid'; }, /official guideline/],
    ['missing evidence', fixture => { fixture.mapping.find(row => row.disposition === 'adopted').localEvidence = ['frontend/src/missing.tsx']; }, /local evidence is missing/],
    ['impossible date', fixture => { fixture.checkBy = '2026-02-30'; }, /real dates/],
    ['unowned mapping', fixture => { fixture.owner = ' '; }, /owner is missing/],
    ['unbounded review', fixture => { fixture.checkBy = '2036-01-01'; }, /exceeds 120 days/],
  ]);
});
