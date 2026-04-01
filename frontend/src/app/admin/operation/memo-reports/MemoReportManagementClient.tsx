'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, Search, Plus, Mail, Inbox, Globe, 
  Send, User, Clock, ChevronRight, MessageSquare,
  AlertCircle, ShieldCheck, Sparkles, Filter, MoreVertical,
  ArrowRight, Trash2, Zap, Layers, History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
import { motion, AnimatePresence } from 'framer-motion';
import { memoReportService, MemoReportInfo } from '@/services/business/memoreport/memoReportService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { PagePagination } from '@/components/common/PagePagination';

type ReportTab = 'MY' | 'RECEIVED' | 'ALL';

export default function MemoReportManagementClient() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const size = 10;
  const [activeTab, setActiveTab] = useState<ReportTab>('RECEIVED');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    setPage(1);
    setSelectedReportId(null);
  };

  // --- Data Fetching ---
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['memo-reports', activeTab, searchKeyword, page],
    queryFn: () => {
      const params = { searchKeyword, page: page - 1, size };
      if (activeTab === 'MY') return memoReportService.getMyReports(params);
      if (activeTab === 'RECEIVED') return memoReportService.getReceivedReports(params);
      return memoReportService.getMemoReports(params);
    },
  });

  const displayItems = reportsData?.list || [];
  const totalItems = reportsData?.total || 0;
  const totalPages = Math.ceil(totalItems / size);
  const selectedReport = displayItems.find(r => r.reprtId === selectedReportId);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000 font-sans">
      <HubHeader 
        title="硫붾え 蹂닿퀬 留ㅽ듃由?뒪" 
        highlight="Report Node" 
        subtitle="?먭퀬釉님뷀꽣?꾨씪?댁쫰님鍮꾩젙님蹂닿퀬 諛?吏?쒖궗님?꾨떖님?꾪븳 ?듯빀 而ㅻ님덉님댁뀡 ?쇳꽣?낅땲님" 
        icon={Mail} 
        actions={
          <div className="flex gap-4">
             <Button className="h-14 px-8 rounded-2xl bg-slate-100 text-slate-900 font-black tracking-widest text-[10px] uppercase hover:bg-slate-200 transition-all gap-3 border shadow-sm">
               <History size={18} /> ?댁쟾 由ы룷님             </Button>
             <Button className="h-14 px-8 rounded-2xl bg-slate-900 text-white font-black tracking-widest text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 shadow-slate-900/20">
               <Plus size={18} /> 신규 蹂닿퀬 ?묒꽦
             </Button>
          </div>
        }
      />

      {/* 2. Main Terminal Matrix */}
      <div className="grid grid-cols-12 gap-10 px-2 lg:h-[650px]">
        {/* Left: Tabbed Stream (50%) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
           <div className="flex items-center justify-between px-6">
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border ring-1 ring-slate-100">
                 <NavTab active={activeTab === 'RECEIVED'} icon={<Inbox size={16} />} label="RECEIVED" onClick={() => handleTabChange('RECEIVED')} />
                 <NavTab active={activeTab === 'MY'} icon={<Send size={16} />} label="MY OPS" onClick={() => handleTabChange('MY')} />
                 <NavTab active={activeTab === 'ALL'} icon={<Globe size={16} />} label="GLOBAL" onClick={() => handleTabChange('ALL')} />
              </div>
              <div className="relative group max-w-[200px] w-full">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                 <Input 
                   value={searchKeyword}
                   onChange={(e) => setSearchKeyword(e.target.value)}
                   className="h-11 bg-white border-2 border-slate-50 rounded-xl pl-11 font-black text-xs focus:border-primary/20 transition-all" 
                   placeholder="由ы룷님?ㅼ틦님.." 
                 />
              </div>
           </div>

           <Card className="flex-1 rounded-[3.5rem] border-0 bg-white shadow-2xl overflow-hidden ring-1 ring-slate-100/50 flex flex-col min-h-[500px]">
              <div className="flex-1 overflow-y-auto p-10 space-y-4 scrollbar-elegant">
                 {isLoading ? (
                    <div className="h-full flex items-center justify-center animate-pulse text-slate-300 text-[10px] font-black tracking-[0.5em]">SYNCHRONIZING REPORT DATA...</div>
                 ) : displayItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-10">
                       <FileText size={64} />
                       <span className="font-black text-xl tracking-tighter uppercase italic">NO DATA UNITS</span>
                    </div>
                 ) : (
                   <>
                    {displayItems.map((report) => (
                      <motion.div 
                        layout
                        key={report.reprtId} 
                        onClick={() => setSelectedReportId(report.reprtId)}
                        className={cn(
                          "p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group flex items-start justify-between",
                          selectedReportId === report.reprtId 
                            ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.03]" 
                            : "bg-white border-transparent hover:border-slate-50 text-slate-600 shadow-sm"
                        )}
                      >
                        <div className="flex items-start gap-5">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex flex-col items-center justify-center border transition-colors",
                              selectedReportId === report.reprtId ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100 group-hover:bg-primary/5"
                            )}>
                                <span className={cn("text-[8px] font-black", selectedReportId === report.reprtId ? "text-white/40" : "text-slate-400")}>OCT</span>
                                <span className={cn("text-xl font-black leading-none", selectedReportId === report.reprtId ? "text-primary" : "text-slate-800")}>{report.reprtDe.slice(-2)}</span>
                            </div>
                            <div className="space-y-1 pr-4 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    report.readAt === 'Y' ? "bg-emerald-400" : "bg-primary animate-pulse"
                                  )} />
                                  <span className={cn("text-[8px] font-black tracking-[0.2em] uppercase", selectedReportId === report.reprtId ? "opacity-60" : "opacity-40")}>
                                      {report.readAt === 'Y' ? 'Synced' : 'New Entry'}
                                  </span>
                                </div>
                                <h4 className="text-base font-black tracking-tighter truncate leading-none mb-1 text-ellipsis overflow-hidden">{report.reprtSj}</h4>
                                <div className="flex items-center gap-3 opacity-40">
                                  <div className="flex items-center gap-1.5"><User size={12} /><span className="text-[10px] font-bold">{report.wrterNm}</span></div>
                                  <div className="flex items-center gap-1.5"><Clock size={12} /><span className="text-[10px] font-bold">{report.reprtDe}</span></div>
                                </div>
                            </div>
                        </div>
                        <ChevronRight size={20} className={cn("mt-4", selectedReportId === report.reprtId ? "text-primary" : "text-slate-100")} />
                      </motion.div>
                    ))}
                    
                    {totalPages > 1 && (
                      <div className="pt-8 flex justify-center border-t border-slate-50">
                        <PagePagination 
                          pagination={{
                            currentPageNo: page,
                            recordCountPerPage: size,
                            totalRecordCount: totalItems,
                            totalPageCount: totalPages
                          }}
                          onPageChange={(p) => setPage(p)}
                        />
                      </div>
                    )}
                   </>
                 )}
              </div>
           </Card>
        </div>

        {/* Right: Detailed Content Projection (50%) */}
        <div className="col-span-12 lg:col-span-6 h-full">
           <AnimatePresence mode="wait">
              {selectedReport ? (
                 <motion.div 
                   key={selectedReport.reprtId}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   className="h-full"
                 >
                    <Card className="h-full rounded-[4rem] border-0 bg-slate-900 text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative group">
                       <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-rose-500/5 opacity-40 pointer-events-none" />
                       
                       <CardHeader className="p-12 border-b border-white/5 flex flex-row items-center justify-between relative z-10 bg-white/5 backdrop-blur-3xl">
                          <div className="space-y-1">
                             <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em] leading-none">由ы룷님분석湲?(Analytical View)</span>
                             <h3 className="text-2xl font-black tracking-tighter italic">{selectedReport.reprtSj}</h3>
                          </div>
                          <div className="flex items-center gap-3">
                             <Button size="icon" className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"><Trash2 size={20} className="text-rose-500" /></Button>
                             <Button size="icon" className="w-12 h-12 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"><MoreVertical size={20} /></Button>
                          </div>
                       </CardHeader>

                       <CardContent className="flex-1 p-12 space-y-10 overflow-y-auto relative z-10 scrollbar-elegant">
                          <div className="flex items-center justify-between pb-8 border-b border-white/5">
                             <div className="flex items-center gap-8">
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">?묒꽦님노드</p>
                                   <div className="flex items-center gap-3 font-black text-lg italic tracking-tighter">
                                      <div className="w-6 h-6 rounded-full bg-primary" /> {selectedReport.wrterNm}
                                   </div>
                                </div>
                                <div className="w-[1px] h-10 bg-white/5" />
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">?섏떊 ?님/p>
                                   <div className="flex items-center gap-3 font-black text-lg italic tracking-tighter">
                                      <User size={20} className="text-primary" /> {selectedReport.recptnNm}
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">?댁쁺 ?좎쭨</p>
                                <p className="text-lg font-black tabular-nums tracking-tighter">{selectedReport.reprtDe}</p>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div className="flex items-center gap-3 text-[10px] font-black text-primary tracking-[0.3em] uppercase">
                                <Layers size={14} /> 蹂닿퀬 ?댁슜 ?곗씠님?좊떅 (Report Core)
                             </div>
                             <div className="p-8 bg-white/5 border border-white/5 rounded-[3rem] text-sm font-bold text-white/70 leading-relaxed tracking-tight italic">
                                {selectedReport.reprtCn}
                             </div>
                          </div>

                          {selectedReport.drctMatter && (
                             <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-3 text-[10px] font-black text-emerald-400 tracking-[0.3em] uppercase">
                                   <Zap size={14} /> ?쒖뒪님吏?쒖궗님(Direct Matter)
                                </div>
                                <div className="p-8 bg-emerald-500/10 border border-emerald-500/20 rounded-[3rem] text-sm font-black text-emerald-400 tracking-tight flex items-start gap-4">
                                   <MessageSquare size={20} className="shrink-0 animate-pulse mt-1" />
                                   <p>{selectedReport.drctMatter}</p>
                                </div>
                             </div>
                          )}
                       </CardContent>

                       <div className="p-12 border-t border-white/5 bg-white/5 backdrop-blur-3xl flex gap-6 relative z-10">
                          <Button className="h-16 flex-1 rounded-[2rem] bg-white text-slate-900 font-black tracking-[0.2em] text-[10px] hover:scale-105 transition-all shadow-2xl">?곸꽭 ?섏젙</Button>
                          <Button className="h-16 flex-[2] rounded-[2rem] bg-primary text-white font-black tracking-[0.4em] text-[10px] hover:scale-105 transition-all shadow-2xl shadow-primary/40 uppercase italic">吏?쒖궗님등록</Button>
                       </div>
                    </Card>
                 </motion.div>
              ) : (
                 <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-30 select-none bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                    <History size={64} className="mb-8" />
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">SELECT REPORT NODE</h3>
                    <p className="text-[10px] font-bold text-slate-400 tracking-[0.5em] mt-2 leading-relaxed">?곗씠님?먮쫫님?뺤씤?섎젮硫?br />醫뚯륫 ?ㅽ듃由쇱뿉님由ы룷?몃? ?좏깮?섏꽭님/p>
                 </div>
              )}
           </AnimatePresence>
        </div>
      </div>

    </div>
  );
}

// --- Helper Components ---

function NavTab({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-6 py-3 rounded-xl transition-all font-black text-[10px] tracking-widest",
        active ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
      )}
    >
      {icon} {label}
    </button>
  );
}

