'use client';

import React, { useState, useMemo, use, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { Users,
  Network,
  UserMinus,
  ShieldCheck,
  Search,
  Pencil,
  UserPlus,
  Building2,
  Activity,
  ChevronRight,
  UserCog,
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
  Info,
  Save } from 'lucide-react';
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
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ErrorStateDisplay } from '@/app/components/ui/status-displays';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { PageResponse } from '@/types/foundation/system';
import { saveDeptHierarchyAction } from '@/app/actions/deptActions';
import { 
  bulkUpdateUserStatusAction, 
  bulkMoveUserDeptAction, 
  bulkDeleteUsersAction,
  bulkUpdateUserRoleAction
} from '@/app/actions/userActions';

import { StandardModal } from '@/app/components/ui/standard-modal';

import { UserManageForm, UserFormValues } from '@/components/admin/user/UserManageForm';
import { DepartmentForm, DeptFormValues } from '@/components/admin/user/DepartmentForm';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    MeasuringStrategy,
    DropAnimation,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';
import { flattenDeptTree, listToDeptTree, getDeptProjection, FlattenedDept } from './departments/treeUtils';

const INDENTATION_WIDTH = 24;

/**
 * 부서 목록 조회 크기.
 * 조직도(D&D 트리)와 '부서 이동' 모달의 대상 선택은 계층 전체가 있어야 성립한다 — 페이징과 상극이다.
 * 서버는 Spring Pageable(page/size, 0-based)을 그대로 받으므로 충분히 큰 size 로 전량을 끌어온다.
 * (종전 size:10 → 11번째 부서부터 트리에서도 모달에서도 보이지 않았다.)
 */
const DEPT_LIST_SIZE = 1000;

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

interface SortableDeptNodeProps {
    node: FlattenedDept;
    isSelected: boolean;
    onClick: () => void;
    isOverlay?: boolean;
}

const SortableDeptNode = ({ node, isSelected, onClick, isOverlay = false }: SortableDeptNodeProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: node.ognzId || '' });

    const style = {
        transform: isOverlay ? undefined : CSS.Translate.toString(transform),
        transition: isOverlay ? undefined : transition,
        paddingLeft: isOverlay ? 0 : `${node.depth * INDENTATION_WIDTH}px`,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group relative mb-1 outline-none",
                isDragging && !isOverlay && "opacity-30",
                isOverlay && "z-[9999] pointer-events-none"
            )}
        >
            {/* Hierarchy Line */}
            {node.depth > 0 && !isOverlay && (
                <>
                    <div className="absolute left-[11px] top-[-10px] bottom-1/2 w-px bg-muted" />
                    <div className="absolute left-[11px] top-1/2 w-3 h-px bg-muted" />
                </>
            )}

            <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={onClick}
                className={cn(
                    "w-full flex items-center justify-between p-3 rounded-lg transition-all relative overflow-hidden",
                    "hover:bg-muted border border-transparent",
                    isSelected && "bg-primary text-white shadow-lg shadow-primary/20 border-primary/20",
                    isOverlay && "bg-card shadow-2xl border-primary ring-4 ring-primary/5 scale-105"
                )}
            >
                <div className="flex items-center gap-3 truncate relative z-10 w-full">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                        isSelected ? "bg-white/20 text-white" : "bg-hub-indigo/10 text-hub-indigo group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        <Building2 size={14} />
                    </div>
                    <div className="flex flex-col truncate items-start">
                        <span className={cn(
                            "text-xs font-bold truncate leading-tight tracking-tight",
                            isSelected ? "text-white" : "text-foreground"
                        )}>
                            {node.ognzNm}
                        </span>
                        <span className={cn(
                            "text-xs font-bold tracking-tighter opacity-60",
                            isSelected ? "text-white" : "text-muted-foreground"
                        )}>
                            {node.ognzId}
                        </span>
                    </div>
                    {isSelected && (
                        <div className="ml-auto">
                            <div className="w-1.5 h-1.5 rounded-full bg-surface-inverse-foreground animate-pulse" />
                        </div>
                    )}
                </div>
            </button>
        </div>
    );
};

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

/** 계정 상태 코드(userSttsCd) → 표시 라벨. 일괄 상태 변경 모달의 코드 체계와 동일하다. */
const USER_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  P: { label: '정상', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  A: { label: '승인 대기', className: 'bg-amber-500/10 text-amber-700 border-amber-500/20' },
  D: { label: '비활성', className: 'bg-muted text-muted-foreground border-border' },
};

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
  const [isSaving, setIsSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  /** 타이핑 한 글자마다 서버를 때리지 않도록 300ms 디바운스한다(감사 P1-8). */
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  /** 페이지 번호는 URL 에 반영한다 — 새로고침·공유·뒤로가기가 복원된다(감사 P1-7). */
  const [userPage, setUserPage] = useState(() => {
    const raw = Number(searchParams.get('page'));
    return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
  });
  const [deptPage] = useState(1);

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
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  // Bulk Actions State
  const [selectedBulkItems, setSelectedBulkItems] = useState<UserManage[]>([]);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('P');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [targetRole, setTargetRole] = useState('USER');

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

  /**
   * 검색 입력은 사용자/부서 탭이 공유한다. USERS 탭에서 입력한 사용자 검색어가 부서 조회에 섞이면
   * '부서 이동' 모달의 대상 목록이 그 키워드로 걸러져 비어 버린다 — 부서 탭에서만 키워드를 태운다.
   */
  const deptKeyword = activeTab === 'DEPTS' ? debouncedKeyword : '';

  /**
   * 서버 프리페치(page.tsx)는 size=10 으로 잘린 목록일 수 있다. 잘린 시드를 initialData 로 쓰면
   * 전역 staleTime(60s) 동안 재조회가 일어나지 않아 10건 절단이 그대로 유지된다.
   * 전량(total)을 담고 있을 때만 시드로 채택한다.
   */
  const initialDeptsSeed = useMemo(() => {
    const list = initialDepts?.list;
    const total = initialDepts?.total;
    return Array.isArray(list) && typeof total === 'number' && list.length >= total ? (initialDepts ?? undefined) : undefined;
  }, [initialDepts]);

  const { data: deptsData, isLoading: isDeptsLoading, isError: isDeptsError, error: deptsError, refetch: refetchDepts } = useQuery({
    queryKey: ['admin-depts', deptKeyword, deptPage],
    // 서버는 keyword + Spring Pageable(page/size, 0-based)을 읽는다. 종전의 {pageNo, searchKeyword}는
    // ApiService 매핑 대상이 아니라 그대로 전달돼 무시됐고, 검색어가 서버에 닿지 않았다.
    queryFn: () => deptAdminService.getDeptList({ keyword: deptKeyword, page: deptPage - 1, size: DEPT_LIST_SIZE }),
    // 부서 탭뿐 아니라 '부서 이동' 모달·사용자 등록/수정 폼(소속 부서 선택)에서도 목록이 필요하다.
    // 종전에는 DEPTS 탭에서만 조회해 USERS 탭의 모달이 항상 빈 상자였다.
    enabled: activeTab === 'DEPTS' || isBulkMoveModalOpen || isUserModalOpen,
    initialData: (deptPage === 1 && !deptKeyword) ? initialDeptsSeed : undefined
  });

  // D&D States for Depts
  const [flattenedDepts, setFlattenedDepts] = useState<FlattenedDept[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  /** 드래그 중 가로 이동 거리. 이 값으로 계층(깊이)이 결정된다 — 없으면 순서만 바뀌고 계층은 그대로다. */
  const [deptOffsetLeft, setDeptOffsetLeft] = useState(0);
  /** 현재 드롭 대상. 메뉴 관리(MenuAdminClient)와 동일하게 실시간 투영을 계산하기 위해 추적한다. */
  const [overDeptId, setOverDeptId] = useState<string | null>(null);
  const [hasDeptChanges, setHasDeptChanges] = useState(false);

  /**
   * 드래그 중 투영(projection) — 지금 놓으면 어떤 깊이/부모가 되는지 실시간 계산한다.
   * 종전에는 onDragEnd 에서만 계산해, 끄는 동안 결과를 알 수 없었고 최상단 이동이나
   * 부모 전환이 의도대로 됐는지 놓아봐야만 알 수 있었다. (메뉴 관리와 동일한 패턴)
   */
  const deptProjected = useMemo(() => {
    if (!activeDeptId || !overDeptId) return null;
    return getDeptProjection(flattenedDepts, activeDeptId, overDeptId, deptOffsetLeft, INDENTATION_WIDTH);
  }, [flattenedDepts, activeDeptId, overDeptId, deptOffsetLeft]);

  /** 드래그 중인 노드에 투영 깊이를 입혀 들여쓰기가 즉시 보이게 한다. */
  const previewDepts = useMemo(
    () => flattenedDepts.map((n) =>
      n.ognzId === activeDeptId && deptProjected ? { ...n, depth: deptProjected.depth } : n
    ),
    [flattenedDepts, activeDeptId, deptProjected]
  );

  const departments = useMemo(() => {
    const list = deptsData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as Department[];
  }, [deptsData]);

  // 평탄화는 탭과 무관하게 수행한다. 종전에는 DEPTS 탭 조건이 걸려 있어 USERS 탭의
  // '부서 이동' 모달이 렌더하는 flattenedDepts 가 언제나 빈 배열이었다.
  useEffect(() => {
    // Build tree and flatten it for D&D
    const tree = listToDeptTree(departments);
    setFlattenedDepts(flattenDeptTree(tree));
  }, [departments]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onUserSubmit = async (values: UserFormValues) => {
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
      // 인가 실패(403 등)를 포함한 서버 메시지를 그대로 보여준다 — 일반 문구로 뭉개면
      // 사용자는 권한 문제인지 입력 문제인지 알 수 없다(H3 의미 보존, 감사 m-2).
      const message = error instanceof Error ? error.message : '사용자 저장 중 오류가 발생했습니다.';
      toast(message, 'error');
    }
  };

  const onDeptSubmit = async (values: DeptFormValues) => {
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
    } catch (_error) {
      toast('부서 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedItemId) return;

    // 확인 본문에 대상 식별자(이름·아이디)를 노출한다 — 무엇을 지우는지 모른 채 누르는 오삭제 방지(감사 P1-9).
    const targetName = (selectedItem as UserManage)?.userNm ?? String(selectedItemId);
    const ok = await confirm({
      title: '사용자 삭제',
      message: `'${targetName}(${selectedItemId})' 사용자의 계정과 접근 권한을 영구히 삭제합니다. 되돌릴 수 없습니다. 계속하시겠습니까?`,
      variant: 'destructive',
      confirmText: '삭제'
    });

    if (ok) {
      try {
        await userAdminService.deleteUser(selectedItemId as string);
        toast(`'${targetName}' 사용자를 삭제했습니다.`, 'success');
        setSelectedItemId(null);
        refetchUsers();
      } catch (error) {
        const message = error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다.';
        toast(message, 'error');
      }
    }
  };

  /**
   * 부서 삭제. 종전에는 상세 패널의 삭제 버튼이 탭 분기 없이 handleDeleteUser 를 호출해,
   * DEPTS 탭에서는 부서 ID(ognzId)로 사용자 삭제 API 를 때리고 있었다.
   * 서버는 소속 사용자·하위 부서가 남아 있으면 409(RESOURCE_IN_USE)로 막으므로 그 메시지를 그대로 보여준다.
   */
  const handleDeleteDept = async () => {
    if (!selectedItemId) return;

    const targetName = (selectedItem as Department)?.ognzNm ?? String(selectedItemId);
    const ok = await confirm({
      title: '부서 삭제',
      message: `'${targetName}(${selectedItemId})' 부서를 삭제하시겠습니까? 소속 사용자나 하위 부서가 남아 있으면 삭제할 수 없습니다.`,
      variant: 'destructive',
      confirmText: '삭제'
    });

    if (ok) {
      try {
        await deptAdminService.deleteDept(selectedItemId as string);
        toast(`'${targetName}' 부서를 삭제했습니다.`, 'success');
        setSelectedItemId(null);
        refetchDepts();
      } catch (error) {
        const message = error instanceof Error ? error.message : '부서 삭제 중 오류가 발생했습니다.';
        toast(message, 'error');
      }
    }
  };

  const handleBulkDelete = async (items: (UserManage | Department)[]) => {
    const userItems = items as UserManage[];
    const names = userItems.map(u => u.userNm).filter(Boolean);
    const preview = names.slice(0, 5).join(', ') + (names.length > 5 ? ` 외 ${names.length - 5}명` : '');
    const ok = await confirm({
      title: '사용자 일괄 삭제',
      message: `${userItems.length}명의 계정을 영구히 삭제합니다. 되돌릴 수 없습니다.\n대상: ${preview}`,
      variant: 'destructive',
      confirmText: '삭제'
    });
    if (ok) {
      try {
        const res = await bulkDeleteUsersAction(userItems.map(u => u.userId));
        toast(res.message, res.success ? 'success' : 'error');
        if (res.success) refetchUsers();
      } catch (error) {
        toast(error instanceof Error ? error.message : '일괄 삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const userBulkActions = [
    {
      label: '상태 변경',
      icon: <Activity size={16} />,
      onClick: (items: (UserManage | Department)[]) => {
        setSelectedBulkItems(items as UserManage[]);
        setIsBulkStatusModalOpen(true);
      }
    },
    {
      label: '부서 이동',
      icon: <Network size={16} />,
      onClick: (items: (UserManage | Department)[]) => {
        setSelectedBulkItems(items as UserManage[]);
        setIsBulkMoveModalOpen(true);
      }
    },
    {
      label: '권한 변경',
      icon: <ShieldCheck size={16} />,
      onClick: (items: (UserManage | Department)[]) => {
        setSelectedBulkItems(items as UserManage[]);
        setIsBulkRoleModalOpen(true);
      }
    },
    {
      label: '일괄 삭제',
      icon: <UserMinus size={16} />,
      variant: 'destructive' as const,
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

  const userColumns: Column<UserManage>[] = [
    {
      header: '사용자 정보',
      accessor: (user) => (
        <div className="flex items-center gap-4 py-1">
          <div className={cn(
            "w-12 h-10 rounded-xl flex items-center justify-center font-black text-lg shadow-md transition-transform group-hover:rotate-6",
            selectedItemId === user?.esntlId ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
          )}>
            {user?.userNm?.[0]}
          </div>
          <div className="space-y-0.5">
            <h4 className={cn("text-sm font-black tracking-tighter leading-none ", selectedItemId === user.esntlId ? "text-white" : "text-foreground")}>
              {user.userNm}
            </h4>
            <p className="text-[10px] font-bold tracking-tight text-muted-foreground">{user.userId}</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="조직 및 사용자 관리"
        breadcrumbs={[{ label: '사용자 관리' }, { label: '조직 통합 허브' }]}
      />

      <HubHeader
        title="사용자"
        highlight="관리 허브"
        subtitle="전사 인적 자원 및 조직 계층 구조를 통합 관리하는 컨트롤 센터입니다."
        icon={UserCog}
        actions={
          <div className="flex gap-3 p-1 items-center">
            {/* 종전의 '환경 설정' 아이콘 버튼은 onClick 이 없는 死버튼이라 제거했다(감사 P1-6). */}
            {activeTab !== 'POLICIES' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode('create');
                      if (activeTab === 'DEPTS') {
                        setIsDeptModalOpen(true);
                      } else {
                        setIsUserModalOpen(true);
                      }
                    }}
                    className="h-10 px-8 rounded-xl bg-surface-inverse border-none text-surface-inverse-foreground font-black text-xs tracking-tight shadow-xl hover:bg-primary transition-all hover:-translate-y-1 gap-2 group flex items-center justify-center shrink-0 cursor-pointer outline-none"
                  >
                    {activeTab === 'DEPTS' ? <LayoutGrid size={18} /> : <UserPlus size={18} />}
                    {/* 부재 등록 API 가 화면에 배선되기 전까지 이 버튼은 '사용자 등록'이다.
                        '부재 등록'으로 표기하면 사용자 등록 폼이 열려 라벨이 거짓이 된다. */}
                    <span>{activeTab === 'DEPTS' ? '부서 등록' : '사용자 등록'}</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                  {activeTab === 'DEPTS' ? '새로운 부서 추가' : '새로운 사용자 생성'}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        }
      />

      {/* --- Horizontal Premium Tab Controls (탭 = 라우트, 감사 P1-7) --- */}
      <nav
        aria-label="사용자 및 조직 관리 화면 전환"
        className="flex bg-muted/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 max-w-4xl w-full mb-10 relative z-10 shadow-sm"
      >
        <NavButton icon={<Users size={16} />} label="사용자" active={activeTab === 'USERS'} onClick={() => handleTabChange('USERS')} />
        <NavButton icon={<Network size={16} />} label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => handleTabChange('DEPTS')} />
        <NavButton icon={<UserMinus size={16} />} label="부재 관리" active={activeTab === 'ABSENCES'} onClick={() => handleTabChange('ABSENCES')} />
        <NavButton icon={<ShieldCheck size={16} />} label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => handleTabChange('POLICIES')} />
      </nav>

      <div className={cn("grid grid-cols-12 gap-8 min-h-[800px] transition-opacity duration-500", isPending && "opacity-60 pointer-events-none")}>
        <div className={cn("col-span-12 lg:col-span-7 h-full flex flex-col gap-6 transition-opacity duration-300", isPending && "opacity-50")}>
          <HubSectionCard
            title={activeTab === 'DEPTS' ? '조직 구조' : activeTab === 'POLICIES' ? '조직 정책' : '사용자 목록'}
            description="선택한 조직 및 사용자 정보를 확인하고 관리합니다."
            icon={activeTab === 'DEPTS' ? Network : activeTab === 'POLICIES' ? ShieldCheck : Users}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1 pt-1 border-b border-border/50 pb-6">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">조직·사용자 데이터</span>
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
                      className="h-10 rounded-xl px-5 text-[10px] font-black tracking-widest gap-2 bg-muted hover:bg-surface-inverse text-foreground hover:text-surface-inverse-foreground border border-border/60 transition-all group shadow-sm uppercase flex items-center justify-center outline-none cursor-pointer"
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
                      if (userPage !== 1) goToPage(1);
                    }}
                    suppressHydrationWarning
                  />
                </div>
              )}

              <div
                role="region"
                aria-label="조직·사용자 결과 스크롤 영역"
                tabIndex={0}
                className="overflow-y-auto pr-2 custom-scrollbar max-h-[600px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
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
                                onDragStart={(e) => {
                                    setActiveDeptId(e.active.id as string);
                                    // 시작 시 드롭 대상을 자기 자신으로 두어야 첫 프레임부터 투영이 계산된다.
                                    setOverDeptId(e.active.id as string);
                                    setDeptOffsetLeft(0);
                                }}
                                onDragOver={({ over }) => setOverDeptId((over?.id as string) ?? null)}
                                // ⚠ 계층(깊이) 변경은 '가로' 드래그 거리로 결정된다. 종전에는 이 핸들러가 없어
                                //    getDeptProjection 에 dragOffset=0 이 고정으로 들어갔고, 그 결과
                                //    projectedDepth = dragItem.depth + Math.round(0 / indentationWidth) = 기존 깊이
                                //    가 되어 아무리 끌어도 계층이 바뀌지 않고 순서만 바뀌었다.
                                //    (메뉴 관리 화면 MenuAdminClient 는 이 패턴을 이미 갖추고 있다.)
                                onDragMove={({ delta }) => setDeptOffsetLeft(delta.x)}
                                onDragEnd={(event) => {
                                    const { active, over } = event;
                                    // 제자리에 놓아도(active===over) 가로로 밀어 깊이만 바꾸는 경우가 있으므로
                                    // 위치 변경 여부가 아니라 투영 결과를 기준으로 반영한다.
                                    if (over && deptProjected) {
                                        setFlattenedDepts((items) => {
                                            const oldIndex = items.findIndex(n => n.ognzId === active.id);
                                            const newIndex = items.findIndex(n => n.ognzId === over.id);
                                            const newItems = oldIndex === newIndex ? items.slice() : arrayMove(items, oldIndex, newIndex);
                                            const idx = newItems.findIndex(n => n.ognzId === active.id);
                                            newItems[idx] = { ...newItems[idx], parentId: deptProjected.parentId, depth: deptProjected.depth };
                                            return newItems;
                                        });
                                        setHasDeptChanges(true);
                                    }
                                    setActiveDeptId(null);
                                    setOverDeptId(null);
                                    setDeptOffsetLeft(0);
                                }}
                            >
                                <SortableContext items={previewDepts.map(n => n.ognzId || '')} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                        {previewDepts.map((node) => (
                                            <SortableDeptNode
                                                key={node.ognzId}
                                                node={node}
                                                isSelected={selectedItemId === node.ognzId}
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
                                                onClick={() => {}}
                                                isOverlay
                                            />
                                        ) : null}
                                    </DragOverlay>,
                                    document.body
                                )}
                            </DndContext>
                            {hasDeptChanges && (
                              <div className="py-4">
                                <Button
                                  onClick={async () => {
                                    setIsSaving(true);
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
                                      setIsSaving(false);
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="w-full h-11 rounded-xl bg-emerald-500 text-white font-black text-xs tracking-widest shadow-lg hover:bg-emerald-600 transition-all gap-2 uppercase"
                                >
                                  {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} 
                                  조직 계층 저장
                                </Button>
                              </div>
                            )}
                            {flattenedDepts.length === 0 && !isDeptsLoading && (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground border border-border shadow-inner">
                                        <SearchSlash size={32} />
                                    </div>
                                    <p className="text-xs font-bold text-muted-foreground tracking-widest">
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
                            <div role="note" className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-left">
                              <Info size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden="true" />
                              <p className="text-xs font-bold text-amber-700 dark:text-amber-400 leading-relaxed">
                                부재(자리비움) 정보는 아직 이 화면에 연동되지 않았습니다. 아래 목록은 <strong>부재자가 아니라 전체 사용자</strong>입니다.
                              </p>
                            </div>
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
          </HubSectionCard>
        </div>

        <div className="col-span-12 lg:col-span-5 h-full">
          <AnimatePresence mode="wait">
            {selectedItemId ? (
              <motion.div
                key={selectedItemId}
                initial={{ opacity: 0, x: 20 }}
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
                                  "text-[10px] font-black px-4 py-1.5 rounded-lg tracking-widest border shadow-sm flex items-center gap-2",
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
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      aria-label="정보 수정"
                      className="h-10 w-14 rounded-xl bg-muted hover:bg-surface-inverse hover:text-surface-inverse-foreground shadow-sm border border-border transition-all group"
                      onClick={() => {
                        setFormMode('edit');
                        if (activeTab === 'DEPTS') {
                          setIsDeptModalOpen(true);
                        } else {
                          setIsUserModalOpen(true);
                        }
                      }}
                    >
                      <Pencil size={20} className="group-hover:scale-110 transition-transform" />
                    </Button>
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

                    <div className="pt-10 border-t border-border/50 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck size={16} aria-hidden="true" />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-muted-foreground tracking-widest leading-none mb-1.5">접근 제어</h4>
                            <p className="text-sm font-black text-foreground tracking-tighter leading-none">권한 정책 관리</p>
                          </div>
                        </div>
                        {/* 종전에는 onClick 없는 死버튼이었고, 아래에는 실제 권한과 무관한
                            고정 태그 5개(ACCESS_CMS …)가 붙어 있었다(감사 P1-5·P1-6). */}
                        <button
                          type="button"
                          onClick={() => router.push('/admin/security/authority')}
                          className="h-10 px-5 rounded-xl bg-muted hover:bg-surface-inverse text-[10px] font-black text-foreground hover:text-surface-inverse-foreground gap-2 transition-all flex items-center justify-center outline-none cursor-pointer"
                        >
                          권한 설정 열기 <ChevronRight size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <p className="text-xs font-bold text-muted-foreground leading-relaxed">
                        사용자별 권한은 <span className="text-foreground">권한 정책 관리</span> 화면에서 부여·회수합니다.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-10 mt-auto border-t border-border/50 relative z-10">
                    {/* 탭에 따라 삭제 대상이 다르다. 종전에는 분기가 없어 부서 탭에서도 사용자 삭제 API 를 호출했다. */}
                    <button
                      type="button"
                      onClick={activeTab === 'DEPTS' ? handleDeleteDept : handleDeleteUser}
                      className="flex-1 h-10 bg-muted text-rose-500 rounded-xl font-black tracking-widest text-[10px] hover:bg-rose-500 hover:text-white transition-all shadow-sm uppercase outline-none cursor-pointer flex items-center justify-center"
                    >
                      {/* 실제 동작은 계정 삭제다. '접근 차단'은 무엇을 하는지 오인시킨다. */}
                      {activeTab === 'DEPTS' ? '부서 삭제' : '사용자 삭제'}
                    </button>
                    {/* 수정은 편집 다이얼로그에서 저장한다. 종전에는 onClick 이 없는 死버튼이라 눌러도 아무 일도 없었다. */}
                    <Button
                      onClick={() => {
                        setFormMode('edit');
                        if (activeTab === 'DEPTS') {
                          setIsDeptModalOpen(true);
                        } else {
                          setIsUserModalOpen(true);
                        }
                      }}
                      className="flex-[2] h-10 bg-surface-inverse text-surface-inverse-foreground rounded-xl font-black tracking-widest text-[10px] shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 group uppercase"
                    >
                      <Zap size={16} className="text-primary group-hover:animate-pulse" /> 정보 수정
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full rounded-2xl border-4 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center p-20 text-center select-none group">
                <div className="w-28 h-24 rounded-2xl bg-card border border-border flex items-center justify-center text-muted-foreground/40 shadow-xl mb-10 group-hover:rotate-6 transition-transform duration-700">
                  <Contact2 size={50} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-3xl font-black text-muted-foreground tracking-tighter">선택 대기 중</h3>
                <p className="text-[10px] font-bold text-muted-foreground tracking-widest mt-4 leading-relaxed max-w-[280px]">목록에서 부서 또는 사용자를 선택하세요.</p>
                <div className="mt-10 flex gap-4 opacity-10 grayscale">
                  <Fingerprint size={24} />
                  <Database size={24} />
                  <ShieldAlert size={24} />
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <StandardModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
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
          onCancel={() => setIsUserModalOpen(false)}
        />
      </StandardModal>

      <StandardModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={formMode === 'create' ? '신규 부서 등록' : '부서 정보 수정'}
        maxWidth="lg"
      >
        <DepartmentForm
          mode={formMode}
          initialData={formMode === 'edit' ? (selectedItem as Department) : undefined}
          onSubmit={onDeptSubmit}
          onCancel={() => setIsDeptModalOpen(false)}
        />
      </StandardModal>

      {/* Bulk Status Modal */}
      <StandardModal
        isOpen={isBulkStatusModalOpen}
        onClose={() => setIsBulkStatusModalOpen(false)}
        title="사용자 상태 일괄 변경"
        maxWidth="sm"
      >
        <div className="space-y-8 p-4">
          <div className="p-6 bg-muted rounded-lg border border-border">
            <p className="text-xs font-bold text-muted-foreground tracking-tight mb-2">선택된 사용자 ({selectedBulkItems.length}명)</p>
            <div className="flex flex-wrap gap-2">
              {selectedBulkItems.slice(0, 5).map(u => (
                <span key={u.userId} className="px-3 py-1 bg-card border border-border rounded-lg text-xs font-bold text-foreground">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-xs font-bold text-muted-foreground">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>
          
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
              onClick={() => setIsBulkStatusModalOpen(false)} 
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
            >
              취소
            </button>
            <Button 
              onClick={async () => {
                setIsSaving(true);
                try {
                  const res = await bulkUpdateUserStatusAction(selectedBulkItems.map(u => u.userId), targetStatus);
                  if (res.success) {
                    toast(res.message, 'success');
                    refetchUsers();
                    setIsBulkStatusModalOpen(false);
                  } else {
                    toast(res.message, 'error');
                  }
                } catch (_err) {
                  toast('상태 변경 중 오류 발생', 'error');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-[2] h-11 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all"
            >
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : '상태 일괄 적용'}
            </Button>
          </div>
        </div>
      </StandardModal>

      {/* Bulk Move Modal */}
      <StandardModal
        isOpen={isBulkMoveModalOpen}
        onClose={() => setIsBulkMoveModalOpen(false)}
        title="부서 일괄 이동"
        maxWidth="md"
      >
        <div className="space-y-8 p-4">
          <div className="p-6 bg-muted rounded-lg border border-border">
            <p className="text-xs font-bold text-muted-foreground tracking-tight mb-2">선택된 사용자 ({selectedBulkItems.length}명)</p>
            <div className="flex flex-wrap gap-2">
              {selectedBulkItems.slice(0, 5).map(u => (
                <span key={u.userId} className="px-3 py-1 bg-card border border-border rounded-lg text-xs font-bold text-foreground">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-xs font-bold text-muted-foreground">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>

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
              onClick={() => setIsBulkMoveModalOpen(false)} 
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
            >
              취소
            </button>
            <Button 
              onClick={async () => {
                if (!targetDeptId) {
                  toast('이동할 부서를 선택해주세요.', 'error');
                  return;
                }
                setIsSaving(true);
                try {
                  const res = await bulkMoveUserDeptAction(selectedBulkItems.map(u => u.userId), targetDeptId);
                  if (res.success) {
                    toast(res.message, 'success');
                    refetchUsers();
                    setIsBulkMoveModalOpen(false);
                  } else {
                    toast(res.message, 'error');
                  }
                } catch (_err) {
                  toast('부서 이동 중 오류 발생', 'error');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-[2] h-11 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all"
            >
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : '부서 이동 실행'}
            </Button>
          </div>
        </div>
      </StandardModal>

      {/* Bulk Role Modal */}
      <StandardModal
        isOpen={isBulkRoleModalOpen}
        onClose={() => setIsBulkRoleModalOpen(false)}
        title="사용자 권한 일괄 변경"
        maxWidth="sm"
      >
        <div className="space-y-8 p-4">
          <div className="p-6 bg-muted rounded-lg border border-border">
            <p className="text-xs font-bold text-muted-foreground tracking-tight mb-2">선택된 사용자 ({selectedBulkItems.length}명)</p>
            <div className="flex flex-wrap gap-2">
              {selectedBulkItems.slice(0, 5).map(u => (
                <span key={u.userId} className="px-3 py-1 bg-card border border-border rounded-lg text-xs font-bold text-foreground">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-xs font-bold text-muted-foreground">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>
          
          <div className="space-y-4">
            <p id="bulk-role-label" className="text-xs font-bold text-foreground tracking-tight">변경할 권한 선택</p>
            <div role="radiogroup" aria-labelledby="bulk-role-label" className="grid grid-cols-1 gap-3">
              {[
                { code: 'USER', label: '일반 사용자 (USER)', icon: <Users size={18} /> },
                { code: 'ADMIN', label: '시스템 관리자 (ADMIN)', icon: <ShieldCheck size={18} /> }
              ].map(r => (
                <button
                  key={r.code}
                  type="button"
                  role="radio"
                  aria-checked={targetRole === r.code}
                  onClick={() => setTargetRole(r.code)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-lg border-2 transition-all",
                    targetRole === r.code ? "border-primary bg-primary/5 shadow-lg" : "border-border hover:border-border bg-card"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      targetRole === r.code ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                    )}>
                      {r.icon}
                    </div>
                    <span className="text-sm font-bold tracking-tight text-foreground">{r.label}</span>
                  </div>
                  {targetRole === r.code && <div className="w-5 h-5 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg"><ChevronRight size={12} /></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={() => setIsBulkRoleModalOpen(false)} 
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-card hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
            >
              취소
            </button>
            <Button 
              onClick={async () => {
                setIsSaving(true);
                try {
                  const res = await bulkUpdateUserRoleAction(selectedBulkItems.map(u => u.userId), targetRole);
                  if (res.success) {
                    toast(res.message, 'success');
                    refetchUsers();
                    setIsBulkRoleModalOpen(false);
                  } else {
                    toast(res.message, 'error');
                  }
                } catch (_err) {
                  toast('권한 변경 중 오류 발생', 'error');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-[2] h-11 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-tight shadow-2xl hover:bg-primary transition-all"
            >
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : '권한 변경 실행'}
            </Button>
          </div>
        </div>
      </StandardModal>

    </div>
    </TooltipProvider>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        "flex-1 flex items-center justify-center gap-3 py-3 px-6 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 relative overflow-hidden",
        active
          ? "bg-surface-inverse text-surface-inverse-foreground shadow-lg scale-[1.02] z-10"
          : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/40"
      )}
    >
      <span className={cn(
        "transition-colors shrink-0",
        active ? "text-primary" : "text-muted-foreground"
      )}>
        {icon}
      </span>
      <span>{label}</span>
      {active && (
        <motion.div 
          layoutId="activeTabGlow"
          className="absolute right-0 top-0 w-16 h-16 bg-primary/20 rounded-full blur-2xl opacity-40 -mr-8 -mt-8 pointer-events-none" 
        />
      )}
    </button>
  );
}

/**
 * '조직 정책' 탭 패널.
 *
 * 종전에는 이 탭이 사용자 목록을 그대로 재사용해, 정책 화면인 척하며 계정 목록을 보여줬다
 * (감사: 사용자/조직 > 부재관리·개인정보정책 D등급). 이 허브에는 정책 편집 기능이 없으므로
 * 실제 편집 화면으로 안내한다 — 없는 기능을 있는 것처럼 그리지 않는다.
 */
function OrgPolicyPanel({ onNavigate }: { onNavigate: (href: string) => void }) {
  const links: { href: string; title: string; description: string }[] = [
    {
      href: '/admin/security/login-policy',
      title: '로그인 정책 관리',
      description: '비밀번호 규칙·계정 잠금 등 접속 정책을 편집합니다.',
    },
    {
      href: '/admin/system/policies',
      title: '개인정보처리방침 · 이용약관',
      description: '공개 페이지에 노출되는 정책 본문을 편집합니다.',
    },
    {
      href: '/admin/security/authority',
      title: '권한 정책 관리',
      description: '역할별 권한과 사용자 매핑을 관리합니다.',
    },
  ];

  return (
    <div className="space-y-4 py-2">
      <div role="note" className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/50 text-left">
        <Info size={16} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs font-bold text-muted-foreground leading-relaxed">
          조직 정책 편집 기능은 이 허브가 아니라 아래 전용 화면에 있습니다.
        </p>
      </div>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <button
              type="button"
              onClick={() => onNavigate(link.href)}
              className="w-full flex items-center justify-between gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/60 transition-all text-left outline-none cursor-pointer"
            >
              <span className="space-y-1">
                <span className="block text-sm font-black text-foreground tracking-tight">{link.title}</span>
                <span className="block text-xs font-bold text-muted-foreground">{link.description}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-4 p-8 rounded-lg bg-muted/50 shadow-inner border border-border transition-all hover:bg-card hover:shadow-2xl hover:scale-105 group cursor-default relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
        {icon}
      </div>
      <h5 className="text-xs font-bold text-muted-foreground/60 tracking-tight flex items-center gap-3 group-hover:text-primary transition-colors relative z-10">
        {icon} {label}
      </h5>
      <p className="text-2xl font-bold tracking-tighter text-foreground truncate leading-none relative z-10 py-1">
        {value}
      </p>
    </div>
  );
}
