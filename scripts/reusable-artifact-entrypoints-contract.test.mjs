import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { applySingleModuleLayout } from './reusable-single-module.mjs';
import { installSingleModuleRuntime } from './reusable-layout-runtime.mjs';
import {
  ARTIFACT_COMMAND, CURRENT_ARTIFACT_COMMAND, PRODUCT_CI_ACTIONS, VERIFICATION_HISTORY,
  parseWorkflowJobs, reusableArtifactEntrypoints, upstreamActionPins, validateReusableArtifactEntrypoints,
} from './reusable-artifact-entrypoints-contract.mjs';
import { EXCLUDED_ARTIFACT_SKILLS, MIGRATION_ASSET_LEDGER, pruneMigrationTools, pruneProducerTools, pruneRequirementsStudio,
  readMigrationAssetLedger, readProducerAssetLedger, readRequirementsAssetLedger,
  stripMigrationBaselineArchivePath, stripMigrationBaselineCoreRequired, stripMigrationBuildReferences,
  validateAlwaysRemovedAssetsAbsent } from './reusable-product-assets.mjs';
import { presetIds } from './composition-profiles.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isArtifact = existsSync(join(ROOT, 'reusable-base-lock.json'));
const producer = isArtifact ? null : {
  installReusableVerification: (await import('./generate-reusable-base-source.mjs')).installReusableVerification,
  reviewedActionPin: (await import('./required-checks-contract.mjs')).reviewedActionPin,
};
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
    'api-server/Dockerfile', 'frontend/scripts/ui-quality-baseline-core.mjs', 'scripts/ui-quality-baseline-build.mjs',
    ...['foundation', 'business-core', 'business-app', 'api-server'].map(module => `${module}/build.gradle`)].filter(path => !isArtifact || existsSync(join(ROOT, path)))) copy(path);
  if (isArtifact) {
    for (const path of ['reusable-base-lock.json', VERIFICATION_HISTORY, 'REUSABLE_VERIFICATION.md']) copy(path);
  } else {
    write(root, 'reusable-base-lock.json', JSON.stringify({ profile, layout, migrationTool: false, sourceCommit: '1'.repeat(40) }));
    producer.installReusableVerification(root, layout);
    const pkg = json(root, 'package.json');
    delete pkg.scripts['verify:migration'];
    write(root, 'package.json', `${JSON.stringify(pkg, null, 2)}\n`);
    if (layout === 'single-module') {
      applySingleModuleLayout(root, { migration: false });
      installSingleModuleRuntime(root, { migration: false });
    }
    stripMigrationBuildReferences(root, layout);
  }
  return root;
}

const upstreamGradleSetupPin = () => {
  const upstreamCi = isArtifact ? read(ROOT, `${VERIFICATION_HISTORY}/.github/workflows/ci.yml`) : read(ROOT, '.github/workflows/ci.yml');
  const pin = upstreamActionPins(upstreamCi)['gradle/actions/setup-gradle'];
  if (!isArtifact) assert.equal(pin, producer.reviewedActionPin('gradle/actions/setup-gradle'));
  return pin;
};

test('producer fixtures and the actual generated product preserve a distinct non-recursive verification contract', t => {
  const profiles = isArtifact ? [json(ROOT, 'reusable-base-lock.json').profile] : presetIds();
  if (isArtifact) assert.deepEqual(validateReusableArtifactEntrypoints(ROOT), []);
  for (const profile of profiles) {
    const root = fixture(t, profile);
    assert.deepEqual(validateReusableArtifactEntrypoints(root), []);
    const jobs = parseWorkflowJobs(read(root, '.github/workflows/ci.yml'));
    assert.deepEqual([...jobs.keys()], ['artifact-verification']);
    const job = jobs.get('artifact-verification');
    assert.match(job, /^        run: node scripts\/adopter-project\.mjs verify$/m);
    assert.match(read(root, '.githooks/pre-push'), /^node scripts\/adopter-project\.mjs verify$/m);
    assert.doesNotMatch(job, /verify-reusable-base|matrix\.profile|deploy\.sh|--execute/);
    assert.match(job, /gitleaks detect --source \. --no-git/);
    assert.match(job, /gitleaks detect --source \. --no-banner/);
    assert.match(job, /github\.event\.pull_request\.base\.sha/);
    assert.match(job, /github\.event\.before/);
    assert.ok(job.includes(`uses: ${upstreamGradleSetupPin()}\n        with:\n          cache-provider: basic\n          cache-read-only: false\n`),
      'product CI must use the reviewed Gradle setup pin with the basic provider as its single cache writer');
    assert.equal(json(root, '.github/required-checks.json').profile, profile);
    assert.equal(json(root, '.github/required-checks.json').remoteApplied, false);
    assert.ok(json(root, `${VERIFICATION_HISTORY}/index.json`).files.some(entry => entry.source === '.github/workflows/release.yml'));
  }
});

// Dependabot 은 워크플로 파일만 고친다. 그래서 템플릿은 핀을 다시 적지 않고 원본 ci.yml 에서 읽는다(upstreamActionPins).
// 템플릿이 쓰는 액션마다 원본 ci.yml 이 쓰는 핀이 하나뿐이고 그 핀이 템플릿과 같아야 한다 — 핀을 템플릿에 다시 적으면
// 이 대조가 범프 때 붉다. 생성물 안에서는 원본 ci.yml 대신 생성 때 남긴 검증 이력 사본과 대조한다.
// ci.yml 은 핀 뒤에 '# v7.1.0' 같은 판 주석을 단다. 템플릿은 주석 없이 핀만 쓴다.
const ACTION_PIN = /^[ \t]*(?:-[ \t]+)?uses:[ \t]*([\w.-]+\/[\w./-]+)@([0-9a-f]{40})(?:[ \t]+#[^\n]*)?[ \t]*$/gm;
function actionPins(workflow) {
  const pins = new Map();
  for (const [, action, sha] of workflow.matchAll(ACTION_PIN)) {
    if (!pins.has(action)) pins.set(action, new Set());
    pins.get(action).add(sha);
  }
  return pins;
}
function templatePinMismatches(template, upstreamCi) {
  const upstream = actionPins(upstreamCi);
  const errors = [];
  for (const [action, shas] of actionPins(template)) {
    const want = [...(upstream.get(action) ?? [])].sort();
    const have = [...shas].sort();
    if (want.length !== 1 || have.length !== 1 || want[0] !== have[0]) {
      errors.push(`template ${action}@${have.join(',')} differs from ci.yml ${action}@${want.join(',') || '(none)'}`);
    }
  }
  return errors;
}

test('the product CI template pins every action at the same SHA the upstream ci.yml uses', t => {
  const root = fixture(t);
  const template = read(root, '.github/workflows/ci.yml');
  const upstreamCi = isArtifact ? read(ROOT, `${VERIFICATION_HISTORY}/.github/workflows/ci.yml`) : read(ROOT, '.github/workflows/ci.yml');
  // 정규식이 템플릿의 핀을 하나도 못 읽으면 이 시험은 빈 대조로 통과한다. 읽은 액션 목록을 고정한다.
  assert.deepEqual([...actionPins(template).keys()].sort(), ['actions/checkout', 'actions/setup-java', 'actions/setup-node',
    'actions/upload-artifact', 'gradle/actions/setup-gradle', 'pnpm/action-setup']);
  assert.deepEqual(templatePinMismatches(template, upstreamCi), []);
  // 원본이 핀을 올렸는데 템플릿이 따라가지 않은 상태, 원본에 같은 액션의 핀이 둘인 상태, 원본에서 액션이 사라진 상태는 붉다.
  const [, setupNode] = template.match(/uses: actions\/setup-node@([0-9a-f]{40})/);
  const bumped = upstreamCi.replaceAll(`actions/setup-node@${setupNode}`, `actions/setup-node@${'a'.repeat(40)}`);
  assert.notEqual(bumped, upstreamCi);
  assert.deepEqual(templatePinMismatches(template, bumped), [`template actions/setup-node@${setupNode} differs from ci.yml actions/setup-node@${'a'.repeat(40)}`]);
  const split = `${upstreamCi}\n      - uses: actions/setup-node@${'b'.repeat(40)}\n`;
  assert.deepEqual(templatePinMismatches(template, split), [`template actions/setup-node@${setupNode} differs from ci.yml actions/setup-node@${[setupNode, 'b'.repeat(40)].sort().join(',')}`]);
  const gone = upstreamCi.replace(/^.*uses: pnpm\/action-setup@.*$/gm, '');
  assert.match(templatePinMismatches(template, gone).join('\n'), /^template pnpm\/action-setup@[0-9a-f]{40} differs from ci\.yml pnpm\/action-setup@\(none\)$/);
  // 생성기는 핀을 원본 ci.yml 에서 읽는다 — 워크플로만 올린 범프가 워크플로 밖 수정 없이 제품 CI 에 이른다.
  const profile = json(root, 'reusable-base-lock.json').profile;
  const scan = json(root, `${VERIFICATION_HISTORY}/.github/required-checks.json`).criticalSteps
    .find(step => step.name === 'Run gitleaks (working tree + incremental)').run;
  assert.equal(reusableArtifactEntrypoints(profile, scan, upstreamCi).workflow, template);
  assert.deepEqual(Object.keys(upstreamActionPins(upstreamCi)), [...PRODUCT_CI_ACTIONS]);
  const followed = reusableArtifactEntrypoints(profile, scan, bumped).workflow;
  assert.ok(followed.includes(`      - uses: actions/setup-node@${'a'.repeat(40)}\n`));
  assert.deepEqual(templatePinMismatches(followed, bumped), []);
  // 원본이 태그로 핀하거나, 한 액션을 두 커밋으로 쓰거나, 액션이 사라지면 제품 CI 를 만들지 않는다.
  const tagged = upstreamCi.replaceAll(`actions/setup-node@${setupNode}`, 'actions/setup-node@v4');
  for (const [broken, action] of [[tagged, 'actions/setup-node'], [split, 'actions/setup-node'], [gone, 'pnpm/action-setup']]) {
    assert.notEqual(broken, upstreamCi);
    assert.throws(() => reusableArtifactEntrypoints(profile, scan, broken),
      new RegExp(`upstream ci\\.yml must pin ${action.replace('/', '\\/')} to exactly one 40-character commit`));
  }
  assert.throws(() => reusableArtifactEntrypoints(profile, scan), /upstream ci\.yml is required/);
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
    value => value.replace(`run: ${CURRENT_ARTIFACT_COMMAND}`, `run: ${ARTIFACT_COMMAND} --scope contracts`),
    value => value.replace(`run: ${CURRENT_ARTIFACT_COMMAND}`, 'run: node scripts/verify-reusable-base.mjs --profile demo'),
    value => value.replace(`run: ${CURRENT_ARTIFACT_COMMAND}`, `if: false\n        run: ${CURRENT_ARTIFACT_COMMAND}`),
    value => value.replace('    steps:', '    if: false\n    steps:'),
    value => value.replace('    steps:', '    defaults:\n      run:\n        shell: echo {0}\n    steps:'),
    value => value.replace(`run: ${CURRENT_ARTIFACT_COMMAND}`, 'run: exit 0'),
    value => value.replace('      - name: Scan working tree', '      - if: false\n        name: Scan working tree'),
    value => value.replace('--exit-code 1', '--exit-code 0'),
    value => value.replace('VERSION=8.28.0', 'VERSION=latest'),
    value => value.replace('contents: read', 'contents: write'),
    value => value.replace('          fetch-depth: 0', '          ref: main\n          fetch-depth: 0'),
    value => value.replace('  pull_request:', "  pull_request:\n    paths: ['docs/**']"),
    value => value.replace('  workflow_dispatch:', "  schedule:\n    - cron: '* * * * *'\n  workflow_dispatch:"),
    value => value.replace('if-no-files-found: error', 'if-no-files-found: warn'),
    value => value.replace(upstreamGradleSetupPin(), 'gradle/actions/setup-gradle@d9c87d481d55275bb5441eef3fe0e46805f9ef70'),
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
  const expected = { verify: '', 'verify:artifact': '', 'verify:full': '', 'verify:adopter': ' --scope adopter', 'verify:fast': '',
    'verify:docs': ' --scope contracts', 'verify:be': ' --scope backend', 'verify:fe': ' --scope frontend',
    'test:operational-contracts': ' --scope contracts' };
  for (const [alias, suffix] of Object.entries(expected)) {
    assert.equal(pkg.scripts[alias], `node scripts/verify-reusable-artifact.mjs${suffix}`);
    const changed = structuredClone(pkg);
    changed.scripts[alias] = 'node scripts/verify.mjs full';
    write(root, path, JSON.stringify(changed));
    assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes(`incorrect generated alias: ${alias}`)));
  }
  assert.equal(pkg.scripts['verify:push'], CURRENT_ARTIFACT_COMMAND);
  write(root, path, JSON.stringify({ ...pkg, scripts: { ...pkg.scripts, 'verify:push': `${ARTIFACT_COMMAND} --scope contracts` } }));
  assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('incorrect generated alias: verify:push')));
  for (const alias of ['verify:e2e', 'verify:ops', 'base:verify', 'project:ui', 'migration:export', 'verify:migration']) {
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
  write(root, '.githooks/pre-push', `#!/bin/sh\nset -e\n${ARTIFACT_COMMAND}\n`);
  assert.ok(validateReusableArtifactEntrypoints(root).some(error => error.includes('pre-push')), 'strict original verification cannot replace the current-project push guard');
});

test('missing upstream inputs fail before the product is represented as a valid projection', t => {
  if (isArtifact) return;
  const root = fixture(t);
  const original = read(root, `${VERIFICATION_HISTORY}/index.json`);
  assert.throws(() => producer.installReusableVerification(root), /already projected/);
  assert.equal(read(root, `${VERIFICATION_HISTORY}/index.json`), original);
});

test('producer tools, requirements studio, offline migration tool, their contracts, aliases and repository-only skills are absent from generated products', t => {
  if (isArtifact) {
    // T1: 생성 프로젝트에는 생산자 도구·요구사항 스튜디오·오프라인 이관 도구·저장소 전용 스킬·원본 시험과 별칭이 남지 않는다.
    assert.deepEqual(validateAlwaysRemovedAssetsAbsent(ROOT), []);
    const archivedPkg = json(ROOT, `${VERIFICATION_HISTORY}/package.json`);
    const activePkg = json(ROOT, 'package.json');
    for (const alias of ['test:operational-contracts:core', 'test:governance-gates', 'project:ui', 'requirements:ui', 'migration:export', 'verify:migration', 'migration:ui']) {
      assert.ok(Object.hasOwn(archivedPkg.scripts ?? {}, alias), `upstream verification history must keep ${alias}`);
      assert.equal(Object.hasOwn(activePkg.scripts ?? {}, alias), false, `active package.json must omit ${alias}`);
    }
    return;
  }
  const producerLedger = readProducerAssetLedger(ROOT);
  const requirementsLedger = readRequirementsAssetLedger(ROOT);
  const migrationLedger = readMigrationAssetLedger(ROOT);
  const rootScripts = json(ROOT, 'package.json').scripts;
  for (const ledger of [producerLedger, requirementsLedger, migrationLedger]) {
    for (const asset of ledger.assets) assert.ok(existsSync(join(ROOT, asset)), `missing asset: ${asset}`);
    for (const gate of ledger.gates) assert.ok(existsSync(join(ROOT, gate.file)), `missing gate: ${gate.file}`);
    for (const alias of ledger.aliases) assert.ok(Object.hasOwn(rootScripts, alias), `missing alias: ${alias}`);
  }
  for (const skill of EXCLUDED_ARTIFACT_SKILLS) {
    assert.ok(existsSync(join(ROOT, '.agent/skills', skill, 'SKILL.md')), `missing skill: ${skill}`);
  }

  // 합성 생성 트리에서 생산자·요구사항·이관 도구 제거 후 검증 통과 + 재유입 H5 Red 증명
  const root = mkdtempSync(join(resolve(tmpdir()), 'egov-product-prune-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const synthProducer = { assets: ['sample-tools/composer', 'sample-scripts/composer-server.mjs'], aliases: ['project:ui'],
    gates: [{ file: 'sample-scripts/composer.test.mjs', reason: 'r', coveredBy: 'c' }] };
  const synthReq = { assets: ['sample-tools/requirements'], aliases: ['requirements:ui'],
    gates: [{ file: 'sample-tools/requirements/server.test.mjs', reason: 'r', coveredBy: 'c' }] };
  const synthMigration = { assets: ['sample-migration-tool', 'sample-db-columns.json'], aliases: ['verify:migration'],
    gates: [{ file: 'sample-migration-tool/IsolationTest.java', reason: 'r', coveredBy: 'c' }] };
  write(root, 'config/governance/producer-removed-assets.json', JSON.stringify(synthProducer));
  write(root, 'config/governance/requirements-removed-assets.json', JSON.stringify(synthReq));
  write(root, MIGRATION_ASSET_LEDGER, JSON.stringify(synthMigration));
  for (const file of ['sample-tools/composer/app.js', 'sample-scripts/composer-server.mjs', 'sample-scripts/composer.test.mjs',
    'sample-tools/requirements/server.mjs', 'sample-tools/requirements/server.test.mjs',
    'sample-migration-tool/Main.java', 'sample-migration-tool/IsolationTest.java', 'sample-db-columns.json', 'sample-scripts/kept.mjs']) write(root, file, 'x\n');
  write(root, 'package.json', JSON.stringify({ scripts: { 'project:ui': 'p', 'requirements:ui': 'r', 'verify:migration': 'm', verify: 'v' } }));

  assert.deepEqual(pruneProducerTools(root).files, ['sample-scripts/composer.test.mjs']);
  assert.deepEqual(pruneRequirementsStudio(root).files, ['sample-tools/requirements/server.test.mjs']);
  assert.deepEqual(pruneMigrationTools(root).files, ['sample-migration-tool/IsolationTest.java']);
  assert.ok(existsSync(join(root, 'sample-scripts/kept.mjs')), 'adopter runtime survives pruning');
  assert.deepEqual(json(root, 'package.json').scripts, { verify: 'v' });
  assert.deepEqual(validateAlwaysRemovedAssetsAbsent(root), []);

  // H5 Red: 제외 자산·별칭·스킬 중 하나라도 되살아나면 부재 계약이 즉시 실패한다.
  write(root, 'sample-tools/requirements/server.mjs', 'x\n');
  assert.ok(validateAlwaysRemovedAssetsAbsent(root).some(msg => msg.includes('sample-tools/requirements')));
  rmSync(join(root, 'sample-tools/requirements'), { recursive: true, force: true });

  write(root, 'sample-db-columns.json', '[]\n');
  assert.ok(validateAlwaysRemovedAssetsAbsent(root).some(msg => msg.includes('sample-db-columns.json')));
  rmSync(join(root, 'sample-db-columns.json'));

  write(root, 'package.json', JSON.stringify({ scripts: { verify: 'v', 'project:ui': 'leaked' } }));
  assert.ok(validateAlwaysRemovedAssetsAbsent(root).some(msg => msg.includes('project:ui')));
  write(root, 'package.json', JSON.stringify({ scripts: { verify: 'v', 'verify:migration': 'leaked' } }));
  assert.ok(validateAlwaysRemovedAssetsAbsent(root).some(msg => msg.includes('verify:migration')));
  write(root, 'package.json', JSON.stringify({ scripts: { verify: 'v' } }));

  write(root, '.agent/skills/requirements-intake/SKILL.md', 'leaked\n');
  assert.ok(validateAlwaysRemovedAssetsAbsent(root).some(msg => msg.includes('.agent/skills/requirements-intake')));

  // P1 #3 회귀 방지: 별칭 가지치기 뒤 installReusableVerification 호출 시 비활성 검증 이력에는 원본 package.json 을 보존한다.
  const historyRoot = mkdtempSync(join(resolve(tmpdir()), 'egov-history-preserve-'));
  t.after(() => rmSync(historyRoot, { recursive: true, force: true }));
  const copyHistoryInput = rel => {
    const src = join(ROOT, rel);
    if (existsSync(src) && (() => { try { readdirSync(src); return true; } catch { return false; } })()) {
      for (const name of readdirSync(src)) copyHistoryInput(`${rel}/${name}`);
    } else {
      mkdirSync(dirname(join(historyRoot, rel)), { recursive: true });
      copyFileSync(src, join(historyRoot, rel));
    }
  };
  for (const rel of ['package.json', 'Makefile', '.githooks/pre-push', '.github/required-checks.json', '.github/workflows',
    'build.gradle', 'settings.gradle', 'scripts/dev.mjs', 'scripts/verify.mjs',
    'api-server/Dockerfile', 'frontend/scripts/ui-quality-baseline-core.mjs', 'scripts/ui-quality-baseline-build.mjs',
    ...['foundation', 'business-core', 'business-app', 'api-server'].map(m => `${m}/build.gradle`)]) {
    copyHistoryInput(rel);
  }
  const upstreamPackageJson = readFileSync(join(historyRoot, 'package.json'), 'utf8');
  const prunedPkg = json(historyRoot, 'package.json');
  const preservedAliases = ['test:operational-contracts:core', 'test:governance-gates', 'project:ui', 'requirements:ui', 'migration:export', 'verify:migration', 'migration:ui'];
  for (const alias of preservedAliases) delete prunedPkg.scripts[alias];
  write(historyRoot, 'package.json', `${JSON.stringify(prunedPkg, null, 2)}\n`);
  write(historyRoot, 'reusable-base-lock.json', JSON.stringify({ profile: 'core', layout: 'multi-module', migrationTool: false, sourceCommit: '1'.repeat(40) }));
  producer.installReusableVerification(historyRoot, 'multi-module', { upstreamPackageJson });
  stripMigrationBuildReferences(historyRoot, 'multi-module');
  assert.deepEqual(validateReusableArtifactEntrypoints(historyRoot), []);
  const activeAfter = json(historyRoot, 'package.json').scripts;
  const archivedText = read(historyRoot, `${VERIFICATION_HISTORY}/package.json`);
  const archivedScripts = JSON.parse(archivedText).scripts;
  assert.equal(archivedText, upstreamPackageJson.replace(/\r\n/g, '\n'));
  for (const alias of preservedAliases) {
    assert.equal(Object.hasOwn(activeAfter, alias), false, `active package.json must omit ${alias}`);
    assert.ok(Object.hasOwn(archivedScripts, alias), `archived package.json must preserve ${alias}`);
  }

  // Codex P1 #1: 생성 프로젝트의 UI 기준선 필수 입력·Docker 아카이브 목록에서만 migration-tool/build.gradle 을 제거하고 원본 계약을 지킨다.
  const strippedCore = stripMigrationBaselineCoreRequired(read(ROOT, 'frontend/scripts/ui-quality-baseline-core.mjs'));
  assert.match(strippedCore, /export const PRODUCTION_BUILD_INPUT_PATHS = Object\.freeze\(\[[\s\S]*?'migration-tool\/build\.gradle'/);
  assert.doesNotMatch(strippedCore, /export const REQUIRED_PRODUCTION_BUILD_INPUT_FILES = Object\.freeze\(\[[\s\S]*?'migration-tool\/build\.gradle'[\s\S]*?\]\);/);
  assert.throws(() => stripMigrationBaselineCoreRequired('export const X = 1;\n'), /REQUIRED_PRODUCTION_BUILD_INPUT_FILES/);
  const strippedBuild = stripMigrationBaselineArchivePath(read(ROOT, 'scripts/ui-quality-baseline-build.mjs'));
  assert.doesNotMatch(strippedBuild, /const API_ARCHIVE_PATHS = Object\.freeze\(\[[\s\S]*?'migration-tool\/build\.gradle'[\s\S]*?\]\);/);
  assert.throws(() => stripMigrationBaselineArchivePath('const OTHER = [];\n'), /API_ARCHIVE_PATHS/);

  // Codex P1 #3: migrationTool·offline-migration-tool 규칙이 모두 없는 Phase 4 이전 PostgreSQL lock 은 verify:migration 유지를 허용한다.
  write(historyRoot, 'reusable-base-lock.json', JSON.stringify({ profile: 'core', layout: 'multi-module', sourceCommit: '1'.repeat(40) }));
  write(historyRoot, 'migration-tool/build.gradle', 'dependencies {}\n');
  write(historyRoot, 'settings.gradle', read(ROOT, 'settings.gradle'));
  write(historyRoot, 'package.json', `${JSON.stringify({ ...json(historyRoot, 'package.json'),
    scripts: { ...activeAfter, 'verify:migration': 'node scripts/reusable-layout-runtime.mjs --verify-migration' } }, null, 2)}\n`);
  assert.deepEqual(validateReusableArtifactEntrypoints(historyRoot), []);
});
