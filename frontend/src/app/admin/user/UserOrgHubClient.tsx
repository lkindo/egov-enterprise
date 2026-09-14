'use client';

import React, { useState, useMemo, use, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/app/components/layout/page-header';
import {
  Users,
  Network,
  UserMinus,
  ShieldCheck,
  Search,
  Pencil,
  UserPlus,
  Building2,
  Activity,
  ChevronRight,
  Mail,
  Phone,
  RefreshCcw,
  LayoutGrid,
  Zap,
  Fingerprint,
  SearchCode,
  ShieldAlert,
  Database,
  Contact2,
  SearchSlash,
  Save,
  KeyRound,
  Loader2,
  UserCheck } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
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
import { motion, AnimatePresence } from 'framer-motion';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { MasterDetailLayout } from '@/app/components/patterns/master-detail-page';
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { PageResponse } from '@/types/foundation/system';
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
  dropAnimation,
  InfoBlock,
  NavButton,
  OrgPolicyPanel,
  SortableDeptNode,
  USER_STATUS_LABELS,
  UserOrgMasterSection,
} from './UserOrgHubParts';
import { useDeptTree } from './useDeptTree';

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
 * 서버 프리페치 결과. 실패 시 page.tsx 는 빈 목록이 아니라 `null` 을 넘긴다 —
 * 빈 목록을 시드로 쓰면 화면이 "데이터 0건"이라고 거짓말하기 때문이다(감사 P1-1).
 * null 이면 시드를 포기하고 클라이언트 쿼리가 즉시 재조회하여 실패를 그대로 노출한다.
 */
export type UserOrgPrefetch<T> = PageResponse<T> | null;


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
  const [searchKeyword, setSearchKeyword] = useState('');
  /** 타이핑 한 글자마다 서버를 때리지 않도록 300ms 디바운스한다(감사 P1-8). */
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  /** 페이지 번호는 URL 에 반영한다 — 새로고침·공유·뒤로가기가 복원된다(감사 P1-7). */
  const [userPage, setUserPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });

  /** 라우트(=탭) 이동 시 서버가 내려준 defaultTab 으로 동기화한다. */
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const goToPage = React.useCallback((page: number) => {
    setUserPage(page);
    const next = new URLSearchParams(searchParams.toString());
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

  const [targetStatus, setTargetStatus] = useState('P');
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
    queryKey: ['admin-users', debouncedKeyword, userPage],
    // 서버(GET /admin/system/users)는 searchKeyword + Spring Pageable(page/size, 0-based)만 읽는다.
    // 종전의 {pageNo}는 ApiService 매핑 대상도 Pageable 파라미터도 아니라 그대로 무시됐고,
    // 몇 페이지를 눌러도 항상 첫 페이지가 왔다(死 페이저 — 감사 m-2).
    queryFn: () => userAdminService.getUserList({ page: userPage - 1, size: 10, searchKeyword: debouncedKeyword }),
    enabled: activeTab === 'USERS' || activeTab === 'ABSENCES',
    // 서버 프리페치가 실패했다면(null) 시드를 쓰지 않는다 — 빈 목록을 시드로 넣으면
    // staleTime 동안 재조회가 막혀 조회 실패가 '0건'으로 위장된다(감사 P1-1).
    initialData: (userPage === 1 && !debouncedKeyword) ? (initialUsers ?? undefined) : undefined
  });
  const users = useMemo(() => {
    const list = usersData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as UserManage[];
  }, [usersData]);

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
  const deptKeyword = activeTab === 'DEPTS' ? debouncedKeyword : '';
  const {
    isDeptsLoading,
    isDeptsError,
    deptsError,
    refetchDepts,
    departments,
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
    enabled: activeTab === 'DEPTS' || isBulkMoveModalOpen || isUserModalOpen,
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

  const userColumns: Column<UserManage>[] = [
    {
      header: '사용자 정보',
      accessor: (user) => (
        <div className="flex items-center gap-4 py-1">
          <div className={cn(
            "w-12 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-md transition-transform group-hover:rotate-6",
            // [2026-09-07] selectedItemId 는 onRowClick·keyField·상세조회가 모두 쓰는 userId(로그인 ID)인데
            //   이 두 줄만 esntlId 와 비교해 **선택 강조가 한 번도 켜지지 않았다**. 부재 배선이 같은 파일에
            //   esntlId 축을 새로 들여오므로, 어느 키가 선택 키인지 모호한 채로 두지 않는다.
            selectedItemId === user?.userId ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          )}>
            {user?.userNm?.[0]}
          </div>
          <div className="space-y-0.5">
            {/* 표 셀 안의 이름 라벨이지 절 제목이 아니다 — h4 는 h1 뒤에 단계를 건너뛰어 heading-order 위반이었다(axe). */}
            <span className={cn("block text-sm font-black tracking-tighter leading-none ", selectedItemId === user.userId ? "text-white" : "text-foreground")}>
              {user.userNm}
            </span>
            <p className="text-[10px] font-bold tracking-tight text-muted-foreground">{user.userId}</p>
          </div>
        </div>
      )
    },
    // 부재 탭에서만 상태·조치 열을 붙인다. 사용자 탭의 열 구성은 건드리지 않는다.
    ...(activeTab === 'ABSENCES' ? [
      {
        header: '부재 여부',
        className: 'w-32',
        accessor: (user: UserManage) => {
          const state = absenceOf(user);
          // 조회 실패나 esntlId 부재는 '정상' 이 아니라 '알 수 없음' 이다.
          if (state === null) {
            return <span className="text-xs font-bold text-muted-foreground">알 수 없음</span>;
          }
          return state === ABSENT
            ? <span className="text-xs font-bold text-warning-emphasis">부재</span>
            : <span className="text-xs font-bold text-muted-foreground">정상</span>;
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
            <div className="flex justify-end pr-2">
              <Button
                variant="outline"
                size="sm"
                disabled={absencePendingId !== null}
                aria-busy={isPending}
                aria-label={isPending ? `${label} 중` : label}
                onClick={(event) => { event.stopPropagation(); void handleToggleAbsence(user); }}
                className="gap-2 h-9"
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
    ] : []),
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-6 pb-8">
      <PageHeader
        title={activeTab === 'DEPTS' ? '부서 및 조직 관리' : activeTab === 'ABSENCES' ? '부재 상태 관리' : activeTab === 'POLICIES' ? '조직 정책' : '계정 및 사용자 관리'}
        breadcrumbs={activeTab === 'DEPTS'
          ? [{ label: '사용자 관리' }, { label: '부서 관리' }]
          : [{ label: '사용자 관리' }, { label: activeTab === 'ABSENCES' ? '부재 상태 관리' : activeTab === 'POLICIES' ? '조직 정책' : '계정 및 사용자 관리' }]}
        className={activeTab === 'DEPTS' ? 'mb-4 [animation:none]' : undefined}
        animateEntrance={activeTab !== 'DEPTS'}
        actions={activeTab === 'DEPTS' ? (
          <Button
            type="button"
            onClick={handleOpenDeptCreate}
            disabled={isSaving}
            className="h-10 gap-2 font-semibold"
          >
            <LayoutGrid size={18} aria-hidden="true" /> 부서 등록
          </Button>
        ) : activeTab !== 'POLICIES' && activeTab !== 'ABSENCES' ? (
          <Button
            type="button"
            onClick={handleOpenUserCreate}
            disabled={isSaving}
            className="h-10 gap-2 font-semibold"
          >
            {/* 부재 등록 API 가 화면에 배선되기 전까지 이 버튼은 '사용자 등록'이다.
                '부재 등록'으로 표기하면 사용자 등록 폼이 열려 라벨이 거짓이 된다. */}
            <UserPlus size={18} aria-hidden="true" /> 사용자 등록
          </Button>
        ) : undefined}
      />

      {/* 사용자 등록은 화면의 주요 액션이라 페이지 헤더가 소유한다.
          종전에는 PageHeader(제목) 아래 HubHeader(영문 혼용 히어로 + "컨트롤 센터" 문구)가
          한 번 더 있었고, 등록 버튼이 그 두 번째 헤더에 붙어 있었다. */}

      {/* --- Horizontal Premium Tab Controls (탭 = 라우트, 감사 P1-7) --- */}
      <nav
        aria-label="사용자 및 조직 관리 화면 전환"
        className="flex w-fit rounded-md border border-border p-0.5"
      >
        <NavButton icon={<Users size={16} />} label="사용자" active={activeTab === 'USERS'} onClick={() => handleTabChange('USERS')} />
        <NavButton icon={<Network size={16} />} label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => handleTabChange('DEPTS')} />
        <NavButton icon={<UserMinus size={16} />} label="부재 상태 관리" active={activeTab === 'ABSENCES'} onClick={() => handleTabChange('ABSENCES')} />
        <NavButton icon={<ShieldCheck size={16} />} label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => handleTabChange('POLICIES')} />
      </nav>

      <MasterDetailLayout
        active={activeTab === 'DEPTS'}
        onSaveShortcut={handleSaveDeptHierarchy}
        saveShortcutDisabled={!hasDeptChanges || isSaving || isDeptModalOpen}
        className={cn(
          activeTab !== 'DEPTS' && "grid grid-cols-12 gap-8 min-h-[800px] transition-opacity duration-500",
          isPending && "opacity-60 pointer-events-none",
        )}
      >
        <div className={cn(
          activeTab === 'DEPTS'
            ? "min-w-0 h-full flex flex-col gap-4"
            : "col-span-12 lg:col-span-7 h-full flex flex-col gap-6 transition-opacity duration-300",
          isPending && "opacity-50",
        )}>
          <UserOrgMasterSection
            compact={activeTab === 'DEPTS'}
            title={activeTab === 'DEPTS' ? '조직 구조' : activeTab === 'POLICIES' ? '조직 정책' : '사용자 목록'}
            description="선택한 조직 및 사용자 정보를 확인하고 관리합니다."
            icon={activeTab === 'DEPTS' ? Network : activeTab === 'POLICIES' ? ShieldCheck : Users}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1 pt-1 border-b border-border/50 pb-6">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {activeTab === 'DEPTS' ? '부서 데이터' : '조직·사용자 데이터'}
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      aria-label="조직·사용자 데이터 새로고침"
                      // 무인자 invalidateQueries() 는 메뉴·알림 등 이 화면과 무관한 캐시까지
                      // 전부 재요청시킨다 — 이 화면이 쓰는 두 키로 좁힌다(감사 P2).
                      onClick={() => {
                        queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                        queryClient.invalidateQueries({ queryKey: ['admin-depts'] });
                      }}
                      className="h-10 rounded-xl px-5 text-xs font-semibold gap-2 bg-muted hover:bg-surface-inverse text-foreground hover:text-surface-inverse-foreground border border-border/60 transition-all group shadow-sm flex items-center justify-center outline-none cursor-pointer"
                    >
                      <RefreshCcw size={14} className={cn("text-primary group-hover:text-white transition-colors", isUsersLoading || isDeptsLoading ? "animate-spin" : "group-hover:rotate-180")} /> 새로고침
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                    최신 데이터 다시 불러오기
                  </TooltipContent>
                </Tooltip>
              </div>

              {activeTab !== 'POLICIES' && (
                <div className="relative group/search">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} aria-hidden="true" />
                  <Input
                    className="pl-14 h-10 bg-muted border-none rounded-xl text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
                    // ⚠ e2e 가 이 placeholder 를 정확 문자열로 셀렉터에 쓴다
                    //    (19-hierarchy-modernization: input[placeholder="검색어를 입력하세요..."],
                    //     21/23: placeholder*="검색"). 문구 변경 시 e2e 동시 수정 필요.
                    placeholder="검색어를 입력하세요..."
                    aria-label={activeTab === 'DEPTS' ? '부서 검색' : '사용자 검색'}
                    value={searchKeyword}
                    // 검색어가 바뀌면 페이지를 1로 되돌린다. 종전에는 3페이지에서 검색하면
                    // 결과가 1페이지뿐이어도 3페이지를 요청해 빈 화면이 됐다(감사 P1-8).
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      if (activeTab === 'DEPTS') setSelectedItemId(null);
                      if (userPage !== 1) goToPage(1);
                    }}
                    suppressHydrationWarning
                  />
                </div>
              )}

              <div
                role="region"
                aria-label={activeTab === 'DEPTS' ? '부서 조직 구조' : '조직·사용자 결과 스크롤 영역'}
                tabIndex={0}
                className="overflow-y-auto pr-2 custom-scrollbar max-h-[600px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={activeTab === 'DEPTS' ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="h-full"
                  >
                    {activeTab === 'DEPTS' ? (
                      /* 조직도는 테이블이 아니라 D&D 트리다. 실패를 토스트로만 알리면 화면은
                         '부서 0건'으로 남아 조회 실패와 구분되지 않는다(감사 P1-1). */
                      isDeptsError ? (
                        <ErrorStateDisplay error={deptsError} onRetry={() => refetchDepts()} />
                      ) : (
                        <div className="space-y-1">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                                {...deptDragHandlers}
                            >
                                <SortableContext items={previewDepts.map(n => n.ognzId || '')} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
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
                            <div className="py-4">
                              <Button
                                onClick={handleSaveDeptHierarchy}
                                disabled={!hasDeptChanges || !selectedDept || isSaving || isDeptModalOpen}
                                aria-busy={activeWriteOperation === 'dept-hierarchy' || undefined}
                                className="w-full h-11 rounded-xl font-semibold text-xs gap-2"
                              >
                                {activeWriteOperation === 'dept-hierarchy' ? <RefreshCcw size={14} className="animate-spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
                                {activeWriteOperation === 'dept-hierarchy' ? '조직 계층 저장 중…' : '조직 계층 저장'}
                              </Button>
                            </div>
                            {flattenedDepts.length === 0 && !isDeptsLoading && (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground border border-border shadow-inner">
                                        <SearchSlash size={32} />
                                    </div>
                                    <p className="text-xs font-semibold text-muted-foreground">
                                      {deptKeyword ? `'${deptKeyword}' 에 해당하는 부서가 없습니다.` : '등록된 부서가 없습니다.'}
                                    </p>
                                </div>
                            )}
                        </div>
                      )
                    ) : activeTab === 'POLICIES' ? (
                        <OrgPolicyPanel onNavigate={(href) => router.push(href)} />
                    ) : (
                        <div className="space-y-4">
                          {activeTab === 'ABSENCES' && (
                            <AbsenceStatusNotice
                              isError={isAbsencesError}
                              error={absencesError}
                              isLoading={isAbsencesLoading}
                              absentCount={users.filter((user) => absenceOf(user) === ABSENT).length}
                              onRetry={() => { void refetchAbsences(); }}
                            />
                          )}
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
                              emptyMessage={debouncedKeyword ? `'${debouncedKeyword}' 검색 결과가 없습니다.` : '데이터가 존재하지 않습니다.'}
                              isPremium={true}
                              enableSelection={true}
                              bulkActions={userBulkActions}
                              className="border-none shadow-none bg-transparent"
                              pagination={{
                                  currentPage: userPage,
                                  totalPages: usersData?.totalPage || 1,
                                  totalCount: usersData?.total,
                                  onPageChange: goToPage
                              }}
                          />
                        </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </UserOrgMasterSection>
        </div>

        <div
          data-a2-detail={activeTab === 'DEPTS' ? '' : undefined}
          tabIndex={activeTab === 'DEPTS' ? -1 : undefined}
          className={activeTab === 'DEPTS' ? "min-w-0 h-full" : "col-span-12 lg:col-span-5 h-full"}
        >
          <AnimatePresence mode="wait">
            {selectedItem ? (
              <motion.div
                key={selectedItemId}
                initial={activeTab === 'DEPTS' ? false : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col gap-6"
              >
                <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white shadow-2xl h-full p-10 space-y-10 flex flex-col relative overflow-hidden ring-1 ring-black/5">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.03] scale-150 rotate-12 transition-transform duration-1000">
                    <SearchCode size={250} className="text-primary" />
                  </div>

                  <div className="flex items-start justify-between border-b border-border/50 pb-10 relative z-10">
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-20 bg-surface-inverse rounded-2xl flex items-center justify-center font-black text-4xl text-surface-inverse-foreground shadow-2xl rotate-2 group hover:rotate-6 transition-transform">
                        <span className="text-primary">
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.ognzNm?.[0] : displayedUser?.userNm?.[0]}
                        </span>
                      </div>
                      <div className="space-y-4 pt-1">
                        <h2 className="text-4xl font-black text-foreground tracking-tighter leading-none truncate max-w-[350px]">
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.ognzNm : displayedUser?.userNm}
                        </h2>
                        {/* 종전에는 상태와 무관하게 '인증됨' 이 항상, ABSENCES 탭에서는 전원 '자리비움' 이
                            표시됐다. 실제 계정 상태 코드(userSttsCd)에서만 배지를 만든다(감사 P1-5). */}
                        {activeTab !== 'DEPTS' && (
                          <div className="flex gap-3">
                            {(() => {
                              // 목록 projection 에는 userSttsCd 가 없다 — 상세 API 데이터로만 배지를 만든다.
                              const status = USER_STATUS_LABELS[displayedUser?.userSttsCd ?? ''];
                              if (!status) return null;
                              return (
                                <span className={cn(
                                  "text-xs font-semibold px-4 py-1.5 rounded-lg border shadow-sm flex items-center gap-2",
                                  status.className
                                )}>
                                  <ShieldCheck size={14} aria-hidden="true" /> {status.label}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="정보 수정"
                        className="h-10 w-14 rounded-xl bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground shadow-sm border border-border transition-all group"
                        disabled={isSaving}
                        onClick={activeTab === 'DEPTS' ? handleOpenDeptEdit : handleOpenUserEdit}
                      >
                        <Pencil size={20} className="group-hover:scale-110 transition-transform" />
                      </Button>
                      {activeTab === 'DEPTS' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDeleteDept}
                          disabled={isSaving}
                          aria-busy={activeWriteOperation === 'delete-dept' || undefined}
                        >
                          {activeWriteOperation === 'delete-dept' ? '부서 삭제 중…' : '부서 삭제'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 space-y-10 relative z-10">
                    {/* '근무지: 본사' 는 어떤 데이터로도 뒷받침되지 않는 고정 문구여서 제거했다(감사 P1-5). */}
                    <div className="grid grid-cols-2 gap-6">
                      {activeTab === 'DEPTS' ? (
                        <>
                          <InfoBlock icon={<Building2 size={16} />} label="부서 코드" value={(selectedItem as Department)?.ognzId || '-'} />
                          <InfoBlock icon={<Network size={16} />} label="상위 부서" value={(selectedItem as Department)?.upOgnzId || '최상위'} />
                        </>
                      ) : (
                        <>
                          <InfoBlock icon={<Mail size={16} />} label="이메일 주소" value={displayedUser?.emlAddr || '미지정'} />
                          <InfoBlock icon={<Phone size={16} />} label="연락처" value={displayedUser?.mblTelno || '미등록'} />
                          {/* 소속·상태는 목록 projection 에 없다 — 상세 API(displayedUser)에서만 나온다. */}
                          <InfoBlock icon={<Building2 size={16} />} label="소속 부서" value={displayedUser?.ognzId || '미지정'} />
                          <InfoBlock icon={<Fingerprint size={16} />} label="사번" value={displayedUser?.emplNo || '미지정'} />
                        </>
                      )}
                    </div>

                    {activeTab !== 'DEPTS' && <AccessControlLink onOpen={() => router.push('/admin/security/authority')} />}
                  </div>

                  {activeTab !== 'DEPTS' && <div className="flex gap-4 pt-10 mt-auto border-t border-border/50 relative z-10">
                    {/* 탭에 따라 삭제 대상이 다르다. 종전에는 분기가 없어 부서 탭에서도 사용자 삭제 API 를 호출했다. */}
                    <button
                      type="button"
                      onClick={handleDeleteUser}
                      disabled={isSaving}
                      aria-busy={activeWriteOperation === 'delete-user' || undefined}
                      className="flex-1 h-10 bg-muted text-rose-500 rounded-xl font-semibold text-xs hover:bg-rose-500 hover:text-white transition-all shadow-sm outline-none cursor-pointer flex items-center justify-center"
                    >
                      {/* 실제 동작은 계정 삭제다. '접근 차단'은 무엇을 하는지 오인시킨다. */}
                      {activeWriteOperation === 'delete-user' ? '사용자 삭제 중…' : '사용자 삭제'}
                    </button>
                    {/* 비밀번호 초기화 — 종전에는 API 만 있고 이 화면 어디에도 진입점이 없었다. */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenPasswordReset}
                      disabled={isSaving}
                      className="flex-1 h-10 rounded-xl font-semibold text-xs"
                    >
                      <KeyRound size={16} aria-hidden="true" /> 비밀번호 초기화
                    </Button>
                    {/* 수정은 편집 다이얼로그에서 저장한다. 종전에는 onClick 이 없는 死버튼이라 눌러도 아무 일도 없었다. */}
                    <Button
                      onClick={handleOpenUserEdit}
                      disabled={isSaving}
                      className="flex-[2] h-10 bg-surface-inverse text-surface-inverse-foreground rounded-xl font-semibold text-xs shadow-2xl hover:bg-primary transition-all group"
                    >
                      <Zap size={16} className="text-primary group-hover:animate-pulse" /> 정보 수정
                    </Button>
                  </div>}
                </div>
              </motion.div>
            ) : (
              <div
                role={activeTab === 'DEPTS' ? 'status' : undefined}
                className="h-full rounded-2xl border-4 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center p-20 text-center select-none group"
              >
                <div className="w-28 h-24 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground/40 shadow-xl mb-10 group-hover:rotate-6 transition-transform duration-700">
                  <Contact2 size={50} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-3xl font-black text-muted-foreground tracking-tighter">선택 대기 중</h3>
                <p className="text-xs font-semibold text-muted-foreground mt-4 leading-relaxed max-w-[280px]">
                  {activeTab === 'DEPTS' ? '왼쪽 조직 구조에서 확인하거나 편집할 부서를 선택하세요.' : '목록에서 부서 또는 사용자를 선택하세요.'}
                </p>
                <div className="mt-10 flex gap-4 opacity-10 grayscale">
                  <Fingerprint size={24} />
                  <Database size={24} />
                  <ShieldAlert size={24} />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </MasterDetailLayout>

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
        <div className="space-y-8 p-4">
          <BulkSelectionSummary users={selectedBulkItems} />

          <div className="space-y-4">
            {/* 폼 컨트롤이 아니라 버튼 그룹이므로 <label> 이 아니라 radiogroup 으로 이름을 붙인다(감사 P2). */}
            <p id="bulk-status-label" className="text-xs font-bold text-foreground tracking-tight">변경할 상태 선택</p>
            <div role="radiogroup" aria-labelledby="bulk-status-label" className="grid grid-cols-1 gap-3">
              {[
                { code: 'P', label: '정상', color: 'bg-emerald-500' },
                { code: 'A', label: '승인 대기', color: 'bg-amber-500' },
                { code: 'D', label: '비활성', color: 'bg-muted-foreground' }
              ].map(s => (
                <button
                  key={s.code}
                  type="button"
                  role="radio"
                  aria-checked={targetStatus === s.code}
                  disabled={isSaving}
                  onClick={() => setTargetStatus(s.code)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                    targetStatus === s.code ? "border-primary bg-primary/5 shadow-lg" : "border-border hover:border-border bg-card"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", s.color)} />
                    <span className="text-sm font-bold tracking-tight text-foreground">{s.label}</span>
                  </div>
                  {targetStatus === s.code && <div className="w-4 h-4 rounded-lg bg-primary flex items-center justify-center text-white"><ChevronRight size={10} /></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              disabled={isSaving}
              onClick={handleCloseBulkStatusModal}
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
            >
              취소
            </button>
            <Button 
              onClick={() => void handleBulkStatusUpdate()}
              disabled={isSaving}
              aria-busy={activeWriteOperation === 'bulk-status' || undefined}
              className="flex-[2] h-11 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all"
            >
              {activeWriteOperation === 'bulk-status' ? (
                <><RefreshCcw size={16} className="animate-spin" aria-hidden="true" /> 상태 일괄 적용 중…</>
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
        <div className="space-y-8 p-4">
          <BulkSelectionSummary users={selectedBulkItems} />

          <div className="space-y-4">
            <p id="bulk-dept-label" className="text-xs font-bold text-foreground tracking-tight">이동할 대상 부서 선택</p>
            <div role="radiogroup" aria-labelledby="bulk-dept-label" className="max-h-[400px] overflow-y-auto border-2 border-border rounded-lg p-4 custom-scrollbar bg-muted/30">
              {flattenedDepts.length === 0 && (
                <p className="py-10 text-center text-xs font-bold tracking-tight text-muted-foreground">
                  {isDeptsLoading ? '부서 목록을 불러오는 중입니다...' : '이동할 수 있는 부서가 없습니다.'}
                </p>
              )}
              {flattenedDepts.map((node) => (
                <div
                  key={node.ognzId}
                  style={{ paddingLeft: `${node.depth * 20}px` }}
                  className="mb-1"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={targetDeptId === node.ognzId}
                    disabled={isSaving}
                    onClick={() => setTargetDeptId(node.ognzId || '')}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                      targetDeptId === node.ognzId ? "bg-primary text-white shadow-lg" : "hover:bg-card hover:shadow-sm text-foreground"
                    )}
                  >
                    <Building2 size={14} className={targetDeptId === node.ognzId ? "text-white" : "text-muted-foreground"} />
                    <span className="text-xs font-bold tracking-tight">{node.ognzNm}</span>
                    <span className="text-xs opacity-50 ml-auto">ID_{node.ognzId}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              disabled={isSaving}
              onClick={handleCloseBulkMoveModal}
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
            >
              취소
            </button>
            <Button 
              onClick={() => void handleBulkDeptMove()}
              disabled={isSaving}
              aria-busy={activeWriteOperation === 'bulk-move' || undefined}
              className="flex-[2] h-11 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all"
            >
              {activeWriteOperation === 'bulk-move' ? (
                <><RefreshCcw size={16} className="animate-spin" aria-hidden="true" /> 부서 이동 실행 중…</>
              ) : '부서 이동 실행'}
            </Button>
          </div>
        </div>
      </StandardModal>




    </div>
    </TooltipProvider>
  );
}

