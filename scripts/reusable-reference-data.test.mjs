import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { requiresClosure, sourceOwner, stripComments } from './project-composer-integrations.mjs';
import { loadComposerModules } from './composer-modules.mjs';
import {
  BOARD_MASTER_SEED, BOARD_MASTER_TABLE, CODE_GROUP_TABLE, boardMasterIds, omitCodeGroupsSql, referenceDataPlan,
} from './reusable-reference-data.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
// 공통코드 그룹 소유는 기능 파일의 owns.commonCodeGroups 다(11단계 C7 — 생성기 상수를 걷었다).
const modules = loadComposerModules(root);
const CODE_GROUP_OWNERS = modules.extras.codeGroupOwners;
const JAVA_ROOTS = ['foundation/src/main/java', 'business-core/src/main/java', 'business-app/src/main/java', 'api-server/src/main/java'];

function javaFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? javaFiles(path) : entry.name.endsWith('.java') ? [path] : [];
  });
}

test('code group owners match the capability that owns every production file reading that group', () => {
  // 카탈로그와 같은 소유 판정(지원 파일 선언 → 업무 앱 디렉터리 → foundation·business-core 는 core → 참조 패키지)을 쓴다.
  const catalog = loadProjectComposerCatalog(root);
  const supportOwners = new Map([...modules.declarations.supportFiles()].flatMap(([domain, files]) => files.map(file => [file, domain])));
  const ownerOf = sourceOwner(supportOwners, catalog.capabilities.map(capability => capability.id), requiresClosure(catalog.capabilities));
  const readers = new Map();
  for (const javaRoot of JAVA_ROOTS) for (const absolute of javaFiles(join(root, javaRoot))) {
    const source = readFileSync(absolute, 'utf8');
    const groups = [...new Set([...stripComments(source).matchAll(/"(COM\d{3})"/g)].map(match => match[1]))];
    if (!groups.length) continue;
    const path = relative(root, absolute).split(sep).join('/');
    const owner = ownerOf(path, stripComments(source, { strings: false }));
    for (const group of groups) readers.set(group, [...(readers.get(group) ?? []), { path, owner }]);
  }
  const mismatches = [...readers].flatMap(([group, files]) => files
    .filter(file => file.owner !== (CODE_GROUP_OWNERS[group] ?? 'core'))
    .map(file => `${group}: ${file.path} 는 ${file.owner} 소유인데 표는 ${CODE_GROUP_OWNERS[group] ?? 'core'}`));
  assert.deepEqual(mismatches, []);
  // 표의 그룹은 생산 코드가 실제로 읽는다(읽는 곳이 사라진 선언을 남기지 않는다).
  assert.deepEqual(Object.keys(CODE_GROUP_OWNERS).filter(group => !readers.has(group)), []);
  // 빈 스캔은 통과가 아니다 — 2026-10-10 실측 core 그룹(COM033)과 표의 세 그룹을 읽는다.
  assert.ok(readers.has('COM033') && readers.size >= 4, `읽힌 코드 그룹: ${[...readers.keys()].join(', ')}`);
  // 표의 소유자는 실제 기능이다.
  for (const owner of Object.values(CODE_GROUP_OWNERS)) assert.ok(catalog.capabilities.some(capability => capability.id === owner), owner);
});

// [ADR-0029 L4 D7, DEC-OPS-325] 이관 도구의 공통코드 바인딩 카탈로그 — 생산 Java 가 읽는 그룹과 양방향으로 맞춘다.
const BINDINGS = 'migration-tool/src/main/java/nuri/migration/validate/ProductCodeBindings.java';
const BINDING_ROW = /new Binding\("([a-z0-9_]+)", "([a-z0-9_]+)", "(COM\d{3})", Use\.(VALIDATE|DISPLAY), (true|false)\)/g;

/** 생산 Java(migration-tool 제외)가 읽는 공통코드 그룹 리터럴. 주석 속 리터럴은 세지 않는다. */
function productionCodeGroups() {
  const groups = new Set();
  for (const javaRoot of JAVA_ROOTS) for (const absolute of javaFiles(join(root, javaRoot))) {
    for (const match of stripComments(readFileSync(absolute, 'utf8')).matchAll(/"(COM\d{3})"/g)) groups.add(match[1]);
  }
  return groups;
}

/** 카탈로그의 바인딩 행. 주석을 지운 소스에서 한 줄 모양으로만 읽고, 모양이 다른 행이 있으면 멈춘다. */
function codeBindingRows(source) {
  const code = stripComments(source);
  const rows = [...code.matchAll(BINDING_ROW)].map(match => ({ table: match[1], column: match[2], group: match[3], use: match[4], trim: match[5] === 'true' }));
  const declared = (code.match(/new Binding\(/g) ?? []).length;
  if (!rows.length || rows.length !== declared) throw new Error(`바인딩 행 ${declared}개 중 ${rows.length}개만 읽었다 — 한 줄 모양을 지킨다`);
  return rows;
}

test('the migration tool code bindings cover every production code group and only bind real columns of the same owner', () => {
  const rows = codeBindingRows(readFileSync(join(root, BINDINGS), 'utf8'));
  const groups = productionCodeGroups();
  // 정방향: 앱이 읽는 그룹은 모두 카탈로그에 있다 — 새 그룹 검증을 더하면 이관 대사도 따라온다.
  assert.deepEqual([...groups].filter(group => !rows.some(row => row.group === group)).sort(), []);
  // 쓰기 검증 바인딩은 결재 본표의 업무 구분 하나다(InformalSanctionService 의 상신 검증).
  assert.deepEqual(rows.filter(row => row.use === 'VALIDATE').map(row => `${row.table}.${row.column}`), ['tb_ifml_atrz_info.task_se_cd']);
  // 역방향: 이 구성에 있는 표의 바인딩은 실제 컬럼을 가리키고, 그 그룹을 앱이 읽으며, 표와 그룹의 소유 기능이 같다
  //   (같이 남고 같이 빠져야 생성물에서 표만 남고 그룹 헤더가 빠지는 일이 없다 — DEC-OPS-262).
  const columns = JSON.parse(readFileSync(join(root, 'db_columns.json'), 'utf8'));
  const catalog = loadProjectComposerCatalog(root);
  const tableOwner = table => catalog.capabilities.find(capability => capability.database.tables.includes(table))?.id
    ?? (catalog.core.tables.includes(table) ? 'core' : null);
  let checked = 0;
  for (const row of rows) {
    if (!columns.some(column => column.table_name === row.table)) continue;
    checked += 1;
    assert.ok(columns.some(column => column.table_name === row.table && column.column_name === row.column), `${row.table}.${row.column} 컬럼이 없다`);
    assert.ok(groups.has(row.group), `${row.group} 를 읽는 생산 Java 가 없다`);
    assert.equal(tableOwner(row.table), CODE_GROUP_OWNERS[row.group] ?? 'core', `${row.table} 과 ${row.group} 의 소유 기능이 다르다`);
  }
  // 빈 대조는 통과가 아니다 — core 표(tb_sys_log)의 바인딩은 어느 구성에도 있다.
  assert.ok(checked >= 1 && rows.some(row => row.table === 'tb_sys_log'), `대조한 바인딩 ${checked}개`);
});

test('the code binding reader refuses rows it cannot read and ignores commented rows', () => {
  const row = 'new Binding("tb_a", "a_cd", "COM001", Use.DISPLAY, false)';
  assert.deepEqual(codeBindingRows(`${row},\n// new Binding("tb_b", "b_cd", "COM002", Use.VALIDATE, true)`),
    [{ table: 'tb_a', column: 'a_cd', group: 'COM001', use: 'DISPLAY', trim: false }]);
  assert.throws(() => codeBindingRows(`${row},\nnew Binding("tb_b", "b_cd", GROUP, Use.DISPLAY, false)`), /2개 중 1개/);
  assert.throws(() => codeBindingRows('List.of()'), /0개 중 0개/);
});

test('the board master seed only inserts board masters and its IDs are read back exactly', () => {
  const seed = readFileSync(join(root, BOARD_MASTER_SEED), 'utf8');
  const code = stripComments(seed, { kind: 'sql' });
  const targets = [...new Set([...code.matchAll(/\bINSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)].map(match => match[1].toLowerCase()))];
  // 참조 데이터 덤프는 공통코드 그룹과 게시판 마스터 표만 담는다. 이 시드가 다른 표에 쓰면 그 행이 번들에서 조용히 빠진다.
  assert.deepEqual(targets, [BOARD_MASTER_TABLE]);
  assert.deepEqual(boardMasterIds(seed), ['BBSMSTR_AAAAAAAAAAAA', 'BBSMSTR_CCCCCCCCCCCC', 'BBSMSTR_DDDDDDDDDDDD', 'BBSMSTR_EEEEEEEEEEEE']);
  assert.throws(() => boardMasterIds('SELECT 1;'), /BBSMSTR_/);
});

test('the reference data plan keeps core groups and only the selected capabilities’ groups and board masters', () => {
  const full = referenceDataPlan(['board', 'informalsanction', 'note'], [CODE_GROUP_TABLE, BOARD_MASTER_TABLE, 'tb_note'], CODE_GROUP_OWNERS);
  assert.deepEqual(full, { omittedCodeGroups: [], includeBoardMasters: true, tables: [CODE_GROUP_TABLE, BOARD_MASTER_TABLE] });
  assert.equal(omitCodeGroupsSql(full), '');

  const core = referenceDataPlan([], [CODE_GROUP_TABLE], CODE_GROUP_OWNERS);
  assert.deepEqual(core, { omittedCodeGroups: ['COM004', 'COM009', 'COM075'], includeBoardMasters: false, tables: [CODE_GROUP_TABLE] });
  assert.equal(omitCodeGroupsSql(core), "DELETE FROM public.tb_com_cd WHERE cd_id IN ('COM004', 'COM009', 'COM075');");

  const approvalOnly = referenceDataPlan(['informalsanction'], [CODE_GROUP_TABLE], CODE_GROUP_OWNERS);
  assert.deepEqual(approvalOnly.omittedCodeGroups, ['COM004', 'COM009']);

  // 게시판 기능과 게시판 마스터 표는 함께 있거나 함께 없다.
  assert.throws(() => referenceDataPlan(['board'], [CODE_GROUP_TABLE], CODE_GROUP_OWNERS), /어긋난다/);
  assert.throws(() => referenceDataPlan([], [CODE_GROUP_TABLE, BOARD_MASTER_TABLE], CODE_GROUP_OWNERS), /어긋난다/);
  // 공통코드 그룹 표는 core 라 늘 있다.
  assert.throws(() => referenceDataPlan([], [], CODE_GROUP_OWNERS), /core 테이블/);
  // 소유 표는 기능 파일에서 받는다 — 빠뜨리면 모든 그룹을 싣지 않고 멈춘다.
  assert.throws(() => referenceDataPlan([], [CODE_GROUP_TABLE]), /공통코드 그룹 소유\(codeGroupOwners\)가 필요하다/);
  assert.throws(() => omitCodeGroupsSql({ omittedCodeGroups: ["X'); DROP TABLE t; --"] }), /올바르지 않다/);
});
