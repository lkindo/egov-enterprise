'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
 ArrowLeft, Save, Zap,
 Layers, Package, Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/app/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { saveBoardArticle } from '@/app/actions/boardActions';
import dynamic from 'next/dynamic';
import { BoardPost } from '@/types/business/board';
import { useAutoSaveDraft } from '@/hooks/use-auto-save-draft';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
 ssr: false,
 loading: () => <Skeleton className="h-[400px] w-full" />
});

export default function InsertBoardArticlePage() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const { toast } = useToast();
 const queryClient = useQueryClient();
 const bbsId = searchParams.get('bbsId') || 'BBSMSTR_AAAAAAAAAAAA';
 const nttId = searchParams.get('nttId') || undefined;
 const parntsId = searchParams.get('parntsId') || undefined;

 const [form, setForm] = useState<Partial<Omit<BoardPost, 'nttId'> & { password?: string; replyAt?: string; parntsId?: string; nttId?: string | number }>>({
 bbsId: bbsId,
 nttId: nttId,
 nttSj: '',
 nttCn: '',
 ntcrNm: '관리자',
 password: '1',
 parntsId: parntsId,
 replyAt: parntsId ? 'Y' : 'N',
 atchFileId: '',
 });

 const [isSubmitting, setIsSubmitting] = useState(false);

 // ?�동 ?�시?�?????�동
 const { restoreDraft, clearDraft, hasDraft } = useAutoSaveDraft({
 storageKey: `board_insert_${bbsId}`,
 getData: () => ({
 title: form.nttSj || '',
 content: form.nttCn || ''
 }),
 onRestore: (data) => {
 setForm(prev => ({ ...prev, nttSj: data.title, nttCn: data.content }));
 }
 });

 // 기존 ?�이??로딩 (?�정 모드)
 useEffect(() => {
 if (nttId && bbsId) {
 knowledgeService.getArticle(bbsId, nttId).then(data => {
 if (data) {
 setForm(prev => ({
 ...prev,
 nttSj: data.knoNm || (data as any).nttSj,
 nttCn: data.knoCn || (data as any).nttCn,
 nttId: nttId,
 atchFileId: data.atchFileId
 }));
 }
 }).catch(err => {
 console.error('Failed to fetch article:', err);
 toast('?�이?��? 불러?�는???�패?�습?�다.', 'error');
 });
 }
 }, [nttId, bbsId]); // Removed toast from dependencies to prevent unwanted re-runs on toast state changes

 // ?�이지 진입 ???�시?�???�이???�인 �?복구 ?�안
 useEffect(() => {
 if (hasDraft && !form.nttSj && !form.nttCn && !nttId) {
 if (confirm('?�전???�성 중이???�시?�???�이?��? ?�습?�다. 복구?�시겠습?�까?')) {
 restoreDraft();
 toast('?�시?�???�이?��? 복구?�습?�다.', 'success');
 }
 }
 }, [hasDraft, restoreDraft, toast, form.nttSj, form.nttCn, nttId]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!form.nttCn || form.nttCn === '<p></p>') {
 toast('?�용???�력??주세??', 'error');
 return;
 }

 setIsSubmitting(true);

 try {
 const formData = new FormData();
 Object.entries(form).forEach(([key, value]) => {
 if (value !== undefined && value !== null) {
 formData.append(key, value.toString());
 }
 });

 const result = await saveBoardArticle(null, formData);
 console.log('>>> Board Save Result:', result);
 
 if (result.success) {
 // 캐시 무효??�??�시?�????��
 queryClient.invalidateQueries({ queryKey: ['boardList'] });
 clearDraft();
 
 toast(result.message || '?�?�되?�습?�다.', 'success');
 router.push(`/admin/community/boards/selectBoardList?bbsId=${bbsId}`);
 } else {
 toast(result.message || '?�??�??�류가 발생?�습?�다.', 'error');
 }
 } catch {
 toast('?�록 �??�류가 발생?�습?�다.', 'error');
 } finally {
 setIsSubmitting(false);
 }
 };

 return (
 <div className="max-w-5xl mx-auto space-y-12 pb-24 pt-8 animate-in fade-in duration-500">
 {/* Header section */}
 <div className="flex items-center gap-8 px-2">
 <Button
 variant="outline"
 onClick={() => router.back()}
 className="w-12 h-12 rounded-lg border-2 group hover:bg-slate-900 transition-all duration-500 shadow-xl active:scale-95"
 >
 <ArrowLeft size={20} className="group-hover:text-white group-hover:-translate-x-1 transition-all" />
 </Button>
 <div className="space-y-2">
 <div className="flex items-center gap-3">
 <span className="text-xs font-bold tracking-widest text-primary uppercase leading-none px-3 py-1 bg-primary/5 rounded-full border border-primary/10">Enterprise Intelligence</span>
 </div>
 <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight uppercase leading-none transition-colors">New Knowledge Asset</h1>
 </div>
 </div>

 <form onSubmit={handleSubmit} className="space-y-10 px-2">
 {/* Title Input Area */}
 <div className="hub-card-premium p-10 bg-slate-50 dark:bg-slate-900 border-none shadow-2xl relative overflow-hidden group rounded-lg">
 <div className="absolute top-0 right-0 p-12 opacity-[0.05] dark:opacity-[0.02] pointer-events-none group-focus-within:opacity-10 transition-opacity">
 <Layers size={140} className="rotate-12 text-slate-900 dark:text-white" />
 </div>
 <div className="relative z-10 space-y-6">
 <div className="flex items-center gap-4">
 <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
 <Zap size={20} />
 </div>
 <span className="text-xs font-bold tracking-widest text-slate-500 dark:text-white/40 uppercase">Dataset Core Subject</span>
 </div>
 <Input
 name="nttSj"
 data-testid="article-title-input"
 value={form.nttSj}
 onChange={(e) => setForm({ ...form, nttSj: e.target.value })}
 className="h-11 bg-transparent border-none text-slate-900 dark:text-white text-2xl font-bold placeholder:text-slate-900/10 dark:placeholder:text-white/10 focus-visible:ring-0 p-0 tracking-tight"
 placeholder="?�목???�력?�십?�오..."
 autoFocus
 required
 />
 <div className="h-[1px] w-full bg-gradient-to-r from-primary/40 to-transparent" />
 </div>
 </div>

 {/* Content Editor Area */}
 <div className="space-y-6">
 <div className="flex items-center justify-between px-2">
 <div className="flex items-center gap-3">
 <Package size={18} className="text-primary" />
 <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest transition-colors">지???�드 콘텐�?/h3>
 </div>
 <div className="flex items-center gap-2">
 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">?�시�??�기??준비됨</span>
 </div>
 </div>
 <div data-testid="rich-text-editor">
 <RichTextEditor
 value={form.nttCn || ''}
 onChange={(content) => setForm({ ...form, nttCn: content })}
 placeholder="?�세 ?�용??기술?�십?�오..."
 />
 </div>
 </div>

 {/* Bottom Actions Matrix */}
 <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-border/40">
 <div className="flex items-center gap-8">
 <div className="flex flex-col">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Dataset Type</span>
 <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase transition-colors">{bbsId.split('_')[1] || 'CORE'}</span>
 </div>
 <div className="w-[1px] h-8 bg-border/40" />
 <div className="flex flex-col">
 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest leading-none">Security Clearance</span>
 <span className="text-xs font-bold text-emerald-500 mt-1 uppercase ">Authenticated</span>
 </div>
 </div>

 <div className="flex items-center gap-4 w-full sm:w-auto">
 <Button
 type="button"
 variant="outline"
 onClick={() => router.back()}
 className="h-12 flex-1 sm:flex-none px-8 rounded-lg border-2 font-bold tracking-widest text-xs uppercase hover:bg-slate-50 transition-all"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={isSubmitting}
 className="h-12 flex-1 sm:flex-none px-10 rounded-lg bg-primary text-white font-bold tracking-widest text-xs uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 gap-3 group"
 >
 {isSubmitting ? (
 <span className="animate-pulse">Saving Node...</span>
 ) : (
 <>
 <Save size={18} className="group-hover:rotate-12 transition-transform" /> Commit Knowledge
 </>
 )}
 </Button>
 </div>
 </div>
 </form>

 {/* Footer Insight */}
 <div className="text-center">
 <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-50 rounded-full border border-border/50">
 <Monitor size={14} className="text-muted-foreground/40" />
 <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">Enterprise Command Node - Unit Version 2.4.0</span>
 </div>
 </div>
 </div>
 );
}

