import type { ReactNode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardMasterListClient } from '../BoardMasterListClient';

const mocks = vi.hoisted(() => ({
  batchUpdateBoardMasterStatus: vi.fn(),
  push: vi.fn(),
  refetch: vi.fn(),
  toast: vi.fn(),
  boards: [
    {
      bbsId: 'BBS-A',
      bbsTtl: '첫 번째 게시판',
      bbsExpln: '첫 번째 설명',
      bbsTypeCdNm: '일반 게시판',
      useYn: 'N',
    },
    {
      bbsId: 'BBS-B',
      bbsTtl: '두 번째 게시판',
      bbsExpln: '두 번째 설명',
      bbsTypeCdNm: '일반 게시판',
      useYn: 'N',
    },
  ],
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { list: mocks.boards, total: mocks.boards.length },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mocks.refetch,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: {
    getBoardMasterList: vi.fn(),
    batchUpdateBoardMasterStatus: mocks.batchUpdateBoardMasterStatus,
  },
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: { title: string; actions?: ReactNode }) => (
    <header>
      <h2>{title}</h2>
      {actions}
    </header>
  ),
}));

describe('BoardMasterListClient selection contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batchUpdateBoardMasterStatus.mockResolvedValue(undefined);
  });

  it('선택한 단일 행의 bbsId 하나만 bulk 상태 변경에 전달한다', async () => {
    const user = userEvent.setup();
    render(<BoardMasterListClient />);

    const table = screen.getByRole('table', { name: '데이터 목록' });
    const checkboxes = within(table).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    await user.click(checkboxes[1]);
    await user.click(screen.getByRole('button', { name: /일괄 활성화/ }));

    await waitFor(() => expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledOnce());
    expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledWith(['BBS-A'], 'Y');
  });
});
