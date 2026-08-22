import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light' }),
}));

vi.mock('sonner', () => ({
  Toaster: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="sonner" style={style} />
  ),
}));

import { Toaster } from '../sonner';

describe('Toaster semantic contrast tokens', () => {
  it('uses the accessible destructive foreground/background pair for error messages', () => {
    render(<Toaster />);

    const toaster = screen.getByTestId('sonner');
    expect(toaster.style.getPropertyValue('--error-bg')).toBe('hsl(var(--destructive))');
    expect(toaster.style.getPropertyValue('--error-text')).toBe('hsl(var(--destructive-foreground))');
    expect(toaster.style.getPropertyValue('--error-border')).toBe('hsl(var(--destructive))');
  });

  it('uses the accessible success foreground/background pair for success messages', () => {
    render(<Toaster />);

    const toaster = screen.getByTestId('sonner');
    expect(toaster.style.getPropertyValue('--success-bg')).toBe('hsl(var(--success))');
    expect(toaster.style.getPropertyValue('--success-text')).toBe('hsl(var(--success-foreground))');
    expect(toaster.style.getPropertyValue('--success-border')).toBe('hsl(var(--success))');
  });
});
