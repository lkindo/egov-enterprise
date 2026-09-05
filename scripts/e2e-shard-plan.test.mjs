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

function loadAuthoritativeE2eShardCoordinates() {
  const manifest = JSON.parse(fs.readFileSync('.github/required-checks.json', 'utf8'));
  const e2eCheck = manifest.requiredChecks.find(check => check.context === 'e2e-test');
  return e2eCheck?.aggregate?.sourceMatrix?.values ?? [];
}

function parsePlaywrightWorkerTopology(configSource) {
  const assignments = [...configSource.matchAll(
    /^\s*workers:\s*process\.env\.CI\s*\?\s*(\d+)\s*:\s*(\d+)\s*,?\s*$/gm,
  )];
  assert.equal(assignments.length, 1, 'playwright.config.ts must have exactly one CI/local workers ternary');
  return {
    ci: Number(assignments[0][1]),
    local: Number(assignments[0][2]),
  };
}

function assertWorkerTopology({ configSource, profileWorkers, guideSource, shardCount }) {
  const workers = parsePlaywrightWorkerTopology(configSource);
  assert.equal(workers.ci, profileWorkers, 'CI Playwright workers must match duration-profile evidence');
  assert.ok(guideSource.includes(`| **Workers** | ${workers.local} | ${workers.ci} |`));
  assert.ok(guideSource.includes(`로컬은 공유 DB 안정성을 위해 ${workers.local} 유지`));
  assert.ok(guideSource.includes(`CI는 2026-09-01 실측으로 ${workers.ci}`));
  assert.ok(guideSource.includes(`추가 병렬성은 실행시간 기반 ${shardCount}-shard로 확보`));
  return workers;
}

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

test('the authoritative shard duration plan is deterministic and stays within 15 percent', () => {
  const profile = loadDurationProfile();
  const coordinates = loadAuthoritativeE2eShardCoordinates();
  const shardCount = coordinates.length;
  const first = buildDurationBalancedPlan(profile, shardCount);
  const second = buildDurationBalancedPlan(profile, shardCount);
  assert.equal(first.length, coordinates.length, 'planner shard count must match the required-check matrix');
  assert.deepEqual(first, second);

  const assigned = first.flatMap(shard => shard.specs).sort();
  assert.deepEqual(assigned, discoverSpecs());
  assert.equal(new Set(assigned).size, assigned.length);

  const totals = first.map(shard => shard.estimatedMs);
  assert.ok(Math.max(...totals) / Math.min(...totals) <= 1.15, JSON.stringify(first, null, 2));
});

test('current E2E documentation matches the authoritative shard matrix and worker count', () => {
  const coordinates = loadAuthoritativeE2eShardCoordinates();
  const shardCount = coordinates.length;
  const labels = coordinates.map(coordinate => `\`${coordinate}\``).join('·');
  const matrix = `shard: [${coordinates.join(', ')}]`;
  const profile = loadDurationProfile();

  const pipelineGuide = fs.readFileSync('docs/03-guides/cicd-pipeline.md', 'utf8');
  assert.ok(pipelineGuide.includes(`내부 ${shardCount} shard`));
  assert.ok(pipelineGuide.includes(`${labels}은 내부 실행 job label`));
  assert.ok(pipelineGuide.includes(matrix));
  assert.ok(pipelineGuide.includes(`--shard ${coordinates[0]}`));
  assert.ok(pipelineGuide.includes(`내부 ${shardCount}개 job은 비용 병렬화를 위한 구현 세부사항`));

  const e2eGuide = fs.readFileSync('docs/03-guides/e2e-test-guide.md', 'utf8');
  const playwrightConfig = fs.readFileSync('frontend/playwright.config.ts', 'utf8');
  assertWorkerTopology({
    configSource: playwrightConfig,
    profileWorkers: profile.source.workers,
    guideSource: e2eGuide,
    shardCount,
  });
  assert.ok(e2eGuide.includes(`CI의 ${labels}은 내부 실행 job label`));

  const buildGradle = fs.readFileSync('build.gradle', 'utf8');
  assert.ok(buildGradle.includes('e2e-tests 전체 shard가 통째로 skip 됩니다.'));
  assert.doesNotMatch(buildGradle, /e2e-tests \d+샤드/);

  const atlas = fs.readFileSync('frontend/public/governance_harness_atlas.html', 'utf8');
  const currentAtlasClaims = [
    `내부 실행은 duration-balanced E2E ${shardCount} shard입니다.`,
    `E2E 내부 ${shardCount} shard는 구현 세부사항이고`,
    `duration profile이 내부 ${shardCount} shard를 균형화하며`,
    `desc: "내부 ${shardCount} shard는 최근 spec duration profile로`,
  ];
  for (const claim of currentAtlasClaims) {
    assert.ok(atlas.includes(claim), `Atlas current claim is missing: ${claim}`);
  }
});

test('worker topology contract rejects synthetic Playwright config drift', () => {
  const profile = loadDurationProfile();
  const guideSource = fs.readFileSync('docs/03-guides/e2e-test-guide.md', 'utf8');
  const driftedConfig = `export default defineConfig({
    workers: process.env.CI ? 3 : 1,
  });`;

  assert.throws(
    () => assertWorkerTopology({
      configSource: driftedConfig,
      profileWorkers: profile.source.workers,
      guideSource,
      shardCount: loadAuthoritativeE2eShardCoordinates().length,
    }),
    /CI Playwright workers must match duration-profile evidence/,
  );
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
  // [2026-09-01 3 → 2] 샤드 수는 러너 비용에 직결된다 — 샤드마다 스택을 통째로 다시 빌드하고
  //   그 오버헤드가 테스트 시간의 2.4배다(실측: 샤드당 243초 vs 82~100초). 이 단언이 matrix 를
  //   정확히 동결하므로, 수를 바꾸려면 required-checks 의 sourceMatrix·workers 와 함께 바꿔야 한다.
  assert.match(workflow, /^        shard: \[1\/2, 2\/2\]$/m);
  assert.match(workflow, /node \.\.\/scripts\/e2e-shard-plan\.mjs --shard "\$\{\{ matrix\.shard \}\}"/);
  assert.match(workflow, /npx playwright test --project=full-suite "\$\{E2E_SPECS\[@\]\}" --reporter=blob,line,json/);
  assert.match(workflow, /node \.\.\/scripts\/playwright-result-contract\.mjs --report "\$PLAYWRIGHT_JSON_OUTPUT_FILE" "\$\{E2E_SPECS\[@\]\}"/);
  assert.doesNotMatch(workflow, /playwright test[^\r\n]*--shard=\$\{\{ matrix\.shard \}\}/);
});
