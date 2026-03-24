'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, Plus, LucideIcon,
  Library, BookOpen, MessageCircleQuestion, Globe,
  TrendingUp, Users, ArrowRight, Layers, Trash2, Award, Zap, History,
  Filter, Calendar, ChevronDown, Check, HelpCircle, CornerDownRight,
  Monitor, Star, Sparkles, Hash, MessageSquare, ChevronRight, Quote,
  User, Eye, ShieldAlert, Lock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { knowledgeService, BoardArticle } from '@/services/knowledgeService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// --- Types ---
type KnowledgeCategory = 'WIKI' | 'FAQ' | 'QNA' | 'COMMUNITY';

export default function KnowledgeHubClient({ defaultTab }: { defaultTab?: KnowledgeCategory }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth(); // Auth context 연동
  
  const isAdmin = user?.role === 'ADMIN'; // 관리자 권한 여부
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'views'
  const [isScanning, setIsScanning] = useState(false);
  
  // URL의 bbsId 파라미터에 따라 초기 카테고리 설정
  const getInitialCategory = () => {
    const bbsId = searchParams.get('bbsId');
    if (bbsId === 'BBSMSTR_CCCCCCCCCCCC') return 'COMMUNITY';
    if (bbsId === 'BBSMSTR_BBBBBBBBBBBB') return 'FAQ';
    return defaultTab || 'WIKI';
  };

  const [activeCategory, setActiveCategory] = useState<KnowledgeCategory | 'ALL'>(getInitialCategory());

  const currentBbsId = activeCategory === 'COMMUNITY' ? 'BBSMSTR_CCCCCCCCCCCC' : 'BBSMSTR_AAAAAAAAAAAA';

  // 권한 위반 여부 체크 (WIKI나 FAQ는 관리자만)
  const isAccessRestricted = !isAdmin && (activeCategory === 'WIKI' || activeCategory === 'FAQ');

  // --- Data Fetching ---
  const { data: articlesData, isLoading } = useQuery({
    queryKey: ['knowledge-articles', activeCategory, searchQuery, sortBy],
    queryFn: () => knowledgeService.getArticles({ 
      bbsId: currentBbsId,
      page: 0,
      size: 20,
      searchCnd: searchQuery ? '0' : undefined,
      searchWrd: searchQuery || undefined
    }),
  });

  const { data: hotData } = useQuery({
    queryKey: ['hot-articles', activeCategory],
    queryFn: () => knowledgeService.getHotArticles(currentBbsId),
  });

  const { data: statsData } = useQuery({
    queryKey: ['knowledge-stats', activeCategory],
    queryFn: () => knowledgeService.getStats(currentBbsId),
  });

  const { data: activityData } = useQuery({
    queryKey: ['knowledge-activities', activeCategory],
    queryFn: () => knowledgeService.getActivities(currentBbsId),
  });

  const displayItems = React.useMemo(() => {
    let items = articlesData?.list || [];
    if (sortBy === 'views') {
      return [...items].sort((a, b) => (b.inqireCo || 0) - (a.inqireCo || 0));
    }
    return items;
  }, [articlesData, sortBy]);

  const hotItems = hotData?.list || [];

  useEffect(() => {
    if (searchQuery) {
      setIsScanning(true);
      const timer = setTimeout(() => setIsScanning(false), 800);
      return () => clearTimeout(timer);
    }
  }, [searchQuery]);

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={hubContainerVariants}
      className="space-y-12 pb-24"
    >
      {/* 1. Global Navigation Matrix */}
      <motion.div variants={hubItemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8 px-2">
        <div className="space-y-1.5 md:space-y-2">
          <div className="flex items-center gap-2 md:gap-3">
             <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[8px] md:text-[10px] font-black tracking-[0.3em] md:tracking-[0.5em] text-primary uppercase leading-none">Intelligence Hub Console</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-foreground tracking-tighter uppercase italic leading-none">Enterprise Knowledge</h2>
        </div>
        <div className="flex items-center gap-3 md:gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
           <Button 
             onClick={() => router.push(`/admin/community/boards/insertBoardArticle?bbsId=${currentBbsId}`)}
             className="h-12 md:h-16 px-4 md:px-8 rounded-xl md:rounded-2xl bg-slate-900 text-white font-black tracking-widest text-[9px] md:text-[11px] uppercase hover:scale-105 active:scale-95 transition-all shadow-xl gap-2 md:gap-3 group whitespace-nowrap"
           >
             <Plus className="w-[14px] md:w-[18px] h-[14px] md:h-[18px] group-hover:rotate-90 transition-transform" /> New Dataset
           </Button>
           <div className="h-10 md:h-16 w-[1px] md:w-[2px] bg-border/40 mx-1 md:mx-2 hidden sm:block" />
           <div className="hidden sm:flex flex-col items-end">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Internal Access Only</span>
              <span className="text-xs font-bold text-slate-800 tracking-tight mt-1 underline decoration-primary/30 decoration-2">Admin Root</span>
           </div>
        </div>
      </motion.div>

      {/* 2. Intelligent Search Matrix */}
      <motion.div variants={hubItemVariants} className="relative h-[320px] md:h-[420px] rounded-[2.5rem] md:rounded-[4rem] bg-slate-900 overflow-hidden flex flex-col items-center justify-center p-6 md:p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] border-none mx-2">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-rose-500/10 opacity-60 animate-pulse duration-[10s]" />
        
        {isScanning && (
          <motion.div 
            initial={{ top: '-10%' }}
            animate={{ top: '110%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute left-0 right-0 h-[2px] bg-primary/40 blur-sm z-10"
          />
        )}

        <div className="relative z-20 text-center w-full max-w-4xl space-y-8 md:space-y-12 px-2 font-sans">
          <div className="space-y-3 md:space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none uppercase italic">Knowledge Portal</h1>
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <span className="h-[1px] md:h-[2px] w-8 md:w-12 bg-primary/30" />
              <HubInsightBadge label="Enterprise Collective Intelligence Matrix" className="text-white/40 !opacity-40 text-[8px] md:text-[9px]" />
              <span className="h-[1px] md:h-[2px] w-8 md:w-12 bg-primary/30" />
            </div>
          </div>
          
          <div className="space-y-6 md:space-y-8">
            <div className="relative group max-w-3xl mx-auto w-full">
              <Search className={cn(
                "absolute left-6 md:left-8 top-1/2 -translate-y-1/2 transition-all scale-110 md:scale-150 duration-500",
                isScanning ? "text-primary animate-ping" : "text-white/20 group-focus-within:text-primary",
                "w-[18px] md:w-[20px] h-[18px] md:h-[20px]"
              )} />
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-16 md:h-24 bg-white/5 border-2 border-white/5 rounded-[2rem] md:rounded-[3rem] px-16 md:px-24 text-white text-lg md:text-3xl font-black placeholder:text-white/10 focus:bg-white focus:text-slate-900 transition-all shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] focus:ring-[16px] md:focus:ring-[24px] focus:ring-primary/10 tracking-tight"
                placeholder="지식 인텔리전스 스캐닝..."
              />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
              <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl backdrop-blur-xl">
                 <FilterButton active={sortBy === 'latest'} onClick={() => setSortBy('latest')} label="RECENT" />
                 <FilterButton active={sortBy === 'views'} onClick={() => setSortBy('views')} label="IMPACT" />
              </div>
              <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
              <div className="text-[9px] md:text-[10px] font-black text-white/20 tracking-widest uppercase">
                {displayItems.length} Units Located
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Stats & Insights Matrix */}
      <motion.div variants={hubItemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 px-2">
        <StatsCard 
          label="Intelligence Score" 
          value={`${Math.round(statsData?.intelligenceScore || 0)}/100`} 
          desc="Collective IQ Trend" 
          trend="+12% Critical" 
        />
        <StatsCard 
          label="Global Reach" 
          value={(statsData?.totalViews || 0).toLocaleString()} 
          desc="Visual Signal Units" 
          trend="+45.2% Impact" 
        />
        <StatsCard 
          label="Contributor Node" 
          value={statsData?.topContributor || 'System'} 
          desc="Top Insight Provider" 
          trend="Elite Status" 
        />
      </motion.div>

      {/* 4. Category Matrix - Mobile Swiper Enabled */}
      <motion.div variants={hubItemVariants} className="px-2 overflow-hidden">
        <motion.div 
          drag="x"
          dragConstraints={{ left: -300, right: 0 }}
          className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-auto sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 cursor-grab active:cursor-grabbing"
        >
          <CategoryCard title="Global Wiki" desc="기술 사양서" icon={<Library size={28} />} count={142} color="primary" active={activeCategory === 'WIKI'} onClick={() => setActiveCategory('WIKI')} />
          <CategoryCard title="Customer Help" desc="FAQ 가이드" icon={<BookOpen size={28} />} count={28} color="amber" active={activeCategory === 'FAQ'} onClick={() => setActiveCategory('FAQ')} />
          <CategoryCard title="Tech Forum" desc="Q&A 분석" icon={<MessageCircleQuestion size={28} />} count={567} color="rose" active={activeCategory === 'QNA'} onClick={() => setActiveCategory('QNA')} />
          <CategoryCard title="Community" desc="혁신 클러스터" icon={<Users size={28} />} count={12} color="emerald" active={activeCategory === 'COMMUNITY'} onClick={() => setActiveCategory('COMMUNITY')} />
        </motion.div>
        <div className="flex justify-center mt-6 lg:hidden">
           <div className="flex gap-1.5 items-center">
              <div className={cn("w-1.5 h-1.5 rounded-full transition-all", activeCategory === 'WIKI' ? "bg-primary w-4" : "bg-border")} />
              <div className={cn("w-1.5 h-1.5 rounded-full transition-all", activeCategory === 'FAQ' ? "bg-primary w-4" : "bg-border")} />
              <div className={cn("w-1.5 h-1.5 rounded-full transition-all", activeCategory === 'QNA' ? "bg-primary w-4" : "bg-border")} />
              <div className={cn("w-1.5 h-1.5 rounded-full transition-all", activeCategory === 'COMMUNITY' ? "bg-primary w-4" : "bg-border")} />
           </div>
        </div>
      </motion.div>

      {/* 5. Main Content Matrix */}
      <motion.div variants={hubItemVariants} className="grid grid-cols-12 gap-10 px-2 mt-4 relative z-0">
        {/* Main Stream Area */}
        <div className="col-span-12 lg:col-span-8 space-y-10">
          <HubSectionCard title="Knowledge Stream" description="실시간으로 유입되는 지식 데이터 유닛입니다." icon={Layers}>
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {isAccessRestricted ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center p-24 space-y-8 bg-slate-50 border-2 border-dashed rounded-[3rem] border-primary/20"
                  >
                    <div className="w-24 h-24 rounded-[2.5rem] bg-white shadow-2xl flex items-center justify-center text-primary border-2 border-primary/10 animate-bounce">
                      <ShieldAlert size={48} />
                    </div>
                    <div className="text-center space-y-4 max-w-sm">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Access Matrix Denied</h3>
                      <p className="text-sm font-bold text-muted-foreground/60 leading-relaxed uppercase tracking-tighter">귀하의 현재 노드 권한으로는 Wiki 및 FAQ 데이터셋에 접근할 수 없습니다. 시스템 관리자에게 상위 보안 클리어런스를 요청하십시오.</p>
                    </div>
                    <Button 
                       onClick={() => setActiveCategory('COMMUNITY')}
                       variant="outline"
                       className="h-14 px-8 rounded-2xl border-2 font-black tracking-widest text-[10px] uppercase gap-3 shadow-xl hover:bg-slate-900 hover:text-white transition-all"
                    >
                      <ArrowRight size={16} /> Open Public Community
                    </Button>
                  </motion.div>
                ) : (
                  <>
                    {isLoading ? (
                      <div className="p-12 text-center text-muted-foreground animate-pulse">지식 스트림을 동기화 중입니다...</div>
                    ) : displayItems.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-20 space-y-4 border-2 border-dashed rounded-[3rem] border-border/50">
                        <Hash size={40} className="text-muted-foreground/20" />
                        <p className="text-muted-foreground font-black text-sm uppercase tracking-widest text-center">No Knowledge Record Found</p>
                      </div>
                    ) : displayItems.map((item: any) => (
                      <motion.div 
                        layout
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&nttId=${item.id}`)}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-5 md:p-8 bg-white border border-border/40 rounded-[2rem] md:rounded-[2.5rem] hover:ring-[15px] md:hover:ring-[20px] hover:ring-primary/5 hover:border-primary/20 transition-all cursor-pointer group shadow-sm hover:shadow-2xl"
                      >
                        <div className="flex gap-4 md:gap-6 items-start">
                           <div className="w-12 h-12 md:w-16 md:h-16 rounded-[1.2rem] md:rounded-[1.5rem] bg-slate-50 flex flex-col items-center justify-center border border-border/50 group-hover:bg-primary/5 transition-colors shrink-0">
                              <span className="text-[8px] md:text-[10px] font-black text-muted-foreground/40 leading-none">SCORE</span>
                              <span className="text-sm md:text-xl font-black text-slate-800 leading-none mt-1">{Math.floor(Math.random() * 20) + 80}</span>
                           </div>
                           <div className="space-y-1 md:space-y-2 min-w-0">
                              <div className="flex items-center gap-2 md:gap-3">
                                 <span className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded leading-none whitespace-nowrap text-ellipsis overflow-hidden">CORE UNIT</span>
                                 <span className="text-[8px] md:text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.1em] md:tracking-[0.2em]">{item.frstRegisterPnttmStr}</span>
                              </div>
                              <h4 className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter leading-tight group-hover:text-primary transition-colors line-clamp-1">{item.nttSj}</h4>
                              <div className="flex items-center gap-3 md:gap-4 opacity-40">
                                 <div className="flex items-center gap-1 md:gap-1.5"><User size={10} className="text-primary md:size-[12px]" /><span className="text-[9px] md:text-[10px] font-bold text-slate-900 truncate max-w-[60px] md:max-w-none">{item.ntcrNm}</span></div>
                                 <div className="flex items-center gap-1 md:gap-1.5"><Eye size={10} className="md:size-[12px]" /><span className="text-[9px] md:text-[10px] font-bold">{(item.inqireCo || 0).toLocaleString()} Views</span></div>
                              </div>
                           </div>
                        </div>
                        <div className="mt-4 sm:mt-0 flex items-center justify-between sm:justify-end gap-4">
                           <div className="sm:hidden flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[9px] font-black text-emerald-500 uppercase">SYNCED</span>
                           </div>
                           <div className="hidden sm:flex flex-col items-end">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Stability Status</span>
                              <span className="text-xs font-black text-emerald-500 mt-1 uppercase">Synchronized</span>
                           </div>
                           <ArrowRight className="text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-2 transition-all w-5 h-5 md:w-6 md:h-6" />
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}
              </AnimatePresence>
            </div>
          </HubSectionCard>
        </div>

        {/* Sidebar Insights Matrix */}
        <div className="col-span-12 lg:col-span-4 space-y-10">
          <HubSectionCard title="Trending Radar" description="인게이지먼트가 높은 데이터 지표" icon={TrendingUp}>
            <div className="space-y-4">
              {hotItems.map((item: any, idx: number) => (
                <div key={item.id} onClick={() => router.push(`/admin/community/boards/detail?bbsId=${item.bbsId || currentBbsId}&nttId=${item.id}`)} className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group">
                  <span className="text-3xl font-black text-muted-foreground/20 group-hover:text-primary/20 transition-colors w-8 italic">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-slate-800 tracking-tight truncate leading-none uppercase">{item.nttSj}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <TrendingUp size={10} className="text-rose-500" />
                       <span className="text-[9px] font-black text-rose-500 uppercase">Impact Score High</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/20" />
                </div>
              ))}
            </div>
          </HubSectionCard>

          <HubSectionCard title="Active Stream" description="실시간 지식 네트워크 활동" icon={History} className="bg-slate-900 border-none text-white shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none grayscale rotate-12">
               <History size={120} />
            </div>
            <div className="space-y-6 relative z-10 font-sans">
              {(activityData || []).slice(0, 5).map((activity: any) => (
                <div key={activity.id} className="flex items-center gap-5 p-5 bg-white/5 border border-white/5 rounded-[2rem] hover:bg-white/10 transition-all group/activity shadow-lg backdrop-blur-3xl">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover/activity:rotate-12 transition-all">
                    <Zap size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white/90 tracking-tight truncate leading-none mb-1.5 uppercase italic">{activity.title}</p>
                    <div className="flex items-center gap-3 opacity-40">
                      <span className="text-[9px] font-black uppercase tracking-widest underline decoration-primary/50 underline-offset-2">{activity.user}</span>
                      <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest tabular-nums">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </HubSectionCard>

          <div className="hub-card-premium p-10 bg-gradient-to-br from-primary/10 to-transparent border-primary/20 flex flex-col items-center justify-center text-center space-y-6">
             <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center text-primary shadow-2xl border-2 border-primary/10 animate-spin-slow">
                <Sparkles size={32} />
             </div>
             <div>
                <h4 className="text-xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">Intelligence Engine</h4>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-2">Active Data Matrix Scanning</p>
             </div>
             <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: '84%' }} transition={{ duration: 2 }} className="h-full bg-primary" />
             </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Internal Helper Components ---

function HubInsightBadge({ label, className }: { label: string, className?: string }) {
  return (
    <div className={cn("px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 flex items-center gap-2", className)}>
      <div className="w-1 h-1 rounded-full bg-primary" />
      <span className="text-[9px] font-black tracking-widest uppercase italic">{label}</span>
    </div>
  );
}

function FilterButton({ active, onClick, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all",
        active 
          ? "bg-primary text-white shadow-lg shadow-primary/20" 
          : "text-white/40 hover:text-white hover:bg-white/5"
      )}
    >
      {label}
    </button>
  );
}

function StatsCard({ label, value, desc, trend }: { label: string, value: string, desc: string, trend: string }) {
  return (
    <div className="hub-card-premium p-8 flex flex-col gap-4 group hover:ring-[20px] hover:ring-primary/5 transition-all">
      <div className="flex items-center justify-between">
         <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
         <TrendingUp size={14} className="text-primary opacity-30 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="space-y-1">
         <h4 className="text-4xl font-black tracking-tighter text-slate-900 italic tabular-nums group-hover:text-primary transition-colors">{value}</h4>
         <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{desc}</p>
      </div>
      <div className="pt-4 border-t border-border/40 flex items-center justify-between">
         <span className="text-[10px] font-black text-rose-500 uppercase">{trend}</span>
         <div className="h-1 w-12 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3" />
         </div>
      </div>
    </div>
  );
}

function CategoryCard({ title, desc, icon, count, color, active, onClick }: any) {
  const colorMap: any = {
    primary: "text-primary border-primary/20 bg-primary/5",
    amber: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    rose: "text-rose-500 border-rose-500/20 bg-rose-500/5",
    emerald: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
  };

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-8 rounded-[3rem] border-2 transition-all duration-500 cursor-pointer group flex flex-col gap-6",
        active 
          ? "border-primary bg-primary/5 shadow-2xl scale-105" 
          : "border-border/40 bg-white hover:border-primary/20 hover:ring-[20px] hover:ring-primary/5"
      )}
    >
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center shadow-inner", colorMap[color])}>
        {icon}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-2xl tracking-tighter text-slate-900 italic uppercase leading-none">{title}</h3>
          <span className="text-[10px] font-black opacity-30 group-hover:opacity-100 transition-opacity">{count} UNTS</span>
        </div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">{desc}</p>
      </div>
      <div className={cn("absolute bottom-8 right-8 w-1 h-8 rounded-full transition-transform", active ? "bg-primary scale-y-100" : "bg-border scale-y-0 group-hover:scale-y-50")} />
    </div>
  );
}

function HubSectionCard({ title, description, icon: Icon, children, className }: any) {
  return (
    <div className={cn("hub-card-premium p-10 space-y-8", className)}>
      <div className="flex items-center justify-between border-b border-border/40 pb-6 uppercase">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-primary shadow-inner border border-border/50">
            <Icon size={20} />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-slate-900 tracking-tighter italic leading-none">{title}</h3>
            <p className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black opacity-20 tracking-widest">LIVE DATA FEED</span>
           </div>
        </div>
      </div>
      {children}
    </div>
  );
}
