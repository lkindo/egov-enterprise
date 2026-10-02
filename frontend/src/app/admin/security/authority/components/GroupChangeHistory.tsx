'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { PagePagination } from '@/components/common/PagePagination';
import { describeChange, formatChangedAt, personLabel } from './AuthorizationHistory';

const PAGE_SIZE = 20;

/**
 * 편집기의 '변경 이력' 탭 — 이 그룹의 최근 변경(그룹 정보·권한·구성원)을 최신순으로 본다(2026-10-02, 관리 콘솔 UX 2단계 A5).
 * 권한 감사(AUTHRT_AUDIT)가 있을 때만 탭을 둔다. 복제로 만든 그룹은 사유 칸에 원본이 남는다. 조건을 바꿔 찾으려면
 * 허브의 '변경 이력'을 쓴다.
 */
export function GroupChangeHistory({ code }: { code: string }) {
  const { user } = useAuth();
  const canAudit = canPermission(user, 'AUTHRT_AUDIT');
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const [page, setPage] = useState(1);
  const filters = { groupCode: code };
  const history = useQuery({
    queryKey: [...scope, 'history', page, filters],
    queryFn: () => authorizationAdminService.getHistory(page - 1, PAGE_SIZE, filters),
    enabled: canAudit, retry: false,
  });
  if (!canAudit) return null;
  return (
    <section aria-label="이 그룹의 변경 이력" className="space-y-3">
      <p className="text-sm text-muted-foreground">이 그룹의 그룹 정보·권한·구성원 변경을 최신순으로 보여 줍니다. 다른 조건으로 찾으려면 위의 &apos;변경 이력&apos; 영역을 쓰세요.</p>
      {history.isPending && <p role="status">변경 이력을 불러오는 중입니다…</p>}
      {history.isError && <p role="alert">{extractErrorMessage(history.error, '이력을 불러오지 못했습니다.')}</p>}
      {history.isSuccess && history.data.list.length === 0 && <p role="status">이 그룹의 변경 이력이 없습니다.</p>}
      {history.isSuccess && history.data.list.length > 0 && (
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">이 그룹의 권한 변경 이력</caption>
            <thead className="bg-muted"><tr>{['시각', '처리자', '내용', '사유'].map((title) => <th key={title} scope="col" className="p-3">{title}</th>)}</tr></thead>
            <tbody>
              {history.data.list.map((change) => (
                <tr key={change.id} className="border-t border-border">
                  <td className="p-3 tabular-nums">{formatChangedAt(change.createdAt)}</td>
                  <td className="p-3">{change.actorId ? personLabel(change.actorNm, change.actorId) : '—'}</td>
                  <td className="max-w-md whitespace-pre-wrap break-words p-3">{describeChange(change)}</td>
                  <td className="p-3">{change.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <PagePagination total={history.data?.total ?? 0} page={page} size={PAGE_SIZE} onPageChange={setPage} />
    </section>
  );
}
