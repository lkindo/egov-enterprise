import { useMemo, useState } from 'react';
import { buildNavigationPermissionTree, menusMissingEntryPermission, toggleNavigationPermission } from '@/lib/auth/navigation-permission-tree';
import { grantSets, menuPreviewMenusFromCatalog, previewMenuVisibility } from '@/lib/navigation/menu-visibility-preview';
import { ScreenPermissionTable } from '../components/ScreenPermissionTable';
import { buildScreenPermissionModel, toggleNavigationSubtree } from '../components/screen-permission-model';
import { useEntryPermissionFixes } from '../components/EntryPermissionFixes';
import type { MatrixOperation } from '../components/operation-permission-matrix-model';

/**
 * '화면별 권한' 표를 편집기처럼 쓰는 시험용 틀 — 초안 선택을 들고 칸 변경을 반영하고, 상태 칸·진입 권한 고치기를 실제 모델·
 * 판정으로 계산한다. 저장은 하지 않는다(onSaveShortcut 만 부른다).
 */
export type HarnessNavigation = { code: string; name: string; parentCode: string | null; route: string | null; useYn: 'Y' | 'N' };

export const HARNESS_OPERATIONS: readonly MatrixOperation[] = [
  { code: 'MENU_READ', domain: 'MENU', action: 'READ', name: '메뉴 조회' },
  { code: 'MENU_CREATE', domain: 'MENU', action: 'CREATE', name: '메뉴 등록' },
  { code: 'MENU_UPDATE', domain: 'MENU', action: 'UPDATE', name: '메뉴 수정' },
  { code: 'MENU_DELETE', domain: 'MENU', action: 'DELETE', name: '메뉴 삭제' },
  { code: 'USER_READ', domain: 'USER', action: 'READ', name: '사용자 조회' },
  { code: 'USER_CREATE', domain: 'USER', action: 'CREATE', name: '사용자 등록' },
  { code: 'USER_UPDATE', domain: 'USER', action: 'UPDATE', name: '사용자 수정' },
  { code: 'USER_DELETE', domain: 'USER', action: 'DELETE', name: '사용자 삭제' },
  { code: 'USER_STATUS', domain: 'USER', action: 'STATUS', name: '사용자 상태 변경' },
  { code: 'USER_DEPT', domain: 'USER', action: 'DEPT', name: '사용자 부서 변경' },
  { code: 'USER_PASSWORD', domain: 'USER', action: 'PASSWORD', name: '비밀번호 초기화' },
  { code: 'DEPT_CREATE', domain: 'DEPT', action: 'CREATE', name: '부서 등록' },
  { code: 'DEPT_UPDATE', domain: 'DEPT', action: 'UPDATE', name: '부서 수정' },
  { code: 'DEPT_DELETE', domain: 'DEPT', action: 'DELETE', name: '부서 삭제' },
  { code: 'ABSENCE_UPDATE', domain: 'ABSENCE', action: 'UPDATE', name: '부재 수정' },
  { code: 'MFA_RECOVER', domain: 'MFA', action: 'RECOVER', name: '추가 인증 복구' },
  { code: 'POLL_READ', domain: 'POLL', action: 'READ', name: '투표 조회' },
  { code: 'POLL_READ_ALL', domain: 'POLL', action: 'READ_ALL', name: '타인 투표 조회' },
  { code: 'POLL_CREATE', domain: 'POLL', action: 'CREATE', name: '투표 등록' },
  { code: 'AUTHRT_READ', domain: 'AUTHRT', action: 'READ', name: '권한 조회' },
  { code: 'AUTHRT_AUDIT', domain: 'AUTHRT', action: 'AUDIT', name: '권한 감사' },
  { code: 'ADMCODE_READ', domain: 'ADMCODE', action: 'READ', name: '행정 코드 조회' },
];

export const HARNESS_NAVIGATION: readonly HarnessNavigation[] = [
  { code: 'AREA', name: '관리', parentCode: null, route: null, useYn: 'Y' },
  { code: 'SECTION', name: '시스템', parentCode: 'AREA', route: null, useYn: 'Y' },
  { code: 'MENUS', name: '메뉴 관리', parentCode: 'SECTION', route: '/admin/system/menus', useYn: 'Y' },
  { code: 'USERS', name: '사용자 관리', parentCode: 'SECTION', route: '/admin/user/manage', useYn: 'Y' },
  { code: 'POLLS', name: '투표 관리', parentCode: 'AREA', route: '/admin/survey/polls', useYn: 'Y' },
  { code: 'AUTHORITY', name: '권한 그룹 관리', parentCode: 'AREA', route: '/admin/security/authority', useYn: 'Y' },
  { code: 'OLD', name: '옛 메뉴', parentCode: null, route: '/note', useYn: 'N' },
];

export function ScreenTableHarness({
  initial, navigation = HARNESS_NAVIGATION, operations = HARNESS_OPERATIONS, editable = true, disabled = false, allowAdd = true,
  onSaveShortcut, saveShortcutDisabled = false, focusRequest = null, fill = false,
}: {
  initial: readonly string[];
  navigation?: readonly HarnessNavigation[];
  operations?: readonly MatrixOperation[];
  editable?: boolean;
  disabled?: boolean;
  allowAdd?: boolean;
  onSaveShortcut?: () => void;
  saveShortcutDisabled?: boolean;
  focusRequest?: { menuCode: string; nonce: number } | null;
  fill?: boolean;
}) {
  const tree = useMemo(() => buildNavigationPermissionTree(navigation), [navigation]);
  const model = useMemo(() => buildScreenPermissionModel(tree, operations.map((operation) => operation.code)), [tree, operations]);
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set(initial));
  const [baseline] = useState<ReadonlySet<string>>(() => new Set(initial));
  const grants = [...selection].map((key) => ({ type: key.slice(0, key.indexOf(':')), code: key.slice(key.indexOf(':') + 1) }));
  const preview = previewMenuVisibility({ menus: menuPreviewMenusFromCatalog(navigation), ...grantSets(grants) });
  const missing = menusMissingEntryPermission(navigation, selection);
  const [problemMenuCodes] = useState(() => missing.map((menu) => menu.code));
  const selectedCodes = new Set(grants.filter((grant) => grant.type === 'OPERATION').map((grant) => grant.code));
  const savedCodes = new Set([...baseline].filter((key) => key.startsWith('OPERATION:')).map((key) => key.slice('OPERATION:'.length)));
  const changeOperations = (keys: readonly string[], checked: boolean) => {
    if (disabled) return;
    setSelection((previous) => {
      const next = new Set(previous);
      for (const key of keys) { if (!checked) next.delete(key); else if (allowAdd) next.add(key); }
      return next;
    });
  };
  const entryFixes = useEntryPermissionFixes({
    missing, operations, selectedCodes, savedCodes, editable, disabled,
    onAdd: (codes) => changeOperations(codes.map((code) => `OPERATION:${code}`), true),
  });
  const changed = [...new Set([...selection, ...baseline])].filter((key) => selection.has(key) !== baseline.has(key)).length;
  return (
    <>
      <span hidden data-testid="selection">{[...selection].sort().join(',')}</span>
      <ScreenPermissionTable model={model} operations={operations} selection={selection} baseline={baseline} preview={preview}
        editable={editable} disabled={disabled} allowAdd={allowAdd} onChangeOperations={changeOperations}
        onToggleNavigation={(code, checked) => setSelection((previous) => toggleNavigationPermission(tree, previous, code, checked))}
        onToggleNavigationSubtree={(root, codes, checked) => setSelection((previous) => toggleNavigationSubtree(tree, previous, root, codes, checked))}
        fill={fill}
        entryFixes={entryFixes} problemMenuCodes={problemMenuCodes} focusRequest={focusRequest}
        onSaveShortcut={onSaveShortcut} saveShortcutDisabled={saveShortcutDisabled} unsavedChangeCount={changed} />
    </>
  );
}

/** 지금 초안의 선택(정렬). */
export function selectionOf(container: HTMLElement): string[] {
  const text = container.querySelector('[data-testid="selection"]')?.textContent ?? '';
  return text ? text.split(',') : [];
}
