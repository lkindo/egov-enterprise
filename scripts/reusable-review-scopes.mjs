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

/** Canonical feature ownership is independent of observed source survival. */
export function validateReviewScopeContract(contract, upstream, profiles) {
  assert(contract?.schemaVersion === 1 && contract.authority === 'reusable-review-scope-contract', 'Invalid review scope authority');
  assert(JSON.stringify(contract.sources) === JSON.stringify(REVIEW_MANIFEST_PATHS), 'Review scope source paths drifted');
  const populations = { scenarios: upstream.uiQuality.scenarios, pilots: upstream.visibleTerms.pilotCensus, mappings: upstream.krds.mapping };
  for (const [kind, population] of Object.entries(populations)) {
    assert(exactMembers(contract[kind]?.map(row => row.id), population.map(row => row.id)), `${kind} ownership must exactly cover upstream review population`);
    for (const row of contract[kind]) {
      assert(Array.isArray(row.requiredPacks) && row.requiredPacks.length > 0 && new Set(row.requiredPacks).size === row.requiredPacks.length
        && row.requiredPacks.every(pack => Object.hasOwn(profiles.packs, pack)), `${kind}/${row.id} has invalid required packs`);
    }
  }
  const overrides = new Set();
  for (const override of contract.optionalPilotSources ?? []) {
    const key = `${override.pilotId}:${override.source}`;
    assert(!overrides.has(key), `Duplicate optional pilot source: ${key}`);
    overrides.add(key);
    const pilot = upstream.visibleTerms.pilotCensus.find(row => row.id === override.pilotId);
    assert(pilot?.sources.includes(override.source), `Unknown optional pilot source: ${key}`);
    assert(Array.isArray(override.requiredPacks) && override.requiredPacks.length > 0
      && override.requiredPacks.every(pack => Object.hasOwn(profiles.packs, pack)), `Invalid optional source packs: ${key}`);
    // An exception needs the existing source ownership declaration, not a missing file.
    assert(override.requiredPacks.some(pack => (profiles.packs[pack].frontend?.removePaths ?? []).some(path => {
      const source = override.source.replace(/^frontend\//u, '');
      return source === path || source.startsWith(`${path}/`);
    })), `Optional source lacks declared pack removal ownership: ${key}`);
  }
}

/** Produce active manifests without increasing any measured/approved claim. */
export function deriveProjectedReviewManifests({ outputRoot, upstream, contract, profiles, profile, routes }) {
  validateReviewScopeContract(contract, upstream, profiles);
  const packs = new Set(profiles.profiles[profile]?.packs ?? []);
  assert(packs.size > 0, `Unknown review profile: ${profile}`);
  const routeIndex = new Map(routes.routes.map(row => [row.route, row]));
  const included = row => row.requiredPacks.every(pack => packs.has(pack));
  const excluded = row => ({ id: row.id, reason: 'required-pack-not-in-profile', requiredPacks: [...row.requiredPacks],
    excludedPacks: row.requiredPacks.filter(pack => !packs.has(pack)) });
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
        reason: `The ${profile} source profile excludes required packs: ${owner.requiredPacks.filter(pack => !packs.has(pack)).join(', ')}.` };
    }
    for (const source of original.localEvidence ?? []) requireSource(source, original.id);
    return structuredClone(original);
  });
  // krds.profiles are brand profiles and are deliberately untouched.
  return { manifests: result, reviewScopes };
}
