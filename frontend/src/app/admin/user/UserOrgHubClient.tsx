'use client';

import React, { useState, useMemo } from 'react';
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
  Contact2
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { userAdminService } from '@/services/foundation/system/UserAdminService';
import { UserManage } from '@/types/foundation/user';
import { deptAdminService, Department } from '@/services/foundation/system/DeptAdminService';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PagePagination } from '@/components/common/PagePagination';

import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField } from '@/app/components/ui/standard-form';

type UserOrgTab = 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';

const userSchema = z.object({
  userId: z.string().min(1, '아이디는 필수입니다.').max(20, '아이디는 20자 이내여야 합니다.'),
  userNm: z.string().min(1, '이름은 필수입니다.').max(30, '이름은 30자 이내여야 합니다.'),
  email: z.string().email('유효한 이메일 형식이 아닙니다.').optional().or(z.literal('')),
  moblphonNo: z.string().optional().or(z.literal('')),
  orgnztId: z.string().optional().or(z.literal('')),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').optional().or(z.literal('')),
});

const deptSchema = z.object({
  orgnztNm: z.string().min(1, '부서명은 필수입니다.').max(20, '부서명은 20자 이내여야 합니다.'),
  orgnztDc: z.string().max(100, '설명은 100자 이내여야 합니다.').optional().or(z.literal('')),
});

type UserFormValues = z.infer<typeof userSchema>;
type DeptFormValues = z.infer<typeof deptSchema>;

export default function UserOrgHubClient({ defaultTab = 'USERS' }: { defaultTab?: UserOrgTab }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<UserOrgTab>(defaultTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  const [userPage, setUserPage] = useState(1);
  const [deptPage, setDeptPage] = useState(1);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const userForm = useAppForm(userSchema, {
    defaultValues: { userId: '', userNm: '', email: '', moblphonNo: '', orgnztId: '', password: '' }
  });

  const deptForm = useAppForm(deptSchema, {
    defaultValues: { orgnztNm: '', orgnztDc: '' }
  });

  const { data: usersData, isLoading: isUsersLoading, error: usersError, refetch: refetchUsers } = useQuery({
    queryKey: ['admin-users', searchKeyword, userPage],
    queryFn: () => userAdminService.getUserList({ pageNo: userPage, searchKeyword }),
    enabled: activeTab === 'USERS' || activeTab === 'ABSENCES'
  });
  const users = usersData?.list || [];

  const { data: deptsData, isLoading: isDeptsLoading, error: deptsError, refetch: refetchDepts } = useQuery({
    queryKey: ['admin-depts', searchKeyword, deptPage],
    queryFn: () => deptAdminService.getDeptList({ pageNo: deptPage, searchKeyword }),
    enabled: activeTab === 'DEPTS'
  });
  const departments = deptsData?.list || [];

  const handleUserSubmit = userForm.handleSubmit(async (values: UserFormValues) => {
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
  });

  const handleDeptSubmit = deptForm.handleSubmit(async (values: DeptFormValues) => {
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
  });

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'USERS' || activeTab === 'ABSENCES') return users.find(u => u.esntlId === selectedItemId);
    if (activeTab === 'DEPTS') return departments.find(d => d.orgnztId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, users, departments]);

  const userColumns: Column<UserManage>[] = [
    {
      header: 'IDENTITY',
      accessor: (user) => (
        <div className="flex items-center gap-6 py-2">
          <div className={cn(
            "w-14 h-14 rounded-[0.1rem] flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === user.esntlId ? "bg-white/10 text-white" : "bg-slate-50 text-slate-300"
          )}>
            {user.userNm?.[0]}
          </div>
          <div className="space-y-1">
            <h4 className={cn("text-md font-black tracking-tighter leading-none uppercase", selectedItemId === user.esntlId ? "text-white" : "text-foreground")}>
              {user.userNm}
            </h4>
            <p className={cn("text-[8px] font-black tracking-[0.3em] uppercase opacity-40 font-mono italic")}>{user.userId}</p>
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
            "w-14 h-14 rounded-[0.1rem] flex items-center justify-center shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === dept.orgnztId ? "bg-white/10 text-indigo-400" : "bg-indigo-50/50 text-indigo-200"
          )}>
            <Building2 size={24} />
          </div>
          <div className="space-y-1">
            <h4 className={cn("text-md font-black tracking-tighter leading-none uppercase", selectedItemId === dept.orgnztId ? "text-white" : "text-foreground")}>
              {dept.orgnztNm}
            </h4>
            <p className={cn("text-[8px] font-black tracking-[0.4em] uppercase opacity-40 font-mono italic")}>NODE_{dept.orgnztId}</p>
          </div>
        </div>
      )
    }
  ];

  return (
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
                <Button variant="ghost" size="lg" className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95">
                  <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                개인화 UI 및 필터 환경 설정
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="lg" 
                  className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
                  onClick={() => {
                    setFormMode('create');
                    if (activeTab === 'DEPTS') {
                      deptForm.reset({ orgnztNm: '', orgnztDc: '' });
                      setIsDeptModalOpen(true);
                    } else {
                      userForm.reset({ userId: '', userNm: '', email: '', moblphonNo: '', orgnztId: '', password: '' });
                      setIsUserModalOpen(true);
                    }
                  }}
                >
                  {activeTab === 'DEPTS' ? <LayoutGrid size={20} /> : <UserPlus size={20} />}
                  {activeTab === 'DEPTS' ? '신규 부서 등록' : activeTab === 'ABSENCES' ? '부재 등록' : '사용자 등록'}
                  <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                {activeTab === 'DEPTS' ? '디렉토리에 새로운 조직 노드 추가' : '새로운 아이덴티티 프로필 생성'}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12 min-h-[900px]">
        <div className="col-span-12 lg:col-span-3 space-y-8 flex flex-col h-full">
          <div className="rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-4">
            <NavButton icon={<Users size={22} />} subLabel="Section_01" label="사용자" active={activeTab === 'USERS'} onClick={() => { setActiveTab('USERS'); setSelectedItemId(null); }} />
            <NavButton icon={<Network size={22} />} subLabel="Section_02" label="부서 관리" active={activeTab === 'DEPTS'} onClick={() => { setActiveTab('DEPTS'); setSelectedItemId(null); }} />
            <NavButton icon={<UserMinus size={22} />} subLabel="Section_03" label="부재 관리" active={activeTab === 'ABSENCES'} onClick={() => { setActiveTab('ABSENCES'); setSelectedItemId(null); }} />
            <NavButton icon={<ShieldCheck size={22} />} subLabel="Section_04" label="조직 정책" active={activeTab === 'POLICIES'} onClick={() => { setActiveTab('POLICIES'); setSelectedItemId(null); }} />
          </div>

          <div className="mt-auto rounded-[0.1rem] bg-slate-900 text-white p-12 space-y-8 shadow-2xl relative overflow-hidden group border-none">
            <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
              <CloudLightning size={240} className="text-primary" />
            </div>
            <div className="relative z-10 space-y-6 text-center lg:text-left">
              <div className="w-16 h-16 bg-white/10 rounded-[0.1rem] flex items-center justify-center mx-auto lg:mx-0 border border-white/5 shadow-inner group-hover:rotate-12 transition-transform">
                <Activity size={32} className="text-primary" />
              </div>
              <div className="space-y-4">
                <h4 className="text-2xl font-black tracking-tighter leading-tight uppercase font-mono italic">IDENTITY<br />INTELLIGENCE</h4>
                <p className="text-[10px] text-white/30 font-black tracking-[0.4em] uppercase leading-relaxed font-mono">Active Directory (AD)<br />동기화 완료</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-8">
          <HubSectionCard
            title={activeTab === 'DEPTS' ? "조직 노드 토폴로지 스트림" : "인적 자원 아이덴티티 매트릭스"}
            description="전사 통합 디렉토리에서 실시간으로 동기화되는 객체 프로필 및 보안 상태 명세입니다"
            icon={activeTab === 'DEPTS' ? Network : Users}
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-8">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic">실시간 디렉토리 동기화</span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-12 rounded-[0.1rem] px-6 text-[10px] font-black tracking-widest gap-3 hover:bg-slate-900 hover:text-white bg-slate-50 border border-slate-100 transition-all uppercase group shadow-sm">
                      <RefreshCcw size={16} className={cn("text-primary group-hover:text-white transition-colors", isUsersLoading || isDeptsLoading ? "animate-spin" : "group-hover:rotate-180")} /> SYNCHRONIZE
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                    서버 지능형 엔진과 데이터 정합성 맞추기
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="relative group/search">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input
                  className="pl-16 h-16 bg-slate-50/50 border-none rounded-[0.1rem] text-[11px] font-black tracking-widest shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/20 uppercase"
                  placeholder="Probing for identity..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
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
                  >
                    <StandardDataTable<UserManage | Department>
                      columns={(activeTab === 'DEPTS' ? deptColumns : userColumns) as Column<UserManage | Department>[]}
                      data={(activeTab === 'DEPTS' ? departments : users) as (UserManage | Department)[]}
                      loading={activeTab === 'DEPTS' ? isDeptsLoading : isUsersLoading}
                      error={(activeTab === 'DEPTS' ? deptsError : usersError) as Error | null}
                      onRetry={() => activeTab === 'DEPTS' ? refetchDepts() : refetchUsers()}
                      onRowClick={(item) => {
                        const id = activeTab === 'DEPTS'
                          ? (item as Department).orgnztId
                          : (item as UserManage).esntlId;
                        if (id) setSelectedItemId(id);
                      }}
                      keyField={(activeTab === 'DEPTS' ? 'orgnztId' : 'esntlId') as any}
                      emptyMessage="검색된 객체가 존재하지 않습니다."
                      isPremium={false}
                      className="border-none shadow-none bg-transparent"
                      pagination={{
                        currentPage: activeTab === 'DEPTS' ? deptPage : userPage,
                        totalPages: activeTab === 'DEPTS' ? (deptsData?.totalPage || 1) : (usersData?.totalPage || 1),
                        onPageChange: (p) => activeTab === 'DEPTS' ? setDeptPage(p) : setUserPage(p)
                      }}
                    />
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
                <div className="rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-2xl h-full p-12 space-y-12 flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000">
                    <SearchCode size={320} className="text-primary" />
                  </div>

                  <div className="flex items-start justify-between border-b border-slate-100 pb-12 relative z-10">
                    <div className="flex items-center gap-10">
                      <div className="w-28 h-28 bg-slate-900 rounded-[0.1rem] flex items-center justify-center font-black text-5xl text-white shadow-2xl rotate-3 group hover:rotate-6 transition-transform">
                        <span className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm?.[0] : (selectedItem as UserManage)?.userNm?.[0]}
                        </span>
                      </div>
                      <div className="space-y-5 pt-2">
                        <h2 className="text-5xl font-black text-foreground tracking-tighter leading-none truncate max-w-[400px] uppercase font-mono italic">
                          {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm : (selectedItem as UserManage)?.userNm}
                        </h2>
                        <div className="flex gap-4">
                          <span className="bg-primary/5 text-primary text-[10px] font-black px-6 py-2 rounded-[0.1rem] tracking-widest uppercase border border-primary/10 shadow-sm flex items-center gap-2 font-mono italic">
                            <ShieldCheck size={14} /> 신원 확인됨
                          </span>
                          {activeTab === 'ABSENCES' && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-6 py-2 rounded-[0.1rem] tracking-widest uppercase border border-amber-200 shadow-sm animate-pulse font-mono italic">
                              부재중
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-16 w-16 rounded-[0.1rem] bg-slate-50 hover:bg-slate-900 hover:text-white shadow-sm border border-slate-100 transition-all group"
                      onClick={() => {
                        setFormMode('edit');
                        if (activeTab === 'DEPTS') {
                          deptForm.reset({
                            orgnztNm: (selectedItem as Department).orgnztNm || '',
                            orgnztDc: (selectedItem as Department).orgnztDc || ''
                          });
                          setIsDeptModalOpen(true);
                        } else {
                          const user = selectedItem as UserManage;
                          userForm.reset({
                            userId: user.userId || '',
                            userNm: user.userNm || '',
                            email: user.email || '',
                            moblphonNo: user.moblphonNo || '',
                            orgnztId: user.orgnztId || '',
                            password: ''
                          });
                          setIsUserModalOpen(true);
                        }
                      }}
                    >
                      <Pencil size={24} className="group-hover:scale-110 transition-transform" />
                    </Button>
                  </div>

                  <div className="flex-1 space-y-12 relative z-10">
                    <div className="grid grid-cols-2 gap-8">
                      <InfoBlock icon={<Mail size={18} />} label="Communication Endpoint" value={(selectedItem as UserManage)?.email || (activeTab === 'DEPTS' ? 'DEPT_INBOX' : 'PENDING_DNS')} />
                      <InfoBlock icon={<Phone size={18} />} label="Hotline Contact" value={(selectedItem as UserManage)?.moblphonNo || (selectedItem as Department)?.orgnztNm || 'NOT_DECLARED'} />
                      <InfoBlock icon={<Building2 size={18} />} label="Topology Cluster" value={(selectedItem as UserManage)?.orgnztId || (selectedItem as Department)?.orgnztId || 'GLOBAL_ROOT'} />
                      <InfoBlock icon={<MapPin size={18} />} label="Operational Zone" value="본사 클러스터" />
                    </div>

                    <div className="pt-12 border-t border-slate-100 space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[0.1rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono leading-none mb-1">권한 프로토콜</h4>
                            <p className="text-sm font-black text-foreground tracking-tighter uppercase font-mono italic">활성 권한 매트릭스</p>
                          </div>
                        </div>
                        <Button variant="ghost" className="h-12 px-6 rounded-[0.1rem] bg-slate-50 text-[10px] font-black text-primary gap-3 uppercase tracking-widest hover:bg-primary hover:text-white transition-all font-mono italic">MANAGE_MATRIX <ChevronRight size={14} /></Button>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {['ACCESS_CMS', 'SYSTEM_ADMIN_LEVEL_4', 'ANALYTICS_DASHBOARD_LIVE', 'USER_DIRECTORY_CONTROLLER', 'SECURITY_AUDIT_PROBE'].map(p => (
                          <div key={p} className="pl-6 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-[0.1rem] text-[10px] font-black text-slate-500 tracking-widest uppercase shadow-sm flex items-center gap-3 group/tag hover:border-primary/30 transition-all cursor-default font-mono italic">
                            <div className="w-2 h-2 rounded-full bg-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-12 mt-auto border-t border-slate-100 relative z-10">
                    <Button className="flex-1 h-16 bg-slate-100 text-rose-500 rounded-[0.1rem] font-black tracking-widest text-[10px] hover:bg-rose-500 hover:text-white uppercase transition-all shadow-sm font-mono italic">REVOKE_ACCESS</Button>
                    <Button className="flex-[2] h-16 bg-slate-900 text-white rounded-[0.1rem] font-black tracking-[0.4em] text-[10px] shadow-2xl shadow-primary/30 hover:bg-primary transition-all hover:-translate-y-2 uppercase group font-mono italic">
                      <Zap size={18} className="text-primary group-hover:animate-pulse" /> COMMIT_SPECIFICATION_CHANGE
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full rounded-[0.1rem] border-4 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center p-24 text-center select-none group">
                <div className="w-32 h-32 rounded-[0.1rem] bg-white border-2 border-slate-100 flex items-center justify-center text-slate-200 shadow-xl mb-12 group-hover:rotate-12 transition-transform duration-1000">
                  <Contact2 size={64} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-4xl font-black text-slate-200 tracking-tighter uppercase font-mono italic">Idle_Probe_State</h3>
                <p className="text-[12px] font-black text-slate-300 tracking-[0.6em] mt-6 uppercase leading-relaxed max-w-[280px] font-mono italic">인텔리전스 동기화를 시작하려면 토폴로지 스트림에서 엔터티를 선택하세요</p>
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
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)} className="flex-1 h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
            <Button 
                onClick={handleUserSubmit} 
                className="flex-[2] h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all"
            >
              {formMode === 'create' ? '신규 등록' : '정보 수정'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUserSubmit} className="space-y-8 pt-4 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="사용자 아이디 (Identity_ID)" required>
              <Input
                {...userForm.register('userId')}
                readOnly={formMode === 'edit'}
                className={cn(
                    "h-14 rounded-[0.1rem] text-xs font-mono font-black tracking-widest uppercase shadow-inner", 
                    formMode === 'edit' && "bg-muted/50 border-none",
                    userForm.formState.errors.userId ? "border-rose-500 bg-rose-50" : "border-slate-100"
                )}
                placeholder="ID (MIN_1)"
              />
              {userForm.formState.errors.userId && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{userForm.formState.errors.userId.message}</p>}
            </FormField>
            <FormField label="사용자 성함" required>
              <Input
                {...userForm.register('userNm')}
                className={cn(
                    "h-14 rounded-[0.1rem] text-sm font-black tracking-tight",
                    userForm.formState.errors.userNm ? "border-rose-500 bg-rose-50" : "border-slate-100"
                )}
                placeholder="NAME"
              />
              {userForm.formState.errors.userNm && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{userForm.formState.errors.userNm.message}</p>}
            </FormField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="이메일 주소">
              <Input
                {...userForm.register('email')}
                className={cn(
                    "h-14 rounded-[0.1rem] text-xs font-medium border-slate-100 shadow-sm",
                    userForm.formState.errors.email ? "border-rose-500 bg-rose-50" : ""
                )}
                placeholder="example@nuri.com"
              />
              {userForm.formState.errors.email && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{userForm.formState.errors.email.message}</p>}
            </FormField>
            <FormField label="연락처">
              <Input
                {...userForm.register('moblphonNo')}
                className="h-14 rounded-[0.1rem] text-xs font-medium border-slate-100 shadow-sm"
                placeholder="010-0000-0000"
              />
            </FormField>
          </div>

          {formMode === 'create' && (
            <FormField label="초기 비밀번호" required>
              <Input
                {...userForm.register('password')}
                type="password"
                className={cn(
                    "h-14 rounded-[0.1rem] text-xs border-slate-100 shadow-sm",
                    userForm.formState.errors.password ? "border-rose-500 bg-rose-50" : ""
                )}
                placeholder="PASSWORD (MIN_8)"
              />
              {userForm.formState.errors.password && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{userForm.formState.errors.password.message}</p>}
            </FormField>
          )}

          <FormField label="소속 부서">
            <select
              {...userForm.register('orgnztId')}
              className="w-full h-14 px-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none shadow-inner"
            >
              <option value="">소속 없음 / GLOBAL</option>
              {departments.map((d: any) => (
                <option key={d.orgnztId} value={d.orgnztId}>{d.orgnztNm}</option>
              ))}
            </select>
          </FormField>
        </form>
      </StandardModal>

      <StandardModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={formMode === 'create' ? '신규 부서 등록' : '부서 정보 수정'}
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsDeptModalOpen(false)} className="flex-1 h-12 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase border-2">취소</Button>
            <Button 
                onClick={handleDeptSubmit} 
                className="flex-[2] h-12 rounded-[0.1rem] font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition-all"
            >
              {formMode === 'create' ? '부서 등록' : '정보 수정'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleDeptSubmit} className="space-y-8 pt-4 text-left">
          <FormField label="부서 명칭" required>
            <Input
              {...deptForm.register('orgnztNm')}
              className={cn(
                  "h-14 rounded-[0.1rem] text-sm font-black tracking-tight",
                  deptForm.formState.errors.orgnztNm ? "border-rose-500 bg-rose-50" : "border-slate-100"
              )}
              placeholder="DEPT_NAME"
            />
            {deptForm.formState.errors.orgnztNm && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{deptForm.formState.errors.orgnztNm.message}</p>}
          </FormField>

          <FormField label="부서 설명명세">
            <textarea
              {...deptForm.register('orgnztDc')}
              className="w-full min-h-[120px] p-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50 text-xs font-bold outline-none resize-none shadow-inner"
              placeholder="부서의 역할 및 책임 정의..."
            />
          </FormField>
        </form>
      </StandardModal>
    </div>
  );
}

function NavButton({ icon, subLabel, label, active, onClick }: { icon: React.ReactNode, subLabel: string, label: string, active: boolean, onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "w-full group p-8 rounded-[0.1rem] border-2 transition-all flex items-center gap-6 relative overflow-hidden",
            active
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.03] z-10"
              : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-[0.1rem] flex items-center justify-center transition-all shadow-lg relative z-10",
            active ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            {icon}
          </div>
          <div className="flex flex-col text-left relative z-10">
            <span className={cn("text-[10px] font-black tracking-widest uppercase mb-1 opacity-30", active && "opacity-40 font-mono italic")}>{subLabel}</span>
            <span className="text-md font-black tracking-tighter uppercase leading-tight font-mono italic">{label}</span>
          </div>
          {active && (
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
        {label} 섹션으로 이동
      </TooltipContent>
    </Tooltip>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-4 p-8 rounded-[0.1rem] bg-slate-50/50 shadow-inner border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:scale-105 group cursor-default relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
        {icon}
      </div>
      <h5 className="text-[11px] font-black text-muted-foreground/30 tracking-[0.3em] flex items-center gap-3 uppercase group-hover:text-primary transition-colors font-mono relative z-10 italic">
        {icon} {label}
      </h5>
      <p className="text-2xl font-black tracking-tighter text-slate-900 truncate leading-none relative z-10 py-1 font-mono italic">
        {value}
      </p>
    </div>
  );
}
