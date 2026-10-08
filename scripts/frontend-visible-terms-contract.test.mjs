import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTRACT_PATH = path.join(ROOT, 'config/frontend-visible-terms.json');

import { validateVisibleTerms as validateContract } from './frontend-visible-terms-contract.mjs';
import { discoverPageRoutes, expectedRouting, inspectRouteRepository } from './ui-route-capabilities-contract.mjs';

// These source checks run before frontend dependencies are installed. Interpret only
// the static string/SITE_IDENTITY metadata used here; unsupported expressions fail
// closed. This is not a replacement for Next's rendered document-title checks.
function sourceTokens(source) {
  const literals = [];
  const code = source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, (part) => {
    if (part.startsWith('//') || part.startsWith('/*')) return '';
    const token = `__title_literal_${literals.length}__`;
    literals.push(part);
    return token;
  });
  return { code, literals };
}

function metadataTitle(source, identity) {
  const { code, literals } = sourceTokens(source);
  if (!/\bexport\s+const\s+metadata\b/.test(code)) return undefined;
  if (/^\s*__title_literal_\d+__\s*;/.test(code) && literals[0]?.slice(1, -1) === 'use client') return null;
  const object = /\bexport\s+const\s+metadata\s*(?::\s*Metadata\s*)?=\s*\{([^{}]*)\}/.exec(code)?.[1];
  if (!object) return null;
  const expression = /(?:^|,)\s*title\s*:\s*([^,]+)\s*(?:,|$)/.exec(object)?.[1]?.trim();
  if (!expression) return undefined;
  const identityKey = /^SITE_IDENTITY\.(\w+)$/.exec(expression)?.[1];
  if (identityKey) return identity[identityKey] ?? null;
  const index = /^__title_literal_(\d+)__$/.exec(expression)?.[1];
  if (index === undefined) return null;
  const literal = literals[Number(index)];
  let value = literal.slice(1, -1);
  if (literal.startsWith('`')) {
    value = value.replace(/\$\{SITE_IDENTITY\.(\w+)\}/g, (_, key) => identity[key] ?? '${unresolved}');
    if (value.includes('${')) return null;
  }
  return value;
}

function inspectDocumentTitles(repository, identity) {
  const errors = [];
  const titles = new Map();
  const appRoot = path.join(repository.repoRoot, 'frontend/src/app');
  for (const { route, source } of repository.pages) {
    if (expectedRouting(repository, route, source).kind !== 'page') continue;
    let title = metadataTitle(fs.readFileSync(path.join(repository.repoRoot, source), 'utf8'), identity);
    // Next inherits layout metadata, never the parent route's page metadata.
    for (let directory = path.dirname(path.join(repository.repoRoot, source)); title === undefined; directory = path.dirname(directory)) {
      for (const extension of ['js', 'jsx', 'ts', 'tsx']) {
        const layout = path.join(directory, `layout.${extension}`);
        if (fs.existsSync(layout)) title = metadataTitle(fs.readFileSync(layout, 'utf8'), identity);
      }
      if (directory === appRoot) break;
    }
    titles.set(route, title);
    const purpose = typeof title === 'string' ? title.split(/\s+[|–—-]\s+/)[0].trim() : '';
    if (!purpose || (route !== '/' && Object.values(identity).includes(purpose))) {
      errors.push(`${route}: document title must identify the page purpose beyond the site identity`);
    }
  }
  return { errors, titles };
}

function currentSiteIdentity() {
  const source = fs.readFileSync(path.join(ROOT, 'frontend/src/config/site-identity.ts'), 'utf8');
  return Object.fromEntries([...source.matchAll(/^\s*(\w+):\s*'([^']*)',?$/gm)].map(([, key, value]) => [key, value]));
}

test('direct content routes have a purpose-specific document title through page or server layout metadata', () => {
  const repository = inspectRouteRepository(ROOT);
  const result = inspectDocumentTitles(repository, currentSiteIdentity());
  assert.ok(result.titles.size > 0, 'title population must not be empty');
  assert.deepEqual(result.errors, []);
  // Representative user tasks guard against a nonempty but unrelated copied title.
  for (const [route, purpose] of [
    ['/login', '로그인'], ['/admin', '관리자 대시보드'], ['/note', '쪽지함'],
    ['/search', '통합 검색'], ['/survey/response/[id]', '설문 응답 상세'],
    ['/admin/community/boards/maker', '게시판 생성'],
    ['/admin/community/boards/master', '게시판 관리'],
  ]) assert.ok(result.titles.get(route)?.startsWith(`${purpose} | `), route);
});

test('document-title fixtures reject common titles, client metadata and false page inheritance while preserving redirects', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-document-title-'));
  t.after(() => {
    assert.ok(path.resolve(tempRoot).startsWith(`${path.resolve(os.tmpdir())}${path.sep}egov-document-title-`));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
  const identity = { siteName: 'Fixture portal', frameworkName: 'Fixture framework' };
  const write = (relative, source) => {
    const file = path.join(tempRoot, 'frontend/src/app', relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source);
  };
  const page = 'export default function Page() { return <main />; }';
  write('layout.tsx', 'export const metadata = { title: SITE_IDENTITY.siteName };');
  write('page.tsx', page);
  write('login/page.tsx', `export const metadata = { title: 'Fixture portal' }; ${page}`);
  write('parent/page.tsx', `export const metadata = { title: 'Parent work | Fixture framework' }; ${page}`);
  write('parent/child/page.tsx', page);
  write('conditional/page.tsx', `export default function Page() { if (!user) redirect('/login'); return <main />; }`);
  write('legacy/page.tsx', `export default function Page() { redirect('/parent'); }`);
  write('configured/page.tsx', page);
  write('client/page.tsx', `'use client'; export const metadata = { title: 'Client work | Fixture framework' }; ${page}`);
  write('(workspace)/notes/page.tsx', `'use client'; ${page}`);
  write('(workspace)/notes/layout.tsx', 'export const metadata = { title: `Notes | ${SITE_IDENTITY.frameworkName}` };');
  const repository = {
    repoRoot: tempRoot,
    pages: discoverPageRoutes(tempRoot),
    configRedirects: { redirects: new Map([['/configured', { kind: 'config-redirect', target: '/parent' }]]) },
  };
  const result = inspectDocumentTitles(repository, identity);
  assert.deepEqual(result.errors.map((error) => error.split(':')[0]).sort(), ['/client', '/conditional', '/login', '/parent/child']);
  assert.equal(result.titles.get('/'), identity.siteName);
  assert.equal(result.titles.get('/notes'), 'Notes | Fixture framework');
  assert.equal(result.titles.has('/legacy'), false);
  assert.equal(result.titles.has('/configured'), false);
  for (const title of ["''", 'SITE_IDENTITY.siteName', '`Only ${unknown}`']) {
    write('login/page.tsx', `export const metadata = { title: ${title} }; ${page}`);
    assert.ok(inspectDocumentTitles(repository, identity).errors.some((error) => error.startsWith('/login:')), title);
  }
  write('login/page.tsx', `/* export const metadata = { title: 'Comment only' }; */ ${page}`);
  assert.ok(inspectDocumentTitles(repository, identity).errors.some((error) => error.startsWith('/login:')));
  write('login/page.tsx', `export const metadata = { title: 'Login | Fixture framework' }; ${page}`);
  assert.equal(inspectDocumentTitles(repository, identity).errors.some((error) => error.startsWith('/login:')), false);
});

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
    ['duplicate action rule', (f) => { f.actionRules.push(structuredClone(f.actionRules[0])); }, /duplicate action rule id/],
    ['narrowed action rule', (f) => { f.actionRules[0].forbiddenExamples.pop(); }, /action rule was weakened/],
    ['unbound added action rule', (f) => { f.actionRules.push({ id: 'adopter-rule', rule: 'An adopter-specific rule.', forbiddenExamples: ['example'], catalogRule: 'G99' }); }, /catalogRule does not name a work-screen grammar rule: adopter-rule/],
    ['added action rule with a missing shared implementation', (f) => { f.actionRules.push({ id: 'adopter-rule', rule: 'An adopter-specific rule.', forbiddenExamples: ['example'], sharedImplementation: ['frontend/src/hooks/missing-guard.ts'] }); }, /sharedImplementation file is missing: adopter-rule/],
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

  // 하한은 넓어질 수 있다 — 파생 제품이 규칙을 더해도 red 가 아니다.
  const widened = structuredClone(contract);
  widened.actionRules.push({ id: 'adopter-rule', rule: 'An adopter-specific rule.', forbiddenExamples: ['example'] });
  assert.deepEqual(validateContract(widened), []);
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
    'frontend/src/app/admin/stats/StatsHubParts.tsx',
    'frontend/src/app/admin/stats/StatsHubFallback.tsx',
    // Phase 0c: 설문 탭은 설문이 넘기는 패널로 옮겼다. 검사 범위를 줄이지 않도록 함께 본다.
    'frontend/src/app/admin/survey/components/StatsHubSurveyTab.tsx',
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
  [2026-10-02 관리 콘솔 UX] 화면이 여러 파일로 나뉘면 파일 목록으로 고정한 검사는 새 파일을 보지 못한다 — 메뉴 편집기는
  MenuAdminClient 하나에서 보드·인스펙터·변경 목록·대화상자로 갈라졌고, 권한 작업대·화면 관리도 새 컴포넌트가 생겼다.
  그래서 이 세 화면은 디렉터리 단위로 본다(테스트 파일과 __tests__ 는 제외, 화면이 쓰는 .ts 모델도 포함).
    · 메뉴: '상위 노드'·'그룹 노드' 를 메뉴·상위 메뉴로 바꿨다(DEC-OPS-100). by-authority 는 아래에서 '노드' 전체를 더
      엄격하게 보므로 하위 디렉터리로 내려가지 않는다.
    · 권한 작업대: 걷어 낸 역할 × 메뉴 격자가 '권한 매트릭스'·'메뉴 노드' 라고 불렀다(term-matrix·term-node).
    · 화면 관리: 종전 문서 제목·목록 이름이 '시스템 프로그램 미들웨어'·'시스템 프로그램 관리' 였다.
*/
const REPLACED_IN_DIRECTORIES = [
  {
    directory: 'frontend/src/app/admin/system/menus', recursive: false, literals: ['상위 노드', '그룹 노드'],
    anchors: ['MenuAdminClient.tsx', 'MenuBoard.tsx', 'MenuInspector.tsx', 'menuDraft.ts'],
  },
  {
    directory: 'frontend/src/app/admin/security/authority', recursive: true, literals: ['매트릭스', '메뉴 노드'],
    anchors: ['SecurityHubClient.tsx', 'components/ScreenPermissionTable.tsx', 'components/OperationPermissionMatrix.tsx', 'components/GroupComparison.tsx'],
  },
  {
    directory: 'frontend/src/app/admin/system/programs', recursive: true, literals: ['시스템 프로그램', '미들웨어'],
    anchors: ['page.tsx', 'ProgramAdminClient.tsx', 'ScreenListParts.tsx', 'screenList.ts'],
  },
];

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
    // [2026-09-27 DIP B5 F11] 하네스 아틀라스 개요·상세가 이 파일(demo pack)로 옮겨 왔다 — 같은 감시를 따라간다.
    'frontend/src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx',
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
    'frontend/src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx': ['스트림에서'],
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
  for (const scope of REPLACED_IN_DIRECTORIES) {
    const files = screenSources(ROOT, scope.directory, scope);
    // 디렉터리를 옮기거나 잘못 적으면 검사 대상이 0개가 되어 공허하게 통과한다 — 아는 파일이 목록에 있어야 한다.
    for (const anchor of scope.anchors) assert.ok(files.includes(`${scope.directory}/${anchor}`), `${scope.directory} scope misses ${anchor}`);
  }
  assert.deepEqual(replacedTermViolations(ROOT, REPLACED_IN_DIRECTORIES), []);
});

/** 디렉터리 아래 화면 소스(.ts·.tsx, 테스트 파일·__tests__ 제외). recursive 가 false 면 하위 디렉터리를 보지 않는다. */
function screenSources(root, directory, { recursive }) {
  const files = [];
  const walk = (relative) => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const child = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (recursive && entry.name !== '__tests__') walk(child);
      } else if (/\.tsx?$/u.test(entry.name) && !/\.test\.tsx?$/u.test(entry.name)) {
        files.push(child);
      }
    }
  };
  walk(directory);
  return files.sort();
}

/** 디렉터리 범위의 바꾼 용어가 돌아온 곳(파일·용어). */
function replacedTermViolations(root, scopes) {
  const violations = [];
  for (const scope of scopes) {
    for (const file of screenSources(root, scope.directory, scope)) {
      const text = fs.readFileSync(path.join(root, file), 'utf8');
      for (const literal of scope.literals) if (text.includes(literal)) violations.push(`${file} brought back "${literal}"`);
    }
  }
  return violations;
}

test('directory-scoped replaced terms catch a new screen file but skip tests and stricter subdirectories', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'visible-terms-scope-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, text) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), text);
  };
  const flat = { directory: 'app/menus', recursive: false, literals: ['상위 노드'] };
  const deep = { directory: 'app/authority', recursive: true, literals: ['매트릭스'] };
  write('app/menus/MenuAdminClient.tsx', 'export const label = "상위 메뉴";');
  write('app/authority/SecurityHubClient.tsx', 'export const label = "기능별 권한";');
  assert.deepEqual(replacedTermViolations(root, [flat, deep]), []);

  // 파일 목록에 없던 새 파일·새 모델로 돌아온 용어를 잡는다.
  write('app/menus/MenuNewPanel.tsx', 'export const label = "상위 노드 고르기";');
  write('app/menus/menuNewModel.ts', 'export const hint = "상위 노드";');
  write('app/authority/components/NewGrid.tsx', 'export const title = "권한 매트릭스";');
  // 테스트·시험용 틀과, 자기 검사를 따로 가진 하위 디렉터리(평면 범위)는 보지 않는다.
  write('app/menus/__tests__/MenuNewPanel.test.tsx', '"상위 노드"');
  write('app/menus/MenuNewPanel.test.tsx', '"상위 노드"');
  write('app/menus/by-authority/MenuByAuthorityClient.tsx', '"상위 노드"');
  write('app/authority/__tests__/harness.tsx', '"권한 매트릭스"');
  assert.deepEqual(replacedTermViolations(root, [flat, deep]), [
    'app/menus/MenuNewPanel.tsx brought back "상위 노드"',
    'app/menus/menuNewModel.ts brought back "상위 노드"',
    'app/authority/components/NewGrid.tsx brought back "매트릭스"',
  ]);
});

/*
  [2026-10-02 관리 콘솔 UX] 권한 이름은 권한 작업대(칸의 이름표·묶음 미리보기·그룹 비교)에 그대로 보이는 화면 문구다.
  이름이 그 권한이 여는 기능과 다르면 관리자가 엉뚱한 권한을 고른다 — FILE_AUDIT 은 첨부 무결성 점검
  (GET /admin/files/integrity) 하나만 여는데 이름이 '첨부파일 · 변경 이력 조회' 였다. '이력'을 말하는 권한은
  이력·로그 경로에만 묶여야 한다. 원천은 카탈로그와 인가 정책의 operationBindings 다(생성기가 둘의 결속을 검사한다).
*/
function historyNameViolations(permissions, operationBindings) {
  const paths = new Map();
  for (const binding of operationBindings) {
    if (binding.permission) paths.set(binding.permission, [...(paths.get(binding.permission) ?? []), binding.path]);
  }
  const historyPath = /\/(?:history|change-history|logs)(?:\/|$)/u;
  return permissions
    .filter((permission) => permission.name.includes('이력'))
    .filter((permission) => {
      const bound = paths.get(permission.code) ?? [];
      return bound.length === 0 || bound.some((target) => !historyPath.test(target));
    })
    .map((permission) => `${permission.code} "${permission.name}" → ${(paths.get(permission.code) ?? ['(묶인 경로 없음)']).join(', ')}`);
}

test('permission names that promise a history only gate history or log endpoints', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/governance/permission-catalog.json'), 'utf8'));
  const policy = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/governance/authorization-policies.json'), 'utf8'));
  // 검사가 공허하지 않다 — 이력을 말하는 권한이 실제로 여럿 있다.
  assert.ok(catalog.permissions.filter((permission) => permission.name.includes('이력')).length >= 5);
  assert.deepEqual(historyNameViolations(catalog.permissions, policy.operationBindings), []);
  assert.equal(catalog.permissions.find((permission) => permission.code === 'FILE_AUDIT')?.name, '첨부파일 · 무결성 점검');

  // 합성 위반: 이력이라 부르면서 이력이 아닌 경로를 열거나, 묶인 경로가 없으면 red 다.
  const fixture = [
    { code: 'FILE_AUDIT', name: '첨부파일 · 변경 이력 조회' },
    { code: 'AUTHRT_AUDIT', name: '권한 관리 · 변경 이력 조회' },
    { code: 'GHOST_LOG_READ', name: '유령 이력 · 조회' },
  ];
  const bindings = [
    { method: 'GET', path: '/api/v1/admin/files/integrity', permission: 'FILE_AUDIT' },
    { method: 'GET', path: '/api/v1/admin/authorization/history', permission: 'AUTHRT_AUDIT' },
  ];
  assert.deepEqual(historyNameViolations(fixture, bindings), [
    'FILE_AUDIT "첨부파일 · 변경 이력 조회" → /api/v1/admin/files/integrity',
    'GHOST_LOG_READ "유령 이력 · 조회" → (묶인 경로 없음)',
  ]);
});
