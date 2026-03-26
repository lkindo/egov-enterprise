'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar, Search, Plus, Filter, ArrowRight, Trash2, 
  MapPin, Users, Clock, History, LayoutGrid, List,
  TrendingUp, Sparkles, Activity, Settings2, Zap, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { eventService, EventInfo } from '@/services/foundation/operation/eventService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function EventManagementClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchWrd, setSearchWrd] = useState('');
  const [viewType, setViewType] = useState<'GRID' | 'LIST'>('GRID');

  // --- Data Fetching ---
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events-list', searchWrd],
    queryFn: () => eventService.getEvents({ searchWrd, size: 20 }),
  });

  const displayItems = eventsData?.list || [];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      {/* 1. Matrix Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-2">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
             <span className="text-[10px] font-black tracking-[0.4em] text-primary uppercase leading-none">행사 운영 센터 (Event Ops)</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none flex items-center gap-3">
            행사 정보 스케줄링 <Sparkles className="text-primary animate-pulse" />
          </h2>
          <p className="text-xs font-bold text-slate-400 tracking-tight mt-2 max-w-lg">에고브 엔터프라이즈의 통합 행사 및 캠페인 관리 매트릭스입니다. 모든 이벤트 활동을 모니터링하고 제어하십시오.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
           <Button className="h-14 px-8 rounded-2xl bg-slate-100 text-slate-400 font-black tracking-widest text-[10px] uppercase hover:bg-slate-200 transition-all gap-3 border shadow-sm">
             <History size={18} /> 아카이브 보기
           </Button>
           <Button className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black tracking-widest text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 shadow-slate-900/20">
             <Plus size={18} /> 행사 신규 생성
           </Button>
        </div>
      </div>

      {/* 2. Control Matrix */}
      <div className="grid grid-cols-12 gap-10 px-2 lg:h-[480px]">
        {/* Radar Map (Visual Stats) */}
        <div className="col-span-12 lg:col-span-4 relative group">
          <Card className="h-full rounded-[4rem] border-0 bg-slate-900 text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden p-12 flex flex-col justify-between">
             <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-rose-500/5 pointer-events-none opacity-40 animate-pulse" />
             <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-black tracking-widest text-emerald-400/80 uppercase">Live Operations</span>
                   </div>
                   <Settings2 size={20} className="text-white/20 group-hover:text-primary transition-colors cursor-pointer" />
                </div>
                <div className="space-y-2">
                   <h1 className="text-6xl font-black tracking-tighter tabular-nums text-white group-hover:text-primary transition-colors">
                     {displayItems.length}
                   </h1>
                   <p className="text-[10px] font-black text-white/40 tracking-[0.5em] uppercase">등록된 전역 행사 유닛 (Active Units)</p>
                </div>
             </div>
             
             {/* Radial Matrix Visual */}
             <div className="relative h-40 flex items-center justify-center opacity-20">
                <div className="absolute w-32 h-32 rounded-full border border-white/10 group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute w-20 h-20 rounded-full border border-primary/20 animate-ping" />
                <Calendar size={48} className="text-white group-hover:rotate-12 transition-transform" />
             </div>

             <div className="relative z-10 p-6 bg-white/5 rounded-3xl backdrop-blur-3xl border border-white/5 flex items-center justify-between">
                <div className="text-left space-y-1">
                   <span className="text-[10px] font-black opacity-40">참여 지수</span>
                   <p className="text-xl font-black italic tracking-tighter">ELITE GRADE</p>
                </div>
                <div className="h-12 w-1 bg-primary rounded-full group-hover:scale-y-150 transition-transform" />
             </div>
          </Card>
        </div>

        {/* Global Stream Grid */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
           <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 tracking-[0.5em] uppercase">
                 <LayoutGrid size={14} className="text-primary" /> Global Event Matrix
              </div>
              <div className="relative group max-w-[320px] w-full">
                 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
                 <Input 
                   value={searchWrd}
                   onChange={(e) => setSearchWrd(e.target.value)}
                   className="h-14 bg-white border-2 border-slate-100 rounded-2xl pl-14 font-black tracking-tight text-sm shadow-sm focus:border-primary/20 focus:ring-8 focus:ring-primary/5 transition-all" 
                   placeholder="행사 시그널 검색..." 
                 />
              </div>
           </div>

           <Card className="rounded-[4rem] border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100/50">
              <div className="h-[400px] overflow-y-auto p-12 space-y-6 scrollbar-elegant">
                 {isLoading ? (
                    <div className="h-full flex items-center justify-center animate-pulse text-slate-300 font-black tracking-widest uppercase">데이터 링크 동기화 중...</div>
                 ) : displayItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-10">
                       <Zap size={64} />
                       <span className="font-black text-xl tracking-tighter uppercase italic">NO DATA UNITS FOUND</span>
                    </div>
                 ) : displayItems.map((event) => (
                    <motion.div 
                      layout
                      key={event.eventId} 
                      className="p-8 bg-white border border-slate-100 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-8 hover:border-primary/20 hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer group"
                    >
                       <div className="flex items-center gap-8 w-full md:w-auto">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors">
                             <span className="text-[10px] font-black text-slate-400 leading-none">행사</span>
                             <span className="text-2xl font-black text-slate-800 leading-none mt-1 group-hover:text-primary tracking-tighter transition-colors tabular-nums">{event.psncpa}</span>
                          </div>
                          <div className="space-y-1 min-w-0">
                             <div className="flex items-center gap-3">
                                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-2 py-0.5 rounded leading-none">신청 진행 중</span>
                                <span className="text-[10px] font-bold text-slate-300 tracking-tighter">{event.rceptBeginDe} → {event.rceptEndDe}</span>
                             </div>
                             <h3 className="text-xl font-black text-slate-900 tracking-tighter truncate leading-tight group-hover:text-primary transition-colors">{event.eventNm}</h3>
                             <div className="flex items-center gap-4 opacity-40">
                                <div className="flex items-center gap-1.5"><Users size={12} className="text-primary" /><span className="text-[11px] font-bold">참여정원: {event.psncpa}명</span></div>
                                <div className="flex items-center gap-1.5"><MapPin size={12} /><span className="text-[11px] font-bold">오프라인 컨퍼런스</span></div>
                             </div>
                          </div>
                       </div>
                       <div className="flex items-center gap-4 justify-end w-full md:w-auto">
                          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                             <Trash2 size={20} />
                          </Button>
                          <ArrowRight className="text-slate-100 group-hover:text-primary group-hover:translate-x-3 transition-all w-8 h-8" />
                       </div>
                    </motion.div>
                 ))}
              </div>
           </Card>
        </div>
      </div>

      {/* 3. Detailed Stats Matrix (Insights) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-2 lg:mt-10">
         <InsightCard label="Total Attendance" value="1.2M+" desc="전고점 대비 15% 상승" trend="+4.5%" type="primary" />
         <InsightCard label="System Heatmap" value="CRITICAL" desc="참여 밀집도 높은 구역" trend="HIGH" type="rose" />
         <InsightCard label="Schedule Matrix" value="Q2 STABLE" desc="분기별 계획 정격 동작" trend="OK" type="emerald" />
         <InsightCard label="Network Assets" value="2.4k" desc="연동된 대외 홍보 유닛" trend="+20" type="amber" />
      </div>

    </div>
  );
}

// --- Helper Components ---

function InsightCard({ label, value, desc, trend, type }: any) {
  const colorMap: any = {
    primary: "border-primary/20 hover:ring-primary/5 text-primary",
    rose: "border-rose-500/20 hover:ring-rose-500/5 text-rose-500",
    emerald: "border-emerald-500/20 hover:ring-emerald-500/5 text-emerald-500",
    amber: "border-amber-500/20 hover:ring-amber-500/5 text-amber-500",
  };

  return (
    <Card className={cn(
      "rounded-[3rem] border-2 bg-white p-10 space-y-6 transition-all hover:ring-[25px] flex flex-col justify-between shadow-xl", 
      colorMap[type]
    )}>
       <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
          <h4 className={cn("text-3xl font-black italic tracking-tighter leading-none", colorMap[type])}>{value}</h4>
       </div>
       <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
          <div className="space-y-0.5">
             <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{desc}</p>
             <span className={cn("text-[10px] font-black tracking-widest uppercase", colorMap[type])}>{trend} SIGNALS</span>
          </div>
          <Activity size={24} className="opacity-20" />
       </div>
    </Card>
  );
}
