import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ADOPTION_CONTROLS, adoptionScope, createPendingAdoptionReview, sha256, validateAdoptionReview } from './adoption-review.mjs';
import { buildGovernanceReview, collectReviewDates, reviewDeadline, REVIEW_SOURCES } from './governance-review.mjs';
import { parseWorkflowJobs } from './required-checks-contract.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nowMs = Date.parse('2026-09-14T00:00:00Z');

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-adoption-review-'));
  t.after(() => {
    const back = relative(base, root);
    assert.ok(back.startsWith('egov-adoption-review-') && !back.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  const write = (file, value) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), value); };
  write('migration-tool/build.gradle', 'dependencies {}\n');
  write('migration-tool/src/main/java/Tool.java', 'class Tool {}\n');
  write('config/governance/migration-adoption-review.json', JSON.stringify(createPendingAdoptionReview({ product: 'migration-tool', profile: null })));
  write('docs/review.md', 'Fixture evidence of source/target, mappings, and recovery; not a production approval.\n');
  return { root, write };
}

function approved(root, overrides = {}) {
  return { ...createPendingAdoptionReview({ product: 'migration-tool', profile: null }),
    status: 'approved', environmentId: 'fixture-env', owner: 'fixture reviewer',
    reviewedAt: '2026-09-13T00:00:00Z', validUntil: '2026-09-15T00:00:00Z',
    scopeDigest: adoptionScope(root, { product: 'migration-tool', profile: null }).digest,
    evidence: ADOPTION_CONTROLS['migration-tool'].map((control) => ({ control, path: 'docs/review.md', sha256: sha256(readFileSync(join(root, 'docs/review.md'))) })),
    ...overrides,
  };
}

function validate(review, root, extra = {}) {
  return validateAdoptionReview(review, { repoRoot: root, product: 'migration-tool', profile: null,
    environmentId: 'fixture-env', scopeDigest: adoptionScope(root, { product: 'migration-tool', profile: null }).digest, nowMs, ...extra });
}

test('original date values stay visible: technical review reporting does not reapprove unknown work', async () => {
  const repositoryNowMs = Date.now();
  const report = await buildGovernanceReview({ repoRoot, nowMs: repositoryNowMs });
  assert.equal(report.errors.length, 0);
  assert.equal(report.adoption.recordedStatus, 'pending');
  assert.equal(report.adoption.approvalEnvelopeValid, false);
  assert.ok(report.urlState.unapprovedItems > 0);
  assert.ok(report.urlState.opaqueRecords > 0);
  assert.equal(report.urlState.environmentApprovalInherited, false);
  assert.deepEqual(new Set(report.maintenance.entries.map(({ source }) => source)), new Set(REVIEW_SOURCES.map(({ path }) => path)));
  const future = await buildGovernanceReview({ repoRoot, nowMs: repositoryNowMs + 10 * 365 * 86_400_000 });
  assert.deepEqual(future.errors, []);
  assert.deepEqual(future.sourceScope, report.sourceScope);
  assert.deepEqual(future.urlState, report.urlState);
  assert.equal(future.maintenance.overdue, report.maintenance.total);
  assert.equal(future.maintenance.status, 'review-required');
  assert.equal(future.maintenance.blocksSourceBuild, false);
  assert.equal(future.performanceEvidence.freshness, 'overdue');
  assert.equal(future.performanceEvidence.actualRuntimeBalanceVerified, false);
  assert.equal(future.performanceEvidence.capturedAt, report.performanceEvidence.capturedAt);
  assert.deepEqual(future.maintenance.entries.map(({ reviewBy }) => reviewBy), report.maintenance.entries.map(({ reviewBy }) => reviewBy));
});

test('wall clock boundaries preserve UTC and Seoul calendars, with real date validation', (t) => {
  const manifest = { status: 'unverified', owner: 'fixture', reviewBy: '2026-12-07' };
  for (const [timeZone, threshold] of [['UTC', '2026-12-08T00:00:00Z'], ['Asia/Seoul', '2026-12-07T15:00:00Z']]) {
    t.mock.timers.enable({ apis: ['Date'], now: Date.parse(threshold) - 1 });
    assert.equal(collectReviewDates(manifest, { source: 'fixture', timeZone }).entries[0].freshness, 'due-soon');
    t.mock.timers.tick(1);
    assert.equal(collectReviewDates(manifest, { source: 'fixture', timeZone }).entries[0].freshness, 'overdue');
    t.mock.timers.reset();
  }
  assert.throws(() => reviewDeadline('2026-02-30', 'UTC'), /calendar date/);
  assert.throws(() => reviewDeadline('not-a-date', 'UTC'), /review date/);
  assert.throws(() => reviewDeadline('2026-02-28', 'Europe/Paris'), /time zone/);
  assert.ok(collectReviewDates({}, { source: 'fixture', timeZone: 'UTC' }).errors.length);
});

test('institution approval requires target environment, source binding, and complete untampered evidence', (t) => {
  const { root, write } = fixture(t);
  const review = approved(root);
  assert.deepEqual(validate(review, root), []);
  const cases = [
    { status: 'pending' }, { owner: '' }, { environmentId: 'another-env' }, { profile: 'demo' },
    { scopeDigest: '0'.repeat(64) }, { reviewedAt: '2027-01-01T00:00:00Z' },
    { reviewedAt: '2026-02-30T00:00:00Z' }, { validUntil: '2026-09-13T00:00:00Z' },
    { evidence: review.evidence.slice(1) }, { allowExpired: true },
    { evidence: [...review.evidence, review.evidence[0]] },
    { evidence: review.evidence.map((entry) => ({ ...entry, path: '../outside.md' })) },
    { evidence: review.evidence.map((entry) => ({ ...entry, sha256: '0'.repeat(64) })) },
  ];
  for (const changes of cases) assert.ok(validate({ ...review, ...changes }, root).length > 0, JSON.stringify(changes));
  assert.ok(validate(review, root, { environmentId: undefined }).length);
  assert.ok(validate(review, root, { nowMs: Date.parse(review.validUntil) }).some((error) => error.includes('expired')));
  write('docs/review.md', 'altered evidence');
  assert.ok(validate(review, root).some((error) => error.includes('evidence hash mismatch')));
});

/*
  DEC-OPS-107 — 공용 gap 인덱스에서 이전한 두 통제가 실제로 요구되는지 고정한다.

  이전의 요지는 "원본에서 닫을 수 없으니 지운다" 가 아니라 "의무의 수신자를 채택 기관으로 옮긴다"
  이므로, 옮긴 자리에서 집행되지 않으면 그냥 삭제한 것과 같아진다. 이전 5통제 집합을 대조군으로
  함께 둔다 — 그 집합이 통과하면 이전이 무효다.
*/
test('institution approval requires the controls transferred from the gap index', (t) => {
  const { root, write } = fixture(t);
  write('frontend/package.json', '{"private":true}\n');
  write('config/ui-url-state-census.json', '{}\n');

  const evidencePath = 'docs/review.md';
  const digest = sha256(readFileSync(join(root, evidencePath)));
  const onlineScope = adoptionScope(root, { product: 'online', profile: 'demo' }).digest;
  const forControls = (controls) => ({
    ...createPendingAdoptionReview({ product: 'online', profile: 'demo' }),
    status: 'approved', environmentId: 'fixture-env', owner: 'fixture reviewer',
    reviewedAt: '2026-09-13T00:00:00Z', validUntil: '2026-09-15T00:00:00Z', scopeDigest: onlineScope,
    evidence: controls.map((control) => ({ control, path: evidencePath, sha256: digest })),
  });
  const validateOnline = (review) => validateAdoptionReview(review, {
    repoRoot: root, product: 'online', profile: 'demo',
    environmentId: 'fixture-env', scopeDigest: onlineScope, nowMs,
  });

  // 현재 통제 전부를 갖추면 통과한다 — 이전이 승인 자체를 막아 버리지 않는다는 대조군.
  assert.deepEqual(validateOnline(forControls([...ADOPTION_CONTROLS.online])), []);

  for (const transferred of ['backup-recovery', 'crypto-lifecycle']) {
    assert.ok(ADOPTION_CONTROLS.online.includes(transferred), `${transferred} 통제가 선언돼 있어야 한다`);
    const without = ADOPTION_CONTROLS.online.filter((control) => control !== transferred);
    assert.ok(
      validateOnline(forControls(without)).some((error) => error === `missing evidence control: ${transferred}`),
      `${transferred} 근거 없이 승인되면 이전이 집행되지 않는다`
    );
  }

  // 이전 전의 5통제 집합. 이 줄이 통과하면 gap 을 옮긴 것이 아니라 지운 것이다.
  const beforeTransfer = ['data-classification', 'authorization', 'request-logging', 'accessibility', 'execution-artifacts'];
  assert.ok(validateOnline(forControls(beforeTransfer)).length > 0, '이전 전 통제 집합은 더 이상 승인되지 않는다');
});

test('source changes invalidate environment approval while unrelated online files cannot block migration artifacts', async (t) => {
  const { root, write } = fixture(t);
  const review = approved(root);
  write('frontend/src/app/page.tsx', 'unrelated online change');
  write('config/ui-url-state-census.json', 'invalid and expired online input');
  assert.deepEqual(validate(review, root), []);
  const report = await buildGovernanceReview({ repoRoot: root, product: 'migration-tool', nowMs });
  assert.deepEqual(report.errors, []);
  assert.equal(report.maintenance.total, 0);
  assert.equal(report.urlState.applicability, 'not-applicable');
  write('migration-tool/src/main/java/Tool.java', 'class Tool { int changed; }');
  assert.ok(validate(review, root).some((error) => error.includes('scope digest mismatch')));
});

test('online deployment inputs invalidate approvals and text checkout line endings do not', (t) => {
  const { root, write } = fixture(t);
  write('frontend/package.json', '{"private":true}\n');
  write('config/ui-url-state-census.json', '{}\n');
  const online = () => adoptionScope(root, { product: 'online', profile: 'demo' }).digest;
  let previous = online();
  for (const file of ['frontend/Dockerfile', 'api-server/Dockerfile', 'docker-compose.prod.yml', 'scripts/deploy.sh']) {
    write(file, 'fixture original\n');
    assert.notEqual(online(), previous, file);
    previous = online();
    write(file, 'fixture changed\n');
    assert.notEqual(online(), previous, file);
    previous = online();
    write(file, 'fixture changed\r\n');
    assert.equal(online(), previous, `portable text hash: ${file}`);
  }
  const migration = () => adoptionScope(root, { product: 'migration-tool', profile: null }).digest;
  previous = migration();
  write('migration-tool/src/main/java/Tool.java', 'class Tool {}\r\n');
  assert.equal(migration(), previous);
  write('migration-tool/src/main/resources/payload.bin', Buffer.from([0, 13, 10]));
  previous = migration();
  write('migration-tool/src/main/resources/payload.bin', Buffer.from([0, 10]));
  assert.notEqual(migration(), previous);
});

test('actual CLI fails closed for pending/expired adoption and cannot override its clock or product profile', (t) => {
  const { root, write } = fixture(t);
  const command = ['scripts/governance-review.mjs', '--root', root, '--product', 'migration-tool'];
  const run = (args) => spawnSync(process.execPath, [...command, ...args], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(run(['--mode', 'report']).status, 0);
  assert.equal(run(['--mode', 'adoption', '--environment', 'fixture-env']).status, 1);
  write('config/governance/migration-adoption-review.json', JSON.stringify(approved(root, {
    reviewedAt: '2000-01-01T00:00:00Z', validUntil: '2000-01-02T00:00:00Z',
  })));
  const expired = run(['--mode', 'adoption', '--environment', 'fixture-env']);
  assert.equal(expired.status, 1);
  assert.match(expired.stdout, /approval expired/);
  assert.equal(run(['--now', '2000-01-01']).status, 1);
  assert.equal(run(['--profile', 'core']).status, 1);
  const missing = run(['--root', `${root}/missing`]);
  assert.equal(missing.status, 1);
});

function assertReportingBinding(source) {
  const uncommented = source.split(/\r?\n/).filter((line) => !/^\s*#/.test(line)).join('\n');
  const steps = uncommented.split(/(?=^      - )/m).slice(1);
  const reports = steps.filter((step) => /^      - name: Report governance review freshness$/m.test(step));
  assert.equal(reports.length, 1);
  const report = reports[0];
  assert.doesNotMatch(report, /^        (?:if|continue-on-error|working-directory|shell):/m);
  assert.match(report, /^        run: \|\n          mkdir -p build\/reports\/governance\n          node scripts\/governance-review\.mjs --product online --mode report > build\/reports\/governance\/review\.json\n          node scripts\/governance-review-summary\.mjs build\/reports\/governance\/review\.json >> "\$GITHUB_STEP_SUMMARY"\s*$/m);
  const uploads = steps.filter((step) => /^      - name: Upload governance review report$/m.test(step));
  assert.equal(uploads.length, 1);
  assert.doesNotMatch(uploads[0], /^        (?:if|continue-on-error):/m);
  assert.match(uploads[0], /^        uses: actions\/upload-artifact@[a-f0-9]{40}(?:\s+#.*)?$/m);
  assert.match(uploads[0], /^          name: governance-review$/m);
  assert.match(uploads[0], /^          retention-days: 30$/m);
  assert.match(uploads[0], /^          if-no-files-found: error$/m);
  assert.match(uploads[0], /^          path: build\/reports\/governance\/review\.json$/m);
  const preSteps = uncommented.split(/^    steps:/m)[0];
  assert.doesNotMatch(preSteps, /continue-on-error:|defaults:/);
  const conditions = [...preSteps.matchAll(/^ {4}if:\s*(.*?)\s*$/gm)].map((match) => match[1]);
  assert.ok(conditions.length <= 1 && conditions.every((condition) => condition === 'always()'));
  assert.match(preSteps, /^    runs-on: ubuntu-latest$/m);
}

test('real report execution is bound to required CI and a scheduled maintenance workflow, with removal probes', () => {
  const ci = readFileSync(join(repoRoot, '.github/workflows/ci.yml'), 'utf8');
  const secretScan = parseWorkflowJobs(ci).get('secret-scan');
  assert.ok(secretScan);
  const scheduled = readFileSync(join(repoRoot, '.github/workflows/governance-review.yml'), 'utf8');
  const scheduleJob = parseWorkflowJobs(scheduled).get('review');
  assert.ok(scheduleJob);
  for (const source of [secretScan, scheduleJob]) {
    assertReportingBinding(source);
    assert.throws(() => assertReportingBinding(source.replace('node scripts/governance-review.mjs --product online --mode report >', '# node scripts/governance-review.mjs --product online --mode report >')));
    assert.throws(() => assertReportingBinding(source.replace('--mode report >', '--mode adoption >')));
    assert.throws(() => assertReportingBinding(source.replace('if-no-files-found: error', 'if-no-files-found: warn')));
    assert.throws(() => assertReportingBinding(source.replace(/(name: Upload governance review report\n\s+uses: )actions\/upload-artifact/, '$1actions/setup-node')));
    assert.throws(() => assertReportingBinding(source.replace('      - name: Report governance review freshness', '      - name: Report governance review freshness\n        if: false')));
    assert.throws(() => assertReportingBinding(source.replace('    runs-on: ubuntu-latest', '    if: false\n    runs-on: ubuntu-latest')));
    assert.throws(() => assertReportingBinding(source.replace('        run: |\n          mkdir -p build/reports/governance', '        run: |\n          exit 0\n          mkdir -p build/reports/governance')));
  }
  assert.doesNotMatch(ci.split(/^jobs:/m)[0], /defaults:/);
  assert.doesNotMatch(scheduled.split(/^jobs:/m)[0], /defaults:/);
  assert.match(scheduled, /schedule:\s*\n\s*- cron:/);
  assert.match(scheduled, /contents: read/);
  assert.doesNotMatch(scheduled, /issues: write|pull-requests: write/);
});

test('review summary presents overdue work visibly without claiming technical or deployment certification', (t) => {
  const { root, write } = fixture(t);
  write('report.json', JSON.stringify({ authority: 'governance-review-report-not-runtime-certification', errors: [], maintenance: { total: 5, overdue: 5, dueSoon: 0 } }));
  const summary = execFileSync(process.execPath, ['scripts/governance-review-summary.mjs', join(root, 'report.json')], { cwd: repoRoot, encoding: 'utf8' });
  assert.match(summary, /REVIEW REQUIRED/);
  assert.match(summary, /overdue: \*\*5\*\*/);
  assert.match(summary, /does not certify/);
});
