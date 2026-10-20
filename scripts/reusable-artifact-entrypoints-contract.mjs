/** ADR-0018: product verification is distinct from the upstream framework pipeline. */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { compositionProfiles } from './composition-profiles.mjs';
import { normalizeBackendLayout } from './reusable-layout.mjs';
import { groovyCode, inspectSingleModuleLayout } from './reusable-single-module.mjs';
import { validateGeneratedMigrationRuntime, validateSingleModuleRuntime } from './reusable-layout-runtime.mjs';

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

export function projectReusableMakefile(source, layout = 'multi-module') {
  normalizeBackendLayout(layout);
  const replacements = [
    ['node scripts/verify.mjs full', ARTIFACT_COMMAND],
    ['node scripts/verify.mjs be', `${ARTIFACT_COMMAND} --scope backend`],
    ['node scripts/verify.mjs fe', `${ARTIFACT_COMMAND} --scope frontend`],
  ];
  if (layout === 'single-module') for (const suffix of [
    '$(TEST_OPTS) $(GRADLE_CLI_ARGS)', '--continue $(TEST_OPTS) $(GRADLE_CLI_ARGS)',
    'jacocoRootReport --continue $(TEST_OPTS) $(GRADLE_CLI_ARGS)',
  ]) replacements.push([`$(GRADLEW) test ${suffix}`, `$(GRADLEW) allTests ${suffix}`]);
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  for (const [before, after] of replacements) {
    const indices = lines.flatMap((line, index) => line === `\t${before}` ? [index] : []);
    if (indices.length !== 1) throw new Error(`Makefile convention changed: ${before}`);
    lines[indices[0]] = `\t${after}`;
  }
  return lines.join('\n');
}

/*
  생성 제품 CI 가 쓰는 액션. 핀은 원본 ci.yml 이 정본이라 여기에 다시 적지 않는다 — 적으면 Dependabot 이 워크플로만 올린 액션
  범프마다 이 파일(과 이 파일을 내용 해시로 묶은 하네스 기준선)을 손으로 고쳐야 했다. 액션마다 원본 ci.yml 에 40자 커밋이
  정확히 하나 있어야 만들고, 없거나 둘 이상이거나 태그면 만들지 않는다. 생성물 안에서는 생성 때 남긴 검증 이력의 ci.yml 을 읽는다.
*/
export const PRODUCT_CI_ACTIONS = Object.freeze(['actions/checkout', 'actions/setup-node', 'actions/setup-java',
  'pnpm/action-setup', 'gradle/actions/setup-gradle', 'actions/upload-artifact']);

/** 원본 ci.yml 에서 생성 제품 CI 액션마다의 핀(`action@sha`). */
export function upstreamActionPins(upstreamCi) {
  if (typeof upstreamCi !== 'string' || !upstreamCi.trim()) throw new Error('the upstream ci.yml is required for product CI action pins');
  const text = upstreamCi.replace(/\r\n/g, '\n');
  const pins = {};
  for (const action of PRODUCT_CI_ACTIONS) {
    const escaped = action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`^[ \\t]*(?:-[ \\t]+)?uses:[ \\t]*${escaped}@([^\\s#]+)(?:[ \\t]+#[^\\n]*)?[ \\t]*$`, 'gm');
    const refs = [...new Set([...text.matchAll(pattern)].map(match => match[1]))];
    if (refs.length !== 1 || !/^[0-9a-f]{40}$/.test(refs[0])) {
      throw new Error(`upstream ci.yml must pin ${action} to exactly one 40-character commit (found: ${refs.join(', ') || 'none'})`);
    }
    pins[action] = `${action}@${refs[0]}`;
  }
  return pins;
}

export function reusableArtifactEntrypoints(profile, secretScanRun, upstreamCi) {
  if (!compositionProfiles().includes(profile)) throw new Error('unknown generated profile');
  if (typeof secretScanRun !== 'string' || !secretScanRun.includes('VERSION=8.28.0')
    || !secretScanRun.includes('--no-git') || !secretScanRun.includes('--log-opts=')) {
    throw new Error('the upstream pinned working-tree and incremental secret scan is required');
  }
  const pin = upstreamActionPins(upstreamCi);
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
      - uses: ${pin['actions/checkout']}
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: ${pin['actions/setup-node']}
        with:
          node-version: '22'
      - uses: ${pin['actions/setup-java']}
        with:
          java-version: '21'
          distribution: temurin
      - uses: ${pin['pnpm/action-setup']}
        with:
          version: '9.15.0'
      - uses: ${pin['gradle/actions/setup-gradle']}
        with:
          cache-provider: basic
          cache-read-only: false
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
        uses: ${pin['actions/upload-artifact']}
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
    const layout = normalizeBackendLayout(lock.layout);
    if (layout === 'single-module') {
      errors.push(...inspectSingleModuleLayout(root).errors, ...validateSingleModuleRuntime(root));
    } else {
      check(/\binclude\b/.test(groovyCode(read('settings.gradle'))), 'multi-module layout must retain Gradle project includes');
      check(lock.layoutProjection?.id !== 'single-module', 'layout and projection identity differ');
      errors.push(...validateGeneratedMigrationRuntime(root));
    }
    const history = JSON.parse(read(`${VERIFICATION_HISTORY}/index.json`));
    check(history.schemaVersion === 1 && history.authority === 'upstream-verification-history'
      && history.activeProfile === lock.profile && history.inheritedExecutionApproval === false, 'invalid verification history scope');
    const files = history.files;
    check(Array.isArray(files) && files.length > 0, 'verification history cannot be empty');
    const sources = new Set();
    for (const entry of files ?? []) {
      const safeSource = typeof entry.source === 'string' && !entry.source.includes('..') && !entry.source.includes('\\')
        && (entry.source === 'package.json' || entry.source === 'Makefile' || entry.source === '.githooks/pre-push'
          || entry.source === '.github/required-checks.json' || /^\.github\/workflows\/[^/]+\.ya?ml$/.test(entry.source));
      if (!safeSource || entry.path !== `${VERIFICATION_HISTORY}/${entry.source}`) throw new Error('unexpected verification snapshot path');
      check(!sources.has(entry.source), 'duplicate verification snapshot');
      sources.add(entry.source);
      check(/^[a-f0-9]{64}$/.test(entry.sha256 ?? '') && verificationTextHash(read(entry.path)) === entry.sha256,
        `verification snapshot hash mismatch: ${entry.source}`);
    }
    for (const source of ['package.json', 'Makefile', '.githooks/pre-push', '.github/required-checks.json', '.github/workflows/ci.yml']) {
      check(sources.has(source), `missing verification history: ${source}`);
    }
    const archivedWorkflows = readdirSync(join(root, VERIFICATION_HISTORY, '.github/workflows')).filter(name => /\.ya?ml$/.test(name));
    check(JSON.stringify(archivedWorkflows.sort()) === JSON.stringify([...sources]
      .filter(path => path.startsWith('.github/workflows/')).map(path => path.split('/').at(-1)).sort()), 'workflow history population mismatch');
    const original = JSON.parse(read(`${VERIFICATION_HISTORY}/.github/required-checks.json`));
    const scan = original.criticalSteps?.find(step => step.name === 'Run gitleaks (working tree + incremental)')?.run;
    const expected = reusableArtifactEntrypoints(lock.profile, scan, read(`${VERIFICATION_HISTORY}/.github/workflows/ci.yml`));
    check(read('.github/workflows/ci.yml') === expected.workflow, 'active product CI execution differs from the declared product contract');
    check(JSON.stringify(JSON.parse(read('.github/required-checks.json'))) === JSON.stringify(expected.manifest),
      'adopter required-check template differs or claims remote approval');
    check(JSON.stringify(readdirSync(join(root, '.github/workflows')).filter(name => /\.ya?ml$/.test(name)).sort()) === '["ci.yml"]',
      'upstream workflow must remain inactive history until institution-specific integration');
    const pkg = JSON.parse(read('package.json'));
    check(read('Makefile') === projectReusableMakefile(read(`${VERIFICATION_HISTORY}/Makefile`), layout),
      'generated Makefile must execute the selected product verification and test suites');
    for (const [alias, command] of Object.entries(artifactAliases)) check(pkg.scripts?.[alias] === command, `incorrect generated alias: ${alias}`);
    check(!Object.keys(pkg.scripts ?? {}).some(alias => alias.startsWith('base:') || ['migration:export', 'verify:e2e', 'verify:ops'].includes(alias)),
      'producer or institution runtime aliases cannot imply inherited applicability');
    check(read('.githooks/pre-push') === `#!/bin/sh\nset -e\n${ARTIFACT_COMMAND}\n`, 'generated pre-push must execute product verification');
    check(existsSync(join(root, 'REUSABLE_VERIFICATION.md')), 'generated verification boundary documentation is required');
  } catch (error) { errors.push(`entrypoint inspection failed: ${error.message}`); }
  return errors;
}
