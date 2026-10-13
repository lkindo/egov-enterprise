#!/usr/bin/env node
/**
 * reusable-base-census — 현재 소스의 도메인·테이블 경계가 기능 소유 선언(매니페스트 v2, config/modules)과 일치하는지 검증한다.
 *
 * [11단계 C5] 의존 방향(pack 순위) 검사는 카탈로그로 흡수했다 — 생성기는 pack·순위를 보지 않고(C3), 방향은 카탈로그의 시작 구성
 * 닫힘 검사(필수 의존 폐포, 'preset is not closed under requires')와 엔티티 테이블 소유 대조가 본다.
 * [11단계 C7] v1 manifest 를 걷으며 같은 검사(권한 핵심 테이블·퇴역 테이블·소스 경계·화면 소유 의무·프런트 전용 표지·엔티티
 * 테이블 소유·게이트 승인 실재·실측 수)를 기능 파일·core.json·presets.json 에 건다. pack·묶음·프로필 형식 검사는 대상이 없어졌다.
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
import { CORE_FILE, MODULES_DIRECTORY, MODULES_SCHEMA, PRESETS_FILE, readComposerModuleFiles, sourceDatabaseSnapshot } from './composer-modules.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
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

function featureModules(files) {
  return Object.entries(files)
    .filter(([name]) => ![MODULES_SCHEMA, CORE_FILE, PRESETS_FILE].includes(name))
    .map(([, value]) => value)
    .sort((left, right) => (left.id < right.id ? -1 : left.id > right.id ? 1 : 0));
}

function ownershipMaps(files, errors) {
  const tableOwners = new Map();
  const sequenceOwners = new Map();
  const owners = [['core', files[CORE_FILE]], ...featureModules(files).map((module) => [module.id, module])];
  for (const [owner, value] of owners) {
    for (const table of value?.owns?.tables ?? []) {
      if (tableOwners.has(table)) {
        errors.push(`DB table '${table}'이 ${tableOwners.get(table)}와 ${owner}에 중복 배정됐다.`);
      } else {
        tableOwners.set(table, owner);
      }
    }
    for (const sequence of value?.owns?.sequences ?? []) {
      if (sequenceOwners.has(sequence)) {
        errors.push(`DB sequence '${sequence}'이 ${sequenceOwners.get(sequence)}와 ${owner}에 중복 배정됐다.`);
      } else {
        sequenceOwners.set(sequence, owner);
      }
    }
  }
  return { tableOwners, sequenceOwners };
}

/**
 * `files` 는 config/modules 의 선언 파일(파일 이름 → 값, readComposerModuleFiles 결과)이다. 11단계 C7 에서 v1 manifest 대신 이것을
 * 본다 — 기능 id 는 파일 이름이라 같은 기능을 두 번 선언할 수 없고, 묶음 간선·시작 구성·공유 테이블의 형식은 로더가, 기능 소유와
 * 소스(엔티티 테이블·화면 경로·간선)의 대조는 카탈로그가 본다. 여기에는 그 밖의 값싼 정적 검사만 남는다.
 */
export function validateReusableBase(files, repository) {
  const errors = [];
  const { tableOwners, sequenceOwners } = ownershipMaps(files, errors);
  const modules = featureModules(files);
  const featureIds = new Set(modules.map((module) => module.id));

  for (const table of ['tb_authrt_info', 'tb_authrt_user_map', 'tb_authrt_grnt_map', 'tb_authrt_chg_hstry']) {
    if (tableOwners.get(table) !== 'core') errors.push(`authorization core table '${table}'은 ${MODULES_DIRECTORY}/${CORE_FILE} 에 있어야 한다.`);
  }
  for (const table of ['tb_user_authrt_map', 'tb_authrt_role_map', 'tb_menu_crt_dtl', 'tb_role_prgrm_map', 'tb_role_hierarchy', 'tb_role_info']) {
    if (tableOwners.has(table)) errors.push(`retired authorization table '${table}'은 Contract 이후 base에 포함할 수 없다.`);
  }

  for (const sourceRoot of repository.unexpectedAppSourceRoots ?? []) {
    errors.push(`business-app source root '${sourceRoot}'가 domain/service 소유 경계 밖에 있다.`);
  }

  /*
    [프런트 소유 선언 의무] 백엔드 소스가 있는 기능은 화면 소유(owns.frontend)도 선언해야 한다.

    생성기는 빠진 기능의 백엔드를 지우고, 화면은 그 기능의 owns.frontend 로 함께 지운다. 화면 소유를 선언하지 않으면 파생
    생성물이 **API 없는 화면을 그대로 배포**한다 — 메뉴는 있는데 진입 즉시 실패한다. 2026-09-12 실측: collaboration pack 이
    appDomains 8개를 선언하면서 frontend 키가 없어 core 프로필에 게시판·댓글·메일·쪽지·스크랩·문자·알림 화면이 API 없이
    남았다(생존 파일 15개가 제거된 operation 을 호출). DEC-OPS-018·DEC-OPS-048 ⑤ 와 같은 원칙이다.

    ⚠ 이 검사는 '선언했는가' 만 본다. 목록이 **옳은가**(빠진 화면이 없는가)는 화면 생존 대조(DEC-OPS-265)와 생성기 실제 실행이 본다.
  */
  for (const module of modules) {
    if (!module.backend?.frontendOnly && !(module.owns?.frontend ?? []).length) {
      errors.push(
        `기능 '${module.id}'이 백엔드를 가지면서 화면 소유(owns.frontend)를 선언하지 않았다 — `
        + '그 기능이 빠진 구성에서 백엔드만 사라지고 화면이 남아 없는 API 를 부른다.',
      );
    }
  }

  for (const domain of repository.appDomains) {
    if (!featureIds.has(domain)) errors.push(`business-app domain '${domain}'의 기능 파일(${MODULES_DIRECTORY}/${domain}.json)이 없다.`);
  }
  /*
    [프런트 전용 기능] backend.frontendOnly 기능은 business-app 소스 없이 둘 수 있다(DEC-OPS-273). 표지가 서랍이 되지 않도록
    양방향으로 본다 — 그 기능의 business-app main·test 디렉터리가 생기면 오류다. 표지가 없는 기능은 소스가 있어야 한다.
  */
  const testDomains = new Set((repository.testSources ?? [])
    .map((path) => path.match(/^business-app\/src\/test\/java\/nuri\/business\/(?:domain|service)\/([^/]+)\//)?.[1]).filter(Boolean));
  for (const module of modules) {
    if (module.backend?.frontendOnly) {
      if (repository.appDomains.includes(module.id) || testDomains.has(module.id)) {
        errors.push(`프런트 전용 기능 '${module.id}'에 business-app 소스가 있다 — 표지를 걷거나 소스를 다른 기능으로 옮겨야 한다.`);
      }
    } else if (!repository.appDomains.includes(module.id)) {
      errors.push(`기능 '${module.id}'에 대응하는 business-app domain 소스가 없다.`);
    }
  }
  for (const serviceDomain of repository.appServiceDomains) {
    if (!featureIds.has(serviceDomain)) {
      errors.push(`business-app service root '${serviceDomain}'의 기능 파일이 없다.`);
    }
  }

  // 업무 앱 도메인 사이의 간선은 보고만 한다. 방향(어느 기능이 어느 기능을 요구하는가)은 카탈로그가 Java 참조에서 계산하고, 시작
  // 구성이 그 폐포에 닫혀 있는지 카탈로그 적재가 검사한다(11단계 C5 — pack 순위 검사를 걷었다).
  const edgeSet = new Set();
  for (const edge of repository.crossDomainEdges) {
    if (!featureIds.has(edge.source) || !featureIds.has(edge.target)) continue;
    edgeSet.add(`${edge.source}->${edge.target}`);
  }

  for (const entity of repository.entityTables) {
    if (!tableOwners.get(entity.table)) errors.push(`entity table '${entity.table}'의 소유 기능이 없다 (${entity.file}).`);
  }

  /*
    [게이트 제거 승인의 형식·실재] 생성기는 투영 시점에 "제거된 게이트 == 시작 구성의 expected.gates" 를 exact 대조한다. 그런데
    생성기는 DB bundle 과 docker 가 필요해 PR 마다 모든 구성을 돌지 않는다 — 그래서 여기서 승인 목록 **자체**의 건전성만
    저비용으로 지킨다(형식·중복·대상 실재). 이게 없으면 승인 항목이 개명·삭제로 죽은 뒤에도 아무도 모르고, 죽은 승인은 다음 제거를
    조용히 통과시킨다. 로더는 목록을 기능 파일의 게이트 소유와 대조하지만 중복은 거르고 실재는 보지 않는다.
  */
  const knownTestSources = new Set(repository.testSources ?? []);
  for (const preset of files[PRESETS_FILE]?.presets ?? []) {
    const seen = new Set();
    for (const entry of preset.expected?.gates ?? []) {
      if (typeof entry?.file !== 'string' || !entry.file.trim()
          || typeof entry?.reason !== 'string' || !entry.reason.trim()) {
        errors.push(`시작 구성 '${preset.id}'의 expected.gates 항목은 { file, reason } 이어야 한다: ${JSON.stringify(entry)}`);
        continue;
      }
      if (seen.has(entry.file)) {
        errors.push(`시작 구성 '${preset.id}'의 expected.gates 에 '${entry.file}'이 중복 등재됐다.`);
      }
      seen.add(entry.file);
      if (knownTestSources.size > 0 && !knownTestSources.has(entry.file)) {
        errors.push(`시작 구성 '${preset.id}'이 실재하지 않는 게이트 '${entry.file}'의 제거를 승인한다 (개명·삭제된 승인은 다음 제거를 조용히 통과시킨다).`);
      }
    }
  }

  // 원본 스키마 실측(core.json 의 databaseSnapshot)과 기능 파일의 테이블·독립 시퀀스 소유 수. 마이그레이션이 표를 더하거나 걷으면
  // 소유 선언과 실측이 같은 변경에서 함께 움직여야 한다(실제 집합 대조는 DB 생성기가 임시 DB 에서 한다).
  const tableCount = tableOwners.size;
  const sequenceCount = sequenceOwners.size;
  let snapshot;
  try { snapshot = sourceDatabaseSnapshot(files); } catch (error) { errors.push(error.message); }
  if (snapshot) {
    if (tableCount !== snapshot.physicalTableCountExcludingFlyway) {
      errors.push(`기능 파일 table 수 ${tableCount}가 실측 snapshot ${snapshot.physicalTableCountExcludingFlyway}와 다르다.`);
    }
    if (sequenceCount !== snapshot.physicalStandaloneSequenceCount) {
      errors.push(`기능 파일 standalone sequence 수 ${sequenceCount}가 실측 snapshot ${snapshot.physicalStandaloneSequenceCount}와 다르다.`);
    }
  }

  const owners = ['core', ...modules.map((module) => module.id)];
  return {
    errors: uniqueSorted(errors),
    summary: {
      features: modules.map((module) => module.id),
      tablesByOwner: Object.fromEntries(owners.map((owner) => [owner, [...tableOwners.values()].filter((value) => value === owner).length])),
      crossDomainEdges: uniqueSorted(edgeSet),
      entityTableCount: uniqueSorted(repository.entityTables.map((item) => item.table)).length,
      declaredTableCount: tableCount,
      declaredSequenceCount: sequenceCount,
    },
  };
}

export function analyzeRepository(root = ROOT) {
  const modules = readComposerModuleFiles(root);
  const repository = discoverRepository(root);
  return { modules, repository, result: validateReusableBase(modules, repository) };
}

function printReport({ result }) {
  console.log('\n=== Reusable Base Feature Census ===');
  for (const [owner, tables] of Object.entries(result.summary.tablesByOwner)) {
    console.log(`${owner.padEnd(18)} tables=${String(tables).padStart(2)}`);
  }
  console.log(`entity tables      : ${result.summary.entityTableCount}`);
  console.log(`declared tables    : ${result.summary.declaredTableCount}`);
  console.log(`declared seqs      : ${result.summary.declaredSequenceCount} standalone`);
  console.log(`cross-domain edge  : ${result.summary.crossDomainEdges.join(', ') || '(none)'}`);
  if (result.errors.length === 0) {
    console.log('\n✅ 기능 소유/테이블 계약 일치 (의존 방향은 카탈로그의 시작 구성 닫힘 검사)');
  } else {
    console.error('\n❌ reusable-base 기능 소유 계약 위반');
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
