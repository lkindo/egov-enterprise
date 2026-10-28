import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { presetIds } from './composition-profiles.mjs';

import {
  comparePullRequestPolicy,
  compareRequiredChecks,
  compareRequiredContexts,
  GITLEAKS_SCAN_STEP,
  GRADLE_CACHE_READ_ONLY,
  gitleaksDownloadViolations,
  parseWorkflowJobs,
  REVIEWED_ACTION_PINS,
  reviewedActionPin,
  validatePinnedWorkflowUses,
  validateStaticContract,
} from './required-checks-contract.mjs';
import { validateDependencySubmissionContract } from './dependency-submission-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, '.github', 'required-checks.json'), 'utf8'));
const ciContent = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
const expectedContexts = manifest.requiredChecks.map(({ context }) => context);

function mutateWorkflowJob(content, jobId, mutate) {
  const normalized = content.replace(/\r\n/g, '\n');
  const jobBlock = parseWorkflowJobs(normalized).get(jobId);
  assert.ok(jobBlock, `${jobId} job must exist in the fixture`);
  return normalized.replace(jobBlock, mutate(jobBlock));
}

function workflowStep(jobBlock, name) {
  const marker = `      - name: ${name}`;
  const start = jobBlock.indexOf(marker);
  if (start < 0) return '';
  const next = jobBlock.indexOf('\n      - ', start + marker.length);
  return jobBlock.slice(start, next < 0 ? jobBlock.length : next);
}

function assertImpactClassification(content) {
  const job = parseWorkflowJobs(content).get('change-scope') ?? '';
  const step = workflowStep(job, 'Classify changed paths (unknown means full pipeline)');
  assert.match(step, /BASE="\$PUSH_BASE_SHA"/);
  assert.match(step, /HEAD="\$GITHUB_SHA"/);
  assert.match(step, /if \[ -z "\$BASE" \]/);
  assert.match(step, /git cat-file -e "\$\{BASE\}\^\{commit\}"/);
  assert.match(step, /node scripts\/ci-change-scope\.mjs --event "\$GITHUB_EVENT_NAME" --github-output "\$GITHUB_OUTPUT"/);
  // ADR-0027: 분류기 호출마다 이벤트를 넘긴다. 빠지면 그 경로의 PR 은 조용히 두 레이아웃으로 돈다.
  assert.deepEqual(classifierEventBindings(step), [true, true, true],
    'every classifier call must pass the event so that only pull requests narrow the reusable layouts');
  assert.ok(step.includes('elif [ "$GITHUB_EVENT_NAME" = "push" ] && ! git merge-base --is-ancestor "$BASE" "${HEAD:-$GITHUB_SHA}"; then'));
  assert.match(step, /--base "\$BASE"/);
  assert.match(step, /--head "\$\{HEAD:-\$GITHUB_SHA\}"/);
  assert.doesNotMatch(step, /--full|refs\/heads\/main|refs\/heads\/master/,
    'integration pushes must use the same impact mapping as PRs');
  assert.doesNotMatch(step, /^ {8}(?:if|continue-on-error):/m);
  // [2026-09-30] push base 가 자기 main CI 실행을 갖지 못하면 diff 를 믿지 않고 전수로 바꾼다(dropped push event).
  assert.ok(step.includes('if [ "$GITHUB_EVENT_NAME" = "push" ]; then VERIFY_BASE=(--verify-push-base-run); fi'),
    'integration pushes must verify that the base commit had its own main CI run');
  assert.ok(step.includes('"${VERIFY_BASE[@]}" \\'), 'the push base verification flag must reach the classifier');
  assert.ok(step.includes('GH_TOKEN: ${{ github.token }}'), 'the classifier needs the job token to read runs');
  assert.match(job, /\n {4}permissions:\r?\n {6}contents: read\r?\n {6}actions: read\r?\n/,
    'change-scope needs actions:read to confirm the base run');
}

function assertE2eImageBuild(content) {
  const job = parseWorkflowJobs(content).get('e2e-tests') ?? '';
  const build = workflowStep(job, 'Build API image');
  const start = workflowStep(job, 'Start Docker Infrastructure (DB & API)');
  assert.match(job, /^ {6}API_IMAGE_REF: egov-enterprise-api:e2e$/m);
  assert.match(job, /uses: docker\/setup-buildx-action@[0-9a-f]{40}/);
  assert.match(build, /uses: docker\/build-push-action@[0-9a-f]{40}/);
  for (const [key, value] of [
    ['context', '.'],
    ['file', 'api-server/Dockerfile'],
    ['load', 'true'],
    ['push', 'false'],
    ['tags', '${{ env.API_IMAGE_REF }}'],
    ['cache-from', 'type=gha,scope=e2e-api'],
    ['cache-to', "${{ strategy.job-index == 0 && 'type=gha,scope=e2e-api,mode=max,ignore-error=true' || '' }}"],
  ]) {
    assert.ok(build.split('\n').includes(`          ${key}: ${value}`), `E2E API build must bind ${key}: ${value}`);
  }
  assert.doesNotMatch(build, /^ {8}(?:if|continue-on-error):/m,
    'cache export is optional; the actual image build must fail the job');
  assert.match(start, /docker compose up --no-build -d db api/,
    'Compose must consume the image that Buildx loaded rather than rebuild it');
}

// [2026-10-24] Playwright 시스템 패키지(.deb) 캐시: 복원은 모든 실행, 저장은 main 첫 샤드만. 경로·키가 어긋나면 소리 없이 영영
//   미적중이고, 적중·미적중 상한이 뒤집히거나 판정 줄의 id 가 틀리면 인프라 실패를 구별하지 못한다.
function assertE2eSystemPackageCache(content) {
  const job = (parseWorkflowJobs(content.replace(/\r\n/g, '\n')).get('e2e-tests') ?? '');
  const restore = workflowStep(job, 'Restore Playwright system packages');
  const seed = workflowStep(job, 'Seed apt archive with restored Playwright packages');
  const collect = workflowStep(job, 'Collect Playwright system packages for the main cache');
  const save = workflowStep(job, 'Save Playwright system packages (main only)');
  const browsers = workflowStep(job, 'Install Playwright Browsers');
  const deps = workflowStep(job, 'Install Playwright Dependencies (system deps)');
  const diagnostics = workflowStep(job, 'Surface failure detail (annotations)');
  const input = (step, key) => step.match(new RegExp(`^ {10}${key}: (.+)$`, 'm'))?.[1];
  assert.match(restore, /uses: actions\/cache\/restore@[0-9a-f]{40}/);
  assert.match(save, /uses: actions\/cache\/save@[0-9a-f]{40}/);
  const cacheDir = '${{ runner.temp }}/playwright-debs';
  assert.ok(input(restore, 'path') === cacheDir && input(save, 'path') === cacheDir && input(save, 'key') === input(restore, 'key'),
    'restore and save must share path and key (the cache version is computed from the path)');
  // 복원한 디렉터리를 apt 저장소로 옮기고(seed), 설치 뒤 같은 디렉터리로 모은다(collect) — 셋 중 하나만 어긋나도 영영 미적중이다.
  assert.ok(seed, 'restored packages must be seeded into the apt archive');
  assert.ok(seed.includes('debs=("$RUNNER_TEMP"/playwright-debs/*.deb)') && seed.includes('/var/cache/apt/archives/'),
    'the seed step must copy the restored directory into the apt archive');
  assert.ok(collect.includes('cp -- "${debs[@]}" "$RUNNER_TEMP/playwright-debs/"'), 'the collect step must fill the saved directory');
  const at = name => job.indexOf(`name: ${name}`);
  const seedAt = at('Seed apt archive with restored Playwright packages');
  assert.ok(seedAt >= 0 && seedAt < at('Install Playwright Browsers'),
    'restored packages must be seeded before any apt install');
  // cache-hit 는 정확한 키에서만 참이다 — 그 조건이면 restore-keys 로 받은 부분 적중에서 seed 가 빠진다.
  assert.match(seed, /^ {8}if: steps\.e2e-apt-restore\.outputs\.cache-matched-key != ''$/m,
    'restored packages must be seeded on any matched key, including restore-keys');
  // 모으기·저장은 두 설치 스텝 뒤다 — 앞이면 미적중 main 실행에서 0개라 캐시가 영영 비어 있다.
  const collectAt = at('Collect Playwright system packages for the main cache');
  assert.ok(collectAt > at('Install Playwright Browsers') && collectAt > at('Install Playwright Dependencies (system deps)')
    && at('Save Playwright system packages (main only)') > collectAt, 'packages are collected after apt installs them');
  // 조건 줄 전체를 고정한다 — 접두만 보면 끝에 `|| github.event_name == 'pull_request'` 를 붙여도 통과한다(&& 가 먼저 묶인다).
  assert.match(collect, /^ {8}if: github\.event_name == 'push' && github\.ref == 'refs\/heads\/main' && strategy\.job-index == 0 && steps\.e2e-apt-restore\.outputs\.cache-hit != 'true'$/m,
    'system packages are written only from main pushes');
  assert.match(save, /^ {8}if: steps\.e2e-apt-collect\.outputs\.count != '' && steps\.e2e-apt-collect\.outputs\.count != '0'$/m,
    'only the main-only collect step can feed the save step');
  const minutes = step => Number(step.match(/^ {8}timeout-minutes: (\d+)$/m)?.[1]);
  assert.equal(minutes(deps), 15, 'the hit path bound covers the slow mirror (about 30kB/s for 25.9MB)');
  assert.ok(minutes(browsers) >= minutes(deps), 'the miss path must be at least the hit path');
  for (const [id, label, env] of [['e2e-pw-browsers', 'pw-browsers', 'PW_BROWSERS'], ['e2e-pw-deps', 'pw-deps', 'PW_DEPS']]) {
    assert.match(job, new RegExp(`^ {8}id: ${id}$`, 'm'));
    assert.ok(diagnostics.includes(`/ ${label}=\${{ steps.${id}.outcome }}`), `the failed-step verdict must show ${label}`);
    assert.ok(diagnostics.split('\n').includes(`          ${env}: \${{ steps.${id}.outcome }}`), `the infra verdict must read ${id}`);
  }
  // 판정 사슬의 가운데 줄 — env 와 패턴만 고정하면 주어 오타로 판정이 다시는 나오지 않는다.
  assert.ok(diagnostics.split('\n').includes('          case "$PW_BROWSERS/$PW_DEPS" in'), 'the infra verdict must branch on both install outcomes');
  // 스텝 시간 초과는 failure 로 남는다. cancelled(새 push·잡 상한)는 인프라 실패로 세지 않는다.
  assert.ok(diagnostics.includes('            failure/*|*/failure)\n              echo "::error title=E2E 인프라 실패::kind=playwright-install'),
    'install failures must be told apart from test failures');
  assert.ok(diagnostics.includes('            cancelled/*|*/cancelled)\n              echo "::error title=E2E 설치 중 취소::'),
    'a cancelled install is not an infrastructure failure');
}

// 제품 PIT 범위 수는 원장(gates.json matrixScopes 의 mutation-scope 소유 항목)에서 센다. 범위 수를 못 박는 곳은
// governance-gates-contract.test.mjs 한 곳이고, 원장과 ci.yml 의 양방향 대조는 governance-gates-contract.mjs 가 한다.
const PRODUCT_PIT_SCOPE_COUNT = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'governance', 'gates.json'), 'utf8'))
  .gateSets.find(({ id }) => id === 'GATESET-PIT-MUTATION-AGGREGATE')
  .selector.matrixScopes.filter(({ job }) => job === 'mutation-scope').length;

// [2026-10-29 ADR-0044] PIT·정적 분석의 동시 수와 PIT 선언 순서는 검증 강도가 아닌 벽시계 튜닝값이다. 값의 정본은 ci.yml(주석의
// 실측 근거)과 실측 profile 이고, 바꾸면 PR 설명에 실측 run id 를 남긴다. 계약은 정확한 값 대신 다음만 본다: max-parallel 이
// 한 번 선언된 양의 정수인가(빠지거나 0·주석 처리면 무제한 입장이나 실행 불가가 된다), 선언 순서가 profile 의 긴 순서인가.
const THROTTLED_MATRIX_JOBS = Object.freeze(['mutation-scope', 'mutation-scope-migration', 'sast-scope']);
const PIT_DURATION_PROFILE = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config', 'pit-duration-profile.json'), 'utf8'));

function assertPositiveRunnerSlots(content, jobId) {
  const job = parseWorkflowJobs(content).get(jobId) ?? '';
  const declared = job.match(/^ {6}max-parallel:.*$/gm) ?? [];
  assert.equal(declared.length, 1, `${jobId} must declare max-parallel exactly once`);
  assert.match(declared[0], /^ {6}max-parallel: [1-9][0-9]*$/, `${jobId} max-parallel must be a positive integer`);
}

function assertProductMutationConcurrency(content) {
  const jobs = parseWorkflowJobs(content);
  const product = jobs.get('mutation-scope') ?? '';
  const migration = jobs.get('mutation-scope-migration') ?? '';
  assertPositiveRunnerSlots(content, 'mutation-scope');
  assert.ok(PRODUCT_PIT_SCOPE_COUNT > 0, 'the registry declares product PIT batches');
  assert.equal([...product.matchAll(/^ {10}- scope: \S+$/gm)].length, PRODUCT_PIT_SCOPE_COUNT,
    'every product PIT batch declared in the registry must remain');
  for (const job of [product, migration]) assert.match(job, /^ {4}needs: \[change-scope\]$/m);
}

function assertRunnerAdmissionControl(content) {
  const jobs = parseWorkflowJobs(content);
  for (const jobId of THROTTLED_MATRIX_JOBS) assertPositiveRunnerSlots(content, jobId);
  const reusable = jobs.get('reusable-base') ?? '';
  assert.match(reusable, /^ {4}needs: \[change-scope, frontend-scope\]$/m,
    'reusable-base must wait until frontend production releases its runner');
  assert.match(reusable,
    /^ {4}if: "!cancelled\(\) && needs\.change-scope\.result == 'success' && needs\.change-scope\.outputs\.reusable == 'true'"$/m,
    'frontend failure or skip must not silently suppress selected reusable validation');
  assert.equal(reusable.match(/^ {6}max-parallel:.*$/gm), null,
    'all selected reusable profiles must start together once admitted');
  // ADR-0027: custom 두 layout 은 분류 직후의 빈 runner 를 쓴다. backend 뒤로 되돌리면 PR 의 마지막 잡이 된다.
  const custom = jobs.get('reusable-custom') ?? '';
  assert.match(custom, /^ {4}needs: \[change-scope\]$/m,
    'reusable-custom must enter the idle runners right after classification');
}

// PIT 행렬의 범위 집합이 profile 의 범위 집합과 같고, 선언 순서가 profile 의 job 시간이 긴 범위부터인가(같은 값은 어느 순서든 된다).
function assertMutationOrderMatchesProfile(content, jobId, profile = PIT_DURATION_PROFILE) {
  const job = parseWorkflowJobs(content).get(jobId) ?? '';
  const scopes = [...job.matchAll(/^ {10}- scope: (\S+)$/gm)].map(match => match[1]);
  const runIds = profile?.source?.runIds;
  assert.ok(Array.isArray(runIds) && runIds.length > 0 && runIds.every(id => Number.isSafeInteger(id) && id > 0),
    'the PIT duration profile must name the measured run ids');
  const measured = profile?.jobs?.[jobId] ?? {};
  assert.deepEqual([...scopes].sort(), Object.keys(measured).sort(),
    `${jobId}: every PIT scope must have exactly one measured duration in the profile`);
  for (const [scope, seconds] of Object.entries(measured)) {
    assert.ok(Number.isFinite(seconds) && seconds > 0, `${jobId}: measured duration of ${scope} must be positive`);
  }
  const contradiction = scopes.findIndex((scope, index) => index > 0 && measured[scopes[index - 1]] < measured[scope]);
  assert.equal(contradiction, -1,
    `${jobId}: declaration order must follow the measured profile longest first (${scopes[contradiction - 1]} before ${scopes[contradiction]})`);
}

const baselineRunner = 'node ../scripts/run-isolated-e2e.mjs --ci-compose -- --project=full-suite e2e/quality/visual-baselines.spec.ts -g "Visual Regression Baseline" --update-snapshots';
const baselineResultGate = 'node ../scripts/playwright-result-contract.mjs --report /tmp/e2e-results.json --inventory /tmp/e2e-inventory.json e2e/quality/visual-baselines.spec.ts';

function assertBaselineResultGate(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const job = parseWorkflowJobs(normalized).get('update-baseline') ?? '';
  const regenerate = workflowStep(job, 'Regenerate baselines (--update-snapshots)');
  const commit = workflowStep(job, 'Commit baselines to current branch');
  const run = /^ {8}run: \|\n((?: {10}[^\n]*(?:\n|$))+)/m.exec(regenerate)?.[1];
  assert.deepEqual(run?.trim().split('\n').map(line => line.trim()),
    ['set -euo pipefail', baselineRunner, baselineResultGate],
    'baseline regeneration must validate its exact discovery/results before continuing');
  assert.match(regenerate, /^ {8}working-directory: frontend$/m);
  assert.doesNotMatch(regenerate, /^ {8}(?:if|continue-on-error|shell):/m);
  assert.doesNotMatch(job, /^ {4}(?:if|continue-on-error|defaults):/m);
  assert.doesNotMatch(normalized, /^defaults:/m);
  assert.ok(commit && job.indexOf(regenerate) < job.indexOf(commit), 'result verification must precede baseline commit');
  assert.match(commit, /^ {8}if: \$\{\{ inputs\.commit \}\}$/m,
    'baseline publication must retain the implicit success condition');
}

test('visual baseline publication requires successful inventory/result verification after regeneration', () => {
  const content = fs.readFileSync(path.join(repoRoot, '.github/workflows/update-visual-baseline.yml'), 'utf8');
  assertBaselineResultGate(content);
});

test('visual baseline result verification cannot be skipped, echoed, reordered or made advisory', () => {
  const content = fs.readFileSync(path.join(repoRoot, '.github/workflows/update-visual-baseline.yml'), 'utf8').replace(/\r\n/g, '\n');
  const regenerateMarker = '      - name: Regenerate baselines (--update-snapshots)\n';
  for (const [label, from, to] of [
    ['deleted', `          ${baselineResultGate}\n`, ''],
    ['echoed', baselineResultGate, `echo ${baselineResultGate}`],
    ['commented', baselineResultGate, `# ${baselineResultGate}`],
    ['swallowed', baselineResultGate, `${baselineResultGate} || true`],
    ['reordered', `${baselineRunner}\n          ${baselineResultGate}`, `${baselineResultGate}\n          ${baselineRunner}`],
    ['early success', baselineRunner, `exit 0\n          ${baselineRunner}`],
    ['step advisory', regenerateMarker, `${regenerateMarker}        continue-on-error: true\n`],
    ['step skipped', regenerateMarker, `${regenerateMarker}        if: false\n`],
    ['step shell', regenerateMarker, `${regenerateMarker}        shell: echo {0}\n`],
    ['job advisory', '  update-baseline:\n', '  update-baseline:\n    continue-on-error: true\n'],
    ['default shell', 'jobs:\n', 'defaults:\n  run:\n    shell: echo {0}\njobs:\n'],
    ['commit after failure', 'if: ${{ inputs.commit }}', 'if: ${{ always() && inputs.commit }}'],
  ]) {
    const changed = content.replace(from, to);
    assert.notEqual(changed, content, `${label} must mutate the actual workflow`);
    assert.throws(() => assertBaselineResultGate(changed), undefined, label);
  }
});

test('manifest intentionally names six stable enforced merge checks', () => {
  assert.deepEqual(expectedContexts, [
    'backend-build',
    'frontend-build',
    'secret-scan',
    'e2e-test',
    'mutation-test',
    'secure-coding',
  ]);
});

test('repository required-check manifest maps every exact context to a real CI job and matrix value', () => {
  assert.deepEqual(validateStaticContract({ manifest, ciContent }), []);
});

test('exact six-context ruleset satisfies the contract', () => {
  assert.deepEqual(compareRequiredContexts(expectedContexts, expectedContexts), []);
});

test('required contexts must originate from the pinned GitHub Actions integration', () => {
  const actual = expectedContexts.map(context => ({ context, integrationId: manifest.integrationId }));
  assert.deepEqual(compareRequiredChecks(expectedContexts, actual, manifest.integrationId), []);

  actual[3].integrationId = null;
  assert.match(
    compareRequiredChecks(expectedContexts, actual, manifest.integrationId).join('\n'),
    /e2e-test.*integration 15368/i,
  );
});

test('missing mutation aggregate is rejected', () => {
  const actual = expectedContexts.filter(context => context !== 'mutation-test');
  assert.match(compareRequiredContexts(expectedContexts, actual).join('\n'), /missing.*mutation-test/i);
});

test('missing stable E2E aggregate is rejected', () => {
  const actual = expectedContexts.filter(context => context !== 'e2e-test');
  assert.match(compareRequiredContexts(expectedContexts, actual).join('\n'), /missing.*e2e-test/i);
});

test('unexpected required context is rejected as ruleset drift', () => {
  const actual = [...expectedContexts, 'legacy-check'];
  assert.match(compareRequiredContexts(expectedContexts, actual).join('\n'), /unexpected.*legacy-check/i);
});

test('unknown required job and detached E2E aggregate source are rejected', () => {
  const broken = structuredClone(manifest);
  broken.requiredChecks[0].jobId = 'missing-job';
  broken.requiredChecks[3].aggregate.sourceJobId = 'missing-e2e-job';

  const errors = validateStaticContract({ manifest: broken, ciContent }).join('\n');
  assert.match(errors, /missing-job/);
  assert.match(errors, /missing-e2e-job/);
});

test('duplicate contexts are rejected before GitHub comparison', () => {
  const broken = structuredClone(manifest);
  broken.requiredChecks.push(structuredClone(broken.requiredChecks[0]));

  assert.match(validateStaticContract({ manifest: broken, ciContent }).join('\n'), /duplicate.*backend-build/i);
});

test('job-level name override cannot silently change a required check context', () => {
  const renamed = ciContent.replace(
    /  backend-build:\r?\n/,
    '  backend-build:\n    name: renamed-backend-check\n',
  );

  assert.match(validateStaticContract({ manifest, ciContent: renamed }).join('\n'), /name.*backend-build/i);
});

test('E2E aggregate remains bound to the fail-closed source condition and real runner step', () => {
  const detachedCondition = ciContent.replace(
    /(  e2e-tests:\r?\n[\s\S]*?\r?\n)    if: [^\r\n]*/,
    '$1    if: true',
  );
  assert.notEqual(detachedCondition, ciContent, 'negative fixture must replace the real E2E condition');
  assert.match(
    validateStaticContract({ manifest, ciContent: detachedCondition }).join('\n'),
    /e2e-tests.*fail-closed scope condition/i,
  );

  const detachedRunner = ciContent.replace(
    'node ../scripts/run-isolated-e2e.mjs --ci-compose --full-inventory -- --project=api-contract --project=full-suite "${E2E_SPECS[@]}" --reporter=blob,line,json 2>&1 | tee /tmp/e2e-run.log',
    'echo skipped-e2e',
  );
  assert.notEqual(detachedRunner, ciContent);
  assert.match(
    validateStaticContract({ manifest, ciContent: detachedRunner }).join('\n'),
    /source step.*must run/i,
  );

  const detachedResultContract = ciContent.replace(
    'node ../scripts/playwright-result-contract.mjs --report "$PLAYWRIGHT_JSON_OUTPUT_FILE" --inventory /tmp/e2e-inventory.json "${E2E_SPECS[@]}" --ci-shard "${{ matrix.shard }}"',
    'echo skipped-result-contract',
  );
  assert.notEqual(detachedResultContract, ciContent);
  assert.match(
    validateStaticContract({ manifest, ciContent: detachedResultContract }).join('\n'),
    /source step.*must run/i,
  );
});

test('unexpected job-level condition is rejected for required checks', () => {
  const conditional = ciContent.replace(
    /  backend-build:\r?\n/,
    '  backend-build:\n    if: false\n',
  );

  assert.match(validateStaticContract({ manifest, ciContent: conditional }).join('\n'), /job-level if.*backend-build/i);
});

test('required jobs cannot weaken failures with job-level continue-on-error', () => {
  const weakened = ciContent.replace(
    /  backend-build:\r?\n/,
    '  backend-build:\n    continue-on-error: true\n',
  );

  assert.match(
    validateStaticContract({ manifest, ciContent: weakened }).join('\n'),
    /continue-on-error.*backend-build/i,
  );
});

test('mutation aggregate keeps its always condition so failures become a completed required check', () => {
  const conditional = ciContent.replace(
    /  mutation-test:\r?\n    needs: \[change-scope, mutation-scope, mutation-scope-migration\]\r?\n    if: always\(\)/,
    '  mutation-test:\n    needs: [change-scope, mutation-scope, mutation-scope-migration]\n    if: success()',
  );

  assert.match(validateStaticContract({ manifest, ciContent: conditional }).join('\n'), /job-level if.*mutation-test/i);
});


test('a scope condition cannot reference a classifier output that is never declared', () => {
  // [DEC-OPS-104] 출력 선언만 지우면 조건이 영구 거짓이 되어 그 잡이 초록인 채로 영영 안 돈다.
  //   조건 문자열은 그대로라 잡 조건 대조로는 잡히지 않는다 — 선언 자체를 확인해야 한다.
  const undeclared = ciContent.replace(
    /\n {6}mutation-migration-tool: \$\{\{ steps\.scope\.outputs\.mutation_migration_tool \}\}/,
    '',
  );
  assert.notEqual(undeclared, ciContent.replace(/\r\n/g, '\n'), 'negative fixture must change the workflow');
  assert.match(validateStaticContract({ manifest, ciContent: undeclared }).join('\n'),
    /change-scope must declare output .mutation-migration-tool./i);
});

test('PIT source jobs keep fail-fast disabled so one broken scope cannot cancel the rest', () => {
  // [DEC-OPS-104] 두 잡 모두에 적용된다 — 한쪽만 되돌려도 red 여야 한다.
  for (const jobId of ['mutation-scope', 'mutation-scope-migration']) {
    const cancelled = mutateWorkflowJob(ciContent, jobId,
      block => block.replace('      fail-fast: false', '      fail-fast: true'));
    assert.match(validateStaticContract({ manifest, ciContent: cancelled }).join('\n'),
      new RegExp(`${jobId} strategy must keep fail-fast: false`));
  }
});

test('a second aggregate source is validated with the same strictness as the first', () => {
  // [DEC-OPS-104] 새 소스 잡을 needs 에만 달고 매니페스트 소스로 등록하지 않으면 그 잡은 무검사가 된다.
  assert.deepEqual(validateStaticContract({ manifest, ciContent }), []);

  // (a) 두 번째 소스의 STRICT_MUTATION 을 빼면 red — 한쪽만 느슨해지는 경로를 막는다.
  const weakStrict = mutateWorkflowJob(ciContent, 'mutation-scope-migration',
    block => block.replace('          STRICT_MUTATION: "true"\n', ''));
  assert.match(validateStaticContract({ manifest, ciContent: weakStrict }).join('\n'),
    /env keys must exactly match|STRICT_MUTATION/i);
  // (a') 범위 하한을 넘기는 줄을 빼면 빈 값이 build.gradle 에서 헌법 하한 75 가 된다 — 두 소스 모두 red(ADR-0044).
  for (const jobId of ['mutation-scope', 'mutation-scope-migration']) {
    const unfloored = mutateWorkflowJob(ciContent, jobId,
      block => block.replace('          PIT_MUTATION_THRESHOLD: ${{ matrix.threshold }}\n', ''));
    assert.notEqual(unfloored, ciContent.replace(/\r\n/g, '\n'));
    assert.match(validateStaticContract({ manifest, ciContent: unfloored }).join('\n'),
      /aggregate source step 'Mutation Test \(\$\{\{ matrix\.scope \}\}\)' env keys must exactly match the manifest/, jobId);
  }

  // (b) 두 번째 소스 잡이 통째로 사라지면 red.
  const withoutJob = ciContent.replace(/\n  mutation-scope-migration:\r?\n[\s\S]*?(?=\n  [a-z][a-z0-9-]*:\r?\n)/, '');
  assert.match(validateStaticContract({ manifest, ciContent: withoutJob }).join('\n'),
    /source job .mutation-scope-migration. for .mutation-test. does not exist/i);

  // (c) 두 번째 소스의 잡 조건을 좁힘 출력에서 떼면 red — 이관 뮤테이션이 조용히 영구 미실행이 된다.
  const detachedScope = mutateWorkflowJob(ciContent, 'mutation-scope-migration',
    block => block.replace("needs.change-scope.outputs['mutation-migration-tool'] == 'true'",
      "needs.change-scope.outputs.mutation == 'true'"));
  assert.match(validateStaticContract({ manifest, ciContent: detachedScope }).join('\n'),
    /must retain its fail-closed scope condition/i);
});

test('an aggregate source list cannot be emptied or duplicated into a vacuous pass', () => {
  // 빈 배열은 "소스를 한 번도 돌지 않는" 무검사 통과가 된다 — 루프 일반화의 전형적 약화다.
  const empty = structuredClone(manifest);
  empty.requiredChecks[4].aggregate = [];
  assert.match(validateStaticContract({ manifest: empty, ciContent }).join('\n'),
    /must declare at least one source/i);

  // 결과 스텝 이름이 겹치면 검증기가 한쪽만 보고 나머지 소스를 놓친다.
  const duplicated = structuredClone(manifest);
  duplicated.requiredChecks[4].aggregate[1].aggregateStepName
    = duplicated.requiredChecks[4].aggregate[0].aggregateStepName;
  assert.match(validateStaticContract({ manifest: duplicated, ciContent }).join('\n'),
    /reuses result step/i);

  // 같은 소스 잡을 두 번 선언하는 것도 red 다.
  const twice = structuredClone(manifest);
  twice.requiredChecks[4].aggregate[1].sourceJobId
    = twice.requiredChecks[4].aggregate[0].sourceJobId;
  assert.match(validateStaticContract({ manifest: twice, ciContent }).join('\n'),
    /declares source job .* twice/i);
});
test('workflow path and GitHub Actions integration are mandatory manifest metadata', () => {
  const broken = structuredClone(manifest);
  broken.workflow = '.github/workflows/renamed.yml';
  broken.integrationId = null;

  const errors = validateStaticContract({ manifest: broken, ciContent }).join('\n');
  assert.match(errors, /workflow.*renamed\.yml/i);
  assert.match(errors, /integrationId/);
});

test('protected branch is explicit manifest metadata rather than an implicit default', () => {
  const broken = structuredClone(manifest);
  broken.branch = '';

  assert.match(validateStaticContract({ manifest: broken, ciContent }).join('\n'), /manifest branch/i);
});

test('stable E2E required context is independent from the internal shard cardinality', () => {
  // 치환 기준은 **현행** matrix 여야 한다 — 옛 문자열을 남겨 두면 치환이 조용히 실패하고
  // 이 테스트가 "샤드 수를 바꿔도 안정 context 는 그대로" 를 더 이상 증명하지 못한다
  // (2026-09-01 샤드 3 → 2 축소 때 실제로 red 로 드러났다).
  const expanded = ciContent.replace(
    '        shard: [1/2, 2/2]',
    '        shard: [1/4, 2/4, 3/4, 4/4]',
  );
  const expandedManifest = structuredClone(manifest);
  expandedManifest.requiredChecks[3].aggregate.sourceMatrix.values = ['1/4', '2/4', '3/4', '4/4'];

  assert.deepEqual(validateStaticContract({ manifest: expandedManifest, ciContent: expanded }), []);
  assert.deepEqual(expectedContexts.filter(context => context.startsWith('e2e')), ['e2e-test']);
});

test('E2E shard coordinates cannot omit a partition or mix denominators', () => {
  for (const values of [
    ['1/4', '2/4', '3/4'],
    ['1/3', '2/3', '3/3', '4/4'],
  ]) {
    const broken = structuredClone(manifest);
    broken.requiredChecks[3].aggregate.sourceMatrix.values = values;
    assert.match(
      validateStaticContract({ manifest: broken, ciContent }).join('\n'),
      /matrix must exactly match|complete 1\/N/i,
    );
  }
});

test('mutation aggregate remains bound to its source job and real PIT command', () => {
  const noNeeds = ciContent.replace(
    /  mutation-test:\r?\n    needs: \[change-scope, mutation-scope, mutation-scope-migration\]\r?\n/,
    '  mutation-test:\n',
  );
  // 두 번째 소스 잡을 needs 에서만 빼도 red 여야 한다 — 집계가 그 결과를 읽지 못한 채 초록이 되면 안 된다.
  const noMigrationNeeds = ciContent.replace(
    '    needs: [change-scope, mutation-scope, mutation-scope-migration]',
    '    needs: [change-scope, mutation-scope]',
  );
  const upstreamContinue = ciContent.replace(
    /  mutation-scope:\r?\n/,
    '  mutation-scope:\n    continue-on-error: true\n',
  );
  const pitStepContinue = ciContent.replace(
    /      - name: Mutation Test \(\$\{\{ matrix\.scope \}\}\)\r?\n/,
    '      - name: Mutation Test (${{ matrix.scope }})\n        continue-on-error: true\n',
  );

  assert.match(validateStaticContract({ manifest, ciContent: noNeeds }).join('\n'), /needs.*mutation-scope/i);
  assert.match(validateStaticContract({ manifest, ciContent: noMigrationNeeds }).join('\n'),
    /must need .mutation-scope-migration./i);
  assert.match(validateStaticContract({ manifest, ciContent: upstreamContinue }).join('\n'), /source job.*continue-on-error/i);
  assert.match(validateStaticContract({ manifest, ciContent: pitStepContinue }).join('\n'), /source step.*continue-on-error/i);
});

test('mutation aggregate cannot fake or ignore the matrix conclusion', () => {
  const fakeResult = ciContent.replace(
    'SOURCE_RESULT: ${{ needs.mutation-scope.result }}',
    'SOURCE_RESULT: success',
  );
  const noop = ciContent.replace(
    'run: node scripts/aggregate-required-check.mjs',
    'run: echo ignored-mutation-result',
  );
  const earlyExit = ciContent.replace(
    'run: node scripts/aggregate-required-check.mjs',
    'run: |\n          exit 0 # injected bypass\n          node scripts/aggregate-required-check.mjs',
  );

  assert.match(validateStaticContract({ manifest, ciContent: fakeResult }).join('\n'), /SOURCE_RESULT.*needs\.mutation-scope\.result/i);
  assert.match(validateStaticContract({ manifest, ciContent: noop }).join('\n'), /must run.*aggregate-required-check/i);
  assert.match(validateStaticContract({ manifest, ciContent: earlyExit }).join('\n'), /must run.*exactly/i);
});

test('required source and aggregate steps cannot replace bash with a no-op shell', () => {
  const e2eShell = ciContent.replace(
    '        id: e2e-run',
    '        id: e2e-run\n        shell: echo {0}',
  );
  const pitShell = ciContent.replace(
    '      - name: Mutation Test (${{ matrix.scope }})',
    '      - name: Mutation Test (${{ matrix.scope }})\n        shell: echo {0}',
  );
  const aggregateShell = ciContent.replace(
    '      - name: E2E 샤드 결과 집계',
    '      - name: E2E 샤드 결과 집계\n        shell: echo {0}',
  );

  assert.match(validateStaticContract({ manifest, ciContent: e2eShell }).join('\n'), /source step.*shell/i);
  assert.match(validateStaticContract({ manifest, ciContent: pitShell }).join('\n'), /source step.*shell/i);
  assert.match(validateStaticContract({ manifest, ciContent: aggregateShell }).join('\n'), /result step.*shell/i);
});

test('stable backend and frontend contexts aggregate conditional source jobs fail closed', () => {
  for (const [checkIndex, sourceJobId, scope] of [
    [0, 'backend-scope', 'backend'],
    [1, 'frontend-scope', 'frontend'],
  ]) {
    const check = manifest.requiredChecks[checkIndex];
    const requiredJob = parseWorkflowJobs(ciContent).get(check.jobId);
    assert.ok(requiredJob);
    assert.match(requiredJob, /^    if: always\(\)$/m);
    assert.deepEqual(check.needs, ['change-scope', sourceJobId,
      ...(scope === 'backend'
        ? ['backend-schema-scope', 'migration-scope', 'reusable-base', 'reusable-custom']
        : ['frontend-coverage-scope'])]);
    const aggregate = Array.isArray(check.aggregate) ? check.aggregate[0] : check.aggregate;
    assert.equal(aggregate.sourceJobId, sourceJobId);
    assert.equal(aggregate.scopeExpression, `needs.change-scope.outputs.${scope}`);
    assert.equal(aggregate.resultExpression, `needs.${sourceJobId}.result`);
    if (scope === 'frontend') {
      assert.ok(Array.isArray(check.aggregate));
      assert.equal(check.aggregate.length, 2);
      assert.equal(check.aggregate[1].sourceJobId, 'frontend-coverage-scope');
      assert.equal(check.aggregate[1].scopeExpression, 'needs.change-scope.outputs.frontend');
      assert.equal(check.aggregate[1].resultExpression, 'needs.frontend-coverage-scope.result');
    }
  }

  const detachedSource = mutateWorkflowJob(ciContent, 'backend-scope', block => block.replace(
    "    if: needs.change-scope.outputs.backend == 'true'",
    '    if: always()',
  ));
  const weakenedAggregate = mutateWorkflowJob(ciContent, 'frontend-build', block => block.replace(
    '    if: always()',
    '    if: success()',
  ));
  assert.match(validateStaticContract({ manifest, ciContent: detachedSource }).join('\n'), /backend-scope.*fail-closed/i);
  assert.match(validateStaticContract({ manifest, ciContent: weakenedAggregate }).join('\n'), /job-level if.*frontend-build/i);
});

test('E2E and PIT sources start after classification without waiting for independent builds', () => {
  assertProductMutationConcurrency(ciContent);
  // ADR-0044: 슬롯 수는 튜닝값이라 다른 양의 정수는 통과하고, 빠지거나 0·음수·주석·표현식·중복 선언은 붉다.
  const slotLine = /^ {6}max-parallel: [0-9]+\n/m;
  for (const replacement of ['      max-parallel: 4\n', '      max-parallel: 9\n']) {
    const tuned = mutateWorkflowJob(ciContent, 'mutation-scope', block => block.replace(slotLine, replacement));
    assert.notEqual(tuned, ciContent.replace(/\r\n/g, '\n'));
    assertProductMutationConcurrency(tuned);
  }
  for (const replacement of ['', '      max-parallel: 0\n', '      max-parallel: -1\n', '      # max-parallel: 6\n',
    '      max-parallel: ${{ matrix.slots }}\n', '      max-parallel: 6\n      max-parallel: 6\n']) {
    const changed = mutateWorkflowJob(ciContent, 'mutation-scope', block => block.replace(slotLine, replacement));
    assert.notEqual(changed, ciContent.replace(/\r\n/g, '\n'));
    assert.throws(() => assertProductMutationConcurrency(changed),
      /mutation-scope (?:must declare max-parallel exactly once|max-parallel must be a positive integer)/, JSON.stringify(replacement));
  }
  const removedBatch = mutateWorkflowJob(ciContent, 'mutation-scope',
    block => block.replace(/^ {10}- scope: business-app-board\n(?: {12}.+\n)+/m, ''));
  assert.throws(() => assertProductMutationConcurrency(removedBatch), /every product PIT batch declared in the registry/);
  const serializedMigration = mutateWorkflowJob(ciContent, 'mutation-scope-migration',
    block => block.replace('    needs: [change-scope]', '    needs: [change-scope, mutation-scope]'));
  assert.throws(() => assertProductMutationConcurrency(serializedMigration));
  const aggregates = [manifest.requiredChecks[3].aggregate, ...manifest.requiredChecks[4].aggregate];
  for (const aggregate of aggregates) {
    assert.deepEqual(aggregate.sourceNeeds, ['change-scope']);
    for (const staleDependency of ['backend-scope', 'frontend-scope', 'backend-build', 'frontend-build']) {
      const serialized = mutateWorkflowJob(ciContent, aggregate.sourceJobId, block => block.replace(
        '    needs: [change-scope]',
        `    needs: [change-scope, ${staleDependency}]`,
      ));
      assert.notEqual(serialized, ciContent.replace(/\r\n/g, '\n'));
      assert.match(validateStaticContract({ manifest, ciContent: serialized }).join('\n'),
        new RegExp(`${aggregate.sourceJobId}.*needs must exactly match`, 'i'));
    }
  }
});

test('integration pushes and PRs share impact mapping with full fallback for unknown ranges', () => {
  assertImpactClassification(ciContent);
  for (const [before, after] of [
    ['BASE="$PUSH_BASE_SHA"', 'BASE=""'],
    ['git merge-base --is-ancestor', 'git rev-parse'],
    ['--base "$BASE"', '--base HEAD~1'],
    ['--head "${HEAD:-$GITHUB_SHA}"', '--head main'],
    [' --github-output "$GITHUB_OUTPUT"', ' --full --github-output "$GITHUB_OUTPUT"'],
    ['VERIFY_BASE=(--verify-push-base-run)', 'VERIFY_BASE=()'],
    ['      actions: read', '      actions: none'],
    ['GH_TOKEN: ${{ github.token }}', 'GH_TOKEN: '],
    ['--event "$GITHUB_EVENT_NAME" --github-output', '--github-output'],
    ['--event "$GITHUB_EVENT_NAME" \\\n', ''],
  ]) {
    const weakened = mutateWorkflowJob(ciContent, 'change-scope', block => block.replace(before, after));
    assert.throws(() => assertImpactClassification(weakened));
  }
});

// GAP-CI-001·DEC-OPS-178: main push 의 검사 범위는 직전 main SHA 와의 차이다. main 실행이 취소되거나 대기 중에
// 교체되면 그 커밋의 코드는 어떤 main 실행에서도 검사되지 않고, 다음 실행은 새 차이만 보고 success 가 된다.
// 취소를 꺼도 같은 그룹의 대기 실행은 다음 실행으로 교체되므로, main 은 커밋마다 자기 그룹에서 끝까지 돈다.
const MAIN_CONCURRENCY = [
  'concurrency:',
  "  group: ${{ github.ref == 'refs/heads/main' && format('ci-main-{0}', github.sha) || format('ci-{0}', github.ref) }}",
  "  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}",
];

function assertMainRunsAreNeverCancelled(content) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const start = lines.indexOf('concurrency:');
  assert.ok(start >= 0, 'the workflow must declare top-level concurrency');
  let end = start + 1;
  while (end < lines.length && /^\s/.test(lines[end])) end += 1;
  assert.deepEqual(lines.slice(start, end), MAIN_CONCURRENCY,
    'main runs must keep a per-SHA group and never cancel; only non-main refs may cancel in progress');
  assert.equal(lines.filter(line => /^\s*concurrency:/.test(line)).length, 1,
    'a job-level concurrency block could still cancel or replace a main run');
}

test('main CI runs are never cancelled or replaced by a later main push', () => {
  assertMainRunsAreNeverCancelled(ciContent);
  const normalized = ciContent.replace(/\r\n/g, '\n');
  const [, group, cancel] = MAIN_CONCURRENCY;
  for (const [before, after] of [
    [cancel, '  cancel-in-progress: true'],
    [cancel, "  cancel-in-progress: ${{ github.ref != 'refs/heads/master' }}"],
    [group, '  group: ci-${{ github.ref }}'],
    [group, "  group: ${{ format('ci-{0}', github.ref) }}"],
  ]) {
    const weakened = normalized.replace(before, after);
    assert.notEqual(weakened, normalized, `fixture must change: ${after}`);
    assert.throws(() => assertMainRunsAreNeverCancelled(weakened), undefined, after);
  }
  const jobLevel = mutateWorkflowJob(ciContent, 'change-scope',
    block => block.replace(/^( {4}runs-on: .*)$/m, '$1\n    concurrency:\n      group: scope\n      cancel-in-progress: true'));
  assert.notEqual(jobLevel, normalized);
  assert.throws(() => assertMainRunsAreNeverCancelled(jobLevel));
  const removed = normalized.replace(/^concurrency:\n(?: {2}.*\n)+/m, '');
  assert.notEqual(removed, normalized);
  assert.throws(() => assertMainRunsAreNeverCancelled(removed));
});

test('backend required context binds independent migration verification fail closed', () => {
  const check = manifest.requiredChecks.find(check => check.context === 'backend-build');
  assert.equal(check.aggregate.length, 5);
  const migrationAggregate = check.aggregate.find(source => source.sourceJobId === 'migration-scope');
  assert.equal(migrationAggregate.scopeExpression, 'needs.change-scope.outputs.migration');
  assert.deepEqual(migrationAggregate.sourceNeeds, ['change-scope', 'migration-test-scope']);
  assert.deepEqual(migrationAggregate.sourceEnv, {
    MIGRATION_SHARD_EXECUTION_ROOT: 'build/migration-shards',
  });
  const migrationJob = parseWorkflowJobs(ciContent).get('migration-scope') ?? '';
  assert.match(migrationJob, /^          persist-credentials: false\n          # verify\.mjs reruns the profile provenance contract after artifact download\.\n          fetch-depth: 0$/m);
  for (const mutate of [
    block => block.replace(/^    if:.*$/m, '    if: false'),
    block => block.replace('    needs: [change-scope, migration-test-scope]', '    needs: change-scope'),
    block => block.replace('node scripts/verify.mjs migration', 'echo skipped'),
    block => block.replace('    steps:', '    defaults:\n      run:\n        shell: echo {0}\n    steps:'),
    block => block.replace('        run: node scripts/verify.mjs migration', '        if: false\n        run: node scripts/verify.mjs migration'),
  ]) {
    const changed = mutateWorkflowJob(ciContent, 'migration-scope', mutate);
    assert.ok(validateStaticContract({ manifest, ciContent: changed }).length);
  }
  const shallowHistory = mutateWorkflowJob(ciContent, 'migration-scope',
    block => block.replace('          fetch-depth: 0', '          fetch-depth: 1'));
  assert.throws(() => assert.match(parseWorkflowJobs(shallowHistory).get('migration-scope') ?? '',
    /^          persist-credentials: false\n          # verify\.mjs reruns the profile provenance contract after artifact download\.\n          fetch-depth: 0$/m));
});

// ADR-0044: 순서의 정본은 실측 profile 이다 — 계약은 고정 목록 대신 profile 의 긴 순서와 맞는지만 본다. 범위의 집합도 profile 과
// 같아야 해서, 이름을 바꾸거나 빼거나 모르는 범위를 더한 변이도 붉다(범위 내용과 소유 잡은 gate registry 의 양방향 대조가 본다).
test('PIT matrices enter their runner pools in the measured profile order without changing their population', () => {
  for (const jobId of ['mutation-scope', 'mutation-scope-migration']) assertMutationOrderMatchesProfile(ciContent, jobId);
  const normalized = ciContent.replace(/\r\n/g, '\n');
  const product = Object.keys(PIT_DURATION_PROFILE.jobs['mutation-scope']);
  const swap = (block, first, second) => block
    .replace(`- scope: ${first}\n`, '- scope: temporary-order-placeholder\n')
    .replace(`- scope: ${second}\n`, `- scope: ${first}\n`)
    .replace('- scope: temporary-order-placeholder\n', `- scope: ${second}\n`);
  // 가장 긴 범위를 가장 짧은 범위 뒤로 보내면 profile 과 어긋난다.
  const contradicted = mutateWorkflowJob(ciContent, 'mutation-scope', block => swap(block, product[0], product.at(-1)));
  assert.notEqual(contradicted, normalized);
  assert.throws(() => assertMutationOrderMatchesProfile(contradicted, 'mutation-scope'),
    /mutation-scope: declaration order must follow the measured profile longest first/);
  // 같은 순서라도 profile 의 값이 바뀌면(다시 잰 결과) 행렬도 함께 고쳐야 한다.
  const remeasured = structuredClone(PIT_DURATION_PROFILE);
  remeasured.jobs['mutation-scope'][product.at(-1)] = remeasured.jobs['mutation-scope'][product[0]] + 1;
  assert.throws(() => assertMutationOrderMatchesProfile(ciContent, 'mutation-scope', remeasured),
    /declaration order must follow the measured profile/);
  const migration = Object.keys(PIT_DURATION_PROFILE.jobs['mutation-scope-migration']);
  const swapped = mutateWorkflowJob(ciContent, 'mutation-scope-migration', block => swap(block, migration[0], migration.at(-1)));
  assert.notEqual(swapped, normalized);
  assert.throws(() => assertMutationOrderMatchesProfile(swapped, 'mutation-scope-migration'),
    /mutation-scope-migration: declaration order must follow the measured profile/);
  for (const [label, changed] of [
    ['removed', mutateWorkflowJob(ciContent, 'mutation-scope-migration',
      block => block.replace(new RegExp(`^ {10}- scope: ${migration[1]}\\n(?: {12}.+\\n)+`, 'm'), ''))],
    ['renamed', mutateWorkflowJob(ciContent, 'mutation-scope-migration',
      block => block.replace(new RegExp(`^( {10}- scope: )${migration[2]}$`, 'm'), `$1${migration[2]}-renamed`))],
    ['added', mutateWorkflowJob(ciContent, 'mutation-scope-migration',
      block => block.replace(new RegExp(`^( {10}- scope: ${migration.at(-1)}\\n(?: {12}.+\\n)+)`, 'm'), [
        '$1          - scope: migration-unregistered',
        '            gradle: ":migration-tool:pitest"',
        '            classes: "nuri.migration.unregistered.*"',
        '            tests: "nuri.migration.unregistered.UnregisteredTest"',
        '            threshold: 75',
        '',
      ].join('\n')))],
  ]) {
    assert.notEqual(changed, normalized, label);
    assert.throws(() => assertMutationOrderMatchesProfile(changed, 'mutation-scope-migration'),
      /every PIT scope must have exactly one measured duration in the profile/, label);
  }
  const stale = structuredClone(PIT_DURATION_PROFILE);
  stale.jobs['mutation-scope']['business-app-retired'] = 1;
  assert.throws(() => assertMutationOrderMatchesProfile(ciContent, 'mutation-scope', stale),
    /every PIT scope must have exactly one measured duration in the profile/);
  const unsourced = structuredClone(PIT_DURATION_PROFILE);
  unsourced.source.runIds = [];
  assert.throws(() => assertMutationOrderMatchesProfile(ciContent, 'mutation-scope', unsourced), /must name the measured run ids/);
  const zero = structuredClone(PIT_DURATION_PROFILE);
  zero.jobs['mutation-scope'][product.at(-1)] = 0;
  assert.throws(() => assertMutationOrderMatchesProfile(ciContent, 'mutation-scope', zero), /must be positive/);
});

test('E2E builds and loads the cached local API image with no registry or upstream artifact dependency', () => {
  assertE2eImageBuild(ciContent);
  for (const [before, after] of [
    ['          load: true', '          load: false'],
    ['          push: false', '          push: true'],
    ['          tags: ${{ env.API_IMAGE_REF }}', '          tags: unrelated-api:latest'],
    ['docker compose up --no-build -d db api', 'docker compose up -d db api'],
    ['        id: e2e-build', '        id: e2e-build\n        continue-on-error: true'],
    ['          cache-from: type=gha,scope=e2e-api', '          cache-from: type=gha,scope=release'],
  ]) {
    const weakened = mutateWorkflowJob(ciContent, 'e2e-tests', block => block.replace(before, after));
    assert.throws(() => assertE2eImageBuild(weakened));
  }
});

test('E2E caches Playwright system packages from main only and tells install failures apart', () => {
  assertE2eSystemPackageCache(ciContent);
  for (const [before, after] of [
    ['          path: ${{ runner.temp }}/playwright-debs\n          key: ${{ steps.e2e-apt-key.outputs.key }}\n\n',
      '          path: ${{ runner.temp }}/apt-debs\n          key: ${{ steps.e2e-apt-key.outputs.key }}\n\n'],
    ["        if: github.event_name == 'push' && github.ref == 'refs/heads/main' && strategy.job-index == 0 && ",
      "        if: strategy.job-index == 0 && "],
    ['        id: e2e-pw-deps\n        if: steps.cache-playwright.outputs.cache-hit == \'true\'\n        timeout-minutes: 15',
      '        id: e2e-pw-deps\n        if: steps.cache-playwright.outputs.cache-hit == \'true\'\n        timeout-minutes: 5'],
    [' / pw-deps=${{ steps.e2e-pw-deps.outcome }}', ''],
    // [2026-10-24 적대 검토] 아래는 종전 단언이 통과시키던 변이다.
    ['      - name: Seed apt archive with restored Playwright packages\n', '      - name: Seed apt archive (renamed)\n'],
    ['debs=("$RUNNER_TEMP"/playwright-debs/*.deb)', 'debs=("$RUNNER_TEMP"/apt-debs/*.deb)'],
    ['cp -- "${debs[@]}" "$RUNNER_TEMP/playwright-debs/"', 'cp -- "${debs[@]}" "$RUNNER_TEMP/apt-debs/"'],
    ["steps.e2e-apt-restore.outputs.cache-hit != 'true'\n", "steps.e2e-apt-restore.outputs.cache-hit != 'true' || github.event_name == 'pull_request'\n"],
    ["        if: steps.e2e-apt-collect.outputs.count != '' && steps.e2e-apt-collect.outputs.count != '0'\n", '        if: always()\n'],
    ['          PW_DEPS: ${{ steps.e2e-pw-deps.outcome }}', '          PW_DEPS: ${{ steps.e2e-pw-dep.outcome }}'],
    ['            failure/*|*/failure)', '            never)'],
    ['            cancelled/*|*/cancelled)\n              echo "::error title=E2E 설치 중 취소::', '            cancelled/*|*/cancelled)\n              echo "::error title=E2E 인프라 실패::'],
    // [2026-10-24 재검토] 판정 주어 오타·seed 조건을 정확 적중으로 좁히기.
    ['case "$PW_BROWSERS/$PW_DEPS" in', 'case "$PW_BROWSER/$PW_DEPS" in'],
    ["        if: steps.e2e-apt-restore.outputs.cache-matched-key != ''\n", "        if: steps.e2e-apt-restore.outputs.cache-hit == 'true'\n"],
  ]) {
    const weakened = mutateWorkflowJob(ciContent, 'e2e-tests', block => block.replace(before, after));
    assert.notEqual(weakened, ciContent.replace(/\r\n/g, '\n'), before);
    assert.throws(() => assertE2eSystemPackageCache(weakened), undefined, before);
  }
  // 모으기·저장 블록을 설치 앞으로 옮기면 미적중 main 실행에서 0개를 모아 저장하지 않는다.
  const moved = mutateWorkflowJob(ciContent, 'e2e-tests', (block) => {
    const start = block.indexOf('      # main 첫 샤드만, 정확한 키가 없을 때 보관한다.');
    const end = block.indexOf('      - name: Verify local composer browser flow');
    const anchor = block.indexOf('      - name: Cache Playwright Browsers');
    assert.ok(start > anchor && end > start && anchor > 0, 'the collect/save block must be found after the browser cache');
    return block.slice(0, anchor) + block.slice(start, end) + block.slice(anchor, start) + block.slice(end);
  });
  assert.throws(() => assertE2eSystemPackageCache(moved), /packages are collected after apt installs them/u);
});

// [2026-10-24] 캐시 writer(backend-scope)가 읽기 전용 PIT 잡이 받는 외부 의존성을 받아 둔다(run 39597152074·39879169321 의 Maven Central 429·403).
//   시험이 붉어도 캐시는 저장되므로 그때도 돌고, 실패를 숨기지 않으며, 빌드 신호를 막지 않게 Build and Test 뒤에 둔다.
// 이관 전용 실행(backend=false)에서는 migration-test-scope 0번 샤드가 writer 다(cache-read-only 식) — 같은 예열을 같은 조건으로 둔다.
// readOnly 는 그 잡의 캐시 정책(GRADLE_CACHE_READ_ONLY)이고, 예열 조건은 그 정책이 저장하는 경우의 정확한 여집합이다.
const PIT_WARMING_WRITERS = Object.freeze([
  { jobId: 'backend-scope', after: 'Build and Test with Gradle', readOnly: 'false', condition: '!cancelled()' },
  { jobId: 'migration-test-scope', after: 'Run measured migration test shard (${{ matrix.shard }})',
    readOnly: "${{ needs.change-scope.outputs.backend != 'false' || strategy.job-index != 0 }}",
    condition: "!cancelled() && needs.change-scope.outputs.backend == 'false' && strategy.job-index == 0" },
]);

// writer 를 옮기거나 더하면(정책 표) 예열 목록도 같이 바뀌어야 한다 — 아니면 예열이 읽기 전용 잡에 남아 새 키가 PIT 없이 굳는다.
function assertPitWarmingFollowsCachePolicy(policy) {
  const writers = Object.entries(policy['.github/workflows/ci.yml']).filter(([, readOnly]) => readOnly !== 'true');
  assert.deepEqual(writers.map(([jobId]) => jobId).sort(), PIT_WARMING_WRITERS.map(({ jobId }) => jobId).sort(),
    'every Gradle cache writer in ci.yml must warm the PIT dependencies');
  for (const { jobId, readOnly } of PIT_WARMING_WRITERS) {
    assert.equal(policy['.github/workflows/ci.yml'][jobId], readOnly, `${jobId}: the warming condition must follow the cache writer policy`);
  }
}

function assertPitDependencyWarming(content) {
  const jobs = parseWorkflowJobs(content.replace(/\r\n/g, '\n'));
  for (const { jobId, after, condition } of PIT_WARMING_WRITERS) {
    const job = jobs.get(jobId) ?? '';
    const warm = workflowStep(job, 'Resolve PIT dependencies into the Gradle cache');
    assert.ok(warm.split('\n').includes(`        if: \${{ ${condition} }}`),
      `${jobId}: warming must run even when tests fail, because the post step still saves the cache`);
    assert.doesNotMatch(warm, /continue-on-error/, `${jobId}: a failed warming must stay visible`);
    assert.match(warm, /^ {8}run: \.\/gradlew resolvePitDependencies --warning-mode fail --console=plain$/m);
    assert.ok(job.indexOf('name: Resolve PIT dependencies into the Gradle cache') > job.indexOf(`name: ${after}`) && job.indexOf(`name: ${after}`) >= 0,
      `${jobId}: warming must not block the build signal`);
  }
}

test('the Gradle cache writer resolves the dependencies read-only PIT jobs need', () => {
  assertPitDependencyWarming(ciContent);
  assertPitWarmingFollowsCachePolicy(GRADLE_CACHE_READ_ONLY);
  const ciPolicy = GRADLE_CACHE_READ_ONLY['.github/workflows/ci.yml'];
  for (const [label, changed] of [
    ['writer moved to another shard', { ...ciPolicy, 'migration-test-scope': "${{ needs.change-scope.outputs.backend != 'false' || strategy.job-index != 2 }}" }],
    ['new writer without warming', { ...ciPolicy, 'mutation-scope': 'false' }],
  ]) {
    assert.throws(() => assertPitWarmingFollowsCachePolicy({ ...GRADLE_CACHE_READ_ONLY, '.github/workflows/ci.yml': changed }),
      /must follow the cache writer policy|every Gradle cache writer in ci\.yml must warm/, label);
  }
  const gradle = fs.readFileSync(path.join(repoRoot, 'build.gradle'), 'utf8').replace(/\r\n/g, '\n');
  const warmEnd = gradle.indexOf('\n    }\n', gradle.indexOf("tasks.register('resolvePitDependencies')"));
  assert.ok(warmEnd > 0, 'the warming task block must be found');
  const warmTask = gradle.slice(gradle.indexOf('def pitDependencyFiles'), warmEnd);
  // business 모듈의 PIT 잡은 compileTestFixturesJava 도 돈다 — 그 classpath 를 빼면 컴파일이 먼저 멈춘 키에서 원격으로 받는다.
  for (const name of ['pitest', 'testRuntimeClasspath', 'testFixturesCompileClasspath']) {
    assert.ok(warmTask.includes(`'${name}'`), `the cache writer must resolve ${name}`);
  }
  // 받는 일을 Gradle 의 암묵 입력 방문에 맡기지 않는다 — .files 로 모든 구성을 직접 해석한다(isEmpty 는 첫 구성에서 멈춘다).
  assert.ok(warmTask.includes('if (pitDependencyFiles.files.isEmpty()) throw new GradleException('),
    'the warming task must resolve every configuration itself');
  for (const [jobId, before, after] of [
    ['backend-scope', '        if: ${{ !cancelled() }}\n        run: ./gradlew resolvePitDependencies', '        run: ./gradlew resolvePitDependencies'],
    ['backend-scope', '        id: pit-deps\n', '        id: pit-deps\n        continue-on-error: true\n'],
    ['migration-test-scope', "        if: ${{ !cancelled() && needs.change-scope.outputs.backend == 'false' && strategy.job-index == 0 }}\n",
      "        if: ${{ needs.change-scope.outputs.backend == 'false' && strategy.job-index == 0 }}\n"],
    ['migration-test-scope', '        id: pit-deps\n', '        id: pit-deps\n        continue-on-error: true\n'],
    ['migration-test-scope', '      - name: Resolve PIT dependencies into the Gradle cache\n', '      - name: Warm nothing\n'],
  ]) {
    const weakened = mutateWorkflowJob(ciContent, jobId, block => block.replace(before, after));
    assert.notEqual(weakened, ciContent.replace(/\r\n/g, '\n'), before);
    assert.throws(() => assertPitDependencyWarming(weakened), undefined, `${jobId}: ${before}`);
  }
});

test('backend and frontend hard build steps cannot be skipped or made advisory', () => {
  for (const [jobId, stepName] of [
    ['backend-scope', 'Build and Test with Gradle'],
    ['frontend-scope', 'Build production frontend'],
    ['frontend-coverage-scope', 'Frontend unit and coverage suite'],
  ]) {
    for (const weakening of [
      '        if: false\n',
      '        continue-on-error: true\n',
      '        shell: echo {0}\n',
    ]) {
      const weakened = mutateWorkflowJob(ciContent, jobId, block => block.replace(
        `      - name: ${stepName}\n`,
        `      - name: ${stepName}\n${weakening}`,
      ));
      assert.notDeepEqual(validateStaticContract({ manifest, ciContent: weakened }), [], `${jobId}: ${weakening}`);
    }
  }
});

test('workflow and protected jobs cannot replace command execution through defaults.run.shell', () => {
  const workflowDefault = ciContent.replace(
    /^jobs:\r?$/m,
    'defaults:\n  run:\n    shell: echo {0}\n\njobs:',
  );
  assert.match(validateStaticContract({ manifest, ciContent: workflowDefault }).join('\n'), /workflow-level defaults\.run\.shell/i);

  for (const jobId of ['change-scope', 'secret-scan', 'backend-build', 'backend-scope', 'e2e-tests']) {
    const jobDefault = mutateWorkflowJob(ciContent, jobId, block => block.replace(
      /^    runs-on:/m,
      '    defaults:\n      run:\n        shell: echo {0}\n    runs-on:',
    ));
    assert.match(
      validateStaticContract({ manifest, ciContent: jobDefault }).join('\n'),
      new RegExp(`${jobId}.*defaults\\.run\\.shell`, 'i'),
    );
  }
});

test('classifier, required, and source jobs must checkout the workflow commit without a ref override', () => {
  const addRefOverride = (content, jobId) => content.replace(
    new RegExp(`(  ${jobId}:\\r?\\n[\\s\\S]*?      - uses: actions\\/checkout@[^\\r\\n]+)`),
    '$1\n        with:\n          ref: main',
  );

  assert.match(
    validateStaticContract({ manifest, ciContent: addRefOverride(ciContent, 'change-scope') }).join('\n'),
    /change-scope.*checkout.*ref/i,
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: addRefOverride(ciContent, 'backend-build') }).join('\n'),
    /backend-build.*checkout.*ref/i,
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: addRefOverride(ciContent, 'backend-scope') }).join('\n'),
    /backend-scope.*checkout.*ref/i,
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: addRefOverride(ciContent, 'frontend-scope') }).join('\n'),
    /frontend-scope.*checkout.*ref/i,
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: addRefOverride(ciContent, 'frontend-coverage-scope') }).join('\n'),
    /frontend-coverage-scope.*checkout.*ref/i,
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: addRefOverride(ciContent, 'e2e-tests') }).join('\n'),
    /e2e-tests.*checkout.*ref/i,
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: addRefOverride(ciContent, 'mutation-scope') }).join('\n'),
    /mutation-scope.*checkout.*ref/i,
  );
});

test('change-scope cannot classify a different tree when checkout is missing', () => {
  const withoutCheckout = mutateWorkflowJob(ciContent, 'change-scope', jobBlock => jobBlock.replace(
    /^      - uses: actions\/checkout@[^\r\n]+\r?\n/m,
    '',
  ));

  assert.match(
    validateStaticContract({ manifest, ciContent: withoutCheckout }).join('\n'),
    /change-scope.*checkout.*workflow commit/i,
  );
});

test('aggregate result vocabulary is canonical rather than unused manifest decoration', () => {
  for (const [checkIndex, field] of [
    [3, 'successResult'],
    [4, 'skippedResult'],
  ]) {
    const broken = structuredClone(manifest);
    const target = broken.requiredChecks[checkIndex].aggregate;
    if (Array.isArray(target)) target[0][field] = 'banana';
    else target[field] = 'banana';
    assert.match(
      validateStaticContract({ manifest: broken, ciContent }).join('\n'),
      new RegExp(`${field}.*(?:success|skipped)`, 'i'),
    );
  }
});

// [DEC-OPS-009 · 2026-08-20] 종전 이름은 'cannot be weakened to presence-only protection' 였고
// weak={0,false,…} 를 위반 표본으로 썼다. 단독 운영 결정으로 그 값이 **결정된 정책 자체**가
// 되면서 판정 방향이 바뀌었다: manifest ↔ live 는 여전히 정확 일치를 요구하되(어느 방향의
// drift 든 red), manifest 자체는 결정 상수와의 정확 일치로 동결된다.
test('pull request review policy is exact — drift in either direction is reported', () => {
  assert.deepEqual(comparePullRequestPolicy(
    manifest.pullRequestPolicy,
    structuredClone(manifest.pullRequestPolicy),
  ), []);

  // 원격이 명세보다 '강한' 경우도 불일치다 — reviewer 없는 단독 운영에서 원격만 approval 1 이
  // 되면 모든 병합이 잠기는데, 그것이 조용히 지나가면 안 된다.
  const stricterLive = {
    requiredApprovingReviewCount: 1,
    requireCodeOwnerReview: true,
    requireLastPushApproval: true,
    dismissStaleReviewsOnPush: false,
    requiredReviewThreadResolution: true,
  };
  const errors = comparePullRequestPolicy(manifest.pullRequestPolicy, stricterLive).join('\n');
  assert.match(errors, /requiredApprovingReviewCount.*expected 0.*found 1/i);
  assert.match(errors, /requireCodeOwnerReview.*expected false.*found true/i);
  assert.match(errors, /requireLastPushApproval.*expected false.*found true/i);
  assert.match(errors, /requiredReviewThreadResolution.*expected false.*found true/i);
});

test('static manifest freezes the decided review policy in both directions', () => {
  // 결정(0/false)에서 벗어나는 '강화' 도 상수·결정 기록 갱신 없이는 red 다 —
  // 그래야 reviewer 확보 후의 정책 상향이 침묵 편집이 아니라 후속 DEC 로 기록된다.
  const strengthened = structuredClone(manifest);
  strengthened.pullRequestPolicy.requiredApprovingReviewCount = 1;
  strengthened.pullRequestPolicy.requireCodeOwnerReview = true;
  const errors = validateStaticContract({ manifest: strengthened, ciContent }).join('\n');
  assert.match(errors, /requiredApprovingReviewCount.*decided policy.*0.*DEC-OPS-009/i);
  assert.match(errors, /requireCodeOwnerReview.*decided policy.*false.*DEC-OPS-009/i);

  // 음수·타입 파손은 결정과 무관하게 항상 거부한다.
  const negative = structuredClone(manifest);
  negative.pullRequestPolicy.requiredApprovingReviewCount = -1;
  assert.match(
    validateStaticContract({ manifest: negative, ciContent }).join('\n'),
    /non-negative integer/i,
  );

  const incomplete = structuredClone(manifest);
  delete incomplete.pullRequestPolicy.requireLastPushApproval;
  assert.match(
    validateStaticContract({ manifest: incomplete, ciContent }).join('\n'),
    /must define exactly/i,
  );
});

test('E2E and PIT source jobs respect cancellation while keeping classifier success and impact conditions', () => {
  const aggregates = [manifest.requiredChecks[3].aggregate, ...manifest.requiredChecks[4].aggregate];
  for (const [jobId, impact] of [
    ['e2e-tests', "needs.change-scope.outputs.e2e == 'true'"],
    ['mutation-scope', "needs.change-scope.outputs.mutation == 'true'"],
    ['mutation-scope-migration', "needs.change-scope.outputs['mutation-migration-tool'] == 'true'"],
  ]) {
    const expected = `!cancelled() && needs.change-scope.result == 'success' && ${impact}`;
    assert.equal(aggregates.find(source => source.sourceJobId === jobId)?.sourceJobIf, expected,
      `${jobId} manifest must preserve cancellable execution`);
    const job = parseWorkflowJobs(ciContent).get(jobId);
    assert.ok(job?.split('\n').includes(`    if: \${{ ${expected} }}`), `${jobId} must execute the cancellable manifest condition`);
    for (const condition of [
      expected.replace('!cancelled()', 'always()'),
      `!cancelled() && ${impact}`,
      "!cancelled() && needs.change-scope.result == 'success'",
      'always()', "needs.change-scope.result == 'success'",
    ]) {
      const weakened = mutateWorkflowJob(ciContent, jobId, block => block.replace(
        /^    if: .*$/m, `    if: \${{ ${condition} }}`,
      ));
      assert.notEqual(weakened, ciContent.replace(/\r\n/g, '\n'), 'negative fixture must change the real source condition');
      assert.match(validateStaticContract({ manifest, ciContent: weakened }).join('\n'),
        /source job.*fail-closed scope condition/i);
    }
  }
});

test('PIT source step cannot disable strict mutation or detach its target matrix', () => {
  const reportOnly = ciContent.replace('          STRICT_MUTATION: "true"', '          STRICT_MUTATION: "false"');
  const detachedClasses = ciContent.replace(
    '          PIT_TARGET_CLASSES: ${{ matrix.classes }}',
    '          PIT_TARGET_CLASSES: no.such.Class',
  );
  const detachedTests = ciContent.replace(
    '          PIT_TARGET_TESTS: ${{ matrix.tests }}',
    '          PIT_TARGET_TESTS: no.such.Test',
  );

  assert.match(validateStaticContract({ manifest, ciContent: reportOnly }).join('\n'), /env 'STRICT_MUTATION'.*'true'/i);
  assert.match(validateStaticContract({ manifest, ciContent: detachedClasses }).join('\n'), /env 'PIT_TARGET_CLASSES'/i);
  assert.match(validateStaticContract({ manifest, ciContent: detachedTests }).join('\n'), /env 'PIT_TARGET_TESTS'/i);
});

test('PIT source and aggregate result steps cannot be conditionally skipped', () => {
  const skippedSource = ciContent.replace(
    /      - name: Mutation Test \(\$\{\{ matrix\.scope \}\}\)\r?\n/,
    '      - name: Mutation Test (${{ matrix.scope }})\n        if: false\n',
  );
  const skippedAggregate = ciContent.replace(
    /      - name: 뮤테이션 스코프 결과 집계\r?\n/,
    '      - name: 뮤테이션 스코프 결과 집계\n        if: false\n',
  );

  assert.match(validateStaticContract({ manifest, ciContent: skippedSource }).join('\n'), /source step.*step-level if/i);
  assert.match(validateStaticContract({ manifest, ciContent: skippedAggregate }).join('\n'), /result step.*step-level if/i);
});

test('frontend heavy source starts independently from the backend heavy source', () => {
  const frontendJob = ciContent.match(
    /^  frontend-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  const coverageJob = ciContent.match(
    /^  frontend-coverage-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(frontendJob, 'frontend-scope job must exist');
  assert.ok(coverageJob, 'frontend-coverage-scope job must exist');
  assert.match(frontendJob, /^    needs: change-scope$/m);
  assert.match(coverageJob, /^    needs: change-scope$/m);
  assert.doesNotMatch(frontendJob, /^    needs:.*backend-scope/m,
    'frontend-scope consumes no backend artifact and must not be serialized behind backend-scope');
  assert.doesNotMatch(coverageJob, /^    needs:.*(?:backend-scope|frontend-scope)/m,
    'frontend coverage must run beside production build rather than after another heavy source');
});

test('physical schema validation runs in parallel and remains required by backend-build', () => {
  const schemaJob = ciContent.match(
    /^  backend-schema-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  const backendJob = ciContent.match(
    /^  backend-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  const aggregateJob = ciContent.match(
    /^  backend-build:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(schemaJob, 'backend-schema-scope job must exist');
  assert.ok(backendJob, 'backend-scope job must exist');
  assert.ok(aggregateJob, 'backend-build job must exist');
  assert.match(schemaJob, /^    needs: change-scope$/m);
  assert.match(schemaJob, /^    if: needs\.change-scope\.outputs\.schema == 'true'$/m);
  assert.match(schemaJob, /\.\/gradlew :api-server:schemaValidationTest --warning-mode fail --console=plain/);
  assert.doesNotMatch(backendJob, /:api-server:schemaValidationTest/,
    'schema validation must not remain serialized behind online tests');
  assert.match(aggregateJob,
    /^    needs: \[change-scope, backend-scope, backend-schema-scope, migration-scope, reusable-base, reusable-custom\]$/m);
  assert.match(aggregateJob, /EXPECTED_WORK: \$\{\{ needs\.change-scope\.outputs\.schema \}\}/);
  assert.match(aggregateJob, /SOURCE_RESULT: \$\{\{ needs\.backend-schema-scope\.result \}\}/);

  const detached = aggregateJob.replace('needs.backend-schema-scope.result', 'needs.backend-scope.result');
  assert.doesNotMatch(detached, /SOURCE_RESULT: \$\{\{ needs\.backend-schema-scope\.result \}\}/,
    'negative proof: detaching the schema source must violate the required expression');
});

test('reusable-base consumes the fail-closed impacted profile matrix', () => {
  const classifierJob = ciContent.match(
    /^  change-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  const reusableJob = ciContent.match(
    /^  reusable-base:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  const customJob = ciContent.match(
    /^  reusable-custom:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  const aggregateJob = ciContent.match(
    /^  backend-build:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(classifierJob && reusableJob && customJob && aggregateJob);
  assert.match(classifierJob, /reusable: \$\{\{ steps\.scope\.outputs\.reusable \}\}/);
  assert.match(classifierJob, /reusable-matrix: \$\{\{ steps\.scope\.outputs\.reusable_matrix \}\}/);
  assert.match(classifierJob, /reusable-custom: \$\{\{ steps\.scope\.outputs\.reusable_custom \}\}/);
  assert.match(reusableJob, /^    needs: \[change-scope, frontend-scope\]$/m);
  assert.match(reusableJob,
    /^    if: "!cancelled\(\) && needs\.change-scope\.result == 'success' && needs\.change-scope\.outputs\.reusable == 'true'"$/m);
  assert.doesNotMatch(reusableJob, /^      max-parallel:/m);
  assert.match(reusableJob,
    /^      matrix: \$\{\{ fromJSON\(needs\.change-scope\.outputs\['reusable-matrix'\]\) \}\}$/m);
  assert.doesNotMatch(reusableJob, /verify-project-composer/);
  assert.match(customJob, /^    needs: \[change-scope\]$/m);
  assert.match(customJob,
    /^    if: "!cancelled\(\) && needs\.change-scope\.result == 'success' && needs\.change-scope\.outputs\['reusable-custom'\] == 'true'"$/m);
  assert.match(customJob, /^        layout: \[single-module, multi-module\]$/m);
  assert.match(customJob, /^        run: node scripts\/verify-project-composer\.mjs --layout \$\{\{ matrix\.layout \}\}$/m);
  assert.match(aggregateJob, /EXPECTED_WORK: \$\{\{ needs\.change-scope\.outputs\.reusable \}\}/);
  assert.match(aggregateJob, /EXPECTED_WORK: \$\{\{ needs\.change-scope\.outputs\['reusable-custom'\] \}\}/);

  const staticFullMatrix = reusableJob.replace(
    "      matrix: ${{ fromJSON(needs.change-scope.outputs['reusable-matrix']) }}",
    `      matrix:\n        profile: [${presetIds().join(', ')}]\n        layout: [multi-module, single-module]`,
  );
  assert.doesNotMatch(staticFullMatrix,
    /matrix: \$\{\{ fromJSON\(needs\.change-scope\.outputs\['reusable-matrix'\]\) \}\}/,
    'negative proof: replacing the impacted matrix with the old unconditional matrix must violate this contract');
});

function classifierEventBindings(job) {
  return job.replace(/\r\n/g, '\n').replace(/\\\n\s*/g, ' ').split('\n')
    .filter(line => line.includes('node scripts/ci-change-scope.mjs'))
    .map(line => line.includes('--event "$GITHUB_EVENT_NAME"'));
}

test('Gradle verification commands fail on deprecation warnings', () => {
  const guardedCommands = [
    './gradlew :foundation:test --no-build-cache --warning-mode fail --console=plain',
    './gradlew onlineBuild jacocoOnlineCoverageVerification "-Dopenapi.export.path=$GITHUB_WORKSPACE/api-docs.json" --warning-mode fail --console=plain',
    './gradlew :api-server:schemaValidationTest --warning-mode fail --console=plain',
    './gradlew ${{ matrix.gradle }} --warning-mode fail --console=plain',
    './gradlew resolvePitDependencies --warning-mode fail --console=plain',
  ];

  for (const command of guardedCommands) {
    assert.ok(ciContent.includes(command), `missing strict Gradle warning guard: ${command}`);
  }
});

test('backend heavy source provisions the Gradle distribution with a bounded retry', () => {
  const backendJob = ciContent.match(
    /^  backend-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(backendJob, 'backend-scope job must exist');
  assert.match(backendJob, /name: Provision Gradle distribution with bounded retry/);
  assert.match(backendJob, /for attempt in 1 2 3/);
  assert.match(backendJob, /if \.\/gradlew --version; then/);
  assert.match(backendJob, /if \[ "\$attempt" -eq 3 \]; then/);
});

test('mutation jobs provision the Gradle distribution with a bounded retry before PIT', () => {
  assert.match(ciContent, /name: Provision Gradle distribution with bounded retry/);
  assert.match(ciContent, /for attempt in 1 2 3/);
  assert.match(ciContent, /\.\/gradlew --version/);
  assert.match(ciContent, /if \[ "\$attempt" -eq 3 \]; then/);

  const provision = ciContent.indexOf('name: Provision Gradle distribution with bounded retry');
  const pit = ciContent.indexOf('name: Mutation Test (${{ matrix.scope }})');
  assert.ok(provision >= 0 && provision < pit, 'Gradle distribution retry must run before the PIT hard gate');
});

test('sharded PIT jobs keep the common bounded timeout', () => {
  assert.deepEqual(validateStaticContract({ manifest, ciContent }), []);
  for (const jobId of ['mutation-scope', 'mutation-scope-migration']) {
    for (const replacement of ['    timeout-minutes: 60', '    timeout-minutes: 15', '    # timeout-minutes: 30']) {
      const changed = mutateWorkflowJob(ciContent, jobId,
        block => block.replace('    timeout-minutes: 30', replacement));
      assert.notEqual(changed, ciContent.replace(/\r\n/g, '\n'), 'negative fixture must change the job');
      assert.match(validateStaticContract({ manifest, ciContent: changed }).join('\n'),
        new RegExp(`${jobId} timeout`, 'i'));
    }
  }
});

test('throttled matrices keep a positive runner slot count without dropping validation', () => {
  assertRunnerAdmissionControl(ciContent);
  // ADR-0044: 값 자체는 튜닝값이라 고정하지 않는다 — 빠지거나 0·주석이면 붉고, 다른 양의 정수는 통과한다.
  const slotLine = /^ {6}max-parallel: [0-9]+\n/m;
  for (const jobId of THROTTLED_MATRIX_JOBS) {
    const tuned = mutateWorkflowJob(ciContent, jobId, block => block.replace(slotLine, '      max-parallel: 3\n'));
    assert.notEqual(tuned, ciContent.replace(/\r\n/g, '\n'));
    assertRunnerAdmissionControl(tuned);
    for (const replacement of ['', '      max-parallel: 0\n', '      # max-parallel: 2\n']) {
      const changed = mutateWorkflowJob(ciContent, jobId, block => block.replace(slotLine, replacement));
      assert.notEqual(changed, ciContent.replace(/\r\n/g, '\n'));
      assert.throws(() => assertRunnerAdmissionControl(changed),
        new RegExp(`${jobId} (?:must declare max-parallel exactly once|max-parallel must be a positive integer)`), `${jobId} ${JSON.stringify(replacement)}`);
    }
  }
  for (const replacement of [
    '    needs: change-scope',
    '    needs: [change-scope, backend-scope]',
    '    # needs: [change-scope, frontend-scope]',
  ]) {
    const changed = mutateWorkflowJob(ciContent, 'reusable-base',
      block => block.replace('    needs: [change-scope, frontend-scope]', replacement));
    assert.notEqual(changed, ciContent.replace(/\r\n/g, '\n'));
    assert.throws(() => assertRunnerAdmissionControl(changed), /frontend production/);
  }
  for (const replacement of [
    "    if: needs.change-scope.outputs.reusable == 'true'",
    "    if: \"!cancelled() && needs.change-scope.outputs.reusable == 'true'\"",
    "    if: \"!cancelled() && needs.change-scope.result == 'success'\"",
    "    if: \"always() && needs.change-scope.result == 'success' && needs.change-scope.outputs.reusable == 'true'\"",
  ]) {
    const changed = mutateWorkflowJob(ciContent, 'reusable-base', block => block.replace(
      "    if: \"!cancelled() && needs.change-scope.result == 'success' && needs.change-scope.outputs.reusable == 'true'\"",
      replacement,
    ));
    assert.notEqual(changed, ciContent.replace(/\r\n/g, '\n'));
    assert.throws(() => assertRunnerAdmissionControl(changed), /silently suppress/);
  }
  const throttled = mutateWorkflowJob(ciContent, 'reusable-base', block => block.replace(
    '    strategy:\n',
    '    strategy:\n      max-parallel: 5\n',
  ));
  assert.notEqual(throttled, ciContent.replace(/\r\n/g, '\n'));
  assert.throws(() => assertRunnerAdmissionControl(throttled), /start together/);
  for (const replacement of [
    '    needs: [change-scope, backend-scope]',
    '    needs: [change-scope, frontend-scope]',
    '    # needs: [change-scope]',
  ]) {
    const changed = mutateWorkflowJob(ciContent, 'reusable-custom',
      block => block.replace('    needs: [change-scope]', replacement));
    assert.notEqual(changed, ciContent.replace(/\r\n/g, '\n'));
    assert.throws(() => assertRunnerAdmissionControl(changed), /right after classification/);
  }
});

// [2026-08-16 신설] 훅 전용이던 검증을 CI 로 미러링하면서, 그 스텝이 조용히 사라지지
//   못하도록 고정한다. `.githooks/*` 는 `--no-verify` / `SKIP_HOOKS=1` 로 우회되므로 훅에만
//   있는 검증은 required check 가 아니다 — 우회한 푸시에서 무검증으로 통과했다.
//   아래 테스트는 "게이트는 실행 경로가 있어야 게이트다"(AGENTS.md Evidence guardrails H5)를 계약으로 굳힌다.

test('one operational-contract catalog runs in required CI and before the docs fast-pass', () => {
  const secretScanJob = ciContent.match(
    /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  assert.ok(secretScanJob, 'secret-scan job must exist');
  assert.match(secretScanJob, /npm run test:operational-contracts/);

  // 실행기 명령(package.json 의 test:operational-contracts)의 catalog 범위는 gate registry 가 소유한다 — registry 계약이 package.json 과
  // 원장의 packageScript.command 를 대조하고(ghost runner selector) governance-gates 계약이 그 원장 값을 고정한다. 같은 리터럴을 여기
  // 다시 적지 않는다(2026-10-28 중복 정리).
  const prePush = fs.readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  const operationalGate = prePush.indexOf('npm run test:operational-contracts');
  const atlasGate = prePush.indexOf('vitest run src/__tests__/cross-stack/governance-atlas-contract.test.ts');
  const fastPassExit = prePush.indexOf('문서/비코드 변경만 감지됨');
  assert.ok(operationalGate >= 0 && operationalGate < fastPassExit,
    'operational contracts must run before docs-only fast-pass');
  assert.ok(atlasGate >= 0 && atlasGate < fastPassExit,
    'Atlas contract must run before its HTML fast-pass');
  assert.match(prePush, /--stdin --field docsOnly/);
});

test('required operational-contract step is exact and cannot be converted into a decoy', () => {
  const mutations = [
    [
      ciContent.replace(
        '      - name: Verify repository operational contracts',
        '      - name: Verify repository operational contracts\n        if: false',
      ),
      /operational contracts.*step-level if/i,
    ],
    [
      ciContent.replace(
        '      - name: Verify repository operational contracts',
        '      - name: Verify repository operational contracts\n        continue-on-error: true',
      ),
      /operational contracts.*continue-on-error/i,
    ],
    [
      ciContent.replace(
        '      - name: Verify repository operational contracts',
        '      - name: Verify repository operational contracts\n        shell: echo {0}',
      ),
      /operational contracts.*shell/i,
    ],
    [
      ciContent.replace(
        '        run: npm run test:operational-contracts',
        '        run: echo npm run test:operational-contracts',
      ),
      /operational contracts.*must run.*exactly/i,
    ],
  ];

  for (const [mutated, expectedError] of mutations) {
    assert.match(validateStaticContract({ manifest, ciContent: mutated }).join('\n'), expectedError);
  }
});

test('every third-party workflow action is pinned to a full commit SHA', () => {
  const workflowsDir = path.join(repoRoot, '.github', 'workflows');
  const workflowFiles = fs.readdirSync(workflowsDir)
    .filter(name => /\.ya?ml$/i.test(name))
    .map(name => ({
      path: `.github/workflows/${name}`,
      content: fs.readFileSync(path.join(workflowsDir, name), 'utf8'),
    }));

  assert.deepEqual(validatePinnedWorkflowUses(workflowFiles), []);

  for (const unpinned of [
    'actions/checkout@v4',
    'actions/checkout@main',
    'actions/checkout@11d5960a326750d5838078e36cf38b85af67726',
  ]) {
    assert.match(
      validatePinnedWorkflowUses([{
        path: '.github/workflows/injected.yml',
        content: `jobs:\n  injected:\n    steps:\n      - uses: ${unpinned}\n`,
      }]).join('\n'),
      /injected\.yml:4.*40.*commit SHA/i,
    );
  }

  assert.deepEqual(validatePinnedWorkflowUses([{
    path: '.github/workflows/exemptions.yml',
    content: 'jobs:\n  local:\n    uses: ./.github/workflows/local.yml\n  image:\n    steps:\n      - uses: docker://alpine:3.20\n',
  }]), []);
});

// 워크플로가 핀의 정본이다. 한 저장소는 모든 워크플로에서 한 커밋이고, 검토 핀 원장(REVIEWED_ACTION_PINS)의 저장소는 그 커밋이다.
// 그래서 Dependabot 의 액션 범프는 원장 밖이면 워크플로 밖 수정이 0개, 원장 안이면 원장 한 줄이다.
test('one commit per action repository across workflows and reviewed pins stay bound to the ledger', () => {
  const directory = path.join(repoRoot, '.github/workflows');
  const workflows = fs.readdirSync(directory).filter(name => /\.ya?ml$/.test(name))
    .map(name => ({ path: `.github/workflows/${name}`, content: fs.readFileSync(path.join(directory, name), 'utf8').replace(/\r\n/g, '\n') }));
  assert.deepEqual(validatePinnedWorkflowUses(workflows), []);
  // 원장의 저장소는 실제로 쓰여야 한다 — 쓰지 않는 원장 항목은 검토 대상이 사라진 낡은 핀이다.
  for (const [repository, commit] of Object.entries(REVIEWED_ACTION_PINS)) {
    assert.ok(workflows.some(({ content }) => content.includes(`uses: ${repository}/`) && content.includes(`@${commit}`)),
      `${repository} is in the reviewed pin ledger but no workflow uses it`);
  }
  const replacement = 'c'.repeat(40);
  const checkout = /(uses: actions\/checkout@)([0-9a-f]{40})/;
  const [first, second] = workflows.filter(({ content }) => checkout.test(content));
  assert.ok(first && second, 'at least two workflows check out the repository');
  // 한 워크플로만 올리면 두 커밋이 섞인다.
  const drifted = workflows.map(workflow => workflow === second
    ? { ...workflow, content: workflow.content.replaceAll(checkout.exec(workflow.content)[0], `uses: actions/checkout@${replacement}`) } : workflow);
  assert.match(validatePinnedWorkflowUses(drifted).join('\n'), /action actions\/checkout must use one commit across workflows: .*cccccccc/);
  // 모든 워크플로를 함께 올리면 워크플로 밖 수정 없이 통과한다(원장 밖 액션).
  const sha = checkout.exec(first.content)[2];
  const bumped = workflows.map(workflow => ({ ...workflow, content: workflow.content.replaceAll(`actions/checkout@${sha}`, `actions/checkout@${replacement}`) }));
  assert.deepEqual(validatePinnedWorkflowUses(bumped), []);
  // 원장 안 저장소를 원장과 다른 커밋으로 모두 올리면 원장과 어긋나 붉다 — 설정 단계와 의존성 제출 단계 모두.
  const gradle = REVIEWED_ACTION_PINS['gradle/actions'];
  const unreviewed = workflows.map(workflow => ({ ...workflow, content: workflow.content.replaceAll(`@${gradle}`, `@${replacement}`) }));
  const errors = validatePinnedWorkflowUses(unreviewed).join('\n');
  assert.match(errors, /Gradle setup must use the reviewed cache-compatible action pin/);
  assert.match(errors, new RegExp(`'gradle/actions/dependency-submission@${replacement}' must use the reviewed action pin gradle/actions@${gradle}`));
  // CodeQL·dependency review 의 검토 핀은 필수 단계 명세(criticalSteps)가 소유한다 — 워크플로만 바꾸면 붉다.
  const ci = ciContent.replace(/\r\n/g, '\n');
  for (const name of ['Initialize CodeQL security analysis', 'Analyze secure coding', 'Block newly introduced high-risk runtime dependencies']) {
    const pinned = manifest.criticalSteps.find(entry => entry.name === name).uses;
    const changed = ci.replaceAll(pinned, `${pinned.split('@')[0]}@${replacement}`);
    assert.notEqual(changed, ci, name);
    assert.ok(validateStaticContract({ manifest, ciContent: changed }).includes(`critical step '${name}' must use '${pinned}' exactly`), name);
  }
  assert.deepEqual(validatePinnedWorkflowUses([{
    path: '.github/workflows/split.yml',
    content: `jobs:\n  a:\n    steps:\n      - uses: actions/cache@${'1'.repeat(40)}\n  b:\n    steps:\n      - uses: actions/cache/restore@${'2'.repeat(40)}\n`,
  }]), [`action actions/cache must use one commit across workflows: ${'1'.repeat(40)} (.github/workflows/split.yml:4), ${'2'.repeat(40)} (.github/workflows/split.yml:7)`],
  'subpaths of one repository share its commit');
});

test('every Gradle setup rejects unreviewed cache clients, providers and writer roles', () => {
  const directory = path.join(repoRoot, '.github/workflows');
  const workflows = fs.readdirSync(directory).filter(name => /\.ya?ml$/.test(name))
    .map(name => ({ path: `.github/workflows/${name}`, content: fs.readFileSync(path.join(directory, name), 'utf8') }));
  assert.deepEqual(validatePinnedWorkflowUses(workflows), []);
  let checked = 0;
  for (const workflow of workflows) {
    for (const match of workflow.content.matchAll(new RegExp(reviewedActionPin('gradle/actions/setup-gradle'), 'g'))) {
      const prefix = workflow.content.slice(0, match.index);
      const suffix = workflow.content.slice(match.index);
      for (const [changed, expected] of [
        [suffix.replace(REVIEWED_ACTION_PINS['gradle/actions'], 'd9c87d481d55275bb5441eef3fe0e46805f9ef70'), 'cache-compatible action pin'],
        [suffix.replace('cache-provider: basic', 'cache-provider: enhanced'), 'cache-provider: basic'],
        // v6.4.0 added 'external', which silently turns off the Gradle User Home cache.
        [suffix.replace('cache-provider: basic', 'cache-provider: external'), 'cache-provider: basic'],
        [suffix.replace(/ *cache-provider: basic\r?\n/, ''), 'cache-provider: basic'],
        [suffix.replace(/ *cache-read-only:[^\r\n]*\r?\n/, ''), 'cache-read-only'],
        [suffix.replace(/cache-read-only:[^\r\n]*/, 'cache-read-only: invalid'), 'cache-read-only'],
        [suffix.replace('cache-provider: basic', 'cache-provider: basic\n          cache-read-only: false'), 'cache-read-only'],
        [suffix.replace('cache-provider: basic', 'cache-provider: basic\n          cache-disabled: true'), 'cache-disabled'],
        [suffix.replace('cache-provider: basic', 'cache-provider: basic\n          cache-write-only: true'), 'cache-write-only'],
      ]) {
        assert.notEqual(changed, suffix);
        const errors = validatePinnedWorkflowUses([{ path: workflow.path, content: prefix + changed }]);
        assert.ok(errors.some(error => error.includes(expected)), `${workflow.path}: ${expected}`);
      }
      checked += 1;
    }
  }
  assert.equal(checked, 12, 'all producer Gradle cache callers must be covered');
});

test('cache writer election remains tied to selected backend and migration jobs', () => {
  const normalizedCi = ciContent.replace(/\r\n/g, '\n');
  const workflow = { path: '.github/workflows/ci.yml', content: normalizedCi };
  assert.deepEqual(validatePinnedWorkflowUses([workflow]), []);
  for (const [jobId, readOnly] of [['backend-scope', 'true'], ['backend-schema-scope', 'false'], ['migration-test-scope', 'true'], ['migration-scope', 'false'],
    ['reusable-base', 'false'], ['reusable-custom', 'false'], ['mutation-scope', 'false'], ['mutation-scope-migration', 'false']]) {
    const changed = mutateWorkflowJob(normalizedCi, jobId, block => block.replace(/cache-read-only:[^\n]*/, `cache-read-only: ${readOnly}`));
    assert.notEqual(changed, normalizedCi);
    assert.match(validatePinnedWorkflowUses([{ ...workflow, content: changed }]).join('\n'), /cache-read-only/);
  }
  for (const jobId of ['backend-scope', 'migration-scope']) {
    // Existing aggregate-source validation owns the selection/needs invariant.
    for (const mutate of [
      block => block.replace(/^    if:.*$/m, '    if: always()'),
      block => block.replace(/^    needs:.*$/m, '    needs: frontend-scope'),
    ]) {
      const changed = mutateWorkflowJob(normalizedCi, jobId, mutate);
      assert.notEqual(changed, normalizedCi);
      assert.notDeepEqual(validateStaticContract({ manifest, ciContent: changed }), []);
    }
  }
  const openOnMissingOutput = normalizedCi.replace("cache-read-only: ${{ needs.change-scope.outputs.backend != 'false' || strategy.job-index != 0 }}",
    "cache-read-only: ${{ needs.change-scope.outputs.backend == 'true' || strategy.job-index != 0 }}");
  assert.notEqual(openOnMissingOutput, normalizedCi);
  assert.match(validatePinnedWorkflowUses([{ ...workflow, content: openOnMissingOutput }]).join('\n'), /cache-read-only/);
  for (const mutate of [
    block => block.replace(/      - name: Setup Gradle[\s\S]*?(?=      - name:)/, ''),
    block => block.replace('      - name: Setup Gradle', '      - name: Setup Gradle\n        if: false'),
    block => block.replace('      - name: Setup Gradle', '      - name: Setup Gradle\n        continue-on-error: true'),
  ]) {
    const changed = mutateWorkflowJob(normalizedCi, 'backend-scope', mutate);
    assert.notEqual(changed, normalizedCi);
    assert.ok(validatePinnedWorkflowUses([{ ...workflow, content: changed }]).length > 0);
  }
  const duplicated = `${normalizedCi}\n  unexpected-cache-writer:\n    steps:\n      - uses: ${reviewedActionPin('gradle/actions/setup-gradle')}\n        with:\n          cache-provider: basic\n          cache-read-only: false\n`;
  assert.match(validatePinnedWorkflowUses([{ ...workflow, content: duplicated }]).join('\n'), /no reviewed writer policy/);
});

function assertMigrationTestShards(source) {
  const job = parseWorkflowJobs(source).get('migration-test-scope') ?? '';
  assert.match(job, /^    needs: change-scope$/m);
  assert.match(job, /^    if: needs\.change-scope\.outputs\.migration == 'true'$/m);
  assert.match(job, /^    timeout-minutes: 30$/m);
  assert.match(job, /^      fail-fast: false$/m);
  assert.match(job, /^        shard: \[1\/3, 2\/3, 3\/3\]$/m);
  assert.match(job, /^          persist-credentials: false\n          # The measured duration profile is bound to its historical source commit\.\n          fetch-depth: 0$/m);
  assert.match(job, /^        run: node --test scripts\/migration-verification-contract\.test\.mjs$/m);
  assert.match(job, /^        run: node scripts\/migration-test-shard\.mjs --shard "\$\{\{ matrix\.shard \}\}"$/m);
  assert.match(job, /^        if: always\(\)\n        uses: actions\/upload-artifact@[a-f0-9]{40}(?:\s+#.*)?$/m);
  for (const evidence of [
    'migration-tool/build/jacoco/test.exec',
    'migration-tool/build/test-results/test/**/*.xml',
    'migration-tool/build/migration-shard-manifest.json',
  ]) assert.ok(job.includes(evidence));
  assert.match(job, /^          if-no-files-found: error$/m);
}

test('migration test matrix is an exact three-way population with fail-closed evidence', () => {
  assertMigrationTestShards(ciContent);
  for (const [before, after] of [
    ['shard: [1/3, 2/3, 3/3]', 'shard: [1/3, 2/3]'],
    ['fail-fast: false', 'fail-fast: true'],
    ['          fetch-depth: 0', '          fetch-depth: 1'],
    ['node --test scripts/migration-verification-contract.test.mjs', 'echo skipped'],
    ['node scripts/migration-test-shard.mjs --shard "${{ matrix.shard }}"', 'echo skipped'],
    ['        if: always()\n        uses: actions/upload-artifact@', '        uses: actions/upload-artifact@'],
    ['migration-tool/build/jacoco/test.exec', 'migration-tool/build/jacoco/missing.exec'],
    ['migration-tool/build/test-results/test/**/*.xml', 'migration-tool/build/test-results/missing/*.xml'],
    ['migration-tool/build/migration-shard-manifest.json', 'migration-tool/build/missing.json'],
    ['if-no-files-found: error', 'if-no-files-found: ignore'],
  ]) {
    const changed = mutateWorkflowJob(ciContent, 'migration-test-scope', block => block.replace(before, after));
    assert.notEqual(changed, ciContent);
    assert.throws(() => assertMigrationTestShards(changed));
  }
});

test('frontend heavy source type-checks the e2e sources excluded from the root tsconfig', () => {
  const frontendJob = ciContent.match(
    /^  frontend-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(frontendJob, 'frontend-scope job must exist');
  assert.match(
    frontendJob,
    /npx tsc -p tsconfig\.e2e\.json --noEmit/,
    'e2e type check must run in CI: next build uses frontend/tsconfig.json, whose exclude drops "e2e"',
  );

  // 전제 확인 — 루트 tsconfig 가 e2e 를 exclude 하지 않게 되면 이 스텝의 근거가 바뀐다.
  const rootTsconfig = fs.readFileSync(path.join(repoRoot, 'frontend', 'tsconfig.json'), 'utf8');
  assert.match(
    rootTsconfig,
    /"e2e"/,
    'root tsconfig no longer excludes e2e — re-evaluate whether the separate e2e type-check step is still needed',
  );
});

test('change classification is fail-closed and its contract runs in the required governance job', () => {
  const classifierJob = ciContent.match(
    /^  change-scope:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];
  const secretScanJob = ciContent.match(
    /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(classifierJob, 'change-scope job must exist');
  assert.match(classifierJob, /node scripts\/ci-change-scope\.mjs/);
  assert.match(classifierJob, /Unknown or empty|unknown range|unknown means full pipeline/i);
  assert.ok(secretScanJob, 'secret-scan job must exist');
  assert.match(secretScanJob, /^    needs: \[change-scope\]$/m);
  assert.match(secretScanJob, /^    if: always\(\)$/m);
  assert.match(secretScanJob, /needs\.change-scope\.result.*!=.*success[\s\S]*?exit 1/);
  assert.match(secretScanJob, /npm run test:operational-contracts/);

  const detachedAdmission = mutateWorkflowJob(ciContent, 'secret-scan', block => block.replace(
    '    needs: [change-scope]',
    '    needs: []',
  ));
  assert.match(validateStaticContract({ manifest, ciContent: detachedAdmission }).join('\n'),
    /secret-scan.*needs/i);
});

// [2026-08-31 개정] Atlas 계약을 포함한 크로스 스택 계약(frontend/src/__tests__/cross-stack)은
//   백엔드 소스를 함께 감사한다. frontend 축에만 결속하면 백엔드-only PR 에서 frontend-scope 가
//   skip 되어 계약이 어디서도 돌지 않으므로(집계는 skip 을 성공으로 매핑), atlas ∪ backend
//   축으로 required governance job(secret-scan)에 결속한다. frontend=true이면 required coverage 전체 스위트가
//   모집단을 소유하므로 governance 단계는 중복 실행하지 않는다. 양쪽 실행 경로를 함께 확인한다.
test('Atlas and backend cross-stack contracts run once, owned by full frontend coverage when selected', () => {
  const condition = "(needs.change-scope.outputs.atlas == 'true' || needs.change-scope.outputs.backend == 'true') && needs.change-scope.outputs.frontend != 'true'";
  function crossStackBindingErrors(content) {
    const errors = [];
    const secretScanJob = content.match(
      /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
    )?.[0] ?? '';
    const crossStack = workflowStep(secretScanJob, 'Verify cross-stack contracts (frontend↔backend truth binding)');
    if (!crossStack.includes(`if: ${condition}`)) {
      errors.push('cross-stack contract step is detached from the atlas/backend scope');
    }
    if (!secretScanJob.includes('pnpm exec vitest run src/__tests__/cross-stack')) {
      errors.push('cross-stack Vitest command is missing');
    }
    const coverage = parseWorkflowJobs(content).get('frontend-coverage-scope') ?? '';
    const suite = workflowStep(coverage, 'Frontend unit and coverage suite');
    if (!/^    if: needs\.change-scope\.outputs\.frontend == 'true'\r?$/m.test(coverage)
      || /^        if:/m.test(suite) || !/^          pnpm run test:coverage 2>&1 \| tee \/tmp\/fe-test\.log\r?$/m.test(suite)) {
      errors.push('selected frontend coverage must run the unconditional full suite that owns cross-stack contracts');
    }

    // frontend 설치는 운영 계약 카탈로그의 전제다(generated-boundary-census 가 frontend 의
    // typescript 를 로드한다). 조건이 붙거나 카탈로그 뒤로 밀리면 required check 가
    // "Cannot find module 'typescript'" 로 죽는다 — 2026-09-01 실측된 실패다.
    const install = workflowStep(secretScanJob, 'Install frontend dependencies for contract execution');
    if (install === '') {
      errors.push('frontend dependency install step is missing');
    } else if (/^\s+if:/m.test(install)) {
      errors.push('frontend dependency install must stay unconditional — the contract catalog depends on it');
    }
    const installAt = secretScanJob.indexOf('name: Install frontend dependencies for contract execution');
    const contractsAt = secretScanJob.indexOf('name: Verify repository operational contracts');
    if (installAt < 0 || contractsAt < 0 || installAt > contractsAt) {
      errors.push('frontend dependencies must be installed before the operational contract catalog runs');
    }
    return errors;
  }

  assert.deepEqual(crossStackBindingErrors(ciContent), []);

  const detached = ciContent.replace(
    `if: ${condition}`,
    'if: false',
  );
  assert.match(crossStackBindingErrors(detached).join('\n'), /cross-stack contract step is detached/i);
  for (const replacement of [
    "needs.change-scope.outputs.atlas == 'true' && needs.change-scope.outputs.frontend != 'true'",
    "needs.change-scope.outputs.backend == 'true' && needs.change-scope.outputs.frontend != 'true'",
    "needs.change-scope.outputs.atlas == 'true' || needs.change-scope.outputs.backend == 'true'",
  ]) {
    assert.match(crossStackBindingErrors(ciContent.replace(condition, replacement)).join('\n'), /cross-stack contract step is detached/i,
      'dropping backend-only, dropping Atlas-only, or reintroducing duplicate execution is rejected');
  }
  for (const mutate of [
    job => job.replace("if: needs.change-scope.outputs.frontend == 'true'", 'if: false'),
    job => job.replace('id: fe-coverage', 'id: fe-coverage\n        if: false'),
    job => job.replace('pnpm run test:coverage 2>&1', 'pnpm exec vitest run src/app 2>&1'),
  ]) {
    assert.match(crossStackBindingErrors(mutateWorkflowJob(ciContent, 'frontend-coverage-scope', mutate)).join('\n'),
      /frontend coverage must run the unconditional full suite/i);
  }

  // CRLF 체크아웃에서도 성립하도록 개행을 정규식으로 흡수한다.
  const conditionalInstall = ciContent.replace(
    /( +- name: Install frontend dependencies for contract execution\r?\n)( +run: pnpm install)/,
    '$1        if: false\n$2',
  );
  assert.match(crossStackBindingErrors(conditionalInstall).join('\n'), /install must stay unconditional/i);
});

test('PR dependency review blocks only newly introduced high-risk runtime dependencies', () => {
  const secretScanJob = ciContent.match(
    /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0] ?? '';
  const step = workflowStep(secretScanJob, 'Block newly introduced high-risk runtime dependencies');

  const expectedIf = "github.event_name == 'pull_request' && (needs.change-scope.outputs.backend == 'true' || needs.change-scope.outputs.migration == 'true' || needs.change-scope.outputs.frontend == 'true')";
  assert.match(step, new RegExp(`^        if: ${expectedIf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  // 검토 핀은 필수 단계 명세(criticalSteps)가 소유한다 — 여기서 커밋을 다시 적지 않는다.
  const reviewed = manifest.criticalSteps.find(entry => entry.name === 'Block newly introduced high-risk runtime dependencies').uses;
  assert.match(reviewed, /^actions\/dependency-review-action@[0-9a-f]{40}$/);
  assert.ok(step.includes(`uses: ${reviewed}`));
  assert.match(step, /fail-on-severity: high/);
  assert.match(step, /fail-on-scopes: runtime/);
  assert.match(step, /warn-only: false/);

  const weakened = step.replace('fail-on-severity: high', 'fail-on-severity: critical');
  assert.doesNotMatch(weakened, /fail-on-severity: high/,
    'negative proof: weakening high to critical must violate the contract');

  for (const weakenedCondition of [
    step.replace(' || ', ' && '),
    step.replace(" || needs.change-scope.outputs.frontend == 'true'", ''),
    step.replace(`if: ${expectedIf}`, 'if: false'),
  ]) {
    assert.doesNotMatch(
      weakenedCondition,
      new RegExp(`^        if: ${expectedIf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'),
    );
  }
});

test('security critical steps reject advisory, command, or conditional bypasses', () => {
  const gitleaksAdvisory = ciContent.replace(
    '      - name: Run gitleaks (working tree + incremental)',
    '      - name: Run gitleaks (working tree + incremental)\n        continue-on-error: true',
  );
  const gitleaksNoop = ciContent.replace(
    /          set -euo pipefail\r?\n          VERSION=8\.28\.0/,
    '          echo bypassed\n          VERSION=8.28.0',
  );
  const dependencyAdvisory = ciContent.replace(
    '      - name: Block newly introduced high-risk runtime dependencies',
    '      - name: Block newly introduced high-risk runtime dependencies\n        continue-on-error: true',
  );
  const dependencyDetached = mutateWorkflowJob(ciContent, 'secret-scan', jobBlock => jobBlock.replace(
    /(      - name: Block newly introduced high-risk runtime dependencies\n)        if: github\.event_name == 'pull_request' && \(needs\.change-scope\.outputs\.backend == 'true' \|\| needs\.change-scope\.outputs\.migration == 'true' \|\| needs\.change-scope\.outputs\.frontend == 'true'\)/,
    '$1        if: false',
  ));
  const dependencyShell = ciContent.replace(
    '      - name: Block newly introduced high-risk runtime dependencies',
    '      - name: Block newly introduced high-risk runtime dependencies\n        shell: echo {0}',
  );
  const snapshotReadinessAdvisory = ciContent.replace(
    '      - name: Require complete dependency snapshots',
    '      - name: Require complete dependency snapshots\n        continue-on-error: true',
  );
  const snapshotReadinessNoop = ciContent.replace(
    '        run: node scripts/dependency-snapshot-readiness.mjs',
    '        run: echo snapshot-bypassed',
  );
  // 따옴표·값 표현과 무관하게 선언 줄을 바꾼다. 앵커가 안 맞으면 아래 단언이 no-op 변이를 잡는다.
  const snapshotReadinessEnvDrift = ciContent.replace(
    /^([ \t]*SNAPSHOT_WAIT_SECONDS:[ \t]*).*$/m,
    '$1"0"',
  );
  assert.notEqual(snapshotReadinessEnvDrift, ciContent, 'snapshot wait drift fixture must change the workflow');
  // 매니페스트 env 도 형제 검사처럼 뒤 주석을 값으로 읽지 않는다(의존성 계약의 표현 내성과 같다).
  // 같은 값에 주석만 달면 녹색이고, 주석이 붙어도 값이 바뀌면 붉다.
  const snapshotWaitDeclaration = /^([ \t]*SNAPSHOT_WAIT_SECONDS:[ \t]*)(.*?)[ \t]*$/m;
  const snapshotReadinessEnvComment = ciContent.replace(snapshotWaitDeclaration, '$1$2  # bounded wait');
  const snapshotReadinessEnvCommentDrift = ciContent.replace(snapshotWaitDeclaration, '$1"0"  # bounded wait');
  for (const fixture of [snapshotReadinessEnvComment, snapshotReadinessEnvCommentDrift]) {
    assert.notEqual(fixture, ciContent, 'snapshot wait comment fixture must change the workflow');
  }
  assert.deepEqual(validateStaticContract({ manifest, ciContent: snapshotReadinessEnvComment }), [],
    'a trailing YAML comment must not change the manifest env value');
  const frontendAuditAdvisory = ciContent.replace(
    '      - name: Frontend dependency audit policy',
    '      - name: Frontend dependency audit policy\n        continue-on-error: true',
  );
  const frontendAuditBypass = ciContent.replace(
    '        run: node ../scripts/frontend-audit-policy.mjs',
    '        run: echo audit-bypassed',
  );

  for (const [mutated, expected] of [
    [gitleaksAdvisory, /gitleaks.*continue-on-error/i],
    [gitleaksNoop, /gitleaks.*manifest command exactly/i],
    [dependencyAdvisory, /dependencies.*continue-on-error/i],
    [dependencyDetached, /dependencies.*exact if condition/i],
    [dependencyShell, /dependencies.*runner shell/i],
    [snapshotReadinessAdvisory, /complete dependency snapshots.*continue-on-error/i],
    [snapshotReadinessNoop, /complete dependency snapshots.*manifest command exactly/i],
    [snapshotReadinessEnvDrift, /complete dependency snapshots.*exact env/i],
    [snapshotReadinessEnvCommentDrift, /complete dependency snapshots.*exact env/i],
    [frontendAuditAdvisory, /dependency audit policy.*continue-on-error/i],
    [frontendAuditBypass, /dependency audit policy.*manifest command exactly/i],
  ]) {
    assert.match(validateStaticContract({ manifest, ciContent: mutated }).join('\n'), expected);
  }
});

// [FE-CONTRACT-06] 대기 상한의 값·단계 범위·검증기 기본값 결속은 의존성 계약 한 곳이 본다(Atlas vitest 의 사본은 걷었다).
// readiness 단계 fixture 가 이 파일에 있어 부정 시험도 여기에 둔다. 위의 매니페스트 env 고정은 별도 게이트다.
test('snapshot readiness wait binds the CI step value to the verifier default, not to YAML presentation', () => {
  const workflow = file => fs.readFileSync(path.join(repoRoot, '.github', 'workflows', file), 'utf8').replace(/\r\n/g, '\n');
  const current = {
    producerContent: workflow('dependency-submission.yml'),
    publisherContent: workflow('dependency-submission-publish.yml'),
    ciContent: ciContent.replace(/\r\n/g, '\n'),
    readinessContent: fs.readFileSync(path.join(repoRoot, 'scripts', 'dependency-snapshot-readiness.mjs'), 'utf8'),
  };
  assert.deepEqual(validateDependencySubmissionContract(current), []);
  const defaultPattern = /(env\.SNAPSHOT_WAIT_SECONDS\s*\?\?\s*['"])(\d+)(['"])/;
  const wait = Number(defaultPattern.exec(current.readinessContent)?.[2]);
  const declaration = /^ {10}SNAPSHOT_WAIT_SECONDS: .*$/m;
  assert.match(current.ciContent, declaration);
  const line = value => `          SNAPSHOT_WAIT_SECONDS: ${value}`;
  const withCi = replacement => ({ ...current, ciContent: current.ciContent.replace(declaration, () => replacement) });
  const withDefault = value => ({ ...current,
    readinessContent: current.readinessContent.replace(defaultPattern, (_, head, _old, tail) => `${head}${value}${tail}`) });

  for (const equivalent of [line(String(wait)), line(`'${wait}'`), line(`"${wait}"  # bounded wait`)]) {
    assert.deepEqual(validateDependencySubmissionContract(withCi(equivalent)), [], equivalent);
  }
  for (const [mutation, expected] of [
    [withCi(line(`"${wait + 1}"`)), /must equal the verifier default/],
    [withCi(''), /declared exactly once/],
    [withCi(`          # SNAPSHOT_WAIT_SECONDS: "${wait}"`), /declared exactly once/],
    [withCi(`${line(`"${wait}"`)}\n${line(`"${wait}"`)}`), /declared exactly once/],
    [withCi(line('${{ env.UNVERIFIED_WAIT }}')), /integer literal/],
    [withDefault(wait + 60), new RegExp(`must equal the verifier default ${wait + 60}`)],
    [{ ...withDefault(3601), ciContent: withCi(line('"3601"')).ciContent }, /between 0 and 3600/],
    [{ ...current, readinessContent: current.readinessContent.replace(defaultPattern, () => 'undefined') }, /exactly one SNAPSHOT_WAIT_SECONDS default/],
  ]) {
    assert.notDeepEqual(mutation, current, 'negative fixture must change the contract input');
    assert.match(validateDependencySubmissionContract(mutation).join('\n'), expected);
  }
});

// [2026-10-28] secret-scan 은 내려받은 gitleaks 를 실행한다 — tarball 을 고정 SHA-256 으로 확인한 뒤에만 푼다. criticalSteps 의 exact run
//   결속은 명세와 워크플로를 함께 바꾸면 통과하므로, 아래 변이는 둘을 같이 바꿔 무결성 판정만이 잡는지 본다.
test('secret scanning verifies the gitleaks tarball against a pinned SHA-256 before extracting it', () => {
  const scanRun = manifest.criticalSteps.find(step => step.name === GITLEAKS_SCAN_STEP).run;
  assert.deepEqual(validateStaticContract({ manifest, ciContent }), []);
  assert.deepEqual(gitleaksDownloadViolations(scanRun), []);
  const indent = run => run.split('\n').map(line => (line ? `          ${line}` : line)).join('\n');
  const ciLf = ciContent.replace(/\r\n/g, '\n');
  assert.ok(ciLf.includes(indent(scanRun)), 'the manifest run must be the workflow step body');
  const withScanRun = (from, to) => {
    const run = scanRun.replace(from, to);
    assert.notEqual(run, scanRun, `fixture must change the scan: ${from}`);
    return { manifest: { ...manifest, criticalSteps: manifest.criticalSteps.map(step => (step.name === GITLEAKS_SCAN_STEP ? { ...step, run } : step)) },
      ciContent: ciLf.replace(indent(scanRun), indent(run)) };
  };
  const pin = /^SHA256=[0-9a-f]{64}$/m;
  const check = /^echo "\$\{SHA256\} {2}\$\{ARCHIVE\}" \| sha256sum -c -$/m;
  const extract = /^tar -xzf "\$ARCHIVE" gitleaks$/m;
  const download = /^curl -sSfL -o "\$ARCHIVE" (\S+)$/m;
  for (const [label, from, to, detail] of [
    ['former pipe', /^SHA256=[\s\S]*^tar -xzf "\$ARCHIVE" gitleaks$/m,
      'curl -sSL "https://github.com/gitleaks/gitleaks/releases/download/v${VERSION}/gitleaks_${VERSION}_linux_x64.tar.gz" \\\n  | tar -xz gitleaks',
      /piped straight into tar/],
    ['unpinned', pin, 'SHA256="${GITLEAKS_SHA256}"', /exactly one SHA256=/],
    ['check removed', check, 'true', /checked with sha256sum -c/],
    ['extract before check', /^(echo "\$\{SHA256\}.*)\n(tar -xzf .*)$/m, '$2\n$1', /tar runs before the checksum check/],
    ['other file checked', check, 'echo "${SHA256}  ${RUNNER_TEMP}/other.tar.gz" | sha256sum -c -', /cover the file curl wrote/],
    ['other file extracted', extract, 'tar -xzf "${RUNNER_TEMP}/other.tar.gz" gitleaks', /extract the verified file/],
    ['download not checked', download, 'curl -sSfL -o "${RUNNER_TEMP}/fresh.tar.gz" $1', /cover the file curl wrote/],
  ]) {
    const errors = validateStaticContract(withScanRun(from, to));
    assert.ok(!errors.some(error => /manifest command exactly/.test(error)), `${label}: the exact-run binding must stay green so only the integrity check decides`);
    assert.match(errors.join('\n'), /must verify the downloaded tarball against a pinned SHA-256 before extracting it/, label);
    assert.match(errors.join('\n'), detail, label);
  }
  // 차단하지 않는 관측 워크플로(secret-scan-history)도 같은 판·같은 고정 값으로 같은 확인을 거친다.
  const history = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'secret-scan-history.yml'), 'utf8').replace(/\r\n/g, '\n');
  const downloadLines = scanRun.split('\n').filter(line => /^(VERSION=|SHA256=|ARCHIVE=|curl |echo "\$\{SHA256\}|tar )/.test(line));
  assert.deepEqual(gitleaksDownloadViolations(downloadLines.join('\n')), []);
  for (const line of downloadLines) assert.ok(history.includes(`\n          ${line}\n`), `secret-scan-history must download gitleaks the same way: ${line}`);
});

test('secret scanning reports before dependency installation and operational contract execution', () => {
  const job = ciContent.match(/^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m)?.[0] ?? '';
  const scanner = job.indexOf(workflowStep(job, 'Run gitleaks (working tree + incremental)'));
  assert.ok(scanner > job.indexOf('actions/checkout@'));
  for (const name of ['Install pinned operational contract dependencies', 'Verify repository operational contracts',
    'Require complete dependency snapshots']) {
    const step = workflowStep(job, name);
    assert.ok(step.length > 0, name);
    assert.ok(scanner < job.indexOf(step), `gitleaks feedback must not wait for ${name}`);
  }
});

test('CI pre-pulls the exact PostgreSQL image used by the shared Java schema harness', () => {
  const javaHarness = fs.readFileSync(path.join(
    repoRoot,
    'api-server', 'src', 'test', 'java', 'nuri', 'api', 'schema',
    'SharedPostgresMigrationTestSupport.java',
  ), 'utf8');

  // Testcontainers 2 의 컨테이너 클래스는 제네릭이 아니다(ADR-0024). 1.x 의 다이아몬드 형태도 함께 읽는다.
  const javaImage = /new PostgreSQLContainer(?:<>)?\(\"([^\"]+)\"\)/.exec(javaHarness)?.[1];
  const pullImages = content => [...content.matchAll(/docker pull --quiet ([^\s)]+)/g)]
    .map(match => match[1]);
  assert.equal(javaImage, 'postgres:17-alpine');
  assert.deepEqual([...new Set(pullImages(ciContent))], [javaImage]);

  const drifted = ciContent.replaceAll('postgres:17-alpine', 'postgres:17');
  assert.notDeepEqual([...new Set(pullImages(drifted))], [javaImage],
    'negative proof: a CI/Java image mismatch must turn this operational contract red');
});

test('release evidence remains success-only for every stable manifest context', () => {
  const release = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  assert.match(release, /\.requiredChecks[\s\S]*?map\(\.context\)/);
  assert.match(release, /\$2 == "completed" && \$3 == "success"/);
  assert.doesNotMatch(release, /\$3 == "skipped"/);
});

// [2026-10-26 DEC-OPS-384] 태그 SHA 의 초록은 앞 main 커밋의 실패를 덮지 않는다 — verify 잡이 직전 릴리스 이후 main 이력을 본다.
test('release verify checks every main commit since the previous release before publishing', () => {
  const release = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'release.yml'), 'utf8');
  // 최상위 permissions 블록을 줄로 읽는다(반복 안팎이 같은 글자를 읽는 정규식은 역추적이 지수로 는다).
  const releaseLines = release.split(/\r?\n/);
  const permissionsAt = releaseLines.indexOf('permissions:');
  const permissions = [];
  for (let index = permissionsAt + 1; permissionsAt >= 0 && index < releaseLines.length && releaseLines[index].startsWith('  '); index += 1) {
    permissions.push(releaseLines[index]);
  }
  assert.ok(permissions.some(line => /^ {2}actions: read\b/.test(line)), 'the history check reads Actions runs');
  const verify = parseWorkflowJobs(release).get('verify');
  assert.ok(verify, 'release verify job must exist');
  const step = verify.match(/- name: Require no unresolved red main run since the previous release\r?\n[\s\S]*?run: node scripts\/release-main-history\.mjs --tag-sha "\$GITHUB_SHA"/)?.[0];
  assert.ok(step, 'verify must run the release history check against the tagged SHA');
  assert.match(step, /if: github\.event_name == 'push' && startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(step, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.ok(verify.indexOf('actions/setup-node@') < verify.indexOf('scripts/release-main-history.mjs'), 'node must be ready before the check');
  assert.match(release, /^ {2}build-and-push:\r?\n {4}needs: verify$/m, 'publishing waits for verify');
});

test('E2E matrix has an always-running fail-closed aggregate for stable branch protection', () => {
  const aggregateJob = ciContent.match(
    /^  e2e-test:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(aggregateJob, 'e2e-test aggregate job must exist');
  assert.match(aggregateJob, /^    needs: \[change-scope, e2e-tests\]$/m);
  assert.match(aggregateJob, /^    if: always\(\)$/m);
  assert.match(aggregateJob, /CLASSIFIER_RESULT: \$\{\{ needs\.change-scope\.result \}\}/);
  assert.match(aggregateJob, /EXPECTED_WORK: \$\{\{ needs\.change-scope\.outputs\.e2e \}\}/);
  assert.match(aggregateJob, /SOURCE_RESULT: \$\{\{ needs\.e2e-tests\.result \}\}/);
  assert.match(aggregateJob, /run: node scripts\/aggregate-required-check\.mjs/);

  const earlyExit = ciContent.replace(
    'run: node scripts/aggregate-required-check.mjs',
    'run: |\n          exit 0 # injected bypass\n          node scripts/aggregate-required-check.mjs',
  );
  assert.match(validateStaticContract({ manifest, ciContent: earlyExit }).join('\n'), /must run.*exactly/i);
});
