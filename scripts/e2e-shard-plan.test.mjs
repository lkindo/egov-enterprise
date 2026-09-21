import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildDurationBalancedPlan,
  buildImpactShadowPlan,
  compareImpactShadow,
  discoverSpecs,
  durationProfileFreshness,
  loadDurationProfile,
  parseShard,
  resolveCiImpactPlan,
  routeBoundaryRisk,
  validateDurationProfile,
} from './e2e-shard-plan.mjs';

test('shadow maps online polls to their owner and leaves full execution authoritative', () => {
  const plan = buildImpactShadowPlan([{ status: 'M', path: 'frontend/src/app/admin/survey/polls/page.tsx' }]);
  assert.equal(plan.executes, 'full');
  assert.equal(plan.mode, 'shadow');
  assert.equal(plan.fullFallback, false);
  assert.ok(plan.selectedSpecs.includes('journeys/online-polls.spec.ts'));
  assert.ok(!plan.selectedSpecs.includes('journeys/operations-navigation.spec.ts'));
  for (const change of [
    { status: 'M', path: 'frontend/src/app/survey/page.tsx' },
    { status: 'M', path: 'frontend/src/app/components/ui/button.tsx' },
    { status: 'M', path: 'business-core/src/main/java/nuri/business/service/user/UserService.java' },
    { status: 'M', path: 'frontend/e2e/fixtures/api-test.ts' },
    { status: 'M', path: 'api-server/src/main/resources/db/migration/V999__fixture.sql' },
    { status: 'M', path: 'frontend/src/app/admin/user/UserOrgHubClient.tsx' },
    { status: 'M', path: 'frontend/src/app/admin/operation/rewards/layout.tsx' },
    { status: 'M', path: 'frontend/src/app/admin/operation/rewards/styles.css' },
    { status: 'M', path: 'frontend/e2e/journeys/rewards.spec.ts' },
    { status: 'A', path: 'frontend/src/app/admin/survey/polls/new.tsx' },
    { status: 'D', path: 'frontend/src/app/admin/survey/polls/page.tsx' },
    { status: 'R100', path: 'frontend/src/app/admin/survey/polls/page.tsx' },
  ]) {
    assert.deepEqual(buildImpactShadowPlan([change]).selectedSpecs, discoverSpecs());
  }
  assert.deepEqual(buildImpactShadowPlan([]).selectedSpecs, discoverSpecs());
});

test('shadow ownership drift and duplicate populations fail closed', () => {
  assert.throws(() => buildImpactShadowPlan([], ['one.spec.ts'], [{ prefixes: ['src/'], specs: ['missing.spec.ts'] }]), /existing nonempty/);
  assert.throws(() => buildImpactShadowPlan([], ['one.spec.ts', 'one.spec.ts'], []), /invalid E2E population/);
});

test('shadow comparison exposes deliberately omitted failures without enabling selection', () => {
  const plan = buildImpactShadowPlan([{ status: 'M', path: 'frontend/src/app/admin/survey/polls/page.tsx' }]);
  const report = { suites: [{ specs: [{ file: 'journeys/approvals.spec.ts', tests: [{ status: 'unexpected' }] }] }] };
  const comparison = compareImpactShadow(plan, report);
  assert.deepEqual(comparison.missedFailures, ['journeys/approvals.spec.ts']);
  assert.equal(comparison.detectionMissObserved, true);
  assert.equal(comparison.selectionReady, false);
  assert.equal(comparison.executes, 'full');
  assert.equal(compareImpactShadow(plan, { suites: [] }).selectionReady, false);
});

test('audited cross-route consumers are retained in the candidate population', () => {
  const cases = [
    ['admin/survey/hub/SurveyHubClient.tsx', ['journeys/online-polls.spec.ts']],
    ['admin/help/KnowledgeHubClient.tsx', ['journeys/help-content.spec.ts', 'journeys/community-navigation.spec.ts']],
    ['admin/community/boards/master/BoardMasterListClient.tsx', ['journeys/help-content.spec.ts', 'journeys/authentication.spec.ts', 'journeys/authorization.spec.ts']],
    ['approvals/ApprovalHubClient.tsx', ['journeys/approvals.spec.ts', 'journeys/public-navigation.spec.ts']],
    ['admin/workflow/WorkflowClient.tsx', ['journeys/workflow-demo.spec.ts', 'journeys/community-navigation.spec.ts']],
  ];
  for (const [file, owners] of cases) {
    const plan = buildImpactShadowPlan([{ status: 'M', path: `frontend/src/app/${file}` }]);
    for (const owner of owners) assert.ok(plan.selectedSpecs.includes(owner), `${file} must retain ${owner}`);
    for (const quality of discoverSpecs().filter(spec => spec.startsWith('quality/'))) assert.ok(plan.selectedSpecs.includes(quality));
    assert.ok(plan.selectedSpecs.includes('journeys/application-shell.spec.ts'));
  }
});

function isolatedPullRequest(t, { changedPath = 'frontend/src/app/admin/operation/rewards/page.tsx', consumer = '',
  consumerPath = 'frontend/src/components/consumer.ts',
  tsconfig = { compilerOptions: { paths: { '@/*': ['./src/*'] } } } } = {}) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-impact-git-'));
  const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const write = (name, value) => { const target = path.join(repoRoot, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
  t.after(() => {
    assert.ok(path.resolve(repoRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}e2e-impact-git-`));
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });
  git('init', '-b', 'main'); git('config', 'user.name', 'E2E Contract Fixture'); git('config', 'user.email', 'fixture@example.invalid');
  write('frontend/tsconfig.json', JSON.stringify(tsconfig));
  write(changedPath, 'export const value = 1;\n');
  write(consumerPath, consumer || 'export const independent = true;\n');
  git('add', '.'); git('commit', '-m', 'base fixture'); const base = git('rev-parse', 'HEAD');
  git('checkout', '-b', 'feature'); write(changedPath, 'export const value = 2;\n');
  git('add', '.'); git('commit', '-m', 'route fixture'); const head = git('rev-parse', 'HEAD');
  git('checkout', 'main'); git('merge', '--no-ff', 'feature', '-m', 'merge fixture'); const merge = git('rev-parse', 'HEAD');
  const eventPath = path.join(repoRoot, 'event.json');
  const event = { pull_request: { base: { sha: base }, head: { sha: head }, merge_commit_sha: merge } };
  fs.writeFileSync(eventPath, JSON.stringify(event));
  return { repoRoot, eventPath, event, git, write, changedPath, eventName: 'pull_request', githubSha: merge };
}

test('immutable PR merge selects owners and redistributes exactly those files over two shards', t => {
  const input = isolatedPullRequest(t);
  const selected = resolveCiImpactPlan(input);
  assert.equal(selected.mode, 'selected', selected.reasons.join('; '));
  assert.equal(selected.selectedSpecs.length, 10);
  assert.ok(selected.selectedSpecs.includes('journeys/rewards.spec.ts'));
  const shards = buildDurationBalancedPlan(loadDurationProfile(), 2, selected.selectedSpecs);
  assert.deepEqual(shards.flatMap(shard => shard.specs).sort(), selected.selectedSpecs);
  assert.ok(shards.every(shard => shard.specs.length > 0));
  assert.equal(new Set(shards.flatMap(shard => shard.specs)).size, selected.selectedSpecs.length);
});

test('push/manual/missing or forged event evidence cannot reduce execution', t => {
  const input = isolatedPullRequest(t);
  for (const eventName of ['push', 'workflow_dispatch', 'pull_request_target', '']) {
    assert.deepEqual(resolveCiImpactPlan({ ...input, eventName }).selectedSpecs, discoverSpecs());
  }
  assert.equal(resolveCiImpactPlan({ ...input, eventPath: 'missing-event.json' }).mode, 'full');
  assert.equal(resolveCiImpactPlan({ ...input, githubSha: 'f'.repeat(40) }).mode, 'full');
  assert.equal(resolveCiImpactPlan({ ...input, githubSha: '' }).mode, 'full');
  assert.equal(resolveCiImpactPlan({ ...input, githubSha: input.event.pull_request.head.sha }).mode, 'full');
  for (const mutate of [
    event => { event.pull_request.base.sha = 'f'.repeat(40); },
    event => { event.pull_request.head.sha = event.pull_request.base.sha; },
    event => { event.pull_request.base.sha = 'HEAD'; },
  ]) {
    const event = structuredClone(input.event); mutate(event); fs.writeFileSync(input.eventPath, JSON.stringify(event));
    assert.equal(resolveCiImpactPlan(input).mode, 'full');
  }
});

test('Actions merge SHA selects when the API mergeability field is null, absent or stale', t => {
  const input = isolatedPullRequest(t);
  for (const mergeCommitSha of [null, undefined, input.event.pull_request.head.sha]) {
    const event = structuredClone(input.event);
    event.pull_request.merge_commit_sha = mergeCommitSha;
    fs.writeFileSync(input.eventPath, JSON.stringify(event));
    const selected = resolveCiImpactPlan(input);
    assert.equal(selected.mode, 'selected', selected.reasons.join('; '));
    assert.equal(selected.checkoutSha, input.githubSha);
    assert.equal(selected.selectedSpecs.length, 10);
  }
});

test('an existing external consumer, including re-export/type/dynamic forms, forces full execution', t => {
  for (const consumer of [
    "export { value } from '@/app/admin/operation/rewards/page';",
    "export { value } from '@/app/admin/operation/./rewards/page';",
    "export { value } from '@/app/admin/operation/events/../rewards/page';",
    "import type { value } from '../app/admin/operation/rewards/page';",
    "const load = () => import('@/app/admin/operation/rewards/page');",
    "const selected = 'module'; const load = () => import(selected);",
  ]) {
    const input = isolatedPullRequest(t, { consumer });
    const plan = resolveCiImpactPlan(input);
    assert.equal(plan.mode, 'full', consumer);
    assert.match(plan.reasons[0], /external source consumer|computed source import/);
  }
});

test('only complete test-directory segments and test filename suffixes exclude source consumers', t => {
  const consumer = "export { value } from '@/app/admin/operation/rewards/page';";
  for (const [relative, mode] of [
    ['__tests__/consumer.ts', 'selected'],
    ['consumer.spec.ts', 'selected'],
    ['consumer.test.tsx', 'selected'],
    ['__tests__suffix/consumer.ts', 'full'],
    ['consumer.test.helper.ts', 'full'],
  ]) {
    const input = isolatedPullRequest(t, { consumer, consumerPath: `frontend/src/components/${relative}` });
    const plan = resolveCiImpactPlan(input);
    assert.equal(plan.mode, mode, relative);
    if (mode === 'full') assert.match(plan.reasons[0], /external source consumer/);
  }
});

test('the source-boundary audit fails closed for dirty source and unavailable resolution evidence', t => {
  const input = isolatedPullRequest(t);
  input.write(input.changedPath, 'export const value = 3;');
  assert.match(routeBoundaryRisk([{ path: input.changedPath }], input), /differ from/);
  input.git('checkout', '--', input.changedPath);
  input.write('frontend/src/untracked.ts', 'export const untracked = true;');
  assert.match(routeBoundaryRisk([{ path: input.changedPath }], input), /untracked/);
  input.write('frontend/tsconfig.json', '{invalid');
  assert.equal(resolveCiImpactPlan(input).mode, 'full');
});

test('empty baseUrl and inherited compiler configuration cannot hide external route consumers', t => {
  const compilerOptions = { paths: { '@/*': ['./src/*'] } };
  for (const config of [
    { compilerOptions: { ...compilerOptions, baseUrl: '' } },
    { compilerOptions: { ...compilerOptions, baseUrl: '.' } },
    { extends: './tsconfig-parent.json', compilerOptions },
    { extends: ['./tsconfig-parent.json'], compilerOptions },
  ]) {
    // This configuration and bare importer predate the PR: only the route is M.
    // A dirty-worktree or changed-config fallback must not conceal the regression.
    const input = isolatedPullRequest(t, { tsconfig: config,
      consumer: "export { value } from 'src/app/admin/operation/rewards/page';" });
    assert.equal(routeBoundaryRisk([{ path: input.changedPath }], input), 'unrecognized source import configuration');
    assert.equal(resolveCiImpactPlan(input).mode, 'full');
  }
});

test('unknown/backend paths and added or removed files keep the complete PR population', t => {
  for (const changedPath of ['frontend/src/components/shared.tsx', 'business-core/src/main/java/Example.java']) {
    const input = isolatedPullRequest(t, { changedPath });
    assert.equal(resolveCiImpactPlan(input).mode, 'full');
  }
  const input = isolatedPullRequest(t);
  for (const status of ['A', 'D', 'R100', 'T', 'U']) {
    assert.equal(buildImpactShadowPlan([{ status, path: input.changedPath }]).fullFallback, true);
  }
});

test('selected population rejects empty, duplicate and unknown files instead of dropping them', () => {
  const profile = loadDurationProfile();
  for (const selected of [[], ['journeys/rewards.spec.ts', 'journeys/rewards.spec.ts'], ['missing.spec.ts']]) {
    assert.throws(() => buildDurationBalancedPlan(profile, 2, selected), /invalid selected/);
  }
});

test('existing documentation fast-path accompanies route selection without exempting policy or code changes', () => {
  const route = { status: 'M', path: 'frontend/src/app/admin/operation/rewards/page.tsx' };
  const expected = buildImpactShadowPlan([route]).selectedSpecs;
  for (const status of ['M', 'A', 'D']) {
    for (const file of ['docs/03-guides/testing-guide.md', '.agent/memory/known-gaps.md']) {
      assert.deepEqual(buildImpactShadowPlan([route, { status, path: file }]).selectedSpecs, expected);
      assert.equal(buildImpactShadowPlan([{ status, path: file }]).fullFallback, true);
    }
  }
  for (const file of ['AGENTS.md', 'docs/03-guides/orchestration-protocol.md', '.agent/knowledge/frontend-ux-constitution/artifacts/constitution.md']) {
    assert.equal(buildImpactShadowPlan([route, { status: 'M', path: file }]).fullFallback, true);
  }
});

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
  assert.ok(guideSource.includes(`로컬은 격리 스택의 자원 사용을 제한하기 위해 ${workers.local} 유지`));
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
  assertAtlasShardClaims(atlas, shardCount);
});

function assertAtlasShardClaims(html, expected) {
  const embedded = html.match(/<script\b[^>]*id="atlas-catalog-data"[^>]*>([\s\S]*?)<\/script>/);
  assert.ok(embedded, 'Atlas source catalog must be embedded');
  assert.equal(JSON.parse(embedded[1]).facts.e2eShardCount, expected);
  const claims = [...html.matchAll(/<span\b[^>]*data-fact="e2eShardCount"[^>]*>([^<]*)<\/span>/g)];
  assert.ok(claims.length > 0, 'Atlas must display its shard count');
  for (const [, count] of claims) assert.equal(Number(count), expected, 'Every visible shard claim must match the manifest');
}

test('Atlas shard binding rejects one stale duplicate even when another is correct', () => {
  const header = '<script id="atlas-catalog-data" type="application/json">{"facts":{"e2eShardCount":2}}</script>';
  const correct = '<span data-fact="e2eShardCount">2</span>';
  assertAtlasShardClaims(header + correct + correct, 2);
  assert.throws(() => assertAtlasShardClaims(header + correct + '<span data-fact="e2eShardCount">3</span>', 2));
  assert.throws(() => assertAtlasShardClaims(header + correct, 3));
  assert.throws(() => assertAtlasShardClaims(header, 2));
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
  delete profile.durationsMs[discoverSpecs()[0]];
  profile.durationsMs['removed.spec.ts'] = 1000;
  profile.durationsMs[discoverSpecs()[1]] = 0;
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
    ['capturedAt', '2026-02-30T00:00:00Z', /capturedAt.*valid ISO/],
    ['capturedAt', '2026-02-28T24:00:00Z', /capturedAt.*valid ISO/],
    ['capturedAt', '2026-08-20T00:00:00Z', /capturedAt.*future/],
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
    // 누락 spec 검증과 미래 시각 검증을 독립적으로 재현한다.
    assert.match(
      validateDurationProfile(profile, specs, Date.parse('2026-08-19T12:00:00Z')).join('\n'),
      /nested\/admin\/user\.spec\.ts/,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('120-day age requests remeasurement without disabling planning, including the actual clock boundary', (t) => {
  const profile = loadDurationProfile();
  const boundary = Date.parse(profile.source.capturedAt) + 120 * 86_400_000;
  t.mock.timers.enable({ apis: ['Date'], now: boundary });
  assert.equal(durationProfileFreshness(profile).freshness, 'due-soon');
  const plan = buildDurationBalancedPlan(profile, 2);
  t.mock.timers.tick(1);
  assert.equal(durationProfileFreshness(profile).freshness, 'overdue');
  assert.deepEqual(buildDurationBalancedPlan(profile, 2), plan);
  t.mock.timers.tick(3650 * 86_400_000);
  assert.deepEqual(validateDurationProfile(profile), []);
  assert.deepEqual(buildDurationBalancedPlan(profile, 2), plan);
  const invalid = structuredClone(profile);
  delete invalid.durationsMs[Object.keys(invalid.durationsMs)[0]];
  assert.throws(() => buildDurationBalancedPlan(invalid, 2), /missing duration/);
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
  assert.match(workflow, /node \.\.\/scripts\/e2e-shard-plan\.mjs --shard "\$\{\{ matrix\.shard \}\}" --ci --plan-output \/tmp\/e2e-impact-plan\.json/);
  assert.match(workflow, /node \.\.\/scripts\/run-isolated-e2e\.mjs --ci-compose --full-inventory -- --project=api-contract --project=full-suite "\$\{E2E_SPECS\[@\]\}" --reporter=blob,line,json/);
  assert.match(workflow, /node \.\.\/scripts\/playwright-result-contract\.mjs --report "\$PLAYWRIGHT_JSON_OUTPUT_FILE" --inventory \/tmp\/e2e-inventory\.json "\$\{E2E_SPECS\[@\]\}" --ci-shard "\$\{\{ matrix\.shard \}\}"/);
  assert.doesNotMatch(workflow, /playwright test[^\r\n]*--shard=\$\{\{ matrix\.shard \}\}/);
});
