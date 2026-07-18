'use client';

import React, { useState, use } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { templateAdminService, TmplatInfo } from '@/services/foundation/system/TemplateAdminService';
import { Layout, 
 Plus, 
 RefreshCcw, 
 FileCode, 
 CheckCircle2, 
 XCircle, 
 Code } from 'lucide-react';
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
 tmpltNm: '',
 tmpltSeCd: 'TMPT01',
 tmpltPath: '',
 useYn: 'Y'
 });

 const handleRefresh = async () => {
 setLoading(true);
 try {
 const res = await templateAdminService.getTemplateList();
 setTemplates(res);
 } catch {
 toast.error('템플릿 목록을 불러오지 못했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const handleAdd = async () => {
 if (!newTemplate.tmpltNm || !newTemplate.tmpltPath) {
 toast.error('템플릿 명과 경로를 입력해주세요.');
 return;
 }

 setLoading(true);
 try {
 await templateAdminService.createTemplate(newTemplate);
 toast.success('새 템플릿을 등록했습니다.');
 setIsAddOpen(false);
 handleRefresh();
 } catch {
 toast.error('템플릿 등록에 실패했습니다.');
 } finally {
 setLoading(false);
 }
 };

 const columns = [
 {
 header: '템플릿 ID',
 accessor: (item: TmplatInfo) => (
 <span className="font-mono font-bold text-muted-foreground text-xs tracking-tight">{item.tmpltId}</span>
 )
 },
 {
 header: '템플릿 명',
 accessor: (item: TmplatInfo) => (
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 rounded-lg bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-md">
 <Layout size={14} />
 </div>
 <span className="font-bold tracking-tighter text-foreground">{item.tmpltNm}</span>
 </div>
 )
 },
 {
 header: '구분',
 accessor: (item: TmplatInfo) => (
 <span className="text-xs font-bold text-muted-foreground tracking-tight bg-muted px-2 py-1 rounded-md ">
 {item.tmpltSeCd === 'TMPT01' ? '게시판' : item.tmpltSeCd === 'TMPT02' ? '커뮤니티' : '일반'}
 </span>
 )
 },
 {
 header: '템플릿 경로',
 accessor: (item: TmplatInfo) => (
 <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs ">
 <Code size={12} />
 {item.tmpltPath}
 </div>
 )
 },
 {
 header: '사용 여부',
 accessor: (item: TmplatInfo) => (
 <div className={cn(
 "flex items-center gap-2 px-3 py-1 rounded-lg border w-fit transition-all",
 item.useYn === 'Y' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-muted text-muted-foreground border-border"
 )}>
 {item.useYn === 'Y' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
 <span className="text-xs font-bold tracking-tight ">{item.useYn === 'Y' ? '활성' : '비활성'}</span>
 </div>
 )
 }
 ];

 return (
 <div className="max-w-6xl mx-auto space-y-12 px-4 md:px-0 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
 <PageHeader
 title="템플릿 시스템 아키텍처"
 breadcrumbs={[{ label: '시스템관리' }, { label: '커뮤니티관리' }, { label: '템플릿관리' }]}
 actions={
 <div className="flex items-center gap-4">
 <Button
 onClick={handleRefresh}
 variant="outline"
 className="h-11 w-14 rounded-lg border-2 border-border text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shadow-md active:scale-95"
 >
 <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
 </Button>
 <Button
 onClick={() => setIsAddOpen(true)}
 className="h-11 px-8 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 "
 >
 <Plus size={18} />
 신규 블루프린트
 </Button>
 </div>
 }
 />

 <div className="responsive-card p-6 md:p-12 border-2 border-border bg-white/50 backdrop-blur-xl relative overflow-hidden group">
 <div className="flex items-center gap-4 mb-12">
 <div className="w-12 h-12 bg-surface-inverse text-surface-inverse-foreground rounded-lg flex items-center justify-center shadow-lg">
 <FileCode size={24} />
 </div>
 <div>
 <h3 className="text-xl md:text-2xl font-bold text-foreground tracking-tighter ">구조적 자산</h3>
 <p className="text-xs font-bold text-muted-foreground tracking-[0.3em]">등록된 시스템 템플릿</p>
 </div>
 </div>

 <div className="px-2 overflow-x-auto">
 <StandardDataTable
 columns={columns}
 data={templates}
 loading={loading}
 emptyMessage="시스템에 등록된 템플릿이 없습니다."
 className="border-none bg-muted/50 rounded-lg p-8"
 />
 </div>
 </div>

 <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
 <DialogContent className="sm:max-w-[500px] rounded-lg p-10 border-none shadow-2xl bg-white">
 <DialogHeader className="space-y-4">
 <div className="w-16 h-11 bg-primary text-white rounded-lg flex items-center justify-center shadow-2xl shadow-primary/20 mx-auto">
 <Plus size={28} />
 </div>
 <DialogTitle className="text-3xl font-bold text-foreground tracking-tighter text-center">신규 블루프린트 등록</DialogTitle>
 <DialogDescription className="text-center font-bold text-muted-foreground text-sm">
 시스템에 새로운 UI/UX 구조를 정의합니다.
 </DialogDescription>
 </DialogHeader>

 <div className="space-y-8 py-8">
 <div className="space-y-3">
 <label className="text-xs font-bold text-muted-foreground tracking-tight ml-2">템플릿 명칭</label>
 <Input
 placeholder="템플릿 명..."
 value={newTemplate.tmpltNm}
 onChange={(e) => setNewTemplate(prev => ({ ...prev, tmpltNm: e.target.value }))}
 className="h-11 px-8 rounded-lg border-2 border-border bg-muted/50 text-lg font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </div>

 <div className="grid grid-cols-2 gap-6">
 <div className="space-y-3">
 <label className="text-xs font-bold text-muted-foreground tracking-tight ml-2">카테고리</label>
 <Select
 value={newTemplate.tmpltSeCd}
 onValueChange={(v) => setNewTemplate(prev => ({ ...prev, tmpltSeCd: v }))}
 >
 <SelectTrigger className="h-11 rounded-lg border-2 border-border bg-muted/50 font-bold text-xs tracking-tight focus:bg-white">
 <SelectValue placeholder="카테고리 선택" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="TMPT01" className="font-bold text-xs tracking-tight ">게시판</SelectItem>
 <SelectItem value="TMPT02" className="font-bold text-xs tracking-tight ">커뮤니티</SelectItem>
 <SelectItem value="TMPT03" className="font-bold text-xs tracking-tight ">일반</SelectItem>
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-3">
 <label className="text-xs font-bold text-muted-foreground tracking-tight ml-2">상태</label>
 <Select
 value={newTemplate.useYn}
 onValueChange={(v) => setNewTemplate(prev => ({ ...prev, useYn: v }))}
 >
 <SelectTrigger className="h-11 rounded-lg border-2 border-border bg-muted/50 font-bold text-xs tracking-tight focus:bg-white">
 <SelectValue placeholder="상태 선택" />
 </SelectTrigger>
 <SelectContent className="rounded-lg border-none shadow-2xl">
 <SelectItem value="Y" className="font-bold text-xs tracking-tight ">활성</SelectItem>
 <SelectItem value="N" className="font-bold text-xs tracking-tight ">비활성</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-3">
 <label className="text-xs font-bold text-muted-foreground tracking-tight ml-2">소스 경로</label>
 <div className="relative">
 <Code className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
 <Input
 placeholder="/src/templates/..."
 value={newTemplate.tmpltPath}
 onChange={(e) => setNewTemplate(prev => ({ ...prev, tmpltPath: e.target.value }))}
 className="h-11 pl-16 pr-8 rounded-lg border-2 border-border bg-muted/50 font-mono text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
 />
 </div>
 </div>
 </div>

 <DialogFooter>
 <Button
 variant="outline"
 onClick={() => setIsAddOpen(false)}
 className="h-11 px-10 rounded-lg border-2 border-border font-bold text-sm tracking-tight hover:bg-muted transition-all"
 >
 취소
 </Button>
 <Button
 onClick={handleAdd}
 disabled={loading}
 className="h-11 px-14 bg-surface-inverse text-surface-inverse-foreground rounded-lg font-bold text-sm tracking-[0.2em] shadow-xl hover:bg-primary transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-3 flex-1"
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

