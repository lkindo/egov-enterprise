#!/usr/bin/env node
/**
 * Cross-platform verification entry point.
 *
 * Profiles are intentionally nested by cost:
 *   docs < fast < push < full
 * Browser E2E and live repository policy checks remain explicit because they
 * require running services or external credentials. The independent migration
 * scope verifies its CLI module without online UI governance dependencies.
 *
 * fast·push·fe·full·e2e 는 실패가 잦고 짧은 정적 검사(codegen·타입·lint·폼 census — fast·push 는 Java 컴파일 포함,
 * e2e 는 E2E 타입 검사만)를 운영 계약(로컬 약 11분)보다 먼저 돌려 실패를 빨리 알린다. full·be 의 Java 컴파일은
 * runBackendSuite 의 gradle 한 줄 안에 있어 계약 뒤에 돌고, be·docs 는 계약이 먼저다. 성공하면 같은 명령이 모두
 * 실행되므로 명령 집합과 총시간은 순서와 무관하다. fast·push·full 은 맨 앞에서 CodeQL 근사(`npm run sast:approx`, 수 초)를 돈다.
 */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { platform } from 'node:os';

const isWin = platform() === 'win32';
const gradlew = isWin ? '.\\gradlew.bat' : './gradlew';
const requestedScope = (process.argv[2] || 'full').toLowerCase();
const scope = requestedScope === 'all' ? 'full' : requestedScope;
const allowedScopes = new Set(['docs', 'fast', 'push', 'full', 'be', 'fe', 'e2e', 'ops', 'migration']);

if (!allowedScopes.has(scope)) {
  console.error(`알 수 없는 범위 '${requestedScope}' — ${[...allowedScopes].join('|')} 중 하나여야 합니다.`);
  process.exit(2);
}

function run(command, extraEnv = {}) {
  console.log(`\n▶ ${command}`);
  execSync(command, {
    stdio: 'inherit',
    // 로컬 기본 시간대는 KST 다(개발 기계와 같은 조건). CI 러너는 UTC 로 돈다 — 명시한 TZ 가 이기므로
    // `npx cross-env TZ=UTC npm run verify:<범위>`(셸 중립, 세션에 TZ 를 남기지 않음)로 CI 조건을 그대로 재현한다
    // (시험 JVM 은 build.gradle 이 따로 UTC 로 고정한다). 생성물 검증(verify-reusable-artifact)·T2(reusable-nightly)는
    // CI 에서도 실행기가 자식 환경을 만들어 KST 로 고정하므로 이 손잡이를 두지 않는다.
    env: { ...process.env, TZ: process.env.TZ || 'Asia/Seoul', ...extraEnv },
  });
}

// 운영 계약은 그것을 부르는 범위(docs·fast·push·be·fe·full·e2e)에서 정확히 한 번 돌고, ops·migration 은 부르지 않는다.
// 한 번만 돌리는 가드를 두지 않고 각 범위 분기가 직접 한 번 부른다 —
// gate registry 가 범위 분기에서 이 줄까지의 실행 경로를 정적으로 읽는다(local tier 결속).
function runOperationalContracts() {
  run('npm run test:operational-contracts');
}

function runDocumentationContracts() {
  runOperationalContracts();
  run('pnpm -C frontend exec vitest run src/__tests__/cross-stack/governance-atlas-contract.test.ts');
}

function runFrontendStatic() {
  run('pnpm -C frontend run codegen:verify');
  run('pnpm -C frontend run codegen:verify:zod');
  run('pnpm -C frontend exec tsc --noEmit');
  run('pnpm -C frontend run type-check:e2e');
  run('pnpm -C frontend run lint');
  run('pnpm -C frontend run test:form-validation');
}

// CodeQL(secure-coding)이 반복해 막아 온 JavaScript 규칙 셋의 로컬 근사(scripts/sast-approximation.mjs). 판정 권위는 CI CodeQL 이다.
function runScriptStatic() {
  run('npm run sast:approx');
}

function runFastProfile() {
  runScriptStatic();
  run(`${gradlew} compileJava compileTestJava -Dfile.encoding=UTF-8`);
  runFrontendStatic();
  runOperationalContracts();
  run('pnpm -C frontend exec vitest run src/__tests__');
}

function frontendBuildEnvironment() {
  return process.env.JWT_SECRET
    ? {}
    : { JWT_SECRET: randomBytes(44).toString('hex') };
}

function runBackendSuite() {
  // `:foundation:check` 는 foundation/build.gradle이 소유하는 INSTRUCTION·CLASS-LINE ratchet의
  // 유일한 로컬 실행 경로다 — jacocoTestCoverageVerification 이 check 에만 결속돼 있어,
  // 이 태스크 없이 green 이면 local-full tier 선언이 거짓이 된다(2026-08-31 실측 정합).
  run(`${gradlew} compileJava compileTestJava test :api-server:harnessTest :foundation:check jacocoRootCoverageVerification :api-server:schemaValidationTest --warning-mode fail --console=plain -Dfile.encoding=UTF-8`);
}

function runFrontendPackaging() {
  run('pnpm -C frontend build', frontendBuildEnvironment());
  run('pnpm -C frontend run bundle:check');
  run('pnpm -C frontend run test:coverage');
}

try {
  if (scope === 'docs') {
    runDocumentationContracts();
  } else if (scope === 'fast') {
    runFastProfile();
  } else if (scope === 'push') {
    runFastProfile();
    run(`${gradlew} :api-server:harnessTest -Dfile.encoding=UTF-8`);
  } else if (scope === 'be') {
    runOperationalContracts();
    runBackendSuite();
    // be 단독 실행은 횡단 계약을 직접 실행한다. full에서는 frontend coverage가
    // Atlas를 포함한 같은 파일들을 실행하므로 그 한 번의 결과를 사용한다.
    run('pnpm -C frontend exec vitest run src/__tests__/cross-stack');
  } else if (scope === 'fe') {
    runFrontendStatic();
    runOperationalContracts();
    runFrontendPackaging();
  } else if (scope === 'full') {
    runScriptStatic();
    runFrontendStatic();
    runOperationalContracts();
    runBackendSuite();
    runFrontendPackaging();
  } else if (scope === 'e2e') {
    run('pnpm -C frontend run type-check:e2e');
    runOperationalContracts();
    run('node scripts/run-isolated-e2e.mjs');
  } else if (scope === 'ops') {
    run('node scripts/verify-branch-protection.mjs');
  } else if (scope === 'migration') {
    // ADR-0018: module tests use disposable fixtures; this never invokes the
    // migration CLI against adopter data or grants an operational load approval.
    run('node --test scripts/migration-verification-contract.test.mjs');
    const shardRoot = process.env.MIGRATION_SHARD_EXECUTION_ROOT;
    if (shardRoot) {
      if (!/^[A-Za-z0-9._/-]+$/.test(shardRoot) || shardRoot.split('/').includes('..')) {
        throw new Error('MIGRATION_SHARD_EXECUTION_ROOT must be a repository-relative safe path');
      }
      run(`node scripts/migration-test-shard.mjs --verify-artifacts ${shardRoot}`);
      run(`${gradlew} :migration-tool:compileJava :migration-tool:bootJar jacocoMigrationCoverageVerification -PmigrationShardExecutionRoot=${shardRoot} --no-daemon --warning-mode fail --console=plain -Dfile.encoding=UTF-8`);
    } else {
      run(`${gradlew} :migration-tool:compileJava :migration-tool:compileTestJava :migration-tool:test :migration-tool:bootJar jacocoMigrationCoverageVerification --no-daemon --warning-mode fail --console=plain -Dfile.encoding=UTF-8`);
    }
  }

  console.log(`\n✅ [verify:${scope}] 요청 범위 검증 통과`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ [verify:${scope}] 검증 실패 — ${message}`);
  process.exit(1);
}
