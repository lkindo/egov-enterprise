/*
 * 매니페스트 v2(config/modules) 계약(11단계 C1·C2·C7).
 *
 * 1. config/modules 는 기능 소유의 유일한 원천이다(C7 전환). 실제 파일이 스키마(_schema.json, ajv)와 맞고, 걷은 v1 소유 선언
 *    (RETIRED_OWNERSHIP_DECLARATION)이 되살아나면 모든 읽는 자리가 '옛 소유 선언이 남아 있다' 로 멈춘다. 스키마 검사는 로더 밖
 *    (composer-modules-schema.mjs)에 있다 — 로더는 생성기 import 폐포에 들어가 Node 내장 모듈만 쓴다.
 * 2. 파일 사이 대조·소스 대조가 선언 오류를 이유와 함께 거부한다.
 * 3. 출처 해시(modulesHash)는 화면 문구·미배정 권한 안내를 빼고 계산한다 — 문구만 고치면 카탈로그 해시가 그대로다.
 * 4. 시작 구성은 필수 의존 폐포에 닫힌 이름 붙은 기능 목록이고, 게이트 기대치는 기능 파일의 게이트 소유에서 계산한 목록과 같다.
 * 5. 생성물 표지(presets.json 의 active)는 생성기 투영 구조와 함께만 인정한다.
 */
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import test, { after } from 'node:test';
import { buildProjectComposerCatalog, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { GENERATED_LOCK, MODULES_DIRECTORY, RETIRED_OWNERSHIP_DECLARATION, derivedRemovedGates, detectGeneratedComposition,
  loadComposerModules, readComposerModuleFiles } from './composer-modules.mjs';
import { validateComposerModuleSchema } from './composer-modules-schema.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const loadedCatalog = loadProjectComposerCatalog(ROOT);
const modules = loadComposerModules(ROOT);

/**
 * 카탈로그가 읽는 저장소 사실과 config/modules 만 담은 트리. 시험끼리 한 트리를 쓰고 기능 파일을 고친 시험은 원본으로 되돌린다
 * (복사 비용이 커서다).
 */
let shared;
function modulesFixture() {
  if (shared) return shared;
  const base = resolve(tmpdir());
  const root = mkdtempSync(join(base, 'egov-composer-modules-'));
  const copy = path => { mkdirSync(dirname(join(root, path)), { recursive: true }); cpSync(join(ROOT, path), join(root, path), { recursive: true }); };
  for (const path of [MODULES_DIRECTORY, 'config/governance/permission-catalog.json', 'config/project-composer-menus.json']) copy(path);
  for (const module of ['foundation', 'business-core', 'business-app', 'api-server']) copy(`${module}/src/main/java`);
  const { declarations } = modules;
  for (const path of loadedCatalog.frontendRules.map(rule => rule.path)) copy(`frontend/${path}`);
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

test('config/modules matches its schema and the catalog reads it alone', () => {
  // 로더는 스키마를 보지 않으므로 실제 파일의 스키마 검사는 여기서 한다.
  assert.equal(validateComposerModuleSchema(ROOT), Object.keys(readComposerModuleFiles(ROOT)).length);
  assert.equal(Object.keys(modules.files).length, loadedCatalog.capabilities.length + 2, 'one file per feature plus core.json and presets.json');
  assert.deepEqual(Object.keys(modules.declarations.features).sort(), loadedCatalog.capabilities.map(row => row.id));
  // 카탈로그의 출처는 기능 파일과 권한 원장·소스뿐이다(v1 manifest 출처를 C7 에서 걷었다).
  assert.deepEqual(Object.keys(loadedCatalog.provenance).sort(), ['modules', 'modulesHash', 'permissions', 'permissionsHash', 'sourceInventoryHash']);
  assert.ok(loadedCatalog.capabilities.every(row => !Object.hasOwn(row, 'pack')));
  assert.ok(loadedCatalog.presets.every(row => !Object.hasOwn(row, 'packs') && !Object.hasOwn(row, 'frontendRemovePaths')));
  // 같은 기능 파일만 있는 트리에서도 같은 카탈로그가 나온다 — 저장소의 다른 선언 파일에 기대지 않는다.
  const root = modulesFixture();
  assert.equal(buildProjectComposerCatalog(root, loadComposerModules(root).declarations).catalogHash, loadedCatalog.catalogHash);
});

/*
 * [11단계 C7] 걷은 v1 소유 선언이 되살아나면 아무 소비자도 읽지 않는 두 번째 소유 선언이 조용히 낡아 간다. 로더·카탈로그·생성물 표지
 * 판정이 모두 읽기 전에 멈춘다(생산 코드의 다른 참조는 project-composer-source.test.mjs 의 grep 계약이 막는다).
 */
test('a restored old ownership declaration stops the loader, the catalog and the generated-product marker', () => {
  const root = modulesFixture();
  const retired = join(root, RETIRED_OWNERSHIP_DECLARATION);
  mkdirSync(dirname(retired), { recursive: true });
  writeFileSync(retired, '{}\n');
  try {
    for (const read of [() => readComposerModuleFiles(root), () => loadComposerModules(root), () => loadProjectComposerCatalog(root),
      () => detectGeneratedComposition(root)]) {
      assert.throws(read, /old ownership declaration remains: config\/reusable-base-profiles\.json/);
    }
  } finally {
    rmSync(retired, { force: true });
  }
  assert.doesNotThrow(() => loadComposerModules(root));
});

test('a preset that is not closed under requires is a catalog defect, not something the resolver widens', () => {
  const root = modulesFixture();
  // 시작 구성도 직접 선택과 같은 간선을 따른다(해석기 단일화). 닫히지 않은 목록은 적재 때 거부한다.
  editModule(root, 'presets.json', value => { value.presets.find(row => row.id === 'core').domains = ['scrap']; });
  try {
    assert.throws(() => buildProjectComposerCatalog(root, loadComposerModules(root).declarations),
      /preset is not closed under requires: core \(scrap -> board, comment\)/);
  } finally {
    restoreModule(root, 'presets.json');
  }
});

test('preset gate expectations equal the gates derived from feature gate ownership', () => {
  // 시작 구성의 게이트 기대치는 기능 파일의 게이트 소유에서 계산한 목록과 정확히 같다(직접 선택 승인과 같은 규칙).
  for (const preset of modules.declarations.presets) {
    assert.deepEqual(modules.extras.presetExpectations[preset.id].gates.map(row => row.file).sort(), derivedRemovedGates(modules.extras, preset.domains), preset.id);
  }
});

test('a preset kept out of pull requests must state that main verifies both layouts (DEC-OPS-296)', () => {
  // ci.pr 이 null 이면 PR 에서 빼고 main·T2 에서만 돈다. 그때 main 을 적지 않거나 한 레이아웃으로 줄이면 스키마가 거부한다 —
  // 'PR 에서 뺀다' 가 'CI 에서 뺀다' 로 바뀌지 않게 한다. 분류기도 같은 규칙을 따로 검사한다(ci-change-scope.test.mjs).
  const root = modulesFixture();
  const surveyCi = ci => editModule(root, 'presets.json', value => { value.presets.find(row => row.id === 'survey').ci = ci; });
  const index = modules.declarations.presets.findIndex(row => row.id === 'survey');
  try {
    assert.deepEqual(modules.files['presets.json'].presets[index].ci, { pr: null, main: ['multi-module', 'single-module'] });
    surveyCi({ pr: null });
    assert.throws(() => validateComposerModuleSchema(root),
      new RegExp(`presets\\.json does not match _schema\\.json: .*/presets/${index}/ci must have required property 'main'`));
    surveyCi({ pr: null, main: ['single-module'] });
    assert.throws(() => validateComposerModuleSchema(root), new RegExp(`/presets/${index}/ci/main must NOT have fewer than 2 items`));
    surveyCi({ pr: null, main: ['single-module', 'single-module'] });
    assert.throws(() => validateComposerModuleSchema(root), new RegExp(`/presets/${index}/ci/main must NOT have duplicate items`));
    // 대조군: PR 레이아웃을 하나 고른 구성은 main 을 적지 않아도 된다(main 은 늘 두 레이아웃이다).
    surveyCi({ pr: 'single-module' });
    assert.equal(validateComposerModuleSchema(root), Object.keys(modules.files).length);
  } finally {
    restoreModule(root, 'presets.json');
  }
});

test('copy in config/modules stays outside the catalog hash, while a user sentence is inside it', () => {
  // 화면 문구·미배정 권한 안내는 v1 에서도 해시 밖이었다(DEC-OPS-242 ④·244). 출처 해시가 기능 파일 전체를 덮으면 문구만 고쳐도
  // 카탈로그 해시·모든 구성 해시와 로컬 DB 번들 lock 이 바뀐다. 카탈로그 본문에 문구 문자열이 없다는 것만으로는 이를 보지 못한다.
  const root = modulesFixture();
  const hashOf = () => buildProjectComposerCatalog(root, loadComposerModules(root).declarations).catalogHash;
  const before = hashOf();
  const edited = ['mail.json', 'core.json', 'presets.json', 'board.json', 'help.json'];
  try {
    editModule(root, 'mail.json', value => { value.presentation.summary = '메일 보내기'; });
    editModule(root, 'core.json', value => { value.presentation.areas[0].label = '소통'; });
    editModule(root, 'presets.json', value => {
      const preset = value.presets.find(row => row.id === 'collaboration');
      preset.label = '협업';
      preset.description = '바꾼 설명';
      // CI 범위(PR 레이아웃, ADR-0027)도 생성 결과를 바꾸지 않는다(11단계 C5).
      preset.ci = { pr: 'single-module' };
    });
    editModule(root, 'board.json', value => { value.unassignedPermissions[0].effect = '바꾼 안내입니다.'; });
    assert.equal(hashOf(), before, 'copy edits changed the catalog hash');
    // 대조군: 사용자 문장은 카탈로그 본문(requires.userReason)이라 해시가 바뀐다.
    editModule(root, 'help.json', value => { value.requires.find(row => row.to === 'board').userReason = '바꾼 사유입니다.'; });
    assert.notEqual(hashOf(), before, 'a user sentence edit must change the catalog hash');
  } finally {
    for (const name of edited) restoreModule(root, name);
  }
});

test('the schema, cross-file checks and source checks refuse a broken feature file with its reason', () => {
  const root = modulesFixture();
  const restore = name => restoreModule(root, name);
  // 스키마: 모르는 키.
  editModule(root, 'board.json', value => { value.owns.bogus = []; });
  assert.throws(() => validateComposerModuleSchema(root), /board\.json does not match _schema\.json: \/owns must NOT have additional properties \(bogus\)/);
  restore('board.json');
  assert.equal(validateComposerModuleSchema(root), Object.keys(modules.files).length);
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
  // 파일 안: 같은 대상의 행이 둘이면 뒤 행이 앞 행을 조용히 덮으므로 거부한다.
  editModule(root, 'help.json', value => { value.requires.push({ ...value.requires.find(row => row.to === 'board'), userReason: '다른 사유입니다.' }); });
  assert.throws(() => loadComposerModules(root), /help\.json requires names a feature twice: board/);
  restore('help.json');
  editModule(root, 'help.json', value => { value.dependsOn.push({ ...value.dependsOn.find(edge => edge.to === 'board') }); });
  assert.throws(() => loadComposerModules(root), /help\.json dependsOn names a feature twice: board \(ui-import\)/);
  restore('help.json');
  // 소스 대조: 한 화면 경로를 두 기능이 소유하면 한쪽만 고른 구성이 그 경로를 남기면서 지운다.
  editModule(root, 'mail.json', value => { value.owns.frontend.push('src/app/note'); });
  assert.throws(() => buildProjectComposerCatalog(root, loadComposerModules(root).declarations), /duplicate frontend path owner: src\/app\/note \(mail, note\)/);
  restore('mail.json');
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
  assert.equal(buildProjectComposerCatalog(root, loadComposerModules(root).declarations).capabilities.length, loadedCatalog.capabilities.length);
});

// 11단계 C5: 생성물 표지는 presets.json 의 active 다. 하네스·원장 계약·권한 생성기가 이 판정을 쓴다.
test('the generated-product marker needs the generator structure and cannot be spoofed by one field', (t) => {
  const base = mkdtempSync(join(resolve(tmpdir()), 'egov-composer-marker-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const tree = (name, files, { lock = false } = {}) => {
    const root = join(base, name);
    mkdirSync(join(root, MODULES_DIRECTORY), { recursive: true });
    for (const [file, value] of Object.entries(files)) writeFileSync(join(root, MODULES_DIRECTORY, file), JSON.stringify(value));
    if (lock) writeFileSync(join(root, GENERATED_LOCK), '{}');
    return root;
  };
  const presets = JSON.parse(readFileSync(join(ROOT, MODULES_DIRECTORY, 'presets.json'), 'utf8'));
  const survey = JSON.parse(readFileSync(join(ROOT, MODULES_DIRECTORY, 'survey.json'), 'utf8'));
  const collaboration = presets.presets.find(preset => preset.id === 'collaboration');
  // 원본: 표지가 없다.
  assert.deepEqual(detectGeneratedComposition(ROOT), { projection: false });
  // 생성물: 활성 구성 하나와 그 구성의 기능 파일만 있다.
  const generated = tree('generated', { 'presets.json': { schemaVersion: 2, active: 'custom', presets: [{ id: 'custom', domains: ['survey'] }] },
    'survey.json': survey }, { lock: true });
  assert.deepEqual(detectGeneratedComposition(generated), { projection: true, profile: 'custom', domains: ['survey'] });
  // 원본 presets.json 에 표지만 넣으면 구조가 아니다(시작 구성이 셋이다).
  assert.throws(() => detectGeneratedComposition(tree('spoofed', { 'presets.json': { ...presets, active: 'core' } })),
    /active='core' 인데 생성기 투영 구조가 아니다/);
  // 구성 밖 기능 파일이 남거나 구성의 기능 파일이 없어도 구조가 아니다.
  assert.throws(() => detectGeneratedComposition(tree('extra', { 'presets.json': { schemaVersion: 2, active: 'core',
    presets: [presets.presets.find(preset => preset.id === 'core')] }, 'survey.json': survey })), /생성기 투영 구조가 아니다/);
  assert.throws(() => detectGeneratedComposition(tree('missing', { 'presets.json': { schemaVersion: 2, active: 'collaboration',
    presets: [collaboration] } })), /생성기 투영 구조가 아니다/);
  // lock 이 있는 생성물에 표지가 없으면 원본으로 보지 않는다. presets.json 이 없으면 판정하지 못한다.
  assert.throws(() => detectGeneratedComposition(tree('unmarked', { 'presets.json': presets }, { lock: true })),
    /reusable-base-lock\.json 이 있는 생성물인데 config\/modules\/presets\.json 에 활성 구성 표지\(active\)가 없다/);
  assert.throws(() => detectGeneratedComposition(tree('absent', {}, { lock: true })), /ENOENT/);
});
