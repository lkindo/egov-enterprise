'use client';

import { useState, useMemo, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ChevronRight, 
  Folder, 
  File, 
  Loader2, 
  ShieldCheck, 
  Workflow, 
  Network, 
  Lock, 
  Compass, 
  Database,
  ShieldAlert,
  Fingerprint,
  RefreshCcw,
  Milestone,
  SearchCode,
  LayoutGrid,
  Activity
} from "lucide-react";
import { authorAdminService, AuthorInfo } from '@/services/foundation/system/AuthorAdminService';
import { MenuByAuthority } from '@/types/foundation/security';
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

interface MenuByAuthorityClientProps {
  authorsPromise: Promise<any>;
}

export default function MenuByAuthorityClient({ authorsPromise }: MenuByAuthorityClientProps) {
  // [P1: Waterfall Elimination] Resolve authors data via use()
  const initialAuthorsData = use(authorsPromise);
  
  const [selectedAuthority, setSelectedAuthority] = useState<string>('');
  const [expandedMenus, setExpandedMenus] = useState<Set<number>>(new Set());

  const { data: authorData } = useQuery({
    queryKey: ['admin-authorities-all'],
    queryFn: () => authorAdminService.getAuthorList({ pageNo: 1, searchCondition: '1', searchKeyword: '' } as any),
    initialData: initialAuthorsData,
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
                "flex items-center gap-4 py-4 px-6 hover:bg-slate-100 cursor-pointer rounded-[0.1rem] transition group relative overflow-hidden active:scale-[0.99]",
                isExpanded && hasChildren ? "bg-slate-100/50" : ""
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
                "w-10 h-10 rounded-[0.1rem] flex items-center justify-center shadow-sm border border-slate-100 transition",
                hasChildren ? "bg-amber-50 text-amber-500 group-hover:bg-amber-500 group-hover:text-white" : "bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white"
            )}>
                {hasChildren ? <Folder size={18} /> : <File size={16} />}
            </div>

            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className={cn(
                    "font-black text-sm tracking-tight truncate",
                    hasChildren ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>{menu.menuNm}</span>
                <span className="text-[9px] font-black text-muted-foreground/40 tracking-[0.2em] font-mono uppercase truncate">{menu.progrmFileNm || 'NODE_ENDPOINT'}</span>
            </div>
            
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-slate-100 shadow-sm opacity-0 group-hover:opacity-100 transition scale-95 group-hover:scale-100">
                <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">ID_{menu.menuNo}</span>
            </div>
          </div>
          {hasChildren && isExpanded && (
              <div className="relative">
                  <div className="absolute left-[38px] top-0 bottom-0 w-px bg-slate-200" style={{ marginLeft: `${depth * 32}px` }} />
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
        title="沅뚰븳 湲곕컲 硫붾돱 嫄곕쾭?뚯뒪"
        breadcrumbs={[{ label: '?쒖뒪??愿由? }, { label: '硫붾돱 愿由? }, { label: '沅뚰븳蹂?硫붾돱' }]}
      />

      <HubHeader 
        title="沅뚰븳蹂?硫붾돱 愿由? 
        highlight="媛먯궗" 
        subtitle="?쒖뒪????븷蹂??묎렐 媛?ν븳 硫붾돱 怨꾩링 援ъ“瑜??쒓컖?뷀븯怨??뺥빀?깆쓣 寃利앺빀?덈떎." 
        icon={Workflow} 
        actions={
          <div className="flex gap-4 p-2 items-center">
            <Button
                variant="ghost"
                onClick={() => {}}
                className="h-14 w-14 rounded-[0.1rem] bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition shadow-xl group active:scale-95 px-4"
            >
                <RefreshCcw size={22} className="group-hover:rotate-180 transition-transform duration-700" />
            </Button>
            <Button className="h-14 px-10 rounded-[0.1rem] bg-slate-900 border-none text-white font-black text-[11px] tracking-widest uppercase shadow-2xl hover:bg-primary transition hover:-translate-y-1 gap-3 group">
                <ShieldCheck size={20} className="group-hover:scale-110 transition-transform duration-500" /> 沅뚰븳 ?몃깽?좊━
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?쒖꽦_沅뚰븳" value={authorities.length} icon={Database} color="primary" />
        <HubMetricCard title="?좊떦_硫붾돱_?? value={rawMenus.length} icon={LayoutGrid} color="amber" />
        <HubMetricCard title="怨꾩링_源딆씠" value={selectedAuthority ? "?⑺꽣_以鍮? : "?湲?} icon={Compass} color="indigo" />
        <HubMetricCard title="蹂댁븞_?곹깭" value="理쒖쟻" icon={Lock} color="emerald" status="?뺤긽" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-4 h-full space-y-8">
            <HubSectionCard title="??븷 ?좏깮" description="硫붾돱 援ъ“瑜?遺꾩꽍??蹂댁븞 ??븷???앸퀎?섏꽭?? icon={Lock}>
                <div className="space-y-8">
                    <div className="space-y-4 pt-4">
                        <label className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase ml-2">蹂댁븞 ??븷 (Access Role)</label>
                        <Select value={selectedAuthority} onValueChange={setSelectedAuthority}>
                            <SelectTrigger className="h-16 px-8 rounded-[0.1rem] bg-slate-50/50 border-none shadow-inner text-sm font-black tracking-tight focus:ring-4 focus:ring-primary/10 transition group active:scale-[0.98]">
                                <div className="flex items-center gap-4">
                                     <Fingerprint size={20} className="text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                                     <SelectValue placeholder="??븷???좏깮?섏떗?쒖삤..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-[0.1rem] border-none shadow-2xl p-2 bg-slate-900 text-white">
                                {authorities.map((auth: AuthorInfo) => (
                                    <SelectItem 
                                        key={auth.authorCode} 
                                        value={auth.authorCode}
                                        className="rounded-[0.1rem] h-12 font-black text-[10px] tracking-widest uppercase focus:bg-primary focus:text-white mb-1"
                                    >
                                        {auth.authorNm} ({auth.authorCode})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="p-8 rounded-[0.1rem] bg-slate-950 text-white relative overflow-hidden group border-none shadow-2xl min-h-[300px] flex flex-col justify-end">
                        <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 transition-transform duration-1000 group-hover:rotate-6">
                            <ShieldAlert size={180} className="text-primary" />
                        </div>
                        <div className="relative z-10 space-y-6">
                            <div className="w-14 h-14 bg-white/10 rounded-[0.1rem] flex items-center justify-center border border-white/5 shadow-inner">
                                <Activity size={28} className="text-primary" />
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-2xl font-black tracking-tighter leading-tight uppercase">硫붾돱 留ㅽ븨<br />?명뀛由ъ쟾??/h4>
                                <p className="text-[9px] text-white/40 font-black tracking-[0.3em] uppercase font-mono">Real-time Hierarchy Analysis</p>
                            </div>
                        </div>
                    </div>
                </div>
            </HubSectionCard>
        </div>

        <div className="col-span-12 lg:col-span-8 h-full">
            <HubSectionCard 
                title={currentAuth ? `[${currentAuth.authorNm}] 硫붾돱 ?꾪궎?띿쿂` : "?꾪궎?띿쿂 遺꾩꽍"} 
                description="?좏깮??沅뚰븳???좊떦???꾩껜 硫붾돱???꾧퀎??援ъ“?낅땲??" 
                icon={Network}
            >
                <div className="space-y-8">
                    <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100 pb-8">
                        <span className="text-[10px] font-black text-muted-foreground/30 tracking-[0.4em] uppercase font-mono italic">湲곕뒫 ?몃뱶 ?몃━ (Functional Node Tree)</span>
                        <div className="flex items-center gap-4">
                             {isMenuLoading && <Loader2 className="h-6 w-6 animate-spin text-primary opacity-40" />}
                             <Button variant="ghost" size="sm" className="h-12 rounded-[0.1rem] px-6 text-[10px] font-black tracking-widest gap-2 hover:bg-slate-900 hover:text-white bg-slate-50 border border-slate-100 transition uppercase group shadow-sm">
                                  <SearchCode size={16} className="group-hover:rotate-12 transition-transform" /> ?몃뱶 寃??                            </Button>
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
                                    <div className="w-24 h-24 rounded-[0.1rem] bg-slate-50 flex items-center justify-center text-slate-200 shadow-inner mb-8 group-hover:scale-110 transition-transform duration-1000">
                                        <Milestone size={48} className="opacity-20" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-300 tracking-tighter uppercase mb-2">沅뚰븳 誘몄꽑??/h3>
                                    <p className="text-[10px] font-black text-slate-200 tracking-[0.5em] uppercase">硫붾돱 援ъ“瑜?遺꾩꽍????븷??癒쇱? ?좏깮?섏떗?쒖삤.</p>
                                </motion.div>
                            ) : isMenuLoading ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-6"
                                >
                                    <Loader2 size={48} className="text-primary animate-spin opacity-40" />
                                    <span className="text-[11px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase">?곗씠??留ㅽ븨 以?..</span>
                                </motion.div>
                            ) : menuTree.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }} 
                                    animate={{ opacity: 1 }} 
                                    className="absolute inset-0 flex flex-col items-center justify-center gap-8 py-24"
                                >
                                    <ShieldAlert size={64} className="text-rose-500/20" />
                                    <h4 className="text-lg font-black tracking-tighter text-slate-400 uppercase">?좊떦??硫붾돱 ?놁쓬</h4>
                                </motion.div>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="p-4 rounded-[0.1rem] bg-slate-50/30 border-2 border-slate-100">
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
