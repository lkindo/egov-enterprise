import type { FlattenedItem } from './treeUtils';
import {
  menuLabel,
  parentKeyOf,
  parentPathLabel,
  revertPlacement,
  summarizeDraft,
  type MenuDraft,
  type MenuEditableField,
  type MenuGroup,
} from './menuDraft';
import type { MenuChangeConflict, MenuChangeEntry, MenuChangeError } from './MenuChangeList';
import type { GroupMatrixState } from './MenuGroupVisibility';
import { FIELD_LABEL } from './menuAdminModel';

/*
 * 시스템 메뉴 관리의 변경 목록 항목(2026-10-18 화면 분해 때 MenuAdminClient 에서 옮겼다 — 동작 변경 없음). 초안 요약의 다섯
 * 배열(새 메뉴·삭제·위치·속성·그룹 배정)을 한 건씩 옮긴 항목, 저장을 막는 숨김 충돌과 입력 오류다.
 */

type DraftSummary = ReturnType<typeof summarizeDraft>;

/** 변경 목록 항목 — 도구 막대의 '변경 n건' 과 저장 확인의 목록이 같은 배열을 센다. */
export function buildMenuChangeEntries(summary: DraftSummary, draft: MenuDraft, baseItems: readonly FlattenedItem[]): MenuChangeEntry[] {
  const nameOf = (menuNo: number) => menuLabel(draft.items, menuNo);
  /** 위치 변경을 되돌릴 수 없는 이유(원래 상위가 삭제 예정 등). 되돌릴 수 있으면 undefined. */
  const placementRevertProblem = (menuNo: number): string | undefined => {
    const reverted = revertPlacement(draft, baseItems, menuNo);
    return reverted.ok ? undefined : reverted.reason;
  };
  return [
    ...summary.created.map((menuNo) => ({
      id: `new:${menuNo}`,
      text: `${nameOf(menuNo)} — 새 메뉴(${parentPathLabel(draft.items, parentKeyOf(draft.items.find((item) => item.menuNo === menuNo)?.parentId))})`,
      revertLabel: `${nameOf(menuNo)} 새 메뉴 추가 되돌리기`,
      revertBlockedReason: draft.items.some((item) => item.parentId === menuNo) ? '하위 메뉴가 있어 지울 수 없습니다. 하위 메뉴를 먼저 옮기거나 지우세요.' : undefined,
    })),
    ...summary.deleted.map((menuNo) => {
      const parent = parentKeyOf(draft.items.find((item) => item.menuNo === menuNo)?.parentId);
      return {
        id: `del:${menuNo}`,
        text: `${nameOf(menuNo)} — 삭제 예정`,
        revertLabel: `${nameOf(menuNo)} 삭제 표시 되돌리기`,
        revertBlockedReason: parent !== null && draft.deleted.has(parent) ? '상위 메뉴의 삭제를 먼저 취소하세요.' : undefined,
      };
    }),
    ...summary.structure.map((change) => ({
      id: `place:${change.menuNo}`,
      text: change.kind === 'move'
        ? `${nameOf(change.menuNo)} — ${parentPathLabel(baseItems, change.fromParent)} → ${parentPathLabel(draft.items, change.toParent)}`
        : `${nameOf(change.menuNo)} — 순서 변경(${parentPathLabel(draft.items, change.toParent)})`,
      revertLabel: `${nameOf(change.menuNo)} 위치 변경 되돌리기`,
      revertBlockedReason: placementRevertProblem(change.menuNo),
    })),
    ...summary.properties.map((change) => ({
      id: `props:${change.menuNo}`,
      text: `${nameOf(change.menuNo)} — ${change.fields.map((field: MenuEditableField) => FIELD_LABEL[field]).join('·')} 수정`,
      revertLabel: `${nameOf(change.menuNo)} 속성 변경 되돌리기`,
    })),
    ...summary.groups.map((group) => ({
      id: `group:${group.code}`,
      text: `${group.name} 그룹 — ${[
        group.navigationAdd.length > 0 ? `메뉴 표시 추가 ${group.navigationAdd.map(nameOf).join(', ')}` : '',
        group.navigationRemove.length > 0 ? `메뉴 표시 회수 ${group.navigationRemove.map(nameOf).join(', ')}` : '',
        group.operationAdd.length > 0 ? `기능권한 추가 ${group.operationAdd.join(', ')}` : '',
      ].filter(Boolean).join(' · ')}`,
      revertLabel: `${group.name} 그룹 배정 변경 되돌리기`,
    })),
  ];
}

/** 저장하면 메뉴가 숨겨지는 그룹 — 권한 설정 권한이 있으면 그 자리에서 해결하는 단추 둘을 단다. */
export function buildMenuConflictEntries(
  summary: DraftSummary,
  draft: MenuDraft,
  { groups, canGrant, onToggleNavigation }: {
    groups: readonly MenuGroup[];
    canGrant: boolean;
    onToggleNavigation: (groupCode: string, menuNo: number, checked: boolean) => void;
  },
): MenuChangeConflict[] {
  const nameOf = (menuNo: number) => menuLabel(draft.items, menuNo);
  const movedMenus = new Set(summary.structure.filter((change) => change.kind === 'move').map((change) => change.menuNo));
  return summary.conflicts.map((conflict) => ({
    id: `conflict-${conflict.menuNo}-${conflict.groupCode}`,
    // 옮긴 기존 메뉴면 옮겨서 숨겨지는 것이고, 아니면(새 메뉴·상위가 옮겨진 메뉴) 그 그룹에 표시하려면 상위도 표시해야 한다.
    text: movedMenus.has(conflict.menuNo)
      ? `'${nameOf(conflict.menuNo)}'을(를) 옮기면 ${conflict.groupName} 그룹에서 상위 메뉴 '${nameOf(conflict.parentNo)}'가 표시되지 않아 숨겨집니다.`
      : `'${nameOf(conflict.menuNo)}'을(를) ${conflict.groupName} 그룹에 표시하려면 지금 상위 메뉴 '${nameOf(conflict.parentNo)}'도 그 그룹에 표시해야 합니다.`,
    actions: canGrant && groups.some((group) => group.code === conflict.groupCode)
      ? [
        { label: `${conflict.groupName}에 상위 메뉴 표시 추가`, onClick: () => onToggleNavigation(conflict.groupCode, conflict.parentNo, true) },
        { label: `${conflict.groupName}에서 이 메뉴 표시 회수`, onClick: () => onToggleNavigation(conflict.groupCode, conflict.menuNo, false) },
      ]
      : [],
    note: canGrant ? undefined : '권한 설정 권한이 없어 여기서 해결할 수 없습니다. 메뉴를 원래 자리로 되돌리거나 권한 설정 권한이 있는 관리자에게 요청하세요.',
  }));
}

/** 입력 오류 — '고치기' 는 그 메뉴를 고르고 첫 오류 칸(이름 → 연결 경로 → 설명 순)으로 간다. */
export function buildMenuErrorEntries(
  summary: DraftSummary,
  draft: MenuDraft,
  onFix: (menuNo: number, field: 'menuNm' | 'modernRoute' | 'menuExpln') => void,
): MenuChangeError[] {
  return [...summary.errors].map(([menuNo, errors]) => ({
    id: `error-${menuNo}`,
    text: `${menuLabel(draft.items, menuNo)}: ${Object.values(errors).join(' ')}`,
    selectLabel: `${menuLabel(draft.items, menuNo)} 고치기`,
    onSelect: () => {
      onFix(menuNo, (['menuNm', 'modernRoute', 'menuExpln'] as const).find((field) => errors[field]) ?? 'menuNm');
    },
  }));
}

/** 숨김 검사는 그룹 권한을 알 때만 한다. 모르면(권한 없음·불러오는 중·불러오기 실패) 그 사실을 저장 전에 말한다. */
export function groupsUnknownNoteOf(summary: DraftSummary, groupState: GroupMatrixState): string {
  const visibilityAtRisk = summary.structure.some((change) => change.kind === 'move') || summary.groups.length > 0;
  return !visibilityAtRisk || groupState === 'ready'
    ? ''
    : groupState === 'no-permission'
      ? ' 그룹 권한을 볼 수 없어 옮긴 메뉴가 숨겨지는 그룹을 미리 알려 줄 수 없습니다 — 저장할 때 서버가 확인합니다.'
      : groupState === 'error'
        ? ' 그룹 권한을 불러오지 못해 메뉴가 숨겨지는 그룹을 미리 확인하지 못했습니다 — 저장할 때 서버가 확인합니다. 상세의 그룹 권한 다시 불러오기로 다시 읽을 수 있습니다.'
        : ' 그룹 권한을 불러오는 중이라 메뉴가 숨겨지는 그룹을 아직 확인하지 못했습니다 — 저장할 때 서버가 확인합니다.';
}
