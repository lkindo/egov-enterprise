import { describe, expect, it } from 'vitest';
import { startDraft, type MenuDraft } from '../menuDraft';
import { EMPTY_MENU_UNDO, endMenuUndoGroup, MENU_UNDO_LIMIT, recordMenuUndo, takeMenuUndo } from '../menuUndo';

/**
 * [2026-10-05] '직전 변경 되돌리기' 이력 — 최소 50단계(시안 60단계), 같은 칸 연속 입력은 한 단계, 꺼내면 묶음이 끝난다.
 */
const draftNo = (no: number): MenuDraft => ({ ...startDraft([]), nextNew: no });

describe('menuUndo', () => {
  it('쌓은 순서의 반대로 꺼내고, 비면 null 이다', () => {
    let history = recordMenuUndo(EMPTY_MENU_UNDO, draftNo(1), '첫째');
    history = recordMenuUndo(history, draftNo(2), '둘째');
    const second = takeMenuUndo(history);
    expect(second?.step).toEqual({ draft: draftNo(2), label: '둘째' });
    const first = takeMenuUndo(second!.history);
    expect(first?.step.label).toBe('첫째');
    expect(takeMenuUndo(first!.history)).toBeNull();
  });

  it(`최소 50단계를 지키고(지금 ${MENU_UNDO_LIMIT}), 넘치면 가장 오래된 단계부터 버린다`, () => {
    expect(MENU_UNDO_LIMIT).toBeGreaterThanOrEqual(50);
    let history = EMPTY_MENU_UNDO;
    for (let index = 1; index <= MENU_UNDO_LIMIT + 5; index += 1) history = recordMenuUndo(history, draftNo(index), `단계 ${index}`);
    expect(history.steps).toHaveLength(MENU_UNDO_LIMIT);
    expect(history.steps[0].label).toBe('단계 6');
    expect(history.steps[history.steps.length - 1].label).toBe(`단계 ${MENU_UNDO_LIMIT + 5}`);
  });

  it('같은 키로 이어서 기록하면 처음 것 하나만 남고, 다른 기록이나 꺼내기가 끼면 묶음이 끝난다', () => {
    let history = recordMenuUndo(EMPTY_MENU_UNDO, draftNo(1), '이름 수정', 'edit:3:menuNm');
    history = recordMenuUndo(history, draftNo(2), '이름 수정', 'edit:3:menuNm');
    expect(history.steps).toEqual([{ draft: draftNo(1), label: '이름 수정' }]);

    history = recordMenuUndo(history, draftNo(3), '한 칸 아래로');
    history = recordMenuUndo(history, draftNo(4), '이름 수정', 'edit:3:menuNm');
    expect(history.steps.map((step) => step.draft.nextNew)).toEqual([1, 3, 4]);

    const taken = takeMenuUndo(history)!;
    const again = recordMenuUndo(taken.history, draftNo(5), '이름 수정', 'edit:3:menuNm');
    expect(again.steps.map((step) => step.draft.nextNew)).toEqual([1, 3, 5]);
  });

  it('묶음을 끝내면(다른 메뉴를 고른 때) 같은 키의 다음 기록은 새 단계다. 묶음이 없으면 같은 객체를 돌려준다', () => {
    const typing = recordMenuUndo(EMPTY_MENU_UNDO, draftNo(1), '이름 수정', 'edit:3:menuNm');
    const ended = endMenuUndoGroup(typing);
    expect(ended.lastKey).toBeNull();
    expect(ended.steps).toBe(typing.steps);
    const next = recordMenuUndo(ended, draftNo(2), '이름 수정', 'edit:3:menuNm');
    expect(next.steps.map((step) => step.draft.nextNew)).toEqual([1, 2]);

    const plain = recordMenuUndo(EMPTY_MENU_UNDO, draftNo(1), '한 칸 아래로');
    expect(endMenuUndoGroup(plain)).toBe(plain);
  });
});
