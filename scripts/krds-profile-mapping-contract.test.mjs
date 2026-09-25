import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_PATH = path.join(ROOT, 'config/krds-profile-mapping.json');
import { validateKrdsMapping as validate } from './krds-profile-mapping-contract.mjs';

test('current KRDS profile mapping pins official sources and keeps claims evidence-bounded', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  assert.deepEqual(validate(contract), []);
});

// ADR-0018: governance-review reports when upstream evidence needs checking;
// this technical contract preserves the pinned sources and the draft boundary.
test('KRDS source contracts stay deterministic across upstream review deadlines', (t) => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const baseline = validate(contract);
  assert.deepEqual(baseline, []);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${contract.checkedAt}T12:00:00Z`) });
  for (const timestamp of [
    `${contract.checkedAt}T12:00:00Z`,
    '2026-11-22T00:00:00Z',
    '2036-01-01T00:00:00Z',
  ]) {
    t.mock.timers.setTime(Date.parse(timestamp));
    assert.deepEqual(validate(contract), baseline, timestamp);
    const falseClaim = structuredClone(contract);
    falseClaim.profiles[0].currentClaim = 'KRDS compliant';
    assert.match(validate(falseClaim).join('\n'), /profile overclaims conformance/);
  }
});

test('KRDS review records preserve real dates, owners, review order and the 120-day interval', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  for (const target of ['contract', 'profile', 'deferred']) {
    for (const [field, value] of [['reviewBy', '2026-11-31'], ['reviewBy', '2026-08-20'], ['owner', ' ']]) {
      const fixture = structuredClone(contract);
      const record = target === 'contract' ? fixture
        : target === 'profile' ? fixture.profiles[0]
          : fixture.mapping.find(({ disposition }) => disposition === 'deferred');
      const key = target === 'contract' && field === 'reviewBy' ? 'checkBy'
        : target === 'profile' && field === 'owner' ? 'identityOwner' : field;
      record[key] = value;
      assert.match(validate(fixture).join('\n'), /upstream review requires real dates|owner is missing|profile is unbounded|deferred mapping is unbounded/, `${target}.${key}`);
    }
  }
  const invalidCheck = structuredClone(contract);
  invalidCheck.checkedAt = '2026-02-30';
  assert.match(validate(invalidCheck).join('\n'), /upstream review requires real dates/);

  // checkedAt 기준으로 계산한다 — 절대 날짜는 정기 검토로 checkedAt 이 옮겨 가면 120일 안으로 들어와 red 를 잃는다.
  const daysAfterCheck = (days) => new Date(Date.parse(`${contract.checkedAt}T00:00:00Z`) + days * 86_400_000)
    .toISOString().slice(0, 10);
  const boundaryInterval = structuredClone(contract);
  boundaryInterval.checkBy = daysAfterCheck(120);
  assert.doesNotMatch(validate(boundaryInterval).join('\n'), /upstream review interval exceeds 120 days/);
  const widenedInterval = structuredClone(contract);
  widenedInterval.checkBy = daysAfterCheck(121);
  assert.match(validate(widenedInterval).join('\n'), /upstream review interval exceeds 120 days/);
});

test('missing categories, misordered reviews, unofficial sources and unbounded deviations are reproducible reds', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

  const missingCategory = structuredClone(contract);
  missingCategory.mapping = missingCategory.mapping.filter(({ category }) => category !== 'service-pattern');
  assert.match(validate(missingCategory).join('\n'), /category population is incomplete/);

  const predatesReview = structuredClone(contract);
  predatesReview.checkBy = '2026-08-20';
  assert.match(validate(predatesReview).join('\n'), /upstream review requires real dates/);

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
