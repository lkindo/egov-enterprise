import test from 'node:test';
import assert from 'node:assert/strict';

import { analyze, detectCandidates, validateCensus } from './a3-1-form-container-census.mjs';

const baseline = analyze();

/**
 * 업무 화면 문법 카탈로그 §A3-1 은 "인라인 ≥ 모달 > 전용 페이지" 를 판정 규칙으로 세웠지만
 * **집행 게이트가 없었다** — 2026-09-12 실측에서 저장소 전체의 `A3-1` 문자열은 문서 밖에 주석 한 곳뿐이었다.
 * 규칙만 있고 게이트가 없으면 위반이 들어와도 아무 신호가 나지 않는다.
 *
 * 이 계약이 지키는 것은 셋이다.
 *   ① 전용 입력 페이지는 **하나도 빠짐없이** census 에 판정과 함께 등재된다(신규 유입 차단).
 *   ② 정당화는 **기계로 대조**된다 — 조건 1a/1b/2 는 라우트 소스에 흔적이 있어야 하고,
 *      메뉴 리프 제외는 Flyway 메뉴 시드에 그 경로가 있어야 한다. 사유만 적고 통과하지 못한다.
 *   ③ 부채는 **단조 감소 래칫**이다. 줄었는데 래칫을 안 내리면 red — 줄어든 만큼 새 위반이 들어올
 *      자리를 남기지 않는다.
 */
test('every dedicated input page is listed in the A3-1 census with a verdict', () => {
  assert.deepEqual(baseline.result.errors, []);
  assert.ok(
    baseline.candidates.length > 0,
    '후보가 0이면 탐지 술어가 붕괴한 것이다 — vacuous 통과를 막는다',
  );
  assert.equal(
    baseline.census.entries.length,
    baseline.candidates.length,
    'census 항목 수와 탐지된 후보 수가 같아야 한다',
  );
});

test('a new dedicated input page cannot enter without a verdict', () => {
  const candidates = [
    ...baseline.candidates,
    { route: '/admin/synthetic/new-input-page', files: [], blob: 'useManualFormValidation' },
  ];
  const result = validateCensus(baseline.census, candidates);
  assert.ok(result.errors.some((error) => error.includes('/admin/synthetic/new-input-page')));
});

test('a stale entry is rejected once the page is gone', () => {
  const census = structuredClone(baseline.census);
  census.entries.push({
    route: '/admin/synthetic/already-migrated',
    verdict: 'violation',
    reason: '이미 모달로 옮겼는데 등재만 남은 상태',
    remedy: '항목 삭제',
  });
  const result = validateCensus(census, baseline.candidates);
  assert.ok(result.errors.some((error) => error.includes('더 이상 전용 입력 페이지가 아니다')));
});

test('a justification must be backed by the route source, not just asserted', () => {
  const target = baseline.census.entries.find((entry) => entry.verdict !== 'justified');
  assert.ok(target, '비-justified 항목이 하나는 있어야 이 부정 테스트가 성립한다');

  const census = structuredClone(baseline.census);
  const entry = census.entries.find((item) => item.route === target.route);
  entry.verdict = 'justified';
  entry.conditions = ['1a'];
  const result = validateCensus(census, baseline.candidates);
  assert.ok(
    result.errors.some((error) => error.includes('조건 1a') && error.includes('흔적이 없다')),
    '리치 텍스트 흔적이 없는 라우트가 조건 1a 로 정당화되면 안 된다',
  );
});

test('menu-leaf exclusion must point at a real menu seed', () => {
  const census = structuredClone(baseline.census);
  const entry = census.entries.find((item) => item.verdict !== 'excluded-menu-leaf');
  assert.ok(entry, '비-menu-leaf 항목이 하나는 있어야 한다');
  entry.verdict = 'excluded-menu-leaf';
  const result = validateCensus(census, baseline.candidates, { migrations: '', gaps: '' });
  assert.ok(result.errors.some((error) => error.includes('메뉴 시드에서')));
});

test('the debt ratchet moves only downward', () => {
  const raised = structuredClone(baseline.census);
  raised.expected.debtMax += 1;
  assert.ok(
    validateCensus(raised, baseline.candidates).errors.some((error) => error.includes('래칫은')),
    '부채가 줄지 않았는데 래칫만 올리면 red 여야 한다',
  );

  const lowered = structuredClone(baseline.census);
  lowered.expected.debtMax -= 1;
  assert.ok(
    validateCensus(lowered, baseline.candidates).errors.some((error) => error.includes('래칫을 넘었다')),
    '부채가 래칫을 넘으면 red 여야 한다',
  );
});

test('the detector notices modal and inline containers are not violations', () => {
  // 목록 위 모달(기본값)과 master-detail 인라인(최선)은 애초에 후보가 아니어야 한다.
  const routes = detectCandidates().map((candidate) => candidate.route);
  for (const modalRoute of ['/admin/operation/events', '/admin/system/banner', '/note']) {
    assert.ok(!routes.includes(modalRoute), `${modalRoute} 는 모달이므로 후보가 아니어야 한다`);
  }
  for (const inlineRoute of ['/admin/system/menus', '/admin/system/common-code']) {
    assert.ok(!routes.includes(inlineRoute), `${inlineRoute} 는 인라인/목록이므로 후보가 아니어야 한다`);
  }
});

test('a retired or disabled menu row cannot keep issuing an exemption', () => {
  const census = structuredClone(baseline.census);
  const entry = census.entries.find((item) => item.verdict === 'excluded-menu-leaf');
  assert.ok(entry, 'menu-leaf 면제 항목이 하나는 있어야 이 부정 테스트가 성립한다');

  // 그 메뉴가 나중에 삭제된 상황.
  const deleted = `INSERT INTO tb_menu_info (modern_route) VALUES ('${entry.route}');`
    + ` DELETE FROM tb_menu_crt_dtl WHERE menu_sn = ${entry.menuSn};`;
  assert.ok(
    validateCensus(census, baseline.candidates, { migrations: deleted, gaps: '' })
      .errors.some((error) => error.includes('삭제·비활성됐다')),
  );

  // 그 메뉴가 나중에 비활성된 상황.
  const disabled = `INSERT INTO tb_menu_info (modern_route) VALUES ('${entry.route}');`
    + ` UPDATE tb_menu_info SET use_yn = 'N' WHERE menu_sn = ${entry.menuSn};`;
  assert.ok(
    validateCensus(census, baseline.candidates, { migrations: disabled, gaps: '' })
      .errors.some((error) => error.includes('삭제·비활성됐다')),
  );

  // 주석이나 접두 일치로는 면제되지 않는다.
  const commentOnly = `-- 예전에 ${entry.route} 를 쓰던 메뉴가 있었다`;
  assert.ok(
    validateCensus(census, baseline.candidates, { migrations: commentOnly, gaps: '' })
      .errors.some((error) => error.includes('찾지 못했다')),
  );
});

test('a single staged file upload does not satisfy condition 1b', () => {
  /*
    §A3-1 은 "제출과 함께 보내는 1건은 모달에서도 된다" 며 /admin/system/banner 를 예시로 든다.
    그 화면은 `StandardFileUploader maxFiles={1}` 을 모달 안에서 쓰므로, 파일 입력 문자열만 보면
    모달 허용 사례까지 페이지로 정당화된다. 조건 1b 의 실질은 **기존 첨부 관리**다.
  */
  const census = structuredClone(baseline.census);
  const entry = census.entries.find((item) => item.verdict !== 'justified');
  assert.ok(entry, '비-justified 항목이 하나는 있어야 한다');
  entry.verdict = 'justified';
  entry.conditions = ['1b'];

  const stagedSingleUpload = baseline.candidates.map((candidate) => (
    candidate.route === entry.route
      ? { ...candidate, blob: '<StandardFileUploader name="files" maxFiles={1} />' }
      : candidate
  ));
  assert.ok(
    validateCensus(census, stagedSingleUpload)
      .errors.some((error) => error.includes('조건 1b') && error.includes('흔적이 없다')),
  );
});

test('an exclusion must carry file-level evidence, not just prose', () => {
  const census = structuredClone(baseline.census);
  const entry = census.entries.find((item) => item.verdict.startsWith('excluded-'));
  assert.ok(entry, '제외 판정 항목이 하나는 있어야 한다');
  entry.evidence = '   ';
  assert.ok(
    validateCensus(census, baseline.candidates)
      .errors.some((error) => error.includes('evidence(파일:라인)')),
  );
});
