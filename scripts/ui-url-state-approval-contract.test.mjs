import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const CENSUS_PATH = join(ROOT, 'config', 'ui-url-state-census.json');

const overlay = JSON.parse(readFileSync(OVERLAY_PATH, 'utf8'));
const censusRaw = readFileSync(CENSUS_PATH, 'utf8');
const census = JSON.parse(censusRaw);

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
function recordsExemptFromExpiry(overlayDoc, censusDoc) {
  const approvedNames = new Set(
    (overlayDoc.classes ?? [])
      .filter((cls) => cls.reviewState === 'approved')
      .flatMap((cls) => cls.selector?.stateItemNames ?? []),
  );
  return (censusDoc.records ?? []).filter((record) => {
    const items = record.stateItems ?? [];
    return items.length > 0 && items.every((item) => approvedNames.has(item.name));
  });
}

test('오버레이는 census 의 특정 버전에 결속된다 — 승인이 낡은 생성물을 가리킬 수 없다', () => {
  assert.equal(overlay.schemaVersion, 1);
  assert.equal(overlay.authority, 'non-normative-pre-decision-evidence');
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
  // 현재는 approved 가 0개이므로 면제 record 도 0이어야 한다.
  const approvedClasses = overlay.classes.filter((cls) => cls.reviewState === 'approved');
  const exempt = recordsExemptFromExpiry(overlay, census);

  if (approvedClasses.length === 0) {
    assert.equal(exempt.length, 0, '승인이 없는데 만료를 면제받는 record 가 있다');
    return;
  }

  // 승인이 생긴 뒤에도: 덮이지 않은 stateItem 이 하나라도 있는 record 는 면제되지 않는다.
  const approvedNames = new Set(approvedClasses.flatMap((cls) => cls.selector.stateItemNames));
  for (const record of exempt) {
    assert.ok(
      (record.stateItems ?? []).every((item) => approvedNames.has(item.name)),
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
const APPROVED_AS_OF_2026_09_05 = ['presentation-state', 'control-flag', 'resource-identifier'];

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
  assert.equal(
    byId['search-input']?.reviewState, 'proposed',
    '프록시·WAF 쿼리 로깅이 미확보인 동안 검색어 부류는 승인하지 않는다',
  );
  for (const id of ['path-intent', 'hand-assembled-segment']) {
    assert.equal(byId[id]?.dataClass, 'indeterminate', `${id}: 어휘 확장 전에는 판정하지 않는다`);
  }
});
