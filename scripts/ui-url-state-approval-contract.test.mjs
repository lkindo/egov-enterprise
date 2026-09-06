import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

import {
  approvedStateItemSelectors,
  isUrlStateItemApproved,
  validateUrlStateCensus,
} from './ui-url-state-census.mjs';

/**
 * URL-state 분류 승인 오버레이 계약.
 *
 * **무엇을 막는가.** `config/ui-url-state-census.json` 은 소스를 정적으로 훑어 기계 생성된다.
 * 그래서 그 안의 review·canonical·dataClass·approvalStatus 는 전부 `unverified` 로 강제돼 있다
 * (`ui-url-state-census.mjs` — "canonical route status cannot be approved by syntax").
 * **문법이 스스로를 승인하지 못하게 하는 의도된 제약이다.**
 *
 * 그 결과 재검토를 완료해도 적을 곳이 없었다. 이 오버레이가 그 자리를 생성물 **바깥에** 만든다.
 * 설계 근거는 docs/02-architecture/url-state-approval-overlay-design.md,
 * 선례는 내비게이션 disposition 오버레이다(생성 manifest + 사람이 쓰는 판단 레이어).
 *
 * ⚠ 이 계약이 red 인데 오버레이를 느슨하게 만들어 통과시키는 것은 수정이 아니다.
 *   승인은 사람이 근거와 함께 쓴 것만 승인이다.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const OVERLAY_PATH = join(ROOT, 'config', 'ui-url-state-approval.json');
const SCHEMA_PATH = join(ROOT, 'config', 'ui-url-state-approval.schema.json');
const CENSUS_PATH = join(ROOT, 'config', 'ui-url-state-census.json');

const overlay = JSON.parse(readFileSync(OVERLAY_PATH, 'utf8'));
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
const censusRaw = readFileSync(CENSUS_PATH, 'utf8');
const census = JSON.parse(censusRaw);
const DECISION_TIME = Date.parse('2026-09-05T00:00:00.000Z');

const SEARCH_INPUT_NAMES = ['q', 'searchCnd', 'searchWrd'];
const SEARCH_INPUT_RECORD_IDS = [
  'URL-204665E3AB9C4A',
  'URL-3E36A25946033C',
  'URL-A13AC14823B70F',
  'URL-E28F88902ADC75',
  'URL-E910532B42785F',
];
const SEARCH_PRODUCER_FILES = [
  'frontend/src/app/components/ui/global-command-center.tsx',
  'frontend/src/app/search/SearchClient.tsx',
];
const SEARCH_ROUTE_KEY_BINDINGS = [
  {
    routePattern: '/search',
    stateItemNames: ['q'],
    sources: [
      'frontend/src/app/components/ui/global-command-center.tsx',
      'frontend/src/app/search/SearchClient.tsx',
      'frontend/src/app/search/SearchResultsSlot.tsx',
    ],
  },
  {
    routePattern: '/admin/community/[id]',
    stateItemNames: ['searchCnd', 'searchWrd'],
    sources: [
      'frontend/src/app/admin/community/[id]/CommunityDetailClient.tsx',
      'frontend/src/lib/hooks/use-search-state.ts',
    ],
  },
  {
    routePattern: '/admin/community/boards/select-board-list',
    stateItemNames: ['searchCnd', 'searchWrd'],
    sources: [
      'frontend/src/app/admin/community/boards/select-board-list/BoardListClient.tsx',
      'frontend/src/app/admin/community/boards/select-board-list/page.tsx',
    ],
  },
];

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[cm]?[jt]sx?$/u.test(entry.name) ? [path] : [];
  });
}

/** 생성물은 LF, Windows 체크아웃은 CRLF 일 수 있다. 정본을 LF 로 정규화해 해시한다. */
function canonicalSha256(text) {
  return createHash('sha256').update(text.replace(/\r\n?/gu, '\n'), 'utf8').digest('hex');
}

function stateItemCounts(source) {
  const counts = new Map();
  for (const record of source.records ?? []) {
    for (const item of record.stateItems ?? []) {
      counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
    }
  }
  return counts;
}

/** 설계안 §4.2 — 모든 stateItem 이 approved class 에 덮인 record 만 만료를 면제받는다. */
function recordsExemptFromExpiry(overlayDoc, censusDoc, nowMs = DECISION_TIME) {
  const selectors = approvedStateItemSelectors(overlayDoc, censusDoc, nowMs);
  return (censusDoc.records ?? []).filter((record) => {
    const items = record.stateItems ?? [];
    return items.length > 0 && items.every((item) => isUrlStateItemApproved(record, item, selectors));
  });
}

function searchInputContractErrors(overlayDoc) {
  const cls = (overlayDoc.classes ?? []).find(({ classId }) => classId === 'search-input');
  if (!cls) return ['search-input class is missing'];
  const errors = [];
  if (cls.decisionRef !== 'docs/02-architecture/decisions/ADR-0009-controlled-url-search-state.md') {
    errors.push('search-input must remain bound to ADR-0009');
  }
  if (cls.reviewState !== 'approved') errors.push('search-input must remain approved');
  if (cls.dataClass !== 'user-typed-free-text') errors.push('search-input dataClass drifted');
  if (cls.privacyReview !== 'accepted-risk') errors.push('search-input privacy decision must remain accepted-risk');
  if (cls.authorizationReview !== 'not-applicable') errors.push('URL transport must not claim authorization review');
  if (JSON.stringify([...(cls.selector?.stateItemNames ?? [])].sort()) !== JSON.stringify(SEARCH_INPUT_NAMES)) {
    errors.push('search-input names are not the exact ADR-0009 allowlist');
  }
  if (JSON.stringify([...(cls.selector?.recordIds ?? [])].sort()) !== JSON.stringify(SEARCH_INPUT_RECORD_IDS)) {
    errors.push('search-input records are not the exact ADR-0009 surface');
  }
  if (JSON.stringify(cls.selector?.routeKeyBindings) !== JSON.stringify(SEARCH_ROUTE_KEY_BINDINGS)) {
    errors.push('search-input route/key bindings are not the exact ADR-0009 surface');
  }
  return errors;
}

test('오버레이는 선언된 JSON Schema를 실제로 통과한다', () => {
  const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validate(overlay), true, JSON.stringify(validate.errors, null, 2));

  const misplacedDecision = structuredClone(overlay);
  misplacedDecision.classes.find(({ classId }) => classId === 'presentation-state').decisionRef =
    'docs/02-architecture/decisions/ADR-0009-controlled-url-search-state.md';
  assert.equal(validate(misplacedDecision), false, 'ADR-0009 decisionRef는 search-input 밖에 둘 수 없어야 한다');
  assert.equal(
    approvedStateItemSelectors(misplacedDecision, census, DECISION_TIME).length,
    0,
    '잘못 귀속된 decisionRef를 실제 matcher가 승인으로 열면 안 된다',
  );
});

test('class registry는 census 특정 버전에 결속되고 search 결정은 class가 소유한다', () => {
  assert.equal(overlay.schemaVersion, 1);
  assert.equal(overlay.state, 'class-governed');
  assert.equal(overlay.authority, 'non-normative-url-state-class-registry');
  assert.equal(Object.hasOwn(overlay, 'decisionRef'), false, 'ADR-0009가 검색어 외 기존 승인까지 소유하면 안 된다');
  assert.equal(overlay.schemaRef, 'config/ui-url-state-approval.schema.json');
  assert.equal(overlay.manifestRef.path, 'config/ui-url-state-census.json');

  assert.equal(
    overlay.manifestRef.sha256,
    canonicalSha256(censusRaw),
    'census 가 재생성됐다면 오버레이의 판단도 다시 확인해야 한다 — 해시를 갱신하기 전에 분류가 여전히 맞는지 보라',
  );
});

test('부류가 census 의 stateItem 을 빠짐없이·중복 없이 덮는다', () => {
  const counts = stateItemCounts(census);
  const declared = (overlay.classes ?? []).flatMap((cls) => cls.selector.stateItemNames);

  assert.equal(new Set(declared).size, declared.length, '두 부류가 같은 이름을 덮으면 어느 판단이 이기는지 알 수 없다');

  const missing = [...counts.keys()].filter((name) => !declared.includes(name));
  assert.deepEqual(missing, [], 'census 에 있는데 어느 부류에도 안 덮이는 이름 — 그 record 는 영원히 승인될 수 없다');

  // 유령 selector 금지: 아무 record 도 덮지 못하는 이름을 선언하면 승인 범위가 부풀려 보인다.
  const ghost = declared.filter((name) => !counts.has(name));
  assert.deepEqual(ghost, [], '부류가 census 에 없는 이름을 선언했다 — 유령 승인');
});

test('승인은 근거 없이 성립하지 않는다', () => {
  for (const cls of overlay.classes) {
    for (const [axis, approval] of Object.entries(cls.approvals)) {
      if (approval === null) continue;
      const label = `${cls.classId}.approvals.${axis}`;
      assert.ok(approval.reviewer?.trim(), `${label}.reviewer 는 명명된 사람 또는 책임 역할이어야 한다`);
      assert.match(approval.reviewedAt ?? '', /^\d{4}-\d{2}-\d{2}$/u, `${label}.reviewedAt`);
      assert.ok(Array.isArray(approval.evidence) && approval.evidence.length > 0, `${label}.evidence 가 비어 있다`);
      assert.ok(approval.evidence.every((e) => typeof e === 'string' && e.trim()), `${label}.evidence 에 빈 항목`);
    }
  }
});

test('approved 는 축별 검토와 승인이 모두 끝났을 때만 선언할 수 있다', () => {
  for (const cls of overlay.classes) {
    if (cls.reviewState !== 'approved') continue;
    const label = `${cls.classId}`;
    assert.notEqual(cls.dataClass, 'unverified', `${label}: approved 인데 dataClass 가 미판정이다`);
    assert.notEqual(cls.privacyReview, 'unverified', `${label}: approved 인데 privacyReview 가 미판정이다`);
    assert.notEqual(cls.authorizationReview, 'unverified', `${label}: approved 인데 authorizationReview 가 미판정이다`);
    for (const [axis, approval] of Object.entries(cls.approvals)) {
      assert.notEqual(approval, null, `${label}: approved 인데 ${axis} 승인이 비어 있다`);
    }
  }
});

test('census 가 판정하지 못한 항목은 승인 대상이 아니다', () => {
  const opaque = overlay.classes.find((cls) => cls.classId === 'opaque');
  assert.ok(opaque, 'opaque 부류가 사라졌다 — census 의 미판정 항목이 다른 부류로 흡수되면 안 된다');

  assert.equal(
    opaque.reviewState,
    'blocked-input',
    '"무엇인지 모른다" 를 "안전하다" 로 승인하는 것이 이 오버레이가 막으려는 조작이다. '
    + 'detector 를 고쳐 항목의 정체를 밝힌 뒤에야 판정할 수 있다',
  );
  assert.equal(opaque.dataClass, 'indeterminate');

  // 합성 마커는 전부 이 부류에 있어야 한다.
  const synthetic = [...stateItemCounts(census).keys()].filter((name) => name.startsWith('<'));
  for (const name of synthetic) {
    assert.ok(
      opaque.selector.stateItemNames.includes(name),
      `합성 마커 ${name} 가 opaque 밖으로 나갔다 — 미판정 항목이 승인 가능해진다`,
    );
  }
});

test('부분 승인이 전체 면제가 되지 않는다', () => {
  const approvedClasses = overlay.classes.filter((cls) => cls.reviewState === 'approved');
  const exempt = recordsExemptFromExpiry(overlay, census);

  if (approvedClasses.length === 0) {
    assert.equal(exempt.length, 0, '승인이 없는데 만료를 면제받는 record 가 있다');
    return;
  }

  // 승인이 생긴 뒤에도: 덮이지 않은 stateItem 이 하나라도 있는 record 는 면제되지 않는다.
  const selectors = approvedStateItemSelectors(overlay, census, DECISION_TIME);
  for (const record of exempt) {
    assert.ok(
      (record.stateItems ?? []).every((item) => isUrlStateItemApproved(record, item, selectors)),
      `${record.id}: 승인되지 않은 stateItem 을 가진 record 가 면제됐다`,
    );
  }
});

test('면제 계산이 공허하지 않다 — 합성 승인으로 red 를 증명한다', () => {
  /*
    ⚠ vacuity 가드. 위 '부분 승인' 테스트는 현재 approved 가 0이라 "0건 면제" 만 확인한다.
      그것만으로는 면제 로직이 **아무것도 면제하지 않는 죽은 코드**여도 green 이다.
      합성 오버레이로 (가) 승인하면 실제로 면제되고 (나) 한 부류만 승인하면 섞인 record 는
      면제되지 않음을 함께 증명한다. 저장소에 가짜 승인을 남기지 않으려고 메모리에서만 만든다.
  */
  /*
    ⚠ [2026-09-05] 실물 오버레이를 복제한 뒤 **한 부류만 올리는** 방식이었는데, 실제 승인이
      생기자(presentation-state·control-flag) 복제본에 그 승인이 함께 실려 "다른 부류의
      stateItem 을 가졌는데 면제됐다" 로 red 가 됐다. 테스트가 틀린 것이지 면제가 샌 것이 아니다.
      합성 시나리오는 **전체 승인 집합을 통제**해야 한다 — 전부 내린 뒤 하나만 올린다.
  */
  const presentationOnly = structuredClone(overlay);
  for (const cls of presentationOnly.classes) {
    cls.reviewState = cls.classId === 'presentation-state' ? 'approved' : 'proposed';
  }

  const exempt = recordsExemptFromExpiry(presentationOnly, census);
  assert.ok(exempt.length > 0, '표현 상태를 전부 승인해도 면제되는 record 가 0이면 면제 로직이 죽어 있다');

  const presentationNames = new Set(
    presentationOnly.classes.find((c) => c.classId === 'presentation-state').selector.stateItemNames,
  );
  for (const record of exempt) {
    assert.ok(
      record.stateItems.every((item) => presentationNames.has(item.name)),
      `${record.id}: 다른 부류의 stateItem 을 가졌는데 면제됐다`,
    );
  }

  // 섞인 record 는 반드시 남아야 한다 — 그렇지 않으면 부분 승인이 전체 면제가 된다.
  const mixed = census.records.filter((r) => {
    const items = r.stateItems ?? [];
    return items.some((i) => presentationNames.has(i.name)) && items.some((i) => !presentationNames.has(i.name));
  });
  if (mixed.length > 0) {
    const exemptIds = new Set(exempt.map((r) => r.id));
    for (const record of mixed) {
      assert.ok(!exemptIds.has(record.id), `${record.id}: 일부만 승인됐는데 면제됐다`);
    }
  }
});

/*
  [2026-09-05] 종전의 "오버레이는 승인을 선언하지 않은 상태로 시작한다" 를 **이것으로 교체**했다.

  그 테스트는 승인이 생기면 의도적으로 red 가 되도록 설계됐고, 설계 문서가 "명시적으로 제거하는
  커밋이 여기서부터 승인이 존재한다를 이력에 남긴다" 로 절차를 적어 두었다. 이 커밋이 그 지점이다.

  그러나 그냥 지우면 **자동화가 조용히 승인을 늘리는 경로**가 열린다. 그래서 남은 부류의
  미승인 상태를 동결한다 — 이 목록을 줄이려면 근거와 함께 이 배열을 고쳐야 하고, 그 diff 가
  "무엇을 새로 승인했는가" 를 드러낸다.
*/
// resource-identifier 는 같은 날 늦게 추가됐다 — 승인 조건("열거 억제 부재 + 객체 가드 목록 확인")이
// 미판정 3건(만족도·커뮤니티 상세 = 결함 수정 PR #548, 부서업무 = 문서화된 제품 결정)의 판정으로
// 충족된 뒤다. 이 배열을 늘리는 diff 가 "무엇을 새로 승인했는가" 를 드러낸다.
const APPROVED_AS_OF_2026_09_05 = ['presentation-state', 'control-flag', 'resource-identifier', 'search-input'];

test('승인된 부류는 명시 목록과 정확히 일치한다 — 조용히 늘지 않는다', () => {
  const approved = overlay.classes
    .filter((cls) => cls.reviewState === 'approved')
    .map((cls) => cls.classId)
    .sort();

  assert.deepEqual(
    approved,
    [...APPROVED_AS_OF_2026_09_05].sort(),
    '승인 부류가 바뀌었다면 근거와 함께 이 목록을 같은 변경에서 고쳐라',
  );

  // 승인하지 않기로 판정한 부류는 그 사유가 살아 있어야 한다.
  const byId = Object.fromEntries(overlay.classes.map((cls) => [cls.classId, cls]));
  assert.equal(byId.opaque?.reviewState, 'blocked-input', 'census 미판정 항목은 승인 대상이 아니다');
  for (const id of ['path-intent', 'hand-assembled-segment']) {
    assert.equal(byId[id]?.dataClass, 'indeterminate', `${id}: 어휘 확장 전에는 판정하지 않는다`);
  }
});

test('ADR-0009 검색어 승인은 현재 5개 record와 3개 key에만 한정된다', () => {
  assert.deepEqual(searchInputContractErrors(overlay), []);

  const withoutSearch = structuredClone(overlay);
  withoutSearch.classes.find(({ classId }) => classId === 'search-input').reviewState = 'proposed';
  assert.equal(
    recordsExemptFromExpiry(overlay, census).length - recordsExemptFromExpiry(withoutSearch, census).length,
    5,
    '검색어 승인으로 면제되는 현재 surface 수가 달라졌다',
  );
});

test('/search?q producer는 명시된 두 구현으로 고정되고 값은 인코딩된다', () => {
  const frontendRoot = join(ROOT, 'frontend', 'src');
  const producers = sourceFiles(frontendRoot)
    .filter((path) => {
      const source = readFileSync(path, 'utf8');
      return source.includes('/search?q') || source.includes('action="/search"');
    })
    .map((path) => path.slice(ROOT.length + 1).replaceAll('\\', '/'))
    .sort();
  assert.deepEqual(producers, SEARCH_PRODUCER_FILES, '새 검색 URL producer는 ADR-0009 allowlist 검토 없이 추가할 수 없다');

  const commandCenter = readFileSync(join(ROOT, SEARCH_PRODUCER_FILES[0]), 'utf8');
  assert.match(commandCenter, /url:\s*`\/search\?q=\$\{encodeURIComponent\(search\)\}`/u);

  const searchForm = readFileSync(join(ROOT, SEARCH_PRODUCER_FILES[1]), 'utf8');
  assert.match(searchForm, /<form\s+action="\/search"\s+method="get"[\s\S]{0,800}?name="q"/u);
});

test('/admin/community/[id]는 호출 화면의 key만 재조립하고 same-view replace를 쓴다', () => {
  const hookUsers = sourceFiles(join(ROOT, 'frontend', 'src'))
    .filter((path) => !path.replaceAll('\\', '/').includes('/__tests__/'))
    .filter((path) => readFileSync(path, 'utf8').includes('useSearchState({'))
    .map((path) => path.slice(ROOT.length + 1).replaceAll('\\', '/'))
    .sort();
  assert.deepEqual(hookUsers, ['frontend/src/app/admin/community/[id]/CommunityDetailClient.tsx']);

  const hook = readFileSync(join(ROOT, 'frontend/src/lib/hooks/use-search-state.ts'), 'utf8');
  assert.match(hook, /const params = new URLSearchParams\(\)/u);
  assert.doesNotMatch(hook, /new URLSearchParams\(searchParams\.toString\(\)\)/u);
  assert.match(hook, /Object\.keys\(initialValues\)/u);
  assert.match(hook, /router\.replace/u);

  const owner = readFileSync(join(ROOT, hookUsers[0]), 'utf8');
  const declaration = owner.match(/useSearchState\(\{([\s\S]*?)\}\)/u);
  assert.ok(declaration, 'useSearchState 호출부의 key 계약을 읽을 수 없습니다.');
  const names = [...declaration[1].matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gmu)].map((match) => match[1]).sort();
  assert.deepEqual(names, ['bbsId', 'page', 'searchCnd', 'searchWrd']);
});

test('자격증명 key나 새 free-text search surface로 검색어 승인이 조용히 넓어지지 않는다', () => {
  const credentialExpansion = structuredClone(overlay);
  credentialExpansion.classes.find(({ classId }) => classId === 'search-input').selector.stateItemNames.push('token');
  assert.match(searchInputContractErrors(credentialExpansion).join('\n'), /exact ADR-0009 allowlist/);

  const future = structuredClone(census);
  const synthetic = structuredClone(future.records.find((record) => record.id === 'URL-E28F88902ADC75'));
  synthetic.id = 'URL-FFFFFFFFFFFFFF';
  synthetic.source = '<memory>';
  synthetic.producerFile = null;
  synthetic.consumerFile = '<memory>';
  future.records.push(synthetic);
  const alternateName = structuredClone(synthetic);
  alternateName.id = 'URL-EEEEEEEEEEEEEE';
  alternateName.stateItems = alternateName.stateItems.map((state) => ({
    ...state,
    name: state.name === 'q' ? 'keyword' : state.name,
  }));
  future.records.push(alternateName);

  const matchingOverlay = structuredClone(overlay);
  matchingOverlay.manifestRef.sha256 = canonicalSha256(`${JSON.stringify(future, null, 2)}\n`);
  const exemptIds = new Set(recordsExemptFromExpiry(matchingOverlay, future).map(({ id }) => id));
  assert.equal(exemptIds.has(synthetic.id), false, '같은 q 이름을 쓰는 새 route가 record 승인 없이 면제됐다');
  assert.equal(exemptIds.has(alternateName.id), false, '다른 free-text 이름을 쓰는 새 route가 승인 없이 면제됐다');
  assert.match(
    validateUrlStateCensus(future, {
      repoRoot: ROOT,
      nowMs: DECISION_TIME,
      approvalOverlay: matchingOverlay,
    }).join('\n'),
    /URL-FFFFFFFFFFFFFF\/q: URL search state is outside the exact approved route\/record allowlist/i,
    '새 q surface는 reviewBy 전에도 production validator를 즉시 red로 만들어야 한다',
  );
  assert.match(
    validateUrlStateCensus(future, {
      repoRoot: ROOT,
      nowMs: DECISION_TIME,
      approvalOverlay: matchingOverlay,
    }).join('\n'),
    /URL-EEEEEEEEEEEEEE\/keyword: URL search state is outside the exact approved route\/record allowlist/i,
    '다른 free-text key도 reviewBy 전 production validator를 즉시 red로 만들어야 한다',
  );

  for (const [field, value] of [
    ['dataClass', 'typo'],
    ['privacyReview', 'verified'],
    ['authorizationReview', 'verified'],
    ['decisionRef', 'docs/02-architecture/decisions/ADR-0003-frontend-ux-modernization-principles.md'],
  ]) {
    const invalidReview = structuredClone(overlay);
    invalidReview.classes.find(({ classId }) => classId === 'search-input')[field] = value;
    assert.equal(
      approvedStateItemSelectors(invalidReview, census, DECISION_TIME).length,
      0,
      `${field} 형식이나 accepted-risk 경계가 틀렸는데 실제 matcher가 승인을 열었다`,
    );
  }

  const missingDecision = structuredClone(overlay);
  delete missingDecision.classes.find(({ classId }) => classId === 'search-input').decisionRef;
  assert.equal(
    approvedStateItemSelectors(missingDecision, census, DECISION_TIME).length,
    0,
    'ADR-0009 decisionRef가 없는데 실제 matcher가 검색 승인을 열었다',
  );
});

test('승인 class의 reviewBy가 지나면 만료 면제가 다시 닫힌다', () => {
  const afterReview = Date.parse('2027-01-01T00:00:00.000Z');
  assert.equal(recordsExemptFromExpiry(overlay, census, afterReview).length, 0);
});
