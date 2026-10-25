'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { summarizeError } from '@/lib/safe-error-log';
import type { GroupSource, MenuSource } from '@/lib/navigation/route-menu-links';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';

/* 실패는 화면이 칸('확인 불가')과 안내로 말한다 — 전역 실패 토스트까지 켜면 같은 실패가 두 번 보인다. */
const QUIET = { suppressErrorToast: true } as const;

/**
 * 조회 키는 기능 이름을 달지 않는다 — 게시판 운영 화면과 콘텐츠 페이지 관리가 같은 원천을 같은 방식(실패 토스트 끔)으로 읽는다.
 * 다른 화면의 메뉴 구조·권한 배정 조회(실패 토스트를 켠다)와 캐시를 나누지 않도록 따로 둔다.
 */
const QUERY_ROOT = 'menu-access-sources';

export interface MenuAccessSources {
  /** 메뉴 원장. 권한을 확인하거나 불러오는 중이면 null 이다. */
  menuSource: MenuSource | null;
  /** 그룹 표시(그룹별 배정). 권한을 확인하거나 불러오는 중이면 null 이다. */
  groupSource: GroupSource | null;
  /** 실패한 조회를 다시 보낸다. */
  retry: () => void;
}

/**
 * 메뉴 연결 판정(route-menu-links — 게시판 ADR-0040 결정 8, 콘텐츠 페이지 ADR-0042)이 읽는 두 원천 — 메뉴 구조(MENU_READ)와
 * 그룹별 배정(AUTHRT_READ).
 *
 * 권한이 없으면 조회를 보내지 않는다 — 보내면 서버에 403 거부 기록(보안 실패 감사·WARN)이 남는다. 권한이 없거나 서버가 403
 * 으로 거부하면 '확인 권한 없음', 그 밖의 실패는 '확인 불가' 다. 로그인 정보를 확인하는 중에는 권한 없음으로 단정하지 않는다.
 * 메뉴는 화면을 열 때마다 다시 읽는다 — 메뉴 관리에서 활성화·그룹 표시를 저장하고 돌아오면 바뀐 연결이 보여야 한다.
 */
export function useMenuAccessSources(): MenuAccessSources {
  const { user, loading: authLoading } = useAuth();
  const authPending = Boolean(authLoading) && !user;
  const canReadMenus = canPermission(user, 'MENU_READ');
  const canReadGroups = canPermission(user, 'AUTHRT_READ');
  const menuQuery = useQuery({
    queryKey: [QUERY_ROOT, 'menu-structure', user?.id, user?.authorizationVersion],
    queryFn: () => menuAdminService.getMenuStructure(QUIET),
    enabled: canReadMenus,
    retry: false,
    throwOnError: false,
    refetchOnMount: 'always',
  });
  const groupQuery = useQuery({
    queryKey: [QUERY_ROOT, 'grant-matrix', user?.id, user?.authorizationVersion],
    queryFn: () => authorizationAdminService.getGrantMatrix(QUIET),
    enabled: canReadGroups,
    retry: false,
    throwOnError: false,
    refetchOnMount: 'always',
  });

  const menuSource = useMemo((): MenuSource | null => {
    if (!canReadMenus) return authPending ? null : { status: 'no-permission' };
    if (menuQuery.isError) return summarizeError(menuQuery.error).status === 403 ? { status: 'no-permission' } : { status: 'failed' };
    if (!menuQuery.data || (menuQuery.isFetching && !menuQuery.isFetchedAfterMount)) return null;
    return { status: 'ready', menus: menuQuery.data.menus };
  }, [canReadMenus, authPending, menuQuery.isError, menuQuery.error, menuQuery.data, menuQuery.isFetching, menuQuery.isFetchedAfterMount]);

  const groupSource = useMemo((): GroupSource | null => {
    if (!canReadGroups) return authPending ? null : { status: 'no-permission' };
    if (groupQuery.isError) return summarizeError(groupQuery.error).status === 403 ? { status: 'no-permission' } : { status: 'failed' };
    if (!groupQuery.data || (groupQuery.isFetching && !groupQuery.isFetchedAfterMount)) return null;
    return { status: 'ready', groups: groupQuery.data.groups };
  }, [canReadGroups, authPending, groupQuery.isError, groupQuery.error, groupQuery.data, groupQuery.isFetching, groupQuery.isFetchedAfterMount]);

  const { refetch: refetchMenus } = menuQuery;
  const { refetch: refetchGroups } = groupQuery;
  return {
    menuSource,
    groupSource,
    retry: () => {
      if (canReadMenus) void refetchMenus();
      if (canReadGroups) void refetchGroups();
    },
  };
}
