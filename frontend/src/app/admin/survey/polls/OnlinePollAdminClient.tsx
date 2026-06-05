'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { onlinePollAdminService,  OnlinePollDto } from '@/services/foundation/system/OnlinePollAdminService';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { Vote, 
 Plus, 
 Search, 
 RefreshCcw, 
 BarChart, 
 Calendar, 
 XCircle, 
 Activity, 
 Layers, 
 Trash2, 
 TrendingUp, 
 Zap, 
 MonitorCheck, 
 UserCheck, 
 Clock } from 'lucide-react';
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
import { motion } from 'framer-motion';

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
 pollBgngYmd: format(new Date(), 'yyyy-MM-dd'),
 pollEndYmd: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
 pollKndCd: 'POLL01',
 pollDsuseYn: 'N',
 pollArticles: [{ pollArtclNm: '' }, { pollArtclNm: '' }]
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
 pollArticles: [...(prev.pollArticles || []), { pollArtclNm: '' }]
 }));
 };

 const handleRemoveItem = (index: number) => {
 setNewPoll(prev => ({
 ...prev,
 pollArticles: prev.pollArticles?.filter((_, i) => i !== index)
 }));
 };

 const handleAdd = async () => {
 if (!newPoll.pollNm || !newPoll.pollArticles?.every(item => item.pollArtclNm)) {
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
 header: '설문 명',
 accessor: (item: OnlinePollDto) => (
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-110">
 <Vote size={22} />
 </div>
 <div>
 <span className="font-bold tracking-tighter text-foreground block text-lg uppercase leading-none">{item.pollNm}</span>
 <span className="text-xs font-bold text-muted-foreground tracking-[0.3em] mt-2 uppercase opacity-40">PROTOCOL ID: {item.pollId}</span>
 </div>
 </div>
 )
 },
 {
 header: '기간',
 accessor: (item: OnlinePollDto) => (
 <div className="flex items-center gap-3 font-mono text-xs font-bold text-muted-foreground/60 tracking-tighter ">
 <Calendar size={14} className="text-primary opacity-40" />
 {item.pollBgngYmd} <span className="text-xs opacity-20 mx-1">/</span> {item.pollEndYmd}
 </div>
 )
 },
 {
 header: '참여 분석',
 accessor: (item: OnlinePollDto) => {
 const totalVotes = item.pollArticles?.reduce((sum, i) => sum + (i.pollIemCo || 0), 0) || 0;
 return (
 <div className="flex items-center gap-6 min-w-[200px]">
 <div className="flex-1 h-3 bg-slate-100 dark:bg-muted/30 rounded-lg overflow-hidden shadow-inner border border-border/10">
 <div 
 className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-lg transition-all duration-1000 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]" 
 style={{ width: `${Math.min(100, (totalVotes / 100) * 100)}%` }} 
 />
 </div>
 <div className="flex items-center gap-1.5 shrink-0">
 <UserCheck size={14} className="text-primary" />
 <span className="text-[12px] font-bold text-foreground tracking-tighter tabular-nums">{totalVotes.toLocaleString()}</span>
 </div>
 </div>
 );
 }
 },
 {
 header: '상태',
 accessor: (item: OnlinePollDto) => {
 const today = format(new Date(), 'yyyy-MM-dd');
 let status = '종료';
 let variant = 'closed';
 
 if (item.pollDsuseYn === 'N') {
 if (today < (item.pollBgngYmd || '')) {
 status = '예정';
 variant = 'scheduled';
 } else if (today > (item.pollEndYmd || '')) {
 status = '종료';
 variant = 'closed';
 } else {
 status = 'Live';
 variant = 'live';
 }
 }

 return (
 <div className={cn(
 "flex items-center gap-2 px-4 py-1.5 rounded-lg border w-fit shadow-sm transition-all",
 variant === 'live' && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
 variant === 'scheduled' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
 variant === 'closed' && "bg-slate-100 text-slate-400 border-border/50"
 )}>
 {variant === 'live' && <Zap size={14} className="animate-pulse" />}
 {variant === 'scheduled' && <Clock size={14} />}
 {variant === 'closed' && <XCircle size={14} />}
 <span className="text-xs font-bold tracking-[0.2em] uppercase ">{status}</span>
 </div>
 );
 }
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <PageHeader
 title="온라인 설문 인텔리전스"
 breadcrumbs={[{ label: '커뮤니티' }, { label: '설문 인텔리전스' }]}
 />

 <HubHeader 
 title="온라인설문" 
 highlight="매트릭스" 
 subtitle="전사 사용자 피드백 수집 및 데이터 시각화 분석 시스템" 
 icon={Vote} 
 actions={
 <div className="flex gap-4 p-2">
 <Button
 variant="outline"
 size="lg"
 onClick={handleRefresh}
 className="h-12 rounded-lg border-2 font-bold text-xs tracking-widest uppercase gap-2"
 >
 <RefreshCcw size={16} className={cn(loading && "animate-spin")} /> 엔진 동기화
 </Button>
 <Button
 size="lg"
 onClick={() => setIsAddOpen(true)}
 className="h-12 px-8 rounded-lg font-bold text-xs tracking-widest uppercase shadow-lg shadow-primary/20 hover:-translate-y-1 transition-all gap-2"
 >
 <Plus size={18} /> 신규 프로토콜 생성
 </Button>
 </div>
 }
 />

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
 <SummaryBlock 
 title="활성 스트림" 
 value={polls.filter((p: OnlinePollDto) => p.pollDsuseYn === 'N').length} 
 icon={<Activity size={26} />} 
 status="NOMINAL"
 color="text-emerald-500"
 />
 <SummaryBlock 
 title="총 프로토콜" 
 value={totalCount} 
 icon={<Layers size={26} />} 
 status="STEADY"
 color="text-primary"
 />
 <SummaryBlock 
 title="분석 노드" 
 value={polls.length} 
 icon={<BarChart size={26} />} 
 status="동기화됨"
 color="text-indigo-600"
 />
 </div>

 <HubSectionCard
 title="설문 보드 스트림"
 description="등록된 모든 피드백 수집 프로토콜 내용 상태 및 참여 데이터 요약입니다."
 icon={TrendingUp}
 >
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-10 border-b border-border/30">
 <div>
 <h3 className="text-2xl font-bold tracking-tighter uppercase leading-none">인텔리전스 게시판</h3>
 <p className="text-xs font-bold text-muted-foreground tracking-[0.3em] uppercase mt-2 opacity-50">글로벌 피드백 모니터링</p>
 </div>
 <div className="flex items-center gap-4">
 <div className="relative group/search flex-1 md:flex-none">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30 group-focus-within/search:opacity-100 transition-opacity" size={16} />
 <Input
 placeholder="설문 필터링..."
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 onKeyDown={(e) => e.key === 'Enter' && handleRefresh()}
 className="h-11 pl-12 pr-6 w-full md:w-[320px] bg-muted/30 border-none rounded-lg text-xs font-bold tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
 />
 </div>
 </div>
 </div>

 <div className="overflow-x-auto">
 <StandardDataTable
 columns={columns}
 data={polls}
 loading={loading}
 emptyMessage="등록된 온라인 설문이 없습니다."
 className="border-none bg-transparent"
 />
 </div>
 </HubSectionCard>

 <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
 <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto rounded-lg p-12 border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)] bg-white/95 backdrop-blur-3xl relative overflow-x-hidden">
 <div className="absolute top-[-15%] left-[-15%] w-64 h-64 bg-primary/5 blur-[80px] rounded-lg pointer-events-none" />
 
 <DialogHeader className="space-y-6 relative z-10 text-center">
 <div className="w-20 h-11 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-2xl mx-auto transition-transform hover:rotate-12 duration-500 border-4 border-white/20">
 <Vote size={32} />
 </div>
 <div className="space-y-2">
 <DialogTitle className="text-4xl font-bold text-slate-900 tracking-tighter leading-none uppercase">프로토콜 구성</DialogTitle>
 <DialogDescription className="text-xs font-bold tracking-[0.4em] uppercase opacity-40">
 New Feedback Pipeline Architecture
 </DialogDescription>
 </div>
 </DialogHeader>
 
 <div className="space-y-10 py-10 relative z-10">
 <section className="space-y-5">
 <label className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-2 flex items-center gap-3">
 <div className="w-1.5 h-1.5 bg-primary rounded-lg" />
 Poll Identity (Naming)
 </label>
 <Input
 placeholder="설문 명..."
 value={newPoll.pollNm}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollNm: e.target.value }))}
 className="h-11 px-8 rounded-lg border-none bg-slate-50 text-xl font-bold focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase tracking-tight"
 />
 </section>
 
 <section className="grid grid-cols-2 gap-8">
 <div className="space-y-4">
 <label className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-2">시작일시</label>
 <div className="relative group">
 <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
 <Input
 type="date"
 value={newPoll.pollBgngYmd}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollBgngYmd: e.target.value }))}
 className="h-11 pl-14 pr-6 rounded-lg border-none bg-slate-50 font-bold text-sm focus:bg-white transition-all shadow-inner"
 />
 </div>
 </div>
 <div className="space-y-4">
 <label className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase ml-2">종료일시</label>
 <div className="relative group">
 <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
 <Input
 type="date"
 value={newPoll.pollEndYmd}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollEndYmd: e.target.value }))}
 className="h-11 pl-14 pr-6 rounded-lg border-none bg-slate-50 font-bold text-sm focus:bg-white transition-all shadow-inner"
 />
 </div>
 </div>
 </section>

 <section className="space-y-6">
 <div className="flex items-center justify-between px-2">
 <label className="text-xs font-bold text-slate-400 tracking-[0.2em] uppercase flex items-center gap-3">
 <div className="w-1.5 h-1.5 bg-primary rounded-lg" />
 Analytic Options (Items)
 </label>
 <button 
 type="button" 
 onClick={handleAddItem}
 className="h-10 px-6 rounded-lg text-xs font-bold tracking-widest uppercase border border-primary/20 text-primary hover:bg-primary/5 flex items-center gap-2 transition-all active:scale-95"
 >
 <Plus size={14} /> Append Node
 </button>
 </div>
 <div className="space-y-4">
 {newPoll.pollArticles?.map((item, index) => (
 <motion.div 
 initial={{ opacity: 0, x: -20 }}
 animate={{ opacity: 1, x: 0 }}
 key={index} 
 className="flex items-center gap-4 group/item"
 >
 <div className="w-14 h-11 rounded-lg bg-slate-900/5 dark:bg-muted/30 flex flex-col items-center justify-center font-bold text-slate-300 dark:text-muted-foreground text-xs shadow-inner border border-border/10 shrink-0">
 <span className="opacity-40 uppercase mb-0.5">노드</span>
 <span className="text-foreground leading-none">{String(index + 1).padStart(2, '0')}</span>
 </div>
 <div className="flex-1 relative">
 <Input
 placeholder={`항목 ${index + 1} 내용...`}
 value={item.pollArtclNm}
 onChange={(e) => {
 const items = [...(newPoll.pollArticles || [])];
 items[index].pollArtclNm = e.target.value;
 setNewPoll(prev => ({ ...prev, pollArticles: items }));
 }}
 className="h-11 px-6 rounded-lg border-none bg-slate-50 font-bold text-sm focus:bg-white focus:ring-8 focus:ring-primary/5 transition-all shadow-inner uppercase tracking-tight"
 />
 </div>
 {index > 1 && (
 <Button 
 type="button" 
 variant="ghost" 
 size="sm" 
 onClick={() => handleRemoveItem(index)}
 className="h-11 w-16 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
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
 className="h-11 px-12 rounded-lg border-2 border-border font-bold text-xs tracking-widest uppercase hover:bg-slate-50"
 >
 Terminate
 </Button>
 <Button
 onClick={handleAdd}
 disabled={loading}
 className="h-11 flex-1 bg-slate-900 border-none text-white rounded-lg font-bold text-xs tracking-[0.3em] uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3"
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
 <div className={cn("w-14 h-11 rounded-lg bg-slate-50 dark:bg-muted/10 flex items-center justify-center shadow-inner border border-border/10 group-hover:rotate-12 transition-transform", color)}>
 {icon}
 </div>
 <HubStatusBadge label={`SYSTEM STATUS: ${status}`} variant="default" className="text-xs font-bold tracking-widest shadow-sm" />
 </div>
 <div>
 <h3 className="text-4xl font-bold tracking-tighter text-foreground leading-none tabular-nums">{value?.toLocaleString() ?? 0}</h3>
 <p className="text-xs font-bold text-muted-foreground/40 tracking-[0.4em] uppercase mt-4 leading-none">{title}</p>
 </div>
 <div className="absolute right-[-14%] bottom-[-14%] opacity-[0.02] group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000 grayscale">
 {React.cloneElement(icon, { size: 180 })}
 </div>
 </div>
 );
}

