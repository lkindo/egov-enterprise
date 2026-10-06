import { describe, expect, it } from 'vitest';
import { treeDndAnnouncements, treeDndInstructions } from '@/lib/dnd/tree-dnd-accessibility';

/**
 * [2026-10-01] 트리의 한국어 드래그 안내.
 *
 * [2026-10-07] 메뉴 상위 변경의 키보드 대안(menuParentCandidates) 계약을 걷었다. DEC-OPS-209 보드 재작성 뒤
 * 그 선택지는 menuBoardModel 의 moveDestinations 와 menuDraft 의 placementProblem 이 같은 규칙(자기·하위 제외,
 * 3단계 상한)으로 만들고, menuBoardModel.test.ts·menuDraft.test.ts 가 검증한다.
 */

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
