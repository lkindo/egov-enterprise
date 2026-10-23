'use client';

import React, { useRef, useState } from 'react';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormErrorSummary } from '@/components/ui/form';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { isConflictError } from '@/lib/query/list-query-defaults';
import { fromDateInputValue } from '@/lib/format-date';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { BoardPostPeriodBatchRequestSchema, BoardPostPinBatchRequestSchema } from '@/types/generated-zod';
import type { BoardPost } from '@/types/business/board';

/** 선택 처리 입력의 종류 — 종료일 바꾸기(B1)와 상단 고정하기(B2). 해제 동작들은 입력이 없어 확인만 받는다(게시물 탭). */
export type BoardPostBatchMode = 'END_DATE' | 'PIN';

/**
 * 선택 처리 입력(ADR-0040 결정 5·10, D12). 날짜 형식·달력은 생성 스키마(@Pattern Ymd)를 그대로 쓴다. 종료일 바꾸기는 새 종료일을 꼭
 * 고르고, 상단 고정하기의 고정 종료일은 비울 수 있다(서버가 오늘부터 게시판의 고정 기본 일수 뒤로 정한다). 오늘보다 이른 날짜·시작일보다
 * 이른 종료일·고정 상한은 서버가 모든 대상을 다시 판정해 거부한다(오늘은 서버가 정한다, D-11).
 */
export const batchDateFormSchema = BoardPostPeriodBatchRequestSchema.pick({ pstEndYmd: true }).extend({
  mode: z.enum(['END_DATE', 'PIN']),
  upendFixEndYmd: BoardPostPinBatchRequestSchema.shape.upendFixEndYmd,
}).superRefine((value, context) => {
  if (value.mode === 'END_DATE' && !/^\d{8}$/.test(value.pstEndYmd ?? '')) {
    context.addIssue({ code: 'custom', path: ['pstEndYmd'], message: '새 게시 종료일을 골라 주세요.' });
  }
});

const labels = { pstEndYmd: '새 게시 종료일', upendFixEndYmd: '고정 종료일' };

/** 모드마다 바뀌는 말과 칸. 단추는 대상을 밝힌다(§5.7). */
const COPY = {
  END_DATE: {
    title: '종료일 바꾸기',
    field: 'pstEndYmd',
    inputId: 'post-batch-end',
    pending: '종료일 바꾸는 중…',
    submit: (count: string) => `선택한 ${count}건 종료일 바꾸기`,
    done: (count: string) => `${count}건의 게시 종료일을 바꿨습니다.`,
    failed: '게시 종료일을 바꾸지 못했습니다. 아무것도 바뀌지 않았습니다.',
  },
  PIN: {
    title: '상단 고정하기',
    field: 'upendFixEndYmd',
    inputId: 'post-batch-pin-end',
    pending: '상단 고정하는 중…',
    submit: (count: string) => `선택한 ${count}건 상단 고정하기`,
    done: (count: string) => `${count}건을 상단에 고정했습니다.`,
    failed: '상단에 고정하지 못했습니다. 아무것도 바뀌지 않았습니다.',
  },
} as const;

/**
 * 운영 화면 게시물 탭의 선택 처리 입력(설계서 §5.4). 대상 제목과 건수를 보이고, 서버가 하나라도 맞지 않아 전체를 거부하면(경로 게시판에
 * 없는 글·시작일보다 이른 종료일·답글·고정 상한 초과·그 사이 다른 사람의 수정) 사유를 그대로 알리고 대화상자를 열어 둔다. 아무것도
 * 바뀌지 않았으므로 선택도 그대로다.
 *
 * - END_DATE: 고른 글의 게시 종료일을 모두 같은 날로 바꾼다(게시글 전체 수정 권한).
 * - PIN: 고른 글을 모두 상단에 고정한다(상단 고정 권한). 이미 고정 중인 글은 상한에 새로 세지 않고 고정 종료일만 바뀐다(결정 5).
 */
export function BoardPostBatchDialog({ bbsId, mode, posts, defaultDays, onClose, onDone, onConflict }: {
  bbsId: string;
  mode: BoardPostBatchMode;
  /** 표에서 고른 글(현재 쪽). 서버 사유가 글 번호로 말하므로 번호를 함께 보인다. */
  posts: readonly BoardPost[];
  /** 상단 고정하기에서 고정 종료일을 비울 때의 게시판 고정 기본 일수(설정). 안내에만 쓴다. */
  defaultDays?: number;
  onClose: () => void;
  /** 처리를 마쳤다 — 목록을 다시 읽고 선택을 비운다. */
  onDone: () => void;
  onConflict: () => void;
}) {
  const { toast } = useToast();
  const copy = COPY[mode];
  const [date, setDate] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const validation = useManualFormValidation(batchDateFormSchema, { labels });
  const requestClose = useDirtyCloseGuard(date !== '', onClose);
  const count = posts.length;
  const countText = count.toLocaleString();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current || count === 0) return;
    setServerError(null);
    const ymd = fromDateInputValue(date);
    const validated = validation.validate(mode === 'END_DATE' ? { mode, pstEndYmd: ymd } : { mode, ...(ymd ? { upendFixEndYmd: ymd } : {}) });
    if (!validated) return;
    submitPendingRef.current = true;
    setIsSubmitting(true);
    const pstSns = posts.map((post) => post.pstSn);
    try {
      if (validated.mode === 'END_DATE') {
        await boardAdminService.updatePostPeriodsInBatch(bbsId, { action: 'END_DATE', pstSns, pstEndYmd: validated.pstEndYmd });
      } else {
        // 고정 종료일은 고른 경우에만 보낸다 — 비우면 서버가 오늘부터 게시판의 고정 기본 일수 뒤로 정한다.
        await boardAdminService.updatePostPinsInBatch(bbsId, {
          pstSns,
          upendFixYn: 'Y',
          ...(validated.upendFixEndYmd ? { upendFixEndYmd: validated.upendFixEndYmd } : {}),
        });
      }
      toast(copy.done(countText), 'success');
      onDone();
      onClose();
    } catch (error: unknown) {
      if (isConflictError(error)) {
        // 그 사이 다른 사람이 같은 글을 고쳤다 — 서버가 전체를 되돌렸다. 목록을 다시 읽고 다시 시도하게 한다.
        setServerError('그 사이 다른 사용자가 고른 글을 고쳐 아무것도 바꾸지 않았습니다. 목록을 다시 불러왔으니 확인한 뒤 다시 시도하세요.');
        onConflict();
        return;
      }
      const fieldErrors = extractFieldErrors(error);
      const message = extractErrorMessage(error, copy.failed);
      if (fieldErrors?.[copy.field]) validation.setFormErrors({ [copy.field]: fieldErrors[copy.field] });
      // 오늘보다 이른 고정 종료일은 필드 없이 사유만 온다 — 그 칸에 붙인다. 상한·답글 같은 전체 거부는 알림으로 보인다.
      else if (mode === 'PIN' && message.includes('고정 종료일')) validation.setFormErrors({ upendFixEndYmd: message });
      else setServerError(message);
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal isOpen onClose={requestClose} title={copy.title} maxWidth="lg" closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormErrorSummary errors={validation.errors} labels={labels} onNavigate={validation.focusError} />
        {mode === 'END_DATE' ? (
          <p className="text-xs text-muted-foreground">
            고른 글의 게시 종료일을 모두 같은 날로 바꿉니다. 오늘이나 그 뒤로만 정할 수 있고, 시작일보다 이른 날이 되는 글이 하나라도 있으면
            아무것도 바꾸지 않습니다. 기한을 없애려면 ‘종료일 해제하기’를 쓰세요.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            고른 글을 모두 상단에 고정합니다. 고정 종료일은 오늘이나 그 뒤로만 정할 수 있고, 이미 고정 중인 글은 고정 종료일이 이 날로
            바뀝니다. 답글이 있거나 게시판의 고정 상한을 넘으면 아무것도 고정하지 않습니다.
          </p>
        )}
        {serverError && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            {serverError}
          </p>
        )}
        <section aria-labelledby="post-batch-targets" className="space-y-1">
          <h3 id="post-batch-targets" className="text-[length:var(--font-size-body)] font-medium text-foreground">
            대상 {countText}건
          </h3>
          <ul className="max-h-40 list-disc space-y-0.5 overflow-auto pl-5 text-[length:var(--font-size-body)] text-muted-foreground">
            {posts.map((post) => <li key={post.pstSn}><span className="tabular-nums">{post.pstSn}</span> · {post.pstTtl}</li>)}
          </ul>
        </section>
        <div className="space-y-2">
          <Label htmlFor={copy.inputId}>
            {labels[copy.field]}
            {mode === 'END_DATE' ? <> <span className="text-destructive-emphasis">*</span></> : null}
          </Label>
          <Input
            id={copy.inputId}
            type="date"
            {...validation.fieldProps(copy.field)}
            {...(mode === 'PIN' ? {
              'aria-describedby': [validation.fieldProps(copy.field)['aria-describedby'], 'post-batch-pin-hint'].filter(Boolean).join(' '),
            } : {})}
            value={date}
            onChange={(event) => { validation.clearError(copy.field); setDate(event.target.value); }}
            required={mode === 'END_DATE'}
            disabled={isSubmitting}
          />
          {mode === 'PIN' && (
            <p id="post-batch-pin-hint" className="text-xs text-muted-foreground">
              비우면 오늘부터 {defaultDays ? `${defaultDays.toLocaleString()}일` : '게시판의 고정 기본 일수'} 뒤까지(서버가 정함). 그날까지 고정합니다.
            </p>
          )}
          {validation.errors[copy.field] ? (
            <p {...validation.messageProps(copy.field)} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>
        {/* 제출 버튼은 form 안에 둔다 — 폼 계약이 submit.closest('form') 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>돌아가기</Button>
          <Button type="submit" disabled={isSubmitting || count === 0} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isSubmitting ? copy.pending : copy.submit(countText)}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
