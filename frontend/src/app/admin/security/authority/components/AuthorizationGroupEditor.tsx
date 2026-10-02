'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { canPermission } from '@/lib/auth/permissions';
import { notifyAuthorizationChanged } from '@/lib/auth/authorization-state';
import {
  grantKey, hasCompleteCatalog, sameGrantSet, selectedGrants,
  type AuthorizationCatalog, type AuthorizationGroupSnapshot,
} from '@/lib/auth/authorization-management-contract';
import { grantSets, menuPreviewMenusFromCatalog, previewMenuVisibility } from '@/lib/navigation/menu-visibility-preview';
import { failureMessage } from '@/lib/safe-error-log';
import { authorizationAdminService } from '@/services/foundation/system/AuthorizationAdminService';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERMISSION_BUNDLES, PROTECTED_PERMISSIONS, type PermissionBundle } from '@/types/generated-screen-registry';
import { AuthorizationGroupForm } from './AuthorizationGroupForm';
import { AuthorizationGroupMembers } from './AuthorizationGroupMembers';
import { buildNavigationPermissionTree, menusMissingEntryPermission, navigationSelectionGaps, toggleNavigationPermission } from '@/lib/auth/navigation-permission-tree';
import { OperationPermissionMatrix } from './OperationPermissionMatrix';
import { ScreenPermissionTable } from './ScreenPermissionTable';
import { buildScreenPermissionModel } from './screen-permission-model';
import { EntryPermissionSummary, useEntryPermissionFixes } from './EntryPermissionFixes';
import { GroupChangeHistory } from './GroupChangeHistory';
import { MenuPreviewDialog } from './MenuPreviewDialog';
import { PermissionBundleDialog } from './PermissionBundleDialog';
import { withBundle } from './permission-bundle-model';

const RESERVED = new Set(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER', 'ROLE_ANONYMOUS']);

/** 편집기 탭. 화면 안 상태라 URL·브라우저 저장소에 두지 않는다. */
type EditorTab = 'screens' | 'operations' | 'members' | 'metadata' | 'history';

/**
 * 탭 이름 옆 변경 표시. 보이는 글자를 그대로 접근 이름에 싣고(WCAG 2.5.3 — 음성 조작 사용자가 보이는 대로 부를 수 있게)
 * 뜻을 보충하는 말만 뒤에 덧붙인다: '기능별 권한 3' → '기능별 권한 3건 변경', '기본 정보 수정 중'.
 */
function ChangeBadge({ visible, suffix, hidden }: { visible: string; suffix?: string; hidden?: boolean }) {
  if (hidden) return null;
  // 앞의 공백 글자 노드가 탭 이름과 표시를 띄운다(요소 안 앞 공백은 이름 계산에서 잘린다).
  return <>{' '}<span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{visible}</span>{suffix && <span className="sr-only">{suffix}</span>}</>;
}

/** 초안 키(`OPERATION:CODE`·`NAVIGATION:123`)를 권한 목록 모양으로 되돌린다. */
function grantsOfKeys(keys: Iterable<string>): Array<{ type: string; code: string }> {
  return [...keys].map((key) => {
    const separator = key.indexOf(':');
    return { type: key.slice(0, separator), code: key.slice(separator + 1) };
  });
}

/**
 * 편집기의 탭(과 줄)로 옮겨 포커스하라는 요청 — 허브의 사용자 메뉴 미리보기·그룹 비교에서 온다. nonce 가 바뀔 때마다 한 번.
 * tab 이 없으면 화면별 권한 탭이다. 화면별 권한 탭이고 menuCode 가 있으면 그 메뉴 줄로, 아니면 그 탭으로 포커스한다.
 * 처리하면 onFocusHandled 로 알린다 — 허브가 요청을 지워, 편집기가 다시 만들어질 때(다른 영역에 갔다 돌아올 때) 다시 실행되지 않게 한다.
 */
export interface MenuFocusRequest { menuCode: string | null; nonce: number; tab?: 'screens' | 'operations' }

/**
 * 권한 그룹 하나의 작업대(2026-10-02, 관리 콘솔 UX 2단계 D4·D6). 탭은 '화면별 권한'(기본)·'기능별 권한'·'구성원'·
 * '기본 정보'·'변경 이력'이다. 화면별 권한과 기능별 권한은 같은 초안을 나눠 쓰고 '권한 변경 저장' 하나로 저장한다.
 *
 * 버전·잠금(2단계 S1·S2): 그룹 버전은 구성원 변경으로 바뀌지 않고, 쓰기 응답이 저장 뒤 스냅샷을 준다. 그래서 기본 정보와
 * 권한 편집은 서로를 잠그지 않는다 — 기본 정보 저장 응답의 권한이 권한 초안 기준선과 같으면 그 version 을 권한 초안이
 * 이어받고(초안 유지), 권한 저장 응답의 이름·설명이 기본 정보 폼 기준선과 같으면 폼이 version 을 이어받는다. 다르면 다른
 * 곳에서 바뀐 것이므로 '최신 정보 적용'을 요구한다. 저장 뒤에는 응답 스냅샷이 새 기준선이 되어 이어서 편집할 수 있다.
 * 쓰기는 한 번에 하나다(pendingRef).
 *
 * 비활성 탭은 마운트를 유지한다(변경 이력은 열 때만 읽는다) — 미저장 가드 등록, 표 펼침, 거르기 조건을 탭 전환으로
 * 잃지 않게 한다. 탭 전환은 화면 안 상태라 이탈 확인을 띄우지 않는다.
 */
export function AuthorizationGroupEditor({ snapshot, catalog, refreshing, onRefresh, onDeleted, onSaved, onCopy, onEditMember, focusRequest, onFocusHandled }: {
  snapshot: AuthorizationGroupSnapshot; catalog: AuthorizationCatalog; refreshing: boolean;
  onRefresh: () => Promise<unknown>; onDeleted: () => void;
  /** 저장 응답 스냅샷 — 허브가 조회 캐시에 바로 써서 다시 읽기 전에도 최신 상태로 본다. */
  onSaved?: (saved: AuthorizationGroupSnapshot) => void;
  /** '이 그룹으로 새 그룹 만들기' — 허브가 복제 대화상자를 연다. 없으면 버튼을 두지 않는다. */
  onCopy?: () => void;
  onEditMember: (member: { id: string; name: string }) => void;
  focusRequest?: MenuFocusRequest | null;
  /** 포커스 요청을 처리했다 — 허브가 그 요청을 지운다(한 번만 쓰는 요청). */
  onFocusHandled?: (nonce: number) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  // 권한 초안의 기준선과 기본 정보 폼의 기준선을 따로 둔다 — 한쪽 저장이 다른 쪽 초안을 버리지 않게 한다(A2).
  const [baseline, setBaseline] = useState(snapshot);
  const [metadataBaseline, setMetadataBaseline] = useState(snapshot);
  const [catalogVersion, setCatalogVersion] = useState(catalog.catalogVersion);
  const [selection, setSelection] = useState(() => new Set(snapshot.grants.map(grantKey)));
  const [activeTab, setActiveTab] = useState<EditorTab>('screens');
  const [pendingAction, setPendingAction] = useState<'metadata' | 'grants' | 'delete' | null>(null);
  const pending = pendingAction !== null;
  const [formRevision, setFormRevision] = useState(0);
  const [metadataDirty, setMetadataDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rowFocus, setRowFocus] = useState<{ menuCode: string; nonce: number } | null>(null);
  const [handledFocus, setHandledFocus] = useState<number | null>(null);
  // 줄 없이 탭으로만 옮긴 요청 — 그 탭 이름으로 포커스한다(옮기기 전 버튼이 사라져 포커스를 잃지 않게).
  const [tabFocus, setTabFocus] = useState(0);
  const [bundleOpen, setBundleOpen] = useState(false);
  const bundleReasonId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const pendingRef = useRef(false);
  const catalogCurrent = catalogVersion === catalog.catalogVersion;
  const currentBaseline = baseline.version === snapshot.version && catalogCurrent;
  const metadataCurrent = metadataBaseline.version === snapshot.version && catalogCurrent;
  const complete = hasCompleteCatalog(baseline, catalog);
  const navigationTree = useMemo(() => buildNavigationPermissionTree(catalog.navigation), [catalog.navigation]);
  const navigationGaps = navigationSelectionGaps(navigationTree, selection);
  const anonymous = baseline.code === 'ROLE_ANONYMOUS';
  // 메뉴는 배정했지만 그 화면에 들어갈 기능권한이 이 그룹에 없는 메뉴 — 저장을 막지 않는 안내다(다른 그룹이 줄 수 있다).
  const menusWithoutEntry = useMemo(() => (anonymous ? [] : menusMissingEntryPermission(catalog.navigation, selection)), [anonymous, catalog.navigation, selection]);
  const selectedOperationCodes = useMemo(() => new Set([...selection].filter((key) => key.startsWith('OPERATION:')).map((key) => key.slice('OPERATION:'.length))), [selection]);
  const writable = currentBaseline && complete && !navigationTree.error && !refreshing && !pending;
  const metadataWritable = metadataCurrent && !refreshing && !pending;
  const canGrant = canPermission(user, 'AUTHRT_GRANT');
  const canUpdate = canPermission(user, 'AUTHRT_UPDATE');
  const canDelete = canPermission(user, 'AUTHRT_DELETE');
  const canAudit = canPermission(user, 'AUTHRT_AUDIT');
  const canAssign = canPermission(user, 'AUTHRT_ASSIGN');
  const navigationOnly = [...selection].some((key) => key.startsWith('NAVIGATION:')) && ![...selection].some((key) => key.startsWith('OPERATION:'));
  const dirty = selection.size !== baseline.grants.length || baseline.grants.some((grant) => !selection.has(grantKey(grant)));
  const baselineKeys = useMemo(() => new Set(baseline.grants.map(grantKey)), [baseline.grants]);
  const baselineOperationCodes = useMemo(() => new Set(baseline.grants.filter((grant) => grant.type === 'OPERATION').map((grant) => grant.code)), [baseline.grants]);
  const addedKeys = [...selection].filter((key) => !baselineKeys.has(key));
  const removedKeys = [...baselineKeys].filter((key) => !selection.has(key));
  const changesOf = (prefix: string) => [...addedKeys, ...removedKeys].filter((key) => key.startsWith(prefix)).length;
  const operationChanges = changesOf('OPERATION:');
  const totalChanges = addedKeys.length + removedKeys.length;
  const grantsLocked = !writable || !canGrant;
  const saveDisabled = pending || !writable || !dirty || navigationGaps.length > 0;
  const navigate = useUnsavedChanges(() => ({ dirty, pending: pendingRef.current }));
  const screenModel = useMemo(() => buildScreenPermissionModel(navigationTree, catalog.operations.map((operation) => operation.code)), [navigationTree, catalog.operations]);
  const previewMenus = useMemo(() => menuPreviewMenusFromCatalog(catalog.navigation), [catalog.navigation]);
  const preview = useMemo(() => previewMenuVisibility({ menus: previewMenus, ...grantSets(grantsOfKeys(selection)) }), [previewMenus, selection]);
  const [problemMenuCodes] = useState(() => menusWithoutEntry.map((menu) => menu.code));
  const operationCodes = useMemo(() => catalog.operations.map((operation) => operation.code), [catalog.operations]);
  // '권한 묶음 적용'은 편집할 수 있는 기준선(최신·완결·메뉴 계층 정상)에서 권한 설정 권한이 있을 때 둔다. 저장 중·다시 읽는 중에는 잠근다.
  const bundleEditable = canGrant && currentBaseline && complete && !navigationTree.error && PERMISSION_BUNDLES.length > 0;
  const savedProtected = snapshot.grants.some((grant) => grant.type === 'OPERATION' && (PROTECTED_PERMISSIONS as readonly string[]).includes(grant.code));

  // 허브가 보낸 '줄로 가기' — 화면별 권한 탭을 열고 그 줄을 표가 찾게 한다. 렌더 중 조정이다(effect 안 setState 금지).
  if (focusRequest && focusRequest.nonce !== handledFocus) {
    setHandledFocus(focusRequest.nonce);
    const tab = focusRequest.tab ?? 'screens';
    const menuCode = focusRequest.menuCode;
    setActiveTab(tab);
    if (tab === 'screens' && menuCode !== null) setRowFocus((previous) => ({ menuCode, nonce: (previous?.nonce ?? 0) + 1 }));
    else setTabFocus((previous) => previous + 1);
  }
  // 편집할 수 없게 되면(다른 곳에서 바뀜·카탈로그 손상) 열린 묶음 대화상자를 닫는다 — 다시 편집할 수 있게 됐을 때 저절로 열리지 않게.
  if (bundleOpen && (!bundleEditable || anonymous)) setBundleOpen(false);
  // 처리한 요청을 허브에 알린다 — 허브가 지우므로 이 편집기가 다시 만들어져도 같은 요청을 다시 실행하지 않는다.
  useEffect(() => {
    if (handledFocus !== null) onFocusHandled?.(handledFocus);
  }, [handledFocus, onFocusHandled]);
  // 탭으로만 옮긴 요청 — 그려진 뒤 선택된 탭 이름으로 포커스한다(상태를 바꾸지 않는 DOM 작업).
  useEffect(() => {
    if (tabFocus === 0) return;
    sectionRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }, [tabFocus]);
  const focusRow = (menuCode: string) => {
    setPreviewOpen(false);
    setActiveTab('screens');
    setRowFocus((previous) => ({ menuCode, nonce: (previous?.nonce ?? 0) + 1 }));
  };

  /** 기능권한 칸을 켜거나 끈다. 공개 메뉴 그룹은 기능권한을 더할 수 없다(뺄 수만 있다). */
  const changeOperations = (keys: readonly string[], checked: boolean) => {
    if (grantsLocked) return;
    setSelection((previous) => {
      const next = new Set(previous);
      for (const key of keys) {
        if (!key.startsWith('OPERATION:')) continue;
        if (!checked) next.delete(key);
        else if (!anonymous) next.add(key);
      }
      return next;
    });
  };
  /**
   * 권한 묶음을 초안에 더한다(쓰기 아님 — 저장은 '권한 변경 저장'). 지금 초안에서 다시 계산하므로 같은 묶음을 두 번 더해도
   * 초안이 변하지 않는다. 빼는 키는 없다. 공개 메뉴 그룹에는 더하지 않는다(기능권한을 더할 수 없는 그룹이다).
   */
  const addBundleToDraft = (bundle: PermissionBundle) => {
    if (grantsLocked || anonymous || !bundleEditable) return;
    setSelection((previous) => withBundle(previous, bundle, catalog.navigation, operationCodes));
    setBundleOpen(false);
    toast(`'${bundle.name}' 묶음을 저장하지 않은 변경에 더했습니다. '권한 변경 저장'을 눌러야 반영됩니다.`, 'info');
  };
  const toggleNavigation = (code: string, checked: boolean) => {
    if (grantsLocked) return;
    setSelection((previous) => toggleNavigationPermission(navigationTree, previous, code, checked));
  };
  const entryFixes = useEntryPermissionFixes({
    missing: menusWithoutEntry, operations: catalog.operations, selectedCodes: selectedOperationCodes, savedCodes: baselineOperationCodes,
    // 저장 중·다시 읽는 중에는 버튼을 숨기지 않고 잠근다(disabled) — 편집할 수 없는 기준선일 때만 안내만 보인다.
    editable: canGrant && currentBaseline && complete && !navigationTree.error, disabled: grantsLocked,
    onAdd: (codes) => changeOperations(codes.map((code) => `OPERATION:${code}`), true),
  });

  /** 권한 저장 응답 — 새 기준선이 된다. 이름·설명이 폼 기준선과 같으면 폼도 그 version 을 이어받는다. */
  const adoptGrantSave = (saved: AuthorizationGroupSnapshot) => {
    setBaseline(saved);
    setSelection(new Set(saved.grants.map(grantKey)));
    if (saved.name === metadataBaseline.name && (saved.description ?? '') === (metadataBaseline.description ?? '')) setMetadataBaseline(saved);
    onSaved?.(saved);
  };
  /** 기본 정보 저장 응답 — 폼의 새 기준선이 된다. 권한이 권한 초안 기준선과 같으면 권한 초안도 그 version 을 이어받는다. */
  const adoptMetadataSave = (saved: AuthorizationGroupSnapshot) => {
    setMetadataBaseline(saved);
    if (catalogCurrent && sameGrantSet(saved.grants, baseline.grants)) setBaseline(saved);
    onSaved?.(saved);
  };
  const write = async (action: () => Promise<unknown>, message: string) => {
    if (!metadataWritable || pendingRef.current) return;
    pendingRef.current = true;
    setPendingAction('metadata');
    try {
      await action();
      toast(message, 'success');
      notifyAuthorizationChanged();
      await onRefresh();
    } catch (error) {
      toast(failureMessage(error, '그룹 정보를 저장하지 못했습니다. 최신 정보를 확인해 주세요.'), 'error');
      throw error;
    } finally { pendingRef.current = false; setPendingAction(null); }
  };
  const reload = () => {
    if (pending || refreshing) return;
    setBaseline(snapshot);
    setMetadataBaseline(snapshot);
    setCatalogVersion(catalog.catalogVersion);
    setSelection(new Set(snapshot.grants.map(grantKey)));
    setFormRevision((revision) => revision + 1);
  };
  const saveGrants = async () => {
    if (!writable || !canGrant || !dirty || navigationGaps.length > 0 || pendingRef.current) return;
    pendingRef.current = true; setPendingAction('grants');
    try {
      const saved = await authorizationAdminService.saveGroupGrants(baseline.code, { grants: selectedGrants(selection, catalog), version: baseline.version, complete: true });
      adoptGrantSave(saved);
      toast('기능권한과 메뉴 표시를 저장했습니다.', 'success');
      notifyAuthorizationChanged(); await onRefresh();
    } catch (error) { toast(failureMessage(error, '변경을 저장하지 못했습니다. 최신 정보를 확인해 주세요.'), 'error'); }
    finally { pendingRef.current = false; setPendingAction(null); }
  };
  const deleteGroup = async () => {
    if (!writable || !canDelete || RESERVED.has(baseline.code) || pendingRef.current) return;
    pendingRef.current = true; setPendingAction('delete');
    try {
      const approved = await confirm({ title: '권한 그룹 삭제', message: `${baseline.name} 권한을 삭제하시겠습니까? 먼저 사용자 할당을 해제해야 하며, 예약된 그룹은 삭제할 수 없습니다.`, confirmText: '그룹 삭제', variant: 'destructive' });
      if (!approved) return;
      await authorizationAdminService.deleteGroup(baseline.code, baseline.version);
      toast('그룹을 삭제했습니다.', 'success');
      notifyAuthorizationChanged(); onDeleted(); await onRefresh();
    } catch (error) { toast(failureMessage(error, '그룹을 삭제하지 못했습니다.'), 'error'); }
    finally { pendingRef.current = false; setPendingAction(null); }
  };
  return (
    <section ref={sectionRef} aria-label={`${snapshot.name} 권한 설정`} className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{snapshot.name}</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>메뉴 미리보기</Button>
          {bundleEditable && <Button type="button" variant="outline" disabled={grantsLocked || anonymous} aria-describedby={anonymous ? bundleReasonId : undefined}
            onClick={() => setBundleOpen(true)}>권한 묶음 적용</Button>}
          {onCopy && !anonymous && <Button type="button" variant="outline" disabled={pending} onClick={onCopy}>이 그룹으로 새 그룹 만들기</Button>}
          <Button type="button" variant="outline" disabled={pending || refreshing} onClick={() => void navigate(reload)}>입력 취소 · 최신 정보 적용</Button>
        </div>
      </div>
      {bundleEditable && anonymous && <p id={bundleReasonId} className="text-sm text-muted-foreground">비로그인 사용자 그룹에는 묶음을 적용할 수 없습니다.</p>}
      {!currentBaseline && <p role="status" className="text-sm text-muted-foreground">그룹 정보가 다른 곳에서 변경되어 화면별 권한·기능별 권한을 저장할 수 없습니다. &apos;입력 취소 · 최신 정보 적용&apos;으로 최신 정보를 적용한 뒤 다시 편집하세요.</p>}
      {currentBaseline && !metadataCurrent && <p role="status" className="text-sm text-muted-foreground">그룹명·설명이 다른 곳에서 변경되었습니다. &apos;입력 취소 · 최신 정보 적용&apos;으로 최신 정보를 적용한 뒤 기본 정보를 편집하세요.</p>}
      {!complete && <p role="alert" className="text-sm text-destructive">전체 권한 또는 현재 기능 목록과의 일치를 확인하지 못해 저장할 수 없습니다. 다시 조회해 주세요.</p>}
      {navigationOnly && !anonymous && <p role="alert" className="text-sm text-destructive">메뉴만 선택되어 있고 기능권한이 없습니다. 필요한 업무 영역의 조회 기능을 확인하세요. 권한은 자동으로 추가되지 않습니다.</p>}
      {/* 메뉴 계층 손상과 상위 누락은 어느 탭에 있든 저장(또는 편집 전체)을 막으므로 탭 밖에 둔다 — 이유 없이 죽은 버튼을 남기지 않는다(G10). */}
      {navigationTree.error && <p role="alert" className="text-sm text-destructive">{navigationTree.error} 저장할 수 없습니다. 메뉴 설정을 확인한 뒤 다시 조회해 주세요.</p>}
      {navigationGaps.length > 0 && <p role="alert" className="text-sm text-destructive">상위 메뉴가 선택되지 않은 메뉴가 있습니다: {navigationGaps.join(', ')}. &apos;화면별 권한&apos; 탭의 &apos;메뉴 표시&apos; 칸에서 상위 메뉴를 선택하거나 해당 하위 메뉴를 해제한 뒤 저장하세요.</p>}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EditorTab)} className="gap-4">
        <TabsList aria-label="그룹 설정 영역" className="flex-wrap group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsTrigger value="screens" className="flex-none px-3">화면별 권한<ChangeBadge visible={String(totalChanges)} suffix="건 변경" hidden={totalChanges === 0} /></TabsTrigger>
          <TabsTrigger value="operations" className="flex-none px-3">기능별 권한<ChangeBadge visible={String(operationChanges)} suffix="건 변경" hidden={operationChanges === 0} /></TabsTrigger>
          <TabsTrigger value="members" className="flex-none px-3">구성원</TabsTrigger>
          <TabsTrigger value="metadata" className="flex-none px-3">기본 정보<ChangeBadge visible="수정 중" hidden={!metadataDirty} /></TabsTrigger>
          {canAudit && <TabsTrigger value="history" className="flex-none px-3">변경 이력</TabsTrigger>}
        </TabsList>
        <TabsContent value="screens" forceMount hidden={activeTab !== 'screens'} className="space-y-3">
          <p className="text-sm text-muted-foreground">메뉴 표시는 사이드바에 메뉴를 보이게 하고, 화면 진입·등록·수정·삭제·그 밖의 기능은 기능권한입니다. 둘은 서로 다른 권한이며 &apos;권한 변경 저장&apos;으로 함께 저장됩니다.</p>
          <p className="text-sm text-muted-foreground">메뉴가 표시되려면 해당 메뉴와 모든 상위 메뉴가 선택되어 있고 사용 중이어야 합니다. 하위 메뉴를 선택하면 상위 메뉴도 함께 선택되고, 상위 메뉴를 해제하면 하위 메뉴도 함께 해제됩니다. 상위 메뉴만 선택하면 하위 메뉴는 자동으로 선택되지 않습니다.</p>
          <p className="text-sm text-muted-foreground">메뉴 숨김은 기능권한을 회수하지 않습니다. 기능권한이 있으면 직접 URL로 화면을 열 수 있으며, 실제 조회·변경에는 기능권한과 자료별 접근 조건이 적용됩니다. 상태 칸은 이 그룹의 권한만으로 본 결과입니다 — 사용자에게는 배정된 모든 그룹의 권한이 합쳐집니다.</p>
          {anonymous && <p role="status" className="text-sm text-muted-foreground">공개 메뉴 그룹은 메뉴 표시만 설정하며 로그인 사용자에게 배정하지 않습니다.</p>}
          <EntryPermissionSummary state={entryFixes} />
          {/* 메뉴 계층이 손상돼 있으면 표를 그리지 않는다 — 이유는 탭 밖 경고가 말한다. */}
          {!navigationTree.error && <ScreenPermissionTable model={screenModel} operations={catalog.operations} selection={selection} baseline={baselineKeys} preview={preview}
            editable={canGrant} disabled={grantsLocked} allowAdd={!anonymous} onChangeOperations={changeOperations} onToggleNavigation={toggleNavigation}
            entryFixes={entryFixes} problemMenuCodes={problemMenuCodes} focusRequest={rowFocus}
            onSaveShortcut={canGrant ? () => void saveGrants() : undefined} saveShortcutDisabled={saveDisabled} unsavedChangeCount={totalChanges} />}
        </TabsContent>
        <TabsContent value="operations" forceMount hidden={activeTab !== 'operations'} className="space-y-3">
          <p className="text-sm text-muted-foreground">API와 화면 동작에 적용됩니다. 본인 자료·공개 범위 등 자료별 조건은 함께 적용됩니다.</p>
          {anonymous && <p role="status" className="text-sm text-muted-foreground">공개 메뉴 그룹은 메뉴 표시만 설정하며 로그인 사용자에게 배정하지 않습니다.</p>}
          <OperationPermissionMatrix operations={catalog.operations} selection={selection} baseline={baselineKeys}
            editable={canGrant} disabled={grantsLocked} allowAdd={!anonymous} onChange={changeOperations}
            onSaveShortcut={canGrant ? () => void saveGrants() : undefined} saveShortcutDisabled={saveDisabled}
            unsavedChangeCount={totalChanges} />
        </TabsContent>
        <TabsContent value="members" forceMount hidden={activeTab !== 'members'} className="space-y-3">
          <AuthorizationGroupMembers code={snapshot.code} name={snapshot.name} anonymous={anonymous} protectedGrants={savedProtected} onEditMember={onEditMember} />
        </TabsContent>
        <TabsContent value="metadata" forceMount hidden={activeTab !== 'metadata'} className="space-y-3">
          <p className="text-sm text-muted-foreground">그룹명·설명은 화면별 권한·기능별 권한과 따로 저장합니다. 한쪽을 저장해도 다른 쪽의 저장하지 않은 변경은 남습니다.</p>
          {canUpdate ? <AuthorizationGroupForm key={formRevision} initial={{ code: metadataBaseline.code, name: metadataBaseline.name, description: metadataBaseline.description ?? '' }} creating={false} externalBusy={!metadataWritable} onDirtyChange={setMetadataDirty}
            onSubmit={async (values) => { if (!canUpdate) return; await write(async () => adoptMetadataSave(await authorizationAdminService.updateGroup(baseline.code, { name: values.name, description: values.description, version: metadataBaseline.version })), '그룹 정보를 저장했습니다.'); }} />
            : <p className="text-sm text-muted-foreground">{snapshot.description || '등록된 설명이 없습니다.'}</p>}
        </TabsContent>
        {canAudit && <TabsContent value="history" className="space-y-3">
          {activeTab === 'history' && <GroupChangeHistory code={snapshot.code} />}
        </TabsContent>}
      </Tabs>
      <div className={`space-y-3 border-t border-border bg-card py-4${dirty ? ' sticky bottom-0 z-10' : ''}`}>
      {dirty && <p role="status" className="text-sm text-muted-foreground">저장 시 권한·메뉴 추가 {addedKeys.length}개 · 회수 {removedKeys.length}개. 이 그룹을 배정받은 사용자에게 적용되며 다른 그룹이 제공하는 같은 권한은 유지됩니다.</p>}
      <div className="flex flex-wrap justify-between gap-3">
        {canGrant && <Button type="button" disabled={pending || !writable || !dirty || navigationGaps.length > 0} aria-busy={pendingAction === 'grants'} onClick={() => void saveGrants()}>권한 변경 저장</Button>}
        {canDelete && !RESERVED.has(baseline.code) && <Button type="button" variant="destructive" disabled={pending || !writable} aria-busy={pendingAction === 'delete'} onClick={() => void deleteGroup()}>그룹 삭제</Button>}
      </div>
      </div>
      {bundleOpen && <PermissionBundleDialog groupName={snapshot.name} bundles={PERMISSION_BUNDLES} selection={selection} saved={baselineKeys} locked={grantsLocked}
        navigation={catalog.navigation} operationCodes={operationCodes} canAssign={canAssign} onAddToDraft={addBundleToDraft} onClose={() => setBundleOpen(false)} />}
      {previewOpen && <MenuPreviewDialog title={`${snapshot.name} 메뉴 미리보기`} isOpen onClose={() => setPreviewOpen(false)}
        basis={dirty ? '저장하지 않은 변경을 포함한 이 그룹의 초안 기준입니다.' : '이 그룹의 저장된 권한 기준입니다.'}
        menus={previewMenus} preview={preview} selectedNavigation={grantSets(grantsOfKeys(selection)).navigation}
        renderFix={(menu) => <Button type="button" variant="outline" size="sm" onClick={() => focusRow(String(menu.menuNo))}>{menu.menuNm} 줄로 가기</Button>} />}
    </section>
  );
}
