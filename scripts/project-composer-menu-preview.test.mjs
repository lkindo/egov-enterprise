import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertProjectComposerMenusMatch, COMPOSER_MENU_SNAPSHOT_PATH, loadProjectComposerMenus, menuInventorySqlInputs,
  projectComposerMenuPreview, projectMenuSourceHash, validateProjectComposerMenus,
  writeProjectComposerMenuSnapshot } from './project-composer-menu-preview.mjs';
import { ComposerError } from './project-composer-errors.mjs';

const inventory = {
  menus: [
    { menu_sn: 10, up_menu_sn: null, menu_ordr: 1, menu_nm: '관리 센터', menu_expln: null, modern_route: null, use_yn: 'Y', del_yn: 'N' },
    { menu_sn: 11, up_menu_sn: 10, menu_ordr: 2, menu_nm: '선택한 기능', menu_expln: null, modern_route: '/admin/help?tab=FAQ', use_yn: 'Y', del_yn: 'N' },
    { menu_sn: 12, up_menu_sn: 10, menu_ordr: 3, menu_nm: '제외한 기능', menu_expln: null, modern_route: '/admin/help?tab=COMMUNITY', use_yn: 'Y', del_yn: 'N' },
  ],
  navigation: [{ authrt_cd: 'ROLE_USER', menu_sn: 11 }, { authrt_cd: 'ROLE_ADMIN', menu_sn: 10 }],
};

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'composer-menu-'));
  const migrations = join(root, 'api-server/src/main/resources/db/migration');
  mkdirSync(migrations, { recursive: true });
  mkdirSync(join(root, 'api-server/src/main/resources/db/cutover'), { recursive: true });
  mkdirSync(join(root, 'config'));
  // baseline 은 메뉴 테이블을 만든다 — 해시가 고르는 입력이어야 아래 baseline 변경·CRLF 시험이 뜻을 갖는다.
  writeFileSync(join(migrations, 'V1_0__baseline.sql'), '-- V1_0__baseline.sql\nCREATE TABLE tb_menu_info (menu_sn bigint PRIMARY KEY);\n');
  for (const name of ['R__seed_framework.sql', 'R__zz_seed_base_admin.sql']) {
    writeFileSync(join(migrations, name), `-- ${name}\nSELECT 1;\n`);
  }
  writeFileSync(join(root, 'api-server/src/main/resources/db/cutover/authorization-contract.sql'), '-- reviewed Contract\nSELECT 1;\n');
  return { root, migrations };
}

test('checked-in menu preview is bound to the current migration, seed and Contract sources', () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  assert.doesNotThrow(() => loadProjectComposerMenus(root));
});

test('preview is the exact projected menu hierarchy with labels, not the frontend route inventory', () => {
  const { root } = fixture();
  try {
    writeProjectComposerMenuSnapshot(root, inventory);
    assert.deepEqual(projectComposerMenuPreview(root, { menuRoutes: ['/admin/help', '/screen-without-menu'],
      excludedMenuTabs: ['/admin/help?tab=COMMUNITY'] }), [
      { id: 10, label: '관리 센터', parent: null, path: null, order: 1, kind: 'category' },
      { id: 11, label: '선택한 기능', parent: 10, path: '/admin/help?tab=FAQ', order: 2, kind: 'screen' },
    ]);
    assert.equal(loadProjectComposerMenus(root).menus.length, 3);
    assert.doesNotThrow(() => assertProjectComposerMenusMatch(root, inventory));
    const changed = structuredClone(inventory);
    changed.menus[1].menu_nm = 'Unexpected drift';
    assert.throws(() => assertProjectComposerMenusMatch(root, changed), /differs from the actual/);
    const regranted = structuredClone(inventory);
    regranted.navigation.push({ authrt_cd: 'ROLE_USER', menu_sn: 12 });
    assert.throws(() => assertProjectComposerMenusMatch(root, regranted), /differs from the actual/, 'a navigation grant drift is a snapshot drift');
    assert.deepEqual(loadProjectComposerMenus(root).navigation, [{ authrt_cd: 'ROLE_ADMIN', menu_sn: 10 }, { authrt_cd: 'ROLE_USER', menu_sn: 11 }]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/*
 * 메뉴 트리 미리보기(E8): 같은 상위 안의 순서와 종류를 싣는다. 원본에는 화면이 있지만 이 구성에서 그 화면이 빠져
 * 하위 메뉴만 묶는 메뉴는 '목적지 없음'(detached)이고, 원본에도 화면이 없는 메뉴는 분류(category)다.
 * 비교 구성(base)을 주면 그 구성에 없는 메뉴를 added 로 표시하고, 주지 않으면 added 를 싣지 않는다.
 */
test('the preview keeps menu order and kind and marks menus the base composition does not have', () => {
  const row = (menu_sn, up_menu_sn, menu_ordr, menu_nm, modern_route) => ({ menu_sn, up_menu_sn, menu_ordr, menu_nm, menu_expln: null, modern_route, use_yn: 'Y', del_yn: 'N' });
  const snapshot = { menus: [row(1, null, 2, '업무', '/work'), row(2, 1, 1, '일정', '/schedule'), row(3, null, 1, '관리', null), row(4, 3, 1, '사용자', '/admin/users')] };
  const composition = routes => ({ menuRoutes: routes, excludedMenuTabs: [] });
  assert.deepEqual(projectComposerMenuPreview(null, composition(['/schedule', '/admin/users']), snapshot, { base: composition(['/admin/users']) }), [
    { id: 1, label: '업무', parent: null, path: null, order: 2, kind: 'detached', added: true },
    { id: 2, label: '일정', parent: 1, path: '/schedule', order: 1, kind: 'screen', added: true },
    { id: 3, label: '관리', parent: null, path: null, order: 1, kind: 'category', added: false },
    { id: 4, label: '사용자', parent: 3, path: '/admin/users', order: 1, kind: 'screen', added: false },
  ]);
  // 전체 화면이 남으면 '업무' 도 화면이다.
  assert.equal(projectComposerMenuPreview(null, composition(['/work', '/schedule']), snapshot)[0].kind, 'screen');
  // 비교 구성에서는 화면 없이 묶기만 하던 메뉴가 이 구성에서 화면이 되면 더한 것이다(행은 같아도 목적지가 생겼다).
  const destination = projectComposerMenuPreview(null, composition(['/work', '/schedule']), snapshot, { base: composition(['/schedule']) });
  assert.deepEqual(destination.map(menu => [menu.id, menu.kind, menu.added]), [[1, 'screen', true], [2, 'screen', false]]);
  // 반대로 비교 구성의 화면이 이 구성에서 묶기만 하게 되면 더한 것이 아니다.
  const lost = projectComposerMenuPreview(null, composition(['/schedule']), snapshot, { base: composition(['/work', '/schedule']) });
  assert.deepEqual(lost.map(menu => [menu.id, menu.kind, menu.added]), [[1, 'detached', false], [2, 'screen', false]]);
  assert.ok(projectComposerMenuPreview(null, composition(['/admin/users']), snapshot).every(menu => !('added' in menu)), 'no base, no added flag');
});

test('stale snapshots fail for changed migrations, seeds, or Contract while CRLF is normalized', () => {
  const { root, migrations } = fixture();
  try {
    const snapshot = writeProjectComposerMenuSnapshot(root, inventory);
    const baseline = join(migrations, 'V1_0__baseline.sql');
    const original = readFileSync(baseline, 'utf8');
    writeFileSync(baseline, original.replace(/\n/g, '\r\n'));
    assert.equal(projectMenuSourceHash(root), snapshot.sourceMigrationHash);
    for (const path of [baseline, join(migrations, 'R__zz_seed_base_admin.sql'),
      join(root, 'api-server/src/main/resources/db/cutover/authorization-contract.sql')]) {
      const source = readFileSync(path, 'utf8');
      writeFileSync(path, `${source}\nSELECT 2;\n`);
      assert.throws(() => loadProjectComposerMenus(root), /stale migration hash/);
      writeFileSync(path, source);
    }
    // 메뉴와 무관한 새 마이그레이션은 해시를 바꾸지 않는다(형식 v2) — 갱신 없이 스냅숏이 그대로 맞다.
    writeFileSync(join(migrations, 'V1_1__index_board_post.sql'), 'CREATE INDEX ix_tb_bbs_reg_dt ON tb_bbs (reg_dt);\n');
    assert.equal(projectMenuSourceHash(root), snapshot.sourceMigrationHash, 'an unrelated index migration keeps the hash');
    assert.doesNotThrow(() => loadProjectComposerMenus(root));
    writeFileSync(join(migrations, 'V1_2__rename_menu.sql'), "UPDATE tb_menu_info SET menu_nm = '새 이름' WHERE menu_sn = 10;\n");
    assert.throws(() => loadProjectComposerMenus(root), /stale migration hash/);
    assert.equal(JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')).sourceMigrationHash, snapshot.sourceMigrationHash);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

/*
 * 해시 입력 규칙(형식 v2)은 fail-closed 다. 메뉴·권한 계열 이름을 대소문자·따옴표·스키마 접두와 상관없이 쓰거나, 이름 없이 닿는
 * 수단을 쓰거나, SQL 입력이 정의한 함수를 부르거나, 감시 테이블로 번지는 외래 키의 부모·트리거가 걸린 테이블·감시 이름을 읽는 뷰·
 * 반복 시드가 읽는 테이블을 쓰면 넣는다.
 * 각 대조군은 같은 모양에서 번지는 길만 없앤 입력이다 — 빠지는 것도 규칙의 뜻이다.
 */
test('the menu hash keeps every migration that can reach the menu inventory and drops the rest', () => {
  const inputs = files => menuInventorySqlInputs(new Map(Object.entries(files)));
  const baseline = { 'V1_0.sql': 'CREATE TABLE tb_menu_info (menu_sn bigint PRIMARY KEY);' };
  const unrelated = 'CREATE INDEX ix_tb_bbs_reg_dt ON tb_bbs (reg_dt);';
  for (const sql of ["UPDATE public.\"TB_MENU_INFO\" SET use_yn = 'N';", "INSERT INTO tb_authrt_grnt_map VALUES ('ROLE_USER', 'NAVIGATION', '10');",
    "DELETE FROM tb_authrt_info WHERE authrt_cd = 'ROLE_X';", "DELETE FROM tb_menu_crt_dtl;", "DO $$ BEGIN EXECUTE 'DELETE FROM ' || target; END $$;",
    "SELECT format('%I', 'x');", 'TRUNCATE tb_user_info;', 'DROP TABLE tb_bbs CASCADE;', 'SET search_path = legacy;',
    'CREATE FUNCTION fn_noop() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;', 'UPDATE U&"tb_m\\0065nu_info" SET use_yn = \'N\';',
    "ALTER DOMAIN yn SET DEFAULT 'N';"]) {
    assert.deepEqual(inputs({ ...baseline, 'V1_1.sql': sql }), ['V1_0.sql', 'V1_1.sql'], sql);
  }
  assert.deepEqual(inputs({ ...baseline, 'V1_1.sql': unrelated, 'V1_2.sql': "ALTER TABLE tb_bbs ADD COLUMN memo varchar(10) DEFAULT 'N';" }),
    ['V1_0.sql'], 'migrations that only touch other tables are not hashed');
  // 앞선 마이그레이션이 정의한 함수를 부르는 파일도 넣는다 — 호출 원문에는 테이블 이름이 없다.
  const routine = { 'V1_1.sql': 'CREATE FUNCTION fn_reset() RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;', 'V1_2.sql': 'SELECT fn_reset();' };
  assert.deepEqual(inputs({ ...baseline, ...routine }), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql']);
  // 메뉴 행을 지우는 외래 키의 부모를 지우면 메뉴가 바뀐다. 막기만 하는(NO ACTION) 외래 키의 부모는 감시하지 않는다.
  const cascade = action => ({ 'V1_1.sql': `ALTER TABLE ONLY public.tb_menu_info ADD CONSTRAINT fk_menu_scrn FOREIGN KEY (scrn_id) REFERENCES public.tb_scrn_info (scrn_id)${action};`,
    'V1_2.sql': "DELETE FROM tb_scrn_info WHERE scrn_id = 'x';" });
  for (const action of [' ON DELETE CASCADE', ' ON UPDATE SET NULL']) assert.deepEqual(inputs({ ...baseline, ...cascade(action) }), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql'], action);
  assert.deepEqual(inputs({ ...baseline, ...cascade('') }), ['V1_0.sql', 'V1_1.sql']);
  // 메뉴에 쓰는 트리거가 걸린 테이블의 행을 바꾸면 메뉴가 바뀐다. 제 행만 고치는 트리거의 테이블은 감시하지 않는다.
  const trigger = body => ({ 'V1_1.sql': `CREATE FUNCTION fn_mirror() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN ${body} RETURN NEW; END $fn$;\n`
      + 'CREATE TRIGGER trg_mirror AFTER INSERT ON tb_user_info FOR EACH ROW EXECUTE FUNCTION fn_mirror();',
    'V1_2.sql': "INSERT INTO tb_user_info (esntl_id) VALUES ('U1');" });
  assert.deepEqual(inputs({ ...baseline, ...trigger('INSERT INTO tb_menu_info (menu_sn) VALUES (NEW.menu_sn);') }), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql']);
  assert.deepEqual(inputs({ ...baseline, ...trigger('NEW.rrno := NEW.user_enrrno;') }), ['V1_0.sql', 'V1_1.sql']);
  // 트리거 함수가 SQL 입력 밖에 있으면 무엇을 쓰는지 모른다 — 쓰는 것으로 본다.
  assert.deepEqual(inputs({ ...baseline, 'V1_1.sql': 'CREATE TRIGGER trg_x AFTER INSERT ON tb_user_info FOR EACH ROW EXECUTE FUNCTION ext_fn();',
    'V1_2.sql': "INSERT INTO tb_user_info (esntl_id) VALUES ('U1');" }), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql']);
  // 늘 넣는 입력(반복 시드·Contract)은 내용과 상관없다.
  assert.deepEqual(menuInventorySqlInputs(new Map([['R__seed.sql', 'SELECT 1;'], ['V1_1.sql', unrelated]]), new Set(['R__seed.sql'])), ['R__seed.sql']);
  // 메뉴를 읽는 뷰로 행을 지우면 메뉴가 바뀐다(갱신 가능한 뷰). 다른 테이블만 읽는 뷰는 감시하지 않는다.
  const view = source => ({ 'V1_1.sql': `CREATE VIEW v_nav AS SELECT * FROM ${source};`, 'V1_2.sql': "DELETE FROM v_nav WHERE use_yn = 'N';" });
  assert.deepEqual(inputs({ ...baseline, ...view('public.tb_menu_info') }), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql']);
  assert.deepEqual(inputs({ ...baseline, ...view('tb_bbs') }), ['V1_0.sql']);
  // 반복 시드는 모든 versioned migration 뒤에 다시 돈다 — 시드가 읽는 테이블을 바꾼 마이그레이션도 메뉴·배정을 바꾼다.
  // 읽는 이름은 SQL 입력이 만든 테이블만 센다. 주석 낱말·CTE 이름(the·picked)을 감시하면 무관한 파일이 딸려 온다.
  const seeded = seed => menuInventorySqlInputs(new Map([['R__seed.sql', seed], ['V1_0.sql', 'CREATE TABLE tb_scrn_info (scrn_id varchar(20));'],
    ['V1_1.sql', "UPDATE tb_scrn_info SET scrn_id = 'the picked';"]]), new Set(['R__seed.sql']));
  assert.deepEqual(seeded("INSERT INTO tb_authrt_grnt_map SELECT 'ROLE_USER', 'NAVIGATION', s.scrn_id FROM public.tb_scrn_info s;"),
    ['R__seed.sql', 'V1_0.sql', 'V1_1.sql']);
  assert.deepEqual(seeded('-- copied from the template\nWITH picked AS (SELECT 1) INSERT INTO tb_menu_info SELECT * FROM picked;'), ['R__seed.sql']);
});

/*
 * [2026-10-17] 이름을 원문에 남기지 않고 번지는 모양도 fail-closed 다 — 본문을 같은 문장에서 못 찾는 트리거 함수(다른 문장·파일의
 * `$$` 블록을 본문으로 잡지 않는다), 주석 속 ';' 로 갈린 외래 키, 번진 테이블의 새 이름, 상속·파티션으로 이어진 테이블, 이벤트 트리거.
 * 대조군은 같은 모양에서 감시 테이블만 뺀 입력이다.
 */
test('the menu hash keeps migrations that reach the menu through opaque bodies, split statements, renames, inheritance or event triggers', () => {
  const inputs = files => menuInventorySqlInputs(new Map(Object.entries(files)));
  const baseline = { 'V1_0.sql': 'CREATE TABLE tb_menu_info (menu_sn bigint PRIMARY KEY, use_yn char(1));' };
  const trigger = definition => ({ 'V1_1.sql': `CREATE TABLE tb_scrn (id text);\n${definition}\n`
      + 'CREATE TRIGGER trg AFTER INSERT ON tb_scrn FOR EACH ROW EXECUTE FUNCTION fn_sync();',
    'V1_3.sql': "INSERT INTO tb_scrn VALUES ('x');" });
  const laterBlock = 'DO $$ BEGIN PERFORM 1; END $$;';
  for (const [label, definition] of [
    ['single-quoted body', "CREATE FUNCTION fn_sync() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN INSERT INTO tb_menu_info VALUES (1); RETURN NEW; END';"],
    ['BEGIN ATOMIC body', 'CREATE FUNCTION fn_sync() RETURNS trigger LANGUAGE sql BEGIN ATOMIC INSERT INTO tb_menu_info VALUES (1); END;']]) {
    assert.ok(inputs({ ...baseline, ...trigger(definition), 'V1_2.sql': laterBlock }).includes('V1_3.sql'), `${label}, later $$ block in another file`);
    const sameFile = trigger(`${definition}\n${laterBlock}`);
    assert.ok(inputs({ ...baseline, ...sameFile }).includes('V1_3.sql'), `${label}, later $$ block in the same file`);
  }
  // 본문을 못 찾는 정의가 하나라도 있으면 다른 정의의 본문이 메뉴를 쓰지 않아도 쓰는 것으로 본다(나중 정의가 앞 정의를 바꾼다).
  const redefined = { ...trigger('CREATE FUNCTION fn_sync() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END $f$;'),
    'V1_2.sql': "CREATE OR REPLACE FUNCTION fn_sync() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN INSERT INTO tb_menu_info VALUES (1); RETURN NEW; END';" };
  assert.ok(inputs({ ...baseline, ...redefined }).includes('V1_3.sql'), 'an opaque redefinition keeps the trigger table watched');
  // 이벤트 트리거는 뒤의 어떤 DDL 에도 돈다 — 메뉴와 무관한 인덱스 마이그레이션도 넣는다.
  assert.deepEqual(inputs({ ...baseline, 'V1_1.sql': "CREATE FUNCTION fn_evt() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN UPDATE tb_menu_info SET use_yn = 'N'; END $$;\n"
    + 'CREATE EVENT TRIGGER evt ON ddl_command_end EXECUTE FUNCTION fn_evt();', 'V1_2.sql': 'CREATE INDEX ix_tb_bbs_reg_dt ON tb_bbs (reg_dt);' }),
  ['V1_0.sql', 'V1_1.sql', 'V1_2.sql'], 'an event trigger keeps every input');
  // 번진 테이블의 새 이름에 쓰면 메뉴가 바뀐다. 감시하지 않는 테이블의 새 이름은 감시하지 않는다.
  const renamed = table => inputs({ ...baseline, ...trigger('CREATE FUNCTION fn_sync() RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN INSERT INTO tb_menu_info VALUES (1); RETURN NEW; END $f$;'),
    'V1_2.sql': `ALTER TABLE ${table} RENAME TO tb_screen_src;`, 'V1_3.sql': "INSERT INTO tb_screen_src VALUES ('x');" }).sort();
  assert.deepEqual(renamed('tb_scrn'), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql', 'V1_3.sql'], 'a renamed spread table');
  assert.deepEqual(renamed('tb_bbs'), ['V1_0.sql', 'V1_1.sql']);
  // 주석 속 ';' 가 원문 조각을 갈라도 외래 키의 부모를 감시한다. 문자열 속 '--' 는 걷은 조각만 자르므로 원문 조각이 본다.
  const foreignKey = column => inputs({ ...baseline, 'V1_1.sql': 'CREATE TABLE tb_scrn_info (scrn_id text PRIMARY KEY);\n'
      + `ALTER TABLE tb_menu_info ADD COLUMN scrn_id text ${column}\n REFERENCES tb_scrn_info (scrn_id) ON DELETE CASCADE;`,
    'V1_2.sql': "DELETE FROM tb_scrn_info WHERE scrn_id = 'x';" });
  for (const column of ['-- legacy; keep', "DEFAULT '--'"]) assert.deepEqual(foreignKey(column), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql'], column);
  // 주석을 걷을 때 문자열 속 '/*' 를 주석 시작으로 보지 않는다 — 그러면 두 문장이 합쳐져 메뉴와 무관한 외래 키의 부모까지 감시한다.
  assert.deepEqual(inputs({ ...baseline, 'V1_1.sql': "ALTER TABLE tb_menu_info ADD COLUMN route text DEFAULT '/admin/*'; -- */\n"
    + 'ALTER TABLE tb_bbs ADD CONSTRAINT fk_bbs_code FOREIGN KEY (cd) REFERENCES tb_code (cd) ON DELETE CASCADE;', 'V1_2.sql': 'DELETE FROM tb_code;' }),
  ['V1_0.sql', 'V1_1.sql'], 'a string is not a comment');
  // 상속·파티션 자식의 행은 부모 조회에 나오고 부모에 쓰면 자식 행이 바뀐다 — 양쪽으로 번진다(메뉴 열 이름 없이 써도).
  const family = (definition, write) => inputs({ ...baseline, 'V1_1.sql': definition, 'V1_2.sql': write });
  for (const [definition, write] of [['CREATE TABLE tb_nav_extra () INHERITS (tb_menu_info);', "INSERT INTO tb_nav_extra VALUES (99, 'Y');"],
    ['CREATE TABLE tb_nav_p1 PARTITION OF tb_menu_info FOR VALUES FROM (0) TO (1000);', "INSERT INTO tb_nav_p1 VALUES (99, 'Y');"],
    ['ALTER TABLE tb_nav_extra INHERIT tb_menu_info;', "INSERT INTO tb_nav_extra VALUES (99, 'Y');"],
    ['ALTER TABLE tb_menu_info ATTACH PARTITION tb_nav_p1 FOR VALUES FROM (0) TO (1000);', "INSERT INTO tb_nav_p1 VALUES (99, 'Y');"],
    ['ALTER TABLE tb_menu_info INHERIT tb_nav_base;', "DELETE FROM tb_nav_base WHERE use_yn = 'N';"]]) {
    assert.deepEqual(family(definition, write), ['V1_0.sql', 'V1_1.sql', 'V1_2.sql'], definition);
    assert.deepEqual(family(definition.replace('tb_menu_info', 'tb_bbs'), write), ['V1_0.sql'], `${definition} without the menu table`);
  }
});

test('invalid menu identities, missing parents and the retired v1 shape cannot become a trusted preview', () => {
  const hash = 'a'.repeat(64);
  const valid = { schemaVersion: 3, sourceMigrationHash: hash, ...structuredClone(inventory) };
  assert.doesNotThrow(() => validateProjectComposerMenus(valid, hash));
  for (const mutate of [value => value.menus.push(value.menus[0]), value => value.menus.shift(),
    value => { value.menus = []; }, value => { value.menus[0].menu_sn = "10);DROP"; },
    value => { value.menus[1].menu_ordr = '2'; }, value => { value.menus[1].modern_route = 5; },
    // [2026-10-05] v1 은 레거시 연결 프로그램(prgrm_file_nm·programs)을 실었다 — 형식이 바뀌었으므로 거부한다.
    value => { value.schemaVersion = 1; },
    // [2026-10-07] v2 는 그룹별 메뉴 표시 배정이 없었다. 배정은 실재 메뉴를 가리키고 한 번씩만 있어야 한다.
    value => { value.schemaVersion = 2; }, value => { delete value.navigation; },
    value => { value.navigation.push({ authrt_cd: 'ROLE_USER', menu_sn: 99 }); },
    value => { value.navigation.push({ ...value.navigation[0] }); },
    value => { value.navigation[0].authrt_cd = "ROLE_USER');--"; }]) {
    const snapshot = structuredClone(valid);
    mutate(snapshot);
    assert.throws(() => validateProjectComposerMenus(snapshot, hash));
  }
});

/*
 * 스냅숏이 원본 마이그레이션을 따라가지 못한 경우(파일 없음·읽을 수 없음·해시·형식·실제 적용 결과와 다름)는 모두
 * MENU_SNAPSHOT_STALE 이다 — 갱신 명령(npm run project:menus:refresh)으로 풀린다. 원본 SQL 파일을 읽지 못한 것은 갱신으로
 * 풀리지 않으므로 이 코드가 아니다(내부 오류).
 */
test('every stale or unreadable snapshot is MENU_SNAPSHOT_STALE and an unreadable migration source is not', () => {
  const { root, migrations } = fixture();
  const stale = run => assert.throws(run, error => error instanceof ComposerError && error.code === 'MENU_SNAPSHOT_STALE');
  try {
    stale(() => loadProjectComposerMenus(root));
    writeFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), '{ not json');
    stale(() => loadProjectComposerMenus(root));
    writeProjectComposerMenuSnapshot(root, inventory);
    assert.doesNotThrow(() => loadProjectComposerMenus(root));
    const written = JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8'));
    stale(() => validateProjectComposerMenus({ ...written, schemaVersion: 2 }, projectMenuSourceHash(root)));
    stale(() => assertProjectComposerMenusMatch(root, { menus: inventory.menus.slice(0, 2), navigation: inventory.navigation }));
    writeFileSync(join(migrations, 'V2_0__new_menu.sql'), "UPDATE tb_menu_info SET use_yn = 'N' WHERE menu_sn = 12;\n");
    stale(() => loadProjectComposerMenus(root));
    rmSync(migrations, { recursive: true });
    assert.throws(() => loadProjectComposerMenus(root), error => !(error instanceof ComposerError) && error.code === 'ENOENT');
  } finally { rmSync(root, { recursive: true, force: true }); }
});
