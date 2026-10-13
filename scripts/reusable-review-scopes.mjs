import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const REVIEW_SCOPE_PATH = 'config/governance/reusable-review-scopes.json';
export const REVIEW_MANIFEST_PATHS = Object.freeze({
  uiQuality: 'config/ui-quality-scenarios.json',
  visibleTerms: 'config/frontend-visible-terms.json',
  krds: 'config/krds-profile-mapping.json',
});

function exactMembers(actual, expected) {
  return Array.isArray(actual) && actual.length === new Set(actual).size
    && JSON.stringify([...actual].sort()) === JSON.stringify([...expected].sort());
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Canonical feature ownership is independent of observed source survival. 소유는 기능 단위다(11단계 C5 — pack 을 걷었다). `catalog` 는
 * 원본 카탈로그(생성물에서는 구성 스냅숏의 카탈로그)다. 기능이 없는 행(requiredDomains: [])은 공통 기반 소유라 모든 구성에 남는다.
 */
export function validateReviewScopeContract(contract, upstream, catalog) {
  assert(contract?.schemaVersion === 1 && contract.authority === 'reusable-review-scope-contract', 'Invalid review scope authority');
  assert(JSON.stringify(contract.sources) === JSON.stringify(REVIEW_MANIFEST_PATHS), 'Review scope source paths drifted');
  const populations = { scenarios: upstream.uiQuality.scenarios, pilots: upstream.visibleTerms.pilotCensus, mappings: upstream.krds.mapping };
  const domains = new Set((catalog?.capabilities ?? []).map(capability => capability.id));
  assert(domains.size > 0, 'Review scope validation requires the composition catalog');
  const validateDomains = (row, label) => assert(Array.isArray(row.requiredDomains)
    && new Set(row.requiredDomains).size === row.requiredDomains.length
    && row.requiredDomains.every(domain => domains.has(domain)), `${label} has invalid required domains`);
  for (const [kind, population] of Object.entries(populations)) {
    assert(exactMembers(contract[kind]?.map(row => row.id), population.map(row => row.id)), `${kind} ownership must exactly cover upstream review population`);
    for (const row of contract[kind]) {
      assert(!Object.hasOwn(row, 'requiredPacks'), `${kind}/${row.id} still declares pack ownership`);
      validateDomains(row, `${kind}/${row.id}`);
    }
  }
  const overrides = new Set();
  for (const override of contract.optionalPilotSources ?? []) {
    const key = `${override.pilotId}:${override.source}`;
    assert(!overrides.has(key), `Duplicate optional pilot source: ${key}`);
    overrides.add(key);
    const pilot = upstream.visibleTerms.pilotCensus.find(row => row.id === override.pilotId);
    assert(pilot?.sources.includes(override.source), `Unknown optional pilot source: ${key}`);
    assert(!Object.hasOwn(override, 'requiredPacks'), `Optional source still declares pack ownership: ${key}`);
    validateDomains(override, `Optional source ${key}`);
    assert(override.requiredDomains.length > 0, `Optional source needs a feature owner: ${key}`);
    // An exception needs the existing source ownership declaration, not a missing file: 그 소스를 덮는 화면 규칙이 있고, 그 규칙의 기능이
    // 모두 이 행의 기능이어야 한다 — 그래야 소스가 빠지는 구성과 이 행이 빠지는 구성이 같다.
    const source = override.source.replace(/^frontend\//u, '');
    assert((catalog.frontendRules ?? []).some(rule => (source === rule.path || source.startsWith(`${rule.path}/`))
      && rule.domains.every(domain => override.requiredDomains.includes(domain))), `Optional source lacks declared feature removal ownership: ${key}`);
  }
}

/** Produce active manifests without increasing any measured/approved claim. */
export function deriveProjectedReviewManifests({ outputRoot, upstream, contract, catalog, profile, routes, composition }) {
  validateReviewScopeContract(contract, upstream, catalog);
  // 시작 구성과 직접 선택이 같다 — 행의 기능이 모두 구성 안이면 남는다(11단계 C5, pack 을 보지 않는다).
  assert(composition?.profile === profile && Array.isArray(composition.resolvedDomains), `Review scope requires the resolved composition: ${profile}`);
  const domains = new Set(composition.resolvedDomains);
  const routeIndex = new Map(routes.routes.map(row => [row.route, row]));
  const included = row => row.requiredDomains.every(domain => domains.has(domain));
  const excluded = row => ({ id: row.id, reason: 'required-domain-not-in-composition', requiredDomains: [...row.requiredDomains],
    excludedDomains: row.requiredDomains.filter(domain => !domains.has(domain)) });
  const requireSource = (file, label) => assert(existsSync(join(outputRoot, file)), `${label}: included source is missing: ${file}`);
  const requireRoute = (route, label) => assert(routeIndex.has(route), `${label}: included route is missing: ${route}`);
  const result = structuredClone(upstream);
  const reviewScopes = {
    uiQuality: { scenarioIds: [], excludedScenarios: [], resetBaselineIds: [] },
    visibleTerms: { pilotIds: [], excludedPilots: [], excludedSources: [], resetDecisions: [] },
    krds: { mappingIds: [], excludedMappings: [] },
  };
  result.uiQuality.scenarios = upstream.uiQuality.scenarios.flatMap(original => {
    const owner = contract.scenarios.find(row => row.id === original.id);
    if (!included(owner)) { reviewScopes.uiQuality.excludedScenarios.push(excluded(owner)); return []; }
    for (const step of original.journeySteps) { requireRoute(step.route, original.id); requireSource(step.source, original.id); }
    for (const file of original.sourceEvidence) requireSource(file, original.id);
    const scenario = structuredClone(original);
    for (const step of scenario.journeySteps) step.truth.status = routeIndex.get(step.route).status;
    if (scenario.currentBaseline.status === 'measured') {
      scenario.currentBaseline.status = 'unmeasured';
      scenario.currentBaseline.reason = 'Upstream runtime measurements are historical evidence; this generated profile has not been measured in the adopter environment.';
      reviewScopes.uiQuality.resetBaselineIds.push(scenario.id);
    }
    reviewScopes.uiQuality.scenarioIds.push(original.id);
    return [scenario];
  });
  assert(result.uiQuality.scenarios.length > 0, 'Online quality scenario population cannot be empty');
  result.visibleTerms.pilotCensus = upstream.visibleTerms.pilotCensus.flatMap(original => {
    const owner = contract.pilots.find(row => row.id === original.id);
    if (!included(owner)) { reviewScopes.visibleTerms.excludedPilots.push(excluded(owner)); return []; }
    requireRoute(original.route, original.id);
    const pilot = structuredClone(original);
    pilot.sources = original.sources.filter(source => {
      const sourceOwner = contract.optionalPilotSources.find(row => row.pilotId === original.id && row.source === source);
      if (sourceOwner && !included(sourceOwner)) {
        assert(!existsSync(join(outputRoot, source)), `${original.id}: excluded source unexpectedly survives: ${source}`);
        reviewScopes.visibleTerms.excludedSources.push({ pilotId: original.id, source, ...excluded(sourceOwner) });
        return false;
      }
      requireSource(source, original.id);
      return true;
    });
    assert(pilot.sources.length > 0, `${pilot.id}: pilot sources cannot be empty`);
    // Remaining pilot findings are retained; this projection cannot turn an active finding into remediation.
    const sourceText = pilot.sources.map(file => readFileSync(join(outputRoot, file), 'utf8')).join('\n');
    for (const finding of pilot.findings ?? []) {
      if (finding.status !== 'remediated-local') for (const literal of finding.sourceEvidence ?? []) {
        assert(sourceText.includes(literal), `${pilot.id}/${finding.kind}: active finding requires review after source projection`);
      }
    }
    // An upstream owner's decision to keep copy is not the adopter's decision (ADR-0018: approvals start pending).
    // Reopen it as awaiting input, and reopen a pilot that the decision had closed.
    for (const finding of pilot.findings ?? []) {
      if (finding.status !== 'accepted-by-owner') continue;
      finding.status = 'blocked-input';
      delete finding.decisionRef;
      delete finding.decidedAt;
      reviewScopes.visibleTerms.resetDecisions.push({ pilotId: pilot.id, kind: finding.kind });
    }
    const closedStatuses = new Set(['remediated-local', 'accepted-by-owner']);
    const hasActive = (pilot.findings ?? []).some(finding => !closedStatuses.has(finding.status));
    if (pilot.status === 'accepted-by-owner' || (closedStatuses.has(pilot.status) && hasActive)) {
      pilot.status = hasActive ? 'open' : 'remediated-local';
    }
    reviewScopes.visibleTerms.pilotIds.push(pilot.id);
    return [pilot];
  });
  assert(result.visibleTerms.pilotCensus.length > 0, 'Online visible term pilot population cannot be empty');
  result.visibleTerms.population.exactRoutes = result.visibleTerms.pilotCensus.map(row => row.route);
  result.krds.mapping = upstream.krds.mapping.map(original => {
    const owner = contract.mappings.find(row => row.id === original.id);
    reviewScopes.krds.mappingIds.push(original.id);
    if (!included(owner)) {
      reviewScopes.krds.excludedMappings.push(excluded(owner));
      return { ...structuredClone(original), disposition: 'notApplicable', localEvidence: [],
        reason: `The composition excludes required domains: ${owner.requiredDomains.filter(domain => !domains.has(domain)).join(', ')}.` };
    }
    for (const source of original.localEvidence ?? []) requireSource(source, original.id);
    return structuredClone(original);
  });
  // krds.profiles are brand profiles and are deliberately untouched.
  return { manifests: result, reviewScopes };
}
