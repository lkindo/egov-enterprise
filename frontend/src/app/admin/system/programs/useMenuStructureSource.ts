'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { menuAdminService } from '@/services/foundation/system/MenuAdminService';
import { menuStructureSource, type MenuStructureSource } from './menuStructureSource';

/*
 * 연결 메뉴 조회의 실패는 화면이 칸('메뉴를 불러오지 못함')과 목록 위 안내·다시 불러오기로 알린다.
 * 전역 실패 토스트까지 켜면 같은 실패가 두 번 보인다.
 */
const QUIET = { suppressErrorToast: true } as const;

export interface MenuStructureSourceState {
  menus: MenuStructureSource;
  /** 실패한 메뉴 조회를 다시 보낸다. */
  retry: () => void;
  /** 다시 불러오는 중인가(다시 불러오기 버튼의 pending). */
  retrying: boolean;
}

/**
 * 화면 관리의 메뉴 구조(2026-10-02 D3). 화면 목록의 연결 메뉴(메뉴 경로)와 이전 프로그램의 연결 메뉴(연결 프로그램)가
 * 같은 조회 한 번을 나눠 쓴다.
 *
 * - 이 화면은 PROGRAM_READ 만으로 들어올 수 있으므로 MENU_READ 가 없으면 조회를 보내지 않는다 — 늘 보내면 권한 없는
 *   사람이 화면을 열 때마다 서버에 403 거부 기록(보안 실패 감사·WARN 로그)이 남는다. 칸은 '메뉴 조회 권한 없음' 이다.
 * - 로그인 정보를 확인하는 중에는 권한을 모르므로 '권한 없음' 으로 단정하지 않고 불러오는 중으로 둔다.
 * - 실패는 화면 전체 오류로 올리지 않는다(목록은 그대로다). 자동 재시도도 하지 않는다 — 다시 시도는 화면의
 *   '연결 메뉴 다시 불러오기' 가 맡는다.
 *
 * 목록 조회와 분리된 훅이다 — 목록의 쪽·검색·페이지당 건수와 무관하게 메뉴 구조를 한 번 읽는다.
 */
export function useMenuStructureSource(): MenuStructureSourceState {
  const { user, loading: authLoading } = useAuth();
  const canReadMenus = canPermission(user, 'MENU_READ');
  const menuQuery = useQuery({
    queryKey: ['admin-programs', 'menu-structure', user?.id, user?.authorizationVersion],
    queryFn: () => menuAdminService.getMenuStructure(QUIET),
    enabled: canReadMenus,
    retry: false,
    throwOnError: false,
  });
  const authorizationPending = Boolean(authLoading) && !user;
  const menus = useMemo(() => menuStructureSource({
    canReadMenus,
    authorizationPending,
    status: menuQuery.status,
    data: menuQuery.data,
    error: menuQuery.error,
  }), [canReadMenus, authorizationPending, menuQuery.status, menuQuery.data, menuQuery.error]);
  const { refetch } = menuQuery;

  return {
    menus,
    retry: () => { void refetch(); },
    retrying: menuQuery.isFetching,
  };
}
