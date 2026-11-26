/**
 * 메뉴(머리글·사이드바·이동 경로·명령 센터·즐겨찾기)의 조회 키. 계정·권한 범위(scope)를 끝에 펼쳐 계정·권한이 바뀌면 다른 캐시
 * 항목으로 읽는다. `…All()` 은 범위와 상관없이 그 종류 전체를 가리키는 접두다 — 즐겨찾기를 바꾼 쪽이 `bookmarksAll()`·
 * `commandCenterBookmarksAll()` 을, 권한 버전 충돌 뒤 즐겨찾기 정리가 `headAll()` 을 무효화하고, 이동 경로가 `headAll()` 로 공유
 * 캐시를 찾는다.
 *
 * 범위는 튜플 타입으로 받는다 — 원소 하나를 빠뜨리면(예: 권한 버전) 권한이 바뀌어도 같은 캐시를 읽는다.
 * 기능을 뺀 생성물에서 연쇄 제거에 걸리지 않게 어떤 모듈도 import 하지 않는다.
 */

/** 메뉴 권한 범위 — useMenuAuthorizationScope 의 [사용자 ID, 권한 버전]. */
type MenuScope = readonly [userId: string | null, authorizationVersion: string];
/** 명령 센터 범위 — [사용자 ID, 고유 ID, 권한 버전]. */
type CommandCenterScope = readonly [userId: string | null, esntlId: string | null, authorizationVersion: string];

export const menuKeys = {
  all: ['menus'] as const,
  headAll: () => [...menuKeys.all, 'head'] as const,
  head: (scope: MenuScope) => [...menuKeys.headAll(), ...scope] as const,
  left: (activeMenuNo: number | null, scope: MenuScope) => [...menuKeys.all, 'left', activeMenuNo, ...scope] as const,
  bookmarksAll: () => [...menuKeys.all, 'bookmarks'] as const,
  commandCenter: () => [...menuKeys.all, 'command-center'] as const,
  commandCenterHead: (scope: CommandCenterScope) => [...menuKeys.commandCenter(), 'head', ...scope] as const,
  commandCenterBookmarksAll: () => [...menuKeys.commandCenter(), 'bookmarks'] as const,
  commandCenterBookmarks: (scope: CommandCenterScope) => [...menuKeys.commandCenterBookmarksAll(), ...scope] as const,
};
