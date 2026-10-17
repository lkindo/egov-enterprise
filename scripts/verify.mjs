#!/usr/bin/env node
/**
 * Cross-platform verification entry point.
 *
 * Profiles are intentionally nested by cost:
 *   docs < fast < push < full
 * Browser E2E and live repository policy checks remain explicit because they
 * require running services or external credentials. The independent migration
 * scope verifies its CLI module without online UI governance dependencies.
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
    env: { ...process.env, TZ: 'Asia/Seoul', ...extraEnv },
  });
}

let operationalContractsRan = false;
function runOperationalContracts() {
  if (operationalContractsRan) return;
  run('npm run test:operational-contracts');
  operationalContractsRan = true;
}

function runDocumentationContracts() {
  runOperationalContracts();
  run('pnpm -C frontend exec vitest run src/__tests__/cross-stack/governance-atlas-contract.test.ts');
}

function runRepositoryContracts() {
  runOperationalContracts();
}

function runFrontendStatic() {
  run('pnpm -C frontend run codegen:verify');
  run('pnpm -C frontend run codegen:verify:zod');
  run('pnpm -C frontend run lint');
  run('pnpm -C frontend run test:form-validation');
  run('pnpm -C frontend exec tsc --noEmit');
  run('pnpm -C frontend run type-check:e2e');
}

function runFastProfile() {
  runRepositoryContracts();
  run(`${gradlew} compileJava compileTestJava -Dfile.encoding=UTF-8`);
  runFrontendStatic();
  run('pnpm -C frontend exec vitest run src/__tests__');
}

function frontendBuildEnvironment() {
  return process.env.JWT_SECRET
    ? {}
    : { JWT_SECRET: randomBytes(44).toString('hex') };
}

function runBackendFull({ crossStack = true } = {}) {
  runRepositoryContracts();
  // `:foundation:check` 는 foundation/build.gradle이 소유하는 INSTRUCTION·CLASS-LINE ratchet의
  // 유일한 로컬 실행 경로다 — jacocoTestCoverageVerification 이 check 에만 결속돼 있어,
  // 이 태스크 없이 green 이면 local-full tier 선언이 거짓이 된다(2026-08-31 실측 정합).
  run(`${gradlew} compileJava compileTestJava test :api-server:harnessTest :foundation:check jacocoRootCoverageVerification :api-server:schemaValidationTest --warning-mode fail --console=plain -Dfile.encoding=UTF-8`);
  // be 단독 실행은 횡단 계약을 직접 실행한다. full에서는 frontend coverage가
  // Atlas를 포함한 같은 파일들을 실행하므로 그 한 번의 결과를 사용한다.
  if (crossStack) {
    run('pnpm -C frontend exec vitest run src/__tests__/cross-stack');
  }
}

function runFrontendFull() {
  runRepositoryContracts();
  runFrontendStatic();
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
    runBackendFull();
  } else if (scope === 'fe') {
    runFrontendFull();
  } else if (scope === 'full') {
    runBackendFull({ crossStack: false });
    runFrontendFull();
  } else if (scope === 'e2e') {
    runOperationalContracts();
    run('pnpm -C frontend run type-check:e2e');
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
