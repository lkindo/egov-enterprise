import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { generateMigrationProduct } from './generate-migration-product.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('standalone migration export retains independent verification and clears inherited environment approval', (t) => {
  const base = resolve(root, 'build/migration-product');
  const outputRoot = resolve(base, `contract-${randomBytes(8).toString('hex')}`);
  t.after(() => {
    const back = relative(base, outputRoot);
    assert.ok(back.startsWith('contract-') && !back.includes(sep) && !isAbsolute(back));
    rmSync(outputRoot, { recursive: true, force: true });
  });
  const result = generateMigrationProduct({ sourceRoot: root, outputRoot });
  assert.ok(result.scope.fileCount > 200);
  for (const absent of ['frontend', 'foundation', 'business-app', 'business-core', 'api-server', 'node_modules',
    'config/ui-url-state-census.json', 'config/modules/presets.json', '.github/workflows/ci.yml',
    'scripts/adoption-execute-products.test.mjs']) assert.equal(existsSync(resolve(outputRoot, absent)), false, absent);
  assert.equal(readFileSync(resolve(outputRoot, 'settings.gradle'), 'utf8'), "rootProject.name = 'egov-migration-tool'\ninclude 'migration-tool'\n");
  const approval = JSON.parse(readFileSync(resolve(outputRoot, 'config/governance/migration-adoption-review.json'), 'utf8'));
  assert.equal(approval.status, 'pending');
  assert.equal(approval.owner, null);
  assert.deepEqual(approval.evidence, []);
  const helper = resolve(outputRoot, 'scripts/reusable-layout.mjs');
  assert.equal(readFileSync(helper, 'utf8'), readFileSync(resolve(root, 'scripts/reusable-layout.mjs'), 'utf8'));
  // 줄바꿈은 검사 대상이 아니다 — 자매 계약(migration-verification-contract)과 같은 사유로 정규화한다.
  const workflow = readFileSync(resolve(outputRoot, '.github/workflows/migration-tool.yml'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(workflow, /^  push:\n    branches: \[main, master\]$/m);
  assert.match(workflow, /^  pull_request:$/m);
  assert.match(workflow, /^          cache-read-only: false$/m,
    'the exported repository has one independent cache writer');
  assert.doesNotMatch(workflow, /^    paths(?:-ignore)?:/m,
    'standalone product must validate every changed runtime helper without producer CI');
  // Resolve the complete module graph before injecting individual missing helpers.
  // Importing these entrypoints must not run verification, scanning or publication.
  // verify rejects an unknown scope after resolving imports, before any check can run.
  const importScript = (entrypoint) => `${entrypoint === 'verify.mjs' ? "process.argv[2] = 'import-check-only'; " : ''}await import('./scripts/${entrypoint}')`;
  for (const entrypoint of ['adoption-execute.mjs', 'governance-review.mjs', 'verify.mjs']) {
    const imported = spawnSync(process.execPath,
      ['--input-type=module', '--eval', importScript(entrypoint)],
      { cwd: outputRoot, encoding: 'utf8' });
    assert.equal(imported.status, entrypoint === 'verify.mjs' ? 2 : 0, `${entrypoint} must import independently: ${imported.stderr}`);
    assert.equal(imported.stdout, '');
    if (entrypoint === 'verify.mjs') assert.match(imported.stderr, /알 수 없는 범위 'import-check-only'/u);
    else assert.equal(imported.stderr, '');
  }
  // A nested `node --test` inherits NODE_TEST_CONTEXT from this parent runner.
  // Clear it so the exported contracts really run instead of recursively skipping.
  const childEnv = { ...process.env };
  delete childEnv.NODE_TEST_CONTEXT;
  for (const args of [
    ['--test', 'scripts/migration-verification-contract.test.mjs', 'scripts/adoption-execute.test.mjs'],
    ['scripts/governance-review.mjs', '--product', 'migration-tool', '--mode', 'report'],
  ]) {
    const child = spawnSync(process.execPath, args, { cwd: outputRoot, encoding: 'utf8', env: childEnv });
    assert.equal(child.status, 0, child.stdout + child.stderr);
    if (args[0] === '--test') {
      assert.match(child.stdout, /^# tests [1-9]\d*$/m, 'exported contracts must execute a nonempty test population');
      assert.doesNotMatch(child.stdout + child.stderr, /recursive.*(?:skip|run)|skipping.*recursive/iu);
      t.diagnostic(`Exported migration/adoption contracts: ${child.stdout.match(/^# tests \d+$/m)[0]}`);
    }
  }
  const pending = spawnSync(process.execPath, ['scripts/governance-review.mjs', '--product', 'migration-tool',
    '--mode', 'adoption', '--environment', 'fixture'], { cwd: outputRoot, encoding: 'utf8' });
  assert.equal(pending.status, 1);
  // A missing transitive helper must break the actual isolated entrypoint, not be
  // silently resolved from the producer checkout or an installed package.
  for (const [dependency, entrypoint] of [
    ['reusable-layout.mjs', 'adoption-execute.mjs'],
    ['release-images.mjs', 'adoption-execute.mjs'],
    ['ci-change-scope.mjs', 'governance-review.mjs'],
    ['composition-profiles.mjs', 'adoption-execute.mjs'],
    ['read-regular-file.mjs', 'governance-review.mjs'],
    ['verification-record.mjs', 'verify.mjs'],
    ['migration-test-shard.mjs', 'migration-verification-contract.test.mjs'],
    ['adoption-execute-fixtures.mjs', 'adoption-execute.test.mjs'],
  ]) {
    const missingHelper = resolve(outputRoot, 'scripts', dependency);
    const helperContent = readFileSync(missingHelper);
    try {
      rmSync(missingHelper);
      const missingDependency = spawnSync(process.execPath,
        ['--input-type=module', '--eval', importScript(entrypoint)],
        { cwd: outputRoot, encoding: 'utf8' });
      assert.notEqual(missingDependency.status, 0);
      assert.match(missingDependency.stderr, /ERR_MODULE_NOT_FOUND/);
      assert.ok(missingDependency.stderr.includes(dependency));
    } finally { writeFileSync(missingHelper, helperContent); }
  }
  assert.throws(() => generateMigrationProduct({ sourceRoot: root, outputRoot }), /new child directory/);
});

test('export cannot target the repository, a parent directory or a sibling product', () => {
  for (const outputRoot of [root, resolve(root, '..'), resolve(root, 'build'), resolve(root, 'build/reusable-base')]) {
    assert.throws(() => generateMigrationProduct({ sourceRoot: root, outputRoot }), /new child directory/);
  }
});
