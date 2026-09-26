'use client';

import React, { useState, useMemo, use, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Users,
  Network,
  UserMinus,
  ShieldCheck,
  Pencil,
  UserPlus,
  RefreshCcw,
  LayoutGrid,
  Save,
  KeyRound,
  Loader2,
  UserCheck,
  Trash2,
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
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { MasterDetailLayout } from '@/app/components/patterns/master-detail-page';
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { toDisplayYmd } from '@/lib/format-date';
import { PageResponse } from '@/types/foundation/system';
import { saveDeptHierarchyAction } from '@/app/actions/deptActions';
import {
  bulkUpdateUserStatusAction,
  bulkMoveUserDeptAction,
  bulkDeleteUsersAction
} from '@/app/actions/userActions';
import type { UserStatusCode } from '@/services/foundation/system/UserAdminService';

import { StandardModal } from '@/app/components/ui/standard-modal';

import { UserManageForm, UserFormValues } from '@/components/admin/user/UserManageForm';
import { AdminPasswordResetForm } from '@/components/admin/user/AdminPasswordResetForm';
import { DepartmentForm, DeptFormValues } from '@/components/admin/user/DepartmentForm';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import {
    DndContext,
    closestCenter,
    DragOverlay,
    MeasuringStrategy,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import {
  AbsenceStatusNotice,
  AccessControlLink,
  BulkSelectionSummary,
  DetailField,
  DetailFieldList,
  DetailScrollArea,
  dropAnimation,
  NavButton,
  OrgPolicyPanel,
  SortableDeptNode,
  UserOrgMasterSection,
  UserStatusBadge,
} from './UserOrgHubParts';
import { useDeptTree } from './useDeptTree';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 페이지 하나만 읽는다.
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const LIST_PARAM_KEYS = ['page'] as const;

type UserOrgWriteOperation =
  | 'user-form'
  | 'dept-form'
  | 'password-reset'
  | 'delete-user'
  | 'delete-dept'
  | 'bulk-delete'
  | 'bulk-status'
  | 'bulk-move'
  | 'dept-hierarchy';




type UserOrgTab = 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';

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

const USER_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * 서버 프리페치 결과. 실패 시 page.tsx 는 빈 목록이 아니라 `null` 을 넘긴다 —
 * 빈 목록을 시드로 쓰면 화면이 "데이터 0건"이라고 거짓말하기 때문이다(감사 P1-1).
 * null 이면 시드를 포기하고 클라이언트 쿼리가 즉시 재조회하여 실패를 그대로 노출한다.
 */
export type UserOrgPrefetch<T> = PageResponse<T> | null;



/** 소속 부서 표시 — 이름이 있으면 이름(ID), 목록에 없으면 ID 원문, 없으면 '미지정'. */
function departmentLabel(ognzId: string | null | undefined, departments: ReadonlyArray<{ ognzId?: string | null; ognzNm?: string | null }> | null | undefined): string {
  if (!ognzId) return '미지정';
  const name = departments?.find((dept) => dept?.ognzId === ognzId)?.ognzNm;
  return name ? `${name} (${ognzId})` : ognzId;
}

export default function UserOrgHubClient({
  defaultTab = 'USERS',
  usersPromise,
  deptsPromise
}: {
  defaultTab?: UserOrgTab;
  usersPromise: Promise<UserOrgPrefetch<UserManage>>;
  deptsPromise: Promise<UserOrgPrefetch<Department>>;
}) {
  const initialUsers = use(usersPromise);
  const initialDepts = use(deptsPromise);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = React.useTransition();
  const [activeTab, setActiveTab] = useState<UserOrgTab>(defaultTab);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeWriteOperation, setActiveWriteOperation] = useState<UserOrgWriteOperation | null>(null);
  const actionRequestRef = useRef<UserOrgWriteOperation | null>(null);
  const isSaving = activeWriteOperation !== null;
  /**
   * [2026-09-26 DIP C9] 검색어는 `조회`/Enter 로 적용된 값이다(카탈로그 G2). 종전에는 타이핑을 300ms 디바운스해 조회했고,
   * 그래서 `조회` 버튼이 죽은 컨트롤이 될까 봐 두지 않았다(G10). 이제 조회 버튼이 조건을 적용하는 유일한 경로다.
   * 부서 탭에서는 입력 중 재조회가 사라져, 저장하지 않은 드래그 중에 트리가 바뀌는 경로도 줄어든다.
   */
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

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

  const goToPage = React.useCallback((page: number) => {
    setUserPage(page);
    const next = pickAllowedParams(searchParams, LIST_PARAM_KEYS);
    if (page <= 1) next.delete('page');
    else next.set('page', String(page));
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  /** 탭 = 라우트. 현재 라우트가 가리키는 탭이면 이동하지 않는다(로그인정책/개인정보정책 공용 탭). */
  const handleTabChange = React.useCallback((tab: UserOrgTab) => {
    startTransition(() => {
      setActiveTab(tab);
      setSelectedItemId(null);
    });
    if (tab !== defaultTab) {
      router.push(TAB_ROUTE_MAP[tab]);
    }
  }, [defaultTab, router, startTransition]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Bulk Actions State
  const [selectedBulkItems, setSelectedBulkItems] = useState<UserManage[]>([]);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<UserStatusCode>('P');
  const [targetDeptId, setTargetDeptId] = useState('');


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

  const handleOpenUserCreate = () => {
    if (actionRequestRef.current) return;
    setFormMode('create');
    setIsUserModalOpen(true);
  };

  const handleOpenDeptCreate = () => {
    if (actionRequestRef.current) return;
    setFormMode('create');
    setIsDeptModalOpen(true);
  };

  const handleOpenUserEdit = () => {
    if (actionRequestRef.current) return;
    setFormMode('edit');
    setIsUserModalOpen(true);
  };

  const handleOpenDeptEdit = () => {
    if (actionRequestRef.current) return;
    setFormMode('edit');
    setIsDeptModalOpen(true);
  };

  /**
   * [2026-09-05] 관리자 비밀번호 초기화. API(`PATCH /admin/system/users/{userId}/password`)와
   * `userAdminService.updatePassword` 는 있었지만 호출부가 0건이라, 비밀번호를 잊은 사용자를
   * UI 안에서 구제할 경로가 없었다(로그인 화면에는 비밀번호 찾기가 없다).
   */
  const handleOpenPasswordReset = () => {
    if (actionRequestRef.current || !selectedItemId) return;
    setIsPasswordModalOpen(true);
  };

  const handleClosePasswordModal = () => {
    if (actionRequestRef.current) return;
    setIsPasswordModalOpen(false);
  };

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

  const handleCloseUserModal = () => {
    if (actionRequestRef.current) return;
    setIsUserModalOpen(false);
  };

  const handleCloseDeptModal = () => {
    if (actionRequestRef.current) return;
    setIsDeptModalOpen(false);
  };

  const handleCloseBulkStatusModal = () => {
    if (actionRequestRef.current) return;
    setIsBulkStatusModalOpen(false);
  };

  const handleCloseBulkMoveModal = () => {
    if (actionRequestRef.current) return;
    setIsBulkMoveModalOpen(false);
  };



  const { data: usersData, isLoading: isUsersLoading, isError: isUsersError, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', searchKeyword, userPage, userPageSize],
    // 서버(GET /admin/system/users)는 searchKeyword + Spring Pageable(page/size, 0-based)만 읽는다.
    // 종전의 {pageNo}는 ApiService 매핑 대상도 Pageable 파라미터도 아니라 그대로 무시됐고,
    // 몇 페이지를 눌러도 항상 첫 페이지가 왔다(死 페이저 — 감사 m-2).
    queryFn: () => userAdminService.getUserList({ page: userPage - 1, size: userPageSize, searchKeyword: searchKeyword }),
    enabled: activeTab === 'USERS' || activeTab === 'ABSENCES',
    // 서버 프리페치가 실패했다면(null) 시드를 쓰지 않는다 — 빈 목록을 시드로 넣으면
    // staleTime 동안 재조회가 막혀 조회 실패가 '0건'으로 위장된다(감사 P1-1).
    initialData: (userPage === 1 && userPageSize === 10 && !searchKeyword) ? (initialUsers ?? undefined) : undefined
  });
  const users = useMemo(() => {
    const list = usersData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as UserManage[];
  }, [usersData]);

  /** 페이지당 건수를 바꾸면 현재 페이지 번호가 의미를 잃으므로 1페이지로 되돌린다. */
  const handlePageSizeChange = React.useCallback((size: number) => {
    setUserPageSize(size);
    goToPage(1);
  }, [goToPage]);

  /*
    [2026-09-07] 부재(자리비움) 배선. 종전에는 이 탭이 전체 사용자를 그린 뒤 "부재 정보는 아직
    연동되지 않았습니다" 라고 고지만 했다(operation-consumer-census 의 unwired 부채).

    ⚠ 조인 축은 esntlId 다 — tb_user_absn.user_id 는 이름과 달리 로그인 ID 가 아니라 사용자 PK 이고
      FK 도 tb_user_info(esntl_id) 를 가리킨다(V2_14). 반면 이 허브의 selectedItemId 는 userId(로그인 ID)라
      두 키가 다르므로, 부재 상태는 반드시 사용자 행의 esntlId 로 찾는다.

    ⚠ 서버는 '기록이 있는 사용자' 만 돌려준다 — 목록에 없는 사용자는 부재가 아니며, 복귀한 사용자는
      userAbsnYn='N' 행으로 남는다. 그래서 '없음 = 정상' 과 'N = 정상' 을 같게 다룬다.
  */
  const {
    data: absenceRecords,
    isLoading: isAbsencesLoading,
    isError: isAbsencesError,
    error: absencesError,
    refetch: refetchAbsences,
  } = useQuery({
    queryKey: ['admin-user-absences'],
    queryFn: () => userAbsenceAdminService.getAbsences(),
    enabled: activeTab === 'ABSENCES',
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
      toast(extractErrorMessage(error, '부재 상태를 변경하지 못했습니다.'), 'error');
    } finally {
      absencePendingRef.current = false;
      setAbsencePendingId(null);
    }
  };

  /**
   * 검색 입력은 사용자/부서 탭이 공유한다. USERS 탭에서 입력한 사용자 검색어가 부서 조회에 섞이면
   * '부서 이동' 모달의 대상 목록이 그 키워드로 걸러져 비어 버린다 — 부서 탭에서만 키워드를 태운다.
   */
  const deptKeyword = activeTab === 'DEPTS' ? searchKeyword : '';
  const {
    isDeptsLoading,
    isDeptsError,
    deptsError,
    refetchDepts,
    departments,
    deptTotal,
    flattenedDepts,
    activeDeptId,
    hasDeptChanges,
    setHasDeptChanges,
    previewDepts,
    sensors,
    dragHandlers: deptDragHandlers,
  } = useDeptTree({
    deptKeyword,
    initialDepts,
    // [2026-09-26 DIP V9] 사용자를 고르면 상세의 소속을 이름으로 보이도록 부서 목록도 읽는다(캐시 공유).
    enabled: activeTab === 'DEPTS' || isBulkMoveModalOpen || isUserModalOpen
      || (activeTab === 'USERS' && selectedItemId !== null),
    onDragSelect: setSelectedItemId,
  });

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
      const message = error instanceof Error ? error.message : '사용자 저장 중 오류가 발생했습니다.';
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

  const handleDeleteUser = async () => {
    const operation = 'delete-user' as const;
    if (!selectedItemId || !beginNonFormAction(operation)) return;

    try {
      // 확인 본문에 대상 식별자(이름·아이디)를 노출한다 — 무엇을 지우는지 모른 채 누르는 오삭제 방지(감사 P1-9).
      const targetName = (selectedItem as UserManage)?.userNm ?? String(selectedItemId);
      const ok = await confirm({
        title: '사용자 삭제',
        message: `'${targetName}(${selectedItemId})' 사용자의 계정과 접근 권한을 영구히 삭제합니다. 되돌릴 수 없습니다. 계속하시겠습니까?`,
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
      const message = error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다.';
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
      const message = error instanceof Error ? error.message : '부서 삭제 중 오류가 발생했습니다.';
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
        message: `${userItems.length}명의 계정을 영구히 삭제합니다. 되돌릴 수 없습니다.\n대상: ${preview}`,
        variant: 'destructive',
        confirmText: '삭제'
      });
      if (ok) {
        const res = await bulkDeleteUsersAction(userItems.map(u => u.userId));
        toast(res.message, res.success ? 'success' : 'error');
        if (res.success) refetchUsers();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : '일괄 삭제 중 오류가 발생했습니다.', 'error');
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



  const userBulkActions = [
    {
      label: '상태 변경',
      icon: <Activity size={16} />,
      disabled: isSaving,
      onClick: (items: (UserManage | Department)[]) => {
        if (actionRequestRef.current) return;
        setSelectedBulkItems(items as UserManage[]);
        setIsBulkStatusModalOpen(true);
      }
    },
    {
      label: '부서 이동',
      icon: <Network size={16} />,
      disabled: isSaving,
      onClick: (items: (UserManage | Department)[]) => {
        if (actionRequestRef.current) return;
        setSelectedBulkItems(items as UserManage[]);
        setIsBulkMoveModalOpen(true);
      }
    },

    {
      label: '일괄 삭제',
      icon: <UserMinus size={16} />,
      variant: 'destructive' as const,
      disabled: isSaving,
      ariaBusy: activeWriteOperation === 'bulk-delete',
      pendingLabel: '일괄 삭제 처리 중…',
      onClick: handleBulkDelete
    }
  ];

  // 조회 실패는 목록 영역에 ErrorStateDisplay(다시 시도 버튼 포함)로 상주 노출한다.
  // 사라지는 토스트만으로는 "데이터 없음"과 구분되지 않는다(감사 P1-1).

  // 탭 분기를 memo 안에 두면 분기마다 계산이 달라 컴파일러가 단일 메모 스코프로 보존하지 못한다
  // (react-hooks/preserve-manual-memoization → 컴포넌트 전체 최적화 스킵).
  // 조회는 컬렉션별로 선형 memo 로 분리하고, 탭 선택은 할당 없는 삼항으로 밖에서 처리한다.
  // 부수 효과로 activeTab 만 바뀔 때 find() 를 다시 돌지 않는다.
  const selectedUser = useMemo(
    () => (selectedItemId ? (users || []).find(u => u?.userId === selectedItemId) : undefined),
    [selectedItemId, users]
  );
  const selectedDept = useMemo(
    () => (selectedItemId ? (departments || []).find(d => d?.ognzId === selectedItemId) : undefined),
    [selectedItemId, departments]
  );
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

  const handleSaveDeptHierarchy = async () => {
    const operation = 'dept-hierarchy' as const;
    // A2 계약: 선택한 마스터 항목이 없거나 실제 변경이 없으면 저장하지 않는다.
    if (!selectedDept || !hasDeptChanges || isDeptModalOpen || !beginNonFormAction(operation)) return;

    try {
      const res = await saveDeptHierarchyAction(flattenedDepts);
      if (res.success) {
        toast(res.message, 'success');
        setHasDeptChanges(false);
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

  /**
   * 목록 열.
   *
   * ⚠ 종전에는 아바타 이니셜 + 이름 + ID 한 덩어리가 유일한 열이었다. 목록 API 는 직함·이메일·
   *   연락처·등록일까지 내려주는데(UserRepositoryImpl 의 10필드 projection) 화면이 그중 둘만 그려,
   *   사용자는 누구인지 확인하려면 행마다 상세를 열어야 했다. 서버가 이미 보낸 값을 열로 편다.
   */
  const userColumns: Column<UserManage>[] = [
    { header: '이름', sortKey: 'userNm', className: 'w-36', accessor: (user) => (
      <span className="font-semibold text-foreground">{user.userNm}</span>
    ) },
    { header: '사용자 ID', sortKey: 'userId', className: 'w-36', accessor: (user) => (
      <span className="tabular-nums text-muted-foreground">{user.userId}</span>
    ) },
    // 부재 탭은 부재 여부·조치가 주 관심사이므로 연락 정보 대신 그 두 열을 붙인다(G9 — 열 과밀 금지).
    ...(activeTab === 'ABSENCES' ? ([
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
      {
        header: '조치',
        className: 'text-right w-36',
        accessor: (user: UserManage) => {
          const state = absenceOf(user);
          if (state === null) return null;
          const isPending = absencePendingId !== null && absencePendingId === user.esntlId;
          const label = state === ABSENT
            ? `${user.userNm ?? user.userId} 복귀 처리`
            : `${user.userNm ?? user.userId} 부재 처리`;
          return (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={absencePendingId !== null}
                aria-busy={isPending}
                aria-label={isPending ? `${label} 중` : label}
                onClick={(event) => { event.stopPropagation(); void handleToggleAbsence(user); }}
                className="gap-1.5"
              >
                {isPending
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
      },
    ] satisfies Column<UserManage>[]) : ([
      {
        header: '직함',
        className: 'w-32',
        accessor: (user: UserManage) => user.ofcpsNm || <span className="text-muted-foreground">-</span>,
      },
      {
        header: '이메일',
        accessor: (user: UserManage) => (
          user.emlAddr
            ? <span className="break-all text-muted-foreground">{user.emlAddr}</span>
            : <span className="text-muted-foreground">-</span>
        ),
      },
      {
        header: '연락처',
        className: 'w-32',
        accessor: (user: UserManage) => (
          <span className="tabular-nums text-muted-foreground">{user.mblTelno || '-'}</span>
        ),
      },
      {
        header: '등록일',
        sortKey: 'crtDt',
        className: 'w-28',
        // crtDt 는 Jackson 이 직렬화한 LocalDateTime(타임존 없음)이다. `new Date()` 로 해석하면
        // 로컬 타임존만큼 날짜가 밀 수 있으므로 문자열 앞 10자리를 그대로 표기한다.
        accessor: (user: UserManage) => (
          <span className="tabular-nums text-muted-foreground">{toDisplayYmd(user.crtDt?.slice(0, 10))}</span>
        ),
      },
    ] satisfies Column<UserManage>[])),
  ];

  const meta = TAB_META[activeTab];
  const isPolicies = activeTab === 'POLICIES';
  const isDeptTab = activeTab === 'DEPTS';
  /** 조회가 실패했으면 총 건수를 0 으로 말하지 않는다 — 모르는 것과 0건은 다르다. */
  const toolbarTotalCount = isPolicies
    ? undefined
    : isDeptTab
      // ⚠ flattenedDepts.length 를 쓰면 안 된다 — effect 파생이라 SSR·첫 렌더와 재조회 중에
      //   0 이 되어 데이터가 있는데도 '총 0건' 이라고 말한다(useDeptTree.deptTotal 주석 참조).
      ? (isDeptsError ? undefined : deptTotal)
      : (isUsersError ? undefined : usersData?.total);

  /** 현재 페이지가 보여주는 구간. 총 건수가 0 이거나 모르면 말하지 않는다. */
  const userRowRange = (!isPolicies && !isDeptTab && !isUsersError && usersData?.total)
    ? {
        from: (userPage - 1) * userPageSize + 1,
        to: Math.min(userPage * userPageSize, usersData.total),
      }
    : null;

  const detailActions = isDeptTab ? (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="정보 수정"
        disabled={isSaving}
        onClick={handleOpenDeptEdit}
        className="gap-1.5"
      >
        <Pencil size={14} aria-hidden="true" /> 정보 수정
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDeleteDept}
        disabled={isSaving}
        aria-busy={activeWriteOperation === 'delete-dept' || undefined}
        className="gap-1.5"
      >
        <Trash2 size={14} aria-hidden="true" />
        {activeWriteOperation === 'delete-dept' ? '부서 삭제 중…' : '부서 삭제'}
      </Button>
    </>
  ) : (
    <>
      {/* 종전에는 같은 `handleOpenUserEdit` 를 부르는 버튼이 패널 우상단(아이콘)과 하단(CTA)에
          두 벌 있었다 — 같은 명령을 두 곳에 두면 어느 쪽이 무엇을 하는지 판정 비용만 는다(G10). */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="정보 수정"
        disabled={isSaving}
        onClick={handleOpenUserEdit}
        className="gap-1.5"
      >
        <Pencil size={14} aria-hidden="true" /> 정보 수정
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpenPasswordReset}
        disabled={isSaving}
        className="gap-1.5"
      >
        <KeyRound size={14} aria-hidden="true" /> 비밀번호 초기화
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDeleteUser}
        disabled={isSaving}
        aria-busy={activeWriteOperation === 'delete-user' || undefined}
        className="gap-1.5"
      >
        <Trash2 size={14} aria-hidden="true" />
        {/* 실제 동작은 계정 삭제다. '접근 차단'은 무엇을 하는지 오인시킨다. */}
        {activeWriteOperation === 'delete-user' ? '사용자 삭제 중…' : '사용자 삭제'}
      </Button>
    </>
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
      actions={isDeptTab ? (
        <Button type="button" onClick={handleOpenDeptCreate} disabled={isSaving} className="gap-2">
          <LayoutGrid size={16} aria-hidden="true" /> 부서 등록
        </Button>
      ) : activeTab === 'USERS' ? (
        <Button type="button" onClick={handleOpenUserCreate} disabled={isSaving} className="gap-2">
          <UserPlus size={16} aria-hidden="true" /> 사용자 등록
        </Button>
      ) : undefined}
      navigation={(
        <nav
          aria-label="사용자 및 조직 관리 화면 전환"
          className="flex w-fit max-w-full flex-wrap rounded-md border border-border bg-muted/50 p-0.5"
        >
          <NavButton icon={<Users size={14} />} label="사용자" active={activeTab === 'USERS'} onClick={() => handleTabChange('USERS')} />
          <NavButton icon={<Network size={14} />} label="부서 관리" active={isDeptTab} onClick={() => handleTabChange('DEPTS')} />
          <NavButton icon={<UserMinus size={14} />} label="부재 상태 관리" active={activeTab === 'ABSENCES'} onClick={() => handleTabChange('ABSENCES')} />
          <NavButton icon={<ShieldCheck size={14} />} label="조직 정책" active={isPolicies} onClick={() => handleTabChange('POLICIES')} />
        </nav>
      )}
      filter={isPolicies ? undefined : (
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
              onSearch={(next) => {
                setSearchKeyword(next);
                if (isDeptTab) setSelectedItemId(null);
                if (userPage !== 1) goToPage(1);
              }}
            />
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
      )}
      toolbarActions={isPolicies ? undefined : (
        <>
        {/* 표 하단의 'N–M번째' 는 StandardDataTable 이 pagination.totalCount 를 받을 때만 그리는데,
            총 건수는 셸 툴바가 단독 소유해야 해서(이중 표기 금지) 표에 넘기지 않는다. 그 결과 사라지는
            "지금 몇 번째를 보고 있는가" 를 여기서 직접 말한다. */}
        {userRowRange && (
          <span className="text-[length:var(--font-size-body)] text-muted-foreground tabular-nums">
            {userRowRange.from.toLocaleString()}–{userRowRange.to.toLocaleString()}번째
          </span>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          // 무인자 invalidateQueries() 는 메뉴·알림 등 이 화면과 무관한 캐시까지
          // 전부 재요청시킨다 — 이 화면이 쓰는 두 키로 좁힌다(감사 P2).
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
          }}
          className="gap-1.5"
        >
          <RefreshCcw size={14} aria-hidden="true" className={cn((isUsersLoading || isDeptsLoading) && 'animate-spin')} />
          새로고침
        </Button>
        </>
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
              <UserOrgMasterSection
                title="조직 구조"
                description="끌어서 순서를 바꾸고 오른쪽으로 밀어 하위 부서로 만듭니다."
                icon={Network}
                tools={(
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveDeptHierarchy}
                    disabled={!hasDeptChanges || !selectedDept || isSaving || isDeptModalOpen}
                    aria-busy={activeWriteOperation === 'dept-hierarchy' || undefined}
                    className="gap-1.5"
                  >
                    {activeWriteOperation === 'dept-hierarchy'
                      ? <RefreshCcw size={14} className="animate-spin" aria-hidden="true" />
                      : <Save size={14} aria-hidden="true" />}
                    {activeWriteOperation === 'dept-hierarchy' ? '조직 계층 저장 중…' : '조직 계층 저장'}
                  </Button>
                )}
              >
                {/* ⚠ 이 스크롤 영역은 DEPTS 전용이다 — USERS·ABSENCES 는 표가 자기 스크롤을 소유하므로
                    여기에 탭 분기를 두면 도달할 수 없는 가지가 된다. A2 census 는 이 라벨을
                    부서 마스터 스크롤 영역의 이름으로 고정한다. */}
                <div
                  role="region"
                  aria-label="부서 조직 구조"
                  tabIndex={0}
                  className="max-h-[60vh] min-h-0 flex-1 overflow-y-auto pr-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {/* 조직도는 테이블이 아니라 D&D 트리다. 실패를 토스트로만 알리면 화면은
                      '부서 0건'으로 남아 조회 실패와 구분되지 않는다(감사 P1-1). */}
                  {isDeptsError ? (
                    <ErrorStateDisplay error={deptsError} onRetry={() => refetchDepts()} />
                  ) : (
                    <>
                      <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                          {...deptDragHandlers}
                      >
                          <SortableContext items={previewDepts.map(n => n.ognzId || '')} strategy={verticalListSortingStrategy}>
                              <div className="space-y-0.5">
                                  {previewDepts.map((node, index) => (
                                      <SortableDeptNode
                                          key={node.ognzId}
                                          node={node}
                                          isSelected={selectedItemId === node.ognzId}
                                          isTabStop={selectedItemId === node.ognzId || (selectedItemId === null && index === 0)}
                                          onClick={() => setSelectedItemId(node.ognzId || null)}
                                      />
                                  ))}
                              </div>
                          </SortableContext>

                          {typeof document !== 'undefined' && createPortal(
                              <DragOverlay dropAnimation={dropAnimation}>
                                  {activeDeptId ? (
                                      <SortableDeptNode
                                          node={flattenedDepts.find(n => n.ognzId === activeDeptId)!}
                                          isSelected={false}
                                          isTabStop={false}
                                          onClick={() => {}}
                                          isOverlay
                                      />
                                  ) : null}
                              </DragOverlay>,
                              document.body
                          )}
                      </DndContext>
                      {flattenedDepts.length === 0 && !isDeptsLoading && (
                          <p className="py-10 text-center text-[length:var(--font-size-body)] text-muted-foreground">
                            {deptKeyword
                              ? `'${deptKeyword}' 에 해당하는 부서가 없습니다.`
                              : '등록된 부서가 없습니다. 오른쪽 위 부서 등록으로 첫 부서를 만듭니다.'}
                          </p>
                      )}
                    </>
                  )}
                </div>
              </UserOrgMasterSection>
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
                  emptyMessage={emptyResultMessage(searchKeyword, '데이터가 존재하지 않습니다.')}
                  // 업무형 화면은 진입 애니메이션을 두지 않는다(카탈로그 §3 금지 목록).
                  enableSelection={true}
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
            {selectedItem ? (
              <section className="flex h-full min-h-0 flex-col rounded-md border border-border bg-card">
                <header className="flex flex-wrap items-start justify-between gap-2 border-b border-border px-[var(--filter-pad)] py-2">
                  <div className="min-w-0">
                    {/* ⚠ 제목에는 이름만 둔다 — 단위 테스트가 `heading level 2` 의 접근 이름을
                        이름 문자열과 정확히 대조한다. 식별자·배지는 아래 줄이 갖는다. */}
                    <h2 className="break-words text-[length:var(--font-size-body)] font-semibold text-foreground">
                      {isDeptTab ? (selectedItem as Department)?.ognzNm : displayedUser?.userNm}
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {isDeptTab ? (selectedItem as Department)?.ognzId : displayedUser?.userId}
                      </span>
                      {/* 종전에는 상태와 무관하게 '인증됨' 이 항상, ABSENCES 탭에서는 전원 '자리비움' 이
                          표시됐다. 실제 계정 상태 코드(userSttsCd)에서만 배지를 만든다(감사 P1-5).
                          목록 projection 에는 userSttsCd 가 없다 — 상세 API 데이터로만 그린다. */}
                      {!isDeptTab && displayedUser?.userSttsCd && (
                        <UserStatusBadge code={displayedUser.userSttsCd} />
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    {detailActions}
                  </div>
                </header>

                <DetailScrollArea>
                  {/* '근무지: 본사' 는 어떤 데이터로도 뒷받침되지 않는 고정 문구여서 제거했다(감사 P1-5). */}
                  {isDeptTab ? (
                    /* 부서 코드·사용자 ID 는 패널 제목 아래 부제가 이미 말한다 — 같은 값을
                       항목으로 한 번 더 두면 여덟 칸 중 한 칸이 중복에 쓰인다. */
                    <DetailFieldList>
                      <DetailField label="상위 부서" value={(selectedItem as Department)?.upOgnzId || '최상위'} />
                      <DetailField
                        label="부서 설명"
                        span
                        value={(selectedItem as Department)?.ognzExpln || '미등록'}
                      />
                    </DetailFieldList>
                  ) : (
                    <DetailFieldList>
                      <DetailField label="사번" value={displayedUser?.emplNo || '미지정'} />
                      <DetailField label="직함" value={displayedUser?.ofcpsNm || '미지정'} />
                      {/* 소속은 목록 projection 에 없다 — 상세 API(displayedUser)에서만 나온다.
                          [2026-09-26 DIP V9] 부서 ID 대신 이름을 보인다. 목록에 없는 ID 는 원문으로 남겨 잘못된 소속을 찾게 한다. */}
                      <DetailField label="소속 부서" value={departmentLabel(displayedUser?.ognzId, departments)} />
                      <DetailField label="권한 그룹" value={displayedUser?.groups?.length ? displayedUser.groups.join(', ') : '없음'} />
                      <DetailField label="이메일 주소" value={displayedUser?.emlAddr || '미지정'} />
                      <DetailField label="휴대전화" value={displayedUser?.mblTelno || '미등록'} />
                      <DetailField label="사무실 전화" value={displayedUser?.officeTelno || '미등록'} />
                      <DetailField label="등록일" value={toDisplayYmd(displayedUser?.crtDt?.slice(0, 10))} />
                    </DetailFieldList>
                  )}

                  {!isDeptTab && <AccessControlLink onOpen={() => router.push('/admin/security/authority')} />}
                </DetailScrollArea>
              </section>
            ) : isDeptTab ? (
              /* 미선택 안내. 종전에는 `p-20` + 점선 4px 테두리 + 96px 아이콘 상자 + 장식 아이콘
                 3개로 세로 400px 이상을 썼다 — 아무 정보도 없는 영역이다. 한 줄로 줄인다.
                 ⚠ role="status" 와 이 문구는 단위 테스트에 고정돼 있다.
                 USERS·ABSENCES 는 이 자리를 아예 비운다 — 안 고른 상태에서 화면 3분의 1을
                 빈 상자에 내주는 대신 목록이 전폭을 쓴다. */
              <p
                role="status"
                className="rounded-md border border-dashed border-border bg-muted/30 px-[var(--filter-pad)] py-6 text-center text-[length:var(--font-size-body)] text-muted-foreground"
              >
                왼쪽 조직 구조에서 확인하거나 편집할 부서를 선택하세요.
              </p>
            ) : null}
          </div>
        </MasterDetailLayout>
      )}

      <StandardModal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        title={formMode === 'create' ? '신규 사용자 등록' : '사용자 정보 수정'}
        maxWidth="2xl"
      >
        <UserManageForm
          // 수정 시드는 반드시 상세 레코드여야 한다. 목록 행에는 ognzId 가 없어 '' 로 왕복되고,
          // 부분수정 계약("" = 지움)이 실제 소속 부서를 지운다. 상세가 뒤늦게 도착하면
          // key 로 폼을 다시 시드한다(defaultValues 는 최초 마운트에만 반영되기 때문).
          key={formMode === 'edit' ? `edit-${displayedUser?.userId ?? ''}-${selectedUserDetail ? 'detail' : 'list'}` : 'create'}
          mode={formMode}
          initialData={formMode === 'edit' ? displayedUser : undefined}
          departments={departments}
          onSubmit={onUserSubmit}
          onCancel={handleCloseUserModal}
          isPending={activeWriteOperation === 'user-form'}
          externalBusy={activeWriteOperation !== null && activeWriteOperation !== 'user-form'}
        />
      </StandardModal>

      <StandardModal
        isOpen={isPasswordModalOpen}
        onClose={handleClosePasswordModal}
        title="비밀번호 초기화"
        maxWidth="md"
      >
        {/* 열릴 때마다 빈 폼으로 시작하도록 대상별 key 를 준다. */}
        <AdminPasswordResetForm
          key={`password-reset-${String(selectedItemId ?? '')}`}
          targetLabel={`${(selectedItem as UserManage)?.userNm ?? ''}${selectedItemId ? `(${String(selectedItemId)})` : ''}`.trim() || String(selectedItemId ?? '')}
          onSubmit={onPasswordResetSubmit}
          onCancel={handleClosePasswordModal}
          isPending={activeWriteOperation === 'password-reset'}
          externalBusy={activeWriteOperation !== null && activeWriteOperation !== 'password-reset'}
        />
      </StandardModal>

      <StandardModal
        isOpen={isDeptModalOpen}
        onClose={handleCloseDeptModal}
        title={formMode === 'create' ? '신규 부서 등록' : '부서 정보 수정'}
        maxWidth="lg"
      >
        <DepartmentForm
          mode={formMode}
          initialData={formMode === 'edit' ? (selectedItem as Department) : undefined}
          onSubmit={onDeptSubmit}
          onCancel={handleCloseDeptModal}
          isPending={activeWriteOperation === 'dept-form'}
          externalBusy={activeWriteOperation !== null && activeWriteOperation !== 'dept-form'}
        />
      </StandardModal>

      {/* Bulk Status Modal */}
      <StandardModal
        isOpen={isBulkStatusModalOpen}
        onClose={handleCloseBulkStatusModal}
        title="사용자 상태 일괄 변경"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <BulkSelectionSummary users={selectedBulkItems} />

          <div className="space-y-2">
            {/* 폼 컨트롤이 아니라 버튼 그룹이므로 <label> 이 아니라 radiogroup 으로 이름을 붙인다(감사 P2). */}
            <p id="bulk-status-label" className="text-[length:var(--font-size-body)] font-semibold text-foreground">변경할 상태 선택</p>
            <div role="radiogroup" aria-labelledby="bulk-status-label" className="grid grid-cols-1 gap-1.5">
              {([
                { code: 'P', label: '정상', dot: 'bg-success' },
                { code: 'A', label: '승인 대기', dot: 'bg-warning' },
                { code: 'D', label: '비활성', dot: 'bg-muted-foreground' }
              ] satisfies { code: UserStatusCode; label: string; dot: string }[]).map(s => (
                <button
                  key={s.code}
                  type="button"
                  role="radio"
                  aria-checked={targetStatus === s.code}
                  disabled={isSaving}
                  onClick={() => setTargetStatus(s.code)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left transition-colors",
                    targetStatus === s.code ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <span className={cn("size-2 shrink-0 rounded-full", s.dot)} aria-hidden="true" />
                  <span className="text-[length:var(--font-size-body)] font-medium text-foreground">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={handleCloseBulkStatusModal}
            >
              취소
            </Button>
            <Button
              onClick={() => void handleBulkStatusUpdate()}
              disabled={isSaving}
              aria-busy={activeWriteOperation === 'bulk-status' || undefined}
              className="gap-1.5"
            >
              {activeWriteOperation === 'bulk-status' ? (
                <><RefreshCcw size={14} className="animate-spin" aria-hidden="true" /> 상태 일괄 적용 중…</>
              ) : '상태 일괄 적용'}
            </Button>
          </div>
        </div>
      </StandardModal>

      {/* Bulk Move Modal */}
      <StandardModal
        isOpen={isBulkMoveModalOpen}
        onClose={handleCloseBulkMoveModal}
        title="부서 일괄 이동"
        maxWidth="md"
      >
        <div className="space-y-4">
          <BulkSelectionSummary users={selectedBulkItems} />

          <div className="space-y-2">
            <p id="bulk-dept-label" className="text-[length:var(--font-size-body)] font-semibold text-foreground">이동할 대상 부서 선택</p>
            <div role="radiogroup" aria-labelledby="bulk-dept-label" className="max-h-[320px] overflow-y-auto rounded-md border border-border bg-muted/20 p-2">
              {flattenedDepts.length === 0 && (
                <p className="py-8 text-center text-[length:var(--font-size-body)] text-muted-foreground">
                  {isDeptsLoading ? '부서 목록을 불러오는 중입니다...' : '이동할 수 있는 부서가 없습니다.'}
                </p>
              )}
              {flattenedDepts.map((node) => (
                <div
                  key={node.ognzId}
                  style={{ paddingLeft: `${node.depth * 16}px` }}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={targetDeptId === node.ognzId}
                    disabled={isSaving}
                    onClick={() => setTargetDeptId(node.ognzId || '')}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors",
                      targetDeptId === node.ognzId ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    )}
                  >
                    <span className="min-w-0 truncate text-[length:var(--font-size-body)]">{node.ognzNm}</span>
                    <span className="ml-auto shrink-0 text-xs tabular-nums opacity-70">{node.ognzId}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={handleCloseBulkMoveModal}
            >
              취소
            </Button>
            <Button
              onClick={() => void handleBulkDeptMove()}
              disabled={isSaving}
              aria-busy={activeWriteOperation === 'bulk-move' || undefined}
              className="gap-1.5"
            >
              {activeWriteOperation === 'bulk-move' ? (
                <><RefreshCcw size={14} className="animate-spin" aria-hidden="true" /> 부서 이동 실행 중…</>
              ) : '부서 이동 실행'}
            </Button>
          </div>
        </div>
      </StandardModal>
    </WorkListPage>
  );
}
