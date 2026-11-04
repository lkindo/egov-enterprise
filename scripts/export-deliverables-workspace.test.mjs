import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, linkSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BANNED_CLAIMS, backlogDetailSheet, exportDeliverables, loadInputs, projectUatChecklistSheet } from './export-deliverables.mjs';
import * as deliverablesEngine from './export-deliverables.mjs';
import * as workspaceEngine from './export-deliverables-workspace.mjs';
import { readRequirements, requirementSheet } from './export-deliverables-trace.mjs';
import {
  ACCEPTANCE_DISPOSITIONS,
  AC_POLARITIES,
  CLAUSE_DISPOSITIONS,
  LINK_INTENTS,
  PRIORITIES,
  REQUIREMENT_TYPES,
  SCOPE_DISPOSITIONS,
  SOLUTION_DISPOSITIONS,
  SOURCE_CLASSIFICATIONS,
  SOURCE_TYPES,
  TARGET_KINDS,
  VERIFICATION_METHODS,
  WORK_ITEM_TYPES,
  assertWorkspaceOutsideCheckout,
  backlogToRtmCsv,
  backlogToRtmRows,
  buildContextSnapshot,
  compareBacklogWithComposition,
  computeAcHash,
  createEmptyBacklogPack,
  createSampleBacklogPack,
  diffContextSnapshots,
  exportReviewSheets,
  exportUatChecklist,
  generateWorkPackagePlan,
  importReviewSheets,
  importUatChecklist,
  initRequirementsWorkspace,
  loadRepositoryContextSnapshot,
  matchRequirementsToContext,
  renderWorkspaceReport,
  scanBacklogForPiiAndSecrets,
  validateBacklogPack,
  verifyRequirementsWorkspace,
} from './export-deliverables-workspace.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

function readyBacklog(snapshot) {
  const pack = createSampleBacklogPack(snapshot);
  pack.sources[0].classification = 'internal';
  pack.sources[0].fileSha256 = 'a'.repeat(64);
  pack.sources[1].classification = 'internal';
  pack.sources[1].fileSha256 = 'b'.repeat(64);
  pack.sources[1].clauses = [
    { id: 'CLS-MIN-1', locator: 'line 1', text: '일괄 중지 사유', disposition: 'included', requirementIds: ['REQ-SFR-003'] },
    { id: 'CLS-MIN-2', locator: 'line 2', text: '단말 연계 제외', disposition: 'excluded', requirementIds: ['REQ-INT-099'], rationale: '차기 사업 합의' },
  ];
  const story = pack.workItems.find((item) => item.id === 'US-PROMO-001');
  story.decisionCards = ['D-1: A1', 'D-2: POPUP_UPDATE', 'D-3: tb_popup_info.popup_sn', 'D-4: 기존 입력 계약', 'D-5: 거부 시험'];
  pack.acceptanceCriteria.push({ id: 'AC-PROMO-001-R1', workItemId: story.id, requirementIds: story.requirementIds,
    polarity: 'forbid', given: '비인가 사용자', when: '수정 요청', then: '403 거부', verificationMethod: 'e2e' });
  return pack;
}

function acceptAll(pack) {
  for (const ac of pack.acceptanceCriteria) Object.assign(ac, {
    acceptanceDisposition: 'accepted', acContentHash: computeAcHash(ac, pack),
    uatSignedBy: '기관 검수 역할', uatVerifiedAt: '2026-11-04', uatEvidence: '회의록 REF-001', uatBuildRef: 'BUILD-001',
  });
  for (const req of pack.businessRequirements) if (req.scopeDisposition === 'included') req.acceptanceDisposition = 'accepted';
}

const MOCK_INPUTS = {
  moduleFiles: {
    'core.json': { id: 'core', label: '공통 기반', required: true, presentation: { group: 'core' }, owns: { routes: ['/admin/security/login-policy'], tables: ['tb_login_plcy'] } },
    'promotion.json': { id: 'promotion', label: '배너·팝업', required: false, requires: ['core'], presentation: { group: 'communication' }, owns: { routes: ['/admin/system/banner'], tables: ['tb_popup_info'] } },
    'presets.json': {
      presets: [
        { id: 'collaboration', label: '협업 포털', domains: ['promotion'] },
      ],
    },
  },
  routes: {
    routes: [
      {
        route: '/admin/system/banner',
        status: 'partial',
        routing: { kind: 'page' },
        capabilities: [
          { id: 'promotion.popup-management', status: 'partial', evidenceLevel: 'E3' },
          { id: 'popup.unverified', status: 'unverified', evidenceLevel: 'E0' },
          { id: 'popup.unavailable', status: 'unavailable', evidenceLevel: 'E1' },
        ],
      },
      {
        route: '/admin/security/login-policy',
        status: 'partial',
        routing: { kind: 'page' },
        capabilities: [
          { id: 'login-policy.manage', status: 'partial', evidenceLevel: 'E2' },
        ],
      },
      {
        route: '/admin/patterns',
        status: 'demo',
        routing: { kind: 'page' },
        capabilities: [],
      },
    ],
  },
  registry: {
    screens: [
      { route: '/admin/system/banner', label: '배너·팝업 관리', demo: false, entry: { permissions: ['POPUP_READ', 'POPUP_UPDATE'] } },
      { route: '/admin/security/login-policy', label: '로그인 정책 관리', demo: false, entry: { permissions: ['LOGIN_POLICY_READ'] } },
      { route: '/admin/patterns', label: '패턴 갤러리', demo: true, entry: { permissions: [] } },
    ],
  },
  policies: {
    operationBindings: [
      { method: 'GET', path: '/api/v1/admin/system/popups', access: 'PERMISSION', permission: 'POPUP_READ' },
      { method: 'POST', path: '/api/v1/admin/system/popups', access: 'PERMISSION', permission: 'POPUP_UPDATE' },
    ],
  },
};

test('assertWorkspaceOutsideCheckout rejects repository root, subdirectories, ..prefix lookalikes, junctions and any git working tree', () => {
  const root = mkdtempSync(join(tmpdir(), 'req-ws-root-'));
  const outside = mkdtempSync(join(tmpdir(), 'req-ws-out-'));
  const otherGitRepo = mkdtempSync(join(tmpdir(), 'req-ws-other-git-'));
  try {
    mkdirSync(join(root, 'build'), { recursive: true });
    assert.throws(() => assertWorkspaceOutsideCheckout(root, ''), /requires a non-empty directory path/u);
    assert.throws(() => assertWorkspaceOutsideCheckout(root, root, { checkGitWorktree: false }), /must be outside the repository checkout/u);
    assert.throws(() => assertWorkspaceOutsideCheckout(root, join(root, 'build', 'req-ws'), { checkGitWorktree: false }), /must be outside the repository checkout/u);
    assert.throws(() => assertWorkspaceOutsideCheckout(root, 'docs/requirements', { checkGitWorktree: false }), /must be outside the repository checkout/u);
    // I1 red proof: a directory inside root whose name starts with ".." (e.g. "..req-ws") is still inside root and must be rejected.
    assert.throws(() => assertWorkspaceOutsideCheckout(root, join(root, '..req-ws'), { checkGitWorktree: false }), /must be outside the repository checkout/u);
    assert.throws(() => assertWorkspaceOutsideCheckout(root, '..req-ws', { checkGitWorktree: false }), /must be outside the repository checkout/u);

    // Junction / symlink outside pointing inside root must be rejected via realpath resolution.
    const junctionInside = join(outside, 'link-to-build');
    symlinkSync(join(root, 'build'), junctionInside, 'junction');
    assert.throws(() => assertWorkspaceOutsideCheckout(root, join(junctionInside, 'ws'), { checkGitWorktree: false }), /must be outside the repository checkout/u);

    // Another git working tree (e.g. a sibling checkout) must be rejected when checkGitWorktree is enabled (default).
    execFileSync('git', ['init'], { cwd: otherGitRepo, stdio: 'ignore' });
    assert.throws(() => assertWorkspaceOutsideCheckout(root, join(otherGitRepo, 'req-ws')), /must be outside any git working tree/u);

    // A genuine directory outside any git working tree succeeds (both same-drive and cross-drive from REPO_ROOT).
    const validTarget = join(outside, 'clean-ws');
    const resolved = assertWorkspaceOutsideCheckout(root, validTarget);
    assert.ok(resolved.endsWith('clean-ws'));
    const resolvedFromRepoRoot = assertWorkspaceOutsideCheckout(REPO_ROOT, validTarget);
    assert.ok(resolvedFromRepoRoot.endsWith('clean-ws'));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
    rmSync(otherGitRepo, { recursive: true, force: true });
  }
});

test('buildContextSnapshot skips non-module files, uses module.label, and produces a commit-independent digest', () => {
  const snapA = buildContextSnapshot(MOCK_INPUTS, { commit: '1111111' });
  const snapB = buildContextSnapshot(MOCK_INPUTS, { commit: '2222222' });
  assert.equal(snapA.snapshotDigest, snapB.snapshotDigest);
  assert.equal(snapA.summary.modules, 2, 'presets.json without id/label is skipped');
  assert.deepEqual(snapA.modules.map((m) => [m.id, m.label, m.group]), [
    ['core', '공통 기반', 'core'],
    ['promotion', '배너·팝업', 'communication'],
  ]);
  assert.equal(snapA.summary.screens, 3);
  assert.equal(snapA.summary.capabilities, 4);
  assert.equal(snapA.summary.interfaces, 2);
});

test('Git workspace detection fails closed when git cannot execute', () => {
  const outside = mkdtempSync(join(tmpdir(), 'req-git-failure-'));
  const previousPath = process.env.PATH;
  try {
    process.env.PATH = '';
    assert.throws(() => assertWorkspaceOutsideCheckout(REPO_ROOT, outside), /cannot verify.*git|Git workspace verification failed/iu);
  } finally {
    process.env.PATH = previousPath;
    rmSync(outside, { recursive: true, force: true });
  }
});

test('UAT binds requirement meaning and AC membership, rejects impossible dates and suppresses stale accepted projections', () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const pack = readyBacklog(snap);
  acceptAll(pack);
  assert.equal(validateBacklogPack(pack, snap).valid, true);
  const changed = structuredClone(pack);
  changed.businessRequirements[0].description += ' 새 업무 의미';
  assert.notEqual(computeAcHash(pack.acceptanceCriteria[0], pack), computeAcHash(changed.acceptanceCriteria[0], changed));
  assert.equal(validateBacklogPack(changed, snap).valid, false);
  assert.ok(backlogToRtmRows(changed).filter((row) => row.id === pack.businessRequirements[0].id).every((row) => row.acceptanceDisposition === 'pending'));
  assert.equal(projectUatChecklistSheet(changed).rows.find((row) => row.acId === pack.acceptanceCriteria[0].id).acceptanceDisposition, 'pending');
  const traceChanged = structuredClone(pack);
  traceChanged.traceLinks[0].targetId += '-changed';
  assert.notEqual(computeAcHash(pack.acceptanceCriteria[0], pack), computeAcHash(traceChanged.acceptanceCriteria[0], traceChanged));
  const contextChanged = structuredClone(pack);
  contextChanged.contextSnapshotDigest = 'changed';
  assert.notEqual(computeAcHash(pack.acceptanceCriteria[0], pack), computeAcHash(contextChanged.acceptanceCriteria[0], contextChanged));
  const reordered = structuredClone(pack);
  reordered.businessRequirements[0] = Object.fromEntries(Object.entries(reordered.businessRequirements[0]).reverse());
  assert.equal(computeAcHash(pack.acceptanceCriteria[0], pack), computeAcHash(reordered.acceptanceCriteria[0], reordered), 'JSON key order is not meaning');
  const shrunk = structuredClone(pack);
  shrunk.acceptanceCriteria = shrunk.acceptanceCriteria.filter((ac) => ac.id !== 'AC-PROMO-001-R1');
  assert.equal(validateBacklogPack(shrunk, snap).valid, false, 'removing Red membership must invalidate the old Green signature');
  for (const date of ['2026-99-99', '2026-02-29', '2026-11-04junk', '2026-11-04T25:00:00Z']) {
    const invalid = structuredClone(pack);
    invalid.acceptanceCriteria[0].uatVerifiedAt = date;
    assert.ok(validateBacklogPack(invalid, snap).errors.some((e) => e.includes('valid date/ISO')), date);
  }
  const leap = structuredClone(pack);
  leap.acceptanceCriteria[0].uatVerifiedAt = '2028-02-29';
  assert.equal(validateBacklogPack(leap, snap).valid, true);
});

test('CSV omissions are rejected without deleting rows or promoting acceptance; requirement edits reset UAT', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const ws = mkdtempSync(join(tmpdir(), 'req-review-omission-'));
  try {
    const pack = readyBacklog(snap);
    acceptAll(pack);
    const pendingRed = pack.acceptanceCriteria.find((ac) => ac.id === 'AC-PROMO-001-R1');
    pendingRed.acceptanceDisposition = 'pending';
    pack.businessRequirements[0].acceptanceDisposition = 'pending';
    const before = JSON.stringify(pack);
    writeFileSync(join(ws, 'backlog.json'), before);
    const sheets = await exportReviewSheets(REPO_ROOT, ws, { contextSnapshot: snap });
    const stories = readFileSync(sheets.storiesCsvPath, 'utf8');
    writeFileSync(sheets.storiesCsvPath, stories.split('\r\n').filter((line) => !line.includes('AC-PROMO-001-R1')).join('\r\n'));
    await assert.rejects(importReviewSheets(REPO_ROOT, ws, { contextSnapshot: snap }), /omits existing.*AC|implicit deletion/iu);
    assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), before);
    writeFileSync(sheets.storiesCsvPath, stories);
    const reqs = readFileSync(sheets.reqCsvPath, 'utf8');
    writeFileSync(sheets.reqCsvPath, reqs.split('\r\n').filter((line) => !line.startsWith('REQ-INT-099,')).join('\r\n'));
    await assert.rejects(importReviewSheets(REPO_ROOT, ws, { contextSnapshot: snap }), /omits existing.*requirement|implicit deletion/iu);
    assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), before);
    writeFileSync(sheets.reqCsvPath, reqs.replace(pack.businessRequirements[2].description, '새롭게 합의한 일괄 중지 업무 정의'));
    await importReviewSheets(REPO_ROOT, ws, { contextSnapshot: snap });
    const updated = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.ok(updated.acceptanceCriteria.filter((ac) => ac.requirementIds.includes('REQ-SFR-003')).every((ac) => ac.acceptanceDisposition === 'pending' && !ac.uatSignedBy));
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});

test('accepted and conditional UAT require nonblank evidence in shared validation and projections', () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  for (const disposition of ['accepted', 'conditional']) {
    const pack = readyBacklog(snap);
    acceptAll(pack);
    pack.acceptanceCriteria[0].acceptanceDisposition = disposition;
    pack.acceptanceCriteria[0].uatEvidence = '   ';
    assert.ok(validateBacklogPack(pack, snap).errors.some((message) => message.includes('requires non-empty uatEvidence')));
    assert.equal(projectUatChecklistSheet(pack).rows.find((row) => row.acId === pack.acceptanceCriteria[0].id).acceptanceDisposition, 'pending');
    pack.acceptanceCriteria[0].uatEvidence = '회의록 REF-001';
    delete pack.acceptanceCriteria[0].uatBuildRef;
    assert.ok(validateBacklogPack(pack, snap).errors.some((message) => message.includes('requires non-empty uatBuildRef')));
  }
});

test('per-requirement context binding ignores unrelated catalogs and detects relevant metadata and planned target appearance', () => {
  assert.equal(typeof workspaceEngine.computeContextBindings, 'function');
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const pack = readyBacklog(snap);
  pack.contextBindings = workspaceEngine.computeContextBindings(pack, snap);
  acceptAll(pack);
  assert.equal(validateBacklogPack(pack, snap).valid, true);
  const unrelated = structuredClone(snap);
  unrelated.snapshotDigest = 'b'.repeat(64);
  unrelated.gates.push({ id: 'unrelated-gate', status: 'partial' });
  unrelated.modules.push({ id: 'unrelated-module', label: '무관한 모듈' });
  const refreshed = { ...structuredClone(pack), contextSnapshotDigest: unrelated.snapshotDigest,
    contextBindings: workspaceEngine.computeContextBindings(pack, unrelated) };
  assert.deepEqual(refreshed.contextBindings, pack.contextBindings);
  assert.equal(computeAcHash(pack.acceptanceCriteria[0], pack), computeAcHash(refreshed.acceptanceCriteria[0], refreshed));
  const relevant = structuredClone(unrelated);
  relevant.capabilities.find((entry) => entry.id === '/admin/system/banner#promotion.popup-management').status = 'unverified';
  const changedBindings = workspaceEngine.computeContextBindings(pack, relevant);
  assert.notEqual(changedBindings['REQ-SFR-001'], pack.contextBindings['REQ-SFR-001']);
  assert.equal(changedBindings['REQ-SFR-002'], pack.contextBindings['REQ-SFR-002']);
  assert.equal(changedBindings['REQ-SFR-003'], pack.contextBindings['REQ-SFR-003']);
  relevant.capabilities.push({ id: '/admin/system/banner#promotion.popup-bulk-disable', status: 'partial' });
  const plannedLink = pack.traceLinks.find((link) => link.requirementId === 'REQ-SFR-003' && link.linkIntent === 'planned');
  relevant.capabilities.at(-1).id = plannedLink.targetId;
  assert.notEqual(workspaceEngine.computeContextBindings(pack, relevant)['REQ-SFR-003'], pack.contextBindings['REQ-SFR-003']);
  for (const contextBindings of [[], { UNKNOWN: 'a'.repeat(64) }, { 'REQ-SFR-001': 'bad' }]) {
    assert.equal(validateBacklogPack({ ...pack, contextBindings }, snap).valid, false);
  }
});

test('module presentation and aggregate growth preserve context acceptance while dependency semantics still invalidate it', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const pack = readyBacklog(snap);
  pack.contextBindings = workspaceEngine.computeContextBindings(pack, snap);
  acceptAll(pack);
  const grown = structuredClone(snap);
  grown.snapshotDigest = 'b'.repeat(64);
  Object.assign(grown.modules.find((entry) => entry.id === 'core'), { label: '새 표시 이름', group: 'new-group', routesCount: 50, tablesCount: 80 });
  const grownPack = { ...structuredClone(pack), contextSnapshotDigest: grown.snapshotDigest, contextBindings: workspaceEngine.computeContextBindings(pack, grown) };
  assert.deepEqual(grownPack.contextBindings, pack.contextBindings);
  const securityAc = pack.acceptanceCriteria.find((ac) => ac.requirementIds.includes('REQ-SFR-002'));
  assert.equal(computeAcHash(securityAc, grownPack), computeAcHash(securityAc, pack));
  const ws = mkdtempSync(join(tmpdir(), 'req-module-semantic-binding-'));
  try {
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
    writeFileSync(join(ws, 'context.snapshot.json'), JSON.stringify(snap));
    await verifyRequirementsWorkspace(REPO_ROOT, ws, { contextSnapshot: grown, refreshContext: true });
    assert.ok(JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8')).acceptanceCriteria.every((ac) => ac.acceptanceDisposition === 'accepted'));
    const dependency = structuredClone(grown);
    dependency.snapshotDigest = 'c'.repeat(64);
    dependency.modules.find((entry) => entry.id === 'core').requires = ['new-dependency'];
    assert.notEqual(workspaceEngine.computeContextBindings(pack, dependency)['REQ-SFR-002'], pack.contextBindings['REQ-SFR-002']);
    await verifyRequirementsWorkspace(REPO_ROOT, ws, { contextSnapshot: dependency, refreshContext: true });
    const refreshed = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.equal(refreshed.businessRequirements.find((req) => req.id === 'REQ-SFR-002').acceptanceDisposition, 'pending');
    assert.equal(refreshed.businessRequirements.find((req) => req.id === 'REQ-SFR-001').acceptanceDisposition, 'accepted');
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('UAT export persists the same refreshed context snapshot used by its backlog and checklist', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const next = structuredClone(snap);
  next.snapshotDigest = 'b'.repeat(64);
  next.gates.push({ id: 'new-unrelated-gate' });
  const ws = mkdtempSync(join(tmpdir(), 'req-uat-snapshot-sync-'));
  try {
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(readyBacklog(snap)));
    writeFileSync(join(ws, 'context.snapshot.json'), JSON.stringify(snap));
    await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: next });
    assert.equal(JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8')).contextSnapshotDigest, next.snapshotDigest);
    assert.deepEqual(JSON.parse(readFileSync(join(ws, 'context.snapshot.json'), 'utf8')), next);
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('readjudicated conditional and rejected rows use a new global build when the row retains its exported old build', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  for (const disposition of ['conditional', 'rejected']) {
    const ws = mkdtempSync(join(tmpdir(), 'req-uat-readjudication-'));
    try {
      const pack = readyBacklog(snap);
      pack.contextBindings = workspaceEngine.computeContextBindings(pack, snap);
      acceptAll(pack);
      const ac = pack.acceptanceCriteria[0];
      ac.acceptanceDisposition = disposition;
      pack.businessRequirements.find((req) => req.id === ac.requirementIds[0]).acceptanceDisposition = disposition;
      writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
      const { uatCsvPath } = await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap });
      const csv = readFileSync(uatCsvPath, 'utf8');
      const revised = csv.replace(`,${disposition},기관 검수 역할,2026-11-04,회의록 REF-001,`, ',accepted,기관 검수 역할,2026-11-05,재검수 증적 REF-002,');
      writeFileSync(uatCsvPath, revised);
      await importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-002' });
      const first = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
      assert.equal(first.acceptanceCriteria[0].uatBuildRef, 'BUILD-002', disposition);
      assert.equal(first.acceptanceCriteria[0].uatEvidence, '재검수 증적 REF-002');
      assert.ok(first.acceptanceCriteria.slice(1).every((item) => item.uatBuildRef === 'BUILD-001'));
      // An explicit row build differing from the old record wins over the global default.
      const next = await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap });
      writeFileSync(next.uatCsvPath, readFileSync(next.uatCsvPath, 'utf8').replace('재검수 증적 REF-002', '독립 검수 증적 REF-003').replace('BUILD-002', 'BUILD-EXPLICIT'));
      await importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-003' });
      assert.equal(JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8')).acceptanceCriteria[0].uatBuildRef, 'BUILD-EXPLICIT');
    } finally { rmSync(ws, { recursive: true, force: true }); }
  }
});

test('unchanged rejected rows preserve absent and padded optional metadata despite a new global build', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  for (const padding of [false, true]) {
    const ws = mkdtempSync(join(tmpdir(), 'req-rejected-canonical-roundtrip-'));
    try {
      const pack = readyBacklog(snap);
      pack.contextBindings = workspaceEngine.computeContextBindings(pack, snap);
      acceptAll(pack);
      const ac = pack.acceptanceCriteria[0];
      ac.acceptanceDisposition = 'rejected';
      pack.businessRequirements.find((req) => req.id === ac.requirementIds[0]).acceptanceDisposition = 'rejected';
      if (padding) Object.assign(ac, { uatSignedBy: '  기관 검수 역할  ', uatVerifiedAt: ' 2026-11-04 ', uatEvidence: '  반려 근거 REF-001  ', uatBuildRef: ' BUILD-001 ' });
      else for (const key of ['uatSignedBy', 'uatVerifiedAt', 'uatEvidence']) delete ac[key];
      writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
      await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap });
      const exported = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
      await importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-002' });
      const imported = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
      assert.deepEqual(imported.acceptanceCriteria, exported.acceptanceCriteria, padding ? 'padding must not produce a new attestation' : 'blank CSV cells must equal absent metadata');
      assert.equal(imported.acceptanceCriteria[0].uatBuildRef, exported.acceptanceCriteria[0].uatBuildRef);
      if (!padding) for (const key of ['uatSignedBy', 'uatVerifiedAt', 'uatEvidence']) assert.equal(Object.hasOwn(imported.acceptanceCriteria[0], key), false);
    } finally { rmSync(ws, { recursive: true, force: true }); }
  }
});

test('CLI refresh and UAT export preserve unrelated acceptance and reset only affected context-bound criteria', async () => {
  assert.equal(typeof workspaceEngine.computeContextBindings, 'function');
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const ws = mkdtempSync(join(tmpdir(), 'req-context-refresh-'));
  try {
    const pack = readyBacklog(snap);
    pack.contextBindings = workspaceEngine.computeContextBindings(pack, snap);
    acceptAll(pack);
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
    writeFileSync(join(ws, 'context.snapshot.json'), JSON.stringify(snap));
    const unrelated = structuredClone(snap);
    unrelated.snapshotDigest = 'b'.repeat(64);
    unrelated.gates.push({ id: 'unrelated-gate' });
    await verifyRequirementsWorkspace(REPO_ROOT, ws, { contextSnapshot: unrelated, refreshContext: true });
    const first = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.ok(first.acceptanceCriteria.every((ac) => ac.acceptanceDisposition === 'accepted'));
    const relevant = structuredClone(unrelated);
    relevant.snapshotDigest = 'c'.repeat(64);
    relevant.capabilities.find((entry) => entry.id === '/admin/system/banner#promotion.popup-management').status = 'unverified';
    await verifyRequirementsWorkspace(REPO_ROOT, ws, { contextSnapshot: relevant, refreshContext: true });
    const second = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.ok(second.acceptanceCriteria.filter((ac) => ac.requirementIds.includes('REQ-SFR-001')).every((ac) => ac.acceptanceDisposition === 'pending' && !ac.uatSignedBy));
    assert.ok(second.acceptanceCriteria.filter((ac) => !ac.requirementIds.includes('REQ-SFR-001')).every((ac) => ac.acceptanceDisposition === 'accepted'));
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
    await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: relevant });
    const stamped = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.equal(stamped.contextSnapshotDigest, relevant.snapshotDigest);
    assert.equal(stamped.businessRequirements.find((req) => req.id === 'REQ-SFR-001').acceptanceDisposition, 'pending');
    assert.equal(stamped.businessRequirements.find((req) => req.id === 'REQ-SFR-002').acceptanceDisposition, 'accepted');
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('final exporter rejects changed acceptance bindings before creating output and preserves unrelated context changes', async () => {
  assert.equal(typeof deliverablesEngine.assertCurrentBacklogAcceptance, 'function');
  const snap = await loadRepositoryContextSnapshot(REPO_ROOT);
  const pack = readyBacklog(snap);
  pack.contextBindings = workspaceEngine.computeContextBindings(pack, snap);
  acceptAll(pack);
  const unrelated = structuredClone(snap);
  unrelated.snapshotDigest = 'b'.repeat(64);
  unrelated.gates.push({ id: 'unrelated-final-export-gate' });
  await assert.doesNotReject(deliverablesEngine.assertCurrentBacklogAcceptance(pack, unrelated));
  const relevant = structuredClone(snap);
  relevant.capabilities.find((entry) => entry.id === '/admin/system/banner#promotion.popup-management').status = 'unverified';
  await assert.rejects(deliverablesEngine.assertCurrentBacklogAcceptance(pack, relevant), /refresh-context/u);
  const legacy = structuredClone(pack);
  delete legacy.contextBindings;
  await assert.rejects(deliverablesEngine.assertCurrentBacklogAcceptance(legacy, snap), /refresh-context/u);
  const ws = mkdtempSync(join(tmpdir(), 'req-export-stale-binding-'));
  try {
    // Bind to a synthetic changed interpretation, then sign that interpretation.
    pack.contextBindings = workspaceEngine.computeContextBindings(pack, relevant);
    acceptAll(pack);
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
    const out = join(ws, 'must-not-exist');
    await assert.rejects(exportDeliverables({ root: REPO_ROOT, allowDirty: true, backlog: join(ws, 'backlog.json'), out }), /refresh-context/u);
    assert.equal(existsSync(out), false);
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('CLI UAT import refuses unready definitions and requires a build reference before nonpending judgments', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const ws = mkdtempSync(join(tmpdir(), 'req-uat-readiness-'));
  try {
    const pack = readyBacklog(snap);
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
    const { uatCsvPath } = await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap });
    const signed = readFileSync(uatCsvPath, 'utf8').replace(/,pending,\(값 없음\),\(값 없음\),\(값 없음\),/gu, ',accepted,기관 검수 역할,2026-11-04,회의록 REF-001,');
    writeFileSync(uatCsvPath, signed);
    const before = readFileSync(join(ws, 'backlog.json'), 'utf8');
    await assert.rejects(importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap }), (error) => error.code === 'UAT_IMPORT_INVALID' && error.errors.some((message) => message.includes('buildRef')));
    assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), before);
    await importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-001' });
    const accepted = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.ok(accepted.acceptanceCriteria.every((ac) => ac.uatBuildRef === 'BUILD-001' && ac.uatEvidence === '회의록 REF-001'));
    const roundTrip = await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap });
    await importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-002' });
    assert.deepEqual(JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8')).acceptanceCriteria, accepted.acceptanceCriteria, 'an unchanged CSV cannot reattribute an old judgment to the new global build');
    const revised = readFileSync(roundTrip.uatCsvPath, 'utf8').replace(/BUILD-001/gu, '').replace('회의록 REF-001', '재검수 증적 REF-002');
    writeFileSync(roundTrip.uatCsvPath, revised);
    await importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-002' });
    const updated = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.equal(updated.acceptanceCriteria[0].uatBuildRef, 'BUILD-002');
    assert.ok(updated.acceptanceCriteria.slice(1).every((ac) => ac.uatBuildRef === 'BUILD-001'));
    accepted.workItems.find((item) => item.id === 'US-PROMO-001').decisionCards = ['D-1: A1'];
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(accepted));
    const rejectedBefore = readFileSync(join(ws, 'backlog.json'), 'utf8');
    await assert.rejects(importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-002' }), (error) => error.code === 'UAT_IMPORT_INVALID' && error.errors.some((message) => /readiness|ready for development/iu.test(message)));
    assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), rejectedBefore);
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('UAT import rejects missing evidence and omitted AC rows with typed safe diagnostics before writes', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const ws = mkdtempSync(join(tmpdir(), 'req-uat-evidence-'));
  try {
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(readyBacklog(snap)));
    const output = await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap });
    const before = readFileSync(join(ws, 'backlog.json'), 'utf8');
    const csv = readFileSync(output.uatCsvPath, 'utf8');
    const signedWithoutEvidence = csv.replace(/,pending,\(값 없음\),\(값 없음\),\(값 없음\),/gu, ',accepted,기관 검수 역할,2026-11-04,   ,');
    writeFileSync(output.uatCsvPath, signedWithoutEvidence);
    await assert.rejects(importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap, buildRef: 'BUILD-001' }), (error) => {
      assert.equal(error.code, 'UAT_IMPORT_INVALID');
      assert.ok(error.errors.some((message) => message.includes('uatEvidence')));
      return true;
    });
    assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), before);
    writeFileSync(output.uatCsvPath, csv.split('\r\n').filter((line) => !line.includes('AC-PROMO-001-R1')).join('\r\n'));
    await assert.rejects(importUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap }), (error) => error.code === 'UAT_IMPORT_INVALID' && error.errors.some((message) => /omits existing AC/iu.test(message)));
    assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), before);
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('CSV and UAT parser failures are typed and mask input diagnostics while filesystem failures retain their code', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const ws = mkdtempSync(join(tmpdir(), 'req-import-errors-'));
  try {
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(readyBacklog(snap)));
    const sheets = await exportReviewSheets(REPO_ROOT, ws, { contextSnapshot: snap });
    const uat = await exportUatChecklist(REPO_ROOT, ws, { contextSnapshot: snap });
    const marker = ['privacy', 'example.invalid'].join('@');
    for (const [file, method, code] of [[sheets.reqCsvPath, importReviewSheets, 'CSV_IMPORT_INVALID'], [uat.uatCsvPath, importUatChecklist, 'UAT_IMPORT_INVALID']]) {
      for (const malformed of [`${marker},${marker}\r\n`, 'id\r\n"unterminated', 'id\r\n\uFFFD']) {
        writeFileSync(file, malformed);
        await assert.rejects(method(REPO_ROOT, ws, { contextSnapshot: snap }), (error) => {
          assert.equal(error.code, code);
          assert.ok(Array.isArray(error.errors) && error.errors.length);
          assert.ok(!JSON.stringify([error.message, error.errors]).includes(marker));
          return true;
        });
      }
    }
    rmSync(sheets.reqCsvPath);
    await assert.rejects(importReviewSheets(REPO_ROOT, ws, { contextSnapshot: snap }), (error) => error.code === 'ENOENT');
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('Fit-Gap query guard blocks sensitive input in public matcher and CLI before report persistence', () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const pack = readyBacklog(snap);
  const marker = ['privacy', 'example.invalid'].join('@');
  assert.throws(() => matchRequirementsToContext(pack, snap, { query: marker }), (error) => error.code === 'MATCH_QUERY_INVALID' && !error.message.includes(marker));
  const ws = mkdtempSync(join(tmpdir(), 'req-query-guard-'));
  try {
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
    writeFileSync(join(ws, 'FIT-GAP-MATCHES.md'), 'previous safe report');
    assert.throws(() => execFileSync(process.execPath, [join(REPO_ROOT, 'scripts/export-deliverables-workspace.mjs'), 'match', '--workspace', ws, '--query', marker], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), (error) => error.status === 1 && !String(error.stderr).includes(marker));
    assert.equal(readFileSync(join(ws, 'FIT-GAP-MATCHES.md'), 'utf8'), 'previous safe report');
  } finally { rmSync(ws, { recursive: true, force: true }); }
});

test('invalid exporter backlog and report never expose raw project code; detail retains source clause provenance', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const ws = mkdtempSync(join(tmpdir(), 'req-export-guard-'));
  try {
    const pack = readyBacklog(snap);
    const marker = ['privacy', 'example.invalid'].join('@');
    pack.project.code = marker;
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack));
    const validation = validateBacklogPack(pack, snap);
    assert.ok(!renderWorkspaceReport(pack, snap, validation).includes(marker));
    pack.sources[0].id = marker;
    pack.sources[0].sourceType = marker;
    const invalidIdentifiers = validateBacklogPack(pack, snap);
    assert.ok(!renderWorkspaceReport(pack, snap, invalidIdentifiers).includes(marker), 'validation diagnostics cannot echo a sensitive entity ID or enum value');
    await assert.rejects(loadInputs(REPO_ROOT, { backlog: join(ws, 'backlog.json') }), /backlog.*validation/iu);
    const valid = readyBacklog(snap);
    const detail = backlogDetailSheet(valid);
    const json = JSON.stringify(detail);
    for (const value of [valid.sources[0].id, 'CLS-SFR-001', 'p.42 §3.2.1', 'a'.repeat(64), valid.businessRequirements[0].description]) assert.ok(json.includes(value), value);
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});

test('development readiness is separate from draft validity and all plan selectors respect scope and WONT', () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  assert.equal(typeof workspaceEngine.validateDevelopmentReadiness, 'function');
  const draft = createEmptyBacklogPack(snap);
  assert.equal(validateBacklogPack(draft, snap).valid, true);
  assert.equal(workspaceEngine.validateDevelopmentReadiness(draft, snap).valid, false);
  assert.throws(() => generateWorkPackagePlan(draft, snap), /not ready|readiness/iu);
  const pack = readyBacklog(snap);
  assert.equal(workspaceEngine.validateDevelopmentReadiness(pack, snap).valid, true);
  const broken = structuredClone(pack);
  delete broken.sources[0].clauses;
  broken.businessRequirements[0].openQuestions = ['범위 미확정'];
  broken.workItems.find((w) => w.id === 'US-PROMO-001').decisionCards = ['D-1: A1'];
  broken.acceptanceCriteria = broken.acceptanceCriteria.filter((ac) => ac.id !== 'AC-PROMO-001-R1');
  assert.equal(validateBacklogPack(broken, snap).valid, true);
  assert.equal(workspaceEngine.validateDevelopmentReadiness(broken, snap).valid, false);
  assert.throws(() => generateWorkPackagePlan(broken, snap), /not ready|readiness/iu);
  const legacyCards = readyBacklog(snap);
  legacyCards.workItems.find((w) => w.id === 'US-PROMO-001').decisionCards = { authority: '기존 형태' };
  assert.equal(workspaceEngine.validateDevelopmentReadiness(legacyCards, snap).valid, false, 'legacy object cards produce a readiness error, never a TypeError');
  const wont = structuredClone(pack);
  wont.workItems.find((w) => w.id === 'US-PROMO-001').priority = 'WONT';
  assert.ok(!generateWorkPackagePlan(wont, snap, { workItemId: 'US-PROMO-001' }).items.length);
});

test('existing UI writer lock blocks every CLI write entry before any workspace mutation', async () => {
  const snap = buildContextSnapshot(MOCK_INPUTS);
  const ws = mkdtempSync(join(tmpdir(), 'req-cli-ui-lock-'));
  try {
    await initRequirementsWorkspace(REPO_ROOT, ws, { contextSnapshot: snap, sample: true });
    const before = readFileSync(join(ws, 'backlog.json'), 'utf8');
    writeFileSync(join(ws, '.requirements-ui.lock'), '{}');
    for (const mutate of [initRequirementsWorkspace, verifyRequirementsWorkspace, exportReviewSheets, importReviewSheets, exportUatChecklist, importUatChecklist]) {
      await assert.rejects(mutate(REPO_ROOT, ws, { contextSnapshot: snap, force: true }), /UI.*lock|workspace.*locked/iu, mutate.name);
      assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), before);
    }
    for (const command of ['match', 'plan', 'check-composition', 'export-context']) {
      assert.throws(() => execFileSync(process.execPath, [join(REPO_ROOT, 'scripts/export-deliverables-workspace.mjs'), command, '--workspace', ws], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), /workspace.*locked|UI.*lock/iu, command);
      assert.equal(readFileSync(join(ws, 'backlog.json'), 'utf8'), before);
    }
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
});

test('CLI reserves exclusive writer lock across asynchronous context loading and releases its own lock on failure', async () => {
  const ws = mkdtempSync(join(tmpdir(), 'req-cli-reservation-'));
  const root = mkdtempSync(join(tmpdir(), 'req-cli-bad-context-'));
  try {
    const mutation = initRequirementsWorkspace(root, ws).then(() => null, (error) => error);
    assert.ok(readdirSync(ws).includes('.requirements-ui.lock'), 'lock exists before asynchronous context loading completes');
    await assert.rejects(initRequirementsWorkspace(REPO_ROOT, ws, { contextSnapshot: buildContextSnapshot(MOCK_INPUTS) }), /workspace.*locked|UI.*lock/iu);
    assert.ok(await mutation instanceof Error);
    assert.ok(!readdirSync(ws).includes('.requirements-ui.lock'), 'only owned lock is removed on error');
  } finally {
    rmSync(ws, { recursive: true, force: true });
    rmSync(root, { recursive: true, force: true });
  }
});

test('CLI refuses substituted hard-linked or symbolic writer locks without exposing linked payloads', async () => {
  for (const kind of ['hardlink', 'symlink']) {
    const ws = mkdtempSync(join(tmpdir(), 'req-cli-unsafe-lock-'));
    const root = mkdtempSync(join(tmpdir(), 'req-cli-unsafe-root-'));
    const outside = mkdtempSync(join(tmpdir(), 'req-cli-lock-payload-'));
    const payload = 'LOCK-PAYLOAD-SYNTHETIC-DO-NOT-OUTPUT';
    const source = join(outside, 'payload.txt');
    try {
      writeFileSync(source, payload);
      const mutation = initRequirementsWorkspace(root, ws).then(() => null, (error) => error);
      const lockPath = join(ws, '.requirements-ui.lock');
      unlinkSync(lockPath);
      if (kind === 'hardlink') linkSync(source, lockPath);
      else symlinkSync(outside, lockPath, process.platform === 'win32' ? 'junction' : 'dir');
      const error = await mutation;
      assert.ok(error instanceof Error, `${kind} replacement must fail closed`);
      assert.ok(error.message === 'workspace writer lock is unsafe or changed' || (error.syscall === 'open' && error.path === lockPath), 'failure must originate from lock opening or descriptor validation');
      assert.ok(!error.message.includes(payload), 'linked payload must never appear in diagnostics');
      assert.equal(readFileSync(source, 'utf8'), payload, 'linked target must remain untouched');
    } finally {
      for (const [directory, prefix] of [[ws, 'req-cli-unsafe-lock-'], [root, 'req-cli-unsafe-root-'], [outside, 'req-cli-lock-payload-']]) {
        assert.equal(dirname(directory), resolve(tmpdir()));
        assert.ok(basename(directory).startsWith(prefix));
        rmSync(directory, { recursive: true, force: true });
      }
    }
  }
  if (process.platform !== 'win32') {
    const ws = mkdtempSync(join(tmpdir(), 'req-cli-fifo-lock-'));
    const root = mkdtempSync(join(tmpdir(), 'req-cli-fifo-root-'));
    try {
      // A timeout in an isolated process makes a blocking open a real failure;
      // a timer in the same event loop could never interrupt openSync on a FIFO.
      const script = `
        import assert from 'node:assert/strict';
        import { unlinkSync } from 'node:fs';
        import { execFileSync } from 'node:child_process';
        import { join } from 'node:path';
        import { initRequirementsWorkspace } from ${JSON.stringify(pathToFileURL(join(REPO_ROOT, 'scripts/export-deliverables-workspace.mjs')).href)};
        const mutation = initRequirementsWorkspace(${JSON.stringify(root)}, ${JSON.stringify(ws)}).then(() => null, error => error);
        const lockPath = join(${JSON.stringify(ws)}, '.requirements-ui.lock');
        unlinkSync(lockPath);
        execFileSync('mkfifo', [lockPath]);
        const failure = await mutation;
        assert.ok(failure instanceof Error && failure.message === 'workspace writer lock is unsafe or changed', 'FIFO must fail descriptor validation');
        process.stdout.write('FIFO_REJECTED');
      `;
      assert.equal(execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 10000 }), 'FIFO_REJECTED');
    } finally {
      for (const [directory, prefix] of [[ws, 'req-cli-fifo-lock-'], [root, 'req-cli-fifo-root-']]) {
        assert.equal(dirname(directory), resolve(tmpdir()));
        assert.ok(basename(directory).startsWith(prefix));
        rmSync(directory, { recursive: true, force: true });
      }
    }
  }
});

test('loadRepositoryContextSnapshot reads the real repository ledgers with all declared modules, non-empty labels and real commit SHA', async () => {
  const expectedModuleCount = readdirSync(join(REPO_ROOT, 'config/modules'))
    .filter((f) => f.endsWith('.json') && f !== '_schema.json' && f !== 'presets.json').length;
  const live = await loadRepositoryContextSnapshot(REPO_ROOT);
  assert.equal(live.summary.modules, expectedModuleCount);
  assert.ok(live.modules.every((m) => typeof m.id === 'string' && typeof m.label === 'string' && m.label.length > 0 && m.label !== m.id));
  assert.match(live.commit, /^[0-9a-f]{40}$/u);
  assert.ok(live.summary.screens > 50);
  assert.ok(live.summary.capabilities > 150);
  assert.ok(live.summary.interfaces > 200);
  assert.ok(live.summary.tables > 80, 'live db_columns.json array must extract unique physical table names (not array indices)');
  assert.ok(live.tables.every((t) => !/^\d+$/u.test(t.id)), 'table IDs must never be numeric array indices');
  assert.ok(live.summary.gates > 100, 'live config/governance/gates.json gateSets[].rules[] must extract real gate rules');
  assert.equal(live.summary.migrationMappings, 0, 'migrationMappings must not be synthesized from tables');

  const liveSample = createSampleBacklogPack(live);
  const liveSampleVal = validateBacklogPack(liveSample, live);
  assert.equal(liveSampleVal.valid, true);
  assert.deepEqual(
    liveSampleVal.warnings,
    ['sample backlog data is loaded (isSample=true); replace with institutional requirements before exporting deliverables'],
    'sample backlog against live repository snapshot must have zero ledger mismatch warnings',
  );
});

test('context snapshot matches full exporter inputs exactly', async () => {
  const { inputs } = await loadInputs(REPO_ROOT);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  assert.deepEqual(await loadRepositoryContextSnapshot(REPO_ROOT), buildContextSnapshot(inputs, { commit }));
});

test('context snapshot reads only current ledgers without Java/E2E source scans and detects edits at unchanged HEAD', async () => {
  const root = mkdtempSync(join(tmpdir(), 'req-context-ledgers-'));
  try {
    const inputs = [
      ...readdirSync(join(REPO_ROOT, 'config/modules')).filter((file) => file.endsWith('.json')).map((file) => `config/modules/${file}`),
      'config/governance/permission-catalog.json', 'config/governance/authorization-policies.json',
      'config/ui-route-capabilities.json', 'frontend/src/types/generated-screen-registry.ts',
    ];
    for (const path of inputs) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      copyFileSync(join(REPO_ROOT, path), join(root, path));
    }
    execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-m', 'synthetic context fixture'], { cwd: root, stdio: 'ignore' });
    // No Java roots, E2E source, OpenAPI, or unrelated deliverable ledgers exist in this fixture.
    const first = await loadRepositoryContextSnapshot(root);
    assert.match(first.commit, /^[0-9a-f]{40}$/u);
    const catalogPath = join(root, 'config/governance/permission-catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
    catalog.permissions.push({ code: 'FIXTURE_CONTEXT_READ', description: '합성 원장 변경' });
    writeFileSync(catalogPath, JSON.stringify(catalog));
    writeFileSync(join(root, 'db_columns.json'), JSON.stringify([{ table_name: 'tb_fixture_context' }]));
    writeFileSync(join(root, 'config/governance/gates.json'), JSON.stringify({ gates: [{ id: 'fixture-context-gate' }] }));
    const second = await loadRepositoryContextSnapshot(root);
    assert.equal(second.commit, first.commit);
    assert.notEqual(second.snapshotDigest, first.snapshotDigest);
    assert.ok(second.permissions.some((entry) => entry.code === 'FIXTURE_CONTEXT_READ'));
    assert.ok(second.tables.some((entry) => entry.id === 'tb_fixture_context'));
    assert.ok(second.gates.some((entry) => entry.id === 'fixture-context-gate'));
    for (const marker of ['config/governance/upstream-review', 'config/governance/reusable-governance-projection.json', 'reusable-base-lock.json']) {
      mkdirSync(dirname(join(root, marker)), { recursive: true });
      writeFileSync(join(root, marker), '{}');
      await assert.rejects(loadRepositoryContextSnapshot(root), /source repository only|projected-ledger mode/u, marker);
      rmSync(join(root, marker));
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('design-to-deliverables-guide.md §7.3 vocabulary matches exported workspace schema constants (C1 parity)', () => {
  const guide = readFileSync(join(REPO_ROOT, 'docs/03-guides/design-to-deliverables-guide.md'), 'utf8');
  for (const val of REQUIREMENT_TYPES) assert.ok(guide.includes(`\`${val}\``), `guide must document requirementType ${val}`);
  for (const val of SOLUTION_DISPOSITIONS) assert.ok(guide.includes(`\`${val}\``), `guide must document solutionDisposition ${val}`);
  for (const val of SCOPE_DISPOSITIONS) assert.ok(guide.includes(`\`${val}\``), `guide must document scopeDisposition ${val}`);
  for (const val of WORK_ITEM_TYPES) assert.ok(guide.includes(`\`${val}\``), `guide must document workItemType ${val}`);
  for (const val of LINK_INTENTS) assert.ok(guide.includes(`\`${val}\``), `guide must document linkIntent ${val}`);
  for (const val of ACCEPTANCE_DISPOSITIONS) assert.ok(guide.includes(`\`${val}\``), `guide must document acceptanceDisposition ${val}`);
  for (const val of SOURCE_TYPES) assert.ok(guide.includes(`\`${val}\``), `guide must document sourceType ${val}`);
  for (const val of SOURCE_CLASSIFICATIONS) assert.ok(guide.includes(`\`${val}\``), `guide must document classification ${val}`);
  for (const val of CLAUSE_DISPOSITIONS) assert.ok(guide.includes(`\`${val}\``), `guide must document clause disposition ${val}`);
  for (const val of TARGET_KINDS) assert.ok(guide.includes(`\`${val}\``), `guide must document targetKind ${val}`);
  for (const val of AC_POLARITIES) assert.ok(guide.includes(`\`${val}\``), `guide must document polarity ${val}`);
  assert.ok(guide.includes('`nfrCriteria`'));
  assert.ok(guide.includes('`rationale`'));
  assert.ok(!guide.includes('`quantitativeCriteria`'), 'guide must not use non-existent field quantitativeCriteria');
  assert.ok(!guide.includes('`exclusionRationale`'), 'guide must not use non-existent field exclusionRationale');
  assert.ok(PRIORITIES.length === 4 && TARGET_KINDS.length === 6 && VERIFICATION_METHODS.length === 7);
});

test('init creates an empty skeleton by default and --sample creates the sample backlog with 5 views and 10-column RTM CSV', async () => {
  const root = mkdtempSync(join(tmpdir(), 'req-ws-init-root-'));
  const wsEmpty = mkdtempSync(join(tmpdir(), 'req-ws-init-empty-'));
  const wsSample = mkdtempSync(join(tmpdir(), 'req-ws-init-sample-'));
  try {
    const contextSnapshot = buildContextSnapshot(MOCK_INPUTS, { commit: 'abcdef123456' });

    // 1. Default init -> empty skeleton (I6)
    const emptyInit = await initRequirementsWorkspace(root, wsEmpty, { contextSnapshot });
    assert.equal(emptyInit.validation.valid, true);
    assert.equal(emptyInit.validation.warnings.length, 0);
    const emptyPack = JSON.parse(readFileSync(emptyInit.backlogPath, 'utf8'));
    assert.equal(emptyPack.isSample, false);
    assert.equal(emptyPack.businessRequirements.length, 0);

    // 2. --sample init -> sample backlog
    const sampleInit = await initRequirementsWorkspace(root, wsSample, { contextSnapshot, sample: true });
    assert.equal(sampleInit.validation.valid, true);
    assert.ok(sampleInit.validation.warnings.some((w) => w.includes('isSample=true')));

    const verified = await verifyRequirementsWorkspace(root, wsSample, { contextSnapshot });
    assert.equal(verified.validation.valid, true);

    const reportText = readFileSync(verified.reportPath, 'utf8');
    for (const claim of BANNED_CLAIMS) {
      assert.ok(!reportText.includes(claim), `report must not include banned claim: ${claim}`);
    }
    assert.match(reportText, /보기 1 \(P0\): 원시 요구사항 수집 원천 목록/u);
    assert.match(reportText, /보기 2 \(P1\): 정규화 요구사항·정량 기준·미결 질의 목록/u);
    assert.match(reportText, /보기 3 \(P1\): 3축 Fit-Gap 판정 및 범위 처분 표/u);
    assert.match(reportText, /보기 4 \(P2~P3\): 애자일 에픽·작업 항목·인수조건\(Green\/Red AC\) 백로그/u);
    assert.match(reportText, /보기 5 \(P3~P5\): 4층 상태 분리 요구사항↔IE 원장 추적 보드/u);
    assert.ok(!reportText.includes('undefined'), 'report must never render literal undefined');

    // Verify 10-column RTM CSV round-trip including unlinked sibling AC and unlinked excluded requirement (M3 + QW3)
    const rtmText = readFileSync(verified.rtmPath, 'utf8');
    const parsedReqs = readRequirements(rtmText);
    assert.equal(parsedReqs.length, 7, '5 traceLinks + 1 unlinked sibling AC AC-PROMO-002-R2 + 1 unlinked excluded requirement REQ-INT-099');
    assert.ok(parsedReqs.some((r) => r.id === 'REQ-SFR-003' && r.acId === 'AC-PROMO-002-R2' && r.target === ''));
    assert.ok(parsedReqs.some((r) => r.id === 'REQ-INT-099' && r.scopeDisposition === 'excluded' && r.target === ''));

    const sheet = requirementSheet(parsedReqs, {
      screens: new Set(contextSnapshot.screens.map((s) => s.route)),
      capabilities: new Set(contextSnapshot.capabilities.map((c) => c.id)),
      interfaces: new Set(contextSnapshot.interfaces.map((i) => i.id)),
      capabilityMap: new Map(contextSnapshot.capabilities.map((c) => [c.id, c])),
      screenMap: new Map(contextSnapshot.screens.map((s) => [s.route, s])),
    });
    const byReqTarget = new Map(sheet.rows.map((r) => [`${r.id}:${r.target}`, r]));
    const fitRow = byReqTarget.get('REQ-SFR-001:/admin/system/banner#promotion.popup-management');
    assert.equal(fitRow.found, true);
    assert.equal(fitRow.ledgerStatus, 'partial');
    assert.equal(fitRow.evidenceLevel, 'E3');
    assert.equal(fitRow.acceptanceDisposition, 'pending');

    const gapRow = byReqTarget.get('REQ-SFR-003:/admin/system/banner#promotion.popup-bulk-suspend');
    assert.equal(gapRow.found, false);
    assert.equal(gapRow.ledgerStatus, null);
    assert.equal(gapRow.linkIntent, 'planned');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(wsEmpty, { recursive: true, force: true });
    rmSync(wsSample, { recursive: true, force: true });
  }
});

test('validateBacklogPack enforces strict key allowlists, 4-layer separation, cross-references and rationale/NFR rules (H5 red proofs)', () => {
  const contextSnapshot = buildContextSnapshot(MOCK_INPUTS);
  const bad = createSampleBacklogPack(contextSnapshot);

  // 1. Forbidden status fields on any entity (I5)
  bad.sources[0].status = 'done';
  bad.businessRequirements[0].implemented = true;
  bad.workItems[0].progress = '100%';
  bad.acceptanceCriteria[0].state = 'passed';
  bad.traceLinks[0].status = 'complete';
  // 2. Unknown schema key on entity (I5)
  bad.businessRequirements[1].exclusionRationale = 'wrong field name';
  // 3. Excluded / deferred without rationale (M5)
  bad.businessRequirements[4].rationale = '   ';
  bad.businessRequirements.push({
    id: 'REQ-DEF-001',
    sourceIds: ['SRC-RFP-001'],
    title: '보류 요구사항',
    requirementType: 'functional',
    solutionDisposition: 'gap-dev',
    scopeDisposition: 'deferred',
    rationale: '',
  });
  // 4. Included data/constraint/non-functional without nfrCriteria (M5)
  bad.businessRequirements[3].nfrCriteria = null;
  bad.businessRequirements.push({
    id: 'REQ-DAT-001',
    sourceIds: ['SRC-RFP-001'],
    title: '데이터 표준 준수 요구사항',
    requirementType: 'data',
    solutionDisposition: 'fit',
    scopeDisposition: 'included',
  });
  // 5. Cross-reference mismatch in traceLink (M5)
  bad.traceLinks.push({
    id: 'TRL-CROSS-ERR',
    requirementId: 'REQ-SFR-001',
    workItemId: 'CFG-SEC-001', // belongs to REQ-SFR-002, not REQ-SFR-001
    acId: 'AC-PROMO-002-G1', // belongs to US-PROMO-002 and REQ-SFR-003
    targetKind: 'screen',
    targetId: '/admin/security/login-policy',
    linkIntent: 'existing',
  });

  const res = validateBacklogPack(bad, contextSnapshot);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('source SRC-RFP-001: manual status field "status" is forbidden')));
  assert.ok(res.errors.some((e) => e.includes('businessRequirement REQ-SFR-001: manual status field "implemented" is forbidden')));
  assert.ok(res.errors.some((e) => e.includes('workItem EPIC-PROMO: manual status field "progress" is forbidden')));
  assert.ok(res.errors.some((e) => e.includes('acceptanceCriterion AC-PROMO-001-G1: manual status field "state" is forbidden')));
  assert.ok(res.errors.some((e) => e.includes('traceLink TRL-001: manual status field "status" is forbidden')));
  assert.ok(res.errors.some((e) => e.includes('unknown field "exclusionRationale" is not allowed')));
  assert.ok(res.errors.some((e) => e.includes('REQ-INT-099: excluded requirement requires a non-empty rationale')));
  assert.ok(res.errors.some((e) => e.includes('REQ-DEF-001: deferred requirement requires a non-empty rationale')));
  assert.ok(res.errors.some((e) => e.includes('REQ-PER-001: included non-functional requirement requires nfrCriteria')));
  assert.ok(res.errors.some((e) => e.includes('REQ-DAT-001: included data requirement requires nfrCriteria')));
  assert.ok(res.errors.some((e) => e.includes('TRL-CROSS-ERR: workItem "CFG-SEC-001" does not reference requirementId "REQ-SFR-001"')));
  assert.ok(res.errors.some((e) => e.includes('TRL-CROSS-ERR: ac "AC-PROMO-002-G1" does not reference requirementId "REQ-SFR-001"')));
  assert.ok(res.errors.some((e) => e.includes('TRL-CROSS-ERR: ac "AC-PROMO-002-G1" belongs to workItem "US-PROMO-002", not "CFG-SEC-001"')));
});

test('validateBacklogPack and verify handle missing polarity, user "100%" RFP text, snapshot drift and ledger status calibration (I2, I3, I4)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'req-ws-verify-root-'));
  const ws = mkdtempSync(join(tmpdir(), 'req-ws-verify-out-'));
  try {
    const snap1 = buildContextSnapshot(MOCK_INPUTS, { commit: '111' });
    await initRequirementsWorkspace(root, ws, { contextSnapshot: snap1 });

    // User requirement text containing "100%" or "완전 자동" must NOT crash renderWorkspaceReport (I2b)
    const pack = createEmptyBacklogPack(snap1);
    pack.sources.push({
      id: 'SRC-1',
      sourceType: 'rfp',
      title: '보안 요구사항 (DB 암호화 100% 적용)',
      summary: '개인정보 컬럼 100% 암호화 및 완전 자동 백업 요구',
    });
    pack.businessRequirements.push({
      id: 'REQ-1',
      sourceIds: ['SRC-1'],
      title: '개인정보 100% 암호화',
      requirementType: 'non-functional',
      solutionDisposition: 'fit',
      scopeDisposition: 'included',
      nfrCriteria: { metric: 'encryption_rate', threshold: '100%', verificationMethod: 'harness-gate' },
    });
    pack.workItems.push({
      id: 'EPIC-1',
      workItemType: 'epic',
      parentEpicId: null,
      requirementIds: ['REQ-1'],
      title: '암호화 에픽',
    });
    pack.workItems.push({
      id: 'VRF-1',
      workItemType: 'verification',
      parentEpicId: 'EPIC-1',
      requirementIds: ['REQ-1'],
      title: '암호화 검증',
    });
    // Link to unavailable capability and demo screen -> must warn (I3)
    pack.traceLinks.push({
      id: 'TRL-UNAVAIL',
      requirementId: 'REQ-1',
      workItemId: 'VRF-1',
      targetKind: 'capability',
      targetId: '/admin/system/banner#popup.unavailable',
      linkIntent: 'existing',
    });
    pack.traceLinks.push({
      id: 'TRL-DEMO',
      requirementId: 'REQ-1',
      workItemId: 'VRF-1',
      targetKind: 'screen',
      targetId: '/admin/patterns',
      linkIntent: 'existing',
    });

    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack, null, 2), 'utf8');

    // Simulate repository ledger change (snap2 has an extra screen) -> drift warning unless --refresh-context is passed (I4)
    const snap2 = buildContextSnapshot({
      ...MOCK_INPUTS,
      registry: {
        screens: [...MOCK_INPUTS.registry.screens, { route: '/admin/new', label: '신규', demo: false, entry: { permissions: [] } }],
      },
    }, { commit: '222' });

    const verifiedDrift = await verifyRequirementsWorkspace(root, ws, { contextSnapshot: snap2 });
    assert.ok(verifiedDrift.validation.warnings.some((w) => w.includes('differs from current repository snapshot')));
    assert.ok(verifiedDrift.validation.warnings.some((w) => w.includes('status=unavailable')));
    assert.ok(verifiedDrift.validation.warnings.some((w) => w.includes('status=demo')));

    // Refresh context updates pack digest and clears drift warning
    const verifiedRefreshed = await verifyRequirementsWorkspace(root, ws, { contextSnapshot: snap2, refreshContext: true });
    assert.ok(!verifiedRefreshed.validation.warnings.some((w) => w.includes('differs from current repository snapshot')));

    // Missing polarity on AC must write error list to WORKSPACE-REPORT.md and throw validation error, NOT TypeError (I2a)
    pack.acceptanceCriteria.push({
      id: 'AC-BAD',
      workItemId: 'VRF-1',
      requirementIds: ['REQ-1'],
      given: 'g',
      when: 'w',
      then: 't',
      verificationMethod: 'unit-test',
    });
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack, null, 2), 'utf8');
    await assert.rejects(
      verifyRequirementsWorkspace(root, ws, { contextSnapshot: snap2 }),
      /acceptanceCriterion AC-BAD: invalid polarity/u,
    );
    const errReport = readFileSync(join(ws, 'WORKSPACE-REPORT.md'), 'utf8');
    assert.match(errReport, /오류 있음 \(INVALID\)/u);
    assert.match(errReport, /acceptanceCriterion AC-BAD: invalid polarity/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(ws, { recursive: true, force: true });
  }
});


test('Phase 1 (QW1, QW3, QW4, QW5, QW6): PII/secret red proofs, clause coverage red proofs, lossless RTM, decision/ambiguity warnings, and atomic refresh-context rollback', async () => {
  const root = mkdtempSync(join(tmpdir(), 'req-ws-p1-root-'));
  const ws = mkdtempSync(join(tmpdir(), 'req-ws-p1-out-'));
  try {
    const snap1 = buildContextSnapshot(MOCK_INPUTS, { commit: '111' });

    // 1. PII & secret guard (QW4): blocks RRN, phone, email, private IPv4 literal, secret literal without echoing raw values, while allowing CIDR /24
    const piiPack = createSampleBacklogPack(snap1);
    const sampleRrn = ['900101', '1234567'].join('-');
    const samplePhone = ['010', '9876', '5432'].join('-');
    const sampleEmail = ['hong.gildong', 'korea.kr'].join('@');
    const samplePrivateIp = ['10', '20', '30', '45'].join('.');
    const sampleSecret = ['api_key', "'SuperSecretValue999!'"].join('=');
    piiPack.sources[0].excerpts.push(`담당자 ${sampleRrn} 연락처 ${samplePhone} 이메일 ${sampleEmail}`);
    piiPack.businessRequirements[1].description = `관리자 접속 호스트 ${samplePrivateIp} 및 대역 10.20.30.0/24 허용, ${sampleSecret}`;

    const piiHits = scanBacklogForPiiAndSecrets(piiPack);
    assert.ok(piiHits.some((h) => h.kind.includes('resident-registration-number')));
    assert.ok(piiHits.some((h) => h.kind.includes('mobile-phone')));
    assert.ok(piiHits.some((h) => h.kind.includes('email-address')));
    assert.ok(piiHits.some((h) => h.kind.includes('private-ip-literal')));
    assert.ok(piiHits.some((h) => h.kind.includes('secret-or-credential')));

    const piiValidation = validateBacklogPack(piiPack, snap1);
    assert.equal(piiValidation.valid, false);
    const joinedErrors = piiValidation.errors.join('\n');
    assert.match(joinedErrors, /PII\/secret guard violation/u);
    assert.ok(!joinedErrors.includes(sampleRrn), 'error message must never echo raw RRN');
    assert.ok(!joinedErrors.includes(sampleSecret.slice(9)), 'error message must never echo raw secret literal');

    // CIDR /24 alone must pass PII/secret guard
    const cidrPack = createSampleBacklogPack(snap1);
    cidrPack.businessRequirements[1].description = '관리자 접속 허용 대역 10.20.30.0/24 설정';
    assert.equal(scanBacklogForPiiAndSecrets(cidrPack).length, 0);

    // 2. Clause coverage & source provenance red proofs (QW5)
    const clausePack = createSampleBacklogPack(snap1);
    clausePack.sources[0].fileSha256 = 'not-a-valid-sha256';
    clausePack.sources[0].classification = 'top-secret';
    clausePack.sources[0].clauses.push(
      { id: 'CLS-ERR-INC', text: '포함 조항인데 연결 요구사항 없음', disposition: 'included', requirementIds: [] },
      { id: 'CLS-ERR-EXC', text: '제외 조항인데 사유 없음', disposition: 'excluded', rationale: '' },
      { id: 'CLS-ERR-QST', text: '질의 조항인데 사유도 미결 질의도 없음', disposition: 'question', requirementIds: ['REQ-SFR-001'] },
    );
    const clauseRes = validateBacklogPack(clausePack, snap1);
    assert.equal(clauseRes.valid, false);
    assert.ok(clauseRes.errors.some((e) => e.includes('fileSha256 must be a 64-character hex SHA-256 digest')));
    assert.ok(clauseRes.errors.some((e) => e.includes('invalid classification "top-secret"')));
    assert.ok(clauseRes.errors.some((e) => e.includes('CLS-ERR-INC: included clause must link to at least one requirementId')));
    assert.ok(clauseRes.errors.some((e) => e.includes('CLS-ERR-EXC: excluded clause requires a non-empty rationale')));
    assert.ok(clauseRes.errors.some((e) => e.includes('CLS-ERR-QST: question clause requires a rationale or a linked requirement with openQuestions')));

    // 3. Decision card ledger cross-check & ambiguity warnings (QW1)
    const warnPack = createSampleBacklogPack(snap1);
    warnPack.businessRequirements[0].description = '팝업을 적절히 신속히 관리한다.';
    warnPack.workItems[2].decisionCards.push('D-1: @AdminOrSystem 및 POPUP_NONEXISTENT_PERM 권한 검사, 신규는 new:POPUP_BULK_SUSPEND 제안');
    const warnRes = validateBacklogPack(warnPack, snap1);
    assert.equal(warnRes.valid, true);
    assert.ok(warnRes.warnings.some((w) => w.includes('ambiguous phrasing ("적절히")')));
    assert.ok(warnRes.warnings.some((w) => w.includes('non-existent annotation "@AdminOrSystem"')));
    assert.ok(warnRes.warnings.some((w) => w.includes('permission "POPUP_NONEXISTENT_PERM" not found')));
    assert.ok(!warnRes.warnings.some((w) => w.includes('POPUP_BULK_SUSPEND')), 'new: prefixed permission proposal must not warn');

    // 4. Atomic --refresh-context rollback when backlog.json is invalid + diffContextSnapshots (QW6)
    await initRequirementsWorkspace(root, ws, { contextSnapshot: snap1, sample: true });
    const snap2 = buildContextSnapshot({
      ...MOCK_INPUTS,
      registry: {
        screens: MOCK_INPUTS.registry.screens.slice(0, 2),
      },
      routes: {
        routes: [
          {
            ...MOCK_INPUTS.routes.routes[0],
            capabilities: [
              { id: 'promotion.popup-management', status: 'verified', evidenceLevel: 'E3' },
              { id: 'popup.unverified', status: 'unverified', evidenceLevel: 'E0' },
              { id: 'popup.unavailable', status: 'unavailable', evidenceLevel: 'E1' },
            ],
          },
          MOCK_INPUTS.routes.routes[1],
        ],
      },
    }, { commit: '222' });

    const samplePack = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    const diff = diffContextSnapshots(snap1, snap2, samplePack);
    assert.equal(diff.changed, true);
    assert.deepEqual(diff.removedScreens, ['/admin/patterns']);
    assert.ok(diff.statusChanges.some((c) => c.targetId === '/admin/system/banner#promotion.popup-management' && c.to === 'verified/E3'));
    assert.ok(diff.impactedLinks.some((l) => l.linkId === 'TRL-001' && l.impact === 'status-or-evidence-changed'));

    // Make backlog invalid and attempt --refresh-context -> context.snapshot.json and backlog.json digest must NOT be overwritten
    samplePack.businessRequirements[0].scopeDisposition = 'invalid-scope';
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(samplePack, null, 2), 'utf8');
    await assert.rejects(
      verifyRequirementsWorkspace(root, ws, { contextSnapshot: snap2, refreshContext: true }),
      /invalid scopeDisposition/u,
    );
    const snapOnDisk = JSON.parse(readFileSync(join(ws, 'context.snapshot.json'), 'utf8'));
    assert.equal(snapOnDisk.snapshotDigest, snap1.snapshotDigest, 'atomic refreshContext must not overwrite context.snapshot.json when backlog validation fails');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(ws, { recursive: true, force: true });
  }
});

test('Phase 2 & Phase 3 (S1, S2, S3, S4, S5, S6): Fit-Gap matcher, topological plan, review sheets round-trip, UAT hash lock red proof, 6 targetKinds, and composition check', async () => {
  const root = mkdtempSync(join(tmpdir(), 'req-ws-p23-root-'));
  const ws = mkdtempSync(join(tmpdir(), 'req-ws-p23-out-'));
  try {
    const inputsWithExtendedLedgers = {
      ...MOCK_INPUTS,
      dbColumns: [
        { table_name: 'tb_popup_info', column_name: 'popup_sn' },
        { table_name: 'tb_popup_info', column_name: 'ntce_yn' },
        { table_name: 'tb_login_plcy', column_name: 'ip_info' },
      ],
      gates: {
        gateSets: [
          {
            id: 'security',
            ciStep: 'verify-auth',
            rules: [{ id: 'gate-auth-boundary', blocking: true }],
          },
        ],
      },
      migrationMappings: [
        { id: 'migration:tb_popup_info', table: 'tb_popup_info', modules: ['promotion'], status: 'declared+schema' },
      ],
    };
    const contextSnapshot = buildContextSnapshot(inputsWithExtendedLedgers, { commit: '333' });
    assert.equal(contextSnapshot.summary.tables, 2);
    assert.equal(contextSnapshot.summary.gates, 2);
    assert.equal(contextSnapshot.summary.migrationMappings, 1);

    await initRequirementsWorkspace(root, ws, { contextSnapshot, sample: true });

    // S3: Add table, gate, migration-mapping traceLinks and dependsOn ordering
    const pack = readyBacklog(contextSnapshot);
    pack.workItems.find((w) => w.id === 'US-PROMO-002').dependsOn = ['US-PROMO-001'];
    pack.traceLinks.push(
      { id: 'TRL-TBL', requirementId: 'REQ-SFR-003', workItemId: 'US-PROMO-002', targetKind: 'table', targetId: 'tb_popup_info', linkIntent: 'existing' },
      { id: 'TRL-GATE', requirementId: 'REQ-SFR-002', workItemId: 'CFG-SEC-001', targetKind: 'gate', targetId: 'gate-auth-boundary', linkIntent: 'existing' },
      { id: 'TRL-MIG', requirementId: 'REQ-SFR-001', workItemId: 'US-PROMO-001', targetKind: 'migration-mapping', targetId: 'migration:tb_popup_info', linkIntent: 'existing' },
    );
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack, null, 2), 'utf8');

    const verified = await verifyRequirementsWorkspace(root, ws, { contextSnapshot });
    assert.equal(verified.validation.valid, true);

    // S1: Fit-Gap candidate matcher (partial capability suggests hybrid when requirement is undecided)
    const undecidedPack = structuredClone(pack);
    undecidedPack.businessRequirements[0].solutionDisposition = 'undecided';
    const matched = matchRequirementsToContext(undecidedPack, contextSnapshot);
    assert.ok(matched.results.length >= 4);
    const promoMatch = matched.results.find((m) => m.requirementId === 'REQ-SFR-001');
    assert.ok(promoMatch.candidates.modules.some((h) => h.id === 'promotion'));
    assert.equal(promoMatch.suggestedDisposition, 'hybrid', 'partial capability must suggest hybrid rather than pure fit');
    assert.match(matched.markdown, /Fit-Gap 자동 매칭 추천 보고서/u);

    // S2: Work-package plan with topological dependsOn ordering, WONT/excluded filtering, and H1~H5 checklist
    const planned = generateWorkPackagePlan(pack, contextSnapshot);
    assert.equal(planned.items.length, 4);
    const idx001 = planned.items.findIndex((w) => w.id === 'US-PROMO-001');
    const idx002 = planned.items.findIndex((w) => w.id === 'US-PROMO-002');
    assert.ok(idx001 < idx002, 'US-PROMO-001 must precede US-PROMO-002 due to dependsOn');
    assert.match(planned.markdown, /수직 슬라이스 구현 작업 패키지 계획서/u);
    assert.match(planned.markdown, /선행 작업\(dependsOn\): `US-PROMO-001`/u);
    assert.match(planned.markdown, /보안 경계 안내 \(Untrusted Data\)/u);
    assert.match(planned.markdown, /H2 신호 은폐 금지/u);
    assert.match(planned.markdown, /H4 기계적 일괄 치환 금지/u);

    const batch2Planned = generateWorkPackagePlan(pack, contextSnapshot, { batch: 'Batch-2' });
    const batch2Promo = batch2Planned.items.find((w) => w.id === 'US-PROMO-002');
    assert.deepEqual(batch2Promo.externalDependencies, ['US-PROMO-001'], 'filtered batch plan must surface cross-batch dependencies');

    // S4: Review sheets CSV round-trip (customer edits rationale, semicolons/pipes in lists, and clears optional fields)
    const exportedSheets = await exportReviewSheets(root, ws, { contextSnapshot });
    const reqCsvEdited = readFileSync(exportedSheets.reqCsvPath, 'utf8')
      .replace('착수 회의록(MIN-2026-1102-01) 합의에 따라 표준 API 전환 후 차기 사업에서 추진하기로 금차 범위에서 제외.', '발주기관 최종 합의에 따라 금차 제외 확정(2026-11-03).');
    writeFileSync(exportedSheets.reqCsvPath, reqCsvEdited, 'utf8');
    const importedSheets = await importReviewSheets(root, ws, { contextSnapshot });
    assert.equal(importedSheets.validation.valid, true);
    const packAfterReview = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.equal(
      packAfterReview.businessRequirements.find((r) => r.id === 'REQ-INT-099').rationale,
      '발주기관 최종 합의에 따라 금차 제외 확정(2026-11-03).',
    );

    // Manual override of acceptanceDisposition in requirements-review.csv must be rejected (Must-Fix #3)
    const reqCsvTamperedAcc = reqCsvEdited.replace(',pending', ',accepted');
    writeFileSync(exportedSheets.reqCsvPath, reqCsvTamperedAcc, 'utf8');
    await assert.rejects(
      importReviewSheets(root, ws, { contextSnapshot }),
      /acceptanceDisposition cannot be manually overridden in requirements-review\.csv/u,
    );
    writeFileSync(exportedSheets.reqCsvPath, reqCsvEdited, 'utf8');

    // S5: UAT checklist export/import + stale acContentHash rejection red proof + requirement acceptance rollup
    const uatExported = await exportUatChecklist(root, ws, { contextSnapshot });
    const uatCsvAccepted = readFileSync(uatExported.uatCsvPath, 'utf8')
      .replace(/,pending,\(값 없음\),\(값 없음\),\(값 없음\),/gu, ',accepted,홍길동 감독관,2026-11-03,시연 합격,');
    writeFileSync(uatExported.uatCsvPath, uatCsvAccepted, 'utf8');

    const uatImported = await importUatChecklist(root, ws, { contextSnapshot, buildRef: 'BUILD-001' });
    assert.equal(uatImported.updatedAcs, 7);
    assert.ok(uatImported.acceptedRequirements >= 1);
    const packAfterUat = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    // REQ-SFR-003 has 1 Green AC and 2 Red ACs, all accepted -> requirement rolls up to accepted
    assert.equal(packAfterUat.businessRequirements.find((r) => r.id === 'REQ-SFR-003').acceptanceDisposition, 'accepted');

    // Now mutate AC-PROMO-002-G1 text in backlog.json so the CSV's acContentHash becomes stale -> importUatChecklist must reject!
    packAfterUat.acceptanceCriteria.find((a) => a.id === 'AC-PROMO-002-G1').then = '선택한 팝업의 노출 여부가 변경된다(사유 기록 조건 임의 삭제)';
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(packAfterUat, null, 2), 'utf8');
    await assert.rejects(
      importUatChecklist(root, ws, { contextSnapshot, buildRef: 'BUILD-001' }),
      /acContentHash .* does not match current AC text/u,
    );

    // Re-exporting UAT checklist after AC text mutation resets the mutated AC and its parent requirement back to pending!
    await exportUatChecklist(root, ws, { contextSnapshot });
    const packAfterReset = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    assert.equal(packAfterReset.acceptanceCriteria.find((a) => a.id === 'AC-PROMO-002-G1').acceptanceDisposition, 'pending');
    assert.equal(packAfterReset.businessRequirements.find((r) => r.id === 'REQ-SFR-003').acceptanceDisposition, 'pending');

    // S6: Two-way composition vs backlog verification (forward missingModules + reverse unsolicitedModules + preset expansion)
    const compMissing = compareBacklogWithComposition(packAfterReset, contextSnapshot, { selectedModules: ['core'] });
    assert.equal(compMissing.valid, false);
    assert.deepEqual(compMissing.missingModules.map((m) => m.moduleId), ['promotion']);

    const compPresetPass = compareBacklogWithComposition(packAfterReset, contextSnapshot, { preset: 'collaboration' });
    assert.equal(compPresetPass.valid, true);
    assert.deepEqual(compPresetPass.unsolicitedModules, []);

    const compUnsolicited = compareBacklogWithComposition(packAfterReset, {
      ...contextSnapshot,
      modules: [...contextSnapshot.modules, { id: 'board', label: '게시판', required: false, requires: [], group: 'communication', routes: [], tables: [] }],
    }, { selectedModules: ['core', 'promotion', 'board'] });
    assert.equal(compUnsolicited.valid, true);
    assert.deepEqual(compUnsolicited.unsolicitedModules, ['board']);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(ws, { recursive: true, force: true });
  }
});

test('Review hardening red proofs: AC hash tab non-collision, UAT signature/rollup enforcement, PII redaction in invalid report, and cycle detection', async () => {
  const root = mkdtempSync(join(tmpdir(), 'req-ws-hardening-root-'));
  const ws = mkdtempSync(join(tmpdir(), 'req-ws-hardening-out-'));
  try {
    const snap = buildContextSnapshot(MOCK_INPUTS, { commit: '444' });

    // 1. computeAcHash must not collide when tabs are shifted between fields
    const hashA = computeAcHash({ id: 'AC-1', polarity: 'allow', given: 'a\tb', when: 'c', then: 'd', verificationMethod: 'e2e' });
    const hashB = computeAcHash({ id: 'AC-1', polarity: 'allow', given: 'a', when: 'b\tc', then: 'd', verificationMethod: 'e2e' });
    assert.notEqual(hashA, hashB, 'structured JSON serialization in computeAcHash must prevent tab-boundary collisions');

    // 2. Host IP /32, unhyphenated RRN, +82 phone, Korean secret label, and project-level PII must be caught, and invalid WORKSPACE-REPORT.md must not leak them
    await initRequirementsWorkspace(root, ws, { contextSnapshot: snap, sample: true });
    const pack = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    const secretMarker = ['비밀번호', 'SecretKorPass999!'].join(': ');
    const hostCidr = ['10.20.30.45', '32'].join('/');
    pack.project.institution = `기관담당 ${secretMarker} (${hostCidr})`;
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(pack, null, 2), 'utf8');

    await assert.rejects(
      verifyRequirementsWorkspace(root, ws, { contextSnapshot: snap }),
      /PII\/secret guard violation at project\.institution/u,
    );
    const reportOnFail = readFileSync(join(ws, 'WORKSPACE-REPORT.md'), 'utf8');
    assert.ok(!reportOnFail.includes('SecretKorPass999!'), 'invalid WORKSPACE-REPORT.md must never leak raw secret strings');
    assert.ok(!reportOnFail.includes(hostCidr), 'invalid WORKSPACE-REPORT.md must never leak raw host IP strings');

    // 3. Requirement acceptanceDisposition mismatch, unsigned accepted AC, unknown clause key, and dependsOn cycle must all fail validation
    const badPack = createSampleBacklogPack(snap);
    badPack.businessRequirements[0].acceptanceDisposition = 'accepted'; // ACs are still pending -> must fail!
    badPack.acceptanceCriteria[0].acceptanceDisposition = 'accepted'; // Missing acContentHash, uatSignedBy, uatVerifiedAt -> must fail!
    badPack.sources[0].clauses[0].unknownClauseField = 'forbidden';
    badPack.workItems[2].dependsOn = ['US-PROMO-002'];
    badPack.workItems[3].dependsOn = ['US-PROMO-001'];
    const badVal = validateBacklogPack(badPack, snap);
    assert.equal(badVal.valid, false);
    assert.ok(badVal.errors.some((e) => e.includes('REQ-SFR-001: acceptanceDisposition "accepted" does not match AC rollup')));
    assert.ok(badVal.errors.some((e) => e.includes('AC-PROMO-001-G1: acceptanceDisposition "accepted" requires acContentHash')));
    assert.ok(badVal.errors.some((e) => e.includes('AC-PROMO-001-G1: acceptanceDisposition "accepted" requires non-empty uatSignedBy')));
    assert.ok(badVal.errors.some((e) => e.includes('unknown field "unknownClauseField" is not allowed')));
    assert.ok(badVal.errors.some((e) => e.includes('dependency cycle detected')));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(ws, { recursive: true, force: true });
  }
});
