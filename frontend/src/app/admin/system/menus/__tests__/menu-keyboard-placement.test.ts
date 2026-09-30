import { describe, expect, it } from 'vitest';
import { menuParentCandidates, type FlattenedItem } from '../treeUtils';
import { treeDndAnnouncements, treeDndInstructions } from '@/lib/dnd/tree-dnd-accessibility';

/**
 * [2026-10-01] 메뉴 상위 변경의 키보드 대안(수정 창의 상위 메뉴 선택)과 트리의 한국어 드래그 안내.
 */
const menu = (menuNo: number, parentId: number | null, depth: number): FlattenedItem =>
  ({ menuNo, menuNm: `메뉴${menuNo}`, parentId, depth, index: 0 }) as unknown as FlattenedItem;

// 1 ─ 2 ─ 3
// 4 ─ 5
const items = [menu(1, null, 0), menu(2, 1, 1), menu(3, 2, 2), menu(4, null, 0), menu(5, 4, 1)];
const ids = (list: FlattenedItem[]) => list.map((m) => m.menuNo);

describe('menuParentCandidates', () => {
  it('자기 자신과 하위 메뉴는 빼고, 옮긴 뒤 3단계를 넘는 자리도 뺀다', () => {
    // 메뉴 2 는 하위(3)가 있어 높이 1 이다 — 깊이 0 인 메뉴 아래만 3단계 안에 든다.
    expect(ids(menuParentCandidates(items, 2))).toEqual([1, 4]);
    // 하위가 없는 메뉴 5 는 깊이 1 인 메뉴 아래까지 갈 수 있다(자기 자신은 뺀다).
    expect(ids(menuParentCandidates(items, 5))).toEqual([1, 2, 4]);
  });

  it('새 메뉴는 하위가 없는 것으로 보고 3단계 제한만 적용한다', () => {
    expect(ids(menuParentCandidates(items))).toEqual([1, 2, 4, 5]);
  });
});

describe('트리 드래그 한국어 안내', () => {
  const nameOf = (id: string | number) => ({ 1: '인사', 2: '급여' } as Record<string, string>)[String(id)];

  it('무엇을 어디로 옮기는지 한국어로 말하고, 저장해야 반영된다는 사실을 알린다', () => {
    const announcements = treeDndAnnouncements('메뉴', nameOf);
    const active = { id: 1 } as never;
    const over = { id: 2 } as never;
    expect(announcements.onDragStart({ active })).toBe('인사 메뉴 이동을 시작했습니다.');
    expect(announcements.onDragOver({ active, over })).toBe('인사 메뉴를 급여 자리로 옮기는 중입니다.');
    expect(announcements.onDragEnd({ active, over })).toBe('인사 메뉴를 급여 자리로 옮겼습니다. 저장해야 반영됩니다.');
    expect(announcements.onDragCancel({ active, over: null })).toBe('인사 메뉴 이동을 취소했습니다.');
  });

  it('지시문은 상위를 바꾸는 다른 길을 알린다 — 키보드로는 깊이를 바꿀 수 없다', () => {
    expect(treeDndInstructions('부서', '상세의 부서 자리 바꾸기').draggable)
      .toContain('상위 부서를 바꾸려면 상세의 부서 자리 바꾸기를 씁니다.');
  });
});
