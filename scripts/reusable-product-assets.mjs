/*
 * Generated product asset exclusion rules (Phase 3 — upstream producer tools & requirements studio).
 * Keeps zero producer dependencies so generated products can validate absence via T1 contracts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRemovalLedger, pruneAssetLedger, readRemovalLedger } from './reusable-asset-removal.mjs';

export const PRODUCER_ASSET_LEDGER = 'config/governance/producer-removed-assets.json';
export const PRODUCER_ASSET_RULE = 'upstream-producer-tools';
export const REQUIREMENTS_ASSET_LEDGER = 'config/governance/requirements-removed-assets.json';
export const REQUIREMENTS_ASSET_RULE = 'requirements-studio';

export const EXCLUDED_ARTIFACT_SKILLS = Object.freeze(['requirements-intake']);
export const KEPT_ARTIFACT_SCRIPT_TESTS = Object.freeze([
  'scripts/reusable-artifact-entrypoints-contract.test.mjs',
  'scripts/reusable-ui-governance-contract.test.mjs',
  'scripts/ui-quality-scenarios-contract.test.mjs',
  'scripts/ui-quality-baseline-runner-contract.test.mjs',
  'scripts/ui-quality-assisted-accessibility-contract.test.mjs',
]);

export const ALWAYS_REMOVED_ASSET_RULES = Object.freeze([
  Object.freeze({ rule: PRODUCER_ASSET_RULE, ledgerPath: PRODUCER_ASSET_LEDGER, label: '생산자 제거 원장' }),
  Object.freeze({ rule: REQUIREMENTS_ASSET_RULE, ledgerPath: REQUIREMENTS_ASSET_LEDGER, label: '요구사항 스튜디오 제거 원장' }),
]);

export const parseProducerAssetLedger = raw => parseRemovalLedger(raw, PRODUCER_ASSET_LEDGER);
export const readProducerAssetLedger = root => readRemovalLedger(root, PRODUCER_ASSET_LEDGER);
export const pruneProducerTools = output => pruneAssetLedger(output, {
  ledgerPath: PRODUCER_ASSET_LEDGER, label: '생산자 제거 원장',
});

export const parseRequirementsAssetLedger = raw => parseRemovalLedger(raw, REQUIREMENTS_ASSET_LEDGER);
export const readRequirementsAssetLedger = root => readRemovalLedger(root, REQUIREMENTS_ASSET_LEDGER);
export const pruneRequirementsStudio = output => pruneAssetLedger(output, {
  ledgerPath: REQUIREMENTS_ASSET_LEDGER, label: '요구사항 스튜디오 제거 원장',
});

/** Verify no asset, gate, alias, or excluded skill from Phase 3 ledgers remains in a generated artifact. */
export function validateAlwaysRemovedAssetsAbsent(root) {
  const errors = [];
  let scripts = {};
  try {
    scripts = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts ?? {};
  } catch (error) {
    return [`package.json 을 읽지 못했다: ${error.message}`];
  }
  for (const { ledgerPath } of ALWAYS_REMOVED_ASSET_RULES) {
    let ledger;
    try {
      ledger = readRemovalLedger(root, ledgerPath);
    } catch (error) {
      errors.push(`${ledgerPath} 을 읽지 못했다: ${error.message}`);
      continue;
    }
    for (const asset of ledger.assets) {
      if (existsSync(join(root, asset))) errors.push(`생성물에 제외 자산이 남았다(${ledgerPath}): ${asset}`);
    }
    for (const gate of ledger.gates) {
      if (existsSync(join(root, gate.file))) errors.push(`생성물에 제외 시험이 남았다(${ledgerPath}): ${gate.file}`);
    }
    for (const alias of ledger.aliases) {
      if (Object.hasOwn(scripts, alias)) errors.push(`생성물에 제외 package.json 별칭이 남았다(${ledgerPath}): ${alias}`);
    }
  }
  for (const skill of EXCLUDED_ARTIFACT_SKILLS) {
    for (const skillRoot of ['.agent/skills', '.agents/skills', '.claude/skills']) {
      const target = `${skillRoot}/${skill}`;
      if (existsSync(join(root, target))) errors.push(`생성물에 저장소 전용 스킬이 남았다: ${target}`);
    }
  }
  return errors;
}
