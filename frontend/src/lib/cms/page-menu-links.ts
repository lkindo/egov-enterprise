import {
  findRouteMenuLinks,
  routePathname,
  type GroupSource,
  type MenuSource,
  type RouteMenuLink,
  type RouteMenuLinks,
} from '@/lib/navigation/route-menu-links';

/**
 * 콘텐츠 페이지와 메뉴의 연결, 그 메뉴가 어느 그룹에 보이는지를 판정한다(ADR-0042).
 *
 * 연결 근거는 하나다 — 메뉴 경로의 pathname 이 정확히 `/pages/<주소>` 다. 쿼리·해시는 보지 않고(같은 화면을 연다), 끝의 `/` 는
 * 같은 화면이라 지운다. 앞부분만 같은 주소(`/pages/a` 와 `/pages/ab`)나 사용자용 목록(`/pages`)은 이 페이지의 연결이 아니다.
 * 노출 분류·권한 없음·조회 실패의 의미는 공용 판정(@/lib/navigation/route-menu-links)과 같다 — 연결 없음으로 추정하지 않는다.
 */

/** 게시된 콘텐츠 페이지 화면의 주소 앞부분(`src/app/pages/[slug]`). */
const CMS_PAGE_ROUTE_PREFIX = '/pages';

export type CmsPageMenuLinkBasis = { kind: 'page-address' };
export type CmsPageMenuLink = RouteMenuLink<CmsPageMenuLinkBasis>;
export type CmsPageMenuLinks = RouteMenuLinks<CmsPageMenuLinkBasis>;

/**
 * 이 페이지를 여는 화면 주소 — 메뉴 관리에 새로 등록하거나 이 페이지로 이동할 때 쓴다. 주소는 서버가 소문자·숫자·하이픈으로
 * 묶으므로 그대로 들어가고, 그 밖의 글자는 인코딩해 다른 경로로 해석되지 않게 한다.
 */
export function cmsPageRoute(contsPathNm: string): string {
  return `${CMS_PAGE_ROUTE_PREFIX}/${encodeURIComponent(contsPathNm)}`;
}

/** 이 페이지를 가리키는 메뉴(사용 안 함 메뉴 포함)와 각 메뉴의 노출. 주소가 비어 있으면(아직 저장 전) 연결은 없다. */
export function findCmsPageMenuLinks(contsPathNm: string, menuSource: MenuSource,
  groupSource: GroupSource): CmsPageMenuLinks {
  const target = contsPathNm === '' ? null : cmsPageRoute(contsPathNm);
  return findRouteMenuLinks(menuSource, groupSource,
    (route): CmsPageMenuLinkBasis | null => (target !== null && routePathname(route) === target ? { kind: 'page-address' } : null));
}
