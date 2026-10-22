import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildUrlStateCensus,
  compareUrlStateCensus,
  hasNoClassifiableUrlState,
  scanUrlStateSource,
  slotAttributedRouteContexts,
  tokenizeUrlStateSource,
  validateUrlStateCensus,
} from './ui-url-state-census.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// [2026-08-31] 라우트 수의 단일 원본은 파일시스템 스캔이다(리터럴 120 삼중 하드코딩 제거).
//   두 스캐너(capabilities·url-state)가 서로 다른 발견 로직을 쓰므로, 한쪽이 무너지면
//   아래 exactPopulations 비교가 어긋나 red 가 된다 — 교차 검증을 겸한다.
const FILESYSTEM_ROUTE_COUNT = discoverPageRoutes(repoRoot).length;
const manifestPath = join(repoRoot, 'config', 'ui-url-state-census.json');

function refreshHash(census) {
  census.sourceScope.inventoryHash = createHash('sha256').update(JSON.stringify({
    records: census.records,
    negatives: census.requiredNegativeCases,
    criticalFlows: census.criticalFlows,
  })).digest('hex');
}

let repositoryCensusCache;
/**
 * 저장소 census 는 한 번만 만든다(한 번에 1초 안팎이다). 빌더는 저장소 소스·원장의 결정적 함수이고 현재 시각을 읽지 않으며(미래 시각
 * 시험이 그 시각에서 한 번 더 빌드해 이 복제본과 같은지 본다), 실행 중에 저장소를 바꾸는 시험도 없다. 부를 때마다 복제본을 돌려주므로
 * 한 시험이 받은 결과를 제자리에서 바꿔도 다른 시험에 새지 않는다 — 맨 끝 시험이 그 격리를 확인한다.
 */
function repositoryCensus() {
  repositoryCensusCache ??= buildUrlStateCensus({ repoRoot });
  return structuredClone(repositoryCensusCache);
}

test('current URL-state census exactly covers critical route and URL producer populations', () => {
  const actual = repositoryCensus();
  const expected = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assert.deepEqual(validateUrlStateCensus(actual, { repoRoot }), []);
  assert.deepEqual(validateUrlStateCensus(expected, { repoRoot }), []);
  assert.deepEqual(compareUrlStateCensus(expected, actual), []);
  // 리다이렉트 수가 바뀌면 URL 상태 표면이 넓어지는지 좁아지는지를 변경 설명에 남긴다. 증감의 이력은 git 과 결정 기록에 있다.
  assert.ok(FILESYSTEM_ROUTE_COUNT >= 100, `route discovery collapsed: ${FILESYSTEM_ROUTE_COUNT} < 100`);
  assert.deepEqual(actual.summary.exactPopulations, {
    filesystemRoutes: FILESYSTEM_ROUTE_COUNT,
    dynamicRoutePatterns: 12,
    configRedirects: 13,
    pageRedirects: 17,
  });
  assert.equal(actual.summary.records, actual.records.length);
  // 훑은 파일 수는 싣지 않는다 — 소비자가 없는데 URL 상태가 없는 파일 하나에도 census 재생성을 요구했다.
  assert.equal(Object.hasOwn(actual.summary, 'sourceFileCount'), false);
  assert.equal(actual.summary.unverifiedRecords, actual.records.length);
  assert.ok(actual.summary.ambiguousRecords > 0);
  assert.ok(actual.summary.byKind['query-consumer'] > 0);
  assert.ok(actual.summary.byKind['query-producer'] > 0);
  assert.ok(actual.summary.byKind['request-query-producer'] > 0);
  assert.ok(actual.summary.byKind['form-producer'] > 0);
  assert.deepEqual(
    actual.records.flatMap(({ id, stateItems }) => stateItems
      .filter(({ riskSignals }) => riskSignals.includes('credential-name-signal'))
      .map(({ name }) => `${id}/${name}`)),
    [],
    '현재 URL-state 모집단에 credential-like key가 생기면 즉시 검토해야 한다',
  );

  const login = actual.criticalFlows.find(({ id }) => id === 'login-return-intent');
  assert.equal(login.producerRecordIds.length, 1);
  assert.equal(login.consumerRecordIds.length, 1);
  assert.equal(login.sinkRecordIds.length, 2);
  assert.ok(actual.records.every(({ review, canonical }) => (
    review.status === 'unverified'
    && review.decisionSafe === false
    && canonical.status === 'unverified'
  )));
});

test('a non-search census drift does not deadlock candidate generation on the existing search allowlist', () => {
  const candidate = repositoryCensus();
  const nonSearch = candidate.records.find(({ stateItems }) => stateItems.every(({ riskSignals }) => (
    !riskSignals.includes('free-text-name-signal')
    && !riskSignals.includes('credential-name-signal')
  )));
  assert.ok(nonSearch, '비검색 census drift를 만들 record가 필요하다');

  nonSearch.currentBehavior = `${nonSearch.currentBehavior} Synthetic non-search evidence drift.`;
  refreshHash(candidate);

  assert.deepEqual(
    validateUrlStateCensus(candidate, {
      repoRoot,
    }),
    [],
    'manifest hash가 달라졌다는 이유만으로 기존 exact 검색 record까지 미승인 처리하면 --write가 막힌다',
  );
});

// ADR-0018: 실시간 최신성 경계는 운영 검토 계약으로 이전한다. 여기서는 options.nowMs로
// 과거 시각을 주입하는 대신 실제 Date API를 미래로 이동해 소스 판정의 독립성을 증명한다.
test('identical source and approval contracts remain valid across future calendar dates', (t) => {
  const census = repositoryCensus();
  const before = structuredClone(census);
  const dates = ['2026-12-31T23:59:59.999Z', '2027-01-01T00:00:00.000Z', '2036-09-14T00:00:00.000Z'];
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(dates[0]) });
  for (const date of dates) {
    t.mock.timers.setTime(Date.parse(date));
    assert.deepEqual(validateUrlStateCensus(census, { repoRoot }), [], date);
  }
  assert.deepEqual(census, before, '검토 일정이나 미승인 상태를 자동 갱신하면 안 된다');
  // 저장소 census 메모의 전제 — 빌더도 시각을 읽지 않는다. 마지막(가장 먼) 시각에서 한 번만 다시 빌드한다.
  assert.deepEqual(buildUrlStateCensus({ repoRoot }), before, '빌더 출력이 현재 시각에 따라 달라지면 안 된다');
});

test('a non-existent reviewBy date cannot silently corrupt the operational review schedule', () => {
  const census = repositoryCensus();

  for (const bogus of ['2026-13-45', '2026-02-30', '2026-00-10', '2026-01-32']) {
    const tampered = structuredClone(census);
    tampered.records[0].review.reviewBy = bogus;

    assert.match(
      validateUrlStateCensus(tampered, { repoRoot }).join('\n'),
      /owner and bounded reviewBy are required/,
      `${bogus} 가 형식 검사를 통과하면 운영 검토 일정을 판정할 수 없다`,
    );
  }

  // 실재하는 날짜는 그대로 통과해야 한다 — 위 검사가 과잉이면 정상 갱신이 막힌다.
  const valid = structuredClone(census);
  valid.records[0].review.reviewBy = '2026-02-29'; // 2026 은 평년이 아니라 윤년이 아니다 → 거부돼야 한다
  assert.match(
    validateUrlStateCensus(valid, { repoRoot }).join('\n'),
    /owner and bounded reviewBy are required/,
  );

  const leap = structuredClone(census);
  leap.records[0].review.reviewBy = '2028-02-29'; // 2028 은 윤년 → 통과해야 한다
  assert.ok(
    !validateUrlStateCensus(leap, { repoRoot })
      .some((error) => error.includes('owner and bounded reviewBy are required')),
  );
});

test('implemented login destination controls are recorded without claiming global policy approval', () => {
  const census = repositoryCensus();
  const byId = Object.fromEntries(census.requiredNegativeCases.map((entry) => [entry.id, entry]));

  for (const id of ['query-fragment-in-login-intent', 'protocol-relative-or-backslash-target']) {
    assert.equal(byId[id].status, 'implemented-local-policy-unapproved');
    assert.equal(byId[id].decisionSafe, false);
    assert.deepEqual(byId[id].evidence, [
      'frontend/src/app/login/LoginClient.tsx',
      'frontend/src/app/login/__tests__/page.test.tsx',
    ]);
  }
  assert.equal(byId['unknown-query'].status, 'unimplemented-blocked-input');
});

test('executable syntax is detected while comment, string, and regex decoys stay inert', () => {
  const source = [
    `const text = "router.push('/ghost?token=x')";`,
    String.raw`const regex = /searchParams\.get\(['"]token/;`,
    `const href = '/not-a-navigation-attribute?token=x';`,
    `// searchParams.get('password');`,
    `/* router.replace('/ghost?q=secret'); */`,
    'const searchParams = useSearchParams();',
    'const copy = new URLSearchParams(searchParams.toString());',
    `const token = searchParams.get('token');`,
    `copy.set('page', '2');`,
    'router.replace(`/items?token=${token}&page=2`);',
    'export { copy, href, regex, text, token };',
  ].join('\n');
  const scanned = scanUrlStateSource(source, {
    file: '<memory>',
    routePattern: '/items',
    shellAccessEvidence: 'authenticated',
  });

  assert.deepEqual(scanned.issues, []);
  assert.ok(scanned.records.some(({ operation, riskSignals }) => (
    operation === 'copy-existing-query'
    && riskSignals.includes('unknown-query-passthrough')
    && riskSignals.includes('repeated-query-passthrough')
    && riskSignals.includes('encoded-query-passthrough')
  )));
  const tokenRead = scanned.records.find(({ kind, stateItems }) => (
    kind === 'query-consumer' && stateItems.some(({ name }) => name === 'token')
  ));
  assert.ok(tokenRead);
  assert.equal(tokenRead.stateItems[0].recommendation, 'deny');
  assert.equal(tokenRead.stateItems[0].dataClass, 'unverified');
  assert.equal(tokenRead.stateItems[0].approvalStatus, 'unverified');
  assert.ok(scanned.records.some(({ operation, targetCandidate }) => (
    operation === 'router.replace' && targetCandidate === '/items?token=[computed]&page=2'
  )));
  assert.ok(scanned.records.every(({ targetCandidate }) => targetCandidate !== '/ghost?token=x'));
  assert.ok(scanned.records.every(({ targetCandidate }) => targetCandidate !== '/not-a-navigation-attribute?token=x'));
});

test('unknown query copy demonstrably preserves repeated and encoded forbidden-name inputs', () => {
  const source = new URLSearchParams('token=first&token=second&%74oken=encoded&%2574oken=double');
  const copied = new URLSearchParams(source.toString());

  assert.deepEqual(copied.getAll('token'), ['first', 'second', 'encoded']);
  assert.equal(copied.get('%74oken'), 'double');
  assert.equal(copied.toString(), source.toString());
});

test('credential-like URL keys, including the repository pswd spelling, remain immediate red after review dates', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2036-09-14T00:00:00.000Z') });
  const census = repositoryCensus();

  for (const credentialName of ['token', 'pswd']) {
    const scanned = scanUrlStateSource(`const value = searchParams.get('${credentialName}');`, {
      file: 'probe.tsx',
      routePattern: '/probe',
      shellAccessEvidence: 'authenticated',
    });
    const detected = scanned.records
      .flatMap(({ stateItems }) => stateItems)
      .find(({ name }) => name === credentialName);
    assert.ok(detected?.riskSignals.includes('credential-name-signal'), `${credentialName} detector가 credential 신호를 놓쳤다`);

    const tampered = structuredClone(census);
    const record = tampered.records.find(({ stateItems }) => stateItems.length > 0);
    assert.ok(record, 'credential red를 주입할 state-bearing record가 필요하다');
    record.stateItems[0] = { ...record.stateItems[0], ...detected };
    refreshHash(tampered);

    assert.match(
      validateUrlStateCensus(tampered, { repoRoot }).join('\n'),
      /credential-like URL state is forbidden and cannot wait for class review/i,
    );
  }
});

test('typed HTTP GET query objects are inventoried without promoting ordinary Map.get calls', () => {
  const scanned = scanUrlStateSource([
    'const ignored = menuMap.get(menuId);',
    "const result = this.get<PageResponse>('', { params: { searchWrd, page } });",
    'export { ignored, result };',
  ].join('\n'), {
    file: '<memory>',
    routePattern: 'unresolved',
  });
  const requests = scanned.records.filter(({ kind }) => kind === 'request-query-producer');

  assert.equal(requests.length, 1);
  assert.deepEqual(requests[0].stateItems.map(({ name }) => name), ['page', 'searchWrd']);
  assert.equal(requests[0].stateItems.find(({ name }) => name === 'searchWrd').recommendation, 'deny');
});

test('an approval claim fabricated from static syntax is a reproducible semantic red', () => {
  const census = repositoryCensus();
  const mutated = structuredClone(census);
  const state = mutated.records.find(({ stateItems }) => stateItems.length > 0).stateItems[0];
  state.approvalStatus = 'accepted';
  state.dataClass = 'public';
  refreshHash(mutated);

  assert.match(
    validateUrlStateCensus(mutated, { repoRoot }).join('\n'),
    /state classification must remain unverified/i,
  );
});

test('redirect risk or required negative-case narrowing is a reproducible semantic red', () => {
  const census = repositoryCensus();
  const weakenedRedirect = structuredClone(census);
  const redirect = weakenedRedirect.records.find(({ kind }) => kind === 'config-redirect');
  redirect.riskSignals = redirect.riskSignals.filter((signal) => signal !== 'double-encoded-query');
  refreshHash(weakenedRedirect);
  assert.match(
    validateUrlStateCensus(weakenedRedirect, { repoRoot }).join('\n'),
    /config redirect missing double-encoded-query/i,
  );

  const narrowedCases = structuredClone(census);
  narrowedCases.requiredNegativeCases.splice(1, 1);
  refreshHash(narrowedCases);
  assert.match(
    validateUrlStateCensus(narrowedCases, { repoRoot }).join('\n'),
    /required negative cases are not exact and ordered/i,
  );
});

test('population removal and generated snapshot drift cannot pass silently', () => {
  const census = repositoryCensus();
  const removed = structuredClone(census);
  removed.records = removed.records.filter(({ kind }) => kind !== 'dynamic-segment');
  removed.summary.byKind['dynamic-segment'] = 0;
  removed.summary.records = removed.records.length;
  removed.summary.syntaxOccurrences = removed.records.reduce((total, record) => total + record.evidence.occurrenceCount, 0);
  removed.summary.unverifiedRecords = removed.records.length;
  removed.summary.ambiguousRecords = removed.records.filter(({ resolutionStatus }) => resolutionStatus === 'ambiguous').length;
  removed.summary.bySurface.navigation = removed.records.filter(({ surface }) => surface === 'navigation').length;
  refreshHash(removed);

  assert.match(
    validateUrlStateCensus(removed, { repoRoot }).join('\n'),
    /dynamic route population is not exactly represented/i,
  );
  assert.match(compareUrlStateCensus(census, removed).join('\n'), /drifted/i);
});

test('empty populations and lexical parser failures are fail-closed', () => {
  const census = repositoryCensus();
  const empty = structuredClone(census);
  empty.records = [];
  assert.match(validateUrlStateCensus(empty, { repoRoot }).join('\n'), /population is empty/i);

  const lexical = tokenizeUrlStateSource("const bad = 'unterminated", '<memory>');
  assert.ok(lexical.issues.some(({ code }) => code === 'UNTERMINATED_STRING'));
});

// ADR-0018: 만료 에러의 간접 관측 대신 운영 검토가 사용하는 상태 분류 경계를 직접 검증한다.
test('분류할 상태가 없다는 판정은 다섯 조건을 모두 만족할 때만 성립한다', () => {
  const census = repositoryCensus();
  const exemptable = census.records.find((r) => (r.stateItems ?? []).length === 0
    && typeof r.targetCandidate === 'string'
    && !/[?&#]/u.test(r.targetCandidate)
    && !r.targetCandidate.includes('[computed]')
    && (r.riskSignals ?? []).length === 0);
  assert.ok(exemptable, '상태 없는 정적 링크 표본을 찾지 못했다 — 이 테스트가 공허해졌다');
  assert.equal(hasNoClassifiableUrlState(exemptable), true);

  // 조건을 하나씩 깨면 검토 대상에 남아야 한다.
  const breakers = [
    ['타깃 미해소', { targetCandidate: null }],
    ['쿼리 보유', { targetCandidate: '/admin/x?tab=a' }],
    ['경로에 [computed]', { targetCandidate: '/admin/survey/manage/[computed]' }],
    ['프래그먼트', { targetCandidate: '/admin/x#section' }],
    ['미해소 위험 신호', { riskSignals: ['source-query-policy-unverified'] }],
    ['stateItem 보유', { stateItems: [{ name: 'q', dataClass: 'unverified', recommendation: 'deny', approvalStatus: 'unverified', exception: 'none-proposed', riskSignals: [] }] }],
  ];
  for (const [why, patch] of breakers) {
    const tampered = { ...structuredClone(exemptable), ...patch };
    assert.equal(hasNoClassifiableUrlState(tampered), false, `${why}: 상태가 없다고 판정하면 안 된다`);
  }
});

test('상태 없는 URL 판정과 검토 대상은 실제 모집단에 모두 존재한다', () => {
  const census = repositoryCensus();
  const noStateCount = census.records.filter(hasNoClassifiableUrlState).length;
  assert.ok(noStateCount > 0, '정적 링크를 하나도 판정하지 못하면 이 규칙이 동작하지 않는 것이다');
  assert.ok(noStateCount < census.records.length, '미해소 상태가 전부 사라지면 분류가 잘못된 것이다');
});

/*
  [2026-09-05 신설] 폼 제출 가로채기 판정.

  ⚠ 이 판정은 record 를 상태 없음으로 분류한다. 그래서 **넓어지는 방향**을 막는다 —
    `onSubmit` 이 있다는 사실만으로 판정하면, 핸들러가 `preventDefault` 를 부르지 않는 폼이
    상태 없음으로 판정되고 그 폼은 **제출 시 필드를 전부 주소창에 싣는다.**

  판정은 두 증거에만 근거한다: 핸들러 안의 직접 `preventDefault`, 또는 react-hook-form 의
  `handleSubmit(...)` 래핑(라이브러리가 항상 preventDefault 한다).
*/
test('폼 가로채기는 증명된 경우에만 판정한다', () => {
  const scan = (source) => scanUrlStateSource(source, { file: 'probe.tsx' })
    .records.filter((record) => record.kind === 'form-producer')
    .map((record) => record.operation);

  assert.deepEqual(
    scan('export const A = () => <form onSubmit={(e) => { e.preventDefault(); }}><input name="q" /></form>;'),
    ['intercepted-submit'],
    '인라인 preventDefault 는 가로채기가 증명된다',
  );
  assert.deepEqual(
    scan('export const C = () => <form onSubmit={form.handleSubmit(onSubmit)}><input name="q" /></form>;'),
    ['intercepted-submit'],
    'react-hook-form handleSubmit 은 항상 preventDefault 한다',
  );

  // 아래 둘은 **판정하지 않는다**. 모르는 것을 안전하다고 말하지 않는다.
  // 같은 파일에 정의가 있으면 따라가 판정한다.
  assert.deepEqual(
    scan('const submitSurvey = (e) => { e.preventDefault(); save(); };\nexport const B = () => <form onSubmit={submitSurvey}><input name="q" /></form>;'),
    ['intercepted-submit'],
    '같은 파일의 named handler 는 정의를 따라가 preventDefault 를 확인한다',
  );

  // 정의가 이 파일에 없으면(prop 으로 받은 핸들러) 판정하지 않는다.
  assert.deepEqual(
    scan('export const B2 = ({ onSearch }) => <form onSubmit={onSearch}><input name="q" /></form>;'),
    ['implicit-or-computed-method'],
    'prop 으로 받은 핸들러는 정의가 파일 밖이라 판정할 수 없다',
  );

  // 정의는 있는데 preventDefault 가 없으면 판정하지 않는다 — 네이티브 제출이 일어난다.
  assert.deepEqual(
    scan('const submitLoose = (e) => { save(e); };\nexport const B3 = () => <form onSubmit={submitLoose}><input name="q" /></form>;'),
    ['implicit-or-computed-method'],
    'preventDefault 가 없는 named handler 는 네이티브 GET 제출을 막지 못한다',
  );
  assert.deepEqual(
    scan('export const D = () => <form noValidate><input name="q" /></form>;'),
    ['implicit-or-computed-method'],
    'onSubmit 이 없으면 네이티브 GET 제출이 일어난다',
  );

  // 명시적 method="get" 은 가로채기와 무관하게 종전 판정을 유지한다 —
  // 그 폼은 필드를 URL 에 싣겠다고 스스로 선언했다.
  assert.deepEqual(
    scan('export const E = () => <form method="get" onSubmit={(e) => { e.preventDefault(); }}><input name="q" /></form>;'),
    ['explicit-get'],
    'method=get 선언은 핸들러가 막고 있다는 사실로 지워지지 않는다',
  );
});

test('가로채기 판정이 실제 모집단에서 공허하지 않다', () => {
  const census = repositoryCensus();
  const forms = census.records.filter((record) => record.kind === 'form-producer');
  const intercepted = forms.filter((record) => record.operation === 'intercepted-submit');
  const unresolved = forms.filter((record) => record.operation === 'implicit-or-computed-method');

  assert.ok(intercepted.length > 0, '가로채기가 하나도 판정되지 않으면 이 detector 가 죽은 것이다');
  assert.ok(
    unresolved.length > 0,
    '전부 가로채기로 판정되면 판정이 느슨해진 것이다 — 이름만 넘긴 핸들러와 onSubmit 부재가 남아 있어야 한다',
  );
});

/*
 * [2026-10-12 허브 분해 검토] 슬롯 기여가 import 하는 뷰는 자기 기능 디렉터리가 아니라 그 기여를 그리는 소비 셸의 라우트로 귀속한다.
 *   종전에는 협업 허브의 쪽지 탭 이동이 '/note' 로, 스크랩 탭이 '/admin/collaboration/scraps' 로 적혔다(설계 §5 census 범위 확장 표).
 */
test('슬롯 기여와 기여만 import 하는 모듈은 소비 셸의 라우트로 귀속한다', () => {
  const sources = new Map(Object.entries({
    // 허브 탭은 허브마다 슬롯이 따로다(GAP-SLOT-001) — 협업 허브 슬롯의 기여는 지식 허브 셸(다른 슬롯의 소비자)로 새지 않는다.
    'frontend/src/extensions/note/hub-tabs-collaboration.ts': [
      "import { defineContributions } from '@/extensions/slots';",
      "import { NoteTab } from '@/app/note/NoteTab';",
      "export default defineContributions('hub-tabs-collaboration', [{ id: 'MESSAGES', view: { Component: NoteTab } }]);",
    ].join('\n'),
    'frontend/src/extensions/slots.ts': 'export const defineContributions = (slot, entries) => entries;',
    'frontend/src/app/note/NoteTab.tsx': [
      "import { helper } from './note-helper';",
      "import { shared } from '@/lib/shared';",
      "import type { Shape } from '@/lib/shape';",
      "export const NoteTab = () => { router.push('/note'); return helper(shared); };",
    ].join('\n'),
    'frontend/src/app/note/note-helper.ts': 'export const helper = (value) => value;',
    'frontend/src/lib/shared.ts': 'export const shared = 1;',
    'frontend/src/lib/shape.ts': 'export interface Shape { readonly id: string }',
    'frontend/src/app/note/page.tsx': "import { shared } from '@/lib/shared';\nexport default function Page() { return shared; }",
    'frontend/src/extensions/mail/shell-links.ts': "export default [{ id: 'send', placement: 'collaboration-hub', href: '/admin/collaboration/mail-send' }];",
    'frontend/src/extensions/help/shell-links.ts': "export default [{ id: 'help', placement: 'header', href: '/help' }];",
    'frontend/src/app/admin/collaboration/HubClient.tsx': "export const isHubLink = (link) => link.placement === 'collaboration-hub';",
    'frontend/src/app/components/Header.tsx': "export const isHeaderLink = (link) => link.placement === 'header';",
  }));
  const consumerTable = {
    'hub-tabs-collaboration': ['frontend/src/app/admin/collaboration/HubClient.tsx'],
    'hub-tabs-knowledge': ['frontend/src/app/admin/help/KnowledgeHub.tsx'],
    'shell-links': ['frontend/src/app/components/Header.tsx', 'frontend/src/app/admin/collaboration/HubClient.tsx'],
  };
  sources.set('frontend/src/app/admin/help/KnowledgeHub.tsx', 'export const KnowledgeHub = () => null;');
  const contextOf = (file) => ({
    routePattern: file.startsWith('frontend/src/app/admin/collaboration/') ? '/admin/collaboration'
      : file.startsWith('frontend/src/app/admin/help/') ? '/admin/help'
        : file.startsWith('frontend/src/app/note/') ? '/note' : 'unresolved',
    shellAccessEvidence: 'unverified',
  });
  const attributed = slotAttributedRouteContexts({ repoRoot: resolve(repoRoot, 'synthetic-slot-fixture'), sources, contextOf, consumerTable });
  const routes = Object.fromEntries([...attributed].map(([file, contexts]) => [file, contexts.map(({ routePattern }) => routePattern)]));

  assert.deepEqual(routes, {
    'frontend/src/extensions/note/hub-tabs-collaboration.ts': ['/admin/collaboration'],
    'frontend/src/app/note/NoteTab.tsx': ['/admin/collaboration'],
    'frontend/src/app/note/note-helper.ts': ['/admin/collaboration'],
    // 배치 리터럴로 거르는 셸만 그 기여를 그린다. 공용 셸(머리글)이 그리는 기여는 라우트를 특정하지 못한다.
    'frontend/src/extensions/mail/shell-links.ts': ['/admin/collaboration'],
    'frontend/src/extensions/help/shell-links.ts': ['unresolved'],
  }, '다른 화면도 import 하는 모듈(shared)·타입 import(shape)·라우트 진입 파일은 자기 맥락을 그대로 받는다');

  // 실제 모집단: 쪽지 탭의 이동은 협업 허브의 record 다(종전 '/note').
  const census = repositoryCensus();
  const noteTab = census.records.filter(({ source }) => source === 'frontend/src/app/note/NoteCollaborationTab.tsx');
  assert.ok(noteTab.length > 0, '쪽지 탭의 record 가 사라지면 이 귀속 시험이 공허하다');
  assert.deepEqual([...new Set(noteTab.map(({ routePattern }) => routePattern))], ['/admin/collaboration']);
});

// 시험들은 한 번 만든 저장소 census 의 복제본을 나눠 받는다(repositoryCensus). 앞 시험이 받은 결과를 제자리에서 바꿔도(비검색 drift
// 시험이 record 문구와 해시를 바꾼다) 공유 결과는 커밋된 원장 그대로여야 한다 — 복제를 빼면 이 시험이 붉다.
test('공유한 저장소 census 는 앞 시험의 제자리 변형에 오염되지 않는다', () => {
  const shared = repositoryCensus();
  assert.deepEqual(compareUrlStateCensus(JSON.parse(readFileSync(manifestPath, 'utf8')), shared), []);
  assert.notEqual(repositoryCensus(), shared, '부를 때마다 새 복제본이어야 한다');
});
