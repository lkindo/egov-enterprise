'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PERMISSION_BUNDLES, PROTECTED_PERMISSIONS, type PermissionBundle } from '@/types/generated-screen-registry';
import { AuthorizationGroupForm } from './AuthorizationGroupForm';
import { AuthorizationGroupMembers } from './AuthorizationGroupMembers';
import { buildNavigationPermissionTree, menusMissingEntryPermission, navigationSelectionGaps, toggleNavigationPermission } from '@/lib/auth/navigation-permission-tree';
import { OperationPermissionMatrix } from './OperationPermissionMatrix';
import { ScreenPermissionTable } from './ScreenPermissionTable';
import { buildScreenPermissionModel, toggleNavigationSubtree } from './screen-permission-model';
import { EntryPermissionSummary, useEntryPermissionFixes } from './EntryPermissionFixes';
import { GroupChangeHistory } from './GroupChangeHistory';
import { MenuPreviewDialog } from './MenuPreviewDialog';
import { PermissionBundleDialog } from './PermissionBundleDialog';
import { withBundle } from './permission-bundle-model';

const RESERVED = new Set(['ROLE_ADMIN', 'ROLE_SYSTEM', 'ROLE_USER', 'ROLE_ANONYMOUS']);
/** aria-disabled 단추의 막힌 모양(disabled 와 같은 흐림 — 포커스는 받는다). */
const BLOCKED_BUTTON_CLASS = 'aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

/** 편집기 탭. 화면 안 상태라 URL·브라우저 저장소에 두지 않는다. */
type EditorTab = 'screens' | 'operations' | 'members' | 'metadata' | 'history';
/** 저장 막대를 두는 탭 — 같은 권한 초안을 나눠 쓰는 두 표다. 구성원(즉시 반영)·기본 정보(따로 저장)·변경 이력에는 두지 않는다. */
const GRANT_TABS: ReadonlySet<EditorTab> = new Set(['screens', 'operations']);
/**
 * 화면별·기능별 권한 탭 내용 — fill 셸 안에서 남은 높이를 받고, 넘치면 스스로 스크롤해 넘침을 가둔다(저장 막대를 덮지 않는다).
 * relative 는 안쪽 sr-only 의 기준 상자, `-m-1 p-1` 은 가장자리 컨트롤의 포커스 링이 스크롤 상자에 잘리지 않게 하는 여백이다(work-fill.ts 와
 * 같은 방식). 탭 패널은 포커스를 받을 수 있으므로 키보드 포커스 표시를 둔다(스크롤할 때 방향키로 움직일 수 있다).
 */
const GRANT_PANEL_CLASS = 'relative flex flex-col gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset work-fill:-m-1 work-fill:min-h-0 work-fill:overflow-y-auto work-fill:p-1';

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
 *
 * [2026-10-05 한 화면 압축] 편집기는 세로 격자다: 머리 한 줄 / 경고(있을 때) / 탭 / 탭 내용(남은 높이) / 저장 막대. 업무면 fill
 * 셸(카탈로그 §4) 안에서 표가 남은 높이를 채우고 표 안에서만 스크롤한다. 머리는 그룹명·코드·설명 한 줄과 작은 '메뉴 미리보기'·
 * '권한 묶음 적용', 나머지('이 그룹으로 새 그룹 만들기'·'입력 취소 · 최신 정보 적용')는 '더보기'다 — 다른 곳에서 바뀌어 저장할 수
 * 없을 때는 경고 옆에 '입력 취소 · 최신 정보 적용'을 바로 둔다(이유 없이 숨은 회복 경로를 만들지 않는다, G10).
 * 저장 막대는 화면별·기능별 권한 탭에서 늘 보이는 한 줄(편집기의 마지막 고정 행, sticky 아님)이다: 변경 요약 · '변경 내용 보기' ·
 * '권한 변경 되돌리기'(권한 초안만) · '권한 변경 저장'(막히면 이유를 글자로). '그룹 삭제'는 기본 정보 탭 아래 위험 영역이다 —
 * 저장 버튼 옆의 파괴적 동작을 걷고, 어느 저장 버튼이 무엇을 저장하는지 탭으로 가른다.
 *
 * [2026-10-05 반박 리뷰 반영 — 넘침 가두기] 창이 낮으면 표 상자의 바닥값(6rem)이 남은 높이보다 커지는데, 종전에는 편집기·탭·탭 내용이
 * 모두 min-h-0 + overflow visible 이라 표 상자가 탭 밖으로 넘쳐 저장 막대를 덮었다(구조 재현: 1280×720 에서 '권한 변경 저장' 중심의
 * elementFromPoint 가 표 칸). 이제 화면별·기능별 권한 탭 내용이 스스로 스크롤하는 상자(relative + overflow-y-auto)라 넘침이 그 안에
 * 갇히고, 탭 묶음은 바닥값(5rem — 탭 이름 줄과 표 도구 한 줄)을 지켜 탭 이름이 저장 막대 위로 넘치지 않는다. 그보다 편집기가 더 낮으면 편집기 내용이 흐름대로
 * 아래로 이어지고 셸의 작업 영역이 스크롤한다(work-fill 안전판) — 어느 경우에도 저장 막대를 덮지 않는다. 편집기를 스크롤 상자로 두고
 * 저장 막대를 sticky 로 띄우는 안은 택하지 않았다: 탭(min-h-0)에서 넘친 표 아래쪽이 늘 저장 막대 밑에 깔려 마지막 줄이 가린다(2.4.11).
 * '권한 변경 저장'·'권한 변경 되돌리기'는 막힐 때 disabled 가 아니라 aria-disabled 다 — 확인 대화상자가 닫히며 포커스가 돌아온 뒤나
 * 저장이 끝난 뒤 단추가 막혀도 포커스가 body 로 떨어지지 않는다(2.4.3, 메뉴 관리와 같은 방식).
 */
export function AuthorizationGroupEditor({ snapshot, catalog, refreshing, onRefresh, onDeleted, onSaved, onCopy, onEditMember, focusRequest, onFocusHandled, onChangeCountChange }: {
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
  /**
   * 저장하지 않은 권한 변경 수와 그 그룹 — 허브가 그룹 목록의 그 그룹 단추에만 '변경 n'으로 보인다. 편집기가 사라지면 0 을 알린다.
   * 그룹을 함께 알리는 이유: 그룹을 바꾸면 새 그룹 단추가 먼저 그려지고 앞 편집기의 정리(0 알림)는 그 뒤에 온다 — 수만 들고 있으면
   * 버린 변경 수가 새 그룹 단추에 한 번 그려진다.
   */
  onChangeCountChange?: (count: number, group: string) => void;
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  // 되돌린 결과 — 저장 막대의 알림 영역이 읽는다(표의 '바꾼 권한 n개'는 0 이 되면 비워져 아무것도 읽지 않는다).
  const [revertNotice, setRevertNotice] = useState('');
  const [rowFocus, setRowFocus] = useState<{ menuCode: string; nonce: number } | null>(null);
  const [handledFocus, setHandledFocus] = useState<number | null>(null);
  // 줄 없이 탭으로만 옮긴 요청 — 그 탭 이름으로 포커스한다(옮기기 전 버튼이 사라져 포커스를 잃지 않게).
  const [tabFocus, setTabFocus] = useState(0);
  const [bundleOpen, setBundleOpen] = useState(false);
  const bundleReasonId = useId();
  const saveSummaryId = useId();
  const saveReasonId = useId();
  const dangerHeadingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  /** 저장을 시작할 때 포커스가 저장 단추에 있었는가 — 저장하는 동안(disabled) 브라우저가 포커스를 body 로 보내면 끝난 뒤 되돌린다. */
  const restoreSaveFocusRef = useRef(false);
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
  const operationNames = useMemo(() => new Map(catalog.operations.map((operation) => [operation.code, operation.name])), [catalog.operations]);
  const menuNames = useMemo(() => new Map(catalog.navigation.map((menu) => [menu.code, menu.name])), [catalog.navigation]);
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
  // 변경이 없어지면(저장·되돌리기) 열린 변경 목록을 닫는다 — 빈 목록을 띄워 두지 않는다.
  if (changesOpen && !dirty) setChangesOpen(false);
  // 다시 바꾸기 시작하면 '되돌렸습니다'는 더는 사실이 아니다.
  if (dirty && revertNotice) setRevertNotice('');
  // 처리한 요청을 허브에 알린다 — 허브가 지우므로 이 편집기가 다시 만들어져도 같은 요청을 다시 실행하지 않는다.
  useEffect(() => {
    if (handledFocus !== null) onFocusHandled?.(handledFocus);
  }, [handledFocus, onFocusHandled]);
  // 탭으로만 옮긴 요청 — 그려진 뒤 선택된 탭 이름으로 포커스한다(상태를 바꾸지 않는 DOM 작업).
  useEffect(() => {
    if (tabFocus === 0) return;
    sectionRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus();
  }, [tabFocus]);
  // 저장하지 않은 권한 변경 수를 허브에 알린다(그룹 목록의 '변경 n'). 편집기가 사라지면(그룹 전환·삭제) 0 으로 되돌린다.
  const groupCode = snapshot.code;
  useEffect(() => { onChangeCountChange?.(totalChanges, groupCode); }, [totalChanges, groupCode, onChangeCountChange]);
  useEffect(() => () => onChangeCountChange?.(0, groupCode), [groupCode, onChangeCountChange]);
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
  /** 영역·섹션 줄의 메뉴 표시 — 그 아래 메뉴 전체(켤 때 상위도 함께, 끌 때 아래 전체). 기능권한은 건드리지 않는다. */
  const toggleNavigationUnder = (rootCode: string, codes: readonly string[], checked: boolean) => {
    if (grantsLocked) return;
    setSelection((previous) => toggleNavigationSubtree(navigationTree, previous, rootCode, codes, checked));
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
  /**
   * 권한 초안만 되돌린다 — 기본 정보 폼의 입력과 기준선은 그대로다('입력 취소 · 최신 정보 적용'은 둘 다 되돌리고 최신 정보를
   * 읽는다). 되돌린 변경은 다시 만들 수 없으므로 수를 밝혀 묻는다.
   */
  const revertGrants = async () => {
    if (!dirty || pendingRef.current) return;
    const approved = await confirm({
      title: '권한 변경 되돌리기',
      message: `저장하지 않은 권한 변경 ${totalChanges}건(추가 ${addedKeys.length} · 회수 ${removedKeys.length})을 마지막으로 불러온 상태로 되돌립니다. 기본 정보 입력은 그대로입니다.`,
      confirmText: '권한 변경 되돌리기', variant: 'destructive',
    });
    if (!approved || pendingRef.current) return;
    setSelection(new Set(baselineKeys));
    setRevertNotice(`저장하지 않은 권한 변경 ${totalChanges}건을 되돌렸습니다. 변경 없음.`);
  };
  const saveGrants = async () => {
    if (!writable || !canGrant || !dirty || navigationGaps.length > 0 || pendingRef.current) return;
    pendingRef.current = true; setPendingAction('grants');
    restoreSaveFocusRef.current = typeof document !== 'undefined' && document.activeElement === saveButtonRef.current;
    try {
      const saved = await authorizationAdminService.saveGroupGrants(baseline.code, { grants: selectedGrants(selection, catalog), version: baseline.version, complete: true });
      adoptGrantSave(saved);
      toast('기능권한과 메뉴 표시를 저장했습니다.', 'success');
      notifyAuthorizationChanged(); await onRefresh();
    } catch (error) { toast(failureMessage(error, '변경을 저장하지 못했습니다. 최신 정보를 확인해 주세요.'), 'error'); }
    finally { pendingRef.current = false; setPendingAction(null); }
  };
  /*
   * 저장이 끝나면(성공·실패) 저장하는 동안 잃은 포커스를 저장 단추로 되돌린다. 저장 중에는 단추가 disabled(쓰기 잠금 계약 — 폼 검증
   * census)라 브라우저가 포커스를 body 로 보낼 수 있다. 저장이 끝난 뒤의 단추는 aria-disabled 라 포커스를 받는다(2.4.3). 사용자가 그 사이
   * 다른 곳으로 옮겼으면 건드리지 않는다. DOM 포커스만 바꾸는 effect 다(상태를 바꾸지 않는다).
   */
  useEffect(() => {
    if (pendingAction !== null || !restoreSaveFocusRef.current) return;
    restoreSaveFocusRef.current = false;
    const active = document.activeElement;
    if (!active || active === document.body) saveButtonRef.current?.focus();
  }, [pendingAction]);
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

  /** 다른 곳에서 바뀌어 저장할 수 없을 때 경고 옆에 바로 두는 회복 동작('더보기'와 같은 동작). */
  const reloadButton = (
    <Button type="button" variant="outline" size="xs" disabled={pending || refreshing} onClick={() => void navigate(reload)}>입력 취소 · 최신 정보 적용</Button>
  );
  /** 권한 저장이 막힌 이유 — 비활성 버튼 옆에 글자로 보인다(변경이 없을 때는 요약의 '변경 없음'이 말한다). */
  const saveBlockedReason = pendingAction === 'grants' ? null
    : pending ? '다른 저장이 끝난 뒤 저장할 수 있습니다.'
      : refreshing ? '최신 정보를 읽는 중입니다.'
        : !currentBaseline ? '최신 정보를 적용해야 저장할 수 있습니다.'
          : !complete || navigationTree.error ? '권한 정보를 확인할 수 없어 저장할 수 없습니다.'
            : navigationGaps.length > 0 ? '상위 메뉴가 빠진 메뉴가 있어 저장할 수 없습니다.'
              : null;
  const changeLabel = (key: string) => {
    const { type, code } = grantsOfKeys([key])[0];
    return type === 'NAVIGATION' ? `메뉴 표시 · ${menuNames.get(code) ?? code}` : `${operationNames.get(code) ?? code} (${code})`;
  };
  const description = (snapshot.description ?? '').trim();

  return (
    <section ref={sectionRef} aria-label={`${snapshot.name} 권한 설정`} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 work-fill:min-h-0 work-fill:flex-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* 그룹명(최대 100자)은 줄바꿈한다 — 종전 shrink-0 은 긴 이름을 카드 밖으로 가로로 넘겼다(1.4.10). 코드·설명은 남은 폭에서
            말줄임이고, 줄이 모자라면 다음 줄로 내려간다. */}
        <div className="flex min-w-0 flex-[1_1_16rem] flex-wrap items-baseline gap-x-2">
          <h2 className="min-w-0 max-w-full break-words text-base font-semibold">{snapshot.name}</h2>
          <p className="min-w-0 max-w-full truncate text-xs text-muted-foreground" title={description ? `${snapshot.code} · ${description}` : snapshot.code}>
            {snapshot.code}{description && ` · ${description}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>메뉴 미리보기</Button>
          {bundleEditable && <Button type="button" variant="outline" size="sm" disabled={grantsLocked || anonymous} aria-describedby={anonymous ? bundleReasonId : undefined}
            onClick={() => setBundleOpen(true)}>권한 묶음 적용</Button>}
          <Popover open={moreOpen} onOpenChange={setMoreOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm"><MoreHorizontal aria-hidden="true" />더보기</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-1" aria-label={`${snapshot.name} 더보기`}>
              <div className="flex flex-col">
                {onCopy && !anonymous && <Button type="button" variant="ghost" size="sm" className="justify-start" disabled={pending}
                  onClick={() => { setMoreOpen(false); onCopy(); }}>이 그룹으로 새 그룹 만들기</Button>}
                <Button type="button" variant="ghost" size="sm" className="justify-start" disabled={pending || refreshing}
                  onClick={() => { setMoreOpen(false); void navigate(reload); }}>입력 취소 · 최신 정보 적용</Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {bundleEditable && anonymous && <p id={bundleReasonId} className="text-xs text-muted-foreground">비로그인 사용자 그룹에는 묶음을 적용할 수 없습니다.</p>}
      {!currentBaseline && <div className="flex flex-wrap items-center gap-2"><p role="status" className="text-sm text-muted-foreground">그룹 정보가 다른 곳에서 변경되어 화면별 권한·기능별 권한을 저장할 수 없습니다. 최신 정보를 적용한 뒤 다시 편집하세요.</p>{reloadButton}</div>}
      {currentBaseline && !metadataCurrent && <div className="flex flex-wrap items-center gap-2"><p role="status" className="text-sm text-muted-foreground">그룹명·설명이 다른 곳에서 변경되었습니다. 최신 정보를 적용한 뒤 기본 정보를 편집하세요.</p>{reloadButton}</div>}
      {!complete && <p role="alert" className="text-sm text-destructive">전체 권한 또는 현재 기능 목록과의 일치를 확인하지 못해 저장할 수 없습니다. 다시 조회해 주세요.</p>}
      {navigationOnly && !anonymous && <p role="alert" className="text-sm text-destructive">메뉴만 선택되어 있고 기능권한이 없습니다. 필요한 업무 영역의 조회 기능을 확인하세요. 권한은 자동으로 추가되지 않습니다.</p>}
      {/* 메뉴 계층 손상과 상위 누락은 어느 탭에 있든 저장(또는 편집 전체)을 막으므로 탭 밖에 둔다 — 이유 없이 죽은 버튼을 남기지 않는다(G10). */}
      {navigationTree.error && <p role="alert" className="text-sm text-destructive">{navigationTree.error} 저장할 수 없습니다. 메뉴 설정을 확인한 뒤 다시 조회해 주세요.</p>}
      {navigationGaps.length > 0 && <p role="alert" className="text-sm text-destructive">상위 메뉴가 선택되지 않은 메뉴가 있습니다: {navigationGaps.join(', ')}. &apos;화면별 권한&apos; 탭의 &apos;메뉴 표시&apos; 칸에서 상위 메뉴를 선택하거나 해당 하위 메뉴를 해제한 뒤 저장하세요.</p>}
      {/* 탭 묶음은 바닥값(5rem — 탭 이름 줄과 탭 내용 한 줄)을 지킨다. min-h-0 이면 편집기가 아주 낮을 때 탭 이름 줄까지 저장 막대 위로 넘친다.
          바닥값을 더 크게 두면 흔한 노트북 창(1366×657)에서 편집기가 작업 영역보다 길어져 저장 막대가 작업 영역 아래로 밀린다(구조 측정). */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EditorTab)} className="gap-2 work-fill:min-h-[5rem] work-fill:flex-1">
        <TabsList variant="line" aria-label="그룹 설정 영역" className="flex-wrap group-data-[orientation=horizontal]/tabs:h-auto">
          <TabsTrigger value="screens" className="flex-none px-3">화면별 권한<ChangeBadge visible={String(totalChanges)} suffix="건 변경" hidden={totalChanges === 0} /></TabsTrigger>
          <TabsTrigger value="operations" className="flex-none px-3">기능별 권한<ChangeBadge visible={String(operationChanges)} suffix="건 변경" hidden={operationChanges === 0} /></TabsTrigger>
          <TabsTrigger value="members" className="flex-none px-3">구성원</TabsTrigger>
          <TabsTrigger value="metadata" className="flex-none px-3">기본 정보<ChangeBadge visible="수정 중" hidden={!metadataDirty} /></TabsTrigger>
          {canAudit && <TabsTrigger value="history" className="flex-none px-3">변경 이력</TabsTrigger>}
        </TabsList>
        {/* 화면별·기능별 권한 탭 내용은 넘침을 가두는 스크롤 상자다(위 '넘침 가두기'). 보통은 표가 남은 높이를 받아 넘치지 않고, 창이
            낮아 표 상자 바닥값(6rem)이 남은 높이보다 크면 이 상자가 스크롤한다. 안쪽 sr-only 가 잘리도록 relative 다. */}
        <TabsContent value="screens" forceMount hidden={activeTab !== 'screens'} className={GRANT_PANEL_CLASS}>
          {anonymous && <p role="status" className="text-sm text-muted-foreground">공개 메뉴 그룹은 메뉴 표시만 설정하며 로그인 사용자에게 배정하지 않습니다.</p>}
          <EntryPermissionSummary state={entryFixes} />
          {/* 메뉴 계층이 손상돼 있으면 표를 그리지 않는다 — 이유는 탭 밖 경고가 말한다. */}
          {!navigationTree.error && <ScreenPermissionTable fill model={screenModel} operations={catalog.operations} selection={selection} baseline={baselineKeys} preview={preview}
            editable={canGrant} disabled={grantsLocked} allowAdd={!anonymous} onChangeOperations={changeOperations} onToggleNavigation={toggleNavigation}
            onToggleNavigationSubtree={toggleNavigationUnder}
            entryFixes={entryFixes} problemMenuCodes={problemMenuCodes} focusRequest={rowFocus}
            onSaveShortcut={canGrant ? () => void saveGrants() : undefined} saveShortcutDisabled={saveDisabled} unsavedChangeCount={totalChanges} />}
        </TabsContent>
        <TabsContent value="operations" forceMount hidden={activeTab !== 'operations'} className={GRANT_PANEL_CLASS}>
          {anonymous && <p role="status" className="text-sm text-muted-foreground">공개 메뉴 그룹은 메뉴 표시만 설정하며 로그인 사용자에게 배정하지 않습니다.</p>}
          <OperationPermissionMatrix fill operations={catalog.operations} selection={selection} baseline={baselineKeys}
            editable={canGrant} disabled={grantsLocked} allowAdd={!anonymous} onChange={changeOperations}
            onSaveShortcut={canGrant ? () => void saveGrants() : undefined} saveShortcutDisabled={saveDisabled}
            unsavedChangeCount={totalChanges} />
        </TabsContent>
        <TabsContent value="members" forceMount hidden={activeTab !== 'members'} className="relative work-fill:min-h-0 work-fill:overflow-y-auto">
          <AuthorizationGroupMembers code={snapshot.code} name={snapshot.name} anonymous={anonymous} protectedGrants={savedProtected} onEditMember={onEditMember} />
        </TabsContent>
        <TabsContent value="metadata" forceMount hidden={activeTab !== 'metadata'} className="relative space-y-3 work-fill:min-h-0 work-fill:overflow-y-auto">
          <p className="text-xs text-muted-foreground">그룹명·설명은 화면별 권한·기능별 권한과 따로 저장합니다. 한쪽을 저장해도 다른 쪽의 저장하지 않은 변경은 남습니다.</p>
          {canUpdate ? <AuthorizationGroupForm key={formRevision} initial={{ code: metadataBaseline.code, name: metadataBaseline.name, description: metadataBaseline.description ?? '' }} creating={false} externalBusy={!metadataWritable} onDirtyChange={setMetadataDirty}
            onSubmit={async (values) => { if (!canUpdate) return; await write(async () => adoptMetadataSave(await authorizationAdminService.updateGroup(baseline.code, { name: values.name, description: values.description, version: metadataBaseline.version })), '그룹 정보를 저장했습니다.'); }} />
            : <p className="text-sm text-muted-foreground">{snapshot.description || '등록된 설명이 없습니다.'}</p>}
          {/* 위험 영역 — 저장 막대 옆에 두던 '그룹 삭제'를 옮겼다(2026-10-05). 예약 그룹은 삭제할 수 없어 두지 않는다. */}
          {canDelete && !RESERVED.has(baseline.code) && (
            <section aria-labelledby={dangerHeadingId} className="space-y-2 rounded-md border border-destructive/40 p-3">
              <h3 id={dangerHeadingId} className="text-sm font-semibold">되돌릴 수 없는 작업</h3>
              <p className="text-xs text-muted-foreground">그룹을 지우면 되돌릴 수 없습니다. 배정된 사용자가 있으면 삭제되지 않으니 먼저 &apos;구성원&apos; 탭에서 회수하세요.</p>
              <Button type="button" variant="destructive" size="sm" disabled={pending || !writable} aria-busy={pendingAction === 'delete'} onClick={() => void deleteGroup()}>그룹 삭제</Button>
            </section>
          )}
        </TabsContent>
        {canAudit && <TabsContent value="history" className="flex flex-col work-fill:min-h-0">
          {activeTab === 'history' && <GroupChangeHistory code={snapshot.code} fill />}
        </TabsContent>}
      </Tabs>
      {GRANT_TABS.has(activeTab) && (canGrant ? (
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-2">
          <p id={saveSummaryId} className="text-sm">
            {dirty ? <>저장 전 변경: 추가 <strong>{addedKeys.length}</strong> · 회수 <strong>{removedKeys.length}</strong></> : '변경 없음'}
          </p>
          <Popover open={changesOpen} onOpenChange={setChangesOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" size="sm" disabled={!dirty}>변경 내용 보기</Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-96 space-y-2 p-3" aria-label="저장하지 않은 권한 변경">
              <p className="text-xs text-muted-foreground">저장하면 이 그룹을 배정받은 사용자에게 적용되며, 다른 그룹이 제공하는 같은 권한은 유지됩니다.</p>
              <div className="relative max-h-56 space-y-2 overflow-y-auto">
                {([['추가', addedKeys], ['회수', removedKeys]] as const).map(([title, keys]) => keys.length > 0 && (
                  <section key={title} aria-label={`${title} ${keys.length}개`}>
                    <h3 className="text-xs font-semibold">{title} {keys.length}개</h3>
                    <ul className="mt-1 space-y-0.5 text-sm">{keys.map((key) => <li key={key}>{changeLabel(key)}</li>)}</ul>
                  </section>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {saveBlockedReason && <span id={saveReasonId} className="text-xs text-muted-foreground">{saveBlockedReason}</span>}
            {/* 막힐 때 disabled 가 아니라 aria-disabled 다 — 되돌리기 확인이 닫히며 포커스가 이 단추로 돌아온 뒤, 또는 저장이 끝난 뒤
                단추가 막혀도 포커스가 body 로 떨어지지 않는다(2.4.3). 누름은 각 핸들러의 가드가 막는다. 저장 단추만은 저장하는 동안
                disabled 다(쓰기 잠금 계약: 저장 중 disabled + aria-busy) — 그 사이 잃은 포커스는 끝난 뒤 되돌린다(위 effect). */}
            <Button type="button" variant="outline" size="sm" aria-disabled={!dirty || pending || undefined} className={BLOCKED_BUTTON_CLASS}
              onClick={() => { if (dirty && !pending) void revertGrants(); }}>권한 변경 되돌리기</Button>
            <Button ref={saveButtonRef} type="button" size="sm" disabled={pendingAction === 'grants'} aria-disabled={saveDisabled || undefined}
              aria-busy={pendingAction === 'grants'} className={BLOCKED_BUTTON_CLASS}
              aria-describedby={saveBlockedReason ? saveReasonId : saveSummaryId} onClick={() => { if (!saveDisabled) void saveGrants(); }}>권한 변경 저장</Button>
          </div>
          <p role="status" className="sr-only">{revertNotice}</p>
        </div>
      ) : <p className="border-t border-border pt-2 text-xs text-muted-foreground">권한 설정 권한이 없어 조회만 할 수 있습니다.</p>)}
      {bundleOpen && <PermissionBundleDialog groupName={snapshot.name} bundles={PERMISSION_BUNDLES} selection={selection} saved={baselineKeys} locked={grantsLocked}
        navigation={catalog.navigation} operationCodes={operationCodes} canAssign={canAssign} onAddToDraft={addBundleToDraft} onClose={() => setBundleOpen(false)} />}
      {previewOpen && <MenuPreviewDialog title={`${snapshot.name} 메뉴 미리보기`} isOpen onClose={() => setPreviewOpen(false)}
        basis={dirty ? '저장하지 않은 변경을 포함한 이 그룹의 초안 기준입니다.' : '이 그룹의 저장된 권한 기준입니다.'}
        menus={previewMenus} preview={preview} selectedNavigation={grantSets(grantsOfKeys(selection)).navigation}
        renderFix={(menu) => <Button type="button" variant="outline" size="sm" onClick={() => focusRow(String(menu.menuNo))}>{menu.menuNm} 줄로 가기</Button>} />}
    </section>
  );
}
