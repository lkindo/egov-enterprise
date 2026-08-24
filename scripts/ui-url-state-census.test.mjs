import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildUrlStateCensus,
  compareUrlStateCensus,
  scanUrlStateSource,
  tokenizeUrlStateSource,
  validateUrlStateCensus,
} from './ui-url-state-census.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = join(repoRoot, 'config', 'ui-url-state-census.json');

function refreshHash(census) {
  census.sourceScope.inventoryHash = createHash('sha256').update(JSON.stringify({
    records: census.records,
    negatives: census.requiredNegativeCases,
    criticalFlows: census.criticalFlows,
  })).digest('hex');
}

test('current URL-state census exactly covers critical route and URL producer populations', () => {
  const actual = buildUrlStateCensus({ repoRoot });
  const expected = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assert.deepEqual(validateUrlStateCensus(actual, { repoRoot }), []);
  assert.deepEqual(validateUrlStateCensus(expected, { repoRoot }), []);
  assert.deepEqual(compareUrlStateCensus(expected, actual), []);
  assert.deepEqual(actual.summary.exactPopulations, {
    filesystemRoutes: 120,
    dynamicRoutePatterns: 11,
    configRedirects: 15,
    pageRedirects: 5,
  });
  assert.equal(actual.summary.records, actual.records.length);
  assert.equal(actual.summary.unverifiedRecords, actual.records.length);
  assert.ok(actual.summary.ambiguousRecords > 0);
  assert.ok(actual.summary.byKind['query-consumer'] > 0);
  assert.ok(actual.summary.byKind['query-producer'] > 0);
  assert.ok(actual.summary.byKind['request-query-producer'] > 0);
  assert.ok(actual.summary.byKind['form-producer'] > 0);

  const login = actual.criticalFlows.find(({ id }) => id === 'login-return-intent');
  assert.equal(login.producerRecordIds.length, 1);
  assert.equal(login.consumerRecordIds.length, 1);
  assert.equal(login.sinkRecordIds.length, 2);
  assert.ok(actual.records.every(({ review, canonical }) => (
    review.status === 'unverified'
    && review.decisionSafe === false
    && canonical.status === 'unverified'
  )));
});

test('implemented login destination controls are recorded without claiming global policy approval', () => {
  const census = buildUrlStateCensus({ repoRoot });
  const byId = Object.fromEntries(census.requiredNegativeCases.map((entry) => [entry.id, entry]));

  for (const id of ['query-fragment-in-login-intent', 'protocol-relative-or-backslash-target']) {
    assert.equal(byId[id].status, 'implemented-local-policy-unapproved');
    assert.equal(byId[id].decisionSafe, false);
    assert.deepEqual(byId[id].evidence, [
      'frontend/src/app/login/LoginClient.tsx',
      'frontend/src/app/login/__tests__/page.test.tsx',
    ]);
  }
  assert.equal(byId['unknown-query'].status, 'unimplemented-blocked-input');
});

test('executable syntax is detected while comment, string, and regex decoys stay inert', () => {
  const source = [
    `const text = "router.push('/ghost?token=x')";`,
    String.raw`const regex = /searchParams\.get\(['"]token/;`,
    `const href = '/not-a-navigation-attribute?token=x';`,
    `// searchParams.get('password');`,
    `/* router.replace('/ghost?q=secret'); */`,
    'const searchParams = useSearchParams();',
    'const copy = new URLSearchParams(searchParams.toString());',
    `const token = searchParams.get('token');`,
    `copy.set('page', '2');`,
    'router.replace(`/items?token=${token}&page=2`);',
    'export { copy, href, regex, text, token };',
  ].join('\n');
  const scanned = scanUrlStateSource(source, {
    file: '<memory>',
    routePattern: '/items',
    shellAccessEvidence: 'authenticated',
  });

  assert.deepEqual(scanned.issues, []);
  assert.ok(scanned.records.some(({ operation, riskSignals }) => (
    operation === 'copy-existing-query'
    && riskSignals.includes('unknown-query-passthrough')
    && riskSignals.includes('repeated-query-passthrough')
    && riskSignals.includes('encoded-query-passthrough')
  )));
  const tokenRead = scanned.records.find(({ kind, stateItems }) => (
    kind === 'query-consumer' && stateItems.some(({ name }) => name === 'token')
  ));
  assert.ok(tokenRead);
  assert.equal(tokenRead.stateItems[0].recommendation, 'deny');
  assert.equal(tokenRead.stateItems[0].dataClass, 'unverified');
  assert.equal(tokenRead.stateItems[0].approvalStatus, 'unverified');
  assert.ok(scanned.records.some(({ operation, targetCandidate }) => (
    operation === 'router.replace' && targetCandidate === '/items?token=[computed]&page=2'
  )));
  assert.ok(scanned.records.every(({ targetCandidate }) => targetCandidate !== '/ghost?token=x'));
  assert.ok(scanned.records.every(({ targetCandidate }) => targetCandidate !== '/not-a-navigation-attribute?token=x'));
});

test('unknown query copy demonstrably preserves repeated and encoded forbidden-name inputs', () => {
  const source = new URLSearchParams('token=first&token=second&%74oken=encoded&%2574oken=double');
  const copied = new URLSearchParams(source.toString());

  assert.deepEqual(copied.getAll('token'), ['first', 'second', 'encoded']);
  assert.equal(copied.get('%74oken'), 'double');
  assert.equal(copied.toString(), source.toString());
});

test('typed HTTP GET query objects are inventoried without promoting ordinary Map.get calls', () => {
  const scanned = scanUrlStateSource([
    'const ignored = menuMap.get(menuId);',
    "const result = this.get<PageResponse>('', { params: { searchWrd, page } });",
    'export { ignored, result };',
  ].join('\n'), {
    file: '<memory>',
    routePattern: 'unresolved',
  });
  const requests = scanned.records.filter(({ kind }) => kind === 'request-query-producer');

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].stateItems.map(({ name }) => name), ['page', 'searchWrd']);
  assert.equal(requests[0].stateItems.find(({ name }) => name === 'searchWrd').recommendation, 'deny');
});

test('an approval claim fabricated from static syntax is a reproducible semantic red', () => {
  const census = buildUrlStateCensus({ repoRoot });
  const mutated = structuredClone(census);
  const state = mutated.records.find(({ stateItems }) => stateItems.length > 0).stateItems[0];
  state.approvalStatus = 'accepted';
  state.dataClass = 'public';
  refreshHash(mutated);

  assert.match(
    validateUrlStateCensus(mutated, { repoRoot }).join('\n'),
    /state classification must remain unverified/i,
  );
});

test('redirect risk or required negative-case narrowing is a reproducible semantic red', () => {
  const census = buildUrlStateCensus({ repoRoot });
  const weakenedRedirect = structuredClone(census);
  const redirect = weakenedRedirect.records.find(({ kind }) => kind === 'config-redirect');
  redirect.riskSignals = redirect.riskSignals.filter((signal) => signal !== 'double-encoded-query');
  refreshHash(weakenedRedirect);
  assert.match(
    validateUrlStateCensus(weakenedRedirect, { repoRoot }).join('\n'),
    /config redirect missing double-encoded-query/i,
  );

  const narrowedCases = structuredClone(census);
  narrowedCases.requiredNegativeCases.splice(1, 1);
  refreshHash(narrowedCases);
  assert.match(
    validateUrlStateCensus(narrowedCases, { repoRoot }).join('\n'),
    /required negative cases are not exact and ordered/i,
  );
});

test('population removal and generated snapshot drift cannot pass silently', () => {
  const census = buildUrlStateCensus({ repoRoot });
  const removed = structuredClone(census);
  removed.records = removed.records.filter(({ kind }) => kind !== 'dynamic-segment');
  removed.summary.byKind['dynamic-segment'] = 0;
  removed.summary.records = removed.records.length;
  removed.summary.syntaxOccurrences = removed.records.reduce((total, record) => total + record.evidence.occurrenceCount, 0);
  removed.summary.unverifiedRecords = removed.records.length;
  removed.summary.ambiguousRecords = removed.records.filter(({ resolutionStatus }) => resolutionStatus === 'ambiguous').length;
  removed.summary.bySurface.navigation = removed.records.filter(({ surface }) => surface === 'navigation').length;
  refreshHash(removed);

  assert.match(
    validateUrlStateCensus(removed, { repoRoot }).join('\n'),
    /dynamic route population is not exactly represented/i,
  );
  assert.match(compareUrlStateCensus(census, removed).join('\n'), /drifted/i);
});

test('empty populations and lexical parser failures are fail-closed', () => {
  const census = buildUrlStateCensus({ repoRoot });
  const empty = structuredClone(census);
  empty.records = [];
  assert.match(validateUrlStateCensus(empty, { repoRoot }).join('\n'), /population is empty/i);

  const lexical = tokenizeUrlStateSource("const bad = 'unterminated", '<memory>');
  assert.ok(lexical.issues.some(({ code }) => code === 'UNTERMINATED_STRING'));
});
