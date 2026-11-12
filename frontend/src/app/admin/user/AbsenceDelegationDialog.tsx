'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { UserPicker } from '@/app/components/ui/user-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { getTodayYmd } from '@/lib/date/today-ymd';
import { userAbsenceAdminService } from '@/services/foundation/system/UserAbsenceAdminService';
import type { UserSearchResult } from '@/services/business/user/UserSearchService';
import type { UserManage } from '@/types/foundation/user';

/** yyyyMMdd ↔ 날짜 입력(yyyy-MM-dd). */
const toInput = (ymd: string) => (ymd.length === 8 ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : '');
const fromInput = (value: string) => value.replace(/-/g, '');

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
  const save = useMutation({
    mutationFn: async () => {
      if (!target?.esntlId || !delegate) throw new Error('대리결재자를 골라 주세요.');
      await userAbsenceAdminService.updateDelegation(target.esntlId, {
        sbtAprvrId: delegate.esntlId, absnBgngYmd: from, absnEndYmd: to,
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-user-absences'] });
    },
  });

  if (!target) return null;
  const name = target.userNm ?? target.userId;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!delegate) { setError('대리결재자를 골라 주세요.'); return; }
    if (from.length !== 8 || to.length !== 8) { setError('부재 시작일과 종료일을 모두 적어 주세요.'); return; }
    if (from > to) { setError('부재 종료일은 시작일과 같거나 그 뒤여야 합니다.'); return; }
    try {
      await save.mutateAsync();
      toast(`${name}님의 부재 기간과 대리결재자를 정했습니다.`, 'success');
      onClose();
    } catch (failure) {
      setError(extractErrorMessage(failure, '대리결재자를 지정하지 못했습니다. 다시 시도해 주세요.'));
    }
  };

  return <>
    <StandardModal isOpen onClose={onClose} title={`${name} 대리결재 지정`} closeDisabled={save.isPending}>
      <form onSubmit={submit} noValidate className="space-y-4" aria-label="대리결재 지정">
        <p className="text-sm text-muted-foreground">
          부재 기간에 {name}님 차례인 결재를 대리결재자가 대신 승인·반려합니다. 원결재자와 대신 결정한 사람이 따로 기록되고, 원결재자에게 알림이 갑니다.
        </p>
        {error && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-emphasis">{error}</p>}
        <fieldset disabled={save.isPending} className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold">대리결재자 (필수)</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{delegate ? delegate.userNm : '고르지 않았습니다'}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                <UserPlus aria-hidden="true" /> {delegate ? '다른 사람 고르기' : '대리결재자 고르기'}
              </Button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="absence-delegation-from" className="text-sm font-semibold">부재 시작일</label>
              <Input id="absence-delegation-from" type="date" value={toInput(from)} onChange={event => setFrom(fromInput(event.target.value))} />
            </div>
            <div className="space-y-2">
              <label htmlFor="absence-delegation-to" className="text-sm font-semibold">부재 종료일</label>
              <Input id="absence-delegation-to" type="date" value={toInput(to)} onChange={event => setTo(fromInput(event.target.value))} />
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
        if (picked.esntlId) setDelegate({ esntlId: picked.esntlId, userNm: picked.userNm || picked.esntlId });
        setPickerOpen(false);
      }} />
  </>;
}
