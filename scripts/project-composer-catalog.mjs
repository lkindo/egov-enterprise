import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { supportFileDirectoryDomain } from './project-composer-source.mjs';
import { apiSourceOwner, degradationPredicate, deriveEventSources,
  deriveEventTriples, derivePortConnections, javaSourceFiles, requiresClosure, resolveIntegrations, sourceOwner } from './project-composer-integrations.mjs';
import { loadComposerModules } from './composer-modules.mjs';
import { menuRouteKey } from './project-composer-db.mjs';
import { attachUserReasons } from './project-composer-reasons.mjs';
import { COMPOSER_MENU_SNAPSHOT_PATH } from './project-composer-menu-preview.mjs';
import { SLOT_ROOT, slotPathKind } from './slot-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PERMISSIONS = 'config/governance/permission-catalog.json';
const APP_ROOT = 'business-app/src/main/java/nuri/business';
const API_ROOT = 'api-server/src/main/java/nuri/api';
const sorted = values => [...new Set(values)].sort();
const slash = value => value.split(sep).join('/');

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function compositionDigest(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function fail(message) { throw new Error(`project-composer catalog: ${message}`); }
function walk(directory) {
  if (!existsSync(directory)) return [];
  if (!statSync(directory).isDirectory()) return [directory];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(directory, entry.name)) : [join(directory, entry.name)]).sort();
}

function javaCode(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    value => value.replace(/[^\r\n]/g, ' '));
}

/*
 * 아래 판정들은 카탈로그와 수동 도메인 삭제(domain-deletion-plan.mjs)가 함께 쓴다. 삭제 판정은 카탈로그 전체 검증 없이
 * 지금 트리(생성물·이미 지운 트리 포함)에서 같은 간선을 계산해야 해서, 순회는 따로 하되 간선 규칙은 여기 하나만 둔다.
 */
/** api-server 생산 소스의 루트(저장소 기준). 간선은 이 아래 `.java` 파일에서 센다. */
export const API_SOURCE_ROOT = API_ROOT;

/**
 * api-server 생산 소스 하나가 만드는 기능 간선(DEC-OPS-280). 생성기는 지운 기능의 타입을 참조하는 api-server 파일을 연쇄로
 * 지우므로, 디렉터리 소유 기능(apiSourceOwner)의 컨트롤러가 다른 기능 타입을 참조하면 소유 기능은 그 기능을 요구한다.
 * 이 간선이 없으면 소유 기능만 고른 생성물에서 그 컨트롤러가 조용히 지워진다(커뮤니티 사용자 API 가 게시판 참조로 사라지던 경로).
 * 소유 디렉터리 없이 둘 이상을 참조하면 어느 기능에 속하는지 정할 수 없어 실패한다. `features` 는 기능 id 집합이다.
 * @returns {{ owner: string | null, referenced: string[], requires: string[] }}
 */
export function apiSourceRequirements(path, source, features) {
  const referenced = sorted(javaDomainReferences(source).filter(domain => features.has(domain)));
  const owner = referenced.length ? apiSourceOwner(path, features) : null;
  if (!owner && referenced.length > 1) {
    fail(`api-server source references several capabilities without an owning directory: ${path} (${referenced.join(', ')})`);
  }
  return { owner, referenced, requires: owner ? referenced.filter(domain => domain !== owner) : [] };
}
/** 업무 앱 생산 소스의 상대 경로가 속한 기능 디렉터리. 업무 앱 소스가 아니면 null. */
export function appSourceDomain(path) {
  return path.startsWith(`${APP_ROOT}/`) ? path.slice(APP_ROOT.length + 1).match(/^(?:domain|service)\/([^/]+)\//)?.[1] ?? null : null;
}

/** Java 소스가 정규화된 이름으로 참조하는 기능 디렉터리(정적·와일드카드 import 포함, 주석·문자열 제외). 중복이 있을 수 있다. */
export function javaDomainReferences(source) {
  return [...javaCode(source).matchAll(/(?<![\w$])nuri\.business\.(?:domain|service)\.([a-z][a-z0-9_]*)\./g)].map(match => match[1]);
}

function covers(prefix, candidate) { return candidate === prefix || candidate.startsWith(`${prefix}/`); }
function frontendRules(declarations, domains) {
  return [
    ...domains.flatMap(domain => declarations.features[domain].paths.map(path => ({ path, domains: [domain] }))),
    ...declarations.sharedUi.flatMap(group => group.paths.map(path => ({ path, domains: group.domains }))),
    ...declarations.jointFrontend.map(rule => ({ ...rule, domains: [...rule.domains] })),
  ];
}

/*
 * 슬롯 기여 디렉터리(슬롯 단계 PR-4). src/extensions 아래 디렉터리는 기능 id 여야 하고, 그 기능의 paths 에 `src/extensions/<기능 id>` 로
 * 선언돼야 한다(양방향). 시작 구성과 직접 선택은 같은 기능 규칙으로 기여를 지운다(11단계 C2). 디렉터리 밖 최상위 파일은 슬롯
 * 장치와 레지스트리뿐이다. 기여 파일 목록을 돌려준다 — 선택 연동의 기여 분류가 쓴다.
 */
function slotContributionInventory(root, declarations) {
  const { features } = declarations;
  const directory = join(root, 'frontend', SLOT_ROOT);
  const contributions = [];
  for (const entry of existsSync(directory) ? readdirSync(directory, { withFileTypes: true }) : []) {
    const path = `${SLOT_ROOT}/${entry.name}`;
    if (!entry.isDirectory()) {
      if (!['device', 'registry'].includes(slotPathKind(path)?.kind)) fail(`slot root holds an unknown file: ${path}`);
      continue;
    }
    if (!Object.hasOwn(features, entry.name)) fail(`slot contribution directory is not a feature: ${path}`);
    if (!features[entry.name].paths.includes(path)) fail(`slot contribution directory is missing from its feature paths: ${path}`);
    for (const file of walk(join(directory, entry.name))) {
      const kind = slotPathKind(slash(relative(join(root, 'frontend'), file)));
      contributions.push({ path: `frontend/${kind.file}`, owner: kind.owner, slot: kind.slot });
    }
  }
  // 반대 방향: 선언은 기능 자신의 디렉터리 하나만 가리킨다. 없는 디렉터리는 위의 경로 실재 검사가 거부한다.
  for (const [id, feature] of Object.entries(features)) for (const path of feature.paths.filter(path => covers(SLOT_ROOT, path))) {
    if (path !== `${SLOT_ROOT}/${id}`) fail(`feature declares a slot path that is not its own contribution directory: ${id} ${path}`);
  }
  return contributions.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

/**
 * Read-only producer inventory. Does not contact a DB, execute Git or create output.
 * 선언은 매니페스트 v2(config/modules)만 읽는다 — 기능 소유의 유일한 원천이다(11단계 C7 전환).
 */
export function loadProjectComposerCatalog(root = ROOT) {
  root = resolve(root);
  return buildProjectComposerCatalog(root, loadComposerModules(root).declarations);
}

/**
 * 정규형 선언(loadComposerModules 의 declarations)과 저장소 사실(Java 소스·권한 원장·메뉴 스냅숏·화면 파일)로 카탈로그를 만든다.
 * 선언에서 계산할 수 있는 사실은 적지 않고 소스와 양방향으로 대조한다(설계서 9.1 R5).
 */
export function buildProjectComposerCatalog(root, declarations) {
  root = resolve(root);
  const { features, source } = declarations;
  const permissions = JSON.parse(readFileSync(join(root, PERMISSIONS), 'utf8'));
  for (const dependency of declarations.uiDependencies) {
    if (!readFileSync(join(root, dependency.evidence), 'utf8').includes(dependency.symbol)) fail(`declared UI dependency drifted: ${dependency.evidence}`);
  }
  const domainOwners = new Map();
  for (const group of declarations.groups) for (const domain of group.domains) {
    if (domainOwners.has(domain)) fail(`duplicate domain owner: ${domain}`);
    domainOwners.set(domain, group.id);
  }
  const domains = sorted(domainOwners.keys());
  if (canonicalJson(domains) !== canonicalJson(Object.keys(features).sort())) fail(`capability declarations differ from ${source.domainsLabel}`);
  // 프런트 전용 기능(DEC-OPS-273). Java·테이블·권한 도메인이 없어야 하고, 선언한 기능 파일이 그 기능을 소유해야 한다.
  const frontendOnlyDomains = new Set();
  for (const { domain, owner } of declarations.frontendOnly) {
    if (domainOwners.get(domain) !== owner) fail(`frontend-only capability is not an appDomain of its ${source.ownerNoun}: ${domain}`);
    frontendOnlyDomains.add(domain);
  }
  const tableOwners = new Map();
  const sequenceOwners = new Map();
  for (const group of declarations.groups) {
    for (const [kind, values, owners] of [['table', group.tables, tableOwners], ['sequence', group.sequences, sequenceOwners]]) {
      for (const value of values) { if (owners.has(value)) fail(`duplicate ${kind} owner: ${value}`); owners.set(value, group.id); }
    }
  }
  const coreGroup = declarations.groups.find(group => group.id === 'core');
  if (!coreGroup || coreGroup.domains.length) fail('core declarations must exist and own no selectable capability');
  const inventory = new Map(domains.map(domain => [domain, { files: [], tables: [], sequences: [], edges: [] }]));
  const sourceFingerprints = declarations.uiDependencies.map(({ evidence }) => ({ path: evidence,
    sha256: compositionDigest(readFileSync(join(root, evidence), 'utf8').replace(/\r\n/g, '\n')) }));
  const supportRequirements = new Map();
  const supportFiles = declarations.supportFiles();
  for (const [domain, files] of supportFiles) for (const path of files) {
    inventory.get(domain).files.push(path);
    // 다른 도메인 디렉터리의 지원 파일은 그 도메인이 있어야 존재한다. 업무 앱 생산 소스의 지문은 아래 순회가 남긴다.
    const directoryDomain = supportFileDirectoryDomain(path);
    if (directoryDomain) {
      if (!inventory.has(directoryDomain)) fail(`support file directory domain is not selectable: ${path}`);
      const known = supportRequirements.get(domain) ?? [];
      if (!known.some(row => row.domain === directoryDomain)) supportRequirements.set(domain, [...known, { domain: directoryDomain, path }]);
    }
    if (!path.startsWith(`${APP_ROOT}/`)) sourceFingerprints.push({ path, sha256: compositionDigest(readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')) });
  }
  for (const absolute of walk(join(root, APP_ROOT)).filter(path => path.endsWith('.java'))) {
    const path = slash(relative(root, absolute));
    const domain = appSourceDomain(path);
    if (!inventory.has(domain)) fail(`unowned application source: ${path}`);
    const javaSource = readFileSync(absolute, 'utf8');
    const owner = inventory.get(domain);
    owner.files.push(path);
    sourceFingerprints.push({ path, sha256: compositionDigest(javaSource.replace(/\r\n/g, '\n')) });
    for (const match of javaSource.matchAll(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/g)) owner.tables.push(match[1]);
    for (const match of javaSource.matchAll(/sequenceName\s*=\s*"([^"]+)"/g)) owner.sequences.push(match[1]);
    // Includes fully qualified field types (RewardManage), static and wildcard imports.
    for (const referenced of javaDomainReferences(javaSource)) {
      if (referenced !== domain && inventory.has(referenced)) owner.edges.push({ domain: referenced, evidence: path });
    }
  }
  // api-server 컨트롤러가 다른 기능 타입을 참조하는 결합도 간선이다(DEC-OPS-280). 업무 앱 순회만으로는 보이지 않는다.
  const selectable = new Set(inventory.keys());
  for (const absolute of walk(join(root, API_ROOT)).filter(path => path.endsWith('.java'))) {
    const path = slash(relative(root, absolute));
    const javaSource = readFileSync(absolute, 'utf8');
    const { owner, requires } = apiSourceRequirements(path, javaSource, selectable);
    if (!requires.length) continue;
    for (const required of requires) inventory.get(owner).edges.push({ domain: required, evidence: path });
    sourceFingerprints.push({ path, sha256: compositionDigest(javaSource.replace(/\r\n/g, '\n')) });
  }
  const sharedTables = declarations.sharedTables;
  for (const shared of sharedTables) for (const consumer of shared.consumers) {
    if (!inventory.has(consumer) || !tableOwners.has(shared.table)) fail(`invalid shared table consumer: ${shared.table}/${consumer}`);
    inventory.get(consumer).tables.push(shared.table);
  }
  const ownedTables = new Map();
  for (const [domain, data] of inventory) for (const table of sorted(data.tables)) {
    if (!tableOwners.has(table)) fail(`entity table absent from ${source.label}: ${domain}/${table}`);
    if (tableOwners.get(table) !== domainOwners.get(domain)
      && !sharedTables.some(shared => shared.table === table && shared.consumers.includes(domain))) fail(`cross-${source.ownerNoun} table lacks shared contract: ${domain}/${table}`);
    if (ownedTables.has(table) && !sharedTables.some(shared => shared.table === table
      && shared.consumers.includes(domain) && shared.consumers.includes(ownedTables.get(table)))) fail(`duplicate domain table without shared contract: ${table}`);
    ownedTables.set(table, domain);
  }
  for (const [table, owner] of tableOwners) if (owner !== 'core' && !ownedTables.has(table)) fail(`unowned optional table: ${table}`);
  for (const [sequence, owner] of sequenceOwners) if (owner !== 'core'
    && ![...inventory.values()].some(value => value.sequences.includes(sequence))) fail(`unowned optional sequence: ${sequence}`);

  const rules = frontendRules(declarations, domains);
  for (const rule of rules) if (!existsSync(join(root, 'frontend', rule.path))) fail(`frontend ownership path missing: ${rule.path}`);
  // 한 경로는 한 기능 집합만 소유한다. 같은 경로를 두 기능이 선언하면 한 기능만 고른 구성이 그 경로를 남기면서 동시에 지운다.
  // 접두 경로 안쪽 파일을 다른 기능이 소유하는 중첩(게시판 디렉터리 안의 커뮤니티 화면)은 경로가 달라 여기에 걸리지 않는다.
  const pathOwners = new Map();
  for (const rule of rules) {
    const owners = sorted(rule.domains).join('+');
    if (pathOwners.has(rule.path) && pathOwners.get(rule.path) !== owners) fail(`duplicate frontend path owner: ${rule.path} (${pathOwners.get(rule.path)}, ${owners})`);
    pathOwners.set(rule.path, owners);
  }

  const contributions = slotContributionInventory(root, declarations);

  const declaredPermissionDomains = new Map();
  for (const domain of domains) for (const permissionDomain of features[domain].permissions) {
    if (declaredPermissionDomains.has(permissionDomain)) fail(`duplicate permission domain ownership: ${permissionDomain}`);
    if (!permissions.permissions.some(permission => permission.domain === permissionDomain)) fail(`unknown permission domain: ${permissionDomain}`);
    declaredPermissionDomains.set(permissionDomain, domain);
  }
  const allRoutes = Object.keys(permissions.pagePermissions).sort();
  for (const feature of Object.values(features)) for (const prefix of feature.routes) {
    if (!allRoutes.some(route => covers(prefix, route))) fail(`route declaration has no canonical page: ${prefix}`);
  }
  const routeOwners = new Map();
  for (const domain of domains) for (const route of allRoutes) {
    const feature = features[domain];
    if (feature.routes.some(prefix => (feature.exactRoutes ?? []).includes(prefix) ? route === prefix : covers(prefix, route))) {
      const previous = routeOwners.get(route);
      // Narrower paths override an umbrella (/admin/community vs its templates). 같은 길이면 정확히 그 화면만 선언한 쪽(exactRoutes)이
      // 접두 선언을 이긴다 — 게시판 디렉터리 안의 커뮤니티 탭 별칭(/admin/community/boards)이 그 예다(허브 분해 H2).
      const specificity = Math.max(...feature.routes.filter(prefix => covers(prefix, route))
        .map(prefix => prefix.length + ((feature.exactRoutes ?? []).includes(prefix) ? 0.5 : 0)));
      if (!previous || specificity > previous.specificity) routeOwners.set(route, { domain, specificity });
      else if (specificity === previous.specificity && previous.domain !== domain) fail(`ambiguous route owner: ${route}`);
    }
  }
  const sharedRoutes = new Map(declarations.sharedUi.flatMap(group => group.routes.map(route => [route, group.domains])));
  const mandatoryPermissions = permissions.permissions.filter(permission => !declaredPermissionDomains.has(permission.domain)).map(permission => permission.code).sort();
  const mandatoryRoutes = allRoutes.filter(route => !routeOwners.has(route) && !sharedRoutes.has(route));
  // 간선마다 사용자용 한 문장을 붙인다. 선언과 간선이 어긋나면 여기서 실패한다(설계서 9.1 R5).
  const capabilities = attachUserReasons(domains.map(domain => {
    const feature = features[domain];
    const data = inventory.get(domain);
    if (frontendOnlyDomains.has(domain)) {
      if (data.files.length) fail(`frontend-only capability has backend source: ${domain}`);
      // 권한 도메인은 둘 수 있다 — 화면 진입에만 쓰는 권한이면 백엔드가 없다(시연 기능의 워크플로우 예시 화면과 그 진입 권한
      // WORKFLOW_READ, 2026-10-13). 서버 인가 census 가 그 권한을 부르지 않는지는 운영 계약(project-composer-catalog.test.mjs)이 본다.
      if (data.tables.length) fail(`frontend-only capability declares tables: ${domain}`);
    } else if (!data.files.length) fail(`capability has no source: ${domain}`);
    const requires = [];
    for (const edge of data.edges) requires.push({ domain: edge.domain, kind: 'java', reason: `${domain} 소스가 ${edge.domain} 타입을 참조한다.`, evidence: edge.evidence });
    for (const support of supportRequirements.get(domain) ?? []) {
      requires.push({ domain: support.domain, kind: 'java', reason: `${domain} 이 쓰는 지원 구현이 ${support.domain} 소스에 있다.`, evidence: support.path });
    }
    for (const edge of declarations.bundleEdges.filter(row => row.from === domain)) {
      requires.push({ domain: edge.to, kind: 'manifest', reason: edge.reason, evidence: edge.evidence });
    }
    for (const cluster of declarations.sharedUi) if (cluster.domains.includes(domain)) {
      for (const required of cluster.domains.filter(item => item !== domain)) requires.push({ domain: required, kind: 'shared-ui', reason: cluster.reason, evidence: cluster.evidence, customOnly: true });
    }
    for (const dependency of declarations.uiDependencies.filter(row => row.from === domain)) {
      const { from, symbol, ...edge } = dependency;
      requires.push({ ...edge, kind: 'ui-import', customOnly: true });
    }
    return {
      // 카드 요약·영역 같은 화면 문구는 해시 밖의 표시 문구(project-composer-presentation.mjs)가 맡는다.
      id: domain, label: feature.label, available: true,
      requires: requires.sort((a, b) => canonicalJson(a) < canonicalJson(b) ? -1 : canonicalJson(a) > canonicalJson(b) ? 1 : 0),
      backend: { sourcePaths: ['domain', 'service'].map(layer => `${APP_ROOT}/${layer}/${domain}`).filter(path => existsSync(join(root, path))), sourceFiles: data.files.sort() },
      database: { tables: sorted(data.tables), explicitSequences: sorted(data.sequences) },
      frontend: { paths: feature.paths, routes: allRoutes.filter(route => routeOwners.get(route)?.domain === domain) },
      menuRoutes: allRoutes.filter(route => routeOwners.get(route)?.domain === domain),
      menuTabs: sorted(feature.menuTabs ?? []),
      permissionCodes: permissions.permissions.filter(permission => feature.permissions.includes(permission.domain)).map(permission => permission.code).sort(),
      requirements: feature.requirements ?? [],
    };
  }), declarations.userReasons);
  // 시작 구성은 이름 붙은 기능 목록이고 필수 의존 폐포에 닫혀 있어야 한다. 시작 구성도 직접 선택과 같은 간선을 따르므로(해석기 단일화,
  // 11단계 C2) 닫히지 않은 목록은 해석 중이 아니라 카탈로그 결함으로 거부한다.
  const closure = requiresClosure(capabilities);
  for (const preset of declarations.presets) for (const domain of preset.domains) {
    if (!Object.hasOwn(features, domain)) fail(`preset names an unknown capability: ${preset.id} (${domain})`);
    const missing = [...closure(domain)].filter(required => !preset.domains.includes(required)).sort();
    if (missing.length) fail(`preset is not closed under requires: ${preset.id} (${domain} -> ${missing.join(', ')})`);
  }
  // 탭 기여는 실제 메뉴 행과 셸 화면이 있어야 한다. 맞지 않는 선언은 아무 메뉴도 고르지 못한 채 조용히 남는다.
  const menuRows = JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')).menus
    .filter(row => row.use_yn === 'Y' && row.del_yn !== 'Y' && row.modern_route).map(row => menuRouteKey(row.modern_route).key);
  const tabContributors = new Map();
  for (const capability of capabilities) for (const route of capability.menuTabs) {
    const contribution = menuRouteKey(route);
    if (!contribution.tab || contribution.key !== route) fail(`menu tab must be a canonical path with one tab: ${route}`);
    if (!allRoutes.includes(contribution.path)) fail(`menu tab shell has no canonical page: ${route}`);
    if (!menuRows.includes(contribution.key)) fail(`menu tab has no active menu row: ${route}`);
    if (tabContributors.has(route)) fail(`menu tab has two contributors: ${route}`);
    tabContributors.set(route, capability.id);
  }
  for (const contract of [...declarations.requiredForeignKeys, ...declarations.optionalForeignKeys]) {
    if (!readFileSync(join(root, contract.evidence), 'utf8').includes(`ADD CONSTRAINT ${contract.name}`)) fail(`declared foreign key drifted: ${contract.name}`);
    const owns = (domain, table) => capabilities.find(capability => capability.id === domain)?.database.tables.includes(table);
    if (!owns(contract.sourceDomain, contract.childTable) || !owns(contract.targetDomain, contract.parentTable)) fail(`declared foreign key ownership drifted: ${contract.name}`);
  }
  const presets = declarations.presets.map(preset => ({ id: preset.id, domains: sorted(preset.domains) }));
  // 선택 연동: 발행·수신을 실제 소스에서 계산해 선언과 양방향으로 대조한다(설계서 9.1·B4).
  // 포트 연결도 같은 소유 판정으로 계산해 선언과 양방향으로 대조한다(11단계 C2). 네 모듈의 생산 Java 는 한 번만 읽는다.
  const supportOwners = new Map([...supportFiles].flatMap(([domain, files]) => files.map(file => [file, domain])));
  const ownerOf = sourceOwner(supportOwners, domains, closure);
  const javaFiles = javaSourceFiles(root);
  const integrates = resolveIntegrations({ root, declared: declarations.integrates, registrationOnly: declarations.registrationOnlyEvents,
    registrationOnlyContributions: declarations.registrationOnlyContributions,
    triples: deriveEventTriples(root, ownerOf, deriveEventSources(root, ownerOf, javaFiles)),
    ports: derivePortConnections(root, ownerOf, javaFiles), registrationOnlyPorts: declarations.registrationOnlyPorts,
    canDegrade: degradationPredicate(capabilities, presets), domains, optionalForeignKeys: declarations.optionalForeignKeys, contributions });
  const catalog = {
    schemaVersion: 1, mandatory: ['foundation', 'core'], databaseVendors: ['postgresql'], backendLayouts: ['multi-module', 'single-module'],
    provenance: { ...source.provenance, permissions: PERMISSIONS, permissionsHash: compositionDigest(permissions), sourceInventoryHash: compositionDigest(sourceFingerprints) },
    presets, capabilities, frontendRules: rules, sharedUi: declarations.sharedUi, integrates,
    core: { tables: sorted(coreGroup.tables), explicitSequences: sorted(coreGroup.sequences), permissionCodes: mandatoryPermissions, menuRoutes: mandatoryRoutes },
    sharedTableContracts: sharedTables, optionalForeignKeys: declarations.optionalForeignKeys, requiredForeignKeys: declarations.requiredForeignKeys,
  };
  return { ...catalog, catalogHash: compositionDigest(catalog) };
}
