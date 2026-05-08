'use client';

import React, { useState, useMemo, use, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import {
  Users,
  Network,
  UserMinus,
  ShieldCheck,
  Search,
  Plus,
  Pencil,
  UserPlus,
  Building2,
  FileCheck,
  Activity,
  ChevronRight,
  Lock,
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
  ArrowUpRight,
  CloudLightning,
  Contact2,
  Layers,
  Tag,
  SearchSlash,
  Save
} from 'lucide-react';
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
import { PagePagination } from '@/components/common/PagePagination';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useRouter } from 'next/navigation';
import { saveDeptHierarchyAction } from '@/app/actions/deptActions';
import { 
  bulkUpdateUserStatusAction, 
  bulkMoveUserDeptAction, 
  bulkDeleteUsersAction,
  bulkUpdateUserRoleAction
} from '@/app/actions/userActions';

import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField } from '@/app/components/ui/standard-form';

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
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
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
    } = useSortable({ id: node.orgnztId || '' });

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
                    <div className="absolute left-[11px] top-[-10px] bottom-1/2 w-px bg-slate-200" />
                    <div className="absolute left-[11px] top-1/2 w-3 h-px bg-slate-200" />
                </>
            )}

            <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={onClick}
                className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all relative overflow-hidden",
                    "hover:bg-slate-50 border border-transparent",
                    isSelected && "bg-primary text-white shadow-lg shadow-primary/20 border-primary/20",
                    isOverlay && "bg-white shadow-2xl border-primary ring-4 ring-primary/5 scale-105"
                )}
            >
                <div className="flex items-center gap-3 truncate relative z-10 w-full">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0",
                        isSelected ? "bg-white/20 text-white" : "bg-indigo-50 text-indigo-500 group-hover:bg-primary/10 group-hover:text-primary"
                    )}>
                        <Building2 size={14} />
                    </div>
                    <div className="flex flex-col truncate items-start">
                        <span className={cn(
                            "text-[11px] font-black truncate leading-tight uppercase tracking-tight",
                            isSelected ? "text-white" : "text-slate-900"
                        )}>
                            {node.orgnztNm}
                        </span>
                        <span className={cn(
                            "text-[9px] font-mono font-bold tracking-tighter opacity-60",
                            isSelected ? "text-white" : "text-slate-500"
                        )}>
                            {node.orgnztId}
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
  const [deptPage, setDeptPage] = useState(1);

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

  const { data: usersData, isLoading: isUsersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', searchKeyword, userPage],
    queryFn: () => userAdminService.getUserList({ pageNo: userPage, searchKeyword }),
    enabled: activeTab === 'USERS' || activeTab === 'ABSENCES',
    initialData: (userPage === 1 && !searchKeyword) ? initialUsers : undefined
  });
  const users = useMemo(() => {
    const list = usersData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as UserManage[];
  }, [usersData]);

  const { data: deptsData, isLoading: isDeptsLoading, error: deptsError, refetch: refetchDepts } = useQuery({
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
    } catch (error) {
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
    } catch (error) {
      toast('부서 저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedItemId) return;
    
    const ok = await confirm({
      title: '아이덴티티 삭제',
      message: '해당 사용자의 모든 접근 권한과 아이덴티티 프로필을 시스템에서 영구히 말소하시겠습니까?',
      variant: 'destructive',
      confirmText: 'REVOKE_IDENTITY'
    });

    if (ok) {
      try {
        await userAdminService.deleteUser(selectedItemId as string);
        toast('아이덴티티가 성공적으로 말소되었습니다.', 'success');
        setSelectedItemId(null);
        refetchUsers();
      } catch (error) {
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
      confirmText: 'BULK_REVOKE'
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
    if (usersError) {
      const msg = (usersError as any)?.response?.data?.message || '사용자 데이터를 불러오는데 오류가 발생했습니다.';
      toast(msg, 'error');
    }
  }, [usersError, toast]);

  React.useEffect(() => {
    if (deptsError) {
      toast('부서 데이터를 불러오는데 실패했습니다.', 'error');
    }
  }, [deptsError, toast]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'USERS' || activeTab === 'ABSENCES') return (users || []).find(u => u?.userId === selectedItemId);
    if (activeTab === 'DEPTS') return (departments || []).find(d => d?.orgnztId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, users, departments]);

  const userColumns: Column<UserManage>[] = [
    {
      header: 'IDENTITY',
      accessor: (user) => (
        <div className="flex items-center gap-6 py-2">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === user?.esntlId ? "bg-white/10 text-white" : "bg-slate-50 text-slate-500"
          )}>
            {user?.userNm?.[0]}
          </div>
          <div className="space-y-1">
            <h4 className={cn("text-md font-black tracking-tighter leading-none uppercase", selectedItemId === user.esntlId ? "text-white" : "text-foreground")}>
              {user.userNm}
            </h4>
            <p className={cn("text-[8px] font-black tracking-[0.3em] uppercase opacity-100 font-mono")}>_ {user.userId}</p>
          </div>
        </div>
      )
    }
  ];

  const deptColumns: Column<Department>[] = [
    {
      header: 'TOPOLOGY_NODE',
      accessor: (dept) => (
        <div className="flex items-center gap-6 py-2">
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === dept.orgnztId ? "bg-white/10 text-indigo-400" : "bg-indigo-50/50 text-indigo-500"
          )}>
            <Building2 size={24} />
          </div>
          <div className="space-y-1">
            <h4 className={cn("text-md font-black tracking-tighter leading-none uppercase", selectedItemId === dept.orgnztId ? "text-white" : "text-foreground")}>
              {dept.orgnztNm}
            </h4>
            <p className={cn("text-[8px] font-black tracking-[0.4em] uppercase opacity-100 font-mono")}>_ NODE_{dept.orgnztId}</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="조직 아키텍처 거버넌스"
        breadcrumbs={[{ label: '사용자 관리' }, { label: '조직 통합 허브' }]}
      />

      <HubHeader
        title="Identity"
        highlight="Fabric"
        subtitle="전사 인적 자원 매트릭스 및 조직 계층 토폴로지 통합 컨트롤 센터"
        icon={UserCog}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="lg" aria-label="개인화 환경 설정" className="h-14 w-14 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95">
                  <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                개인화 UI 및 필터 환경 설정
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="lg" 
                  className="h-14 px-10 rounded-xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
                  onClick={() => {
                    setFormMode('create');
                    if (activeTab === 'DEPTS') {
                      setIsDeptModalOpen(true);
                    } else {
                      setIsUserModalOpen(true);
                    }
                  }}
                >
                  {activeTab === 'DEPTS' ? <LayoutGrid size={20} /> : <UserPlus size={20} />}
                  {activeTab === 'DEPTS' ? '신규 부서 등록' : activeTab === 'ABSENCES' ? '부재 등록' : '사용자 등록'}
                  <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                {activeTab === 'DEPTS' ? '디렉토리에 새로운 조직 노드 추가' : '새로운 아이덴티티 프로필 생성'}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      <div className={cn("grid grid-cols-12 gap-12 min-h-[900px] transition-opacity duration-500", isPending && "opacity-60 pointer-events-none")}>
        <div className="col-span-12 lg:col-span-3 space-y-8 flex flex-col h-full">
          <div className="rounded-xl bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-4">
            <NavButton icon={<Users size={22} />} subLabel="Section_01" label="사용자" active={activeTab === 'USERS'} onClick={() => startTransition(() => { setActiveTab('USERS'); setSelectedItemId(null); })} />
            <NavButton icon={<Network size={22} />} subLabel="Section_02" label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => startTransition(() => { setActiveTab('DEPTS'); setSelectedItemId(null); })} />
            <NavButton icon={<UserMinus size={22} />} subLabel="Section_03" label="부재 관리" active={activeTab === 'ABSENCES'} onClick={() => startTransition(() => { setActiveTab('ABSENCES'); setSelectedItemId(null); })} />
            <NavButton icon={<ShieldCheck size={22} />} subLabel="Section_04" label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => startTransition(() => { setActiveTab('POLICIES'); setSelectedItemId(null); })} />
          </div>

          <div className="mt-auto rounded-xl bg-slate-900 text-white p-12 space-y-8 shadow-2xl relative overflow-hidden group border-none">
            <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
              <CloudLightning size={240} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-6 text-center lg:text-left">
              <div className="w-16 h-16 bg-white/10 rounded-xl flex items-center justify-center mx-auto lg:mx-0 border border-white/5 shadow-inner group-hover:rotate-12 transition-transform">
                <Activity size={32} className="text-primary" />
              </div>
              <div className="space-y-4">
                <h4 className="text-2xl font-black tracking-tighter leading-tight uppercase font-mono">_ IDENTITY<br />INTELLIGENCE</h4>
                <p className="text-[10px] text-white/80 font-black tracking-[0.4em] uppercase leading-relaxed font-mono">Active Directory (AD)<br />동기화 완료</p>
              </div>
            </div>
          </div>
        </div>

        <div className={cn("col-span-12 lg:col-span-4 h-full flex flex-col gap-8 transition-opacity duration-300", isPending && "opacity-50")}>
          <HubSectionCard
            title={activeTab === 'DEPTS' ? "조직 노드 토폴로지 스트림" : "인적 자원 아이덴티티 매트릭스"}
            description="전사 통합 디렉토리에서 실시간으로 동기화되는 객체 프로필 및 보안 상태 명세입니다"
            icon={activeTab === 'DEPTS' ? Network : Users}
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-8">
                <div>
                  <span className="text-[10px] font-black text-slate-600 tracking-[0.4em] uppercase font-mono">_ 실시간 디렉토리 동기화</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="서버 데이터 동기화" onClick={() => queryClient.invalidateQueries()} className="h-12 rounded-xl px-6 text-[10px] font-black tracking-widest gap-3 hover:bg-slate-900 hover:text-white bg-slate-50 border border-slate-100 transition-all uppercase group shadow-sm">
                      <RefreshCcw size={16} className={cn("text-primary group-hover:text-white transition-colors", isUsersLoading || isDeptsLoading ? "animate-spin" : "group-hover:rotate-180")} /> SYNCHRONIZE
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                    서버 지능형 엔진과 데이터 정합성 맞추기
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="relative group/search">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-60 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input
                  className="pl-16 h-16 bg-slate-50/50 border-none rounded-xl text-[11px] font-black tracking-widest shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-500 uppercase"
                  placeholder="Probing for identity..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  suppressHydrationWarning
                />
              </div>

              <div className="overflow-y-auto pr-2 custom-scrollbar max-h-[700px]">
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
                                            const oldIndex = items.findIndex(n => n.orgnztId === active.id);
                                            const newIndex = items.findIndex(n => n.orgnztId === over.id);
                                            const newItems = arrayMove(items, oldIndex, newIndex);
                                            
                                            const proj = getDeptProjection(items, active.id as string, over.id as string, 0, INDENTATION_WIDTH);
                                            if (proj) {
                                                const idx = newItems.findIndex(n => n.orgnztId === active.id);
                                                newItems[idx] = { ...newItems[idx], parentId: proj.parentId, depth: proj.depth };
                                            }
                                            return newItems;
                                        });
                                        setHasDeptChanges(true);
                                    }
                                    setActiveDeptId(null);
                                }}
                            >
                                <SortableContext items={flattenedDepts.map(n => n.orgnztId || '')} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                        {flattenedDepts.map((node) => (
                                            <SortableDeptNode
                                                key={node.orgnztId}
                                                node={node}
                                                isSelected={selectedItemId === node.orgnztId}
                                                onClick={() => setSelectedItemId(node.orgnztId || null)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>

                                {typeof document !== 'undefined' && createPortal(
                                    <DragOverlay dropAnimation={dropAnimation}>
                                        {activeDeptId ? (
                                            <SortableDeptNode
                                                node={flattenedDepts.find(n => n.orgnztId === activeDeptId)!}
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
                                    } catch (err) {
                                      console.error(err);
                                      toast('구조 저장 중 오류 발생', 'error');
                                    } finally {
                                      setIsSaving(false);
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="w-full h-12 rounded-xl bg-emerald-500 text-white font-black text-[10px] tracking-widest uppercase shadow-xl hover:bg-emerald-600 transition-all gap-2"
                                >
                                  {isSaving ? <RefreshCcw size={14} className="animate-spin" /> : <Save size={14} />} 
                                  Save_Topology_Structure
                                </Button>
                              </div>
                            )}
                            {flattenedDepts.length === 0 && !isDeptsLoading && (
                                <div className="py-20 text-center space-y-4">
                                    <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto text-slate-200 border border-slate-100 shadow-inner">
                                        <SearchSlash size={32} />
                                    </div>
                                    <p className="text-[10px] font-black tracking-[0.3em] uppercase text-slate-400">조직 노드를 찾을 수 없음</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <StandardDataTable<UserManage>
                            columns={userColumns as Column<UserManage>[]}
                            data={users}
                            loading={isUsersLoading}
                            error={usersError as Error | null}
                            onRetry={() => refetchUsers()}
                            onRowClick={(item) => {
                                if (item.userId) setSelectedItemId(item.userId);
                            }}
                            keyField="userId"
                            emptyMessage="검색된 객체가 존재하지 않습니다."
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
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                className="h-full flex flex-col gap-8"
              >
                <div className="rounded-xl bg-white border-2 border-slate-100 shadow-2xl h-full p-12 space-y-12 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000">
                    <SearchCode size={320} className="text-primary" />
                  </div>

                  <div className="flex items-start justify-between border-b border-slate-100 pb-12 relative z-10">
                    <div className="flex items-center gap-10">
                      <div className="w-28 h-28 bg-slate-900 rounded-xl flex items-center justify-center font-black text-5xl text-white shadow-2xl rotate-3 group hover:rotate-6 transition-transform">
                        <span className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm?.[0] : (selectedItem as UserManage)?.userNm?.[0]}
                        </span>
                      </div>
                      <div className="space-y-5 pt-2">
                        <h2 className="text-5xl font-black text-foreground tracking-tighter leading-none truncate max-w-[400px] uppercase font-mono">
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm : (selectedItem as UserManage)?.userNm}
                        </h2>
                        <div className="flex gap-4">
                          <span className="bg-primary/5 text-primary text-[10px] font-black px-6 py-2 rounded-xl tracking-widest uppercase border border-primary/10 shadow-sm flex items-center gap-2 font-mono">
                            <ShieldCheck size={14} /> 신원 확인됨
                          </span>
                          {activeTab === 'ABSENCES' && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-6 py-2 rounded-xl tracking-widest uppercase border border-amber-200 shadow-sm animate-pulse font-mono">
                              부재중
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      aria-label="객체 정보 수정"
                      className="h-16 w-16 rounded-xl bg-slate-50 hover:bg-slate-900 hover:text-white shadow-sm border border-slate-100 transition-all group"
                      onClick={() => {
                        setFormMode('edit');
                        if (activeTab === 'DEPTS') {
                          setIsDeptModalOpen(true);
                        } else {
                          setIsUserModalOpen(true);
                        }
                      }}
                    >
                      <Pencil size={24} className="group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-12 relative z-10">
                    <div className="grid grid-cols-2 gap-8">
                      <InfoBlock icon={<Mail size={18} />} label="Communication Endpoint" value={(selectedItem as UserManage)?.emailAdres || (activeTab === 'DEPTS' ? 'DEPT_INBOX' : 'PENDING_DNS')} />
                      <InfoBlock icon={<Phone size={18} />} label="Hotline Contact" value={(selectedItem as UserManage)?.moblphonNo || (selectedItem as Department)?.orgnztNm || 'NOT_DECLARED'} />
                      <InfoBlock icon={<Building2 size={18} />} label="Topology Cluster" value={(selectedItem as UserManage)?.orgnztId || (selectedItem as Department)?.orgnztId || 'GLOBAL_ROOT'} />
                      <InfoBlock icon={<MapPin size={18} />} label="Operational Zone" value="본사 클러스터" />
                    </div>

                    <div className="pt-12 border-t border-slate-100 space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-slate-600 tracking-[0.4em] uppercase font-mono leading-none mb-1">권한 프로토콜</h4>
                            <p className="text-sm font-black text-foreground tracking-tighter uppercase font-mono">_ 활성 권한 매트릭스</p>
                          </div>
                        </div>
                        <Button variant="ghost" className="h-12 px-6 rounded-xl bg-slate-50 text-[10px] font-black text-primary gap-3 uppercase tracking-widest hover:bg-primary hover:text-white transition-all font-mono">_ MANAGE_MATRIX <ChevronRight size={14} /></Button>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {['ACCESS_CMS', 'SYSTEM_ADMIN_LEVEL_4', 'ANALYTICS_DASHBOARD_LIVE', 'USER_DIRECTORY_CONTROLLER', 'SECURITY_AUDIT_PROBE'].map(p => (
                          <div key={p} className="pl-6 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-xl text-[10px] font-black text-slate-500 tracking-widest uppercase shadow-sm flex items-center gap-3 group/tag hover:border-primary/30 transition-all cursor-default font-mono">
                            <div className="w-2 h-2 rounded-full bg-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-12 mt-auto border-t border-slate-100 relative z-10">
                    <Button 
                      onClick={handleDeleteUser}
                      className="flex-1 h-16 bg-slate-100 text-rose-500 rounded-xl font-black tracking-widest text-[10px] hover:bg-rose-500 hover:text-white uppercase transition-all shadow-sm font-mono"
                    >
                      REVOKE_ACCESS
                    </Button>
                    <Button className="flex-[2] h-16 bg-slate-900 text-white rounded-xl font-black tracking-[0.4em] text-[10px] shadow-2xl shadow-primary/30 hover:bg-primary transition-all hover:-translate-y-2 uppercase group font-mono">
                      <Zap size={18} className="text-primary group-hover:animate-pulse" /> COMMIT_SPECIFICATION_CHANGE
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full rounded-xl border-4 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center p-24 text-center select-none group">
                <div className="w-32 h-32 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-200 shadow-xl mb-12 group-hover:rotate-12 transition-transform duration-1000">
                  <Contact2 size={64} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-4xl font-black text-slate-200 tracking-tighter uppercase font-mono">_ Idle_Probe_State</h3>
                <p className="text-[12px] font-black text-slate-300 tracking-[0.6em] mt-6 uppercase leading-relaxed max-w-[280px] font-mono">_ 인텔리전스 동기화를 시작하려면 토폴로지 스트림에서 엔터티를 선택하세요</p>
                <div className="mt-12 flex gap-4 opacity-10 grayscale">
                  <Fingerprint size={32} />
                  <Database size={32} />
                  <ShieldAlert size={32} />
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
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">선택된 사용자 ({selectedBulkItems.length}명)</p>
            <div className="flex flex-wrap gap-2">
              {selectedBulkItems.slice(0, 5).map(u => (
                <span key={u.userId} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-[10px] font-bold text-slate-400">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>
          
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest">변경할 상태 선택</label>
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
                    "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all",
                    targetStatus === s.code ? "border-primary bg-primary/5 shadow-lg" : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("w-2 h-2 rounded-full", s.color)} />
                    <span className="text-sm font-black tracking-tight text-slate-900">{s.label}</span>
                  </div>
                  {targetStatus === s.code && <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white"><ChevronRight size={10} /></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={() => setIsBulkStatusModalOpen(false)} className="flex-1 h-14 rounded-xl font-black text-[11px] tracking-widest uppercase">CANCEL</Button>
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
                } catch (err) {
                  toast('상태 변경 중 오류 발생', 'error');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-[2] h-14 rounded-xl bg-slate-900 text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all"
            >
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : 'COMMIT_CHANGES'}
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
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">선택된 사용자 ({selectedBulkItems.length}명)</p>
            <div className="flex flex-wrap gap-2">
              {selectedBulkItems.slice(0, 5).map(u => (
                <span key={u.userId} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-[10px] font-bold text-slate-400">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest">이동할 대상 부서 선택</label>
            <div className="max-h-[400px] overflow-y-auto border-2 border-slate-100 rounded-xl p-4 custom-scrollbar bg-slate-50/30">
              {flattenedDepts.map((node) => (
                <div
                  key={node.orgnztId}
                  style={{ paddingLeft: `${node.depth * 20}px` }}
                  className="mb-1"
                >
                  <button
                    onClick={() => setTargetDeptId(node.orgnztId || '')}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                      targetDeptId === node.orgnztId ? "bg-primary text-white shadow-lg" : "hover:bg-white hover:shadow-sm text-slate-700"
                    )}
                  >
                    <Building2 size={14} className={targetDeptId === node.orgnztId ? "text-white" : "text-slate-400"} />
                    <span className="text-[11px] font-black uppercase tracking-tight">{node.orgnztNm}</span>
                    <span className="text-[9px] font-mono opacity-50 ml-auto">ID_{node.orgnztId}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={() => setIsBulkMoveModalOpen(false)} className="flex-1 h-14 rounded-xl font-black text-[11px] tracking-widest uppercase">CANCEL</Button>
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
                } catch (err) {
                  toast('부서 이동 중 오류 발생', 'error');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-[2] h-14 rounded-xl bg-slate-900 text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all"
            >
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : 'EXECUTE_MIGRATION'}
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
          <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">선택된 사용자 ({selectedBulkItems.length}명)</p>
            <div className="flex flex-wrap gap-2">
              {selectedBulkItems.slice(0, 5).map(u => (
                <span key={u.userId} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700">{u.userNm}</span>
              ))}
              {selectedBulkItems.length > 5 && <span className="text-[10px] font-bold text-slate-400">외 {selectedBulkItems.length - 5}명</span>}
            </div>
          </div>
          
          <div className="space-y-4">
            <label className="text-[11px] font-black text-slate-900 uppercase tracking-widest">변경할 권한 선택</label>
            <div className="grid grid-cols-1 gap-3">
              {[
                { code: 'USER', label: '일반 사용자 (USER)', icon: <Users size={18} /> },
                { code: 'ADMIN', label: '시스템 관리자 (ADMIN)', icon: <ShieldCheck size={18} /> }
              ].map(r => (
                <button
                  key={r.code}
                  onClick={() => setTargetRole(r.code)}
                  className={cn(
                    "w-full flex items-center justify-between p-5 rounded-xl border-2 transition-all",
                    targetRole === r.code ? "border-primary bg-primary/5 shadow-lg" : "border-slate-100 hover:border-slate-200 bg-white"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      targetRole === r.code ? "bg-primary text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {r.icon}
                    </div>
                    <span className="text-sm font-black tracking-tight text-slate-900">{r.label}</span>
                  </div>
                  {targetRole === r.code && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white shadow-lg"><ChevronRight size={12} /></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="ghost" onClick={() => setIsBulkRoleModalOpen(false)} className="flex-1 h-14 rounded-xl font-black text-[11px] tracking-widest uppercase">CANCEL</Button>
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
                } catch (err) {
                  toast('권한 변경 중 오류 발생', 'error');
                } finally {
                  setIsSaving(false);
                }
              }}
              disabled={isSaving}
              className="flex-[2] h-14 rounded-xl bg-slate-900 text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all"
            >
              {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : 'UPDATE_AUTHORITY'}
            </Button>
          </div>
        </div>
      </StandardModal>

    </div>
    </TooltipProvider>
  );
}

function NavButton({ icon, subLabel, label, active, onClick }: { icon: React.ReactNode, subLabel: string, label: string, active: boolean, onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-full group p-8 rounded-xl border-2 transition-all flex items-center gap-6 relative overflow-hidden",
            active
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.03] z-10"
              : "bg-transparent border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-xl flex items-center justify-center transition-all shadow-lg relative z-10",
            active ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            {icon}
          </div>
          <div className="flex flex-col text-left relative z-10">
            <span className={cn("text-[10px] font-black tracking-widest uppercase mb-1 opacity-100", active && "opacity-100 font-mono")}>_ {subLabel}</span>
            <span className="text-md font-black tracking-tighter uppercase leading-tight font-mono">{label}</span>
          </div>
          {active && (
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-slate-900 text-white border-none rounded-xl px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
        {label} 섹션으로 이동
      </TooltipContent>
    </Tooltip>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-4 p-8 rounded-xl bg-slate-50/50 shadow-inner border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:scale-105 group cursor-default relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
        {icon}
      </div>
      <h5 className="text-[11px] font-black text-muted-foreground/60 tracking-[0.3em] flex items-center gap-3 uppercase group-hover:text-primary transition-colors font-mono relative z-10">
        {icon} {label}
      </h5>
      <p className="text-2xl font-black tracking-tighter text-slate-900 truncate leading-none relative z-10 py-1 font-mono">
        {value}
      </p>
    </div>
  );
}
