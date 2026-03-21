'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { onlinePollAdminService, OnlinePollDto, OnlinePollItemDto } from '@/services/admin/system/OnlinePollAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import {
  Vote,
  Plus,
  Search,
  RefreshCcw,
  BarChart,
  Calendar,
  CheckCircle2,
  XCircle,
  Activity,
  Users,
  Layers,
  Trash2,
  PieChart,
  TrendingUp,
  Zap,
  Target,
  ChevronRight,
  MonitorCheck,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function OnlinePollAdminClient({ 
  initialPolls 
}: { 
  initialPolls: any 
}) {
  const [loading, setLoading] = useState(false);
  const [polls, setPolls] = useState(initialPolls.list || []);
  const [totalCount, setTotalCount] = useState(initialPolls.total || 0);
  const [searchKeyword, setSearchKeyword] = useState('');
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPoll, setNewPoll] = useState<OnlinePollDto>({
    pollNm: '',
    pollBeginDe: format(new Date(), 'yyyy-MM-dd'),
    pollEndDe: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
    pollKindCode: 'POLL01',
    pollDsuseYn: 'N',
    pollItems: [{ pollIemNm: '' }, { pollIemNm: '' }]
  });

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await onlinePollAdminService.getPollList({ keyword: searchKeyword });
      setPolls(res.list);
      setTotalCount(res.total);
    } catch (error) {
      toast.error('설문 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setNewPoll(prev => ({
      ...prev,
      pollItems: [...(prev.pollItems || []), { pollIemNm: '' }]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setNewPoll(prev => ({
      ...prev,
      pollItems: prev.pollItems?.filter((_, i) => i !== index)
    }));
  };

  const handleAdd = async () => {
    if (!newPoll.pollNm || !newPoll.pollItems?.every(item => item.pollIemNm)) {
      toast.error('설문 명과 모든 항목 내용을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      await onlinePollAdminService.createPoll(newPoll);
      toast.success('새 설문을 등록했습니다.');
      setIsAddOpen(false);
      handleRefresh();
    } catch (error) {
      toast.error('설문 등록에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: '설문 엔티티 (명칭)',
      accessor: (item: OnlinePollDto) => (
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110">
            <Vote size={22} />
          </div>
          <div>
            <span className="font-black tracking-tighter text-foreground block text-lg uppercase leading-none">{item.pollNm}</span>
            <span className="text-[9px] font-black text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">PROTOCOL ID: {item.pollId}</span>
          </div>
        </div>
      )
    },
    {
      header: '운용 타임프레임',
      accessor: (item: OnlinePollDto) => (
        <div className="flex items-center gap-3 font-mono text-[11px] font-black text-muted-foreground/60 tracking-tighter italic">
          <Calendar size={14} className="text-primary opacity-40" />
          {item.pollBeginDe} <span className="text-[8px] opacity-20 mx-1">/</span> {item.pollEndDe}
        </div>
      )
    },
    {
      header: '참여 데이터 분석',
      accessor: (item: OnlinePollDto) => {
        const totalVotes = item.pollItems?.reduce((sum, i) => sum + (i.pollIemCo || 0), 0) || 0;
        return (
          <div className="flex items-center gap-6 min-w-[200px]">
            <div className="flex-1 h-3 bg-slate-100 dark:bg-muted/30 rounded-full overflow-hidden shadow-inner border border-border/10">
              <div 
                className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]" 
                style={{ width: `${Math.min(100, (totalVotes / 100) * 100)}%` }} 
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <UserCheck size={14} className="text-primary" />
              <span className="text-[12px] font-black text-foreground tracking-tighter tabular-nums">{totalVotes.toLocaleString()}</span>
            </div>
          </div>
        );
      }
    },
    {
      header: '동작 상태',
      accessor: (item: OnlinePollDto) => (
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit shadow-sm transition-all",
          item.useAt === 'Y' 
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
            : "bg-slate-100 text-slate-400 border-border/50"
        )}>
          {item.useAt === 'Y' ? <Zap size={14} className="animate-pulse" /> : <XCircle size={14} />}
          <span className="text-[9px] font-black tracking-[0.2em] uppercase ">{item.useAt === 'Y' ? 'Live' : 'Terminated'}</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="의견 매트릭스 센터"
        breadcrumbs={[{ label: '커뮤니티' }, { label: '설문 인텔리전스' }]}
      />

      <HubHeader 
        title="온라인 설문" 
        highlight="매트릭스" 
        subtitle="전사 사용자 피드백 수집 및 데이터 시각화 분석 시스템" 
        icon={Vote} 
        actions={
          <div className="flex gap-4 p-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleRefresh}
              className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2"
            >
              <RefreshCcw size={16} className={cn(loading && "animate-spin")} /> 엔진 동기화
            </Button>
            <Button
              size="lg"
              onClick={() => setIsAddOpen(true)}
              className="h-12 px-8 rounded-xl font-black text-[10px] tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2"
            >
              <Plus size={18} /> 신규 프로토콜 생성
            </Button>
          </div>
        }
      />

      {/* Luxury Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
        <SummaryBlock 
          title="ACTIVE SESSIONS" 
          value={polls.filter((p: OnlinePollDto) => p.useAt === 'Y').length} 
          icon={<Activity size={26} />} 
          status="NOMINAL"
          color="text-emerald-500"
        />
        <SummaryBlock 
          title="TOTAL ARCHIVES" 
          value={totalCount} 
          icon={<Layers size={26} />} 
          status="STEADY"
          color="text-primary"
        />
        <SummaryBlock 
          title="ANALYTIC NODES" 
          value={polls.length} 
          icon={<BarChart size={26} />} 
          status="SYNCED"
          color="text-indigo-600"
        />
      </div>

      {/* Main Analysis Stream */}
      <HubSectionCard
        title="설문 보드 스트림"
        description="등록된 모든 피드백 수집 프로토콜의 운용 상태 및 참여 데이터 요약입니다."
        icon={TrendingUp}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
          <div>
            <h3 className="text-2xl font-black tracking-tighter uppercase leading-none">Intelligence Board</h3>
            <p className="text-[9px] font-bold text-muted-foreground tracking-[0.3em] uppercase mt-2 opacity-50">Global Feedback Monitoring</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative group/search flex-1 md:flex-none">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
              <Input
                placeholder="PROCURING TARGET..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-14 pl-12 pr-6 w-full md:w-[320px] bg-muted/30 border-none rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <StandardDataTable
            columns={columns}
            data={polls}
            loading={loading}
            emptyMessage="기록된 데이터 수집 프로토콜이 없습니다."
            className="border-none bg-transparent"
          />
        </div>
      </HubSectionCard>

      {/* Composition Dialog Container */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-[3.5rem] p-12 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-3xl relative overflow-x-hidden">
          <div className="absolute top-[-15%] left-[-15%] w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
          
          <DialogHeader className="space-y-6 relative z-10 text-center">
            <div className="w-20 h-20 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl mx-auto transition-transform hover:rotate-12 duration-500 border-4 border-white/20">
              <Vote size={32} />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-4xl font-black text-slate-900 tracking-tighter leading-none uppercase">Configure Protocol</DialogTitle>
              <DialogDescription className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">
                New Feedback Pipeline Architecture
              </DialogDescription>
            </div>
          </DialogHeader>
          
          <div className="space-y-10 py-10 relative z-10">
            <section className="space-y-5">
              <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2 flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                Poll Identity (Naming)
              </label>
              <Input
                placeholder="PROPOSED ACTION NAME..."
                value={newPoll.pollNm}
                onChange={(e) => setNewPoll(prev => ({ ...prev, pollNm: e.target.value }))}
                className="h-18 px-8 rounded-3xl border-none bg-slate-50 text-xl font-black focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase tracking-tight"
              />
            </section>
            
            <section className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2">Initiation Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                  <Input
                    type="date"
                    value={newPoll.pollBeginDe}
                    onChange={(e) => setNewPoll(prev => ({ ...prev, pollBeginDe: e.target.value }))}
                    className="h-16 pl-14 pr-6 rounded-2xl border-none bg-slate-50 font-black text-sm focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase ml-2">Termination Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                  <Input
                    type="date"
                    value={newPoll.pollEndDe}
                    onChange={(e) => setNewPoll(prev => ({ ...prev, pollEndDe: e.target.value }))}
                    className="h-16 pl-14 pr-6 rounded-2xl border-none bg-slate-50 font-black text-sm focus:bg-white transition-all shadow-inner"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                  Analytic Options (Items)
                </label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddItem}
                  className="h-10 px-6 rounded-xl text-[10px] font-black tracking-widest uppercase border-primary/20 text-primary hover:bg-primary/5 gap-2"
                >
                  <Plus size={14} /> Append Node
                </Button>
              </div>
              <div className="space-y-4">
                {newPoll.pollItems?.map((item, index) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={index} 
                    className="flex items-center gap-4 group/item"
                  >
                    <div className="w-14 h-16 rounded-2xl bg-slate-900/5 dark:bg-muted/30 flex flex-col items-center justify-center font-black text-slate-300 dark:text-muted-foreground text-[10px] shadow-inner border border-border/10 shrink-0">
                      <span className="opacity-40 uppercase mb-0.5">NODE</span>
                      <span className="text-foreground leading-none">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="flex-1 relative">
                       <Input
                        placeholder={`NODE ${index + 1} PAYLOAD...`}
                        value={item.pollIemNm}
                        onChange={(e) => {
                          const items = [...(newPoll.pollItems || [])];
                          items[index].pollIemNm = e.target.value;
                          setNewPoll(prev => ({ ...prev, pollItems: items }));
                        }}
                        className="h-16 px-6 rounded-2xl border-none bg-slate-50 font-bold text-sm focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase tracking-tight"
                      />
                    </div>
                    {index > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleRemoveItem(index)}
                        className="h-16 w-16 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      >
                        <Trash2 size={20} />
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            </section>
          </div>
          
          <DialogFooter className="relative z-10 gap-4 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
              className="h-18 px-12 rounded-2xl border-2 border-border font-black text-[11px] tracking-widest uppercase hover:bg-slate-50"
            >
              Terminate
            </Button>
            <Button
              onClick={handleAdd}
              disabled={loading}
              className="h-18 flex-1 bg-slate-900 border-none text-white rounded-2xl font-black text-[11px] tracking-[0.3em] uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
            >
              {loading ? <RefreshCcw size={18} className="animate-spin" /> : <MonitorCheck size={18} />}
              Commit Protocol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryBlock({ title, value, icon, status, color, bg }: any) {
  return (
    <div className={cn("hub-table-container p-12 group hover:scale-[1.02] transition-all relative overflow-hidden bg-white border-border/50 shadow-md", bg)}>
      <div className="flex justify-between items-start mb-10">
        <div className={cn("w-14 h-14 rounded-[var(--radius-hub-widget)] bg-slate-50 dark:bg-muted/10 flex items-center justify-center shadow-inner border border-border/10 group-hover:rotate-12 transition-transform", color)}>
          {icon}
        </div>
        <HubStatusBadge label={`SYSTEM STATUS: ${status}`} variant="default" className="text-[8px] font-black tracking-widest shadow-sm" />
      </div>
      <div>
        <h3 className="text-4xl font-black tracking-tighter text-foreground leading-none tabular-nums">{value?.toLocaleString() ?? 0}</h3>
        <p className="text-[10px] font-black text-muted-foreground/40 tracking-[0.4em] uppercase mt-4 leading-none">{title}</p>
      </div>
      <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000 grayscale">
        {React.cloneElement(icon, { size: 180 })}
      </div>
    </div>
  );
}
