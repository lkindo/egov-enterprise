import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BoardWritePicker } from '../BoardWritePicker';

/**
 * [2026-10-26 ADR-0043 1차 UX-09] 게시판 없이 작성 화면에 들어오면 공지사항으로 정하지 않고 글을 쓸 수 있는 게시판을 고르게 한다.
 * 선택지는 사용자 선택지 API(useBoardOptions)이고, 쓰기 판정은 작성 화면과 같다(BOARD_CREATE ∧ 게시판 추가 편집 권한 ∧ 사용 중).
 * 메타를 받지 못한 게시판은 쓸 수 있다고 추정하지 않는다.
 */
const mocks = vi.hoisted(() => ({
  permissions: ['BOARD_CREATE'] as string[],
  options: {
    options: [] as { value: string; label: string }[],
    isLoading: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  metas: {} as Record<string, unknown>,
  getBoardMeta: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'writer-owner', authorizationVersion: 'test-v1', permissions: mocks.permissions } }),
}));
vi.mock('@/hooks/api/use-board-options', () => ({ useBoardOptions: () => mocks.options }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { getBoardMeta: (...args: unknown[]) => mocks.getBoardMeta(...args) },
}));

function renderSubject() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <BoardWritePicker />
    </QueryClientProvider>,
  );
}

describe('BoardWritePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['BOARD_CREATE'];
    mocks.options = {
      options: [
        { value: 'BBSMSTR_AAAAAAAAAAAA', label: '공지사항' },
        { value: 'BBSMSTR_CCCCCCCCCCCC', label: '업무게시판' },
        { value: 'BBSMSTR_DDDDDDDDDDDD', label: 'Q&A 게시판' },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    mocks.metas = {
      BBSMSTR_AAAAAAAAAAAA: { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'], inUse: true },
      BBSMSTR_CCCCCCCCCCCC: { requiredEditPermissions: [], inUse: true },
      BBSMSTR_DDDDDDDDDDDD: { requiredEditPermissions: [], inUse: true },
    };
    mocks.getBoardMeta.mockImplementation(async (bbsId: string) => {
      const meta = mocks.metas[bbsId];
      if (!meta) throw new Error('메타 조회 실패');
      return meta;
    });
  });

  it('쓸 수 있는 게시판만 그 게시판의 작성 화면 링크로 보이고, 추가 편집 권한이 필요한 공지사항은 빼며 기본값으로도 쓰지 않는다', async () => {
    renderSubject();
    expect(screen.getByRole('heading', { level: 1, name: '글을 쓸 게시판 고르기' })).toBeVisible();

    expect(await screen.findByRole('link', { name: '업무게시판' }))
      .toHaveAttribute('href', '/admin/community/boards/insert-board-article?bbsId=BBSMSTR_CCCCCCCCCCCC');
    expect(screen.getByRole('link', { name: 'Q&A 게시판' }))
      .toHaveAttribute('href', '/admin/community/boards/insert-board-article?bbsId=BBSMSTR_DDDDDDDDDDDD');
    await waitFor(() => expect(screen.queryByText('글을 쓸 수 있는 게시판을 확인하는 중…')).toBeNull());
    expect(screen.queryByRole('link', { name: '공지사항' })).toBeNull();
    // 메타 조회는 화면 안에서 드러낸다 — 전역 실패 토스트를 띄우지 않는다.
    expect(mocks.getBoardMeta).toHaveBeenCalledWith('BBSMSTR_CCCCCCCCCCCC', { suppressErrorToast: true });
  });

  it('공지·FAQ 편집 권한이 있으면 공지사항도 고를 수 있다', async () => {
    mocks.permissions = ['BOARD_CREATE', 'NOTICE_EDIT', 'FAQ_EDIT'];
    renderSubject();
    expect(await screen.findByRole('link', { name: '공지사항' })).toBeVisible();
  });

  it('사용 안 함 게시판은 고르게 하지 않는다', async () => {
    mocks.metas.BBSMSTR_CCCCCCCCCCCC = { requiredEditPermissions: [], inUse: false };
    renderSubject();
    expect(await screen.findByRole('link', { name: 'Q&A 게시판' })).toBeVisible();
    expect(screen.queryByRole('link', { name: '업무게시판' })).toBeNull();
  });

  it('쓰기 권한을 확인하지 못한 게시판은 빼고, 뺐다는 사실과 다시 확인할 길을 알린다', async () => {
    delete mocks.metas.BBSMSTR_DDDDDDDDDDDD;
    const user = userEvent.setup();
    renderSubject();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('게시판 1개의 쓰기 권한을 확인하지 못해 목록에서 뺐습니다.');
    expect(screen.queryByRole('link', { name: 'Q&A 게시판' })).toBeNull();
    expect(screen.getByRole('link', { name: '업무게시판' })).toBeVisible();

    mocks.metas.BBSMSTR_DDDDDDDDDDDD = { requiredEditPermissions: [], inUse: true };
    await user.click(screen.getByRole('button', { name: '쓰기 권한 다시 확인' }));
    expect(await screen.findByRole('link', { name: 'Q&A 게시판' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('쓸 수 있는 게시판이 없으면 그 사실과 문의 경로를 말한다', async () => {
    mocks.options = { ...mocks.options, options: [{ value: 'BBSMSTR_AAAAAAAAAAAA', label: '공지사항' }] };
    renderSubject();
    expect(await screen.findByText('지금 글을 쓸 수 있는 게시판이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.')).toBeVisible();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('글쓰기 권한이 없으면 게시판을 묻지 않고 권한이 없다고 말한다', () => {
    mocks.permissions = [];
    renderSubject();
    expect(screen.getByText('게시글을 쓸 권한이 없습니다. 필요한 권한은 관리자에게 문의해 주세요.')).toBeVisible();
    expect(mocks.getBoardMeta).not.toHaveBeenCalled();
  });

  it('선택지를 불러오지 못하면 실패를 말하고 다시 불러올 수 있다', async () => {
    const refetch = vi.fn();
    mocks.options = { options: [], isLoading: false, error: new Error('조회 실패'), refetch };
    const user = userEvent.setup();
    renderSubject();
    expect(screen.getByRole('alert')).toHaveTextContent('게시판 목록을 불러오지 못했습니다.');
    await user.click(screen.getByRole('button', { name: '게시판 목록 다시 불러오기' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
