import { render, screen } from '@testing-library/react';
import { SmartSearchPanel } from '../standard-search-filter';
import { describe, it, expect, vi } from 'vitest';

describe('SmartSearchPanel Accessibility', () => {
  it('associates labels with inputs for all field types', () => {
    const fields = [
      { name: 'keyword', label: 'Search Keyword', type: 'text' as const },
      {
        name: 'category',
        label: 'Category',
        type: 'select' as const,
        options: [{ label: 'Option A', value: 'a' }]
      },
      { name: 'startDate', label: 'Start Date', type: 'date' as const },
      { name: 'range', label: 'Date Range', type: 'daterange' as const }
    ];

    render(<SmartSearchPanel fields={fields} onSearch={vi.fn()} />);

    // These should find the inputs if the 'for'/'id' relationship is correct
    // For 'text' and 'date' inputs
    expect(screen.getByLabelText('Search Keyword')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();

    // For 'select' (trigger button)
    // Note: Radix Select trigger is a button. getByLabelText should find it.
    expect(screen.getByLabelText('Category')).toBeInTheDocument();

    // For 'daterange' (popover trigger button)
    expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
  });
});
