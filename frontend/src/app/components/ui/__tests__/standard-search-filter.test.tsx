vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StandardSearchFilter } from '../standard-search-filter';
import React from 'react';

describe('StandardSearchFilter', () => {
  const mockFields: any[] = [
    { name: 'keyword', label: '검색어', type: 'text', placeholder: '이름 검색' },
    { name: 'status', label: '상태', type: 'select', options: [{ label: '활성', value: 'Y' }] }
  ];

  it('renders filter labels and placeholders', () => {
    render(
      <StandardSearchFilter
        fields={mockFields}
        onSearch={() => {}}
      />
    );

    expect(screen.getByText('검색어')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('이름 검색')).toBeInTheDocument();
    expect(screen.getByText('상태')).toBeInTheDocument();
  });

  it('calls onSearch with collected values', () => {
    const onSearch = vi.fn();
    render(
      <StandardSearchFilter
        fields={mockFields}
        onSearch={onSearch}
      />
    );

    const input = screen.getByPlaceholderText('이름 검색');
    fireEvent.change(input, { target: { value: '홍길동' } });

    const submitBtn = screen.getByRole('button', { name: /조회/i });
    fireEvent.click(submitBtn);

    expect(onSearch).toHaveBeenCalledWith({ keyword: '홍길동' });
  });

  it('resets values when reset button is clicked', () => {
    const onReset = vi.fn();
    render(
      <StandardSearchFilter
        fields={mockFields}
        onSearch={() => {}}
        onReset={onReset}
      />
    );

    const resetBtn = screen.getByRole('button', { name: /초기화/i });
    fireEvent.click(resetBtn);

    expect(onReset).toHaveBeenCalled();
  });
});
