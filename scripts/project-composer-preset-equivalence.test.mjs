import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { compositionDeepPlan } from './project-composer-deep.mjs';
import { trackedAndUntrackedFiles } from './reusable-source-tree.mjs';

const root = resolve(import.meta.dirname, '..');
const catalog = loadProjectComposerCatalog(root);
const files = trackedAndUntrackedFiles(root);
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
 */
test('every preset removes exactly what the same domain list removes as a direct selection', { timeout: 600_000 }, () => {
  assert.ok(catalog.presets.length >= 3, `the catalog has the starting compositions (${catalog.presets.length})`);
  for (const preset of catalog.presets) {
    const asPreset = compose({ preset: preset.id });
    const asList = compose({ domains: [...preset.domains] });
    assert.equal(asList.profile, 'custom', `${preset.id}: the same list is resolved as a direct selection`);
    // 테이블·시퀀스·권한·메뉴·탭 숨김·외래 키·기능 저하·외부 요구가 같다. 메뉴는 시작 구성의 제거 경로로도 걸러지므로 여기서 갈릴 수 있다.
    assert.deepEqual(resolvedContent(asList), resolvedContent(asPreset), `${preset.id}: the same list resolves to the same composition`);

    const presetDeep = compositionDeepPlan({ root, catalog, composition: asPreset, files });
    const listDeep = compositionDeepPlan({ root, catalog, composition: asList, files });
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
