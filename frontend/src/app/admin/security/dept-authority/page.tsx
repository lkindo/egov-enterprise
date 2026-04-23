'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { useToast } from '@/app/components/ui/toast';
import { 
  ShieldCheck, 
  Users, 
  ChevronRight, 
  Key, 
  Save, 
  Search, 
  Info, 
  CheckCircle, 
  Circle,
  Building2,
  Workflow,
  RefreshCcw,
  Zap,
  ArrowUpRight,
  Database,
  LayoutGrid,
  Box,
  Binary,
  Lock,
  SearchCode,
  Activity,
  Milestone,
  Fingerprint,
  RotateCcw,
  ArrowRightCircle,
  Monitor,
  ShieldAlert,
  Contact2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deptAdminService, Department } from '@/services/foundation/system/DeptAdminService';
import { deptAuthorityAdminService } from '@/services/foundation/system/DeptAuthorityAdminService';
import { AuthorInfo, authorAdminService } from '@/services/foundation/system/AuthorAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { motion, AnimatePresence } from 'framer-motion';

const DEPTS_KEY = ['admin', 'departments'] as const;
const ROLES_KEY = ['admin', 'authorities'] as const;

export default function DeptAuthorityPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedAuthorCode, setSelectedAuthorCode] = useState<string | null>(null);

  const { data: deptsData, isLoading: deptsLoading } = useQuery({
    queryKey: DEPTS_KEY,
    queryFn: () => deptAdminService.getDeptList(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ROLES_KEY,
    queryFn: () => authorAdminService.getAuthorList(),
    staleTime: 5 * 60 * 1000,
  });

  const depts: Department[] = (deptsData as any)?.list || (deptsData as any)?.resultList || deptsData || [];
  const roles: AuthorInfo[] = (rolesData as any)?.list || (rolesData as any)?.resultList || rolesData || [];

  const filteredDepts = depts.filter(d =>
    String(d.orgnztNm || '').toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase()) ||
    String(d.orgnztId || '').toLocaleLowerCase().includes(searchKeyword.toLocaleLowerCase())
  );

  const loading = deptsLoading || rolesLoading;

  const saveMutation = useMutation({
    mutationFn: (authorCode: string) =>
      deptAuthorityAdminService.updateDeptAuthorities({
        deptId: selectedDept!,
        authorCode,
        allMembers: true
      }),
    onSuccess: () => {
      toast('遺???꾩껜 ?ъ슜?먯뿉寃?蹂댁븞 ?뺤콉???쇨큵 ?곸슜?섏뿀?듬땲??', 'success');
      setSelectedAuthorCode(null);
    },
    onError: () => toast('沅뚰븳 ???以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error')
  });

  const columns: Column<AuthorInfo>[] = [
    {
      header: '?뺤콉 ?꾨줈?뚯씪 ID',
      accessor: (item: AuthorInfo) => (
          <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic leading-none mb-1">POLICY_UID</span>
              <span className="font-mono text-xs font-black text-primary tracking-widest uppercase">{item.authorCode}</span>
          </div>
      ),
      className: 'w-48'
    },
    {
      header: '沅뚰븳 ?꾪궎?띿쿂 紐낆묶',
      accessor: (item: AuthorInfo) => (
          <div className="flex flex-col gap-0.5 py-2">
              <span className="font-black text-foreground tracking-tight text-md uppercase leading-tight">{item.authorNm}</span>
              <span className="text-[9px] font-bold text-muted-foreground/40 truncate block max-w-[300px] italic leading-none">{item.authorDc || '洹쒖젙 紐낆꽭 ?놁쓬'}</span>
          </div>
      )
    },
    {
      header: 'SELECTION',
      className: 'text-center w-32',
      accessor: (item: AuthorInfo) => {
        const isSelected = selectedAuthorCode === item.authorCode;
        return (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedAuthorCode(item.authorCode);
              }}
              className={cn(
                  "relative flex items-center justify-center w-8 h-8 rounded-[0.1rem] transition duration-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 border-2",
                  isSelected ? "bg-primary border-primary shadow-xl shadow-primary/30 rotate-0 scale-110" : "bg-white border-slate-100 hover:border-primary/40 rotate-12"
              )}
            >
              <CheckCircle size={16} className={cn("transition duration-700", isSelected ? "text-white scale-100 opacity-100 rotate-0" : "text-transparent scale-50 opacity-0 rotate-45")} />
            </button>
          </div>
        );
      }
    }
  ];

  const handleSave = () => {
    if (!selectedDept) {
      return toast('?ㅼ젙??遺?쒕? 癒쇱? ?좏깮??二쇱꽭??', 'info');
    }
    if (!selectedAuthorCode) {
      return toast('遺?ы븷 沅뚰븳???좏깮??二쇱꽭??', 'info');
    }

    if (confirm(`?좏깮??議곗쭅??紐⑤뱺 援ъ꽦?먯뿉寃?'${selectedAuthorCode}' 蹂댁븞 ?뺤콉???꾩뿭?곸쑝濡?媛뺤젣 ?곸슜?섏떆寃좎뒿?덇퉴?`)) {
      saveMutation.mutate(selectedAuthorCode);
    }
  };

  const currentDept = depts.find(d => d.orgnztId === selectedDept);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="議곗쭅 湲곕컲 沅뚰븳 ?쇨큵 ?꾨줈鍮꾩???
        breadcrumbs={[{ label: '蹂댁븞 愿由? }, { label: '議곗쭅 沅뚰븳' }, { label: '?쇨큵 愿由? }]}
      />

      <HubHeader 
        title="Department" 
        highlight="Batch" 
        subtitle="議곗쭅 ?⑥쐞??蹂댁븞 ??븷 媛뺤젣 諛고룷 諛?怨꾩젙 沅뚰븳 吏묓빀 ?좏뤃濡쒖? ?듯빀 愿由? 
        icon={Building2} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
                variant="ghost"
                onClick={() => queryClient.invalidateQueries()}
                className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition shadow-xl group active:scale-95 px-4"
            >
                <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button
              onClick={handleSave}
              className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1 gap-3 group"
            >
              <Save size={20} className="group-hover:scale-110 transition-transform duration-500" /> ?뺤콉 留덉뒪??諛고룷
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="ACTIVE_RESOURCES" value={depts.length} icon={Building2} color="indigo" />
        <HubMetricCard title="AUTHORITY_SCHEMAS" value={roles.length} icon={Lock} color="primary" />
        <HubMetricCard title="SYNC_PROBE" value={selectedDept ? "DEPT_READY" : "IDLE"} icon={Activity} color="emerald" status="ONLINE" />
        <HubMetricCard title="TOPOLOGY_FLOW" value="STEADY" icon={Workflow} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12 min-h-[850px]">
        {/* Left: Department Explorer */}
        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-8">
            <HubSectionCard title="議곗쭅 ?꾪궎?띿쿂 ?앸퀎" description="沅뚰븳 ?뺤콉 ?쇨큵 諛고룷 ?쒖뒪?????섏쐞 議곗쭅???앸퀎?섏꽭?? icon={Building2}>
                <div className="space-y-8 pt-4">
                    <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={16} />
                        <Input
                            placeholder="遺?쒕챸 寃??.."
                            className="pl-12 h-14 bg-slate-50/50 border-none rounded-[0.1rem] text-sm font-black tracking-tight shadow-inner"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {filteredDepts.length === 0 ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-12 text-center space-y-4">
                                    <Users size={48} className="mx-auto opacity-10 scale-125" />
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">Resource_Not_Found</p>
                                </motion.div>
                            ) : (
                                filteredDepts.map((d, idx) => (
                                    <motion.button
                                        key={d.orgnztId}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        onClick={() => {
                                            setSelectedDept(d.orgnztId);
                                            setSelectedAuthorCode(null);
                                        }}
                                        className={cn(
                                            "group flex items-center justify-between p-6 w-full rounded-[0.1rem] border-2 transition duration-300 relative overflow-hidden",
                                            selectedDept === d.orgnztId
                                                ? "bg-slate-900 border-slate-900 shadow-2xl shadow-slate-900/20"
                                                : "bg-white border-slate-50 hover:border-slate-200"
                                        )}
                                    >
                                        <div className="flex items-center gap-4 relative z-10">
                                            <div className={cn(
                                                "w-12 h-12 rounded-[0.1rem] flex items-center justify-center transition",
                                                selectedDept === d.orgnztId ? "bg-white/10 text-white" : "bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white"
                                            )}>
                                                <Users size={20} />
                                            </div>
                                            <div className="flex flex-col text-left">
                                                <span className={cn(
                                                    "text-xs font-black tracking-tighter leading-none mb-1",
                                                    selectedDept === d.orgnztId ? "text-white" : "text-slate-900"
                                                )}>{d.orgnztNm}</span>
                                                <span className={cn(
                                                    "text-[10px] font-mono font-bold tracking-widest",
                                                    selectedDept === d.orgnztId ? "text-white/30" : "text-slate-300"
                                                )}>{d.orgnztId}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className={cn(
                                            "transition shrink-0 relative z-10",
                                            selectedDept === d.orgnztId ? "opacity-100 translate-x-1" : "opacity-0 translate-x-0"
                                        )} />
                                        {selectedDept === d.orgnztId && (
                                            <motion.div layoutId="active-dept-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-primary rounded-r-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]" />
                                        )}
                                    </motion.button>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </HubSectionCard>
        </div>

        {/* Right: Policy Matrix Selection */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-10 h-full">
            <HubSectionCard 
                title={currentDept ? `[${currentDept.orgnztNm}] 蹂댁븞 留덉뒪???뺤콉 諛고룷` : "蹂댁븞 硫뷀듃由?뒪 ?좏깮"} 
                description="?좏깮??議곗쭅??紐⑤뱺 怨꾩젙???숆린?뷀븷 留덉뒪??沅뚰븳 ?꾪궎?띿쿂瑜??좏깮?섏떗?쒖삤." 
                icon={ShieldCheck}
            >
                <div className="relative h-full flex flex-col pt-4">
                    <AnimatePresence mode="wait">
                        {!selectedDept ? (
                            <motion.div 
                                initial={{ opacity: 0 }} 
                                animate={{ opacity: 1 }} 
                                className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 group select-none"
                            >
                                <div className="w-24 h-24 rounded-[0.1rem] bg-slate-50 flex items-center justify-center text-slate-100 shadow-inner mb-10 group-hover:scale-110 transition-transform duration-1000">
                                    <Key size={56} className="opacity-20" />
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-3xl font-black text-slate-200 uppercase tracking-tighter italic">Selection_Required</h3>
                                    <p className="text-[11px] font-black text-slate-200 tracking-[0.4em] uppercase leading-relaxed font-mono max-w-xs mx-auto">?앸퀎??遺?쒖쓽 蹂댁븞 嫄곕쾭?뚯뒪 援ъ꽦???꾪빐 醫뚯륫 由ъ뒪?몃? ?꾨줈釉뚰븯??떆??/p>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                className="space-y-8"
                            >
                                <div className="p-10 bg-slate-900 rounded-[0.1rem] text-white flex items-center gap-8 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                                        <Database size={160} className="text-primary" />
                                    </div>
                                    <div className="w-20 h-20 bg-white/10 rounded-[0.1rem] flex items-center justify-center border border-white/5 shadow-inner relative z-10">
                                        <Building2 size={36} className="text-primary" />
                                    </div>
                                    <div className="relative z-10 space-y-2">
                                        <span className="text-[10px] font-black text-white/30 tracking-[0.4em] uppercase font-mono">Organization_Context_Locked</span>
                                        <div className="flex items-baseline gap-3">
                                            <h4 className="text-3xl font-black tracking-tighter leading-none">{currentDept?.orgnztNm}</h4>
                                            <span className="text-xs font-black text-white/40 tracking-widest font-mono">[{selectedDept}]</span>
                                        </div>
                                        <p className="text-[10px] font-black text-primary/80 tracking-widest uppercase mt-2">??遺?쒖쓽 紐⑤뱺 援ъ꽦?먯뿉寃??꾩뿭 ?뺤콉 ?ㅼ젙???쒖옉?????덈뒗 ?곹깭?낅땲??</p>
                                    </div>
                                </div>

                                <div className="min-h-[500px] bg-white rounded-[0.1rem] border-2 border-slate-50 p-4">
                                    <StandardDataTable
                                        columns={columns}
                                        data={roles}
                                        loading={loading}
                                        keyField="authorCode"
                                        emptyMessage="?쒖뒪?쒖뿉 ?깅줉??沅뚰븳 洹몃９ ?뺣낫媛 ?놁뒿?덈떎."
                                        onRowClick={(item) => setSelectedAuthorCode(item.authorCode)}
                                        className="border-none bg-transparent"
                                    />
                                </div>

                                <div className="p-8 flex items-center gap-6 rounded-[0.1rem] bg-slate-50 border-2 border-dashed border-slate-100">
                                    <div className="w-12 h-12 bg-white rounded-[0.1rem] shadow-xl flex items-center justify-center shrink-0 border border-slate-100">
                                        <ShieldAlert size={24} className="text-rose-500" />
                                    </div>
                                    <div className="space-y-1">
                                         <p className="text-[11px] font-black text-slate-800 tracking-tight leading-relaxed">
                                            ?꾩뿭 ?뺤콉 媛뺤젣 諛고룷(Batch Deployment) ???대떦 議곗쭅 援ъ꽦?먯씠 蹂댁쑀??湲곗〈??紐⑤뱺 媛쒕퀎 沅뚰븳? <span className="text-rose-500 underline decoration-2 underline-offset-4 font-black italic">?곴뎄?곸쑝濡??뚭린</span>?섍퀬 留덉뒪???뺤콉?쇰줈 ?꾨㈃ 援먯껜?⑸땲??
                                        </p>
                                        <span className="text-[9px] font-black text-slate-400 tracking-[0.3em] uppercase opacity-60">?꾪궎?띿쿂 ?ъ꽕??二쇱쓽</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </HubSectionCard>
        </div>
      </div>
    </div>
  );
}
