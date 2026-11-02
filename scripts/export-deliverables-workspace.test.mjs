import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BANNED_CLAIMS } from './export-deliverables.mjs';
import { readRequirements, requirementSheet } from './export-deliverables-trace.mjs';
import {
  ACCEPTANCE_DISPOSITIONS,
  AC_POLARITIES,
  LINK_INTENTS,
  PRIORITIES,
  REQUIREMENT_TYPES,
  SCOPE_DISPOSITIONS,
  SOLUTION_DISPOSITIONS,
  SOURCE_TYPES,
  TARGET_KINDS,
  VERIFICATION_METHODS,
  WORK_ITEM_TYPES,
  assertWorkspaceOutsideCheckout,
  backlogToRtmCsv,
  buildContextSnapshot,
  createEmptyBacklogPack,
  createSampleBacklogPack,
  initRequirementsWorkspace,
  loadRepositoryContextSnapshot,
  renderWorkspaceReport,
  validateBacklogPack,
  verifyRequirementsWorkspace,
} from './export-deliverables-workspace.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

const MOCK_INPUTS = {
  moduleFiles: {
    'core.json': { id: 'core', label: '공통 기반', required: true, presentation: { group: 'core' }, owns: { routes: ['/admin/security/login-policy'], tables: ['tb_login_plcy'] } },
    'promotion.json': { id: 'promotion', label: '배너·팝업', required: false, presentation: { group: 'communication' }, owns: { routes: ['/admin/content/banners-popups'], tables: ['tb_popup_info'] } },
    'presets.json': { presets: [] },
  },
  routes: {
    routes: [
      {
        route: '/admin/content/banners-popups',
        status: 'partial',
        routing: { kind: 'page' },
        capabilities: [
          { id: 'popup.manage', status: 'partial', evidenceLevel: 'E3' },
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
      { route: '/admin/content/banners-popups', label: '배너·팝업 관리', demo: false, entry: { permissions: ['BANNER_ADMIN_READ'] } },
      { route: '/admin/security/login-policy', label: '로그인 정책 관리', demo: false, entry: { permissions: ['LOGIN_POLICY_READ'] } },
      { route: '/admin/patterns', label: '패턴 갤러리', demo: true, entry: { permissions: [] } },
    ],
  },
  policies: {
    operationBindings: [
      { method: 'GET', path: '/api/v1/admin/system/popups', access: 'PERMISSION', permission: 'POPUP_ADMIN_READ' },
      { method: 'POST', path: '/api/v1/admin/system/popups', access: 'PERMISSION', permission: 'POPUP_ADMIN_WRITE' },
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
  for (const val of AC_POLARITIES) assert.ok(guide.includes(`\`${val}\``), `guide must document polarity ${val}`);
  assert.ok(guide.includes('`nfrCriteria`'));
  assert.ok(guide.includes('`rationale`'));
  assert.ok(!guide.includes('`quantitativeCriteria`'), 'guide must not use non-existent field quantitativeCriteria');
  assert.ok(!guide.includes('`exclusionRationale`'), 'guide must not use non-existent field exclusionRationale');
  assert.ok(PRIORITIES.length === 4 && TARGET_KINDS.length === 3 && VERIFICATION_METHODS.length === 7);
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

    // Verify 10-column RTM CSV round-trip including unlinked excluded requirement (M3)
    const rtmText = readFileSync(verified.rtmPath, 'utf8');
    const parsedReqs = readRequirements(rtmText);
    assert.equal(parsedReqs.length, 6, '5 traceLinks + 1 unlinked excluded requirement REQ-INT-099');
    assert.ok(parsedReqs.some((r) => r.id === 'REQ-INT-099' && r.scopeDisposition === 'excluded' && r.target === ''));

    const sheet = requirementSheet(parsedReqs, {
      screens: new Set(contextSnapshot.screens.map((s) => s.route)),
      capabilities: new Set(contextSnapshot.capabilities.map((c) => c.id)),
      interfaces: new Set(contextSnapshot.interfaces.map((i) => i.id)),
      capabilityMap: new Map(contextSnapshot.capabilities.map((c) => [c.id, c])),
      screenMap: new Map(contextSnapshot.screens.map((s) => [s.route, s])),
    });
    const byReqTarget = new Map(sheet.rows.map((r) => [`${r.id}:${r.target}`, r]));
    const fitRow = byReqTarget.get('REQ-SFR-001:/admin/content/banners-popups#popup.manage');
    assert.equal(fitRow.found, true);
    assert.equal(fitRow.ledgerStatus, 'partial');
    assert.equal(fitRow.evidenceLevel, 'E3');
    assert.equal(fitRow.acceptanceDisposition, 'pending');

    const gapRow = byReqTarget.get('REQ-SFR-003:/admin/content/banners-popups#popup.bulk-suspend');
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
      targetId: '/admin/content/banners-popups#popup.unavailable',
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
