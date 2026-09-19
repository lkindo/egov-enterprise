import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const ONLINE = ['foundation', 'business-core', 'business-app', 'api-server'];
const MODULES = [...ONLINE, 'migration-tool'];
const MARKER = '// Generated single-module build: logical source roots are not Gradle projects.';
const GROOVY_NON_CODE = /\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|'''[\s\S]*?'''|"""[\s\S]*?"""|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g;

function fail(message) { throw new Error(`single-module: ${message}`); }
function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(path, entry.name)) : [join(path, entry.name)]);
}
function slash(path) { return path.split(sep).join('/'); }
function replaceExactly(source, pattern, replacement, expected = 1) {
  const count = [...source.matchAll(pattern)].length;
  if (count !== expected) fail(`build convention changed: ${pattern} matched ${count}, expected ${expected}`);
  return source.replace(pattern, replacement);
}

/** Keep offsets and braces in code, excluding comments and quoted Groovy strings. */
export function groovyCode(source) {
  return source.replace(GROOVY_NON_CODE,
    value => value.replace(/[^\r\n]/g, ' '));
}
function groovyWithoutComments(source) {
  return source.replace(GROOVY_NON_CODE, value => value.startsWith('//') || value.startsWith('/*')
    ? value.replace(/[^\r\n]/g, ' ') : value);
}
function block(source, header) {
  const code = groovyCode(source);
  const matches = [...code.matchAll(header)];
  if (matches.length !== 1) fail(`expected exactly one convention block: ${header}`);
  const open = code.indexOf('{', matches[0].index);
  let depth = 1;
  for (let index = open + 1; index < code.length; index += 1) {
    if (code[index] === '{') depth += 1;
    if (code[index] === '}' && --depth === 0) return source.slice(open + 1, index);
  }
  fail(`unclosed convention block: ${header}`);
}

function dependencies(source, module) {
  let body = block(source, /^dependencies\s*\{/gm);
  const projectEdge = /^\s*(api|implementation|testImplementation|testFixturesApi)\s+((?:testFixtures\()?project\('[^']+'\)\)?)\s*$/gm;
  const expectedEdges = {
    foundation: [],
    'business-core': ["api project(':foundation')", "testFixturesApi project(':foundation')"],
    'business-app': ["api project(':business-core')", "testFixturesApi testFixtures(project(':business-core'))"],
    'api-server': ["implementation project(':foundation')", "implementation project(':business-core')", "implementation project(':business-app')",
      "testImplementation testFixtures(project(':business-core'))", "testImplementation testFixtures(project(':business-app'))"],
    'migration-tool': [],
  };
  const edges = [...groovyWithoutComments(body).matchAll(projectEdge)].map(match => `${match[1]} ${match[2]}`).sort();
  if (JSON.stringify(edges) !== JSON.stringify([...expectedEdges[module]].sort())) fail(`project dependency convention changed: ${module}`);
  // Known project edges become this project's own main/verification/fixture outputs.
  body = body.replace(projectEdge, '');
  if (/\bproject\s*\(/.test(groovyCode(body))) fail('unhandled Gradle project dependency');
  // A custom fixture source set avoids java-test-fixtures' implicit dependency on
  // this project's merged main output leaking into the isolated logical suites.
  body = body.replace(/^(\s*)testFixturesApi\b/gm, '$1testImplementation');
  if (module === 'migration-tool') {
    body = body.replace(/^(\s*)(api|implementation|runtimeOnly|testImplementation|testRuntimeOnly)\b/gm, (_, indent, configuration) =>
      `${indent}${({ api: 'migrationImplementation', implementation: 'migrationImplementation', runtimeOnly: 'migrationRuntimeOnly',
        testImplementation: 'migrationTestImplementation', testRuntimeOnly: 'migrationTestRuntimeOnly' })[configuration]}`);
  }
  return `dependencies {${body}\n}\n`;
}

function assertUniqueProductionFiles(root, moduleBuilds) {
  for (const module of MODULES.filter(module => module !== 'business-core')) {
    const conventions = groovyWithoutComments(moduleBuilds.get(module));
    // A directory alone does not create a Gradle source set. Foundation retains
    // an inactive legacy resource here without applying java-test-fixtures.
    // Active fixture owners need an explicit equivalent in the assembled build.
    const activeFixtures = /\b(?:id\s*(?:\(\s*)?|apply\s+plugin\s*:\s*)['"]java-test-fixtures['"]/.test(conventions)
      || /\bsourceSets\s*(?:\{[\s\S]*?\btestFixtures\b|\.testFixtures\b|\.(?:create|maybeCreate|register|named)\s*\(?\s*['"]testFixtures['"])/.test(conventions)
      || /['"][^'"\r\n]*src\/testFixtures(?:\/|['"])/.test(conventions);
    if (activeFixtures && walk(join(root, module, 'src/testFixtures')).length) {
      fail(`unsupported additional test fixture owner: ${module}; declare its source set and dependencies explicitly`);
    }
  }
  for (const sourceRoot of ['src/main/java', 'src/main/resources']) {
    const owners = new Map();
    for (const module of ONLINE) for (const file of walk(join(root, module, sourceRoot))) {
      const path = slash(relative(join(root, module, sourceRoot), file));
      if (owners.has(path)) fail(`production collision ${sourceRoot}/${path}: ${owners.get(path)}, ${module}`);
      owners.set(path, module);
    }
  }
}

function assembly() {
  return `
${MARKER}
def onlineSourceRoots = ['foundation', 'business-core', 'business-app', 'api-server']
sourceSets {
    main {
        java.setSrcDirs(onlineSourceRoots.collect { "\${it}/src/main/java" })
        resources.setSrcDirs(onlineSourceRoots.collect { "\${it}/src/main/resources" })
    }
    test {
        java.setSrcDirs(['api-server/src/test/java'])
        resources.setSrcDirs(['api-server/src/test/resources'])
    }
    fixtures {
        java.setSrcDirs(['business-core/src/testFixtures/java'])
        resources.setSrcDirs(['business-core/src/testFixtures/resources'])
    }
    foundationVerification
    coreVerification
    appVerification
    foundationTest
    coreTest
    appTest
    migration {
        java.setSrcDirs(['migration-tool/src/main/java'])
        resources.setSrcDirs(['migration-tool/src/main/resources'])
    }
    migrationTest {
        java.setSrcDirs(['migration-tool/src/test/java'])
        resources.setSrcDirs(['migration-tool/src/test/resources'])
        compileClasspath += sourceSets.migration.output
        runtimeClasspath += sourceSets.migration.output
    }
}

// Only the online application enters the default executable archive.
springBoot { mainClass = 'nuri.ApiServerApplication' }
bootJar { enabled = true; archiveFileName = 'app.jar' }
jar { enabled = false }
tasks.named('bootRun') { workingDir file('api-server') }

// Verification compiles preserve the original one-way production boundaries.
// They are test inputs only: bootJar still contains one merged main compilation.
def verificationOwners = [foundationVerification: 'foundation', coreVerification: 'business-core', appVerification: 'business-app']
def verificationParents = [foundationVerification: [], coreVerification: ['foundationVerification'],
                           appVerification: ['foundationVerification', 'coreVerification']]
verificationOwners.each { name, owner ->
    def verification = sourceSets[name]
    verification.java.setSrcDirs(["\${owner}/src/main/java"])
    verification.resources.setSrcDirs(["\${owner}/src/main/resources"])
    configurations[verification.implementationConfigurationName].extendsFrom(configurations.implementation)
    configurations[verification.runtimeOnlyConfigurationName].extendsFrom(configurations.runtimeOnly)
    configurations[verification.compileOnlyConfigurationName].extendsFrom(configurations.compileOnly)
    configurations[verification.annotationProcessorConfigurationName].extendsFrom(configurations.annotationProcessor)
    def parents = files(verificationParents[name].collect { sourceSets[it].output })
    verification.compileClasspath += parents
    verification.runtimeClasspath += parents
}
configurations.fixturesImplementation.extendsFrom(configurations.testImplementation)
configurations.fixturesRuntimeOnly.extendsFrom(configurations.testRuntimeOnly)
configurations.fixturesCompileOnly.extendsFrom(configurations.testCompileOnly)
configurations.fixturesAnnotationProcessor.extendsFrom(configurations.testAnnotationProcessor)
sourceSets.fixtures.compileClasspath += sourceSets.foundationVerification.output + sourceSets.coreVerification.output
sourceSets.fixtures.runtimeClasspath += sourceSets.foundationVerification.output + sourceSets.coreVerification.output
sourceSets.test.compileClasspath += sourceSets.fixtures.output
sourceSets.test.runtimeClasspath += sourceSets.fixtures.output

def logicalSuites = [foundationTest: ['foundation'], coreTest: ['foundation', 'business-core'],
                     appTest: ['foundation', 'business-core', 'business-app']]
def verificationForOwner = verificationOwners.collectEntries { name, owner -> [(owner): sourceSets[name]] }
logicalSuites.each { suiteName, owners ->
    def suite = sourceSets[suiteName]
    def owner = owners.last()
    suite.java.setSrcDirs(["\${owner}/src/test/java"])
    suite.resources.setSrcDirs(["\${owner}/src/test/resources"])
    configurations[suite.implementationConfigurationName].extendsFrom(configurations.testImplementation)
    configurations[suite.runtimeOnlyConfigurationName].extendsFrom(configurations.testRuntimeOnly)
    configurations[suite.compileOnlyConfigurationName].extendsFrom(configurations.testCompileOnly)
    configurations[suite.annotationProcessorConfigurationName].extendsFrom(configurations.testAnnotationProcessor)
    def logicalOutputs = files(owners.collect { verificationForOwner[it].output })
    def fixtures = suiteName == 'foundationTest' ? files() : sourceSets.fixtures.output
    suite.compileClasspath += logicalOutputs + fixtures
    // Test resources precede production resources, as in the original project suites.
    suite.runtimeClasspath += logicalOutputs + fixtures
    tasks.register(suiteName, Test) {
        description = "Preserves \${owner} tests and its logical production classpath"
        group = 'Verification'
        testClassesDirs = suite.output.classesDirs
        classpath = suite.runtimeClasspath
        workingDir file(owner)
        useJUnitPlatform()
    }
}

// The offline migration CLI has its own source set and dependency graph. It never
// extends online implementation/runtime configurations or enters the online JAR.
configurations.migrationCompileOnly.extendsFrom(configurations.compileOnly)
configurations.migrationAnnotationProcessor.extendsFrom(configurations.annotationProcessor)
configurations.migrationTestImplementation.extendsFrom(configurations.migrationImplementation)
configurations.migrationTestRuntimeOnly.extendsFrom(configurations.migrationRuntimeOnly)
configurations.migrationTestCompileOnly.extendsFrom(configurations.testCompileOnly)
configurations.migrationTestAnnotationProcessor.extendsFrom(configurations.testAnnotationProcessor)
dependencies {
    migrationImplementation 'org.springframework.boot:spring-boot-starter'
    migrationTestImplementation 'org.springframework.boot:spring-boot-starter-test'
    migrationTestRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
tasks.register('migrationBootJar', org.springframework.boot.gradle.tasks.bundling.BootJar) {
    group = 'Build'
    mainClass = 'nuri.migration.MigrationToolApplication'
    targetJavaVersion = java.targetCompatibility
    archiveClassifier = 'migration-tool'
    classpath = sourceSets.migration.runtimeClasspath
}
tasks.named('assemble') { dependsOn 'bootJar', 'migrationBootJar' }
tasks.register('migrationTest', Test) {
    group = 'Verification'
    testClassesDirs = sourceSets.migrationTest.output.classesDirs
    classpath = sourceSets.migrationTest.runtimeClasspath
    workingDir file('migration-tool')
    dependsOn tasks.named('migrationBootJar')
    useJUnitPlatform()
    doFirst {
        systemProperty 'migration.drill.classpath', classpath.asPath
        systemProperty 'migration.drill.jar', tasks.named('migrationBootJar').get().archiveFile.get().asFile.absolutePath
    }
}

// Keep the producer's aggregate compile commands complete without compiling two
// same-FQN ArchUnit wrappers or merging different test application configurations.
tasks.named('compileTestJava') {
    dependsOn tasks.named('compileFoundationTestJava'), tasks.named('compileCoreTestJava'),
            tasks.named('compileAppTestJava'), tasks.named('compileMigrationTestJava')
}
// Named Test tasks can be realized while the producer conventions are applied.
// Rebind after adding fixtures: assigning an earlier FileCollection would leave
// compiled API test superclasses unavailable during JUnit discovery.
tasks.named('test', Test) { workingDir file('api-server'); classpath = sourceSets.test.runtimeClasspath }
tasks.named('harnessTest', Test) { workingDir file('api-server'); classpath = sourceSets.test.runtimeClasspath }
tasks.named('schemaValidationTest', Test) { workingDir file('api-server'); classpath = sourceSets.test.runtimeClasspath }
tasks.register('allTests') { dependsOn 'test', 'foundationTest', 'coreTest', 'appTest', 'migrationTest' }
tasks.named('check') { dependsOn 'foundationTest', 'coreTest', 'appTest', 'migrationTest' }

// Aggregate coverage continues to include the independent migration source set.
jacocoAggregateClassDirectories.add(fileTree(dir: layout.buildDirectory.dir('classes/java/migration'), exclude: jacocoAggregateExcludes))
tasks.named('jacocoRootReport') {
    sourceDirectories.setFrom(onlineSourceRoots.collect { file("\${it}/src/main/java") } + file('migration-tool/src/main/java'))
}
// Preserve foundation's stricter, separately scoped coverage rules.
tasks.register('foundationCoverageReport', JacocoReport) {
    dependsOn 'foundationTest'
    sourceDirectories.setFrom(file('foundation/src/main/java'))
    classDirectories.setFrom(fileTree(dir: layout.buildDirectory.dir('classes/java/foundationVerification'), exclude: [
        '**/Q*.class', '**/*Dto.class', '**/*Request.class', '**/*Response.class', '**/dto/**',
        '**/*Config*.class', '**/*Application.class', '**/*VO']))
    executionData.setFrom(layout.buildDirectory.file('jacoco/foundationTest.exec'))
    reports { xml.required = true; html.required = true }
}
tasks.register('foundationCoverageVerification', JacocoCoverageVerification) {
    dependsOn 'foundationCoverageReport'
    classDirectories.setFrom(tasks.named('foundationCoverageReport').get().classDirectories)
    executionData.setFrom(tasks.named('foundationCoverageReport').get().executionData)
    violationRules {
        rule { limit { minimum = 0.80 } }
        rule {
            enabled = true
            element = 'CLASS'
            limit { counter = 'LINE'; value = 'COVEREDRATIO'; minimum = 0.55 }
            excludes = ['*.Q*', '*.dto.*', '*Config*', '*Application*', '*VO']
        }
    }
}
tasks.register('foundationCheck') { dependsOn 'foundationTest', 'foundationCoverageVerification' }
tasks.named('check') { dependsOn 'foundationCheck' }
`;
}

/** Apply only to a copied/generated tree; module source files remain untouched. */
export function applySingleModuleLayout(outputRoot) {
  const root = resolve(outputRoot);
  const buildPath = join(root, 'build.gradle');
  let build = readFileSync(buildPath, 'utf8');
  if (build.includes(MARKER)) fail('layout already applied');
  const moduleBuilds = new Map(MODULES.map(module => [module, readFileSync(join(root, module, 'build.gradle'), 'utf8')]));
  assertUniqueProductionFiles(root, moduleBuilds);
  // Fail closed on convention drift. The current root's security constraints,
  // compiler flags, test policy and coverage thresholds remain the source of truth.
  build = replaceExactly(build, /^    id 'java'$/gm, "    id 'java-library'\n    id 'war'");
  build = replaceExactly(build, /^(    id 'org\.springframework\.boot' version '[^']+') apply false$/gm, '$1');
  build = replaceExactly(build, /^subprojects \{/gm, 'allprojects {', 2);
  const collects = [...build.matchAll(/\bsubprojects\.collect\b/g)].length;
  if (collects !== 5) fail(`aggregate convention changed: expected 5 subprojects.collect, saw ${collects}`);
  build = build.replace(/\bsubprojects\.collect\b/g, 'allprojects.collect');
  for (const [from, to] of [[':api-server:harnessTest', 'harnessTest'], [':api-server:schemaValidationTest', 'schemaValidationTest'],
    [':business-core:test', 'coreTest'], [':business-app:test', 'appTest'], [':foundation:check', 'foundationCheck']]) {
    build = replaceExactly(build, new RegExp(`'${from}'`, 'g'), `'${to}'`);
  }
  let apiTasks = moduleBuilds.get('api-server');
  apiTasks = apiTasks.slice(apiTasks.indexOf('\ntest {'));
  if (!apiTasks.includes("tasks.register('harnessTest'") || !apiTasks.includes("tasks.register('schemaValidationTest'")) fail('API verification task definitions missing');
  apiTasks = replaceExactly(apiTasks, /inputs\.dir\('src\/main\/resources\/db\/migration'\)/g,
    "inputs.dir('api-server/src/main/resources/db/migration')");
  const migrationDependencies = dependencies(moduleBuilds.get('migration-tool'), 'migration-tool');
  const code = `${build}\n${ONLINE.map(module => `// Dependencies originally declared by ${module}.\n${dependencies(moduleBuilds.get(module), module)}`).join('\n')}
${apiTasks}\n${assembly()}\n${migrationDependencies}`;
  // Thresholds are extracted/checked before emitting their isolated equivalent.
  const coverage = block(moduleBuilds.get('foundation'), /^jacocoTestCoverageVerification\s*\{/gm);
  if (!/minimum\s*=\s*0\.80\b/.test(coverage) || !/minimum\s*=\s*0\.55\b/.test(coverage)) fail('foundation coverage convention changed');
  const settings = readFileSync(join(root, 'settings.gradle'), 'utf8');
  const name = settings.match(/^rootProject\.name\s*=\s*'([^']+)'\s*$/m)?.[1];
  if (!name) fail('root project name is missing');
  const knownIncludes = [...settings.matchAll(/^include '([^']+)'\s*$/gm)].map(match => match[1]);
  if (JSON.stringify(knownIncludes) !== JSON.stringify(MODULES)) fail('source module includes changed');
  writeFileSync(buildPath, code, 'utf8');
  writeFileSync(join(root, 'settings.gradle'), `rootProject.name = '${name}'\n\n// One Gradle project; logical source directories are configured in build.gradle.\n`, 'utf8');
  const inspection = inspectSingleModuleLayout(root);
  if (inspection.errors.length) fail(inspection.errors.join('\n'));
  return { id: 'single-module', gradleProjectCount: 1, logicalSourceRoots: ONLINE,
    testSuites: ['test', 'foundationTest', 'coreTest', 'appTest', 'migrationTest'],
    offlineArchiveTask: 'migrationBootJar', buildSha256: createHash('sha256').update(code).digest('hex') };
}

export function inspectSingleModuleLayout(outputRoot) {
  const root = resolve(outputRoot);
  const errors = [];
  const settings = readFileSync(join(root, 'settings.gradle'), 'utf8');
  const build = readFileSync(join(root, 'build.gradle'), 'utf8');
  const executable = groovyWithoutComments(build);
  if (/\b(?:include|includeBuild|apply)\b/.test(groovyCode(settings))) errors.push('settings must declare one project without includes or applied settings');
  if (!build.includes(MARKER)) errors.push('single-module assembly marker is missing');
  if (/\bsubprojects\s*\{|\bproject\s*\(/.test(groovyCode(build))) errors.push('build still configures Gradle subprojects');
  for (const token of ["def onlineSourceRoots = ['foundation', 'business-core', 'business-app', 'api-server']",
    'java.setSrcDirs(onlineSourceRoots.collect', 'resources.setSrcDirs(onlineSourceRoots.collect',
    'def verificationOwners = [foundationVerification:', "tasks.register('migrationBootJar'", "tasks.register('migrationTest'",
    "tasks.register('harnessTest'", "tasks.register('schemaValidationTest'", "tasks.named('compileCoreTestJava')",
    "tasks.named('compileAppTestJava')", "tasks.named('compileFoundationTestJava')", "tasks.named('compileMigrationTestJava')",
    "tasks.named('harnessTest', Test) { workingDir file('api-server'); classpath = sourceSets.test.runtimeClasspath }",
    "tasks.named('schemaValidationTest', Test) { workingDir file('api-server'); classpath = sourceSets.test.runtimeClasspath }",
    "tasks.named('bootRun') { workingDir file('api-server') }", "tasks.named('assemble') { dependsOn 'bootJar', 'migrationBootJar' }",
    "appVerification: ['foundationVerification', 'coreVerification']",
    'sourceSets.fixtures.compileClasspath += sourceSets.foundationVerification.output + sourceSets.coreVerification.output',
    'suite.compileClasspath += logicalOutputs + fixtures', 'suite.runtimeClasspath += logicalOutputs + fixtures',
    "foundationTest: ['foundation']", "coreTest: ['foundation', 'business-core']",
    "appTest: ['foundation', 'business-core', 'business-app']"]) {
    if (!executable.includes(token)) errors.push(`missing assembly contract: ${token}`);
  }
  if (/suite\.(?:compileClasspath|runtimeClasspath)\s*\+=\s*sourceSets\.main\.output/.test(executable)) {
    errors.push('logical test suites must not include merged production output');
  }
  return { id: 'single-module', errors };
}
