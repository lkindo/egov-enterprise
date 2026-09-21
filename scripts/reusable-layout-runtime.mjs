#!/usr/bin/env node
/** Runtime entrypoints for generated backend layouts; importing never runs a command. */
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { groovyCode, inspectSingleModuleLayout } from './reusable-single-module.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const MIGRATION_ALIAS = 'node scripts/reusable-layout-runtime.mjs --verify-migration';
const MIGRATION_TASKS = Object.freeze([
  'compileMigrationJava', 'compileMigrationTestJava', 'migrationTest', 'migrationBootJar',
  '--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8',
]);
const MULTI_MIGRATION_TASKS = Object.freeze([
  ':migration-tool:compileJava', ':migration-tool:compileTestJava', ':migration-tool:test', ':migration-tool:bootJar',
  '--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8',
]);
const MIGRATION_SOURCE_COMMAND = 'run(`${gradlew} :migration-tool:compileJava :migration-tool:compileTestJava :migration-tool:test :migration-tool:bootJar jacocoMigrationCoverageVerification --no-daemon --warning-mode fail --console=plain -Dfile.encoding=UTF-8`);';
const TEST_ALIASES = Object.freeze([
  ['test', 'npx cross-env TZ=Asia/Seoul gradlew.bat test -Dfile.encoding=UTF-8',
    'npx cross-env TZ=Asia/Seoul gradlew.bat allTests -Dfile.encoding=UTF-8'],
  ['test:ci', 'npx cross-env TZ=Asia/Seoul gradlew.bat test --continue -Dfile.encoding=UTF-8',
    'npx cross-env TZ=Asia/Seoul gradlew.bat allTests --continue -Dfile.encoding=UTF-8'],
  ['test:coverage', 'npx cross-env TZ=Asia/Seoul gradlew.bat test jacocoRootCoverageVerification --continue -Dfile.encoding=UTF-8',
    'npx cross-env TZ=Asia/Seoul gradlew.bat allTests jacocoRootCoverageVerification --continue -Dfile.encoding=UTF-8'],
]);
const DOCKER_LINES = Object.freeze([
  ['RUN ./gradlew :api-server:classes --no-daemon || true', 'RUN ./gradlew classes --no-daemon || true'],
  ['RUN ./gradlew :api-server:bootJar -x test --no-daemon', 'RUN ./gradlew bootJar -x test --no-daemon'],
  ['COPY --from=builder --chown=spring:spring /app/api-server/build/libs/*.jar app.jar',
    'COPY --from=builder --chown=spring:spring /app/build/libs/app.jar app.jar'],
]);

function fail(message) { throw new Error(`reusable runtime: ${message}`); }
function normalize(source) { return source.replace(/\r\n/g, '\n'); }
function devLine(task) {
  return '`"' + '\\'.repeat(2) + '"${gradlew}' + '\\'.repeat(2) + `" ${task} -Dfile.encoding=UTF-8" ` + '` +';
}

// Preserve literals and line offsets. Comments cannot supply an executable replacement target.
function executable(source, kind) {
  if (kind === 'docker') return source.replace(/^[ \t]*#[^\n]*/gm, match => ' '.repeat(match.length));
  return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    token => token.startsWith('//') || token.startsWith('/*') ? token.replace(/[^\n]/g, ' ') : token);
}

function exactLine(source, expected, label, kind = 'js') {
  const matches = executable(normalize(source), kind).split('\n')
    .flatMap((line, index) => line.trim() === expected ? [index] : []);
  if (matches.length !== 1) fail(`${label}: expected exactly one executable command, found ${matches.length}`);
  return matches[0];
}

function replaceLine(source, expected, replacement, label, kind = 'js') {
  const index = exactLine(source, expected, label, kind);
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = normalize(source).split('\n');
  lines[index] = lines[index].replace(expected, replacement);
  return lines.join(lineEnding);
}

function safeFile(root, file) {
  const target = realpathSync(join(root, file));
  const back = relative(root, target);
  if (!back || isAbsolute(back) || back === '..' || back.startsWith(`..${sep}`) || !statSync(target).isFile()) {
    fail(`file escaped the generated output: ${file}`);
  }
  return target;
}

function read(root, file) { return readFileSync(safeFile(root, file), 'utf8'); }

function generatedLayout(root) {
  const lock = JSON.parse(read(root, 'reusable-base-lock.json'));
  const layout = lock.layout ?? 'multi-module';
  if (!['core', 'collaboration', 'demo', 'custom'].includes(lock.profile)
      || !['single-module', 'multi-module'].includes(layout)) fail('a valid generated product layout lock is required');
  return layout;
}

export function installMultiModuleMigrationRuntime(outputRoot) {
  const root = realpathSync(resolve(outputRoot));
  if (root === realpathSync(resolve(dirname(SCRIPT_PATH), '..'))) fail('refusing to rewrite the source repository');
  const pkg = JSON.parse(read(root, 'package.json'));
  if (pkg.scripts?.['verify:migration'] !== 'node scripts/verify.mjs migration') fail('unexpected package verify:migration command');
  pkg.scripts['verify:migration'] = MIGRATION_ALIAS;
  writeFileSync(safeFile(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  return { files: ['package.json'], migrationCommand: MIGRATION_ALIAS };
}

export function installSingleModuleRuntime(outputRoot) {
  const root = realpathSync(resolve(outputRoot));
  if (root === realpathSync(resolve(dirname(SCRIPT_PATH), '..'))) fail('refusing to rewrite the source repository');
  const pkg = JSON.parse(read(root, 'package.json'));
  if (pkg.scripts?.backend !== 'gradlew.bat :api-server:bootRun') fail('unexpected package backend command');
  if (pkg.scripts?.['verify:migration'] !== 'node scripts/verify.mjs migration') fail('unexpected package verify:migration command');
  for (const [alias, expected] of TEST_ALIASES) if (pkg.scripts?.[alias] !== expected) fail(`unexpected package ${alias} command`);
  const dev = read(root, 'scripts/dev.mjs');
  let docker = read(root, 'api-server/Dockerfile');
  // These remain upstream source, not the active single-module verification entrypoint.
  exactLine(read(root, 'scripts/verify.mjs'), MIGRATION_SOURCE_COMMAND, 'upstream migration command');
  read(root, 'scripts/migration-verification-contract.test.mjs');
  const changedDev = replaceLine(dev, devLine(':api-server:bootRun'), devLine('bootRun'), 'development command');
  exactLine(changedDev, devLine('bootRun'), 'projected development command');
  if (executable(changedDev, 'js').includes(':api-server:bootRun')) fail('unexpected module-qualified development command');
  for (const [before, after] of DOCKER_LINES) docker = replaceLine(docker, before, after, 'Docker command', 'docker');
  for (const [, after] of DOCKER_LINES) exactLine(docker, after, 'projected Docker command', 'docker');
  if (/^[ \t]*RUN\b[^\n]*\s:[\w-]+:/m.test(executable(docker, 'docker'))) fail('unexpected module-qualified Docker task');
  pkg.scripts.backend = 'gradlew.bat bootRun';
  pkg.scripts['verify:migration'] = MIGRATION_ALIAS;
  for (const [alias, , command] of TEST_ALIASES) pkg.scripts[alias] = command;
  const changed = new Map([
    ['package.json', `${JSON.stringify(pkg, null, 2)}\n`],
    ['scripts/dev.mjs', changedDev],
    ['api-server/Dockerfile', docker],
  ]);
  // Validate every required input before the first mutation, so drift cannot leave a partial adapter.
  for (const [file, source] of changed) writeFileSync(safeFile(root, file), source);
  return { files: [...changed.keys()], migrationCommand: MIGRATION_ALIAS };
}

export function validateSingleModuleRuntime(outputRoot) {
  const errors = [];
  try {
    const root = realpathSync(resolve(outputRoot));
    const lock = JSON.parse(read(root, 'reusable-base-lock.json'));
    if (lock.layout !== 'single-module' || !['core', 'collaboration', 'demo', 'custom'].includes(lock.profile)) {
      fail('a generated single-module product lock is required');
    }
    const pkg = JSON.parse(read(root, 'package.json'));
    if (pkg.scripts?.backend !== 'gradlew.bat bootRun') errors.push('single-module runtime: invalid backend alias');
    if (pkg.scripts?.['verify:migration'] !== MIGRATION_ALIAS) errors.push('single-module runtime: invalid verify:migration alias');
    for (const [alias, , command] of TEST_ALIASES) {
      if (pkg.scripts?.[alias] !== command) errors.push(`single-module runtime: invalid ${alias} alias`);
    }
    const dev = read(root, 'scripts/dev.mjs');
    exactLine(dev, devLine('bootRun'), 'active development command');
    if (executable(dev, 'js').includes(':api-server:bootRun')) errors.push('single-module runtime: development still invokes a module task');
    const docker = read(root, 'api-server/Dockerfile');
    for (const [, expected] of DOCKER_LINES) exactLine(docker, expected, 'active Docker command', 'docker');
    if (/^[ \t]*RUN\b[^\n]*\s:[\w-]+:/m.test(executable(docker, 'docker'))) errors.push('single-module runtime: Docker still invokes a module task');
  } catch (error) { errors.push(error.message); }
  return errors;
}

export function verifySingleModuleMigration({ root, run = runMigrationTasks } = {}) {
  root = resolve(root);
  const errors = validateSingleModuleRuntime(root);
  if (errors.length) fail(errors.join('\n'));
  return verifyGeneratedMigration({ root, run });
}

/** Generated products execute their current Gradle tests, not inactive upstream CI regression fixtures. */
export function validateGeneratedMigrationRuntime(outputRoot) {
  const errors = [];
  try {
    const root = realpathSync(resolve(outputRoot));
    const layout = generatedLayout(root);
    const pkg = JSON.parse(read(root, 'package.json'));
    if (pkg.scripts?.['verify:migration'] !== MIGRATION_ALIAS) errors.push('generated migration runtime: invalid verify:migration alias');
    if (layout === 'single-module') errors.push(...inspectSingleModuleLayout(root).errors);
    else {
      exactLine(read(root, 'settings.gradle'), "include 'migration-tool'", 'independent migration project');
      const moduleBuild = read(root, 'migration-tool/build.gradle');
      if (/\bproject\s*\(/.test(groovyCode(moduleBuild))) errors.push('generated migration runtime: offline module may not depend on online projects');
    }
  } catch (error) { errors.push(error.message); }
  return errors;
}

export function verifyGeneratedMigration({ root, run = runMigrationTasks } = {}) {
  root = realpathSync(resolve(root));
  const errors = validateGeneratedMigrationRuntime(root);
  if (errors.length) fail(errors.join('\n'));
  run([...(generatedLayout(root) === 'single-module' ? MIGRATION_TASKS : MULTI_MIGRATION_TASKS)], root);
}

function runMigrationTasks(args, root) {
  const windows = process.platform === 'win32';
  const result = spawnSync(windows ? '.\\gradlew.bat' : './gradlew', args, {
    cwd: root, windowsHide: true, shell: windows, stdio: 'inherit',
    env: { ...process.env, TZ: 'Asia/Seoul' },
  });
  if (result.error || result.status !== 0) fail(`migration verification failed (${result.status ?? 'spawn'}): ${result.error?.message ?? 'Gradle returned a failure'}`);
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) {
  try {
    if (process.argv.length !== 3 || process.argv[2] !== '--verify-migration') fail('usage: --verify-migration');
    verifyGeneratedMigration({ root: resolve(dirname(SCRIPT_PATH), '..') });
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
