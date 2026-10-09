/**
 * 계획 차이(설계서 10장 POST /api/plan/diff, E3): 지금 구성에서 기능 하나를 더하거나 빼면 무엇이 늘고 주는지.
 *
 * 화면과 같은 규칙으로 계산한다. 카드를 누르면 직접 선택으로 바뀌므로 바뀐 뒤 구성은 늘 직접 선택이다.
 * 해석기를 두 번 돌릴 뿐 파일·DB·셸을 건드리지 않는다. 카탈로그와 메뉴 스냅숏은 호출자가 넘긴다.
 */
import { projectCompositionMenus } from './project-composer-db.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';

const edgeKey = edge => `${edge.from}>${edge.to}`;

// 모르는 기능은 해석기가 'Unknown domain' 으로 거부한다(더하는 쪽 해석에서 걸린다).
export function compositionDiff({ catalog, menus, recipe, domain }) {
  const before = resolveProjectRecipe(recipe, catalog);
  const selected = new Set(before.selectedDomains);
  const action = selected.has(domain) ? 'remove' : 'add';
  if (action === 'add') selected.add(domain); else selected.delete(domain);
  const after = resolveProjectRecipe({ ...recipe, selection: { domains: [...selected].sort() } }, catalog);
  const menuCount = composition => projectCompositionMenus({ menus, menuRoutes: composition.menuRoutes, excludedMenuTabs: composition.excludedMenuTabs }).menus.length;
  const beforeDegraded = new Set(before.degraded.map(edgeKey));
  const afterDegraded = new Set(after.degraded.map(edgeKey));
  return {
    domain, action,
    added: after.resolvedDomains.filter(id => !before.resolvedDomains.includes(id)),
    removed: before.resolvedDomains.filter(id => !after.resolvedDomains.includes(id)),
    // 빼려는 기능을 다른 선택이 요구하면 그대로 남는다. 무엇이 붙잡는지 함께 말한다.
    retainedBy: action === 'remove' ? after.autoIncluded.find(item => item.domain === domain)?.roots ?? [] : [],
    counts: {
      tables: [before.tables.length, after.tables.length],
      permissions: [before.permissionCodes.length, after.permissionCodes.length],
      menus: [menuCount(before), menuCount(after)],
    },
    degraded: {
      added: after.degraded.filter(edge => !beforeDegraded.has(edgeKey(edge))).map(({ from, to }) => ({ from, to })),
      // 상대 기능이 새로 들어와 풀린 저하만 해소다. 출발 기능을 빼서 함께 사라진 저하는 해소가 아니다.
      resolved: before.degraded.filter(edge => !afterDegraded.has(edgeKey(edge)) && after.resolvedDomains.includes(edge.to))
        .map(({ from, to }) => ({ from, to })),
    },
    blockers: after.foreignKeyViolations.map(violation => violation.name),
  };
}
