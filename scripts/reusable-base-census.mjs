#!/usr/bin/env node
/**
 * reusable-base-census — 현재 소스의 도메인·테이블 경계가 base 프로필 계약과 일치하는지 검증한다.
 *
 * 이 스크립트는 base 산출물을 만들지 않는다. 먼저 현행 main이 안전하게 잘릴 수 있는지를 증명하는
 * 선행 게이트다. 배포 산출물은 릴리스 태그에서 별도 생성하며 장기 template 브랜치를 사용하지 않는다.
 *
 * 사용법:
 *   node scripts/reusable-base-census.mjs
 *   node scripts/reusable-base-census.mjs --check
 *   node scripts/reusable-base-census.mjs --json
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = join(ROOT, 'config', 'reusable-base-profiles.json');
const JAVA_SOURCE = /\.java$/;

function normalize(path) {
  return path.split(sep).join('/');
}

function walk(dir, filter, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path, filter, out);
    else if (filter(path)) out.push(path);
  }
  return out;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function domainFromPath(path, sourceRoot) {
  const rel = normalize(relative(sourceRoot, path));
  const match = rel.match(/^nuri\/business\/(?:domain|service)\/([^/]+)\//);
  return match?.[1];
}

function discoverRepository(root = ROOT) {
  const appRoot = join(root, 'business-app', 'src', 'main', 'java');
  const coreRoot = join(root, 'business-core', 'src', 'main', 'java');
  const appFiles = walk(appRoot, (path) => JAVA_SOURCE.test(path));
  const coreFiles = walk(coreRoot, (path) => JAVA_SOURCE.test(path));
  const unexpectedAppSourceRoots = uniqueSorted(
    appFiles
      .map((path) => normalize(relative(appRoot, path)).match(/^nuri\/business\/([^/]+)\//)?.[1])
      .filter((name) => name && !['domain', 'service'].includes(name)),
  );

  const appDomainFiles = appFiles.filter((path) =>
    normalize(relative(appRoot, path)).startsWith('nuri/business/domain/'));
  const appDomainRoots = uniqueSorted(appDomainFiles.map((path) => domainFromPath(path, appRoot)).filter(Boolean));
  const appServiceDomains = uniqueSorted(
    appFiles
      .filter((path) => normalize(relative(appRoot, path)).startsWith('nuri/business/service/'))
      .map((path) => domainFromPath(path, appRoot))
      .filter(Boolean),
  );
  const appDomains = uniqueSorted([...appDomainRoots, ...appServiceDomains]);

  const entityTables = [];
  for (const [module, sourceRoot, files] of [
    ['business-core', coreRoot, coreFiles],
    ['business-app', appRoot, appFiles],
  ]) {
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      for (const match of source.matchAll(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/g)) {
        entityTables.push({
          module,
          domain: module === 'business-app' ? domainFromPath(path, appRoot) : 'core',
          table: match[1],
          file: normalize(relative(root, path)),
        });
      }
    }
  }

  const crossDomainEdges = [];
  for (const path of appFiles) {
    const sourceDomain = domainFromPath(path, appRoot);
    if (!sourceDomain) continue;
    const source = readFileSync(path, 'utf8');
    for (const match of source.matchAll(/import\s+nuri\.business\.(?:domain|service)\.([A-Za-z0-9_]+)\./g)) {
      const targetDomain = match[1];
      if (sourceDomain !== targetDomain) {
        crossDomainEdges.push({
          source: sourceDomain,
          target: targetDomain,
          file: normalize(relative(root, path)),
        });
      }
    }
  }

  return {
    appDomains,
    appDomainRoots,
    appServiceDomains,
    entityTables,
    crossDomainEdges,
    unexpectedAppSourceRoots,
  };
}

function ownershipMaps(manifest, errors) {
  const domainOwners = new Map();
  const tableOwners = new Map();
  const sequenceOwners = new Map();

  for (const [packName, pack] of Object.entries(manifest.packs ?? {})) {
    if (!Number.isInteger(pack.rank)) {
      errors.push(`pack '${packName}' rank는 정수여야 한다.`);
    }
    for (const domain of pack.backend?.appDomains ?? []) {
      if (domainOwners.has(domain)) {
        errors.push(`business-app domain '${domain}'이 ${domainOwners.get(domain)}와 ${packName}에 중복 배정됐다.`);
      } else {
        domainOwners.set(domain, packName);
      }
    }
    for (const table of pack.database?.tables ?? []) {
      if (tableOwners.has(table)) {
        errors.push(`DB table '${table}'이 ${tableOwners.get(table)}와 ${packName}에 중복 배정됐다.`);
      } else {
        tableOwners.set(table, packName);
      }
    }
    for (const sequence of pack.database?.sequences ?? []) {
      if (sequenceOwners.has(sequence)) {
        errors.push(`DB sequence '${sequence}'이 ${sequenceOwners.get(sequence)}와 ${packName}에 중복 배정됐다.`);
      } else {
        sequenceOwners.set(sequence, packName);
      }
    }
  }

  return { domainOwners, tableOwners, sequenceOwners };
}

export function validateReusableBase(manifest, repository) {
  const errors = [];
  const { domainOwners, tableOwners, sequenceOwners } = ownershipMaps(manifest, errors);
  const packRank = (packName) => manifest.packs?.[packName]?.rank;

  for (const sourceRoot of repository.unexpectedAppSourceRoots ?? []) {
    errors.push(`business-app source root '${sourceRoot}'가 domain/service 소유 경계 밖에 있다.`);
  }

  for (const domain of repository.appDomains) {
    if (!domainOwners.has(domain)) errors.push(`business-app domain '${domain}'의 pack 소유자가 없다.`);
  }
  for (const domain of domainOwners.keys()) {
    if (!repository.appDomains.includes(domain)) {
      errors.push(`manifest domain '${domain}'에 대응하는 business-app domain 소스가 없다.`);
    }
  }
  for (const serviceDomain of repository.appServiceDomains) {
    if (!domainOwners.has(serviceDomain)) {
      errors.push(`business-app service root '${serviceDomain}'의 pack 소유자가 없다.`);
    }
  }

  const edgeSet = new Set();
  for (const edge of repository.crossDomainEdges) {
    if (!domainOwners.has(edge.source) || !domainOwners.has(edge.target)) continue;
    const sourcePack = domainOwners.get(edge.source);
    const targetPack = domainOwners.get(edge.target);
    const key = `${edge.source}->${edge.target}`;
    edgeSet.add(key);
    if (packRank(targetPack) > packRank(sourcePack)) {
      errors.push(
        `상위 pack 역참조 ${key}: ${sourcePack}이 ${targetPack}에 의존한다 (${edge.file}).`,
      );
    }
  }

  for (const entity of repository.entityTables) {
    const tablePack = tableOwners.get(entity.table);
    if (!tablePack) {
      errors.push(`entity table '${entity.table}'의 pack 소유자가 없다 (${entity.file}).`);
      continue;
    }
    const sourcePack = entity.module === 'business-core' ? 'core' : domainOwners.get(entity.domain);
    if (!sourcePack) continue;
    if (packRank(tablePack) > packRank(sourcePack)) {
      errors.push(
        `entity ${entity.domain}(${sourcePack})가 상위 DB pack ${tablePack}의 ${entity.table}을 매핑한다 (${entity.file}).`,
      );
    }
  }

  for (const [profileName, profile] of Object.entries(manifest.profiles ?? {})) {
    const ranks = [];
    for (const packName of profile.packs ?? []) {
      if (!manifest.packs?.[packName]) errors.push(`profile '${profileName}'이 없는 pack '${packName}'을 참조한다.`);
      else ranks.push(packRank(packName));
    }
    if (ranks.length > 0) {
      const max = Math.max(...ranks);
      for (const [packName, pack] of Object.entries(manifest.packs)) {
        if (pack.rank <= max && !(profile.packs ?? []).includes(packName)) {
          errors.push(`profile '${profileName}'은 rank ${max}까지 사용하지만 하위 pack '${packName}'을 포함하지 않는다.`);
        }
      }
    }
  }

  for (const cluster of manifest.clusters ?? []) {
    for (const domain of [...(cluster.domains ?? []), ...(cluster.requiresDomains ?? [])]) {
      if (!domainOwners.has(domain)) errors.push(`cluster '${cluster.id}'의 domain '${domain}'이 존재하지 않는다.`);
    }
    for (const domain of cluster.domains ?? []) {
      if (domainOwners.get(domain) !== cluster.pack) {
        errors.push(`cluster '${cluster.id}'의 domain '${domain}'은 pack '${cluster.pack}'에 함께 있어야 한다.`);
      }
    }
    for (const required of cluster.requiresDomains ?? []) {
      if (packRank(domainOwners.get(required)) > packRank(cluster.pack)) {
        errors.push(`cluster '${cluster.id}'이 상위 pack domain '${required}'에 역참조한다.`);
      }
    }
  }

  for (const contract of manifest.sharedTableContracts ?? []) {
    if (tableOwners.get(contract.table) !== contract.ownerPack) {
      errors.push(`shared table '${contract.table}'의 소유 pack이 '${contract.ownerPack}'과 다르다.`);
    }
    for (const consumer of contract.consumers ?? []) {
      const consumerPack = domainOwners.get(consumer);
      if (!consumerPack) errors.push(`shared table '${contract.table}' consumer '${consumer}'가 존재하지 않는다.`);
      else if (packRank(contract.ownerPack) > packRank(consumerPack)) {
        errors.push(`shared table '${contract.table}'이 consumer '${consumer}'보다 상위 pack에 있다.`);
      }
    }
  }

  const tableCount = tableOwners.size;
  const expectedCount = manifest.databaseSnapshot?.physicalTableCountExcludingFlyway;
  if (tableCount !== expectedCount) {
    errors.push(`manifest table 수 ${tableCount}가 실측 snapshot ${expectedCount}와 다르다.`);
  }
  const sequenceCount = sequenceOwners.size;
  const expectedSequenceCount = manifest.databaseSnapshot?.physicalStandaloneSequenceCount;
  if (sequenceCount !== expectedSequenceCount) {
    errors.push(`manifest standalone sequence 수 ${sequenceCount}가 실측 snapshot ${expectedSequenceCount}와 다르다.`);
  }

  return {
    errors: uniqueSorted(errors),
    summary: {
      domainsByPack: Object.fromEntries(
        Object.keys(manifest.packs ?? {}).map((pack) => [
          pack,
          uniqueSorted([...domainOwners.entries()].filter(([, owner]) => owner === pack).map(([domain]) => domain)),
        ]),
      ),
      tablesByPack: Object.fromEntries(
        Object.keys(manifest.packs ?? {}).map((pack) => [
          pack,
          [...tableOwners.values()].filter((owner) => owner === pack).length,
        ]),
      ),
      crossDomainEdges: uniqueSorted(edgeSet),
      entityTableCount: uniqueSorted(repository.entityTables.map((item) => item.table)).length,
      manifestTableCount: tableCount,
      manifestSequenceCount: sequenceCount,
    },
  };
}

export function analyzeRepository(root = ROOT, manifestPath = MANIFEST_PATH) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const repository = discoverRepository(root);
  return { manifest, repository, result: validateReusableBase(manifest, repository) };
}

function printReport({ result }) {
  console.log('\n=== Reusable Base Profile Census ===');
  for (const [pack, domains] of Object.entries(result.summary.domainsByPack)) {
    console.log(`${pack.padEnd(14)} domains=${String(domains.length).padStart(2)} tables=${String(result.summary.tablesByPack[pack]).padStart(2)}  ${domains.join(', ') || '(core modules)'}`);
  }
  console.log(`entity tables    : ${result.summary.entityTableCount}`);
  console.log(`manifest tables  : ${result.summary.manifestTableCount}`);
  console.log(`manifest seqs    : ${result.summary.manifestSequenceCount} standalone`);
  console.log(`cross-domain edge: ${result.summary.crossDomainEdges.join(', ') || '(none)'}`);
  if (result.errors.length === 0) {
    console.log('\n✅ profile ownership/의존 방향/테이블 계약 일치');
  } else {
    console.error('\n❌ reusable-base profile 계약 위반');
    for (const error of result.errors) console.error(`  - ${error}`);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(SCRIPT_PATH);
if (isMain) {
  const analysis = analyzeRepository();
  if (process.argv.includes('--json')) console.log(JSON.stringify(analysis.result, null, 2));
  else printReport(analysis);
  if (analysis.result.errors.length > 0) process.exit(1);
}
