import type { MenuDraft } from './menuDraft';

/**
 * [2026-10-05] 메뉴 구조 초안의 '직전 변경 되돌리기'(도구 막대 단추·Ctrl+Z) 이력. 초안은 불변 객체라 바꾸기 전 초안을 그대로
 * 쌓는다(복사 비용이 없다). 항목별 되돌리기·모두 되돌리기(변경 목록)는 기준선 대비 계산이고, 이 이력은 '방금 한 일' 순서다.
 *
 * - 쌓는 수는 MENU_UNDO_LIMIT(100)까지다 — 넘으면 가장 오래된 단계부터 버린다(시안 60단계, 요구 최소 50단계).
 * - 같은 칸을 이어서 입력하면 한 단계로 묶는다(키가 같은 연속 기록) — 이름 한 글자마다 한 단계가 되면 되돌리기가 쓸모없다.
 *   다른 일을 하거나 되돌리면 묶음이 끝난다.
 * - 저장·다시 불러오기로 기준선이 바뀌면 부르는 쪽이 이력을 비운다(EMPTY_MENU_UNDO) — 쌓인 초안은 옛 기준선의 것이다.
 */
export const MENU_UNDO_LIMIT = 100;

export interface MenuUndoStep {
  /** 그 일을 하기 전의 초안. */
  draft: MenuDraft;
  /** 되돌릴 일의 짧은 이름(예: '결재함 한 칸 아래로'). 되돌렸다는 안내에 쓴다. */
  label: string;
}

export interface MenuUndoHistory {
  steps: readonly MenuUndoStep[];
  /** 마지막 기록의 묶음 키(묶지 않는 기록이면 null). */
  lastKey: string | null;
}

export const EMPTY_MENU_UNDO: MenuUndoHistory = { steps: [], lastKey: null };

/** 일을 하기 전 초안을 쌓는다. 키가 직전 기록과 같으면(같은 칸을 이어 입력) 새로 쌓지 않는다. */
export function recordMenuUndo(
  history: MenuUndoHistory,
  previous: MenuDraft,
  label: string,
  key: string | null = null,
  limit = MENU_UNDO_LIMIT,
): MenuUndoHistory {
  if (key !== null && key === history.lastKey) return history;
  return { steps: [...history.steps, { draft: previous, label }].slice(-limit), lastKey: key };
}

/**
 * 묶음을 끝낸다(다른 메뉴를 고른 때 등) — 같은 칸이라도 다음 입력은 새 단계다. 메뉴 B 를 골랐다가 A 로 돌아와 이름을 다시
 * 치면 앞의 입력과 다른 일이다. 묶음이 없으면 같은 객체를 돌려준다(상태를 바꾸지 않는다).
 */
export function endMenuUndoGroup(history: MenuUndoHistory): MenuUndoHistory {
  return history.lastKey === null ? history : { steps: history.steps, lastKey: null };
}

/** 마지막 단계를 꺼낸다. 없으면 null. 꺼내면 묶음이 끝난다. */
export function takeMenuUndo(history: MenuUndoHistory): { history: MenuUndoHistory; step: MenuUndoStep } | null {
  const step = history.steps[history.steps.length - 1];
  if (!step) return null;
  return { history: { steps: history.steps.slice(0, -1), lastKey: null }, step };
}
