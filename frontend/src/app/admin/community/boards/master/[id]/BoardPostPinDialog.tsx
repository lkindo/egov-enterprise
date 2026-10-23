'use client';

import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FormErrorSummary } from '@/components/ui/form';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { fromDateInputValue, toDateInputValue, toDisplayYmd } from '@/lib/format-date';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { BoardPostPinRequestSchema } from '@/types/generated-zod';
import type { BoardPost } from '@/types/business/board';

/**
 * 상단 고정 한 건 입력(ADR-0040 결정 5). 고정 여부와 날짜 형식·달력은 생성 스키마(@Pattern Ymd)를 그대로 쓰고, 해제할 때는 고정
 * 종료일을 보내지 않는다는 서버 규칙(보내면 400)만 더한다. 오늘과의 비교는 하지 않는다 — 오늘보다 이른 고정 종료일·상한·게시판 설정은
 * 서버가 오늘(Asia/Seoul) 기준으로 판정해 사유를 돌려준다(D-11, DEC-OPS-140).
 */
export const postPinFormSchema = BoardPostPinRequestSchema.superRefine((value, context) => {
  if (value.upendFixYn === 'N' && value.upendFixEndYmd) {
    context.addIssue({ code: 'custom', path: ['upendFixEndYmd'], message: '고정을 해제할 때는 고정 종료일을 정하지 않습니다.' });
  }
});

const labels = { upendFixYn: '상단 고정', upendFixEndYmd: '고정 종료일' };

/** 서버의 고정 종료일 사유(오늘보다 이른 날)는 필드 없이 온다 — 그 칸에 붙인다. 다른 사유(상한·설정·답글)는 대화상자 알림이다. */
const isPinEndDateReason = (message: string) => message.includes('고정 종료일');

/**
 * 운영 화면 게시물 탭의 상단 고정 바꾸기(빠른 편집 한 건, 설계서 §5.4, D-12). 게시글 상단 고정 권한(BOARD_PIN)이 있고 지정 게시판이면 그
 * 편집 권한도 있을 때만 게시물 탭이 연다(표시 판정 — 서버가 최종 판정한다). 일정 바꾸기와 권한이 달라 저장도 따로 한다(H3).
 *
 * - 고정 종료일을 비우면 서버가 오늘부터 게시판의 고정 기본 일수 뒤로 정한다 — 화면은 그 날짜를 계산하지 않고 그렇게 말한다.
 * - 게시판이 상단 고정을 받지 않으면 새 고정과 종료일 변경은 막고 해제만 연다(설정은 새 고정만 막는다, 결정 6).
 * - 고정은 게시글 버전을 올리지 않으므로 버전을 보내지 않는다(결정 5).
 */
export function BoardPostPinDialog({ bbsId, post, pinAllowed, defaultDays, onClose, onSaved }: {
  bbsId: string;
  /** 지금 목록의 그 글(서버가 판정한 고정 여부·종료일). */
  post: BoardPost;
  /** 게시판이 상단 고정을 받는가(설정). 안내와 입력 잠금에만 쓴다 — 판정은 서버가 한다. */
  pinAllowed: boolean;
  /** 게시판의 고정 기본 일수(설정). 종료일을 비울 때의 안내에만 쓴다. */
  defaultDays: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const wasPinned = post.pinned === true;
  const [initial] = useState(() => ({ pinned: wasPinned, end: wasPinned ? toDateInputValue(post.upendFixEndYmd) : '' }));
  const [form, setForm] = useState(initial);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const validation = useManualFormValidation(postPinFormSchema, { labels });
  const dirty = form.pinned !== initial.pinned || (form.pinned && form.end !== initial.end);
  const requestClose = useDirtyCloseGuard(dirty, onClose);
  const nextEnd = fromDateInputValue(form.end);
  const currentText = wasPinned ? `고정 · ~${toDisplayYmd(post.upendFixEndYmd, '종료일 모름')}` : '고정 안 함';
  const nextText = !form.pinned
    ? '고정 안 함'
    : nextEnd ? `고정 · ~${toDisplayYmd(nextEnd)}` : `고정 · 오늘부터 ${defaultDays.toLocaleString()}일 뒤까지(서버가 정함)`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current || !dirty) return;
    setServerError(null);
    const validated = validation.validate({
      upendFixYn: form.pinned ? 'Y' : 'N',
      ...(form.pinned && nextEnd ? { upendFixEndYmd: nextEnd } : {}),
    });
    if (!validated) return;
    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      // 고정 종료일은 고정할 때 고른 경우에만 보낸다 — 비우면 서버가 기본 일수로 정하고, 해제에는 보내지 않는다.
      await boardAdminService.updatePostPin(bbsId, post.pstSn, {
        upendFixYn: validated.upendFixYn,
        ...(validated.upendFixYn === 'Y' && validated.upendFixEndYmd ? { upendFixEndYmd: validated.upendFixEndYmd } : {}),
      });
      toast(!form.pinned
        ? `[${post.pstTtl}] 상단 고정을 해제했습니다.`
        : wasPinned ? `[${post.pstTtl}] 상단 고정 종료일을 바꿨습니다.` : `[${post.pstTtl}] 글을 상단에 고정했습니다.`, 'success');
      onSaved();
      onClose();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      const message = extractErrorMessage(error, '상단 고정을 바꾸지 못했습니다. 아무것도 바뀌지 않았습니다.');
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else if (isPinEndDateReason(message)) validation.setFormErrors({ upendFixEndYmd: message });
      else setServerError(message);
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal isOpen onClose={requestClose} title="상단 고정 바꾸기" maxWidth="lg" closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormErrorSummary errors={validation.errors} labels={labels} onNavigate={validation.focusError} />
        <p className="text-[length:var(--font-size-body)] font-medium text-foreground">{post.pstTtl}</p>
        <p className="text-xs text-muted-foreground">
          고정한 글은 고정 종료일까지 게시판 목록 맨 위에 옵니다(게시 기간 밖의 글은 이용자에게 보이지 않아도 상한을 차지합니다). 고정
          종료일은 오늘이나 그 뒤로만 정할 수 있습니다.
        </p>
        {!pinAllowed && (
          <p role="note" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            이 게시판은 상단 고정을 받지 않습니다. 고정 중인 글의 해제만 할 수 있습니다. 새로 고정하려면 설정 탭에서 상단 고정 허용을 켜세요.
          </p>
        )}
        {serverError && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            {serverError}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="post-pin-switch" className="cursor-pointer">상단 고정</Label>
          <Switch
            id="post-pin-switch"
            checked={form.pinned}
            // 고정을 받지 않는 게시판에서 새로 켜는 것은 막는다 — 이미 고정 중인 글은 끌(해제할) 수 있다.
            disabled={isSubmitting || (!form.pinned && !pinAllowed)}
            onCheckedChange={(checked) => {
              validation.clearError('upendFixEndYmd');
              setForm({ pinned: checked, end: checked ? form.end : initial.end });
            }}
          />
        </div>
        {form.pinned && (
          <div className="space-y-2">
            <Label htmlFor="post-pin-end">고정 종료일</Label>
            <Input
              id="post-pin-end"
              type="date"
              {...validation.fieldProps('upendFixEndYmd')}
              value={form.end}
              onChange={(event) => { validation.clearError('upendFixEndYmd'); setForm({ ...form, end: event.target.value }); }}
              aria-describedby={[validation.fieldProps('upendFixEndYmd')['aria-describedby'], 'post-pin-end-hint'].filter(Boolean).join(' ')}
              // 고정을 받지 않는 게시판에서는 종료일 변경도 새 고정과 같이 거부된다(해제만 된다).
              disabled={isSubmitting || !pinAllowed}
            />
            <p id="post-pin-end-hint" className="text-xs text-muted-foreground">
              비우면 오늘부터 {defaultDays.toLocaleString()}일 뒤까지(서버가 정함). 그날까지 고정합니다.
            </p>
            {validation.errors.upendFixEndYmd ? (
              <p {...validation.messageProps('upendFixEndYmd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
        )}

        <div className="relative overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">바꿀 상단 고정</caption>
            <thead className="bg-muted">
              <tr>{['항목', '지금', '바꾼 뒤'].map((title) => <th key={title} scope="col" className="p-2">{title}</th>)}</tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <th scope="row" className="p-2 font-medium">상단 고정</th>
                <td className="p-2 tabular-nums">{currentText}</td>
                <td className="p-2 tabular-nums">{dirty ? nextText : '그대로'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 제출 버튼은 form 안에 둔다 — 폼 계약이 submit.closest('form') 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>돌아가기</Button>
          <Button type="submit" disabled={isSubmitting || !dirty} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isSubmitting ? '상단 고정 저장 중…' : '상단 고정 저장'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
