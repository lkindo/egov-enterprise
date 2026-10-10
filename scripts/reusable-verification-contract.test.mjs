import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import test from 'node:test';
import { VERIFICATION_STEP_IDS, verificationCommands, verificationSteps, verifyReusableArtifact } from './verify-reusable-artifact.mjs';
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

test('the verification report records each step and names the failed command with its exit code', (t) => {
  const root = fixture(t);
  const commands = verificationCommands();
  const report = () => JSON.parse(readFileSync(join(root, 'build/reports/reusable-base/full.json'), 'utf8'));
  let called = 0;
  assert.throws(() => verifyReusableArtifact({ root, run: () => {
    if (called++ === 4) throw Object.assign(new Error('tsc failed'), { exitCode: 3 });
  } }), /tsc failed/);
  const failed = report();
  assert.equal(failed.result, 'failed');
  assert.deepEqual(failed.failure, { step: 'typecheck', command: commands[4].flat().join(' '), exitCode: 3, durationMs: failed.failure.durationMs });
  assert.ok(Number.isInteger(failed.failure.durationMs) && failed.failure.durationMs >= 0);
  assert.deepEqual(failed.steps.map(step => [step.command, step.result]),
    [...commands.slice(0, 4).map(command => [command.flat().join(' '), 'passed']), [commands[4].flat().join(' '), 'failed']]);
  assert.deepEqual(failed.steps.map(step => step.step), ['governance', 'ui-governance', 'entrypoints', 'backend', 'typecheck']);
  verifyReusableArtifact({ root, run: () => {} });
  const passed = report();
  assert.equal(passed.result, 'passed');
  assert.equal(passed.failure, undefined, 'a passing run does not inherit an earlier failure');
  assert.equal(passed.steps.length, commands.length);
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
    let ledgerChecked;
    await verifyReusableBase({ root, profile, layout, run, checkLedger: (source, artifact) => { ledgerChecked = [source, artifact]; },
      verify: ({ root: artifact }) => {
        assert.equal(artifact, output); return { profile, layout, scope: 'full', result: 'passed' };
      } });
    // 원장 대조는 생성 직후 원본과 생성물을 함께 본다(Phase 2 D6).
    assert.deepEqual(ledgerChecked, [root, output]);
    const dbArgs = calls.find(([cmd, args]) => cmd === 'node' && args[0].endsWith('db.mjs'))[1];
    // 구성 해시에 출력 레이아웃이 들어가므로 DB 번들도 같은 레이아웃으로 만든다(DEC-OPS-239).
    assert.equal(dbArgs[dbArgs.indexOf('--layout') + 1], layout, 'the database bundle is generated for the same layout');
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
      checkLedger: () => assert.fail('mismatched output must not reach the ledger check'),
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
  const customJob = parseWorkflowJobs(workflow).get('reusable-custom') ?? '';
  if (!/^      reusable: \$\{\{ steps\.scope\.outputs\.reusable \}\}$/m.test(workflow)) {
    errors.push('change-scope must publish the reusable selection flag');
  }
  if (!/^      reusable-matrix: \$\{\{ steps\.scope\.outputs\.reusable_matrix \}\}$/m.test(workflow)) {
    errors.push('change-scope must publish the reusable profile matrix');
  }
  if (!/^      reusable-custom: \$\{\{ steps\.scope\.outputs\.reusable_custom \}\}$/m.test(workflow)) {
    errors.push('change-scope must publish the custom composition selection flag');
  }
  for (const expected of [
    /^    needs: \[change-scope, frontend-scope\]$/m,
    /^    if: "!cancelled\(\) && needs\.change-scope\.result == 'success' && needs\.change-scope\.outputs\.reusable == 'true'"$/m,
    /^      matrix: \$\{\{ fromJSON\(needs.change-scope.outputs\['reusable-matrix'\]\) \}\}$/m,
    /^        run: node scripts\/verify-reusable-base.mjs --profile \$\{\{ matrix.profile \}\} --layout \$\{\{ matrix.layout \}\}$/m,
    /^      - name: Retain reusable profile verification\n        if: always\(\)$/m,
    /^          if-no-files-found: error$/m,
  ]) if (!expected.test(job)) errors.push(`missing reusable pipeline contract: ${expected}`);
  for (const expected of [
    /^    needs: \[change-scope, backend-scope\]$/m,
    /^    if: "!cancelled\(\) && needs\.change-scope\.result == 'success' && needs\.change-scope\.outputs\['reusable-custom'\] == 'true'"$/m,
    /^      fail-fast: false$/m,
    /^        layout: \[single-module, multi-module\]$/m,
    /^        run: node scripts\/verify-project-composer.mjs --layout \$\{\{ matrix.layout \}\}$/m,
    /^      - name: Retain custom composition verification\n        if: always\(\)$/m,
    /^            build\/project-composer\/jobs\/\*\/report\.json$/m,
    /^          if-no-files-found: error$/m,
  ]) if (!expected.test(customJob)) errors.push(`missing custom composition pipeline contract: ${expected}`);
  if (/^      max-parallel:/m.test(job)) errors.push('reusable profiles must enter together after frontend admission');
  if (/^\s*(?:include|exclude|continue-on-error|defaults):/m.test(job)) errors.push('matrix or execution override is not allowed');
  if (/^\s*(?:include|exclude|continue-on-error|defaults):/m.test(customJob)) errors.push('custom matrix or execution override is not allowed');
  return errors;
}

test('required CI binds the fail-closed classifier matrix and rejects weakening mutations', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8').replace(/\r\n/g, '\n');
  const manifest = JSON.parse(readFileSync('.github/required-checks.json', 'utf8'));
  assert.deepEqual(validatePipeline(workflow, manifest), []);
  const job = parseWorkflowJobs(workflow).get('reusable-base');
  for (const [name, mutate] of [
    ['empty matrix', value => value.replace("fromJSON(needs.change-scope.outputs['reusable-matrix'])", "fromJSON('{\"include\":[]}')")],
    ['missing layout', value => value.replace(' --layout ${{ matrix.layout }}', '')],
    ['wrong scope', value => value.replace("outputs.reusable == 'true'", "outputs.backend == 'true'")],
    ['bypass command', value => value.replace('node scripts/verify-reusable-base.mjs', 'echo bypass')],
    ['missing artifact always', value => value.replace('        if: always()\n', '')],
    ['advisory artifact', value => value.replace('if-no-files-found: error', 'if-no-files-found: warn')],
    ['advisory job', value => value.replace('    steps:', '    continue-on-error: true\n    steps:')],
    ['skipped command', value => value.replace('        run: node scripts/verify-reusable-base', '        if: false\n        run: node scripts/verify-reusable-base')],
    ['detached admission', value => value.replace('    needs: [change-scope, frontend-scope]', '    needs: [change-scope]')],
    ['throttled profiles', value => value.replace('    strategy:\n', '    strategy:\n      max-parallel: 5\n')],
    ['ignores cancellation', value => value.replace('    if: "!cancelled()', '    if: "always()')],
  ]) {
    const changedJob = mutate(job);
    assert.notEqual(changedJob, job, `negative mutation must change reusable job: ${name}`);
    assert.ok(validatePipeline(workflow.replace(job, changedJob), manifest).length,
      `negative mutation must fail reusable pipeline contract: ${name}`);
  }
  const customJob = parseWorkflowJobs(workflow).get('reusable-custom');
  for (const [name, mutate] of [
    ['wrong scope', value => value.replace("outputs['reusable-custom'] == 'true'", "outputs.backend == 'true'")],
    ['missing layout', value => value.replace('layout: [single-module, multi-module]', 'layout: [single-module]')],
    ['bypass command', value => value.replace('node scripts/verify-project-composer.mjs', 'echo bypass')],
    ['missing artifact always', value => value.replace('        if: always()\n', '')],
    ['wrong artifact', value => value.replace('build/project-composer/jobs/*/report.json', 'build/omitted-report.json')],
    ['advisory artifact', value => value.replace('if-no-files-found: error', 'if-no-files-found: warn')],
    ['advisory job', value => value.replace('    steps:', '    continue-on-error: true\n    steps:')],
    ['detached admission', value => value.replace('    needs: [change-scope, backend-scope]', '    needs: [change-scope]')],
    ['ignores cancellation', value => value.replace('    if: "!cancelled()', '    if: "always()')],
  ]) {
    const changedJob = mutate(customJob);
    assert.notEqual(changedJob, customJob, `negative mutation must change custom job: ${name}`);
    assert.ok(validatePipeline(workflow.replace(customJob, changedJob), manifest).length,
      `negative mutation must fail custom pipeline contract: ${name}`);
  }
  for (const mutate of [
    value => value.replace('reusable: ${{ steps.scope.outputs.reusable }}', 'reusable: false'),
    value => value.replace('reusable-custom: ${{ steps.scope.outputs.reusable_custom }}', 'reusable-custom: false'),
    value => value.replace('reusable-matrix: ${{ steps.scope.outputs.reusable_matrix }}', 'reusable-matrix: {}'),
  ]) assert.ok(validatePipeline(mutate(workflow), manifest).length);
  assert.ok(validatePipeline(workflow.replace('needs: [change-scope, backend-scope, backend-schema-scope, migration-scope, reusable-base, reusable-custom]', 'needs: [change-scope, backend-scope, backend-schema-scope, migration-scope, reusable-base]'), manifest).length);
});

/*
 * 검증 단계 id 는 생성기 화면이 실패한 단계를 이름으로 말하는 근거다. 명령 목록은 같은 표에서 만들고, 생성물 하네스
 * (WorkflowManifestLinterTest)가 정확히 일치를 요구하는 명령 그래프와 같아야 한다 — 원본 CI 에서는 그 하네스가 돌지 않으므로 여기서도 본다.
 */
test('verification steps carry stable ids and still produce the exact command graph the generated harness expects', () => {
  const common = [['node', ['scripts/verify-reusable-governance.mjs']],
    ['node', ['--test', 'scripts/reusable-ui-governance-contract.test.mjs']],
    ['node', ['--test', 'scripts/reusable-artifact-entrypoints-contract.test.mjs']]];
  const backend = prefix => ['gradle', ['compileJava', 'compileTestJava', `${prefix}harnessTest`, `${prefix}schemaValidationTest`,
    '--no-daemon', '--warning-mode', 'fail', '--console=plain', '-Dfile.encoding=UTF-8']];
  const frontend = [['pnpm', ['-C', 'frontend', 'exec', 'tsc', '--noEmit']], ['pnpm', ['-C', 'frontend', 'run', 'lint']],
    ['pnpm', ['-C', 'frontend', 'run', 'build']]];
  for (const [layout, prefix] of [['multi-module', ':api-server:'], ['single-module', '']]) {
    assert.deepEqual(verificationCommands('full', layout), [...common, backend(prefix), ...frontend], layout);
    assert.deepEqual(verificationSteps('full', layout).map(step => step.id), [...VERIFICATION_STEP_IDS], layout);
  }
  assert.deepEqual(verificationSteps('contracts').map(step => step.id), ['governance', 'ui-governance', 'entrypoints']);
  assert.deepEqual(verificationSteps('backend').map(step => step.id), ['governance', 'ui-governance', 'entrypoints', 'backend']);
  assert.deepEqual(verificationSteps('frontend').map(step => step.id), ['governance', 'ui-governance', 'entrypoints', 'typecheck', 'lint', 'build']);
  assert.ok(Object.isFrozen(VERIFICATION_STEP_IDS));
});
