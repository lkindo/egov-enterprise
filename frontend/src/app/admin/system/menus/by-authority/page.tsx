'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronRight, 
  Folder, 
  File, 
  Loader2, 
  ShieldCheck, 
  Settings, 
  Search, 
  LayoutGrid, 
  Activity, 
  Globe, 
  Layers, 
  Database,
  ArrowUpRight,
  ShieldAlert,
  Fingerprint,
  Workflow,
  Network,
  Lock,
  Compass,
  Zap,
  RefreshCcw,
  Milestone,
  Building2,
  Contact2,
  SearchCode
} from "lucide-react";
import { authorAdminService, AuthorInfo } from '@/services/admin/system/AuthorAdminService';
import { MenuByAuthority } from '@/types/security';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';

function buildMenuTree(menuList: MenuByAuthority[]): MenuByAuthority[] {
  const menuMap = new Map<number, MenuByAuthority>();
  const rootMenus: MenuByAuthority[] = [];

  menuList.forEach(menu => {
    menuMap.set(menu.menuNo, { ...menu, children: [] });
  });

  menuList.forEach(menu => {
    const currentMenu = menuMap.get(menu.menuNo)!;
    if (menu.upperMenuId === 0) {
      rootMenus.push(currentMenu);
    } else {
      const parent = menuMap.get(menu.upperMenuId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(currentMenu);
      }
    }
  });

  return rootMenus;
}

export default function MenuByAuthorityPage() {
  const [selectedAuthority, setSelectedAuthority] = useState<string>('');
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

  const { data: authorData } = useQuery({
    queryKey: ['admin-authorities-all'],
    queryFn: () => authorAdminService.getAuthorList({ page번호: 1, searchCondition: '1', searchKeyword: '' } as any),
    staleTime: 5 * 60 * 1000,
  });

  const authorities = (authorData as any)?.list || [] as AuthorInfo[];

  const { data: rawMenus = [], isLoading: isMenuLoading } = useQuery({
    queryKey: ['admin-menu-tree', selectedAuthority],
    queryFn: async () => {
      const data = await authorAdminService.getAuthorMenus(selectedAuthority);
      return ((data as any)?.list || (data as any)?.resultList || data || []) as MenuByAuthority[];
    },
    enabled: !!selectedAuthority,
  });

  const menuTree = useMemo(() => buildMenuTree(rawMenus), [rawMenus]);

  const toggleExpand = (menuNo: number) => {
    setExpandedMenus(prev => {
      const newSet = new Set(prev);
      if (newSet.has(menuNo)) {
        newSet.delete(menuNo);
      } else {
        newSet.add(menuNo);
      }
      return newSet;
    });
  };

  const currentAuth = authorities.find((a: AuthorInfo) => a.authorCode === selectedAuthority);

  const renderMenuTree = (menus: MenuByAuthority[], depth: number = 0) => {
    return menus.map((menu, idx) => {
      const hasChildren = menu.children && menu.children.length > 0;
      const isExpanded = expandedMenus.has(menu.menuNo);

      return (
        <motion.div 
            key={menu.menuNo}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
        >
          <div
            className={cn(
                "flex items-center gap-4 py-4 px-6 hover:bg-slate-50 cursor-pointer rounded-2xl transition-all group relative overflow-hidden active:scale-[0.99]",
                isExpanded && hasChildren ? "bg-slate-50/50" : ""
            )}
            style={{ paddingLeft: `${depth * 32 + 24}px` }}
            onClick={() => hasChildren && toggleExpand(menu.menuNo)}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-100 group-hover:border-primary/30 transition-colors">
                {hasChildren ? (
                <ChevronRight className={cn("h-4 w-4 transition-transform text-slate-400 group-hover:text-primary", isExpanded ? 'rotate-90' : '')} />
                ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-primary/40 transition-colors" />
                )}
            </div>

            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-100 transition-all",
                hasChildren ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"
            )}>
                {hasChildren ? <Folder size={18} /> : <File size={16} />}
            </div>

            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className={cn(
                    "font-black text-sm tracking-tight truncate",
                    hasChildren ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>{menu.menuNm}</span>
                <span className="text-[9px] font-black text-muted-foreground/40 tracking-[0.2em] font-mono uppercase truncate">{menu.progrmFileNm || 'TERMINAL_NODE'}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-slate-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">NODE_{menu.menuNo}</span>
            </div>
          </div>
          {hasChildren && isExpanded && (
              <div className="relative">
                  <div className="absolute left-[38px] top-0 bottom-0 w-px bg-slate-100 ml-[depth*32]" style={{ marginLeft: `${depth * 32}px` }} />
                  {renderMenuTree(menu.children!, depth + 1)}
              </div>
          )}
        </motion.div>
      );
    });
  };

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="권한 기반 내비게이션 토폴로지"
        breadcrumbs={[{ label: '시스템관리' }, { label: '메뉴관리' }, { label: '권한별 메뉴' }]}
      />

      <HubHeader 
        title="Hierarchy" 
        highlight="Audit" 
        subtitle="특정 보안 역할(Role)에 할당된 기능적 노드 계층 구조 및 접근 경로 매트릭스 시각화" 
        icon={Workflow} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
                variant="ghost"
                onClick={() => {}}
                className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl group active:scale-95 px-4"
            >
                <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button className="h-14 px-10 rounded-2xl bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group">
                <ShieldCheck size={20} className="group-hover:scale-110 transition-transform duration-500" /> 역할 인벤토리 관리
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="ACTIVE_SCHEMAS" value={authorities.length} icon={Database} color="primary" />
        <HubMetricCard title="NODES_IN_SCOPE" value={rawMenus.length} icon={LayoutGrid} color="amber" />
        <HubMetricCard title="HIERARCHY_DEPTH" value={selectedAuthority ? "SECTOR_READY" : "IDLE"} icon={Compass} color="indigo" />
        <HubMetricCard title="SECURITY_STATE" value="OPTIMAL" icon={Lock} color="emerald" status="SYNCED" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        {/* Authority Selection Sidebar */}
        <div className="col-span-12 lg:col-span-4 h-full space-y-8">
            <HubSectionCard title="역할 식별 데이터 선택" description="분석할 보안 컨텍스트 또는 시스템 그룹 권한을 식별하세요." icon={Lock}>
                <div className="space-y-8">
                    <div className="space-y-4 pt-4">
                        <label className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase ml-2">Access Role Specification</label>
                        <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
                            <SelectTrigger className="h-16 px-8 rounded-2xl bg-slate-50/50 border-none shadow-inner text-sm font-black tracking-tight focus:ring-4 focus:ring-primary/10 transition-all group active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                     <Fingerprint size={20} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                                     <SelectValue placeholder="보안 역할을 선택하십시오..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-2xl p-2 bg-slate-900 text-white">
                                {authorities.map((auth: AuthorInfo) => (
                                    <SelectItem 
                                        key={auth.authorCode} 
                                        value={auth.authorCode}
                                        className="rounded-xl h-12 font-black text-[10px] tracking-widest uppercase focus:bg-primary focus:text-white mb-1"
                                    >
                                        {auth.authorNm} ({auth.authorCode})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="p-8 rounded-[2.5rem] bg-slate-900 text-white relative overflow-hidden group border-none shadow-2xl min-h-[300px] flex flex-col justify-end">
                        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                            <ShieldAlert size={180} className="text-primary" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner">
                                <Activity size={28} className="text-primary" />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-2xl font-black tracking-tighter leading-tight uppercase">Topology<br />Intelligence</h4>
                                <p className="text-[9px] text-white/40 font-black tracking-[0.3em] uppercase leading-relaxed font-mono">Real-time Authorization<br />Stream Active ✓</p>
                            </div>
                            {selectedAuthority && (
                                <div className="pt-6 border-t border-white/5 space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-white/30">
                                        <span>SELECTED_ID</span>
                                        <span className="text-primary">{selectedAuthority}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black tracking-widest uppercase text-white/30">
                                        <span>CLUSTER_NODES</span>
                                        <span className="text-white">{rawMenus.length}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </HubSectionCard>
        </div>

        {/* Menu Tree Center */}
        <div className="col-span-12 lg:col-span-8 h-full">
            <HubSectionCard 
                title={currentAuth ? `[${currentAuth.authorNm}] 내비게이션 아키텍처` : "아키텍처 토폴로지 분석"} 
                description="할당된 모든 시스템 기능과 데이터 진입점에 대한 위계적 청사진입니다." 
                icon={Network}
            >
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-8">
                        <div>
                            <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic">Functional Node Tree Stream</span>
                        </div>
                        <div className="flex items-center gap-4">
                             {isMenuLoading && <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />}
                             <Button variant="ghost" size="sm" className="h-12 rounded-2xl px-6 text-[10px] font-black tracking-widest gap-2 hover:bg-slate-900 hover:text-white bg-slate-50 border border-slate-100 transition-all uppercase group shadow-sm">
                                <SearchCode size={16} className="group-hover:rotate-12 transition-transform" /> ANALYZE_NODES
                            </Button>
                        </div>
                    </div>

                    <div className="min-h-[600px] relative">
                         <AnimatePresence mode="wait">
                            {!selectedAuthority ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    className="absolute inset-0 flex flex-col items-center justify-center p-24 text-center select-none group"
                                >
                                    <div className="w-24 h-24 rounded-[2rem] bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner mb-8 group-hover:scale-110 transition-transform duration-1000">
                                        <Milestone size={48} className="opacity-20" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-300 tracking-tighter uppercase mb-4">PENDING_SELECTION</h3>
                                    <p className="text-[10px] font-black text-slate-200 tracking-[0.5em] uppercase max-w-[240px] leading-relaxed">역할을 식별하여 시스템 위계 데이터의 시각적 프로드를 실장하십시오.</p>
                                </motion.div>
                            ) : isMenuLoading ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-6"
                                >
                                    <Loader2 size={48} className="text-primary animate-spin opacity-40" />
                                    <span className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">MAPPING_TOPOLOGY...</span>
                                </motion.div>
                            ) : menuTree.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-8 py-24"
                                >
                                    <ShieldAlert size={64} className="text-rose-500/20" />
                                    <div className="space-y-2 text-center">
                                        <h4 className="text-lg font-black tracking-tighter text-slate-400 uppercase">NO_ACTIVE_NODES</h4>
                                        <p className="text-[9px] font-black text-slate-300 tracking-[0.3em] uppercase">해당 권한에 할당된 기능적 엔드포인트가 식별되지 않았습니다.</p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="p-4 rounded-[2.5rem] bg-white/50 backdrop-blur-md border-2 border-slate-50">
                                        {renderMenuTree(menuTree)}
                                    </div>
                                </motion.div>
                            )}
                         </AnimatePresence>
                    </div>
                </div>
            </HubSectionCard>
        </div>
      </div>
    </div>
  );
}
