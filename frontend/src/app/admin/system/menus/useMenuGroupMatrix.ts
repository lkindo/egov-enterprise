'use client';

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { menuGroupsOf } from './menuDraft';
import type { GroupMatrixState } from './MenuGroupVisibility';
import { QUIET } from './menuAdminModel';

/**
 * 시스템 메뉴 관리가 보는 그룹 권한(2026-10-18 화면 분해 때 MenuAdminClient 에서 옮겼다 — 동작 변경 없음).
 *
 * <p>그룹 권한을 '안다' 고 할 때만 ready 다. 다시 읽기가 실패하면 앞서 읽은 값이 남아 있어도 오류다 — 낡은 버전·권한으로
 * 판정하지 않는다. 오류·불러오는 중에는 그룹을 편집할 수 없고, 숨김 검사는 하지 못한다고 변경 목록이 말한다.
 */
export function useMenuGroupMatrix({ userId, authorizationVersion, canReadGroups, authPending }: {
  userId: string | undefined;
  authorizationVersion: string | undefined;
  canReadGroups: boolean;
  authPending: boolean;
}) {
  const queryClient = useQueryClient();
  const matrixKey = ['admin-menus', 'grant-matrix', userId, authorizationVersion];
  const matrixQuery = useQuery({
    queryKey: matrixKey,
    queryFn: () => authorizationAdminService.getGrantMatrix(QUIET),
    enabled: canReadGroups,
    retry: false,
    throwOnError: false,
  });
  const groupState: GroupMatrixState = authPending
    ? 'loading'
    : !canReadGroups ? 'no-permission' : matrixQuery.isError ? 'error' : matrixQuery.data ? 'ready' : 'loading';
  const groupsReady = groupState === 'ready';
  const groups = useMemo(
    () => (groupsReady && matrixQuery.data ? menuGroupsOf(matrixQuery.data.groups) : []),
    [groupsReady, matrixQuery.data],
  );
  /*
    저장·다시 불러오기 뒤에는 그룹 권한을 비우고 다시 읽는다(refetch 가 아니라 reset). 다시 읽는 동안 앞의 값이 남아 있으면
    그 사이 그룹 메뉴 표시를 바꿀 때 저장 전 버전·권한을 기준으로 잡아, 방금 한 저장 때문에 409 가 나고 체크도 저장 전
    상태로 보인다.
  */
  const reloadGroups = () => {
    if (canReadGroups) void queryClient.resetQueries({ queryKey: matrixKey, exact: true });
  };
  return { matrixQuery, groupState, groups, reloadGroups };
}
