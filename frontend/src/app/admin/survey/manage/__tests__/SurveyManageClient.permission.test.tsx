/**
 * 여론조사 목록 — 등록 버튼의 권한 표시 계약.
 *
 * [2026-10-01] 이 목록은 설문 조회 권한만으로 들어올 수 있다. 종전에는 등록 버튼이 누구에게나 보였고, 등록 권한
 * (POLL_CREATE)이 없는 사람은 모달을 다 채운 뒤에야 403 을 만났다. 표시 판정일 뿐이며 서버 인가는 그대로 집행된다.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import SurveyManageClient from '../SurveyManageClient';
import { getPollList } from '@/services/business/user/poll/PollUserService';

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));
vi.mock('@/services/business/user/poll/PollUserService', () => ({
  getPollList: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  createPoll: vi.fn(),
  pollUserService: { updatePoll: vi.fn() },
}));
// 셸과 표의 계약은 각자의 테스트가 본다. 여기서는 목록이 셸에 넘기는 액션만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, totalCount, children }: React.PropsWithChildren<{ actions?: React.ReactNode; totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {actions}{children}
    </main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SurveyManageClient />
    </QueryClientProvider>,
  );
}

describe('여론조사 목록 — 등록 버튼은 등록 권한으로 보인다', () => {
  it('등록 권한이 없으면 등록 버튼을 보이지 않는다 — 새로고침은 남는다', () => {
    auth.permissions = ['POLL_READ', 'SURVEY_READ_ALL'];
    renderList();

    expect(screen.getByRole('button', { name: '여론조사 목록 새로고침' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '여론조사 등록' })).not.toBeInTheDocument();
  });

  it('등록 권한이 있으면 등록 버튼이 보인다', () => {
    auth.permissions = ['POLL_READ', 'SURVEY_READ_ALL', 'POLL_CREATE'];
    renderList();

    expect(screen.getByRole('button', { name: '여론조사 등록' })).toBeInTheDocument();
  });
});

// [2026-11-07 화면 용어 원장 검토] 총계를 `data?.total || 0` 으로 만들고 오류일 때만 비워, 조회가 끝나기 전 툴바가
//   "총 0건" 을 보이고 읽어 줬다(불러오는 중을 '데이터 없음' 으로 말한다).
describe('여론조사 목록 — 셸 툴바의 총 건수', () => {
  it('조회가 끝나기 전에는 총 건수를 내지 않는다', async () => {
    auth.permissions = ['POLL_READ', 'SURVEY_READ_ALL'];
    vi.mocked(getPollList).mockReturnValueOnce(new Promise(() => undefined) as never);
    renderList();

    await waitFor(() => expect(getPollList).toHaveBeenCalled());
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다 — 0건도 센 값이면 낸다', async () => {
    auth.permissions = ['POLL_READ', 'SURVEY_READ_ALL'];
    vi.mocked(getPollList).mockResolvedValueOnce({ list: [], total: 0 } as never);
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('0'));
  });
});
