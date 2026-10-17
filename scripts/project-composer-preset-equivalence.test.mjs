import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { compositionDeepPlan } from './project-composer-deep.mjs';
// 저장소 루트·카탈로그·파일 목록과 기억하는 읽기는 정밀 점검 시험들과 같은 준비물을 쓴다(시험 중 저장소 파일은 바뀌지 않는다).
import { root, catalog, files, readRepositorySource } from './project-composer-deep.test-helpers.mjs';

const compose = selection => resolveProjectRecipe({ schemaVersion: 1, project: { name: 'preset-equivalence' }, sourceRef: 'main', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, catalog);
const removals = deep => ({
  java: deep.java.files,
  frontend: deep.frontend.files,
  gates: deep.removedGates,
  ...Object.fromEntries(Object.entries(deep.ruleRemovals).map(([rule, removed]) => [`rule:${rule}`, removed])),
});
const onlyIn = (left, right) => { const other = new Set(right); return left.filter(file => !other.has(file)); };
// 해석된 구성에서 식별(레시피·프로필·해시)을 뺀 나머지. 11단계 C3 부터 시작 구성도 기능 규칙의 화면 제외 경로로 투영하므로 제거
// 경로까지 같아야 한다(pack 축은 C5 에서 걷었다).
const resolvedContent = composition => {
  const { recipe, profile, recipeHash, compositionHash, ...rest } = composition;
  return rest;
};

/*
 * 시작 구성은 이름 붙은 기능 목록이고, 같은 목록은 같은 결과를 낸다(ADR-0028, DEC-OPS-256 ④). 11단계 C3 부터 시작 구성과 직접
 * 선택은 같은 기능 소유로 투영한다. 그 길이 다시 갈리면 시작 구성 생성물에 제외 기능의 파일이 남거나 선택한 기능의 파일이 빠지는데,
 * 시작 구성의 화면 생존 대조는 화면만 보므로 비화면 파일은 잡지 못한다.
 * 그래서 카탈로그의 시작 구성마다, 같은 기능 목록을 직접 고른 구성과 정밀 점검(생성기와 같은 판정)의 Java·프런트·게이트·
 * 규칙 제거 집합을 대조한다. 시작 구성 목록은 카탈로그에서 읽으므로 새 시작 구성도 이 대조를 받는다.
 *
 * 이 시험은 시작 구성의 **게이트 제거 승인·연쇄 제거 승인 exact 대조의 소유처**이기도 하다(DEC-OPS-264 ①·DEC-OPS-290 ④ 의 '운영 계약이
 * exact 대조'). 시작 구성마다 `blockers` 가 비어야 하는데, 그 안에 Java·프런트 게이트의 GATE_UNACKNOWLEDGED·GATE_STALE·GATE_DECLARATION
 * (사유 형식 포함)과 JAVA_CASCADE_UNACKNOWLEDGED·STALE·DECLARATION 이 들어 있다 — 승인 목록에서 하나를 빼거나 남는 게이트로 바꾸면(교체)
 * 이 단언이 붉다. 같은 대조를 원장 계약(pack-tagged-registry)이 Java 게이트에만 다시 하던 사본은 걷었고, 그 계약에는 투영본(생성물)
 * 분기만 남았다. 차단 코드마다의 red 증명은 project-composer-deep-failure-points.test.mjs 에 있다.
 */
test('every preset removes exactly what the same domain list removes as a direct selection', { timeout: 600_000 }, () => {
  assert.ok(catalog.presets.length >= 3, `the catalog has the starting compositions (${catalog.presets.length})`);
  for (const preset of catalog.presets) {
    const asPreset = compose({ preset: preset.id });
    const asList = compose({ domains: [...preset.domains] });
    assert.equal(asList.profile, 'custom', `${preset.id}: the same list is resolved as a direct selection`);
    // 테이블·시퀀스·권한·메뉴·탭 숨김·외래 키·기능 저하·외부 요구가 같다. 메뉴는 시작 구성의 제거 경로로도 걸러지므로 여기서 갈릴 수 있다.
    assert.deepEqual(resolvedContent(asList), resolvedContent(asPreset), `${preset.id}: the same list resolves to the same composition`);

    const presetDeep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: asPreset, files });
    const listDeep = compositionDeepPlan({ root, catalog, readSource: readRepositorySource, composition: asList, files });
    assert.deepEqual(presetDeep.blockers, [], `${preset.id}: the preset has no projection blocker`);
    assert.deepEqual(listDeep.blockers, [], `${preset.id}: the same list has no projection blocker`);

    const fromPreset = removals(presetDeep);
    const fromList = removals(listDeep);
    assert.deepEqual(Object.keys(fromPreset), Object.keys(fromList), `${preset.id}: both plans report the same kinds of removal`);
    for (const kind of Object.keys(fromList)) {
      assert.deepEqual({ keptOnlyByPreset: onlyIn(fromList[kind], fromPreset[kind]), removedOnlyByPreset: onlyIn(fromPreset[kind], fromList[kind]) },
        { keptOnlyByPreset: [], removedOnlyByPreset: [] },
        `${preset.id} ${kind}: the preset and the same domain list as a direct selection must remove the same files`);
    }
  }
});
