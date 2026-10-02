'use client';

import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import { failureMessage } from '@/lib/safe-error-log';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PagePagination } from '@/components/common/PagePagination';
import { invalidateMembershipQueries, isConflict } from './group-member-queries';

const PAGE_SIZE = 20;

interface Candidate { id: string; name: string; loginId: string }

/**
 * '구성원 추가' 대화상자(2026-10-02, 관리 콘솔 UX 2단계 D6). 사용자 검색(로그인 ID·이름, 페이지)과 부서 명부에서 여러 명을
 * 골라 한 번에 추가한다. 이미 구성원인 사람은 표시하고 고를 수 없다 — 구성원 여부를 아직 모르면 확인될 때까지 고를 수 없다.
 * 고른 사람은 탭을 바꿔도 남는다. 서버가 그 사이 바뀐 구성원을 사람 이름으로 밝혀 거부하면(409) 목록을 다시 읽는다.
 *
 * 고른 사람이 있으면 Esc·배경·X·'추가 취소'로 닫을 때 확인한다(DEC-OPS-188) — 고르기는 폼 입력이 아니라 모달의 자동 가드가
 * 세지 못한다. 여러 페이지·부서를 오가며 고른 사람이 실수 한 번에 사라지지 않게 한다. 추가에 성공해 닫는 것은 묻지 않는다.
 */
export function GroupMemberAddDialog({ code, name, onClose }: { code: string; name: string; onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const canAssign = canPermission(user, 'AUTHRT_ASSIGN') && canPermission(user, 'AUTHRT_READ');
  const [tab, setTab] = useState<'search' | 'department'>('search');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [departmentId, setDepartmentId] = useState('');
  const [selected, setSelected] = useState<ReadonlyMap<string, Candidate>>(() => new Map());
  const [addPending, setAddPending] = useState(false);
  const addRequestRef = useRef(false);
  const requestClose = useDirtyCloseGuard(selected.size > 0, onClose);

  const users = useQuery({ queryKey: [...scope, 'users', keyword, page], queryFn: () => authorizationAdminService.getUsers(keyword, page - 1, PAGE_SIZE), retry: false });
  // 검색 결과에는 구성원 여부가 없다 — 보이는 사람마다 전체 배정을 읽는다(사용자 배정 화면과 같은 조회·캐시).
  const memberships = useQueries({
    queries: (users.data?.list ?? []).map((entry) => ({
      queryKey: [...scope, 'membership', entry.id],
      queryFn: () => authorizationAdminService.getMemberships(entry.id),
      retry: false,
    })),
  });
  const departments = useQuery({ queryKey: [...scope, 'departments'], queryFn: () => authorizationAdminService.getDepartments(), retry: false });
  const roster = useQuery({
    queryKey: [...scope, 'department-memberships', departmentId],
    queryFn: () => authorizationAdminService.getDepartmentMemberships(departmentId),
    enabled: tab === 'department' && !!departmentId, retry: false,
  });

  const toggle = (candidate: Candidate, checked: boolean) => setSelected((previous) => {
    const next = new Map(previous);
    if (checked) next.set(candidate.id, candidate); else next.delete(candidate.id);
    return next;
  });
  const rosterCandidates = (roster.data?.users ?? []).filter((member) => !member.groups.includes(code))
    .map((member): Candidate => ({ id: member.userId, name: member.userName, loginId: member.loginId }));

  const addSelected = async () => {
    if (!canAssign || selected.size === 0 || addRequestRef.current) return;
    addRequestRef.current = true;
    setAddPending(true);
    try {
      const result = await authorizationAdminService.updateGroupMembers(code, { add: [...selected.keys()], remove: [], complete: true });
      toast(`구성원 ${result.added.length}명을 추가했습니다. 지금 구성원은 ${result.memberCount}명입니다.`, 'success');
      notifyAuthorizationChanged();
      await invalidateMembershipQueries(queryClient);
      onClose();
    } catch (error) {
      toast(failureMessage(error, '구성원을 추가하지 못했습니다. 구성원 목록을 다시 확인해 주세요.'), 'error');
      if (isConflict(error)) await invalidateMembershipQueries(queryClient);
    } finally {
      addRequestRef.current = false;
      setAddPending(false);
    }
  };

  const candidateRow = (candidate: Candidate, state: 'member' | 'checking' | 'unknown' | 'free') => (
    <li key={candidate.id} className="flex flex-wrap items-center gap-3 p-2">
      <label className="flex min-w-0 flex-1 items-center gap-3 text-sm">
        <Checkbox checked={selected.has(candidate.id)} disabled={state !== 'free' || addPending}
          onCheckedChange={(checked) => toggle(candidate, checked === true)} />
        <span className="min-w-0 break-words">{candidate.name} · {candidate.loginId}</span>
      </label>
      {state === 'member' && <span className="text-xs text-muted-foreground">이미 구성원</span>}
      {state === 'checking' && <span className="text-xs text-muted-foreground">구성원 여부 확인 중…</span>}
      {state === 'unknown' && <span className="text-xs text-muted-foreground">구성원 여부를 확인하지 못해 고를 수 없습니다</span>}
    </li>
  );

  return (
    <StandardModal isOpen onClose={requestClose} title={`'${name}' 구성원 추가`} maxWidth="2xl" closeDisabled={addPending}
      footer={<>
        <Button type="button" variant="outline" disabled={addPending} onClick={requestClose}>추가 취소</Button>
        {canAssign && <Button type="button" disabled={selected.size === 0 || addPending} aria-busy={addPending} onClick={() => void addSelected()}>
          {selected.size}명 추가
        </Button>}
      </>}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">고른 사람에게 이 그룹만 더합니다. 그 사람의 다른 그룹 배정은 그대로이고, 이 그룹의 권한 변경은 따로 저장합니다.</p>
        <Tabs value={tab} onValueChange={(value) => setTab(value as 'search' | 'department')} className="gap-3">
          <TabsList aria-label="사람 찾는 방법">
            <TabsTrigger value="search" className="flex-none px-3">사용자 검색</TabsTrigger>
            <TabsTrigger value="department" className="flex-none px-3">부서</TabsTrigger>
          </TabsList>
          <TabsContent value="search" className="space-y-3">
            <KeywordFilter label="추가할 사용자 이름·로그인 ID" value={keyword} onSearch={(next) => { setKeyword(next); setPage(1); }} />
            {users.isPending && <p role="status">사용자를 불러오는 중입니다…</p>}
            {users.isError && <p role="alert">{extractErrorMessage(users.error, '사용자를 불러오지 못했습니다.')}</p>}
            {users.isSuccess && users.data.list.length === 0 && <p role="status">{emptyResultMessage(keyword, '조회된 사용자가 없습니다.')}</p>}
            {users.isSuccess && users.data.list.length > 0 && <ul aria-label="사용자 검색 결과" className="divide-y divide-border rounded-md border border-border">
              {users.data.list.map((entry, index) => {
                const membership = memberships[index];
                const state = membership?.data ? (membership.data.groups.includes(code) ? 'member' : 'free') : membership?.isError ? 'unknown' : 'checking';
                return candidateRow({ id: entry.id, name: entry.userNm, loginId: entry.userId }, state);
              })}
            </ul>}
            <PagePagination total={users.data?.total ?? 0} page={page} size={PAGE_SIZE} onPageChange={setPage} />
          </TabsContent>
          <TabsContent value="department" className="space-y-3">
            <label className="block space-y-1 text-sm">부서
              <select className="block h-[var(--control-h)] w-full max-w-md rounded-md border border-input bg-background px-3" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
                <option value="">부서를 선택하세요</option>
                {(departments.data ?? []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
            </label>
            {departments.isError && <p role="alert">{extractErrorMessage(departments.error, '부서를 불러오지 못했습니다.')}</p>}
            {departmentId && roster.isPending && <p role="status">부서 구성원을 불러오는 중입니다…</p>}
            {roster.isError && <p role="alert">{extractErrorMessage(roster.error, '부서 구성원을 불러오지 못했습니다.')}</p>}
            {roster.isSuccess && roster.data.users.length === 0 && <p role="status">이 부서에 속한 사용자가 없습니다.</p>}
            {roster.isSuccess && roster.data.users.length > 0 && <>
              <Button type="button" variant="outline" size="sm" disabled={rosterCandidates.length === 0 || addPending}
                onClick={() => setSelected((previous) => new Map([...previous, ...rosterCandidates.map((candidate) => [candidate.id, candidate] as const)]))}>
                이 부서에서 구성원이 아닌 사람 모두 고르기
              </Button>
              <ul aria-label="부서 구성원" className="divide-y divide-border rounded-md border border-border">
                {roster.data.users.map((member) => candidateRow({ id: member.userId, name: member.userName, loginId: member.loginId }, member.groups.includes(code) ? 'member' : 'free'))}
              </ul>
            </>}
          </TabsContent>
        </Tabs>
        <section aria-label="고른 사람" className="space-y-2 rounded-md border border-border p-3">
          <p className="text-sm font-medium">고른 사람 {selected.size}명</p>
          {selected.size === 0 ? <p className="text-sm text-muted-foreground">아직 고른 사람이 없습니다.</p>
            : <ul className="flex flex-wrap gap-2">
              {[...selected.values()].map((candidate) => <li key={candidate.id}>
                <Button type="button" variant="outline" size="sm" disabled={addPending} aria-label={`${candidate.name} · ${candidate.loginId} 고르기 취소`} onClick={() => toggle(candidate, false)}>
                  {candidate.name} · {candidate.loginId}<X aria-hidden="true" />
                </Button>
              </li>)}
            </ul>}
        </section>
      </div>
    </StandardModal>
  );
}
