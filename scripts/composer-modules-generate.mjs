#!/usr/bin/env node
/**
 * 매니페스트 v2(config/modules) 생성기 — 11단계 전환(C7)까지만 쓴다.
 *
 * 전환 전에는 v1 선언(config/reusable-base-profiles.json 과 생성기 모듈의 상수)이 원천이고 v2 파일은 그 파생물이다. v1 을 고치면
 * `npm run modules:generate` 로 다시 쓰고, `npm run modules:check` 와 임시 동치 계약(composer-modules.test.mjs)이 어긋남을 잡는다.
 * 다른 PR 이 v1 을 고친 뒤 main 을 합쳐도 `npm run merge:main` 이 이 생성기를 다시 돌린다.
 *
 * 기능 단위 소유(테이블·시퀀스)는 v1 카탈로그가 엔티티에서 계산한 값을 pack 소유와 맞춰 옮긴다. 화면 문구·미배정 권한 안내·게이트·
 * RBAC 매트릭스·마커 블록·참조 데이터·시작 구성 기대치는 각 상수에서 옮긴다. `_schema.json` 은 손으로 쓰는 계약이라 만들지 않는다.
 *
 * 두 방식 모두 쓰거나 비교한 뒤 `_schema.json` 검사(composer-modules-schema.mjs)를 한다 — 로더는 생성기 import 폐포의 내장 모듈
 * 제약 때문에 스키마를 검사하지 않는다.
 *
 * 사용: node scripts/composer-modules-generate.mjs --write | --check
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildProjectComposerCatalog, v1ComposerDeclarations } from './project-composer-catalog.mjs';
import { CAPABILITY_SUMMARIES, COMPOSER_AREAS, PRESET_LABELS } from './project-composer-presentation.mjs';
import { UNASSIGNED_PERMISSION_GUIDANCE } from './project-composer-unassigned.mjs';
import { FRONTEND_MARKER_FILES, GATE_OWNERS, MANAGEMENT_RBAC_SURFACES, RBAC, RBAC_DOMAINS } from './project-composer-source.mjs';
import { CODE_GROUP_OWNERS } from './reusable-reference-data.mjs';
import { MODULES_DIRECTORY, MODULES_SCHEMA } from './composer-modules.mjs';
import { validateComposerModuleSchema } from './composer-modules-schema.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'config/reusable-base-profiles.json';
const PERMISSIONS = 'config/governance/permission-catalog.json';
const byCodeUnits = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

function fail(message) { throw new Error(`composer modules generator: ${message}`); }

/** v1 상수에서 로더 extras 와 같은 모양을 만든다(동치 계약의 v1 쪽). */
export function v1ComposerExtras(root = ROOT) {
  const manifest = JSON.parse(readFileSync(join(resolve(root), MANIFEST), 'utf8'));
  const permissions = JSON.parse(readFileSync(join(resolve(root), PERMISSIONS), 'utf8'));
  const featureOfPermissionDomain = new Map(Object.entries(v1ComposerDeclarations(root).features)
    .flatMap(([id, feature]) => feature.permissions.map(domain => [domain, id])));
  return {
    presentation: { areas: COMPOSER_AREAS.map(area => ({ id: area.id, label: area.label, domains: [...area.domains] })),
      summaries: { ...CAPABILITY_SUMMARIES }, presetLabels: { ...PRESET_LABELS } },
    unassigned: Object.fromEntries(Object.entries(UNASSIGNED_PERMISSION_GUIDANCE).map(([code, row]) => {
      const domain = permissions.permissions.find(permission => permission.code === code)?.domain;
      return [code, { owner: featureOfPermissionDomain.get(domain) ?? 'core', bundle: row.bundle, protected: row.protected, effect: row.effect }];
    })),
    gateOwners: Object.fromEntries(Object.entries(GATE_OWNERS).map(([file, owners]) => [file, [...owners]])),
    rbac: { file: RBAC, domains: [...RBAC_DOMAINS].sort(byCodeUnits), surfaces: Object.fromEntries(MANAGEMENT_RBAC_SURFACES) },
    markerFiles: FRONTEND_MARKER_FILES.map(row => ({ file: row.file, blocks: { ...row.blocks },
      owners: Object.fromEntries(Object.entries(row.owners).map(([token, owners]) => [token, [...owners]])), step: row.step, reason: row.reason }))
      .sort((left, right) => byCodeUnits(left.file, right.file)),
    codeGroupOwners: { ...CODE_GROUP_OWNERS },
    presetExpectations: Object.fromEntries(Object.entries(manifest.profiles).map(([id, profile]) => [id, { description: profile.description,
      gates: (profile.acknowledgedRemovedGates ?? []).map(row => ({ ...row })),
      gateRemovalRules: (profile.acknowledgedGateRemovalRules ?? []).map(row => ({ ...row })),
      javaCascade: [...(profile.acknowledgedJavaCascade ?? [])] }])),
  };
}

const integrationRow = edge => ({ to: edge.to, via: edge.via, reason: edge.reason, ...(edge.ports ? { ports: [...edge.ports] } : {}),
  ...(edge.anchors ? { anchors: edge.anchors.map(row => ({ ...row })) } : {}) });
const registrationPortRows = (declarations, from) => declarations.registrationOnlyPorts.filter(row => row.from === from)
  .map(row => ({ to: row.to, port: row.port, reason: row.reason }));

/** v1 선언에서 v2 파일 내용(파일 이름 → 값)을 만든다. 순수 계산이며 디스크에 쓰지 않는다. */
export function composerModuleFiles(root = ROOT) {
  root = resolve(root);
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  const declarations = v1ComposerDeclarations(root);
  const catalog = buildProjectComposerCatalog(root, declarations);
  const extras = v1ComposerExtras(root);
  const capability = new Map(catalog.capabilities.map(row => [row.id, row]));
  const packOf = declarations.legacy.packOf;
  const tablePack = new Map(Object.entries(manifest.packs).flatMap(([id, pack]) => (pack.database?.tables ?? []).map(table => [table, id])));
  const sequencePack = new Map(Object.entries(manifest.packs).flatMap(([id, pack]) => (pack.database?.sequences ?? []).map(sequence => [sequence, id])));
  // pack 테이블을 그 pack 의 기능 가운데 엔티티로 매핑하는 기능에 준다. 둘 이상이면 공유 계약의 첫 소비자다.
  const tableOwner = new Map();
  for (const [table, pack] of tablePack) {
    if (pack === 'core') continue;
    const candidates = catalog.capabilities.filter(row => packOf.get(row.id) === pack && row.database.tables.includes(table)).map(row => row.id);
    const contract = declarations.sharedTables.find(shared => shared.table === table);
    const owner = candidates.length === 1 ? candidates[0] : contract?.consumers.find(consumer => candidates.includes(consumer));
    if (!owner) fail(`table has no single owning feature in its pack: ${table} (${pack}: ${candidates.join(', ') || 'none'})`);
    tableOwner.set(table, owner);
  }
  const sequenceOwner = new Map();
  for (const row of catalog.capabilities) for (const sequence of row.database.explicitSequences) {
    if (sequencePack.get(sequence) !== packOf.get(row.id)) continue;
    if (sequenceOwner.has(sequence)) fail(`sequence is mapped by two features of its pack: ${sequence}`);
    sequenceOwner.set(sequence, row.id);
  }
  const guidance = id => Object.entries(extras.unassigned).filter(([, row]) => row.owner === id).sort(([left], [right]) => byCodeUnits(left, right))
    .map(([code, row]) => ({ code, bundle: row.bundle, protected: row.protected, effect: row.effect }));
  const files = {};
  for (const id of Object.keys(declarations.features).sort(byCodeUnits)) {
    const feature = declarations.features[id];
    const area = extras.presentation.areas.find(row => row.domains.includes(id));
    if (!area) fail(`feature has no presentation area: ${id}`);
    const support = declarations.supportFiles().get(id) ?? [];
    files[`${id}.json`] = {
      schemaVersion: 2, id, label: feature.label,
      presentation: { area: area.id, order: area.domains.indexOf(id), summary: extras.presentation.summaries[id] },
      backend: { frontendOnly: declarations.frontendOnly.some(row => row.domain === id), supportFiles: [...support] },
      owns: {
        tables: [...tableOwner].filter(([, owner]) => owner === id).map(([table]) => table).sort(byCodeUnits),
        sequences: [...sequenceOwner].filter(([, owner]) => owner === id).map(([sequence]) => sequence).sort(byCodeUnits),
        sharedTables: declarations.sharedTables.filter(shared => tableOwner.get(shared.table) === id)
          .map(shared => ({ table: shared.table, consumers: [...shared.consumers], reason: shared.reason })),
        frontend: [...feature.paths],
        frontendAny: declarations.jointFrontend.filter(rule => rule.domains[0] === id).map(rule => ({ path: rule.path, with: rule.domains.slice(1) })),
        routes: [...feature.routes], exactRoutes: [...(feature.exactRoutes ?? [])], menuTabs: [...(feature.menuTabs ?? [])],
        permissionDomains: [...feature.permissions],
        gates: Object.entries(extras.gateOwners).filter(([, owners]) => owners[0] === id)
          .map(([file, owners]) => ({ file, alsoRequires: owners.slice(1) })),
        rbacMatrix: extras.rbac.domains.includes(id)
          ? { surfaces: Object.entries(extras.rbac.surfaces).filter(([, owner]) => owner === id).map(([surface]) => surface) } : null,
        markerBlocks: extras.markerFiles.flatMap(row => Object.entries(row.owners).filter(([, owners]) => owners[0] === id)
          .map(([token, owners]) => ({ file: row.file, token, blocks: row.blocks[token], alsoRequires: owners.slice(1), step: row.step, reason: row.reason }))),
        commonCodeGroups: Object.entries(extras.codeGroupOwners).filter(([, owner]) => owner === id).map(([group]) => group).sort(byCodeUnits),
      },
      dependsOn: [
        ...declarations.bundleEdges.filter(edge => edge.from === id).map(edge => ({ to: edge.to, kind: 'bundle', reason: edge.reason, evidence: edge.evidence })),
        ...declarations.uiDependencies.filter(edge => edge.from === id)
          .map(edge => ({ to: edge.domain, kind: 'ui-import', reason: edge.reason, evidence: edge.evidence, symbol: edge.symbol })),
      ],
      foreignKeys: [...declarations.requiredForeignKeys.map(fk => ({ fk, required: true })), ...declarations.optionalForeignKeys.map(fk => ({ fk, required: false }))]
        .filter(({ fk }) => fk.sourceDomain === id)
        .map(({ fk, required }) => ({ name: fk.name, childTable: fk.childTable, to: fk.targetDomain, parentTable: fk.parentTable, required,
          reason: fk.reason, evidence: fk.evidence })),
      requires: Object.entries(declarations.userReasons).filter(([key]) => key.split('>')[0] === id)
        .map(([key, userReason]) => ({ to: key.split('>')[1], userReason })).sort((left, right) => byCodeUnits(left.to, right.to)),
      integrates: declarations.integrates.filter(edge => edge.from === id).map(integrationRow),
      registrationOnly: {
        events: declarations.registrationOnlyEvents.filter(row => row.from === id).map(row => ({ to: row.to, event: row.event, reason: row.reason })),
        contributions: declarations.registrationOnlyContributions.filter(row => row.path.startsWith(`frontend/src/extensions/${id}/`))
          .map(row => ({ path: row.path, reason: row.reason })),
        ports: registrationPortRows(declarations, id),
      },
      requirements: [...(feature.requirements ?? [])],
      unassignedPermissions: guidance(id),
    };
  }
  const corePack = manifest.packs.core;
  const ownedContributions = new Set(Object.values(files).flatMap(file => file.registrationOnly.contributions.map(row => row.path)));
  const orphanContributions = declarations.registrationOnlyContributions.filter(row => !ownedContributions.has(row.path));
  if (orphanContributions.length) fail(`registration-only contribution is outside every feature's slot directory: ${orphanContributions.map(row => row.path).join(', ')}`);
  files['core.json'] = {
    schemaVersion: 2, id: 'core',
    backend: { modules: [...corePack.backend.modules] },
    owns: { tables: [...corePack.database.tables].sort(byCodeUnits), sequences: [...corePack.database.sequences].sort(byCodeUnits) },
    presentation: { areas: extras.presentation.areas.map(area => ({ id: area.id, label: area.label })) },
    integrates: declarations.integrates.filter(edge => edge.from === 'core').map(integrationRow),
    registrationOnly: {
      events: declarations.registrationOnlyEvents.filter(row => row.from === 'core').map(row => ({ to: row.to, event: row.event, reason: row.reason })),
      contributions: [],
      ports: registrationPortRows(declarations, 'core'),
    },
    unassignedPermissions: guidance('core'),
  };
  files['presets.json'] = {
    schemaVersion: 2,
    presets: catalog.presets.map(preset => ({ id: preset.id, label: extras.presentation.presetLabels[preset.id], description: extras.presetExpectations[preset.id].description,
      domains: [...preset.domains], expected: { gates: extras.presetExpectations[preset.id].gates, gateRemovalRules: extras.presetExpectations[preset.id].gateRemovalRules,
        javaCascade: extras.presetExpectations[preset.id].javaCascade } })),
  };
  return files;
}

export const serializeModuleFile = value => `${JSON.stringify(value, null, 2)}\n`;

/** 디스크의 v2 파일과 생성 결과의 차이. `_schema.json` 밖에 생성되지 않는 파일이 남아도 차이다. */
export function composerModuleDrift(root = ROOT) {
  const expected = composerModuleFiles(root);
  return { expected, drift: moduleFileDrift(join(resolve(root), MODULES_DIRECTORY), expected) };
}

/** `directory` 의 v2 파일과 `expected`(composerModuleFiles 결과)의 차이 목록. */
export function moduleFileDrift(directory, expected) {
  let present = [];
  try { present = readdirSync(directory).filter(name => name.endsWith('.json') && name !== MODULES_SCHEMA); } catch { present = []; }
  const drift = [];
  for (const [name, value] of Object.entries(expected)) {
    let actual = null;
    try { actual = readFileSync(join(directory, name), 'utf8').replace(/\r\n/g, '\n'); } catch { actual = null; }
    if (actual === null) drift.push(`missing ${MODULES_DIRECTORY}/${name}`);
    else if (actual !== serializeModuleFile(value)) drift.push(`stale ${MODULES_DIRECTORY}/${name}`);
  }
  for (const name of present) if (!Object.hasOwn(expected, name)) drift.push(`unexpected ${MODULES_DIRECTORY}/${name}`);
  return drift;
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const mode = process.argv[2];
  if (!['--write', '--check'].includes(mode)) {
    console.error('사용법: node scripts/composer-modules-generate.mjs --write | --check');
    process.exit(2);
  }
  try {
    const { expected, drift } = composerModuleDrift(ROOT);
    if (mode === '--check') {
      if (drift.length) {
        console.error(`[modules] v1 선언과 config/modules 가 다르다. npm run modules:generate 로 다시 만든다.\n${drift.join('\n')}`);
        process.exit(1);
      }
      console.log(`[modules] ${Object.keys(expected).length}개 파일이 v1 선언과 같다.`);
      console.log(`[modules] ${validateComposerModuleSchema(ROOT)}개 파일이 ${MODULES_SCHEMA} 과 맞다.`);
    } else {
      const directory = join(ROOT, MODULES_DIRECTORY);
      mkdirSync(directory, { recursive: true });
      for (const line of drift.filter(line => line.startsWith('unexpected '))) {
        console.error(`[modules] 생성하지 않는 파일이 남아 있다(지우지 않는다): ${line.slice('unexpected '.length)}`);
      }
      for (const [name, value] of Object.entries(expected)) writeFileSync(join(directory, name), serializeModuleFile(value));
      console.log(`[modules] ${Object.keys(expected).length}개 파일을 썼다(바뀐 파일 ${drift.filter(line => !line.startsWith('unexpected ')).length}).`);
      console.log(`[modules] ${validateComposerModuleSchema(ROOT)}개 파일이 ${MODULES_SCHEMA} 과 맞다.`);
      if (drift.some(line => line.startsWith('unexpected '))) process.exit(1);
    }
  } catch (error) {
    console.error(`[modules] ${error.message}`);
    process.exit(1);
  }
}
