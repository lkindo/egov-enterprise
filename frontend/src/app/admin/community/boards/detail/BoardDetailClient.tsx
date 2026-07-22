'use client';

import React, { use, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Edit3, Trash2,
  Download,
  Calendar, Eye, User,
  FileText, Quote, AlertTriangle,
  Package, Plus, ThumbsUp
} from 'lucide-react';
import DOMPurify from 'isomorphic-dompurify';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { knowledgeService, KnowledgeDto } from '@/services/business/knowledge/knowledgeService';
import { boardUserService } from '@/services/business/user/board/BoardUserService';
import { fileService } from '@/services/foundation/file/FileService';
import { deleteBoardArticle } from '@/app/actions/boardActions';
import { BoardMaster } from '@/services/foundation/system/BoardAdminService';
import CommentSection from '@/components/features/comment/CommentSection';

import { CommentVO } from '@/types/business/comment';

interface BoardDetailClientProps {
  dataPromise: Promise<{
    article: KnowledgeDto | null;
    masterInfo: BoardMaster | null;
    initialComments: CommentVO[];
    /** 감사 P1-1: 서버 조회 실패 사유. null 이면 정상(또는 404 = 실제로 없는 글). */
    fetchError: string | null;
  }>;
}

import { motion } from 'framer-motion';

export function BoardDetailClient({ dataPromise }: BoardDetailClientProps) {
  const initialData = use(dataPromise);
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
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

  // 감사 P1-5/P1-6: 첨부 영역은 과거 "Technical_Spec_Unit_XXXX.pdf · 3.4 MB" 라는 존재하지 않는 파일을
  // 하드코딩해 보여주고, 다운로드 아이콘에는 핸들러조차 없었다. 이미 있는 fileService 로 실제 목록을 배선한다.
  const atchFileId = article?.atchFileId;
  const {
    data: attachments = [],
    isError: isAttachmentError,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['article-files', atchFileId],
    queryFn: () => fileService.getFileList(atchFileId!),
    enabled: !!atchFileId,
  });

  const tmpltId = masterInfo?.tmpltId || 'TMPLT_LIST';

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // 게시글 추천(좋아요) — 낙관적 UI: 클릭 즉시 카운트 증가 후 서버 반영(실패 시 롤백)
  const [likeDelta, setLikeDelta] = useState(0);
  const [liking, setLiking] = useState(false);
  const handleLike = async () => {
    if (liking || !bbsId || !pstId) return;
    setLiking(true);
    setLikeDelta((d) => d + 1);
    try {
      await boardUserService.likePost(bbsId, Number(pstId));
    } catch {
      setLikeDelta((d) => d - 1);
      toast('추천 처리 중 오류가 발생했습니다.', 'error');
    } finally {
      setLiking(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <div className="w-16 h-11 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase animate-pulse">게시글을 불러오는 중...</p>
      </div>
    );
  }

  // 감사 P1-1: 조회 장애(fetchError)와 '실제로 없는 글'(404)을 구분해 표시한다.
  if (!article && initialData.fetchError) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center min-h-[600px] space-y-6 text-center px-6">
        <AlertTriangle size={48} className="text-destructive" aria-hidden="true" />
        <div className="space-y-2">
          <p className="text-xl font-bold text-foreground">게시글을 불러오지 못했습니다</p>
          <p className="text-sm font-medium text-muted-foreground max-w-md">{initialData.fetchError}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => router.refresh()}>다시 시도</Button>
          <Button variant="outline" onClick={() => router.back()}>목록으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <p className="text-sm font-bold tracking-widest text-muted-foreground">게시글을 찾을 수 없습니다. 삭제되었거나 주소가 올바르지 않습니다.</p>
        <Button onClick={() => router.back()} aria-label="뒤로 가기">목록으로 돌아가기</Button>
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b-2 border-border pb-16 relative">
        <div className="space-y-8 relative z-10">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
          >
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="group px-0 hover:bg-transparent text-muted-foreground hover:text-primary transition-colors flex items-center gap-4"
              aria-label="뒤로 가기"
            >
              <div className="p-2 bg-card rounded-xl shadow-sm border border-border group-hover:shadow-md transition-all">
                <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
              </div>
              <span className="text-xs font-black tracking-[0.4em] uppercase">목록으로</span>
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
                {masterInfo?.bbsTtl || '게시판'}
              </Badge>
              <div className="h-[2px] w-10 bg-gradient-to-r from-primary/30 to-transparent" />
              <span className="text-[10px] font-black text-muted-foreground tracking-[0.3em] uppercase">게시글 번호: {pstId}</span>
            </motion.div>
            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-6xl md:text-7xl font-black text-foreground tracking-tighter leading-[0.85] uppercase max-w-4xl"
            >
              {article.pstTtl || article.knoNm}
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
            onClick={() => router.push(`/admin/community/boards/insert-board-article?bbsId=${bbsId}&pstId=${pstId}`)}
            className="h-14 px-10 rounded-2xl border-2 border-border bg-card/50 backdrop-blur-md font-black text-[10px] tracking-[0.2em] uppercase gap-4 shadow-xl hover:-translate-y-2 transition-all active:scale-95"
            aria-label="게시글 수정"
          >
            <Edit3 size={20} className="text-primary" /> 수정
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/admin/community/boards/insert-board-article?bbsId=${bbsId}&parnts=${pstId}&replyYn=Y`)}
            className="h-14 px-10 rounded-2xl border-2 border-border bg-card/50 backdrop-blur-md font-black text-[10px] tracking-[0.2em] uppercase gap-4 shadow-xl hover:-translate-y-2 transition-all active:scale-95"
            aria-label="게시글 답글 작성"
          >
            <Plus size={20} className="text-primary" /> 답글
          </Button>
          <Button
            variant="outline"
            onClick={handleLike}
            disabled={liking}
            className="h-14 px-10 rounded-2xl border-2 border-border bg-card/50 backdrop-blur-md font-black text-[10px] tracking-[0.2em] uppercase gap-4 shadow-xl hover:-translate-y-2 transition-all active:scale-95"
            aria-label="게시글 추천"
          >
            <ThumbsUp size={20} className="text-primary" /> 추천 {(article.likeCnt ?? 0) + likeDelta}
          </Button>
          {/*
            감사 P1-9: native confirm() → useConfirm(변형 destructive).
            본문에 대상 게시글 제목을 노출하고, 실패(res.success === false)도 삼키지 않고 토스트로 드러낸다.
          */}
          <form action={async (formData) => {
            const isConfirmed = await confirm({
              title: '게시글 삭제',
              message: `[${article.pstTtl || '제목 없음'}] 게시글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
              confirmText: '삭제',
              variant: 'destructive'
            });
            if (!isConfirmed) return;

            try {
              const res = await deleteBoardArticle(null, formData);
              if (res.success) {
                toast('게시글이 삭제되었습니다.', 'success');
                queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
                router.push(`/admin/community/boards/select-board-list?bbsId=${bbsId}`);
              } else {
                toast(res.message || '게시글 삭제에 실패했습니다.', 'error');
              }
            } catch (err: unknown) {
              toast(err instanceof Error && err.message ? err.message : '게시글 삭제 중 오류가 발생했습니다.', 'error');
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
        /* 감사 P1-5: 'Integrity: Verified Node' 는 어떤 검증도 수행하지 않는 고정 문구라 카드 자체를 삭제하고,
           실제 응답 필드로 계산 가능한 3개만 남긴다. */
        className="grid grid-cols-1 sm:grid-cols-3 gap-8 p-12 bg-card/60 backdrop-blur-xl rounded-3xl border border-border shadow-2xl ring-1 ring-black/5"
      >
        <MetaItem icon={<User size={20} />} label="작성자" value={article.frstRegisterNm || article.frstRgtrId || '-'} />
        <MetaItem icon={<Calendar size={20} />} label="등록일" value={article.crtDt || '-'} />
        <MetaItem icon={<Eye size={20} />} label="조회수" value={`${(article.inqCnt || 0).toLocaleString()}회`} />
      </motion.div>

      {/* --- CONTENT AREA --- */}
      <div className="relative group">
        <div className="absolute -inset-10 bg-gradient-to-br from-primary/10 via-transparent to-hub-indigo/10 blur-[120px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

        <motion.div 
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="relative bg-card/80 backdrop-blur-3xl rounded-[3rem] p-16 md:p-32 border border-white shadow-[0_80px_150px_-30px_rgba(0,0,0,0.1)] overflow-hidden ring-1 ring-black/5"
        >
          <div className="absolute top-0 right-0 p-16 opacity-[0.02] grayscale pointer-events-none group-hover:rotate-12 group-hover:scale-110 transition-transform duration-1000">
            <Quote size={300} className="text-primary" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto space-y-20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <span className="h-[3px] w-16 bg-gradient-to-r from-primary to-transparent rounded-full" />
                <p className="text-[10px] font-black tracking-[0.8em] text-primary uppercase leading-none ">
                  {tmpltId === 'TMPLT_QNA' ? (article.qnaCatCd || 'Q&A') : '본문'}
                </p>
              </div>
            </div>

            <div
              className={cn(
                "prose prose-2xl dark:prose-invert prose-slate max-w-none transition-all duration-700",
                tmpltId === 'TMPLT_HUB' ? "prose-p:text-foreground font-bold" : "text-foreground",
                "font-medium leading-[1.7] tracking-tight",
                "prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-headings:text-foreground",
                "prose-p:my-12",
                "prose-blockquote:border-l-[8px] prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:px-14 prose-blockquote:py-12 prose-blockquote:rounded-3xl prose-blockquote:not-italic prose-blockquote:text-foreground prose-blockquote:font-black",
                "prose-code:bg-muted prose-code:p-1.5 prose-code:rounded-lg prose-code:font-black prose-pre:bg-surface-inverse prose-pre:p-10 prose-pre:rounded-3xl prose-pre:shadow-2xl"
              )}
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.pstCn || article.knoCn || '') }}
            />

            <div className="pt-32 flex items-center justify-center opacity-10">
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <div className="px-12"><FileText size={40} className="text-muted-foreground" /></div>
              <div className="h-[2px] flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- 첨부파일 --- */}
      {atchFileId && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-surface-inverse rounded-[2.5rem] p-16 shadow-2xl relative overflow-hidden group border border-white/10"
        >
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-125 group-hover:rotate-12 transition-transform duration-1000">
            <Package size={120} className="text-surface-inverse-foreground" aria-hidden="true" />
          </div>
          <div className="relative z-10 space-y-12">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-primary border border-white/5 shadow-inner">
                <Download size={32} aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black tracking-[0.4em] text-primary">첨부</p>
                <h3 className="text-2xl font-black text-surface-inverse-foreground tracking-tighter">첨부파일 {attachments.length > 0 ? `${attachments.length}건` : ''}</h3>
              </div>
            </div>

            {isAttachmentError ? (
              <div role="alert" className="flex flex-wrap items-center gap-4 p-8 bg-white/5 rounded-2xl border border-destructive/40">
                <span className="text-sm font-bold text-surface-inverse-foreground">첨부파일 목록을 불러오지 못했습니다.</span>
                <Button type="button" variant="outline" onClick={() => void refetchAttachments()} className="h-10 px-6 rounded-xl">
                  다시 시도
                </Button>
              </div>
            ) : attachments.length === 0 ? (
              <p className="text-sm font-bold text-surface-inverse-foreground/60">등록된 첨부파일이 없습니다.</p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {attachments.map((file) => (
                  <li key={`${file.atchFileId}-${file.fileSn}`}>
                    <button
                      type="button"
                      onClick={() => fileService.downloadFile(file.atchFileId, file.fileSn)}
                      aria-label={`${file.orignlFileNm} 다운로드`}
                      className="w-full flex items-center justify-between text-left p-8 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group/file shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="p-3 bg-primary/10 rounded-xl group-hover/file:bg-primary/20 transition-colors shrink-0">
                          <FileText size={24} className="text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-black tracking-tight leading-none mb-1 text-surface-inverse-foreground truncate">{file.orignlFileNm}</span>
                          <span className="text-[10px] font-bold text-surface-inverse-foreground/50 tracking-widest">
                            {formatFileSize(file.fileMg)}{file.fileExtsn ? ` · ${file.fileExtsn.toUpperCase()}` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl text-surface-inverse-foreground shrink-0">
                        <Download size={20} aria-hidden="true" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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

/** 바이트 단위 파일 크기를 사람이 읽는 표기로 변환한다. */
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '크기 정보 없음';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-6 p-2 group cursor-default">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-primary shadow-inner border border-border transition-all group-hover:rotate-12 group-hover:scale-110 group-hover:bg-primary group-hover:text-white">
        {icon}
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em] leading-none">{label}</p>
        <p className="text-lg font-black text-foreground tracking-tighter leading-none">{value}</p>
      </div>
    </div>
  );
}
