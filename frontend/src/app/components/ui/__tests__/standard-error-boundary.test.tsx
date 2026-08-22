import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { StandardErrorBoundary } from '../standard-error-boundary';

function ThrowingChild(): never {
  throw new Error('Bearer private-token at https://internal.example/users/42');
}

describe('StandardErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the safe recovery UI without rendering the underlying error', () => {
    // React reports caught render errors to the test console independently of the boundary source.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <StandardErrorBoundary>
        <ThrowingChild />
      </StandardErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: '시스템 오류가 발생했습니다' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /다시 시도/u })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /메인으로/u })).toBeInTheDocument();
    expect(screen.queryByText(/private-token|internal\.example/u)).not.toBeInTheDocument();
  });
});
