'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { authorizationAdminService, type AuthorizationHistoryFilters } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PagePagination } from '@/components/common/PagePagination';

const PAGE_SIZE = 20;
export function AuthorizationHistory() {
  const { user } = useAuth();
  const canAudit = canPermission(user, 'AUTHRT_AUDIT');
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const [historyPage, setHistoryPage] = useState(1);
  const [historyInput, setHistoryInput] = useState({ groupCode: '', userId: '', actorId: '', fromDate: '', toDate: '' });
  const [historyFilters, setHistoryFilters] = useState<AuthorizationHistoryFilters>({});
  const [historyFilterError, setHistoryFilterError] = useState('');
  const history = useQuery({ queryKey: [...scope, 'history', historyPage, historyFilters], queryFn: () => authorizationAdminService.getHistory(historyPage - 1, PAGE_SIZE, historyFilters), enabled: canAudit, retry: false });
  if (!canAudit) return null;
  return (
      <section className="space-y-4"><h2 className="font-semibold">권한 변경 이력</h2>{history.error && <p role="alert">{extractErrorMessage(history.error, '이력을 불러오지 못했습니다.')}</p>}<p className="text-sm text-muted-foreground">추가·제거 및 변경 전후 값을 보여 줍니다.</p>
        <form role="search" aria-label="권한 변경 이력 검색" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => {
          event.preventDefault();
          if (historyInput.fromDate && historyInput.toDate && historyInput.fromDate > historyInput.toDate) { setHistoryFilterError('시작일은 종료일보다 늦을 수 없습니다.'); return; }
          setHistoryFilterError(''); setHistoryPage(1);
          setHistoryFilters(Object.fromEntries(Object.entries(historyInput).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value.length > 0)));
        }}>
          <label className="space-y-1 text-sm">그룹 코드<Input maxLength={20} value={historyInput.groupCode} onChange={(event) => setHistoryInput((current) => ({ ...current, groupCode: event.target.value }))} /></label>
          <label className="space-y-1 text-sm">대상 사용자 고유 ID<Input maxLength={20} value={historyInput.userId} onChange={(event) => setHistoryInput((current) => ({ ...current, userId: event.target.value }))} /></label>
          <label className="space-y-1 text-sm">변경자 로그인 ID<Input maxLength={20} value={historyInput.actorId} onChange={(event) => setHistoryInput((current) => ({ ...current, actorId: event.target.value }))} /></label>
          <label className="space-y-1 text-sm">시작일<Input type="date" value={historyInput.fromDate} onChange={(event) => setHistoryInput((current) => ({ ...current, fromDate: event.target.value }))} /></label>
          <label className="space-y-1 text-sm">종료일<Input type="date" value={historyInput.toDate} onChange={(event) => setHistoryInput((current) => ({ ...current, toDate: event.target.value }))} /></label>
          <Button type="submit" className="self-end">이력 조회</Button>
          {historyFilterError && <p role="alert" className="text-sm text-destructive">{historyFilterError}</p>}
        </form>
        {history.isPending && <p role="status">변경 이력을 불러오는 중입니다…</p>}
        <div className="overflow-auto rounded-lg border border-border"><table className="w-full text-left text-sm"><caption className="sr-only">권한 변경 이력</caption><thead className="bg-muted"><tr>{['시각', '대상', '변경', '그룹·사용자', '권한·필드', '변경 전 → 후', '처리자'].map((title) => <th key={title} className="p-3">{title}</th>)}</tr></thead><tbody>{(history.data?.list ?? []).map((change) => <tr key={change.id} className="border-t border-border"><td className="p-3">{change.createdAt}</td><td className="p-3">{change.targetType}</td><td className="p-3">{change.changeType}</td><td className="p-3">{change.group ?? change.userId ?? '—'}</td><td className="p-3">{change.grantType ? `${change.grantType}:` : ''}{change.grantCode ?? change.field ?? '—'}</td><td className="max-w-sm whitespace-pre-wrap break-words p-3">{change.before ?? '—'} → {change.after ?? '—'}</td><td className="p-3">{change.actorId ?? '—'}</td></tr>)}</tbody></table></div>
        {history.isSuccess && history.data.list.length === 0 && <p role="status">변경 이력이 없습니다.</p>}
        <PagePagination total={history.data?.total ?? 0} page={historyPage} size={PAGE_SIZE} onPageChange={setHistoryPage} />
      </section>
  );
}
