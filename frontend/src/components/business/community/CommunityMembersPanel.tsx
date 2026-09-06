'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { PagePagination } from '@/components/common/PagePagination';
import {
  communityAdminService,
  type Community,
  type CommunityMember,
  type CommunityMemberStatusFilter,
} from '@/services/foundation/system/CommunityAdminService';

const PAGE_SIZE = 20;

const FILTERS: ReadonlyArray<{ value: CommunityMemberStatusFilter; label: string }> = [
  { value: 'REQUESTED', label: '가입 신청' },
  { value: 'APPROVED', label: '회원' },
  { value: 'ALL', label: '전체' },
];

const STATUS_LABEL: Record<string, string> = {
  REQUESTED: '승인 대기',
  APPROVED: '회원',
};

type PendingAction = { userId: string; kind: 'approve' | 'reject' };

interface CommunityMembersPanelProps {
  community: Community;
  onBack: () => void;
}

/**
 * 커뮤니티 회원·가입 신청 관리 패널 — 커뮤니티 관리 다이얼로그 안에서 한 커뮤니티를 골랐을 때 열린다.
 *
 * [2026-09-06 DEC-OPS-043] 종전에는 가입 신청이 `mbrSttsCd='A'` 행을 만들어도 그것을 읽거나 옮기는 화면·API 가
 * 없었다(GAP-CMTY-001 — dead write). 여기서 신청을 승인·반려한다. 기본 필터는 처리할 일이 있는 '가입 신청' 이다.
 *
 * - 승인은 되돌릴 수 있는 전이가 아니지만(탈퇴 절차가 없다) 파괴가 아니므로 확인 없이 한 번 누르면 실행한다.
 * - 반려는 신청 행을 지우므로(사용자는 다시 신청할 수 있다) destructive 확인을 거친다.
 * - 이미 회원인 행에는 반려 버튼을 두지 않는다 — 서버도 400 으로 막지만, 화면이 없는 절차(강제 탈퇴)를 어포던스로
 *   보이지 않기 위해서다(G10).
 * - 이름은 서버가 esntlId 를 해석한 값이고 찾지 못하면 null 이라 식별자를 그대로 보여 준다.
 */
export function CommunityMembersPanel({ community, onBack }: CommunityMembersPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<CommunityMemberStatusFilter>('REQUESTED');
  const [page, setPage] = useState(1);
  // 이름의 'pending' 은 폼 검증 census 의 pending 상태 어휘(PENDING_STATE_NAME)에 맞춘 것이다 — 처리 중인 행.
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const actionLockRef = useRef(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-communities', 'members', community.cmntySn, filter, page],
    queryFn: () => communityAdminService.getMembers(community.cmntySn, {
      status: filter === 'ALL' ? undefined : filter,
      page: page - 1,
      size: PAGE_SIZE,
    }),
  });

  const members = data?.list ?? [];
  const total = data?.total ?? 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-communities', 'members', community.cmntySn] });
    // 사용자 상세 화면의 '내 멤버십' 도 같은 행을 읽는다.
    queryClient.invalidateQueries({ queryKey: ['community-membership', community.cmntySn] });
  };

  const changeFilter = (next: CommunityMemberStatusFilter) => {
    if (next === filter) return;
    setFilter(next);
    setPage(1);
  };

  const handleApprove = async (member: CommunityMember) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setPendingAction({ userId: member.userId, kind: 'approve' });
    try {
      await communityAdminService.approveMember(community.cmntySn, member.userId);
      toast(`${displayName(member)} 님의 가입을 승인했습니다.`, 'success');
      invalidate();
    } catch (error) {
      toast(extractErrorMessage(error, '가입 승인에 실패했습니다.'), 'error');
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  const handleReject = async (member: CommunityMember) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setPendingAction({ userId: member.userId, kind: 'reject' });
    try {
      const ok = await confirm({
        title: '가입 신청 반려',
        message: `${displayName(member)} 님의 가입 신청을 반려합니다. 신청 기록은 삭제되며 사용자는 다시 신청할 수 있습니다.`,
        confirmText: '반려',
        variant: 'destructive',
      });
      if (!ok) return;
      await communityAdminService.rejectMember(community.cmntySn, member.userId);
      toast(`${displayName(member)} 님의 가입 신청을 반려했습니다.`, 'success');
      invalidate();
    } catch (error) {
      toast(extractErrorMessage(error, '가입 신청 반려에 실패했습니다.'), 'error');
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  return (
    <section aria-labelledby="community-members-heading" className="space-y-4 pt-2 text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 id="community-members-heading" className="truncate text-sm font-bold text-foreground">
            {community.cmntyNm} 회원 관리
          </h3>
          <p className="text-xs text-muted-foreground">
            가입 신청을 승인하면 회원이 됩니다. 반려하면 신청 기록이 삭제되고 사용자는 다시 신청할 수 있습니다. 회원 탈퇴 처리는 아직 제공되지 않습니다.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={pendingAction !== null}>
          <ArrowLeft size={14} aria-hidden="true" /> 커뮤니티 목록
        </Button>
      </div>

      <div role="group" aria-label="멤버십 상태 필터" className="flex gap-1">
        {FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={filter === option.value ? 'default' : 'outline'}
            aria-pressed={filter === option.value}
            onClick={() => changeFilter(option.value)}
            disabled={pendingAction !== null}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {isError ? (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs">
          <span>회원 목록을 불러오지 못했습니다.</span>
          <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>다시 시도</Button>
        </div>
      ) : isLoading ? (
        <p className="text-xs text-muted-foreground">불러오는 중…</p>
      ) : members.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          {filter === 'REQUESTED' ? '처리할 가입 신청이 없습니다.' : filter === 'APPROVED' ? '회원이 없습니다.' : '회원도 가입 신청도 없습니다.'}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border" aria-label="회원 목록">
          {members.map((member) => {
            const isPending = pendingAction?.userId === member.userId;
            const isRequested = member.status === 'REQUESTED';
            return (
              <li key={member.userId} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <span className="truncate">{displayName(member)}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${isRequested ? 'bg-warning/10 text-warning-emphasis' : member.status === 'APPROVED' ? 'bg-success/10 text-success-emphasis' : 'bg-muted text-muted-foreground'}`}
                    >
                      {STATUS_LABEL[member.status ?? ''] ?? `알 수 없음(${member.mbrSttsCd})`}
                    </span>
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.joinYmd ? `${isRequested ? '신청' : '가입'}일 ${formatYmd(member.joinYmd)}` : '일자 없음'}
                    {member.userNm ? ` · ${member.userId}` : ''}
                  </span>
                </div>
                {isRequested && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      aria-label={`${displayName(member)} 가입 승인`}
                      aria-busy={isPending && pendingAction?.kind === 'approve'}
                      disabled={pendingAction !== null}
                      onClick={() => { void handleApprove(member); }}
                    >
                      {isPending && pendingAction?.kind === 'approve'
                        ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        : <UserCheck size={14} aria-hidden="true" />}
                      승인
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`${displayName(member)} 가입 반려`}
                      aria-busy={isPending && pendingAction?.kind === 'reject'}
                      disabled={pendingAction !== null}
                      onClick={() => { void handleReject(member); }}
                      className="text-destructive hover:text-destructive"
                    >
                      {isPending && pendingAction?.kind === 'reject'
                        ? <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        : <UserX size={14} aria-hidden="true" />}
                      반려
                    </Button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <PagePagination page={page} total={total} size={PAGE_SIZE} onPageChange={setPage} />
    </section>
  );
}

function displayName(member: CommunityMember): string {
  return member.userNm || member.userId;
}

function formatYmd(ymd: string): string {
  return /^\d{8}$/.test(ymd) ? `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}` : ymd;
}
