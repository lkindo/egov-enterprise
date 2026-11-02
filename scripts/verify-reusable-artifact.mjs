#!/usr/bin/env node
/** A generated product's checks. Upstream framework regression tests run in the producer repository. */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compositionProfiles } from './composition-profiles.mjs';
import { normalizeBackendLayout } from './reusable-layout.mjs';

// 검증 단계 id 의 정본. 생성기 엔진·서버가 이 목록을 가져가 실패한 단계를 이름으로 말한다.
// 이 파일은 구성 이름 판정(composition-profiles.mjs, Node 내장만)과 reusable-layout.mjs 밖의 생성기 모듈을 가져오지 않는다 — 이관 제품이
// 이 셋을 함께 복사한다(generate-migration-product.mjs).
export const VERIFICATION_STEP_IDS = Object.freeze(['governance', 'ui-governance', 'entrypoints', 'backend', 'typecheck', 'lint', 'build']);

/** 구성의 벤더. PostgreSQL 은 기본 단계표를 쓴다. */
export const verificationVendor = database => (database?.vendor && database.vendor !== 'postgresql' ? database.vendor : undefined);
/** 벤더 생성물이 통합 시험에 쓰는 번역 입력. */
export const vendorInputPath = vendor => `config/vendor/${vendor}/vendor-input.json`;

/** 벤더 스키마만 다시 보는 범위. 인증 주장이 없고 벤더 프로젝트에만 있다. */
export const VENDOR_SCHEMA_SCOPE = 'vendor-schema';
const GRADLE_OPTIONS = Object.freeze(['--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8']);
/** 생성물의 기준선과 도입자 마이그레이션을 실제 Flyway 로 적용한 DB 에서 대조하고, 카탈로그 시험과 시나리오를 돌린다. */
export const vendorIntegrationStep = (vendor, layout) => ({ id: 'backend', command: 'node', args: ['scripts/project-composer-vendor-integration.mjs', '--input', vendorInputPath(vendor), '--vendor', vendor, '--layout', layout,
  '--flyway', `classpath:db/vendor/${vendor}`] });

/**
 * 범위·배치에 맞는 검증 단계 표. 명령 목록(verificationCommands)도 이 표에서 만든다.
 * 벤더 생성물의 스키마 시험은 PostgreSQL 컨테이너 대신 그 벤더의 일회용 DB 에서 돈다(ADR-0047 D-10).
 */
export function verificationSteps(scope = 'full', layout = 'multi-module', { vendor } = {}) {
  if (!['contracts', 'backend', 'frontend', 'full', VENDOR_SCHEMA_SCOPE].includes(scope)) throw new Error(`scope must be contracts, backend, frontend, full or ${VENDOR_SCHEMA_SCOPE}`);
  normalizeBackendLayout(layout);
  const taskPrefix = layout === 'single-module' ? '' : ':api-server:';
  if (scope === VENDOR_SCHEMA_SCOPE && !vendor) throw new Error('vendor-schema 는 PostgreSQL 외 DB 로 생성한 프로젝트에서만 쓴다');
  // 생성물 인증(거버넌스 첫 단계)을 지나지 않는다. 첫 소스 변경 뒤 전체 검증이 거기서 멈춰도 벤더 스키마 신호는 받게 한다.
  if (scope === VENDOR_SCHEMA_SCOPE) return [
    { id: 'backend', command: 'gradle', args: ['compileJava', 'compileTestJava', `${taskPrefix}harnessTest`, ...GRADLE_OPTIONS] },
    vendorIntegrationStep(vendor, layout),
  ];
  const steps = [
    { id: 'governance', command: 'node', args: ['scripts/verify-reusable-governance.mjs'] },
    { id: 'ui-governance', command: 'node', args: ['--test', 'scripts/reusable-ui-governance-contract.test.mjs'] },
    { id: 'entrypoints', command: 'node', args: ['--test', 'scripts/reusable-artifact-entrypoints-contract.test.mjs'] },
  ];
  if (['backend', 'full'].includes(scope)) steps.push(
    { id: 'backend', command: 'gradle', args: ['compileJava', 'compileTestJava', `${taskPrefix}harnessTest`, ...(vendor ? [] : [`${taskPrefix}schemaValidationTest`]), ...GRADLE_OPTIONS] },
    ...(vendor ? [
      vendorIntegrationStep(vendor, layout),
      // 대체 분류 시험의 근거다. CHECK 와 트리거의 의미를 PostgreSQL 과 같은 값으로 대조한다.
      { id: 'backend', command: 'node', args: ['scripts/project-composer-vendor-differential.mjs', '--input', vendorInputPath(vendor), '--vendor', vendor] },
    ] : []),
  );
  if (['frontend', 'full'].includes(scope)) steps.push(
    { id: 'typecheck', command: 'pnpm', args: ['-C', 'frontend', 'exec', 'tsc', '--noEmit'] },
    { id: 'lint', command: 'pnpm', args: ['-C', 'frontend', 'run', 'lint'] },
    { id: 'build', command: 'pnpm', args: ['-C', 'frontend', 'run', 'build'] },
  );
  return steps;
}

export function verificationCommands(scope = 'full', layout = 'multi-module', options = {}) {
  return verificationSteps(scope, layout, options).map(({ command, args }) => [command, args]);
}

export function runCommand(command, args, { root, env = process.env, capture = false } = {}) {
  const windows = process.platform === 'win32';
  const executable = command === 'node' ? process.execPath
    : command === 'gradle' ? (windows ? '.\\gradlew.bat' : './gradlew')
      : windows && ['npm', 'pnpm'].includes(command) ? `${command}.cmd` : command;
  // Only fixed .cmd/.bat commands use the Windows command processor; the root is passed as cwd.
  const result = spawnSync(executable, args, { cwd: root, env, windowsHide: true,
    shell: windows && /\.(?:cmd|bat)$/.test(executable),
    stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  if (result.error || result.status !== 0) {
    const error = new Error(`${command} failed (${result.status ?? 'spawn'}): ${result.error?.message ?? result.stderr ?? ''}`);
    throw Object.assign(error, { exitCode: result.status ?? null });
  }
  return result.stdout;
}

/** 생성물 검증 단계가 받는 환경. 앱 문맥을 띄우는 시험이 비밀 값을 요구하므로 실행마다 만든다. */
export const artifactStepEnvironment = () => ({ ...process.env, TZ: 'Asia/Seoul', JWT_SECRET: process.env.JWT_SECRET || randomBytes(44).toString('hex') });

export function verifyReusableArtifact({ root, scope = 'full', run = runCommand } = {}) {
  root = resolve(root);
  const lock = JSON.parse(readFileSync(resolve(root, 'reusable-base-lock.json'), 'utf8'));
  if (!compositionProfiles().includes(lock.profile)) throw new Error('generated product lock is required');
  const layout = normalizeBackendLayout(lock.layout);
  const steps = verificationSteps(scope, layout, { vendor: lock.vendorProjection?.vendor });
  const env = artifactStepEnvironment();
  const report = { schemaVersion: 1, authority: scope === VENDOR_SCHEMA_SCOPE ? 'local-vendor-schema-check' : 'local-product-technical-verification', profile: lock.profile,
    scope, layout, sourceCommit: lock.sourceCommit, checkedAt: new Date().toISOString(),
    result: 'started', environmentApproved: false, runtimeScenariosExecuted: false, steps: [] };
  const reports = resolve(root, 'build/reports/reusable-base');
  mkdirSync(reports, { recursive: true });
  const save = () => writeFileSync(resolve(reports, `${scope}.json`), `${JSON.stringify(report, null, 2)}\n`);
  save();
  // 단계마다 단계 id·명령·결과·소요 시간을 남긴다. 실패하면 그 단계와 명령·종료 코드가 보고서의 failure 다.
  let step;
  try {
    for (const { id, command, args } of steps) {
      process.stdout.write(`[reusable-verify] ${lock.profile}/${layout}: ${command} ${args.join(' ')}\n`);
      step = { id, command: [command, ...args].join(' '), startedAt: Date.now() };
      run(command, args, { root, env });
      report.steps.push({ step: step.id, command: step.command, result: 'passed', durationMs: Date.now() - step.startedAt });
      step = undefined;
    }
    report.result = 'passed';
  } catch (error) {
    if (step) {
      report.failure = { step: step.id, command: step.command, exitCode: error.exitCode ?? null, durationMs: Date.now() - step.startedAt };
      report.steps.push({ ...report.failure, result: 'failed' });
    }
    report.result = 'failed'; throw error;
  }
  finally { save(); }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const options = { root: resolve(dirname(fileURLToPath(import.meta.url)), '..') };
    for (let index = 0; index < args.length; index += 2) {
      if (!['--root', '--scope'].includes(args[index]) || !args[index + 1]) throw new Error('usage: --root PATH --scope contracts|backend|frontend|full|vendor-schema');
      options[args[index].slice(2)] = args[index + 1];
    }
    if (!existsSync(resolve(options.root, 'reusable-base-lock.json'))) throw new Error('run this command inside a generated reusable artifact');
    verifyReusableArtifact(options);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
