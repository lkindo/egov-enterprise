import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { applySingleModuleLayout, groovyCode, inspectSingleModuleLayout } from './reusable-single-module.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = ['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool'];

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-single-layout-'));
  for (const file of ['build.gradle', 'settings.gradle', ...MODULES.map(module => `${module}/build.gradle`)]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(ROOT, file), join(root, file));
  }
  t.after(() => {
    const child = relative(base, root);
    assert.ok(child.startsWith('egov-single-layout-') && !child.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  return root;
}

test('single root preserves upstream security conventions and isolated source/test boundaries', t => {
  const root = fixture(t);
  const originals = new Map(MODULES.map(module => [module, readFileSync(join(root, module, 'build.gradle'), 'utf8')]));
  const result = applySingleModuleLayout(root);
  assert.equal(result.id, 'single-module');
  assert.equal(result.gradleProjectCount, 1);
  assert.deepEqual(inspectSingleModuleLayout(root).errors, []);
  assert.doesNotMatch(groovyCode(readFileSync(join(root, 'settings.gradle'), 'utf8')), /\binclude\b/);
  const build = readFileSync(join(root, 'build.gradle'), 'utf8');
  for (const token of ['mavenBom "org.springframework.boot:spring-boot-dependencies:', "ext['tomcat.version']", "version { require '", "key != 'user.dir'", '"-Werror"',
    'minimum = 0.85', 'minimum = 0.70', 'minimum = 0.80', 'minimum = 0.55', "archiveFileName = 'app.jar'",
    "migration.drill.classpath", "migration.drill.jar", 'ignoreFailures = false',
    "tasks.named('bootRun') { workingDir file('api-server') }", "tasks.named('assemble') { dependsOn 'bootJar', 'migrationBootJar' }"]) assert.ok(build.includes(token), token);
  assert.doesNotMatch(groovyCode(build), /\bproject\s*\(/);
  assert.match(build, /suite\.compileClasspath \+= logicalOutputs \+ fixtures/);
  assert.match(build, /sourceSets\.fixtures\.compileClasspath \+= sourceSets\.foundationVerification\.output \+ sourceSets\.coreVerification\.output/);
  assert.doesNotMatch(build, /configurations\.migrationImplementation\.extendsFrom\(configurations\.implementation\)/);
  for (const [module, before] of originals) assert.equal(readFileSync(join(root, module, 'build.gradle'), 'utf8'), before);
});

test('unexpected Gradle conventions fail before writing either output build file', t => {
  const root = fixture(t);
  const path = join(root, 'build.gradle');
  const changed = readFileSync(path, 'utf8').replace("id 'java'", "id 'groovy'");
  writeFileSync(path, changed);
  const settings = readFileSync(join(root, 'settings.gradle'), 'utf8');
  assert.throws(() => applySingleModuleLayout(root), /build convention changed/);
  assert.equal(readFileSync(path, 'utf8'), changed);
  assert.equal(readFileSync(join(root, 'settings.gradle'), 'utf8'), settings);
  const dependencyRoot = fixture(t);
  const moduleBuild = join(dependencyRoot, 'business-core/build.gradle');
  writeFileSync(moduleBuild, readFileSync(moduleBuild, 'utf8').replace("api project(':foundation')", "api project(':business-app')"));
  assert.throws(() => applySingleModuleLayout(dependencyRoot), /project dependency convention changed/);
});

test('production collisions are rejected while different test resources remain isolated', t => {
  const root = fixture(t);
  for (const module of ['foundation', 'business-core']) {
    mkdirSync(join(root, module, 'src/test/resources'), { recursive: true });
    writeFileSync(join(root, module, 'src/test/resources/application-test.yml'), `owner: ${module}\n`);
    mkdirSync(join(root, module, 'src/main/resources'), { recursive: true });
    writeFileSync(join(root, module, 'src/main/resources/collision.properties'), module);
  }
  assert.throws(() => applySingleModuleLayout(root), /production collision/);
  rmSync(join(root, 'business-core/src/main/resources/collision.properties'));
  applySingleModuleLayout(root);
  for (const module of ['foundation', 'business-core']) {
    assert.equal(readFileSync(join(root, module, 'src/test/resources/application-test.yml'), 'utf8'), `owner: ${module}\n`);
  }
});

test('additional fixture owners cannot disappear from the single-project compilation', t => {
  const inactiveRoot = fixture(t);
  const legacyResource = 'foundation/src/testFixtures/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports';
  mkdirSync(dirname(join(inactiveRoot, legacyResource)), { recursive: true });
  copyFileSync(join(ROOT, legacyResource), join(inactiveRoot, legacyResource));
  applySingleModuleLayout(inactiveRoot);
  assert.equal(readFileSync(join(inactiveRoot, legacyResource), 'utf8'), readFileSync(join(ROOT, legacyResource), 'utf8'));
  for (const directory of ['business-app/src/testFixtures/java', 'foundation/src/testFixtures/resources', 'migration-tool/src/testFixtures/resources']) {
    const root = fixture(t);
    const module = directory.split('/')[0];
    if (module !== 'business-app') {
      const moduleBuild = join(root, module, 'build.gradle');
      writeFileSync(moduleBuild, readFileSync(moduleBuild, 'utf8').replace('plugins {', "plugins {\n    id 'java-test-fixtures'"));
    }
    mkdirSync(join(root, directory), { recursive: true });
    writeFileSync(join(root, directory, 'fixture.txt'), 'fixture ownership requires an explicit classpath');
    const before = readFileSync(join(root, 'build.gradle'), 'utf8');
    assert.throws(() => applySingleModuleLayout(root), /unsupported additional test fixture owner/);
    assert.equal(readFileSync(join(root, 'build.gradle'), 'utf8'), before);
  }
});

test('structural checks reject resurrected projects and missing compile/test boundaries', t => {
  const root = fixture(t);
  applySingleModuleLayout(root);
  const settingsPath = join(root, 'settings.gradle');
  const buildPath = join(root, 'build.gradle');
  const settings = readFileSync(settingsPath, 'utf8');
  const build = readFileSync(buildPath, 'utf8');
  writeFileSync(settingsPath, `${settings}\ninclude 'business-core'\n`);
  assert.ok(inspectSingleModuleLayout(root).errors.some(error => error.includes('includes')));
  writeFileSync(settingsPath, settings);
  writeFileSync(buildPath, build.replace("tasks.named('compileCoreTestJava')", "tasks.named('compileUnusedTestJava')"));
  assert.ok(inspectSingleModuleLayout(root).errors.some(error => error.includes('compileCoreTestJava')));
  writeFileSync(buildPath, build.replace("tasks.named('compileCoreTestJava')", "/* tasks.named('compileCoreTestJava') */ tasks.named('compileUnusedTestJava')"));
  assert.ok(inspectSingleModuleLayout(root).errors.some(error => error.includes('compileCoreTestJava')));
  writeFileSync(buildPath, build.replace("'coreVerification'", "'removedVerification'"));
  assert.ok(inspectSingleModuleLayout(root).errors.length);
  writeFileSync(buildPath, `${build}\nsuite.runtimeClasspath += sourceSets.main.output\n`);
  assert.ok(inspectSingleModuleLayout(root).errors.some(error => error.includes('merged production output')));
  writeFileSync(buildPath, build.replace("tasks.named('harnessTest', Test) { workingDir file('api-server'); classpath = sourceSets.test.runtimeClasspath }",
    "tasks.named('harnessTest', Test) { workingDir file('api-server') }"));
  assert.ok(inspectSingleModuleLayout(root).errors.some(error => error.includes('harnessTest')));
});
