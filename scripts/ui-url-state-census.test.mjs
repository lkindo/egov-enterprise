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

test('current URL-state census exactly covers critical route and URL producer populations', () => {
  const actual = buildUrlStateCensus({ repoRoot });
  const expected = JSON.parse(readFileSync(manifestPath, 'utf8'));

  assert.deepEqual(validateUrlStateCensus(actual, { repoRoot }), []);
  assert.deepEqual(validateUrlStateCensus(expected, { repoRoot }), []);
  assert.deepEqual(compareUrlStateCensus(expected, actual), []);
  // [2026-08-27] configRedirects 15 → 14. /admin/security/login-policy 의 리다이렉트를 제거해
  //   그 화면(로그인 보안 정책, 424줄 + API 5개)을 정본 경로로 되살렸다. 리다이렉트가 **줄어드는**
  //   방향이라 URL 상태 표면이 넓어지지 않는다 — filesystemRoutes 120 은 불변이다.
  assert.ok(FILESYSTEM_ROUTE_COUNT >= 100, `route discovery collapsed: ${FILESYSTEM_ROUTE_COUNT} < 100`);
  assert.deepEqual(actual.summary.exactPopulations, {
    filesystemRoutes: FILESYSTEM_ROUTE_COUNT,
    dynamicRoutePatterns: 11,
    // [2026-09-08 PD-SRVY-001] 14 → 13. /admin/survey/respondents 의 리다이렉트를 제거했다 —
    //   목적지였던 허브 응답자 탭도 함께 걷었으므로 남겨 두면 존재하지 않는 탭으로 보낸다.
    //   URL 상태 표면이 **줄어드는** 방향이다.
    configRedirects: 13,
    // [2026-09-05 DEC-OPS-034] 5 → 7: boards/write · boards/[id] 가 insert-board-article 로의 page-redirect 가 됐다.
    // [2026-09-06 DEC-OPS-040] 7 → 11: /admin/system/ism → /approvals, /admin/community · /admin/community/boards →
    //   /admin/help?tab=COMMUNITY, /admin/system/monitoring → /admin/system/monitoring/hub 가 page-redirect 가 됐다.
    // [2026-09-12 §A3-1 · DEC-OPS-079] 12 → 16. 주소록 등록·스크랩 등록/수정·설문 등록 4개가 각 정본 목록으로의
    //   page-redirect 가 됐다 — 입력 폼을 목록 위 모달로 옮겼다. URL 상태는 **늘지 않는다**:
    //   모달은 주소에 아무것도 싣지 않고, 오히려 목록의 navigation-producer 한 건이 사라졌다.
    // [2026-09-25 DEC-OPS-130] 16 → 17. /admin/community/[id] 가 id 를 보존해 정본 커뮤니티 상세로 보내는
    //   page-redirect 가 됐다. 그 화면이 검색어를 URL 에 싣던 유일한 곳이었으므로 URL 상태 표면은 **줄어든다**.
    pageRedirects: 17,
  });
  assert.equal(actual.summary.records, actual.records.length);
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
  const candidate = buildUrlStateCensus({ repoRoot });
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
  const census = buildUrlStateCensus({ repoRoot });
  const before = structuredClone(census);
  const dates = ['2026-12-31T23:59:59.999Z', '2027-01-01T00:00:00.000Z', '2036-09-14T00:00:00.000Z'];
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(dates[0]) });
  for (const date of dates) {
    t.mock.timers.setTime(Date.parse(date));
    assert.deepEqual(validateUrlStateCensus(census, { repoRoot }), [], date);
  }
  assert.deepEqual(census, before, '검토 일정이나 미승인 상태를 자동 갱신하면 안 된다');
});

test('a non-existent reviewBy date cannot silently corrupt the operational review schedule', () => {
  const census = buildUrlStateCensus({ repoRoot });

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
  const census = buildUrlStateCensus({ repoRoot });
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
  const census = buildUrlStateCensus({ repoRoot });

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
  const census = buildUrlStateCensus({ repoRoot });
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
  const census = buildUrlStateCensus({ repoRoot });
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
  const census = buildUrlStateCensus({ repoRoot });
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
  const census = buildUrlStateCensus({ repoRoot });
  const empty = structuredClone(census);
  empty.records = [];
  assert.match(validateUrlStateCensus(empty, { repoRoot }).join('\n'), /population is empty/i);

  const lexical = tokenizeUrlStateSource("const bad = 'unterminated", '<memory>');
  assert.ok(lexical.issues.some(({ code }) => code === 'UNTERMINATED_STRING'));
});

// ADR-0018: 만료 에러의 간접 관측 대신 운영 검토가 사용하는 상태 분류 경계를 직접 검증한다.
test('분류할 상태가 없다는 판정은 다섯 조건을 모두 만족할 때만 성립한다', () => {
  const census = buildUrlStateCensus({ repoRoot });
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
  const census = buildUrlStateCensus({ repoRoot });
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
  const census = buildUrlStateCensus({ repoRoot });
  const forms = census.records.filter((record) => record.kind === 'form-producer');
  const intercepted = forms.filter((record) => record.operation === 'intercepted-submit');
  const unresolved = forms.filter((record) => record.operation === 'implicit-or-computed-method');

  assert.ok(intercepted.length > 0, '가로채기가 하나도 판정되지 않으면 이 detector 가 죽은 것이다');
  assert.ok(
    unresolved.length > 0,
    '전부 가로채기로 판정되면 판정이 느슨해진 것이다 — 이름만 넘긴 핸들러와 onSubmit 부재가 남아 있어야 한다',
  );
});
