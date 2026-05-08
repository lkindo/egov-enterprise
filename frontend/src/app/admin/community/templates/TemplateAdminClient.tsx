'use client';

import React, { useState, use } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { templateAdminService, TmplatInfo } from '@/services/foundation/system/TemplateAdminService';
import {
 Layout,
 Plus,
 Search,
 RefreshCcw,
 FileCode,
 CheckCircle2,
 XCircle,
 ExternalLink,
 Code
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
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

export default function TemplateAdminClient({
 templatesPromise
}: {
 templatesPromise: Promise<TmplatInfo[]>
}) {
 const initialTemplates = use(templatesPromise);
 const [loading, setLoading] = useState(false);
 const [templates, setTemplates] = useState(initialTemplates);
 const [isAddOpen, setIsAddOpen] = useState(false);
 const [newTemplate, setNewTemplate] = useState<TmplatInfo>({
 tmplatNm: '',
 tmplatSeCode: 'TMPT01',
 tmplatCours: '',
 useAt: 'Y'
 });

 const handleRefresh = async () => {
 setLoading(true);
 try {
 const res = await templateAdminService.getTemplateList();
 setTemplates(res);
 } catch {
 toast.error('?�플�?목록??불러?��? 못했?�니??');
 } finally {
 setLoading(false);
 }
 };

 const handleAdd = async () => {
 if (!newTemplate.tmplatNm || !newTemplate.tmplatCours) {
 toast.error('?�플�?명과 경로�??�력?�주?�요.');
 return;
 }

 setLoading(true);
 try {
 await templateAdminService.createTemplate(newTemplate);
 toast.success('???�플릿을 ?�록?�습?�다.');
 setIsAddOpen(false);
 handleRefresh();
 } catch {
 toast.error('?�플�??�록???�패?�습?�다.');
 } finally {
 setLoading(false);
 }
 };

 const columns = [
 {
 header: '?�플�?ID',
 accessor: (item: TmplatInfo) => (
 <span className="font-mono font-bold text-slate-400 text-xs tracking-tight">{item.tmplatId}</span>
 )
 },
 {
 header: '?�플�?�?,
 accessor: (item: TmplatInfo) => (
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
 <Layout size={14} />
 </div>
 <span className="font-bold tracking-tight text-slate-900">{item.tmplatNm}</span>
 </div>
 )
 },
 {
 header: '구분',
 accessor: (item: TmplatInfo) => (
 <span className="text-xs font-bold text-slate-500 tracking-tight bg-slate-100 px-2 py-1 rounded-md ">
 {item.tmplatSeCode === 'TMPT01' ? '게시?? : item.tmplatSeCode === 'TMPT02' ? '커�??�티' : '?�반'}
 </span>
 )
 },
 {
 header: '?�플�?경로',
 accessor: (item: TmplatInfo) => (
 <div className="flex items-center gap-2 text-slate-400 font-mono text-xs ">
 <Code size={12} />
 {item.tmplatCours}
 </div>
 )
 },
 {
 header: '?�용 ?��?',
 accessor: (item: TmplatInfo) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-full border w-fit transition-all text-xs",
 item.useAt === 'Y' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
 )}>
 {item.useAt === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
 <span className="text-xs font-bold tracking-tight ">{item.useAt === 'Y' ? '?�성' : '비활??}</span>
 </div>
 )
 }
 ];

 return (
 <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <PageHeader
 title="?�플�??�스???�키?�처"
 breadcrumbs={[{ label: '?�스?��?�? }, { label: '커�??�티관�? }, { label: '?�플릿�?�? }]}
 actions={
 <div className="flex items-center gap-4">
 <Button
 onClick={handleRefresh}
 variant="outline"
 className="h-12 w-12 rounded-lg border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95"
 >
 <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
 </Button>
 <Button
 onClick={() => setIsAddOpen(true)}
 className="h-12 px-6 bg-slate-900 text-white rounded-lg font-bold text-sm tracking-tight shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2 "
 >
 <Plus size={18} />
 ?�규 블루?�린?? </Button>
 </div>
 }
 />

 <div className="hub-card-section p-6 md:p-12 border-2 border-slate-100 bg-white/50 backdrop-blur-xl relative overflow-hidden group">
 <div className="flex items-center gap-4 mb-12">
 <div className="w-12 h-12 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-lg">
 <FileCode size={24} />
 </div>
 <div>
 <h3 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight ">구조???�산</h3>
 <p className="text-xs font-bold text-slate-400 tracking-widest">?�록???�스???�플�?/p>
 </div>
 </div>

 <div className="px-2 overflow-x-auto">
 <StandardDataTable
 columns={columns}
 data={templates}
 loading={loading}
 emptyMessage="?�스?�에 ?�록???�플릿이 ?�습?�다."
 className="border-none bg-slate-50/50 rounded-lg p-8"
 />
 </div>
 </div>

 <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
 <DialogContent className="sm:max-w-[500px] rounded-lg p-10 border-none shadow-2xl bg-white">
 <DialogHeader className="space-y-4">
 <div className="w-14 h-11 bg-primary text-white rounded-lg flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
 <Plus size={28} />
 </div>
 <DialogTitle className="text-2xl font-bold text-slate-900 tracking-tight text-center">?�규 블루?�린???�록</DialogTitle>
 <DialogDescription className="text-center font-bold text-slate-400 text-sm">
 ?�스?�에 ?�로??UI/UX 구조�??�의?�니??
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-8 py-8">
 <div className="space-y-3">
 <label className="text-xs font-bold text-slate-400 tracking-tight ml-2">?�플�?명칭</label>
 <Input
 placeholder="?�플�?�?.."
 value={newTemplate.tmplatNm}
 onChange={(e) => setNewTemplate(prev => ({ ...prev, tmplatNm: e.target.value }))}
 className="h-12 px-6 rounded-lg border-2 border-slate-100 bg-slate-50/50 text-base font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-3">
 <label className="text-xs font-bold text-slate-400 tracking-tight ml-2">카테고리</label>
 <Select
 value={newTemplate.tmplatSeCode}
 onValueChange={(v) => setNewTemplate(prev => ({ ...prev, tmplatSeCode: v }))}
 >
 <SelectTrigger className="h-12 rounded-lg border-2 border-slate-100 bg-slate-50/50 font-bold text-xs tracking-tight focus:bg-white">
 <SelectValue placeholder="카테고리 ?�택" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="TMPT01" className="font-bold text-xs tracking-tight ">게시??/SelectItem>
 <SelectItem value="TMPT02" className="font-bold text-xs tracking-tight ">커�??�티</SelectItem>
 <SelectItem value="TMPT03" className="font-bold text-xs tracking-tight ">?�반</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-3">
 <label className="text-xs font-bold text-slate-400 tracking-tight ml-2">?�태</label>
 <Select
 value={newTemplate.useAt}
 onValueChange={(v) => setNewTemplate(prev => ({ ...prev, useAt: v }))}
 >
 <SelectTrigger className="h-12 rounded-lg border-2 border-slate-100 bg-slate-50/50 font-bold text-xs tracking-tight focus:bg-white">
 <SelectValue placeholder="?�태 ?�택" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="Y" className="font-bold text-xs tracking-tight ">?�성</SelectItem>
 <SelectItem value="N" className="font-bold text-xs tracking-tight ">비활??/SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-3">
 <label className="text-xs font-bold text-slate-400 tracking-tight ml-2">?�스 경로</label>
 <div className="relative">
 <Code className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
 <Input
 placeholder="/src/templates/..."
 value={newTemplate.tmplatCours}
 onChange={(e) => setNewTemplate(prev => ({ ...prev, tmplatCours: e.target.value }))}
 className="h-12 pl-16 pr-8 rounded-lg border-2 border-slate-100 bg-slate-50/50 font-mono text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </div>
 </div>
 </div>

 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => setIsAddOpen(false)}
 className="h-12 px-8 rounded-lg border-2 border-slate-100 font-bold text-sm tracking-tight hover:bg-slate-50 transition-all"
 >
 취소
 </Button>
 <Button
 onClick={handleAdd}
 disabled={loading}
 className="h-12 px-10 bg-slate-900 text-white rounded-lg font-bold text-sm tracking-tight shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
 >
 {loading ? <RefreshCcw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
 ?�록 ?�인
 </Button>
 </DialogFooter>
 </DialogContent>
 </Dialog>
 </div>
 );
}

