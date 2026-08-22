import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_PATH = path.join(ROOT, 'config/frontend-visible-terms.json');
const NOW = new Date('2026-08-21T00:00:00Z');

const REQUIRED_STATES = [
  'demo',
  'filtered-zero',
  'first-use-empty',
  'loading',
  'offline',
  'partial-failure',
  'permission-denied',
  'server-error',
  'success',
  'unavailable',
  'unsaved',
  'validation-error',
];

const REQUIRED_PILOT_ROUTES = [
  '/',
  '/admin',
  '/admin/community/boards/insert-board-article',
  '/admin/survey/manage/create',
  '/admin/system/logs/user',
  '/admin/user/manage',
  '/login',
  '/smart-toolkit/schedule',
];

function duplicates(values) {
  return [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
}

function validReviewBy(value, now) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') && Date.parse(`${value}T23:59:59Z`) >= now.getTime();
}

function validateContract(contract, { root = ROOT, now = NOW } = {}) {
  const errors = [];
  if (contract.schemaVersion !== '1.0.0') errors.push('unsupported schemaVersion');
  if (contract.status !== 'draft-blocked-input') errors.push('status must preserve the approval boundary');
  if (contract.language !== 'ko-KR') errors.push('language must match ADR-0002');
  if (!contract.owner || !validReviewBy(contract.reviewBy, now)) errors.push('contract needs owner and non-stale reviewBy');

  const stateIds = (contract.stateVocabulary ?? []).map(({ id }) => id);
  if (duplicates(stateIds).length) errors.push(`duplicate state id: ${duplicates(stateIds).join(', ')}`);
  if (JSON.stringify([...stateIds].sort()) !== JSON.stringify(REQUIRED_STATES)) {
    errors.push('state vocabulary is incomplete or contains an unknown state');
  }
  for (const state of contract.stateVocabulary ?? []) {
    if (!state.canonicalLabel || !state.requiredInformation?.length || !state.mustNotImply?.length) {
      errors.push(`state is unbounded: ${state.id ?? '<missing>'}`);
    }
  }

  const populationRoutes = [...(contract.population?.exactRoutes ?? [])].sort();
  if (JSON.stringify(populationRoutes) !== JSON.stringify(REQUIRED_PILOT_ROUTES)) {
    errors.push('pilot population drift');
  }
  const pilots = contract.pilotCensus ?? [];
  const pilotIds = pilots.map(({ id }) => id);
  const pilotRoutes = pilots.map(({ route }) => route);
  if (duplicates(pilotIds).length) errors.push(`duplicate pilot id: ${duplicates(pilotIds).join(', ')}`);
  if (duplicates(pilotRoutes).length) errors.push(`duplicate pilot route: ${duplicates(pilotRoutes).join(', ')}`);
  if (JSON.stringify([...pilotRoutes].sort()) !== JSON.stringify(REQUIRED_PILOT_ROUTES)) {
    errors.push('pilot census does not exactly cover its population');
  }

  for (const pilot of pilots) {
    if (!pilot.owner || !validReviewBy(pilot.reviewBy, now)) errors.push(`pilot is unbounded: ${pilot.id}`);
    if (!pilot.roles?.length || !pilot.sources?.length || !pilot.evidenceLevel || !pilot.status) {
      errors.push(`pilot evidence is incomplete: ${pilot.id}`);
    }
    for (const source of pilot.sources ?? []) {
      if (!fs.existsSync(path.join(root, source))) errors.push(`pilot source is missing: ${source}`);
    }
    for (const finding of pilot.findings ?? []) {
      if (!finding.kind || !finding.evidence || !finding.status || !finding.owner || !validReviewBy(finding.reviewBy, now)) {
        errors.push(`finding is unbounded: ${pilot.id}/${finding.kind ?? '<missing>'}`);
      }
      const sourceText = (pilot.sources ?? [])
        .map((source) => fs.readFileSync(path.join(root, source), 'utf8'))
        .join('\n');
      if (finding.status === 'remediated-local') {
        if (!finding.removedSourceEvidence?.length) {
          errors.push(`remediated finding needs removed literal evidence: ${pilot.id}/${finding.kind}`);
          continue;
        }
        for (const snippet of finding.removedSourceEvidence) {
          if (sourceText.includes(snippet)) {
            errors.push(`remediated finding source evidence still present: ${pilot.id}/${finding.kind}/${snippet}`);
          }
        }
      } else {
        if (!finding.sourceEvidence?.length) {
          errors.push(`active finding needs literal source evidence: ${pilot.id}/${finding.kind}`);
          continue;
        }
        for (const snippet of finding.sourceEvidence) {
          if (!sourceText.includes(snippet)) {
            errors.push(`finding source evidence drift: ${pilot.id}/${finding.kind}/${snippet}`);
          }
        }
      }
    }
  }

  const termIds = (contract.terms ?? []).map(({ id }) => id);
  if (termIds.length === 0 || duplicates(termIds).length) errors.push('term ids must be non-empty and unique');
  for (const term of contract.terms ?? []) {
    if (!term.sourceTerms?.length || !term.decision || !term.preferred || !term.rationale) {
      errors.push(`term decision is incomplete: ${term.id ?? '<missing>'}`);
    }
  }

  for (const source of contract.normativeSources ?? []) {
    if (!fs.existsSync(path.join(root, source))) errors.push(`normative source is missing: ${source}`);
  }
  if (contract.approval?.contentOwnerApproved || contract.approval?.productOwnerApproved || contract.approval?.userValidated) {
    errors.push('approval cannot be asserted without reviewer evidence in this draft schema');
  }
  return errors;
}

test('structured content contract has an exact bounded pilot population and honest approval state', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
  assert.deepEqual(validateContract(contract), []);
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
    path.join(ROOT, 'frontend/src/app/admin/survey/manage/create/SurveyManageCreateClient.tsx'),
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

test('duplicate, missing, stale, and falsely approved content evidence are reproducible reds', () => {
  const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

  const duplicate = structuredClone(contract);
  duplicate.pilotCensus.push(structuredClone(duplicate.pilotCensus[0]));
  assert.match(validateContract(duplicate).join('\n'), /duplicate pilot id|duplicate pilot route/);

  const missingState = structuredClone(contract);
  missingState.stateVocabulary.pop();
  assert.match(validateContract(missingState).join('\n'), /state vocabulary is incomplete/);

  const stale = structuredClone(contract);
  stale.pilotCensus[0].reviewBy = '2026-08-20';
  assert.match(validateContract(stale).join('\n'), /pilot is unbounded/);

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
