import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deptAdminService, type Department } from '@/services/foundation/system/DeptAdminService';
import { useDeptTree } from '../useDeptTree';

vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: { getDeptTree: vi.fn() },
}));

// 상위가 1,001번째여도 자식의 소속이 누락되지 않아야 한다.
const FULL_TREE: Department[] = [
  ...Array.from({ length: 1000 }, (_, index) => ({
    ognzId: `TEAM-${index}`, ognzNm: `팀 ${index}`, upOgnzId: 'ROOT',
  })),
  { ognzId: 'ROOT', ognzNm: '본부' },
];

function renderTree(initialDepts: Department[] | null = null, initialKeyword = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return renderHook(
    ({ keyword }) => useDeptTree({ deptKeyword: keyword, initialDepts, enabled: true, onDragSelect: () => {} }),
    {
      initialProps: { keyword: initialKeyword },
      wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
    },
  );
}

describe('useDeptTree — 전량 조회와 검색', () => {
  beforeEach(() => vi.resetAllMocks());

  it('페이지 상한 없이 1,001개를 조회하고 마지막 상위까지 연결한다', async () => {
    vi.mocked(deptAdminService.getDeptTree).mockResolvedValue(FULL_TREE);
    const { result } = renderTree();

    await waitFor(() => expect(result.current.flattenedDepts).toHaveLength(1001));

    expect(deptAdminService.getDeptTree).toHaveBeenCalledWith('');
    expect(result.current.departments).toHaveLength(1001);
    expect(result.current.deptTotal).toBe(1001);
    expect(result.current.flattenedDepts.find((node) => node.ognzId === 'TEAM-999'))
      .toMatchObject({ parentId: 'ROOT', depth: 1, unloadedParentId: null });
  });

  it('서버 전량 seed도 잘라내지 않고 첫 렌더에 사용한다', () => {
    const { result } = renderTree(FULL_TREE);

    expect(result.current.flattenedDepts).toHaveLength(1001);
    expect(result.current.deptTotal).toBe(1001);
    expect(deptAdminService.getDeptTree).not.toHaveBeenCalled();
  });

  it('검색에서는 전체 seed를 재사용하지 않고 조회 결과의 미로드 상위를 보존한다', async () => {
    vi.mocked(deptAdminService.getDeptTree).mockResolvedValue([FULL_TREE[0]]);
    const { result, rerender } = renderTree(FULL_TREE);

    rerender({ keyword: '팀 0' });

    await waitFor(() => expect(result.current.departments).toHaveLength(1));
    expect(deptAdminService.getDeptTree).toHaveBeenCalledWith('팀 0');
    expect(result.current.deptTotal).toBe(1);
    expect(result.current.flattenedDepts[0]).toMatchObject({ ognzId: 'TEAM-0', unloadedParentId: 'ROOT' });
  });

  it('조회 실패를 정상적인 빈 목록의 전체 건수 0으로 바꾸지 않는다', async () => {
    vi.mocked(deptAdminService.getDeptTree).mockRejectedValue(new Error('tree unavailable'));
    const { result } = renderTree();

    await waitFor(() => expect(result.current.isDeptsError).toBe(true));

    expect(result.current.deptTotal).toBeUndefined();
    expect(result.current.deptsError).toBeInstanceOf(Error);
  });
});
