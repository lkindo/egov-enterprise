import { render, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { clampPage, usePageClamp } from '../use-page-clamp';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';

/**
 * [2026-09-26 DIP C4] 마지막 페이지의 항목을 처리해 그 페이지가 비면 마지막 페이지로 되돌린다.
 * 조회 중·오류일 때의 총 페이지는 초기값이므로 되돌리면 딥링크 페이지를 잃는다.
 */
describe('clampPage', () => {
  it('마지막 페이지를 넘을 때만 되돌릴 페이지를 준다', () => {
    expect(clampPage(3, 2)).toBe(2);
    expect(clampPage(2, 2)).toBeNull();
    expect(clampPage(1, 0)).toBeNull();
    expect(clampPage(4, 0)).toBe(1);
  });
});

describe('usePageClamp', () => {
  it('조회 결과를 믿을 수 있을 때 한 번만 되돌린다', () => {
    const onPageChange = vi.fn();
    const { rerender } = renderHook((props: { page: number; totalPages: number; ready: boolean }) => usePageClamp({ ...props, onPageChange }), {
      initialProps: { page: 3, totalPages: 1, ready: false },
    });
    expect(onPageChange).not.toHaveBeenCalled();

    rerender({ page: 3, totalPages: 2, ready: true });
    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);

    // 호출부가 아직 페이지를 반영하지 않아 같은 값으로 다시 그려져도 반복 요청하지 않는다.
    rerender({ page: 3, totalPages: 2, ready: true });
    expect(onPageChange).toHaveBeenCalledTimes(1);

    rerender({ page: 2, totalPages: 2, ready: true });
    expect(onPageChange).toHaveBeenCalledTimes(1);
  });
});

interface Row { id: number; name: string }
const columns: Column<Row>[] = [{ header: '이름', accessor: 'name' }];

describe('StandardDataTable 페이지 되돌림', () => {
  it('빈 마지막 페이지를 마지막 페이지로 되돌리고, 조회 중이거나 오류이면 그대로 둔다', () => {
    const onPageChange = vi.fn();
    const table = (props: { loading?: boolean; error?: unknown }) => (
      <StandardDataTable
        columns={columns}
        data={[]}
        keyField="id"
        pagination={{ currentPage: 3, totalPages: 2, onPageChange }}
        {...props}
      />
    );
    const { rerender } = render(table({ loading: true }));
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(table({ error: new Error('조회 실패') }));
    expect(onPageChange).not.toHaveBeenCalled();

    rerender(table({}));
    expect(onPageChange).toHaveBeenCalledExactlyOnceWith(2);
  });
});
