'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { UserPicker } from '@/app/components/ui/user-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormErrorSummary } from '@/components/ui/form';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { userAbsenceAdminService } from '@/services/foundation/system/UserAbsenceAdminService';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import type { UserManage } from '@/types/foundation/user';
import { UserAbsenceDtoRequestSchema } from '@/types/generated-zod';

/** yyyyMMdd ↔ 날짜 입력(yyyy-MM-dd). */
const toInput = (ymd: string) => (ymd.length === 8 ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '');
const fromInput = (value: string) => value.replace(/-/g, '');

/** 대리결재 지정 입력. 지정 자격(본인·사용 중·기간 겹침·연쇄·순환)은 서버가 판정하고, 여기서는 형식과 기간 순서만 본다. */
const delegationSchema = UserAbsenceDtoRequestSchema.pick({ sbtAprvrId: true, absnBgngYmd: true, absnEndYmd: true }).extend({
  sbtAprvrId: UserAbsenceDtoRequestSchema.shape.sbtAprvrId.unwrap().min(1, '대리결재자를 골라 주세요.'),
  absnBgngYmd: z.string().regex(/^\d{8}$/, '부재 시작일을 적어 주세요.').pipe(UserAbsenceDtoRequestSchema.shape.absnBgngYmd.unwrap()),
  absnEndYmd: z.string().regex(/^\d{8}$/, '부재 종료일을 적어 주세요.').pipe(UserAbsenceDtoRequestSchema.shape.absnEndYmd.unwrap()),
}).refine(values => values.absnBgngYmd <= values.absnEndYmd, {
  path: ['absnEndYmd'],
  message: '부재 종료일은 시작일과 같거나 그 뒤여야 합니다.',
});
const delegationLabels: Record<string, string> = { sbtAprvrId: '대리결재자', absnBgngYmd: '부재 시작일', absnEndYmd: '부재 종료일' };

/**
 * [V2_151] 부재 기간과 대리결재자 지정. 대리결재자는 부재 기간에 이 사람의 차례인 결재를 대신 승인·반려한다 — 대신 결정한 줄에는
 * 원결재자와 결정한 사람이 따로 남고 민감 작업 감사에 기록된다. 지정 규칙(본인 금지·사용 중인 계정·연쇄/순환 금지)은 서버가 판정하고
 * 거부 문구를 그대로 보인다. 기간은 한국 날짜이며 양 끝을 포함한다.
 */
export function AbsenceDelegationDialog({ target, delegateName, onClose }: {
  /** 부재 기간·대리결재자를 정할 사용자(없으면 닫혀 있다). */
  target: (UserManage & { delegation?: { sbtAprvrId?: string | null; absnBgngYmd?: string | null; absnEndYmd?: string | null } | null }) | null;
  /** 이미 지정된 대리결재자의 이름(목록에서 찾은 값). */
  delegateName?: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const current = target?.delegation ?? null;
  const [delegate, setDelegate] = useState<{ esntlId: string; userNm: string } | null>(
    current?.sbtAprvrId ? { esntlId: current.sbtAprvrId, userNm: delegateName || current.sbtAprvrId } : null);
  const [from, setFrom] = useState(current?.absnBgngYmd ?? getTodayYmd());
  const [to, setTo] = useState(current?.absnEndYmd ?? getTodayYmd());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const pickerButtonRef = useRef<HTMLButtonElement | null>(null);
  const validation = useManualFormValidation(delegationSchema, {
    labels: delegationLabels,
    focusTargets: { sbtAprvrId: () => pickerButtonRef.current },
  });
  const save = useMutation({
    // 저장할 값은 누른 순간의 값으로 넘긴다 — 렌더 상태를 클로저로 읽으면 한 렌더 전 값이 나갈 수 있다.
    mutationFn: async (input: { userId: string; sbtAprvrId: string; absnBgngYmd: string; absnEndYmd: string }) => {
      await userAbsenceAdminService.updateDelegation(input.userId, {
        sbtAprvrId: input.sbtAprvrId, absnBgngYmd: input.absnBgngYmd, absnEndYmd: input.absnEndYmd,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-user-absences'] });
    },
  });

  if (!target) return null;
  const name = target.userNm ?? target.userId;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingRef.current) return;
    setError('');
    const validated = validation.validate({ sbtAprvrId: delegate?.esntlId ?? '', absnBgngYmd: from, absnEndYmd: to });
    if (!validated) return;
    if (!target.esntlId) { setError('사용자 식별자를 찾지 못했습니다. 목록을 다시 불러와 주세요.'); return; }
    savingRef.current = true;
    try {
      await save.mutateAsync({ userId: target.esntlId, ...validated });
      toast(`${name}님의 부재 기간과 대리결재자를 정했습니다.`, 'success');
      onClose();
    } catch (failure) {
      // 입력은 그대로 둔다 — 필드 오류는 그 칸에, 지정 규칙 거부(본인·잠긴 계정·연쇄·순환)는 서버 문구로 보인다.
      const fieldErrors = extractFieldErrors(failure);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else setError(extractErrorMessage(failure, '대리결재자를 지정하지 못했습니다. 다시 시도해 주세요.'));
    } finally {
      savingRef.current = false;
    }
  };

  return <>
    <StandardModal isOpen onClose={onClose} title={`${name} 대리결재 지정`} closeDisabled={save.isPending}>
      <form onSubmit={submit} noValidate className="space-y-4" aria-label="대리결재 지정">
        <p className="text-sm text-muted-foreground">
          부재 기간에 {name}님 차례인 결재를 대리결재자가 대신 승인·반려합니다. 원결재자와 대신 결정한 사람이 따로 기록되고, 원결재자에게 알림이 갑니다.
        </p>
        <FormErrorSummary errors={validation.errors} labels={delegationLabels} onNavigate={validation.focusError} />
        {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis">{error}</p>}
        <fieldset disabled={save.isPending} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">대리결재자 (필수)</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{delegate ? delegate.userNm : '고르지 않았습니다'}</span>
              <Button ref={pickerButtonRef} type="button" variant="outline" size="sm" {...validation.fieldProps('sbtAprvrId')}
                onClick={() => setPickerOpen(true)}>
                <UserPlus aria-hidden="true" /> {delegate ? '다른 사람 고르기' : '대리결재자 고르기'}
              </Button>
            </div>
            {validation.errors.sbtAprvrId ? <p {...validation.messageProps('sbtAprvrId')} className="text-xs font-bold text-destructive-emphasis" /> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="absence-delegation-from" className="text-sm font-semibold">부재 시작일</label>
              <Input id="absence-delegation-from" type="date" {...validation.fieldProps('absnBgngYmd')} value={toInput(from)}
                onChange={event => { validation.clearError('absnBgngYmd'); setFrom(fromInput(event.target.value)); }} />
              {validation.errors.absnBgngYmd ? <p {...validation.messageProps('absnBgngYmd')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="absence-delegation-to" className="text-sm font-semibold">부재 종료일</label>
              <Input id="absence-delegation-to" type="date" {...validation.fieldProps('absnEndYmd')} value={toInput(to)}
                onChange={event => { validation.clearError('absnEndYmd'); setTo(fromInput(event.target.value)); }} />
              {validation.errors.absnEndYmd ? <p {...validation.messageProps('absnEndYmd')} className="text-xs font-bold text-destructive-emphasis" /> : null}
            </div>
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={save.isPending}>취소</Button>
          <Button type="submit" disabled={save.isPending}>{save.isPending ? '저장하는 중…' : '저장'}</Button>
        </div>
      </form>
    </StandardModal>
    <UserPicker isOpen={pickerOpen} title="대리결재자 고르기" onClose={() => setPickerOpen(false)}
      onSelect={(picked: UserSearchResult) => {
        if (picked.esntlId) {
          setDelegate({ esntlId: picked.esntlId, userNm: picked.userNm || picked.esntlId });
          validation.clearError('sbtAprvrId');
        }
        setPickerOpen(false);
      }} />
  </>;
}
