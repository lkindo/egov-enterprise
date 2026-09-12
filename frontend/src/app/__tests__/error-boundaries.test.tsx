import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../error';
import GlobalError from '../global-error';
import AdminError from '../admin/error';

function renderGlobalError(error: Error & { digest?: string }, reset = vi.fn()) {
  const frame = document.createElement('iframe');
  frame.dataset.globalErrorTestRoot = 'true';
  document.body.append(frame);
  const testDocument = frame.contentDocument;
  if (!testDocument) throw new Error('Global error test document is unavailable');
  const view = render(<GlobalError error={error} reset={reset} />, {
    container: testDocument,
    baseElement: testDocument,
  });

  expect(testDocument.documentElement.tagName).toBe('HTML');
  expect(testDocument.documentElement.getAttribute('lang')).toBe('ko');
  expect(testDocument.body.tagName).toBe('BODY');
  return view;
}

describe('application error boundaries', () => {
  afterEach(() => {
    cleanup();
    document.querySelectorAll('[data-global-error-test-root]').forEach((frame) => frame.remove());
    vi.restoreAllMocks();
  });

  it('retries only the failed route boundary without a global query refetch', () => {
    const client = new QueryClient();
    const refetch = vi.spyOn(client, 'refetchQueries').mockResolvedValue([] as never);
    const reset = vi.fn();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <QueryClientProvider client={client}>
        <ErrorBoundary error={Object.assign(new Error('temporary'), { digest: 'ERR-42' })} reset={reset} />
      </QueryClientProvider>,
    );

    expect(screen.queryByText('ERR-42', { exact: false })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /홈으로 돌아가기/ })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /기술 지원 문의하기/ })).toHaveAttribute('href', '/help');
    fireEvent.click(screen.getByRole('button', { name: /다시 시도하기/ }));
    expect(refetch).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
  });

  it('does not expose a fatal error message or client-supplied digest', () => {
    const reset = vi.fn();
    const privateMessage = 'Bearer private-token at https://internal.example/users/42';
    const view = renderGlobalError(
      Object.assign(new Error(privateMessage), { digest: 'FATAL-7' }),
      reset,
    );

    expect(view.queryByText(privateMessage, { exact: false })).not.toBeInTheDocument();
    expect(view.queryByText('오류 세부 정보는 안전하게 숨겨졌습니다.')).not.toBeNull();
    expect(view.queryByText('FATAL-7', { exact: false })).not.toBeInTheDocument();
    fireEvent.click(view.getByRole('button', { name: /시스템 리셋 및 복구/ }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('does not render an untrusted digest', () => {
    const privateDigest = 'PRIVATE_TOKEN_123';
    const view = renderGlobalError(Object.assign(new Error('failure'), { digest: privateDigest }));
    expect(view.queryByText(privateDigest, { exact: false })).not.toBeInTheDocument();
  });

  it('does not render an untrusted digest in the route error boundary', () => {
    const privateDigest = 'PRIVATE_TOKEN_123';
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ErrorBoundary error={Object.assign(new Error('failure'), { digest: privateDigest })} reset={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByText(privateDigest, { exact: false })).not.toBeInTheDocument();
  });

  it('does not render an untrusted digest in the admin error boundary', () => {
    const privateDigest = 'PRIVATE_TOKEN_123';
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminError error={Object.assign(new Error('failure'), { digest: privateDigest })} reset={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByText(privateDigest, { exact: false })).not.toBeInTheDocument();
  });

  it('uses a USER-accessible landing route for an admin-scope 403 recovery', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminError error={Object.assign(new Error('Forbidden'), { status: 403 })} reset={vi.fn()} />
      </QueryClientProvider>,
    );

    /*
      [2026-09-12] 목적지가 '/admin/work-hub' 에서 '/' 로 바뀌었다.
      종전 값을 고른 이유는 워크허브의 페이지 권한이 `[]`(인증된 누구나)여서였는데, 그것은
      demo pack 소유라 파생 제품에서 제거되면 404 가 된다. '/' 는 모든 프로필에 남고
      **`/admin` 게이트 밖**이라 권한 판정 자체를 거치지 않는다 — 403 복구 목적지로 더 안전하다.
      값만 보지 않고 성질(게이트 밖)도 함께 고정한다.
    */
    const landing = screen.getByRole('link', { name: '메인으로' });
    expect(landing).toHaveAttribute('href', '/');
    expect(landing.getAttribute('href')?.startsWith('/admin')).toBe(false);
  });
});
