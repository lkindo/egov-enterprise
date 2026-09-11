'use client';

import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { authorizationDepartmentChangeSchema, type AuthorizationDepartmentSnapshot, type AuthorizationGroupSummary } from '@/lib/auth/authorization-management-contract';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { FormErrorSummary } from '@/components/ui/form';
import { MasterDetailLayout } from '@/app/components/patterns/master-detail-page';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage, extractFieldErrors } from '@/app/actions/actionUtils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export default function SecurityDeptAuthorityClient() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canRead = canPermission(user, 'AUTHRT_READ');
  const scope = ['authorization', user?.id, user?.authorizationVersion];
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filter, setFilter] = useState('');
  const departments = useQuery({ queryKey: [...scope, 'departments'], queryFn: () => authorizationAdminService.getDepartments(), enabled: canRead, retry: false });
  const groups = useQuery({ queryKey: [...scope, 'groups'], queryFn: () => authorizationAdminService.getGroups(), enabled: canRead, retry: false });
  const roster = useQuery({ queryKey: [...scope, 'department-memberships', selectedDepartment], queryFn: () => authorizationAdminService.getDepartmentMemberships(selectedDepartment), enabled: canRead && !!selectedDepartment, retry: false });
  const error = departments.error || groups.error || roster.error;
  const refresh = async () => { await queryClient.invalidateQueries({ queryKey: ['authorization'] }); };
  return (
    <WorkListPage title="부서별 그룹 배정" description="부서 구성원을 확인한 뒤 선택한 사용자에게 그룹을 추가하거나 회수합니다." breadcrumbItems={[{ label: '보안' }, { label: '부서별 권한 그룹' }]}
      actions={<Button type="button" variant="outline" onClick={() => void refresh()}>새로 조회</Button>}
      filter={<label className="block max-w-sm space-y-1 text-sm">부서 검색<Input value={filter} onChange={(event) => setFilter(event.target.value)} /></label>}>
      {!canRead ? <p role="alert">권한 관리 조회 권한이 없습니다.</p> : <>
        {error && <p role="alert" className="mb-4 text-destructive">{extractErrorMessage(error, '전체 부서 명부를 불러오지 못했습니다.')}</p>}
        <MasterDetailLayout>
          <section aria-label="부서 목록"><h2 className="mb-3 font-semibold">부서</h2>{departments.isPending && <p role="status">부서를 불러오는 중입니다…</p>}
            <ul className="space-y-2">{(departments.data ?? []).filter((department) => `${department.name} ${department.id}`.includes(filter)).map((department) => <li key={department.id}><Button type="button" variant={selectedDepartment === department.id ? 'secondary' : 'outline'} className="w-full justify-start" data-a2-master-item aria-current={selectedDepartment === department.id ? 'true' : undefined} aria-pressed={selectedDepartment === department.id} onClick={() => setSelectedDepartment(department.id)}>{department.name}</Button></li>)}</ul>
          </section>
          <div data-a2-detail tabIndex={-1}>{selectedDepartment && roster.data && groups.data && !roster.isError && !groups.isError ? <DepartmentMembershipEditor key={`${user?.id}:${user?.authorizationVersion}:${selectedDepartment}`} snapshot={roster.data} groups={groups.data} refreshing={roster.isFetching || groups.isFetching} onRefresh={refresh} />
            : <p role="status">{selectedDepartment && roster.isFetching ? '부서 전체 구성원과 그룹을 불러오는 중입니다…' : '부서를 선택하세요.'}</p>}</div>
        </MasterDetailLayout>
      </>}
    </WorkListPage>
  );
}

export function DepartmentMembershipEditor({ snapshot, groups, refreshing, onRefresh }: {
  snapshot: AuthorizationDepartmentSnapshot; groups: AuthorizationGroupSummary[]; refreshing: boolean; onRefresh: () => Promise<unknown>;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [baseline, setBaseline] = useState(snapshot);
  const labels = { groupCode: '권한 그룹', action: '변경 방식', userIds: '대상 사용자' };
  const validation = useManualFormValidation(authorizationDepartmentChangeSchema, { labels });
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [groupCode, setGroupCode] = useState('');
  const [action, setAction] = useState<'ADD' | 'REMOVE'>('ADD');
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const currentBaseline = baseline.version === snapshot.version;
  const complete = baseline.complete === true && baseline.version.length > 0 && baseline.users.every((member) => member.complete === true && member.version.length > 0);
  const writable = canPermission(user, 'AUTHRT_ASSIGN') && currentBaseline && complete && !refreshing && !pending;
  const validSelection = selectedUsers.size > 0 && [...selectedUsers].every((id) => baseline.users.some((member) => member.userId === id)) && groups.some((group) => group.code === groupCode) && !(action === 'ADD' && groupCode === 'ROLE_ANONYMOUS');
  const save = async () => {
    if (!writable || !validSelection || pendingRef.current) return;
    const validated = validation.validate({ userIds: [...selectedUsers].sort(), groupCode, action, version: baseline.version, complete: true });
    if (!validated) return;
    pendingRef.current = true;
    setPending(true);
    try {
      const approved = await confirm({ title: '부서 사용자 그룹 변경', message: `선택한 ${selectedUsers.size}명에게 ${groupCode} 그룹을 ${action === 'ADD' ? '추가' : '회수'}합니다. 다른 그룹은 유지됩니다.`, variant: action === 'REMOVE' ? 'destructive' : 'default' });
      if (!approved) return;
      const updated = await authorizationAdminService.updateDepartmentMemberships(baseline.departmentId, validated);
      setBaseline(updated); setSelectedUsers(new Set());
      toast('선택한 사용자의 권한 그룹을 변경했습니다.', 'success');
      notifyAuthorizationChanged();
      await onRefresh();
    } catch (error) {
      const fieldErrors = extractFieldErrors(error);
      if (fieldErrors) validation.setFormErrors(fieldErrors);
      toast(extractErrorMessage(error, '부서 그룹 배정을 변경하지 못했습니다. 최신 명부를 확인해 주세요.'), 'error');
    }
    finally { pendingRef.current = false; setPending(false); }
  };
  return (
    <section aria-label="부서 구성원 그룹 배정" className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">전체 구성원 {baseline.users.length}명</h2><Button type="button" variant="outline" disabled={pending || refreshing} onClick={() => { setBaseline(snapshot); setSelectedUsers(new Set()); }}>선택 취소 · 최신 명부 적용</Button></div>
      {!currentBaseline && <p role="status">구성원이나 배정 정보가 변경되었습니다. 최신 명부를 적용한 뒤 다시 선택하세요.</p>}
      {!complete && <p role="alert">전체 명부를 확인하지 못해 변경할 수 없습니다.</p>}
      <FormErrorSummary errors={validation.errors} labels={labels} onNavigate={validation.focusError} />
      <div className="flex flex-wrap gap-4">
        <label className="space-y-1 text-sm">권한 그룹<select className="block h-10 rounded-md border border-input bg-background px-3" aria-label="권한 그룹" {...validation.fieldProps('groupCode')} value={groupCode} disabled={!writable} onChange={(event) => { setGroupCode(event.target.value); validation.clearError('groupCode'); }}><option value="">그룹 선택</option>{groups.filter((group) => action === 'REMOVE' || group.code !== 'ROLE_ANONYMOUS').map((group) => <option key={group.code} value={group.code}>{group.name}</option>)}</select><span className="block text-destructive" {...validation.messageProps('groupCode')} /></label>
        <label className="space-y-1 text-sm">변경 방식<select className="block h-10 rounded-md border border-input bg-background px-3" aria-label="변경 방식" {...validation.fieldProps('action')} value={action} disabled={!writable} onChange={(event) => { setAction(event.target.value as 'ADD' | 'REMOVE'); if (groupCode === 'ROLE_ANONYMOUS') setGroupCode(''); }}><option value="ADD">그룹 추가</option><option value="REMOVE">그룹 회수</option></select><span className="block text-destructive" {...validation.messageProps('action')} /></label>
      </div>
      <p className="text-sm text-muted-foreground">선택한 사용자에게 지정한 그룹만 추가·회수합니다. 다른 그룹 배정은 유지됩니다.</p>
      <Button type="button" variant="outline" {...validation.fieldProps('userIds')} disabled={!writable} onClick={() => setSelectedUsers(new Set(baseline.users.map((member) => member.userId)))}>전체 구성원 선택</Button>
      <p className="text-sm text-destructive" {...validation.messageProps('userIds')} />
      <ul aria-label="부서 전체 구성원" className="max-h-96 space-y-3 overflow-auto">{baseline.users.map((member) => <li key={member.userId}><label className="flex items-center gap-3"><Checkbox checked={selectedUsers.has(member.userId)} disabled={!writable} onCheckedChange={() => { if (!writable) return; setSelectedUsers((previous) => { const next = new Set(previous); if (next.has(member.userId)) next.delete(member.userId); else next.add(member.userId); return next; }); }} /><span>{member.userName || member.loginId || member.userId}{member.userName && member.loginId ? ` · ${member.loginId}` : ''}<span className="block text-xs text-muted-foreground">현재 그룹: {member.groups.map((code) => groups.find((group) => group.code === code)?.name ?? code).join(', ') || '없음'}</span></span></label></li>)}</ul>
      {baseline.users.length === 0 && <p role="status">부서 구성원이 없습니다.</p>}
      {canPermission(user, 'AUTHRT_ASSIGN') && <Button type="button" disabled={!writable || !validSelection} aria-busy={pending} onClick={() => void save()}>{pending ? '적용 중…' : `선택한 ${selectedUsers.size}명에게 적용`}</Button>}
    </section>
  );
}
