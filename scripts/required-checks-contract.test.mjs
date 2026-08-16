import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  compareRequiredChecks,
  compareRequiredContexts,
  validateStaticContract,
} from './required-checks-contract.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, '.github', 'required-checks.json'), 'utf8'));
const ciContent = fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
const expectedContexts = manifest.requiredChecks.map(({ context }) => context);

test('manifest intentionally names the seven enforced merge checks', () => {
  assert.deepEqual(expectedContexts, [
    'backend-build',
    'frontend-build',
    'secret-scan',
    'e2e-tests (1/3)',
    'e2e-tests (2/3)',
    'e2e-tests (3/3)',
    'mutation-test',
  ]);
});

test('repository required-check manifest maps every exact context to a real CI job and matrix value', () => {
  assert.deepEqual(validateStaticContract({ manifest, ciContent }), []);
});

test('exact seven-context ruleset satisfies the contract', () => {
  assert.deepEqual(compareRequiredContexts(expectedContexts, expectedContexts), []);
});

test('required contexts must originate from the pinned GitHub Actions integration', () => {
  const actual = expectedContexts.map(context => ({ context, integrationId: manifest.integrationId }));
  assert.deepEqual(compareRequiredChecks(expectedContexts, actual, manifest.integrationId), []);

  actual[3].integrationId = null;
  assert.match(
    compareRequiredChecks(expectedContexts, actual, manifest.integrationId).join('\n'),
    /e2e-tests \(1\/3\).*integration 15368/i,
  );
});

test('missing mutation aggregate is rejected', () => {
  const actual = expectedContexts.filter(context => context !== 'mutation-test');
  assert.match(compareRequiredContexts(expectedContexts, actual).join('\n'), /missing.*mutation-test/i);
});

test('missing E2E shard is rejected', () => {
  const actual = expectedContexts.filter(context => context !== 'e2e-tests (2/3)');
  assert.match(compareRequiredContexts(expectedContexts, actual).join('\n'), /missing.*e2e-tests \(2\/3\)/i);
});

test('unexpected required context is rejected as ruleset drift', () => {
  const actual = [...expectedContexts, 'legacy-check'];
  assert.match(compareRequiredContexts(expectedContexts, actual).join('\n'), /unexpected.*legacy-check/i);
});

test('unknown source job and absent matrix value are rejected', () => {
  const broken = structuredClone(manifest);
  broken.requiredChecks[0].jobId = 'missing-job';
  broken.requiredChecks[3].matrix.value = '4/4';

  const errors = validateStaticContract({ manifest: broken, ciContent }).join('\n');
  assert.match(errors, /missing-job/);
  assert.match(errors, /4\/4/);
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

test('a second matrix axis is rejected because it creates unlisted check contexts', () => {
  const expanded = ciContent.replace(
    '        shard: [1/3, 2/3, 3/3]',
    '        shard: [1/3, 2/3, 3/3]\n        os: [ubuntu-latest, windows-latest]',
  );

  assert.match(validateStaticContract({ manifest, ciContent: expanded }).join('\n'), /matrix.*os/i);
});

test('matrix values must come from strategy.matrix rather than a decoy job field', () => {
  const includeMatrix = ciContent.replace(
    '        shard: [1/3, 2/3, 3/3]',
    '        include:\n          - shard: 1/3\n          - shard: 2/3\n          - shard: 3/3\n    env:\n      shard: [1/3, 2/3, 3/3]',
  );

  const errors = validateStaticContract({ manifest, ciContent: includeMatrix }).join('\n');
  assert.match(errors, /matrix.*include/i);
  assert.match(errors, /matrix key 'shard'/i);
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
    /  mutation-test:\r?\n    needs: mutation-scope\r?\n    if: always\(\)/,
    '  mutation-test:\n    needs: mutation-scope\n    if: success()',
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

test('extra matrix value is rejected because it creates an unlisted check context', () => {
  const expanded = ciContent.replace(
    '        shard: [1/3, 2/3, 3/3]',
    '        shard: [1/3, 2/3, 3/3, 4/4]',
  );

  assert.match(validateStaticContract({ manifest, ciContent: expanded }).join('\n'), /unexpected matrix value '4\/4'/i);
});

test('duplicate and empty actual matrix values cannot be hidden by set normalization', () => {
  const duplicate = ciContent.replace(
    '        shard: [1/3, 2/3, 3/3]',
    '        shard: [1/3, 2/3, 3/3, 3/3]',
  );
  const empty = ciContent.replace(
    '        shard: [1/3, 2/3, 3/3]',
    '        shard: [1/3, 2/3, 3/3, ""]',
  );

  assert.match(validateStaticContract({ manifest, ciContent: duplicate }).join('\n'), /duplicate actual matrix value/i);
  assert.match(validateStaticContract({ manifest, ciContent: empty }).join('\n'), /empty matrix value/i);
});

test('mutation aggregate remains bound to its source job and real PIT command', () => {
  const noNeeds = ciContent.replace(
    /  mutation-test:\r?\n    needs: mutation-scope\r?\n/,
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

  assert.match(validateStaticContract({ manifest, ciContent: noNeeds }).join('\n'), /must need exactly 'mutation-scope'/i);
  assert.match(validateStaticContract({ manifest, ciContent: upstreamContinue }).join('\n'), /source job.*continue-on-error/i);
  assert.match(validateStaticContract({ manifest, ciContent: pitStepContinue }).join('\n'), /source step.*continue-on-error/i);
});

test('mutation aggregate cannot fake or ignore the matrix conclusion', () => {
  const fakeResult = ciContent.replace(
    'RESULT="${{ needs.mutation-scope.result }}"',
    'RESULT="success"',
  );
  const noop = ciContent.replace(
    /      - name: 뮤테이션 스코프 결과 집계\r?\n        run: \|[\s\S]*?          fi\r?\n/,
    '      - name: 뮤테이션 스코프 결과 집계\n        run: echo ok\n',
  );
  const noExit = ciContent.replace(
    /(if \[ "\$RESULT" != "success" \]; then[\s\S]*?)            exit 1/,
    '$1            echo ignored',
  );

  assert.match(validateStaticContract({ manifest, ciContent: fakeResult }).join('\n'), /must consume 'needs\.mutation-scope\.result'/i);
  assert.match(validateStaticContract({ manifest, ciContent: noop }).join('\n'), /must consume|must exit 1/i);
  assert.match(validateStaticContract({ manifest, ciContent: noExit }).join('\n'), /must exit 1/i);
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

test('frontend required check starts independently from the backend required check', () => {
  const frontendJob = ciContent.match(
    /^  frontend-build:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(frontendJob, 'frontend-build job must exist');
  assert.doesNotMatch(
    frontendJob,
    /^    needs:/m,
    'frontend-build consumes no backend artifact and must not be serialized behind backend-build',
  );
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

test('backend required check provisions the Gradle distribution with a bounded retry', () => {
  const backendJob = ciContent.match(
    /^  backend-build:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(backendJob, 'backend-build job must exist');
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

// [2026-08-16 신설] 훅 전용이던 검증 2건을 CI 로 미러링하면서, 그 스텝이 조용히 사라지지
//   못하도록 고정한다. `.githooks/*` 는 `--no-verify` / `SKIP_HOOKS=1` 로 우회되므로 훅에만
//   있는 검증은 required check 가 아니다 — 우회한 푸시에서 무검증으로 통과했다.
//   아래 두 테스트는 "게이트는 실행 경로가 있어야 게이트다"(GEMINI.md §0.7-H5)를 계약으로 굳힌다.

test('secret-scan runs the reusable-base census contract that pre-push also enforces', () => {
  const secretScanJob = ciContent.match(
    /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(secretScanJob, 'secret-scan job must exist');
  assert.match(
    secretScanJob,
    /node --test scripts\/reusable-base-census\.test\.mjs/,
    'reusable-base census must run in CI, not only in .githooks/pre-push (hooks are bypassable)',
  );

  // 훅 쪽에도 남아 있어야 로컬에서 빠르게 잡힌다 — 한쪽으로 이사시키는 것은 봉합이 아니다.
  const prePush = fs.readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  assert.match(prePush, /node --test scripts\/reusable-base-census\.test\.mjs/);
});

test('frontend required check type-checks the e2e sources excluded from the root tsconfig', () => {
  const frontendJob = ciContent.match(
    /^  frontend-build:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(frontendJob, 'frontend-build job must exist');
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

test('secret-scan runs the documentation link-integrity gate that pre-push also enforces', () => {
  const secretScanJob = ciContent.match(
    /^  secret-scan:\r?\n[\s\S]*?(?=^  [a-z][a-z0-9-]*:\r?$)/m,
  )?.[0];

  assert.ok(secretScanJob, 'secret-scan job must exist');
  assert.match(
    secretScanJob,
    /node --test scripts\/docs-link-integrity\.test\.mjs/,
    'doc link gate must run in CI, not only in .githooks/pre-push (hooks are bypassable)',
  );

  const prePush = fs.readFileSync(path.join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  assert.match(prePush, /node --test scripts\/docs-link-integrity\.test\.mjs/);
});
