import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { compositionDiff } from './project-composer-diff.mjs';
import { projectCompositionMenus } from './project-composer-db.mjs';
import { loadProjectComposerMenus } from './project-composer-menu-preview.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { createComposerEngine, diffSummary } from './project-composer.mjs';

const root = resolve(import.meta.dirname, '..');
const catalog = loadProjectComposerCatalog(root);
const menus = loadProjectComposerMenus(root).menus;
const recipe = selection => ({ schemaVersion: 1, project: { name: 'agency-project' }, sourceRef: 'HEAD', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });
const diffOf = (selection, domain, source = catalog) => compositionDiff({ catalog: source, menus, recipe: recipe(selection), domain });
const menuCount = composition => projectCompositionMenus({ menus, menuRoutes: composition.menuRoutes, excludedMenuTabs: composition.excludedMenuTabs }).menus.length;

/*
 * 계획 차이(설계서 10장 POST /api/plan/diff, E3). 카드를 누르기 전에 무엇이 늘고 주는지 보인다.
 * 화면처럼 누르면 직접 선택이 되므로, 차이는 '지금 구성'과 '하나를 더하거나 뺀 직접 선택'의 해석 결과다.
 */
test('adding or removing one feature reports exactly the resolver difference for every single selection', () => {
  const empty = resolveProjectRecipe(recipe({ domains: [] }), catalog);
  for (const { id } of catalog.capabilities) {
    const alone = resolveProjectRecipe(recipe({ domains: [id] }), catalog);
    const added = diffOf({ domains: [] }, id);
    assert.equal(added.action, 'add', id);
    assert.deepEqual(added.added, alone.resolvedDomains, id);
    assert.deepEqual(added.removed, [], id);
    assert.deepEqual(added.counts.tables, [empty.tables.length, alone.tables.length], id);
    assert.deepEqual(added.counts.permissions, [empty.permissionCodes.length, alone.permissionCodes.length], id);
    assert.deepEqual(added.counts.menus, [menuCount(empty), menuCount(alone)], id);
    const removed = diffOf({ domains: [id] }, id);
    assert.equal(removed.action, 'remove', id);
    assert.deepEqual(removed.removed, alone.resolvedDomains, id);
    assert.deepEqual(removed.retainedBy, [], id);
    assert.deepEqual(removed.counts.tables, [alone.tables.length, empty.tables.length], id);
  }
});

test('a feature that another selection still requires stays, and the diff names what holds it', () => {
  const kept = diffOf({ domains: ['board', 'comment'] }, 'comment');
  assert.deepEqual(kept.retainedBy, ['board']);
  assert.deepEqual([kept.added, kept.removed], [[], []]);
  assert.equal(diffSummary(kept, catalog), '빼도 게시판·지식이 요구해 계속 포함됩니다.');
  // 시작 구성에서 카드를 누르면 직접 선택으로 바뀐다. 협업 기본에서 게시판을 빼도 다른 선택이 게시판을 붙잡는다.
  const preset = diffOf({ preset: 'collaboration' }, 'board');
  assert.equal(preset.action, 'remove');
  assert.deepEqual(preset.retainedBy, ['comment', 'dashboard', 'note', 'scrap']);
  // 직접 선택으로 바뀌며 시작 구성이 건너뛰던 의존이 들어온다. 붙잡힌다는 말만 하고 그 변화를 감추지 않는다.
  assert.deepEqual(preset.added, ['help', 'system', 'template']);
  assert.match(diffSummary(preset, catalog),
    /^빼도 댓글, 실시간 대시보드, 쪽지, 스크랩이 요구해 계속 포함됩니다 · 기능 \+3\(들어옴: 도움말·온라인 매뉴얼, 커뮤니티·배너·팝업, 템플릿\) · 테이블 \+\d+ · 메뉴 \+\d+ · 권한 \+\d+/);
});

test('degradations appear when a partner is missing and resolve only when the partner arrives', () => {
  const key = edge => `${edge.from}>${edge.to}`;
  const keys = edges => edges.map(key).sort();
  assert.deepEqual(keys(diffOf({ domains: [] }, 'mail').degraded.added), ['mail>addressbook', 'mail>notification']);
  assert.deepEqual(keys(diffOf({ domains: ['mail'] }, 'notification').degraded.resolved), ['core>notification', 'mail>notification']);
  assert.deepEqual(keys(diffOf({ domains: ['mail', 'notification'] }, 'notification').degraded.added), ['core>notification', 'mail>notification']);
  // 출발 기능을 빼서 함께 사라진 저하는 해소가 아니다.
  assert.deepEqual(diffOf({ domains: ['mail'] }, 'mail').degraded.resolved, []);
});

test('a selection that would break a required foreign key is reported as a blocker', () => {
  const { catalogHash, ...body } = structuredClone(catalog);
  body.capabilities.find(capability => capability.id === 'operation').requires = [];
  const loose = { ...body, catalogHash: compositionDigest(body) };
  const diff = diffOf({ domains: [] }, 'operation', loose);
  assert.deepEqual(diff.blockers, ['fk_tb_rward_manage_tb_ifml_atrz_info']);
  assert.match(diffSummary(diff, loose), / · 필수 외래 키 때문에 생성할 수 없습니다$/);
  assert.throws(() => diffOf({ domains: [] }, 'retired'), /Unknown domain: retired/);
});

test('the diff sentence uses signed counts, puts the toggled feature first and shortens long lists', () => {
  assert.match(diffSummary(diffOf({ domains: [] }, 'mail'), catalog), /^고르면 기능 \+1 · 테이블 \+1 · 메뉴 \+\d+ · 권한 \+\d+ · 줄어드는 동작 2건 생김$/);
  assert.match(diffSummary(diffOf({ domains: ['mail'] }, 'mail'), catalog), /^빼면 기능 −1 · 테이블 −1 · 메뉴 −\d+ · 권한 −\d+$/);
  assert.match(diffSummary(diffOf({ domains: ['mail'] }, 'notification'), catalog), / · 줄어들던 동작 2건 해소$/);
  const note = diffSummary(diffOf({ domains: [] }, 'note'), catalog);
  assert.match(note, /^고르면 기능 \+7\(들어옴: 쪽지, [^)]+ 외 4개\) · /);
  assert.doesNotMatch(note, /[A-Za-z]/);
  assert.match(diffSummary(diffOf({ domains: ['note'] }, 'note'), catalog), /^빼면 기능 −7\(빠짐: 쪽지, [^)]+ 외 4개\) · /);
  // 하나를 빼는데 다른 기능이 들어오면 양쪽을 모두 밝힌다(순 증감만 보이면 무엇이 빠지는지 알 수 없다).
  assert.match(diffSummary(diffOf({ preset: 'collaboration' }, 'dashboard'), catalog), /^빼면 기능 \+2\(들어옴: [^;]+; 빠짐: 실시간 대시보드\) · /);
});

test('the engine reuses the last loaded catalog for diffs and never reloads it per preview', () => {
  // 두 번째 적재부터는 게시판 이름이 바뀐 카탈로그를 돌려준다. 계획 뒤 미리보기가 새 카탈로그를 쓰는지 이름으로 확인한다.
  const { catalogHash, ...body } = structuredClone(catalog);
  body.capabilities.find(capability => capability.id === 'board').label = '새 게시판';
  const renamed = { ...body, catalogHash: compositionDigest(body) };
  const latest = structuredClone(body);
  latest.capabilities.find(capability => capability.id === 'board').label = '최신 게시판';
  const versions = [catalog, renamed, { ...latest, catalogHash: compositionDigest(latest) }];
  let loads = 0;
  const engine = createComposerEngine({ root, loadCatalog: () => { loads += 1; return versions[Math.min(loads, versions.length) - 1]; } });
  const kept = () => engine.diff(recipe({ domains: ['board', 'comment'] }), 'comment').summary;
  assert.equal(kept(), '빼도 게시판·지식이 요구해 계속 포함됩니다.');
  assert.equal(loads, 1);
  for (let index = 0; index < 5; index += 1) engine.diff(recipe({ domains: ['mail'] }), 'survey');
  assert.equal(loads, 1, 'previews reuse the loaded catalog');
  // 계획은 카탈로그를 새로 적재하고, 이후 미리보기는 그 카탈로그를 쓴다.
  engine.plan(recipe({ domains: ['mail'] }));
  assert.equal(loads, 2);
  assert.equal(kept(), '빼도 새 게시판이 요구해 계속 포함됩니다.');
  assert.equal(loads, 2);
  // 화면이 카탈로그를 다시 받으면(재연결) 미리보기도 그 카탈로그를 쓴다.
  engine.catalog();
  assert.equal(loads, 3);
  assert.equal(kept(), '빼도 최신 게시판이 요구해 계속 포함됩니다.');
  assert.equal(loads, 3);
});
