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
  assert.deepEqual(adminPilot.sources, [
    'frontend/src/app/admin/AdminDashboardClient.tsx',
    'frontend/src/app/admin/components/InsightBanner.tsx',
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

  const staleSourceEvidence = structuredClone(contract);
  staleSourceEvidence.pilotCensus[0].findings[0].sourceEvidence = ['removed visible copy'];
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
