import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildDurationBalancedPlan,
  discoverSpecs,
  loadDurationProfile,
  parseShard,
  validateDurationProfile,
} from './e2e-shard-plan.mjs';

test('duration profile covers every Playwright spec exactly once', () => {
  const profile = loadDurationProfile();
  assert.deepEqual(validateDurationProfile(profile), []);
  assert.deepEqual(Object.keys(profile.durationsMs).sort(), discoverSpecs());
});

test('duration profile source commit exists in this repository and is an ancestor of HEAD', () => {
  const profile = loadDurationProfile();
  execFileSync('git', ['cat-file', '-e', `${profile.source.commit}^{commit}`], { stdio: 'ignore' });
  execFileSync('git', ['merge-base', '--is-ancestor', profile.source.commit, 'HEAD'], { stdio: 'ignore' });
});

test('three duration-balanced shards are deterministic and stay within 15 percent', () => {
  const profile = loadDurationProfile();
  const first = buildDurationBalancedPlan(profile, 3);
  const second = buildDurationBalancedPlan(profile, 3);
  assert.deepEqual(first, second);

  const assigned = first.flatMap(shard => shard.specs).sort();
  assert.deepEqual(assigned, discoverSpecs());
  assert.equal(new Set(assigned).size, assigned.length);

  const totals = first.map(shard => shard.estimatedMs);
  assert.ok(Math.max(...totals) / Math.min(...totals) <= 1.15, JSON.stringify(first, null, 2));
});

test('missing, stale, or weakened duration evidence fails closed', () => {
  const profile = structuredClone(loadDurationProfile());
  delete profile.durationsMs['01-core-base.spec.ts'];
  profile.durationsMs['removed.spec.ts'] = 1000;
  profile.durationsMs['02-admin-system.spec.ts'] = 0;
  const errors = validateDurationProfile(profile);
  assert.ok(errors.some(error => error.includes('missing duration profile')));
  assert.ok(errors.some(error => error.includes('stale duration profile')));
  assert.ok(errors.some(error => error.includes('positive integer')));
});

test('duration source provenance rejects missing, malformed, or future evidence', () => {
  const specs = discoverSpecs();
  const nowMs = Date.parse('2026-08-19T12:00:00Z');
  const invalidCases = [
    ['workflowRunId', 0, /workflowRunId.*positive integer/],
    ['workflowRunId', 'not-a-run', /workflowRunId.*positive integer/],
    ['commit', 'deadbeef', /commit.*40-hex/],
    ['capturedAt', 'not-a-date', /capturedAt.*valid ISO/],
    ['capturedAt', '2026-02-30', /capturedAt.*valid ISO/],
    ['capturedAt', '2026-08-20T00:00:00Z', /capturedAt.*future/],
    ['capturedAt', '2026-01-01', /capturedAt.*older than 120 days/],
    ['runner', '   ', /runner.*nonempty/],
    ['workers', 0, /workers.*positive integer/],
    ['workers', 1.5, /workers.*positive integer/],
  ];

  for (const [field, value, expected] of invalidCases) {
    const profile = structuredClone(loadDurationProfile());
    profile.source[field] = value;
    assert.match(
      validateDurationProfile(profile, specs, nowMs).join('\n'),
      expected,
      `${field}=${JSON.stringify(value)} should fail closed`,
    );
  }

  const missingSource = structuredClone(loadDurationProfile());
  delete missingSource.source;
  assert.match(validateDurationProfile(missingSource, specs, nowMs).join('\n'), /source evidence is required/);
});

test('recursive discovery includes nested specs and requires duration evidence for them', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-shard-plan-'));
  try {
    fs.mkdirSync(path.join(root, 'nested', 'admin'), { recursive: true });
    fs.writeFileSync(path.join(root, 'root.spec.ts'), '', 'utf8');
    fs.writeFileSync(path.join(root, 'nested', 'admin', 'user.spec.ts'), '', 'utf8');

    const specs = discoverSpecs(root);
    assert.deepEqual(specs, ['nested/admin/user.spec.ts', 'root.spec.ts']);

    const profile = {
      schemaVersion: 1,
      source: {
        workflowRunId: '1',
        commit: '0123456789abcdef0123456789abcdef01234567',
        capturedAt: '2026-08-19',
        runner: 'test-fixture',
        workers: 1,
      },
      durationsMs: { 'root.spec.ts': 1000 },
    };
    // 합성 fixture 는 capturedAt 이 고정이므로 실시간 시계로 검증하면 120일 뒤 이 테스트가
    // 신선도 상한 때문에 낡는다 — fixture 시점으로 시계를 고정한다.
    assert.match(
      validateDurationProfile(profile, specs, Date.parse('2026-08-19T12:00:00Z')).join('\n'),
      /nested\/admin\/user\.spec\.ts/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('CLI emits only the selected repository-relative spec arguments', () => {
  const result = spawnSync(process.execPath, ['scripts/e2e-shard-plan.mjs', '--shard', '1/3'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  const specs = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  assert.ok(specs.length > 0);
  assert.ok(specs.every(spec => /^e2e\/(?:[\w.-]+\/)*[\w.-]+\.spec\.ts$/.test(spec)));
  assert.match(result.stderr, /Duration-balanced E2E plan/);
});

test('invalid shard coordinates are rejected', () => {
  assert.throws(() => parseShard('0/3'), /invalid shard/);
  assert.throws(() => parseShard('4/3'), /invalid shard/);
  assert.throws(() => parseShard('1'), /current\/total/);
});

test('CI consumes the duration-balanced plan instead of count-based Playwright sharding', () => {
  const workflow = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.match(workflow, /^        shard: \[1\/3, 2\/3, 3\/3\]$/m);
  assert.match(workflow, /node \.\.\/scripts\/e2e-shard-plan\.mjs --shard "\$\{\{ matrix\.shard \}\}"/);
  assert.match(workflow, /npx playwright test --project=full-suite "\$\{E2E_SPECS\[@\]\}" --reporter=blob,line,json/);
  assert.match(workflow, /node \.\.\/scripts\/playwright-result-contract\.mjs --report "\$PLAYWRIGHT_JSON_OUTPUT_FILE" "\$\{E2E_SPECS\[@\]\}"/);
  assert.doesNotMatch(workflow, /playwright test[^\r\n]*--shard=\$\{\{ matrix\.shard \}\}/);
});
