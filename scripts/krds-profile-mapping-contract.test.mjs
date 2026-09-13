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

function collectReviewDates(node, found = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectReviewDates(item, found));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'reviewBy' || key === 'checkBy') && typeof value === 'string') found.push(value);
      else collectReviewDates(value, found);
    }
  }
  return found;
}

// [2026-09-13 신설] 위 테스트는 고정 NOW(2026-08-21)로만 검증해, config 가 선언한
//   "checkBy·reviewBy 가 지나면 계약 실패" 규칙이 실제로는 영원히 발화하지 않았다
//   (ui-route-capabilities 가 2026-08-31 에 닫은 결함과 같은 형태 — DEC-OPS-027 ③).
//   만료 red 의 해소는 실제 재검토, 또는 사유를 남긴 명시적 기한 재설정 커밋이다.
test('review horizons hold against the real clock, not only the pinned fixture date', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const now = new Date();

  const horizon = now.getTime() + 60 * 24 * 60 * 60 * 1000;
  const expiring = collectReviewDates(contract).filter((value) => {
    const deadline = Date.parse(`${value}T23:59:59Z`);
    return deadline >= now.getTime() && deadline <= horizon;
  });
  if (expiring.length > 0) {
    console.warn(
      `⚠ [krds-profile-mapping] review 기한 60일 이내 만료 예정 ${expiring.length}건 (기한: ${[...new Set(expiring)].sort().join(', ')}) — `
      + '만료 시 이 게이트가 red 가 됩니다. 재검토를 완료하거나 기한 재설정을 사유와 함께 커밋하세요.',
    );
  }

  assert.deepEqual(validate(contract, { now }), []);
});

test('the validator honours the injected clock, so the real-clock test can actually go red', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const errors = validate(contract, { now: new Date('2099-01-01T00:00:00Z') }).join('\n');
  assert.match(errors, /upstream review is stale/);
  assert.ok(collectReviewDates(contract).length >= 2, 'review date scan collapsed');
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
