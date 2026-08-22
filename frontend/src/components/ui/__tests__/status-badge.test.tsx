import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge characterization', () => {
  it.each([
    ['Y', '승인', 'bg-green-100', 'text-green-700'],
    ['N', '반려', 'bg-red-100', 'text-red-700'],
    ['R', '대기', 'bg-blue-100', 'text-blue-700'],
    ['C', '완료', 'bg-muted', 'text-foreground'],
  ])('maps %s to its existing label and visual classes', (status, label, background, foreground) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass(
      'inline-flex',
      'items-center',
      'rounded-lg',
      'text-sm',
      'font-semibold',
      background,
      foreground,
    );
  });

  it('preserves an unknown status and merges caller classes', () => {
    render(<StatusBadge status="UNKNOWN" className="custom-status" />);

    expect(screen.getByText('UNKNOWN')).toHaveClass(
      'bg-muted',
      'text-foreground',
      'custom-status',
    );
  });
});
