/**
 * [2026-09-26 DIP C5] 저장하지 않은 드래그와 재조회.
 *
 * 종전에는 부서 목록이 다시 조회되면 트리를 서버 순서로 다시 그려 드래그가 조용히 사라졌는데 '변경됨' 은 남았다.
 * 사용자는 저장을 눌렀고, 서버에는 아무것도 바뀌지 않았다.
 */
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeptTree } from '../useDeptTree';
import type { Department } from '@/services/foundation/system/DeptAdminService';
import type { PageResponse } from '@/types/foundation/system';

vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: { getDeptList: vi.fn() },
}));

const ROOT: Department = { ognzId: 'ROOT', ognzNm: '본부' };
const A: Department = { ognzId: 'A', ognzNm: '가팀', upOgnzId: 'ROOT' };
const B: Department = { ognzId: 'B', ognzNm: '나팀', upOgnzId: 'ROOT' };
const C: Department = { ognzId: 'C', ognzNm: '다팀', upOgnzId: 'ROOT' };

const page = (list: Department[]): PageResponse<Department> => ({ list, total: list.length, page: 1, size: 1000, totalPage: 1 });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

const order = (items: readonly { ognzId?: string }[]) => items.map((item) => item.ognzId);

async function renderWithReorder() {
  const { deptAdminService } = await import('@/services/foundation/system/DeptAdminService');
  vi.mocked(deptAdminService.getDeptList).mockResolvedValue(page([ROOT, A, B]));
  const view = renderHook(
    () => useDeptTree({ deptKeyword: '', initialDepts: page([ROOT, A, B]), enabled: true, onDragSelect: () => {} }),
    { wrapper },
  );
  await waitFor(() => expect(view.result.current.flattenedDepts).toHaveLength(3));
  // 나팀을 가팀 위로 끈다.
  act(() => view.result.current.dragHandlers.onDragStart({ active: { id: 'B' } } as never));
  act(() => view.result.current.dragHandlers.onDragEnd({ active: { id: 'B' }, over: { id: 'A' } } as never));
  expect(order(view.result.current.flattenedDepts)).toEqual(['ROOT', 'B', 'A']);
  expect(view.result.current.hasDeptChanges).toBe(true);
  return { view, deptAdminService };
}

describe('useDeptTree — 저장하지 않은 드래그와 재조회 (DIP C5)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('변경이 있는 동안 다시 조회해도 드래그한 순서를 지키고, 목록이 바뀌었다고 알린다', async () => {
    const { view, deptAdminService } = await renderWithReorder();
    vi.mocked(deptAdminService.getDeptList).mockResolvedValue(page([ROOT, A, B, C]));

    await act(async () => { await view.result.current.refetchDepts(); });

    await waitFor(() => expect(view.result.current.deptListChangedWhileEditing).toBe(true));
    expect(order(view.result.current.flattenedDepts)).toEqual(['ROOT', 'B', 'A']);
    expect(view.result.current.hasDeptChanges).toBe(true);
  });

  it('변경을 취소하면 최신 목록으로 돌아가고 기준선도 그 목록이 된다', async () => {
    const { view, deptAdminService } = await renderWithReorder();
    vi.mocked(deptAdminService.getDeptList).mockResolvedValue(page([ROOT, A, B, C]));
    await act(async () => { await view.result.current.refetchDepts(); });
    await waitFor(() => expect(view.result.current.deptListChangedWhileEditing).toBe(true));

    act(() => view.result.current.discardDeptChanges());

    expect(order(view.result.current.flattenedDepts)).toEqual(['ROOT', 'A', 'B', 'C']);
    expect(order(view.result.current.baselineDepts)).toEqual(['ROOT', 'A', 'B', 'C']);
    expect(view.result.current.hasDeptChanges).toBe(false);
    expect(view.result.current.deptListChangedWhileEditing).toBe(false);
  });

  it('저장에 성공하면 지금 화면이 새 기준선이 된다', async () => {
    const { view } = await renderWithReorder();
    expect(order(view.result.current.baselineDepts)).toEqual(['ROOT', 'A', 'B']);

    act(() => view.result.current.markDeptChangesSaved());

    expect(order(view.result.current.baselineDepts)).toEqual(['ROOT', 'B', 'A']);
    expect(view.result.current.hasDeptChanges).toBe(false);
  });
});
