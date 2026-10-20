import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-20] 업무 홈의 '내 담당 업무' 카드(core). 셸이 부서 업무 목록 API 의 권한(DEPT_JOB_READ)이 있을 때만 그린다
 * (UnifiedDashboardClient.shell.test 가 그 판정을 본다). 이 시험은 카드가 부서 업무 화면의 기본 목록(scope=mine)과 같은 조회를 부르고
 * 그 전체 건수를 말하는지, 셀 수 없으면 0건이 아닌지를 본다.
 */
const api = vi.hoisted(() => ({ getDeptJobList: vi.fn() }));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: { getDeptJobList: api.getDeptJobList },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));

const { DeptJobHomeCard } = await import('../DeptJobHomeCard');

const renderCard = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <ul><DeptJobHomeCard /></ul>
  </QueryClientProvider>,
);

describe('업무 홈 내 담당 업무 카드(core)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('내가 담당자인 업무의 전체 건수와 첫 두 건의 이름을 보이고 부서 업무 화면으로 잇는다', async () => {
    api.getDeptJobList.mockResolvedValue({ list: [{ deptTaskSn: 1, deptTaskNm: '예산 정리' }, { deptTaskSn: 2, deptTaskNm: '' }], total: 7 });
    renderCard();

    const link = await screen.findByRole('link', { name: /^내 담당 업무/ });
    await waitFor(() => expect(link).toHaveTextContent('내 담당 업무7건'));
    expect(link).toHaveAttribute('href', '/smart-toolkit/dept-job');
    expect(api.getDeptJobList).toHaveBeenCalledWith({ page: 1, size: 2, scope: 'mine' });
    const items = within(screen.getByRole('list', { name: '내 담당 업무 최근 항목' })).getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual(['예산 정리', '이름 없는 업무']);
  });

  it('조회 중에는 확인 중, 실패하면 0건이 아니라 조회 실패라고 말한다', async () => {
    api.getDeptJobList.mockRejectedValue(new Error('down'));
    renderCard();

    const link = screen.getByRole('link', { name: /^내 담당 업무/ });
    expect(link).toHaveTextContent('확인 중');
    await waitFor(() => expect(link).toHaveTextContent('조회 실패'));
    expect(screen.queryByText('0건')).toBeNull();
  });
});
