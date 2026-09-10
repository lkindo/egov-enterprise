'use client';

import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import type { AuthorizationGroupSummary, AuthorizationMembership } from '@/lib/auth/authorization-management-contract';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AuthorizationEffectivePermissions } from './AuthorizationEffectivePermissions';

export function AuthorizationMembershipEditor({ snapshot, groups, refreshing, onRefresh }: {
  snapshot: AuthorizationMembership; groups: AuthorizationGroupSummary[];
  refreshing: boolean; onRefresh: () => Promise<unknown>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [baseline, setBaseline] = useState(snapshot);
  const [selection, setSelection] = useState(() => new Set(snapshot.groups));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const pendingRef = useRef(false);
  const currentBaseline = baseline.version === snapshot.version;
  const complete = baseline.complete === true && baseline.version.length > 0 && baseline.groups.every((code) => groups.some((group) => group.code === code));
  const writable = canPermission(user, 'AUTHRT_ASSIGN') && currentBaseline && complete && !pending && !refreshing && !saved;
  const dirty = selection.size !== baseline.groups.length || baseline.groups.some((group) => !selection.has(group));
  const save = async () => {
    if (!writable || !dirty || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      await authorizationAdminService.saveUserGroups(baseline.userId, { groups: [...selection].sort(), version: baseline.version, complete: true });
      setSaved(true);
      toast('사용자의 권한 그룹을 저장했습니다.', 'success');
      notifyAuthorizationChanged();
      await onRefresh();
    } catch (error) { toast(extractErrorMessage(error, '사용자 그룹을 저장하지 못했습니다. 최신 정보를 확인해 주세요.'), 'error'); }
    finally { pendingRef.current = false; setPending(false); }
  };
  const reload = () => {
    if (pending || refreshing) return;
    setBaseline(snapshot); setSelection(new Set(snapshot.groups)); setSaved(false);
  };
  return (
    <section aria-label="사용자 권한 그룹 배정" className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">사용자 권한 그룹</h3><Button type="button" variant="outline" disabled={pending || refreshing} onClick={reload}>선택 취소 · 최신 정보 적용</Button></div>
      <p className="text-sm text-muted-foreground">여러 그룹을 함께 배정할 수 있으며 기능권한을 합산합니다. 사용자 분류 그룹과는 별도입니다.</p>
      {(!currentBaseline || saved) && <p role="status">배정 정보가 변경되었습니다. 최신 정보를 적용한 뒤 다시 편집하세요.</p>}
      {!complete && <p role="alert">전체 그룹 정보를 확인하지 못해 저장할 수 없습니다. 다시 조회해 주세요.</p>}
      <ul aria-label="배정 가능한 권한 그룹" className="space-y-3">
        {groups.filter((group) => group.code !== 'ROLE_ANONYMOUS' || baseline.groups.includes(group.code)).map((group) => <li key={group.code}><label className="flex items-center gap-3"><Checkbox checked={selection.has(group.code)} disabled={!writable || (group.code === 'ROLE_ANONYMOUS' && !selection.has(group.code))}
          onCheckedChange={() => { if (!writable || (group.code === 'ROLE_ANONYMOUS' && !selection.has(group.code))) return; setSelection((previous) => { const next = new Set(previous); if (next.has(group.code)) next.delete(group.code); else next.add(group.code); return next; }); }} /><span>{group.name}<span className="ml-2 text-xs text-muted-foreground">{group.code}</span></span></label></li>)}
      </ul>
      {baseline.groups.includes('ROLE_ANONYMOUS') && <p className="text-sm text-muted-foreground">공개 메뉴 그룹은 로그인 사용자에게 새로 배정할 수 없습니다. 기존 배정은 해제할 수 있습니다.</p>}
      {dirty && <p role="status" className="text-sm text-muted-foreground">저장 시 그룹 추가 {[...selection].filter((code) => !baseline.groups.includes(code)).length}개 · 회수 {baseline.groups.filter((code) => !selection.has(code)).length}개. 다른 그룹도 같은 기능을 제공하면 해당 기능권한은 유지됩니다.</p>}
      <AuthorizationEffectivePermissions snapshot={baseline} current={currentBaseline && complete && !saved && !refreshing} />
      {canPermission(user, 'AUTHRT_ASSIGN') && <Button type="button" disabled={!writable || !dirty} aria-busy={pending} onClick={() => void save()}>{pending ? '저장 중…' : '사용자 그룹 저장'}</Button>}
    </section>
  );
}
