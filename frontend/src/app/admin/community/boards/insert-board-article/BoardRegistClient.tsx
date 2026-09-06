'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Zap,
  Layers, Package, Loader2,
  Paperclip, Trash2, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/app/components/ui/toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { saveBoardArticle } from '@/app/actions/boardActions';
import dynamic from 'next/dynamic';
import { useAutoSaveDraft } from '@/hooks/use-auto-save-draft';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppForm } from '@/hooks/useAppForm';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormErrorSummary,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from '@/components/ui/form';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { fileService } from '@/services/foundation/file/FileService';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';

const RichTextEditor = dynamic(() => import('@/components/ui/RichTextEditor'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />
});

import { BoardSaveRequestSchema } from '@/types/generated-zod';

const boardSchema = BoardSaveRequestSchema.extend({
  pstSn: z.coerce.number().int().positive().optional(),
  pstCn: BoardSaveRequestSchema.shape.pstCn
    .min(1, '내용을 입력해 주세요.')
    .refine((value) => !/^<p>(?:<br\s*\/?>)?<\/p>$/i.test(value.trim()), '내용을 입력해 주세요.'),
});

type BoardFormValues = z.infer<typeof boardSchema>;
type BoardInitialData = Partial<BoardFormValues> & {
  userNm?: string;
  pswd?: string;
};

interface BoardRegistClientProps {
  initialData?: BoardInitialData | null;
  bbsId: string;
  pstSn?: number;
}

type AttachmentItem = Awaited<ReturnType<typeof fileService.getFileList>>[number];

/**
 * 서버가 돌려주는 날짜 문자열을 `<input type="date">` 값(yyyy-MM-dd)으로 맞춘다.
 * 게시 기간은 `yyyyMMdd` 로 저장되고(BoardService.normalizeYmd), 행사 일자는 LocalDateTime 문자열이라
 * 앞 10자만 쓴다. 해석할 수 없으면 비워 둔다 — 비운 값은 서버 액션이 undefined 로 정규화해
 * 기존 값을 유지한다(BoardService.updatePost 의 부분 갱신 계약).
 */
function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  if (/^\d{8}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return '';
}

const DATE_FIELDS = [
  { name: 'pstBgngYmd', label: '게시 시작일' },
  { name: 'pstEndYmd', label: '게시 종료일' },
  { name: 'evntDt', label: '행사/이벤트 일자' },
] as const;

function RichTextFieldControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { error, formMessageId, name } = useFormField();

  useEffect(() => {
    const syncAccessibility = () => {
      const editor = containerRef.current?.querySelector<HTMLElement>('.ProseMirror');
      if (!editor) return;
      editor.dataset.errorFocus = name;
      editor.dataset.formFieldName = name;
      editor.setAttribute('aria-required', 'true');
      if (error) {
        editor.setAttribute('aria-invalid', 'true');
        editor.setAttribute('aria-errormessage', formMessageId);
      } else {
        editor.setAttribute('aria-invalid', 'false');
        editor.removeAttribute('aria-errormessage');
      }
    };

    syncAccessibility();
    const observer = new MutationObserver(syncAccessibility);
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [error, formMessageId, name]);

  return (
    <div
      ref={containerRef}
      className="rounded-[2.5rem] overflow-hidden border-2 border-border bg-card shadow-2xl"
      data-testid="rich-text-editor"
    >
      <FormControl>
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder="내용을 입력하세요..."
          aria-label="게시글 본문 내용 (필수)"
        />
      </FormControl>
    </div>
  );
}

export function BoardRegistClient({ initialData, bbsId, pstSn }: BoardRegistClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const activeRecordId = pstSn ?? initialData?.pstSn;

  /*
   * [2026-09-05 DEC-OPS-034] 첨부는 두 갈래다.
   *  - 새 파일: 저장 시 서버 액션 FormData 의 `files` 로 실어 보낸다. 서버 액션은 이미 그 키를 읽어
   *    multipart(`/bbs/{bbsId}`)로 넘기고 있었지만 이 화면에는 파일 입력이 없어 한 번도 실린 적이 없었다.
   *  - 기존 파일(수정 모드): 목록을 보여 주고 건별로 지운다. 삭제 인가는 서버(FileAccessPolicy#assertDeletable)
   *    가 판정하므로 화면은 결과만 정직하게 보여 준다 — 거부(403)는 토스트로 드러낸다.
   */
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deletingFileKey, setDeletingFileKey] = useState<string | null>(null);
  // 같은 tick 의 연속 클릭은 state 갱신보다 먼저 들어오므로 동기 ref 로 잠근다(폼 검증 census 의 destructive action 계약).
  const deletingRef = useRef(false);
  // 임시저장 복구 확인은 한 번만 묻는다 — confirm 함수 참조가 렌더마다 바뀌어도 effect 가 다시 묻지 않게 한다.
  const draftPromptedRef = useRef(false);
  const existingAtchFileSn = initialData?.atchFileSn ?? undefined;
  const {
    data: attachments = [],
    isError: isAttachmentError,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['article-files', existingAtchFileSn],
    queryFn: () => fileService.getFileList(existingAtchFileSn!),
    enabled: !!existingAtchFileSn,
  });

  const attachmentKey = (file: AttachmentItem) => `${file.atchFileSn}-${file.fileSn}`;

  const handleDeleteAttachment = async (file: AttachmentItem) => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    const key = attachmentKey(file);
    setDeletingFileKey(key);
    try {
      const confirmed = await confirm({
        title: '첨부파일 삭제',
        message: `'${file.orignlFileNm}' 파일을 삭제합니다. 삭제한 파일은 복구할 수 없습니다.`,
        confirmText: '삭제',
        variant: 'destructive',
      });
      if (!confirmed) return;

      await fileService.deleteFile(file.atchFileSn, file.fileSn);
      toast('첨부파일을 삭제했습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['article-files', file.atchFileSn] });
    } catch (error) {
      toast(extractErrorMessage(error, '첨부파일을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'), 'error');
    } finally {
      deletingRef.current = false;
      setDeletingFileKey(null);
    }
  };
  const draftScope = useMemo(() => user ? {
    ownerId: user.esntlId ?? user.id,
    boardId: bbsId,
    action: activeRecordId ? 'update' as const : 'create' as const,
    recordId: activeRecordId ? String(activeRecordId) : 'new',
  } : null, [activeRecordId, bbsId, user]);

  const form = useAppForm(boardSchema, {
    defaultValues: {
      bbsId: bbsId,
      pstSn: pstSn || initialData?.pstSn,
      pstTtl: initialData?.pstTtl || '',
      pstCn: initialData?.pstCn || '',
      userNm: initialData?.userNm || '관리자',
      pswd: initialData?.pswd || '1',
      // 기존 글에 첨부가 없으면 API는 null을 반환한다. 생성 스키마의 optional()은
      // undefined만 허용하므로 수정 폼 경계에서 null을 제거한다.
      atchFileSn: initialData?.atchFileSn ?? undefined,
      scrtYn: initialData?.scrtYn || 'N',
      useYn: initialData?.useYn || 'Y',
      pstBgngYmd: toDateInputValue(initialData?.pstBgngYmd),
      pstEndYmd: toDateInputValue(initialData?.pstEndYmd),
      evntDt: toDateInputValue(initialData?.evntDt),
    } as BoardFormValues
  });

  // 자동 임시저장 훅 연동
  const { restoreDraft, clearDraft, hasDraft } = useAutoSaveDraft({
    scope: draftScope,
    legacyKeys: [`egov-draft-board_insert_${bbsId}`],
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
  //   [2026-09-05] native confirm() → useConfirm. 감사 D06-03 이 남긴 네이티브 confirm 4곳 중 하나였고,
  //   첨부 삭제가 같은 화면에 useConfirm 을 들이면서 이름이 겹쳐 함께 이행했다(문구·키보드·보조기술 동작 통일).
  useEffect(() => {
    if (draftPromptedRef.current) return;
    if (hasDraft && !form.getValues('pstTtl') && !form.getValues('pstCn') && !pstSn) {
      draftPromptedRef.current = true;
      void confirm({
        title: '임시저장 데이터 복구',
        message: '이전에 작성 중이던 임시저장 데이터가 있습니다. 복구하시겠습니까?',
        confirmText: '복구',
        cancelText: '새로 작성',
      }).then((restore) => {
        if (!restore) return;
        restoreDraft();
        toast('임시저장 데이터를 복구했습니다.', 'success');
      });
    }
  }, [confirm, hasDraft, restoreDraft, toast, pstSn, form]);

  const onSubmit = async (values: BoardFormValues) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      // 새로 붙인 파일 — 서버 액션이 `files` 키를 읽어 multipart 로 넘긴다(boardActions.saveBoardArticle).
      newFiles.forEach((file) => formData.append('files', file));

      // Props 또는 initialData의 pstSn가 존재하는 경우 확실하게 폼 데이터에 추가하여 수정(PUT) 분기 작동 보장
      const activePstSn = activeRecordId;
      if (activePstSn) {
        formData.append('pstSn', activePstSn.toString());
      }

      const result = await saveBoardArticle(null, formData);
      // Debug log removed for Zero-Tolerance clean console requirement
      
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['boardList', bbsId] });
        clearDraft();
        toast(pstSn ? '게시글을 수정했습니다.' : '게시글을 등록했습니다.', 'success');
        router.push(result.redirect || `/admin/community/boards/select-board-list?bbsId=${bbsId}`);
      } else {
        if (!form.applyServerErrors(result)) {
          toast('게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.', 'error');
        }
      }
    } catch (error) {
      if (!form.applyServerErrors(error)) {
        toast('게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.', 'error');
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

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
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-12 px-4">
          <FormErrorSummary
            labels={{
              pstTtl: '제목',
              pstCn: '본문 내용',
              pstBgngYmd: '게시 시작일',
              pstEndYmd: '게시 종료일',
              evntDt: '행사/이벤트 일자',
            }}
            onNavigate={form.focusError}
            className="scroll-mt-6"
          />
          {/* Title Input Area */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-12 bg-card/95 backdrop-blur-3xl rounded-[2.5rem] border border-border shadow-2xl relative overflow-hidden group ring-1 ring-border/50"
          >
            <div className="absolute top-0 right-0 p-16 opacity-[0.02] pointer-events-none group-focus-within:opacity-10 transition-opacity">
              <Layers size={180} className="rotate-12 text-foreground" />
            </div>
            <div className="relative z-10 space-y-8">
              <FormField
                control={form.control}
                name="pstTtl"
                required
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
                        <Zap size={24} />
                      </div>
                      <FormLabel className="text-[10px] font-black tracking-[0.1em] text-muted-foreground">제목</FormLabel>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="article-title-input"
                        className="h-16 bg-transparent border-none text-foreground text-4xl font-black placeholder:text-muted-foreground focus-visible:ring-0 p-0 tracking-tighter"
                        placeholder="제목을 입력하세요."
                        autoFocus
                        aria-label="게시글 제목"
                        maxLength={100}
                      />
                    </FormControl>
                    <FormMessage className="font-black text-destructive-emphasis uppercase text-[10px] tracking-widest pt-2" />
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
            <FormField
              control={form.control}
              name="pstCn"
              required
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg">
                        <Package size={20} />
                      </div>
                      <FormLabel className="text-[10px] font-black text-foreground tracking-[0.1em]">본문 내용</FormLabel>
                    </div>
                  </div>
                  <RichTextFieldControl value={field.value} onChange={field.onChange} />
                  <FormMessage className="font-black text-destructive-emphasis uppercase text-[10px] tracking-widest pt-4 pl-4" />
                </FormItem>
              )}
            />
          </motion.div>

          {/* 첨부파일 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4 px-4">
              <div className="w-10 h-10 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg">
                <Paperclip size={20} aria-hidden="true" />
              </div>
              <h2 className="text-[10px] font-black text-foreground tracking-[0.1em]">첨부파일</h2>
            </div>

            {existingAtchFileSn && (
              isAttachmentError ? (
                <div role="alert" className="mx-4 flex flex-wrap items-center gap-4 p-6 rounded-2xl border border-destructive/40 bg-card">
                  <span className="text-sm font-bold">기존 첨부파일 목록을 불러오지 못했습니다.</span>
                  <Button type="button" variant="outline" onClick={() => void refetchAttachments()} className="h-10 px-6 rounded-xl">
                    다시 시도
                  </Button>
                </div>
              ) : attachments.length === 0 ? (
                <p className="px-4 text-sm font-bold text-muted-foreground">등록된 첨부파일이 없습니다.</p>
              ) : (
                <ul className="mx-4 space-y-3" aria-label="기존 첨부파일">
                  {attachments.map((file) => {
                    const key = attachmentKey(file);
                    return (
                      <li key={key} className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card">
                        <span className="text-sm font-bold truncate">{file.orignlFileNm}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deletingFileKey !== null}
                          aria-busy={deletingFileKey === key}
                          onClick={() => void handleDeleteAttachment(file)}
                          aria-label={`${file.orignlFileNm} 삭제`}
                          className="gap-2 shrink-0"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          {deletingFileKey === key ? '삭제 중…' : '삭제'}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            <div className="px-4 space-y-3">
              <StandardFileUploader name="files" onFilesChange={setNewFiles} />
              <p className="text-xs text-muted-foreground font-medium">
                새로 붙인 파일은 게시글을 저장할 때 함께 올라갑니다.{existingAtchFileSn ? ' 기존 첨부에 추가됩니다.' : ''}
              </p>
            </div>
          </motion.div>

          {/* 게시 기간(기록용) */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.38 }}
            className="space-y-6 px-4"
          >
            {/*
              [2026-08-29 → 2026-09-05 이전] '게시 기간' 은 **기록만 되고 집행되지 않는다.**
              두 값은 BoardService 가 normalizeYmd 로 컬럼에 넣지만, 목록·상세 가시성을 결정하는 유일한
              술어 조립기 BoardPredicate 에는 pstBgngYmd·pstEndYmd 가 등장하지 않는다(전 저장소 실측:
              엔티티 대입·projection·저장 경로뿐, 조건문 0건). 즉 종료일이 지나도 글은 그대로 보인다.

              집행을 켜는 것은 이 화면의 범위가 아니다 — 켜는 순간 이미 기간이 지난 기존 글이 예고 없이
              사라지므로, 대상 범위와 마이그레이션을 정하는 제품 결정이 선행된다. 그때까지 화면은
              자기가 하는 일만 말한다(honest-affordance-contract 가 문구와 술어 부재를 함께 고정한다).
            */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-lg">
                <Calendar size={20} aria-hidden="true" />
              </div>
              <h2 className="text-[10px] font-black text-foreground tracking-[0.1em]">게시 기간(기록용)</h2>
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              입력한 기간은 게시글에 함께 저장되지만, 노출 여부를 자동으로 바꾸지는 않습니다.
              종료일이 지나도 글은 계속 보이며, 내리려면 직접 삭제해야 합니다.
              {pstSn ? ' 비워 두면 기존 값은 그대로 둡니다.' : ''}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DATE_FIELDS.map((dateField) => (
                <FormField
                  key={dateField.name}
                  control={form.control}
                  name={dateField.name}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-black tracking-[0.1em] text-muted-foreground">{dateField.label}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} className="h-11 rounded-lg border-border font-bold" />
                      </FormControl>
                      <FormMessage className="font-black text-destructive-emphasis uppercase text-[10px] tracking-widest" />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </motion.div>

          {/* Bottom Actions Matrix */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-end gap-10 pt-12 border-t-2 border-border"
          >
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
                className="h-16 flex-1 sm:flex-none px-16 rounded-[1.5rem] bg-surface-inverse text-surface-inverse-foreground font-black tracking-widest text-[10px] uppercase hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] gap-4 group"
                aria-label={pstSn ? '게시글 수정' : '게시글 등록'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin w-5 h-5" />
                    <span>저장 중…</span>
                  </>
                ) : (
                  <>
                    <Save size={20} className="group-hover:rotate-12 transition-transform" />
                    {pstSn ? '게시글 수정' : '게시글 등록'}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </form>
      </Form>

    </motion.div>
  );
}
