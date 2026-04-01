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
    { name: 'keyword', label: 'ê²€?‰ì–´', type: 'text', placeholder: '?´ë¦„ ê²€?? },
    { name: 'status', label: '?íƒœ', type: 'select', options: [{ label: '?œì„±', value: 'Y' }] }
  ];

  it('renders filter labels and placeholders', () => {
    render(
      <StandardSearchFilter
        fields={mockFields}
        onSearch={() => {}}
      />
    );

    expect(screen.getByText('ê²€?‰ì–´')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('?´ë¦„ ê²€??)).toBeInTheDocument();
    expect(screen.getByText('?íƒœ')).toBeInTheDocument();
  });

  it('calls onSearch with collected values', () => {
    const onSearch = vi.fn();
    render(
      <StandardSearchFilter
        fields={mockFields}
        onSearch={onSearch}
      />
    );

    const input = screen.getByPlaceholderText('?´ë¦„ ê²€??);
    fireEvent.change(input, { target: { value: '?ê¸¸?? } });

    const submitBtn = screen.getByRole('button', { name: /ì¡°íšŒ/i });
    fireEvent.click(submitBtn);

    expect(onSearch).toHaveBeenCalledWith({ keyword: '?ê¸¸?? });
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

    const resetBtn = screen.getByRole('button', { name: /ì´ˆê¸°??i });
    fireEvent.click(resetBtn);

    expect(onReset).toHaveBeenCalled();
  });
});
