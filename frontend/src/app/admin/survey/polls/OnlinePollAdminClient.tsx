'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { onlinePollAdminService, OnlinePollDto, OnlinePollItemDto } from '@/services/admin/system/OnlinePollAdminService';
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
 Trash2
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

export default function OnlinePollAdminClient({ 
 initialPolls 
}: { 
 initialPolls: any 
}) {
 const [loading, setLoading] = useState(false);
 const [polls, setPolls] = useState(initialPolls.list || []);
 const [totalCount, setTotalCount] = useState(initialPolls.pagination.totalItems || 0);
 const [searchKeyword, setSearchKeyword] = useState('');
 
 const [isAddOpen, setIsAddOpen] = useState(false);
 const [newPoll, setNewPoll] = useState<OnlinePollDto>({
 pollNm: '',
 pollBeginDe: format(new Date(), 'yyyy-MM-dd'),
 pollEndDe: format(new Date(new Date().setDate(new Date().getDate() + 7)), 'yyyy-MM-dd'),
 pollKindCode: 'POLL01',
 useAt: 'Y',
 pollItems: [{ pollIemNm: '' }, { pollIemNm: '' }]
 });

 const handleRefresh = async () => {
 setLoading(true);
 try {
 const res = await onlinePollAdminService.getPollList({ keyword: searchKeyword });
 setPolls(res.list);
 setTotalCount(res.pagination.totalItems);
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
 header: '설문 명',
 accessor: (item: OnlinePollDto) => (
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg">
 <Vote size={18} />
 </div>
 <div>
 <span className="font-black italic tracking-tighter text-slate-900 block">{item.pollNm}</span>
 <span className="text-[9px] font-bold text-slate-400 tracking-tight italic">{item.pollId}</span>
 </div>
 </div>
 )
 },
 {
 header: '기간',
 accessor: (item: OnlinePollDto) => (
 <div className="flex items-center gap-2 font-mono text-[11px] font-black text-slate-500 italic">
 <Calendar size={12} className="text-primary" />
 {item.pollBeginDe} ~ {item.pollEndDe}
 </div>
 )
 },
 {
 header: '참여 분석',
 accessor: (item: OnlinePollDto) => {
 const totalVotes = item.pollItems?.reduce((sum, i) => sum + (i.pollIemCo || 0), 0) || 0;
 return (
 <div className="flex items-center gap-4 min-w-[150px]">
 <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
 <div className="h-full bg-primary" style={{ width: `${Math.min(100, totalVotes)}%` }} />
 </div>
 <div className="flex items-center gap-1">
 <Users size={12} className="text-slate-400" />
 <span className="text-[10px] font-black text-slate-900 italic tracking-tighter">{totalVotes.toLocaleString()}</span>
 </div>
 </div>
 );
 }
 },
 {
 header: '상태',
 accessor: (item: OnlinePollDto) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-full border w-fit transition-all",
 item.useAt === 'Y' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
 )}>
 {item.useAt === 'Y' ? <Activity size={12} className="animate-pulse" /> : <XCircle size={12} />}
 <span className="text-[10px] font-black tracking-tight italic">{item.useAt === 'Y' ? '활성' : '종료'}</span>
 </div>
 )
 }
 ];

 return (
 <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <PageHeader
 title="온라인 설문 인텔리전스"
 breadcrumbs={[{ label: '커뮤니티' }, { label: '온라인poll관리' }]}
 actions={
 <div className="flex items-center gap-4">
 <Button
 onClick={handleRefresh}
 variant="outline"
 className="h-14 w-14 rounded-2xl border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95"
 >
 <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
 </Button>
 <Button
 onClick={() => setIsAddOpen(true)}
 className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic"
 >
 <Plus size={18} />
 신규 설문 등록
 </Button>
 </div>
 }
 />

 {/* Luxury Stats Cards */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
 <StatCard title="활성 " value={polls.filter((p: OnlinePollDto) => p.useAt === 'Y').length} icon={<Activity size={24} />} color="slate" />
 <StatCard title="총 " value={totalCount} icon={<Layers size={24} />} color="primary" />
 <StatCard title="분석 노드" value={polls.length} icon={<BarChart size={24} />} color="indigo" />
 </div>

 {/* Main Content Area */}
 <div className="responsive-card p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
 <div className="flex items-center gap-4">
 <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
 <Vote size={24} />
 </div>
 <div>
 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter italic">의견 매트릭스</h3>
 <p className="text-[9px] font-black text-slate-400 tracking-[0.3em]">등록된 설문 프로토콜</p>
 </div>
 </div>
 <div className="flex items-center gap-4">
 <div className="relative">
 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <Input
 placeholder="설문 필터링..."
 value={searchKeyword}
 onChange={(e) => setSearchKeyword(e.target.value)}
 className="h-14 pl-12 pr-6 w-full md:w-[300px] rounded-2xl border-2 border-slate-100 font-black text-[10px] tracking-tight focus:ring-4 focus:ring-primary/10 transition-all bg-white"
 />
 </div>
 <Button
 onClick={handleRefresh}
 className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black text-[10px] tracking-tight shadow-xl hover:bg-primary transition-all active:scale-95 italic"
 >
 분석 실행
 </Button>
 </div>
 </div>

 <div className="px-2 overflow-x-auto relative z-10">
 <StandardDataTable
 columns={columns}
 data={polls}
 loading={loading}
 emptyMessage="등록된 온라인 설문이 없습니다."
 className="border-none bg-slate-50/50 rounded-[3rem] p-8"
 />
 </div>
 </div>

 {/* Add Poll Dialog */}
 <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
 <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[3rem] p-10 border-none shadow-2xl bg-white">
 <DialogHeader className="space-y-4">
 <div className="w-16 h-16 bg-primary text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
 <Vote size={28} />
 </div>
 <DialogTitle className="text-3xl font-black text-slate-900 tracking-tighter italic text-center">신규 설문 등록</DialogTitle>
 <DialogDescription className="text-center font-bold text-slate-400 text-sm">
 시스템 사용자들의 의견을 수렴하기 위한 새로운 설문을 정의합니다.
 </DialogDescription>
 </DialogHeader>
 
 <div className="space-y-8 py-8">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight italic ml-2">설문 명칭</label>
 <Input
 placeholder="설문 명..."
 value={newPoll.pollNm}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollNm: e.target.value }))}
 className="h-16 px-8 rounded-3xl border-2 border-slate-100 bg-slate-50/50 text-lg font-black italic focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </div>
 
 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight italic ml-2">시작 일시</label>
 <Input
 type="date"
 value={newPoll.pollBeginDe}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollBeginDe: e.target.value }))}
 className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-black text-sm italic focus:bg-white transition-all"
 />
 </div>
 <div className="space-y-3">
 <label className="text-[10px] font-black text-slate-400 tracking-tight italic ml-2">종료 일시</label>
 <Input
 type="date"
 value={newPoll.pollEndDe}
 onChange={(e) => setNewPoll(prev => ({ ...prev, pollEndDe: e.target.value }))}
 className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-black text-sm italic focus:bg-white transition-all"
 />
 </div>
 </div>

 <div className="space-y-4">
 <div className="flex items-center justify-between px-2">
 <label className="text-[10px] font-black text-slate-400 tracking-tight italic">선택 항목</label>
 <Button 
 type="button" 
 variant="ghost" 
 size="sm" 
 onClick={handleAddItem}
 className="h-8 px-3 rounded-xl text-[9px] font-black tracking-tight text-primary hover:bg-primary/5 italic gap-2"
 >
 <Plus size={12} /> 항목 추가
 </Button>
 </div>
 <div className="space-y-3">
 {newPoll.pollItems?.map((item, index) => (
 <div key={index} className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
 <div className="w-10 h-14 rounded-xl bg-slate-100 flex items-center justify-center font-black italic text-slate-400 text-sm shadow-inner">
 {String(index + 1).padStart(2, '0')}
 </div>
 <Input
 placeholder={`항목 ${index + 1} 내용...`}
 value={item.pollIemNm}
 onChange={(e) => {
 const items = [...(newPoll.pollItems || [])];
 items[index].pollIemNm = e.target.value;
 setNewPoll(prev => ({ ...prev, pollItems: items }));
 }}
 className="h-14 px-6 rounded-2xl border-2 border-slate-100 bg-slate-50/50 font-bold text-sm italic focus:bg-white transition-all flex-1"
 />
 {index > 1 && (
 <Button 
 type="button" 
 variant="ghost" 
 size="sm" 
 onClick={() => handleRemoveItem(index)}
 className="h-14 w-14 rounded-2xl text-rose-400 hover:text-rose-600 hover:bg-rose-50"
 >
 <Trash2 size={18} />
 </Button>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 
 <DialogFooter className="pt-6">
 <Button
 variant="outline"
 onClick={() => setIsAddOpen(false)}
 className="h-16 px-10 rounded-2xl border-2 border-slate-100 font-black text-sm tracking-tight italic hover:bg-slate-50 transition-all"
 >
 취소
 </Button>
 <Button
 onClick={handleAdd}
 disabled={loading}
 className="h-16 px-14 bg-slate-900 text-white rounded-2xl font-black text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 italic flex-1"
 >
 {loading ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
 등록 승인
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

function StatCard({ title, value, icon, color }: any) {
 const colorMap: any = {
 slate: "bg-white text-slate-900 border-slate-100 shadow-xl shadow-slate-900/5",
 primary: "bg-white text-primary border-primary/5 shadow-xl shadow-primary/5",
 indigo: "bg-white text-indigo-600 border-indigo-100 shadow-xl shadow-indigo-600/5"
 };
 
 const iconBgMap: any = {
 slate: "bg-slate-900 text-white shadow-xl shadow-slate-900/20",
 primary: "bg-primary text-white shadow-xl shadow-primary/20",
 indigo: "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20"
 };
 
 return (
 <div className={cn(
 "p-10 rounded-[3rem] border-2 transition-all hover:scale-[1.02] hover:shadow-2xl group cursor-default relative overflow-hidden",
 colorMap[color]
 )}>
 <div className="flex justify-between items-start mb-8 relative z-10">
 <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform", iconBgMap[color])}>
 {icon}
 </div>
 </div>
 <div className="relative z-10">
 <h4 className="text-4xl font-black tracking-tighter italic tabular-nums">{value?.toLocaleString() ?? 0}</h4>
 <p className="text-[10px] font-black opacity-30 tracking-[0.3em] mt-2 flex items-center gap-2 italic">
 <span className="w-4 h-0.5 bg-current opacity-20" />
 {title}
 </p>
 </div>
 <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
 {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 200 }) : null}
 </div>
 </div>
 );
}
