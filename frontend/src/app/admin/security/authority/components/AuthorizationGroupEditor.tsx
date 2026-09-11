'use client';

import { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { permissionDomainLabel, permissionActionLabel } from '@/lib/auth/permission-labels';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import { grantKey, hasCompleteCatalog, selectedGrants, type AuthorizationCatalog, type AuthorizationGroupSnapshot } from '@/lib/auth/authorization-management-contract';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { AuthorizationGroupForm } from './AuthorizationGroupForm';
import { buildNavigationPermissionTree, navigationSelectionGaps, toggleNavigationPermission } from '@/lib/auth/navigation-permission-tree';
import { NavigationPermissionTree } from './NavigationPermissionTree';

const RESERVED = new Set(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER', 'ROLE_ANONYMOUS']);

export function AuthorizationGroupEditor({ snapshot, catalog, refreshing, onRefresh, onDeleted }: {
  snapshot: AuthorizationGroupSnapshot; catalog: AuthorizationCatalog; refreshing: boolean;
  onRefresh: () => Promise<unknown>; onDeleted: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [baseline, setBaseline] = useState(snapshot);
  const [catalogVersion, setCatalogVersion] = useState(catalog.catalogVersion);
  const [selection, setSelection] = useState(() => new Set(snapshot.grants.map(grantKey)));
  const [filter, setFilter] = useState('');
  const [domain, setDomain] = useState('');
  const [pendingAction, setPendingAction] = useState<'metadata' | 'grants' | 'delete' | null>(null);
  const pending = pendingAction !== null;
  const [saved, setSaved] = useState(false);
  const [formRevision, setFormRevision] = useState(0);
  const pendingRef = useRef(false);
  const currentBaseline = baseline.version === snapshot.version && catalogVersion === catalog.catalogVersion;
  const complete = hasCompleteCatalog(baseline, catalog);
  const navigationTree = useMemo(() => buildNavigationPermissionTree(catalog.navigation), [catalog.navigation]);
  const navigationGaps = navigationSelectionGaps(navigationTree, selection);
  const writable = currentBaseline && complete && !navigationTree.error && !refreshing && !pending && !saved;
  const canGrant = canPermission(user, 'AUTHRT_GRANT');
  const canUpdate = canPermission(user, 'AUTHRT_UPDATE');
  const canDelete = canPermission(user, 'AUTHRT_DELETE');
  const visible = catalog.operations.filter((operation) => (!domain || operation.domain === domain) && `${operation.name} ${operation.code} ${operation.domain} ${operation.action}`.toLowerCase().includes(filter.toLowerCase()));
  const navigationOnly = [...selection].some((key) => key.startsWith('NAVIGATION:')) && ![...selection].some((key) => key.startsWith('OPERATION:'));
  const dirty = selection.size !== baseline.grants.length || baseline.grants.some((grant) => !selection.has(grantKey(grant)));
  const toggle = (key: string) => {
    if (!writable || !canGrant || (baseline.code === 'ROLE_ANONYMOUS' && key.startsWith('OPERATION:') && !selection.has(key))) return;
    setSelection((previous) => { const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  };
  const toggleNavigation = (code: string, checked: boolean) => {
    if (!writable || !canGrant) return;
    setSelection((previous) => toggleNavigationPermission(navigationTree, previous, code, checked));
  };
  const write = async (action: () => Promise<unknown>, message: string) => {
    if (!writable || pendingRef.current) return;
    pendingRef.current = true;
    setPendingAction('metadata');
    try {
      await action();
      setSaved(true);
      toast(message, 'success');
      notifyAuthorizationChanged();
      await onRefresh();
    } catch (error) {
      toast(extractErrorMessage(error, '변경을 저장하지 못했습니다. 최신 정보를 확인해 주세요.'), 'error');
      throw error;
    } finally { pendingRef.current = false; setPendingAction(null); }
  };
  const reload = () => {
    if (pending || refreshing) return;
    setBaseline(snapshot);
    setCatalogVersion(catalog.catalogVersion);
    setSelection(new Set(snapshot.grants.map(grantKey)));
    setSaved(false);
    setFormRevision((revision) => revision + 1);
  };
  const saveGrants = async () => {
    if (!writable || !canGrant || !dirty || navigationGaps.length > 0 || pendingRef.current) return;
    pendingRef.current = true; setPendingAction('grants');
    try {
      await authorizationAdminService.saveGroupGrants(baseline.code, { grants: selectedGrants(selection, catalog), version: baseline.version, complete: true });
      setSaved(true); toast('기능권한과 메뉴 표시를 저장했습니다.', 'success');
      notifyAuthorizationChanged(); await onRefresh();
    } catch (error) { toast(extractErrorMessage(error, '변경을 저장하지 못했습니다. 최신 정보를 확인해 주세요.'), 'error'); }
    finally { pendingRef.current = false; setPendingAction(null); }
  };
  const deleteGroup = async () => {
    if (!writable || !canDelete || RESERVED.has(baseline.code) || pendingRef.current) return;
    pendingRef.current = true; setPendingAction('delete');
    try {
      const approved = await confirm({ title: '권한 그룹 삭제', message: `${baseline.name} 권한을 삭제하시겠습니까? 먼저 사용자 할당을 해제해야 하며, 예약된 그룹은 삭제할 수 없습니다.`, variant: 'destructive' });
      if (!approved) return;
      await authorizationAdminService.deleteGroup(baseline.code, baseline.version);
      setSaved(true); toast('그룹을 삭제했습니다.', 'success');
      notifyAuthorizationChanged(); onDeleted(); await onRefresh();
    } catch (error) { toast(extractErrorMessage(error, '그룹을 삭제하지 못했습니다.'), 'error'); }
    finally { pendingRef.current = false; setPendingAction(null); }
  };
  return (
    <section aria-label={`${snapshot.name} 권한 설정`} className="space-y-6 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{snapshot.name}</h2>
        <Button type="button" variant="outline" disabled={pending || refreshing} onClick={reload}>입력 취소 · 최신 정보 적용</Button>
      </div>
      {(!currentBaseline || saved) && <p role="status" className="text-sm text-muted-foreground">그룹 정보가 변경되었습니다. 최신 정보를 적용한 뒤 다시 편집하세요.</p>}
      {!complete && <p role="alert" className="text-sm text-destructive">전체 권한 또는 현재 기능 목록과의 일치를 확인하지 못해 저장할 수 없습니다. 다시 조회해 주세요.</p>}
      {canUpdate ? <AuthorizationGroupForm key={`${baseline.version}:${formRevision}`} initial={{ code: baseline.code, name: baseline.name, description: baseline.description ?? '' }} creating={false} externalBusy={!writable}
        onSubmit={async (values) => { if (!canUpdate) return; await write(() => authorizationAdminService.updateGroup(baseline.code, { name: values.name, description: values.description, version: baseline.version }), '그룹 정보를 저장했습니다.'); }} />
        : <p className="text-sm text-muted-foreground">{snapshot.description || '등록된 설명이 없습니다.'}</p>}
      <div className="space-y-3">
        <h3 className="font-semibold">기능권한</h3>
        <p className="text-sm text-muted-foreground">API와 화면 동작에 적용됩니다. 본인 자료·공개 범위 등 자료별 조건은 함께 적용됩니다.</p>
        {baseline.code === 'ROLE_ANONYMOUS' && <p role="status" className="text-sm text-muted-foreground">공개 메뉴 그룹은 메뉴 표시만 설정하며 로그인 사용자에게 배정하지 않습니다.</p>}
        <label className="block space-y-1 text-sm">기능 영역<select aria-label="기능 영역" className="block h-10 rounded-md border border-input bg-background px-3" value={domain} onChange={(event) => setDomain(event.target.value)}><option value="">전체 영역</option>{[...new Set(catalog.operations.map((operation) => operation.domain))].sort().map((value) => <option key={value} value={value}>{permissionDomainLabel(value)}</option>)}</select></label>
        <label className="block space-y-1 text-sm">기능 검색<Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="기능명·도메인·코드 검색" /></label>
        <p className="text-sm text-muted-foreground">표시 {visible.length} / 전체 {catalog.operations.length}개 · 검색 결과 밖의 선택도 유지됩니다.</p>
        <div className="max-h-96 overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-sm"><caption className="sr-only">그룹별 기능권한 선택</caption><thead className="sticky top-0 bg-muted"><tr><th className="p-3">선택 · 기능</th><th className="p-3">도메인</th><th className="p-3">행위</th></tr></thead><tbody>
            {visible.map((operation) => <tr key={operation.code} className="border-t border-border"><td className="p-3"><label className="flex items-center gap-3"><Checkbox checked={selection.has(`OPERATION:${operation.code}`)} disabled={!writable || !canGrant || (baseline.code === 'ROLE_ANONYMOUS' && !selection.has(`OPERATION:${operation.code}`))} onCheckedChange={() => toggle(`OPERATION:${operation.code}`)} /><span>{operation.name}<span className="block text-xs text-muted-foreground">{operation.code}</span></span></label></td><td className="p-3">{permissionDomainLabel(operation.domain)}</td><td className="p-3">{permissionActionLabel(operation.action)}</td></tr>)}
          </tbody></table>
        </div>
        {visible.length === 0 && <p role="status">검색 결과가 없습니다.</p>}
      </div>
      <div className="space-y-3">
        <h3 className="font-semibold">메뉴 표시</h3>
        <p className="text-sm text-muted-foreground">메뉴가 표시되려면 해당 메뉴와 모든 상위 메뉴가 선택되어 있고 사용 중이어야 합니다.</p>
        <p className="text-sm text-muted-foreground">메뉴 숨김은 기능권한을 회수하지 않습니다. 기능권한이 있으면 직접 URL로 화면을 열 수 있으며, 실제 조회·변경에는 기능권한과 자료별 접근 조건이 적용됩니다.</p>
        <p className="text-sm text-muted-foreground">상위 메뉴를 해제하면 하위 메뉴도 함께 해제됩니다. 하위 메뉴를 선택하면 상위 메뉴도 함께 선택됩니다. 상위 메뉴만 선택하면 하위 메뉴는 자동으로 선택되지 않습니다.</p>
        {navigationOnly && baseline.code !== 'ROLE_ANONYMOUS' && <p role="alert" className="text-sm text-destructive">메뉴만 선택되어 있고 기능권한이 없습니다. 필요한 업무 영역의 조회 기능을 확인하세요. 권한은 자동으로 추가되지 않습니다.</p>}
        {navigationTree.error && <p role="alert" className="text-sm text-destructive">{navigationTree.error} 저장할 수 없습니다. 메뉴 설정을 확인한 뒤 다시 조회해 주세요.</p>}
        {navigationGaps.length > 0 && <p role="alert" className="text-sm text-destructive">상위 메뉴가 선택되지 않은 메뉴가 있습니다: {navigationGaps.join(', ')}. 상위 메뉴를 선택하거나 해당 하위 메뉴를 해제한 뒤 저장하세요.</p>}
        <NavigationPermissionTree tree={navigationTree} selection={selection} disabled={!writable || !canGrant} onToggle={toggleNavigation} />
      </div>
      {dirty && <p role="status" className="text-sm text-muted-foreground">저장 시 권한·메뉴 추가 {[...selection].filter((key) => !baseline.grants.some((grant) => grantKey(grant) === key)).length}개 · 회수 {baseline.grants.filter((grant) => !selection.has(grantKey(grant))).length}개. 이 그룹을 배정받은 사용자에게 적용되며 다른 그룹이 제공하는 같은 권한은 유지됩니다.</p>}
      <div className="flex flex-wrap justify-between gap-3">
        {canGrant && <Button type="button" disabled={pending || !writable || !dirty || navigationGaps.length > 0} aria-busy={pendingAction === 'grants'} onClick={() => void saveGrants()}>권한 변경 저장</Button>}
        {canDelete && !RESERVED.has(baseline.code) && <Button type="button" variant="destructive" disabled={pending || !writable} aria-busy={pendingAction === 'delete'} onClick={() => void deleteGroup()}>그룹 삭제</Button>}
      </div>
    </section>
  );
}
