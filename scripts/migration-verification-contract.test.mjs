import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

import { parseWorkflowJobs } from './required-checks-contract.mjs';

const runner = readFileSync(new URL('./verify.mjs', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/migration-tool.yml', import.meta.url), 'utf8');
const moduleBuild = readFileSync(new URL('../migration-tool/build.gradle', import.meta.url), 'utf8');
const contractCommand = 'node --test scripts/migration-verification-contract.test.mjs';
const moduleTasks = ':migration-tool:compileJava :migration-tool:compileTestJava :migration-tool:test :migration-tool:bootJar';
const gradleOptions = '--no-daemon --warning-mode fail --console=plain -Dfile.encoding=UTF-8';
const standaloneProduct = existsSync(new URL('../migration-product-lock.json', import.meta.url));
const requiredPaths = [
  'migration-tool/**', '**/*.gradle', 'gradle/**', 'gradle.properties', 'gradlew', 'gradlew.bat',
  '.nvmrc', 'package.json', 'scripts/verify.mjs', 'scripts/migration-verification-contract.test.mjs',
  'scripts/required-checks-contract.mjs', '.github/workflows/migration-tool.yml',
  ...(standaloneProduct ? ['scripts/adoption-*.mjs', 'scripts/governance-review.mjs',
    'scripts/verify-reusable-artifact.mjs', 'scripts/e2e-shard-plan.mjs', 'config/governance/**', '.githooks/**'] : []),
];

const childOnlyTests = [
  'nuri.migration.EtlMySqlCrashRecoveryIntegrationTest',
  'nuri.migration.MySqlPackagedCliIntegrationTest',
  'nuri.migration.EtlMariaDbCrashRecoveryIntegrationTest',
  'nuri.migration.MariaDbPackagedCliIntegrationTest',
  'nuri.migration.EtlSqlServerCrashRecoveryIntegrationTest',
  'nuri.migration.SqlServerPackagedCliIntegrationTest',
  'nuri.migration.OraclePackagedCliIntegrationTest',
];
const childOnlyScopes = [
  ['nuri.migration.transform.*'],
  ['nuri.migration.validate.*', 'nuri.migration.verify.*'],
];
const ordinaryDrillConfiguration = `
tasks.named('test', Test) {
    dependsOn tasks.named('bootJar')
    doFirst {
        systemProperty 'migration.drill.classpath', classpath.asPath
        systemProperty 'migration.drill.jar', tasks.named('bootJar').get().archiveFile.get().asFile.absolutePath
    }
}
tasks.named('pitest') { dependsOn tasks.named('bootJar') }
pitest {
    jvmArgs.add(providers.provider {
        "-Dmigration.drill.classpath=\${sourceSets.test.runtimeClasspath.asPath}".toString()
    })
    jvmArgs.add(providers.provider {
        "-Dmigration.drill.jar=\${tasks.named('bootJar').get().archiveFile.get().asFile.absolutePath}".toString()
    })
}
`;

// Keep quoted Groovy values intact while comments and string decoys cannot supply executable markers.
function gradleCode(source, maskStrings = false) {
  const tokens = source.match(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[^"'/]+|./g) ?? [];
  return tokens.map((token) => token.startsWith('//') || token.startsWith('/*')
    || (maskStrings && /^["']/.test(token)) ? token.replace(/[^\r\n]/g, ' ') : token).join('');
}

function closeDelimiter(mask, opening, left, right) {
  let depth = 0;
  for (let index = opening; index < mask.length; index++) {
    if (mask[index] === left) depth++;
    if (mask[index] === right && --depth === 0) return index;
  }
  return -1;
}

function sameSet(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function readGradleClassList(source, name) {
  const executable = gradleCode(source);
  const mask = gradleCode(executable, true);
  const markers = [...mask.matchAll(new RegExp(`\\b${name}\\s*=\\s*\\[`, 'g'))];
  if (markers.length !== 1) return { error: 'expected one executable literal class list' };
  const opening = mask.indexOf('[', markers[0].index);
  const closing = closeDelimiter(mask, opening, '[', ']');
  const literal = executable.slice(opening, closing + 1);
  // Class globs are ASCII literals; expressions, interpolation and unquoted entries cannot supply evidence.
  if (!/^\[\s*(?:(?:'[A-Za-z0-9_.*]+'|"[A-Za-z0-9_.*]+")(?:\s*,\s*(?:'[A-Za-z0-9_.*]+'|"[A-Za-z0-9_.*]+"))*\s*)?\]$/.test(literal)) {
    return { error: 'expected only quoted literal class globs' };
  }
  return { exclude: [...literal.matchAll(/['"]([A-Za-z0-9_.*]+)['"]/g)].map((match) => match[1]) };
}

function validateDrillBuild(source) {
  const errors = [];
  const executable = gradleCode(source);
  const mask = gradleCode(executable, true);
  const readExclusions = (text) => readGradleClassList(text, 'excludedTestClasses');
  const exclusions = readExclusions(source);
  if (exclusions.error || JSON.stringify(exclusions.exclude) !== JSON.stringify(childOnlyTests)
      || [...mask.matchAll(/\bexcludedTestClasses\b/g)].length !== 1) {
    errors.push('PIT may exclude only the registered exact child-only probes');
  }
  if (/\b(?:exclude|include|filter|onlyIf|ignoreFailures)\b/.test(mask)) {
    errors.push('ordinary migration Test must retain the complete integration test population');
  }

  const conditions = [...mask.matchAll(/\bif\s*\(/g)];
  if (conditions.length !== 1) return [...errors, 'child-only PIT exclusion needs one bounded target scope condition'];
  const marker = conditions[0];
  const opening = mask.indexOf('(', marker.index);
  const closing = closeDelimiter(mask, opening, '(', ')');
  const bodyOpening = mask.indexOf('{', closing + 1);
  const bodyClosing = closeDelimiter(mask, bodyOpening, '{', '}');
  if (closing < 0 || bodyOpening < 0 || bodyClosing < 0) {
    return [...errors, 'child-only PIT condition must have a complete executable body'];
  }
  const body = readExclusions(executable.slice(bodyOpening + 1, bodyClosing));
  const normalize = (text) => text.replace(/\s+/g, ' ').trim();
  const expectedBody = `excludedTestClasses = [ ${childOnlyTests.map((name) => `'${name}'`).join(', ')} ]`;
  if (body.error || JSON.stringify(body.exclude) !== JSON.stringify(childOnlyTests)
      || normalize(executable.slice(bodyOpening + 1, bodyClosing)) !== normalize(expectedBody)) {
    errors.push('the registered PIT exclusions must remain inside the target scope condition');
  }

  // Evaluate the actual supported Groovy boolean expression for exact, broader, and unrelated target sets.
  const sets = [];
  const expression = executable.slice(opening + 1, closing).replace(
    /targetClasses\.get\(\)\.toSet\(\)\s*==\s*(\[[^\]]*\])\.toSet\(\)/g,
    (_, array) => {
      const parsed = readGradleClassList(`scope = ${array}`, 'scope');
      if (parsed.error) return 'INVALID';
      sets.push(parsed.exclude);
      return `B${sets.length - 1}`;
    },
  );
  if (!/^(?:\s|B\d+|true|false|\(|\)|\|\||&&|!)+$/.test(expression)) {
    errors.push('PIT condition must compare complete target sets without broad pattern matching');
  } else {
    const script = expression.replace(/B(\d+)/g, 'values[$1]');
    for (const targets of [...childOnlyScopes, [...childOnlyScopes[1]].reverse(),
      [], ['nuri.*'], ['nuri.migration.*'], ['nuri.migration.verify.*'], ['nuri.migration.validate.*'],
      [...childOnlyScopes[0], 'nuri.migration.artifact.*'],
      [...childOnlyScopes[1], 'nuri.migration.artifact.*']]) {
      try {
        const selected = runInNewContext(script, { values: sets.map((scope) => sameSet(scope, targets)) }, { timeout: 1000 });
        if (selected !== childOnlyScopes.some((scope) => sameSet(scope, targets))) {
          errors.push(`PIT child-only scope drift for ${targets.join(',') || '(empty)'}`);
        }
      } catch {
        errors.push('PIT target scope condition must evaluate without hidden dependencies');
      }
    }
  }

  const normalMarkers = [...mask.matchAll(/\btasks\.named\s*\(/g)].filter((match) =>
    /^tasks\.named\('test'[,)]/.test(executable.slice(match.index)));
  const normal = normalMarkers[0];
  const remaining = normal ? executable.slice(normal.index, marker.index) + executable.slice(bodyClosing + 1) : '';
  if (normalMarkers.length !== 1 || /\btasks\.withType\s*\(\s*Test\s*\)|\btest\s*\{/.test(mask)
      || normalize(remaining) !== normalize(ordinaryDrillConfiguration)) {
    errors.push('ordinary Test and PIT must keep unconditional bootJar and real child runtime paths');
  }
  return errors;
}

// Execute the actual dispatch and helper calls while replacing only process I/O.
// A command in a comment, an uncalled helper, or a different scope cannot count.
function observeMigrationCommands(source, os, failCommand) {
  const commands = [];
  const exits = [];
  const executable = source.replace(/^import [^\r\n]+ from 'node:[^']+';\r?$/gm, '');
  runInNewContext(executable, {
    execSync: (command) => {
      commands.push(command);
      if (command === failCommand) throw new Error('deliberate verification failure');
    },
    platform: () => os,
    randomBytes: () => { throw new Error('frontend build environment must not run'); },
    process: {
      argv: ['node', 'scripts/verify.mjs', 'migration'],
      env: {},
      exit: (code) => exits.push(code),
    },
    console: { log() {}, warn() {}, error() {} },
  }, { timeout: 1000 });
  return { commands, exits };
}

function validateRunner(source, os = 'linux') {
  const expectedGradlew = os === 'win32' ? '.\\gradlew.bat' : './gradlew';
  const { commands, exits } = observeMigrationCommands(source, os);
  return JSON.stringify(commands) === JSON.stringify([
    contractCommand,
    `${expectedGradlew} ${moduleTasks} ${gradleOptions}`,
  ]) && exits.length === 0 ? [] : ['migration execution must run only its contract and exact module compile/test/bootJar tasks'];
}

function validateWorkflow(source) {
  const errors = [];
  const executable = source.replace(/\r\n/g, '\n').replace(/^\s*#.*$/gm, '');
  const permissions = executable.match(/^permissions:\n([\s\S]*?)(?=^\S|(?![\s\S]))/m)?.[1]?.trim();
  if (permissions !== 'contents: read'
      || /^ {4}permissions:/m.test(executable)) errors.push('workflow must keep contents read-only without a job override');
  const jobs = parseWorkflowJobs(executable);
  const job = jobs.get('migration-tool') ?? '';
  if (jobs.size !== 1 || !job) errors.push('workflow must have exactly the independent migration-tool job');
  if (/^ {4}if:/m.test(job) || job.includes('continue-on-error:') || job.includes('secrets.')) {
    errors.push('migration verification may not be skipped or forgive failures');
  }
  if (!/^    runs-on: ubuntu-latest\s*$/m.test(job)
      || !/^    timeout-minutes: 30\s*$/m.test(job)) errors.push('migration verification needs its bounded Docker-capable runner');
  const steps = job.split(/(?=^      - )/m).slice(1);
  const runSteps = steps.filter((step) => /^        run:/m.test(step));
  const commands = runSteps.map((step) => step.match(/^        run: (.*)$/m)?.[1]?.trim());
  if (JSON.stringify(commands) !== JSON.stringify(['chmod +x gradlew',
    ...(standaloneProduct ? ['node --test scripts/adoption-execute.test.mjs'] : []), 'node scripts/verify.mjs migration'])
      || /^ {4}defaults:/m.test(job)
      || runSteps.some((step) => /^        (?:if|shell):/m.test(step)
        || step.includes('continue-on-error:') || step.includes('working-directory:'))) {
    errors.push('CI must execute the same migration scope unconditionally without npm, frontend, or load commands');
  }
  const actions = [...job.matchAll(/^\s+(?:-\s+)?uses:\s*([^\s#]+)/gm)].map((match) => match[1]);
  const expectedActionNames = [
    'actions/checkout', 'actions/setup-node', 'actions/setup-java', 'gradle/actions/setup-gradle', 'actions/upload-artifact',
  ];
  if (JSON.stringify(actions.map((action) => action.split('@')[0])) !== JSON.stringify(expectedActionNames)
      || actions.some((action) => !/@[a-f0-9]{40}$/.test(action))) errors.push('workflow actions must be the pinned verification-only action set');
  if (!/^          node-version: '22'\s*$/m.test(job)
      || !/^          java-version: '21'\s*$/m.test(job)
      || !/^          distribution: temurin\s*$/m.test(job)) errors.push('migration verification requires Node 22 and Temurin JDK 21');
  const artifact = steps.find((step) => step.includes('uses: actions/upload-artifact@')) ?? '';
  if (!/^          path: migration-tool\/build\/libs\/\*\.jar\s*$/m.test(artifact)
      || !/^          if-no-files-found: error\s*$/m.test(artifact)
      || /^        if:/m.test(artifact) || artifact.includes('continue-on-error:')) {
    errors.push('verified bootJar artifact must be retained and missing output must fail');
  }

  for (const event of ['push', 'pull_request']) {
    const eventBlock = executable.match(new RegExp(`^  ${event}:\\n([\\s\\S]*?)(?=^  [a-z_]+:|^\\S|(?![\\s\\S]))`, 'm'))?.[1] ?? '';
    const paths = [...eventBlock.matchAll(/^      - '([^']+)'\s*$/gm)].map((match) => match[1]);
    if (!requiredPaths.every((path) => paths.includes(path)) || paths.some((path) => path.startsWith('!'))) {
      errors.push(`${event} must cover the module, shared Gradle inputs, runner, and workflow without exclusions`);
    }
  }
  if (!/^  workflow_dispatch:\s*$/m.test(executable)) errors.push('independent verification must allow workflow_dispatch');
  return errors;
}

test('migration scope executes only its independent contracts and module tasks on Windows and Linux', () => {
  assert.deepEqual(validateRunner(runner, 'win32'), []);
  assert.deepEqual(validateRunner(runner, 'linux'), []);
  assert.doesNotMatch(moduleBuild, /\b(?:api|implementation|testImplementation)\s+project\(/);
});

test('child-only PIT probes are excluded only from the two exact CI target scopes while ordinary Test retains them', () => {
  assert.deepEqual(validateDrillBuild(moduleBuild), []);
  assert.deepEqual(validateRunner(runner, 'win32'), []);
  assert.deepEqual(validateRunner(runner, 'linux'), []);
  assert.deepEqual(validateWorkflow(workflow), []);
});

test('broad PIT exclusions, excluded Oracle engine probes, and ordinary Test filters turn red', () => {
  for (const mutate of [
    (source) => source.replace(childOnlyTests[0], 'nuri.migration.*IntegrationTest'),
    (source) => source.replace(`,\n                '${childOnlyTests[3]}'`, ''),
    (source) => source.replace(`,\n                '${childOnlyTests[4]}'`, ''),
    (source) => source.replace(`,\n                '${childOnlyTests[5]}'`, ''),
    (source) => source.replace(`,\n                '${childOnlyTests[6]}'`, ''),
    (source) => source.replace(`'${childOnlyTests[1]}'`, `'${childOnlyTests[1]}',\n                'nuri.migration.EtlOracleCrashRecoveryIntegrationTest'`),
    (source) => source.replace("tasks.named('test', Test) {", "tasks.named('test', Test) {\n    exclude '**/*IntegrationTest*'"),
    (source) => source.replace("tasks.named('test', Test) {", "tasks.named('test', Test) {\n    onlyIf { false }"),
    (source) => `tasks.named('test') { enabled = false }\n${source}`,
    (source) => `tasks.withType(Test) { enabled = false }\n${source}`,
    (source) => source.replace("dependsOn tasks.named('bootJar')", "// dependsOn tasks.named('bootJar')"),
    (source) => source.replace("systemProperty 'migration.drill.classpath', classpath.asPath",
      "systemProperty 'migration.drill.classpath', 'fake-classpath'"),
    (source) => source.replace("systemProperty 'migration.drill.jar', tasks.named('bootJar').get().archiveFile.get().asFile.absolutePath",
      "systemProperty 'migration.drill.jar', 'fake-application.jar'"),
  ]) {
    const changed = mutate(moduleBuild);
    assert.notEqual(changed, moduleBuild);
    assert.ok(validateDrillBuild(changed).length);
  }
});

test('unconditional, broadened, disabled, and comment or quoted-string PIT policies turn red', () => {
  for (const mutate of [
    (source) => source.replace('if (targetClasses.get()', 'if (true || targetClasses.get()'),
    (source) => source.replace('if (targetClasses.get()', 'if (false && targetClasses.get()'),
    (source) => source.replace("['nuri.migration.transform.*'].toSet()", "['nuri.*'].toSet()"),
    (source) => source.replace('excludedTestClasses = [', '// excludedTestClasses = ['),
    (source) => source.replace('    if (targetClasses.get()', '    /* if (targetClasses.get()')
      .replace('    jvmArgs.add(providers.provider {', '    */\n    jvmArgs.add(providers.provider {'),
    (source) => source.replace('    if (targetClasses.get()', "    def decoy = '''if (targetClasses.get()")
      .replace('    jvmArgs.add(providers.provider {', "    '''\n    jvmArgs.add(providers.provider {"),
  ]) {
    const changed = mutate(moduleBuild);
    assert.notEqual(changed, moduleBuild);
    assert.ok(validateDrillBuild(changed).length);
  }
});

test('online coupling, removed commands, unqualified Gradle tasks, and load invocation turn red', () => {
  for (const mutate of [
    (source) => source.replace("scope === 'migration'", "scope === 'missing-migration'"),
    (source) => source.replace(`run('${contractCommand}');`, `// run('${contractCommand}');`),
    (source) => source.replace(`run('${contractCommand}');`, `runRepositoryContracts();\n    run('${contractCommand}');`),
    (source) => source.replace(':migration-tool:test :migration-tool:bootJar', 'test :migration-tool:bootJar'),
    (source) => source.replace(':migration-tool:bootJar', ':migration-tool:bootRun'),
    (source) => source.replace(`run('${contractCommand}');`, `run('java -jar migration-tool.jar load');\n    run('${contractCommand}');`),
  ]) assert.notDeepEqual(validateRunner(mutate(runner)), []);
});

test('migration scope propagates contract and Gradle failure before claiming completion', () => {
  const contractFailure = observeMigrationCommands(runner, 'linux', contractCommand);
  assert.deepEqual(contractFailure.commands, [contractCommand]);
  assert.deepEqual(contractFailure.exits, [1]);
  const gradleFailure = observeMigrationCommands(runner, 'linux', `./gradlew ${moduleTasks} ${gradleOptions}`);
  assert.deepEqual(gradleFailure.exits, [1]);
});

test('migration CI binds the real runner without online dependencies or operational publication', () => {
  assert.deepEqual(validateWorkflow(workflow), []);
});

test('missing or conditional execution, broad dependencies, write permissions, and missing artifacts turn red', () => {
  for (const path of requiredPaths) {
    assert.ok(validateWorkflow(workflow.replaceAll(`      - '${path}'`, "      - 'unrelated/**'")).length, path);
  }
  for (const mutate of [
    (source) => source.replace('run: node scripts/verify.mjs migration', '# run: node scripts/verify.mjs migration'),
    (source) => source.replace('run: node scripts/verify.mjs migration', "if: false\n        run: node scripts/verify.mjs migration"),
    (source) => source.replace('run: node scripts/verify.mjs migration', 'run: npm run verify'),
    (source) => source.replace('run: node scripts/verify.mjs migration', 'run: java -jar migration-tool.jar load'),
    (source) => source.replace('contents: read', 'contents: write'),
    (source) => source.replace('contents: read', 'contents: read\n  actions: write'),
    (source) => source.replace('run: node scripts/verify.mjs migration', 'shell: echo {0}\n        run: node scripts/verify.mjs migration'),
    (source) => source.replace("      - 'migration-tool/**'", "      - 'unrelated/**'"),
    (source) => source.replace('if-no-files-found: error', 'if-no-files-found: ignore'),
    (source) => source.replace(/actions\/checkout@[a-f0-9]{40}/, 'actions/checkout@main'),
  ]) assert.notDeepEqual(validateWorkflow(mutate(workflow)), []);
});

test('job, command and artifact guards keep rejecting nested bypass tokens after splitting anchored checks', () => {
  for (const [before, after, message] of [
    ['    runs-on:', '    if: false\n    runs-on:', 'migration verification may not be skipped'],
    ['    steps:', '    continue-on-error: true\n    steps:', 'migration verification may not be skipped'],
    ['    steps:', "    env:\n      TOKEN: '${{ secrets.DEPLOY_TOKEN }}'\n    steps:", 'migration verification may not be skipped'],
    ['run: node scripts/verify.mjs migration', 'continue-on-error: true\n        run: node scripts/verify.mjs migration', 'CI must execute the same migration scope'],
    ['run: node scripts/verify.mjs migration', 'working-directory: another-product\n        run: node scripts/verify.mjs migration', 'CI must execute the same migration scope'],
    ['if-no-files-found: error', 'if-no-files-found: error\n        continue-on-error: true', 'verified bootJar artifact must be retained'],
  ]) {
    const changed = workflow.replace(before, after);
    assert.notEqual(changed, workflow);
    assert.ok(validateWorkflow(changed).some(error => error.includes(message)), message);
  }
});
