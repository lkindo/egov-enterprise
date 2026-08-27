/**
 * 사이드바 메뉴의 "지금 내가 여기 있다" 판정.
 *
 * ⚠ usePathname() 은 쿼리스트링을 제외한 경로만 돌려준다. 이 프로젝트의 메뉴 중 일부는 같은 경로에
 *   쿼리만 다른 형태다(설문 허브 탭 5개, FAQ 탭 3개, 모니터링 탭 3개 — 2026-08-27 live 실측 11건).
 *   pathname.startsWith(href) 로만 비교하면 "/admin/survey/hub".startsWith("/admin/survey/hub?tab=stats")
 *   가 false 라 쿼리를 가진 메뉴는 영영 활성화되지 못한다. 그래서 경로와 쿼리를 함께 판정한다.
 *
 * ⚠ 반대로, 쿼리 없는 메뉴를 "현재 URL 에 쿼리가 하나도 없을 때만 활성" 으로 두면 화면이 표 페이지·
 *   검색어·필터를 URL 에 반영하는 순간 활성 표시가 사라진다. 사용자는 같은 메뉴 안에 있는데 사이드바만
 *   자기 위치를 잊는다. 그래서 양보는 **같은 경로를 쿼리로 나눠 쓰는 메뉴가 실제로 현재 URL 과
 *   일치할 때만** 한다(collectQueryDiscriminators).
 */

import type { MenuInfo } from '@/types/foundation/menu';
import { resolveMenuInternalRoute } from './internal-route';

/** 읽기 전용 쿼리 접근자 (next/navigation 의 ReadonlyURLSearchParams 와 URLSearchParams 를 모두 수용) */
export type QueryParams = { get(name: string): string | null; toString(): string };

/** 경로 -> 그 경로를 쿼리로 나눠 쓰는 메뉴들의 쿼리 명세. */
export type QueryDiscriminators = ReadonlyMap<string, ReadonlyArray<URLSearchParams>>;

export const NO_QUERY_DISCRIMINATORS: QueryDiscriminators = new Map();

/** href 가 요구하는 쿼리 파라미터가 현재 URL 에 모두 같은 값으로 있는지. */
function everyExpectedParamMatches(expected: URLSearchParams, searchParams: QueryParams): boolean {
  let allMatch = true;
  expected.forEach((value, key) => {
    if (searchParams.get(key) !== value) allMatch = false;
  });
  return allMatch;
}

/**
 * 메뉴 트리에서 "같은 경로를 쿼리로 나눠 쓰는" 메뉴들을 모은다.
 * 이 목록에 없는 경로에서는 쿼리 없는 메뉴가 누구에게도 양보하지 않는다.
 */
export function collectQueryDiscriminators(menus: readonly MenuInfo[]): QueryDiscriminators {
  const byPath = new Map<string, URLSearchParams[]>();

  const visit = (item: MenuInfo) => {
    const href = resolveMenuInternalRoute(item);
    if (href) {
      const [path, query] = href.split('?');
      if (query) {
        const specs = byPath.get(path) ?? [];
        specs.push(new URLSearchParams(query));
        byPath.set(path, specs);
      }
    }
    (item.children || []).forEach(visit);
  };

  menus.forEach(visit);
  return byPath;
}

/** 현재 위치가 이 메뉴 자신을 가리키는지 판정한다. */
export function matchesLocation(
  href: string | null,
  pathname: string,
  searchParams: QueryParams,
  discriminators: QueryDiscriminators = NO_QUERY_DISCRIMINATORS,
): boolean {
  if (!href) return false;
  const [hrefPath, hrefQuery] = href.split('?');

  // prefix 오매칭 방지: '/admin/work-hub' 가 '/admin/work-hub-archive' 를 잡지 않도록
  // 정확 일치이거나 '/' 로 끊기는 하위 경로일 때만 경로가 맞은 것으로 본다.
  if (pathname !== hrefPath && !pathname.startsWith(`${hrefPath}/`)) return false;

  if (hrefQuery) {
    // 쿼리로 특정되는 메뉴: 명시된 파라미터가 모두 현재 URL 과 일치해야 한다.
    // 화면이 덧붙인 무관한 쿼리(page·keyword 등)는 판정에 넣지 않는다.
    return everyExpectedParamMatches(new URLSearchParams(hrefQuery), searchParams);
  }

  // 쿼리가 없는 메뉴: 같은 경로를 쿼리로 나눠 쓰는 형제가 **실제로 현재 URL 과 일치할 때만** 양보한다.
  // 그 외의 쿼리(표 페이지·검색어·필터 등 화면 상태)는 여전히 이 메뉴 안이다.
  const competing = discriminators.get(hrefPath);
  if (!competing) return true;
  return !competing.some((spec) => everyExpectedParamMatches(spec, searchParams));
}

/** 자신 또는 후손 중 하나라도 현재 위치와 일치하면 true. 부모 강조·자동 펼침 판정에 쓴다. */
export function subtreeMatchesLocation(
  item: MenuInfo,
  pathname: string,
  searchParams: QueryParams,
  discriminators: QueryDiscriminators = NO_QUERY_DISCRIMINATORS,
): boolean {
  if (matchesLocation(resolveMenuInternalRoute(item), pathname, searchParams, discriminators)) return true;
  return (item.children || []).some((child) =>
    subtreeMatchesLocation(child, pathname, searchParams, discriminators),
  );
}
