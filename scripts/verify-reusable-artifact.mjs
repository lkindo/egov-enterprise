#!/usr/bin/env node
/** A generated product's checks. Upstream framework regression tests run in the producer repository. */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBackendLayout } from './reusable-layout.mjs';

// 검증 단계 id 의 정본. 생성기 엔진·서버가 이 목록을 가져가 실패한 단계를 이름으로 말한다.
// 이 파일은 다른 생성기 모듈을 가져오지 않는다(이관 제품이 이 파일과 reusable-layout.mjs 만 복사한다).
export const VERIFICATION_STEP_IDS = Object.freeze(['governance', 'ui-governance', 'entrypoints', 'backend', 'typecheck', 'lint', 'build']);

/** 범위·배치에 맞는 검증 단계 표. 명령 목록(verificationCommands)도 이 표에서 만든다. */
export function verificationSteps(scope = 'full', layout = 'multi-module') {
  if (!['contracts', 'backend', 'frontend', 'full'].includes(scope)) throw new Error('scope must be contracts, backend, frontend or full');
  normalizeBackendLayout(layout);
  const taskPrefix = layout === 'single-module' ? '' : ':api-server:';
  const steps = [
    { id: 'governance', command: 'node', args: ['scripts/verify-reusable-governance.mjs'] },
    { id: 'ui-governance', command: 'node', args: ['--test', 'scripts/reusable-ui-governance-contract.test.mjs'] },
    { id: 'entrypoints', command: 'node', args: ['--test', 'scripts/reusable-artifact-entrypoints-contract.test.mjs'] },
  ];
  if (['backend', 'full'].includes(scope)) steps.push(
    { id: 'backend', command: 'gradle', args: ['compileJava', 'compileTestJava', `${taskPrefix}harnessTest`, `${taskPrefix}schemaValidationTest`,
      '--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8'] },
  );
  if (['frontend', 'full'].includes(scope)) steps.push(
    { id: 'typecheck', command: 'pnpm', args: ['-C', 'frontend', 'exec', 'tsc', '--noEmit'] },
    { id: 'lint', command: 'pnpm', args: ['-C', 'frontend', 'run', 'lint'] },
    { id: 'build', command: 'pnpm', args: ['-C', 'frontend', 'run', 'build'] },
  );
  return steps;
}

export function verificationCommands(scope = 'full', layout = 'multi-module') {
  return verificationSteps(scope, layout).map(({ command, args }) => [command, args]);
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

export function verifyReusableArtifact({ root, scope = 'full', run = runCommand } = {}) {
  root = resolve(root);
  const lock = JSON.parse(readFileSync(resolve(root, 'reusable-base-lock.json'), 'utf8'));
  if (!['core', 'collaboration', 'demo', 'custom'].includes(lock.profile)) throw new Error('generated product lock is required');
  const layout = normalizeBackendLayout(lock.layout);
  const steps = verificationSteps(scope, layout);
  const env = { ...process.env, TZ: 'Asia/Seoul', JWT_SECRET: process.env.JWT_SECRET || randomBytes(44).toString('hex') };
  const report = { schemaVersion: 1, authority: 'local-product-technical-verification', profile: lock.profile,
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
      if (!['--root', '--scope'].includes(args[index]) || !args[index + 1]) throw new Error('usage: --root PATH --scope contracts|backend|frontend|full');
      options[args[index].slice(2)] = args[index + 1];
    }
    if (!existsSync(resolve(options.root, 'reusable-base-lock.json'))) throw new Error('run this command inside a generated reusable artifact');
    verifyReusableArtifact(options);
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
