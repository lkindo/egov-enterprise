'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { z } from 'zod';
import { mfaService } from '@/services/foundation/auth/mfaService';
import { type AuthLoginData } from '@/lib/auth/auth-bff-contract';
import { mfaCodeSchema, mfaRecoveryCodeSchema, type MfaEnrollment } from '@/lib/auth/mfa-bff-contract';

export function RecoveryCodes({ codes, onContinue }: { codes: string[]; onContinue: () => void }) {
  return <section className="space-y-4" aria-label="복구 코드 보관">
    <h2 className="font-semibold">복구 코드를 안전한 곳에 보관해 주세요</h2>
    <p className="text-sm">이 코드는 이번에만 표시됩니다. 각 코드는 한 번만 사용할 수 있으며, 사용 후 인증앱을 다시 등록해야 합니다.</p>
    <ul className="grid grid-cols-2 gap-2 font-mono" aria-label="일회용 복구 코드">{codes.map(code => <li key={code}>{code}</li>)}</ul>
    <Button onClick={onContinue}>복구 코드를 보관했습니다</Button>
  </section>;
}

export function MfaChallengePanel({ stage: initialStage, enrollment: initialEnrollment, onComplete, onCancel }: {
  stage: 'MFA_REQUIRED' | 'ENROLLMENT_REQUIRED'; enrollment?: MfaEnrollment;
  onComplete: () => void; onCancel: () => void;
}) {
  const id = useId();
  const [stage, setStage] = useState(initialStage);
  const [enrollment, setEnrollment] = useState(initialEnrollment);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [code, setCode] = useState('');
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const submittingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const challengeFormSchema = z.strictObject({ code: recoveryMode ? mfaRecoveryCodeSchema : mfaCodeSchema });
  const validation = useManualFormValidation(challengeFormSchema, {
    labels: { code: recoveryMode ? '복구 코드' : '인증앱 코드' }, focusTargets: { code: () => input.current },
  });
  useEffect(() => { heading.current?.focus(); }, [stage]);
  const accept = (result: AuthLoginData) => {
    setCode('');
    if (result.authenticationStage === 'ENROLLMENT_REQUIRED' || result.authenticationStage === 'MFA_REQUIRED') {
      setStage(result.authenticationStage); setEnrollment(undefined); setRecoveryMode(false); return;
    }
    setEnrollment(undefined);
    if ('recoveryCodes' in result && result.recoveryCodes?.length) setCodes(result.recoveryCodes); else onComplete();
  };
  const run = async (operation: () => Promise<void>) => {
    if (submittingRef.current) return;
    submittingRef.current = true; setPending(true); validation.setFormErrors({});
    try { await operation(); }
    catch { validation.setFormErrors({ root: '추가 인증을 완료하지 못했습니다. 코드와 유효 시간을 확인하고 다시 시도해 주세요. 계속 실패하면 로그인부터 다시 진행해 주세요.' }); }
    finally { submittingRef.current = false; setPending(false); }
  };
  if (codes) return <RecoveryCodes codes={codes} onContinue={() => { setCodes(null); onComplete(); }} />;
  return <section className="space-y-4" aria-label="추가 인증" aria-busy={pending}>
    <p className="text-sm">설정을 취소하거나 화면을 새로고침하면 다시 로그인해야 할 수 있습니다.</p>
    <h2 ref={heading} tabIndex={-1} className="font-semibold">{stage === 'ENROLLMENT_REQUIRED' ? '인증앱 등록' : '추가 인증'}</h2>
    {stage === 'ENROLLMENT_REQUIRED' && !enrollment ? <>
      <p className="text-sm">인증앱을 등록해야 로그인이 완료됩니다. 분실 복구 중이면 기존 인증앱과 복구 코드는 사용할 수 없습니다.</p>
      <Button disabled={pending} onClick={() => void run(async () => setEnrollment(await mfaService.prepare()))}>인증앱 등록 준비</Button>
    </> : <form method="post" noValidate className="space-y-4" onSubmit={event => {
      event.preventDefault();
      const values = validation.validate({ code });
      if (!values) return;
      void run(async () => accept(stage === 'ENROLLMENT_REQUIRED' ? await mfaService.confirm(values.code) : await mfaService.verify(recoveryMode ? { recoveryCode: values.code } : { code: values.code })));
    }}>
      {enrollment && <div className="space-y-2">
        <p className="text-sm">인증앱에서 시간 기반 계정을 추가하고 아래 등록 키를 입력하세요. 등록 키는 다른 사람에게 공유하지 마세요.</p>
        <p className="break-all rounded border p-3 font-mono" aria-label="인증앱 등록 키">{enrollment.secret}</p>
      </div>}
      <Label htmlFor={`${id}-code`}>{recoveryMode ? '복구 코드' : '인증앱 코드'}</Label>
      <Input ref={input} {...validation.fieldProps('code')} aria-required="true" id={`${id}-code`} value={code} onChange={event => { setCode(event.target.value); validation.clearError('code'); }}
        autoComplete="one-time-code" inputMode={recoveryMode ? 'text' : 'numeric'} maxLength={recoveryMode ? 22 : 6}
        disabled={pending} />
      {validation.errors.code && <p {...validation.messageProps('code')} className="text-sm text-destructive-emphasis">{validation.errors.code}</p>}
      <Button type="submit" disabled={pending}>{pending ? '확인 중…' : '인증 확인'}</Button>
      {stage === 'MFA_REQUIRED' && <Button type="button" variant="ghost" disabled={pending} onClick={() => { setRecoveryMode(!recoveryMode); setCode(''); validation.setFormErrors({}); }}>{recoveryMode ? '인증앱으로 인증' : '분실 시 복구 코드 사용'}</Button>}
    </form>}
    <FormErrorSummary errors={validation.errors} labels={{ code: recoveryMode ? '복구 코드' : '인증앱 코드' }} onNavigate={validation.focusError} />
    <Button variant="outline" disabled={pending} onClick={onCancel}>취소하고 다시 로그인</Button>
  </section>;
}
