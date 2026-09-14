import { createHash } from 'node:crypto';

export const SCENARIO_CONTRACT_SOURCES = Object.freeze([
  'scripts/ui-quality-scenarios-contract.test.mjs',
  'scripts/ui-quality-scenarios-contract.mjs',
  'scripts/ui-quality-scenario-contract-hash.mjs',
]);

/** Both execution capture and committed readback use the same path-bound source inventory. */
export function scenarioContractSourceHash(readBoundFileHash) {
  const entries = SCENARIO_CONTRACT_SOURCES.map(path => {
    const hash = readBoundFileHash(path);
    if (!/^[a-f0-9]{64}$/u.test(hash)) throw new Error(`Invalid scenario contract source hash: ${path}`);
    return { path, sha256: hash };
  });
  return createHash('sha256').update(JSON.stringify({ schemaVersion: 1, entries })).digest('hex');
}
