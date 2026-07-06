'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar,  Search,  Plus,  Trash2,  History,  LayoutGrid,  Activity,  Settings2,  Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/app/components/ui/toast';
;
import { eventService, EventInfo } from '@/services/foundation/operation/eventService';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
;
import { 
 Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function EventManagementClient() {
 const { toast } = useToast();
 const queryClient = useQueryClient();
 const [searchWrd, setSearchWrd] = useState('');
 const [page, setPage] = useState(1);
 const size = 10;
 const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
 const [rceptBgngYmd, setRceptBgngYmd] = useState('');
 const [rceptEndYmd, setRceptEndYmd] = useState('');
 const [form, setForm] = useState<Partial<EventInfo>>({
 bizCd: '',
 evntCn: '',
 evntBgngYmd: '',
 evntEndYmd: '',
 evntUseCnt: 0
 });

 // --- Data Fetching ---
 const { data: eventsData, isLoading } = useQuery({
 queryKey: ['events-list', searchWrd, page],
 queryFn: () => eventService.getEvents({ searchWrd, page: page - 1, size }),
 });

 const displayItems = (eventsData?.list || []) as EventInfo[];
 const totalItems = eventsData?.total || 0;
 const totalPages = Math.ceil(totalItems / size);

 // --- Mutations ---
 const createMutation = useMutation({
 mutationFn: (data: Partial<EventInfo>) => eventService.createEvent(data),
 onSuccess: () => {
 toast('행사가 성공적으로 생성되었습니다.', 'success');
 queryClient.invalidateQueries({ queryKey: ['events-list'] });
 setIsCreateModalOpen(false);
 setRceptBgngYmd('');
 setRceptEndYmd('');
 setForm({
 bizCd: '',
 evntCn: '',
 evntBgngYmd: '',
 evntEndYmd: '',
 evntUseCnt: 0
 });
 },
 onError: () => {
 toast('행사 생성에 실패했습니다.', 'error');
 }
 });

 const deleteMutation = useMutation({
 mutationFn: (eventId: string) => eventService.deleteEvent(eventId),
 onSuccess: () => {
 toast('행사가 성공적으로 삭제되었습니다.', 'success');
 queryClient.invalidateQueries({ queryKey: ['events-list'] });
 },
 onError: () => {
 toast('행사 삭제에 실패했습니다.', 'error');
 }
 });

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 const bizYr = form.evntBgngYmd ? form.evntBgngYmd.substring(0, 4) : new Date().getFullYear().toString();
 createMutation.mutate({ ...form, bizYr });
 };

 const handleDelete = (eventId: string) => {
 if (confirm('정말 이 행사를 삭제하시겠습니까?')) {
 deleteMutation.mutate(eventId);
 }
 };

 // --- DataTable Configuration ---
 const eventColumns: Column<EventInfo>[] = [
 {
 header: '번호',
 accessor: (_, index) => (
 <span className="font-mono text-xs font-bold text-slate-400">
 {index !== undefined ? (index + 1 + (page - 1) * size).toString().padStart(2, '0') : '-'}
 </span>
 ),
 className: 'w-20 text-center'
 },
 {
 header: '행사 명칭',
 accessor: (event) => (
 <div className="flex flex-col gap-1 py-1">
 <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">
 {event.bizCd}
 </span>
 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
 {event.evntBgngYmd} ~ {event.evntEndYmd}
 </span>
 </div>
 )
 },
 {
 header: '참여 정원',
 accessor: (event) => (
 <div className="flex items-center gap-2">
 <span className="text-xs font-bold text-slate-600 tabular-nums">{event.evntUseCnt}</span>
 <span className="text-[10px] font-bold text-slate-300 tracking-tighter uppercase">명</span>
 </div>
 ),
 className: 'w-32'
 },
 {
 header: '접수 기간',
 accessor: (event) => (
 <div className="flex flex-col">
 <span className="text-xs font-bold text-slate-500 tabular-nums tracking-tighter">
 {event.evntBgngYmd} ~ {event.evntEndYmd}
 </span>
 </div>
 ),
 className: 'w-48'
 },
 {
 header: '관리',
 className: 'text-right w-24',
 accessor: (event) => (
 <div className="flex items-center justify-end pr-4">
 <Button 
 variant="ghost" 
 size="icon" 
 data-testid="delete-event-btn"
 onClick={() => handleDelete(event.evntId)}
 className="w-10 h-10 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"
 >
 <Trash2 size={16} />
 </Button>
 </div>
 )
 }
 ];

 return (
 <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
 <HubHeader 
 title="행사 운영 센터" 
 highlight="Event Ops" 
 subtitle="사내 엔터프라이즈 통합 행사 및 캠페인 관리 매트릭스입니다." 
 icon={Calendar} 
 actions={
 <div className="flex gap-4">
 <Button className="h-11 px-8 rounded-xl bg-white border-2 border-slate-100 text-slate-400 font-bold tracking-widest text-xs uppercase hover:text-primary transition-all shadow-sm">
 <History size={18} /> 아카이브
 </Button>
 <Button 
 onClick={() => setIsCreateModalOpen(true)}
 className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3"
 >
 <Plus size={18} /> 행사 등록
 </Button>
 </div>
 }
 />

 {/* 2. Control Matrix */}
 <div className="grid grid-cols-12 gap-10 px-2 min-h-[500px]">
 {/* Global Stream Grid */}
 <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 h-full">
 <HubSectionCard 
 title="행사 관리 매트릭스" 
 description="전역적으로 설정된 행사 활동 및 캠페인 태그 스트림입니다." 
 icon={LayoutGrid}
 className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
 >
 <div className="space-y-8">
 <div className="flex items-center justify-end px-2 border-b border-slate-100/50 pb-8 mb-4">
 <div className="relative group max-w-[320px] w-full">
 <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={16} />
 <Input 
 value={searchWrd}
 onChange={(e) => setSearchWrd(e.target.value)}
 className="h-11 bg-slate-50/50 border-none rounded-xl pl-14 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
 placeholder="행사 검색.." 
 />
 </div>
 </div>

 <StandardDataTable
 columns={eventColumns as any}
 data={displayItems as any}
 loading={isLoading}
 emptyMessage="식별된 데이터 유닛이 존재하지 않습니다."
 keyField="evntId"
 isPremium={true}
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
 <Card className="rounded-lg border-0 bg-slate-900 text-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] overflow-hidden p-12 flex flex-col justify-between min-h-[480px]">
 <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-rose-500/5 pointer-events-none opacity-40 animate-pulse" />
 <div className="relative z-10 space-y-8">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-lg bg-emerald-400" />
 <span className="text-xs font-bold tracking-widest text-emerald-400/80 uppercase">Live Operations</span>
 </div>
 <Settings2 size={20} className="text-white/20 group-hover:text-primary transition-colors cursor-pointer" />
 </div>
 <div className="space-y-2">
 <h1 className="text-6xl font-bold tracking-tighter tabular-nums text-white group-hover:text-primary transition-colors">
 {totalItems}
 </h1>
 <p className="text-xs font-bold text-white/40 tracking-[0.5em] uppercase">등록된 전역 행사 유닛 (Active Units)</p>
 </div>
 </div>
 
 {/* Radial Matrix Visual */}
 <div className="relative h-40 flex items-center justify-center opacity-20 my-8">
 <div className="absolute w-32 h-32 rounded-lg border border-white/10 group-hover:scale-150 transition-transform duration-1000" />
 <div className="absolute w-20 h-11 rounded-lg border border-primary/20 animate-ping" />
 <Calendar size={48} className="text-white group-hover:rotate-12 transition-transform" />
 </div>

 <div className="relative z-10 p-6 bg-white/5 rounded-lg backdrop-blur-3xl border border-white/5 flex items-center justify-between mt-auto">
 <div className="text-left space-y-1">
 <span className="text-xs font-bold opacity-40">참여 지수</span>
 <p className="text-xl font-bold tracking-tighter">ELITE GRADE</p>
 </div>
 <div className="h-12 w-1 bg-primary rounded-lg group-hover:scale-y-150 transition-transform" />
 </div>
 </Card>
 </div>
 </div>

 {/* 3. Detailed Stats Matrix (Insights) */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-10 px-2 lg:mt-10">
 <InsightCard label="Total Attendance" value="1.2M+" desc="전고 대비 15% 상승" trend="+4.5%" type="primary" />
 <InsightCard label="System Heatmap" value="CRITICAL" desc="참여 밀집도 높은 구역" trend="HIGH" type="rose" />
 <InsightCard label="Schedule Matrix" value="Q2 STABLE" desc="분기별 계획 정상 동작" trend="OK" type="emerald" />
 <InsightCard label="Network Assets" value="2.4k" desc="연동된 내부 정보 유닛" trend="+20" type="amber" />
 </div>
 
 {/* Creation Modal */}
 <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
 <DialogContent className="max-w-2xl bg-white rounded-lg border-none shadow-2xl p-0 overflow-hidden">
 <div className="bg-slate-900 p-8 text-white">
 <DialogHeader>
 <DialogTitle className="text-2xl font-bold tracking-tighter uppercase">Dispatch New Event</DialogTitle>
 <DialogDescription className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase">Enterprise Event Protocol v1.0</DialogDescription>
 </DialogHeader>
 </div>
 <form onSubmit={handleSubmit} className="p-8 space-y-8">
 <div className="grid grid-cols-2 gap-8">
 <div className="col-span-2 space-y-2">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Event_Name</Label>
 <Input 
 value={form.bizCd}
 onChange={(e) => setForm({...form, bizCd: e.target.value})}
 placeholder="행사 명칭을 입력하십시오"
 className="h-11 bg-slate-50 border-none rounded-lg font-bold text-sm"
 required
 maxLength={30}
 />
 </div>
 <div className="col-span-2 space-y-2">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detailed_Description</Label>
 <Input 
 value={form.evntCn}
 onChange={(e) => setForm({...form, evntCn: e.target.value})}
 placeholder="상세 내용을 입력하십시오"
 className="h-11 bg-slate-50 border-none rounded-lg font-bold text-sm"
 required
 maxLength={4000}
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Start_Date</Label>
 <Input 
 type="date"
 value={form.evntBgngYmd}
 onChange={(e) => setForm({...form, evntBgngYmd: e.target.value})}
 className="h-11 bg-slate-50 border-none rounded-lg font-bold text-sm"
 required
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">End_Date</Label>
 <Input 
 type="date"
 value={form.evntEndYmd}
 onChange={(e) => setForm({...form, evntEndYmd: e.target.value})}
 className="h-11 bg-slate-50 border-none rounded-lg font-bold text-sm"
 required
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Capacity (PSNCPA)</Label>
 <Input 
 type="number"
 value={form.evntUseCnt}
 onChange={(e) => setForm({...form, evntUseCnt: parseInt(e.target.value) || 0})}
 className="h-11 bg-slate-50 border-none rounded-lg font-bold text-sm"
 required
 min={0}
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recruitment_Start</Label>
 <Input 
 type="date"
 value={rceptBgngYmd}
 onChange={(e) => setRceptBgngYmd(e.target.value)}
 className="h-11 bg-slate-50 border-none rounded-lg font-bold text-sm"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recruitment_End</Label>
 <Input 
 type="date"
 value={rceptEndYmd}
 onChange={(e) => setRceptEndYmd(e.target.value)}
 className="h-11 bg-slate-50 border-none rounded-lg font-bold text-sm"
 />
 </div>
 </div>
 <DialogFooter className="pt-8 border-t border-slate-50">
 <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="h-11 px-8 font-bold text-xs uppercase tracking-widest">Abort</Button>
 <Button type="submit" disabled={createMutation.isPending} className="h-11 px-10 bg-primary text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 gap-3">
 {createMutation.isPending ? 'Syncing...' : <><Zap size={16} /> Deploy Protocol</>}
 </Button>
 </DialogFooter>
 </form>
 </DialogContent>
 </Dialog>
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
 "rounded-lg border-2 bg-white p-10 space-y-6 transition-all hover:ring-[25px] flex flex-col justify-between shadow-xl", 
 colorMap[type]
 )}>
 <div className="space-y-1">
 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</span>
 <h4 className={cn("text-3xl font-bold tracking-tighter leading-none", colorMap[type])}>{value}</h4>
 </div>
 <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
 <div className="space-y-0.5">
 <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">{desc}</p>
 <span className={cn("text-xs font-bold tracking-widest uppercase", colorMap[type])}>{trend} SIGNALS</span>
 </div>
 <Activity size={24} className="opacity-20" />
 </div>
 </Card>
 );
}

