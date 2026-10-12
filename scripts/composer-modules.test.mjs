/*
 * 매니페스트 v2(config/modules) 계약(11단계 C1).
 *
 * 1. v2 파일은 v1 선언에서 만든 파생물이다 — 디스크와 생성 결과가 같아야 한다(전환 C7 까지).
 * 2. 임시 동치 계약: 로더가 v2 JSON 만으로 만든 카탈로그와 해시 밖 선언이 v1 과 같다. v2 쪽은 manifest 가 없는 트리에서 만든다 —
 *    같은 데이터를 두 번 읽는 착시를 막는다(설계서 위험 8). v1 에만 있는 pack 축(capability.pack, 시작 구성의 pack·removePaths,
 *    공유 계약의 ownerPack)은 전환 전 생성기 pack 모드를 위한 값이라 비교에서 뺀다. 순서가 뜻이 없는 배열(화면 규칙·외래 키)은
 *    정렬해 비교한다.
 * 3. 스키마·파일 사이 대조·소스 대조가 선언 오류를 이유와 함께 거부한다.
 */
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { buildProjectComposerCatalog, canonicalJson, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { MODULES_DIRECTORY, derivedRemovedGates, loadComposerModules } from './composer-modules.mjs';
import { composerModuleDrift, moduleFileDrift, v1ComposerExtras } from './composer-modules-generate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const v1Catalog = loadProjectComposerCatalog(ROOT);
const modules = loadComposerModules(ROOT);

const byPath = (left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
const byName = (left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
/** v1 의 pack 축을 빼고, 순서가 뜻이 없는 배열을 정렬한 카탈로그 본문. */
function comparable(catalog) {
  const { provenance, catalogHash, ...body } = catalog;
  return JSON.parse(canonicalJson({
    ...body,
    capabilities: body.capabilities.map(({ pack, ...rest }) => rest),
    presets: body.presets.map(({ packs, frontendRemovePaths, ...rest }) => rest),
    sharedTableContracts: body.sharedTableContracts.map(({ ownerPack, ...rest }) => rest),
    frontendRules: [...body.frontendRules].sort(byPath),
    requiredForeignKeys: [...body.requiredForeignKeys].sort(byName),
    optionalForeignKeys: [...body.optionalForeignKeys].sort(byName),
  }));
}

/**
 * v2 만 있는 트리: 카탈로그가 읽는 저장소 사실과 config/modules 를 복사하고 v1 manifest 는 두지 않는다. 시험끼리 한 트리를 쓰고
 * 기능 파일을 고친 시험은 원본으로 되돌린다(복사 비용이 커서다).
 */
let shared;
function modulesOnlyFixture() {
  if (shared) return shared;
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-composer-modules-'));
  const copy = path => { mkdirSync(dirname(join(root, path)), { recursive: true }); cpSync(join(ROOT, path), join(root, path), { recursive: true }); };
  for (const path of [MODULES_DIRECTORY, 'config/governance/permission-catalog.json', 'config/project-composer-menus.json']) copy(path);
  for (const module of ['foundation', 'business-core', 'business-app', 'api-server']) copy(`${module}/src/main/java`);
  const { declarations } = modules;
  for (const path of v1Catalog.frontendRules.map(rule => rule.path)) copy(`frontend/${path}`);
  copy('frontend/src/extensions');
  for (const file of new Set([...declarations.integrates.flatMap(edge => edge.anchors ?? []).map(anchor => anchor.path),
    ...declarations.uiDependencies.map(edge => edge.evidence), ...[...declarations.requiredForeignKeys, ...declarations.optionalForeignKeys].map(fk => fk.evidence),
    ...[...declarations.supportFiles().values()].flat()])) copy(file);
  shared = root;
  return root;
}
after(() => {
  if (!shared) return;
  const child = relative(resolve(tmpdir()), shared);
  assert.ok(child.startsWith('egov-composer-modules-') && !child.includes(sep));
  rmSync(shared, { recursive: true, force: true });
});
const restoreModule = (root, name) => writeFileSync(join(root, MODULES_DIRECTORY, name), readFileSync(join(ROOT, MODULES_DIRECTORY, name), 'utf8'));

const editModule = (root, name, edit) => {
  const path = join(root, MODULES_DIRECTORY, name);
  const value = JSON.parse(readFileSync(path, 'utf8'));
  edit(value);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};

let generated;
test('config/modules is the v1 declarations rewritten as feature files (regenerate with npm run modules:generate)', () => {
  const { expected, drift } = composerModuleDrift(ROOT);
  generated = expected;
  assert.deepEqual(drift, []);
  assert.equal(Object.keys(expected).length, v1Catalog.capabilities.length + 2, 'one file per feature plus core.json and presets.json');
  assert.deepEqual(Object.keys(modules.declarations.features).sort(), v1Catalog.capabilities.map(row => row.id));
});

test('the catalog built from config/modules alone equals the v1 catalog apart from the v1 pack axis', () => {
  const root = modulesOnlyFixture();
  const v2Catalog = buildProjectComposerCatalog(root, loadComposerModules(root).declarations);
  assert.deepEqual(comparable(v2Catalog), comparable(v1Catalog));
  // v2 카탈로그에는 pack 축이 없다. 전환 전 생성기가 쓰는 pack 축은 v1 manifest 에서만 온다.
  assert.ok(v2Catalog.capabilities.every(row => !Object.hasOwn(row, 'pack')));
  assert.ok(v2Catalog.presets.every(row => !Object.hasOwn(row, 'packs') && !Object.hasOwn(row, 'frontendRemovePaths')));
  assert.deepEqual(Object.keys(v2Catalog.provenance).sort(), ['modules', 'modulesHash', 'permissions', 'permissionsHash', 'sourceInventoryHash']);
});

test('the declarations outside the catalog hash equal their v1 constants', () => {
  assert.deepEqual(JSON.parse(canonicalJson(modules.extras)), JSON.parse(canonicalJson(v1ComposerExtras(ROOT))));
  // 시작 구성의 게이트 기대치는 기능 파일의 게이트 소유에서 계산한 목록과 정확히 같다(직접 선택 승인과 같은 규칙).
  for (const preset of modules.declarations.presets) {
    assert.deepEqual(modules.extras.presetExpectations[preset.id].gates.map(row => row.file).sort(), derivedRemovedGates(modules.extras, preset.domains), preset.id);
  }
});

test('the schema, cross-file checks and source checks refuse a broken feature file with its reason', () => {
  const root = modulesOnlyFixture();
  const restore = name => restoreModule(root, name);
  // 스키마: 모르는 키.
  editModule(root, 'board.json', value => { value.owns.bogus = []; });
  assert.throws(() => loadComposerModules(root), /board\.json does not match _schema\.json: \/owns must NOT have additional properties \(bogus\)/);
  restore('board.json');
  // 파일 사이: 같은 테이블을 두 기능이 소유.
  editModule(root, 'comment.json', value => { value.owns.tables.push('tb_bbs_item'); });
  assert.throws(() => loadComposerModules(root), /duplicate table owner: tb_bbs_item \(board, comment\)/);
  restore('comment.json');
  // 소스 대조: 엔티티가 매핑하는 테이블을 선언에서 빼면 거부한다.
  editModule(root, 'board.json', value => { value.owns.tables = value.owns.tables.filter(table => table !== 'tb_bbs_item'); });
  assert.throws(() => buildProjectComposerCatalog(root, loadComposerModules(root).declarations), /entity table absent from module: board\/tb_bbs_item/);
  restore('board.json');
  // 소스 대조: 계산된 간선(도움말 → 게시판 화면 의존)에 사용자 문장이 없으면 거부한다.
  editModule(root, 'help.json', value => { value.requires = value.requires.filter(row => row.to !== 'board'); });
  assert.throws(() => buildProjectComposerCatalog(root, loadComposerModules(root).declarations), /requires edge lacks a user reason: help>board/);
  restore('help.json');
  // 시작 구성 기대치: 게이트 소유가 바뀌었는데 기대치가 그대로면 거부한다.
  editModule(root, 'presets.json', value => { value.presets.find(row => row.id === 'core').expected.gates.pop(); });
  assert.throws(() => loadComposerModules(root), /preset core expected gates differ from gate ownership \(missing: [^;]+; stale: -\)/);
  restore('presets.json');
  // 파일 이름은 기능 id 다.
  editModule(root, 'isg.json', value => { value.id = 'guide'; });
  assert.throws(() => loadComposerModules(root), /file name differs from its feature id: isg\.json \(guide\)/);
  // 깨진 JSON 도 선언 오류다(런타임 결함 SyntaxError 로 새지 않는다).
  writeFileSync(join(root, MODULES_DIRECTORY, 'isg.json'), '{');
  assert.throws(() => loadComposerModules(root), error => error.constructor === Error && /isg\.json is not valid JSON/.test(error.message));
  restore('isg.json');
  assert.equal(buildProjectComposerCatalog(root, loadComposerModules(root).declarations).capabilities.length, v1Catalog.capabilities.length);
});

test('a v1 edit without regeneration is reported as drift instead of being followed silently', () => {
  const root = modulesOnlyFixture();
  const directory = join(root, MODULES_DIRECTORY);
  assert.deepEqual(moduleFileDrift(directory, generated), []);
  editModule(root, 'mail.json', value => { value.presentation.summary = '메일 발송'; });
  writeFileSync(join(directory, 'extra.json'), '{}');
  rmSync(join(directory, 'isg.json'));
  try {
    assert.deepEqual(moduleFileDrift(directory, generated),
      ['missing config/modules/isg.json', 'stale config/modules/mail.json', 'unexpected config/modules/extra.json']);
  } finally {
    rmSync(join(directory, 'extra.json'));
    for (const name of ['mail.json', 'isg.json']) restoreModule(root, name);
  }
});
