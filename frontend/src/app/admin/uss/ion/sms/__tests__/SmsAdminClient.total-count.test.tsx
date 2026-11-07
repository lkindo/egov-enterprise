import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageResponse } from '@/types/foundation/system';
import type { SmsDto } from '@/services/foundation/operation/SmsAdminService';

/**
 * 문자 발송 이력 목록이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `data?.total ?? 0` 로 만들고 오류일 때만 비워, 서버 프리페치가 없을 때(실패·2쪽 이후·검색어)
 * 첫 응답 전에는 툴바가 "총 0건" 을 보이고 aria-live 로 읽어 줬다(불러오는 중을 '데이터 없음' 으로 말한다). 서버가 미리 채운 총계는
 * 받은 값이므로 다시 조회하는 동안에도 그대로 둔다.
 */
const mocks = vi.hoisted(() => ({ getSmsList: vi.fn(), getDeliveryStatus: vi.fn() }));

vi.mock('@/services/foundation/operation/SmsAdminService', () => ({
  smsAdminService: {
    getSmsList: mocks.getSmsList,
    getDeliveryStatus: mocks.getDeliveryStatus,
    getSmsRecipients: vi.fn(),
    sendSms: vi.fn(),
  },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/uss/ion/sms',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/contexts/AuthContext', () => {
  const current = () => ({ user: { permissions: ['SMS_READ'], authorizationVersion: 'v1' } });
  return { useAuth: current, useOptionalAuth: current };
});
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: React.PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
// 오류 상태에 실제로 닿았는지 기다릴 수 있게 표에 넘긴 오류만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: Error | null }) => <div data-testid="table-error">{error ? '오류' : ''}</div>,
}));

const { default: SmsAdminClient } = await import('../SmsAdminClient');

function pageOf(total: number): PageResponse<SmsDto> {
  return { list: [], total, page: 1, size: 10, totalPage: 1 };
}

function renderList(initialSmsList: PageResponse<SmsDto> | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SmsAdminClient initialSmsList={initialSmsList} />
    </QueryClientProvider>,
  );
}

describe('문자 발송 이력 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.getDeliveryStatus.mockResolvedValue({ deliveryConfigured: false, defaultSenderTelno: null });
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getSmsList.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getSmsList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getSmsList.mockResolvedValue(pageOf(7));
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getSmsList).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.getSmsList.mockResolvedValue(pageOf(7));
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getSmsList.mockRejectedValue(new Error('문자 이력 조회 실패'));
    renderList();

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('오류'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  it('서버가 미리 채운 총 건수는 다시 조회하는 동안에도 그대로 보인다', async () => {
    mocks.getSmsList.mockReturnValue(new Promise(() => undefined));
    renderList(pageOf(12));

    await waitFor(() => expect(mocks.getSmsList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('12');
  });
});
