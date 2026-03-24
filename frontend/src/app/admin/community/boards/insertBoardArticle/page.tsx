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
import { saveBoardArticle } from '@/app/actions/boardActions';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { BoardArticle } from '@/services/knowledgeService';

export default function InsertBoardArticlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const bbsId = searchParams.get('bbsId') || 'BBSMSTR_AAAAAAAAAAAA'; 
  const parntsId = searchParams.get('parntsId') || undefined; 

  const [form, setForm] = useState<Partial<BoardArticle & { password?: string; replyAt?: string; parntsId?: string }>>({
    bbsId: bbsId,
    nttSj: '',
    nttCn: '',
    ntcrNm: '관리자',
    password: '1',
    parntsId: parntsId,
    replyAt: parntsId ? 'Y' : 'N',
    atchFileId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nttCn || form.nttCn === '<p></p>') {
      toast('내용을 입력해주세요.', 'error');
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
        toast('지식 자산이 성공적으로 등록되었습니다.', 'success');
        router.push(`/admin/help?bbsId=${bbsId}`);
      } else {
        toast(result.message || '등록 실패', 'error');
      }
    } catch (error) {
      toast('등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 pb-24 pt-8">
      {/* Header section */}
      <div className="flex items-center gap-8 px-2">
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="w-16 h-16 rounded-[2rem] border-2 group hover:bg-slate-900 transition-all duration-500 shadow-xl active:scale-95"
        >
          <ArrowLeft className="group-hover:text-white group-hover:-translate-x-1 transition-all" />
        </Button>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black tracking-[0.5em] text-primary uppercase leading-none px-3 py-1 bg-primary/5 rounded-full border border-primary/10">Enterprise Intelligence</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">New Knowledge Asset</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10 px-2">
        {/* Title Input Area */}
        <div className="hub-card-premium p-10 bg-slate-900 border-none shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-focus-within:opacity-10 transition-opacity">
            <Layers size={140} className="rotate-12" />
          </div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-primary border border-white/10">
                <Zap size={20} />
              </div>
              <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Dataset Core Subject</span>
            </div>
            <Input 
              value={form.nttSj}
              onChange={(e) => setForm({ ...form, nttSj: e.target.value })}
              className="h-20 bg-transparent border-none text-white text-3xl font-black placeholder:text-white/10 focus-visible:ring-0 p-0 tracking-tight"
              placeholder="제목을 입력하십시오..."
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
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Intelligence Node Content</h3>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Live Sync Ready</span>
            </div>
          </div>
          <RichTextEditor 
            value={form.nttCn || ''}
            onChange={(content) => setForm({ ...form, nttCn: content })}
            placeholder="상세 내용을 기술하십시오..."
          />
        </div>

        {/* Bottom Actions Matrix */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-8 border-t border-border/40">
           <div className="flex items-center gap-8">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Dataset Type</span>
                 <span className="text-xs font-black text-slate-800 mt-1 uppercase italic">{bbsId.split('_')[1] || 'CORE'}</span>
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
                className="h-16 flex-1 sm:flex-none px-10 rounded-2xl border-2 font-black tracking-widest text-[11px] uppercase hover:bg-slate-50 transition-all"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="h-16 flex-1 sm:flex-none px-12 rounded-2xl bg-primary text-white font-black tracking-widest text-[11px] uppercase hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20 gap-3 group"
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
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Enterprise Command Node • Unit Version 2.4.0</span>
         </div>
      </div>
    </div>
  );
}
