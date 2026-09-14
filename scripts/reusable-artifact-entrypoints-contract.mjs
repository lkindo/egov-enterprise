/** ADR-0018: product verification is distinct from the upstream framework pipeline. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const VERIFICATION_HISTORY = 'config/governance/upstream-verification';
export const ARTIFACT_COMMAND = 'node scripts/verify-reusable-artifact.mjs';
export const artifactAliases = Object.freeze({
  verify: ARTIFACT_COMMAND,
  'verify:artifact': ARTIFACT_COMMAND,
  'verify:docs': `${ARTIFACT_COMMAND} --scope contracts`,
  'verify:be': `${ARTIFACT_COMMAND} --scope backend`,
  'verify:fe': `${ARTIFACT_COMMAND} --scope frontend`,
  'verify:full': ARTIFACT_COMMAND,
  'verify:push': ARTIFACT_COMMAND,
  'verify:fast': ARTIFACT_COMMAND,
  'test:operational-contracts': `${ARTIFACT_COMMAND} --scope contracts`,
});
export const verificationTextHash = text => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');

export function reusableArtifactEntrypoints(profile, secretScanRun) {
  if (!['core', 'collaboration', 'demo'].includes(profile)) throw new Error('unknown generated profile');
  if (typeof secretScanRun !== 'string' || !secretScanRun.includes('VERSION=8.28.0')
    || !secretScanRun.includes('--no-git') || !secretScanRun.includes('--log-opts=')) {
    throw new Error('the upstream pinned working-tree and incremental secret scan is required');
  }
  const workflow = `name: Reusable artifact verification

on:
  push:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: reusable-artifact-${'${{ github.ref }}'}
  cancel-in-progress: true

jobs:
  artifact-verification:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020
        with:
          node-version: '22'
      - uses: actions/setup-java@de7274f081f381c8f8158605e0321c36c376e2e6
        with:
          java-version: '21'
          distribution: temurin
      - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413
        with:
          version: '9.15.0'
      - uses: gradle/actions/setup-gradle@d9c87d481d55275bb5441eef3fe0e46805f9ef70
      - name: Scan working tree and incremental secrets
        run: |
${secretScanRun.split('\n').map(line => `          ${line}`).join('\n')}
      - name: Install verification dependencies
        run: npm ci --ignore-scripts
      - name: Install product frontend dependencies
        run: pnpm -C frontend install --frozen-lockfile
      - name: Allow the Gradle wrapper to run
        run: chmod +x gradlew
      - name: Verify this generated product
        run: ${ARTIFACT_COMMAND}
      - name: Retain product verification
        uses: actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a
        with:
          name: reusable-artifact-verification
          path: build/reports/reusable-base/full.json
          if-no-files-found: error
          retention-days: 7
`;
  const manifest = {
    version: 1, authority: 'adopter-required-check-template', profile,
    workflow: '.github/workflows/ci.yml', remoteApplied: false, branch: null, integrationId: null,
    requiredChecks: [{ context: 'artifact-verification', jobId: 'artifact-verification', needs: [] }],
    criticalSteps: [
      { jobId: 'artifact-verification', name: 'Scan working tree and incremental secrets', run: secretScanRun },
      { jobId: 'artifact-verification', name: 'Verify this generated product', run: ARTIFACT_COMMAND },
    ],
  };
  return { workflow, manifest };
}

export function validateReusableArtifactEntrypoints(root) {
  const errors = [];
  const read = path => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n');
  const check = (value, message) => { if (!value) errors.push(message); };
  try {
    const lock = JSON.parse(read('reusable-base-lock.json'));
    const history = JSON.parse(read(`${VERIFICATION_HISTORY}/index.json`));
    check(history.schemaVersion === 1 && history.authority === 'upstream-verification-history'
      && history.activeProfile === lock.profile && history.inheritedExecutionApproval === false, 'invalid verification history scope');
    const files = history.files;
    check(Array.isArray(files) && files.length > 0, 'verification history cannot be empty');
    const sources = new Set();
    for (const entry of files ?? []) {
      const safeSource = typeof entry.source === 'string' && !entry.source.includes('..') && !entry.source.includes('\\')
        && (entry.source === 'package.json' || entry.source === '.githooks/pre-push'
          || entry.source === '.github/required-checks.json' || /^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.source));
      if (!safeSource || entry.path !== `${VERIFICATION_HISTORY}/${entry.source}`) throw new Error('unexpected verification snapshot path');
      check(!sources.has(entry.source), 'duplicate verification snapshot');
      sources.add(entry.source);
      check(/^[a-f0-9]{64}$/.test(entry.sha256 ?? '') && verificationTextHash(read(entry.path)) === entry.sha256,
        `verification snapshot hash mismatch: ${entry.source}`);
    }
    for (const source of ['package.json', '.githooks/pre-push', '.github/required-checks.json', '.github/workflows/ci.yml']) {
      check(sources.has(source), `missing verification history: ${source}`);
    }
    const archivedWorkflows = readdirSync(join(root, VERIFICATION_HISTORY, '.github/workflows')).filter(name => /\.ya?ml$/.test(name));
    check(JSON.stringify(archivedWorkflows.sort()) === JSON.stringify([...sources]
      .filter(path => path.startsWith('.github/workflows/')).map(path => path.split('/').at(-1)).sort()), 'workflow history population mismatch');
    const original = JSON.parse(read(`${VERIFICATION_HISTORY}/.github/required-checks.json`));
    const scan = original.criticalSteps?.find(step => step.name === 'Run gitleaks (working tree + incremental)')?.run;
    const expected = reusableArtifactEntrypoints(lock.profile, scan);
    check(read('.github/workflows/ci.yml') === expected.workflow, 'active product CI execution differs from the declared product contract');
    check(JSON.stringify(JSON.parse(read('.github/required-checks.json'))) === JSON.stringify(expected.manifest),
      'adopter required-check template differs or claims remote approval');
    check(JSON.stringify(readdirSync(join(root, '.github/workflows')).filter(name => /\.ya?ml$/.test(name)).sort()) === '["ci.yml"]',
      'upstream workflow must remain inactive history until institution-specific integration');
    const pkg = JSON.parse(read('package.json'));
    for (const [alias, command] of Object.entries(artifactAliases)) check(pkg.scripts?.[alias] === command, `incorrect generated alias: ${alias}`);
    check(!Object.keys(pkg.scripts ?? {}).some(alias => alias.startsWith('base:') || ['verify:e2e', 'verify:ops'].includes(alias)),
      'producer or institution runtime aliases cannot imply inherited applicability');
    check(read('.githooks/pre-push') === `#!/bin/sh\nset -e\n${ARTIFACT_COMMAND}\n`, 'generated pre-push must execute product verification');
    check(existsSync(join(root, 'REUSABLE_VERIFICATION.md')), 'generated verification boundary documentation is required');
  } catch (error) { errors.push(`entrypoint inspection failed: ${error.message}`); }
  return errors;
}
