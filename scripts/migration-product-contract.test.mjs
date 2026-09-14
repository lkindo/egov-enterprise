import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
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
    'config/ui-url-state-census.json', '.github/workflows/ci.yml']) assert.equal(existsSync(resolve(outputRoot, absent)), false, absent);
  assert.equal(readFileSync(resolve(outputRoot, 'settings.gradle'), 'utf8'), "rootProject.name = 'egov-migration-tool'\ninclude 'migration-tool'\n");
  const approval = JSON.parse(readFileSync(resolve(outputRoot, 'config/governance/migration-adoption-review.json'), 'utf8'));
  assert.equal(approval.status, 'pending');
  assert.equal(approval.owner, null);
  assert.deepEqual(approval.evidence, []);
  for (const args of [
    ['--test', 'scripts/migration-verification-contract.test.mjs', 'scripts/adoption-execute.test.mjs'],
    ['scripts/governance-review.mjs', '--product', 'migration-tool', '--mode', 'report'],
  ]) {
    const child = spawnSync(process.execPath, args, { cwd: outputRoot, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stdout + child.stderr);
  }
  const pending = spawnSync(process.execPath, ['scripts/governance-review.mjs', '--product', 'migration-tool',
    '--mode', 'adoption', '--environment', 'fixture'], { cwd: outputRoot, encoding: 'utf8' });
  assert.equal(pending.status, 1);
  assert.throws(() => generateMigrationProduct({ sourceRoot: root, outputRoot }), /new child directory/);
});

test('export cannot target the repository, a parent directory or a sibling product', () => {
  for (const outputRoot of [root, resolve(root, '..'), resolve(root, 'build'), resolve(root, 'build/reusable-base')]) {
    assert.throws(() => generateMigrationProduct({ sourceRoot: root, outputRoot }), /new child directory/);
  }
});
