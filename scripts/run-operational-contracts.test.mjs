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
  isRequirementsOperationalContract,
  partitionOperationalContracts,
} from './run-operational-contracts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function partitionErrors({ all, core, composer, requirements }) {
  const errors = [];
  const groups = { core, composer, requirements };
  const sets = Object.fromEntries(Object.entries(groups).map(([name, items]) => [name, new Set(items)]));
  for (const [name, items] of Object.entries(groups)) {
    if (items.length === 0) errors.push(`${name} partition must not be empty`);
    if (sets[name].size !== items.length) errors.push(`${name} partition contains duplicate files`);
  }
  const names = Object.keys(groups);
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      const left = names[i];
      const right = names[j];
      for (const file of groups[left]) {
        if (sets[right].has(file)) errors.push(`overlap between ${left} and ${right}: ${file}`);
      }
    }
  }
  const union = [...core, ...composer, ...requirements].sort();
  const sortedAll = [...all].sort();
  if (JSON.stringify(union) !== JSON.stringify(sortedAll)) {
    const missing = sortedAll.filter(file => !sets.core.has(file) && !sets.composer.has(file) && !sets.requirements.has(file));
    const extra = union.filter(file => !sortedAll.includes(file));
    if (missing.length) errors.push(`missing from partition: ${missing.join(', ')}`);
    if (extra.length) errors.push(`extra in partition: ${extra.join(', ')}`);
  }
  return errors;
}

test('core, composer, and requirements partitions form an exact disjoint cover of all operational contracts', () => {
  const partitioned = partitionOperationalContracts(ROOT);
  assert.deepEqual(partitionErrors(partitioned), []);

  // partitionErrors 계약이 dropped/empty/overlap 입력을 즉시 red 로 거부하는지 확인한다(실제 분류 정확도는 아래 대표 그룹 단언이 검증).
  const droppedCore = { ...partitioned, core: partitioned.core.slice(1) };
  assert.ok(partitionErrors(droppedCore).some(msg => msg.includes('missing from partition')));
  const droppedReq = { ...partitioned, requirements: partitioned.requirements.slice(1) };
  assert.ok(partitionErrors(droppedReq).some(msg => msg.includes('missing from partition')));
  assert.ok(partitionErrors({ ...partitioned, requirements: [] }).some(msg => msg.includes('requirements partition must not be empty')));
  for (const [left, right] of [['core', 'composer'], ['core', 'requirements'], ['composer', 'requirements']]) {
    const overlap = { ...partitioned, [left]: [...partitioned[left], partitioned[right][0]] };
    assert.ok(partitionErrors(overlap).some(msg => msg.includes(`overlap between ${left} and ${right}`)));
  }
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

test('representative security, CI, API, migration, composer and requirements tests land in the expected group', () => {
  const { core, composer, requirements } = partitionOperationalContracts(ROOT);
  const coreSet = new Set(core);
  const composerSet = new Set(composer);
  const requirementsSet = new Set(requirements);

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
  ]) {
    assert.ok(coreSet.has(expectedCore), `expected in core: ${expectedCore}`);
    assert.equal(isComposerOperationalContract(expectedCore), false, expectedCore);
    assert.equal(isRequirementsOperationalContract(expectedCore), false, expectedCore);
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
    assert.equal(isRequirementsOperationalContract(expectedComposer), false, expectedComposer);
  }

  for (const expectedRequirements of [
    'tools/requirements-workspace/server.test.mjs',
    'tools/requirements-workspace/browser.test.mjs',
    'tools/requirements-workspace/studio-browser.test.mjs',
    'tools/requirements-workspace/engine.test.mjs',
  ]) {
    assert.ok(requirementsSet.has(expectedRequirements), `expected in requirements: ${expectedRequirements}`);
    assert.equal(isRequirementsOperationalContract(expectedRequirements), true, expectedRequirements);
    assert.equal(isComposerOperationalContract(expectedRequirements), false, expectedRequirements);
  }
});

test('CLI --list prints the selected group and invalid --group fails closed with exit 2', () => {
  const { core, requirements } = partitionOperationalContracts(ROOT);
  const listed = spawnSync(process.execPath, ['scripts/run-operational-contracts.mjs', '--group', 'core', '--list'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(listed.status, 0, listed.stderr);
  assert.deepEqual(listed.stdout.trim().split(/\r?\n/), core);

  const listedReq = spawnSync(process.execPath, ['scripts/run-operational-contracts.mjs', '--group', 'requirements', '--list'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(listedReq.status, 0, listedReq.stderr);
  assert.deepEqual(listedReq.stdout.trim().split(/\r?\n/), requirements);

  const invalid = spawnSync(process.execPath, ['scripts/run-operational-contracts.mjs', '--group', 'unknown'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(invalid.status, 2);
});
