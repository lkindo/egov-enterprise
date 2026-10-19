import {
  previewMenuVisibility,
  type MenuVisibilityPreview,
} from '@/lib/navigation/menu-visibility-preview';
import type { MenuStructure } from '@/services/foundation/system/MenuAdminService';
import type { FlattenedItem } from './treeUtils';
import {
  draftCounts,
  groupGrants,
  menuLabel,
  menuRef,
  menuRouteValue,
  menuUseValue,
  parentKeyOf,
  parentPathLabel,
  siblingOrder,
  structureItems,
  summarizeDraft,
  type MenuDraft,
  type MenuEditableField,
  type MenuGroup,
} from './menuDraft';

/*
 * 시스템 메뉴 관리(MenuAdminClient)의 순수 값·판정. 2026-10-18 화면 분해 때 MenuAdminClient 머리에서 옮겼다(동작 변경 없음).
 */

/*
 * 이 화면의 조회·저장 실패는 화면이 배너·알림으로 말한다. 전역 실패 토스트까지 켜면 같은 실패가 두 번 보인다.
 */
export const QUIET = { suppressErrorToast: true } as const;
export const NO_ITEMS: readonly FlattenedItem[] = [];

export const FIELD_LABEL: Record<MenuEditableField, string> = {
  menuNm: '이름',
  modernRoute: '연결 화면',
  menuExpln: '설명',
  useYn: '사용 여부',
};

export interface Baseline {
  version: string;
  items: readonly FlattenedItem[];
}

export const toBaseline = (structure: MenuStructure): Baseline => ({ version: structure.version, items: structureItems(structure.menus) });
export const firstArea = (items: readonly FlattenedItem[]): number | null => items.find((item) => item.depth === 0)?.menuNo ?? null;

/** 형제 안 자리 문장 — '나의 업무 아래 5개 중 2번째', '최상위 4개 중 1번째'. */
export function placementText(items: readonly FlattenedItem[], menuNo: number): string {
  const parent = parentKeyOf(items.find((item) => item.menuNo === menuNo)?.parentId);
  const siblings = siblingOrder(items).get(parent) ?? [];
  const where = parent === null ? '최상위' : `${parentPathLabel(items, parent)} 아래`;
  return `${where} ${siblings.length.toLocaleString()}개 중 ${(siblings.indexOf(menuNo) + 1).toLocaleString()}번째`;
}

/**
 * 한 그룹이 저장 전 초안 기준으로 사이드바에서 무엇을 보는가(사이드바와 같은 판정 — previewMenuVisibility). 보드의 그룹 미리보기와
 * 상세의 그룹별 결과 칩이 같은 함수를 쓴다. 삭제 예정 메뉴는 넣지 않는다(저장하면 사라진다).
 */
export function draftVisibility(draft: MenuDraft, group: MenuGroup): MenuVisibilityPreview {
  const grants = [...groupGrants(draft, group)];
  const live = draft.items.filter((item) => !draft.deleted.has(item.menuNo));
  return previewMenuVisibility({
    menus: live.map((item) => ({
      menuNo: menuRef(item.menuNo),
      menuNm: menuLabel(draft.items, item.menuNo),
      upMenuSn: item.parentId === null ? null : menuRef(item.parentId),
      menuOrdr: item.index,
      modernRoute: menuRouteValue(item),
      useYn: menuUseValue(item),
    })),
    navigation: grants.filter((key) => key.startsWith('NAVIGATION:')).map((key) => key.slice('NAVIGATION:'.length)),
    operations: grants.filter((key) => key.startsWith('OPERATION:')).map((key) => key.slice('OPERATION:'.length)),
  });
}

/**
 * '변경 저장' 을 막는 이유(없으면 null)와 저장 확인에 적을 개수. 권한 문제는 초안에 그 종류의 변경이 있을 때만 막는다 — 서버
 * MenuService#saveMenuStructure 가 같은 권한을 다시 집행한다.
 */
export function menuSaveGate(
  summary: ReturnType<typeof summarizeDraft>,
  { hasBaseline, hasChanges, reloadPending, canUpdate, canCreate, canDelete, canGrant }: {
    hasBaseline: boolean;
    hasChanges: boolean;
    reloadPending: boolean;
    canUpdate: boolean;
    canCreate: boolean;
    canDelete: boolean;
    canGrant: boolean;
  },
) {
  const counts = draftCounts(summary);
  const permissionProblem = !canUpdate
    ? '메뉴 수정 권한이 없어 저장할 수 없습니다.'
    : counts.created > 0 && !canCreate ? '새 메뉴를 저장하려면 메뉴 등록 권한이 필요합니다.'
      : counts.deleted > 0 && !canDelete ? '메뉴 삭제를 저장하려면 메뉴 삭제 권한이 필요합니다.'
        : counts.groups > 0 && !canGrant ? '그룹 배정을 저장하려면 권한 설정 권한이 필요합니다.'
          : null;
  const saveBlockedReason = !hasBaseline
    ? '메뉴 구조를 불러오지 못해 저장할 수 없습니다. 다시 불러오세요.'
    : summary.conflicts.length > 0
      ? `메뉴가 숨겨지는 그룹 ${summary.conflicts.length.toLocaleString()}건을 해결해야 저장할 수 있습니다.`
      : summary.errors.size > 0
        ? `입력 오류 ${summary.errors.size.toLocaleString()}건을 고쳐야 저장할 수 있습니다.`
        : permissionProblem;
  const saveReady = hasChanges && saveBlockedReason === null && !reloadPending;
  return { counts, saveBlockedReason, saveReady };
}

/** 글자를 넣는 칸인가 — Ctrl+Z 를 브라우저 기본 동작(입력 되돌리기)에 맡긴다. */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  return target instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'reset'].includes(target.type);
}
