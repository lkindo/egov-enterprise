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
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PagePagination } from '@/components/common/PagePagination';

export default function EventManagementClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchWrd, setSearchWrd] = useState('');
  const [page, setPage] = useState(1);
  const size = 10;

  // --- Data Fetching ---
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events-list', searchWrd, page],
    queryFn: () => eventService.getEvents({ searchWrd, page: page - 1, size }),
  });

  const displayItems = eventsData?.list || [];
  const totalItems = eventsData?.total || 0;
  const totalPages = Math.ceil(totalItems / size);

  // --- DataTable Configuration ---
  const eventColumns: Column<EventInfo>[] = [
    {
      header: 'EVENT_UNIT',
      accessor: (event) => (
        <div className="flex items-center gap-8 py-2">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex flex-col items-center justify-center border border-slate-100 group-hover:bg-primary/5 transition-colors shadow-inner">
            <span className="text-[10px] font-black text-slate-400 leading-none">?âÏÇ¨</span>
            <span className="text-xl font-black text-slate-800 leading-none mt-1 group-hover:text-primary tracking-tighter transition-colors tabular-nums">{event.psncpa}</span>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-2 py-0.5 rounded leading-none">?†Ï≤≠ ÏßÑÌñâ Ï§?/span>
              <span className="text-[9px] font-bold text-slate-300 tracking-tighter">{event.rceptBeginDe} ??{event.rceptEndDe}</span>
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tighter truncate leading-tight group-hover:text-primary transition-colors">{event.eventNm}</h3>
            <div className="flex items-center gap-4 opacity-40">
              <div className="flex items-center gap-1.5"><Users size={10} className="text-primary" /><span className="text-[10px] font-bold">Ï∞∏Ïó¨?ïÏõê: {event.psncpa}Î™?/span></div>
              <div className="flex items-center gap-1.5"><MapPin size={10} /><span className="text-[10px] font-bold">?§ÌîÑ?ºÏù∏ Ïª®Ìçº?∞Ïä§</span></div>
            </div>
          </div>
        </div>
      )
    },
    {
        header: 'CONTROLS',
        className: 'text-right w-24',
        accessor: (event) => (
            <div className="flex items-center justify-end pr-4">
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                </Button>
            </div>
        )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <HubHeader 
        title="?âÏÇ¨ ?¥ÏòÅ ?ºÌÑ∞" 
        highlight="Event Ops" 
        subtitle="?êÍ≥†Î∏??îÌÑ∞?ÑÎùº?¥Ï¶à???µÌï© ?âÏÇ¨ Î∞?Ï∫†Ìéò??Í¥ÄÎ¶?Îß§Ìä∏Î¶?ä§?ÖÎãà?? Î™®Îì† ?¥Î≤§???úÎèô??Î™®Îãà?∞ÎßÅ?òÍ≥† ?úÏñ¥?òÏã≠?úÏò§." 
        icon={Calendar} 
        actions={
          <div className="flex gap-4">
             <Button className="h-14 px-8 rounded-2xl bg-slate-100 text-slate-400 font-black tracking-widest text-[10px] uppercase hover:bg-slate-200 transition-all gap-3 border shadow-sm">
               <History size={18} /> ?ÑÏπ¥?¥Î∏å Î≥¥Í∏∞
             </Button>
             <Button className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black tracking-widest text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 shadow-slate-900/20">
               <Plus size={18} /> ?âÏÇ¨ ?†Í∑ú ?ùÏÑ±
             </Button>
          </div>
        }
      />

      {/* 2. Control Matrix */}
      <div className="grid grid-cols-12 gap-10 px-2 min-h-[500px]">
        {/* Global Stream Grid */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 h-full">
            <HubSectionCard 
                title="Global Event Matrix" 
                description="?ÑÏó≠?ÅÏúºÎ°??§Ïû•???âÏÇ¨ ?úÎèô Î∞?Ï∫†Ìéò???úÍ∑∏???§Ìä∏Î¶ºÏûÖ?àÎã§." 
                icon={LayoutGrid}
            >
                <div className="space-y-8">
                    <div className="flex items-center justify-end px-2 border-b border-slate-100 pb-8 mb-4">
                        <div className="relative group max-w-[320px] w-full">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
                            <Input 
                                value={searchWrd}
                                onChange={(e) => setSearchWrd(e.target.value)}
                                className="h-14 bg-slate-50 border-none rounded-2xl pl-14 font-black tracking-tight text-sm shadow-inner" 
                                placeholder="?âÏÇ¨ ?úÍ∑∏??Í≤Ä??.." 
                            />
                        </div>
                    </div>

                    <StandardDataTable
                        columns={eventColumns as any}
                        data={displayItems as any}
                        loading={isLoading}
                        emptyMessage="?ùÎ≥Ñ???∞Ïù¥???†Îãõ??Ï°¥Ïû¨?òÏ? ?äÏäµ?àÎã§."
                        keyField="eventId"
                        isPremium={false}
                        className="bg-transparent border-none shadow-none"
                        pagination={{
                            currentPage: page,
                            totalPages: totalPages,
                            onPageChange: (p) => setPage(p)
                        }}
                    />
                </div>
            </HubSectionCard>
        </div>

        {/* Radar Map (Visual Stats) */}
        <div className="col-span-12 lg:col-span-4 relative group lg:sticky lg:top-8 h-fit">
          <Card className="rounded-[4rem] border-0 bg-slate-900 text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden p-12 flex flex-col justify-between min-h-[480px]">
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
                     {totalItems}
                   </h1>
                   <p className="text-[10px] font-black text-white/40 tracking-[0.5em] uppercase">?±Î°ù???ÑÏó≠ ?âÏÇ¨ ?†Îãõ (Active Units)</p>
                </div>
             </div>
             
             {/* Radial Matrix Visual */}
             <div className="relative h-40 flex items-center justify-center opacity-20 my-8">
                <div className="absolute w-32 h-32 rounded-full border border-white/10 group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute w-20 h-20 rounded-full border border-primary/20 animate-ping" />
                <Calendar size={48} className="text-white group-hover:rotate-12 transition-transform" />
             </div>

             <div className="relative z-10 p-6 bg-white/5 rounded-3xl backdrop-blur-3xl border border-white/5 flex items-center justify-between mt-auto">
                <div className="text-left space-y-1">
                   <span className="text-[10px] font-black opacity-40">Ï∞∏Ïó¨ ÏßÄ??/span>
                   <p className="text-xl font-black italic tracking-tighter">ELITE GRADE</p>
                </div>
                <div className="h-12 w-1 bg-primary rounded-full group-hover:scale-y-150 transition-transform" />
             </div>
          </Card>
        </div>
      </div>

      {/* 3. Detailed Stats Matrix (Insights) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-2 lg:mt-10">
         <InsightCard label="Total Attendance" value="1.2M+" desc="?ÑÍ≥†???ÄÎπ?15% ?ÅÏäπ" trend="+4.5%" type="primary" />
         <InsightCard label="System Heatmap" value="CRITICAL" desc="Ï∞∏Ïó¨ Î∞ÄÏßëÎèÑ ?íÏ? Íµ¨Ïó≠" trend="HIGH" type="rose" />
         <InsightCard label="Schedule Matrix" value="Q2 STABLE" desc="Î∂ÑÍ∏∞Î≥?Í≥ÑÌöç ?ïÍ≤© ?ôÏûë" trend="OK" type="emerald" />
         <InsightCard label="Network Assets" value="2.4k" desc="?∞Îèô???Ä???çÎ≥¥ ?†Îãõ" trend="+20" type="amber" />
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
