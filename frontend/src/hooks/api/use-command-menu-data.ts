import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { openableMenus } from '@/lib/navigation/openable-menus';
import { menuService } from '@/services/business/user/MenuService';
import type { UserInfo } from '@/services/foundation/auth/authService';
import type { MenuInfo } from '@/types/foundation/menu';

const NO_MENUS: MenuInfo[] = [];
const NO_BOOKMARKS: number[] = [];

/** 메뉴 갱신은 menus 무효화를 공유하고, 계정/권한 변경은 별도의 캐시를 사용한다. */
export function useCommandMenuData(isOpen: boolean, user: UserInfo | null) {
  const scope = [user?.id ?? null, user?.esntlId ?? null, user?.authorizationVersion ?? ''] as const;
  const enabled = isOpen && !!user;
  const menus = useQuery({
    queryKey: ['menus', 'command-center', 'head', ...scope],
    queryFn: ({ signal }) => menuService.getHeadMenus({ signal }),
    enabled,
    staleTime: 0,
    // 전역 keepPreviousData가 다른 계정/권한의 항목을 이어 보여주지 않게 한다.
    placeholderData: undefined,
  });
  const bookmarks = useQuery({
    queryKey: ['menus', 'command-center', 'bookmarks', ...scope],
    queryFn: ({ signal }) => menuService.getMyBookmarks({ signal }),
    enabled,
    staleTime: 0,
    placeholderData: undefined,
  });
  // 재조회 중에는 이전 허용 목록을 액션으로 제시하지 않는다. 응답이 늦어도 다른 scope로 옮겨지지 않는다.
  const assignedMenus = enabled && !menus.isFetching && !menus.isError ? menus.data ?? NO_MENUS : NO_MENUS;
  // [2026-10-01] 배정됐어도 기능 권한이 없어 들어갈 수 없는 메뉴는 제안하지 않는다 — 즐겨찾기·최근 방문도 이 목록과 맞춰 본다.
  const headMenus = useMemo(() => openableMenus(assignedMenus, user), [assignedMenus, user]);
  return {
    headMenus,
    bookmarkNos: enabled && !bookmarks.isFetching && !bookmarks.isError
      ? bookmarks.data?.map(bookmark => bookmark.menuNo) ?? NO_BOOKMARKS : NO_BOOKMARKS,
  };
}
