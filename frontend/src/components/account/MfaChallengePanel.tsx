'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'use-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { z } from 'zod';
import { mfaService } from '@/services/foundation/auth/mfaService';
import { type AuthLoginData } from '@/lib/auth/auth-bff-contract';
import { MFA_CODE_PATTERN, MFA_RECOVERY_CODE_PATTERN, type MfaEnrollment } from '@/lib/auth/mfa-bff-contract';
import { catalogKey } from '@/i18n/catalog';

/*
 * [2026-11-26 ADR-0063] 추가 인증은 로그인 화면의 일부라 번역을 마친 화면이다 — 고정 문구는 카탈로그(mfa)에서 그린다. 코드 형식은
 * BFF 요청 계약(mfa-bff-contract)과 같은 패턴을 쓰고, 화면의 안내 문구만 카탈로그 키로 둔다.
 */
const appCodeSchema = z.string().regex(MFA_CODE_PATTERN, catalogKey('mfa.appCodeInvalid'));
const recoveryCodeSchema = z.string().trim().regex(MFA_RECOVERY_CODE_PATTERN, catalogKey('mfa.recoveryCodeInvalid'));

export function RecoveryCodes({ codes, onContinue }: { codes: string[]; onContinue: () => void }) {
  const t = useTranslations('mfa');
  return <section className="space-y-4" aria-label={t('recoveryRegion')}>
    <h2 className="font-semibold">{t('recoveryTitle')}</h2>
    <p className="text-sm">{t('recoveryHelp')}</p>
    <ul className="grid grid-cols-2 gap-2 font-mono" aria-label={t('recoveryList')}>{codes.map(code => <li key={code}>{code}</li>)}</ul>
    <Button onClick={onContinue}>{t('recoveryDone')}</Button>
  </section>;
}

export function MfaChallengePanel({ stage: initialStage, enrollment: initialEnrollment, onComplete, onCancel }: {
  stage: 'MFA_REQUIRED' | 'ENROLLMENT_REQUIRED'; enrollment?: MfaEnrollment;
  onComplete: () => void; onCancel: () => void;
}) {
  const t = useTranslations('mfa');
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
  const codeLabel = recoveryMode ? t('recoveryCodeLabel') : t('appCodeLabel');
  const challengeFormSchema = z.strictObject({ code: recoveryMode ? recoveryCodeSchema : appCodeSchema });
  const validation = useManualFormValidation(challengeFormSchema, {
    labels: { code: codeLabel }, focusTargets: { code: () => input.current },
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
    catch { validation.setFormErrors({ root: catalogKey('mfa.failure') }); }
    finally { submittingRef.current = false; setPending(false); }
  };
  if (codes) return <RecoveryCodes codes={codes} onContinue={() => { setCodes(null); onComplete(); }} />;
  return <section className="space-y-4" aria-label={t('region')} aria-busy={pending}>
    <p className="text-sm">{t('cancelWarning')}</p>
    <h2 ref={heading} tabIndex={-1} className="font-semibold">{stage === 'ENROLLMENT_REQUIRED' ? t('enrollTitle') : t('region')}</h2>
    {stage === 'ENROLLMENT_REQUIRED' && !enrollment ? <>
      <p className="text-sm">{t('enrollIntro')}</p>
      <Button disabled={pending} onClick={() => void run(async () => setEnrollment(await mfaService.prepare()))}>{t('enrollPrepare')}</Button>
    </> : <form method="post" noValidate className="space-y-4" onSubmit={event => {
      event.preventDefault();
      const values = validation.validate({ code });
      if (!values) return;
      void run(async () => accept(stage === 'ENROLLMENT_REQUIRED' ? await mfaService.confirm(values.code) : await mfaService.verify(recoveryMode ? { recoveryCode: values.code } : { code: values.code })));
    }}>
      {enrollment && <div className="space-y-2">
        <p className="text-sm">{t('enrollHelp')}</p>
        <p className="break-all rounded border p-3 font-mono" aria-label={t('enrollKey')}>{enrollment.secret}</p>
      </div>}
      <Label htmlFor={`${id}-code`}>{codeLabel}</Label>
      <Input ref={input} {...validation.fieldProps('code')} aria-required="true" id={`${id}-code`} value={code} onChange={event => { setCode(event.target.value); validation.clearError('code'); }}
        autoComplete="one-time-code" inputMode={recoveryMode ? 'text' : 'numeric'} maxLength={recoveryMode ? 22 : 6}
        disabled={pending} />
      {validation.errors.code && <p {...validation.messageProps('code')} className="text-sm text-destructive-emphasis">{validation.errors.code}</p>}
      <Button type="submit" disabled={pending}>{pending ? t('checking') : t('verify')}</Button>
      {stage === 'MFA_REQUIRED' && <Button type="button" variant="ghost" disabled={pending} onClick={() => { setRecoveryMode(!recoveryMode); setCode(''); validation.setFormErrors({}); }}>{recoveryMode ? t('useApp') : t('useRecovery')}</Button>}
    </form>}
    <FormErrorSummary errors={validation.errors} labels={{ code: codeLabel }} onNavigate={validation.focusError} />
    <Button variant="outline" disabled={pending} onClick={onCancel}>{t('cancel')}</Button>
  </section>;
}
