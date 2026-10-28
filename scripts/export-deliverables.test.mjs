import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BANNED_CLAIMS, BLANK, FORBIDDEN_INPUTS, NO_SEMANTIC_ROW, OUTPUT_ROOT,
  assertAllowedInput, cellText, contentDigest, csvCell, interfaceSheet, loadInputs, mdCell, renderPackage, reproduceCommand, resolveOutput, screenSheet, toCsv,
} from './export-deliverables.mjs';

/*
 * 산출물 내보내기(DEC-OPS-382 ②)의 고정 입력 시험. 실제 저장소로 묶음을 만들거나 두 번 만들어 대조하는 일은
 * 비필수 workflow_dispatch(.github/workflows/deliverables.yml)가 한다 — 운영 계약 묶음에는 원장 값에 묶이지 않는 시험만 둔다.
 */

const META = { commit: 'a'.repeat(40), cleanTree: true, toolchain: { node: 'v22', typescript: '5' }, inputs: [], lockfiles: [] };

test('blank cells are written out, never left empty', () => {
  for (const value of [null, undefined, '', '   ', []]) assert.equal(cellText(value), BLANK);
  assert.equal(cellText(['A', 'B']), 'A, B');
  assert.equal(cellText(true), '예');
  assert.equal(cellText(false), '아니오');
  assert.equal(cellText(0), '0');
});

test('csv cells that a spreadsheet would read as a formula are neutralised', () => {
  for (const value of ['=HYPERLINK("x")', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) {
    assert.ok(csvCell(value).replace(/^"/u, '').startsWith("'"), `${JSON.stringify(value)} -> ${csvCell(value)}`);
  }
  assert.equal(csvCell('/admin/users'), '/admin/users');
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('line\nbreak'), '"line\nbreak"');
  assert.equal(csvCell(null), BLANK);
});

test('csv files carry a UTF-8 BOM and CRLF rows for spreadsheet tools', () => {
  const text = toCsv({ columns: [['a', '가'], ['b', '나']], rows: [{ a: 'x', b: null }] });
  assert.ok(text.startsWith('\uFEFF가,나\r\n'));
  assert.ok(text.endsWith(`x,${BLANK}\r\n`));
});

test('markdown cells escape the table separator and line breaks', () => {
  assert.equal(mdCell('a|b'), 'a\\|b');
  assert.equal(mdCell('a\r\nb'), 'a<br>b');
  assert.equal(mdCell('C:\\x'), 'C:\\\\x');
});

test('forbidden inputs are refused before they are read', () => {
  for (const path of ['.agent/memory/decisions.md', 'docs/archived/operational-decisions-history.md', 'docs/02-architecture/decisions/README.md',
    'docs/04-operations/known-gaps-detail.md', '.env', '.env.local', 'config/governance/upstream-review/project-composer-selection.json']) {
    assert.throws(() => assertAllowedInput(path), /forbidden deliverable input/u, path);
  }
  // 구분자·대소문자·./ 접두와 상관없이 같은 판정이다(어느 운영체제에서 돌아도 같다 — Windows 는 이 철자로도 같은 파일을 연다).
  for (const path of ['.agent\\memory\\known-gaps.md', '.ENV', './.env', 'Docs/Archived/x.md', 'DOCS\\02-ARCHITECTURE\\DECISIONS\\README.MD']) {
    assert.throws(() => assertAllowedInput(path), /forbidden deliverable input/u, path);
  }
  for (const path of ['config/governance/permission-catalog.json', 'docs/02-architecture/decisions/ADR-0001-core-app-product-boundary.md', 'api-docs.json']) {
    assert.doesNotThrow(() => assertAllowedInput(path), path);
  }
  assert.equal(FORBIDDEN_INPUTS.length, 6);
});

test('a generated product is refused until a projected-ledger mode exists', async () => {
  const root = mkdtempSync(join(tmpdir(), 'deliverables-generated-'));
  try {
    mkdirSync(join(root, 'config/governance/upstream-review'), { recursive: true });
    await assert.rejects(loadInputs(root), /source repository only/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the package is written only under build/deliverables', () => {
  const root = join(tmpdir(), 'deliverables-root');
  assert.equal(resolveOutput(root, `${OUTPUT_ROOT}/abc`), join(root, OUTPUT_ROOT, 'abc'));
  for (const out of ['frontend/public/deliverables', OUTPUT_ROOT, `${OUTPUT_ROOT}/../elsewhere`, 'config/governance', join(tmpdir(), 'outside')]) {
    assert.throws(() => resolveOutput(root, out), /must be written under build\/deliverables/u, out);
  }
});

test('read operations have no semantic row, write operations show their policy and missing rows stay visible', () => {
  const sheet = interfaceSheet({
    policies: {
      operationBindings: [
        { method: 'GET', path: '/api/v1/things', handler: 'T#list', access: 'PERMISSION', permission: 'THING_READ' },
        { method: 'POST', path: '/api/v1/things', handler: 'T#create', access: 'PERMISSION', permission: 'THING_CREATE' },
        { method: 'POST', path: '/ws/{s}/xhr', handler: 'W#xhr', access: 'PUBLIC', permission: null },
      ],
      endpointPolicies: [{ method: 'POST', path: '/api/v1/things', policy: 'ADMIN_OR_SYSTEM', routeGate: 'OPERATION_PERMISSION' }],
    },
    openapi: { paths: { '/api/v1/things': { get: { operationId: 'listThings', summary: '목록' }, post: { operationId: 'createThing' } } } },
  });
  const byId = new Map(sheet.rows.map((row) => [row.id, row]));
  assert.equal(byId.get('GET /api/v1/things').policy, NO_SEMANTIC_ROW);
  assert.equal(byId.get('GET /api/v1/things').routeGate, NO_SEMANTIC_ROW);
  assert.equal(byId.get('POST /api/v1/things').policy, 'ADMIN_OR_SYSTEM');
  assert.equal(cellText(byId.get('POST /ws/{s}/xhr').policy), BLANK);
  assert.equal(cellText(byId.get('POST /ws/{s}/xhr').operationId), BLANK);
  assert.deepEqual(sheet.rows.map((row) => row.id), ['GET /api/v1/things', 'POST /api/v1/things', 'POST /ws/{s}/xhr']);
});

test('screens keep the demo marker and show the entry mode only when it decides something', () => {
  const screen = (route, permissions, mode, demo) => ({ route, label: null, labelSource: null, shellAccess: 'admin-system', dynamic: false, demo,
    entry: { permissions, mode }, permissions: [{ code: 'A_UPDATE', action: 'UPDATE', source: 'write' }, { code: 'A_PIN', action: 'PIN', source: 'display' }] });
  const sheet = screenSheet({
    registry: { screens: [screen('/a', ['A_READ'], 'ANY', false), screen('/b', ['A_READ', 'B_READ'], 'ALL', true)] },
    routes: { routes: [{ route: '/a', status: 'live', capabilities: [{ id: 'x' }] }] },
  });
  assert.equal(sheet.rows[0].entryMode, null);
  assert.equal(sheet.rows[1].entryMode, 'ALL');
  assert.equal(sheet.rows[1].demo, true);
  assert.deepEqual(sheet.rows[0].write, ['A_UPDATE']);
  assert.deepEqual(sheet.rows[0].display, ['A_PIN']);
  assert.equal(cellText(sheet.rows[1].status), BLANK);
  assert.equal(sheet.rows[1].capabilities, 0);
});

const SHEET = { id: 'things', title: '사물 목록', sources: ['config/things.json'], notices: ['정적 표본이다.'], columns: [['a', '가']], rows: [{ a: 'x' }] };

test('the content digest ignores the manifest, the README, the commit and file order and changes with content', () => {
  const files = new Map([['b.csv', 'B'], ['a.md', 'A'], ['manifest.json', '{"commit":"1"}'], ['README.md', 'commit 1']]);
  const reordered = new Map([['manifest.json', '{"commit":"2"}'], ['README.md', 'commit 2'], ['a.md', 'A'], ['b.csv', 'B']]);
  assert.equal(contentDigest(files), contentDigest(reordered));
  assert.notEqual(contentDigest(files), contentDigest(new Map([['a.md', 'A!'], ['b.csv', 'B']])));
  const first = renderPackage([SHEET], META);
  const second = renderPackage([SHEET], { ...META, commit: 'b'.repeat(40), toolchain: { node: 'v99', typescript: '9' } });
  assert.equal(first.digest, second.digest);
  assert.equal(first.files.get('things.md'), second.files.get('things.md'));
  assert.notEqual(first.files.get('README.md'), second.files.get('README.md'));
  assert.deepEqual([...first.files.keys()].sort(), ['README.md', 'manifest.json', 'things.csv', 'things.md']);
  assert.equal(JSON.parse(first.files.get('manifest.json')).contentDigest, first.digest);
});

test('fixed prose never claims completeness, and a sheet notice that does is refused', () => {
  const { files } = renderPackage([SHEET], { ...META, cleanTree: false });
  const readme = files.get('README.md');
  for (const claim of BANNED_CLAIMS) assert.ok(!readme.includes(claim), claim);
  assert.match(readme, /감리.*검수.*대신하지 않는다/u);
  assert.match(readme, /미리 보기이며 제출용이 아니다/u);
  assert.match(files.get('things.md'), /비규범 파생물/u);
  assert.throws(() => renderPackage([{ ...SHEET, notices: ['자동화율 100% 이다.'] }], META), /banned claim in things notice: 100%/u);
});

test('the reproduction line names the options that shaped the table set', () => {
  assert.equal(reproduceCommand({}), 'node scripts/export-deliverables.mjs');
  assert.equal(reproduceCommand({ database: { postgres: '17' } }), 'node scripts/export-deliverables.mjs --db');
  assert.equal(reproduceCommand({ database: { postgres: '17' }, requirements: true }), 'node scripts/export-deliverables.mjs --db --rtm <같은 CSV>');
  const { files } = renderPackage([SHEET], { ...META, database: { postgres: '17', migrations: 1 }, requirements: true });
  assert.match(files.get('README.md'), /node scripts\/export-deliverables\.mjs --db --rtm <같은 CSV>/u);
  assert.match(files.get('README.md'), /같은 CSV 를 다시 넘겨야 같다/u);
});

test('an empty sheet says so instead of printing an empty table', () => {
  const { files } = renderPackage([{ ...SHEET, rows: [], emptyMessage: '승인된 오탐이 없다.' }], META);
  assert.match(files.get('things.md'), /행 0개\.\n\n승인된 오탐이 없다\./u);
  assert.equal(files.get('things.csv'), '\uFEFF가\r\n');
});
