/**
 * 매니페스트 v2 로더(11단계). `config/modules/` 의 기능 파일(<기능 id>.json)·필수 기반(core.json)·인증 시작 구성(presets.json)을
 * 읽어, 카탈로그 빌더(buildProjectComposerCatalog)가 받는 기능 단위 정규형과 해시 밖 선언(표시 문구·미배정 권한 안내·게이트·RBAC
 * 매트릭스·마커 블록·참조 데이터·시작 구성 기대치)을 만든다.
 *
 * 스키마(_schema.json) 검사는 여기서 하지 않는다(composer-modules-schema.mjs). 이 로더는 카탈로그를 거쳐 생성기·정밀 점검의 import
 * 폐포에 들어가는데, 그 폐포는 의존성 설치 전에 돌아 Node 내장 모듈만 쓴다(frontend-reachability-census.test.mjs). 스키마 검사는
 * 운영 계약(composer-modules.test.mjs)과 `npm run modules:check`·`modules:generate` 가 한다. 로더는 필수 파일·JSON 형식·파일 이름과
 * 파일 사이 대조를 하고, 소스와의 대조는 빌더가 한다.
 *
 * v2 JSON 만 읽는다 — v1 manifest·생성기 상수를 보지 않는다. 그래야 두 원천이 같은 카탈로그를 낸다는 동치 계약이 같은 데이터를
 * 두 번 읽는 착시가 되지 않는다(설계서 위험 8). 전환(C7)까지는 v2 파일을 v1 에서 만든다(composer-modules-generate.mjs).
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { RBAC, supportFileOwners } from './project-composer-source.mjs';

export const MODULES_DIRECTORY = 'config/modules';
export const MODULES_SCHEMA = '_schema.json';
export const CORE_FILE = 'core.json';
export const PRESETS_FILE = 'presets.json';
const sorted = values => [...new Set(values)].sort();
const byCodeUnits = (left, right) => (left < right ? -1 : left > right ? 1 : 0);
// 카탈로그와 같은 정규 JSON 해시(project-composer-catalog.mjs 의 compositionDigest). 카탈로그가 이 로더를 부르므로 import 하지 않는다.
const canonicalJson = value => Array.isArray(value) ? `[${value.map(canonicalJson).join(',')}]`
  : value !== null && typeof value === 'object' ? `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
    : JSON.stringify(value);
const compositionDigest = value => createHash('sha256').update(canonicalJson(value)).digest('hex');

function fail(message) { throw new Error(`composer modules: ${message}`); }

/** 생성기가 쓰는 v2 파일(저장소 기준 경로). merge:main 이 충돌을 고르지 않고 다시 만드는 출력이다. */
export function composerModuleOutputs(root) {
  let names = [];
  try { names = readdirSync(join(root, MODULES_DIRECTORY)); } catch { names = []; }
  return names.filter(name => name.endsWith('.json') && name !== MODULES_SCHEMA).sort(byCodeUnits).map(name => `${MODULES_DIRECTORY}/${name}`);
}

/**
 * 디렉터리의 선언 파일을 읽는다(파일 이름 → 값). 파일 이름은 기능 id 와 같아야 한다. 스키마 검사는 하지 않는다 — 운영 계약과
 * modules:check 가 composer-modules-schema.mjs 로 한다(위 설명).
 */
export function readComposerModuleFiles(root) {
  const directory = join(root, MODULES_DIRECTORY);
  const names = readdirSync(directory).filter(name => name.endsWith('.json')).sort(byCodeUnits);
  for (const required of [MODULES_SCHEMA, CORE_FILE, PRESETS_FILE]) if (!names.includes(required)) fail(`missing ${MODULES_DIRECTORY}/${required}`);
  const files = {};
  for (const name of names.filter(name => name !== MODULES_SCHEMA)) {
    let value;
    // 깨진 JSON 은 런타임 결함이 아니라 선언 오류다(생성기 화면은 CATALOG_DRIFT 로 말한다).
    try { value = JSON.parse(readFileSync(join(directory, name), 'utf8')); } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      fail(`${name} is not valid JSON: ${error.message}`);
    }
    if (![CORE_FILE, PRESETS_FILE].includes(name) && `${value?.id}.json` !== name) fail(`file name differs from its feature id: ${name} (${value?.id})`);
    files[name] = value;
  }
  return files;
}

/**
 * 출처 해시(provenance.modulesHash)가 덮는 선언. 화면 문구(기능·core 의 presentation, 시작 구성의 label·description)와 미배정 권한
 * 안내(unassignedPermissions)는 v1 에서도 카탈로그 해시 밖이었다(DEC-OPS-242 ④·244) — 문구만 고쳐도 카탈로그 해시·모든 구성 해시와
 * 로컬 DB 번들 lock 이 바뀌지 않게 뺀다. 시작 구성의 CI 범위(ci — PR 레이아웃, ADR-0027)도 생성 결과를 바꾸지 않아 뺀다(11단계 C5).
 * 소유·간선·사용자 문장·연동·시작 구성 기대치는 생성 결과를 바꾸므로 해시에 남는다.
 */
export function hashedModuleDeclarations(files) {
  return Object.fromEntries(Object.entries(files).map(([name, value]) => {
    if (name === PRESETS_FILE) return [name, { ...value, presets: value.presets.map(({ label, description, ci, ...preset }) => preset) }];
    const { presentation, unassignedPermissions, ...rest } = value;
    return [name, rest];
  }));
}

/** 시작 구성에서 지워지는 게이트를 기능 파일의 owns.gates·RBAC 매트릭스에서 계산한다(직접 선택 승인 목록과 같은 규칙). */
export function derivedRemovedGates(extras, domains) {
  const selected = new Set(domains);
  const removed = Object.entries(extras.gateOwners).filter(([, owners]) => owners.some(domain => !selected.has(domain))).map(([file]) => file);
  if (!extras.rbac.domains.some(domain => selected.has(domain))) removed.push(extras.rbac.file);
  return removed.sort(byCodeUnits);
}

/**
 * 정규형 선언을 만든다. `declarations` 는 카탈로그 빌더 입력, `extras` 는 카탈로그 해시 밖 선언이다.
 * 파일 사이 대조(같은 테이블을 두 기능이 소유, 모르는 기능 참조, 시작 구성 게이트 기대치)는 여기서 하고,
 * 소스와의 대조(엔티티 테이블·화면 경로·간선·연동 근거)는 빌더가 한다.
 */
export function loadComposerModules(root) {
  root = resolve(root);
  const files = readComposerModuleFiles(root);
  const core = files[CORE_FILE];
  const presetsFile = files[PRESETS_FILE];
  const modules = Object.entries(files).filter(([name]) => ![CORE_FILE, PRESETS_FILE].includes(name)).map(([, value]) => value)
    .sort((left, right) => byCodeUnits(left.id, right.id));
  const ids = modules.map(module => module.id);
  const known = new Set(ids);
  const knownTarget = (from, to, what) => { if (!known.has(to) || to === from) fail(`${from}.json ${what} names an unknown or own feature: ${to}`); };
  const tableOwner = new Map(core.owns.tables.map(table => [table, 'core']));
  for (const module of modules) for (const table of module.owns.tables) {
    if (tableOwner.has(table)) fail(`duplicate table owner: ${table} (${tableOwner.get(table)}, ${module.id})`);
    tableOwner.set(table, module.id);
  }
  const sharedTables = [];
  for (const module of modules) for (const shared of module.owns.sharedTables) {
    if (tableOwner.get(shared.table) !== module.id || !shared.consumers.includes(module.id)) {
      fail(`${module.id}.json declares a shared table it does not own: ${shared.table}`);
    }
    for (const consumer of shared.consumers) if (!known.has(consumer)) fail(`${module.id}.json shared table names an unknown feature: ${consumer}`);
    sharedTables.push({ table: shared.table, consumers: [...shared.consumers], reason: shared.reason });
  }
  const userReasons = {};
  const bundleEdges = [];
  const uiDependencies = [];
  const jointFrontend = [];
  const requiredForeignKeys = [];
  const optionalForeignKeys = [];
  for (const module of modules) {
    // 같은 대상의 행이 둘이면 뒤 행이 앞 행을 조용히 덮는다(사용자 문장·근거). 한 파일 안에서 거부한다.
    const requiredTargets = new Set();
    for (const row of module.requires) {
      knownTarget(module.id, row.to, 'requires');
      if (requiredTargets.has(row.to)) fail(`${module.id}.json requires names a feature twice: ${row.to}`);
      requiredTargets.add(row.to);
      userReasons[`${module.id}>${row.to}`] = row.userReason;
    }
    const dependedTargets = new Set();
    for (const edge of module.dependsOn) {
      knownTarget(module.id, edge.to, 'dependsOn');
      if (dependedTargets.has(`${edge.to}\u0000${edge.kind}`)) fail(`${module.id}.json dependsOn names a feature twice: ${edge.to} (${edge.kind})`);
      dependedTargets.add(`${edge.to}\u0000${edge.kind}`);
      if (edge.kind === 'bundle') bundleEdges.push({ from: module.id, to: edge.to, reason: edge.reason, evidence: edge.evidence });
      else uiDependencies.push({ from: module.id, domain: edge.to, reason: edge.reason, evidence: edge.evidence, symbol: edge.symbol });
    }
    for (const rule of module.owns.frontendAny) {
      for (const other of rule.with) knownTarget(module.id, other, 'frontendAny');
      jointFrontend.push({ path: rule.path, domains: [module.id, ...rule.with], mode: 'any' });
    }
    for (const fk of module.foreignKeys) {
      knownTarget(module.id, fk.to, 'foreignKeys');
      (fk.required ? requiredForeignKeys : optionalForeignKeys).push({ name: fk.name, childTable: fk.childTable, parentTable: fk.parentTable,
        sourceDomain: module.id, targetDomain: fk.to, reason: fk.reason, evidence: fk.evidence });
    }
  }
  const integrationsOf = (from, value) => value.integrates.map(edge => ({ from, ...edge }));
  const registrationEventsOf = (from, value) => value.registrationOnly.events.map(row => ({ from, ...row }));
  const registrationPortsOf = (from, value) => value.registrationOnly.ports.map(row => ({ from, ...row }));
  const presetIds = new Set();
  const presets = presetsFile.presets.map(preset => {
    if (presetIds.has(preset.id)) fail(`duplicate preset: ${preset.id}`);
    presetIds.add(preset.id);
    for (const domain of preset.domains) if (!known.has(domain)) fail(`preset ${preset.id} names an unknown feature: ${domain}`);
    return { id: preset.id, domains: [...preset.domains] };
  });

  const declarations = {
    source: { label: 'module', ownerNoun: 'module', domainsLabel: 'module ids',
      provenance: { modules: MODULES_DIRECTORY, modulesHash: compositionDigest(hashedModuleDeclarations(files)) } },
    features: Object.fromEntries(modules.map(module => [module.id, { label: module.label, permissions: [...module.owns.permissionDomains],
      paths: [...module.owns.frontend], routes: [...module.owns.routes], exactRoutes: [...module.owns.exactRoutes], menuTabs: [...module.owns.menuTabs],
      requirements: [...module.requirements] }])),
    groups: [{ id: 'core', domains: [], tables: [...core.owns.tables], sequences: [...core.owns.sequences] },
      ...modules.map(module => ({ id: module.id, domains: [module.id], tables: [...module.owns.tables], sequences: [...module.owns.sequences] }))],
    frontendOnly: modules.filter(module => module.backend.frontendOnly).map(module => ({ domain: module.id, owner: module.id })),
    supportFiles: () => supportFileOwners(root, modules.filter(module => module.backend.supportFiles.length)
      .map(module => ({ owner: module.id, owned: [module.id], domain: module.id, files: [...module.backend.supportFiles] })), ids),
    sharedTables, bundleEdges, sharedUi: [], uiDependencies, jointFrontend, requiredForeignKeys, optionalForeignKeys, userReasons, presets,
    integrates: [...integrationsOf('core', core), ...modules.flatMap(module => integrationsOf(module.id, module))],
    registrationOnlyEvents: [...registrationEventsOf('core', core), ...modules.flatMap(module => registrationEventsOf(module.id, module))],
    registrationOnlyContributions: [...core.registrationOnly.contributions, ...modules.flatMap(module => module.registrationOnly.contributions)]
      .map(row => ({ path: row.path, reason: row.reason })),
    registrationOnlyPorts: [...registrationPortsOf('core', core), ...modules.flatMap(module => registrationPortsOf(module.id, module))],
    legacy: null,
  };

  const areaIds = new Set(core.presentation.areas.map(area => area.id));
  for (const module of modules) if (!areaIds.has(module.presentation.area)) fail(`${module.id}.json names an unknown area: ${module.presentation.area}`);
  const gateOwners = {};
  const rbacSurfaces = {};
  const codeGroupOwners = {};
  const markerRows = new Map();
  const guidance = {};
  for (const [owner, value] of [['core', core], ...modules.map(module => [module.id, module])]) {
    for (const row of value.unassignedPermissions) {
      if (Object.hasOwn(guidance, row.code)) fail(`unassigned permission guidance is declared twice: ${row.code}`);
      guidance[row.code] = { owner, bundle: row.bundle, protected: row.protected, effect: row.effect };
    }
  }
  for (const module of modules) {
    for (const gate of module.owns.gates) {
      if (Object.hasOwn(gateOwners, gate.file)) fail(`gate is owned twice: ${gate.file}`);
      for (const other of gate.alsoRequires) knownTarget(module.id, other, 'gates');
      gateOwners[gate.file] = [module.id, ...gate.alsoRequires];
    }
    for (const surface of module.owns.rbacMatrix?.surfaces ?? []) {
      if (Object.hasOwn(rbacSurfaces, surface)) fail(`RBAC surface is owned twice: ${surface}`);
      rbacSurfaces[surface] = module.id;
    }
    for (const group of module.owns.commonCodeGroups) {
      if (Object.hasOwn(codeGroupOwners, group)) fail(`common code group is owned twice: ${group}`);
      codeGroupOwners[group] = module.id;
    }
    for (const block of module.owns.markerBlocks) {
      for (const other of block.alsoRequires) knownTarget(module.id, other, 'markerBlocks');
      const row = markerRows.get(block.file) ?? { file: block.file, blocks: {}, owners: {}, step: block.step, reason: block.reason };
      if (Object.hasOwn(row.blocks, block.token)) fail(`marker blocks are owned twice: ${block.file}/${block.token}`);
      if (row.step !== block.step || row.reason !== block.reason) fail(`marker file rows disagree on step or reason: ${block.file}`);
      row.blocks[block.token] = block.blocks;
      row.owners[block.token] = [module.id, ...block.alsoRequires];
      markerRows.set(block.file, row);
    }
  }
  const extras = {
    presentation: {
      areas: core.presentation.areas.map(area => ({ id: area.id, label: area.label,
        domains: modules.filter(module => module.presentation.area === area.id).sort((left, right) => left.presentation.order - right.presentation.order)
          .map(module => module.id) })),
      summaries: Object.fromEntries(modules.map(module => [module.id, module.presentation.summary])),
      presetLabels: Object.fromEntries(presetsFile.presets.map(preset => [preset.id, preset.label])),
    },
    unassigned: guidance,
    gateOwners,
    rbac: { file: RBAC,
      domains: modules.filter(module => module.owns.rbacMatrix).map(module => module.id), surfaces: rbacSurfaces },
    markerFiles: [...markerRows.values()].sort((left, right) => byCodeUnits(left.file, right.file)),
    codeGroupOwners,
    presetExpectations: Object.fromEntries(presetsFile.presets.map(preset => [preset.id, { description: preset.description,
      gates: preset.expected.gates.map(row => ({ ...row })), gateRemovalRules: preset.expected.gateRemovalRules.map(row => ({ ...row })),
      javaCascade: [...preset.expected.javaCascade] }])),
  };
  for (const preset of presetsFile.presets) {
    const expected = sorted(preset.expected.gates.map(row => row.file));
    const derived = derivedRemovedGates(extras, preset.domains);
    if (JSON.stringify(expected) !== JSON.stringify(derived)) {
      const missing = derived.filter(file => !expected.includes(file));
      const stale = expected.filter(file => !derived.includes(file));
      fail(`preset ${preset.id} expected gates differ from gate ownership (missing: ${missing.join(', ') || '-'}; stale: ${stale.join(', ') || '-'})`);
    }
  }
  return { files, declarations, extras };
}

/**
 * 생성기 투영이 읽는 기능 소유(11단계 C3). Java 투영의 제외 기능과 지원 파일을 manifest pack 이 아니라 기능 파일에서 얻는다 —
 * 시작 구성과 직접 선택이 같은 소유로 투영된다. `modules` 는 loadComposerModules 결과다. 지원 파일은 선언을 검사하며 푼다
 * (supportFileOwners) — 잘못된 선언은 여기서 실패하고, 생성기와 정밀 점검이 같은 자리에서 실패한다.
 */
export function composerOwnership(modules) {
  return { domains: Object.keys(modules.declarations.features).sort(byCodeUnits), supportFiles: modules.declarations.supportFiles() };
}

/**
 * 원본 마이그레이션이 만드는 테이블·독립 시퀀스의 소유 목록(core·기능 파일의 owns). DB 생성기가 원본 스키마 실측과 대조한다(11단계 C3) —
 * manifest pack 을 읽지 않는다. `files` 는 readComposerModuleFiles 결과(파일 이름 → 값)다.
 */
export function moduleDatabaseInventory(files) {
  const owned = Object.entries(files).filter(([name]) => ![MODULES_SCHEMA, PRESETS_FILE].includes(name)).map(([, value]) => value.owns);
  return { tables: sorted(owned.flatMap(owns => owns.tables)), sequences: sorted(owned.flatMap(owns => owns.sequences)) };
}

/**
 * 소유 기능이 구성에 없는 공유 테이블을 넘겨받을 기능(테이블 → 기능). 순위가 아니라 선언 순서로 정한다 — 소유 기능 파일의
 * owns.sharedTables 에 적은 consumers 가운데 구성에 있는 첫 기능이다. 넘기지 않으면 생성물의 어느 기능도 그 테이블을 소유하지
 * 않는다(템플릿만 고른 구성의 tb_tmplt_info). 소비자가 모두 빠지면 테이블도 구성에 없어 넘기지 않는다.
 */
export function sharedTableTransfers(files, resolvedDomains) {
  const selected = new Set(resolvedDomains);
  const transfers = new Map();
  for (const [name, value] of Object.entries(files)) {
    if ([MODULES_SCHEMA, CORE_FILE, PRESETS_FILE].includes(name) || selected.has(value.id)) continue;
    for (const shared of value.owns.sharedTables) {
      const receiver = shared.consumers.find(consumer => consumer !== value.id && selected.has(consumer));
      if (receiver) transfers.set(shared.table, receiver);
    }
  }
  return transfers;
}

/**
 * 생성물의 config/modules 를 구성으로 투영한다(11단계 C3). 구성의 기능 파일·core.json 만 남기고 presets.json 에는 활성 구성 하나
 * (`active`)만 둔다. 기능 파일 내용은 원본 선언 그대로다 — 빠진 기능을 가리키는 연동·게이트 행도 남아, 그 기능이 이 생성물에
 * 없다는 사실을 말한다. 소유 기능이 빠진 공유 테이블은 넘겨받는 기능의 owns.tables 에 더한다(sharedTableTransfers).
 * 결과는 파일 이름 → 값이고 `_schema.json` 은 넣지 않는다(원본 그대로 둔다).
 */
export function projectComposerModuleFiles(files, composition, active) {
  const selected = new Set(composition.resolvedDomains);
  const transfers = sharedTableTransfers(files, composition.resolvedDomains);
  const projected = { [CORE_FILE]: files[CORE_FILE], [PRESETS_FILE]: { ...files[PRESETS_FILE], presets: [active] } };
  for (const [name, value] of Object.entries(files)) {
    if ([MODULES_SCHEMA, CORE_FILE, PRESETS_FILE].includes(name) || !selected.has(value.id)) continue;
    const received = [...transfers].filter(([, receiver]) => receiver === value.id).map(([table]) => table);
    projected[name] = received.length ? { ...value, owns: { ...value.owns, tables: [...value.owns.tables, ...received] } } : value;
  }
  const missing = composition.resolvedDomains.filter(domain => !Object.hasOwn(projected, `${domain}.json`));
  if (missing.length) fail(`projected modules lack selected features: ${missing.join(', ')}`);
  return projected;
}

/**
 * 생성물 config/modules 의 기능 파일 집합·활성 구성·테이블 소유가 구성과 같은지 본다(생성물 무결성 검사). 위반 문장 목록을 돌려준다.
 * `names` 는 그 디렉터리의 .json 파일 이름, `read(name)` 는 그 파일의 값이다. 파일 집합이 다르면 그 한 문장만 돌려준다.
 */
export function projectedModuleViolations({ names, read, composition }) {
  const expected = [MODULES_SCHEMA, CORE_FILE, PRESETS_FILE, ...composition.resolvedDomains.map(domain => `${domain}.json`)].sort(byCodeUnits);
  const actual = [...names].sort(byCodeUnits);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    const extra = actual.filter(name => !expected.includes(name));
    const missing = expected.filter(name => !actual.includes(name));
    return [`projected module set differs from composition (extra: ${extra.join(', ') || '-'}; missing: ${missing.join(', ') || '-'})`];
  }
  const violations = [];
  for (const domain of composition.resolvedDomains) {
    if (read(`${domain}.json`).id !== domain) violations.push(`projected module file differs from its feature id: ${domain}.json`);
  }
  const presets = read(PRESETS_FILE).presets;
  if (presets.length !== 1 || presets[0].id !== composition.profile
    || JSON.stringify(sorted(presets[0].domains)) !== JSON.stringify(sorted(composition.resolvedDomains))) {
    violations.push(`projected active composition differs from composition: ${composition.profile}`);
  }
  const tables = sorted([...read(CORE_FILE).owns.tables, ...composition.resolvedDomains.flatMap(domain => read(`${domain}.json`).owns.tables)]);
  if (JSON.stringify(tables) !== JSON.stringify(sorted(composition.tables))) violations.push('projected module table ownership differs from composition');
  return violations;
}
