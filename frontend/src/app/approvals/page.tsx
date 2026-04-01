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
<<<<<<< HEAD
 toast('ê²°ì¬ ëª©ë¡ì„ ë¶ˆëŸ¬ì˜¤ì§€ ëª»í–ˆìŠµë‹ˆë‹¤.', 'error');
=======
 toast('ê²°ì¬ ëª©ë¡??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??', 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
 } finally {
 setLoading(false);
 }
 }, [tab, toast]);

 useEffect(() => {
 loadData();
 }, [loadData]);

 const handleAction = async (item: Approval, status: 'Y' | 'N') => {
 const actionNm = status === 'Y' ? '?¹ì¸' : 'ë°˜ë ¤';
 const isConfirmed = await confirm({
 title: `ê²°ì¬ ${actionNm}`,
 message: `[${item.approvalId}] ?”ì²­??${actionNm}?˜ì‹œê² ìŠµ?ˆê¹Œ?`,
 variant: status === 'N' ? 'destructive' : 'default'
 });

 if (!isConfirmed) return;

 try {
 await approvalUserService.confirm(item.approvalId, status);
 toast(`?±ê³µ?ìœ¼ë¡?${actionNm}?˜ì—ˆ?µë‹ˆ??`, 'success');
 loadData();
 } catch {
<<<<<<< HEAD
 toast(`${actionNm} ì²˜ë¦¬ ì¤‘ ì˜¤ë¥˜ê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤.`, 'error');
=======
 toast(`${actionNm} ì²˜ë¦¬ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.`, 'error');
>>>>>>> 99be2886750c05e99df098d47b5b4fd8f624093f
 }
 };

 const columns = [
 {
 header: 'ê²°ì¬ ?•ë³´',
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
 {item.jobType === '1' ? 'ì£¼ê°„ë³´ê³ ' : item.jobType === '01' ? '?°ì°¨' : '?¼ë°˜ ê²°ì¬'}
 </span>
 </div>
 </div>
 )
 },
 {
 header: '? ì²­??,
 accessor: (item: Approval) => (
 <div className="flex items-center gap-2">
 <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
 <User size={12} className="opacity-40" />
 </div>
 <span className="text-sm font-bold">{item.applicantId}</span>
 </div>
 )
 },
 { header: '?íƒœ', accessor: (item: Approval) => <StatusBadge status={item.status} /> }
 ];

 const workflowSteps = useMemo(() => {
 if (!selectedItem) return [];
 return [
 { label: 'ê¸°ì•ˆ', user: selectedItem.applicantId, status: 'completed' as const, date: selectedItem.requestDate },
 { label: 'ê²€??, user: '?´ìˆœ??ê³¼ì¥', status: selectedItem.status === 'R' ? 'current' as const : 'completed' as const },
 {
 label: 'ìµœì¢… ?¹ì¸',
 user: 'ê´€ë¦¬ì',
 status: selectedItem.status === 'Y' ? 'completed' as const :
 selectedItem.status === 'N' ? 'rejected' as const : 'pending' as const
 }
 ];
 }, [selectedItem]);

 return (
 <div className="space-y-8 pb-20 animate-in fade-in duration-700">
 <PageHeader
 title="?„ìê²°ì¬ ê´€???¼í„°"
 breadcrumbs={[{ label: '?…ë¬´ì§€?? }, { label: '?„ìê²°ì¬' }]}
 actions={
 <Button className="rounded-xl h-11 px-6 font-black shadow-lg shadow-primary/20 gap-2">
 <ClipboardCheck size={18} /> ??ê²°ì¬ ê¸°ì•ˆ
 </Button>
 }
 />

 {/* Modern Tab Bar */}
 <div className="flex p-1.5 bg-muted/30 rounded-[1.5rem] w-fit">
 <TabButton
 active={tab === 'received'}
 onClick={() => setTab('received')}
 icon={<Inbox size={18} />}
 label="ë°›ì? ê²°ì¬??
 count={tab === 'received' ? data.length : 3}
 />
 <TabButton
 active={tab === 'sent'}
 onClick={() => setTab('sent')}
 icon={<Send size={18} />}
 label="ë³´ë‚¸ ê²°ì¬??
 />
 </div>

 <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
 {/* Left: Approval List */}
 <div className="xl:col-span-2 space-y-6">
 <div className="bg-card border-2 border-primary/5 rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col h-[700px]">
 <div className="px-8 py-6 border-b border-primary/5 flex items-center justify-between bg-muted/5">
 <h3 className="font-black text-lg flex items-center gap-2.5">
 <History size={20} className="text-primary" />
 {tab === 'received' ? 'ë¯¸ì²˜ë¦??”ì²­' : 'ê¸°ì•ˆ ?´ë ¥'}
 </h3>
 <span className="text-[10px] font-bold bg-primary/10 text-primary px-3 py-1 rounded-full ">
 				{data.length} ê±?
 </span>
 </div>
 <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
 <StandardDataTable
 columns={columns}
 data={data}
 loading={loading}
 onRowClick={setSelectedItem}
 emptyMessage={tab === 'received' ? "?€ê¸?ì¤‘ì¸ ê²°ì¬ ?”ì²­???†ìŠµ?ˆë‹¤." : "ë³´ë‚¸ ê²°ì¬ ?´ë ¥???†ìŠµ?ˆë‹¤."}
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
   ?ì„¸ ë³´ê¸°
 </div>
 <span className="text-sm font-bold text-muted-foreground font-mono">#{selectedItem.approvalId}</span>
 </div>
 <h3 className="text-3xl font-black tracking-tight">
 {selectedItem.jobType === '1' ? '2026??2??ì£¼ê°„ë³´ê³  ê²°ì¬ ê±? : '?°ì°¨ ? ê¸‰ ?´ê? ? ì²­??ê±?}
 </h3>
 </div>
 {tab === 'received' && selectedItem.status === 'R' && (
 <div className="flex gap-3">
 <Button
 onClick={() => handleAction(selectedItem, 'Y')}
 className="h-14 px-8 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 gap-2"
 >
 <Check size={20} /> ?¹ì¸ ì²˜ë¦¬
 </Button>
 <Button
 variant="destructive"
 onClick={() => handleAction(selectedItem, 'N')}
 className="h-14 px-8 rounded-2xl font-black shadow-xl shadow-red-500/20 gap-2"
 >
 <X size={20} /> ë°˜ë ¤
 </Button>
 </div>
 )}
 </div>

 <div className="bg-background/50 rounded-[2rem] p-8 border-2 border-primary/5 shadow-inner">
 <div className="flex items-center justify-between mb-6">
 <h4 className="text-sm font-black text-muted-foreground tracking-[0.2em] flex items-center gap-2">
   <Zap size={14} className="text-primary" /> ê²°ì¬ ?Œí¬?Œë¡œ?? </h4>
   <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">?¤ì‹œê°??…ë°?´íŠ¸</span>

 </div>
 <ApprovalStepper steps={workflowSteps} />
 </div>
 </div>

 <div className="p-10 space-y-10 flex-1 overflow-y-auto custom-scrollbar">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
 <DetailSection icon={<User size={16} />} title="ê¸°ì•ˆ???•ë³´" value={selectedItem.applicantId} desc="ê¸°ìˆ ì§€?ë? / ?€ë¦? />
 <DetailSection icon={<Calendar size={16} />} title="ê¸°ì•ˆ ?¼ì‹œ" value={selectedItem.requestDate} desc="ìµœì¢… ?˜ì •: 2026-02-17 10:00" />
 </div>

 <div className="space-y-4">
 <h4 className="text-sm font-black text-muted-foreground tracking-[0.2em] flex items-center gap-2">
 <Info size={14} className="text-primary" /> ?ì„¸ ?ì‹  ?´ìš©
 </h4>
 <div className="p-8 bg-muted/20 rounded-[2rem] border-2 border-primary/5 min-h-[200px]">
 <p className="text-base font-medium leading-relaxed text-foreground/80">
 ë³?ê²°ì¬ ê±´ì? ?œìŠ¤???„ë????„ë¡œ?íŠ¸??ì£¼ê°„ ë³´ê³  ?´ìš©?´ë©°, ì£¼ìš” ?¸í”„??êµì²´ ë°?UI ?œì????‘ì—…???€???¹ì¸???”ì²­?œë¦½?ˆë‹¤. <br /><br />
 ?¸ë? ?´ìš©?€ ì²¨ë???'2026_Weekly_Report_Feb.pdf' ?Œì¼??ì°¸ì¡°?˜ì‹œê¸?ë°”ë?ˆë‹¤.
 </p>
 </div>
 </div>
 </div>

 <div className="p-8 bg-muted/5 border-t border-primary/5 flex items-center justify-center">
 <p className="text-[10px] font-bold text-muted-foreground/40 tracking-[0.3em]">
   ?„ìê²°ì¬ ?¸ì¦ ?œìŠ¤??v5.0
 </p>
 </div>
 </div>
 ) : (
 <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-card/30 border-2 border-dashed border-primary/10 rounded-[2.5rem]">
 <div className="w-24 h-24 bg-muted rounded-[2.5rem] flex items-center justify-center mb-6">
 <ClipboardCheck size={48} className="text-muted-foreground/20" />
 </div>
 <h3 className="text-xl font-black text-muted-foreground/60">ê²°ì¬ ??ª©??? íƒ?´ì£¼?¸ìš”</h3>
 <p className="text-sm text-muted-foreground/40 mt-2 max-w-xs">ì¢Œì¸¡ ëª©ë¡?ì„œ ?ì„¸ ?´ìš©???•ì¸?˜ê³  ?¶ì? ê²°ì¬ ê±´ì„ ? íƒ?˜ì„¸??</p>
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
