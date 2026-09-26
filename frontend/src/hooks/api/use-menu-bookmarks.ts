'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { menuService } from '@/services/business/user/MenuService';
import { useToast } from '@/app/components/ui/toast';
import { useMenuAuthorizationScope } from './use-menu-authorization-scope';

/**
 * 내 메뉴 즐겨찾기(2026-09-26 DIP B5 F2).
 *
 * 목록은 서버가 지금 볼 수 있는 메뉴만 돌려준다 — 배정이 회수된 메뉴는 여기서 사라진다. 권한 범위(scope)를 키에
 * 넣어 계정·권한이 바뀌면 다른 목록으로 읽는다.
 */
export const MENU_BOOKMARKS_KEY = ['menus', 'bookmarks'] as const;

export function useMenuBookmarks() {
  const authorization = useMenuAuthorizationScope();
  const query = useQuery({
    queryKey: [...MENU_BOOKMARKS_KEY, ...authorization.scope],
    queryFn: () => menuService.getMyBookmarks(),
    enabled: authorization.authenticated,
    staleTime: 5 * 60 * 1000,
  });
  const bookmarks = useMemo(() => query.data ?? [], [query.data]);
  const bookmarkedMenuNos = useMemo(() => new Set(bookmarks.map((bookmark) => bookmark.menuNo)), [bookmarks]);
  return { bookmarks, bookmarkedMenuNos, isError: query.isError };
}

/** 메뉴 하나의 즐겨찾기 추가·빼기. 같은 메뉴를 연달아 눌러도 요청은 하나씩 나간다. */
export function useMenuBookmarkToggle(menuNo: number, menuNm: string) {
  const { bookmarkedMenuNos } = useMenuBookmarks();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const togglePendingRef = useRef(false);
  const [togglePending, setTogglePending] = useState(false);
  const isBookmarked = bookmarkedMenuNos.has(menuNo);

  const mutation = useMutation({
    mutationFn: (add: boolean) => (add ? menuService.addBookmark(menuNo) : menuService.removeBookmark(menuNo)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: MENU_BOOKMARKS_KEY }),
  });

  const toggle = useCallback(async () => {
    if (togglePendingRef.current) return;
    togglePendingRef.current = true;
    setTogglePending(true);
    const add = !isBookmarked;
    try {
      await mutation.mutateAsync(add);
    } catch (error) {
      toast(error instanceof Error && error.message
        ? error.message
        : `${menuNm} 즐겨찾기를 ${add ? '추가하지' : '빼지'} 못했습니다.`, 'error');
    } finally {
      togglePendingRef.current = false;
      setTogglePending(false);
    }
  }, [isBookmarked, menuNm, mutation, toast]);

  return { isBookmarked, togglePending, toggle };
}
