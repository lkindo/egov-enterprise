'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UserManage } from '@/types/foundation/user';
import {
  ABSENT,
  PRESENT,
  userAbsenceAdminService,
} from '@/services/foundation/system/UserAbsenceAdminService';

/**
 * 사용자·조직 허브의 부재 상태 조회(2026-10-18 허브 분해 때 UserOrgHubClient 에서 옮겼다 — 동작 변경 없음). 부재·복귀
 * 처리(쓰기)는 허브가 소유한다.
 *
 * <p>[2026-09-07] 부재(자리비움) 배선. 종전에는 이 탭이 전체 사용자를 그린 뒤 "부재 정보는 아직
 * 연동되지 않았습니다" 라고 고지만 했다(operation-consumer-census 의 unwired 부채).
 *
 * <p>⚠ 조인 축은 esntlId 다 — tb_user_absn.user_id 는 이름과 달리 로그인 ID 가 아니라 사용자 PK 이고
 * FK 도 tb_user_info(esntl_id) 를 가리킨다(V2_14). 반면 이 허브의 selectedItemId 는 userId(로그인 ID)라
 * 두 키가 다르므로, 부재 상태는 반드시 사용자 행의 esntlId 로 찾는다.
 *
 * <p>⚠ 서버는 '기록이 있는 사용자' 만 돌려준다 — 목록에 없는 사용자는 부재가 아니며, 복귀한 사용자는
 * userAbsnYn='N' 행으로 남는다. 그래서 '없음 = 정상' 과 'N = 정상' 을 같게 다룬다.
 */
export function useUserOrgAbsences(enabled: boolean) {
  const {
    data: absenceRecords,
    isLoading: isAbsencesLoading,
    isError: isAbsencesError,
    error: absencesError,
    refetch: refetchAbsences,
  } = useQuery({
    queryKey: ['admin-user-absences'],
    queryFn: () => userAbsenceAdminService.getAbsences(),
    enabled,
  });

  const absenceByEsntlId = useMemo(() => {
    const map = new Map<string, string>();
    for (const record of absenceRecords ?? []) {
      if (record?.userId) map.set(record.userId, record.userAbsnYn ?? PRESENT);
    }
    return map;
  }, [absenceRecords]);

  /** 조회가 실패했으면 '전원 정상' 이라고 말하지 않는다 — 모르는 것과 정상인 것은 다르다. */
  const absenceOf = (user: UserManage): string | null => {
    if (isAbsencesError) return null;
    if (!user?.esntlId) return null;
    return absenceByEsntlId.get(user.esntlId) === ABSENT ? ABSENT : PRESENT;
  };

  return { isAbsencesLoading, isAbsencesError, absencesError, refetchAbsences, absenceOf };
}
