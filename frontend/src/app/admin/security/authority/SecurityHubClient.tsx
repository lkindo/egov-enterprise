'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { useToast } from '@/app/components/ui/toast';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PagePagination } from '@/components/common/PagePagination';
import { AuthorizationHistory } from './components/AuthorizationHistory';
import { AuthorizationGroupForm } from './components/AuthorizationGroupForm';
import { AuthorizationGroupEditor, type MenuFocusRequest } from './components/AuthorizationGroupEditor';
import { AuthorizationMembershipEditor } from './components/AuthorizationMembershipEditor';
import { GroupCopyDialog } from './components/GroupCopyDialog';
import { EMPTY_COMPARISON_SELECTION, GroupComparison, type ComparisonEditTarget, type ComparisonSelection } from './components/GroupComparison';
import type { AuthorizationGroupSnapshot } from '@/lib/auth/authorization-management-contract';
import { clearTargetHandoff, useTargetHandoff } from '@/lib/navigation/target-handoff';

/** 허브 영역. 화면 안 상태라 URL·브라우저 저장소에 두지 않는다(PD-UX-002). */
type Tab = 'groups' | 'users' | 'history' | 'compare';
const PAGE_SIZE = 20;

export default function SecurityHubClient() {
  const { user } = useAuth();
  const navigate = useUnsavedChanges({ dirty: false });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canRead = canPermission(user, 'AUTHRT_READ');
  const canCreate = canPermission(user, 'AUTHRT_CREATE');
  const canAudit = canPermission(user, 'AUTHRT_AUDIT');
  // 그룹 복제는 그룹 등록과 권한 설정을 함께 요구한다(서버가 집행한다).
  const canCopy = canCreate && canPermission(user, 'AUTHRT_GRANT');
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  // [2026-10-01] 사용자 상세에서 넘어온 대상(탭 세션 인계, URL 비노출). 탭·대상을 직접 고르기 전까지만 쓴다.
  const assignTarget = useTargetHandoff('authority-user');
  const historyTarget = useTargetHandoff('authority-history-user');
  const [chosenTab, setChosenTab] = useState<Tab | null>(null);
  const handedTab: Tab | null = assignTarget && canRead ? 'users' : historyTarget && canAudit ? 'history' : null;
  const selectedTab: Tab = chosenTab ?? handedTab ?? 'groups';
  const setTab = (next: Tab) => { clearTargetHandoff('authority-user', 'authority-history-user'); setChosenTab(next); };
  const tab = !canRead && canAudit ? 'history' : selectedTab;
  const [selectedGroup, setSelectedGroup] = useState('');
  const [chosenUser, setChosenUser] = useState<{ id: string; name: string } | null>(null);
  const selectedUser = chosenUser ?? (chosenTab === null && assignTarget ? { id: assignTarget.id, name: assignTarget.name } : null);
  const setSelectedUser = (next: { id: string; name: string }) => { clearTargetHandoff('authority-user'); setChosenUser(next); };
  const [creating, setCreating] = useState(false);
  // 복제 대화상자의 원본 그룹 코드. 그 그룹을 고르고 스냅샷을 읽은 뒤 연다(허브 안 상태, URL·저장소 금지).
  const [copySource, setCopySource] = useState<string | null>(null);
  /*
   * 사용자 메뉴 미리보기의 '고치기'·그룹 비교의 '편집' — 그 그룹의 편집기 탭(과 줄)으로 간다. 한 번만 쓰는 요청이다: 편집기가
   * 처리하면(onFocusHandled) 지운다. 남겨 두면 다른 영역에 갔다 돌아올 때 새로 만들어진 편집기가 같은 요청을 다시 실행해
   * 사용자가 고르지 않은 탭이 열리고 포커스가 옮겨진다. nonce 는 허브 안에서 늘기만 한다(지운 뒤에도 겹치지 않게).
   */
  const [menuFocus, setMenuFocus] = useState<(MenuFocusRequest & { group: string }) | null>(null);
  const focusNonce = useRef(0);
  // 그룹 비교의 조건 — 비교 영역이 언마운트돼도(편집하러 갔다 돌아와도) 남는다(화면 안 상태, URL·저장소 금지).
  const [comparisonSelection, setComparisonSelection] = useState<ComparisonSelection>(EMPTY_COMPARISON_SELECTION);
  // 복제로 만든 새 그룹 — 복제 양식이 닫히고 제출이 끝난 뒤(이동 확인은 저장 중이면 막힌다) 그 그룹으로 옮긴다.
  const [copiedGroup, setCopiedGroup] = useState<string | null>(null);
  const [pendingCreate, setPendingCreate] = useState(false);
  const createLock = useRef(false);
  const [groupFilter, setGroupFilter] = useState('');
  // [2026-09-26 DIP C9] 사용자 검색어는 `조회`/Enter 로 적용된 값이다(카탈로그 G2). 종전에는 타이핑을 디바운스해 조회했다.
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const groups = useQuery({ queryKey: [...scope, 'groups'], queryFn: () => authorizationAdminService.getGroups(), enabled: canRead, retry: false });
  /*
   * 보는 사람의 권한 버전이 바뀌면(내가 속한 그룹의 권한 저장, 구성원 탭에서 나를 추가·회수) 인증 컨텍스트가 조회 캐시를 비우고
   * scope 가 바뀐다. 그동안 편집기가 같은 그룹의 직전 스냅샷·카탈로그를 들고 있게 해(다시 읽는 중이라 저장은 잠긴다) 저장하지 않은
   * 다른 쪽 초안(기본 정보 폼·권한 초안·탭·펼침)을 잃지 않는다. 다른 그룹·다른 사용자의 직전 데이터는 쓰지 않는다.
   */
  const catalog = useQuery({
    queryKey: [...scope, 'catalog'], queryFn: () => authorizationAdminService.getCatalog(), enabled: canRead && tab === 'groups', retry: false,
    placeholderData: (previous, previousQuery) => (previousQuery?.queryKey[1] === user?.id ? previous : undefined),
  });
  const group = useQuery({
    queryKey: [...scope, 'group', selectedGroup], queryFn: () => authorizationAdminService.getGroup(selectedGroup),
    enabled: canRead && tab === 'groups' && !!selectedGroup && !creating, retry: false,
    placeholderData: (previous, previousQuery) => (previous?.code === selectedGroup && previousQuery?.queryKey[1] === user?.id ? previous : undefined),
  });
  const users = useQuery({ queryKey: [...scope, 'users', userSearch, userPage], queryFn: () => authorizationAdminService.getUsers(userSearch, userPage - 1, PAGE_SIZE), enabled: canRead && tab === 'users', retry: false });
  const membership = useQuery({ queryKey: [...scope, 'membership', selectedUser?.id], queryFn: () => authorizationAdminService.getMemberships(selectedUser!.id), enabled: canRead && tab === 'users' && !!selectedUser, retry: false });

  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['authorization'] }); };
  /** 쓰기 응답 스냅샷을 조회 캐시에 바로 쓴다 — 다시 읽기 전에도 편집기가 최신 기준선으로 본다. */
  const adoptSnapshot = (saved: AuthorizationGroupSnapshot) => { queryClient.setQueryData([...scope, 'group', saved.code], saved); };
  useEffect(() => {
    if (!copiedGroup) return;
    let active = true;
    // 원본 그룹의 저장하지 않은 변경이 있으면 이동 확인을 거친다(취소하면 원본에 남는다).
    void navigate(() => { setMenuFocus(null); setSelectedGroup(copiedGroup); }).finally(() => { if (active) setCopiedGroup(null); });
    return () => { active = false; };
  }, [copiedGroup, navigate]);
  /** 그 그룹의 편집기로 옮겨 탭(과 메뉴 줄)에 포커스한다 — 허브 안 상태 전환이다(URL·저장소 금지). */
  const focusGroupEditor = (groupCode: string, target: ComparisonEditTarget) => void navigate(() => {
    setTab('groups'); setCreating(false); setSelectedGroup(groupCode); setCopySource(null);
    focusNonce.current += 1;
    setMenuFocus({ group: groupCode, menuCode: target.menuCode, tab: target.tab, nonce: focusNonce.current });
  });
  const fixMenu = (groupCode: string, menuCode: string) => focusGroupEditor(groupCode, { menuCode, tab: 'screens' });
  const shownGroups = (groups.data ?? []).filter((entry) => `${entry.name} ${entry.code}`.toLowerCase().includes(groupFilter.toLowerCase()));
  const currentError = tab === 'history' || tab === 'compare' ? null : tab === 'users' ? (groups.error || users.error || membership.error) : (groups.error || catalog.error || group.error);

  return (
    <WorkListPage title="권한 그룹 관리" description="그룹에 기능권한을 연결하고 사용자에게 하나 이상의 그룹을 배정합니다." breadcrumbItems={[{ label: '보안' }, { label: '권한 그룹 관리' }]}
      actions={<Button type="button" variant="outline" onClick={() => void refresh()}>새로 조회</Button>}
      >
      <nav aria-label="권한 관리 영역" className="mb-6 flex flex-wrap gap-2">
        {canRead && <><Button type="button" variant={tab === 'groups' ? 'default' : 'outline'} aria-pressed={tab === 'groups'} onClick={() => { if (tab !== 'groups') void navigate(() => setTab('groups')); }}>그룹 · 기능권한</Button><Button type="button" variant={tab === 'users' ? 'default' : 'outline'} aria-pressed={tab === 'users'} onClick={() => { if (tab !== 'users') void navigate(() => setTab('users')); }}>사용자 배정</Button>
          <Button type="button" variant={tab === 'compare' ? 'default' : 'outline'} aria-pressed={tab === 'compare'} onClick={() => { if (tab !== 'compare') void navigate(() => setTab('compare')); }}>그룹 비교</Button></>}
        {canAudit && <Button type="button" variant={tab === 'history' ? 'default' : 'outline'} aria-pressed={tab === 'history'} onClick={() => { if (tab !== 'history') void navigate(() => setTab('history')); }}>변경 이력</Button>}
      </nav>
      {!canRead && !canAudit && <p role="alert">권한 관리 조회 권한이 없습니다.</p>}
      {currentError && <p role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-4">{extractErrorMessage(currentError, '권한 정보를 불러오지 못했습니다. 다시 조회해 주세요.')}</p>}
      {tab === 'groups' && canRead && <div className="grid gap-6 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,3fr)]">
        <section aria-label="권한 그룹 목록" className="space-y-4">
          <h2 className="font-semibold">권한 그룹</h2>
          <label className="block space-y-1 text-sm">그룹 검색<Input value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} /></label>
          {/* 복제 대상(copySource)은 복제 아이콘만 정한다 — 다른 그룹을 고르거나 그룹 추가로 가면 지운다. 남겨 두면 그 그룹을 나중에
              다시 골랐을 때 요청하지 않은 복제 대화상자가 열린다. */}
          {canCreate && <Button type="button" disabled={pendingCreate} onClick={() => void navigate(() => { setCreating(true); setSelectedGroup(''); setCopySource(null); })}>그룹 추가</Button>}
          {groups.isPending && <p role="status">그룹을 불러오는 중입니다…</p>}
          <ul className="space-y-2">{shownGroups.map((entry) => <li key={entry.code} className="flex items-start gap-1"><Button type="button" variant={entry.code === selectedGroup ? 'secondary' : 'outline'} className="h-auto min-w-0 flex-1 justify-start whitespace-normal p-3 text-left" disabled={pendingCreate} aria-pressed={entry.code === selectedGroup}
            onClick={() => { if (entry.code !== selectedGroup) void navigate(() => { setCreating(false); setSelectedGroup(entry.code); setMenuFocus(null); setCopySource(null); }); }}><span>{entry.name}<span className="block text-xs text-muted-foreground">{entry.code}</span></span></Button>
            {canCopy && entry.code !== 'ROLE_ANONYMOUS' && <Button type="button" variant="ghost" size="icon-sm" className="mt-2 shrink-0" disabled={pendingCreate} aria-label={`${entry.name} 그룹으로 새 그룹 만들기`} title="이 그룹으로 새 그룹 만들기"
              onClick={() => void navigate(() => { setCreating(false); setSelectedGroup(entry.code); setMenuFocus(null); setCopySource(entry.code); })}><Copy aria-hidden="true" /></Button>}</li>)}</ul>
          {groups.isSuccess && shownGroups.length === 0 && <p role="status">{emptyResultMessage(groupFilter, '등록된 권한 그룹이 없습니다.')}</p>}
        </section>
        <div>
          {creating && canCreate ? <section className="rounded-lg border border-border bg-card p-5"><h2 className="mb-4 font-semibold">권한 그룹 등록</h2><AuthorizationGroupForm creating initial={{ code: '', name: '', description: '' }} externalBusy={pendingCreate}
            onSubmit={async (values) => {
              if (!canCreate || createLock.current) return;
              createLock.current = true; setPendingCreate(true);
              try { await authorizationAdminService.createGroup(values); toast('권한 그룹을 등록했습니다.', 'success'); notifyAuthorizationChanged(); setCreating(false); setSelectedGroup(values.code); await refresh(); }
              catch (error) { toast(extractErrorMessage(error, '그룹을 등록하지 못했습니다.'), 'error'); throw error; }
              finally { createLock.current = false; setPendingCreate(false); }
            }} /></section>
            : selectedGroup && group.data && catalog.data && !group.isError && !catalog.isError ? <div className="space-y-6">{/* 키에 보는 사람의 권한 버전을 넣지 않는다 —
                내 그룹을 저장하거나 나를 구성원으로 바꿔 버전이 바뀌어도 편집기를 다시 만들지 않아 저장하지 않은 다른 쪽 초안을 지킨다(A2). 버튼은 렌더마다
                현재 권한으로 다시 판정한다. */}<AuthorizationGroupEditor key={`${user?.id}:${selectedGroup}`} snapshot={group.data} catalog={catalog.data} refreshing={group.isFetching || catalog.isFetching} onRefresh={refresh} onDeleted={() => setSelectedGroup((current) => current === selectedGroup ? '' : current)}
                onSaved={adoptSnapshot} onCopy={canCopy ? () => setCopySource(selectedGroup) : undefined}
                onEditMember={(member) => void navigate(() => { setChosenTab('users'); setSelectedUser(member); })}
                focusRequest={menuFocus && menuFocus.group === selectedGroup ? menuFocus : null}
                onFocusHandled={(nonce) => setMenuFocus((current) => (current?.nonce === nonce ? null : current))} />
              {canCopy && copySource === selectedGroup && <GroupCopyDialog key={copySource} source={group.data} onClose={() => setCopySource(null)}
                onCopied={(created) => { setCopySource(null); adoptSnapshot(created); notifyAuthorizationChanged(); void refresh(); setCopiedGroup(created.code); }} />}</div>
              : <p role="status" className="rounded-lg border border-border p-5">{selectedGroup && (group.isFetching || catalog.isFetching) ? '전체 권한을 불러오는 중입니다…' : '설정할 권한 그룹을 선택하세요.'}</p>}
        </div>
      </div>}
      {tab === 'users' && canRead && <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4"><h2 className="font-semibold">사용자 찾기</h2><KeywordFilter label="사용자 이름·로그인 ID" value={userSearch} onSearch={(next) => { setUserSearch(next); setUserPage(1); }} />
          {users.isPending && <p role="status">사용자를 불러오는 중입니다…</p>}
          <ul aria-label="사용자 검색 결과" className="space-y-2">{(users.data?.list ?? []).map((entry) => <li key={entry.id}><Button type="button" variant={entry.id === selectedUser?.id ? 'secondary' : 'outline'} className="h-auto w-full justify-start p-3" aria-pressed={entry.id === selectedUser?.id} onClick={() => { if (entry.id !== selectedUser?.id) void navigate(() => setSelectedUser({ id: entry.id, name: entry.userNm })); }}>{entry.userNm} · {entry.userId}</Button></li>)}</ul>
          {users.isSuccess && users.data.list.length === 0 && <p role="status">{emptyResultMessage(userSearch, '조회된 사용자가 없습니다.')}</p>}
          <PagePagination total={users.data?.total ?? 0} page={userPage} size={PAGE_SIZE} onPageChange={setUserPage} />
        </section>
        <div className="space-y-3">{selectedUser && <h2 className="font-semibold">{selectedUser.name}</h2>}
          {selectedUser && membership.data && groups.data && !membership.isError && !groups.isError ? <AuthorizationMembershipEditor key={`${user?.id}:${user?.authorizationVersion}:${selectedUser.id}`} snapshot={membership.data} groups={groups.data} refreshing={membership.isFetching || groups.isFetching} onRefresh={refresh}
            userName={selectedUser.name} onFixMenu={fixMenu} />
            : <p role="status">{selectedUser && membership.isFetching ? '사용자의 전체 그룹을 불러오는 중입니다…' : '배정할 사용자를 선택하세요.'}</p>}
        </div>
      </div>}
      {tab === 'compare' && canRead && <GroupComparison selection={comparisonSelection} onSelectionChange={setComparisonSelection} onEdit={focusGroupEditor} />}
      {tab === 'history' && canAudit && <AuthorizationHistory key={historyTarget?.at ?? 'none'} initialUserId={chosenTab === null ? historyTarget?.loginId ?? '' : ''} />}
    </WorkListPage>
  );
}
