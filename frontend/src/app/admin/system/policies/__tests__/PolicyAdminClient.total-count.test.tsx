import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 시스템 정책 목록이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 목록을 `useState([])` 로 시작하고 오류일 때만 비워, 첫 응답 전에는 툴바가 "총 0건" 을
 * 보이고 aria-live 로 읽어 줬다(불러오는 중을 '데이터 없음' 으로 말한다). 이 화면은 TanStack 이 아니라 직접 조회하므로
 * 받았는지를 화면 상태로 들고, 새로고침 중에는 마지막으로 받은 수를 둔다.
 */
// toast 는 같은 함수여야 한다 — 조회 함수가 toast 에 의존해, 렌더마다 바뀌면 조회가 다시 돈다.
const mocks = vi.hoisted(() => ({ getPolicies: vi.fn(), toast: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { authorizationVersion: 'test-v1', permissions: ['POLICY_READ'] } }),
}));
// 편집 대화상자는 열지 않는다 — 본문 편집기는 그리지 않는다.
vi.mock('next/dynamic', () => ({ default: () => function TestEditor() { return null; } }));
vi.mock('@/services/foundation/system/PolicyAdminService', () => ({
  policyAdminService: {
    getPolicies: (...args: unknown[]) => mocks.getPolicies(...args),
    updatePolicy: vi.fn(),
    createPolicy: vi.fn(),
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다(새로고침 단추는 actions 에 있다).
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, actions, children }: React.PropsWithChildren<{
    totalCount?: number;
    actions?: React.ReactNode;
  }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {actions}
      {children}
    </main>
  ),
}));
// 오류 상태에 실제로 닿았는지 기다릴 수 있게 표에 넘긴 오류만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: Error | null }) => <div data-testid="table-error">{error ? '오류' : ''}</div>,
}));

const { default: PolicyAdminClient } = await import('../PolicyAdminClient');

const policy = { plcyTypeCd: 'PRIVACY', plcyTtl: '개인정보 처리방침', plcyCn: '<p>본문</p>' };
const terms = { plcyTypeCd: 'TERMS', plcyTtl: '이용약관', plcyCn: '<p>본문</p>' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('시스템 정책 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getPolicies.mockReturnValue(new Promise(() => undefined));
    render(<PolicyAdminClient />);

    await waitFor(() => expect(mocks.getPolicies).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  it('조회가 끝나면 받은 정책 수를 낸다', async () => {
    mocks.getPolicies.mockResolvedValue([policy, terms]);
    render(<PolicyAdminClient />);

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('2'));
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getPolicies.mockRejectedValue(new Error('정책 조회 실패'));
    render(<PolicyAdminClient />);

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('오류'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  it('새로고침하는 동안에는 마지막으로 받은 수를 두고, 새 응답이 오면 그 수로 바꾼다', async () => {
    const refresh = deferred<Array<typeof policy>>();
    mocks.getPolicies.mockResolvedValueOnce([policy]).mockReturnValueOnce(refresh.promise);
    render(<PolicyAdminClient />);
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByRole('button', { name: '새로고침' }));
    await waitFor(() => expect(mocks.getPolicies).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('1');

    await act(async () => { refresh.resolve([policy, terms]); });
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('2');
  });
});
