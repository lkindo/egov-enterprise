import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createComposerEngine, composerOutputPaths, parseComposerArgs } from './project-composer.mjs';

const root = resolve(import.meta.dirname, '..');
const recipe = () => ({ schemaVersion: 1, project: { name: 'engine-contract' }, sourceRef: 'HEAD',
  selection: { domains: ['mail', 'schedule'] }, database: { vendor: 'postgresql' }, backendLayout: 'single-module' });

test('UI and CLI use the same side-effect-free plan and reject unsupported or unsafe inputs', () => {
  const engine = createComposerEngine();
  const before = composerOutputPaths(root, 'planning-only', '0123456789abcdef');
  const plan = engine.plan(recipe());
  assert.deepEqual(plan.resolvedDomains, ['mail', 'report', 'schedule']);
  assert.equal(plan.backendLayout, 'single-module');
  assert.ok(plan.menus.length > 0);
  assert.ok(plan.tables.includes('tb_user_info'));
  assert.equal(existsSync(before.jobDirectory), false);
  assert.throws(() => engine.plan({ ...recipe(), sourceRef: 'HEAD~1' }), /source reference/);
  assert.throws(() => engine.plan({ ...recipe(), selection: { domains: ['typo'] } }), /Unknown domain/);
  assert.throws(() => composerOutputPaths(root, '../escape', '0123456789abcdef'), /Invalid/);
  assert.throws(() => composerOutputPaths(root, 'okay', 'not-a-token'), /Invalid/);
  assert.deepEqual(parseComposerArgs(['generate', '--recipe', 'project.json']), { action: 'generate', recipeFile: 'project.json' });
  assert.throws(() => parseComposerArgs(['generate', '--recipe', 'project.json', '--shell', 'unsafe']), /Usage/);
});

function runner({ verificationResult = 'passed', wrongOwner = false } = {}) {
  const calls = [];
  let token;
  let staging;
  let composition;
  return {
    calls,
    get staging() { return staging; },
    run: async (command, args, options) => {
      calls.push({ command, args, root: options.root });
      if (command === 'docker') {
        if (args[0] === 'run') { token = args[args.indexOf('--label') + 1].split('=')[1]; return 'a'.repeat(64); }
        if (args[0] === 'inspect') return wrongOwner ? 'someone-else' : token;
        return '';
      }
      if (args[0] === 'scripts/generate-reusable-base-source.mjs') {
        staging = args[args.indexOf('--output') + 1];
        composition = JSON.parse(readFileSync(args[args.indexOf('--composition') + 1], 'utf8'));
        mkdirSync(join(staging, 'build/reports/reusable-base'), { recursive: true });
      }
      if (args[0] === 'scripts/verify-reusable-artifact.mjs') {
        writeFileSync(join(options.root, 'build/reports/reusable-base/full.json'), JSON.stringify({ result: verificationResult,
          sourceCommit: composition.sourceCommit, profile: composition.profile, layout: composition.backendLayout, scope: 'full' }));
      }
      if (command === 'pnpm') {
        const dependency = join(options.root, 'frontend/node_modules/.pnpm/mock-package');
        mkdirSync(dependency, { recursive: true });
        writeFileSync(join(dependency, 'entry.js'), 'verified dependency');
        symlinkSync(dependency, join(options.root, 'frontend/node_modules/mock-package'), 'junction');
      }
      return '';
    },
  };
}

test('generation publishes readiness after verification, keeps absolute dependency junctions valid, and cleans only its own container', async () => {
  const mock = runner();
  const engine = createComposerEngine({ run: mock.run, fingerprint: () => 'a'.repeat(64) });
  const stages = [];
  const work = engine.generate(recipe(), { onProgress: value => stages.push(value.stage) });
  await assert.rejects(() => engine.generate(recipe()), /already running/);
  const result = await work;
  assert.equal(result.verified, true);
  assert.equal(existsSync(mock.staging), false);
  assert.equal(existsSync(result.projectDirectory), true);
  assert.equal(JSON.parse(readFileSync(result.reportPath, 'utf8')).result, 'passed');
  assert.equal(readFileSync(join(result.projectDirectory, 'frontend/node_modules/mock-package/entry.js'), 'utf8'), 'verified dependency');
  assert.deepEqual(stages, ['resolve', 'database', 'source', 'install', 'verify', 'complete']);
  const start = mock.calls.find(call => call.command === 'docker' && call.args[0] === 'run');
  assert.ok(!start.args.some(arg => ['--publish', '-p', '--volume', '-v'].includes(arg)));
  assert.ok(start.args.includes('POSTGRES_PASSWORD'));
  assert.equal(mock.calls.at(-1).args[0], 'rm');
});

test('failed validation retains explicit failure evidence and never publishes a ready project', async () => {
  const mock = runner({ verificationResult: 'failed' });
  const engine = createComposerEngine({ run: mock.run, fingerprint: () => 'a'.repeat(64) });
  await assert.rejects(() => engine.generate(recipe()), /verification report is incomplete/);
  assert.equal(existsSync(mock.staging), false);
  const final = mock.staging.replace('.pending-', '');
  assert.equal(existsSync(final), true);
  assert.equal(JSON.parse(readFileSync(join(final, 'project-generation-report.json'), 'utf8')).result, 'failed');
  const reportPath = resolve(root, 'build/project-composer/jobs', final.split(/[\\/]/).at(-1), 'report.json');
  assert.equal(JSON.parse(readFileSync(reportPath, 'utf8')).result, 'failed');
  assert.equal(mock.calls.at(-1).args[0], 'rm');
});

test('cleanup refuses a container whose ownership label differs', async () => {
  const mock = runner({ wrongOwner: true, verificationResult: 'failed' });
  await assert.rejects(() => createComposerEngine({ run: mock.run, fingerprint: () => 'a'.repeat(64) }).generate(recipe()), /ownership changed/);
  assert.ok(!mock.calls.some(call => call.command === 'docker' && call.args[0] === 'rm'));
});

test('a source mutation during generation stops before install, verification or publication', async () => {
  const mock = runner();
  let reads = 0;
  const engine = createComposerEngine({ run: mock.run, fingerprint: () => (++reads === 1 ? 'a' : 'b').repeat(64) });
  await assert.rejects(() => engine.generate(recipe()), /Source checkout changed/);
  assert.ok(!mock.calls.some(call => call.command === 'npm' || call.args[0] === 'scripts/verify-reusable-artifact.mjs'));
  assert.equal(existsSync(mock.staging.replace('.pending-', '')), false);
});
