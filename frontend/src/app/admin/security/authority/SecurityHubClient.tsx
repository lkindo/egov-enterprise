'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Plus, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import { cn } from '@/lib/utils';
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

/**
 * 권한 그룹 관리 허브(A1 셸 + 그룹 목록 | 권한 작업대).
 *
 * [2026-10-05 한 화면 압축, 사용자 승인] '그룹 · 기능권한' 영역은 업무면 fill 셸(카탈로그 §4)이다 — 넓고 높은 화면에서 페이지는
 * 스크롤하지 않고, 그룹 목록(14rem 고정 열)과 작업대의 표가 각자 안쪽에서 스크롤한다. '변경 이력' 영역도 fill 이다 — 이력 표가 늘어
 * 페이지가 970~2,042px 스크롤하던 것을, 조건·쪽 넘김은 제자리에 두고 표 상자만 스크롤하게 했다(2차 실측 반영). 사용자 배정·그룹 비교는
 * 실측에서 넘치지 않아 종전처럼 쌓인다. 영역 단추는 셸의 navigation 슬롯의 밑줄형 작은 단추이고, 건수가 없는 결과 도구 줄은 시각적으로 숨긴다.
 * 처음 들어오면 첫 그룹을 고른다(화면 안 상태 — URL 을 만들지 않는다). 그룹 단추는 저장된 '메뉴 n · 기능 n'(그룹 비교가 쓰는
 * 전체 그룹 권한 조회를 같이 쓴다 — 새 API 가 없다)과, 지금 편집 중인 그룹의 저장하지 않은 '변경 n'을 보인다.
 */
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
  // 첫 진입 자동 선택을 한 번만 한다 — 사용자가 고른 뒤(그룹 삭제로 비었을 때 포함)에는 다시 고르지 않는다.
  const [autoSelected, setAutoSelected] = useState(false);
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
  /*
   * 지금 편집 중인 그룹의 저장하지 않은 권한 변경 수(편집기가 알린다). 그룹 단추의 '변경 n'. 어느 그룹의 수인지 함께 든다 — 그룹을
   * 바꾸면 새 그룹 단추가 먼저 그려지고 앞 편집기의 정리(0 알림)는 그 뒤에 와서, 수만 들면 버린 변경 수가 새 그룹 단추에 한 번
   * 그려졌다(반박 리뷰 반영). 같은 값이면 상태를 바꾸지 않는다.
   */
  const [draftChanges, setDraftChanges] = useState<{ group: string; count: number }>({ group: '', count: 0 });
  const reportDraftChanges = useCallback((count: number, group: string) => {
    setDraftChanges((previous) => (previous.group === group && previous.count === count ? previous : { group, count }));
  }, []);
  // [2026-09-26 DIP C9] 사용자 검색어는 `조회`/Enter 로 적용된 값이다(카탈로그 G2). 종전에는 타이핑을 디바운스해 조회했다.
  const [userSearch, setUserSearch] = useState('');
  const [userPage, setUserPage] = useState(1);
  const groups = useQuery({ queryKey: [...scope, 'groups'], queryFn: () => authorizationAdminService.getGroups(), enabled: canRead, retry: false });
  /*
   * 그룹 단추의 '메뉴 n · 기능 n' — 그룹 비교·사용자 메뉴 미리보기가 쓰는 전체 그룹 권한 조회(같은 조회 키)를 같이 쓴다. 저장된
   * 권한의 수다(편집 중인 변경은 '변경 n'이 말한다). 보조 정보라 실패하면 수를 생략할 뿐 화면을 막지 않는다.
   */
  const grantMatrix = useQuery({ queryKey: [...scope, 'grant-matrix'], queryFn: () => authorizationAdminService.getGrantMatrix(), enabled: canRead && tab === 'groups', retry: false });
  const grantCounts = useMemo(() => new Map((grantMatrix.data?.groups ?? []).map((entry) => [entry.code, {
    menus: entry.grants.filter((grant) => grant.type === 'NAVIGATION').length,
    operations: entry.grants.filter((grant) => grant.type === 'OPERATION').length,
  }])), [grantMatrix.data]);
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

  /*
   * 첫 진입에는 첫 그룹을 고른다 — 종전에는 '설정할 권한 그룹을 선택하세요.' 만 보여 표를 보려면 한 번 더 눌러야 했다. 목록을 처음
   * 읽었을 때 한 번만, 아무 그룹도 고르지 않았고 등록 중도 아닐 때다. 렌더 중 조정이다(effect 안 setState 금지). 바뀌지 않은 편집기가
   * 없으므로 이탈 확인이 필요 없다. URL·브라우저 저장소에 싣지 않는다(PD-UX-002).
   */
  if (!autoSelected && groups.data) {
    setAutoSelected(true);
    if (!selectedGroup && !creating && groups.data.length > 0) setSelectedGroup(groups.data[0].code);
  }

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

  /** 영역 단추 — 밑줄형 작은 단추(32px). 눌린 영역은 aria-pressed 로 알린다. */
  const areaButton = (value: Tab, label: string) => (
    <Button key={value} type="button" variant="ghost" size="sm" aria-pressed={tab === value}
      className={cn('-mb-px rounded-none border-b-2 px-3', tab === value ? 'border-primary font-semibold text-foreground' : 'border-transparent')}
      onClick={() => { if (tab !== value) void navigate(() => setTab(value)); }}>{label}</Button>
  );
  const areas = (canRead || canAudit) && (
    <nav aria-label="권한 관리 영역" className="flex flex-wrap gap-1 border-b border-border">
      {canRead && <>{areaButton('groups', '그룹 · 기능권한')}{areaButton('users', '사용자 배정')}{areaButton('compare', '그룹 비교')}</>}
      {canAudit && areaButton('history', '변경 이력')}
    </nav>
  );

  return (
    <WorkListPage title="권한 그룹 관리" description="그룹에 기능권한을 연결하고 사용자에게 하나 이상의 그룹을 배정합니다." breadcrumbItems={[{ label: '보안' }, { label: '권한 그룹 관리' }]}
      actions={<Button type="button" variant="outline" onClick={() => void refresh()}>새로 조회</Button>}
      navigation={areas || undefined} fill={(tab === 'groups' && canRead) || (tab === 'history' && canAudit)} hideEmptyToolbar
      >
      {!canRead && !canAudit && <p role="alert">권한 관리 조회 권한이 없습니다.</p>}
      {currentError && <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3">{extractErrorMessage(currentError, '권한 정보를 불러오지 못했습니다. 다시 조회해 주세요.')}</p>}
      {tab === 'groups' && canRead && <div className="grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)] work-fill:min-h-0 work-fill:flex-1 work-fill:grid-rows-[minmax(0,1fr)]">
        <section aria-label="권한 그룹 목록" className="flex flex-col gap-2 work-fill:min-h-0">
          <h2 className="sr-only">권한 그룹</h2>
          <div className="flex items-center gap-1.5">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input aria-label="그룹 검색" placeholder="그룹 검색" value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} className="h-[var(--control-h-sm)] pl-7 text-sm" />
            </div>
            {/* 복제 대상(copySource)은 복제 아이콘만 정한다 — 다른 그룹을 고르거나 그룹 추가로 가면 지운다. 남겨 두면 그 그룹을 나중에
                다시 골랐을 때 요청하지 않은 복제 대화상자가 열린다. */}
            {canCreate && <Button type="button" size="sm" className="shrink-0 px-2" disabled={pendingCreate} onClick={() => void navigate(() => { setCreating(true); setSelectedGroup(''); setCopySource(null); })}><Plus aria-hidden="true" />그룹 추가</Button>}
          </div>
          {groups.isPending && <p role="status" className="text-sm">그룹을 불러오는 중입니다…</p>}
          {/* 그룹 목록은 열 안에서 따로 스크롤한다. `-m-1 p-1` 은 스크롤 상자 가장자리에서 그룹 단추·복제 단추의 포커스 링(바깥 4px)이
              잘리지 않게 하는 여백이다(work-fill.ts 작업 영역과 같은 방식, 2.4.7). */}
          <ul className="relative space-y-0.5 work-fill:-m-1 work-fill:min-h-0 work-fill:flex-1 work-fill:overflow-y-auto work-fill:p-1">{shownGroups.map((entry) => {
            const selected = entry.code === selectedGroup;
            const counts = grantCounts.get(entry.code);
            const changes = selected && draftChanges.group === entry.code ? draftChanges.count : 0;
            return (
              <li key={entry.code} className="flex items-center gap-1">
                <Button type="button" variant={selected ? 'secondary' : 'ghost'} className="h-auto min-w-0 flex-1 justify-start gap-2 whitespace-normal px-2 py-1 text-left font-normal" disabled={pendingCreate} aria-pressed={selected}
                  onClick={() => { if (!selected) void navigate(() => { setCreating(false); setSelectedGroup(entry.code); setMenuFocus(null); setCopySource(null); }); }}>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium text-foreground">{entry.name}</span>
                    <span className="block break-all text-xs text-muted-foreground">{entry.code}{counts ? ` · 메뉴 ${counts.menus} · 기능 ${counts.operations}` : ''}</span>
                  </span>
                  {changes > 0 && <span className="shrink-0 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">변경 {changes}</span>}
                </Button>
                {canCopy && entry.code !== 'ROLE_ANONYMOUS' && <Button type="button" variant="ghost" size="icon-xs" className="shrink-0" disabled={pendingCreate} aria-label={`${entry.name} 그룹으로 새 그룹 만들기`} title="이 그룹으로 새 그룹 만들기"
                  onClick={() => void navigate(() => { setCreating(false); setSelectedGroup(entry.code); setMenuFocus(null); setCopySource(entry.code); })}><Copy aria-hidden="true" /></Button>}
              </li>
            );
          })}</ul>
          {groups.isSuccess && shownGroups.length === 0 && <p role="status" className="text-sm">{emptyResultMessage(groupFilter, '등록된 권한 그룹이 없습니다.')}</p>}
        </section>
        <div className="work-fill:flex work-fill:min-h-0 work-fill:flex-col">
          {creating && canCreate ? <section className="relative rounded-lg border border-border bg-card p-4 work-fill:min-h-0 work-fill:overflow-y-auto"><h2 className="mb-4 font-semibold">권한 그룹 등록</h2><AuthorizationGroupForm creating initial={{ code: '', name: '', description: '' }} externalBusy={pendingCreate}
            onSubmit={async (values) => {
              if (!canCreate || createLock.current) return;
              createLock.current = true; setPendingCreate(true);
              try { await authorizationAdminService.createGroup(values); toast('권한 그룹을 등록했습니다.', 'success'); notifyAuthorizationChanged(); setCreating(false); setSelectedGroup(values.code); await refresh(); }
              catch (error) { toast(extractErrorMessage(error, '그룹을 등록하지 못했습니다.'), 'error'); throw error; }
              finally { createLock.current = false; setPendingCreate(false); }
            }} /></section>
            : selectedGroup && group.data && catalog.data && !group.isError && !catalog.isError ? <>{/* 키에 보는 사람의 권한 버전을 넣지 않는다 —
                내 그룹을 저장하거나 나를 구성원으로 바꿔 버전이 바뀌어도 편집기를 다시 만들지 않아 저장하지 않은 다른 쪽 초안을 지킨다(A2). 버튼은 렌더마다
                현재 권한으로 다시 판정한다. */}<AuthorizationGroupEditor key={`${user?.id}:${selectedGroup}`} snapshot={group.data} catalog={catalog.data} refreshing={group.isFetching || catalog.isFetching} onRefresh={refresh} onDeleted={() => setSelectedGroup((current) => current === selectedGroup ? '' : current)}
                onSaved={adoptSnapshot} onCopy={canCopy ? () => setCopySource(selectedGroup) : undefined}
                onEditMember={(member) => void navigate(() => { setChosenTab('users'); setSelectedUser(member); })}
                focusRequest={menuFocus && menuFocus.group === selectedGroup ? menuFocus : null}
                onFocusHandled={(nonce) => setMenuFocus((current) => (current?.nonce === nonce ? null : current))}
                onChangeCountChange={reportDraftChanges} />
              {canCopy && copySource === selectedGroup && <GroupCopyDialog key={copySource} source={group.data} onClose={() => setCopySource(null)}
                onCopied={(created) => { setCopySource(null); adoptSnapshot(created); notifyAuthorizationChanged(); void refresh(); setCopiedGroup(created.code); }} />}</>
              : <p role="status" className="rounded-lg border border-border p-4">{selectedGroup && (group.isFetching || catalog.isFetching) ? '전체 권한을 불러오는 중입니다…' : '설정할 권한 그룹을 선택하세요.'}</p>}
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
      {tab === 'history' && canAudit && <AuthorizationHistory fill key={historyTarget?.at ?? 'none'} initialUserId={chosenTab === null ? historyTarget?.loginId ?? '' : ''} />}
    </WorkListPage>
  );
}
