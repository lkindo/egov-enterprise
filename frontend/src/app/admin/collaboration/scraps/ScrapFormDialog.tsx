'use client';

import React, { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { scrapMutationOptions } from '@/queries/scrap-query-options';
import {
  scrapCreateFormSchema,
  scrapEditFormSchema,
  scrapValidationLabels,
} from './scrap-form-validation';

export interface ScrapFormValues {
  scrapNm: string;
  scrapUrl: string;
  scrapExpln: string;
}

const EMPTY: ScrapFormValues = { scrapNm: '', scrapUrl: '', scrapExpln: '' };

/**
 * 스크랩 등록·수정 모달 — 업무 화면 문법 §A3-1 의 기본 그릇.
 *
 * <p>종전에는 라우트가 둘이었다. `insertScrap`(등록)과 `selectScrapDetail/[id]`(수정)인데, 후자는
 * 이름이 '상세' 지만 **읽기 전용 표면이 0** 이었다 — 303줄 렌더 트리가 제목과 입력 3개, 삭제, '수정 완료'
 * 뿐이라 등록일·소유자 같은 열람 필드가 없었다. 즉 둘 다 전용 입력 페이지였고, 리치 텍스트·첨부·
 * 마법사·공유 URL·대형 구조물 어느 조건도 충족하지 않았다.
 *
 * <p>목록의 조회 상태(page·pageSize·정렬)는 `useState` 이고 URL 에 실리지 않으므로 라우트를 떠나면
 * 전손된다. 모달은 저장 후 목록 쿼리만 무효화해 현재 페이지를 그대로 둔다.
 *
 * <p>⚠ 미저장 보호는 페이지의 전유물이 아니다 — 닫기 경로 전부(Esc·배경·X·취소)에
 * {@link useDirtyCloseGuard} 를 걸고, 저장 중 닫기는 `StandardModal` 의 `closeDisabled` 가 막는다.
 */
export function ScrapFormDialog({
  isOpen,
  mode,
  scrapSn,
  initialValues,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  mode: 'create' | 'edit';
  scrapSn?: number;
  initialValues?: ScrapFormValues;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<ScrapFormValues>(initialValues ?? EMPTY);
  const [loading, setLoading] = useState(false);
  const submitPendingRef = useRef(false);

  const isEdit = mode === 'edit';
  const validation = useManualFormValidation(isEdit ? scrapEditFormSchema : scrapCreateFormSchema, {
    labels: scrapValidationLabels,
  });
  const createMutation = useMutation(scrapMutationOptions.create(queryClient));
  const updateMutation = useMutation(scrapMutationOptions.update(queryClient));

  const baseline = initialValues ?? EMPTY;
  const dirty = (Object.keys(EMPTY) as (keyof ScrapFormValues)[])
    .some((key) => formData[key] !== baseline[key]);

  const closeAndReset = () => {
    setFormData(initialValues ?? EMPTY);
    validation.setFormErrors({}, false);
    onClose();
  };
  const requestClose = useDirtyCloseGuard(dirty, closeAndReset);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitPendingRef.current) return;
    // useYn 은 서버 DTO 필수값(@NotBlank)이다 — 누락 시 등록이 100% 400 으로 실패한다.
    // 소유자(userId)는 서버가 인증 주체에서 파생하므로 전송하지 않는다.
    const validated = validation.validate({ ...formData, useYn: 'Y' });
    if (!validated) return;

    submitPendingRef.current = true;
    setLoading(true);
    try {
      if (isEdit) {
        if (scrapSn === undefined) throw new Error('수정 대상 스크랩 일련번호가 없습니다.');
        await updateMutation.mutateAsync({ scrapSn, data: validated });
        toast('스크랩이 수정되었습니다.', 'success');
      } else {
        await createMutation.mutateAsync(validated);
        toast('스크랩이 등록되었습니다.', 'success');
      }
      validation.setFormErrors({}, false);
      onClose();
      onSaved();
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, isEdit ? '수정에 실패했습니다.' : '등록에 실패했습니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <StandardModal
      isOpen={isOpen}
      onClose={requestClose}
      title={isEdit ? '스크랩 수정' : '스크랩 등록'}
      maxWidth="2xl"
      closeDisabled={loading}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <FormErrorSummary
          errors={validation.errors}
          labels={scrapValidationLabels}
          onNavigate={validation.focusError}
        />

        <div className="space-y-2">
          <Label htmlFor="scrapNm">
            스크랩명 <span className="text-destructive-emphasis">*</span>
          </Label>
          <Input
            id="scrapNm"
            {...validation.fieldProps('scrapNm')}
            value={formData.scrapNm}
            onChange={(e) => {
              validation.clearError('scrapNm');
              setFormData({ ...formData, scrapNm: e.target.value });
            }}
            placeholder="스크랩 이름을 입력하세요."
            data-testid="scrap-name-input"
            maxLength={60}
            required
            autoFocus
          />
          {validation.errors.scrapNm ? (
            <p {...validation.messageProps('scrapNm')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scrapUrl">
            참조 URL <span className="text-destructive-emphasis">*</span>
          </Label>
          <Input
            id="scrapUrl"
            {...validation.fieldProps('scrapUrl')}
            value={formData.scrapUrl}
            onChange={(e) => {
              validation.clearError('scrapUrl');
              setFormData({ ...formData, scrapUrl: e.target.value });
            }}
            placeholder="https://example.com"
            data-testid="scrap-url-input"
            required
          />
          {validation.errors.scrapUrl ? (
            <p {...validation.messageProps('scrapUrl')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="scrapExpln">설명</Label>
          <Textarea
            id="scrapExpln"
            {...validation.fieldProps('scrapExpln')}
            value={formData.scrapExpln}
            onChange={(e) => {
              validation.clearError('scrapExpln');
              setFormData({ ...formData, scrapExpln: e.target.value });
            }}
            placeholder="이 스크랩을 왜 남기는지 적어 두면 나중에 찾기 쉽습니다."
            data-testid="scrap-expln-input"
            rows={4}
          />
          {validation.errors.scrapExpln ? (
            <p {...validation.messageProps('scrapExpln')} className="text-xs font-bold text-destructive-emphasis" />
          ) : null}
        </div>

        {/* 제출 버튼은 form **안**에 둔다 — 폼 계약이 `submit.closest('form')` 으로 form 을 찾는다. */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={requestClose} disabled={loading}>
            취소
          </Button>
          <Button type="submit" data-testid="scrap-submit-button" disabled={loading} aria-busy={loading}>
            {loading ? '저장 중…' : isEdit ? '수정 완료' : '스크랩 등록'}
          </Button>
        </div>
      </form>
    </StandardModal>
  );
}
