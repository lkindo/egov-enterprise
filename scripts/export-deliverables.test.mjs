import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BANNED_CLAIMS, BLANK, FORBIDDEN_INPUTS, NO_SEMANTIC_ROW, OUTPUT_ROOT,
  assertAllowedInput, assertCompareOutsideOutput, baselineComparisonSheet, cellText, contentDigest, csvCell, interfaceSheet, loadInputs, mdCell,
  readBaselineManifest, renderPackage, reproduceCommand, resolveOutput, riskWaiverSheet, screenSheet, toCsv,
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

test('riskWaiverSheet consolidates waiver, debt, URL class registry and adoption review ledgers with distinct product IDs', () => {
  const sheet = riskWaiverSheet({
    zdmWaivers: {
      waivers: [{ id: 'ZDM-2026-0001', path: 'V2_86.sql', directive: 'ignore', rule: 'ZDM-04', approvedAt: '2026-09-02', owner: 'db', expiresAt: '2027-09-02', reason: 'IPv6 expand' }],
      legacyDebt: [
        { path: 'module-a/db/migration/V1__init.sql', ignoreCount: 3, status: 'legacy-debt-unapproved', owner: 'db', reviewBy: '2027-02-19', reason: 'pre-registry A' },
        { path: 'module-b/db/migration/V1__init.sql', ignoreCount: 1, status: 'legacy-debt-unapproved', owner: 'db', reviewBy: '2027-02-19', reason: 'pre-registry B' },
      ],
    },
    urlApproval: {
      classes: [{ classId: 'presentation-state', selector: { stateItemNames: ['page', 'tab'] }, reviewState: 'approved', owner: 'fe', reviewBy: '2026-12-31', description: '표현 상태' }],
    },
    adoptionReview: { authority: 'adopter-environment-review', product: 'egov-enterprise-online', profile: 'demo', status: 'pending', owner: null, validUntil: null, evidence: [] },
    migrationAdoptionReview: { authority: 'adopter-environment-review', product: 'egov-enterprise-migration-tool', profile: null, status: 'pending', owner: 'ops', validUntil: '2027-01-01', evidence: [{}] },
  });
  assert.deepEqual(sheet.rows.map((row) => [row.category, row.id, row.status]), [
    ['ZDM 예외 승인', 'ZDM-2026-0001', 'approved (2026-09-02)'],
    ['ZDM 레거시 부채', 'legacy-debt:module-a/db/migration/V1__init.sql', 'legacy-debt-unapproved'],
    ['ZDM 레거시 부채', 'legacy-debt:module-b/db/migration/V1__init.sql', 'legacy-debt-unapproved'],
    ['URL 상태 부류 등록부', 'presentation-state', 'approved'],
    ['기관 도입 승인 원장', 'adoption:egov-enterprise-online', 'pending'],
    ['기관 도입 승인 원장', 'adoption:egov-enterprise-migration-tool', 'pending'],
  ]);
  assert.match(sheet.notices.join('\n'), /위험 수용 승인을 대신하지 않는다/u);
});

test('baselineComparisonSheet classifies changes, excludes self-comparison files on chained runs and keeps contentDigest invariant', () => {
  assert.throws(() => readBaselineManifest('not json'), /not valid JSON/u);
  assert.throws(() => readBaselineManifest('{"kind":"other"}'), /must be a valid deliverables manifest\.json/u);
  assert.throws(() => readBaselineManifest(JSON.stringify({ schemaVersion: 1, kind: 'non-normative-derived-deliverables', cleanTree: 'false', commit: 'a'.repeat(40), contentDigest: 'a'.repeat(64), files: [] })), /must be a valid deliverables manifest\.json/u);
  const first = renderPackage([SHEET], META);
  const baseline = readBaselineManifest(first.files.get('manifest.json'));
  assert.throws(() => readBaselineManifest(JSON.stringify({ ...baseline, contentDigest: '0'.repeat(64) })), /contentDigest does not match/u);
  assert.throws(() => readBaselineManifest(JSON.stringify({ ...baseline, files: [baseline.files[0], baseline.files[0]] })), /duplicate file path/u);
  assert.throws(() => assertCompareOutsideOutput('D:/repo/build/deliverables/abc-dirty', 'D:/repo/build/deliverables/abc-dirty/manifest.json'), /must not be inside the target --out directory/u);
  assert.doesNotThrow(() => assertCompareOutsideOutput('D:/repo/build/deliverables/abc-next', 'D:/repo/build/deliverables/abc-dirty/manifest.json'));
  const cmp = baselineComparisonSheet(baseline, [
    { path: 'things.md', rows: 1, sha256: baseline.files.find((f) => f.path === 'things.md').sha256 },
    { path: 'things.csv', rows: 3, sha256: 'b'.repeat(64) },
    { path: 'added.csv', rows: 2, sha256: 'c'.repeat(64) },
  ]);
  const byPath = new Map(cmp.rows.map((row) => [row.path, row]));
  assert.equal(byPath.get('things.md').change, '동일');
  assert.equal(byPath.get('things.md').deltaRows, 0);
  assert.equal(byPath.get('things.csv').change, '변경');
  assert.equal(byPath.get('things.csv').deltaRows, 2);
  assert.equal(byPath.get('added.csv').change, '추가');
  assert.equal(byPath.get('added.csv').deltaRows, null);

  const compared = renderPackage([SHEET], { ...META, baseline });
  assert.ok(compared.files.has('baseline-comparison.md'));
  assert.ok(compared.files.has('baseline-comparison.csv'));
  assert.equal(compared.digest, first.digest, 'contentDigest stays invariant whether --compare is passed or not');
  const comparedManifest = readBaselineManifest(compared.files.get('manifest.json'));
  assert.match(comparedManifest.comparisonDigest, /^[0-9a-f]{64}$/u);
  // 연쇄 비교(chained --compare): 이미 baseline-comparison.* 이 들어 있는 manifest 를 다음 기준선으로 넘겨도 거짓 제거 행이 생기지 않는다.
  const chained = renderPackage([SHEET], { ...META, baseline: comparedManifest });
  assert.doesNotMatch(chained.files.get('baseline-comparison.md'), /baseline-comparison\./u);
  assert.equal(reproduceCommand({ baseline }), 'node scripts/export-deliverables.mjs --compare <같은 manifest.json>');
  assert.match(compared.files.get('README.md'), /--compare <같은 manifest\.json>/u);
});


import { backlogDetailSheet, buildSheets, computeAcHash, extractGateEntries, extractSchemaTableNames, menuSheet, projectUatChecklistSheet, verifyProjectedProductMetadata } from './export-deliverables.mjs';

test('menuSheet filters out deselected routes in projected-ledger mode while keeping ancestor folders and verifyProjectedProductMetadata rejects tampered lock', () => {
  const menus = {
    menus: [
      { menu_sn: 1, up_menu_sn: null, menu_nm: '관리', modern_route: null, menu_ordr: 1, use_yn: 'Y', del_yn: 'N' },
      { menu_sn: 11, up_menu_sn: 1, menu_nm: '배너·팝업', modern_route: '/admin/system/banner', menu_ordr: 1, use_yn: 'Y', del_yn: 'N' },
      { menu_sn: 12, up_menu_sn: 1, menu_nm: '설문', modern_route: '/admin/content/surveys', menu_ordr: 2, use_yn: 'Y', del_yn: 'N' },
      { menu_sn: 2, up_menu_sn: null, menu_nm: '빈 폴더', modern_route: null, menu_ordr: 2, use_yn: 'Y', del_yn: 'N' },
    ],
  };
  const routes = { routes: [{ route: '/admin/system/banner' }] };
  const projected = menuSheet({ menus, routes, ledgerMode: 'projected' });
  assert.deepEqual(projected.rows.map((r) => r.menuSn), [1, 11]);
  assert.match(projected.notices.join('\n'), /투영 원장 모드/u);

  const validProjection = {
    schemaVersion: 1,
    authority: 'generated-reusable-governance-projection-not-environment-approval',
    profile: 'core',
    sourceCommit: '171f45d4262c5a128fe1c8399a25ec4a9ebd360e',
  };
  assert.throws(() => verifyProjectedProductMetadata(validProjection, { profile: 'core', sourceCommit: validProjection.sourceCommit, governance: { path: 'config/governance/reusable-governance-projection.json', projectionSha256: 'bad' } }), /verified projected-ledger mode/u);
});

test('backlogDetailSheet, projectUatChecklistSheet, computeAcHash collision immunity and buildSheets real ledger shapes', () => {
  assert.notEqual(
    computeAcHash({ id: 'AC-1', requirementIds: ['R-1'], workItemId: 'W-1', polarity: 'allow', given: 'x\ty', when: 'z', then: 't', verificationMethod: 'e2e' }),
    computeAcHash({ id: 'AC-1', requirementIds: ['R-1'], workItemId: 'W-1', polarity: 'allow', given: 'x', when: 'y\tz', then: 't', verificationMethod: 'e2e' }),
    'computeAcHash must use structured JSON serialization so embedded tabs cannot collide',
  );

  assert.deepEqual(
    extractSchemaTableNames([{ table_name: 'TB_POPUP_INFO', column_name: 'POPUP_SN' }, { table_name: 'tb_popup_info', column_name: 'NTCE_YN' }]),
    ['tb_popup_info'],
  );
  const gates = extractGateEntries({
    gateSets: [{ id: 'GATESET-GOV', tier: 'fast', requiredCiContext: 'verify-gov', rules: [{ id: 'GH-01', source: 'Test.java' }] }],
  });
  assert.deepEqual(gates.map((g) => [g.id, g.status, g.evidenceLevel]), [
    ['GATESET-GOV', 'fast', 'verify-gov'],
    ['GH-01', 'fast', 'verify-gov'],
  ]);

  const sampleBacklog = {
    businessRequirements: [
      {
        id: 'REQ-SFR-003',
        title: '팝업 다건 일괄 노출 중지',
        requirementType: 'functional',
        solutionDisposition: 'gap-dev',
        scopeDisposition: 'included',
        acceptanceDisposition: 'pending',
        nfrCriteria: { metric: 'p95_ms', threshold: '800ms' },
        openQuestions: ['최대 선택 건수 100건 제한 여부'],
      },
    ],
    workItems: [
      { id: 'EPIC-PROMO', workItemType: 'epic', parentEpicId: null, requirementIds: ['REQ-SFR-003'], title: '팝업 에픽' },
      {
        id: 'US-PROMO-002',
        workItemType: 'story',
        parentEpicId: 'EPIC-PROMO',
        requirementIds: ['REQ-SFR-003'],
        title: '일괄 노출 중지 스토리',
        asA: '운영 관리자',
        iWant: '다건 팝업을 선택해 노출 중지 처리',
        soThat: '긴급 공지를 즉시 내릴 수 있다',
        decisionCards: ['D-2: POPUP_UPDATE 권한 및 SecurityUtil.assertPermission 2차 가드'],
      },
      {
        id: 'CFG-PROMO-001',
        workItemType: 'configuration',
        parentEpicId: 'EPIC-PROMO',
        requirementIds: ['REQ-SFR-003'],
        title: '팝업 기본 설정 점검',
        description: '설정 항목 설명 보존 확인',
      },
    ],
    acceptanceCriteria: [
      {
        id: 'AC-PROMO-002-G1',
        workItemId: 'US-PROMO-002',
        requirementIds: ['REQ-SFR-003'],
        polarity: 'allow',
        given: '노출 중인 팝업 2건 선택 시',
        when: '일괄 중지 실행 시',
        then: 'ntceYn=N 변경',
        verificationMethod: 'integration-test',
        acceptanceDisposition: 'accepted',
      },
      {
        id: 'AC-PROMO-002-R1',
        workItemId: 'US-PROMO-002',
        requirementIds: ['REQ-SFR-003'],
        polarity: 'forbid',
        given: 'POPUP_UPDATE 권한이 없을 때',
        when: '호출 시',
        then: '403 Forbidden 거부',
        verificationMethod: 'integration-test',
        acceptanceDisposition: 'accepted',
        acContentHash: '0000000000000000',
      },
    ],
    traceLinks: [
      {
        id: 'TRL-003',
        requirementId: 'REQ-SFR-003',
        workItemId: 'US-PROMO-002',
        acId: 'AC-PROMO-002-G1',
        targetKind: 'capability',
        targetId: '/admin/system/banner#promotion.popup-bulk-suspend',
        linkIntent: 'planned',
      },
    ],
  };
  sampleBacklog.acceptanceCriteria[0].acContentHash = computeAcHash(sampleBacklog.acceptanceCriteria[0]);

  const detail = backlogDetailSheet(sampleBacklog);
  assert.equal(detail.rows.length, 3);
  assert.match(detail.rows.find((r) => r.workItemId === 'US-PROMO-002').storyStatement, /As a 운영 관리자/u);
  assert.equal(detail.rows.find((r) => r.workItemId === 'CFG-PROMO-001').storyStatement, '설정 항목 설명 보존 확인');
  assert.match(detail.rows[0].nfrAndQuestions, /NFR\(p95_ms\): 800ms/u);

  const uat = projectUatChecklistSheet(sampleBacklog);
  assert.equal(uat.rows.length, 2);
  assert.equal(uat.rows[0].hashStatus, '일치');
  assert.equal(uat.rows[1].hashStatus, '불일치(조건 변경됨)');
  assert.equal(reproduceCommand({ backlog: true }), 'node scripts/export-deliverables.mjs --backlog <같은 backlog.json>');
});
