'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import type { Satisfaction } from '@/services/business/board/SatisfactionService';
import { satisfactionCreateSchema, satisfactionValidationLabels } from './satisfaction-form-validation';
import { Stars } from './Stars';

interface SatisfactionEditFormProps {
  /** 편집 대상. 목록 행이 이미 점수·내용을 갖고 있어 별도 상세 조회가 필요 없다. */
  item: Satisfaction;
  /** 서버 호출은 부모가 소유한다. 실패는 그대로 throw 해야 이 폼이 필드 오류·안내를 처리한다. */
  onSubmit: (body: Satisfaction) => Promise<void>;
  onCancel: () => void;
  /** 부모가 아는 진행 상태(다른 행의 삭제 등)로도 잠근다. */
  isPending?: boolean;
}

/**
 * 만족도 수정 폼.
 *
 * <p>[2026-09-08] ADR-0011 이 만족도 수정을 <b>인증된 owner-or-admin</b> 으로 열어 뒀는데 화면에는
 * 등록·삭제만 있어, 별을 잘못 누르면 지우고 다시 매기는 수밖에 없었다(operation-consumer-census
 * 축 1 이 `update` 를 소비 0 으로 지목).
 *
 * <p>서버(`SatisfactionService#updateSatisfaction`)가 갱신하는 것은 <b>점수와 내용 둘뿐</b>이므로
 * 편집도 그 둘만 다룬다. 권한은 화면이 추측하지 않는다 — 저장을 눌러 보고 서버 판정
 * (`assertCanModify`)을 그대로 보여준다. 화면에서 권한을 흉내내면 서버 규칙과 갈라진다.
 */
export function SatisfactionEditForm({ item, onSubmit, onCancel, isPending = false }: SatisfactionEditFormProps) {
  const [score, setScore] = useState(item.dgstfnScr ?? 0);
  const [content, setContent] = useState(item.dgstfnCn ?? '');
  const submitPendingRef = useRef(false);
  const [isSubmitPending, setSubmitPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scoreGroupRef = useRef<HTMLDivElement>(null);

  const validation = useManualFormValidation(satisfactionCreateSchema, {
    labels: satisfactionValidationLabels,
    focusTargets: { dgstfnScr: () => scoreGroupRef.current },
  });

  const isBusy = isPending || isSubmitPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitPendingRef.current || isBusy) return;

    const validated = validation.validate({ dgstfnScr: score, dgstfnCn: content, useYn: 'Y' });
    if (!validated) return;

    submitPendingRef.current = true;
    setSubmitPending(true);
    setError(null);
    try {
      // useYn 은 본문에 실려도 서버가 반영하지 않는다(점수·내용만 갱신).
      await onSubmit(validated as Satisfaction);
    } catch (submitError: unknown) {
      const fieldErrors = extractFieldErrors(submitError);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else setError(extractErrorMessage(submitError, '수정 권한이 없습니다.'));
    } finally {
      submitPendingRef.current = false;
      setSubmitPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex-1 min-w-0 space-y-2" aria-label="만족도 수정 폼">
      <FormErrorSummary
        errors={validation.errors}
        labels={satisfactionValidationLabels}
        onNavigate={validation.focusError}
      />

      <div ref={scoreGroupRef} role="radiogroup" aria-label="만족도 점수 수정">
        <Stars
          score={score}
          size={14}
          onSelect={(n) => {
            validation.clearError('dgstfnScr');
            setScore(n);
          }}
        />
      </div>
      {validation.errors.dgstfnScr ? (
        <p {...validation.messageProps('dgstfnScr')} className="text-xs font-bold text-destructive-emphasis" />
      ) : null}

      <textarea
        {...validation.fieldProps('dgstfnCn')}
        aria-label="만족도 의견 수정"
        value={content}
        onChange={(event) => {
          validation.clearError('dgstfnCn');
          setContent(event.target.value);
        }}
        rows={2}
        maxLength={4000}
        disabled={isBusy}
        className="w-full text-sm border rounded-md p-2 bg-background resize-none"
      />
      {validation.errors.dgstfnCn ? (
        <p {...validation.messageProps('dgstfnCn')} className="text-xs font-bold text-destructive-emphasis" />
      ) : null}

      {error && <p role="alert" className="text-sm text-destructive-emphasis">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isBusy}>
          취소
        </Button>
        <Button type="submit" size="sm" disabled={isBusy} aria-busy={isBusy || undefined}>
          {isBusy ? '만족도 저장 중…' : '만족도 저장'}
        </Button>
      </div>
    </form>
  );
}
