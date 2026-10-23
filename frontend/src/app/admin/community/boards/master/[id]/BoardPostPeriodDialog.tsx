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
import { fromDateInputValue, toDateInputValue, toDisplayYmd } from '@/lib/format-date';
import { postingPeriodErrorField } from '@/lib/board/posting-period-error';
import { boardAdminService } from '@/services/foundation/system/BoardAdminService';
import { BoardPostPeriodRequestSchema } from '@/types/generated-zod';
import type { BoardPost } from '@/types/business/board';

/**
 * 빠른 편집 입력(ADR-0040 결정 3·10, D12). 날짜 형식·달력은 생성 스키마(@Pattern Ymd)를 그대로 쓰고, 시작≤종료(서버의 클래스 단위
 * @YmdRange)와 이 대화상자의 규칙 — 이미 있는 날짜를 비우지 않는다(단건 경로는 해제를 받지 않는다, D-13), 게시 중인 글의 시작일을
 * 바꾸면 숨겨질 수 있음을 확인받는다 — 를 더한다. 오늘과의 비교는 하지 않는다 — 예약 설정·과거 종료일은 서버가 오늘(Asia/Seoul)
 * 기준으로 판정해 사유를 돌려준다(D-11, DEC-OPS-140).
 */
export const postPeriodFormSchema = BoardPostPeriodRequestSchema.pick({ pstBgngYmd: true, pstEndYmd: true }).extend({
  storedBgngYmd: z.string(),
  storedEndYmd: z.string(),
  hideRisk: z.boolean(),
  hideConfirmed: z.boolean(),
}).superRefine((value, context) => {
  const start = value.pstBgngYmd ?? '';
  const end = value.pstEndYmd ?? '';
  if (value.storedBgngYmd && !start) {
    context.addIssue({ code: 'custom', path: ['pstBgngYmd'], message: '게시 시작일은 비울 수 없습니다. 지금 날짜를 그대로 두거나 다른 날을 고르세요.' });
  }
  if (value.storedEndYmd && !end) {
    context.addIssue({
      code: 'custom',
      path: ['pstEndYmd'],
      message: '게시 종료일은 여기서 비울 수 없습니다. 기한을 없애려면 목록에서 글을 고른 뒤 ‘종료일 해제하기’를 쓰세요.',
    });
  }
  if (/^\d{8}$/.test(start) && /^\d{8}$/.test(end) && start > end) {
    context.addIssue({ code: 'custom', path: ['pstEndYmd'], message: '종료일은 시작일과 같거나 뒤여야 합니다.' });
  }
  if (value.hideRisk && !value.hideConfirmed) {
    context.addIssue({ code: 'custom', path: ['hideConfirmed'], message: '시작일을 바꾸면 그날까지 이용자에게 숨겨질 수 있습니다. 확인란을 선택해 주세요.' });
  }
});

const labels = { pstBgngYmd: '게시 시작일', pstEndYmd: '게시 종료일', hideConfirmed: '숨김 확인' };

/** 저장값을 저장 포맷(yyyyMMdd)으로 맞춘다. 해석할 수 없는 옛 값은 빈 값이다. */
const storedYmd = (value?: string | null) => fromDateInputValue(toDateInputValue(value));

/**
 * 운영 화면 게시물 탭의 일정 바꾸기(빠른 편집 한 건, 설계서 §5.4). 게시글 전체 수정 권한이 있고 지정 게시판이면 그 편집 권한도 있을 때만
 * 게시물 탭이 연다(표시 판정 — 서버가 최종 판정한다). 저장 전 지금 값과 바꿀 값을 나란히 보이고, 읽은 게시글 버전을 함께 보낸다.
 *
 * - 409(그 사이 다른 사람이 고침): 덮어쓰지 않았다고 알리고 목록을 다시 읽게 한다 — 입력은 남기고 대화상자는 열어 둔다.
 * - 400·403 의 게시 기간 사유(예약 설정·과거 종료일·순서): 그 날짜 칸에 붙인다. 그 밖의 사유는 대화상자 안 알림으로 보인다.
 */
export function BoardPostPeriodDialog({ bbsId, post, reservationClosed, onClose, onSaved, onConflict }: {
  bbsId: string;
  /** 지금 목록의 그 글(버전·저장값). 충돌 뒤 목록을 다시 읽으면 새 값으로 바뀐다. */
  post: BoardPost;
  /** 게시판이 예약 게시를 받지 않는가(설정). 안내만 한다 — 판정은 서버가 오늘 기준으로 한다. */
  reservationClosed: boolean;
  onClose: () => void;
  onSaved: () => void;
  onConflict: () => void;
}) {
  const { toast } = useToast();
  const storedStart = storedYmd(post.pstBgngYmd);
  const storedEnd = storedYmd(post.pstEndYmd);
  const [initial] = useState(() => ({ begin: toDateInputValue(post.pstBgngYmd), end: toDateInputValue(post.pstEndYmd) }));
  const [form, setForm] = useState(() => ({ ...initial, hideConfirmed: false }));
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const validation = useManualFormValidation(postPeriodFormSchema, { labels });
  const dirty = form.begin !== initial.begin || form.end !== initial.end;
  const requestClose = useDirtyCloseGuard(dirty, onClose);

  const nextStart = fromDateInputValue(form.begin);
  const nextEnd = fromDateInputValue(form.end);
  const startChanged = nextStart !== '' && nextStart !== storedStart;
  const endChanged = nextEnd !== '' && nextEnd !== storedEnd;
  // 게시 중인 글의 시작일을 옮기면, 새 날짜가 오늘보다 뒤일 때 그날까지 이용자에게 숨겨진다. 오늘은 서버만 안다 — 바꾸기만 하면 확인받는다.
  const hideRisk = startChanged && post.postingStatus === 'POSTING';
  const versionMissing = post.version === null || post.version === undefined;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current || versionMissing) return;
    setServerError(null);
    const validated = validation.validate({
      pstBgngYmd: nextStart,
      pstEndYmd: nextEnd,
      storedBgngYmd: storedStart,
      storedEndYmd: storedEnd,
      hideRisk,
      hideConfirmed: form.hideConfirmed,
    });
    if (!validated || (!startChanged && !endChanged)) return;
    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      // 바뀐 날짜만 보낸다 — 보내지 않은 날짜는 서버가 지금 값을 유지한다.
      await boardAdminService.updatePostPeriod(bbsId, post.pstSn, {
        ...(startChanged ? { pstBgngYmd: nextStart } : {}),
        ...(endChanged ? { pstEndYmd: nextEnd } : {}),
        version: post.version as number,
      });
      toast(`[${post.pstTtl}] 게시 기간을 바꿨습니다.`, 'success');
      onSaved();
      onClose();
    } catch (error: unknown) {
      if (isConflictError(error)) {
        // 덮어쓰지 않았다 — 목록을 다시 읽어 지금 값과 다시 비교하게 한다(결정 10). 입력은 그대로 둔다.
        setServerError('다른 사용자가 먼저 이 글을 고쳐 저장하지 않았습니다. 지금 값을 다시 불러왔으니 비교한 뒤 다시 저장하세요.');
        onConflict();
        return;
      }
      const fieldErrors = extractFieldErrors(error);
      const message = extractErrorMessage(error, '게시 기간을 바꾸지 못했습니다.');
      const periodField = postingPeriodErrorField(message);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else if (periodField) validation.setFormErrors({ [periodField]: message });
      else setServerError(message);
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const rows = [
    { label: '게시 시작일', before: storedStart, after: startChanged ? nextStart : storedStart, changed: startChanged },
    { label: '게시 종료일', before: storedEnd, after: endChanged ? nextEnd : storedEnd, changed: endChanged },
  ];

  return (
    <StandardModal isOpen onClose={requestClose} title="일정 바꾸기" maxWidth="lg" closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormErrorSummary errors={validation.errors} labels={labels} onNavigate={validation.focusError} />
        <p className="text-[length:var(--font-size-body)] font-medium text-foreground">{post.pstTtl}</p>
        <p className="text-xs text-muted-foreground">
          시작일이 오늘보다 뒤면 그날까지 작성자와 게시판 관리자에게만 보입니다. 종료일은 오늘이나 그 뒤로만 정할 수 있고, 지나면 일반
          사용자에게 보이지 않습니다. 이미 예약된 글은 시작일을 오늘로 당겨 바로 공개할 수 있습니다.
          {reservationClosed ? ' 이 게시판은 예약 게시를 받지 않아 시작일을 오늘보다 뒤로 바꿀 수 없습니다.' : ''}
        </p>
        {serverError && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            {serverError}
          </p>
        )}
        {versionMissing && (
          <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-[length:var(--font-size-body)] text-foreground">
            이 글의 버전을 확인하지 못해 바꿀 수 없습니다. 목록을 다시 불러온 뒤 시도하세요.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="post-period-begin">게시 시작일</Label>
            <Input
              id="post-period-begin"
              type="date"
              {...validation.fieldProps('pstBgngYmd')}
              value={form.begin}
              onChange={(event) => { validation.clearError('pstBgngYmd'); setForm({ ...form, begin: event.target.value }); }}
              disabled={isSubmitting}
            />
            {validation.errors.pstBgngYmd ? (
              <p {...validation.messageProps('pstBgngYmd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-period-end">게시 종료일</Label>
            <Input
              id="post-period-end"
              type="date"
              {...validation.fieldProps('pstEndYmd')}
              value={form.end}
              onChange={(event) => { validation.clearError('pstEndYmd'); setForm({ ...form, end: event.target.value }); }}
              disabled={isSubmitting}
            />
            {validation.errors.pstEndYmd ? (
              <p {...validation.messageProps('pstEndYmd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
        </div>

        <div className="relative overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">바꿀 게시 기간</caption>
            <thead className="bg-muted">
              <tr>{['항목', '지금', '바꾼 뒤'].map((title) => <th key={title} scope="col" className="p-2">{title}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th scope="row" className="p-2 font-medium">{row.label}</th>
                  <td className="p-2 tabular-nums">{toDisplayYmd(row.before, '없음')}</td>
                  <td className="p-2 tabular-nums">{row.changed ? toDisplayYmd(row.after, '없음') : '그대로'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hideRisk && (
          <div className="space-y-1">
            <label className="flex items-start gap-2 text-[length:var(--font-size-body)] text-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                {...validation.fieldProps('hideConfirmed')}
                checked={form.hideConfirmed}
                onChange={(event) => { validation.clearError('hideConfirmed'); setForm({ ...form, hideConfirmed: event.target.checked }); }}
                disabled={isSubmitting}
              />
              <span>게시 중인 글입니다. 시작일을 오늘보다 뒤로 정하면 그날까지 이용자에게 숨겨집니다. 확인했습니다.</span>
            </label>
            {validation.errors.hideConfirmed ? (
              <p {...validation.messageProps('hideConfirmed')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
        )}

        {/* 제출 버튼은 form 안에 둔다 — 폼 계약이 submit.closest('form') 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>돌아가기</Button>
          <Button type="submit" disabled={isSubmitting || !dirty || versionMissing} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isSubmitting ? '일정 저장 중…' : '일정 저장'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
