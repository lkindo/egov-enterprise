'use client';

import React, { useState, useMemo, use } from 'react';
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

import { z } from 'zod';
import { useAppForm } from '@/hooks/useAppForm';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField } from '@/app/components/ui/standard-form';

type UserOrgTab = 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';

const userSchema = z.object({
  userId: z.string().min(1, '?꾩씠?붾뒗 ?꾩닔?낅땲??').max(20, '?꾩씠?붾뒗 20???대궡?ъ빞 ?⑸땲??'),
  userNm: z.string().min(1, '?대쫫? ?꾩닔?낅땲??').max(30, '?대쫫? 30???대궡?ъ빞 ?⑸땲??'),
  emailAdres: z.string().email('?좏슚???대찓???뺤떇???꾨떃?덈떎.').optional().or(z.literal('')),
  moblphonNo: z.string().optional().or(z.literal('')),
  orgnztId: z.string().optional().or(z.literal('')),
  password: z.string().min(8, '鍮꾨?踰덊샇??8???댁긽?댁뼱???⑸땲??').optional().or(z.literal('')),
});

const deptSchema = z.object({
  orgnztNm: z.string().min(1, '遺?쒕챸? ?꾩닔?낅땲??').max(20, '遺?쒕챸? 20???대궡?ъ빞 ?⑸땲??'),
  orgnztDc: z.string().max(100, '?ㅻ챸? 100???대궡?ъ빞 ?⑸땲??').optional().or(z.literal('')),
});

type UserFormValues = z.infer<typeof userSchema>;
type DeptFormValues = z.infer<typeof deptSchema>;

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
  const [activeTab, setActiveTab] = useState<UserOrgTab>(defaultTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  const [userPage, setUserPage] = useState(1);
  const [deptPage, setDeptPage] = useState(1);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const userForm = useAppForm(userSchema, {
    defaultValues: { userId: '', userNm: '', emailAdres: '', moblphonNo: '', orgnztId: '', password: '' }
  });

  const deptForm = useAppForm(deptSchema, {
    defaultValues: { orgnztNm: '', orgnztDc: '' }
  });

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
  const departments = useMemo(() => {
    const list = deptsData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as Department[];
  }, [deptsData]);

  const handleUserSubmit = userForm.handleSubmit(async (values: UserFormValues) => {
    try {
      if (formMode === 'create') {
        await userAdminService.createUser(values as UserManage);
        toast('?ъ슜?먭? ?깃났?곸쑝濡??깅줉?섏뿀?듬땲??', 'success');
      } else {
        await userAdminService.updateUser(selectedItemId as string, values as UserManage);
        toast('?ъ슜???뺣낫媛 ?섏젙?섏뿀?듬땲??', 'success');
      }
      refetchUsers();
      setIsUserModalOpen(false);
    } catch (error) {
      toast('?ъ슜?????以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    }
  });

  const handleDeptSubmit = deptForm.handleSubmit(async (values: DeptFormValues) => {
    try {
      if (formMode === 'create') {
        await deptAdminService.createDept(values as Department);
        toast('遺?쒓? ?깃났?곸쑝濡??깅줉?섏뿀?듬땲??', 'success');
      } else {
        await deptAdminService.updateDept(selectedItemId as string, values as Department);
        toast('遺???뺣낫媛 ?섏젙?섏뿀?듬땲??', 'success');
      }
      refetchDepts();
      setIsDeptModalOpen(false);
    } catch (error) {
      toast('遺?????以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
    }
  });

  // --- Resilience Monitoring: Global Error Feedback ---
  React.useEffect(() => {
    if (usersError) {
      const msg = (usersError as any)?.response?.data?.message || '?ъ슜???곗씠?곕? 遺덈윭?ㅻ뒗???ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.';
      toast(msg, 'error');
    }
  }, [usersError, toast]);

  React.useEffect(() => {
    if (deptsError) {
      toast('遺???곗씠?곕? 遺덈윭?ㅻ뒗???ㅽ뙣?덉뒿?덈떎.', 'error');
    }
  }, [deptsError, toast]);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'USERS' || activeTab === 'ABSENCES') return (users || []).find(u => u?.esntlId === selectedItemId);
    if (activeTab === 'DEPTS') return (departments || []).find(d => d?.orgnztId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, users, departments]);

  const userColumns: Column<UserManage>[] = [
    {
      header: 'IDENTITY',
      accessor: (user) => (
        <div className="flex items-center gap-6 py-2">
          <div className={cn(
            "w-14 h-14 rounded-[0.1rem] flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:rotate-6",
            selectedItemId === user?.esntlId ? "bg-white/10 text-white" : "bg-slate-50 text-slate-500"
          )}>
            {user?.userNm?.[0]}
          </div>
          <div className="space-y-1">
            <h4 className={cn("text-md font-black tracking-tighter leading-none uppercase", selectedItemId === user.esntlId ? "text-white" : "text-foreground")}>
              {user.userNm}
            </h4>
            <p className={cn("text-[8px] font-black tracking-[0.3em] uppercase opacity-70 font-mono italic")}>{user.userId}</p>
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
            selectedItemId === dept.orgnztId ? "bg-white/10 text-indigo-400" : "bg-indigo-50/50 text-indigo-500"
          )}>
            <Building2 size={24} />
          </div>
          <div className="space-y-1">
            <h4 className={cn("text-md font-black tracking-tighter leading-none uppercase", selectedItemId === dept.orgnztId ? "text-white" : "text-foreground")}>
              {dept.orgnztNm}
            </h4>
            <p className={cn("text-[8px] font-black tracking-[0.4em] uppercase opacity-70 font-mono italic")}>NODE_{dept.orgnztId}</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="議곗쭅 ?꾪궎?띿쿂 嫄곕쾭?뚯뒪"
        breadcrumbs={[{ label: '?ъ슜??愿由? }, { label: '議곗쭅 ?듯빀 ?덈툕' }]}
      />

      <HubHeader
        title="Identity"
        highlight="Fabric"
        subtitle="?꾩궗 ?몄쟻 ?먯썝 留ㅽ듃由?뒪 諛?議곗쭅 怨꾩링 ?좏뤃濡쒖? ?듯빀 而⑦듃濡??쇳꽣"
        icon={UserCog}
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="lg" className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition shadow-xl group active:scale-95">
                  <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                媛쒖씤??UI 諛??꾪꽣 ?섍꼍 ?ㅼ젙
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  size="lg" 
                  className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1 gap-3 group"
                  onClick={() => {
                    setFormMode('create');
                    if (activeTab === 'DEPTS') {
                      deptForm.reset({ orgnztNm: '', orgnztDc: '' });
                      setIsDeptModalOpen(true);
                    } else {
                      userForm.reset({ userId: '', userNm: '', emailAdres: '', moblphonNo: '', orgnztId: '', password: '' });
                      setIsUserModalOpen(true);
                    }
                  }}
                >
                  {activeTab === 'DEPTS' ? <LayoutGrid size={20} /> : <UserPlus size={20} />}
                  {activeTab === 'DEPTS' ? '?좉퇋 遺???깅줉' : activeTab === 'ABSENCES' ? '遺???깅줉' : '?ъ슜???깅줉'}
                  <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                {activeTab === 'DEPTS' ? '?붾젆?좊━???덈줈??議곗쭅 ?몃뱶 異붽?' : '?덈줈???꾩씠?댄떚???꾨줈???앹꽦'}
              </TooltipContent>
            </Tooltip>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12 min-h-[900px]">
        <div className="col-span-12 lg:col-span-3 space-y-8 flex flex-col h-full">
          <div className="rounded-[0.1rem] bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-4">
            <NavButton icon={<Users size={22} />} subLabel="Section_01" label="?ъ슜?? active={activeTab === 'USERS'} onClick={() => { setActiveTab('USERS'); setSelectedItemId(null); }} />
            <NavButton icon={<Network size={22} />} subLabel="Section_02" label="遺??愿由? active={activeTab === 'DEPTS'} onClick={() => { setActiveTab('DEPTS'); setSelectedItemId(null); }} />
            <NavButton icon={<UserMinus size={22} />} subLabel="Section_03" label="遺??愿由? active={activeTab === 'ABSENCES'} onClick={() => { setActiveTab('ABSENCES'); setSelectedItemId(null); }} />
            <NavButton icon={<ShieldCheck size={22} />} subLabel="Section_04" label="議곗쭅 ?뺤콉" active={activeTab === 'POLICIES'} onClick={() => { setActiveTab('POLICIES'); setSelectedItemId(null); }} />
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
                <p className="text-[10px] text-white/30 font-black tracking-[0.4em] uppercase leading-relaxed font-mono">Active Directory (AD)<br />?숆린???꾨즺</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-8">
          <HubSectionCard
            title={activeTab === 'DEPTS' ? "議곗쭅 ?몃뱶 ?좏뤃濡쒖? ?ㅽ듃由? : "?몄쟻 ?먯썝 ?꾩씠?댄떚??留ㅽ듃由?뒪"}
            description="?꾩궗 ?듯빀 ?붾젆?좊━?먯꽌 ?ㅼ떆媛꾩쑝濡??숆린?붾릺??媛앹껜 ?꾨줈??諛?蹂댁븞 ?곹깭 紐낆꽭?낅땲??
            icon={activeTab === 'DEPTS' ? Network : Users}
          >
            <div className="space-y-8">
              <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-8">
                <div>
                  <span className="text-[10px] font-black text-muted-foreground/70 tracking-[0.4em] uppercase font-mono italic">?ㅼ떆媛??붾젆?좊━ ?숆린??/span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-12 rounded-[0.1rem] px-6 text-[10px] font-black tracking-widest gap-3 hover:bg-slate-900 hover:text-white bg-slate-50 border border-slate-100 transition uppercase group shadow-sm">
                      <RefreshCcw size={16} className={cn("text-primary group-hover:text-white transition-colors", isUsersLoading || isDeptsLoading ? "animate-spin" : "group-hover:rotate-180")} /> SYNCHRONIZE
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
                    ?쒕쾭 吏?ν삎 ?붿쭊怨??곗씠???뺥빀??留욎텛湲?                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="relative group/search">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                <Input
                  className="pl-16 h-16 bg-slate-50/50 border-none rounded-[0.1rem] text-[11px] font-black tracking-widest shadow-inner focus:ring-4 focus:ring-primary/10 transition placeholder:text-muted-foreground/20 uppercase"
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
                      emptyMessage="寃?됰맂 媛앹껜媛 議댁옱?섏? ?딆뒿?덈떎."
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
                            <ShieldCheck size={14} /> ?좎썝 ?뺤씤??                          </span>
                          {activeTab === 'ABSENCES' && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-6 py-2 rounded-[0.1rem] tracking-widest uppercase border border-amber-200 shadow-sm animate-pulse font-mono italic">
                              遺?ъ쨷
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-16 w-16 rounded-[0.1rem] bg-slate-50 hover:bg-slate-900 hover:text-white shadow-sm border border-slate-100 transition group"
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
                            emailAdres: user.emailAdres || '',
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
                      <InfoBlock icon={<Mail size={18} />} label="Communication Endpoint" value={(selectedItem as UserManage)?.emailAdres || (activeTab === 'DEPTS' ? 'DEPT_INBOX' : 'PENDING_DNS')} />
                      <InfoBlock icon={<Phone size={18} />} label="Hotline Contact" value={(selectedItem as UserManage)?.moblphonNo || (selectedItem as Department)?.orgnztNm || 'NOT_DECLARED'} />
                      <InfoBlock icon={<Building2 size={18} />} label="Topology Cluster" value={(selectedItem as UserManage)?.orgnztId || (selectedItem as Department)?.orgnztId || 'GLOBAL_ROOT'} />
                      <InfoBlock icon={<MapPin size={18} />} label="Operational Zone" value="蹂몄궗 ?대윭?ㅽ꽣" />
                    </div>

                    <div className="pt-12 border-t border-slate-100 space-y-10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[0.1rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <h4 className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono leading-none mb-1">沅뚰븳 ?꾨줈?좎퐳</h4>
                            <p className="text-sm font-black text-foreground tracking-tighter uppercase font-mono italic">?쒖꽦 沅뚰븳 留ㅽ듃由?뒪</p>
                          </div>
                        </div>
                        <Button variant="ghost" className="h-12 px-6 rounded-[0.1rem] bg-slate-50 text-[10px] font-black text-primary gap-3 uppercase tracking-widest hover:bg-primary hover:text-white transition font-mono italic">MANAGE_MATRIX <ChevronRight size={14} /></Button>
                      </div>
                      <div className="flex flex-wrap gap-4">
                        {['ACCESS_CMS', 'SYSTEM_ADMIN_LEVEL_4', 'ANALYTICS_DASHBOARD_LIVE', 'USER_DIRECTORY_CONTROLLER', 'SECURITY_AUDIT_PROBE'].map(p => (
                          <div key={p} className="pl-6 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-[0.1rem] text-[10px] font-black text-slate-500 tracking-widest uppercase shadow-sm flex items-center gap-3 group/tag hover:border-primary/30 transition cursor-default font-mono italic">
                            <div className="w-2 h-2 rounded-full bg-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                            {p}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-6 pt-12 mt-auto border-t border-slate-100 relative z-10">
                    <Button className="flex-1 h-16 bg-slate-100 text-rose-500 rounded-[0.1rem] font-black tracking-widest text-[10px] hover:bg-rose-500 hover:text-white uppercase transition shadow-sm font-mono italic">REVOKE_ACCESS</Button>
                    <Button className="flex-[2] h-16 bg-slate-900 text-white rounded-[0.1rem] font-black tracking-[0.4em] text-[10px] shadow-2xl shadow-primary/30 hover:bg-primary transition hover:-translate-y-2 uppercase group font-mono italic">
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
                <p className="text-[12px] font-black text-slate-300 tracking-[0.6em] mt-6 uppercase leading-relaxed max-w-[280px] font-mono italic">?명뀛由ъ쟾???숆린?붾? ?쒖옉?섎젮硫??좏뤃濡쒖? ?ㅽ듃由쇱뿉???뷀꽣?곕? ?좏깮?섏꽭??/p>
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
        title={formMode === 'create' ? '?좉퇋 ?ъ슜???깅줉' : '?ъ슜???뺣낫 ?섏젙'}
        maxWidth="2xl"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsUserModalOpen(false)} className="flex-1 h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase border-2">痍⑥냼</Button>
            <Button 
                onClick={handleUserSubmit} 
                className="flex-[2] h-14 rounded-[0.1rem] font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition"
            >
              {formMode === 'create' ? '?좉퇋 ?깅줉' : '?뺣낫 ?섏젙'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleUserSubmit} className="space-y-8 pt-4 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField label="?ъ슜???꾩씠??(Identity_ID)" required>
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
            <FormField label="?ъ슜???깊븿" required>
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
            <FormField label="?대찓??二쇱냼">
              <Input
                {...userForm.register('emailAdres')}
                className={cn(
                    "h-14 rounded-[0.1rem] text-xs font-medium border-slate-100 shadow-sm",
                    userForm.formState.errors.emailAdres ? "border-rose-500 bg-rose-50" : ""
                )}
                placeholder="example@nuri.com"
              />
              {userForm.formState.errors.emailAdres && <p className="text-[10px] font-bold text-rose-500 mt-2 ml-2">{userForm.formState.errors.emailAdres.message}</p>}
            </FormField>
            <FormField label="?곕씫泥?>
              <Input
                {...userForm.register('moblphonNo')}
                className="h-14 rounded-[0.1rem] text-xs font-medium border-slate-100 shadow-sm"
                placeholder="010-0000-0000"
              />
            </FormField>
          </div>

          {formMode === 'create' && (
            <FormField label="珥덇린 鍮꾨?踰덊샇" required>
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

          <FormField label="?뚯냽 遺??>
            <select
              {...userForm.register('orgnztId')}
              className="w-full h-14 px-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 shadow-inner"
            >
              <option value="">?뚯냽 ?놁쓬 / GLOBAL</option>
              {(departments || []).filter(Boolean).map((d: any) => (
                <option key={d.orgnztId} value={d.orgnztId}>{d.orgnztNm}</option>
              ))}
            </select>
          </FormField>
        </form>
      </StandardModal>

      <StandardModal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={formMode === 'create' ? '?좉퇋 遺???깅줉' : '遺???뺣낫 ?섏젙'}
        maxWidth="lg"
        footer={
          <div className="flex w-full gap-4">
            <Button variant="outline" onClick={() => setIsDeptModalOpen(false)} className="flex-1 h-12 rounded-[0.1rem] font-black text-[10px] tracking-widest uppercase border-2">痍⑥냼</Button>
            <Button 
                onClick={handleDeptSubmit} 
                className="flex-[2] h-12 rounded-[0.1rem] font-black text-[10px] tracking-widest shadow-xl bg-slate-900 text-white hover:bg-primary transition"
            >
              {formMode === 'create' ? '遺???깅줉' : '?뺣낫 ?섏젙'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleDeptSubmit} className="space-y-8 pt-4 text-left">
          <FormField label="遺??紐낆묶" required>
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

          <FormField label="遺???ㅻ챸紐낆꽭">
            <textarea
              {...deptForm.register('orgnztDc')}
              className="w-full min-h-[120px] p-6 rounded-[0.1rem] border-2 border-slate-100 bg-slate-50 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none shadow-inner"
              placeholder="遺?쒖쓽 ??븷 諛?梨낆엫 ?뺤쓽..."
            />
          </FormField>
        </form>
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
            "w-full group p-8 rounded-[0.1rem] border-2 transition flex items-center gap-6 relative overflow-hidden",
            active
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.03] z-10"
              : "bg-transparent border-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-[0.1rem] flex items-center justify-center transition shadow-lg relative z-10",
            active ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary/10 group-hover:text-primary"
          )}>
            {icon}
          </div>
          <div className="flex flex-col text-left relative z-10">
            <span className={cn("text-[10px] font-black tracking-widest uppercase mb-1 opacity-60", active && "opacity-80 font-mono italic")}>{subLabel}</span>
            <span className="text-md font-black tracking-tighter uppercase leading-tight font-mono italic">{label}</span>
          </div>
          {active && (
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="bg-slate-900 text-white border-none rounded-[0.1rem] px-4 py-2 text-[10px] font-bold tracking-widest uppercase">
        {label} ?뱀뀡?쇰줈 ?대룞
      </TooltipContent>
    </Tooltip>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-4 p-8 rounded-[0.1rem] bg-slate-50/50 shadow-inner border border-slate-100 transition hover:bg-white hover:shadow-2xl hover:scale-105 group cursor-default relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
        {icon}
      </div>
      <h5 className="text-[11px] font-black text-muted-foreground/60 tracking-[0.3em] flex items-center gap-3 uppercase group-hover:text-primary transition-colors font-mono relative z-10 italic">
        {icon} {label}
      </h5>
      <p className="text-2xl font-black tracking-tighter text-slate-900 truncate leading-none relative z-10 py-1 font-mono italic">
        {value}
      </p>
    </div>
  );
}
