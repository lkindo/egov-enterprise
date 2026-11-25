import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { OPERATIONAL_CONTRACT_CATALOGS } from './operational-contracts-runner.mjs';
import {
  discoverOperationalContractFiles,
  isComposerOperationalContract,
  partitionOperationalContracts,
} from './run-operational-contracts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function partitionErrors({ all, core, composer }) {
  const errors = [];
  const coreSet = new Set(core);
  const composerSet = new Set(composer);
  if (core.length === 0) errors.push('core partition must not be empty');
  if (composer.length === 0) errors.push('composer partition must not be empty');
  if (coreSet.size !== core.length) errors.push('core partition contains duplicate files');
  if (composerSet.size !== composer.length) errors.push('composer partition contains duplicate files');
  for (const file of core) {
    if (composerSet.has(file)) errors.push(`overlap between core and composer: ${file}`);
  }
  const union = [...core, ...composer].sort();
  const sortedAll = [...all].sort();
  if (JSON.stringify(union) !== JSON.stringify(sortedAll)) {
    const missing = sortedAll.filter(file => !coreSet.has(file) && !composerSet.has(file));
    const extra = union.filter(file => !sortedAll.includes(file));
    if (missing.length) errors.push(`missing from partition: ${missing.join(', ')}`);
    if (extra.length) errors.push(`extra in partition: ${extra.join(', ')}`);
  }
  return errors;
}

test('core and composer partitions form an exact disjoint cover of all operational contracts', () => {
  const partitioned = partitionOperationalContracts(ROOT);
  assert.deepEqual(partitionErrors(partitioned), []);

  // partitionErrors 계약이 dropped/overlap 입력을 즉시 red 로 거부하는지 확인한다(실제 분류 정확도는 아래 대표 그룹 단언이 검증).
  const droppedCore = { ...partitioned, core: partitioned.core.slice(1) };
  assert.ok(partitionErrors(droppedCore).some(msg => msg.includes('missing from partition')));
  const overlap = { ...partitioned, core: [...partitioned.core, partitioned.composer[0]] };
  assert.ok(partitionErrors(overlap).some(msg => msg.includes('overlap between core and composer')));
});

test('catalog roots match GATESET-NODE-OPERATIONAL-CONTRACTS in config/governance/gates.json', () => {
  const gates = JSON.parse(readFileSync(join(ROOT, 'config/governance/gates.json'), 'utf8'));
  const set = gates.gateSets.find(({ id }) => id === 'GATESET-NODE-OPERATIONAL-CONTRACTS');
  assert.ok(set, 'GATESET-NODE-OPERATIONAL-CONTRACTS must exist');
  const registryCatalogs = set.selector.catalogs.map(({ root, suffixes }) => ({ root, suffix: suffixes[0] }));
  assert.deepEqual(
    OPERATIONAL_CONTRACT_CATALOGS.map(({ root, suffix }) => ({ root, suffix })),
    registryCatalogs,
  );
  assert.deepEqual(
    discoverOperationalContractFiles(ROOT),
    partitionOperationalContracts(ROOT).all,
  );
});

test('representative security, CI, API, migration and composer tests land in the expected group', () => {
  const { core, composer } = partitionOperationalContracts(ROOT);
  const coreSet = new Set(core);
  const composerSet = new Set(composer);

  for (const expectedCore of [
    'scripts/required-checks-contract.test.mjs',
    'scripts/sast-policy.test.mjs',
    'scripts/governance-gates-contract.test.mjs',
    'scripts/run-operational-contracts.test.mjs',
    'scripts/reusable-source-docs.test.mjs',
    'scripts/reusable-reference-data.test.mjs',
    'scripts/domain-scaffold-authorization.test.mjs',
    'scripts/retired-pack-vocabulary.test.mjs',
    '.agent/scripts/db-bridge.test.js',
    'tools/migration-workspace/engine.test.mjs',
    'tools/requirements-workspace/server.test.mjs',
  ]) {
    assert.ok(coreSet.has(expectedCore), `expected in core: ${expectedCore}`);
    assert.equal(isComposerOperationalContract(expectedCore), false, expectedCore);
  }

  for (const expectedComposer of [
    'scripts/project-composer.test.mjs',
    'scripts/reusable-governance-projection.test.mjs',
    'scripts/frontend-reachability-census.test.mjs',
    'scripts/composer-modules.test.mjs',
    'scripts/slot-registry.test.mjs',
  ]) {
    assert.ok(composerSet.has(expectedComposer), `expected in composer: ${expectedComposer}`);
    assert.equal(isComposerOperationalContract(expectedComposer), true, expectedComposer);
  }
});

test('CLI --list prints the selected group and invalid --group fails closed with exit 2', () => {
  const { core } = partitionOperationalContracts(ROOT);
  const listed = spawnSync(process.execPath, ['scripts/run-operational-contracts.mjs', '--group', 'core', '--list'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(listed.stdout.trim().split(/\r?\n/), core);

  const invalid = spawnSync(process.execPath, ['scripts/run-operational-contracts.mjs', '--group', 'unknown'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(invalid.status, 2);
});
