'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { useToast } from '@/app/components/ui/toast';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PagePagination } from '@/components/common/PagePagination';
import { AuthorizationHistory } from './components/AuthorizationHistory';
import { AuthorizationGroupForm } from './components/AuthorizationGroupForm';
import { AuthorizationGroupEditor } from './components/AuthorizationGroupEditor';
import { AuthorizationMembershipEditor } from './components/AuthorizationMembershipEditor';

type Tab = 'groups' | 'users' | 'history';
const PAGE_SIZE = 20;

export default function SecurityHubClient() {
  const { user } = useAuth();
  const navigate = useUnsavedChanges({ dirty: false });
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canRead = canPermission(user, 'AUTHRT_READ');
  const canCreate = canPermission(user, 'AUTHRT_CREATE');
  const canAudit = canPermission(user, 'AUTHRT_AUDIT');
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const [selectedTab, setTab] = useState<Tab>('groups');
  const tab = !canRead && canAudit ? 'history' : selectedTab;
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const createLock = useRef(false);
  const [groupFilter, setGroupFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const keyword = useDebouncedValue(userSearch, 300);
  const [userPage, setUserPage] = useState(1);
  const groups = useQuery({ queryKey: [...scope, 'groups'], queryFn: () => authorizationAdminService.getGroups(), enabled: canRead, retry: false });
  const catalog = useQuery({ queryKey: [...scope, 'catalog'], queryFn: () => authorizationAdminService.getCatalog(), enabled: canRead && tab === 'groups', retry: false });
  const group = useQuery({ queryKey: [...scope, 'group', selectedGroup], queryFn: () => authorizationAdminService.getGroup(selectedGroup), enabled: canRead && tab === 'groups' && !!selectedGroup && !creating, retry: false });
  const users = useQuery({ queryKey: [...scope, 'users', keyword, userPage], queryFn: () => authorizationAdminService.getUsers(keyword, userPage - 1, PAGE_SIZE), enabled: canRead && tab === 'users', retry: false });
  const membership = useQuery({ queryKey: [...scope, 'membership', selectedUser?.id], queryFn: () => authorizationAdminService.getMemberships(selectedUser!.id), enabled: canRead && tab === 'users' && !!selectedUser, retry: false });

  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['authorization'] }); };
  const shownGroups = (groups.data ?? []).filter((entry) => `${entry.name} ${entry.code}`.toLowerCase().includes(groupFilter.toLowerCase()));
  const currentError = tab === 'history' ? null : tab === 'users' ? (groups.error || users.error || membership.error) : (groups.error || catalog.error || group.error);

  return (
    <WorkListPage title="권한 그룹 관리" description="그룹에 기능권한을 연결하고 사용자에게 하나 이상의 그룹을 배정합니다." breadcrumbItems={[{ label: '보안' }, { label: '권한 그룹 관리' }]}
      actions={<Button type="button" variant="outline" onClick={() => void refresh()}>새로 조회</Button>}
      >
      <nav aria-label="권한 관리 영역" className="mb-6 flex flex-wrap gap-2">
        {canRead && <><Button type="button" variant={tab === 'groups' ? 'default' : 'outline'} aria-pressed={tab === 'groups'} onClick={() => { if (tab !== 'groups') void navigate(() => setTab('groups')); }}>그룹 · 기능권한</Button><Button type="button" variant={tab === 'users' ? 'default' : 'outline'} aria-pressed={tab === 'users'} onClick={() => { if (tab !== 'users') void navigate(() => setTab('users')); }}>사용자 배정</Button></>}
        {canAudit && <Button type="button" variant={tab === 'history' ? 'default' : 'outline'} aria-pressed={tab === 'history'} onClick={() => { if (tab !== 'history') void navigate(() => setTab('history')); }}>변경 이력</Button>}
      </nav>
      {!canRead && !canAudit && <p role="alert">권한 관리 조회 권한이 없습니다.</p>}
      {currentError && <p role="alert" className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-4">{extractErrorMessage(currentError, '권한 정보를 불러오지 못했습니다. 다시 조회해 주세요.')}</p>}
      {tab === 'groups' && canRead && <div className="grid gap-6 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,3fr)]">
        <section aria-label="권한 그룹 목록" className="space-y-4">
          <h2 className="font-semibold">권한 그룹</h2>
          <label className="block space-y-1 text-sm">그룹 검색<Input value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)} /></label>
          {canCreate && <Button type="button" disabled={pendingCreate} onClick={() => void navigate(() => { setCreating(true); setSelectedGroup(''); })}>그룹 추가</Button>}
          {groups.isPending && <p role="status">그룹을 불러오는 중입니다…</p>}
          <ul className="space-y-2">{shownGroups.map((entry) => <li key={entry.code}><Button type="button" variant={entry.code === selectedGroup ? 'secondary' : 'outline'} className="h-auto w-full justify-start whitespace-normal p-3 text-left" disabled={pendingCreate} aria-pressed={entry.code === selectedGroup}
            onClick={() => { if (entry.code !== selectedGroup) void navigate(() => { setCreating(false); setSelectedGroup(entry.code); }); }}><span>{entry.name}<span className="block text-xs text-muted-foreground">{entry.code}</span></span></Button></li>)}</ul>
          {groups.isSuccess && shownGroups.length === 0 && <p role="status">검색 결과가 없습니다.</p>}
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
            : selectedGroup && group.data && catalog.data && !group.isError && !catalog.isError ? <AuthorizationGroupEditor key={`${user?.id}:${user?.authorizationVersion}:${selectedGroup}`} snapshot={group.data} catalog={catalog.data} refreshing={group.isFetching || catalog.isFetching} onRefresh={refresh} onDeleted={() => setSelectedGroup((current) => current === selectedGroup ? '' : current)} />
              : <p role="status" className="rounded-lg border border-border p-5">{selectedGroup && (group.isFetching || catalog.isFetching) ? '전체 권한을 불러오는 중입니다…' : '설정할 권한 그룹을 선택하세요.'}</p>}
        </div>
      </div>}
      {tab === 'users' && canRead && <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4"><h2 className="font-semibold">사용자 찾기</h2><label className="block space-y-1 text-sm">사용자 이름·로그인 ID<Input value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setUserPage(1); }} /></label>
          {users.isPending && <p role="status">사용자를 불러오는 중입니다…</p>}
          <ul aria-label="사용자 검색 결과" className="space-y-2">{(users.data?.list ?? []).map((entry) => <li key={entry.id}><Button type="button" variant={entry.id === selectedUser?.id ? 'secondary' : 'outline'} className="h-auto w-full justify-start p-3" aria-pressed={entry.id === selectedUser?.id} onClick={() => { if (entry.id !== selectedUser?.id) void navigate(() => setSelectedUser({ id: entry.id, name: entry.userNm })); }}>{entry.userNm} · {entry.userId}</Button></li>)}</ul>
          {users.isSuccess && users.data.list.length === 0 && <p role="status">검색 결과가 없습니다.</p>}
          <PagePagination total={users.data?.total ?? 0} page={userPage} size={PAGE_SIZE} onPageChange={setUserPage} />
        </section>
        <div className="space-y-3">{selectedUser && <h2 className="font-semibold">{selectedUser.name}</h2>}
          {selectedUser && membership.data && groups.data && !membership.isError && !groups.isError ? <AuthorizationMembershipEditor key={`${user?.id}:${user?.authorizationVersion}:${selectedUser.id}`} snapshot={membership.data} groups={groups.data} refreshing={membership.isFetching || groups.isFetching} onRefresh={refresh} />
            : <p role="status">{selectedUser && membership.isFetching ? '사용자의 전체 그룹을 불러오는 중입니다…' : '배정할 사용자를 선택하세요.'}</p>}
        </div>
      </div>}
      {tab === 'history' && canAudit && <AuthorizationHistory />}
    </WorkListPage>
  );
}
