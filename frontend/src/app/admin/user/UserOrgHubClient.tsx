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
  Settings, 
  UserCog, 
  MapPin, 
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
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
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
                    isOverlay && "bg-white shadow-2xl border-primary ring-4 ring-primary/5 scale-105"
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
                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        </div>
                    )}
                </div>
            </button>
        </div>
    );
};

type UserOrgTab = 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';

export default function UserOrgHubClient({ 
  defaultTab = 'USERS',
  usersPromise,
  deptsPromise
}: { 
  defaultTab?: UserOrgTab;
  usersPromise: Promise<any>;
  deptsPromise: Promise<any>;
}) {
  const initialUsers = use(usersPromise);
  const initialDepts = use(deptsPromise);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = React.useTransition();
  const [activeTab, setActiveTab] = useState<UserOrgTab>(defaultTab);
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  const [userPage, setUserPage] = useState(1);
  const [deptPage] = useState(1);

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

  const { data: usersData, isLoading: isUsersLoading, error: _usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', searchKeyword, userPage],
    queryFn: () => userAdminService.getUserList({ pageNo: userPage, searchKeyword }),
    enabled: activeTab === 'USERS' || activeTab === 'ABSENCES',
    initialData: (userPage === 1 && !searchKeyword) ? initialUsers : undefined
  });
  const users = useMemo(() => {
    const list = usersData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as UserManage[];
  }, [usersData]);

  const { data: deptsData, isLoading: isDeptsLoading, error: _deptsError, refetch: refetchDepts } = useQuery({
    queryKey: ['admin-depts', searchKeyword, deptPage],
    queryFn: () => deptAdminService.getDeptList({ pageNo: deptPage, searchKeyword }),
    enabled: activeTab === 'DEPTS',
    initialData: (deptPage === 1 && !searchKeyword) ? initialDepts : undefined
  });

  // D&D States for Depts
  const [flattenedDepts, setFlattenedDepts] = useState<FlattenedDept[]>([]);
  const [activeDeptId, setActiveDeptId] = useState<string | null>(null);
  const [hasDeptChanges, setHasDeptChanges] = useState(false);

  const departments = useMemo(() => {
    const list = deptsData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as Department[];
  }, [deptsData]);

  useEffect(() => {
    if (activeTab === 'DEPTS' && departments.length > 0) {
        // Build tree and flatten it for D&D
        const tree = listToDeptTree(departments as any);
        setFlattenedDepts(flattenDeptTree(tree));
    }
  }, [departments, activeTab]);

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
      setIsUserModalOpen(false);
    } catch (_error) {
      toast('사용자 저장 중 오류가 발생했습니다.', 'error');
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
    
    const ok = await confirm({
      title: '아이덴티티 삭제',
      message: '해당 사용자의 모든 접근 권한과 아이덴티티 프로필을 시스템에서 영구히 말소하시겠습니까?',
      variant: 'destructive',
      confirmText: '접근차단실행'
    });

    if (ok) {
      try {
        await userAdminService.deleteUser(selectedItemId as string);
        toast('아이덴티티가 성공적으로 말소되었습니다.', 'success');
        setSelectedItemId(null);
        refetchUsers();
      } catch (_error) {
        toast('말소 프로세스 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const handleBulkDelete = async (items: (UserManage | Department)[]) => {
    const userItems = items as UserManage[];
    const ok = await confirm({
      title: '일괄 신원 말소',
      message: `${userItems.length}명의 사용자를 시스템에서 영구히 삭제하시겠습니까?`,
      variant: 'destructive',
      confirmText: '일괄말소실행'
    });
    if (ok) {
      const res = await bulkDeleteUsersAction(userItems.map(u => u.userId));
      if (res.success) {
        toast(res.message, 'success');
        refetchUsers();
      } else {
        toast(res.message, 'error');
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

  // --- Resilience Monitoring: Global Error Feedback ---
  React.useEffect(() => {
    if (_usersError) {
      const msg = (_usersError as any)?.response?.data?.message || '사용자 데이터를 불러오는데 오류가 발생했습니다.';
      toast(msg, 'error');
    }
  }, [_usersError, toast]);

  React.useEffect(() => {
    if (_deptsError) {
      toast('부서 데이터를 불러오는데 실패했습니다.', 'error');
    }
  }, [_deptsError, toast]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'USERS' || activeTab === 'ABSENCES') return (users || []).find(u => u?.userId === selectedItemId);
    if (activeTab === 'DEPTS') return (departments || []).find(d => d?.ognzId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, users, departments]);

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
            <p className={cn("text-[10px] font-bold tracking-tight opacity-60 ", selectedItemId === user.esntlId ? "text-white/80" : "text-muted-foreground")}>{user.userId}</p>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  type="button"
                  aria-label="개인화 환경 설정" 
                  className="h-10 w-12 rounded-xl bg-white border border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-sm group active:scale-95 flex items-center justify-center outline-none cursor-pointer"
                >
                  <Settings size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                환경 설정
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button 
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
                  <span>{activeTab === 'DEPTS' ? '부서 등록' : activeTab === 'ABSENCES' ? '부재 등록' : '사용자 등록'}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                {activeTab === 'DEPTS' ? '새로운 부서 추가' : '새로운 사용자 생성'}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      {/* --- Horizontal Premium Tab Controls --- */}
      <div className="flex bg-muted/60 backdrop-blur-md p-1.5 rounded-2xl border border-border/50 max-w-4xl w-full mb-10 relative z-10 shadow-sm">
        <NavButton icon={<Users size={16} />} label="사용자" active={activeTab === 'USERS'} onClick={() => startTransition(() => { setActiveTab('USERS'); setSelectedItemId(null); })} />
        <NavButton icon={<Network size={16} />} label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => startTransition(() => { setActiveTab('DEPTS'); setSelectedItemId(null); })} />
        <NavButton icon={<UserMinus size={16} />} label="부재 관리" active={activeTab === 'ABSENCES'} onClick={() => startTransition(() => { setActiveTab('ABSENCES'); setSelectedItemId(null); })} />
        <NavButton icon={<ShieldCheck size={16} />} label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => startTransition(() => { setActiveTab('POLICIES'); setSelectedItemId(null); })} />
      </div>

      <div className={cn("grid grid-cols-12 gap-8 min-h-[800px] transition-opacity duration-500", isPending && "opacity-60 pointer-events-none")}>
        <div className={cn("col-span-12 lg:col-span-7 h-full flex flex-col gap-6 transition-opacity duration-300", isPending && "opacity-50")}>
          <HubSectionCard
            title={activeTab === 'DEPTS' ? "조직 구조" : "사용자 목록"}
            description="실시간으로 동기화되는 조직 및 사용자 명세입니다."
            icon={activeTab === 'DEPTS' ? Network : Users}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between px-1 pt-1 border-b border-border/50 pb-6">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">실시간 데이터 동기화</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      type="button"
                      aria-label="서버 데이터 동기화" 
                      onClick={() => queryClient.invalidateQueries()} 
                      className="h-10 rounded-xl px-5 text-[10px] font-black tracking-widest gap-2 bg-muted hover:bg-surface-inverse text-foreground hover:text-surface-inverse-foreground border border-border/60 transition-all group shadow-sm uppercase flex items-center justify-center outline-none cursor-pointer"
                    >
                      <RefreshCcw size={14} className={cn("text-primary group-hover:text-white transition-colors", isUsersLoading || isDeptsLoading ? "animate-spin" : "group-hover:rotate-180")} /> 동기화
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-surface-inverse text-surface-inverse-foreground border-none rounded-lg px-4 py-2 text-xs font-bold tracking-tight">
                    데이터 동기화
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="relative group/search">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
                <Input
                  className="pl-14 h-10 bg-muted border-none rounded-xl text-xs font-bold tracking-tight shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground"
                  placeholder="검색어를 입력하세요..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  suppressHydrationWarning
                />
              </div>

              <div className="overflow-y-auto pr-2 custom-scrollbar max-h-[600px]">
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
                        <div className="space-y-1">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                                onDragStart={(e) => setActiveDeptId(e.active.id as string)}
                                onDragEnd={(event) => {
                                    const { active, over } = event;
                                    if (over && active.id !== over.id) {
                                        setFlattenedDepts((items) => {
                                            const oldIndex = items.findIndex(n => n.ognzId === active.id);
                                            const newIndex = items.findIndex(n => n.ognzId === over.id);
                                            const newItems = arrayMove(items, oldIndex, newIndex);
                                            
                                            const proj = getDeptProjection(items, active.id as string, over.id as string, 0, INDENTATION_WIDTH);
                                            if (proj) {
                                                const idx = newItems.findIndex(n => n.ognzId === active.id);
                                                newItems[idx] = { ...newItems[idx], parentId: proj.parentId, depth: proj.depth };
                                            }
                                            return newItems;
                                        });
                                        setHasDeptChanges(true);
                                    }
                                    setActiveDeptId(null);
                                }}
                            >
                                <SortableContext items={flattenedDepts.map(n => n.ognzId || '')} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                        {flattenedDepts.map((node) => (
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
                                    } catch (_err) {
                                      console.error(_err);
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
                                    <div className="w-16 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto text-slate-200 border border-border shadow-inner">
                                        <SearchSlash size={32} />
                                    </div>
                                    <p className="text-xs font-bold tracking-tight text-muted-foreground uppercase tracking-widest">No nodes found</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <StandardDataTable<UserManage>
                            columns={userColumns as Column<UserManage>[]}
                            data={users}
                            loading={isUsersLoading}
                            error={_usersError as Error | null}
                            onRetry={() => refetchUsers()}
                            onRowClick={(item) => {
                                if (item.userId) setSelectedItemId(item.userId);
                            }}
                            keyField="userId"
                            emptyMessage="데이터가 존재하지 않습니다."
                            isPremium={true}
                            enableSelection={true}
                            bulkActions={userBulkActions}
                            className="border-none shadow-none bg-transparent"
                            pagination={{
                                currentPage: userPage,
                                totalPages: usersData?.totalPage || 1,
                                onPageChange: (p) => setUserPage(p)
                            }}
                        />
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
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.ognzNm?.[0] : (selectedItem as UserManage)?.userNm?.[0]}
                        </span>
                      </div>
                      <div className="space-y-4 pt-1">
                        <h2 className="text-4xl font-black text-foreground tracking-tighter leading-none truncate max-w-[350px]">
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.ognzNm : (selectedItem as UserManage)?.userNm}
                        </h2>
                        <div className="flex gap-3">
                          <span className="bg-primary/5 text-primary text-[10px] font-black px-4 py-1.5 rounded-lg tracking-widest border border-primary/10 shadow-sm flex items-center gap-2 uppercase">
                            <ShieldCheck size={14} /> 인증됨
                          </span>
                          {activeTab === 'ABSENCES' && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-4 py-1.5 rounded-lg tracking-widest border border-amber-200 shadow-sm animate-pulse uppercase">
                              자리비움
                            </span>
                          )}
                        </div>
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
                    <div className="grid grid-cols-2 gap-6">
                      <InfoBlock icon={<Mail size={16} />} label="이메일 주소" value={(selectedItem as UserManage)?.emlAddr || (activeTab === 'DEPTS' ? '부서 공용' : '미지정')} />
                      <InfoBlock icon={<Phone size={16} />} label="연락처" value={(selectedItem as UserManage)?.mblTelno || (selectedItem as Department)?.ognzNm || '미등록'} />
                      <InfoBlock icon={<Building2 size={16} />} label="소속 부서" value={(selectedItem as UserManage)?.ognzId || (selectedItem as Department)?.ognzId || '최상위'} />
                      <InfoBlock icon={<MapPin size={16} />} label="근무지" value="본사" />
                    </div>

                    <div className="pt-10 border-t border-border/50 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-muted-foreground tracking-widest leading-none mb-1.5 uppercase">권한 프로토콜</h4>
                            <p className="text-sm font-black text-foreground tracking-tighter uppercase leading-none">접근 제어 정책</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          className="h-10 px-5 rounded-xl bg-muted hover:bg-surface-inverse text-[10px] font-black text-foreground hover:text-surface-inverse-foreground gap-2 transition-all uppercase flex items-center justify-center outline-none cursor-pointer"
                        >
                          권한 설정 <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {['ACCESS_CMS', 'SYSTEM_ADMIN', 'ANALYTICS', 'USER_DIRECTORY', 'SECURITY_AUDIT'].map(p => (
                          <div key={p} className="pl-4 pr-6 py-3 bg-muted border border-border rounded-xl text-[10px] font-black text-muted-foreground tracking-widest shadow-sm flex items-center gap-2.5 group/tag hover:border-primary/30 transition-all cursor-default uppercase">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-10 mt-auto border-t border-border/50 relative z-10">
                    <button 
                      type="button"
                      onClick={handleDeleteUser}
                      className="flex-1 h-10 bg-muted text-rose-500 rounded-xl font-black tracking-widest text-[10px] hover:bg-rose-500 hover:text-white transition-all shadow-sm uppercase outline-none cursor-pointer flex items-center justify-center"
                    >
                      접근 차단
                    </button>
                    <Button className="flex-[2] h-10 bg-surface-inverse text-surface-inverse-foreground rounded-xl font-black tracking-widest text-[10px] shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 group uppercase">
                      <Zap size={16} className="text-primary group-hover:animate-pulse" /> 변경사항 저장
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full rounded-2xl border-4 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center p-20 text-center select-none group">
                <div className="w-28 h-24 rounded-2xl bg-white border border-border flex items-center justify-center text-slate-200 shadow-xl mb-10 group-hover:rotate-6 transition-transform duration-700">
                  <Contact2 size={50} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-3xl font-black text-slate-200 tracking-tighter uppercase">선택 대기 중</h3>
                <p className="text-[10px] font-bold text-slate-300 tracking-tight mt-4 leading-relaxed max-w-[280px] uppercase tracking-widest">스트림에서 부서 또는 사용자를 선택하여 관리를 시작하십시오.</p>
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
          mode={formMode}
          initialData={formMode === 'edit' ? (selectedItem as UserManage) : undefined}
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
                <span key={u.userId} className="px-3 py-1 bg-white border border-border rounded-lg text-xs font-bold text-foreground">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-xs font-bold text-muted-foreground">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>
          
          <div className="space-y-4">
            <label className="text-xs font-bold text-foreground tracking-tight">변경할 상태 선택</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { code: 'P', label: '정상 (Active)', color: 'bg-emerald-500' },
                { code: 'A', label: '승인 대기 (Pending)', color: 'bg-amber-500' },
                { code: 'D', label: '비활성 (Disabled)', color: 'bg-slate-400' }
              ].map(s => (
                <button
                  key={s.code}
                  onClick={() => setTargetStatus(s.code)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all",
                    targetStatus === s.code ? "border-primary bg-primary/5 shadow-lg" : "border-border hover:border-border bg-white"
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
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-white hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
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
                <span key={u.userId} className="px-3 py-1 bg-white border border-border rounded-lg text-xs font-bold text-foreground">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-xs font-bold text-muted-foreground">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-foreground tracking-tight">이동할 대상 부서 선택</label>
            <div className="max-h-[400px] overflow-y-auto border-2 border-border rounded-lg p-4 custom-scrollbar bg-muted/30">
              {flattenedDepts.map((node) => (
                <div
                  key={node.ognzId}
                  style={{ paddingLeft: `${node.depth * 20}px` }}
                  className="mb-1"
                >
                  <button
                    onClick={() => setTargetDeptId(node.ognzId || '')}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                      targetDeptId === node.ognzId ? "bg-primary text-white shadow-lg" : "hover:bg-white hover:shadow-sm text-foreground"
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
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-white hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
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
                <span key={u.userId} className="px-3 py-1 bg-white border border-border rounded-lg text-xs font-bold text-foreground">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-xs font-bold text-muted-foreground">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>
          
          <div className="space-y-4">
            <label className="text-xs font-bold text-foreground tracking-tight">변경할 권한 선택</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { code: 'USER', label: '일반 사용자 (USER)', icon: <Users size={18} /> },
                { code: 'ADMIN', label: '시스템 관리자 (ADMIN)', icon: <ShieldCheck size={18} /> }
              ].map(r => (
                <button
                  key={r.code}
                  onClick={() => setTargetRole(r.code)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-lg border-2 transition-all",
                    targetRole === r.code ? "border-primary bg-primary/5 shadow-lg" : "border-border hover:border-border bg-white"
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
              className="flex-1 h-11 rounded-lg font-bold text-xs tracking-tight border border-border text-muted-foreground bg-white hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all outline-none cursor-pointer flex items-center justify-center"
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
      onClick={onClick}
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

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-4 p-8 rounded-lg bg-muted/50 shadow-inner border border-border transition-all hover:bg-white hover:shadow-2xl hover:scale-105 group cursor-default relative overflow-hidden">
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
