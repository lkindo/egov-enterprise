'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { WORK_FILL_REGION_CLASS } from '@/app/components/patterns/work-fill';
import { PagePagination } from '@/components/common/PagePagination';
import { cn } from '@/lib/utils';
import { describeChange, formatChangedAt, personLabel } from './AuthorizationHistory';
import { PermissionScrollRegion } from './PermissionScrollRegion';

const PAGE_SIZE = 20;
/** [2026-10-05 한 화면 압축] 업무 표 행 토큰(카탈로그 §4) — 권한 작업대의 두 표와 같은 행 높이다(등재: WORK_TABLE_TOKEN_OWNERS). */
const CELL_PAD = 'px-[var(--work-cell-px)] py-[var(--work-cell-py)]';

/**
 * 편집기의 '변경 이력' 탭 — 이 그룹의 최근 변경(그룹 정보·권한·구성원)을 최신순으로 본다(2026-10-02, 관리 콘솔 UX 2단계 A5).
 * 권한 감사(AUTHRT_AUDIT)가 있을 때만 탭을 둔다. 복제로 만든 그룹은 사유 칸에 원본이 남는다. 조건을 바꿔 찾으려면
 * 허브의 '변경 이력'을 쓴다.
 *
 * `fill` 이면 업무면 fill 셸 안에서 표 상자가 남은 높이를 채우고 안쪽에서 스크롤한다(머리글 고정). 부모는 세로 flex 다.
 * 표 상자는 권한 표와 같은 이름 있는 스크롤 영역이다 — 이력 표에는 포커스할 요소가 없어, 넘치면 상자 자체가 키보드로 스크롤하는
 * 길이다(WCAG 2.1.1). 종전에는 높이 제한 없이 페이지가 스크롤했다.
 */
export function GroupChangeHistory({ code, fill = false }: { code: string; fill?: boolean }) {
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
    <section aria-label="이 그룹의 변경 이력" className={cn('flex flex-col gap-2', fill && WORK_FILL_REGION_CLASS)}>
      <p className="text-xs text-muted-foreground">이 그룹의 그룹 정보·권한·구성원 변경을 최신순으로 보여 줍니다. 다른 조건으로 찾으려면 위의 &apos;변경 이력&apos; 영역을 쓰세요.</p>
      {history.isPending && <p role="status">변경 이력을 불러오는 중입니다…</p>}
      {history.isError && <p role="alert">{extractErrorMessage(history.error, '이력을 불러오지 못했습니다.')}</p>}
      {history.isSuccess && history.data.list.length === 0 && <p role="status">이 그룹의 변경 이력이 없습니다.</p>}
      {history.isSuccess && history.data.list.length > 0 && (
        <PermissionScrollRegion label="이 그룹의 변경 이력 스크롤 영역" fill={fill} scrollPaddingClassName="scroll-pt-8">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">이 그룹의 권한 변경 이력</caption>
            <thead className="sticky top-0 z-10 bg-muted"><tr>{['시각', '처리자', '내용', '사유'].map((title) => <th key={title} scope="col" className={`whitespace-nowrap text-xs font-semibold ${CELL_PAD}`}>{title}</th>)}</tr></thead>
            <tbody>
              {history.data.list.map((change) => (
                <tr key={change.id} className="border-t border-border">
                  <td className={`whitespace-nowrap tabular-nums ${CELL_PAD}`}>{formatChangedAt(change.createdAt)}</td>
                  <td className={CELL_PAD}>{change.actorId ? personLabel(change.actorNm, change.actorId) : '—'}</td>
                  <td className={`max-w-md whitespace-pre-wrap break-words ${CELL_PAD}`}>{describeChange(change)}</td>
                  <td className={CELL_PAD}>{change.reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PermissionScrollRegion>
      )}
      <PagePagination total={history.data?.total ?? 0} page={page} size={PAGE_SIZE} onPageChange={setPage} />
    </section>
  );
}
