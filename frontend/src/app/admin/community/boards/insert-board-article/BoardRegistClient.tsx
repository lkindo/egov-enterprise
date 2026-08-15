'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Zap,
  Layers, Package, Monitor, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/app/components/ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { saveBoardArticle } from '@/app/actions/boardActions';
import dynamic from 'next/dynamic';
import { useAutoSaveDraft } from '@/hooks/use-auto-save-draft';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppForm } from '@/hooks/useAppForm';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { motion } from 'framer-motion';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});

import { BoardSaveRequestSchema } from '@/types/generated-zod';

const boardSchema = BoardSaveRequestSchema.extend({
  pstSn: z.coerce.number().int().positive().optional(),
  parnts: z.coerce.number().int().positive().optional(),
  replyYn: z.string().optional(),
});

type BoardFormValues = z.infer<typeof boardSchema>;

interface BoardRegistClientProps {
  initialData?: any;
  bbsId: string;
  pstSn?: number;
  parnts?: number;
}

export function BoardRegistClient({ initialData, bbsId, pstSn, parnts }: BoardRegistClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useAppForm(boardSchema, {
    defaultValues: {
      bbsId: bbsId,
      pstSn: pstSn || initialData?.pstSn,
      pstTtl: initialData?.pstTtl || '',
      pstCn: initialData?.pstCn || '',
      userNm: initialData?.userNm || '관리자',
      pswd: initialData?.pswd || '1',
      parnts: parnts || initialData?.parnts,
      replyYn: (parnts || initialData?.replyYn === 'Y') ? 'Y' : 'N',
      // 기존 글에 첨부가 없으면 API는 null을 반환한다. 생성 스키마의 optional()은
      // undefined만 허용하므로 수정 폼 경계에서 null을 제거한다.
      atchFileSn: initialData?.atchFileSn ?? undefined,
      scrtYn: initialData?.scrtYn || 'N',
      useYn: initialData?.useYn || 'Y',
    } as BoardFormValues
  });

  // 자동 임시저장 훅 연동
  const { restoreDraft, clearDraft, hasDraft } = useAutoSaveDraft({
    storageKey: `board_insert_${bbsId}`,
    getData: () => ({
      title: form.getValues('pstTtl'),
      content: form.getValues('pstCn')
    }),
    onRestore: (data) => {
      form.setValue('pstTtl', data.title);
      form.setValue('pstCn', data.content);
    }
  });

  // 페이지 진입 시 임시저장 데이터 확인 및 복구 제안
  useEffect(() => {
    if (hasDraft && !form.getValues('pstTtl') && !form.getValues('pstCn') && !pstSn) {
      if (confirm('이전에 작성 중이던 임시저장 데이터가 있습니다. 복구하시겠습니까?')) {
        restoreDraft();
        toast('임시저장 데이터를 복구했습니다.', 'success');
      }
    }
  }, [hasDraft, restoreDraft, toast, pstSn, form]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = async (values: BoardFormValues) => {
    // Debug log removed for Zero-Tolerance clean console requirement
    if (!values.pstCn || values.pstCn === '<p></p>') {
      toast('내용을 입력해 주세요.', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Props 또는 initialData의 pstSn가 존재하는 경우 확실하게 폼 데이터에 추가하여 수정(PUT) 분기 작동 보장
      const activePstSn = pstSn || initialData?.pstSn;
      if (activePstSn) {
        formData.append('pstSn', activePstSn.toString());
      }

      const result = await saveBoardArticle(null, formData);
      // Debug log removed for Zero-Tolerance clean console requirement
      
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
        clearDraft();
        toast(result.message || '저장되었습니다.', 'success');
        router.push(result.redirect || `/admin/community/boards/select-board-list?bbsId=${bbsId}`);
      } else {
        toast(result.message || '저장 중 오류가 발생했습니다.', 'error');
      }
    } catch (err) {
      console.error('>>> [BoardRegistClient] Submit error thrown:', err);
      toast('등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto space-y-16 pb-24 pt-8 min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-16 pb-24 pt-8 relative"
    >
      {/* Decorative Background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header section */}
      <div className="flex items-center gap-10 px-4">
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="w-16 h-16 rounded-2xl border-2 border-border group hover:bg-surface-inverse transition-all duration-500 shadow-xl"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="group-hover:text-white transition-all w-8 h-8" />
          </Button>
        </motion.div>
        <div className="space-y-3">
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-4"
          >
            <span className="text-[10px] font-black tracking-[0.2em] text-primary leading-none px-4 py-2 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">커뮤니티 게시판</span>
          </motion.div>
          <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-black text-foreground tracking-tighter leading-none"
          >
            {pstSn ? '게시글 수정' : '새 게시글 작성'}
          </motion.h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, () => {})} className="space-y-12 px-4">
          {/* Title Input Area */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-12 bg-white/70 backdrop-blur-3xl rounded-[2.5rem] border border-white shadow-2xl relative overflow-hidden group ring-1 ring-black/5"
          >
            <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none group-focus-within:opacity-10 transition-opacity">
              <Layers size={180} className="rotate-12 text-foreground" />
            </div>
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                  <Zap size={24} />
                </div>
                <FormLabel className="text-[10px] font-black tracking-[0.1em] text-muted-foreground">제목</FormLabel>
              </div>
              <FormField
                control={form.control}
                name="pstTtl"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="article-title-input"
                        className="h-16 bg-transparent border-none text-foreground text-4xl font-black placeholder:text-muted-foreground focus-visible:ring-0 p-0 tracking-tighter"
                        placeholder="INJECT SUBJECT LINE..."
                        autoFocus
                        aria-label="게시글 제목"
                      />
                    </FormControl>
                    <FormMessage className="font-black text-rose-500 uppercase text-[10px] tracking-widest pt-2" />
                  </FormItem>
                )}
              />
              <div className="h-[2px] w-full bg-gradient-to-r from-primary to-transparent opacity-30" />
            </div>
          </motion.div>

          {/* Content Editor Area */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-inverse flex items-center justify-center text-white shadow-lg">
                  <Package size={20} />
                </div>
                <h3 className="text-[10px] font-black text-foreground tracking-[0.1em]">본문 내용</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-black text-muted-foreground tracking-tight">작성 중</span>
              </div>
            </div>
            <FormField
              control={form.control}
              name="pstCn"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="rounded-[2.5rem] overflow-hidden border-2 border-border bg-card shadow-2xl" data-testid="rich-text-editor">
                      <RichTextEditor
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="내용을 입력하세요..."
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="font-black text-rose-500 uppercase text-[10px] tracking-widest pt-4 pl-4" />
                </FormItem>
              )}
            />
          </motion.div>

          {/* Bottom Actions Matrix */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-between gap-10 pt-12 border-t-2 border-border"
          >
            <div className="flex items-center gap-10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] leading-none mb-2">게시판 유형</span>
                <span className="text-sm font-black text-foreground uppercase tracking-tight">{bbsId.split('_')[1] || 'CORE'}</span>
              </div>
              <div className="w-[2px] h-10 bg-muted" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em] leading-none mb-2">보안 등급</span>
                <span className="text-sm font-black text-emerald-500 uppercase tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 인증됨
                </span>
              </div>
            </div>

            <div className="flex items-center gap-5 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="h-16 flex-1 sm:flex-none px-12 rounded-[1.5rem] border-2 border-border font-black tracking-widest text-[10px] uppercase hover:bg-muted transition-all active:scale-95"
                aria-label="취소"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-16 flex-1 sm:flex-none px-16 rounded-[1.5rem] bg-surface-inverse text-white font-black tracking-widest text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] gap-4 group"
                aria-label="게시글 저장"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} className="group-hover:rotate-12 transition-transform" /> 저장
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </form>
      </Form>

      {/* Footer Insight */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pt-8"
      >
        <div className="inline-flex items-center gap-4 px-8 py-3 bg-card rounded-2xl border border-border shadow-xl">
          <Monitor size={16} className="text-slate-200" />
          <span className="text-[10px] font-black text-slate-200 uppercase tracking-[0.5em]">Enterprise Command Node - Unit Ver 3.0.0</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
