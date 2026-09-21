import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { installReusableVerification } from './generate-reusable-base-source.mjs';
import { applySingleModuleLayout } from './reusable-single-module.mjs';
import { installMultiModuleMigrationRuntime, installSingleModuleRuntime } from './reusable-layout-runtime.mjs';
import { parseWorkflowJobs } from './required-checks-contract.mjs';
import { ARTIFACT_COMMAND, VERIFICATION_HISTORY, validateReusableArtifactEntrypoints } from './reusable-artifact-entrypoints-contract.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isArtifact = existsSync(join(ROOT, 'reusable-base-lock.json'));
const read = (root, path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n');
const json = (root, path) => JSON.parse(read(root, path));
const write = (root, path, value) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), value); };
function fixture(t, profile = 'core', layout = 'multi-module') {
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-entrypoints-'));
  t.after(() => {
    const back = relative(base, root);
    assert.ok(back.startsWith('egov-entrypoints-') && !back.includes(sep));
    rmSync(root, { recursive: true, force: true });
  });
  const copy = path => {
    const source = join(ROOT, path);
    if (existsSync(source) && readdirSafe(source)) {
      for (const name of readdirSync(source)) copy(`${path}/${name}`);
    } else { mkdirSync(dirname(join(root, path)), { recursive: true }); copyFileSync(source, join(root, path)); }
  };
  function readdirSafe(path) { try { readdirSync(path); return true; } catch { return false; } }
  for (const path of ['package.json', 'Makefile', '.githooks/pre-push', '.github/required-checks.json', '.github/workflows']) copy(path);
  for (const path of ['build.gradle', 'settings.gradle', 'scripts/dev.mjs', 'scripts/verify.mjs',
    'scripts/migration-verification-contract.test.mjs', 'api-server/Dockerfile',
    ...['foundation', 'business-core', 'business-app', 'api-server', 'migration-tool'].map(module => `${module}/build.gradle`)]) copy(path);
  if (isArtifact) {
    for (const path of ['reusable-base-lock.json', VERIFICATION_HISTORY, 'REUSABLE_VERIFICATION.md']) copy(path);
  } else {
    write(root, 'reusable-base-lock.json', JSON.stringify({ profile, layout, sourceCommit: '1'.repeat(40) }));
    installReusableVerification(root, layout);
    if (layout === 'single-module') {
      applySingleModuleLayout(root);
      installSingleModuleRuntime(root);
    } else installMultiModuleMigrationRuntime(root);
  }
  return root;
}

test('producer fixtures and the actual generated product preserve a distinct non-recursive verification contract', t => {
  const profiles = isArtifact ? [json(ROOT, 'reusable-base-lock.json').profile] : ['core', 'collaboration', 'demo'];
  if (isArtifact) assert.deepEqual(validateReusableArtifactEntrypoints(ROOT), []);
  for (const profile of profiles) {
    const root = fixture(t, profile);
    assert.deepEqual(validateReusableArtifactEntrypoints(root), []);
    const jobs = parseWorkflowJobs(read(root, '.github/workflows/ci.yml'));
    assert.deepEqual([...jobs.keys()], ['artifact-verification']);
    const job = jobs.get('artifact-verification');
    assert.match(job, /^        run: node scripts\/verify-reusable-artifact\.mjs$/m);
    assert.doesNotMatch(job, /verify-reusable-base|matrix\.profile|deploy\.sh|--execute/);
    assert.match(job, /gitleaks detect --source \. --no-git/);
    assert.match(job, /gitleaks detect --source \. --no-banner/);
    assert.match(job, /github\.event\.pull_request\.base\.sha/);
    assert.match(job, /github\.event\.before/);
    assert.match(job, /uses: gradle\/actions\/setup-gradle@9c971963bec38e04b3d30dcc455b5382be2fdbfb\n        with:\n          cache-provider: basic\n          cache-read-only: false/);
    assert.equal(json(root, '.github/required-checks.json').profile, profile);
    assert.equal(json(root, '.github/required-checks.json').remoteApplied, false);
    assert.ok(json(root, `${VERIFICATION_HISTORY}/index.json`).files.some(entry => entry.source === '.github/workflows/release.yml'));
  }
});

test('layout identity, single project shape and executable runtime aliases are enforced by the active contract', t => {
  const root = fixture(t, 'core', 'single-module');
  assert.deepEqual(validateReusableArtifactEntrypoints(root), []);
  const lock = json(root, 'reusable-base-lock.json');
  write(root, 'reusable-base-lock.json', JSON.stringify({ ...lock, layout: 'unknown-layout' }));
  assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('Unsupported backend layout')));
  write(root, 'reusable-base-lock.json', JSON.stringify(lock));
  if (lock.layout === 'single-module') {
    const settings = read(root, 'settings.gradle');
    write(root, 'settings.gradle', `${settings}\ninclude 'business-core'\n`);
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('includes')));
    write(root, 'settings.gradle', settings);
    write(root, 'reusable-base-lock.json', JSON.stringify({ ...lock, layout: 'multi-module' }));
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('project includes')));
    write(root, 'reusable-base-lock.json', JSON.stringify(lock));
    const pkg = json(root, 'package.json');
    pkg.scripts.backend = 'gradlew.bat :api-server:bootRun';
    write(root, 'package.json', JSON.stringify(pkg));
    assert.ok(validateReusableArtifactEntrypoints(root).length > 0);
  }
});

test('Makefile cannot reactivate the producer runner or omit logical single-module test suites', t => {
  const root = fixture(t, 'core', 'single-module');
  const original = read(root, 'Makefile');
  for (const [from, to] of [
    [`\t${ARTIFACT_COMMAND}\n`, '\tnode scripts/verify.mjs full\n'],
    [`\t${ARTIFACT_COMMAND} --scope backend`, '\tnode scripts/verify.mjs be'],
    [`\t${ARTIFACT_COMMAND} --scope frontend`, '\tnode scripts/verify.mjs fe'],
    ...(json(root, 'reusable-base-lock.json').layout === 'single-module' ? [['$(GRADLEW) allTests', '$(GRADLEW) test']] : []),
  ]) {
    const changed = original.replace(from, to);
    assert.notEqual(changed, original);
    write(root, 'Makefile', changed);
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('Makefile')));
  }
});

test('product CI rejects disabled execution, altered scope, recursive generation, security bypass and remote publication', t => {
  const root = fixture(t);
  const path = '.github/workflows/ci.yml';
  const source = read(root, path);
  for (const mutate of [
    value => value.replace(`run: ${ARTIFACT_COMMAND}`, `run: ${ARTIFACT_COMMAND} --scope contracts`),
    value => value.replace(`run: ${ARTIFACT_COMMAND}`, 'run: node scripts/verify-reusable-base.mjs --profile demo'),
    value => value.replace(`run: ${ARTIFACT_COMMAND}`, `if: false\n        run: ${ARTIFACT_COMMAND}`),
    value => value.replace('    steps:', '    if: false\n    steps:'),
    value => value.replace('    steps:', '    defaults:\n      run:\n        shell: echo {0}\n    steps:'),
    value => value.replace(`run: ${ARTIFACT_COMMAND}`, 'run: exit 0'),
    value => value.replace('      - name: Scan working tree', '      - if: false\n        name: Scan working tree'),
    value => value.replace('--exit-code 1', '--exit-code 0'),
    value => value.replace('VERSION=8.28.0', 'VERSION=latest'),
    value => value.replace('contents: read', 'contents: write'),
    value => value.replace('          fetch-depth: 0', '          ref: main\n          fetch-depth: 0'),
    value => value.replace('  pull_request:', "  pull_request:\n    paths: ['docs/**']"),
    value => value.replace('  workflow_dispatch:', "  schedule:\n    - cron: '* * * * *'\n  workflow_dispatch:"),
    value => value.replace('if-no-files-found: error', 'if-no-files-found: warn'),
    value => value.replace('setup-gradle@9c971963bec38e04b3d30dcc455b5382be2fdbfb', 'setup-gradle@d9c87d481d55275bb5441eef3fe0e46805f9ef70'),
    value => value.replace('          cache-provider: basic\n', ''),
    value => value.replace('cache-provider: basic', 'cache-provider: enhanced'),
    value => value.replace('          cache-read-only: false\n', ''),
    value => value.replace('cache-read-only: false', 'cache-read-only: true'),
    value => value.replace('cache-read-only: false', 'cache-read-only: false\n          cache-disabled: true'),
  ]) {
    const changed = mutate(source);
    assert.notEqual(changed, source);
    write(root, path, changed);
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('active product CI')), changed);
  }
  write(root, path, source);
  write(root, '.github/workflows/release.yml', 'name: inherited release\non: [push]\n');
  assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('remain inactive')));
});

test('every supported alias follows the product scope and unsupported aliases cannot reappear', t => {
  const root = fixture(t);
  const path = 'package.json';
  const pkg = json(root, path);
  const expected = { verify: '', 'verify:artifact': '', 'verify:full': '', 'verify:push': '', 'verify:fast': '',
    'verify:docs': ' --scope contracts', 'verify:be': ' --scope backend', 'verify:fe': ' --scope frontend',
    'test:operational-contracts': ' --scope contracts' };
  for (const [alias, suffix] of Object.entries(expected)) {
    assert.equal(pkg.scripts[alias], `node scripts/verify-reusable-artifact.mjs${suffix}`);
    const changed = structuredClone(pkg);
    changed.scripts[alias] = 'node scripts/verify.mjs full';
    write(root, path, JSON.stringify(changed));
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes(`incorrect generated alias: ${alias}`)));
  }
  for (const alias of ['verify:e2e', 'verify:ops', 'base:verify', 'migration:export']) {
    write(root, path, JSON.stringify({ ...pkg, scripts: { ...pkg.scripts, [alias]: 'echo inherited' } }));
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('inherited applicability')));
  }
});

test('upstream snapshots, profile identity and unapplied institution policy cannot be silently rewritten', t => {
  const root = fixture(t);
  for (const path of [`${VERIFICATION_HISTORY}/Makefile`, `${VERIFICATION_HISTORY}/.github/workflows/ci.yml`, `${VERIFICATION_HISTORY}/.githooks/pre-push`,
    `${VERIFICATION_HISTORY}/package.json`]) {
    const original = read(root, path);
    write(root, path, `${original}\n# rewritten historical evidence`);
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('hash mismatch')));
    write(root, path, original);
  }
  const manifestPath = '.github/required-checks.json';
  const manifest = json(root, manifestPath);
  for (const changed of [{ ...manifest, remoteApplied: true }, { ...manifest, branch: 'main' },
    { ...manifest, requiredChecks: [] }, { ...manifest, profile: 'different' }]) {
    write(root, manifestPath, JSON.stringify(changed));
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('required-check template')));
  }
  write(root, manifestPath, JSON.stringify(manifest));
  write(root, '.githooks/pre-push', '#!/bin/sh\nexit 0\n');
  assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('pre-push')));
});

test('missing upstream inputs fail before the product is represented as a valid projection', t => {
  const root = fixture(t);
  const original = read(root, `${VERIFICATION_HISTORY}/index.json`);
  assert.throws(() => installReusableVerification(root), /already projected/);
  assert.equal(read(root, `${VERIFICATION_HISTORY}/index.json`), original);
});
