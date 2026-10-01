'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormErrorSummary } from '@/components/ui/form';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { mfaService } from '@/services/foundation/auth/mfaService';
import { mfaBrowserRequests, type MfaEnrollment, type MfaStatus } from '@/lib/auth/mfa-bff-contract';
import { MfaChallengePanel, RecoveryCodes } from './MfaChallengePanel';
import { clearTargetHandoff, useTargetHandoff } from '@/lib/navigation/target-handoff';

const managementFormSchema = z.discriminatedUnion('action', [
  mfaBrowserRequests['enrollment/start'].extend({ action: z.literal('start') }),
  mfaBrowserRequests.reauthenticate.extend({ action: z.enum(['regenerate', 'disable']) }),
  mfaBrowserRequests.reauthenticate.extend({ action: z.literal('recover'), ...mfaBrowserRequests['recovery/admin'].shape }),
]);
const fieldLabels = { password: '현재 비밀번호', code: '인증앱 코드', esntlId: '대상 계정 고유 ID', verificationReference: '본인 확인 승인 참조번호' };

export function MfaSettings({ onCloseLockChange }: { onCloseLockChange?: (locked: boolean) => void }) {
  const { user, logout, enterMfaChallenge } = useAuth();
  const id = useId();
  const [status, setStatus] = useState<MfaStatus | null>(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  // [2026-10-01 결정 18] 사용자 상세의 '추가 인증 복구 승인' 이 넘긴 대상. 직접 입력하기 전까지만 쓴다.
  const handedTarget = useTargetHandoff('mfa-recover-user');
  const [typedTarget, setTypedTarget] = useState<string | null>(null);
  const target = typedTarget ?? handedTarget?.id ?? '';
  const setTarget = (value: string) => { clearTargetHandoff('mfa-recover-user'); setTypedTarget(value); };
  const [reference, setReference] = useState('');
  const [enrollment, setEnrollment] = useState<MfaEnrollment>();
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const submittingRef = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const validation = useManualFormValidation(managementFormSchema, { labels: fieldLabels, form: () => form.current });
  const { setFormErrors } = validation;
  useEffect(() => {
    onCloseLockChange?.(pending || !!enrollment || codes !== null);
    return () => onCloseLockChange?.(false);
  }, [pending, enrollment, codes, onCloseLockChange]);
  useEffect(() => {
    let active = true;
    mfaService.status().then(value => { if (active) setStatus(value); }).catch(() => { if (active) setFormErrors({ root: '추가 인증 상태를 불러오지 못했습니다. 잠시 후 다시 열어 주세요.' }); });
    return () => { active = false; };
  }, [setFormErrors]);
  const finish = () => window.location.reload();
  const leave = async () => { await logout(); window.location.replace('/login'); };
  const run = async (action: 'start' | 'regenerate' | 'disable' | 'recover') => {
    if (submittingRef.current) return;
    const values = validation.validate(action === 'start' ? { action, password }
      : action === 'recover' ? { action, password, code, esntlId: target.trim(), verificationReference: reference.trim() }
        : { action, password, code });
    if (!values) return;
    submittingRef.current = true; setPending(true); validation.setFormErrors({}); setMessage('');
    try {
      if (action === 'start') {
        const prepared = await mfaService.start(password);
        enterMfaChallenge();
        setEnrollment(prepared);
      }
      else {
        await mfaService.reauthenticate(password, code);
        if (action === 'regenerate') {
          const result = await mfaService.regenerate();
          if (!('recoveryCodes' in result) || !result.recoveryCodes?.length) throw new Error('Missing recovery codes');
          setCodes(result.recoveryCodes);
        } else if (action === 'disable') { await mfaService.disable(); await leave(); }
        else { await mfaService.recoverAccount(target.trim(), reference.trim()); setTarget(''); setReference(''); setMessage('복구를 승인했습니다. 대상 사용자는 다음 로그인에서 인증앱을 다시 등록해야 합니다.'); }
      }
    } catch { validation.setFormErrors({ root: '요청을 완료하지 못했습니다. 현재 비밀번호·새 인증앱 코드와 권한을 확인해 주세요.' }); }
    finally { setPassword(''); setCode(''); submittingRef.current = false; setPending(false); }
  };
  if (enrollment) return <MfaChallengePanel stage="ENROLLMENT_REQUIRED" enrollment={enrollment} onComplete={finish} onCancel={() => void leave()} />;
  if (codes) return <RecoveryCodes codes={codes} onContinue={() => { setCodes(null); finish(); }} />;
  return <form ref={form} method="post" noValidate className="space-y-4" aria-busy={pending} onSubmit={event => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const action = submitter instanceof HTMLButtonElement ? submitter.value : status?.enabled ? 'regenerate' : 'start';
    if (action === 'start' || action === 'regenerate' || action === 'disable' || action === 'recover') void run(action);
  }}>
    <FormErrorSummary errors={validation.errors} labels={fieldLabels} onNavigate={validation.focusError} />
    {!status && !Object.keys(validation.errors).length && <p role="status">추가 인증 상태를 불러오는 중…</p>}
    {status && <>
      <p>{status.enabled ? `인증앱 사용 중 · 남은 복구 코드 ${status.recoveryCodesRemaining}개` : '인증앱을 아직 등록하지 않았습니다.'}</p>
      {!status.available ? <p role="status">추가 인증을 사용할 준비가 되지 않았습니다. 운영 관리자에게 문의해 주세요.</p> : <>
        {status.required && <p className="text-sm">이 계정은 추가 인증이 필수이며 해제할 수 없습니다.</p>}
        <Label htmlFor={`${id}-password`}>현재 비밀번호</Label>
        <Input {...validation.fieldProps('password')} id={`${id}-password`} type="password" aria-required="true" autoComplete="current-password" value={password} onChange={event => { setPassword(event.target.value); validation.clearError('password'); }} disabled={pending} />
        {validation.errors.password && <p {...validation.messageProps('password')} className="text-sm text-destructive-emphasis" />}
        {status.enabled && <><Label htmlFor={`${id}-code`}>인증앱 코드</Label><Input {...validation.fieldProps('code')} id={`${id}-code`} aria-required="true" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => { setCode(event.target.value); validation.clearError('code'); }} disabled={pending} />{validation.errors.code && <p {...validation.messageProps('code')} className="text-sm text-destructive-emphasis" />}</>}
        <div className="flex flex-wrap gap-2">
          {!status.enabled ? <Button type="submit" value="start" disabled={pending}>인증앱 등록</Button> : <>
            <Button type="submit" value="regenerate" disabled={pending}>복구 코드 재발급</Button>
            {!status.required && <Button type="submit" value="disable" variant="outline" disabled={pending}>추가 인증 해제 후 로그아웃</Button>}
          </>}
        </div>
        {status.enabled && <p className="text-sm">재발급하면 기존 복구 코드는 폐기됩니다. 각 작업에는 새 인증앱 코드가 필요합니다.</p>}
        {!status.enabled && handedTarget && user?.permissions.includes('MFA_RECOVER') && <p role="status" className="text-sm">{handedTarget.name}님의 복구를 승인하려면 먼저 본인 인증앱을 등록하세요. 승인에는 본인의 새 인증앱 코드가 필요합니다.</p>}
        {status.enabled && user?.permissions.includes('MFA_RECOVER') && <fieldset className="space-y-3 border-t pt-4">
          <legend className="font-medium">분실 계정 복구 승인</legend>
          {typedTarget === null && handedTarget && <p className="text-sm">대상: <span className="font-medium">{handedTarget.name}</span>{handedTarget.loginId ? ` (${handedTarget.loginId})` : ''}</p>}
          <p className="text-sm">별도 절차로 본인 확인을 마친 계정만 승인하세요. 신분증이나 개인정보 원문은 입력하지 마세요. 승인 시 대상의 기존 세션과 인증앱이 폐기됩니다.</p>
          <Label htmlFor={`${id}-target`}>대상 계정 고유 ID</Label><Input {...validation.fieldProps('esntlId')} id={`${id}-target`} value={target} maxLength={20} onChange={event => { setTarget(event.target.value); validation.clearError('esntlId'); }} disabled={pending} />
          {validation.errors.esntlId && <p {...validation.messageProps('esntlId')} className="text-sm text-destructive-emphasis" />}
          <Label htmlFor={`${id}-reference`}>본인 확인 승인 참조번호</Label><Input {...validation.fieldProps('verificationReference')} id={`${id}-reference`} value={reference} maxLength={200} onChange={event => { setReference(event.target.value); validation.clearError('verificationReference'); }} disabled={pending} />
          {validation.errors.verificationReference && <p {...validation.messageProps('verificationReference')} className="text-sm text-destructive-emphasis" />}
          <Button type="submit" value="recover" variant="outline" disabled={pending}>본인 확인 완료 계정 복구 승인</Button>
        </fieldset>}
      </>}
    </>}
    {message && <p role="status">{message}</p>}
  </form>;
}
