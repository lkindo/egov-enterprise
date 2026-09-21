import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import { applySingleModuleLayout } from './reusable-single-module.mjs';
import { installMultiModuleMigrationRuntime, installSingleModuleRuntime, validateGeneratedMigrationRuntime,
  validateSingleModuleRuntime, verifyGeneratedMigration, verifySingleModuleMigration } from './reusable-layout-runtime.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceMigrationCommand = 'run(`${gradlew} :migration-tool:compileJava :migration-tool:compileTestJava :migration-tool:test :migration-tool:bootJar jacocoMigrationCoverageVerification --no-daemon --warning-mode fail --console=plain -Dfile.encoding=UTF-8`);';
const devCommand = '`"' + '\\'.repeat(2) + '"${gradlew}' + '\\'.repeat(2) + '" :api-server:bootRun -Dfile.encoding=UTF-8" ` +';
const read = (root, file) => readFileSync(join(root, file), 'utf8');
const write = (root, file, value) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), value); };
const json = (root, file) => JSON.parse(read(root, file));
const requiredFiles = ['package.json', 'scripts/dev.mjs', 'api-server/Dockerfile', 'scripts/verify.mjs', 'scripts/migration-verification-contract.test.mjs'];

function fixture(t, eol = '\n') {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-layout-runtime-'));
  t.after(() => {
    const back = relative(base, root);
    assert.ok(back.startsWith('egov-layout-runtime-') && !back.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  write(root, 'package.json', JSON.stringify({ scripts: {
    backend: 'gradlew.bat :api-server:bootRun',
    dev: 'node --env-file-if-exists=.env scripts/dev.mjs',
    'verify:migration': 'node scripts/verify.mjs migration',
    test: 'npx cross-env TZ=Asia/Seoul gradlew.bat test -Dfile.encoding=UTF-8',
    'test:ci': 'npx cross-env TZ=Asia/Seoul gradlew.bat test --continue -Dfile.encoding=UTF-8',
    'test:coverage': 'npx cross-env TZ=Asia/Seoul gradlew.bat test jacocoRootCoverageVerification --continue -Dfile.encoding=UTF-8',
  } }, null, 2));
  write(root, 'scripts/dev.mjs', [
    '// Historical example: gradlew.bat :api-server:bootRun',
    'const command =', '  ' + devCommand, '  \'"pnpm -C frontend dev"\';', '',
  ].join(eol));
  write(root, 'api-server/Dockerfile', [
    '# Historical build path: /app/api-server/build/libs/*.jar',
    'RUN ./gradlew :api-server:classes --no-daemon || true',
    'RUN ./gradlew :api-server:bootJar -x test --no-daemon',
    'COPY --from=builder --chown=spring:spring /app/api-server/build/libs/*.jar app.jar', '',
  ].join(eol));
  write(root, 'scripts/verify.mjs', sourceMigrationCommand + eol);
  write(root, 'scripts/migration-verification-contract.test.mjs', '// Preserved upstream contract\n');
  write(root, 'reusable-base-lock.json', JSON.stringify({ profile: 'core', layout: 'single-module' }));
  return root;
}

test('adapts only active backend/Docker commands and the migration alias for LF and CRLF', t => {
  for (const eol of ['\n', '\r\n']) {
    const root = fixture(t, eol);
    const originalRunner = read(root, 'scripts/verify.mjs');
    const originalContract = read(root, 'scripts/migration-verification-contract.test.mjs');
    const result = installSingleModuleRuntime(root);
    assert.deepEqual(result.files, ['package.json', 'scripts/dev.mjs', 'api-server/Dockerfile']);
    assert.deepEqual(validateSingleModuleRuntime(root), []);
    assert.equal(json(root, 'package.json').scripts.backend, 'gradlew.bat bootRun');
    assert.equal(json(root, 'package.json').scripts['verify:migration'], 'node scripts/reusable-layout-runtime.mjs --verify-migration');
    assert.equal(json(root, 'package.json').scripts.test, 'npx cross-env TZ=Asia/Seoul gradlew.bat allTests -Dfile.encoding=UTF-8');
    assert.equal(json(root, 'package.json').scripts['test:ci'], 'npx cross-env TZ=Asia/Seoul gradlew.bat allTests --continue -Dfile.encoding=UTF-8');
    assert.equal(json(root, 'package.json').scripts['test:coverage'], 'npx cross-env TZ=Asia/Seoul gradlew.bat allTests jacocoRootCoverageVerification --continue -Dfile.encoding=UTF-8');
    assert.match(read(root, 'scripts/dev.mjs'), /Historical example: gradlew\.bat :api-server:bootRun/);
    assert.match(read(root, 'api-server/Dockerfile'), /# Historical build path: \/app\/api-server\/build\/libs\/\*\.jar/);
    assert.equal(read(root, 'scripts/verify.mjs'), originalRunner);
    assert.equal(read(root, 'scripts/migration-verification-contract.test.mjs'), originalContract);
    if (eol === '\r\n') assert.match(read(root, 'scripts/dev.mjs'), /\r\n/);
  }
});

test('the actual producer runtime sources satisfy the same exact projection contract', t => {
  const root = fixture(t);
  for (const file of requiredFiles) copyFileSync(join(ROOT, file), join(root, file));
  installSingleModuleRuntime(root);
  assert.deepEqual(validateSingleModuleRuntime(root), []);
});

test('missing files and unknown or duplicate executable targets fail before any file is changed', t => {
  const mutations = [
    ...requiredFiles.map(file => ({ label: `missing ${file}`, mutate: root => rmSync(join(root, file)) })),
    { label: 'backend drift', mutate: root => write(root, 'package.json', read(root, 'package.json').replace(':api-server:bootRun', ':other:bootRun')) },
    { label: 'migration alias drift', mutate: root => write(root, 'package.json', read(root, 'package.json').replace('scripts/verify.mjs migration', 'scripts/verify.mjs full')) },
    ...['test', 'test:ci', 'test:coverage'].map(alias => ({ label: `${alias} drift`, mutate: root => {
      const pkg = json(root, 'package.json');
      pkg.scripts[alias] = 'gradlew.bat test';
      write(root, 'package.json', JSON.stringify(pkg));
    } })),
    { label: 'duplicate dev command', mutate: root => write(root, 'scripts/dev.mjs', read(root, 'scripts/dev.mjs') + devCommand + '\n') },
    { label: 'existing root dev command', mutate: root => write(root, 'scripts/dev.mjs', read(root, 'scripts/dev.mjs') + devCommand.replace(':api-server:bootRun', 'bootRun') + '\n') },
    { label: 'dev command only in comment', mutate: root => write(root, 'scripts/dev.mjs', `/*\n${devCommand}\n*/\n`) },
    { label: 'changed dev argument', mutate: root => write(root, 'scripts/dev.mjs', read(root, 'scripts/dev.mjs').replace('-Dfile.encoding=UTF-8', '-Dfile.encoding=ASCII')) },
    { label: 'duplicate Docker build', mutate: root => write(root, 'api-server/Dockerfile', read(root, 'api-server/Dockerfile') + 'RUN ./gradlew :api-server:bootJar -x test --no-daemon\n') },
    { label: 'existing root Docker build', mutate: root => write(root, 'api-server/Dockerfile', read(root, 'api-server/Dockerfile') + 'RUN ./gradlew bootJar -x test --no-daemon\n') },
    { label: 'unknown Docker task', mutate: root => write(root, 'api-server/Dockerfile', read(root, 'api-server/Dockerfile') + 'RUN ./gradlew :foundation:test\n') },
    { label: 'jar path drift', mutate: root => write(root, 'api-server/Dockerfile', read(root, 'api-server/Dockerfile').replace(' app.jar', ' other.jar')) },
    { label: 'migration source drift', mutate: root => write(root, 'scripts/verify.mjs', sourceMigrationCommand.replace(':migration-tool:test', ':migration-tool:bootRun')) },
  ];
  for (const { label, mutate } of mutations) {
    const root = fixture(t);
    mutate(root);
    const before = new Map(requiredFiles.flatMap(file => {
      try { return [[file, read(root, file)]]; } catch { return []; }
    }));
    assert.throws(() => installSingleModuleRuntime(root), undefined, label);
    for (const [file, source] of before) assert.equal(read(root, file), source, `${label}: ${file}`);
  }
});

test('runtime validator rejects wrong layout, alias drift, missing commands and module task reintroduction', t => {
  const changes = [
    ['reusable-base-lock.json', source => source.replace('single-module', 'multi-module')],
    ['package.json', source => source.replace('gradlew.bat bootRun', 'gradlew.bat :api-server:bootRun')],
    ['package.json', source => source.replace('scripts/reusable-layout-runtime.mjs --verify-migration', 'scripts/verify.mjs migration')],
    ['package.json', source => source.replace('gradlew.bat allTests -D', 'gradlew.bat test -D')],
    ['package.json', source => source.replace('gradlew.bat allTests --continue', 'gradlew.bat test --continue')],
    ['package.json', source => source.replace('gradlew.bat allTests jacocoRootCoverageVerification', 'gradlew.bat test jacocoRootCoverageVerification')],
    ['scripts/dev.mjs', source => source.replace('" bootRun -D', '" :api-server:bootRun -D')],
    ['api-server/Dockerfile', source => source.replace('/app/build/libs/app.jar', '/app/api-server/build/libs/*.jar')],
    ['api-server/Dockerfile', source => source + 'RUN ./gradlew :migration-tool:bootRun\n'],
  ];
  for (const [file, mutate] of changes) {
    const root = fixture(t);
    installSingleModuleRuntime(root);
    const original = read(root, file);
    const changed = mutate(original);
    assert.notEqual(changed, original);
    write(root, file, changed);
    assert.ok(validateSingleModuleRuntime(root).length, file);
  }
});

test('migration verification runs only fixed isolated root tasks and propagates failures', t => {
  const root = fixture(t);
  for (const file of ['build.gradle', 'settings.gradle', ...['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool'].map(module => `${module}/build.gradle`)]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(ROOT, file), join(root, file));
  }
  applySingleModuleLayout(root);
  installSingleModuleRuntime(root);
  const observed = [];
  verifySingleModuleMigration({ root, run: (args, cwd) => observed.push({ args, cwd }) });
  assert.deepEqual(observed, [{ cwd: root, args: [
    'compileMigrationJava', 'compileMigrationTestJava', 'migrationTest', 'migrationBootJar',
    '--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8',
  ] }]);
  assert.deepEqual(validateGeneratedMigrationRuntime(root), []);
  const generic = [];
  verifyGeneratedMigration({ root, run: (args, cwd) => generic.push({ args, cwd }) });
  assert.deepEqual(generic, observed);
  assert.throws(() => verifySingleModuleMigration({ root, run: () => { throw new Error('deliberate Gradle failure'); } }), /deliberate Gradle failure/);
  write(root, 'settings.gradle', read(root, 'settings.gradle') + "include 'migration-tool'\n");
  assert.throws(() => verifySingleModuleMigration({ root, run: () => assert.fail('invalid layout must not launch Gradle') }), /one project/);
  write(root, 'reusable-base-lock.json', JSON.stringify({ profile: 'core', layout: 'multi-module' }));
  assert.throws(() => verifySingleModuleMigration({ root, run: () => assert.fail('invalid lock must not launch Gradle') }), /single-module product lock/);
});

test('multi-module migration alias dispatches only independent module tasks without upstream CI fixtures', t => {
  const root = fixture(t);
  write(root, 'reusable-base-lock.json', JSON.stringify({ profile: 'collaboration', layout: 'multi-module' }));
  write(root, 'settings.gradle', "rootProject.name = 'fixture'\ninclude 'migration-tool'\n");
  write(root, 'migration-tool/build.gradle', 'dependencies { implementation libs.postgresql }\n');
  const before = json(root, 'package.json');
  const result = installMultiModuleMigrationRuntime(root);
  assert.deepEqual(result.files, ['package.json']);
  const after = json(root, 'package.json');
  assert.deepEqual(after, { ...before, scripts: { ...before.scripts,
    'verify:migration': 'node scripts/reusable-layout-runtime.mjs --verify-migration' } });
  assert.deepEqual(validateGeneratedMigrationRuntime(root), []);
  const calls = [];
  verifyGeneratedMigration({ root, run: (args, cwd) => calls.push({ args, cwd }) });
  assert.deepEqual(calls, [{ cwd: root, args: [
    ':migration-tool:compileJava', ':migration-tool:compileTestJava', ':migration-tool:test', ':migration-tool:bootJar',
    '--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8',
  ] }]);
  write(root, 'reusable-base-lock.json', JSON.stringify({ profile: 'collaboration' }));
  assert.deepEqual(validateGeneratedMigrationRuntime(root), []);
  assert.throws(() => verifyGeneratedMigration({ root, run: () => { throw new Error('deliberate module test failure'); } }), /module test failure/);
  assert.throws(() => installMultiModuleMigrationRuntime(root), /unexpected package verify:migration/);
});

test('generated migration dispatch rejects unknown locks, inactive module includes and online dependencies', t => {
  const mutations = [
    ['reusable-base-lock.json', JSON.stringify({ profile: 'core', layout: 'unknown' })],
    ['reusable-base-lock.json', JSON.stringify({ profile: 'unknown', layout: 'multi-module' })],
    ['settings.gradle', "// include 'migration-tool'\n"],
    ['settings.gradle', "include 'migration-tool'\ninclude 'migration-tool'\n"],
    ['migration-tool/build.gradle', "dependencies { implementation project(':foundation') }\n"],
    ['package.json', JSON.stringify({ scripts: { 'verify:migration': 'node scripts/verify.mjs migration' } })],
  ];
  for (const [file, value] of mutations) {
    const root = fixture(t);
    write(root, 'reusable-base-lock.json', JSON.stringify({ profile: 'core', layout: 'multi-module' }));
    write(root, 'settings.gradle', "include 'migration-tool'\n");
    write(root, 'migration-tool/build.gradle', 'dependencies {}\n');
    installMultiModuleMigrationRuntime(root);
    write(root, file, value);
    assert.ok(validateGeneratedMigrationRuntime(root).length, file);
    assert.throws(() => verifyGeneratedMigration({ root, run: () => assert.fail('invalid migration scope must not execute') }));
  }
});

test('installer refuses the producer tree; importing is silent and unknown CLI options fail', () => {
  assert.throws(() => installSingleModuleRuntime(ROOT), /source repository/);
  const helper = join(ROOT, 'scripts/reusable-layout-runtime.mjs');
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(helper).href)});`], { encoding: 'utf8' });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, '');
  assert.equal(imported.stderr, '');
  const rejected = spawnSync(process.execPath, [helper, '--load'], { encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /usage: --verify-migration/);
});
