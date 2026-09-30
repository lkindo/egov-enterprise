/**
 * 여론조사 목록 — 등록 버튼의 권한 표시 계약.
 *
 * [2026-10-01] 이 목록은 설문 조회 권한만으로 들어올 수 있다. 종전에는 등록 버튼이 누구에게나 보였고, 등록 권한
 * (POLL_CREATE)이 없는 사람은 모달을 다 채운 뒤에야 403 을 만났다. 표시 판정일 뿐이며 서버 인가는 그대로 집행된다.
 */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import SurveyManageClient from '../SurveyManageClient';

const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));
vi.mock('@/services/business/user/poll/PollUserService', () => ({
  getPollList: vi.fn().mockResolvedValue({ list: [], total: 0 }),
  createPoll: vi.fn(),
  pollUserService: { updatePoll: vi.fn() },
}));
// 셸과 표의 계약은 각자의 테스트가 본다. 여기서는 목록이 셸에 넘기는 액션만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: React.PropsWithChildren<{ actions?: React.ReactNode }>) => (
    <main>{actions}{children}</main>
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
