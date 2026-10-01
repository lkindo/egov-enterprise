'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Button } from '@/components/ui/button';
import { PagePagination } from '@/components/common/PagePagination';

const PAGE_SIZE = 20;

/**
 * 그룹에 배정된 사용자(2026-10-01 UI/UX 분석 15번).
 *
 * 종전 그룹 상세는 이름·설명·권한만 보였다. 구성원은 사용자별·부서별로만 볼 수 있어 '이 그룹을 가진 사람이
 * 누구냐' 에 답하려면 사람이나 부서를 하나씩 열어야 했고, 구성원이 있는 그룹을 지우려 해도 해제할 대상을
 * 볼 경로가 없었다. 행에서 그 사람의 배정 편집으로 바로 간다(배정 변경은 사용자 배정 화면이 소유한다).
 */
export function AuthorizationGroupMembers({ scope, code, onEditMember }: {
  scope: readonly unknown[];
  code: string;
  onEditMember: (member: { id: string; name: string }) => void;
}) {
  const [page, setPage] = useState(1);
  const members = useQuery({
    queryKey: [...scope, 'group-members', code, page],
    queryFn: () => authorizationAdminService.getGroupMembers(code, page - 1, PAGE_SIZE),
    retry: false,
  });
  const total = members.data?.total;

  return (
    <section aria-labelledby="authz-group-members-title" className="space-y-3 rounded-lg border border-border bg-card p-5">
      <h3 id="authz-group-members-title" className="font-semibold">
        배정된 사용자{typeof total === 'number' ? ` (${total}명)` : ''}
      </h3>
      {members.isPending && <p role="status">배정된 사용자를 불러오는 중입니다…</p>}
      {members.isError && (
        <div role="alert" className="space-y-2">
          <p>{extractErrorMessage(members.error, '배정된 사용자를 불러오지 못했습니다.')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void members.refetch()}>다시 시도</Button>
        </div>
      )}
      {members.isSuccess && members.data.list.length === 0 && <p role="status">이 그룹에 배정된 사용자가 없습니다.</p>}
      {members.isSuccess && members.data.list.length > 0 && (
        <ul aria-label="배정된 사용자 목록" className="divide-y divide-border rounded-md border border-border">
          {members.data.list.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 p-3">
              <span className="min-w-0">
                {member.userNm}
                <span className="ml-2 text-sm text-muted-foreground">{member.userId}</span>
              </span>
              <Button type="button" variant="outline" size="sm" className="shrink-0"
                onClick={() => onEditMember({ id: member.id, name: member.userNm })}
                aria-label={`${member.userNm} 배정 편집`}>
                배정 편집
              </Button>
            </li>
          ))}
        </ul>
      )}
      <PagePagination total={total ?? 0} page={page} size={PAGE_SIZE} onPageChange={setPage} />
    </section>
  );
}
