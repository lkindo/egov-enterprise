/**
 * 메뉴(머리글·사이드바·이동 경로·명령 센터·즐겨찾기)의 조회 키. 계정·권한 범위(scope)를 끝에 펼쳐 계정·권한이 바뀌면 다른 캐시
 * 항목으로 읽는다. 범위 없이 부르면 그 종류 전체를 가리키는 접두가 된다 — 즐겨찾기를 바꾼 쪽이 `bookmarks()`·
 * `commandCenterBookmarks()` 를, 권한 버전 충돌 뒤 즐겨찾기 정리가 `head()` 를 무효화하고, 이동 경로가 `head()` 로 공유 캐시를 찾는다.
 *
 * 기능을 뺀 생성물에서 연쇄 제거에 걸리지 않게 어떤 모듈도 import 하지 않는다.
 */
export const menuKeys = {
  all: ['menus'] as const,
  head: (scope: readonly unknown[] = []) => [...menuKeys.all, 'head', ...scope] as const,
  left: (activeMenuNo: number | null, scope: readonly unknown[]) =>
    [...menuKeys.all, 'left', activeMenuNo, ...scope] as const,
  bookmarks: (scope: readonly unknown[] = []) => [...menuKeys.all, 'bookmarks', ...scope] as const,
  commandCenter: () => [...menuKeys.all, 'command-center'] as const,
  commandCenterHead: (scope: readonly unknown[]) => [...menuKeys.commandCenter(), 'head', ...scope] as const,
  commandCenterBookmarks: (scope: readonly unknown[] = []) =>
    [...menuKeys.commandCenter(), 'bookmarks', ...scope] as const,
};
