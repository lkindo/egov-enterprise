#!/usr/bin/env node
/** A generated product's checks. Upstream framework regression tests run in the producer repository. */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeBackendLayout } from './reusable-layout.mjs';

export function verificationCommands(scope = 'full', layout = 'multi-module') {
  if (!['contracts', 'backend', 'frontend', 'full'].includes(scope)) throw new Error('scope must be contracts, backend, frontend or full');
  normalizeBackendLayout(layout);
  const taskPrefix = layout === 'single-module' ? '' : ':api-server:';
  const commands = [
    ['node', ['scripts/verify-reusable-governance.mjs']],
    ['node', ['--test', 'scripts/reusable-ui-governance-contract.test.mjs']],
    ['node', ['--test', 'scripts/reusable-artifact-entrypoints-contract.test.mjs']],
  ];
  if (['backend', 'full'].includes(scope)) commands.push(
    ['gradle', ['compileJava', 'compileTestJava', `${taskPrefix}harnessTest`, `${taskPrefix}schemaValidationTest`,
      '--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8']],
  );
  if (['frontend', 'full'].includes(scope)) commands.push(
    ['pnpm', ['-C', 'frontend', 'exec', 'tsc', '--noEmit']],
    ['pnpm', ['-C', 'frontend', 'run', 'lint']],
    ['pnpm', ['-C', 'frontend', 'run', 'build']],
  );
  return commands;
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
  if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.status ?? 'spawn'}): ${result.error?.message ?? result.stderr ?? ''}`);
  return result.stdout;
}

export function verifyReusableArtifact({ root, scope = 'full', run = runCommand } = {}) {
  root = resolve(root);
  const lock = JSON.parse(readFileSync(resolve(root, 'reusable-base-lock.json'), 'utf8'));
  if (!['core', 'collaboration', 'demo', 'custom'].includes(lock.profile)) throw new Error('generated product lock is required');
  const layout = normalizeBackendLayout(lock.layout);
  const commands = verificationCommands(scope, layout);
  const env = { ...process.env, TZ: 'Asia/Seoul', JWT_SECRET: process.env.JWT_SECRET || randomBytes(44).toString('hex') };
  const report = { schemaVersion: 1, authority: 'local-product-technical-verification', profile: lock.profile,
    scope, layout, sourceCommit: lock.sourceCommit, checkedAt: new Date().toISOString(),
    result: 'started', environmentApproved: false, runtimeScenariosExecuted: false };
  const reports = resolve(root, 'build/reports/reusable-base');
  mkdirSync(reports, { recursive: true });
  const save = () => writeFileSync(resolve(reports, `${scope}.json`), `${JSON.stringify(report, null, 2)}\n`);
  save();
  try {
    for (const [command, args] of commands) {
      process.stdout.write(`[reusable-verify] ${lock.profile}/${layout}: ${command} ${args.join(' ')}\n`);
      run(command, args, { root, env });
    }
    report.result = 'passed';
  } catch (error) { report.result = 'failed'; throw error; }
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
