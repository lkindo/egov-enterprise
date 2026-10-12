import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from '@/lib/query/list-query-defaults';
import { ApprovalOpenAction, ApprovalPendingCard } from '../ApprovalHome';

/**
 * 업무 홈의 결재 조각(Phase 2 9단계). 대기 수는 결재 대기 API 의 전체 건수다. 셀 수 없으면 0건이 아니라 '조회 실패' 이고(DEC-OPS-100),
 * 그 실패가 업무 홈 전체를 오류 화면으로 바꾸지 않는다 — 앱 기본은 최초 조회의 5xx 를 오류 경계로 올리지만 이 카드는 스스로 말한다.
 */
const harness = vi.hoisted(() => ({ getPending: vi.fn() }));
vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({
  approvalUserService: { getPending: harness.getPending },
}));

async function renderCard() {
  await act(async () => {
    render(
      <QueryClientProvider client={createAppQueryClient()}>
        <ApprovalOpenAction />
        <ul><ApprovalPendingCard /></ul>
      </QueryClientProvider>,
    );
  });
}

describe('업무 홈 결재 조각', () => {
  beforeEach(() => {
    harness.getPending.mockReset();
  });

  it('결재 대기 API 의 전체 건수를 보이고 결재함으로 잇는다', async () => {
    harness.getPending.mockResolvedValue({ list: [], total: 3, page: 0, size: 1, totalPage: 3 });
    await renderCard();

    await waitFor(() => expect(screen.getByText('결재 대기').closest('li')).toHaveTextContent('3건'));
    expect(harness.getPending).toHaveBeenCalledWith({ page: 0, size: 1, keyword: undefined, fromYmd: undefined, toYmd: undefined });
    expect(screen.getByRole('link', { name: /결재 대기/ })).toHaveAttribute('href', '/approvals');
    expect(screen.getByRole('link', { name: '결재함 열기' })).toHaveAttribute('href', '/approvals');
  });

  it('🚨 대기 수를 셀 수 없으면 0건이 아니라 조회 실패라고 말하고 오류 경계로 올리지 않는다', async () => {
    harness.getPending.mockRejectedValue(Object.assign(new Error('HTTP 503'), { response: { status: 503 } }));
    await renderCard();

    await waitFor(() => expect(screen.getByText('결재 대기').closest('li')).toHaveTextContent('조회 실패'), { timeout: 5000 });
    expect(screen.queryByText('0건')).toBeNull();
  });
});
