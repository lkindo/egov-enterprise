'use client';

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { menuService } from '@/services/business/user/MenuService';
import type { MenuBookmarkCleanupRequest } from '@/services/business/user/MenuService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useAuth } from '@/contexts/AuthContext';
import { failureMessage } from '@/lib/safe-error-log';
import { getHttpStatus } from '@/lib/query/list-query-defaults';
import { openableMenus } from '@/lib/navigation/openable-menus';
import { walkMenuTree } from '@/lib/navigation/active-menu';
import { resolveMenuInternalRoute } from '@/lib/navigation/internal-route';
import { useMenuAuthorizationScope } from './use-menu-authorization-scope';

/**
 * 내 메뉴 즐겨찾기(2026-09-26 DIP B5 F2).
 *
 * 목록은 서버가 지금 볼 수 있는 메뉴만 돌려준다 — 배정이 회수된 메뉴는 여기서 사라진다. 권한 범위(scope)를 키에
 * 넣어 계정·권한이 바뀌면 다른 목록으로 읽는다.
 */
export const MENU_BOOKMARKS_KEY = ['menus', 'bookmarks'] as const;

function invalidateBookmarks(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: MENU_BOOKMARKS_KEY }),
    client.invalidateQueries({ queryKey: ['menus', 'command-center', 'bookmarks'] }),
  ]);
}

export function useMenuBookmarks() {
  const authorization = useMenuAuthorizationScope();
  const query = useQuery({
    queryKey: [...MENU_BOOKMARKS_KEY, ...authorization.scope],
    queryFn: ({ signal }) => menuService.getMyBookmarkStatus({ signal }),
    enabled: authorization.authenticated,
    staleTime: 5 * 60 * 1000,
    placeholderData: undefined,
    throwOnError: false,
  });
  const bookmarks = useMemo(() => query.data?.bookmarks ?? [], [query.data]);
  const bookmarkedMenuNos = useMemo(() => new Set(bookmarks.map((bookmark) => bookmark.menuNo)), [bookmarks]);
  return {
    bookmarks, bookmarkedMenuNos, unavailableCount: query.data?.unavailableCount,
    isSuccess: query.isSuccess, isFetching: query.isFetching, isError: query.isError,
    refetch: query.refetch,
  };
}

/** 현재 계정·권한에서 최신 개수를 확인하고, 확인 중 상태가 바뀌면 요청을 폐기한다. */
export function useMenuBookmarkCleanup(ready: boolean) {
  const { user, checkAuth } = useAuth();
  const authorization = useMenuAuthorizationScope();
  const client = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const scopeKey = JSON.stringify(authorization.scope);
  const currentScope = useRef(scopeKey);
  const mounted = useRef(true);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  // Invalidate a confirmation in the commit phase, before another dialog event can use the old account scope.
  useLayoutEffect(() => { currentScope.current = scopeKey; }, [scopeKey]);
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const mutation = useMutation({
    mutationFn: (body: MenuBookmarkCleanupRequest) => menuService.cleanupUnavailableBookmarks(body),
    retry: false,
    onSettled: () => invalidateBookmarks(client),
  });

  const cleanup = useCallback(async () => {
    if (pendingRef.current || !ready || !user?.authorizationVersion) return;
    pendingRef.current = true;
    setPending(true);
    const confirmedScope = scopeKey;
    const sameScope = () => mounted.current && currentScope.current === confirmedScope;
    const headKey = ['menus', 'head', ...authorization.scope] as const;
    const statusKey = [...MENU_BOOKMARKS_KEY, ...authorization.scope] as const;
    try {
      const [menus, status] = await Promise.all([
        client.fetchQuery({ queryKey: headKey, queryFn: ({ signal }) => menuService.getHeadMenus({ signal }), staleTime: 0, retry: false }),
        client.fetchQuery({ queryKey: statusKey, queryFn: ({ signal }) => menuService.getMyBookmarkStatus({ signal }), staleTime: 0, retry: false }),
      ]);
      if (!sameScope()) {
        toast('즐겨찾기 상태가 변경되었습니다. 다시 확인해 주세요.', 'info');
        return;
      }
      const available = new Set<number>();
      for (const { item } of walkMenuTree(openableMenus(menus, user))) {
        if (resolveMenuInternalRoute(item) !== null) available.add(item.menuNo);
      }
      const uiUnavailableMenuNos = status.bookmarks.filter(bookmark => !available.has(bookmark.menuNo)).map(bookmark => bookmark.menuNo);
      const count = status.unavailableCount + uiUnavailableMenuNos.length;
      if (count === 0) {
        toast('정리할 즐겨찾기가 없습니다.', 'info');
        return;
      }
      const headRevision = client.getQueryState(headKey)?.dataUpdateCount;
      const statusRevision = client.getQueryState(statusKey)?.dataUpdateCount;
      if (!await confirm({
        title: '사용할 수 없는 즐겨찾기 정리',
        message: `${count}개를 즐겨찾기에서 삭제할까요? 권한이 복구되어도 자동으로 돌아오지 않습니다.`,
        confirmText: '정리하기',
        variant: 'destructive',
      })) return;
      const headState = client.getQueryState(headKey);
      const statusState = client.getQueryState(statusKey);
      if (!sameScope() || !headState || !statusState
        || headState.dataUpdateCount !== headRevision || statusState.dataUpdateCount !== statusRevision
        || headState.isInvalidated || statusState.isInvalidated
        || headState.status !== 'success' || statusState.status !== 'success'
        || headState.fetchStatus !== 'idle' || statusState.fetchStatus !== 'idle') {
        toast('즐겨찾기 상태가 변경되었습니다. 다시 확인해 주세요.', 'info');
        return;
      }
      const result = await mutation.mutateAsync({
        expectedAuthorizationVersion: user.authorizationVersion,
        expectedServerUnavailableCount: status.unavailableCount,
        uiUnavailableMenuNos,
      });
      if (sameScope()) toast(`${result.removedCount}개의 즐겨찾기를 정리했습니다.`, 'success');
    } catch (error) {
      if (!sameScope()) return;
      if (getHttpStatus(error) === 409) {
        await checkAuth();
        await Promise.all([
          invalidateBookmarks(client),
          client.invalidateQueries({ queryKey: ['menus', 'head'] }),
        ]);
        toast('즐겨찾기 상태가 변경되었습니다. 다시 확인한 뒤 정리해 주세요.', 'info');
      } else {
        toast(failureMessage(error, '즐겨찾기 상태를 확인하거나 정리하지 못했습니다. 다시 시도해 주세요.'), 'error');
      }
    } finally {
      pendingRef.current = false;
      if (mounted.current) setPending(false);
    }
  }, [authorization.scope, checkAuth, client, confirm, mutation, ready, scopeKey, toast, user]);

  return { cleanup, pending };
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
    onSettled: () => invalidateBookmarks(queryClient),
  });

  const toggle = useCallback(async () => {
    if (togglePendingRef.current) return;
    togglePendingRef.current = true;
    setTogglePending(true);
    const add = !isBookmarked;
    try {
      await mutation.mutateAsync(add);
    } catch (error) {
      toast(failureMessage(error, `${menuNm} 즐겨찾기를 ${add ? '추가하지' : '빼지'} 못했습니다.`), 'error');
    } finally {
      togglePendingRef.current = false;
      setTogglePending(false);
    }
  }, [isBookmarked, menuNm, mutation, toast]);

  return { isBookmarked, togglePending, toggle };
}
