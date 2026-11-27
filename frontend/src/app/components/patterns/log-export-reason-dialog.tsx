'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { Download } from 'lucide-react';
import { z } from 'zod';
import { extractFieldErrors } from '@/app/actions/actionUtils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { Button } from '@/components/ui/button';
import { FormErrorSummary } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { failureMessage } from '@/lib/safe-error-log';

/** 내보내기 사유 길이 — 서버 감사 경계(SensitiveAuditInterceptor)와 같다. 서버가 최종 판정자다. */
export const EXPORT_REASON_MIN = 2;
export const EXPORT_REASON_MAX = 200;

/** 제어 문자는 공백으로 바꾸고 앞뒤 공백은 지운다(서버 사유 정규화와 동일 규칙). */
export function normalizeExportReason(value: string): string {
  let normalized = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    normalized += code < 0x20 || code === 0x7f ? ' ' : character;
  }
  return normalized.trim();
}

const EXPORT_REASON_MESSAGE = `사유를 ${EXPORT_REASON_MIN}~${EXPORT_REASON_MAX}자로 입력하세요.`;
const exportReasonSchema = z.strictObject({
  reason: z.string().transform(normalizeExportReason)
    .pipe(z.string().min(EXPORT_REASON_MIN, EXPORT_REASON_MESSAGE).max(EXPORT_REASON_MAX, EXPORT_REASON_MESSAGE)),
});
const EXPORT_LABELS = { reason: '내보내기 사유' };

export interface LogExportReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  totalCount?: number;
  onConfirm: (reason: string) => void | Promise<void>;
}

/**
 * 전체 로그 xlsx 내보내기 전에 감사 원장에 남길 사유(2~200자)를 검증·수집하는 표준 모달.
 */
export function LogExportReasonDialog({
  isOpen,
  onClose,
  title,
  totalCount,
  onConfirm,
}: LogExportReasonDialogProps) {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const pendingRef = useRef(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const validation = useManualFormValidation(exportReasonSchema, {
    labels: EXPORT_LABELS,
    focusTargets: { reason: () => reasonRef.current },
  });

  const handleClose = () => {
    if (pendingRef.current) return;
    setReason('');
    setSubmitError('');
    validation.clearError('reason');
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRef.current) return;
    const validated = validation.validate({ reason });
    if (!validated) return;
    pendingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onConfirm(validated.reason);
      setReason('');
      validation.clearError('reason');
      onClose();
    } catch (failure) {
      const fieldErrors = extractFieldErrors(failure);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      setSubmitError(`${failureMessage(failure, '로그를 내보내지 못했습니다.')} 입력한 사유는 유지됩니다.`);
    } finally {
      pendingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="lg"
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>취소</Button>
          <Button type="submit" form={`${reasonId}-export-form`} className="gap-2" disabled={submitting} aria-busy={submitting || undefined}>
            <Download size={16} aria-hidden="true" /> {submitting ? '내보내는 중…' : '내보내기'}
          </Button>
        </div>
      }
    >
      <form
        id={`${reasonId}-export-form`}
        noValidate
        aria-label={title}
        className="space-y-3 pt-2"
        onSubmit={(event) => { void handleSubmit(event); }}
      >
        <FormErrorSummary errors={validation.errors} labels={EXPORT_LABELS} onNavigate={validation.focusError} />
        {submitError ? <p role="alert" className="text-sm text-destructive-emphasis">{submitError}</p> : null}
        <p className="text-sm text-muted-foreground">
          {typeof totalCount === 'number'
            ? `지금 조건에 맞는 ${totalCount.toLocaleString('ko-KR')}건을 xlsx 파일로 내려받습니다.`
            : '지금 조건에 맞는 전체 결과를 xlsx 파일로 내려받습니다.'}
          {' '}내보내기와 그 사유는 감사 원장에 남습니다.
        </p>
        <div className="space-y-1">
          <label htmlFor={reasonId} className="text-sm font-medium">내보내기 사유</label>
          <Textarea
            id={reasonId}
            ref={reasonRef}
            {...validation.fieldProps('reason')}
            aria-describedby={[`${reasonId}-hint`, validation.fieldProps('reason')['aria-describedby']].filter(Boolean).join(' ')}
            value={reason}
            maxLength={EXPORT_REASON_MAX}
            rows={3}
            disabled={submitting}
            onChange={(event) => {
              validation.clearError('reason');
              setReason(event.target.value);
            }}
          />
          <p id={`${reasonId}-hint`} className="text-xs text-muted-foreground">
            {EXPORT_REASON_MIN}~{EXPORT_REASON_MAX}자. 예: 월간 접속기록 점검. 사유는 원장에 그대로 남으므로 개인정보를 적지 마세요.
          </p>
          {validation.errors.reason
            ? <p {...validation.messageProps('reason')} className="text-xs font-bold text-destructive-emphasis" />
            : null}
        </div>
      </form>
    </StandardModal>
  );
}
