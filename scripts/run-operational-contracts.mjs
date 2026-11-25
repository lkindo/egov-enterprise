#!/usr/bin/env node
/**
 * 운영 계약(Node test) 분할 실행기 — Core vs Composer/Reusable.
 *
 * `npm run test:operational-contracts` 전체 카탈로그는 유지하되, 일반 PR CI에서는
 * 생성기/재사용 투영 계약(Composer)을 제외한 Core 계약만 실행하고, 생성기/재사용 경로·
 * 정책 파일·main push·수동 실행에서는 전체를 실행한다.
 *
 * 분할은 상호 배타적이고 완전 분할(core ∩ composer = ∅, core ∪ composer = all)이어야 하며,
 * `scripts/run-operational-contracts.test.mjs`가 이를 강제한다.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OPERATIONAL_CONTRACT_CATALOGS,
  operationalContractsNodeArgs,
} from './operational-contracts-runner.mjs';

const DEFAULT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const COMPOSER_CONTRACT_PATTERN = /^scripts\/(?:project-composer|reusable-|composer-modules|slot-registry|domain-deletion-plan|frontend-reachability-census|composition-profiles|pack-tagged-registry).*\.test\.mjs$/;

// 문서·README 투영 가드와 이관/제품 공통코드 불변식 가드는 일반/이관 PR에서도 항상 실행돼야 main 회귀를 막는다.
export const CORE_CONTRACT_OVERRIDES = Object.freeze(new Set([
  'scripts/reusable-source-docs.test.mjs',
  'scripts/reusable-reference-data.test.mjs',
]));

export function isComposerOperationalContract(relativePath) {
  const normalized = String(relativePath).replaceAll('\\', '/');
  if (CORE_CONTRACT_OVERRIDES.has(normalized)) return false;
  return COMPOSER_CONTRACT_PATTERN.test(normalized);
}

export function discoverOperationalContractFiles(repoRoot = DEFAULT_ROOT) {
  const files = [];
  for (const { root, suffix } of OPERATIONAL_CONTRACT_CATALOGS) {
    const absDir = join(repoRoot, root);
    const entries = readdirSync(absDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith(suffix)) {
        files.push(`${root}/${entry.name}`);
      }
    }
  }
  return files.sort();
}

export function partitionOperationalContracts(repoRoot = DEFAULT_ROOT) {
  const all = discoverOperationalContractFiles(repoRoot);
  const composer = [];
  const core = [];
  for (const file of all) {
    if (isComposerOperationalContract(file)) composer.push(file);
    else core.push(file);
  }
  return { all, core, composer };
}

export function parseArgs(argv) {
  let group = null;
  let list = false;
  let junitPath = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--group') {
      group = argv[++index] ?? '';
    } else if (arg.startsWith('--group=')) {
      group = arg.slice('--group='.length);
    } else if (arg === '--list') {
      list = true;
    } else if (arg === '--junit') {
      junitPath = argv[++index] ?? '';
      if (!junitPath) throw new Error('--junit requires a path');
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!['core', 'composer', 'all'].includes(group)) {
    throw new Error(`--group must be one of core|composer|all (got ${JSON.stringify(group)})`);
  }
  const resolvedJunit = junitPath ?? (
    group === 'composer'
      ? 'build/operational-contracts/junit-composer.xml'
      : 'build/operational-contracts/junit.xml'
  );
  return { group, list, junitPath: resolvedJunit };
}

export function runOperationalContractsCli(argv = process.argv.slice(2), { repoRoot = DEFAULT_ROOT } = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`[run-operational-contracts] ${error.message}`);
    return 2;
  }
  const partitioned = partitionOperationalContracts(repoRoot);
  const selected = partitioned[options.group];
  if (!Array.isArray(selected) || selected.length === 0) {
    console.error(`[run-operational-contracts] group '${options.group}' matched no test files`);
    return 2;
  }
  if (options.list) {
    process.stdout.write(`${selected.join('\n')}\n`);
    return 0;
  }
  mkdirSync(dirname(join(repoRoot, options.junitPath)), { recursive: true });
  const nodeArgs = [
    ...operationalContractsNodeArgs(options.junitPath),
    ...selected,
  ];
  const result = spawnSync(process.execPath, nodeArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(`[run-operational-contracts] failed to spawn node --test: ${result.error.message}`);
    return 1;
  }
  if (result.signal) {
    console.error(`[run-operational-contracts] terminated by signal ${result.signal}`);
    return 1;
  }
  return result.status ?? 1;
}

const invokedDirectly = process.argv[1]
  && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();

if (invokedDirectly) {
  process.exitCode = runOperationalContractsCli();
}
