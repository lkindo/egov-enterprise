#!/usr/bin/env node
/** Calendar freshness is a visible maintenance signal, not a source-code waiver (ADR-0018). */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { adoptionScope, containedFile, validateAdoptionReview, validateProductProfile } from './adoption-review.mjs';
import { durationProfileFreshness } from './e2e-shard-plan.mjs';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REVIEW_SOURCES = Object.freeze([
  { path: 'config/ui-url-state-census.json', timeZone: 'UTC' },
  { path: 'config/ui-url-state-approval.json', timeZone: 'UTC' },
  { path: 'config/ui-route-capabilities.json', timeZone: 'UTC' },
  { path: 'config/ui-quality-scenarios.json', timeZone: 'Asia/Seoul' },
  { path: 'config/frontend-visible-terms.json', timeZone: 'UTC' },
  { path: 'config/krds-profile-mapping.json', timeZone: 'UTC' },
]);

export function reviewDeadline(value, timeZone) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`invalid review date: ${value}`);
  const midnight = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(midnight) || new Date(midnight).toISOString().slice(0, 10) !== value) throw new Error(`invalid calendar date: ${value}`);
  if (!['UTC', 'Asia/Seoul'].includes(timeZone)) throw new Error(`unsupported review time zone: ${timeZone}`);
  // Review day is inclusive. Expiry starts at the next day's midnight in its original calendar.
  return midnight + 86_400_000 - (timeZone === 'Asia/Seoul' ? 9 * 3_600_000 : 0);
}

export function collectReviewDates(manifest, { source, timeZone, nowMs = Date.now() }) {
  if (!Number.isFinite(nowMs)) throw new Error('invalid review clock');
  const entries = [];
  const errors = [];
  function walk(value, path, context = {}) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach((entry, index) => walk(entry, `${path}[${index}]`, context)); return; }
    const next = { ...context,
      ...Object.fromEntries(['owner', 'status', 'reviewState', 'ownerAssignment'].filter((key) => key in value).map((key) => [key, value[key]])),
    };
    for (const [key, child] of Object.entries(value)) {
      const location = `${path}.${key}`;
      if (['reviewBy', 'checkBy'].includes(key)) {
        try {
          const deadline = reviewDeadline(child, timeZone);
          entries.push({ source, location, reviewBy: child, timeZone,
            freshness: nowMs >= deadline ? 'overdue' : deadline - nowMs <= 30 * 86_400_000 ? 'due-soon' : 'scheduled',
            ...next,
          });
        } catch (error) { errors.push(`${source}${location}: ${error.message}`); }
      } else walk(child, location, next);
    }
  }
  walk(manifest, '$');
  if (entries.length === 0 && errors.length === 0) errors.push(`${source}: review schedule population is empty`);
  return { entries, errors };
}

const readJson = (root, path) => JSON.parse(readFileSync(containedFile(root, path), 'utf8'));

export async function buildGovernanceReview({ repoRoot = DEFAULT_ROOT, product = 'online', profile,
  mode = 'report', environmentId, nowMs = Date.now() } = {}) {
  if (!['report', 'adoption'].includes(mode)) throw new Error(`unsupported review mode: ${mode}`);
  if (!Number.isFinite(nowMs)) throw new Error('invalid review clock');
  const projectionPath = 'config/governance/reusable-governance-projection.json';
  const activeProfile = product === 'migration-tool' ? null : existsSync(resolve(repoRoot, projectionPath))
    ? readJson(repoRoot, projectionPath).profile : 'demo';
  profile = profile === undefined ? activeProfile : profile;
  validateProductProfile(product, profile);
  if (profile !== activeProfile) throw new Error('requested profile must match this source artifact; generate that profile first');
  const sourceScope = adoptionScope(repoRoot, { product, profile });
  const entries = [];
  const errors = [];
  let urlState = { applicability: 'not-applicable', reason: 'migration-tool has no online URL state' };
  let performanceEvidence = { applicability: 'not-applicable' };
  if (product === 'online') {
    performanceEvidence = { applicability: 'online-source', ...durationProfileFreshness(
      readJson(repoRoot, 'frontend/e2e/shard-duration-profile.json'), nowMs) };
    for (const descriptor of REVIEW_SOURCES) {
      const collected = collectReviewDates(readJson(repoRoot, descriptor.path), { source: descriptor.path, timeZone: descriptor.timeZone, nowMs });
      entries.push(...collected.entries);
      errors.push(...collected.errors);
    }
    const { approvedStateItemSelectors, isUrlStateItemApproved, hasNoClassifiableUrlState } = await import('./ui-url-state-census.mjs');
    const census = readJson(repoRoot, 'config/ui-url-state-census.json');
    const overlay = readJson(repoRoot, 'config/ui-url-state-approval.json');
    const selectors = approvedStateItemSelectors(overlay, census);
    const items = (census.records ?? []).flatMap((record) => (record.stateItems ?? []).map((item) => ({ record, item })));
    urlState = {
      applicability: 'online-source', records: census.records?.length ?? 0, stateItems: items.length,
      sourceApprovedItems: items.filter(({ record, item }) => isUrlStateItemApproved(record, item, selectors)).length,
      unapprovedItems: items.filter(({ record, item }) => !isUrlStateItemApproved(record, item, selectors)).length,
      recordsWithoutUrlState: (census.records ?? []).filter(hasNoClassifiableUrlState).length,
      opaqueRecords: (census.records ?? []).filter((record) => !(record.stateItems ?? []).length && !hasNoClassifiableUrlState(record)).length,
      pendingClasses: (overlay.classes ?? []).filter((entry) => entry.reviewState !== 'approved').map((entry) => entry.classId),
      environmentApprovalInherited: false,
    };
  }
  const reviewPath = product === 'migration-tool' ? 'config/governance/migration-adoption-review.json' : 'config/governance/adoption-review.json';
  const review = readJson(repoRoot, reviewPath);
  // Reports expose the recorded state, without interpreting it as a verified deployment approval.
  const adoptionErrors = mode === 'adoption'
    ? validateAdoptionReview(review, { repoRoot, product, profile, environmentId, scopeDigest: sourceScope.digest, nowMs }) : [];
  errors.push(...adoptionErrors);
  const overdue = entries.filter((entry) => entry.freshness === 'overdue').length;
  return {
    schemaVersion: 1, authority: 'governance-review-report-not-runtime-certification',
    generatedAt: new Date(nowMs).toISOString(), product, profile, mode, sourceScope,
    technicalValidation: 'not-executed; run the applicable verify profile',
    maintenance: { status: overdue ? 'review-required' : 'scheduled', total: entries.length,
      overdue, dueSoon: entries.filter((entry) => entry.freshness === 'due-soon').length,
      blocksSourceBuild: false, entries },
    urlState, performanceEvidence,
    adoption: { path: reviewPath, recordedStatus: review.status, inherited: false,
      approvalEnvelopeChecked: mode === 'adoption', approvalEnvelopeValid: mode === 'adoption' && adoptionErrors.length === 0,
      liveEnvironmentVerified: false },
    limitations: [
      'Review schedules preserve unknown/unverified evidence; overdue reporting does not grant approval.',
      'Approval hashes bind supplied evidence and source scope; they do not execute or certify live controls.',
      'Security waiver expiry and migration load/approval safeguards retain their separate enforcement.',
    ],
    errors,
  };
}

function parseArgs(argv) {
  const options = {};
  const names = new Map([['--root', 'repoRoot'], ['--product', 'product'], ['--profile', 'profile'], ['--mode', 'mode'], ['--environment', 'environmentId']]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index]);
    if (!name || Object.hasOwn(options, name) || !argv[index + 1] || argv[index + 1].startsWith('--')) throw new Error(`invalid argument: ${argv[index]}`);
    options[name] = argv[++index];
  }
  return options;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const report = await buildGovernanceReview(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (report.errors.length) process.exitCode = 1;
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
