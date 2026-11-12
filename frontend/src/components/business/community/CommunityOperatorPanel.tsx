'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Loader2, ShieldCheck, ShieldOff, UserCheck, UserMinus, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { FormErrorSummary } from '@/components/ui/form';
import { PagePagination } from '@/components/common/PagePagination';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { ProfileRequestSchema } from '@/types/generated-zod/community-operator';
import {
  communityOperatorService,
  type OperatorMember,
  type OperatorMemberStatusCode,
} from '@/services/business/community/communityOperatorService';

const PAGE_SIZE = 20;

type Filter = OperatorMemberStatusCode | 'ALL';

const FILTERS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'A', label: '가입 신청' },
  { value: 'P', label: '회원' },
  { value: 'W', label: '탈퇴' },
  { value: 'ALL', label: '전체' },
];

const STATUS_LABEL: Record<string, string> = { REQUESTED: '승인 대기', APPROVED: '회원', WITHDRAWN: '탈퇴' };

const EMPTY_MESSAGE: Record<Filter, string> = {
  A: '처리할 가입 신청이 없습니다.',
  P: '회원이 없습니다.',
  W: '탈퇴한 회원이 없습니다.',
  ALL: '회원도 가입 신청도 없습니다.',
};

type PendingAction = { userId: string; kind: 'approve' | 'reject' | 'withdraw' | 'designate' | 'release' };

const profileSchema = ProfileRequestSchema.pick({ cmntyNm: true, cmntyIntroCn: true }).extend({
  cmntyNm: ProfileRequestSchema.shape.cmntyNm.trim().min(1, '커뮤니티 이름을 입력해 주세요.'),
  cmntyIntroCn: ProfileRequestSchema.shape.cmntyIntroCn.unwrap().trim().optional(),
});
type ProfileForm = z.input<typeof profileSchema>;
const profileLabels: Record<keyof ProfileForm, string> = { cmntyNm: '커뮤니티 이름', cmntyIntroCn: '커뮤니티 소개' };

interface CommunityOperatorPanelProps {
  cmntySn: number;
  community: { cmntyNm?: string | null; cmntyIntroCn?: string | null; version?: number | null };
}

/**
 * 커뮤니티 운영자 패널(GAP-CMTY-001, DEC-OPS-416). 이 커뮤니티의 운영자(승인 회원이면서 mngrYn=Y)에게만 상세 화면이 연다 — 화면은
 * 표시만 정하고, 서버가 요청마다 그 커뮤니티의 운영자인지 다시 판정한다(다른 커뮤니티·운영자 아닌 회원은 403).
 *
 * - 가입 신청을 승인·반려한다. 반려는 신청 기록을 지우므로(다시 신청할 수 있다) 확인을 거친다.
 * - 일반 회원을 운영자로 지정하거나 탈퇴 처리한다. 운영자는 먼저 해제해야 탈퇴시킬 수 있고, 마지막 운영자는 해제할 수 없다(409 를
 *   그대로 보인다).
 * - 이름·소개를 고친다. 사용 여부·템플릿은 관리자 몫이라 여기 없다. 읽은 버전과 다르면 서버가 409 로 막는다.
 */
export function CommunityOperatorPanel({ cmntySn, community }: CommunityOperatorPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>('A');
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const requestPendingRef = useRef(false);
  const [profile, setProfile] = useState<ProfileForm>({
    cmntyNm: community.cmntyNm ?? '',
    cmntyIntroCn: community.cmntyIntroCn ?? '',
  });
  const [isSavingProfile, setSavingProfile] = useState(false);
  const savingProfileRef = useRef(false);
  const validation = useManualFormValidation(profileSchema, { labels: profileLabels });

  const membersKey = ['community-operator', cmntySn, 'members'] as const;
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [...membersKey, filter, page],
    queryFn: () => communityOperatorService.getMembers(cmntySn, {
      status: filter === 'ALL' ? undefined : filter,
      page,
      size: PAGE_SIZE,
    }),
  });
  const members = data?.list ?? [];
  const total = data?.total ?? 0;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: membersKey });
    // 내가 운영자를 해제하면 상세 화면의 '내 멤버십'(운영자 표시)도 바뀐다.
    void queryClient.invalidateQueries({ queryKey: ['community-membership', cmntySn] });
  };

  const changeFilter = (next: Filter) => {
    if (next === filter) return;
    setFilter(next);
    setPage(1);
  };

  const runAction = async (
    member: OperatorMember,
    kind: PendingAction['kind'],
    call: () => Promise<unknown>,
    success: string,
    failure: string,
    confirmation?: { title: string; message: string; confirmText: string },
  ) => {
    if (requestPendingRef.current) return;
    requestPendingRef.current = true;
    setPendingAction({ userId: member.userId, kind });
    try {
      if (confirmation && !(await confirm({ ...confirmation, variant: 'destructive' }))) return;
      await call();
      toast(success, 'success');
      invalidate();
    } catch (error) {
      toast(extractErrorMessage(error, failure), 'error');
      invalidate();
    } finally {
      requestPendingRef.current = false;
      setPendingAction(null);
    }
  };

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingProfileRef.current) return;
    const validated = validation.validate(profile);
    if (!validated) return;
    if (typeof community.version !== 'number') {
      toast('커뮤니티 정보를 다시 불러온 뒤 저장해 주세요.', 'error');
      return;
    }
    savingProfileRef.current = true;
    setSavingProfile(true);
    try {
      await communityOperatorService.updateProfile(cmntySn, {
        cmntyNm: validated.cmntyNm,
        cmntyIntroCn: validated.cmntyIntroCn || undefined,
        version: community.version,
      });
      toast('커뮤니티 소개를 저장했습니다.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['community', cmntySn] });
    } catch (error) {
      // 입력은 그대로 둔다 — 필드 오류는 그 칸에, 그 밖의 거부(다른 사람이 먼저 고침 409 등)는 서버 문구로 알린다.
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      else toast(extractErrorMessage(error, '커뮤니티 소개를 저장하지 못했습니다.'), 'error');
      await queryClient.invalidateQueries({ queryKey: ['community', cmntySn] });
    } finally {
      savingProfileRef.current = false;
      setSavingProfile(false);
    }
  };

  const busy = (member: OperatorMember, kind: PendingAction['kind']) =>
    pendingAction?.userId === member.userId && pendingAction.kind === kind;

  return (
    <div className="space-y-8 py-4 text-left">
      <section aria-labelledby="community-operator-members-heading" className="space-y-4">
        <div>
          <h3 id="community-operator-members-heading" className="text-sm font-bold text-foreground">회원 관리</h3>
          <p className="text-xs text-muted-foreground">
            가입 신청을 승인하면 회원이 됩니다. 반려하면 신청 기록이 지워지고 다시 신청할 수 있습니다. 운영자는 먼저 운영자를 해제해야
            탈퇴 처리할 수 있고, 마지막 운영자는 해제할 수 없습니다.
          </p>
        </div>
        <div role="group" aria-label="회원 상태 필터" className="flex flex-wrap gap-1">
          {FILTERS.map(option => (
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
            <Button type="button" size="sm" variant="outline" onClick={() => { void refetch(); }}>다시 시도</Button>
          </div>
        ) : isLoading ? (
          <p role="status" className="text-xs text-muted-foreground">회원 목록을 불러오는 중입니다.</p>
        ) : members.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">{EMPTY_MESSAGE[filter]}</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border" aria-label="운영 회원 목록">
            {members.map(member => {
              const name = member.userNm || member.userId;
              const isOperator = member.status === 'APPROVED' && member.mngrYn === 'Y';
              return (
                <li key={member.userId} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                      <span className="truncate">{name}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        {isOperator ? '운영자' : STATUS_LABEL[member.status ?? ''] ?? '알 수 없음'}
                      </span>
                    </span>
                  </div>
                  {member.status === 'REQUESTED' && (
                    <>
                      <Button type="button" size="sm" disabled={pendingAction !== null} aria-busy={busy(member, 'approve') || undefined}
                        onClick={() => { void runAction(member, 'approve', () => communityOperatorService.approve(cmntySn, member.userId),
                          `${name} 님의 가입을 승인했습니다.`, '가입을 승인하지 못했습니다.'); }}>
                        {busy(member, 'approve') ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <UserCheck size={14} aria-hidden="true" />}
                        <span className="sr-only">{name}</span>{' '}가입 승인
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={pendingAction !== null} aria-busy={busy(member, 'reject') || undefined}
                        className="text-destructive hover:text-destructive"
                        onClick={() => { void runAction(member, 'reject', () => communityOperatorService.reject(cmntySn, member.userId),
                          `${name} 님의 가입 신청을 반려했습니다.`, '가입 신청을 반려하지 못했습니다.',
                          { title: '가입 신청 반려', message: `${name} 님의 가입 신청을 반려합니다. 신청 기록은 지워지며 다시 신청할 수 있습니다.`, confirmText: '반려' }); }}>
                        {busy(member, 'reject') ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <UserX size={14} aria-hidden="true" />}
                        <span className="sr-only">{name}</span>{' '}가입 반려
                      </Button>
                    </>
                  )}
                  {member.status === 'APPROVED' && !isOperator && (
                    <>
                      <Button type="button" size="sm" variant="outline" disabled={pendingAction !== null} aria-busy={busy(member, 'designate') || undefined}
                        onClick={() => { void runAction(member, 'designate', () => communityOperatorService.designate(cmntySn, member.userId, true),
                          `${name} 님을 운영자로 지정했습니다.`, '운영자로 지정하지 못했습니다.'); }}>
                        {busy(member, 'designate') ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={14} aria-hidden="true" />}
                        <span className="sr-only">{name}</span>{' '}운영자 지정
                      </Button>
                      <Button type="button" size="sm" variant="outline" disabled={pendingAction !== null} aria-busy={busy(member, 'withdraw') || undefined}
                        className="text-destructive hover:text-destructive"
                        onClick={() => { void runAction(member, 'withdraw', () => communityOperatorService.withdraw(cmntySn, member.userId),
                          `${name} 님을 탈퇴 처리했습니다.`, '탈퇴 처리하지 못했습니다.',
                          { title: '회원 탈퇴 처리', message: `${name} 님을 탈퇴 처리합니다. 회원 전용 게시판을 더 이상 볼 수 없고, 다시 이용하려면 새로 가입을 신청해야 합니다.`, confirmText: '탈퇴 처리' }); }}>
                        {busy(member, 'withdraw') ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <UserMinus size={14} aria-hidden="true" />}
                        <span className="sr-only">{name}</span>{' '}탈퇴 처리
                      </Button>
                    </>
                  )}
                  {isOperator && (
                    <Button type="button" size="sm" variant="outline" disabled={pendingAction !== null} aria-busy={busy(member, 'release') || undefined}
                      onClick={() => { void runAction(member, 'release', () => communityOperatorService.designate(cmntySn, member.userId, false),
                        `${name} 님의 운영자를 해제했습니다.`, '운영자를 해제하지 못했습니다.',
                        { title: '운영자 해제', message: `${name} 님의 운영자를 해제합니다. 해제하면 이 커뮤니티의 가입 승인·회원 관리를 할 수 없습니다.`, confirmText: '해제' }); }}>
                      {busy(member, 'release') ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <ShieldOff size={14} aria-hidden="true" />}
                      <span className="sr-only">{name}</span>{' '}운영자 해제
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <PagePagination page={page} total={total} size={PAGE_SIZE} onPageChange={setPage} />
      </section>

      <section aria-labelledby="community-operator-profile-heading" className="space-y-3">
        <h3 id="community-operator-profile-heading" className="text-sm font-bold text-foreground">소개 수정</h3>
        <form noValidate onSubmit={event => { void handleSaveProfile(event); }} className="space-y-3">
          <FormErrorSummary errors={validation.errors} labels={profileLabels} onNavigate={validation.focusError} />
          <div className="space-y-1">
            <Label htmlFor="cmntyNm">커뮤니티 이름 <span aria-hidden="true" className="text-destructive-emphasis">*</span></Label>
            <Input
              id="cmntyNm"
              {...validation.fieldProps('cmntyNm')}
              maxLength={300}
              value={profile.cmntyNm}
              onChange={event => { validation.clearError('cmntyNm'); setProfile({ ...profile, cmntyNm: event.target.value }); }}
            />
            {validation.errors.cmntyNm ? <p {...validation.messageProps('cmntyNm')} className="text-xs font-bold text-destructive-emphasis" /> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cmntyIntroCn">커뮤니티 소개</Label>
            <Textarea
              id="cmntyIntroCn"
              {...validation.fieldProps('cmntyIntroCn')}
              maxLength={4000}
              rows={4}
              value={profile.cmntyIntroCn ?? ''}
              onChange={event => { validation.clearError('cmntyIntroCn'); setProfile({ ...profile, cmntyIntroCn: event.target.value }); }}
            />
            {validation.errors.cmntyIntroCn ? <p {...validation.messageProps('cmntyIntroCn')} className="text-xs font-bold text-destructive-emphasis" /> : null}
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSavingProfile} aria-busy={isSavingProfile || undefined}>
              {isSavingProfile ? '저장 중…' : '소개 저장'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
