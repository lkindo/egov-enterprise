'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Loader2,
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
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { canEditConfiguredBoard } from '@/lib/auth/board-edit-permissions';
import { StandardFileUploader } from '@/app/components/ui/standard-file-uploader';
import { boardMasterQueryOptions } from '@/queries/board-master-query-options';
import { boardUploadLimits, formatMegabytes, SERVER_UPLOAD_ACCEPT, SERVER_UPLOAD_EXTENSIONS } from '@/lib/attachments/server-upload-limits';
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
  // 상세 응답의 소유자 키이며 저장 요청 필드가 아니다.
  userId?: string;
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
   *    multipart(`/boards/{bbsId}/posts/with-files`)로 넘기고 있었지만 이 화면에는 파일 입력이 없어 한 번도 실린 적이 없었다.
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

  /*
   * [2026-09-27 DIP B5 F9] 게시판 첨부 설정(허용·파일 수·파일당 크기)을 업로더에 그대로 보인다. 서버
   * (BoardService.assertNewFilesAllowed)가 같은 규칙으로 저장 전에 거부하므로, 화면이 더 많이 받아 두면 저장할 때에야 실패한다.
   * 설정을 아직 모르면 서버 상한으로 보이고 판정은 서버가 한다.
   */
  const { data: boardMeta, isError: isBoardMetaError, refetch: refetchBoardMeta } = useQuery(boardMasterQueryOptions.meta(bbsId ?? ''));
  const canWrite = canEditConfiguredBoard(user, boardMeta) && (activeRecordId
    ? canPermission(user, 'BOARD_UPDATE') && (canPermission(user, 'BOARD_UPDATE_ALL')
      || Boolean(user?.esntlId && initialData?.userId === user.esntlId))
    : canPermission(user, 'BOARD_CREATE'));
  const uploadLimits = boardUploadLimits(boardMeta, attachments.length);

  const handleDeleteAttachment = async (file: AttachmentItem) => {
    if (!canWrite || deletingRef.current) return;
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
  const { restoreDraft, clearDraft, hasDraft, lastSavedAt, peekDraft } = useAutoSaveDraft({
    scope: draftScope,
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
  //   [2026-09-27 DIP B5 F9] 수정 화면도 묻는다. 종전에는 새 글에서만 물어, 글을 고치다 다른 화면에 다녀오면 고친 내용을
  //   되살릴 길이 없었다. 수정 화면은 저장된 글로 채워져 있으므로 초안이 그 글과 다를 때만 묻는다.
  useEffect(() => {
    if (draftPromptedRef.current || !hasDraft) return;
    const editing = Boolean(activeRecordId);
    if (editing) {
      const draft = peekDraft();
      if (!draft || (draft.title === (initialData?.pstTtl ?? '') && draft.content === (initialData?.pstCn ?? ''))) return;
    } else if (form.getValues('pstTtl') || form.getValues('pstCn')) {
      return;
    }
    draftPromptedRef.current = true;
    void confirm(editing ? {
      title: '수정하던 초안 복구',
      message: '이 글을 수정하던 초안이 현재 탭에 있습니다. 초안으로 바꾸시겠습니까? 바꾸지 않으면 저장된 글을 그대로 수정합니다.',
      confirmText: '초안으로 바꾸기',
      cancelText: '저장된 글로 수정',
    } : {
      title: '임시저장 데이터 복구',
      message: '현재 탭에서 작성하던 초안이 있습니다. 복구하시겠습니까?',
      confirmText: '복구',
      cancelText: '새로 작성',
    }).then((restore) => {
      if (!restore) return;
      restoreDraft();
      toast('임시저장 데이터를 복구했습니다.', 'success');
    });
  }, [confirm, hasDraft, restoreDraft, peekDraft, toast, activeRecordId, initialData, form]);

  const onSubmit = async (values: BoardFormValues) => {
    if (!canWrite || submittingRef.current) return;
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
      // [2026-09-27 DIP B5 F9] 게시판이 첨부를 받지 않아 업로더를 감춘 뒤에는 앞서 고른 파일도 보내지 않는다.
      if (uploadLimits.allowed) newFiles.forEach((file) => formData.append('files', file));

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
        // [2026-09-26 DIP C8] 작성 화면을 방문 기록에서 바꿔 끼운다. push 로 가면 뒤로 가기가 저장을 마친 폼으로
        //   돌아가고, 한 번 더 눌러야 목록(URL 에 실린 페이지·검색 조건)에 닿았다.
        router.replace(result.redirect || `/admin/community/boards/select-board-list?bbsId=${bbsId}`);
      } else {
        // [2026-09-26 DIP V9] 액션이 돌려준 사유(권한·파일 크기·형식·서버 안내)를 버리지 않는다.
        if (!form.applyServerErrors(result)) {
          toast(result.message
            ? `${result.message} 입력 내용은 유지됩니다.`
            : '게시글을 저장하지 못했습니다. 입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요.', 'error');
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
    <div className="mx-auto max-w-[var(--page-max-w)] space-y-4 pb-6">
      {/* Header section */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
          className="size-8 shrink-0"
          aria-label="뒤로 가기"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Button>
        <div className="min-w-0">
          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">커뮤니티 게시판</span>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">
            {pstSn ? '게시글 수정' : '새 게시글 작성'}
          </h1>
        </div>
      </div>

      <Form {...form}>
        {isBoardMetaError ? <div role="alert" className="space-y-2">
          <p>게시판 편집 권한을 확인하지 못했습니다. 입력 내용은 유지됩니다.</p>
          <Button type="button" variant="outline" onClick={() => { void refetchBoardMeta(); }}>권한 다시 확인</Button>
        </div> : !canWrite && <p role="status" className="text-sm text-muted-foreground">
          {boardMeta ? '이 게시판을 편집할 권한이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.' : '게시판 편집 권한을 확인하고 있습니다.'}
        </p>}
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <fieldset disabled={!canWrite} className="contents">
          <p className="text-sm text-muted-foreground">
            초안 임시 보관은 현재 탭에서만 유효합니다. 새로고침하거나 탭을 닫으면 사라지므로 게시글을 등록해 주세요.
          </p>
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            {lastSavedAt ? '현재 탭에 초안을 임시 보관했습니다.' : ''}
          </p>
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
          <div className="rounded-md border border-border bg-card p-4">
            <div className="space-y-2">
              <FormField
                control={form.control}
                name="pstTtl"
                required
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">제목</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        data-testid="article-title-input"
                        className="h-[var(--control-h)] text-[length:var(--font-size-body)] text-foreground placeholder:text-muted-foreground"
                        placeholder="제목을 입력하세요."
                        autoFocus
                        aria-label="게시글 제목"
                        maxLength={256}
                      />
                    </FormControl>
                    <FormMessage className="pt-1 text-xs text-destructive-emphasis" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Content Editor Area */}
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="pstCn"
              required
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">본문 내용</FormLabel>
                  <RichTextFieldControl value={field.value} onChange={field.onChange} />
                  <FormMessage className="pt-1 text-xs text-destructive-emphasis" />
                </FormItem>
              )}
            />
          </div>

          {/* 첨부파일 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Paperclip size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-[length:var(--font-size-body)] font-semibold text-foreground">첨부파일</h2>
            </div>

            {existingAtchFileSn && (
              isAttachmentError ? (
                <div role="alert" className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2">
                  <span className="text-[length:var(--font-size-body)]">기존 첨부파일 목록을 불러오지 못했습니다.</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => void refetchAttachments()}>
                    다시 시도
                  </Button>
                </div>
              ) : attachments.length === 0 ? (
                <p className="text-[length:var(--font-size-body)] text-muted-foreground">등록된 첨부파일이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-border rounded-md border border-border" aria-label="기존 첨부파일">
                  {attachments.map((file) => {
                    const key = attachmentKey(file);
                    return (
                      <li key={key} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="truncate text-[length:var(--font-size-body)]">{file.orignlFileNm}</span>
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

            {!uploadLimits.allowed ? (
              <p role="note" className="text-[length:var(--font-size-body)] text-muted-foreground">
                이 게시판은 파일 첨부를 받지 않습니다.
              </p>
            ) : uploadLimits.remaining === 0 ? (
              <p role="note" className="text-[length:var(--font-size-body)] text-muted-foreground">
                이 게시판의 첨부 파일 수({uploadLimits.boardMaxFiles}개)를 모두 채웠습니다. 새 파일을 붙이려면 기존 첨부를 먼저 삭제하세요.
              </p>
            ) : (
              <div className="space-y-2">
                <StandardFileUploader
                  name="files"
                  onFilesChange={setNewFiles}
                  maxFiles={uploadLimits.remaining}
                  maxSizeMB={uploadLimits.maxSizeMB}
                  accept={SERVER_UPLOAD_ACCEPT}
                />
                <p className="text-xs text-muted-foreground">
                  새로 붙인 파일은 게시글을 저장할 때 함께 올라갑니다.{existingAtchFileSn ? ' 기존 첨부에 추가됩니다.' : ''}
                  {uploadLimits.boardMaxFiles !== null ? ` 이 게시판은 파일을 ${uploadLimits.boardMaxFiles}개까지(기존 첨부 포함) 받습니다.` : ''}
                  {` 파일 하나당 ${formatMegabytes(uploadLimits.maxSizeMB)}까지, 형식은 ${SERVER_UPLOAD_EXTENSIONS.join(', ')} 입니다.`}
                </p>
              </div>
            )}
          </div>

          {/* 게시 기간(기록용) */}
          <div className="space-y-2">
            {/*
              [2026-08-29 → 2026-09-05 이전] '게시 기간' 은 **기록만 되고 집행되지 않는다.**
              두 값은 BoardService 가 normalizeYmd 로 컬럼에 넣지만, 목록·상세 가시성을 결정하는 유일한
              술어 조립기 BoardPredicate 에는 pstBgngYmd·pstEndYmd 가 등장하지 않는다(전 저장소 실측:
              엔티티 대입·projection·저장 경로뿐, 조건문 0건). 즉 종료일이 지나도 글은 그대로 보인다.

              집행을 켜는 것은 이 화면의 범위가 아니다 — 켜는 순간 이미 기간이 지난 기존 글이 예고 없이
              사라지므로, 대상 범위와 마이그레이션을 정하는 제품 결정이 선행된다. 그때까지 화면은
              자기가 하는 일만 말한다(honest-affordance-contract 가 문구와 술어 부재를 함께 고정한다).
            */}
            <div className="flex items-center gap-2">
              <Calendar size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <h2 className="text-[length:var(--font-size-body)] font-semibold text-foreground">게시 기간(기록용)</h2>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              입력한 기간은 게시글에 함께 저장되지만, 노출 여부를 자동으로 바꾸지는 않습니다.
              종료일이 지나도 글은 계속 보이며, 내리려면 직접 삭제해야 합니다.
              {pstSn ? ' 비워 두면 기존 값은 그대로 둡니다.' : ''}
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {DATE_FIELDS.map((dateField) => (
                <FormField
                  key={dateField.name}
                  control={form.control}
                  name={dateField.name}
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[length:var(--font-size-body)] font-medium text-foreground">{dateField.label}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ''} className="h-[var(--control-h)] rounded-md border-border" />
                      </FormControl>
                      <FormMessage className="text-xs text-destructive-emphasis" />
                    </FormItem>
                  )}
                />
              ))}
            </div>
          </div>

          {/* Bottom Actions Matrix */}
          <div className="flex flex-col items-center justify-end gap-3 border-t border-border pt-4 sm:flex-row">
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 sm:flex-none"
                aria-label="취소"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 gap-2 sm:flex-none"
                aria-label={pstSn ? '게시글 수정' : '게시글 등록'}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>게시글 저장 중…</span>
                  </>
                ) : (
                  <>
                    <Save size={16} aria-hidden="true" />
                    {pstSn ? '게시글 수정' : '게시글 등록'}
                  </>
                )}
              </Button>
            </div>
          </div>
          </fieldset>
        </form>
      </Form>

    </div>
  );
}
