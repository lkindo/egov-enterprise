import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge characterization', () => {
  it.each([
    ['Y', '승인', 'bg-success', 'text-success-foreground'],
    ['N', '반려', 'bg-destructive', 'text-destructive-foreground'],
    ['R', '대기', 'bg-info', 'text-info-foreground'],
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
