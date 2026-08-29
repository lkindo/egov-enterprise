import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BoardListFilters } from '../BoardListFilters';

describe('BoardListFilters SSR first DOM', () => {
  it('mount effect를 기다리지 않고 검색·기간·정렬 제어를 모두 제공한다', () => {
    render(
      <BoardListFilters
        searchWrd=""
        setSearchWrd={vi.fn()}
        searchCnd="0"
        setSearchCnd={vi.fn()}
        orderBy="date"
        setOrderBy={vi.fn()}
        setStartDate={vi.fn()}
        setEndDate={vi.fn()}
        onSearch={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox', { name: '검색 조건 선택' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '기간 선택' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '정렬 방식 선택' })).toBeInTheDocument();
  });
});
