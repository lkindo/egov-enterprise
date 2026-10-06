import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';
import { deptAdminService, type Department } from '@/services/foundation/system/DeptAdminService';
import { useDeptTree } from '../useDeptTree';

/*
  부서 트리는 배열 응답이라 앱 QueryClient 의 목록 규칙(DEC-OPS-147 C1·C2, 페이지 모양에만 적용)이 닿지 않는다.
  2026-10-06 정비(PR #846)로 페이지 응답에서 배열 응답으로 바뀌면서 그 보호가 조용히 빠졌고, 같은 파일의 다른
  테스트는 기본값 없는 QueryClient 를 써서 이를 보지 못했다. 그래서 여기서는 반드시 앱 QueryClient 로 렌더한다.
*/
vi.mock('@/services/foundation/system/DeptAdminService', () => ({
  deptAdminService: { getDeptTree: vi.fn() },
}));

const TREE: Department[] = [
  { ognzId: 'ROOT', ognzNm: '본부' },
  { ognzId: 'TEAM-A', ognzNm: '가팀', upOgnzId: 'ROOT' },
  { ognzId: 'TEAM-B', ognzNm: '나팀', upOgnzId: 'ROOT' },
];

const serverError = () => Object.assign(new Error('tree unavailable'), { response: { status: 503 } });

class CatchBoundary extends React.Component<{ onError: (error: unknown) => void; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: unknown) { this.props.onError(error); }
  render() { return this.state.failed ? null : this.props.children; }
}

function renderTree(initialDepts: Department[] | null, initialKeyword = '') {
  const client = createAppQueryClient();
  // 재시도 대기만 없앤다. throwOnError·placeholderData 는 앱 기본값 그대로 둔다.
  client.setQueryDefaults(['admin-depts'], { retry: false });
  const caught: unknown[] = [];
  const rendered = renderHook(
    ({ keyword }) => useDeptTree({ deptKeyword: keyword, initialDepts, enabled: true, onDragSelect: () => {} }),
    {
      initialProps: { keyword: initialKeyword },
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={client}>
          <CatchBoundary onError={(error) => caught.push(error)}>{children}</CatchBoundary>
        </QueryClientProvider>
      ),
    },
  );
  return { ...rendered, caught };
}

describe('useDeptTree — 앱 QueryClient 목록 규칙', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('검색어를 바꾸는 동안 이전 트리를 유지한다(C1)', async () => {
    vi.mocked(deptAdminService.getDeptTree).mockReturnValue(new Promise<Department[]>(() => {}));
    const { result, rerender } = renderTree(TREE);
    expect(result.current.departments).toHaveLength(3);

    rerender({ keyword: '가팀' });

    await waitFor(() => expect(deptAdminService.getDeptTree).toHaveBeenCalledWith('가팀'));
    expect(result.current.departments).toHaveLength(3);
    expect(result.current.flattenedDepts).toHaveLength(3);
  });

  it('이전 트리를 보여 주는 동안에는 새 검색어의 결과라고 말하지 않는다(C1 보조)', async () => {
    // 0건 검색 뒤 다음 검색어를 조회하면 응답 전까지 빈 이전 결과가 남는다. 그때 건수를 0 으로, 빈 결과를
    // 새 검색어의 '없습니다' 로 말하지 않도록 훅이 자리 표시 상태를 알린다.
    let resolveNext: (value: Department[]) => void = () => {};
    vi.mocked(deptAdminService.getDeptTree)
      .mockResolvedValueOnce([])
      .mockReturnValueOnce(new Promise<Department[]>((resolve) => { resolveNext = resolve; }));
    const { result, rerender } = renderTree(TREE, '없는부서');
    await waitFor(() => expect(result.current.deptTotal).toBe(0));
    expect(result.current.isDeptsPlaceholder).toBe(false);

    rerender({ keyword: '가팀' });

    await waitFor(() => expect(deptAdminService.getDeptTree).toHaveBeenCalledWith('가팀'));
    expect(result.current.isDeptsPlaceholder).toBe(true);
    expect(result.current.deptTotal).toBeUndefined();

    await act(async () => { resolveNext([TREE[1]]); });

    await waitFor(() => expect(result.current.isDeptsPlaceholder).toBe(false));
    expect(result.current.deptTotal).toBe(1);
  });

  it('검색 조회의 5xx 는 인라인 오류로 남기고 저장하지 않은 계층 편집을 지킨다(C2)', async () => {
    vi.mocked(deptAdminService.getDeptTree).mockRejectedValue(serverError());
    const { result, rerender, caught } = renderTree(TREE);

    act(() => { expect(result.current.moveDeptToParent('TEAM-B', 'TEAM-A')).toBe(true); });
    rerender({ keyword: '나팀' });

    await waitFor(() => expect(result.current.isDeptsError).toBe(true));
    expect(caught).toHaveLength(0);
    expect(result.current.hasDeptChanges).toBe(true);
    expect(result.current.flattenedDepts.find((node) => node.ognzId === 'TEAM-B')).toMatchObject({ parentId: 'TEAM-A' });
  });

  it('검색어 없는 최초 로드의 5xx 는 종전대로 오류 경계로 올린다', async () => {
    vi.mocked(deptAdminService.getDeptTree).mockRejectedValue(serverError());
    const { caught } = renderTree(null);

    await waitFor(() => expect(caught).toHaveLength(1));
    expect((caught[0] as { response?: { status?: number } }).response?.status).toBe(503);
  });
});
