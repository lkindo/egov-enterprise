/*
 * Generated product asset exclusion rules (Phase 3/4 — producer tools, requirements studio, offline migration tool).
 * Keeps zero producer dependencies so generated products can validate absence via T1 contracts.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseRemovalLedger, pruneAssetLedger, readRemovalLedger } from './reusable-asset-removal.mjs';

export const PRODUCER_ASSET_LEDGER = 'config/governance/producer-removed-assets.json';
export const PRODUCER_ASSET_RULE = 'upstream-producer-tools';
export const REQUIREMENTS_ASSET_LEDGER = 'config/governance/requirements-removed-assets.json';
export const REQUIREMENTS_ASSET_RULE = 'requirements-studio';
export const MIGRATION_ASSET_LEDGER = 'config/governance/migration-removed-assets.json';
export const MIGRATION_ASSET_RULE = 'offline-migration-tool';

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
  Object.freeze({ rule: MIGRATION_ASSET_RULE, ledgerPath: MIGRATION_ASSET_LEDGER, label: '이관 도구 제거 원장' }),
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

export const parseMigrationAssetLedger = raw => parseRemovalLedger(raw, MIGRATION_ASSET_LEDGER);
export const readMigrationAssetLedger = root => readRemovalLedger(root, MIGRATION_ASSET_LEDGER);
export const pruneMigrationTools = output => pruneAssetLedger(output, {
  ledgerPath: MIGRATION_ASSET_LEDGER, label: '이관 도구 제거 원장',
});

/** Fail-closed removal of the copied migration-tool/build.gradle Docker instruction. */
export function stripMigrationDockerfileLine(text) {
  const pattern = /^COPY migration-tool\/build\.gradle [^\n]*\r?\n/m;
  if (!pattern.test(text)) throw new Error('Dockerfile 이관 모듈 지시어를 찾을 수 없다');
  return text.replace(pattern, '');
}

/** Fail-closed removal of the migration-tool subproject include from settings.gradle. */
export function stripMigrationSettingsLine(text) {
  const pattern = /^include 'migration-tool'\r?\n/m;
  if (!pattern.test(text)) throw new Error('settings.gradle 이관 모듈 선언을 찾을 수 없다');
  return text.replace(pattern, '');
}

/** Fail-closed removal of a single migration-tool/build.gradle entry from a frozen array block. */
function stripFrozenArrayMigrationEntry(text, blockPattern, label) {
  const blockMatch = text.match(blockPattern);
  if (!blockMatch) throw new Error(`${label} 블록을 찾을 수 없다`);
  const linePattern = /^[ \t]*'migration-tool\/build\.gradle',\r?\n/gm;
  if ([...blockMatch[0].matchAll(linePattern)].length !== 1) {
    throw new Error(`${label} 의 migration-tool/build.gradle 항목이 정확히 1건이어야 한다`);
  }
  const updatedBlock = blockMatch[0].replace(linePattern, '');
  return text.slice(0, blockMatch.index) + updatedBlock + text.slice(blockMatch.index + blockMatch[0].length);
}

/** Fail-closed removal of migration-tool/build.gradle from REQUIRED_PRODUCTION_BUILD_INPUT_FILES. */
export function stripMigrationBaselineCoreRequired(text) {
  return stripFrozenArrayMigrationEntry(
    text,
    /export const REQUIRED_PRODUCTION_BUILD_INPUT_FILES = Object\.freeze\(\[[\s\S]*?\]\);/,
    'REQUIRED_PRODUCTION_BUILD_INPUT_FILES',
  );
}

/** Fail-closed removal of migration-tool/build.gradle from API_ARCHIVE_PATHS. */
export function stripMigrationBaselineArchivePath(text) {
  return stripFrozenArrayMigrationEntry(
    text,
    /const API_ARCHIVE_PATHS = Object\.freeze\(\[[\s\S]*?\]\);/,
    'API_ARCHIVE_PATHS',
  );
}

/** Remove stale migration-tool references from active build/container descriptors in generated artifacts. */
export function stripMigrationBuildReferences(output, layout = 'multi-module') {
  const dockerfile = join(output, 'api-server/Dockerfile');
  writeFileSync(dockerfile, stripMigrationDockerfileLine(readFileSync(dockerfile, 'utf8')), 'utf8');
  const baselineCore = join(output, 'frontend/scripts/ui-quality-baseline-core.mjs');
  writeFileSync(baselineCore, stripMigrationBaselineCoreRequired(readFileSync(baselineCore, 'utf8')), 'utf8');
  const baselineBuild = join(output, 'scripts/ui-quality-baseline-build.mjs');
  let baselineSource = null;
  try { baselineSource = readFileSync(baselineBuild, 'utf8'); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (baselineSource !== null) {
    writeFileSync(baselineBuild, stripMigrationBaselineArchivePath(baselineSource), 'utf8');
  }
  if (layout !== 'single-module') {
    const settings = join(output, 'settings.gradle');
    writeFileSync(settings, stripMigrationSettingsLine(readFileSync(settings, 'utf8')), 'utf8');
  }
}

/** Verify no asset, gate, alias, or excluded skill from Phase 3/4 ledgers remains in a generated artifact. */
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
