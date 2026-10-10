import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../error';
import GlobalError from '../global-error';
import AdminError from '../admin/error';
import { pageInProjection } from '@/test-utils/projection';

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
    // '기술 지원 문의' 는 시연 팩 마커 안이다 — 도움말 화면이 투영으로 빠진 생성물에는 링크도 없어야 한다.
    if (pageInProjection('/help')) {
      expect(screen.getByRole('link', { name: /기술 지원 문의하기/ })).toHaveAttribute('href', '/help');
    } else {
      expect(screen.queryByRole('link', { name: /기술 지원 문의하기/ })).not.toBeInTheDocument();
    }
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

  /*
    [2026-09-27 DIP B5 F11] 서버 오류의 참조 번호. Next 가 붙이는 숫자 해시일 때만 보인다 — 운영자가 서버 로그의 같은
    digest 로 원인을 찾는다. 위의 신뢰할 수 없는 digest 계약은 그대로 유지된다(형식이 맞지 않으면 보이지 않는다).
  */
  it('[DIP B5 F11] Next 형식의 digest 는 세 오류 화면 모두 참조 번호로 보인다', () => {
    const digest = '3441716416';
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ErrorBoundary error={Object.assign(new Error('failure'), { digest })} reset={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(digest)).toBeInTheDocument();
    expect(screen.getByText(/오류 참조 번호를 알려 주세요/)).toBeInTheDocument();
    cleanup();

    render(
      <QueryClientProvider client={new QueryClient()}>
        <AdminError error={Object.assign(new Error('failure'), { digest })} reset={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(digest)).toBeInTheDocument();
    cleanup();

    const view = renderGlobalError(Object.assign(new Error('failure'), { digest }));
    expect(view.getByText(digest)).toBeInTheDocument();
  });

  it('[DIP B5 F11] digest 가 없으면 참조 번호 줄을 두지 않는다', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ErrorBoundary error={new Error('failure')} reset={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.queryByText(/오류 참조 번호/)).not.toBeInTheDocument();
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
