'use client';

import { useRef, useState } from 'react';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { AdminPasswordChangeRequestSchema } from '@/types/generated-zod';

const LABELS = {
  newPassword: '새 비밀번호',
  confirmPassword: '새 비밀번호 확인',
};

/**
 * 관리자 비밀번호 초기화 폼 스키마 — 백엔드 SSOT(`AdminPasswordChangeRequest`: 8~20자)를 확장한다.
 * 비밀번호는 공백도 문자이므로 trim 하지 않는다.
 */
export const adminPasswordResetSchema = AdminPasswordChangeRequestSchema.extend({
  newPassword: z.string()
    .min(8, '새 비밀번호는 8~20자여야 합니다.')
    .max(20, '새 비밀번호는 8~20자여야 합니다.'),
  confirmPassword: z.string().min(1, '새 비밀번호를 한 번 더 입력해 주세요.'),
}).refine((values) => values.newPassword === values.confirmPassword, {
  path: ['confirmPassword'],
  message: '새 비밀번호와 확인 입력이 일치하지 않습니다.',
});

interface AdminPasswordResetFormProps {
  /** 초기화 대상 표시(이름·아이디). 무엇을 바꾸는지 모른 채 누르는 오조작을 막는다. */
  targetLabel: string;
  /** 서버 호출은 부모가 소유한다. 실패는 그대로 throw 해야 이 폼이 필드 오류·안내를 처리한다. */
  onSubmit: (newPassword: string) => Promise<void>;
  onCancel: () => void;
  /** 이 폼의 저장이 진행 중 */
  isPending?: boolean;
  /** 같은 화면의 다른 쓰기 작업이 진행 중 — 이 폼도 잠근다 */
  externalBusy?: boolean;
}

/**
 * 관리자 비밀번호 초기화.
 *
 * [2026-09-05] 로그인 화면에는 비밀번호 찾기가 없고(엔터프라이즈 정책), 그 대신 있어야 할 관리자
 * 초기화는 API(`PATCH /admin/system/users/{userId}/password`)와 프런트 서비스 메서드
 * (`userAdminService.updatePassword`)까지 있었지만 **호출부가 0건**이었다. 비밀번호를 잊은 사용자는
 * DB 직접 조작 말고는 길이 없었다. 관리자가 새 비밀번호를 정해 사용자에게 직접 전달하는 흐름이다.
 */
export function AdminPasswordResetForm({
  targetLabel,
  onSubmit,
  onCancel,
  isPending = false,
  externalBusy = false,
}: AdminPasswordResetFormProps) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const submitPendingRef = useRef(false);
  const [isSubmitPending, setSubmitPending] = useState(false);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const validation = useManualFormValidation(adminPasswordResetSchema, {
    labels: LABELS,
    focusTargets: {
      newPassword: () => newPasswordRef.current,
      confirmPassword: () => confirmPasswordRef.current,
    },
  });

  const isBusy = isPending || isSubmitPending || externalBusy;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitPendingRef.current || isBusy) return;

    const validated = validation.validate({ newPassword, confirmPassword });
    if (!validated) return;

    submitPendingRef.current = true;
    setSubmitPending(true);
    try {
      await onSubmit(validated.newPassword);
    } catch (error: unknown) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '비밀번호를 초기화하지 못했습니다. 입력한 내용은 유지됩니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setSubmitPending(false);
    }
  };

  const newPasswordProps = validation.fieldProps('newPassword');
  const confirmPasswordProps = validation.fieldProps('confirmPassword');

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="비밀번호 초기화 폼">
      <FormErrorSummary
        errors={validation.errors}
        labels={LABELS}
        onNavigate={validation.focusError}
      />

      <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
        <p className="font-semibold text-foreground">대상: {targetLabel}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          초기화하면 기존 비밀번호로는 즉시 로그인할 수 없습니다. 새 비밀번호는 시스템이 전달하지 않으므로
          사용자에게 직접 안전한 경로로 알려 주세요.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="admin-password-reset-new" className="text-sm font-semibold text-foreground">
          새 비밀번호
        </label>
        <Input
          id="admin-password-reset-new"
          ref={newPasswordRef}
          type="password"
          autoComplete="new-password"
          value={newPassword}
          maxLength={20}
          onChange={(event) => {
            validation.clearError('newPassword');
            setNewPassword(event.target.value);
          }}
          aria-invalid={newPasswordProps['aria-invalid']}
          aria-describedby={[newPasswordProps['aria-describedby'], 'admin-password-reset-help'].filter(Boolean).join(' ')}
        />
        <p id="admin-password-reset-help" className="text-xs text-muted-foreground">8~20자</p>
        {validation.errors.newPassword ? (
          <p {...validation.messageProps('newPassword')} className="text-xs font-bold text-destructive-emphasis" />
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="admin-password-reset-confirm" className="text-sm font-semibold text-foreground">
          새 비밀번호 확인
        </label>
        <Input
          id="admin-password-reset-confirm"
          ref={confirmPasswordRef}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          maxLength={20}
          onChange={(event) => {
            validation.clearError('confirmPassword');
            setConfirmPassword(event.target.value);
          }}
          aria-invalid={confirmPasswordProps['aria-invalid']}
          aria-describedby={confirmPasswordProps['aria-describedby']}
        />
        {validation.errors.confirmPassword ? (
          <p {...validation.messageProps('confirmPassword')} className="text-xs font-bold text-destructive-emphasis" />
        ) : null}
      </div>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isBusy}>취소</Button>
        <Button type="submit" disabled={isBusy} aria-busy={isPending || isSubmitPending || undefined}>
          <KeyRound aria-hidden="true" />
          {isPending || isSubmitPending ? '초기화 중…' : '비밀번호 초기화'}
        </Button>
      </div>
    </form>
  );
}
