import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * 포상 관리 화면의 **e2e 결속 문구** 계약.
 *
 * A1 이행(W3)으로 이 화면의 조회 조건이 표 내부에서 조회 조건 영역으로 올라가고 영문 버튼
 * `ANALYZE` 가 `조회` 로 바뀌면서, e2e page object(OperationalExtensionPage)가 붙잡던 셀렉터가
 * 함께 바뀌었다. e2e 는 서비스 기동이 필요해 이 저장소의 단위 검증에서는 돌지 않으므로,
 * **page object 가 쓰는 접근 이름·placeholder 를 여기서 고정**한다 — 문구가 다시 흔들리면
 * 브라우저가 아니라 이 테스트가 먼저 red 가 된다.
 */

const harness = vi.hoisted(() => ({ getRewardList: vi.fn() }));

vi.mock('@/services/foundation/operation/OperationAdminService', () => ({
  operationAdminService: { getRewardList: harness.getRewardList, createReward: vi.fn() },
}));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

import RewardManageClient from '../rewards/RewardManageClient';

const INITIAL_PAGE = {
  list: [
    {
      rwardNm: '모범 사원상',
      rwardCode: 'RW-001',
      rwardwnrId: 'user-1',
      rwardDe: '20260515',
      confmAt: 'Y',
      sanctnDt: '2026-05-16',
    },
  ],
  total: 1,
  page: 1,
  size: 10,
  totalPage: 1,
};

function renderClient(children: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  return render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
}

describe('포상 관리 화면 — e2e 결속 문구', () => {
  it('page object 가 붙잡는 제목·조회 조건·실행 버튼을 노출한다', () => {
    harness.getRewardList.mockResolvedValue(INITIAL_PAGE);
    renderClient(<RewardManageClient initialPage={INITIAL_PAGE} />);

    // OperationalExtensionPage.gotoRewards()
    expect(screen.getByRole('heading', { level: 1, name: '상훈 및 포상 관리 체계' })).toBeInTheDocument();
    // OperationalExtensionPage.searchRewards()
    expect(screen.getByPlaceholderText('포상 명칭 또는 대상자로 검색')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '조회' })).toBeInTheDocument();
  });

  it('총 건수를 결과 툴바 한 곳에서만 제공한다(지표 카드 대체)', () => {
    harness.getRewardList.mockResolvedValue(INITIAL_PAGE);
    const { container } = renderClient(<RewardManageClient initialPage={INITIAL_PAGE} />);

    expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 1건');
    expect(container.textContent?.match(/총\s*[\d,]+건/g)).toHaveLength(1);
  });
});
