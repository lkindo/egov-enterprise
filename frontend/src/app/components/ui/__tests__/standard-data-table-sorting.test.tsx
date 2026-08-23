// Mock PointerEvent which is missing in JSDOM (radix Select 상호작용에 필요 — select.test.tsx 와 동일 패턴)
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, props: PointerEventInit = {}) {
      super(type, props);
    }
  }
  window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
}

import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Column, StandardDataTable } from '../standard-data-table';

/**
 * 정렬·페이지 크기 계약 (D3 — headless TanStack Table 전환에서 추가된 opt-in 축).
 *
 * - 정렬은 `Column.sortKey` 를 준 열에서만 켜진다. 미지정 열은 오늘과 완전히 같아야 한다
 *   (버튼 없음·aria-sort 없음). 정렬 대상은 **현재 페이지 데이터뿐**이다 — 서버 페이지네이션은
 *   그대로이므로 버튼 title 이 그 범위를 정직하게 문서화해야 한다.
 * - 페이지 크기 셀렉트는 `pagination.onPageSizeChange` 를 준 경우에만 렌더된다.
 *   기존 소비자(~57곳)는 어느 쪽도 넘기지 않으므로 DOM 이 한 글자도 달라지면 안 된다.
 */

interface Row {
  id: number;
  name: string;
  amount: number;
}

const rows: Row[] = [
  { id: 1, name: '나비', amount: 30 },
  { id: 2, name: '가람', amount: 10 },
  { id: 3, name: '다솜', amount: 20 },
];

function bodyCellTexts(columnIndex: number): string[] {
  const table = screen.getByRole('table');
  return within(table)
    .getAllByRole('row')
    .slice(1) // 머리글 행 제외
    .map((row) => within(row).getAllByRole('cell')[columnIndex].textContent ?? '');
}

describe('StandardDataTable 정렬 계약 (opt-in sortKey)', () => {
  it('sortKey 가 없는 열은 오늘과 동일하다 — 버튼도 aria-sort 도 없다', () => {
    const columns: Column<Row>[] = [
      { header: '이름', accessor: 'name' },
      { header: '금액', accessor: 'amount' },
    ];

    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    for (const th of screen.getAllByRole('columnheader')) {
      expect(th).not.toHaveAttribute('aria-sort');
    }
  });

  it('sortKey 열은 th[aria-sort] + 열 이름을 가진 버튼으로 none→asc→desc→none 을 순환하며 행을 재정렬한다', async () => {
    const user = userEvent.setup();
    const columns: Column<Row>[] = [
      { header: '이름', accessor: 'name' },
      { header: '금액', accessor: 'amount', sortKey: 'amount' },
    ];

    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);

    const amountHeader = screen.getAllByRole('columnheader')[1];
    expect(amountHeader).toHaveAttribute('aria-sort', 'none');
    // 비정렬 열은 여전히 버튼이 없다 (혼입 방지 대조군)
    expect(within(screen.getAllByRole('columnheader')[0]).queryByRole('button')).not.toBeInTheDocument();

    const sortButton = within(amountHeader).getByRole('button', { name: /금액/ });
    // 서버 페이지네이션 하에서 현재 페이지만 정렬함을 정직하게 문서화한다.
    expect(sortButton).toHaveAttribute('title', expect.stringContaining('현재 페이지'));

    expect(bodyCellTexts(1)).toEqual(['30', '10', '20']);

    await user.click(sortButton);
    expect(amountHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(bodyCellTexts(1)).toEqual(['10', '20', '30']);

    await user.click(sortButton);
    expect(amountHeader).toHaveAttribute('aria-sort', 'descending');
    expect(bodyCellTexts(1)).toEqual(['30', '20', '10']);

    await user.click(sortButton);
    expect(amountHeader).toHaveAttribute('aria-sort', 'none');
    expect(bodyCellTexts(1)).toEqual(['30', '10', '20']);
  });

  it('정렬 버튼은 키보드로 조작할 수 있다 (Enter)', async () => {
    const user = userEvent.setup();
    const columns: Column<Row>[] = [
      { header: '이름', accessor: 'name', sortKey: 'name' },
      { header: '금액', accessor: 'amount' },
    ];

    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);

    const nameHeader = screen.getAllByRole('columnheader')[0];
    const sortButton = within(nameHeader).getByRole('button', { name: /이름/ });
    sortButton.focus();
    expect(sortButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    expect(bodyCellTexts(0)).toEqual(['가람', '나비', '다솜']);
  });

  it('정렬은 함수 accessor 셀 내용을 재정렬된 순서·표시 인덱스로 정확히 1회씩만 렌더한다', async () => {
    const user = userEvent.setup();
    const nameAccessor = vi.fn((row: Row) => row.name);
    const columns: Column<Row>[] = [
      { header: '이름', accessor: nameAccessor },
      { header: '금액', accessor: 'amount', sortKey: 'amount' },
    ];

    render(<StandardDataTable columns={columns} data={rows} keyField="id" />);
    nameAccessor.mockClear();

    await user.click(screen.getByRole('button', { name: /금액/ }));

    // 정렬 상태 전환으로 발생한 재렌더에서도 accessor 는 행당 1회다(단일 렌더 계약의 정렬판).
    // userEvent 1 click 은 정렬 상태 변경 1회 → 재렌더 렌더 패스에서 행×열당 1회.
    expect(nameAccessor).toHaveBeenCalledTimes(rows.length);
    // 금액 asc(10·20·30) 순서의 이름 열 = 가람·다솜·나비
    expect(bodyCellTexts(0)).toEqual(['가람', '다솜', '나비']);
  });
});

describe('StandardDataTable 페이지 크기 계약 (opt-in onPageSizeChange)', () => {
  const columns: Column<Row>[] = [{ header: '이름', accessor: 'name' }];
  const basePagination = {
    currentPage: 1,
    totalPages: 3,
    totalCount: 25,
    pageSize: 10,
    onPageChange: vi.fn(),
  };

  it('onPageSizeChange 가 없으면 셀렉트를 렌더하지 않는다 — 기존 소비자 무변화', () => {
    render(
      <StandardDataTable
        columns={columns}
        data={rows}
        keyField="id"
        pagination={{ ...basePagination }}
      />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('페이지당 항목 수')).not.toBeInTheDocument();
  });

  it('onPageSizeChange 를 주면 요약 옆 셀렉트가 기본 선택지 [10,20,50,100] 로 렌더되고 숫자로 콜백한다', async () => {
    const onPageSizeChange = vi.fn();
    render(
      <StandardDataTable
        columns={columns}
        data={rows}
        keyField="id"
        pagination={{ ...basePagination, onPageSizeChange }}
      />,
    );

    const trigger = screen.getByLabelText('페이지당 항목 수');
    fireEvent.click(trigger);
    // '10개씩'은 SelectValue(트리거 표시값)에도 존재하므로 option role 로 목록만 조회한다.
    for (const size of [10, 20, 50, 100]) {
      expect(await screen.findByRole('option', { name: `${size}개씩` })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('option', { name: '50개씩' }));

    expect(onPageSizeChange).toHaveBeenCalledExactlyOnceWith(50);
  });

  it('pageSizeOptions 를 주면 그 선택지만 렌더한다', async () => {
    const onPageSizeChange = vi.fn();
    render(
      <StandardDataTable
        columns={columns}
        data={rows}
        keyField="id"
        pagination={{ ...basePagination, onPageSizeChange, pageSizeOptions: [5, 15] }}
      />,
    );

    fireEvent.click(screen.getByLabelText('페이지당 항목 수'));
    expect(await screen.findByRole('option', { name: '5개씩' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '15개씩' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '100개씩' })).not.toBeInTheDocument();
  });
});
