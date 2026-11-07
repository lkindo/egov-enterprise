import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 로그인 정책 목록이 셸 툴바에 넘기는 총 건수와 현재 페이지 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `pageData?.total || 0` 로 만들고 오류일 때만 비워, 첫 응답 전에는 툴바가
 * "총 0건" 을, 현재 페이지 요약이 "2단계 인증 0건 · 접속 제한 0건" 을 보였다(불러오는 중을 '데이터 없음' 으로 말한다).
 */
const mocks = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/services/foundation/system/LoginPolicyAdminService', () => ({
  loginPolicyAdminService: {
    getLoginPolicyList: (...args: unknown[]) => mocks.list(...args),
    saveLoginPolicy: vi.fn(),
    createLoginPolicy: vi.fn(),
    deleteLoginPolicy: vi.fn(),
  },
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['LOGIN_POL_READ'], authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수와 툴바 요약만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, toolbarActions, children }: React.PropsWithChildren<{
    totalCount?: number;
    toolbarActions?: React.ReactNode;
  }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      <div data-testid="shell-toolbar">{toolbarActions}</div>
      {children}
    </main>
  ),
}));
// 오류 상태에 실제로 닿았는지 기다릴 수 있게 표에 넘긴 오류만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: Error | null }) => <div data-testid="table-error">{error ? '오류' : ''}</div>,
}));

const { default: LoginPolicyAdminClient } = await import('../LoginPolicyAdminClient');

const policy = {
  userId: 'tester',
  userNm: '테스트 사용자',
  ipAddr: '',
  lmtYn: 'Y',
  bgngTm: '',
  endTm: '',
  otpUseYn: 'N',
  regYn: 'Y',
};

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LoginPolicyAdminClient />
    </QueryClientProvider>,
  );
}

describe('로그인 정책 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조회가 끝나기 전에는 총 건수와 현재 페이지 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.list.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar')).not.toHaveTextContent('현재 페이지');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 건수를 내지 않는다', async () => {
    mocks.list.mockResolvedValue({ list: [policy], total: 7, totalPage: 1 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(screen.getByTestId('shell-toolbar')).not.toHaveTextContent('현재 페이지');
      expect(mocks.list).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수와 현재 페이지 건수를 낸다', async () => {
    mocks.list.mockResolvedValue({ list: [policy], total: 7, totalPage: 1 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
    expect(screen.getByTestId('shell-toolbar')).toHaveTextContent('현재 페이지 · 2단계 인증 0건 · 접속 제한 1건');
  });

  it('조회가 실패하면 총 건수와 현재 페이지 건수를 내지 않는다', async () => {
    mocks.list.mockRejectedValue(new Error('정책 조회 실패'));
    renderList();

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('오류'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar')).not.toHaveTextContent('현재 페이지');
  });
});
