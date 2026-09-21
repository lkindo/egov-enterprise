import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { verificationCommands, verifyReusableArtifact } from './verify-reusable-artifact.mjs';
import { parseBaseVerificationArgs, verifyReusableBase } from './verify-reusable-base.mjs';
import { parseWorkflowJobs, validateStaticContract } from './required-checks-contract.mjs';
import { installReusableVerification } from './generate-reusable-base-source.mjs';

function assertFinalServerReadiness(args, container) {
  assert.deepEqual(args, ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-p', '5432', '-U', 'verify', '-d', 'verify']);
}

function fixture(t) {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-profile-contract-'));
  t.after(() => {
    const back = relative(base, root);
    assert.ok(back.startsWith('egov-profile-contract-') && !back.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify({ profile: 'core', sourceCommit: '1'.repeat(40) }));
  return root;
}

test('artifact full verification executes every actual stage and stops on any failed command', (t) => {
  const root = fixture(t);
  const commands = verificationCommands();
  assert.deepEqual(verificationCommands('backend'), commands.slice(0, 4));
  assert.deepEqual(verificationCommands('frontend'), [...commands.slice(0, 3), ...commands.slice(4)]);
  assert.equal(commands.length, 7);
  assert.deepEqual(commands.slice(0, 3), verificationCommands('contracts'));
  assert.ok(commands[3][1].includes(':api-server:harnessTest'));
  assert.ok(commands[3][1].includes(':api-server:schemaValidationTest'));
  for (let failure = 0; failure < commands.length; failure += 1) {
    let called = 0;
    assert.throws(() => verifyReusableArtifact({ root, run: () => {
      if (called++ === failure) throw new Error('intentional stage failure');
    } }), /intentional stage failure/);
    assert.equal(called, failure + 1);
  }
  const ran = [];
  const report = verifyReusableArtifact({ root, run: (command, args) => ran.push([command, args]) });
  assert.deepEqual(ran, commands);
  assert.equal(report.layout, 'multi-module', 'older locks retain their existing Gradle layout');
  assert.equal(report.environmentApproved, false);
  assert.throws(() => verificationCommands('skip-harness'), /scope/);
  const sentinel = join(root, 'sentinel.json');
  writeFileSync(sentinel, 'unchanged');
  assert.throws(() => verifyReusableArtifact({ root, scope: '../../../sentinel', run: () => assert.fail() }), /scope/);
  assert.equal(readFileSync(sentinel, 'utf8'), 'unchanged');
});

test('single-module artifacts execute root gates and reject unsupported layouts before any commands', (t) => {
  const root = fixture(t);
  const lock = { profile: 'core', layout: 'single-module', sourceCommit: '1'.repeat(40) };
  writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify(lock));
  const commands = verificationCommands('full', 'single-module');
  assert.deepEqual(commands[3][1].slice(0, 4), ['compileJava', 'compileTestJava', 'harnessTest', 'schemaValidationTest']);
  assert.deepEqual(verificationCommands('backend', 'single-module'), commands.slice(0, 4));
  assert.deepEqual(verificationCommands('frontend', 'single-module'), [...commands.slice(0, 3), ...commands.slice(4)]);
  assert.deepEqual(verificationCommands('contracts', 'single-module'), commands.slice(0, 3));
  const ran = [];
  const report = verifyReusableArtifact({ root, run: (command, args) => ran.push([command, args]) });
  assert.deepEqual(ran, commands);
  assert.equal(report.layout, 'single-module');
  assert.equal(JSON.parse(readFileSync(join(root, 'build/reports/reusable-base/full.json'))).layout, 'single-module');
  for (const layout of ['single', '../single-module', '', null]) {
    assert.throws(() => verificationCommands('contracts', layout), /layout/);
    writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify({ ...lock, layout }));
    assert.throws(() => verifyReusableArtifact({ root, run: () => assert.fail('invalid lock must not execute') }), /layout/);
  }
});

test('base verification CLI accepts both layouts and rejects ambiguous or unsupported arguments', () => {
  assert.deepEqual(parseBaseVerificationArgs(['--profile', 'core']), { profile: 'core', layout: 'multi-module' });
  assert.deepEqual(parseBaseVerificationArgs(['--layout', 'single-module', '--profile', 'demo']), { profile: 'demo', layout: 'single-module' });
  for (const args of [
    [], ['--profile'], ['--profile', 'unknown'], ['--profile', 'core', '--layout'],
    ['--profile', 'core', '--layout', 'single'], ['--profile', 'core', '--skip-gates', 'yes'],
    ['--profile', 'core', '--profile', 'demo'], ['--profile', 'core', '--layout', 'single-module', '--layout', 'multi-module'],
  ]) assert.throws(() => parseBaseVerificationArgs(args), /usage|profile|layout/);
});

test('producer generates all stages into a fresh artifact and only removes its owned container', async (t) => {
  for (const [profile, layout] of ['core', 'collaboration', 'demo'].flatMap(profile =>
    ['multi-module', 'single-module'].map(layout => [profile, layout]))) {
    const root = fixture(t);
    const calls = [];
    let label;
    let output;
    let readinessAttempts = 0;
    const run = (command, args) => {
      calls.push([command, args]);
      if (command === 'docker') {
        if (args[0] === 'run') { label = args[args.indexOf('--label') + 1].split('=')[1]; return 'a'.repeat(64); }
        if (args[0] === 'inspect') return label;
        if (args[0] === 'exec') {
          readinessAttempts += 1;
          if (readinessAttempts === 1) throw new Error('final TCP server has not started');
        }
        return '';
      }
      assert.equal(readinessAttempts, 2, 'generation must wait for a successful readiness retry');
      if (command === 'node' && args[0].endsWith('source.mjs')) {
        output = args[args.indexOf('--output') + 1];
        mkdirSync(output, { recursive: true });
        writeFileSync(join(output, 'reusable-base-lock.json'), JSON.stringify({ profile, layout }));
        writeFileSync(join(output, 'gradlew'), '');
      }
      return '';
    };
    await verifyReusableBase({ root, profile, layout, run, verify: ({ root: artifact }) => {
      assert.equal(artifact, output); return { profile, layout, scope: 'full', result: 'passed' };
    } });
    const dbArgs = calls.find(([cmd, args]) => cmd === 'node' && args[0].endsWith('db.mjs'))[1];
    assert.ok(!dbArgs.includes('--layout'), 'the database bundle is independent of the Gradle layout');
    const sourceArgs = calls.find(([cmd, args]) => cmd === 'node' && args[0].endsWith('source.mjs'))[1];
    assert.equal(sourceArgs[sourceArgs.indexOf('--layout') + 1], layout);
    const reportName = layout === 'multi-module' ? profile : `${profile}-${layout}`;
    assert.equal(JSON.parse(readFileSync(join(root, `build/reports/reusable-base/${reportName}.json`))).layout, layout);
    assert.ok(calls.some(([cmd]) => cmd === 'npm'));
    assert.ok(calls.some(([cmd]) => cmd === 'pnpm'));
    const readiness = calls.filter(([cmd, args]) => cmd === 'docker' && args[0] === 'exec');
    assert.equal(readiness.length, 2);
    for (const [, args] of readiness) assertFinalServerReadiness(args, 'a'.repeat(64));
    assert.deepEqual(calls.at(-1), ['docker', ['rm', '--force', 'a'.repeat(64)]]);
  }
});

test('producer rejects mismatched layout locks before installation or verification and still cleans up', async (t) => {
  for (const returnedLayout of [undefined, 'multi-module', 'unsupported']) {
    const root = fixture(t);
    const calls = [];
    let label;
    const run = (command, args) => {
      calls.push([command, args]);
      if (command === 'docker') {
        if (args[0] === 'run') { label = args[args.indexOf('--label') + 1].split('=')[1]; return 'c'.repeat(64); }
        if (args[0] === 'inspect') return label;
      }
      if (command === 'node' && args[0].endsWith('source.mjs')) {
        const output = args[args.indexOf('--output') + 1];
        mkdirSync(output, { recursive: true });
        writeFileSync(join(output, 'reusable-base-lock.json'), JSON.stringify({ profile: 'core', layout: returnedLayout }));
      }
      return '';
    };
    await assert.rejects(verifyReusableBase({ root, profile: 'core', layout: 'single-module', run,
      verify: () => assert.fail('mismatched output must not reach verification') }), /layout/);
    assert.ok(!calls.some(([command]) => ['npm', 'pnpm'].includes(command)));
    assert.deepEqual(calls.at(-1), ['docker', ['rm', '--force', 'c'.repeat(64)]]);
  }
});

test('socket-only, remote, wrong-port and wrong-database readiness mutations are reproducible reds', () => {
  const container = 'a'.repeat(64);
  const command = ['exec', container, 'pg_isready', '-h', '127.0.0.1', '-p', '5432', '-U', 'verify', '-d', 'verify'];
  assertFinalServerReadiness(command, container);
  for (const args of [
    command.filter((_, index) => index !== 3 && index !== 4),
    command.filter((_, index) => index !== 5 && index !== 6),
    command.with(4, '/var/run/postgresql'),
    command.with(4, 'shared-database'),
    command.with(6, '5433'),
    command.with(8, 'postgres'),
    command.with(10, 'postgres'),
    command.with(1, 'someone-else'),
  ]) assert.throws(() => assertFinalServerReadiness(args, container), assert.AssertionError);
});

test('producer never accepts an invalid profile or uses a shared container after failure', async (t) => {
  const root = fixture(t);
  await assert.rejects(verifyReusableBase({ root, profile: '../core', run: () => assert.fail('no command allowed') }), /profile/);
  await assert.rejects(verifyReusableBase({ root, profile: 'core', layout: 'single', run: () => assert.fail('no command allowed') }), /layout/);
  const removed = [];
  await assert.rejects(verifyReusableBase({ root, profile: 'core', run: (cmd, args) => {
    if (cmd === 'docker' && args[0] === 'run') return 'b'.repeat(64);
    if (cmd === 'docker' && args[0] === 'inspect') return 'someone-else';
    if (cmd === 'docker' && args[0] === 'rm') removed.push(args);
    if (cmd === 'node') throw new Error('generation failed');
    return '';
  } }), /ownership changed/);
  assert.deepEqual(removed, []);
});

test('generated package and hook call product verification without changing the producer entry point', (t) => {
  const root = fixture(t);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ scripts: { verify: 'old' } }));
  for (const path of ['Makefile', '.github/workflows/ci.yml', '.github/required-checks.json', '.githooks/pre-push']) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(path, join(root, path));
  }
  installReusableVerification(root);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.verify, 'node scripts/verify-reusable-artifact.mjs');
  assert.equal(pkg.scripts['test:operational-contracts'], `${pkg.scripts.verify} --scope contracts`);
  assert.match(readFileSync(join(root, '.githooks/pre-push'), 'utf8'), /^node scripts\/verify-reusable-artifact.mjs$/m);
});

function validatePipeline(workflow, manifest) {
  const errors = validateStaticContract({ manifest, ciContent: workflow });
  const job = parseWorkflowJobs(workflow).get('reusable-base') ?? '';
  for (const expected of [
    /^    needs: \[change-scope\]$/m,
    /^    if: needs.change-scope.outputs\['docs-only'\] != 'true'$/m,
    /^        profile: \[core, collaboration, demo\]$/m,
    /^        layout: \[multi-module, single-module\]$/m,
    /^        run: node scripts\/verify-reusable-base.mjs --profile \$\{\{ matrix.profile \}\} --layout \$\{\{ matrix.layout \}\}$/m,
    /^        run: node scripts\/verify-project-composer.mjs --layout \$\{\{ matrix.layout \}\}$/m,
    /^      - name: Retain reusable profile verification\n        if: always\(\)$/m,
    /^            build\/project-composer\/jobs\/\*\/report\.json$/m,
    /^          if-no-files-found: error$/m,
  ]) if (!expected.test(job)) errors.push(`missing reusable pipeline contract: ${expected}`);
  if (/^\s*(?:include|exclude|continue-on-error|defaults):/m.test(job)) errors.push('matrix or execution override is not allowed');
  return errors;
}

test('required CI binds every generated profile and layout and rejects weakening mutations', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8').replace(/\r\n/g, '\n');
  const manifest = JSON.parse(readFileSync('.github/required-checks.json', 'utf8'));
  assert.deepEqual(validatePipeline(workflow, manifest), []);
  const job = parseWorkflowJobs(workflow).get('reusable-base');
  for (const mutate of [
    value => value.replace('[core, collaboration, demo]', '[demo]'),
    value => value.replace('[multi-module, single-module]', '[multi-module]'),
    value => value.replace(' --layout ${{ matrix.layout }}', ''),
    value => value.replace("outputs['docs-only'] != 'true'", 'outputs.backend == true'),
    value => value.replace('node scripts/verify-reusable-base.mjs', 'echo bypass'),
    value => value.replace('node scripts/verify-project-composer.mjs', 'echo bypass'),
    value => value.replace("if: matrix.profile == 'core'", 'if: false'),
    value => value.replace('        if: always()\n', ''),
    value => value.replace('build/project-composer/jobs/*/report.json', 'build/omitted-report.json'),
    value => value.replace('if-no-files-found: error', 'if-no-files-found: warn'),
    value => value.replace('    steps:', '    continue-on-error: true\n    steps:'),
    value => value.replace('        run: node scripts/verify-reusable-base', '        if: false\n        run: node scripts/verify-reusable-base'),
  ]) assert.ok(validatePipeline(workflow.replace(job, mutate(job)), manifest).length);
  assert.ok(validatePipeline(workflow.replace('needs: [change-scope, backend-scope, migration-scope, reusable-base]', 'needs: [change-scope, backend-scope, migration-scope]'), manifest).length);
});
