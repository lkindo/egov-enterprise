import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectReusableGovernance } from './reusable-governance-integrity.mjs';
import { validateVisibleTerms } from './frontend-visible-terms-contract.mjs';
import { validateKrdsMapping } from './krds-profile-mapping-contract.mjs';
import { queryConsumerContractErrors, validateUiQuality } from './ui-quality-scenarios-contract.mjs';
import { discoverPageRoutes, inspectRouteRepository, validateRouteCapabilities } from './ui-route-capabilities-contract.mjs';
import { buildUrlStateCensus, compareUrlStateCensus, validateUrlStateCensus } from './ui-url-state-census.mjs';
import { validateUrlStateApproval } from './ui-url-state-approval-contract.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PATHS = {
  routes: 'config/ui-route-capabilities.json',
  census: 'config/ui-url-state-census.json',
  approval: 'config/ui-url-state-approval.json',
  approvalSchema: 'config/ui-url-state-approval.schema.json',
  quality: 'config/ui-quality-scenarios.json',
  terms: 'config/frontend-visible-terms.json',
  krds: 'config/krds-profile-mapping.json',
  upstreamTerms: 'config/governance/upstream-review/frontend-visible-terms.json',
};

export function readReusableUiContracts(root) {
  return Object.fromEntries(Object.entries(PATHS).map(([key, path]) => [key, JSON.parse(readFileSync(resolve(root, path), 'utf8'))]));
}

/** The CLI supplies scopes independently derived by integrity, never by the active manifests themselves. */
export function validateActiveUiContracts(root, reviewScopes, documents = readReusableUiContracts(root)) {
  const errors = [];
  const append = (family, found) => errors.push(...found.map(error => `${family}: ${error}`));
  const repository = inspectRouteRepository(root);
  append('routes', validateRouteCapabilities(documents.routes, repository).errors);
  const actual = buildUrlStateCensus({ repoRoot: root });
  append('url-census', validateUrlStateCensus(documents.census, { repoRoot: root, approvalOverlay: documents.approval }));
  append('url-census', compareUrlStateCensus(documents.census, actual));
  if (actual.summary.exactPopulations.filesystemRoutes !== discoverPageRoutes(root).length) {
    errors.push('url-census: independent route scanners disagree on the active population');
  }
  append('url-approval', validateUrlStateApproval(documents.approval, documents.census, documents.approvalSchema));
  if (!Array.isArray(reviewScopes?.uiQuality?.scenarioIds) || !Array.isArray(reviewScopes?.visibleTerms?.pilotIds)) {
    return [...errors, 'applicability: independently verified review scopes are missing'];
  }
  const pilots = documents.upstreamTerms.pilotCensus.filter(row => reviewScopes.visibleTerms.pilotIds.includes(row.id));
  if (pilots.length !== reviewScopes.visibleTerms.pilotIds.length || pilots.length === 0) {
    errors.push('applicability: pilot scope is empty, duplicated, or absent from the upstream snapshot');
  }
  append('visible-terms', validateVisibleTerms(documents.terms, { root, expectedPilotRoutes: pilots.map(row => row.route) }));
  append('krds', validateKrdsMapping(documents.krds, { root }));
  append('ui-quality', validateUiQuality(documents.quality, documents.routes, root, undefined,
    { sourceRoot: root, scenarioIds: reviewScopes.uiQuality.scenarioIds }));
  append('ui-quality-query', queryConsumerContractErrors(documents.quality, documents.census));
  return errors;
}

export function verifyReusableGovernance(root = ROOT) {
  const report = {
    schemaVersion: 1,
    authority: 'reusable-artifact-technical-contract-results',
    profile: null,
    environmentApproved: false,
    errors: [],
    verifiedContracts: [],
    applicability: null,
  };
  try {
    const inspection = inspectReusableGovernance(resolve(root), { requireLock: true });
    report.profile = inspection.metadata?.profile ?? null;
    report.errors.push(...inspection.errors.map(error => `projection-integrity: ${error}`));
    report.applicability = inspection.reviewScopes;
    if (report.errors.length) return report;
    report.errors.push(...validateActiveUiContracts(resolve(root), inspection.reviewScopes));
    if (report.errors.length === 0) {
      report.verifiedContracts = ['projection-integrity', 'routes', 'url-census', 'url-approval', 'visible-terms', 'krds', 'ui-quality', 'ui-quality-query'];
    }
  } catch (error) {
    report.errors.push(`verification could not complete: ${error.message}`);
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--root' || !args[1])) {
    console.error('Usage: node scripts/verify-reusable-governance.mjs [--root PATH]');
    process.exitCode = 1;
  } else {
    const report = verifyReusableGovernance(args[1] ?? ROOT);
    console.log(JSON.stringify(report, null, 2));
    if (report.errors.length) process.exitCode = 1;
  }
}
