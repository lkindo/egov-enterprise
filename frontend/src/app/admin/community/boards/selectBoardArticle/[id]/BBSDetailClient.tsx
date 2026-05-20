'use client';

import React, { useState, Suspense, useActionState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import client from '@/lib/api/client';
import { saveBoardArticle } from '@/app/actions/boardActions';
import { knowledgeService } from '@/services/business/knowledge/knowledgeService';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Edit3,
  Send,
  ArrowLeft,
  MessageSquare,
  Type,
  FileText,
  Paperclip,
  CheckCircle2,
  ShieldCheck,
  Calendar
} from "lucide-react";
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { StandardForm } from '@/app/components/ui/standard-form';
import { useToast } from '@/app/components/ui/toast';
import { DynamicBreadcrumb } from '@/app/components/layout/DynamicBreadcrumb';

const BBSDetailClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const bbsId = searchParams.get('bbsId') || 'BBSMSTR_AAAAAAAAAAAA';
  const pstId = searchParams.get('pstId') || '';
  const isEdit = !!pstId;

  const [state, formAction, isPending] = useActionState(saveBoardArticle, null);
  const queryClient = useQueryClient();

  // 마스터 정보 조회 (템플릿 확인용)
  const { data: masterInfo } = useQuery({
    queryKey: ['board-master', bbsId],
    queryFn: () => client.get<any>(`/admin/system/board-masters/${bbsId}`),
    enabled: !!bbsId,
  });

  // 수정 모물일 때 게시글 상세 정보 조회
  const { data: article } = useQuery({
    queryKey: ['article-detail', bbsId, pstId],
    queryFn: () => knowledgeService.getArticle(bbsId, pstId),
    enabled: !!bbsId && !!pstId,
  });

  const tmplatId = masterInfo?.tmplatId || 'TMPLT_LIST';

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEventDate, setSelectedEventDate] = useState<string>(new Date().toISOString());

  useEffect(() => {
    if (article) {
      if (article.qnaCategory || (article as any).qnaCatCd) {
        setSelectedCategory(article.qnaCategory || (article as any).qnaCatCd);
      }
      if (article.eventDate) {
        setSelectedEventDate(article.eventDate);
      }
    }
  }, [article]);

  useEffect(() => {
    if (state?.success) {
      toast(state.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
      queryClient.invalidateQueries({ queryKey: ['article-detail', bbsId] });
      if (state.redirect) {
        router.push(state.redirect);
      }
    } else if (state && !state.success) {
      toast(state.message, 'error');
    }
  }, [state, router, toast, queryClient, bbsId]);

  const [attachedFiles, setFiles] = useState<File[]>([]);

  return (
    <div className="flex flex-col gap-8 p-6 max-w-5xl mx-auto w-full pb-32 animate-in fade-in duration-700">
      {/* Breadcrumb - 동적 메뉴 시스템 연동 */}
      <DynamicBreadcrumb 
        customItems={[
          { name: pathname?.includes('/admin/system') ? '시스템 관리' : '커뮤니티 및 콘텐츠' },
          { name: '게시물 상세' },
          { name: pathname?.includes('insertBoardArticle') ? '신규 작성' : '수정' }
        ]}
      />

      <Card className="shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] border-none overflow-hidden rounded-lg bg-card ring-1 ring-primary/5">
        <CardHeader className="border-b bg-slate-950 pb-20 pt-20 px-12 md:px-20 text-white relative overflow-hidden">
          {/* Background Accents */}
          <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-primary/20 rounded-lg blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-blue-500/10 rounded-lg blur-[100px]" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-10 relative z-10">
            <div className="space-y-6 text-center md:text-left">
              <div className={cn(
                "flex items-center gap-3 px-5 py-2 w-fit rounded-lg border backdrop-blur-xl mx-auto md:mx-0",
                tmplatId === 'TMPLT_QNA' ? "bg-amber-500/20 border-amber-500/30" : 
                tmplatId === 'TMPLT_HUB' ? "bg-indigo-500/20 border-indigo-500/30" :
                tmplatId === 'TMPLT_FAQ' ? "bg-purple-500/20 border-purple-500/30" :
                tmplatId === 'TMPLT_WIKI' ? "bg-emerald-500/20 border-emerald-500/30" :
                tmplatId === 'TMPLT_GALLERY' ? "bg-rose-500/20 border-rose-500/30" :
                tmplatId === 'TMPLT_CALENDAR' ? "bg-cyan-500/20 border-cyan-500/30" :
                "bg-white/10 border-white/10"
              )}>
                <Edit3 className={cn(
                  "w-4 h-4 animate-bounce", 
                  tmplatId === 'TMPLT_QNA' ? "text-amber-400" : 
                  tmplatId === 'TMPLT_HUB' ? "text-indigo-400" :
                  tmplatId === 'TMPLT_FAQ' ? "text-purple-400" :
                  tmplatId === 'TMPLT_WIKI' ? "text-emerald-400" :
                  tmplatId === 'TMPLT_GALLERY' ? "text-rose-400" :
                  tmplatId === 'TMPLT_CALENDAR' ? "text-cyan-400" :
                  "text-primary"
                )} />
                <span className="text-xs font-bold tracking-[0.3em] text-white">
                  {pathname?.includes('insertBoardArticle') ? 'NEW POST : ' : 'EDIT : '} 
                  {tmplatId === 'TMPLT_HUB' ? 'KNOWLEDGE_BASE' : 
                   tmplatId === 'TMPLT_GALLERY' ? 'MEDIA_ASSET' : 
                   tmplatId === 'TMPLT_QNA' ? 'CONSULT_SESSION' : 
                   tmplatId === 'TMPLT_CALENDAR' ? 'EVENT_LOG' : 
                   tmplatId === 'TMPLT_FAQ' ? 'FAQ_CONTENT' :
                   tmplatId === 'TMPLT_WIKI' ? 'WIKI_ARTICLE' : 'BOARD'}
                </span>
              </div>
              <CardTitle className="text-3xl md:text-3xl font-bold tracking-tighter leading-tight ">
                {pathname?.includes('insertBoardArticle') ? '새로운 통찰을' : '내용을 수정하여'} <br />
                <span className="text-primary underline decoration-8 decoration-primary/20 underline-offset-8">Insight</span> 공유하세요
              </CardTitle>
              <p className="text-slate-400 font-medium text-lg max-w-lg leading-relaxed">
                {tmplatId === 'TMPLT_QNA' 
                  ? '궁금한 점을 상세히 적어주시면 정확한 답변을 드릴 수 있습니다.'
                  : '새로운 아이디어나 소식을 공유하여 커뮤니티의 가치를 높여주세요.'}
              </p>
            </div>
            <div className="hidden lg:block relative">
              <div className="w-32 h-32 rounded-lg bg-gradient-to-br from-primary/20 to-transparent border-2 border-white/10 flex items-center justify-center rotate-12 hover:rotate-0 transition-all duration-700 shadow-2xl">
                <MessageSquare className="w-12 h-12 text-white/40" />
              </div>
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-lg bg-primary flex items-center justify-center shadow-xl animate-bounce duration-[2000ms]">
                <Send size={20} className="text-white ml-1" />
              </div>
            </div>
          </div>
        </CardHeader>

        <StandardForm action={formAction} key={article?.pstId || 'new'}>
          <input type="hidden" name="bbsId" value={bbsId} />
          <input type="hidden" name="pstId" value={pstId} />
          <input type="hidden" name="qnaCatCd" value={selectedCategory} />
          <input type="hidden" name="eventDate" value={selectedEventDate} />
          <CardContent className="pt-20 px-12 md:px-20 space-y-20">
            {/* 제목 입력 */}
            <div className="space-y-6 group">
              <div className="flex items-center justify-between">
                <Label htmlFor="pstTtl" className={cn(
                  "text-xs font-bold tracking-[0.3em] text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-3",
                  tmplatId === 'TMPLT_QNA' && "group-focus-within:text-amber-500"
                )}>
                  <Type className="w-4 h-4" /> 01. {tmplatId === 'TMPLT_QNA' ? 'QUESTION TITLE' : 'POST TITLE'}
                </Label>
                <span className="text-xs font-bold text-primary/40 tracking-tight">필수</span>
              </div>
              <Input
                id="pstTtl"
                name="pstTtl"
                defaultValue={article?.pstTtl || ''}
                placeholder={tmplatId === 'TMPLT_QNA' ? "질문 제목을 입력하세요." : "매력적이고 명확한 제목을 입력하세요."}
                className={cn(
                  "h-11 text-3xl font-bold border-2 border-primary/5 focus:border-primary focus-visible:ring-primary/10 transition-all rounded-lg px-8 bg-muted/30 shadow-inner group-focus-within:shadow-2xl group-focus-within:bg-background placeholder:text-muted-foreground/30",
                  tmplatId === 'TMPLT_QNA' && "focus:border-amber-500 focus-visible:ring-amber-500/10",
                  state?.field === 'pstTtl' && "border-rose-500 bg-rose-50"
                )}
                required
              />
            </div>

            {tmplatId === 'TMPLT_QNA' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Label className="text-xs font-bold tracking-[0.3em] text-amber-500 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4" /> CATEGORY_SELECT
                </Label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {['TECHNICAL', 'HR_POLICY', 'PROJECT_MGMT', 'GENERAL'].map(cat => (
                    <Button 
                      key={cat} 
                      variant={selectedCategory === cat ? 'default' : 'outline'}
                      type="button" 
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "h-11 font-bold text-xs tracking-widest border-2 transition-all rounded-lg",
                        selectedCategory === cat ? "bg-amber-500 border-amber-500 text-white" : "border-amber-100 hover:border-amber-500 hover:bg-amber-50 text-amber-500"
                      )}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {tmplatId === 'TMPLT_CALENDAR' && (
              <div className="p-10 bg-cyan-900/10 border-2 border-cyan-500/20 rounded-lg flex flex-col md:flex-row items-center gap-8 animate-in slide-in-from-right-4 duration-500">
                 <div className="w-16 h-11 bg-cyan-500 rounded-lg flex items-center justify-center text-white shadow-xl shadow-cyan-500/20 shrink-0">
                    <Calendar size={32} />
                 </div>
                 <div className="flex-1 space-y-4">
                    <div className="space-y-1">
                        <p className="text-sm font-bold text-cyan-700 uppercase tracking-tighter">Event Schedule</p>
                        <p className="text-xs text-cyan-600/70 font-medium">행사가 진행될 정확한 일시를 지정해 주세요.</p>
                    </div>
                    <Input 
                        type="datetime-local" 
                        value={selectedEventDate.slice(0, 16)} 
                        onChange={(e) => setSelectedEventDate(new Date(e.target.value).toISOString())}
                        className="max-w-xs border-cyan-200 focus:border-cyan-500 focus:ring-cyan-500/20"
                    />
                 </div>
              </div>
            )}

            {/* 본문 입력 영역 */}
            <div className="space-y-6 group">
              <div className="flex items-center justify-between">
                <Label htmlFor="pstCn" className={cn(
                  "text-xs font-bold tracking-[0.3em] text-muted-foreground group-focus-within:text-primary transition-colors flex items-center gap-3",
                  tmplatId === 'TMPLT_QNA' && "group-focus-within:text-amber-500"
                )}>
                  <FileText className="w-4 h-4" /> 02. {tmplatId === 'TMPLT_QNA' ? 'DETAIL QUESTION' : 'CONTENT BODY'}
                </Label>
                <span className="text-xs font-bold text-primary/40 tracking-tight">필수</span>
              </div>
              <div className="relative">
                <Textarea
                  id="pstCn"
                  name="pstCn"
                  defaultValue={article?.pstCn || ''}
                  placeholder={
                    tmplatId === 'TMPLT_QNA' 
                      ? "질문 내용을 자세히 기재해 주시면 더 정확한 답변을 받으실 수 있습니다..."
                      : "전달하고자 하는 내용을 상세히 작성하세요..."
                  }
                  className={cn(
                    "min-h-[500px] p-10 text-xl font-medium leading-loose border-2 border-primary/5 focus:border-primary focus-visible:ring-primary/10 transition-all rounded-lg bg-muted/30 shadow-inner group-focus-within:shadow-2xl group-focus-within:bg-background resize-none",
                    tmplatId === 'TMPLT_QNA' && "focus:border-amber-500 focus-visible:ring-amber-500/10",
                    state?.field === 'pstCn' && "border-rose-500 bg-rose-50"
                  )}
                  required
                />
                <div className="absolute bottom-8 right-10 flex items-center gap-2.5 text-xs font-bold text-muted-foreground/40 tracking-[0.2em] pointer-events-none bg-muted/50 px-4 py-2 rounded-lg border border-primary/5 backdrop-blur-sm">
                  <div className="w-2 h-2 rounded-lg bg-emerald-500 animate-pulse" /> {tmplatId === 'TMPLT_QNA' ? 'DRAFTING_QNA' : '임시 저장 중'}
                </div>
              </div>
            </div>

            {/* 파일 첨부 영역 */}
            <div className="space-y-6 group">
              <Label className="text-xs font-bold tracking-[0.3em] text-muted-foreground flex items-center gap-3">
                <Paperclip className="w-4 h-4" /> 03. 첨부 파일
              </Label>
              <div className="p-8 rounded-lg border-2 border-dashed border-primary/10 bg-muted/20 hover:border-primary/30 transition-all">
                <StandardFileUploader
                  onFilesChange={setFiles}
                  maxFiles={5}
                  maxSizeMB={20}
                />
              </div>
            </div>

            {/* 보안 공지 */}
            <div className="p-10 bg-slate-900 rounded-lg flex flex-col md:flex-row items-center gap-10 shadow-2xl relative overflow-hidden group/notice">
              <div className="absolute right-[-20%] top-[-50%] bg-primary/20 w-[400px] h-[400px] rounded-lg blur-[100px] group-hover/notice:bg-primary/30 transition-all duration-1000" />
              <div className="w-20 h-11 bg-slate-800 rounded-lg border border-slate-700 shadow-2xl flex items-center justify-center shrink-0 group-hover/notice:rotate-12 transition-transform">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-3 relative z-10 text-center md:text-left">
                <p className="font-bold text-2xl text-white tracking-tight ">보안 준수 사항</p>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[450px]">
                  작성하신 정보는 프로젝트 자산으로 등록됩니다. <br />민감한 개인정보나 기밀 정보가 포함되지 않도록 주의해 주세요.
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col md:flex-row justify-center gap-6 py-20 border-t border-primary/5 bg-muted/5 px-12 md:px-20 rounded-b-[3.5rem]">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="h-11 px-16 font-bold tracking-[0.3em] text-sm text-muted-foreground hover:bg-background hover:text-rose-500 hover:shadow-2xl transition-all rounded-lg active:scale-95 border-2 border-transparent"
            >
              <ArrowLeft className="w-5 h-5 mr-4" /> 이전으로
            </Button>
            <Button
              type="submit"
              className="h-11 px-24 gap-4 font-bold tracking-[0.3em] text-sm shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white transition-all active:scale-95 ring-[12px] ring-primary/5 rounded-lg"
              disabled={isPending}
            >
              {isPending ? (
                <span className="flex items-center gap-3 animate-pulse">
                  <div className="w-3 h-3 bg-white rounded-lg" /> 처리 중...
                </span>
              ) : (
                <>
                  <Send className="w-5 h-5" /> 저장하기
                </>
              )}
            </Button>
          </CardFooter>
        </StandardForm>
      </Card>
    </div>
  );
};

export default BBSDetailClient;
