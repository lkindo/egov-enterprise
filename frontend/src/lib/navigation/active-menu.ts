import type { MenuInfo } from '@/types/foundation/menu';
import { resolveMenuInternalRoute } from './internal-route';

/** ReadonlyURLSearchParams와 URLSearchParams가 공유하는 읽기 계약. */
export type QueryParams = { get(name: string): string | null; toString(): string };

export interface ActiveMenuMatch {
  menuNo: number;
  topMenuNo: number;
  ancestorMenuNos: readonly number[];
  path: readonly MenuInfo[];
}

function routePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

/**
 * 실제 URL과 현재 서버 메뉴 트리에서 정본 한 개를 고른다. 별칭은 브라우저의 redirect가
 * 끝난 URL로 판단하며, 메뉴 ID·영역·별칭 목적지를 프론트에 별도로 복제하지 않는다.
 * 게시판 ID는 목록/상세 경로가 달라도 정확히 일치해야 한다. 그 다음은 정확 경로,
 * 가장 구체적인 부모 경로, 메뉴가 명시한 쿼리, 계층 깊이 순이다. 동률은 서버 메뉴 순서를 따른다.
 */
export function findActiveMenu(menus: readonly MenuInfo[], pathname: string, searchParams: QueryParams): ActiveMenuMatch | null {
  const currentPath = routePath(pathname);
  const currentBoard = searchParams.get('bbsId');
  const pending = menus.map((item) => ({ item, ancestors: [] as MenuInfo[], topMenuNo: item.menuNo })).reverse();
  const visited = new Set<MenuInfo>();
  let best: { match: ActiveMenuMatch; score: number[] } | null = null;

  while (pending.length > 0) {
    const { item, ancestors, topMenuNo } = pending.pop()!;
    if (visited.has(item) || item.useYn === 'N') continue;
    visited.add(item);
    const href = resolveMenuInternalRoute(item);
    if (href) {
      const url = new URL(href, 'https://egov.invalid');
      const path = routePath(url.pathname);
      const expectedBoard = url.searchParams.get('bbsId');
      const boardMatch = !!currentBoard && expectedBoard === currentBoard;
      const exactPath = path === currentPath;
      const pathMatch = exactPath || (path !== '/' && currentPath.startsWith(`${path}/`));
      const queryMatches = [...url.searchParams].every(([key, value]) =>
        // 게시판 문맥을 명시한 URL은 bbsId를 우선한다. 다른 화면 상태는 선택을 바꾸지 않는다.
        (boardMatch && key === 'tab') || searchParams.get(key) === value);

      if ((boardMatch || pathMatch) && queryMatches) {
        const score = [Number(boardMatch), Number(exactPath), path.length, url.searchParams.size, ancestors.length];
        const firstDifference = best ? score.findIndex((value, index) => value !== best!.score[index]) : -1;
        if (!best || (firstDifference >= 0 && score[firstDifference] > best.score[firstDifference])) {
          best = { match: { menuNo: item.menuNo, topMenuNo, ancestorMenuNos: ancestors.map((ancestor) => ancestor.menuNo), path: [...ancestors, item] }, score };
        }
      }
    }
    for (let index = (item.children?.length ?? 0) - 1; index >= 0; index--) {
      pending.push({ item: item.children![index], ancestors: [...ancestors, item], topMenuNo });
    }
  }
  return best?.match ?? null;
}
