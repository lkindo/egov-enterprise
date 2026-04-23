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
  const parntsId = searchParams.get('parntsId') || undefined;

  const [form, setForm] = useState<Partial<BoardPost & { password?: string; replyAt?: string; parntsId?: string }>>({
    bbsId: bbsId,
    nttSj: '',
    nttCn: '',
    ntcrNm: '愿由ъ옄',
    password: '1',
    parntsId: parntsId,
    replyAt: parntsId ? 'Y' : 'N',
    atchFileId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ?먮룞 ?꾩떆??????곕룞
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

  // ?섏씠吏 吏꾩엯 ???꾩떆????곗씠???뺤씤 諛?蹂듦뎄 ?쒖븞
  useEffect(() => {
    if (hasDraft && !form.nttSj && !form.nttCn) {
      if (confirm('?댁쟾???묒꽦 以묒씠???꾩떆????곗씠?곌? ?덉뒿?덈떎. 蹂듦뎄?섏떆寃좎뒿?덇퉴?')) {
        restoreDraft();
        toast('?꾩떆????곗씠?곕? 蹂듦뎄?덉뒿?덈떎.', 'success');
      }
    }
  }, [hasDraft, restoreDraft, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nttCn || form.nttCn === '<p></p>') {
      toast('?댁슜???낅젰??二쇱꽭??', 'error');
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
      if (result.success) {
        // 罹먯떆 臾댄슚??諛??꾩떆?????젣
        queryClient.invalidateQueries({ queryKey: ['boardList'] });
        clearDraft();
        
        toast('吏???먯궛???깃났?곸쑝濡??깅줉?섏뿀?듬땲??', 'success');
        router.push(`/admin/community/boards/selectBoardList?bbsId=${bbsId}`);
      } else {
        toast(result.message || '?깅줉 ?ㅽ뙣', 'error');
      }
    } catch {
      toast('?깅줉 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
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
          className="w-16 h-16 rounded-[0.1rem] border-2 group hover:bg-slate-900 transition duration-500 shadow-xl active:scale-95"
        >
          <ArrowLeft className="group-hover:text-white group-hover:-translate-x-1 transition" />
        </Button>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black tracking-[0.5em] text-primary uppercase leading-none px-3 py-1 bg-primary/5 rounded-full border border-primary/10">Enterprise Intelligence</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic leading-none transition-colors">New Knowledge Asset</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10 px-2">
        {/* Title Input Area */}
        <div className="hub-card-premium p-10 bg-slate-50 dark:bg-slate-900 border-none shadow-2xl relative overflow-hidden group rounded-[0.1rem]">
          <div className="absolute top-0 right-0 p-12 opacity-[0.05] dark:opacity-[0.02] pointer-events-none group-focus-within:opacity-10 transition-opacity">
            <Layers size={140} className="rotate-12 text-slate-900 dark:text-white" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-[0.1rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Zap size={20} />
              </div>
              <span className="text-[10px] font-black tracking-widest text-slate-500 dark:text-white/40 uppercase">Dataset Core Subject</span>
            </div>
            <Input
              data-testid="article-title-input"
              value={form.nttSj}
              onChange={(e) => setForm({ ...form, nttSj: e.target.value })}
              className="h-20 bg-transparent border-none text-slate-900 dark:text-white text-3xl font-black placeholder:text-slate-900/10 dark:placeholder:text-white/10 focus-visible:ring-0 p-0 tracking-tight"
              placeholder="?쒕ぉ???낅젰?섏떗?쒖삤..."
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
              <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest transition-colors">吏???몃뱶 肄섑뀗痢?/h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">?ㅼ떆媛??숆린??以鍮꾨맖</span>
            </div>
          </div>
          <div data-testid="rich-text-editor">
            <RichTextEditor
              value={form.nttCn || ''}
              onChange={(content) => setForm({ ...form, nttCn: content })}
              placeholder="?곸꽭 ?댁슜??湲곗닠?섏떗?쒖삤..."
            />
          </div>
        </div>

        {/* Bottom Actions Matrix */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-border/40">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Dataset Type</span>
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 uppercase italic transition-colors">{bbsId.split('_')[1] || 'CORE'}</span>
            </div>
            <div className="w-[1px] h-8 bg-border/40" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Security Clearance</span>
              <span className="text-xs font-black text-emerald-500 mt-1 uppercase italic">Authenticated</span>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="h-16 flex-1 sm:flex-none px-10 rounded-[0.1rem] border-2 font-black tracking-widest text-[11px] uppercase hover:bg-slate-50 transition"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-16 flex-1 sm:flex-none px-12 rounded-[0.1rem] bg-primary text-white font-black tracking-widest text-[11px] uppercase hover:scale-105 active:scale-95 transition shadow-xl shadow-primary/20 gap-3 group"
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
          <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Enterprise Command Node - Unit Version 2.4.0</span>
        </div>
      </div>
    </div>
  );
}
