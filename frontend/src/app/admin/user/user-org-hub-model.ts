/*
 * 사용자·조직 허브(UserOrgHubClient)의 값. 2026-10-18 허브 분해 때 UserOrgHubClient 머리에서 옮겼다(동작 변경 없음).
 * 탭 제목(TAB_META)은 화면 파일에 둔다 — ui-quality runner 계약이 화면 제목의 원천으로 그 파일을 읽는다.
 */

/** 동시에 하나만 진행하는 쓰기 — 폼 제출과 상세·일괄 동작이 같은 잠금(actionRequestRef)을 나눠 쓴다. */
export type UserOrgWriteOperation =
  | 'user-form'
  | 'dept-form'
  | 'password-reset'
  | 'unlock-user'
  | 'delete-user'
  | 'delete-dept'
  | 'bulk-delete'
  | 'bulk-status'
  | 'bulk-move'
  | 'dept-hierarchy';

/** 사용자 삭제 확인에서 밝히는 결과 — UserService.cleanupDependentsAndDelete 가 실제로 하는 일과 같아야 한다. */
export const USER_DELETE_CONSEQUENCE = '작성한 게시글·댓글·주소록은 시스템 관리자 계정으로 옮겨지고, 알림·커뮤니티 가입 정보·로그인 정책은 함께 삭제됩니다. 되돌릴 수 없습니다. 로그인만 막으려면 삭제하지 말고 계정 상태를 비활성으로 바꾸세요.';

export const USER_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * 결과 툴바의 총 건수와 지금 페이지가 보여주는 구간. 조회가 실패했으면 총 건수를 0 으로 말하지 않는다 — 모르는 것과 0건은
 * 다르다. 구간은 총 건수가 0 이거나 모르면 말하지 않는다(정책 탭·부서 탭에는 없다).
 */
export function userOrgToolbarCounts({ activeTab, isDeptsError, deptTotal, isUsersError, usersTotal, userPage, userPageSize }: {
  activeTab: 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';
  isDeptsError: boolean;
  deptTotal: number | undefined;
  isUsersError: boolean;
  usersTotal: number | undefined;
  userPage: number;
  userPageSize: number;
}) {
  const isPolicies = activeTab === 'POLICIES';
  const isDeptTab = activeTab === 'DEPTS';
  const toolbarTotalCount = isPolicies
    ? undefined
    : isDeptTab
      // ⚠ flattenedDepts.length 를 쓰면 안 된다 — effect 파생이라 SSR·첫 렌더와 재조회 중에
      //   0 이 되어 데이터가 있는데도 '총 0건' 이라고 말한다(useDeptTree.deptTotal 주석 참조).
      ? (isDeptsError ? undefined : deptTotal)
      : (isUsersError ? undefined : usersTotal);
  const userRowRange = (!isPolicies && !isDeptTab && !isUsersError && usersTotal)
    ? {
        from: (userPage - 1) * userPageSize + 1,
        to: Math.min(userPage * userPageSize, usersTotal),
      }
    : null;
  return { toolbarTotalCount, userRowRange };
}
