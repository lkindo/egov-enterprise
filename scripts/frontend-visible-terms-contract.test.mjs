import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_PATH = path.join(ROOT, 'config/frontend-visible-terms.json');

import { validateVisibleTerms as validateContract } from './frontend-visible-terms-contract.mjs';

test('structured content contract has an exact bounded pilot population and honest approval state', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  assert.deepEqual(validateContract(contract), []);
});

// ADR-0018: calendar freshness belongs to governance-review; elapsed time neither
// invalidates the recorded source contract nor approves this draft.
test('content technical evidence and its draft boundary survive review deadlines', (t) => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const baseline = validateContract(contract);
  assert.deepEqual(baseline, []);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${contract.lastReviewedAt}T12:00:00Z`) });
  for (const timestamp of [
    `${contract.lastReviewedAt}T12:00:00Z`,
    '2026-11-01T00:00:00Z',
    '2036-01-01T00:00:00Z',
  ]) {
    t.mock.timers.setTime(Date.parse(timestamp));
    assert.deepEqual(validateContract(contract), baseline, timestamp);
    const falseApproval = structuredClone(contract);
    falseApproval.approval.contentOwnerApproved = true;
    assert.match(validateContract(falseApproval).join('\n'), /approval cannot be asserted/);
  }
});

test('content review metadata rejects impossible dates, missing owners, and review order violations', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  for (const target of ['contract', 'pilot', 'finding']) {
    for (const [field, value] of [['reviewBy', '2026-11-31'], ['reviewBy', '2026-08-20'], ['owner', ' ']]) {
      const fixture = structuredClone(contract);
      const record = target === 'contract' ? fixture
        : target === 'pilot' ? fixture.pilotCensus[0] : fixture.pilotCensus[0].findings[0];
      record[field] = value;
      assert.match(validateContract(fixture).join('\n'), /contract needs owner|pilot is unbounded|finding is unbounded/, `${target}.${field}`);
    }
  }
  const invalidReview = structuredClone(contract);
  invalidReview.lastReviewedAt = '2026-02-30';
  assert.match(validateContract(invalidReview).join('\n'), /lastReviewedAt must be a real YYYY-MM-DD date/);
});

/*
  [2026-09-15 DEC-OPS-100] 계약 수준 규범의 지위·하한·검토 경계는 기계로 선다. 필수 정보를 지우거나 형식 금지를
  풀거나 승인 경계를 부풀리면 각각 red 여야 하고, 규범을 검토하지 않고 기한만 옮기는 것도 red 다.
*/
test('contract-level norms keep their approved reading, floors, format bans and review bounds', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  assert.deepEqual(validateContract(contract), []);
  // 재사용 산출물은 이 테스트를 실행하지 않는다 — 결정 원장 대조는 생산 저장소 몫이다.
  const decisionIndex = fs.readFileSync(path.join(ROOT, '.agent/memory/decisions.md'), 'utf8');
  assert.ok(decisionIndex.includes(`| ${contract.normPolicy.decisionRef} |`), `${contract.normPolicy.decisionRef} is not recorded in decisions.md`);

  const state = (fixture, id) => fixture.stateVocabulary.find((row) => row.id === id);
  const cases = [
    ['old schema', (f) => { f.schemaVersion = '1.0.0'; }, /unsupported schemaVersion/],
    ['advisory norms', (f) => { f.normPolicy.mustNotImply = 'advisory'; }, /normPolicy must keep the approved reading: mustNotImply/],
    ['prose decision', (f) => { f.normPolicy.decisionRef = 'decided in chat'; }, /normPolicy must record the approved reading/],
    ['dropped required information', (f) => { state(f, 'filtered-zero').requiredInformation.pop(); }, /state norm was weakened: filtered-zero\.requiredInformation/],
    ['dropped forbidden implication', (f) => { state(f, 'first-use-empty').mustNotImply.shift(); }, /state norm was weakened: first-use-empty\.mustNotImply/],
    ['unbound G15', (f) => { delete state(f, 'filtered-zero').catalogRule; }, /norm binding was weakened: filtered-zero lost catalogRule G15/],
    ['unknown catalog rule', (f) => { state(f, 'first-use-empty').catalogRule = 'G99'; }, /catalogRule does not name a work-screen grammar rule/],
    ['missing shared implementation', (f) => { state(f, 'unsaved').sharedImplementation.push('frontend/src/hooks/missing-guard.ts'); }, /sharedImplementation file is missing/],
    ['lifted zero ban', (f) => { f.formatRules.number.unknownAsZero = 'allowed'; }, /format rule was weakened: number\.unknownAsZero/],
    ['deleted format rules', (f) => { delete f.formatRules; }, /format rules are missing/],
    ['dropped action rule', (f) => { f.actionRules.pop(); }, /action rules are incomplete/],
    ['narrowed action rule', (f) => { f.actionRules[0].forbiddenExamples.pop(); }, /action rule was weakened/],
    ['relaxed term', (f) => { f.terms.find(({ id }) => id === 'term-intelligence').decision = 'allowed'; }, /term decision was weakened: term-intelligence/],
    ['removed term', (f) => { f.terms = f.terms.filter(({ id }) => id !== 'term-intelligence'); }, /term decision was dropped: term-intelligence/],
    ['no normative sources', (f) => { f.normativeSources = []; }, /normative source was dropped/],
    ['missing approval', (f) => { delete f.approval; }, /approval boundary is missing/],
    ['inflated claim', (f) => { f.approval.allowedCompletionClaim = 'content review complete'; }, /approval completion claim must stay bounded/],
    ['changed population', (f) => { f.population.kind = 'full-visible-string-census'; }, /population must stay a bounded pilot census/],
    ['unrecorded owner', (f) => { f.ownerAssignment = 'assigned'; }, /ownerAssignment other than unassigned/],
    ['norm review after evidence review', (f) => { f.normsReviewedAt = '2099-01-01'; }, /normsReviewedAt must be a real date on or before lastReviewedAt/],
    ['unbounded norm review', (f) => { f.reviewBy = '2036-01-01'; }, /within 120 days after normsReviewedAt/],
  ];
  for (const [label, mutate, expected] of cases) {
    const fixture = structuredClone(contract);
    mutate(fixture);
    assert.match(validateContract(fixture).join('\n'), expected, label);
  }
});
test('pilot composers do not expose internal deployment language or log form payloads', () => {
  const boardComposer = fs.readFileSync(
    path.join(ROOT, 'frontend/src/app/admin/community/boards/insert-board-article/BoardRegistClient.tsx'),
    'utf8',
  );
  const boardPage = fs.readFileSync(
    path.join(ROOT, 'frontend/src/app/admin/community/boards/insert-board-article/page.tsx'),
    'utf8',
  );
  const surveyComposer = fs.readFileSync(
    // [2026-09-12 §A3-1] 등록이 전용 페이지에서 목록 위 모달로 옮겨 갔다 — 같은 문구 계약을 모달에 건다.
    path.join(ROOT, 'frontend/src/app/admin/survey/manage/SurveyFormDialog.tsx'),
    'utf8',
  );
  const boardDetail = fs.readFileSync(
    path.join(ROOT, 'frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx'),
    'utf8',
  );

  assert.doesNotMatch(boardComposer, /console\.(?:log|error)\s*\(/);
  assert.doesNotMatch(boardPage, /console\.(?:log|error)\s*\(/);
  assert.doesNotMatch(
    boardComposer,
    /INJECT SUBJECT LINE|저장 중\.\.\.|보안 등급|Enterprise Command Node|게시물 아키텍처 정의|Waiting for Submit|DEPLOYING/,
  );
  assert.match(boardComposer, /입력 내용은 유지됩니다/);
  assert.doesNotMatch(surveyComposer, /Survey System|Highly Satisfied|Satisfied|Neutral|Unsatisfied/);
  assert.doesNotMatch(boardDetail, /err instanceof Error && err\.message/);
});

test('home route sources are bound to their real entry points and do not expose fabricated operational state', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const rootPilot = contract.pilotCensus.find(({ route }) => route === '/');
  const adminPilot = contract.pilotCensus.find(({ route }) => route === '/admin');
  const rootPage = fs.readFileSync(path.join(ROOT, 'frontend/src/app/page.tsx'), 'utf8');
  const adminPage = fs.readFileSync(path.join(ROOT, 'frontend/src/app/admin/page.tsx'), 'utf8');
  const rootSources = rootPilot.sources
    .map((source) => fs.readFileSync(path.join(ROOT, source), 'utf8'))
    .join('\n');
  const adminSources = adminPilot.sources
    .map((source) => fs.readFileSync(path.join(ROOT, source), 'utf8'))
    .join('\n');
  const sidebar = fs.readFileSync(
    path.join(ROOT, 'frontend/src/app/components/layout/sidebar.tsx'),
    'utf8',
  );

  assert.match(rootPage, /UnifiedDashboardClient/);
  assert.match(adminPage, /AdminDashboardClient/);
  assert.deepEqual(rootPilot.sources, [
    'frontend/src/app/page.tsx',
    'frontend/src/app/dashboard-data.ts',
    'frontend/src/app/UnifiedDashboardClient.tsx',
    'frontend/src/app/components/dashboard/ActivityFeed.tsx',
    'frontend/src/components/features/dashboard/RealTimeDashboard.tsx',
  ]);
  // [2026-09-15] route 진입 파일을 sources 에 넣어 제거 문구의 부재 검사가 실제 화면 경로를 덮게 한다.
  //   InsightBanner 는 참조처 0건인 고아 컴포넌트라 이 화면의 문구 증거가 아니다.
  assert.deepEqual(adminPilot.sources, [
    'frontend/src/app/admin/page.tsx',
    'frontend/src/app/admin/AdminDashboardClient.tsx',
    // [2026-09-15 DEC-OPS-100] 최근 감사 이력 목록을 그리는 공용 타임라인도 이 화면의 문구 증거다.
    'frontend/src/app/components/ui/visual-audit-timeline.tsx',
  ]);
  assert.doesNotMatch(rootSources, /실시간 피드|보안 지수|value="안전"|시스템 활성 지표|CPU 사용률|24%|42%|홍길동|이순신 과장/);
  assert.match(rootSources, /최근 활동 데이터가 연결되지 않았습니다/);
  assert.doesNotMatch(adminSources, /인텔리전스 센터|지능형 데이터 분석|보안 거버넌스|AI_INSIGHT_ENGINE/);
  assert.doesNotMatch(sidebar, /_ 허브_노드_v5\.0|고급 기업용 핵심 엔진|1\.0\.2_STABLE/);
});

test('search and statistics surfaces do not present batch-backed data as neural or realtime analysis', () => {
  const searchSources = [
    'frontend/src/app/search/SearchShell.tsx',
    'frontend/src/app/search/SearchClient.tsx',
  ].map((source) => fs.readFileSync(path.join(ROOT, source), 'utf8')).join('\n');
  const statsSources = [
    'frontend/src/app/admin/stats/page.tsx',
    'frontend/src/app/admin/stats/AdminStatsClient.tsx',
    'frontend/src/app/admin/stats/IntelligenceHubClient.tsx',
    'frontend/src/app/admin/stats/StatsHubFallback.tsx',
  ].map((source) => fs.readFileSync(path.join(ROOT, source), 'utf8')).join('\n');

  assert.doesNotMatch(
    searchSources,
    /통합 신경망 검색 분석|데이터 인구조사 분석 중|실시간 분산 검색 인덱스|통합 지식[^\n]*인텔리전스/,
  );
  assert.match(searchSources, /검색 결과를 불러오는 중/);
  assert.doesNotMatch(
    statsSources,
    /인텔리전스 통계 대시보드|인텔리전스 시스템 아키텍처 분석|실시간 트래픽|통계 인텔리전스/,
  );
  assert.match(statsSources, /최근 1개월/);
});

test('global metadata and loading copy do not claim unapproved KRDS or intelligence capabilities', () => {
  const globalSources = [
    'frontend/src/app/layout.tsx',
    'frontend/src/app/loading.tsx',
    'frontend/src/app/components/layout/footer.tsx',
    'frontend/src/app/components/ui/smart-onboarding-hub.tsx',
  ].map((source) => fs.readFileSync(path.join(ROOT, source), 'utf8')).join('\n');

  assert.doesNotMatch(
    globalSources,
    /KRDS 기반|Modern KRDS|Antigravity AI|지능형 포털|eGov 5\.0 Intelligence|실시간 시스템 관측|안정적인 서비스 운영을 보장|하이크-데이터/,
  );
  assert.match(globalSources, /전사 업무 포털/);
});

test('duplicate, missing, misordered, and falsely approved content evidence are reproducible reds', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

  const duplicate = structuredClone(contract);
  duplicate.pilotCensus.push(structuredClone(duplicate.pilotCensus[0]));
  assert.match(validateContract(duplicate).join('\n'), /duplicate pilot id|duplicate pilot route/);

  const missingState = structuredClone(contract);
  missingState.stateVocabulary.pop();
  assert.match(validateContract(missingState).join('\n'), /state vocabulary is incomplete/);

  const predatesReview = structuredClone(contract);
  predatesReview.pilotCensus[0].reviewBy = '2026-08-20';
  assert.match(validateContract(predatesReview).join('\n'), /pilot is unbounded/);

  const unboundedFinding = structuredClone(contract);
  delete unboundedFinding.pilotCensus[0].findings[0].owner;
  assert.match(validateContract(unboundedFinding).join('\n'), /finding is unbounded/);

  // [2026-09-15] 인덱스로 고르지 않는다 — pilotCensus[0] 의 finding 이 remediated-local 로 닫히자 검증기가
  //   sourceEvidence 대신 removedSourceEvidence 를 보게 돼, 이 red 증명이 아무것도 증명하지 못하게 됐다.
  //   실재 검사를 타는(= sourceEvidence 를 가진) finding 을 골라 변형한다.
  const staleSourceEvidence = structuredClone(contract);
  const activeFinding = staleSourceEvidence.pilotCensus
    .flatMap((pilot) => pilot.findings ?? [])
    .find((finding) => finding.status !== 'remediated-local' && finding.sourceEvidence?.length);
  assert.ok(activeFinding, 'the source-evidence drift proof needs at least one finding checked for present copy');
  activeFinding.sourceEvidence = ['removed visible copy'];
  assert.match(validateContract(staleSourceEvidence).join('\n'), /finding source evidence drift/);

  const falseRemediation = structuredClone(contract);
  const remediatedPilot = falseRemediation.pilotCensus.find(({ route }) => route === '/');
  remediatedPilot.findings[0].removedSourceEvidence = ['최근 활동'];
  assert.match(validateContract(falseRemediation).join('\n'), /remediated finding source evidence still present/);

  const evidenceFreeRemediation = structuredClone(contract);
  delete evidenceFreeRemediation.pilotCensus.find(({ route }) => route === '/')
    .findings[0].removedSourceEvidence;
  assert.match(validateContract(evidenceFreeRemediation).join('\n'), /remediated finding needs removed literal evidence/);

  const falseApproval = structuredClone(contract);
  falseApproval.approval.contentOwnerApproved = true;
  assert.match(validateContract(falseApproval).join('\n'), /approval cannot be asserted/);
});

/*
  [2026-09-15 DEC-OPS-099] 소유자 결정 종결은 산문 사유가 아니라 결정 참조·결정일·결정 대상 문자열로 선다.
  결정 뒤 문구가 바뀌면 그 결정은 지금 화면에 대한 것이 아니므로 red 여야 하고, 닫힌 pilot 아래 활성
  finding 이 남으면 pilot 상태만 보고 "끝났다"고 읽게 된다.
*/
test('owner decisions close findings only with a real decision reference and the decided copy still present', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  const decided = contract.pilotCensus.flatMap((pilot) => (pilot.findings ?? [])
    .filter(({ status }) => status === 'accepted-by-owner')
    .map((finding) => ({ pilotId: pilot.id, kind: finding.kind, decisionRef: finding.decisionRef })));
  assert.ok(decided.length > 0, 'recorded owner decisions must stay in the population this test proves');

  // 재사용 산출물은 이 테스트를 실행하지 않는다(verify-reusable-artifact contracts scope) — 원장 대조는 생산 저장소 몫이다.
  const decisionIndex = fs.readFileSync(path.join(ROOT, '.agent/memory/decisions.md'), 'utf8');
  for (const { pilotId, kind, decisionRef } of decided) {
    assert.ok(decisionIndex.includes(`| ${decisionRef} |`), `${pilotId}/${kind}: ${decisionRef} is not recorded in decisions.md`);
  }

  const locate = (fixture) => {
    const pilot = fixture.pilotCensus.find(({ id }) => id === decided[0].pilotId);
    return { pilot, finding: pilot.findings.find(({ kind }) => kind === decided[0].kind) };
  };

  const missingRef = structuredClone(contract);
  delete locate(missingRef).finding.decisionRef;
  assert.match(validateContract(missingRef).join('\n'), /owner decision needs a decision reference/);

  const proseRef = structuredClone(contract);
  locate(proseRef).finding.decisionRef = 'decided in chat';
  assert.match(validateContract(proseRef).join('\n'), /owner decision needs a decision reference/);

  const futureDecision = structuredClone(contract);
  locate(futureDecision).finding.decidedAt = '2099-01-01';
  assert.match(validateContract(futureDecision).join('\n'), /owner decision needs a decision reference/);

  const staleDecision = structuredClone(contract);
  locate(staleDecision).finding.sourceEvidence = ['copy that changed after the decision'];
  assert.match(validateContract(staleDecision).join('\n'), /finding source evidence drift/);

  const closedWithActive = structuredClone(contract);
  locate(closedWithActive).finding.status = 'open';
  assert.match(validateContract(closedWithActive).join('\n'), /closed pilot still has active findings/);
});

/*
  [2026-09-15 DEC-OPS-100] 기능을 과장하거나 대상을 잘못 부르던 용어를 고친 화면에 같은 말이 되돌아오지 않게 한다.
  인텔리전스·지능형·AI 기반은 검증된 기능 근거가 없는 한 금지(forbidden-unless-source-proven)라 파일 전체에서 막고,
  노드·스트림·매트릭스는 도메인 명사로 바꾼 자리의 문구만 막는다 — 인프라 topology 의 노드는 가이드 §2.2 예외다.
*/
test('screens fixed for term decisions do not bring the overclaiming or misnamed terms back', () => {
  const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
  for (const file of [
    'frontend/src/app/admin/system/menus/by-authority/MenuByAuthorityClient.tsx',
    'frontend/src/app/admin/system/monitoring/components/MonitoringPanels.tsx',
    'frontend/src/app/admin/workflow/WorkflowClient.tsx',
    'frontend/src/app/components/ui/workflow-canvas.tsx',
    'frontend/src/app/admin/operation/rough-map/page.tsx',
    'frontend/src/app/components/ui/visual-audit-timeline.tsx',
  ]) {
    assert.doesNotMatch(read(file), /인텔리전스|지능형|AI 기반/, file);
  }
  const replaced = {
    'frontend/src/app/admin/system/common-code/CommonCodeHubClient.tsx': ['기관 노드'],
    'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx': ['데이터 스트림'],
    'frontend/src/app/admin/system/monitoring/components/MonitoringPanels.tsx': ['스트림에서'],
    'frontend/src/app/admin/system/menus/MenuAdminClient.tsx': ['상위 노드', '그룹 노드'],
    'frontend/src/app/admin/system/menus/by-authority/MenuByAuthorityClient.tsx': ['노드'],
    'frontend/src/app/admin/workflow/WorkflowClient.tsx': ['노드'],
    'frontend/src/app/components/ui/workflow-canvas.tsx': ['노드'],
    'frontend/src/app/admin/community/boards/master/BoardMasterListClient.tsx': ['매트릭스', 'Board Configuration'],
    'frontend/src/app/admin/help/KnowledgeHubClient.tsx': ['지식 스트림'],
    'frontend/src/app/admin/collaboration/page.tsx': ['매트릭스'],
  };
  for (const [file, literals] of Object.entries(replaced)) {
    const text = read(file);
    for (const literal of literals) assert.ok(!text.includes(literal), `${file} brought back "${literal}"`);
  }
});
