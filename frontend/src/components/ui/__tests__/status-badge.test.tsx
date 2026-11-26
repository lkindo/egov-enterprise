import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge characterization', () => {
  it.each([
    ['Y', '승인', 'bg-success', 'text-success-foreground'],
    ['N', '반려', 'bg-destructive', 'text-destructive-foreground'],
    ['R', '대기', 'bg-info', 'text-info-foreground'],
    // [2026-11-26 PR-3b 6번] 배지 모양을 Badge 변형 하나로 모았다 — 완료·미지 상태는 공통 muted(흐린 글자, AA)다.
    ['C', '완료', 'bg-muted', 'text-muted-foreground'],
  ])('maps %s to its existing label and visual classes', (status, label, background, foreground) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveAttribute('data-slot', 'badge');
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
      'text-muted-foreground',
      'custom-status',
    );
  });
});
