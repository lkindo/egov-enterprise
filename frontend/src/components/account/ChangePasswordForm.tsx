'use client';

import { useRef, useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { PasswordChangeRequestSchema } from '@/types/generated-zod';

const LABELS = {
  oldPassword: '현재 비밀번호',
  newPassword: '새 비밀번호',
  confirmPassword: '새 비밀번호 확인',
};

/**
 * 본인 비밀번호 변경 스키마 — 백엔드 SSOT(`PasswordChangeRequest`: newPassword 8~20자)를 확장한다.
 * 비밀번호는 공백도 문자이므로 trim 하지 않는다.
 */
export const changePasswordSchema = PasswordChangeRequestSchema.extend({
  oldPassword: z.string().min(1, '현재 비밀번호를 입력해 주세요.'),
  newPassword: z.string()
    .min(8, '새 비밀번호는 8~20자여야 합니다.')
    .max(20, '새 비밀번호는 8~20자여야 합니다.'),
  confirmPassword: z.string().min(1, '새 비밀번호를 한 번 더 입력해 주세요.'),
})
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: '새 비밀번호와 확인 입력이 일치하지 않습니다.',
  })
  .refine((values) => values.oldPassword !== values.newPassword, {
    path: ['newPassword'],
    message: '새 비밀번호가 현재 비밀번호와 같습니다.',
  });

interface ChangePasswordFormProps {
  /** 서버 호출은 부모가 소유한다. 실패는 그대로 throw 해야 이 폼이 필드 오류·안내를 처리한다. */
  onSubmit: (oldPassword: string, newPassword: string) => Promise<void>;
  onCancel: () => void;
  /** 이 폼의 저장이 진행 중 */
  isPending?: boolean;
}

/**
 * 본인 비밀번호 변경.
 *
 * <p>[2026-09-08] 서버는 `PUT /api/v1/users/me/password` 와 `userService.changePassword` 를 갖췄는데
 * <b>호출부가 0건</b>이었다(operation-consumer-census 축 2 실측). DEC-OPS-032 가 관리자 초기화만
 * 열면서 "로그인 화면에 비밀번호 찾기는 두지 않는다(엔터프라이즈 정책)" 를 명시했는데, 조사해 보니
 * <b>본인이 자기 비밀번호를 바꾸는 경로도 없었다</b> — 정책 선택이 아니라 누락이었고, 사용자는
 * 관리자에게 초기화를 부탁하는 길밖에 없었다.
 *
 * <p>현재 비밀번호를 함께 요구하는 것은 서버 계약이다({@code PasswordChangeRequest.oldPassword}
 * 필수) — 세션만 탈취한 공격자가 비밀번호를 바꿔 계정을 잠그는 경로를 막는다.
 */
export function ChangePasswordForm({ onSubmit, onCancel, isPending = false }: ChangePasswordFormProps) {
  const { toast } = useToast();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const submitPendingRef = useRef(false);
  const [isSubmitPending, setSubmitPending] = useState(false);
  const oldPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const validation = useManualFormValidation(changePasswordSchema, {
    labels: LABELS,
    focusTargets: {
      oldPassword: () => oldPasswordRef.current,
      newPassword: () => newPasswordRef.current,
      confirmPassword: () => confirmPasswordRef.current,
    },
  });

  const isBusy = isPending || isSubmitPending;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitPendingRef.current || isBusy) return;

    const validated = validation.validate({ oldPassword, newPassword, confirmPassword });
    if (!validated) return;

    submitPendingRef.current = true;
    setSubmitPending(true);
    try {
      await onSubmit(validated.oldPassword, validated.newPassword);
    } catch (error: unknown) {
      // 서버가 필드 오류를 주면 그 자리에 붙이고, 아니면 안내로 드러낸다. 입력은 유지한다 —
      // 비밀번호를 세 칸이나 다시 치게 만들지 않는다.
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '비밀번호를 변경하지 못했습니다. 입력한 내용은 유지됩니다.'), 'error');
    } finally {
      submitPendingRef.current = false;
      setSubmitPending(false);
    }
  };

  const oldPasswordProps = validation.fieldProps('oldPassword');
  const newPasswordProps = validation.fieldProps('newPassword');
  const confirmPasswordProps = validation.fieldProps('confirmPassword');

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5" aria-label="비밀번호 변경 폼">
      <FormErrorSummary
        errors={validation.errors}
        labels={LABELS}
        onNavigate={validation.focusError}
      />

      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        변경하면 기존 비밀번호로는 즉시 로그인할 수 없습니다. 현재 로그인 세션은 유지됩니다.
      </div>

      <div className="space-y-2">
        <label htmlFor="account-password-old" className="text-sm font-semibold text-foreground">
          현재 비밀번호
        </label>
        <Input
          {...oldPasswordProps}
          id="account-password-old"
          ref={oldPasswordRef}
          type="password"
          autoComplete="current-password"
          value={oldPassword}
          onChange={(event) => {
            validation.clearError('oldPassword');
            setOldPassword(event.target.value);
          }}
          disabled={isBusy}
          required
        />
        {validation.errors.oldPassword ? (
          <p {...validation.messageProps('oldPassword')} className="text-xs font-bold text-destructive-emphasis" />
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="account-password-new" className="text-sm font-semibold text-foreground">
          새 비밀번호
        </label>
        <Input
          {...newPasswordProps}
          id="account-password-new"
          ref={newPasswordRef}
          type="password"
          autoComplete="new-password"
          maxLength={20}
          value={newPassword}
          onChange={(event) => {
            validation.clearError('newPassword');
            setNewPassword(event.target.value);
          }}
          disabled={isBusy}
          required
        />
        <p className="text-xs text-muted-foreground">8~20자로 입력하세요.</p>
        {validation.errors.newPassword ? (
          <p {...validation.messageProps('newPassword')} className="text-xs font-bold text-destructive-emphasis" />
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="account-password-confirm" className="text-sm font-semibold text-foreground">
          새 비밀번호 확인
        </label>
        <Input
          {...confirmPasswordProps}
          id="account-password-confirm"
          ref={confirmPasswordRef}
          type="password"
          autoComplete="new-password"
          maxLength={20}
          value={confirmPassword}
          onChange={(event) => {
            validation.clearError('confirmPassword');
            setConfirmPassword(event.target.value);
          }}
          disabled={isBusy}
          required
        />
        {validation.errors.confirmPassword ? (
          <p {...validation.messageProps('confirmPassword')} className="text-xs font-bold text-destructive-emphasis" />
        ) : null}
      </div>

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={isBusy}>
          취소
        </Button>
        <Button type="submit" className="flex-[2]" disabled={isBusy} aria-busy={isBusy || undefined}>
          {isBusy ? '변경 중…' : '비밀번호 변경'}
        </Button>
      </div>
    </form>
  );
}
