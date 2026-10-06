import type { Active, Announcements, Over, ScreenReaderInstructions, UniqueIdentifier } from '@dnd-kit/core';
import { treeDndAnnouncements } from '@/lib/dnd/tree-dnd-accessibility';
import type { FlattenedItem } from './treeUtils';
import {
  ancestorIds,
  menuLabel,
  moveBlock,
  parentKeyOf,
  placementProblem,
  siblingOrder,
  type MenuParentKey,
} from './menuDraft';

/**
 * [2026-10-02 D1] 보드형 메뉴 구조 편집기의 순수 판정 — 영역(최상위) 탭, 2단계 카드, 3단계 줄.
 *
 * 끌기·붙여넣기·'다른 곳으로 옮기기' 대화상자가 같은 판정(menuDraft.placementProblem)과 같은 이동(moveBlock)을 쓴다.
 * 화면 표현(카드·줄)은 이 파일이 정하지 않는다 — 놓을 곳이 '무엇의 앞/뒤인가, 무엇의 안인가' 만 정한다.
 */

/** 영역(최상위 메뉴). 메뉴가 어느 영역에 있는지(자기 자신이 영역이면 자기). */
export function areaOf(items: readonly FlattenedItem[], menuNo: number): number | null {
  if (!items.some((item) => item.menuNo === menuNo)) return null;
  return ancestorIds(items, menuNo)[0] ?? menuNo;
}

/** 2단계 메뉴가 섹션 카드인가(하위가 있거나 연결 경로가 없다). 아니면 한 줄 카드(경로가 있고 하위가 없다). */
export function isSectionCard(items: readonly FlattenedItem[], item: FlattenedItem): boolean {
  const hasChildren = items.some((candidate) => candidate.parentId === item.menuNo);
  return hasChildren || !(item.modernRoute ?? '').trim();
}

/**
 * 놓을 곳.
 * - row: 그 줄(3단계 이하)의 앞/뒤 — 같은 상위 아래 형제가 된다.
 * - card: 2단계 카드의 머리. 줄(3단계)을 놓으면 그 카드 안 맨 뒤로, 카드(2단계)를 놓으면 그 카드의 앞/뒤(카드 순서)다.
 * - section-end: 카드 안 맨 뒤(빈 섹션 포함).
 * - area: 영역 탭·영역 머리·영역 끝 — 그 영역 바로 아래 맨 뒤(2단계)다.
 */
export type BoardDropTarget =
  | { kind: 'row'; menuNo: number; position: 'before' | 'after' }
  | { kind: 'card'; menuNo: number; position: 'before' | 'after' }
  | { kind: 'section-end'; menuNo: number }
  | { kind: 'area'; menuNo: number };

export type BoardDropResult =
  | { kind: 'move'; parent: MenuParentKey; index: number }
  | { kind: 'none' }
  | { kind: 'reject'; reason: string };

/** 끈 메뉴를 그 자리에 놓으면 어디로 가는가. 제자리면 none, 둘 수 없으면 이유와 함께 reject 다. */
export function resolveBoardDrop(
  items: readonly FlattenedItem[],
  deleted: ReadonlySet<number>,
  activeNo: number,
  target: BoardDropTarget,
): BoardDropResult {
  const active = items.find((item) => item.menuNo === activeNo);
  const over = items.find((item) => item.menuNo === target.menuNo);
  if (!active || !over) return { kind: 'none' };
  if (target.menuNo === activeNo) return { kind: 'none' };

  const into = target.kind === 'area' || target.kind === 'section-end' || (target.kind === 'card' && active.depth >= 2);
  let parent: MenuParentKey = target.menuNo;
  let index = Number.POSITIVE_INFINITY;
  if (!into && (target.kind === 'row' || target.kind === 'card')) {
    parent = parentKeyOf(over.parentId);
    const siblings = (siblingOrder(items).get(parent) ?? []).filter((id) => id !== activeNo);
    const at = siblings.indexOf(target.menuNo);
    index = at < 0 ? siblings.length : at + (target.position === 'after' ? 1 : 0);
  }
  const problem = placementProblem(items, deleted, activeNo, parent);
  if (problem) return { kind: 'reject', reason: problem };
  const next = moveBlock(items, activeNo, parent, index);
  if (next === null) return { kind: 'reject', reason: '메뉴는 3단계까지만 둘 수 있습니다.' };
  if (next === items) return { kind: 'none' };
  return { kind: 'move', parent, index };
}

/**
 * 끄는 메뉴가 놓을 곳의 위쪽 절반에 있으면 앞, 아래쪽 절반이면 뒤. 위치 정보가 없으면(키보드 센서 첫 이동 등) 앞으로 본다.
 */
export function dropPosition(
  activeRect: { top: number; height: number } | null | undefined,
  overRect: { top: number; height: number } | null | undefined,
): 'before' | 'after' {
  if (!activeRect || !overRect) return 'before';
  return activeRect.top + activeRect.height / 2 > overRect.top + overRect.height / 2 ? 'after' : 'before';
}

// ─── 끌기 식별자·놓을 자리 표시·안내 ──────────────────────────────────────────────────────────────

/** 끌기 대상(menu:)과 놓을 곳(row:·card:·section-end:·area-tab:·area-head:·area-end:) 식별자를 읽는다. */
export function parseBoardId(id: UniqueIdentifier): { kind: string; menuNo: number } | null {
  const match = /^(menu|row|card|section-end|area-tab|area-head|area-end):(-?\d+)$/.exec(String(id));
  return match ? { kind: match[1], menuNo: Number(match[2]) } : null;
}

/** 놓을 곳 식별자와 위치 → 놓을 곳. */
export function boardTargetOf(id: UniqueIdentifier, position: 'before' | 'after'): BoardDropTarget | null {
  const parsed = parseBoardId(id);
  if (!parsed) return null;
  switch (parsed.kind) {
    case 'row': return { kind: 'row', menuNo: parsed.menuNo, position };
    case 'card': return { kind: 'card', menuNo: parsed.menuNo, position };
    case 'section-end': return { kind: 'section-end', menuNo: parsed.menuNo };
    case 'area-tab':
    case 'area-head':
    case 'area-end': return { kind: 'area', menuNo: parsed.menuNo };
    default: return null;
  }
}

/**
 * 놓을 자리 표시가 '그 안으로' 인가. 표시는 놓을 곳의 종류가 아니라 **실제 결과**로 정한다 — 줄을 카드 머리에 끌면 결과는
 * 그 카드 안 맨 뒤이므로, 카드 앞·뒤 선을 그리면 눈에 보이는 자리와 실제 자리가 어긋난다.
 */
export function dropsInto(result: BoardDropResult, overId: UniqueIdentifier): boolean {
  return result.kind === 'move' && result.parent !== null && result.parent === parseBoardId(overId)?.menuNo;
}

/** 키보드로 끌 때의 지시문. 보드는 방향키 네 개로 다른 카드·영역 탭까지 옮겨 가므로 상위 메뉴도 바뀐다. */
export const MENU_BOARD_DND_INSTRUCTIONS: ScreenReaderInstructions = {
  draggable:
    '스페이스 또는 엔터 키로 메뉴 이동을 시작합니다. 방향키로 놓을 곳을 옮기고 스페이스 또는 엔터 키로 확정하며, Escape 키로 취소합니다. '
    + '다른 카드나 영역 탭 위에 놓으면 상위 메뉴가 바뀝니다. 끌지 않고 옮기려면 항목에서 Alt+위·아래 방향키, Ctrl+X 와 Ctrl+V, '
    + '또는 상세의 다른 곳으로 옮기기를 씁니다.',
};

/**
 * 끌기 안내(dnd-kit 의 자체 알림 영역). 끄는 동안에는 그 자리에 놓으면 어떻게 되는지(놓을 수 없으면 이유)를 말하고, 놓은
 * 결과는 말하지 않는다 — 옮김·거부의 결과는 화면의 결과 안내 한 곳이 말한다(같은 결과를 두 번, 또는 서로 반대로 읽지 않게).
 * 제자리에 놓았거나 놓을 곳 밖에서 놓아 화면이 아무 말도 하지 않는 경우만 여기서 말한다. 공유 문장(부서 트리와 같은
 * tree-dnd-accessibility)은 시작·옮기는 중·취소에 그대로 쓴다.
 */
export function menuBoardAnnouncements(
  nameOf: (id: UniqueIdentifier) => string | undefined,
  previewDrop: (activeNo: number, target: BoardDropTarget) => BoardDropResult,
): Announcements {
  const shared = treeDndAnnouncements('메뉴', nameOf);
  const label = (id: UniqueIdentifier) => nameOf(id) || '이름 없는 메뉴';
  const verdict = (active: Active, over: Over | null): BoardDropResult | null => {
    const dragged = parseBoardId(active.id);
    if (!dragged || dragged.kind !== 'menu' || !over) return null;
    const target = boardTargetOf(over.id, dropPosition(active.rect?.current?.translated ?? null, over.rect ?? null));
    return target ? previewDrop(dragged.menuNo, target) : null;
  };
  return {
    onDragStart: shared.onDragStart,
    onDragOver: ({ active, over }) => {
      const result = verdict(active, over);
      if (!over || !result) return shared.onDragOver({ active, over });
      if (result.kind === 'reject') return `${label(active.id)} 메뉴는 ${label(over.id)} 자리에 놓을 수 없습니다. ${result.reason}`;
      if (result.kind === 'none') return `${label(active.id)} 메뉴의 지금 자리입니다. 여기에 놓으면 바뀌는 것이 없습니다.`;
      return shared.onDragOver({ active, over });
    },
    onDragEnd: ({ active, over }) => {
      const result = verdict(active, over);
      if (!result) return `${label(active.id)} 메뉴를 놓을 곳 밖에서 놓아 옮기지 않았습니다.`;
      if (result.kind === 'none') return `${label(active.id)} 메뉴를 제자리에 두었습니다. 바뀐 것이 없습니다.`;
      return undefined;
    },
    onDragCancel: shared.onDragCancel,
  };
}

/**
 * 붙여넣기 자리. 고른 메뉴가 영역이면 그 영역 안, 2단계 카드면 카드 기준(줄은 안으로, 카드는 그 뒤로), 줄이면 그 뒤다.
 */
export function pasteTarget(items: readonly FlattenedItem[], selectedNo: number): BoardDropTarget | null {
  const selected = items.find((item) => item.menuNo === selectedNo);
  if (!selected) return null;
  if (selected.depth === 0) return { kind: 'area', menuNo: selectedNo };
  if (selected.depth === 1) return { kind: 'card', menuNo: selectedNo, position: 'after' };
  return { kind: 'row', menuNo: selectedNo, position: 'after' };
}

/** '다른 곳으로 옮기기' 대화상자의 목적지 한 줄. problem 이 있으면 그 자리는 고를 수 없다. */
export interface MoveDestination {
  parent: MenuParentKey;
  /** '최상위(새 영역)', '나의 업무', '나의 업무 › 결재' 처럼 이어 쓴 이름. */
  label: string;
  /** 0 = 최상위, 1 = 영역 바로 아래, 2 = 2단계 메뉴 아래. */
  level: number;
  /** 지금 이 메뉴의 상위인가. */
  current: boolean;
  problem: string | null;
}

/**
 * 목적지 후보 — 최상위, 영역마다(영역 바로 아래), 2단계 메뉴마다(그 아래). 삭제 예정 메뉴도 목록에는 두되 이유와 함께 막는다.
 * menuNo 가 null 이면 새 메뉴 자리다(하위가 없는 것으로 본다).
 */
export function moveDestinations(
  items: readonly FlattenedItem[],
  deleted: ReadonlySet<number>,
  menuNo: number | null,
): MoveDestination[] {
  const parentOfMenu = menuNo === null ? undefined : parentKeyOf(items.find((item) => item.menuNo === menuNo)?.parentId);
  const destinations: MoveDestination[] = [{
    parent: null,
    label: '최상위(새 영역)',
    level: 0,
    current: menuNo !== null && parentOfMenu === null,
    problem: placementProblem(items, deleted, menuNo, null),
  }];
  for (const item of items) {
    if (item.depth > 1) continue;
    destinations.push({
      parent: item.menuNo,
      label: [...ancestorIds(items, item.menuNo), item.menuNo].map((id) => menuLabel(items, id)).join(' › '),
      level: item.depth + 1,
      current: parentOfMenu === item.menuNo,
      problem: placementProblem(items, deleted, menuNo, item.menuNo),
    });
  }
  return destinations;
}

/**
 * 찾기 — 이름·메뉴 번호·연결 경로에 검색어가 든 메뉴(선순회 순서). 목록을 거르지 않는다: 화면이 일치를 강조하고 나머지를
 * 흐리게 하며, Enter 로 다음 일치로 옮겨 간다. 검색어가 비면 빈 목록이다.
 */
export function menuSearchMatches(items: readonly FlattenedItem[], keyword: string): number[] {
  const needle = keyword.trim().toLocaleLowerCase('ko-KR');
  if (!needle) return [];
  return items.filter((item) => [item.menuNm, item.menuNo > 0 ? String(item.menuNo) : '', item.modernRoute ?? '']
    .join(' ')
    .toLocaleLowerCase('ko-KR')
    .includes(needle)).map((item) => item.menuNo);
}

/** 다음 일치. 지금 고른 메뉴 뒤의 첫 일치, 없으면 처음으로 돌아간다. */
export function nextSearchMatch(matches: readonly number[], selected: number | null): number | null {
  if (matches.length === 0) return null;
  const at = selected === null ? -1 : matches.indexOf(selected);
  return matches[(at + 1) % matches.length];
}
