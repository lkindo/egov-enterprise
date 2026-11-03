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
    const pack = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
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

    const uatImported = await importUatChecklist(root, ws, { contextSnapshot });
    assert.equal(uatImported.updatedAcs, 6);
    assert.ok(uatImported.acceptedRequirements >= 1);
    const packAfterUat = JSON.parse(readFileSync(join(ws, 'backlog.json'), 'utf8'));
    // REQ-SFR-003 has 1 Green AC and 2 Red ACs, all accepted -> requirement rolls up to accepted
    assert.equal(packAfterUat.businessRequirements.find((r) => r.id === 'REQ-SFR-003').acceptanceDisposition, 'accepted');

    // Now mutate AC-PROMO-002-G1 text in backlog.json so the CSV's acContentHash becomes stale -> importUatChecklist must reject!
    packAfterUat.acceptanceCriteria.find((a) => a.id === 'AC-PROMO-002-G1').then = '선택한 팝업의 노출 여부가 변경된다(사유 기록 조건 임의 삭제)';
    writeFileSync(join(ws, 'backlog.json'), JSON.stringify(packAfterUat, null, 2), 'utf8');
    await assert.rejects(
      importUatChecklist(root, ws, { contextSnapshot }),
      /UAT sheet acContentHash .* does not match current AC text/u,
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
