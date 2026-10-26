import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoardListFilters } from '../BoardListFilters';

const props = {
  searchWrd: '',
  setSearchWrd: vi.fn(),
  searchCnd: '0',
  setSearchCnd: vi.fn(),
  orderBy: 'date',
  setOrderBy: vi.fn(),
  setStartDate: vi.fn(),
  setEndDate: vi.fn(),
  onSearch: vi.fn(),
  onReset: vi.fn(),
};

describe('BoardListFilters SSR first DOM', () => {
  it('mount effect를 기다리지 않고 검색·기간·정렬 제어를 모두 제공한다', () => {
    render(<BoardListFilters {...props} />);

    expect(screen.getByRole('combobox', { name: '검색 조건 선택' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '기간 선택' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '정렬 방식 선택' })).toBeInTheDocument();
  });

  // [2026-10-26 ADR-0043 UX-13] 캘린더는 달 이동이 곧 기간이다 — 기간 선택의 시작일이 보이는 달을 바꿔 두 조작이 서로 덮었다.
  it('기간 선택을 끄면(캘린더) 기간 단추가 없고 검색·정렬은 그대로다', () => {
    render(<BoardListFilters {...props} showPeriod={false} />);

    expect(screen.queryByRole('button', { name: '기간 선택' })).toBeNull();
    expect(screen.getByRole('combobox', { name: '검색 조건 선택' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '정렬 방식 선택' })).toBeInTheDocument();
  });

  // [2026-10-26 ADR-0043 UX-15] 이름 없이 나란히 놓인 두 달력은 어느 쪽이 시작일인지 알 수 없었다.
  it('기간 설정의 두 달력에 시작일·종료일 이름이 있고 처음 초점은 시작일 달력에만 둔다', async () => {
    render(<BoardListFilters {...props} />);
    fireEvent.click(screen.getByRole('button', { name: '기간 선택' }));

    const start = await screen.findByRole('group', { name: '시작일' });
    const end = screen.getByRole('group', { name: '종료일' });
    expect(within(start).getAllByRole('grid')).toHaveLength(1);
    expect(within(end).getAllByRole('grid')).toHaveLength(1);
    expect(end.contains(document.activeElement)).toBe(false);
  });
});
