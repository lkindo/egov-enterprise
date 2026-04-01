'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { approvalUserService, Approval } from '@/services/business/user/approval/ApprovalUserService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
 Inbox,
 Send,
 Check,
 X,
 FileText,
 Clock,
 User,
 ArrowRight,
 ClipboardCheck,
 History,
 Info,
 Calendar,
 Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApprovalStepper } from './ApprovalStepper';
import { Button } from '@/components/ui/button';

export default function ApprovalInboxPage() {
 const { toast } = useToast();
 const confirm = useConfirm();

 const [tab, setTab] = useState<'received' | 'sent'>('received');
 const [loading, setLoading] = useState(true);
 const [data, setData] = useState<Approval[]>([]);
 const [selectedItem, setSelectedItem] = useState<Approval | null>(null);

 const loadData = useCallback(async () => {
 try {
 setLoading(true);
 const result = await (tab === 'received'
 ? approvalUserService.getPending({ page: 0, size: 20 })
 : approvalUserService.getMyHistory({ page: 0, size: 20 }));

 const list = result.list || [];
 setData(list);
 if (list.length > 0) {
 setSelectedItem(list[0]);
 } else {
 setSelectedItem(null);
 }
 } catch {
 toast('寃곗옱 紐⑸줉님遺덈윭?ㅼ? 紐삵뻽?듬땲님', 'error');
 } finally {
 setLoading(false);
 }
 }, [tab, toast]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 const handleAction = async (item: Approval, status: 'Y' | 'N') => {
 const actionNm = status === 'Y' ? '?뱀씤' : '諛섎젮';
 const isConfirmed = await confirm({
 title: `寃곗옱 ${actionNm}`,
 message: `[${item.approvalId}] 요청님${actionNm}?섏떆寃좎뒿?덇퉴?`,
 variant: status === 'N' ? 'destructive' : 'default'
 });

 if (!isConfirmed) return;

 try {
 await approvalUserService.confirm(item.approvalId, status);
 toast(`?깃났?곸쑝濡?${actionNm}?섏뿀?듬땲님`, 'success');
 loadData();
 } catch {
 toast(`${actionNm} 泥섎━ 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.`, 'error');
 }
 };

 const columns = [
 {
 header: '寃곗옱 ?뺣낫',
 accessor: (item: Approval) => (
 <div className="flex items-center gap-3">
 <div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner shrink-0",
 item.status === 'Y' ? "bg-emerald-50 text-emerald-600" :
 item.status === 'N' ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
 )}>
 <FileText size={18} />
 </div>
 <div className="flex flex-col overflow-hidden">
 <span className="font-black text-sm tracking-tight truncate">{item.approvalId}</span>
 <span className="text-[10px] font-bold text-muted-foreground tracking-tight">
 {item.jobType === '1' ? '二쇨컙蹂닿퀬' : item.jobType === '01' ? '?곗감' : '?쇰컲 寃곗옱'}
 </span>
 </div>
 </div>
 )
 },
 {
 header: '?좎껌님,
 accessor: (item: Approval) => (
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
 <User size={12} className="opacity-40" />
 </div>
 <span className="text-sm font-bold">{item.applicantId}</span>
 </div>
 )
 },
 { header: '?곹깭', accessor: (item: Approval) => <StatusBadge status={item.status} /> }
 ];

 const workflowSteps = useMemo(() => {
 if (!selectedItem) return [];
 return [
 { label: '湲곗븞', user: selectedItem.applicantId, status: 'completed' as const, date: selectedItem.requestDate },
 { label: '寃님, user: '?댁닚님怨쇱옣', status: selectedItem.status === 'R' ? 'current' as const : 'completed' as const },
 {
 label: '理쒖쥌 ?뱀씤',
 user: '愿由ъ옄',
 status: selectedItem.status === 'Y' ? 'completed' as const :
 selectedItem.status === 'N' ? 'rejected' as const : 'pending' as const
 }
 ];
 }, [selectedItem]);

 return (
 <div className="space-y-8 pb-20 animate-in fade-in duration-700">
 <PageHeader
 title="?꾩옄寃곗옱 愿님?쇳꽣"
 breadcrumbs={[{ label: '업무吏님 }, { label: '?꾩옄寃곗옱' }]}
 actions={
 <Button className="rounded-xl h-11 px-6 font-black shadow-lg shadow-primary/20 gap-2">
 <ClipboardCheck size={18} /> 님寃곗옱 湲곗븞
 </Button>
 }
 />

 {/* Modern Tab Bar */}
 <div className="flex p-1.5 bg-muted/30 rounded-[1.5rem] w-fit">
 <TabButton
 active={tab === 'received'}
 onClick={() => setTab('received')}
 icon={<Inbox size={18} />}
 label="諛쏆? 寃곗옱님
 count={tab === 'received' ? data.length : 3}
 />
 <TabButton
 active={tab === 'sent'}
 onClick={() => setTab('sent')}
 icon={<Send size={18} />}
 label="보냄 寃곗옱님
 />
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
 {/* Left: Approval List */}
 <div className="xl:col-span-2 space-y-6">
 <div className="bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-[700px]">
 <div className="px-8 py-6 border-b border-primary/5 flex items-center justify-between bg-muted/5">
 <h3 className="font-black text-lg flex items-center gap-2.5">
 <History size={20} className="text-primary" />
 {tab === 'received' ? '誘몄쿂由님붿껌' : '湲곗븞 ?대젰'}
 </h3>
 <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full ">
 				{data.length} 嫄?
 </span>
 </div>
 <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 onRowClick={setSelectedItem}
 emptyMessage={tab === 'received' ? "?湲?以묒씤 결재 요청님?놁뒿?덈떎." : "보냄 寃곗옱 ?대젰님?놁뒿?덈떎."}
 className="border-none shadow-none rounded-none"
 />
 </div>
 </div>
 </div>

 {/* Right: Approval Detail & Workflow */}
 <div className="xl:col-span-3">
 {selectedItem ? (
 <div className="bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in slide-in-from-right-4 duration-500 flex flex-col h-full min-h-[700px]">
 <div className="p-10 border-b border-primary/5 bg-muted/5">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <div className="px-3 py-1 bg-primary text-white text-[10px] font-black rounded-lg tracking-tight shadow-lg shadow-primary/20">
   ?곸꽭 蹂닿린
 </div>
 <span className="text-sm font-bold text-muted-foreground font-mono">#{selectedItem.approvalId}</span>
 </div>
 <h3 className="text-3xl font-black tracking-tight">
 {selectedItem.jobType === '1' ? '2026님2님二쇨컙蹂닿퀬 寃곗옱 嫄? : '?곗감 ?좉툒 ?닿? ?좎껌님嫄?}
 </h3>
 </div>
 {tab === 'received' && selectedItem.status === 'R' && (
 <div className="flex gap-3">
 <Button
 onClick={() => handleAction(selectedItem, 'Y')}
 className="h-14 px-8 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 gap-2"
 >
 <Check size={20} /> ?뱀씤 泥섎━
 </Button>
 <Button
 variant="destructive"
 onClick={() => handleAction(selectedItem, 'N')}
 className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-red-500/20 gap-2"
 >
 <X size={20} /> 諛섎젮
 </Button>
 </div>
 )}
 </div>

 <div className="bg-background/50 rounded-[2rem] p-8 border-2 border-primary/5 shadow-inner">
 <div className="flex items-center justify-between mb-6">
 <h4 className="text-sm font-black text-muted-foreground tracking-[0.2em] flex items-center gap-2">
   <Zap size={14} className="text-primary" /> 寃곗옱 ?뚰겕?뚮줈님 </h4>
   <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">?ㅼ떆媛님낅뜲?댄듃</span>

 </div>
 <ApprovalStepper steps={workflowSteps} />
 </div>
 </div>

 <div className="p-10 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <DetailSection icon={<User size={16} />} title="湲곗븞님?뺣낫" value={selectedItem.applicantId} desc="湲곗닠吏?먮? / ?由? />
 <DetailSection icon={<Calendar size={16} />} title="湲곗븞 ?쇱떆" value={selectedItem.requestDate} desc="理쒖쥌 ?섏젙: 2026-02-17 10:00" />
 </div>

 <div className="space-y-4">
 <h4 className="text-sm font-black text-muted-foreground tracking-[0.2em] flex items-center gap-2">
 <Info size={14} className="text-primary" /> ?곸꽭 ?곸떊 ?댁슜
 </h4>
 <div className="p-8 bg-muted/20 rounded-[2rem] border-2 border-primary/5 min-h-[200px]">
 <p className="text-base font-medium leading-relaxed text-foreground/80">
 蹂?寃곗옱 嫄댁? ?쒖뒪님?꾨님님꾨줈?앺듃님二쇨컙 蹂닿퀬 ?댁슜?대ŉ, 二쇱슂 ?명봽님援먯껜 諛?UI ?쒖님님묒뾽님?님?뱀씤님요청?쒕┰?덈떎. <br /><br />
 ?몃? ?댁슜? 泥⑤님?'2026_Weekly_Report_Feb.pdf' ?뚯씪님李몄“?섏떆湲?諛붾엻?덈떎.
 </p>
 </div>
 </div>
 </div>

 <div className="p-8 bg-muted/5 border-t border-primary/5 flex items-center justify-center">
 <p className="text-[10px] font-bold text-muted-foreground/40 tracking-[0.3em]">
   ?꾩옄寃곗옱 ?몄쬆 ?쒖뒪님v5.0
 </p>
 </div>
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-card/30 border-2 border-dashed border-primary/10 rounded-[2.5rem]">
 <div className="w-24 h-24 bg-muted rounded-[2.5rem] flex items-center justify-center mb-6">
 <ClipboardCheck size={48} className="text-muted-foreground/20" />
 </div>
 <h3 className="text-xl font-black text-muted-foreground/60">寃곗옱 님ぉ님?좏깮?댁＜?몄슂</h3>
 <p className="text-sm text-muted-foreground/40 mt-2 max-w-xs">醫뚯륫 紐⑸줉?먯꽌 ?곸꽭 ?댁슜님?뺤씤?섍퀬 ?띠? 寃곗옱 嫄댁쓣 ?좏깮?섏꽭님</p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}

// --- Helper Components ---

function TabButton({ active, onClick, icon, label, count }: any) {
 return (
 <button
 onClick={onClick}
 className={cn(
 "flex items-center gap-2.5 px-8 py-3.5 text-sm font-black rounded-2xl transition-all duration-300 relative",
 active
 ? "bg-background text-primary shadow-xl shadow-primary/10 scale-105 z-10"
 : "text-muted-foreground hover:bg-background/50"
 )}
 >
 {icon}
 {label}
 {count !== undefined && (
 <span className={cn(
 "ml-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold",
 active ? "bg-primary text-white" : "bg-muted text-muted-foreground"
 )}>
 {count}
 </span>
 )}
 </button>
 );
}

function DetailSection({ icon, title, value, desc }: any) {
 return (
 <div className="space-y-3 group">
 <div className="flex items-center gap-2 text-muted-foreground">
 <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center text-primary/60 group-hover:text-primary transition-colors">
 {icon}
 </div>
 <span className="text-[10px] font-black tracking-tight">{title}</span>
 </div>
 <div className="space-y-1 pl-9">
 <p className="text-lg font-black text-foreground">{value}</p>
 <p className="text-sm text-muted-foreground font-medium">{desc}</p>
 </div>
 </div>
 );
}

