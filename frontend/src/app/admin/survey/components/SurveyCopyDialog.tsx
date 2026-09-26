'use client';

import React, { useRef, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { SurveyCopyRequestSchema } from '@/types/generated-zod';

const copyDateSchema = SurveyCopyRequestSchema.shape.srvyBgngYmd
  .trim()
  .regex(/^\d{8}$/, '날짜를 선택해 주세요.');

/**
 * 설문 복제 입력(2026-09-26 DIP B5 F6). 기간은 원본에서 가져오지 않고 반드시 새로 고른다 — 원본 기간을 복사하면 같은
 * 설문이 둘 열리고, 비우면 빈 경계가 '열림'이라 사본이 무기한 열린다(서버 SurveyCopyRequest 와 같은 규칙).
 */
export const surveyCopyFormSchema = SurveyCopyRequestSchema.extend({
  srvyTtl: SurveyCopyRequestSchema.shape.srvyTtl.trim().min(1, '사본 제목을 입력해 주세요.'),
  srvyBgngYmd: copyDateSchema,
  srvyEndYmd: copyDateSchema,
}).superRefine((value, context) => {
  if (/^\d{8}$/.test(value.srvyBgngYmd) && /^\d{8}$/.test(value.srvyEndYmd) && value.srvyBgngYmd > value.srvyEndYmd) {
    context.addIssue({ code: 'custom', path: ['srvyEndYmd'], message: '종료일은 시작일과 같거나 뒤여야 합니다.' });
  }
});

const labels = { srvyTtl: '사본 제목', srvyBgngYmd: '시작일', srvyEndYmd: '종료일' };

/** `<input type="date">` 의 yyyy-MM-dd 를 서버의 yyyyMMdd 로. */
const toStorageYmd = (value: string) => value.replace(/-/g, '');

export function SurveyCopyDialog({
  source,
  onClose,
  onCopied,
}: {
  source: { srvySn: number; srvyTtl?: string | null };
  onClose: () => void;
  onCopied: (copySn: number) => void;
}) {
  const { toast } = useToast();
  const initialTitle = `[사본] ${source.srvyTtl ?? ''}`.slice(0, 256);
  const [form, setForm] = useState({ srvyTtl: initialTitle, begin: '', end: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitPendingRef = useRef(false);
  const validation = useManualFormValidation(surveyCopyFormSchema, { labels });
  const dirty = form.srvyTtl !== initialTitle || form.begin !== '' || form.end !== '';
  const requestClose = useDirtyCloseGuard(dirty, onClose);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitPendingRef.current) return;
    const validated = validation.validate({
      srvyTtl: form.srvyTtl,
      srvyBgngYmd: toStorageYmd(form.begin),
      srvyEndYmd: toStorageYmd(form.end),
    });
    if (!validated) return;
    submitPendingRef.current = true;
    setIsSubmitting(true);
    try {
      const copySn = await surveyAdminService.copySurvey(source.srvySn, validated as z.output<typeof surveyCopyFormSchema>);
      toast('설문을 복제했습니다. 사본을 선택했습니다.', 'success');
      onCopied(copySn);
      onClose();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '설문을 복제하지 못했습니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <StandardModal isOpen onClose={requestClose} title="설문 복제" maxWidth="lg" closeDisabled={isSubmitting}>
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <FormErrorSummary errors={validation.errors} labels={labels} onNavigate={validation.focusError} />
        <p className="text-xs text-muted-foreground">
          문항과 선택 항목을 그대로 복제합니다. 응답은 복제하지 않습니다. 사본이 응답을 받을 기간을 새로 정해 주세요.
        </p>
        <div className="space-y-2">
          <Label htmlFor="copy-srvyTtl">사본 제목 <span className="text-destructive-emphasis">*</span></Label>
          <Input
            id="copy-srvyTtl"
            {...validation.fieldProps('srvyTtl')}
            value={form.srvyTtl}
            onChange={(e) => { validation.clearError('srvyTtl'); setForm({ ...form, srvyTtl: e.target.value }); }}
            maxLength={256}
            required
            autoFocus
          />
          {validation.errors.srvyTtl ? (
            <p {...validation.messageProps('srvyTtl')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="copy-srvyBgngYmd">시작일 <span className="text-destructive-emphasis">*</span></Label>
            <Input
              id="copy-srvyBgngYmd"
              type="date"
              {...validation.fieldProps('srvyBgngYmd')}
              value={form.begin}
              onChange={(e) => { validation.clearError('srvyBgngYmd'); setForm({ ...form, begin: e.target.value }); }}
              required
            />
            {validation.errors.srvyBgngYmd ? (
              <p {...validation.messageProps('srvyBgngYmd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="copy-srvyEndYmd">종료일 <span className="text-destructive-emphasis">*</span></Label>
            <Input
              id="copy-srvyEndYmd"
              type="date"
              {...validation.fieldProps('srvyEndYmd')}
              value={form.end}
              onChange={(e) => { validation.clearError('srvyEndYmd'); setForm({ ...form, end: e.target.value }); }}
              required
            />
            {validation.errors.srvyEndYmd ? (
              <p {...validation.messageProps('srvyEndYmd')} className="text-xs font-bold text-destructive-emphasis" />
            ) : null}
          </div>
        </div>
        {/* 제출 버튼은 form 안에 둔다 — 폼 계약이 submit.closest('form') 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={requestClose} disabled={isSubmitting}>취소</Button>
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting || undefined}>
            {isSubmitting ? '복제 중…' : '복제'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
