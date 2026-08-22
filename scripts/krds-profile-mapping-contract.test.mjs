import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_PATH = path.join(ROOT, 'config/krds-profile-mapping.json');
const NOW = new Date('2026-08-21T00:00:00Z');
const REQUIRED_CATEGORIES = [
  'basic-pattern',
  'component',
  'identity',
  'principle',
  'service-pattern',
  'style',
  'verification',
];
const REQUIRED_PROFILES = ['krds-aligned', 'krds-standard', 'premium'];
const ALLOWED_DISPOSITIONS = new Set(['adopted', 'adapted', 'deferred', 'notApplicable']);
const OFFICIAL_URL_PREFIXES = [
  'https://www.krds.go.kr/',
  'https://github.com/KRDS-uiux/krds-uiux',
  'https://www.w3.org/',
];

function duplicates(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function nonStale(value, now) {
  return validDate(value) && Date.parse(`${value}T23:59:59Z`) >= now.getTime();
}

function officialUrl(value) {
  return typeof value === 'string' && OFFICIAL_URL_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function validate(contract, { root = ROOT, now = NOW } = {}) {
  const errors = [];
  if (contract.schemaVersion !== '1.0.0') errors.push('unsupported schemaVersion');
  if (contract.status !== 'draft-internal-contract') errors.push('status must preserve the draft boundary');
  if (!validDate(contract.checkedAt) || !nonStale(contract.checkBy, now)) errors.push('upstream review is stale or unbounded');
  if (!contract.owner) errors.push('mapping owner is missing');

  const checkedAt = Date.parse(`${contract.checkedAt}T00:00:00Z`);
  const checkBy = Date.parse(`${contract.checkBy}T00:00:00Z`);
  if (checkBy - checkedAt > 120 * 24 * 60 * 60 * 1000) errors.push('upstream review interval exceeds 120 days');

  const source = contract.sourcePolicy ?? {};
  if (source.guideline?.version !== '2025.08' || !officialUrl(source.guideline?.url)) {
    errors.push('2025.08 official guideline is not pinned');
  }
  if (source.componentKit?.version !== '1.1.0'
      || !officialUrl(source.componentKit?.url)
      || !officialUrl(source.componentKit?.repository)) {
    errors.push('official component kit release is not pinned');
  }
  if (source.license?.name !== '공공누리 제1유형 (KOGL Type 1)'
      || !source.license.requiresAttribution
      || !source.license.attribution
      || !officialUrl(source.license?.url)) {
    errors.push('license and attribution contract is incomplete');
  }
  if (!officialUrl(source.accessibilityBoundary?.url)
      || !source.accessibilityBoundary?.statement?.includes('does not by itself prove')) {
    errors.push('accessibility non-claim boundary is missing');
  }

  const profiles = contract.profiles ?? [];
  const profileIds = profiles.map(({ id }) => id);
  if (duplicates(profileIds).length || JSON.stringify([...profileIds].sort()) !== JSON.stringify(REQUIRED_PROFILES)) {
    errors.push('profile population must be exact and unique');
  }
  for (const profile of profiles) {
    if (!profile.purpose || !profile.currentClaim || !profile.maximumClaimWithoutReleaseEvidence
        || !profile.identityElements || !profile.identityOwner || !nonStale(profile.reviewBy, now)
        || !profile.requirements?.length) {
      errors.push(`profile is unbounded: ${profile.id ?? '<missing>'}`);
    }
    if (/compliant|준수 완료/i.test(`${profile.currentClaim} ${profile.maximumClaimWithoutReleaseEvidence}`)) {
      errors.push(`profile overclaims conformance: ${profile.id}`);
    }
  }
  if (profiles.find(({ id }) => id === 'premium')?.identityElements !== 'forbidden') {
    errors.push('premium profile must not impersonate official government identity');
  }

  const mappings = contract.mapping ?? [];
  const ids = mappings.map(({ id }) => id);
  const categories = [...new Set(mappings.map(({ category }) => category))].sort();
  if (mappings.length === 0 || duplicates(ids).length) errors.push('mapping ids must be non-empty and unique');
  if (JSON.stringify(categories) !== JSON.stringify(REQUIRED_CATEGORIES)) errors.push('mapping category population is incomplete');

  for (const entry of mappings) {
    if (!entry.title || !ALLOWED_DISPOSITIONS.has(entry.disposition) || !officialUrl(entry.upstream)) {
      errors.push(`mapping entry is malformed: ${entry.id ?? '<missing>'}`);
    }
    if (!entry.applicableProfiles?.length
        || entry.applicableProfiles.some((profile) => !REQUIRED_PROFILES.includes(profile))) {
      errors.push(`mapping profile scope is invalid: ${entry.id}`);
    }
    if (entry.disposition === 'adopted' || entry.disposition === 'adapted') {
      if (!entry.localEvidence?.length) errors.push(`implemented mapping has no local evidence: ${entry.id}`);
      for (const evidence of entry.localEvidence ?? []) {
        if (!fs.existsSync(path.join(root, evidence))) errors.push(`local evidence is missing: ${entry.id}/${evidence}`);
      }
    }
    if (entry.disposition === 'adapted' && !entry.deviation) errors.push(`adaptation has no deviation: ${entry.id}`);
    if (entry.disposition === 'deferred'
        && (!entry.reason || !entry.owner || !nonStale(entry.reviewBy, now))) {
      errors.push(`deferred mapping is unbounded: ${entry.id}`);
    }
    if (entry.disposition === 'notApplicable' && !entry.reason) {
      errors.push(`notApplicable mapping has no rationale: ${entry.id}`);
    }
    if (/compliant|준수 완료/i.test(entry.disposition)) errors.push(`invalid conformance disposition: ${entry.id}`);
  }

  const refreshIds = (contract.refreshTriggers ?? []).map(({ id }) => id);
  if (refreshIds.length < 4 || duplicates(refreshIds).length
      || (contract.refreshTriggers ?? []).some(({ condition, action }) => !condition || !action)) {
    errors.push('refresh triggers are incomplete');
  }
  if (!contract.claimPolicy?.forbiddenClaims?.length || !contract.claimPolicy?.verifiedScopeRequires?.length) {
    errors.push('claim policy is incomplete');
  }
  return errors;
}

test('current KRDS profile mapping pins official sources and keeps claims evidence-bounded', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  assert.deepEqual(validate(contract), []);
});

test('missing categories, stale reviews, unofficial sources and unbounded deviations are reproducible reds', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

  const missingCategory = structuredClone(contract);
  missingCategory.mapping = missingCategory.mapping.filter(({ category }) => category !== 'service-pattern');
  assert.match(validate(missingCategory).join('\n'), /category population is incomplete/);

  const stale = structuredClone(contract);
  stale.checkBy = '2026-08-20';
  assert.match(validate(stale).join('\n'), /upstream review is stale/);

  const unofficial = structuredClone(contract);
  unofficial.sourcePolicy.guideline.url = 'https://example.com/krds.pdf';
  assert.match(validate(unofficial).join('\n'), /official guideline is not pinned/);

  const unbounded = structuredClone(contract);
  const deferred = unbounded.mapping.find(({ disposition }) => disposition === 'deferred');
  delete deferred.owner;
  assert.match(validate(unbounded).join('\n'), /deferred mapping is unbounded/);

  const unexplainedAdaptation = structuredClone(contract);
  const adapted = unexplainedAdaptation.mapping.find(({ disposition }) => disposition === 'adapted');
  delete adapted.deviation;
  assert.match(validate(unexplainedAdaptation).join('\n'), /adaptation has no deviation/);

  const identityLeak = structuredClone(contract);
  identityLeak.profiles.find(({ id }) => id === 'premium').identityElements = 'enabled';
  assert.match(validate(identityLeak).join('\n'), /must not impersonate official government identity/);
});
