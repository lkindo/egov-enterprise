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
import { cn } from '@/lib/utils';
import { userAdminService } from '@/services/admin/system/UserAdminService';
import { UserManage } from '@/types/user';
import { deptAdminService, Department } from '@/services/admin/system/DeptAdminService';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type UserOrgTab = 'USERS' | 'DEPTS' | 'ABSENCES' | 'POLICIES';

export default function UserOrgHubClient({ defaultTab = 'USERS' }: { defaultTab?: UserOrgTab }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<UserOrgTab>(defaultTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  // --- Queries ---
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['admin-users', searchKeyword],
    queryFn: () => userAdminService.getUserList({ pageIndex: 1, searchKeyword }),
    enabled: activeTab === 'USERS' || activeTab === 'ABSENCES'
  });
  const users = usersData?.list || [];

  const { data: deptsData, isLoading: isDeptsLoading } = useQuery({
    queryKey: ['admin-depts', searchKeyword],
    queryFn: () => deptAdminService.getDeptList({ pageIndex: 1, searchKeyword }),
    enabled: activeTab === 'DEPTS'
  });
  const departments = deptsData?.list || [];

  // --- Handlers ---
  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    if (activeTab === 'USERS' || activeTab === 'ABSENCES') return users.find(u => u.esntlId === selectedItemId);
    if (activeTab === 'DEPTS') return departments.find(d => d.orgnztId === selectedItemId);
    return null;
  }, [selectedItemId, activeTab, users, departments]);

  // --- Renderers ---

  const renderUserList = () => (
    <div className="space-y-4">
      {isUsersLoading && <div className="p-10 text-center opacity-40 font-black text-xs tracking-widest text-primary animate-pulse">SYNCHRONIZING_DIRECTORY...</div>}
      {users.map((user) => (
        <div 
          key={user.esntlId}
          onClick={() => setSelectedItemId(user.esntlId || null)}
          className={cn(
            "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between overflow-hidden relative",
            selectedItemId === user.esntlId 
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" 
              : "bg-white border-slate-100 hover:border-primary/20 text-slate-600 shadow-sm"
          )}
        >
          <div className="flex items-center gap-6 relative z-10">
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-xl transition-transform group-hover:rotate-6",
              selectedItemId === user.esntlId ? "bg-white/10 text-white" : "bg-slate-50 text-slate-300"
            )}>
              {user.userNm?.[0]}
            </div>
            <div className="space-y-1">
              <h4 className={cn("text-lg font-black tracking-tighter leading-none uppercase", selectedItemId === user.esntlId ? "text-white" : "text-foreground")}>
                {user.userNm}
              </h4>
              <p className={cn("text-[9px] font-black tracking-[0.4em] uppercase opacity-40 font-mono italic")}>{user.userId} • {user.orgnztId || 'UNCATEGORIZED'}</p>
            </div>
          </div>
          <ChevronRight size={20} className={cn("transition-all duration-500 relative z-10", selectedItemId === user.esntlId ? "rotate-90 text-primary" : "text-muted-foreground/20 group-hover:text-primary")} />
          {selectedItemId === user.esntlId && (
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
          )}
        </div>
      ))}
    </div>
  );

  const renderDeptList = () => (
    <div className="space-y-4">
      {isDeptsLoading && <div className="p-10 text-center opacity-40 font-black text-xs tracking-widest text-primary animate-pulse">PROBING_TOPOLOGY...</div>}
      {departments.map((dept) => (
        <div 
          key={dept.orgnztId}
          onClick={() => setSelectedItemId(dept.orgnztId)}
          className={cn(
            "group p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer flex items-center justify-between overflow-hidden relative",
            selectedItemId === dept.orgnztId 
              ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10" 
              : "bg-white border-slate-100 hover:border-indigo-500/20 text-slate-600 shadow-sm"
          )}
        >
          <div className="flex items-center gap-6 relative z-10">
            <div className={cn(
              "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl transition-transform group-hover:rotate-6",
              selectedItemId === dept.orgnztId ? "bg-white/10 text-indigo-400" : "bg-indigo-50/50 text-indigo-200"
            )}>
              <Building2 size={28} />
            </div>
            <div className="space-y-1">
              <h4 className={cn("text-lg font-black tracking-tighter leading-none uppercase", selectedItemId === dept.orgnztId ? "text-white" : "text-foreground")}>
                {dept.orgnztNm}
              </h4>
              <p className={cn("text-[9px] font-black tracking-[0.4em] uppercase opacity-40 font-mono italic")}>NODE_UID: {dept.orgnztId}</p>
            </div>
          </div>
          <ChevronRight size={20} className={cn("transition-all duration-500 relative z-10", selectedItemId === dept.orgnztId ? "rotate-90 text-indigo-400" : "text-muted-foreground/20 group-hover:text-indigo-500")} />
          {selectedItemId === dept.orgnztId && (
              <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="조직 아키텍처 거버넌스"
        breadcrumbs={[{ label: '사용자관리' }, { label: '조직 통합 허브' }]}
      />

      <HubHeader 
        title="Identity" 
        highlight="Fabric" 
        subtitle="전사 인적 자원 매트릭스 및 조직적 계층 토폴로지 통합 오케스트레이션 센터" 
        icon={UserCog} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button variant="ghost" size="lg" className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95">
              <Settings size={22} className="group-hover:rotate-90 transition-transform duration-500" />
            </Button>
            <Button size="lg" className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group">
              {activeTab === 'DEPTS' ? <LayoutGrid size={20} /> : <UserPlus size={20} />}
              {activeTab === 'DEPTS' ? 'NODE_DEPLOYY' : activeTab === 'ABSENCES' ? 'ABSENCE_SYNC' : 'MEMBER_PROVISION'}
              <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-12 min-h-[900px]">
        
        {/* --- Left Column: Navigation --- */}
        <div className="col-span-12 lg:col-span-3 space-y-8 flex flex-col h-full">
            <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-4">
                <NavButton icon={<Users size={22} />} subLabel="Section_01" label="Member Matrix" active={activeTab === 'USERS'} onClick={() => { setActiveTab('USERS'); setSelectedItemId(null); }} />
                <NavButton icon={<Network size={22} />} subLabel="Section_02" label="Topology Map" active={activeTab === 'DEPTS'} onClick={() => { setActiveTab('DEPTS'); setSelectedItemId(null); }} />
                <NavButton icon={<UserMinus size={22} />} subLabel="Section_03" label="Absence Stream" active={activeTab === 'ABSENCES'} onClick={() => { setActiveTab('ABSENCES'); setSelectedItemId(null); }} />
                <NavButton icon={<ShieldCheck size={22} />} subLabel="Section_04" label="Security Policy" active={activeTab === 'POLICIES'} onClick={() => { setActiveTab('POLICIES'); setSelectedItemId(null); }} />
            </div>

            <div className="mt-auto rounded-[3.5rem] bg-slate-900 text-white p-12 space-y-8 shadow-2xl relative overflow-hidden group border-none">
                <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                    <CloudLightning size={240} className="text-primary" />
                </div>
                <div className="relative z-10 space-y-6 text-center lg:text-left">
                    <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center mx-auto lg:mx-0 border border-white/5 shadow-inner group-hover:rotate-12 transition-transform">
                        <Activity size={32} className="text-primary" />
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-2xl font-black tracking-tighter leading-tight uppercase">Identity<br />Intelligence</h4>
                        <p className="text-[10px] text-white/30 font-black tracking-[0.4em] uppercase leading-relaxed">Active Directory (AD)<br />Synchronization OK</p>
                    </div>
                </div>
            </div>
        </div>

        {/* --- Center Column: Data Stream --- */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-8">
            <HubSectionCard 
                title={activeTab === 'DEPTS' ? "조직 노드 토폴로지 스트림" : "인적 자원 아이덴티티 매트릭스"} 
                description="전사 통합 디렉토리에서 실시간으로 동기화되는 개체 프로브 및 보안 상태 명세입니다." 
                icon={activeTab === 'DEPTS' ? Network : Users}
            >
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-8">
                        <div>
                            <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono">Real-time Directory Sync</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => queryClient.invalidateQueries()} className="h-12 rounded-2xl px-6 text-[10px] font-black tracking-widest gap-3 hover:bg-slate-900 hover:text-white bg-slate-50 border border-slate-100 transition-all uppercase group shadow-sm">
                            <RefreshCcw size={16} className={cn("text-primary group-hover:text-white transition-colors", isUsersLoading || isDeptsLoading ? "animate-spin" : "group-hover:rotate-180")} /> SYNCHRONIZE
                        </Button>
                    </div>
                    
                    <div className="relative group/search">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={20} />
                        <Input 
                            className="pl-16 h-16 bg-slate-50/50 border-none rounded-2xl text-[11px] font-black tracking-widest shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/20 uppercase" 
                            placeholder="Probing for identity..." 
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
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
                            >
                                {activeTab === 'DEPTS' ? renderDeptList() : renderUserList()}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </HubSectionCard>
        </div>

        {/* --- Right Column: Intelligence Analysis --- */}
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
                <div className="rounded-[4rem] bg-white border-2 border-slate-100 shadow-2xl h-full p-12 space-y-12 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 rotate-12 transition-transform duration-1000">
                        <SearchCode size={320} className="text-primary" />
                    </div>

                    {/* Entity Header */}
                    <div className="flex items-start justify-between border-b border-slate-100 pb-12 relative z-10">
                        <div className="flex items-center gap-10">
                            <div className="w-28 h-28 bg-slate-900 rounded-[2.5rem] flex items-center justify-center font-black text-5xl text-white shadow-2xl rotate-3 group hover:rotate-6 transition-transform">
                                <span className="text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]">
                                    {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm?.[0] : (selectedItem as UserManage)?.userNm?.[0]}
                                </span>
                            </div>
                            <div className="space-y-5 pt-2">
                                <h2 className="text-5xl font-black text-foreground tracking-tighter leading-none truncate max-w-[400px] uppercase">
                                    {activeTab === 'DEPTS' ? (selectedItem as Department)?.orgnztNm : (selectedItem as UserManage)?.userNm}
                                </h2>
                                <div className="flex gap-4">
                                    <span className="bg-primary/5 text-primary text-[10px] font-black px-6 py-2 rounded-xl tracking-widest uppercase border border-primary/10 shadow-sm flex items-center gap-2">
                                        <ShieldCheck size={14} /> IDENTITY_VERIFIED
                                    </span>
                                    {activeTab === 'ABSENCES' && (
                                        <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-6 py-2 rounded-xl tracking-widest uppercase border border-amber-200 shadow-sm animate-pulse">
                                            ABSENCE_OVERRIDE
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-16 w-16 rounded-[1.5rem] bg-slate-50 hover:bg-slate-900 hover:text-white shadow-sm border border-slate-100 transition-all group">
                            <Pencil size={24} className="group-hover:scale-110 transition-transform" />
                        </Button>
                    </div>
                    
                    {/* Entity Metadata */}
                    <div className="flex-1 space-y-12 relative z-10">
                        <div className="grid grid-cols-2 gap-8">
                            <InfoBlock icon={<Mail size={18} />} label="Communication Endpoint" value={(selectedItem as any)?.email || 'PENDING_DNS'} />
                            <InfoBlock icon={<Phone size={18} />} label="Hotline Contact" value={(selectedItem as any)?.moblphonNo || 'NOT_DECLARED'} />
                            <InfoBlock icon={<Building2 size={18} />} label="Topology Cluster" value={(selectedItem as any)?.orgnztId || 'GLOBAL_ROOT'} />
                            <InfoBlock icon={<MapPin size={18} />} label="Operational Zone" value="HQ_RESEARCH_CTR" />
                        </div>

                        <div className="pt-12 border-t border-slate-100 space-y-10">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <h4 className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase font-mono leading-none mb-1">Authorization Protocol</h4>
                                        <p className="text-sm font-black text-foreground tracking-tighter uppercase">Active Privilege Matrix</p>
                                    </div>
                                </div>
                                <Button variant="ghost" className="h-12 px-6 rounded-2xl bg-slate-50 text-[10px] font-black text-primary gap-3 uppercase tracking-widest hover:bg-primary hover:text-white transition-all">MANAGE_MATRIX <ChevronRight size={14} /></Button>
                            </div>
                            <div className="flex flex-wrap gap-4">
                                {['ACCESS_CMS', 'SYSTEM_ADMIN_LEVEL_4', 'ANALYTICS_DASHBOARD_LIVE', 'USER_DIRECTORY_CONTROLLER', 'SECURITY_AUDIT_PROBE'].map(p => (
                                    <div key={p} className="pl-6 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 tracking-widest uppercase shadow-sm flex items-center gap-3 group/tag hover:border-primary/30 transition-all cursor-default">
                                        <div className="w-2 h-2 rounded-full bg-primary opacity-30 group-hover:opacity-100 transition-opacity" />
                                        {p}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Control Actions */}
                    <div className="flex gap-6 pt-12 mt-auto border-t border-slate-100 relative z-10">
                        <Button className="flex-1 h-16 bg-slate-100 text-rose-500 rounded-2xl font-black tracking-widest text-[10px] hover:bg-rose-500 hover:text-white uppercase transition-all shadow-sm">REVOKE_ACCESS</Button>
                        <Button className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black tracking-[0.4em] text-[10px] shadow-2xl shadow-primary/30 hover:bg-primary transition-all hover:-translate-y-2 uppercase group">
                            <Zap size={18} className="text-primary group-hover:animate-pulse" /> COMMIT_SPECIFICATION_CHANGE
                        </Button>
                    </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full rounded-[4rem] border-4 border-dashed border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center p-24 text-center select-none group">
                <div className="w-32 h-32 rounded-[2.5rem] bg-white border-2 border-slate-100 flex items-center justify-center text-slate-200 shadow-xl mb-12 group-hover:rotate-12 transition-transform duration-1000">
                    <Contact2 size={64} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-4xl font-black text-slate-200 tracking-tighter uppercase ">Idle_Probe_State</h3>
                <p className="text-[12px] font-black text-slate-300 tracking-[0.6em] mt-6 uppercase leading-relaxed max-w-[280px]">Select Identity Entity from the Topology Stream to Begin Intelligence Sync</p>
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
    </div>
  );
}

// --- Sub-components ---

function NavButton({ icon, subLabel, label, active, onClick }: { icon: React.ReactNode, subLabel: string, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full group p-8 rounded-[2.5rem] border-2 transition-all flex items-center gap-6 relative overflow-hidden",
        active 
          ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.03] z-10" 
          : "bg-transparent border-transparent hover:bg-slate-50 text-slate-400 hover:text-slate-900"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg relative z-10",
        active ? "bg-white/10 text-white shadow-black/20" : "bg-white text-slate-300 group-hover:bg-primary/10 group-hover:text-primary"
      )}>
        {icon}
      </div>
      <div className="flex flex-col text-left relative z-10">
          <span className={cn("text-[10px] font-black tracking-widest uppercase mb-1 opacity-30", active && "opacity-40")}>{subLabel}</span>
          <span className="text-md font-black tracking-tighter uppercase leading-tight">{label}</span>
      </div>
      {active && (
          <div className="absolute right-0 top-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none" />
      )}
    </button>
  );
}

function InfoBlock({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="space-y-4 p-8 rounded-[2.5rem] bg-slate-50/50 shadow-inner border border-slate-100 transition-all hover:bg-white hover:shadow-2xl hover:scale-105 group cursor-default relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
          {icon}
      </div>
      <h5 className="text-[11px] font-black text-muted-foreground/30 tracking-[0.3em] flex items-center gap-3 uppercase group-hover:text-primary transition-colors font-mono relative z-10">
        {icon} {label}
      </h5>
      <p className="text-2xl font-black tracking-tighter text-slate-900 truncate leading-none relative z-10 py-1">
        {value}
      </p>
    </div>
  );
}
