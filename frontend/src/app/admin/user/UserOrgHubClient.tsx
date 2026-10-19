'use client';

import { useState, use, useRef, useTransition, useCallback, useId, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Users,
  Network,
  UserMinus,
  ShieldCheck,
  UserPlus,
  LayoutGrid,
  Loader2,
  UserCheck,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { UserManage } from '@/types/foundation/user';
import { deptAdminService, Department } from '@/services/foundation/system/DeptAdminService';
import {
  ABSENT,
  PRESENT,
  userAbsenceAdminService,
} from '@/services/foundation/system/UserAbsenceAdminService';
import { useToast } from '@/app/components/ui/toast';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { MasterDetailLayout } from '@/app/components/patterns/master-detail-page';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { saveDeptHierarchyAction } from '@/app/actions/deptActions';
import {
  bulkUpdateUserStatusAction,
  bulkMoveUserDeptAction,
  bulkDeleteUsersAction
} from '@/app/actions/userActions';

import { StandardModal } from '@/app/components/ui/standard-modal';

import { UserManageForm, UserFormValues } from '@/components/admin/user/UserManageForm';
import { AdminPasswordResetForm } from '@/components/admin/user/AdminPasswordResetForm';
import { DepartmentForm, DeptFormValues } from '@/components/admin/user/DepartmentForm';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import {
  AbsenceStatusNotice,
  buildStandardUserColumns,
  COMMON_USER_COLUMNS,
  EMPTY_USER_FILTERS,
  NavButton,
  OrgPolicyPanel,
  UserListFilterFields,
  type UserListFilters,
  UserOrgDetailPanel,
} from './UserOrgHubParts';
import { useDeptTree } from './useDeptTree';
import type { UserOrgPrefetch, UserOrgTab } from './user-org-prefetch';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { handOffTarget } from '@/lib/navigation/target-handoff';
import { requestAccountMfa } from '@/lib/navigation/command-center-bridge';
import { failureMessage } from '@/lib/safe-error-log';
import { useAuth } from '@/contexts/AuthContext';
import { canOpenPage } from '@/lib/auth/page-access';
import { canPermission } from '@/lib/auth/permissions';
import { USER_DELETE_CONSEQUENCE, USER_PAGE_SIZE_OPTIONS, userOrgToolbarCounts, type UserOrgWriteOperation } from './user-org-hub-model';
import { useUserOrgAbsences } from './useUserOrgAbsences';
import { useUserOrgDialogs } from './useUserOrgDialogs';
import { useUserOrgSelection } from './useUserOrgSelection';
import { DeptDetailActions, UserDetailActions } from './UserOrgDetailActions';
import { UserOrgToolbarActions } from './UserOrgToolbarActions';
import { UserOrgDeptMaster } from './UserOrgDeptMaster';
import { UserOrgBulkMoveDialog, UserOrgBulkStatusDialog } from './UserOrgBulkDialogs';

/*
 * [2026-10-18 허브 분해] 한 함수(약 1,240줄)를 동작 변경 없이 나눴다 — 값(user-org-hub-model)·
 * 고른 항목(useUserOrgSelection)·부재 조회(useUserOrgAbsences)·대화상자 상태(useUserOrgDialogs)·
 * 상세 동작 단추(UserOrgDetailActions)·부서 마스터(UserOrgDeptMaster)·일괄 대화상자(UserOrgBulkDialogs)·툴바 보조 동작
 * (UserOrgToolbarActions). 이 파일 안에서는 표시 판정(useUserOrgPermissions)·사용자 목록(useUserOrgUsers)·쓰기 잠금(useUserOrgWriteLock)·상세·일괄 쓰기 동작(useUserOrgWriteActions)·부재 탭의
 * 열(absenceColumns)을 뗐다. 쓰기 처리기는 이 파일에 둔다 —
 * 폼 검증 census 가 단추의 처리기를 이 파일의 선언 이름으로 따라가 쓰기·동기 잠금·처리 중 표시를 함께 본다. 폼 제출 처리기
 * (onUserSubmit·onDeptSubmit·onPasswordResetSubmit)와 그 폼, URL 을 바꾸는 코드(탭 이동·페이지)는 허브 함수에 그대로 있다.
 */

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 페이지 하나만 읽는다.
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const LIST_PARAM_KEYS = ['page'] as const;

/**
 * 이 허브의 탭은 곧 라우트다(감사 P1-7). 탭 전환을 로컬 state 로만 처리하면
 * 주소가 그대로라 공유·새로고침·뒤로가기가 복원되지 않고 사이드바 활성 표시도 어긋난다.
 * 따라서 탭 클릭은 해당 라우트로 이동시킨다.
 */
const TAB_ROUTE_MAP: Record<UserOrgTab, string> = {
  USERS: '/admin/user/manage',
  DEPTS: '/admin/user/departments',
  ABSENCES: '/admin/user/absences',
  POLICIES: '/admin/user/indvdl-info-policy',
};

/**
 * 탭별 화면 제목·설명.
 *
 * ⚠ 제목 문자열은 e2e 가 셀렉터로 쓴다 — 19-hierarchy 는 `부서 및 조직 관리` 를 **exact** 로,
 *   02-admin-system 은 `사용자 관리` 를 **부분일치**로 찾는다. 바꾸려면 두 스펙을 함께 고친다.
 */
const TAB_META: Record<UserOrgTab, { title: string; description: string }> = {
  USERS: {
    title: '계정 및 사용자 관리',
    description: '등록된 계정을 조회하고 계정 정보·소속 부서·비밀번호를 관리합니다.',
  },
  DEPTS: {
    title: '부서 및 조직 관리',
    description: '부서를 등록하고 끌어서 상위 부서와 순서를 바꾼 뒤 조직 계층을 저장합니다.',
  },
  ABSENCES: {
    title: '부재 상태 관리',
    description: '전체 사용자 목록에서 각 사용자의 부재 여부를 확인하고 부재·복귀를 처리합니다.',
  },
  POLICIES: {
    title: '조직 정책',
    description: '로그인 정책·개인정보처리방침·권한 그룹을 편집하는 전용 화면으로 이동합니다.',
  },
};

/**
 * 사용자·조직 허브의 표시 판정(2026-10-18 허브 분해 때 허브 함수에서 뗐다 — 동작 변경 없음).
 *
 * <p>[2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다. 이 화면은 조회 권한(USER_READ)만으로 들어올 수 있어,
 * 종전에는 헬프데스크 담당자에게도 등록·수정·초기화·삭제·일괄 작업이 모두 보였고 폼을 다 채운 뒤에야 403 을 만났다.
 * 표시 판정일 뿐이며 서버 인가는 그대로 집행된다(H3).
 *
 * <p>이 파일에 둔다 — operation 소비 census 의 쓰기 권한 표시 축(축 3)은 쓰기를 부르는 화면 파일이 그 권한 코드를
 * 직접 언급하는지 본다. 다른 모듈로 옮기면 판정은 그대로여도 이 허브의 쓰기 10건이 표시 판정 없음으로 세인다.
 */
function useUserOrgPermissions() {
  // 권한 그룹 화면은 이 허브와 권한이 다르다 — 라우트 게이트와 같은 판정으로만 길을 보인다(DIP B4 P1).
  const { user: currentUser } = useAuth();
  const canOpenAuthority = canOpenPage(currentUser, '/admin/security/authority');
  return {
    // [2026-10-01] 사용자 상세에서 이 사람을 대상으로 권한 배정·권한 변경 이력·로그인 이력을 연다(탭 세션 인계).
    canOpenLoginLog: canOpenPage(currentUser, '/admin/system/logs/login'),
    canAssignAuthority: canOpenAuthority && canPermission(currentUser, 'AUTHRT_READ'),
    canAuditAuthority: canOpenAuthority && canPermission(currentUser, 'AUTHRT_AUDIT'),
    // [결정 18] 인증앱을 잃은 사용자의 복구 승인. 승인 자체는 계정 메뉴의 추가 인증 관리가 재인증과 함께 집행한다.
    canRecoverMfa: canPermission(currentUser, 'MFA_RECOVER'),
    canCreateUser: canPermission(currentUser, 'USER_CREATE'),
    canUpdateUser: canPermission(currentUser, 'USER_UPDATE'),
    canResetPassword: canPermission(currentUser, 'USER_PASSWORD'),
    canChangeUserStatus: canPermission(currentUser, 'USER_STATUS'),
    canMoveUserDept: canPermission(currentUser, 'USER_DEPT'),
    canDeleteUser: canPermission(currentUser, 'USER_DELETE'),
    canCreateDept: canPermission(currentUser, 'DEPT_CREATE'),
    canUpdateDept: canPermission(currentUser, 'DEPT_UPDATE'),
    canDeleteDept: canPermission(currentUser, 'DEPT_DELETE'),
    canUpdateAbsence: canPermission(currentUser, 'ABSENCE_UPDATE'),
  };
}

/**
 * 사용자·조직 허브의 사용자 목록 조회(2026-10-18 허브 분해 때 허브 함수에서 뗐다 — 동작 변경 없음). 사용자·부재 탭이
 * 같은 목록을 본다. 페이지·검색어는 허브가 소유한다(페이지는 URL 에 싣는다).
 *
 * <p>이 파일에 둔다 — 페이지당 건수 census 는 표에 onPageSizeChange 를 넘기는 파일이 그 크기를 조회 키(queryKey)에 넣는지
 * 같은 파일에서 본다.
 */
function useUserOrgUsers({ activeTab, searchKeyword, userPage, userPageSize, initialUsers }: {
  activeTab: UserOrgTab;
  searchKeyword: string;
  userPage: number;
  userPageSize: number;
  initialUsers: Awaited<UserOrgPrefetch['usersPromise']>;
}) {
  // [2026-09-26 DIP B5 F4] 사용자 탭의 계정 상태·소속 부서·로그인 잠금 조건. 부재 탭은 전체 사용자를 그대로 본다.
  const [userFilters, setUserFilters] = useState<UserListFilters>(EMPTY_USER_FILTERS);
  const appliedUserFilters = activeTab === 'USERS' ? userFilters : EMPTY_USER_FILTERS;
  const hasUserFilter = Boolean(appliedUserFilters.userSttsCd || appliedUserFilters.ognzId || appliedUserFilters.lckYn);
  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', searchKeyword, userPage, userPageSize, appliedUserFilters],
    // 서버(GET /admin/system/users)는 searchKeyword + Spring Pageable(page/size, 0-based)만 읽는다.
    // 종전의 {pageNo}는 ApiService 매핑 대상도 Pageable 파라미터도 아니라 그대로 무시됐고,
    // 몇 페이지를 눌러도 항상 첫 페이지가 왔다(死 페이저 — 감사 m-2).
    queryFn: () => userAdminService.getUserList({
      page: userPage - 1, size: userPageSize, searchKeyword: searchKeyword,
      ...(appliedUserFilters.userSttsCd ? { userSttsCd: appliedUserFilters.userSttsCd } : {}),
      ...(appliedUserFilters.ognzId ? { ognzId: appliedUserFilters.ognzId } : {}),
      ...(appliedUserFilters.lckYn ? { lckYn: appliedUserFilters.lckYn } : {}),
    }),
    enabled: activeTab === 'USERS' || activeTab === 'ABSENCES',
    // 서버 프리페치가 실패했다면(null) 시드를 쓰지 않는다 — 빈 목록을 시드로 넣으면
    // staleTime 동안 재조회가 막혀 조회 실패가 '0건'으로 위장된다(감사 P1-1).
    initialData: (userPage === 1 && userPageSize === 10 && !searchKeyword && !hasUserFilter) ? (initialUsers ?? undefined) : undefined
  });
  const users = useMemo(() => {
    const list = usersData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as UserManage[];
  }, [usersData]);

  return { userFilters, setUserFilters, hasUserFilter, usersData, isUsersLoading, isUsersError, usersError, refetchUsers, users };
}

/**
 * 쓰기 잠금 — 폼 제출과 상세·일괄 동작이 한 번에 하나만 진행한다. 동기 ref(actionRequestRef)로 같은 tick 의 연속 클릭을 막고,
 * 화면 표시는 activeWriteOperation(무엇이 진행 중인가)으로 한다.
 */
function useUserOrgWriteLock() {
  const [activeWriteOperation, setActiveWriteOperation] = useState<UserOrgWriteOperation | null>(null);
  const actionRequestRef = useRef<UserOrgWriteOperation | null>(null);
  const isSaving = activeWriteOperation !== null;

  const beginNonFormAction = (operation: UserOrgWriteOperation) => {
    if (actionRequestRef.current) return false;
    actionRequestRef.current = operation;
    setActiveWriteOperation(operation);
    return true;
  };

  const finishNonFormAction = (operation: UserOrgWriteOperation) => {
    if (actionRequestRef.current !== operation) return;
    actionRequestRef.current = null;
    setActiveWriteOperation(null);
  };

  return { activeWriteOperation, actionRequestRef, isSaving, beginNonFormAction, finishNonFormAction };
}

/**
 * 상세·일괄 쓰기 동작 — 부재·복귀, 계정 잠금 해제, 사용자·부서 삭제, 일괄 삭제·상태 변경·부서 이동, 조직 계층 저장. 모두 위의
 * 쓰기 잠금을 지난다. 실패는 서버 문구로 알리고 화면 상태를 지운다(토스트 하나).
 */
function useUserOrgWriteActions({
  lock,
  selectedItemId,
  setSelectedItemId,
  selectedItem,
  selectedDept,
  absenceOf,
  refetchUsers,
  refetchDepts,
  dialogs,
  dept,
  permissions,
}: {
  lock: ReturnType<typeof useUserOrgWriteLock>;
  selectedItemId: string | number | null;
  setSelectedItemId: (value: string | number | null) => void;
  selectedItem: UserManage | Department | null;
  selectedDept: Department | undefined;
  absenceOf: (user: UserManage) => string | null;
  refetchUsers: () => unknown;
  refetchDepts: () => unknown;
  dialogs: ReturnType<typeof useUserOrgDialogs>;
  dept: Pick<ReturnType<typeof useDeptTree>, 'hasDeptChanges' | 'flattenedDepts' | 'baselineDepts' | 'markDeptChangesSaved'>;
  permissions: { canChangeUserStatus: boolean; canMoveUserDept: boolean; canDeleteUser: boolean };
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const { beginNonFormAction, finishNonFormAction, isSaving, activeWriteOperation } = lock;
  const { canChangeUserStatus, canMoveUserDept, canDeleteUser } = permissions;
  const { selectedBulkItems, targetStatus, targetDeptId, setIsBulkStatusModalOpen, setIsBulkMoveModalOpen, isDeptModalOpen } = dialogs;
  const { hasDeptChanges, flattenedDepts, baselineDepts, markDeptChangesSaved } = dept;

  const [absencePendingId, setAbsencePendingId] = useState<string | null>(null);
  const absencePendingRef = useRef(false);

  const handleToggleAbsence = async (user: UserManage) => {
    const esntlId = user?.esntlId;
    if (absencePendingRef.current || !esntlId) return;
    const current = absenceOf(user);
    if (current === null) return;
    const next = current === ABSENT ? PRESENT : ABSENT;

    absencePendingRef.current = true;
    setAbsencePendingId(esntlId);
    try {
      await userAbsenceAdminService.updateAbsence(esntlId, next);
      toast(
        next === ABSENT
          ? `${user.userNm ?? user.userId}님을 부재로 표시했습니다.`
          : `${user.userNm ?? user.userId}님을 복귀 처리했습니다.`,
        'success',
      );
      queryClient.invalidateQueries({ queryKey: ['admin-user-absences'] });
    } catch (error) {
      toast(failureMessage(error, '부재 상태를 변경하지 못했습니다.'), 'error');
    } finally {
      absencePendingRef.current = false;
      setAbsencePendingId(null);
    }
  };

  /**
   * [2026-09-26 DIP B4 P7, D5] 계정 잠금 해제. 연속 실패로 잠긴 계정은 잠금 시간이 지나면 스스로 풀리지만, 그 전에 풀어야 할 때
   * 관리자가 쓴다. 비밀번호 초기화도 잠금을 함께 푼다(서버).
   */
  const handleUnlockUser = async () => {
    const operation = 'unlock-user' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;
    try {
      await userAdminService.unlockUser(selectedItemId as string);
      toast('계정 잠금을 해제했습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['admin-user-detail', selectedItemId] });
    } catch (error) {
      toast(failureMessage(error, '계정 잠금을 해제하지 못했습니다.'), 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleDeleteUser = async () => {
    const operation = 'delete-user' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;

    try {
      // 확인 본문에 대상 식별자(이름·아이디)를 노출한다 — 무엇을 지우는지 모른 채 누르는 오삭제 방지(감사 P1-9).
      const targetName = (selectedItem as UserManage)?.userNm ?? String(selectedItemId);
      const ok = await confirm({
        title: '사용자 삭제',
        // [2026-10-01] 삭제가 실제로 하는 일을 말한다 — 서버는 콘텐츠를 시스템 관리자로 재귀속하고 알림·멤버십·정책을 지운다.
        message: `'${targetName}(${selectedItemId})' 사용자의 계정과 접근 권한을 영구히 삭제합니다. ${USER_DELETE_CONSEQUENCE}`,
        variant: 'destructive',
        confirmText: '삭제'
      });

      if (ok) {
        await userAdminService.deleteUser(selectedItemId as string);
        toast(`'${targetName}' 사용자를 삭제했습니다.`, 'success');
        setSelectedItemId(null);
        refetchUsers();
      }
    } catch (error) {
      const message = failureMessage(error, '사용자 삭제 중 오류가 발생했습니다.');
      toast(message, 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  /**
   * 부서 삭제. 종전에는 상세 패널의 삭제 버튼이 탭 분기 없이 handleDeleteUser 를 호출해,
   * DEPTS 탭에서는 부서 ID(ognzId)로 사용자 삭제 API 를 때리고 있었다.
   * 서버는 소속 사용자·하위 부서가 남아 있으면 409(RESOURCE_IN_USE)로 막으므로 그 메시지를 그대로 보여준다.
   */
  const handleDeleteDept = async () => {
    const operation = 'delete-dept' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;

    try {
      const targetName = (selectedItem as Department)?.ognzNm ?? String(selectedItemId);
      const ok = await confirm({
        title: '부서 삭제',
        message: `'${targetName}(${selectedItemId})' 부서를 삭제하시겠습니까? 소속 사용자나 하위 부서가 남아 있으면 삭제할 수 없습니다.`,
        variant: 'destructive',
        confirmText: '삭제'
      });

      if (ok) {
        await deptAdminService.deleteDept(selectedItemId as string);
        toast(`'${targetName}' 부서를 삭제했습니다.`, 'success');
        setSelectedItemId(null);
        refetchDepts();
      }
    } catch (error) {
      const message = failureMessage(error, '부서 삭제 중 오류가 발생했습니다.');
      toast(message, 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleBulkDelete = async (items: (UserManage | Department)[]) => {
    const operation = 'bulk-delete' as const;
    if (!beginNonFormAction(operation)) return;
    const userItems = items as UserManage[];
    const names = userItems.map(u => u.userNm).filter(Boolean);
    const preview = names.slice(0, 5).join(', ') + (names.length > 5 ? ` 외 ${names.length - 5}명` : '');
    try {
      const ok = await confirm({
        title: '사용자 일괄 삭제',
        message: `${userItems.length}명의 계정과 접근 권한을 영구히 삭제합니다. ${USER_DELETE_CONSEQUENCE}\n대상: ${preview}`,
        variant: 'destructive',
        confirmText: '삭제'
      });
      if (ok) {
        const res = await bulkDeleteUsersAction(userItems.map(u => u.userId));
        toast(res.message, res.success ? 'success' : 'error');
        if (res.success) refetchUsers();
      }
    } catch (error) {
      toast(failureMessage(error, '일괄 삭제 중 오류가 발생했습니다.'), 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleBulkStatusUpdate = async () => {
    const operation = 'bulk-status' as const;
    if (!beginNonFormAction(operation)) return;
    try {
      const res = await bulkUpdateUserStatusAction(selectedBulkItems.map(u => u.userId), targetStatus);
      if (res.success) {
        toast(res.message, 'success');
        refetchUsers();
        setIsBulkStatusModalOpen(false);
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('상태 변경 중 오류 발생', 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleBulkDeptMove = async () => {
    if (!targetDeptId) {
      toast('이동할 부서를 선택해주세요.', 'error');
      return;
    }
    const operation = 'bulk-move' as const;
    if (!beginNonFormAction(operation)) return;
    try {
      const res = await bulkMoveUserDeptAction(selectedBulkItems.map(u => u.userId), targetDeptId);
      if (res.success) {
        toast(res.message, 'success');
        refetchUsers();
        setIsBulkMoveModalOpen(false);
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('부서 이동 중 오류 발생', 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const handleSaveDeptHierarchy = async () => {
    const operation = 'dept-hierarchy' as const;
    // A2 계약: 선택한 마스터 항목이 없거나 실제 변경이 없으면 저장하지 않는다.
    if (!selectedDept || !hasDeptChanges || isDeptModalOpen || !beginNonFormAction(operation)) return;

    try {
      // [DIP C5] 서버에서 읽은 기준선과 달라진 부서만, 형제 안 상대 순서로 보낸다.
      const res = await saveDeptHierarchyAction(flattenedDepts, baselineDepts);
      if (res.success) {
        toast(res.message, 'success');
        markDeptChangesSaved();
        router.refresh();
      } else {
        toast(res.message, 'error');
      }
    } catch {
      toast('구조 저장 중 오류 발생', 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  // 권한이 있는 일괄 작업만 싣는다. 하나도 없으면 표의 선택 체크박스도 걷는다(아래 enableSelection).
  const userBulkActions = [
    ...(canChangeUserStatus ? [{
      label: '상태 변경',
      icon: <Activity size={16} />,
      disabled: isSaving,
      onClick: (items: (UserManage | Department)[]) => dialogs.openBulkStatus(items as UserManage[]),
    }] : []),
    ...(canMoveUserDept ? [{
      label: '부서 이동',
      icon: <Network size={16} />,
      disabled: isSaving,
      onClick: (items: (UserManage | Department)[]) => dialogs.openBulkMove(items as UserManage[]),
    }] : []),
    ...(canDeleteUser ? [{
      label: '일괄 삭제',
      icon: <UserMinus size={16} />,
      variant: 'destructive' as const,
      disabled: isSaving,
      ariaBusy: activeWriteOperation === 'bulk-delete',
      pendingLabel: '일괄 삭제 처리 중…',
      onClick: handleBulkDelete
    }] : []),
  ];

  return {
    userBulkActions,
    absencePendingId,
    handleToggleAbsence,
    handleUnlockUser,
    handleDeleteUser,
    handleDeleteDept,
    handleBulkDelete,
    handleBulkStatusUpdate,
    handleBulkDeptMove,
    handleSaveDeptHierarchy,
  };
}

/**
 * 탭(=라우트)과 사용자 목록 페이지. 페이지는 URL 에 싣고(허용 키만 남긴다), 탭은 그 라우트로 이동한다. URL 을 바꾸는 코드는 이
 * 파일에 둔다(URL 상태 census 가 파일 단위로 센다).
 */
function useUserOrgNavigation({ defaultTab, setSelectedItemId }: {
  defaultTab: UserOrgTab;
  setSelectedItemId: (value: string | number | null) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<UserOrgTab>(defaultTab);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** 페이지 번호는 URL 에 반영한다 — 새로고침·공유·뒤로가기가 복원된다(감사 P1-7). */
  const [userPage, setUserPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });
  /**
   * 페이지당 건수(A1 필수). URL 에는 싣지 않는다 — PD-UX-002 의 census 승인 경계 밖에서
   * 새 URL producer 를 만들지 않는다는 기존 결정(DEC-OPS-033)을 그대로 따른다.
   */
  const [userPageSize, setUserPageSize] = useState(10);

  /** 라우트(=탭) 이동 시 서버가 내려준 defaultTab 으로 동기화한다. */
  const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTab);
  if (defaultTab !== prevDefaultTab) {
    setPrevDefaultTab(defaultTab);
    setActiveTab(defaultTab);
  }

  const goToPage = useCallback((page: number) => {
    setUserPage(page);
    const next = pickAllowedParams(searchParams, LIST_PARAM_KEYS);
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  /** 탭 = 라우트. 현재 라우트가 가리키는 탭이면 이동하지 않는다(로그인정책/개인정보정책 공용 탭). */
  const handleTabChange = useCallback((tab: UserOrgTab) => {
    startTransition(() => {
      setActiveTab(tab);
      setSelectedItemId(null);
    });
    if (tab !== defaultTab) {
      router.push(TAB_ROUTE_MAP[tab]);
    }
  }, [defaultTab, router, startTransition, setSelectedItemId]);

  /** 페이지당 건수를 바꾸면 현재 페이지 번호가 의미를 잃으므로 1페이지로 되돌린다. */
  const handlePageSizeChange = useCallback((size: number) => {
    setUserPageSize(size);
    goToPage(1);
  }, [goToPage]);

  return { isPending, activeTab, router, userPage, userPageSize, goToPage, handleTabChange, handlePageSizeChange };
}

/** 부재 탭의 열 — 직함·부재 여부와, 부재를 바꿀 권한(ABSENCE_UPDATE)이 있으면 조치(부재·복귀 처리). */
function absenceColumns({ absenceOf, canUpdateAbsence, absencePendingId, handleToggleAbsence }: {
  absenceOf: (user: UserManage) => string | null;
  canUpdateAbsence: boolean;
  absencePendingId: string | null;
  handleToggleAbsence: (user: UserManage) => Promise<void>;
}): Column<UserManage>[] {
  return [
      {
        header: '직함',
        className: 'w-32',
        accessor: (user: UserManage) => user.ofcpsNm || <span className="text-muted-foreground">-</span>,
      },
      {
        header: '부재 여부',
        className: 'w-28',
        accessor: (user: UserManage) => {
          const state = absenceOf(user);
          // 조회 실패나 esntlId 부재는 '정상' 이 아니라 '알 수 없음' 이다.
          if (state === null) {
            return <span className="text-xs text-muted-foreground">알 수 없음</span>;
          }
          return state === ABSENT
            ? (
              // ⚠ `text-warning-emphasis` 를 쓰지 않는다 — 그 토큰은 정의돼 있지 않아 Tailwind 가
              //   클래스를 만들지 않고 색이 조용히 사라진다. 배경 틴트로 상태를 말한다.
              <span className="inline-flex items-center rounded border border-warning/40 bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-foreground">
                부재
              </span>
            )
            : <span className="text-xs text-muted-foreground">정상</span>;
        },
      },
      // 부재를 바꿀 권한(ABSENCE_UPDATE)이 없으면 조치 열을 두지 않는다 — 부재 여부는 그대로 보인다.
      ...(canUpdateAbsence ? [{
        header: '조치',
        className: 'text-right w-36',
        accessor: (user: UserManage) => {
          const state = absenceOf(user);
          if (state === null) return null;
          // 바깥 useTransition 의 isPending(탭 전환 흐림)과 다른 값이다 — 이 행의 부재 처리가 진행 중인지만 뜻한다.
          const isRowPending = absencePendingId !== null && absencePendingId === user.esntlId;
          const label = state === ABSENT
            ? `${user.userNm ?? user.userId} 복귀 처리`
            : `${user.userNm ?? user.userId} 부재 처리`;
          return (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={absencePendingId !== null}
                aria-busy={isRowPending}
                aria-label={isRowPending ? `${label} 중` : label}
                onClick={(event) => { event.stopPropagation(); void handleToggleAbsence(user); }}
                className="gap-1.5"
              >
                {isRowPending
                  ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  : (state === ABSENT
                      ? <UserCheck size={14} aria-hidden="true" />
                      : <UserMinus size={14} aria-hidden="true" />)}
                {/* 같은 행에 상태 '부재/정상' 이 함께 있어 동사 없이 '부재' 만 쓰면 상태 표시와 구분되지 않는다. */}
                {state === ABSENT ? '복귀 처리' : '부재 처리'}
              </Button>
            </div>
          );
        },
      }] : []),
  ] satisfies Column<UserManage>[];
}

/**
 * 사용자 상세가 권한 배정·권한 변경 이력·로그인 이력·인증앱 복구 화면으로 가는 길(탭 세션 인계). 넘길 대상이 없거나 갈 수 있는 길이
 * 하나도 없으면 null 이다.
 */
function userAccessControlLinks({ displayedUser, router, canAssignAuthority, canAuditAuthority, canOpenLoginLog, canRecoverMfa }: {
  displayedUser: UserManage | undefined;
  router: ReturnType<typeof useRouter>;
  canAssignAuthority: boolean;
  canAuditAuthority: boolean;
  canOpenLoginLog: boolean;
  canRecoverMfa: boolean;
}) {
  /** 사용자 상세가 권한 배정·권한 변경 이력·로그인 이력·인증앱 복구 화면으로 넘기는 대상(탭 세션 인계). */
  const handOffUser = displayedUser?.esntlId
    ? { id: displayedUser.esntlId, loginId: displayedUser.userId ?? '', name: displayedUser.userNm ?? displayedUser.userId ?? '' }
    : null;
  return handOffUser && (canAssignAuthority || canAuditAuthority || canOpenLoginLog || (canRecoverMfa && displayedUser?.mfaEnabled))
    ? {
        onOpen: canAssignAuthority ? () => { handOffTarget('authority-user', handOffUser); router.push('/admin/security/authority'); } : undefined,
        onOpenHistory: canAuditAuthority && handOffUser.loginId ? () => { handOffTarget('authority-history-user', handOffUser); router.push('/admin/security/authority'); } : undefined,
        onOpenLoginLog: canOpenLoginLog && handOffUser.loginId ? () => { handOffTarget('login-log-user', handOffUser); router.push('/admin/system/logs/login'); } : undefined,
        onRecoverMfa: canRecoverMfa && displayedUser?.mfaEnabled ? () => { handOffTarget('mfa-recover-user', handOffUser); requestAccountMfa(); } : undefined,
      }
    : null;
}

/** 탭(=라우트) 전환 줄. 탭을 누르면 그 라우트로 간다(handleTabChange). */
function UserOrgTabNav({ activeTab, onTabChange }: { activeTab: UserOrgTab; onTabChange: (tab: UserOrgTab) => void }) {
  return (
        <nav
          aria-label="사용자 및 조직 관리 화면 전환"
          className="flex w-fit max-w-full flex-wrap rounded-md border border-border bg-muted/50 p-0.5"
        >
          <NavButton icon={<Users size={14} />} label="사용자" active={activeTab === 'USERS'} onClick={() => onTabChange('USERS')} />
          <NavButton icon={<Network size={14} />} label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => onTabChange('DEPTS')} />
          <NavButton icon={<UserMinus size={14} />} label="부재 상태 관리" active={activeTab === 'ABSENCES'} onClick={() => onTabChange('ABSENCES')} />
          <NavButton icon={<ShieldCheck size={14} />} label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => onTabChange('POLICIES')} />
        </nav>
  );
}

/** 조회조건 — 검색어(부서 탭은 부서 검색)와 사용자 탭의 계정 상태·소속 부서·로그인 잠금 조건, 부서 탭의 검색 안내. */
function UserOrgFilterBar({
  isDeptTab,
  showUserFilters,
  searchKeyword,
  onSearch,
  onReset,
  userFilterId,
  userFilters,
  departments,
  onChangeFilter,
}: {
  isDeptTab: boolean;
  showUserFilters: boolean;
  searchKeyword: string;
  onSearch: (next: string) => void;
  onReset: () => void;
  userFilterId: string;
  userFilters: UserListFilters;
  departments: Department[];
  onChangeFilter: (patch: Partial<UserListFilters>) => void;
}) {
  return (
        <div className="flex flex-wrap items-end gap-2">
          {/* ⚠ min-width 는 sm 이상에서만 건다 — 320px 뷰포트에서 14rem(224px) 하한이 flex-shrink 를
              무력화해 조회조건 영역이 가로로 넘친다(ui-ux-task-flow-optimization 가이드의 320px 무넘침
              의무). 종전 검색 입력에는 하한이 없었다. */}
          {/* 보이는 라벨과 접근 이름을 같게 둔다(WCAG 2.5.3). e2e(department-hierarchy·security-administration)는
              이 접근 이름('부서 검색')으로, user-administration 은 placeholder('검색어를 입력하세요...')로 입력을 찾는다 —
              문구를 바꾸면 그 스펙도 함께 고친다. 검색어가 바뀌면 페이지를 1로 되돌린다(감사 P1-8). */}
          <div className="min-w-0 flex-1 sm:min-w-[14rem]">
            <KeywordFilter
              label={isDeptTab ? '부서 검색' : '사용자 검색'}
              placeholder="검색어를 입력하세요..."
              value={searchKeyword}
              onSearch={onSearch}
              onReset={onReset}
            >
              {/* [2026-09-26 DIP B5 F4] 사용자 탭만 계정 상태·소속 부서·로그인 잠금으로 좁힌다.
                  부재 탭은 부재를 판정하려고 전체 사용자를 보므로 조건을 두지 않는다. 부서는 직속 소속만 본다. */}
              {showUserFilters && (
                <UserListFilterFields
                  userFilterId={userFilterId}
                  userFilters={userFilters}
                  departments={departments}
                  onChangeFilter={onChangeFilter}
                />
              )}
            </KeywordFilter>
          </div>
          {/* 안내는 라벨·placeholder 로 알 수 없는 사실이 있을 때만 둔다 — 사용자 탭의
              '사용자명 또는 ID 로 검색합니다' 는 라벨의 반복이라 한 줄을 더 쓸 값이 없었다. */}
          {isDeptTab && (
            /*
              ⚠ 이 문구는 실제로 있는 보호만 말해야 한다(G10·헌법 제16조 4항).

                종전에는 '검색 중에는 계층을 바꿀 수 없습니다' 라는 없는 가드를 약속하려다,
                대신 일어나는 손상을 그대로 고지했다 — 좁힌 결과에 상위가 빠진 노드를 저장하면
                up_ognz_id 가 비워졌다(GAP-DEPT-001).

                지금은 보호가 존재한다: listToDeptTree 가 '상위를 모른다'(unloadedParentId)를
                들고 가고, saveDeptHierarchyAction 이 그 노드를 전송에서 뺀다. 드래그한 노드는
                표시가 해제되어 정상 반영된다. 여기서 말하는 것은 그 규칙 그대로다.
                ⚠ '검색 중에는 안전하다' 로 넓히지 마라 — 보호 단위는 검색이 아니라 노드다.
            */
            <p className="basis-full text-xs text-muted-foreground">
              부서명으로 조직도를 좁힙니다. 좁힌 결과에 상위 부서가 없는 부서는 맨 위에 보이지만,
              저장해도 상위 관계를 그대로 둡니다 — 직접 옮긴 부서만 바뀝니다.
            </p>
          )}
        </div>
  );
}

export default function UserOrgHubClient({
  defaultTab = 'USERS',
  usersPromise,
  deptsPromise
}: UserOrgPrefetch & {
  defaultTab?: UserOrgTab;
}) {
  const initialUsers = use(usersPromise);
  const initialDepts = use(deptsPromise);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const {
    canOpenLoginLog, canAssignAuthority, canAuditAuthority, canRecoverMfa,
    canCreateUser, canUpdateUser, canResetPassword, canChangeUserStatus, canMoveUserDept, canDeleteUser,
    canCreateDept, canUpdateDept, canDeleteDept, canUpdateAbsence,
  } = useUserOrgPermissions();
  const lock = useUserOrgWriteLock();
  const { activeWriteOperation, actionRequestRef, isSaving, beginNonFormAction, finishNonFormAction } = lock;
  /**
   * [2026-09-26 DIP C9] 검색어는 `조회`/Enter 로 적용된 값이다(카탈로그 G2). 종전에는 타이핑을 300ms 디바운스해 조회했고,
   * 그래서 `조회` 버튼이 죽은 컨트롤이 될까 봐 두지 않았다(G10). 이제 조회 버튼이 조건을 적용하는 유일한 경로다.
   * 부서 탭에서는 입력 중 재조회가 사라져, 저장하지 않은 드래그 중에 트리가 바뀌는 경로도 줄어든다.
   */
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const {
    isPending, activeTab, router, userPage, userPageSize, goToPage, handleTabChange, handlePageSizeChange,
  } = useUserOrgNavigation({ defaultTab, setSelectedItemId });

  const dialogs = useUserOrgDialogs(actionRequestRef, selectedItemId);
  const { isUserModalOpen, setIsUserModalOpen, isPasswordModalOpen, setIsPasswordModalOpen, isDeptModalOpen, setIsDeptModalOpen, formMode } = dialogs;

  /** 서버 호출 실패는 그대로 throw 한다 — 폼이 필드 오류 매핑·입력 보존·안내를 소유한다. */
  const onPasswordResetSubmit = async (newPassword: string) => {
    const operation = 'password-reset' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;
    try {
      await userAdminService.updatePassword(selectedItemId as string, { newPassword });
      const targetName = (selectedItem as UserManage)?.userNm ?? String(selectedItemId);
      toast(`'${targetName}' 사용자의 비밀번호를 초기화했습니다. 새 비밀번호를 사용자에게 직접 전달해 주세요.`, 'success');
      setIsPasswordModalOpen(false);
    } finally {
      finishNonFormAction(operation);
    }
  };

  const { userFilters, setUserFilters, hasUserFilter, usersData, isUsersLoading, isUsersError, usersError, refetchUsers, users } = useUserOrgUsers({
    activeTab, searchKeyword, userPage, userPageSize, initialUsers,
  });
  const userFilterId = useId();
  // 조건이 바뀌면 1페이지로 돌아간다 — 검색어와 같은 규칙(감사 P1-8).
  const applyUserFilter = (patch: Partial<UserListFilters>) => {
    setUserFilters((prev) => ({ ...prev, ...patch }));
    if (userPage !== 1) goToPage(1);
  };

  const { isAbsencesLoading, isAbsencesError, absencesError, refetchAbsences, absenceOf } = useUserOrgAbsences(activeTab === 'ABSENCES');

  /**
   * 검색 입력은 사용자/부서 탭이 공유한다. USERS 탭에서 입력한 사용자 검색어가 부서 조회에 섞이면
   * '부서 이동' 모달의 대상 목록이 그 키워드로 걸러져 비어 버린다 — 부서 탭에서만 키워드를 태운다.
   */
  const deptKeyword = activeTab === 'DEPTS' ? searchKeyword : '';
  const deptTree = useDeptTree({
    deptKeyword,
    initialDepts,
    // [2026-09-26 DIP V9] 사용자를 고르면 상세의 소속을 이름으로 보이도록 부서 목록도 읽는다(캐시 공유).
    // [2026-09-26 DIP B5 F4] 사용자 탭은 목록의 부서 열과 '소속 부서' 조건도 이름으로 보이므로 늘 읽는다.
    //   서버 프리페치(전량)가 있으면 그것이 initialData 라 추가 요청이 없다.
    enabled: activeTab === 'DEPTS' || activeTab === 'USERS' || dialogs.isBulkMoveModalOpen || isUserModalOpen,
    onDragSelect: setSelectedItemId,
  });
  const { isDeptsLoading, isDeptsError, refetchDepts, departments, deptTotal, flattenedDepts, hasDeptChanges } = deptTree;

  const onUserSubmit = async (values: UserFormValues) => {
    const operation = 'user-form' as const;
    if (!beginNonFormAction(operation)) return;
    try {
      if (formMode === 'create') {
        await userAdminService.createUser(values as UserManage);
        toast('사용자가 성공적으로 등록되었습니다.', 'success');
      } else {
        await userAdminService.updateUser(selectedItemId as string, values as UserManage);
        toast('사용자 정보가 수정되었습니다.', 'success');
      }
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail'] });
      setIsUserModalOpen(false);
    } catch (error) {
      if (extractFieldErrors(error)) throw error;
      // 인가 실패(403 등)를 포함한 서버 메시지를 그대로 보여준다 — 일반 문구로 뭉개면
      // 사용자는 권한 문제인지 입력 문제인지 알 수 없다(H3 의미 보존, 감사 m-2).
      const message = failureMessage(error, '사용자 저장 중 오류가 발생했습니다.');
      toast(message, 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  const onDeptSubmit = async (values: DeptFormValues) => {
    const operation = 'dept-form' as const;
    if (!beginNonFormAction(operation)) return;
    try {
      if (formMode === 'create') {
        await deptAdminService.createDept(values as Department);
        toast('부서가 성공적으로 등록되었습니다.', 'success');
      } else {
        await deptAdminService.updateDept(selectedItemId as string, values as Department);
        toast('부서 정보가 수정되었습니다.', 'success');
      }
      refetchDepts();
      setIsDeptModalOpen(false);
    } catch (error) {
      if (extractFieldErrors(error)) throw error;
      toast('부서 저장 중 오류가 발생했습니다.', 'error');
    } finally {
      finishNonFormAction(operation);
    }
  };

  // 조회 실패는 목록 영역에 ErrorStateDisplay(다시 시도 버튼 포함)로 상주 노출한다.
  // 사라지는 토스트만으로는 "데이터 없음"과 구분되지 않는다(감사 P1-1).

  const {
    deptMembersLabel, selectedDept, selectedFlatDept, selectedDeptParentId, selectedItem, selectedUserDetail, displayedUser,
  } = useUserOrgSelection({ activeTab, selectedItemId, users, departments, flattenedDepts });

  const {
    absencePendingId, handleToggleAbsence, handleUnlockUser, handleDeleteUser, handleDeleteDept,
    handleBulkStatusUpdate, handleBulkDeptMove, handleSaveDeptHierarchy, userBulkActions,
  } = useUserOrgWriteActions({
    lock, selectedItemId, setSelectedItemId, selectedItem, selectedDept, absenceOf, refetchUsers, refetchDepts, dialogs, dept: deptTree,
    permissions: { canChangeUserStatus, canMoveUserDept, canDeleteUser },
  });

  const userColumns: Column<UserManage>[] = [
    ...COMMON_USER_COLUMNS,
    // 부재 탭은 부재 여부·조치가 주 관심사이므로 연락 정보 대신 그 두 열을 붙인다(G9 — 열 과밀 금지).
    ...(activeTab === 'ABSENCES'
      ? absenceColumns({ absenceOf, canUpdateAbsence, absencePendingId, handleToggleAbsence })
      : buildStandardUserColumns(departments)),
  ];

  const meta = TAB_META[activeTab];
  const isPolicies = activeTab === 'POLICIES';
  const isDeptTab = activeTab === 'DEPTS';
  const { toolbarTotalCount, userRowRange } = userOrgToolbarCounts({
    activeTab, isDeptsError, deptTotal, isUsersError, usersTotal: usersData?.total, userPage, userPageSize,
  });

  const detailActions = isDeptTab ? (
    <DeptDetailActions
      canUpdateDept={canUpdateDept}
      canDeleteDept={canDeleteDept}
      locked={isSaving}
      deleteBusy={activeWriteOperation === 'delete-dept'}
      onOpenEdit={dialogs.handleOpenDeptEdit}
      handleDeleteDept={handleDeleteDept}
    />
  ) : (
    <UserDetailActions
      canUpdateUser={canUpdateUser}
      canResetPassword={canResetPassword}
      canUnlock={displayedUser?.lckYn === 'Y' && canChangeUserStatus}
      canDeleteUser={canDeleteUser}
      locked={isSaving}
      detailLoaded={Boolean(selectedUserDetail)}
      unlockBusy={activeWriteOperation === 'unlock-user'}
      deleteBusy={activeWriteOperation === 'delete-user'}
      onOpenEdit={dialogs.handleOpenUserEdit}
      onOpenPasswordReset={dialogs.handleOpenPasswordReset}
      onUnlock={() => void handleUnlockUser()}
      handleDeleteUser={handleDeleteUser}
    />
  );

  return (
    <WorkListPage
      title={meta.title}
      description={meta.description}
      breadcrumbItems={isDeptTab
        ? [{ label: '사용자 관리' }, { label: '부서 관리' }]
        : [{ label: '사용자 관리' }, { label: meta.title }]}
      filterStateKey="user-org-hub"
      totalCount={toolbarTotalCount}
      actions={isDeptTab ? (canCreateDept ? (
        <Button type="button" onClick={dialogs.handleOpenDeptCreate} disabled={isSaving} className="gap-2">
          <LayoutGrid size={16} aria-hidden="true" /> 부서 등록
        </Button>
      ) : undefined) : activeTab === 'USERS' && canCreateUser ? (
        <Button type="button" onClick={dialogs.handleOpenUserCreate} disabled={isSaving} className="gap-2">
          <UserPlus size={16} aria-hidden="true" /> 사용자 등록
        </Button>
      ) : undefined}
      navigation={<UserOrgTabNav activeTab={activeTab} onTabChange={handleTabChange} />}
      filter={isPolicies ? undefined : (
        <UserOrgFilterBar
          isDeptTab={isDeptTab}
          showUserFilters={activeTab === 'USERS'}
          searchKeyword={searchKeyword}
          onSearch={(next) => {
            setSearchKeyword(next);
            if (isDeptTab) setSelectedItemId(null);
            if (userPage !== 1) goToPage(1);
          }}
          onReset={() => {
            setSearchKeyword('');
            if (isDeptTab) setSelectedItemId(null);
            else setUserFilters(EMPTY_USER_FILTERS);
            if (userPage !== 1) goToPage(1);
          }}
          userFilterId={userFilterId}
          userFilters={userFilters}
          departments={departments}
          onChangeFilter={applyUserFilter}
        />
      )}
      toolbarActions={isPolicies ? undefined : (
        <UserOrgToolbarActions rowRange={userRowRange} refreshing={isUsersLoading || isDeptsLoading} />
      )}
    >
      {isPolicies ? (
        <OrgPolicyPanel onNavigate={(href) => router.push(href)} />
      ) : (
        <MasterDetailLayout
          active={activeTab === 'DEPTS'}
          onSaveShortcut={handleSaveDeptHierarchy}
          saveShortcutDisabled={!hasDeptChanges || isSaving || isDeptModalOpen}
          className={cn(
            !isDeptTab && 'grid min-w-0 gap-4',
            // 상세 패널은 선택했을 때만 자리를 차지한다 — 미선택 상태에서 화면의 3분의 1을
            // 빈 안내 상자에 내주면 목록 열이 그만큼 좁아진다(선택 상태는 뷰포트가 아니라
            // 앱 상태이므로 ADR-0006 의 뷰포트 분기 금지와 무관하다).
            //
            // ⚠ 분할 시작점은 `lg`(1024)여야 한다. 종전 레이아웃이 `lg:col-span-7`/`lg:col-span-5`
            //   였는데 `xl`(1280)로 올리면 1024~1279 구간에서 행을 클릭했을 때 상세가 표 **아래**
            //   수백 px 뒤에 렌더된다 — 스크롤도 포커스 이동도 없어 "눌렀는데 아무 일도 없는" 화면이
            //   된다. 1024×768 은 e2e 가 상시 돌리는 해상도다.
            !isDeptTab && selectedItem && 'lg:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)]',
            isPending && 'opacity-60 pointer-events-none',
          )}
        >
          <div className={cn('flex min-w-0 flex-col gap-3', isDeptTab && 'h-full')}>
            {activeTab === 'ABSENCES' && (
              <AbsenceStatusNotice
                isError={isAbsencesError}
                error={absencesError}
                isLoading={isAbsencesLoading}
                absentCount={users.filter((user) => absenceOf(user) === ABSENT).length}
                onRetry={() => { void refetchAbsences(); }}
              />
            )}

            {isDeptTab ? (
              <UserOrgDeptMaster
                canUpdateDept={canUpdateDept}
                locked={isSaving}
                saveBusy={activeWriteOperation === 'dept-hierarchy'}
                hasSelectedDept={Boolean(selectedDept)}
                isDeptModalOpen={isDeptModalOpen}
                handleSaveDeptHierarchy={handleSaveDeptHierarchy}
                deptTree={deptTree}
                deptKeyword={deptKeyword}
                selectedItemId={selectedItemId}
                onSelectDept={setSelectedItemId}
              />
            ) : (
              <StandardDataTable<UserManage>
                  columns={userColumns as Column<UserManage>[]}
                  data={users}
                  loading={isUsersLoading}
                  error={isUsersError ? (usersError as Error) : null}
                  onRetry={() => refetchUsers()}
                  onRowClick={(item) => {
                      if (item.userId) setSelectedItemId(item.userId);
                  }}
                  rowActionLabel={(item) => `${item.userNm || item.userId || '사용자'} 상세 열기`}
                  keyField="userId"
                  // ⚠ e2e(23-security-auth-supplement E12)가 /검색 결과가 없습니다|데이터가 존재하지 않습니다/ 로 단언한다.
                  emptyMessage={hasUserFilter && !searchKeyword.trim() ? '조건에 맞는 사용자가 없습니다.' : emptyResultMessage(searchKeyword, '데이터가 존재하지 않습니다.')}
                  // 업무형 화면은 진입 애니메이션을 두지 않는다(카탈로그 §3 금지 목록).
                  enableSelection={canChangeUserStatus || canMoveUserDept || canDeleteUser}
                  bulkActions={userBulkActions}
                  className="border-none shadow-none bg-transparent"
                  // ⚠ 총 건수는 셸의 결과 툴바가 단독으로 소유한다 — 여기에 totalCount 를 다시 넘기면
                  //   같은 수치가 표 위아래로 두 번 나온다(work-list-adoption-census 가 red 로 막는다).
                  pagination={{
                      currentPage: userPage,
                      totalPages: usersData?.totalPage || 1,
                      pageSize: userPageSize,
                      onPageSizeChange: handlePageSizeChange,
                      pageSizeOptions: USER_PAGE_SIZE_OPTIONS,
                      onPageChange: goToPage
                  }}
              />
            )}
          </div>

          <div
            data-a2-detail={activeTab === 'DEPTS' ? '' : undefined}
            tabIndex={isDeptTab ? -1 : undefined}
            className={cn('min-w-0', isDeptTab ? 'h-full' : !selectedItem && 'hidden')}
          >
            <UserOrgDetailPanel
              isDeptTab={isDeptTab}
              selectedItem={selectedItem}
              displayedUser={displayedUser}
              detailActions={detailActions}
              selectedDeptParentId={selectedDeptParentId}
              departments={departments}
              deptMembersLabel={deptMembersLabel}
              canUpdateDept={canUpdateDept}
              selectedFlatDept={selectedFlatDept}
              flattenedDepts={flattenedDepts}
              isSaving={isSaving}
              isDeptModalOpen={isDeptModalOpen}
              onMoveDeptToParent={deptTree.moveDeptToParent}
              onShiftDept={deptTree.shiftDept}
              accessControlLinks={isDeptTab ? null : userAccessControlLinks({
                displayedUser, router, canAssignAuthority, canAuditAuthority, canOpenLoginLog, canRecoverMfa,
              })}
            />
          </div>
        </MasterDetailLayout>
      )}

      <StandardModal
        isOpen={isUserModalOpen}
        onClose={dialogs.handleCloseUserModal}
        title={formMode === 'create' ? '신규 사용자 등록' : '사용자 정보 수정'}
        maxWidth="2xl"
      >
        <UserManageForm
          // 수정 시드는 반드시 상세 레코드여야 한다. 목록 행에는 ognzId 가 없어 '' 로 왕복되고,
          // 부분수정 계약("" = 지움)이 실제 소속 부서를 지운다. [2026-10-18] 목록 행의 휴대전화·이메일은 가린 값이라
          // 목록 행으로는 시드하지 않는다 — 수정 버튼도 상세가 온 뒤에만 열린다.
          key={formMode === 'edit' ? `edit-${selectedUserDetail?.userId ?? ''}-detail` : 'create'}
          mode={formMode}
          initialData={formMode === 'edit' ? (selectedUserDetail as UserManage | undefined) : undefined}
          departments={departments}
          onSubmit={onUserSubmit}
          onCancel={dialogs.handleCloseUserModal}
          isPending={activeWriteOperation === 'user-form'}
          externalBusy={activeWriteOperation !== null && activeWriteOperation !== 'user-form'}
        />
      </StandardModal>

      <StandardModal
        isOpen={isPasswordModalOpen}
        onClose={dialogs.handleClosePasswordModal}
        title="비밀번호 초기화"
        maxWidth="md"
      >
        {/* 열릴 때마다 빈 폼으로 시작하도록 대상별 key 를 준다. */}
        <AdminPasswordResetForm
          key={`password-reset-${String(selectedItemId ?? '')}`}
          targetLabel={`${(selectedItem as UserManage)?.userNm ?? ''}${selectedItemId ? `(${String(selectedItemId)})` : ''}`.trim() || String(selectedItemId ?? '')}
          onSubmit={onPasswordResetSubmit}
          onCancel={dialogs.handleClosePasswordModal}
          isPending={activeWriteOperation === 'password-reset'}
          externalBusy={activeWriteOperation !== null && activeWriteOperation !== 'password-reset'}
        />
      </StandardModal>

      <StandardModal
        isOpen={isDeptModalOpen}
        onClose={dialogs.handleCloseDeptModal}
        title={formMode === 'create' ? '신규 부서 등록' : '부서 정보 수정'}
        maxWidth="lg"
      >
        <DepartmentForm
          mode={formMode}
          initialData={formMode === 'edit' ? (selectedItem as Department) : undefined}
          parentOptions={flattenedDepts
            .filter((dept) => dept.ognzId)
            .map((dept) => ({ ognzId: dept.ognzId as string, label: `${'　'.repeat(dept.depth)}${dept.ognzNm ?? dept.ognzId}` }))}
          onSubmit={onDeptSubmit}
          onCancel={dialogs.handleCloseDeptModal}
          isPending={activeWriteOperation === 'dept-form'}
          externalBusy={activeWriteOperation !== null && activeWriteOperation !== 'dept-form'}
        />
      </StandardModal>

      <UserOrgBulkStatusDialog
        isOpen={dialogs.isBulkStatusModalOpen}
        users={dialogs.selectedBulkItems}
        locked={isSaving}
        applyBusy={activeWriteOperation === 'bulk-status'}
        onClose={dialogs.handleCloseBulkStatusModal}
        status={dialogs.targetStatus}
        onStatusChange={dialogs.setTargetStatus}
        handleBulkStatusUpdate={handleBulkStatusUpdate}
      />
      <UserOrgBulkMoveDialog
        isOpen={dialogs.isBulkMoveModalOpen}
        users={dialogs.selectedBulkItems}
        locked={isSaving}
        moveBusy={activeWriteOperation === 'bulk-move'}
        onClose={dialogs.handleCloseBulkMoveModal}
        departments={flattenedDepts}
        isLoading={isDeptsLoading}
        departmentId={dialogs.targetDeptId}
        onDepartmentChange={dialogs.setTargetDeptId}
        handleBulkDeptMove={handleBulkDeptMove}
      />
    </WorkListPage>
  );
}
