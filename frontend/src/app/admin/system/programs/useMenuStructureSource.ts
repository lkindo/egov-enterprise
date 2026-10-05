'use client';

import { useMemo, useState } from 'react';
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
  /**
   * 실패한 메뉴 조회를 다시 보낸다. 메뉴 구조를 받았으면 true 로 끝난다(화면이 사라질 실패 안내의 단추에서 포커스를 옮길 때
   * 쓴다). 다시 실패하면 false 다.
   */
  retry: () => Promise<boolean>;
  /** 다시 불러오는 중인가(다시 불러오기 버튼의 pending). */
  retrying: boolean;
}

/**
 * 화면 관리의 메뉴 구조(2026-10-02 D3). 화면 목록의 연결 메뉴(메뉴 경로)가 읽는다.
 *
 * - MENU_READ 가 없으면 조회를 보내지 않는다 — 늘 보내면 권한 없는 사람이 화면을 열 때마다 서버에 403 거부 기록
 *   (보안 실패 감사·WARN 로그)이 남는다. 칸은 '메뉴 조회 권한 없음' 이다. 2026-10-04 프로그램 목록 퇴역으로 이 화면의
 *   진입 권한이 PROGRAM_READ 에서 MENU_READ 로 바뀌어 지금은 들어온 사람이 늘 조회하지만, 진입 권한을 다시 바꿔도
 *   거부 기록이 생기지 않도록 판정을 남긴다.
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
    /*
     * [2026-10-05] 화면을 열 때마다 메뉴 구조를 다시 읽는다(캐시가 신선해도). 메뉴 관리에서 '메뉴에 추가' 로 넣은 화면을
     * 저장하고 돌아오면, 전역 staleTime(60초) 안이라 캐시만 보여 방금 넣은 화면이 '메뉴 없음' 으로 남았다. 메뉴 관리의 저장
     * 성공 처리에 이 화면의 캐시 무효화를 심는 대신 이 화면이 스스로 다시 읽는다 — 다른 사용자·다른 탭이 바꾼 메뉴도 함께
     * 따라오고, 메뉴 관리 화면이 화면 관리의 캐시 키를 알 필요가 없다.
     * 화면을 연 뒤 첫 조회가 끝날 때까지는 지난 방문의 결과를 쓰지 않고 불러오는 중으로 둔다(awaitingFreshResult) —
     * 지난 결과를 쓰면 방금 메뉴에 넣은 화면이 그동안 '메뉴 없음'·'메뉴에 추가' 를 단 채 보이고(같은 화면의 메뉴를 하나 더
     * 만들러 갈 수 있다), 처음 보기도 그 낡은 값으로 정해진다. 그 뒤의 백그라운드 재조회는 이전 결과를 그대로 보인다.
     */
    refetchOnMount: 'always',
  });
  const authorizationPending = Boolean(authLoading) && !user;
  /*
   * isFetchedAfterMount 는 성공·실패 어느 쪽이든 이 화면(이 조회 키)에서 조회가 한 번 끝나면 참이다 — 그 전의 조회는 지난
   * 방문의 결과를 쓰지 않는다(awaitingFreshResult). 그 뒤의 조회는 이전 결과를 보인다. 단, 받은 데이터 없이 실패한 뒤 다시
   * 조회하면 query-core 가 상태를 'pending' 으로 되돌리고 오류를 지우므로, 사용자가 '다시 불러오기' 를 누른 동안은 실패를
   * 그대로 둔다(retryingAfterFailure) — 그러지 않으면 실패 안내와 그 단추가 눌린 순간 사라져 포커스를 잃는다(WCAG 2.4.3).
   * 다시 불러오기를 누르지 않은 조회(화면을 다시 연 뒤·권한 버전이 바뀐 뒤)는 isFetchedAfterMount 가 거짓이라 불러오는 중이다.
   */
  const [retryRequested, setRetryRequested] = useState(false);
  const awaitingFreshResult = menuQuery.isFetching && !menuQuery.isFetchedAfterMount;
  const retryingAfterFailure = retryRequested && menuQuery.isFetching && menuQuery.isFetchedAfterMount;
  const menus = useMemo(() => menuStructureSource({
    canReadMenus,
    authorizationPending,
    status: menuQuery.status,
    data: menuQuery.data,
    error: menuQuery.error,
    awaitingFreshResult,
    retryingAfterFailure,
  }), [canReadMenus, authorizationPending, menuQuery.status, menuQuery.data, menuQuery.error, awaitingFreshResult, retryingAfterFailure]);
  const { refetch } = menuQuery;

  const retry = async (): Promise<boolean> => {
    setRetryRequested(true);
    try {
      const result = await refetch();
      return Array.isArray(result.data?.menus);
    } finally {
      setRetryRequested(false);
    }
  };

  return {
    menus,
    retry,
    retrying: menuQuery.isFetching,
  };
}
