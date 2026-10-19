'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import type { UserManage } from '@/types/foundation/user';
import type { Department } from '@/services/foundation/system/DeptAdminService';
import { DEPT_MEMBER_PREVIEW, formatDeptMembersLabel } from './UserOrgHubParts';
import type { useDeptTree } from './useDeptTree';
import type { UserOrgTab } from './user-org-prefetch';

/**
 * 사용자·조직 허브에서 고른 항목(2026-10-18 허브 분해 때 UserOrgHubClient 에서 옮겼다 — 동작 변경 없음): 고른 사용자·부서,
 * 사용자 상세 레코드, 부서의 소속 인원과 조직도 위의 자리. 고르는 일(selectedItemId)은 허브가 소유한다.
 */
export function useUserOrgSelection({ activeTab, selectedItemId, users, departments, flattenedDepts }: {
  activeTab: UserOrgTab;
  selectedItemId: string | number | null;
  users: UserManage[];
  departments: Department[];
  flattenedDepts: ReturnType<typeof useDeptTree>['flattenedDepts'];
}) {
  // 탭 분기를 memo 안에 두면 분기마다 계산이 달라 컴파일러가 단일 메모 스코프로 보존하지 못한다
  // (react-hooks/preserve-manual-memoization → 컴포넌트 전체 최적화 스킵).
  // 조회는 컬렉션별로 선형 memo 로 분리하고, 탭 선택은 할당 없는 삼항으로 밖에서 처리한다.
  // 부수 효과로 activeTab 만 바뀔 때 find() 를 다시 돌지 않는다.
  const selectedUser = useMemo(
    () => (selectedItemId ? (users || []).find(u => u?.userId === selectedItemId) : undefined),
    [selectedItemId, users]
  );
  // [2026-09-26 DIP B5 F4] 부서 상세의 소속 인원 — 직속 소속만, 이름은 앞 DEPT_MEMBER_PREVIEW 명까지 보인다.
  const deptMembersQuery = useQuery({
    queryKey: ['admin-dept-members', activeTab === 'DEPTS' ? selectedItemId : null],
    queryFn: () => userAdminService.getUserList({ page: 0, size: DEPT_MEMBER_PREVIEW, ognzId: String(selectedItemId) }),
    enabled: activeTab === 'DEPTS' && Boolean(selectedItemId),
  });
  const deptMembersLabel = formatDeptMembersLabel(deptMembersQuery);

  const selectedDept = useMemo(
    () => (selectedItemId ? (departments || []).find(d => d?.ognzId === selectedItemId) : undefined),
    [selectedItemId, departments]
  );
  /** 조직도의 선택 부서 — 저장 전 옮긴 자리까지 담는다(드래그·키보드 대안 공통). */
  const selectedFlatDept = selectedItemId ? flattenedDepts.find((d) => d.ognzId === selectedItemId) : undefined;
  const selectedDeptParentId = selectedFlatDept
    ? (selectedFlatDept.parentId ?? selectedFlatDept.unloadedParentId ?? null)
    : (selectedDept?.upOgnzId ?? null);
  const selectedItem =
    !selectedItemId ? null
      : activeTab === 'DEPTS' ? (selectedDept ?? null)
        : (activeTab === 'USERS' || activeTab === 'ABSENCES') ? (selectedUser ?? null)
          : null;

  /**
   * 목록 API projection(UserDto 10필드)에는 ognzId·userSttsCd 가 없다. 목록 행만으로 상세 패널을
   * 그리면 소속이 전원 '미지정'으로 보이고, 수정 폼이 ognzId='' 를 왕복시켜 부분수정 계약
   * ("" = 지움, UserService.updateUser 참조)에 따라 실제 소속 부서를 지워버린다.
   * 실존 상세 API(GET /admin/system/users/{userId})로 전체 레코드를 가져와 패널·수정 폼에 쓴다.
   */
  const { data: selectedUserDetail } = useQuery({
    queryKey: ['admin-user-detail', selectedItemId],
    queryFn: () => userAdminService.getUser(selectedItemId as string),
    enabled: Boolean(selectedUser) && activeTab !== 'DEPTS',
  });
  const displayedUser: UserManage | undefined =
    activeTab !== 'DEPTS' ? ((selectedUserDetail as UserManage | undefined) ?? selectedUser) : undefined;

  return { deptMembersLabel, selectedDept, selectedFlatDept, selectedDeptParentId, selectedItem, selectedUserDetail, displayedUser };
}
