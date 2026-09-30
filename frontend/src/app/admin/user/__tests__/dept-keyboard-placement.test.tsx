import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { reparentFlattened, shiftFlattened, type FlattenedDept } from '../departments/treeUtils';
import { DeptPlacementControls } from '../DeptPlacementControls';

/**
 * [2026-10-01] 조직도 드래그의 키보드 대안. 키보드 센서는 순서만 옮기고 상위(깊이)를 바꾸지 못해 키보드 사용자는
 * 부서를 다른 부서 아래로 옮길 수 없었다(WCAG 2.1.1). 옮긴 결과는 드래그와 같은 평탄화 목록에 반영돼 같은 저장을 탄다.
 */
const dept = (ognzId: string, parentId: string | null, depth: number, extra: Partial<FlattenedDept> = {}): FlattenedDept =>
  ({ ognzId, ognzNm: `${ognzId}팀`, parentId, depth, index: 0, unloadedParentId: null, ...extra }) as FlattenedDept;

// A ─ A1 ─ A1a
//   └ A2
// B
const tree = (): FlattenedDept[] => [
  dept('A', null, 0), dept('A1', 'A', 1), dept('A1a', 'A1', 2), dept('A2', 'A', 1), dept('B', null, 0),
];
const shape = (items: FlattenedDept[] | null) => items?.map((d) => `${d.ognzId}:${d.parentId ?? '-'}:${d.depth}`);

describe('reparentFlattened', () => {
  it('하위 부서까지 함께 새 상위의 마지막 하위 뒤로 옮기고 깊이를 맞춘다', () => {
    expect(shape(reparentFlattened(tree(), 'A1', 'B'))).toEqual([
      'A:-:0', 'A2:A:1', 'B:-:0', 'A1:B:1', 'A1a:A1:2',
    ]);
  });

  it('최상위로 옮기면 맨 뒤 최상위가 된다', () => {
    expect(shape(reparentFlattened(tree(), 'A1', null))).toEqual([
      'A:-:0', 'A2:A:1', 'B:-:0', 'A1:-:0', 'A1a:A1:1',
    ]);
  });

  it('자기 자신·자기 하위를 상위로 고르거나 상위가 그대로면 바꾸지 않는다', () => {
    expect(reparentFlattened(tree(), 'A1', 'A1')).toBeNull();
    expect(reparentFlattened(tree(), 'A1', 'A1a')).toBeNull();
    expect(reparentFlattened(tree(), 'A1', 'A')).toBeNull();
  });

  it('상위를 모르던 부서도 사용자가 고르면 그 자리로 확정한다', () => {
    const items = [dept('X', null, 0, { unloadedParentId: 'GONE' }), dept('B', null, 0)];
    const moved = reparentFlattened(items, 'X', 'B');
    expect(moved?.find((d) => d.ognzId === 'X')).toMatchObject({ parentId: 'B', depth: 1, unloadedParentId: null });
  });
});

describe('shiftFlattened', () => {
  it('같은 상위 안에서 하위 부서와 함께 한 칸 옮긴다', () => {
    expect(shape(shiftFlattened(tree(), 'A2', 'up'))).toEqual(['A:-:0', 'A2:A:1', 'A1:A:1', 'A1a:A1:2', 'B:-:0']);
    expect(shape(shiftFlattened(tree(), 'A', 'down'))).toEqual(['B:-:0', 'A:-:0', 'A1:A:1', 'A1a:A1:2', 'A2:A:1']);
  });

  it('형제가 없는 쪽으로는 옮기지 않고, 상위를 모르는 부서는 형제를 알 수 없어 옮기지 않는다', () => {
    expect(shiftFlattened(tree(), 'A1', 'up')).toBeNull();
    expect(shiftFlattened(tree(), 'B', 'down')).toBeNull();
    expect(shiftFlattened([dept('X', null, 0, { unloadedParentId: 'GONE' }), dept('B', null, 0)], 'X', 'down')).toBeNull();
  });
});

describe('DeptPlacementControls', () => {
  it('자기·하위는 상위 선택지에서 빼고, 옮긴 결과와 저장이 필요하다는 사실을 알린다', async () => {
    const onMoveToParent = vi.fn(() => true);
    const onShift = vi.fn(() => false);
    const items = tree();
    render(<DeptPlacementControls dept={items[1]} depts={items} onMoveToParent={onMoveToParent} onShift={onShift} />);

    const select = screen.getByRole('combobox', { name: '상위 부서' });
    const options = Array.from((select as HTMLSelectElement).options).map((o) => o.value);
    expect(options).toEqual(['', 'A', 'A2', 'B']);

    await userEvent.selectOptions(select, 'B');
    await userEvent.click(screen.getByRole('button', { name: '상위 부서로 옮기기' }));
    expect(onMoveToParent).toHaveBeenCalledWith('A1', 'B');
    expect(screen.getByRole('status')).toHaveTextContent('A1팀 부서를 B팀 아래로 옮겼습니다. 조직 계층 저장을 눌러야 반영됩니다.');

    await userEvent.click(screen.getByRole('button', { name: '한 칸 위로' }));
    expect(onShift).toHaveBeenCalledWith('A1', 'up');
    expect(screen.getByRole('status')).toHaveTextContent('더 위로 옮길 수 없습니다');
  });
});
