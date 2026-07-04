'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2,
  Download,
  Calendar, Eye, User,
  FileText, Share2, Quote,
  Package, Plus
} from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/providers/toast';
import { knowledgeService, KnowledgeDto } from '@/services/business/knowledge/knowledgeService';
import { deleteBoardArticle } from '@/app/actions/boardActions';
import { BoardMaster } from '@/services/foundation/system/BoardAdminService';
import CommentSection from '@/components/features/comment/CommentSection';

import { CommentVO } from '@/types/business/comment';

interface BoardDetailClientProps {
  dataPromise: Promise<{
    article: KnowledgeDto | null;
    masterInfo: BoardMaster | null;
    initialComments: CommentVO[];
  }>;
}

import { motion } from 'framer-motion';

export function BoardDetailClient({ dataPromise }: BoardDetailClientProps) {
  const initialData = use(dataPromise);
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const bbsId = searchParams.get('bbsId');
  const pstId = searchParams.get('pstId');
  const queryClient = useQueryClient();

  // React Query for revalidation/stale handling, seeded with initialData
  const { data: masterInfo } = useQuery({
    queryKey: ['board-master', bbsId],
    queryFn: () => initialData.masterInfo!,
    initialData: initialData.masterInfo,
    enabled: !!initialData.masterInfo,
  });

  const { data: article } = useQuery({
    queryKey: ['article-detail', bbsId, pstId],
    queryFn: () => knowledgeService.getArticle(bbsId!, pstId!),
    initialData: initialData.article,
    enabled: !!initialData.article,
  });

  const tmpltId = (masterInfo as any)?.tmpltId || (masterInfo as any)?.tmplat_id || 'TMPLT_LIST';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <div className="w-16 h-11 border-4 border-primary/20 border-t-primary rounded-lg animate-spin" />
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase animate-pulse">Initializing Knowledge Node...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase">Knowledge Node Not Found</p>
        <Button onClick={() => router.back()} aria-label="뒤로 가기">Go Back</Button>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto space-y-12 pb-32 pt-8 relative"
    >
      {/* Decorative Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/5 to-transparent -z-10 blur-[100px] opacity-50" />

      {/* --- Action Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b-2 border-slate-100 pb-16 relative">
        <div className="space-y-8 relative z-10">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="group px-0 hover:bg-transparent text-slate-400 hover:text-primary transition-colors flex items-center gap-4"
              aria-label="뒤로 가기"
            >
              <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:shadow-md transition-all">
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
              </div>
              <span className="text-xs font-black tracking-[0.4em] uppercase">Return to Hub</span>
            </Button>
          </motion.div>

          <div className="space-y-6">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-4"
            >
              <Badge className="rounded-xl bg-primary/10 text-primary border-primary/20 font-black text-[10px] tracking-[0.2em] py-2 px-5 uppercase leading-none shadow-sm">
                {bbsId === 'BBSMSTR_AAAAAAAAAAAA' ? 'WIKI ARCHIVE' : 'TECH COMMUNITY'}
              </Badge>
              <div className="h-[2px] w-10 bg-gradient-to-r from-primary/30 to-transparent" />
              <span className="text-[10px] font-black text-slate-300 tracking-[0.3em] uppercase">NODE_REF: {pstId?.slice(-8)}</span>
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.85] uppercase max-w-4xl"
            >
              {article.pstTtl || (article as any).knoNm}
            </motion.h1>
          </div>
        </div>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 relative z-10"
        >
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}&pstId=${pstId}`)}
            className="h-14 px-10 rounded-2xl border-2 border-slate-200 bg-white/50 backdrop-blur-md font-black text-[10px] tracking-[0.2em] uppercase gap-4 shadow-xl hover:-translate-y-2 transition-all active:scale-95"
            aria-label="게시글 수정"
          >
            <Edit3 size={20} className="text-primary" /> Edit Node
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/community/boards/insertBoardArticle?bbsId=${bbsId}&parnts=${pstId}&replyYn=Y`)}
            className="h-14 px-10 rounded-2xl border-2 border-slate-200 bg-white/50 backdrop-blur-md font-black text-[10px] tracking-[0.2em] uppercase gap-4 shadow-xl hover:-translate-y-2 transition-all active:scale-95"
            aria-label="게시글 답글 작성"
          >
            <Plus size={20} className="text-primary" /> Fork Thread
          </Button>
          <form action={async (formData) => {
            if(!confirm('정말로 이 지식 노드를 삭제하시겠습니까?')) return;
            const res = await deleteBoardArticle(null, formData);
            if (res.success) {
              toast('지식 노드가 성공적으로 제거되었습니다.', 'success');
              queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
              router.push(`/admin/community/boards/selectBoardList?bbsId=${bbsId}`);
            }
          }}>
            <input type="hidden" name="bbsId" value={bbsId ?? ""} />
            <input type="hidden" name="pstId" value={pstId ?? ""} />
            <Button
              type="submit"
              variant="outline"
              className="h-14 w-20 rounded-2xl border-2 text-rose-500 border-rose-100 bg-rose-50/30 hover:bg-rose-500 hover:text-white shadow-xl hover:-translate-y-2 transition-all active:scale-95"
              aria-label="게시글 삭제"
            >
              <Trash2 size={24} />
            </Button>
          </form>
        </motion.div>
      </div>

      {/* --- Meta Info Bar --- */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-8 p-12 bg-white/60 backdrop-blur-xl rounded-3xl border-white border shadow-2xl ring-1 ring-black/5"
      >
        <MetaItem icon={<User size={20} />} label="Contributor" value={article.frstRgtrId || 'System'} />
        <MetaItem icon={<Calendar size={20} />} label="Timestamp" value={article.crtDt || 'Today'} />
        <MetaItem icon={<Eye size={20} />} label="Global Reach" value={`${(article.inqCnt || 0).toLocaleString()} Views`} />
        <MetaItem icon={<Share2 size={20} />} label="Integrity" value="Verified Node" />
      </motion.div>

      {/* --- CONTENT AREA --- */}
      <div className="relative group">
        <div className="absolute -inset-10 bg-gradient-to-br from-primary/10 via-transparent to-indigo-500/10 blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative bg-white/80 backdrop-blur-3xl rounded-[3rem] p-16 md:p-32 border border-white shadow-[0_80px_150px_-30px_rgba(0,0,0,0.1)] overflow-hidden ring-1 ring-black/5"
        >
          <div className="absolute top-0 right-0 p-16 opacity-[0.02] grayscale pointer-events-none group-hover:rotate-12 group-hover:scale-110 transition-transform duration-1000">
            <Quote size={300} className="text-primary" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span className="h-[3px] w-16 bg-gradient-to-r from-primary to-transparent rounded-full" />
                <p className="text-[10px] font-black tracking-[0.8em] text-primary uppercase leading-none ">
                  {tmpltId === 'TMPLT_QNA' ? (article.qnaCatCd || 'Q&A_TECHNICAL_CONSULT') : 'CORE_KNOWLEDGE_PAYLOAD'}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "prose prose-2xl dark:prose-invert prose-slate max-w-none transition-all duration-700",
                tmpltId === 'TMPLT_HUB' ? "prose-p:text-slate-900 font-bold" : "text-slate-800",
                "font-medium leading-[1.7] tracking-tight",
                "prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:text-slate-900",
                "prose-p:my-12",
                "prose-blockquote:border-l-[8px] prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:px-14 prose-blockquote:py-12 prose-blockquote:rounded-3xl prose-blockquote:not-italic prose-blockquote:text-slate-900 prose-blockquote:font-black",
                "prose-code:bg-slate-100 prose-code:p-1.5 prose-code:rounded-lg prose-code:font-black prose-pre:bg-slate-900 prose-pre:p-10 prose-pre:rounded-3xl prose-pre:shadow-2xl"
              )}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.pstCn || (article as any).knoCn || '') }}
            />

            <div className="pt-32 flex items-center justify-center opacity-10">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              <div className="px-12"><FileText size={40} className="text-slate-400" /></div>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- Attachments Section --- */}
      {article.atchFileId && (
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-slate-900 rounded-[2.5rem] p-16 shadow-2xl relative overflow-hidden group border border-white/10"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
            <Package size={120} className="text-white" />
          </div>
          <div className="relative z-10 space-y-12">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                <Download size={32} />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black tracking-[0.4em] text-primary uppercase">Encrypted_Assets</p>
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">Associated Data Payloads</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-8 bg-white/5 rounded-2xl border border-white/10 hover:bg-white hover:text-slate-900 transition-all cursor-pointer group/file shadow-lg">
                <div className="flex items-center gap-5">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover/file:bg-primary/20 transition-colors">
                    <FileText size={24} className="text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-black tracking-tight leading-none mb-1">Technical_Spec_Unit_{pstId?.slice(-4)}.pdf</span>
                    <span className="text-[10px] font-bold opacity-40 uppercase tracking-widest">3.4 MB • PDF Document</span>
                  </div>
                </div>
                <div className="p-3 bg-white/10 rounded-xl group-hover/file:bg-slate-900 group-hover/file:text-white transition-all">
                  <Download size={20} aria-label="파일 다운로드" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- Comments Section --- */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <CommentSection 
          bbsId={bbsId!} 
          pstId={pstId!} 
          initialComments={initialData.initialComments} 
        />
      </motion.div>
    </motion.div>
  );
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-6 p-2 group cursor-default">
      <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-primary shadow-inner border border-slate-100 transition-all group-hover:rotate-12 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
        {icon}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] leading-none">{label}</p>
        <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}
