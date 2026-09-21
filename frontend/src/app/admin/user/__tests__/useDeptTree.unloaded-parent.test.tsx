/**
 * GAP-DEPT-001 — 조직도의 "상위를 모른다" 표시가 드래그에서 어떻게 풀리는가.
 *
 * 부서 검색은 `ognzNm` 만 보므로 좁힌 결과에서 상위가 빠질 수 있다. 그 노드는 루트로 그려지지만
 * `unloadedParentId` 가 "비어서가 아니라 몰라서" 임을 들고 있고, 저장 액션은 그런 노드를 전송에서
 * 뺀다(userDeptActions.test.ts 가 고정).
 *
 * ⚠ 그러면 **사용자가 그 부서를 직접 끌었을 때** 반영되어야 한다. 표시를 해제하지 않으면 저장이
 *   계속 제외해, 끌리기는 하는데 저장은 안 되는 죽은 조작이 된다 — 보호가 새 결함이 되는 경로다.
 *   이 파일이 그 해제를 고정한다.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeptTree } from '../useDeptTree';
import type { Department } from '@/services/foundation/system/DeptAdminService';
import type { FlattenedDept } from '../departments/treeUtils';
import type { PageResponse } from '@/types/foundation/system';

vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: { getDeptList: vi.fn() },
}));

const ROOT: Department = { ognzId: 'ROOT', ognzNm: '본부' };
/** 상위(MISSING)가 조회 결과에 없다 — 검색으로 좁혔을 때 실제로 일어나는 모양이다. */
const ORPHAN: Department = { ognzId: 'ORPHAN', ognzNm: '외부팀', upOgnzId: 'MISSING' };

const seed: PageResponse<Department> = { list: [ROOT, ORPHAN], total: 2, page: 1, size: 1000, totalPage: 1 };

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const renderTree = () =>
  renderHook(
    () => useDeptTree({ deptKeyword: '', initialDepts: seed, enabled: true, onDragSelect: () => {} }),
    { wrapper }
  );

const findNode = (items: readonly FlattenedDept[], id: string): FlattenedDept =>
  items.find((n) => n.ognzId === id)!;

describe('useDeptTree — 상위를 모르는 부서의 드래그', () => {
  beforeEach(async () => {
    const { deptAdminService } = await import('@/services/foundation/system/DeptAdminService');
    vi.mocked(deptAdminService.getDeptList).mockResolvedValue(seed);
  });

  it('끌지 않으면 표시가 남아 저장이 상위를 건드리지 않는다', async () => {
    const { result } = renderTree();

    await waitFor(() => expect(result.current.flattenedDepts).toHaveLength(2));

    const orphan = findNode(result.current.flattenedDepts, 'ORPHAN');
    expect(orphan.unloadedParentId).toBe('MISSING');
    // 변경이 없으므로 저장 버튼도 열리지 않는다.
    expect(result.current.hasDeptChanges).toBe(false);
  });

  it('직접 끌면 표시가 풀리고 새 상위가 반영된다', async () => {
    const { result } = renderTree();

    await waitFor(() => expect(result.current.flattenedDepts).toHaveLength(2));

    // dnd-kit 이 실제로 내는 순서 그대로 — 시작 → 가로 이동 → 놓기.
    // 각 단계를 따로 act 로 감싸야 투영(useMemo)이 다시 계산된 상태에서 onDragEnd 가 읽는다.
    act(() => result.current.dragHandlers.onDragStart({ active: { id: 'ORPHAN' } } as never));
    // INDENTATION_WIDTH(24px)만큼 오른쪽으로 밀어야 depth 가 +1 되어 바로 위 노드가 상위가 된다.
    act(() => result.current.dragHandlers.onDragMove({ delta: { x: 24 } } as never));
    act(() =>
      result.current.dragHandlers.onDragEnd({ active: { id: 'ORPHAN' }, over: { id: 'ORPHAN' } } as never)
    );

    const orphan = findNode(result.current.flattenedDepts, 'ORPHAN');
    // ⚠ 이 줄이 red 가 되면 '끌어도 저장되지 않는' 죽은 조작으로 되돌아간 것이다.
    expect(orphan.unloadedParentId).toBeNull();
    expect(orphan.parentId).toBe('ROOT');
    expect(orphan.depth).toBe(1);
    expect(result.current.hasDeptChanges).toBe(true);
  });

  it('가로로 밀지 않고 제자리에 놓으면 변경으로 보지 않는다', async () => {
    const { result } = renderTree();

    await waitFor(() => expect(result.current.flattenedDepts).toHaveLength(2));

    // onDragMove 없이 — 즉 delta.x 가 0 이라 깊이·상위가 그대로다.
    act(() => result.current.dragHandlers.onDragStart({ active: { id: 'ORPHAN' } } as never));
    act(() =>
      result.current.dragHandlers.onDragEnd({ active: { id: 'ORPHAN' }, over: { id: 'ORPHAN' } } as never)
    );

    // 저장 버튼이 켜지면 바꿀 것이 없는데 바꾼다고 말하는 컨트롤이 된다(G10).
    expect(result.current.hasDeptChanges).toBe(false);
  });

  it('끈 부서만 표시가 풀린다 — 함께 있던 다른 부서는 그대로다', async () => {
    const withSecondOrphan: PageResponse<Department> = {
      ...seed,
      list: [ROOT, ORPHAN, { ognzId: 'OTHER', ognzNm: '기타팀', upOgnzId: 'ALSO_MISSING' }],
      total: 3,
    };
    const { deptAdminService } = await import('@/services/foundation/system/DeptAdminService');
    vi.mocked(deptAdminService.getDeptList).mockResolvedValue(withSecondOrphan);

    const { result } = renderHook(
      () => useDeptTree({ deptKeyword: '', initialDepts: withSecondOrphan, enabled: true, onDragSelect: () => {} }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.flattenedDepts).toHaveLength(3));

    act(() => result.current.dragHandlers.onDragStart({ active: { id: 'ORPHAN' } } as never));
    act(() => result.current.dragHandlers.onDragMove({ delta: { x: 24 } } as never));
    act(() =>
      result.current.dragHandlers.onDragEnd({ active: { id: 'ORPHAN' }, over: { id: 'ORPHAN' } } as never)
    );

    const moved = findNode(result.current.flattenedDepts, 'ORPHAN');
    const untouched = findNode(result.current.flattenedDepts, 'OTHER');
    expect(moved.unloadedParentId).toBeNull();
    // 해제가 전역으로 번지면 안 만진 부서의 상위까지 저장이 지운다 — 원래 결함으로 되돌아간다.
    expect(untouched.unloadedParentId).toBe('ALSO_MISSING');
  });
});
