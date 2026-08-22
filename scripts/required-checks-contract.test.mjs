import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  comparePullRequestPolicy,
  compareRequiredChecks,
  compareRequiredContexts,
  parseWorkflowJobs,
  validatePinnedWorkflowUses,
  validateStaticContract,
} from './required-checks-contract.mjs';

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

test('manifest intentionally names five stable enforced merge checks', () => {
  assert.deepEqual(expectedContexts, [
    'backend-build',
    'frontend-build',
    'secret-scan',
    'e2e-test',
    'mutation-test',
  ]);
});

test('repository required-check manifest maps every exact context to a real CI job and matrix value', () => {
  assert.deepEqual(validateStaticContract({ manifest, ciContent }), []);
});

test('exact five-context ruleset satisfies the contract', () => {
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
    /  e2e-tests:\r?\n    needs: \[change-scope, backend-scope, frontend-scope\]\r?\n    if: .*$/m,
    '  e2e-tests:\n    needs: [change-scope, backend-scope, frontend-scope]\n    if: true',
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: detachedCondition }).join('\n'),
    /e2e-tests.*fail-closed scope condition/i,
  );

  const detachedRunner = ciContent.replace(
    'npx playwright test --project=full-suite "${E2E_SPECS[@]}" --reporter=blob,line,json 2>&1 | tee /tmp/e2e-run.log',
    'echo skipped-e2e',
  );
  assert.match(
    validateStaticContract({ manifest, ciContent: detachedRunner }).join('\n'),
    /source step.*must run/i,
  );

  const detachedResultContract = ciContent.replace(
    'node ../scripts/playwright-result-contract.mjs --report "$PLAYWRIGHT_JSON_OUTPUT_FILE" "${E2E_SPECS[@]}"',
    'echo skipped-result-contract',
  );
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
    /  mutation-test:\r?\n    needs: \[change-scope, mutation-scope\]\r?\n    if: always\(\)/,
    '  mutation-test:\n    needs: [change-scope, mutation-scope]\n    if: success()',
  );

  assert.match(validateStaticContract({ manifest, ciContent: conditional }).join('\n'), /job-level if.*mutation-test/i);
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
  const expanded = ciContent.replace(
    '        shard: [1/3, 2/3, 3/3]',
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
    /  mutation-test:\r?\n    needs: \[change-scope, mutation-scope\]\r?\n/,
    '  mutation-test:\n',
  );
  const upstreamContinue = ciContent.replace(
    /  mutation-scope:\r?\n/,
    '  mutation-scope:\n    continue-on-error: true\n',
  );
  const pitStepContinue = ciContent.replace(
    /      - name: Incremental Mutation Test \(\$\{\{ matrix\.scope \}\}\)\r?\n/,
    '      - name: Incremental Mutation Test (${{ matrix.scope }})\n        continue-on-error: true\n',
  );

  assert.match(validateStaticContract({ manifest, ciContent: noNeeds }).join('\n'), /needs.*mutation-scope/i);
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
    '      - name: Incremental Mutation Test (${{ matrix.scope }})',
    '      - name: Incremental Mutation Test (${{ matrix.scope }})\n        shell: echo {0}',
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
    assert.deepEqual(check.needs, ['change-scope', sourceJobId]);
    assert.equal(check.aggregate.sourceJobId, sourceJobId);
    assert.equal(check.aggregate.scopeExpression, `needs.change-scope.outputs.${scope}`);
    assert.equal(check.aggregate.resultExpression, `needs.${sourceJobId}.result`);
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

test('heavy source needs point to source jobs rather than stable aggregate contexts', () => {
  assert.deepEqual(manifest.requiredChecks[3].aggregate.sourceNeeds,
    ['change-scope', 'backend-scope', 'frontend-scope']);
  assert.deepEqual(manifest.requiredChecks[4].aggregate.sourceNeeds,
    ['change-scope', 'backend-scope']);

  const staleE2eNeeds = mutateWorkflowJob(ciContent, 'e2e-tests', block => block.replace(
    '    needs: [change-scope, backend-scope, frontend-scope]',
    '    needs: [change-scope, backend-build, frontend-build]',
  ));
  const staleMutationNeeds = mutateWorkflowJob(ciContent, 'mutation-scope', block => block.replace(
    '    needs: [change-scope, backend-scope]',
    '    needs: [change-scope, backend-build]',
  ));
  assert.match(validateStaticContract({ manifest, ciContent: staleE2eNeeds }).join('\n'), /e2e-tests.*needs must exactly match/i);
  assert.match(validateStaticContract({ manifest, ciContent: staleMutationNeeds }).join('\n'), /mutation-scope.*needs must exactly match/i);
});

test('backend and frontend hard build steps cannot be skipped or made advisory', () => {
  for (const [jobId, stepName] of [
    ['backend-scope', 'Build and Test with Gradle'],
    ['frontend-scope', 'Build and Test'],
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
    broken.requiredChecks[checkIndex].aggregate[field] = 'banana';
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

test('mutation source keeps the classifier and backend fail-closed condition', () => {
  const weakened = ciContent.replace(
    /  mutation-scope:\r?\n    needs: \[change-scope, backend-scope\]\r?\n    if: .*\r?\n/,
    '  mutation-scope:\n    needs: [change-scope, backend-scope]\n    if: always()\n',
  );

  assert.match(
    validateStaticContract({ manifest, ciContent: weakened }).join('\n'),
    /source job.*fail-closed scope condition/i,
  );
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
    /      - name: Incremental Mutation Test \(\$\{\{ matrix\.scope \}\}\)\r?\n/,
    '      - name: Incremental Mutation Test (${{ matrix.scope }})\n        if: false\n',
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

  assert.ok(frontendJob, 'frontend-scope job must exist');
  assert.match(frontendJob, /^    needs: change-scope$/m);
  assert.doesNotMatch(frontendJob, /^    needs:.*backend-scope/m,
    'frontend-scope consumes no backend artifact and must not be serialized behind backend-scope');
});

test('Gradle verification commands fail on deprecation warnings', () => {
  const guardedCommands = [
    './gradlew :foundation:test --no-build-cache --warning-mode fail --console=plain',
    './gradlew build jacocoRootCoverageVerification check -Dopenapi.export.path=api-docs.json --warning-mode fail --console=plain',
    './gradlew :api-server:schemaValidationTest --warning-mode fail --console=plain',
    './gradlew ${{ matrix.gradle }} --warning-mode fail --console=plain',
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
  const pit = ciContent.indexOf('name: Incremental Mutation Test (${{ matrix.scope }})');
  assert.ok(provision >= 0 && provision < pit, 'Gradle distribution retry must run before the PIT hard gate');
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

  const rootPackage = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  assert.equal(
    rootPackage.scripts?.['test:operational-contracts'],
    'node --test "scripts/*.test.mjs" ".agent/scripts/*.test.js"',
  );
  const prePush = fs.readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  const operationalGate = prePush.indexOf('npm run test:operational-contracts');
  const atlasGate = prePush.indexOf('vitest run src/__tests__/governance-atlas-contract.test.ts');
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
  assert.match(secretScanJob, /^    needs: change-scope$/m);
  assert.match(secretScanJob, /^    if: always\(\)$/m);
  assert.match(secretScanJob, /needs\.change-scope\.result.*!=.*success[\s\S]*?exit 1/);
  assert.match(secretScanJob, /npm run test:operational-contracts/);
});

test('Atlas-only changes run their browser-document contract inside the required governance job', () => {
  function atlasBindingErrors(content) {
    const errors = [];
    const secretScanJob = content.match(
      /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
    )?.[0] ?? '';
    for (const name of [
      'Set up pnpm for Atlas contract',
      'Install frontend dependencies for Atlas contract',
      'Verify Governance Atlas contract',
    ]) {
      const step = workflowStep(secretScanJob, name);
      if (!step.includes("if: needs.change-scope.outputs.atlas == 'true'")) {
        errors.push(`${name} is detached from atlas scope`);
      }
    }
    if (!secretScanJob.includes('pnpm exec vitest run src/__tests__/governance-atlas-contract.test.ts')) {
      errors.push('Atlas Vitest command is missing');
    }
    return errors;
  }

  assert.deepEqual(atlasBindingErrors(ciContent), []);

  const detached = ciContent.replace(
    /name: Set up pnpm for Atlas contract\r?\n        if: needs\.change-scope\.outputs\.atlas == 'true'/,
    "name: Set up pnpm for Atlas contract\n        if: false",
  );
  assert.match(atlasBindingErrors(detached).join('\n'), /Set up pnpm.*detached/i);
});

test('PR dependency review blocks only newly introduced high-risk runtime dependencies', () => {
  const secretScanJob = ciContent.match(
    /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0] ?? '';
  const step = workflowStep(secretScanJob, 'Block newly introduced high-risk runtime dependencies');

  const expectedIf = "github.event_name == 'pull_request' && (needs.change-scope.outputs.backend == 'true' || needs.change-scope.outputs.frontend == 'true')";
  assert.match(step, new RegExp(`^        if: ${expectedIf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'm'));
  assert.match(step, /actions\/dependency-review-action@a1d282b36b6f3519aa1f3fc636f609c47dddb294/);
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
    /(      - name: Block newly introduced high-risk runtime dependencies\n)        if: github\.event_name == 'pull_request' && \(needs\.change-scope\.outputs\.backend == 'true' \|\| needs\.change-scope\.outputs\.frontend == 'true'\)/,
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
  const snapshotReadinessEnvDrift = ciContent.replace(
    '          SNAPSHOT_WAIT_SECONDS: "600"',
    '          SNAPSHOT_WAIT_SECONDS: "0"',
  );
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
    [frontendAuditAdvisory, /dependency audit policy.*continue-on-error/i],
    [frontendAuditBypass, /dependency audit policy.*manifest command exactly/i],
  ]) {
    assert.match(validateStaticContract({ manifest, ciContent: mutated }).join('\n'), expected);
  }
});

test('CI pre-pulls the exact PostgreSQL image used by the shared Java schema harness', () => {
  const javaHarness = fs.readFileSync(path.join(
    repoRoot,
    'api-server', 'src', 'test', 'java', 'nuri', 'api', 'schema',
    'SharedPostgresMigrationTestSupport.java',
  ), 'utf8');

  const javaImage = /new PostgreSQLContainer<>\(\"([^\"]+)\"\)/.exec(javaHarness)?.[1];
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
