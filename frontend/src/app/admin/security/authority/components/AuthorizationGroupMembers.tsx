'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import type { AuthorizationUserChoice } from '@/lib/auth/authorization-management-contract';
import { usePageClamp } from '@/lib/hooks/use-page-clamp';
import { failureMessage } from '@/lib/safe-error-log';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PagePagination } from '@/components/common/PagePagination';
import { GroupMemberAddDialog } from './GroupMemberAddDialog';
import { invalidateMembershipQueries, isConflict } from './group-member-queries';

const PAGE_SIZE = 20;

/**
 * '구성원' 탭 — 그룹에 배정된 사용자와, 그룹 쪽에서 구성원을 한꺼번에 추가·회수하는 경로(2026-10-02, 관리 콘솔 UX 2단계 D6).
 *
 * 보기는 권한 조회(AUTHRT_READ), 추가·회수는 권한 배정(AUTHRT_ASSIGN)과 권한 조회를 함께 요구한다(서버 계약). 보호 권한을 가진
 * 그룹은 권한 설정(AUTHRT_GRANT)까지 있어야 한다. 구성원을 바꿔도 그룹 버전은 바뀌지 않는다 — 권한 초안은 그대로 남는다.
 * 사용자의 다른 그룹 배정은 바뀌지 않는다. 행에서 그 사람의 전체 배정 편집(사용자 배정 화면)으로 갈 수 있다.
 *
 * 고른 사람은 페이지를 넘겨도 남고, '고른 사람' 목록에서 한 명씩 풀 수 있다 — 다른 곳에서 이미 빠져 목록에 없는 사람을
 * 골라 둔 채 409 로 거부되면, 목록에는 그 사람의 체크박스가 없으므로 여기서 풀어야 다시 보낼 수 있다. 마지막 페이지의
 * 구성원을 모두 회수하면 그 페이지는 비므로 남은 마지막 페이지로 돌아간다(DEC-OPS-147 ④).
 */
export function AuthorizationGroupMembers({ code, name, anonymous, protectedGrants, onEditMember }: {
  code: string;
  name: string;
  /** 공개 메뉴 그룹 — 로그인 사용자에게 배정할 수 없다(추가 불가, 기존 배정 회수는 가능). */
  anonymous: boolean;
  /** 저장된 권한에 보호 권한이 있는가 — 구성원 변경에 권한 설정 권한도 필요하다. */
  protectedGrants: boolean;
  onEditMember: (member: { id: string; name: string }) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState<ReadonlyMap<string, AuthorizationUserChoice>>(() => new Map());
  const [revokePending, setRevokePending] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const revokeRequestRef = useRef(false);
  const members = useQuery({
    queryKey: [...scope, 'group-members', code, page],
    queryFn: () => authorizationAdminService.getGroupMembers(code, page - 1, PAGE_SIZE),
    retry: false,
  });
  const departments = useQuery({ queryKey: [...scope, 'departments'], queryFn: () => authorizationAdminService.getDepartments(), retry: false });
  const departmentName = (id: string | null) => (id ? departments.data?.find((department) => department.id === id)?.name ?? id : '부서 없음');
  const total = members.data?.total;
  // 마지막 페이지를 비우면 앞 페이지로 돌아간다. 조회 중·오류일 때의 총수는 믿지 않는다.
  usePageClamp({ page, totalPages: Math.ceil((total ?? 0) / PAGE_SIZE), ready: members.isSuccess && !members.isFetching, onPageChange: setPage });
  // 구성원 변경은 권한 배정과 권한 조회를 함께 요구한다. 보호 권한 그룹은 권한 설정까지 필요하다(서버가 집행한다).
  const canAssign = canPermission(user, 'AUTHRT_ASSIGN') && canPermission(user, 'AUTHRT_READ');
  const blockedByProtection = protectedGrants && !canPermission(user, 'AUTHRT_GRANT');
  const editable = canAssign && !blockedByProtection;

  const toggle = (member: AuthorizationUserChoice, checked: boolean) => setChosen((previous) => {
    const next = new Map(previous);
    if (checked) next.set(member.id, member); else next.delete(member.id);
    return next;
  });
  const revokeSelected = async () => {
    if (!editable || chosen.size === 0 || revokeRequestRef.current) return;
    revokeRequestRef.current = true;
    setRevokePending(true);
    try {
      const targets = [...chosen.values()];
      const approved = await confirm({
        title: '구성원 회수',
        message: `선택한 ${targets.length}명(${targets.slice(0, 5).map((member) => member.userNm).join(', ')}${targets.length > 5 ? ' 외' : ''})을 '${name}' 그룹에서 회수합니다. 이 사용자들의 다른 그룹 배정은 그대로 유지됩니다.`,
        confirmText: `${targets.length}명 회수`, variant: 'destructive',
      });
      if (!approved) return;
      const result = await authorizationAdminService.updateGroupMembers(code, { add: [], remove: targets.map((member) => member.id), complete: true });
      setChosen(new Map());
      toast(`구성원 ${result.removed.length}명을 회수했습니다. 남은 구성원은 ${result.memberCount}명입니다.`, 'success');
      notifyAuthorizationChanged();
      await invalidateMembershipQueries(queryClient);
    } catch (error) {
      toast(failureMessage(error, '구성원을 회수하지 못했습니다. 구성원 목록을 다시 확인해 주세요.'), 'error');
      // 다른 곳에서 구성원이 바뀌었으면 목록을 다시 읽는다. 선택은 남긴다 — 무엇을 하려 했는지 보이고, 이미 빠진 사람은
      // 서버 문구가 밝히므로 '회수할 사람' 목록에서 풀고 다시 보낸다.
      if (isConflict(error)) await invalidateMembershipQueries(queryClient);
    } finally {
      revokeRequestRef.current = false;
      setRevokePending(false);
    }
  };

  return (
    <section aria-labelledby="authz-group-members-title" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="authz-group-members-title" className="font-semibold">
          배정된 사용자{typeof total === 'number' ? ` (${total}명)` : ''}
        </h3>
        {editable && <div className="flex flex-wrap gap-2">
          {!anonymous && <Button type="button" variant="outline" disabled={revokePending} onClick={() => setAddOpen(true)}>구성원 추가</Button>}
          <Button type="button" variant="destructive" disabled={chosen.size === 0 || revokePending} aria-busy={revokePending} onClick={() => void revokeSelected()}>
            선택한 {chosen.size}명 회수
          </Button>
        </div>}
      </div>
      <p className="text-sm text-muted-foreground">구성원을 추가하거나 회수해도 이 그룹의 권한과 저장하지 않은 권한 변경은 그대로입니다. 사용자의 다른 그룹 배정은 바뀌지 않습니다.</p>
      {canAssign && blockedByProtection && <p role="status" className="text-sm text-muted-foreground">이 그룹에는 보호 권한이 있어 구성원을 바꾸려면 권한 설정 권한도 필요합니다.</p>}
      {editable && anonymous && <p role="status" className="text-sm text-muted-foreground">공개 메뉴 그룹은 로그인 사용자에게 배정할 수 없습니다. 기존 배정은 회수할 수 있습니다.</p>}
      {members.isPending && <p role="status">배정된 사용자를 불러오는 중입니다…</p>}
      {members.isError && (
        <div role="alert" className="space-y-2">
          <p>{extractErrorMessage(members.error, '배정된 사용자를 불러오지 못했습니다.')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void members.refetch()}>다시 시도</Button>
        </div>
      )}
      {/* 빈 페이지(마지막 페이지를 비운 직후)는 그룹이 빈 것이 아니다 — 앞 페이지로 돌아가는 동안 그렇게 말하지 않는다. */}
      {members.isSuccess && members.data.total === 0 && <p role="status">이 그룹에 배정된 사용자가 없습니다.</p>}
      {members.isSuccess && members.data.list.length > 0 && (
        <ul aria-label="배정된 사용자 목록" className="divide-y divide-border rounded-md border border-border">
          {members.data.list.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <span className="flex min-w-0 items-center gap-3">
                {editable && <Checkbox aria-label={`${member.userNm} (${member.userId}) 선택`} checked={chosen.has(member.id)} disabled={revokePending}
                  onCheckedChange={(checked) => toggle(member, checked === true)} />}
                <span className="min-w-0">
                  {member.userNm}
                  <span className="ml-2 text-sm text-muted-foreground">{member.userId}</span>
                  <span className="block text-xs text-muted-foreground">{departmentName(member.departmentId)}</span>
                </span>
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
      {editable && chosen.size > 0 && (
        <section aria-label="회수할 사람" className="space-y-2 rounded-md border border-border p-3">
          <p className="text-sm text-muted-foreground">회수할 사람 {chosen.size}명 — 다른 페이지로 넘어가도 선택은 남습니다. 목록에 없는 사람도 여기서 풀 수 있습니다.</p>
          <ul className="flex flex-wrap gap-2">
            {[...chosen.values()].map((member) => <li key={member.id}>
              <Button type="button" variant="outline" size="sm" disabled={revokePending} aria-label={`${member.userNm} · ${member.userId} 선택 해제`}
                onClick={() => toggle(member, false)}>
                {member.userNm} · {member.userId}<X aria-hidden="true" />
              </Button>
            </li>)}
          </ul>
        </section>
      )}
      <PagePagination total={total ?? 0} page={page} size={PAGE_SIZE} onPageChange={setPage} />
      {addOpen && <GroupMemberAddDialog code={code} name={name} onClose={() => setAddOpen(false)} />}
    </section>
  );
}
