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

  /*
    [게이트 제거 승인 검증용] 승인 목록이 가리키는 파일이 아직 실재하는지 보려면 테스트 소스
    전체 목록이 필요하다. 개명·삭제로 대상이 사라지면 승인 항목은 아무것도 지키지 않는 죽은
    줄이 되고, 다음 제거를 조용히 통과시킨다.
  */
  const testSourceRoots = [
    'api-server/src/test/java',
    'business-app/src/test/java',
    'business-core/src/test/java',
    'business-core/src/testFixtures/java',
    'foundation/src/test/java',
    'migration-tool/src/test/java',
  ];
  const testSources = uniqueSorted(
    testSourceRoots.flatMap((testRoot) =>
      walk(join(root, ...testRoot.split('/')), (path) => JAVA_SOURCE.test(path))
        .map((path) => normalize(relative(root, path)))),
  );

  return {
    appDomains,
    appDomainRoots,
    appServiceDomains,
    entityTables,
    crossDomainEdges,
    unexpectedAppSourceRoots,
    testSources,
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

  for (const table of ['tb_authrt_info', 'tb_authrt_user_map', 'tb_authrt_grnt_map', 'tb_authrt_chg_hstry']) {
    if (tableOwners.get(table) !== 'core') errors.push(`authorization core table '${table}'은 core pack에 있어야 한다.`);
  }
  for (const table of ['tb_user_authrt_map', 'tb_authrt_role_map', 'tb_menu_crt_dtl', 'tb_role_prgrm_map', 'tb_role_hierarchy', 'tb_role_info']) {
    if (tableOwners.has(table)) errors.push(`retired authorization table '${table}'은 Contract 이후 base에 포함할 수 없다.`);
  }

  for (const sourceRoot of repository.unexpectedAppSourceRoots ?? []) {
    errors.push(`business-app source root '${sourceRoot}'가 domain/service 소유 경계 밖에 있다.`);
  }

  /*
    [프런트 소유 선언 의무] backend.appDomains 를 선언한 pack 은 frontend 소유도 선언해야 한다.

    생성기는 제외 pack 의 appDomains 로 **백엔드만** 지운다(pruneJava). 프런트는 그 pack 의
    frontend.removePaths 가 있어야 함께 빠진다(pruneFrontend). 그래서 backend 만 선언하면
    파생 프로필이 **API 없는 화면을 그대로 배포**한다 — 메뉴는 있는데 진입 즉시 실패한다.

    2026-09-12 실측: collaboration pack 이 appDomains 8개·tables 15개를 선언하면서 frontend
    키가 없어, core 프로필에 게시판·댓글·메일·쪽지·스크랩·문자·알림 화면이 API 없이 남았다
    (생존 파일 15개가 제거된 operation 을 호출). DEC-OPS-018(survey 승격 시 셋을 같은 변경에서
    선언)·DEC-OPS-048 ⑤(백엔드가 demo 소유면 프런트 경로도 편입)가 이미 정한 원칙인데
    collaboration 에만 적용되지 않았다.

    ⚠ 이 검사는 '선언했는가' 만 본다. 목록이 **옳은가**(빠진 화면이 없는가)는 생성기를 실제로
    돌려 투영본에서 확인해야 한다 — 정적 census 가 판정할 수 있는 범위를 넘는다.
  */
  for (const [packName, pack] of Object.entries(manifest.packs ?? {})) {
    const domains = pack.backend?.appDomains ?? [];
    const frontendPaths = pack.frontend?.removePaths ?? [];
    if (domains.length > 0 && frontendPaths.length === 0) {
      errors.push(
        `pack '${packName}'이 backend.appDomains ${domains.length}개를 선언하면서 frontend 소유를 선언하지 않았다 — `
        + '제외 프로필에서 백엔드만 사라지고 화면이 남아 없는 API 를 부른다.',
      );
    }
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

  /*
    [게이트 제거 승인의 형식·실재] 생성기는 투영 시점에 "제거된 게이트 == 승인 목록" 을 exact
    대조한다. 그런데 생성기는 DB bundle 과 docker 가 필요해 CI 에서 돌지 않는다 — 그래서 여기서
    승인 목록 **자체**의 건전성만 저비용으로 지킨다(형식·중복·대상 실재). 이게 없으면 승인 항목이
    개명·삭제로 죽은 뒤에도 아무도 모르고, 죽은 승인은 다음 제거를 조용히 통과시킨다.
  */
  const knownTestSources = new Set(repository.testSources ?? []);
  for (const [profileName, profile] of Object.entries(manifest.profiles ?? {})) {
    const seen = new Set();
    for (const entry of profile.acknowledgedRemovedGates ?? []) {
      if (typeof entry?.file !== 'string' || !entry.file.trim()
          || typeof entry?.reason !== 'string' || !entry.reason.trim()) {
        errors.push(`profile '${profileName}'의 acknowledgedRemovedGates 항목은 { file, reason } 이어야 한다: ${JSON.stringify(entry)}`);
        continue;
      }
      if (seen.has(entry.file)) {
        errors.push(`profile '${profileName}'의 acknowledgedRemovedGates 에 '${entry.file}'이 중복 등재됐다.`);
      }
      seen.add(entry.file);
      if (knownTestSources.size > 0 && !knownTestSources.has(entry.file)) {
        errors.push(`profile '${profileName}'이 실재하지 않는 게이트 '${entry.file}'의 제거를 승인한다 (개명·삭제된 승인은 다음 제거를 조용히 통과시킨다).`);
      }
    }
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
