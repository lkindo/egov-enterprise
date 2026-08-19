#!/usr/bin/env node
/**
 * Cross-platform verification entry point.
 *
 * Profiles are intentionally nested by cost:
 *   docs < fast < push < full
 * Browser E2E and live repository policy checks remain explicit because they
 * require running services or external credentials.
 */
import { execSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { platform } from 'node:os';

const isWin = platform() === 'win32';
const gradlew = isWin ? '.\\gradlew.bat' : './gradlew';
const requestedScope = (process.argv[2] || 'full').toLowerCase();
const scope = requestedScope === 'all' ? 'full' : requestedScope;
const allowedScopes = new Set(['docs', 'fast', 'push', 'full', 'be', 'fe', 'e2e', 'ops']);

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
  run('pnpm -C frontend exec vitest run src/__tests__/governance-atlas-contract.test.ts');
}

function runRepositoryContracts() {
  runOperationalContracts();
}

function runFrontendStatic() {
  run('pnpm -C frontend run codegen:verify');
  run('pnpm -C frontend run codegen:verify:zod');
  run('pnpm -C frontend run lint');
  run('pnpm -C frontend exec tsc --noEmit');
  run('pnpm -C frontend run type-check:e2e');
}

function runFastProfile() {
  runDocumentationContracts();
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

function runBackendFull() {
  runRepositoryContracts();
  run(`${gradlew} compileJava compileTestJava test :api-server:harnessTest jacocoRootCoverageVerification :api-server:schemaValidationTest --warning-mode fail --console=plain -Dfile.encoding=UTF-8`);
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
    runDocumentationContracts();
    runBackendFull();
    runFrontendFull();
  } else if (scope === 'e2e') {
    runOperationalContracts();
    run('pnpm -C frontend run type-check:e2e');
    run('pnpm -C frontend run test:e2e');
  } else if (scope === 'ops') {
    run('node scripts/verify-branch-protection.mjs');
  }

  console.log(`\n✅ [verify:${scope}] 요청 범위 검증 통과`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ [verify:${scope}] 검증 실패 — ${message}`);
  process.exit(1);
}
