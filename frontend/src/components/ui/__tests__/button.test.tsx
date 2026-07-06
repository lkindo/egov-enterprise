vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../button';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeDefined();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">아웃라인</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
  });

  it('renders as disabled', () => {
    render(<Button disabled>비활성화</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading state', () => {
    render(<Button isLoading>로딩 중</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByTestId('icon-loader2')).toBeDefined();
  });
});
