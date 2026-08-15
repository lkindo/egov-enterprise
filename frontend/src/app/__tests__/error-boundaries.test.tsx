import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../error';
import GlobalError from '../global-error';

describe('application error boundaries', () => {
  afterEach(() => vi.restoreAllMocks());

  it('logs a recoverable error, refetches queries and invokes route reset', () => {
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue([] as never);
    const reset = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <QueryClientProvider client={client}>
        <ErrorBoundary error={Object.assign(new Error('temporary'), { digest: 'ERR-42' })} reset={reset} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Error ID: ERR-42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /홈으로 돌아가기/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /기술 지원 문의하기/ })).toHaveAttribute('href', '/help');
    fireEvent.click(screen.getByRole('button', { name: /다시 시도하기/ }));
    expect(refetch).toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
  });

  it('renders fatal error metadata and invokes the global reset', () => {
    const reset = vi.fn();
    render(<GlobalError error={Object.assign(new Error('fatal'), { digest: 'FATAL-7' })} reset={reset} />);

    expect(screen.getByText('Error: fatal')).toBeInTheDocument();
    expect(screen.getByText('Digest: FATAL-7')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /시스템 리셋 및 복구/ }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('uses a safe fallback when the global error message is empty', () => {
    render(<GlobalError error={new Error('')} reset={vi.fn()} />);
    expect(screen.getByText('Error: Unknown global failure')).toBeInTheDocument();
  });
});
