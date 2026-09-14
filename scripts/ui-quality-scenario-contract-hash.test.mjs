import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { SCENARIO_CONTRACT_SOURCES, scenarioContractSourceHash } from './ui-quality-scenario-contract-hash.mjs';

test('scenario provenance binds the validator, original regression tests and hash algorithm', () => {
  assert.deepEqual(SCENARIO_CONTRACT_SOURCES, [
    'scripts/ui-quality-scenarios-contract.test.mjs',
    'scripts/ui-quality-scenarios-contract.mjs',
    'scripts/ui-quality-scenario-contract-hash.mjs',
  ]);
  const files = Object.fromEntries(SCENARIO_CONTRACT_SOURCES.map(path => [path,
    createHash('sha256').update(readFileSync(new URL(`../${path}`, import.meta.url))).digest('hex')]));
  const initial = scenarioContractSourceHash(path => files[path]);
  for (const changed of SCENARIO_CONTRACT_SOURCES) {
    assert.notEqual(scenarioContractSourceHash(path => path === changed ? '0'.repeat(64) : files[path]), initial, changed);
  }
  assert.throws(() => scenarioContractSourceHash(() => undefined), /Invalid scenario contract source hash/);
  const runner = readFileSync(new URL('../frontend/scripts/ui-quality-baseline-runner.mjs', import.meta.url), 'utf8');
  const readback = readFileSync(new URL('./ui-quality-evidence-durability.mjs', import.meta.url), 'utf8');
  assert.match(runner, /scenarioContractSourceHash\(relativePath => boundSourceFileHash\(buildSha, relativePath\)\)/);
  assert.match(readback, /hashKey === 'scenarioContractHash'[\s\S]*?scenarioContractSourceHash\(readHash\)/);
});
