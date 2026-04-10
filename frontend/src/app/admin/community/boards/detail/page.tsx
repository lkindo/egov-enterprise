'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import client from '@/lib/api/client';
import {
  ArrowLeft, Edit3, Trash2,
  Download, MessageSquare,
  Calendar, Eye, User,
  FileText, Share2, Quote,
  MessageCircle, CornerDownRight, Plus, Package
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/app/components/ui/toast';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { deleteBoardArticle } from '@/app/actions/boardActions';

function DetailContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const bbsId = searchParams.get('bbsId');
  const nttId = searchParams.get('nttId');

  // 마스터 정보 조회 (템플릿 확인용)
  const { data: masterInfo } = useQuery({
    queryKey: ['board-master', bbsId],
    queryFn: () => client.get<any>(`/admin/system/board-masters/${bbsId}`),
    enabled: !!bbsId,
  });

  const tmplatId = masterInfo?.tmplatId || 'TMPLT_LIST';

  const { data: article, isLoading, refetch } = useQuery({
    queryKey: ['article-detail', bbsId, nttId],
    queryFn: () => knowledgeService.getArticle(nttId!),
    enabled: !!bbsId && !!nttId,
  });

  if (isLoading || !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-[10px] font-black tracking-widest text-muted-foreground uppercase animate-pulse">Synchronizing Knowledge Unit...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-32 pt-8">
      {/* --- Action Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b-2 border-border/50 pb-12">
        <div className="space-y-6">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="group px-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors flex items-center gap-3"
          >
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
            <span className="text-[10px] font-black tracking-[0.3em] uppercase">Return to Hub</span>
          </Button>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="rounded-lg bg-primary/5 text-primary border-primary/20 font-black text-[10px] tracking-widest py-1.5 px-4 uppercase leading-none">
                {bbsId === 'BBSMSTR_AAAAAAAAAAAA' ? 'WIKI ARCHIVE' : 'TECH COMMUNITY'}
              </Badge>
              <div className="h-[1px] w-8 bg-border/50" />
              <span className="text-[10px] font-black text-muted-foreground tracking-widest opacity-40 uppercase">NODE ID: {nttId?.slice(-8)}</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter leading-[0.9] uppercase italic max-w-4xl">
              {article.knoNm || (article as any).nttSj}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}&nttId=${nttId}`)}
            className="h-16 px-8 rounded-[0.1rem] border-2 font-black text-[11px] tracking-widest uppercase gap-3 shadow-xl hover:-translate-y-1 transition-all"
          >
            <Edit3 size={18} /> Edit Entry
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}&parntsId=${nttId}&replyAt=Y`)}
            className="h-16 px-8 rounded-[0.1rem] border-2 font-black text-[11px] tracking-widest uppercase gap-3 shadow-xl hover:-translate-y-1 transition-all"
          >
            <Plus size={18} /> Reply
          </Button>
          <form action={async (formData) => {
            const res = await deleteBoardArticle(null, formData);
            if (res.success) {
              toast('게시물이 성공적으로 삭제되었습니다.', 'success');
              router.push('/admin/community/boards');
            }
          }}>
            <input type="hidden" name="bbsId" value={bbsId!} />
            <input type="hidden" name="nttId" value={nttId!} />
            <Button
              type="submit"
              variant="outline"
              className="h-16 w-16 rounded-[0.1rem] border-2 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white shadow-xl hover:-translate-y-1 transition-all"
            >
              <Trash2 size={24} />
            </Button>
          </form>
        </div>
      </div>

      {/* --- Meta Info Bar --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 p-10 bg-slate-50 dark:bg-muted/10 rounded-[0.1rem] border-border/40 border">
        <MetaItem icon={<User size={18} />} label="Contributor" value={article.frstRegisterId || 'System'} />
        <MetaItem icon={<Calendar size={18} />} label="Published" value={article.frstRegisterPnttm || 'Today'} />
        <MetaItem icon={<Eye size={18} />} label="Global Reach" value={`${(article.inqireCo || 0).toLocaleString()} Views`} />
        <MetaItem icon={<Share2 size={18} />} label="Integrity" value="High Trust" />
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="relative group">
        <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 via-transparent to-rose-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="relative bg-white dark:bg-muted/10 rounded-[0.1rem] p-16 md:p-24 border-2 border-border/40 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="absolute top-0 right-0 p-12 opacity-[0.03] grayscale pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
            <Quote size={200} className="text-primary" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="h-[2px] w-12 bg-primary" />
                <p className="text-[10px] font-black tracking-[0.6em] text-primary uppercase leading-none italic">
                  {tmplatId === 'TMPLT_QNA' ? (article.qnaCategory || 'Q&A_TECHNICAL_CONSULT') : 'VERIFIED_KNOWLEDGE_UNIT'}
                </p>
              </div>
              {tmplatId === 'TMPLT_QNA' && article.qnaStatus !== 'SOLVED' && (
                <Button className="bg-amber-100 text-amber-600 hover:bg-amber-200 border-2 border-amber-200 rounded-full font-black text-xs px-6">
                  <CheckCircle2 size={16} className="mr-2" /> Mark as Solved
                </Button>
              )}
              {tmplatId === 'TMPLT_QNA' && article.qnaStatus === 'SOLVED' && (
                <Badge className="bg-emerald-100 text-emerald-600 border-2 border-emerald-200 rounded-full font-black text-xs px-6 py-2">
                  <CheckCircle2 size={16} className="mr-2" /> Solved
                </Badge>
              )}
            </div>

            {tmplatId === 'TMPLT_CALENDAR' && (
               <div className="p-8 bg-slate-900 rounded-[0.1rem] border-l-8 border-primary flex items-center gap-8 text-white">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                    <Calendar size={32} />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Event Date</p>
                     <p className="text-2xl font-black italic uppercase tracking-tighter">
                       {article.eventDate ? format(new Date(article.eventDate), "EEEE, MMMM do, yyyy") : article.frstRegisterPnttm ? format(new Date(article.frstRegisterPnttm), "EEEE, MMMM do, yyyy") : 'TBD'}
                     </p>
                  </div>
               </div>
            )}

            <div
              className={cn(
                "prose prose-2xl dark:prose-invert prose-slate max-w-none transition-all duration-700",
                tmplatId === 'TMPLT_HUB' ? "prose-p:text-slate-900 font-bold" : "text-slate-800",
                "font-medium leading-[1.6] tracking-tight",
                "prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:italic",
                "prose-p:my-10",
                "prose-blockquote:border-l-[6px] prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:px-12 prose-blockquote:py-10 prose-blockquote:rounded-r-[2rem] prose-blockquote:italic",
                "prose-code:bg-slate-100 prose-code:p-1 prose-code:rounded prose-pre:bg-slate-900 prose-pre:p-8 prose-pre:rounded-[0.1rem]"
              )}
              dangerouslySetInnerHTML={{ __html: article.knoCn || (article as any).nttCn || '' }}
            />

            {tmplatId === 'TMPLT_HUB' && (
              <div className="p-10 bg-slate-50 border-2 border-slate-100 rounded-[0.1rem] flex items-start gap-8">
                 <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-slate-200 grow-0 shrink-0">
                    <User size={40} />
                 </div>
                 <div className="space-y-2">
                    <p className="text-xl font-black uppercase italic tracking-tighter">Contributor Insight</p>
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                      이 게시물은 사원 {article.frstRegisterId}님에 의해 검증된 지식 자산입니다. 
                      프로젝트 {bbsId}의 핵심 참조 문서로 분류되어 있으며, 추가 정보가 필요한 경우 작성자에게 직접 문의하실 수 있습니다.
                    </p>
                 </div>
              </div>
            )}

            <div className="pt-24 flex items-center justify-center opacity-10">
              <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border" />
              <div className="px-10"><FileText size={32} /></div>
              <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border" />
            </div>
          </div>
        </div>
      </div>

      {/* --- Attachments Section --- */}
      {article.atchFileId && (
        <div className="hub-card-premium p-12 bg-slate-900 border-none text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-1000">
            <Package size={80} />
          </div>
          <div className="relative z-10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-[0.1rem] bg-white/10 flex items-center justify-center text-primary border border-white/5">
                <Download size={24} />
              </div>
              <p className="text-[11px] font-black tracking-widest uppercase">Associated Data Assets</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-6 bg-white/5 rounded-[0.1rem] border border-white/10 hover:bg-white hover:text-slate-900 transition-all cursor-pointer group/file">
                <div className="flex items-center gap-4">
                  <FileText size={20} className="text-primary" />
                  <span className="text-sm font-bold tracking-tight">Technical_Specification_Unit_{nttId?.slice(-4)}.pdf</span>
                </div>
                <Download size={18} className="opacity-40 group-hover/file:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-5 p-2 group hover:translate-x-1 transition-transform cursor-default">
      <div className="w-12 h-12 rounded-[0.1rem] bg-white dark:bg-muted flex items-center justify-center text-primary shadow-lg border border-border/50 transition-all group-hover:rotate-12">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest leading-none">{label}</p>
        <p className="text-sm font-black text-foreground tracking-tight leading-none">{value}</p>
      </div>
    </div>
  );
}

export default function BoardDetailPage() {
  return (
    <Suspense fallback={<div className="p-24 text-center">Loading Data Node...</div>}>
      <DetailContent />
    </Suspense>
  );
}
