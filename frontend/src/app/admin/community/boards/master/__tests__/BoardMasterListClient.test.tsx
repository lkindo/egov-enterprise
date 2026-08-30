import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardMasterListClient, boardMasterEditSchema } from '../BoardMasterListClient';

const mocks = vi.hoisted(() => ({
  batchUpdateBoardMasterStatus: vi.fn(),
  batchDeleteBoardMastersPhysically: vi.fn(),
  confirm: vi.fn(),
  deleteBoardMaster: vi.fn(),
  deleteBoardMasterPhysically: vi.fn(),
  getBoardMaster: vi.fn(),
  isBoardMasterDeletable: vi.fn(),
  updateBoardMaster: vi.fn(),
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
  queryOptions: <T,>(options: T) => options,
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
  // [2026-08-25 A1 이행] WorkListPage 의 브레드크럼이 현재 경로·쿼리를 읽는다.
  usePathname: () => '/admin/community/boards/master',
  useSearchParams: () => new URLSearchParams(),
}));

// 브레드크럼은 메뉴 SSOT 를 조회한다 — 이 테스트의 대상이 아니므로 응답을 고정한다.
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: {
    getBoardMasterList: vi.fn(),
    getBoardMaster: mocks.getBoardMaster,
    updateBoardMaster: mocks.updateBoardMaster,
    batchDeleteBoardMastersPhysically: mocks.batchDeleteBoardMastersPhysically,
    deleteBoardMaster: mocks.deleteBoardMaster,
    deleteBoardMasterPhysically: mocks.deleteBoardMasterPhysically,
    isBoardMasterDeletable: mocks.isBoardMasterDeletable,
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
    mocks.boards[0].useYn = 'N';
    mocks.boards[1].useYn = 'N';
    mocks.batchUpdateBoardMasterStatus.mockResolvedValue(undefined);
    mocks.batchDeleteBoardMastersPhysically.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteBoardMaster.mockResolvedValue(undefined);
    mocks.deleteBoardMasterPhysically.mockResolvedValue(undefined);
    mocks.getBoardMaster.mockResolvedValue({
      bbsId: 'BBS-A',
      bbsTtl: '첫 번째 게시판',
      bbsExpln: '첫 번째 설명',
      bbsTypeCd: 'BBST01',
      bbsAtrbCd: 'BBSA01',
      atchPsbltyFileSz: 5242880,
      useYn: 'N',
    });
    mocks.updateBoardMaster.mockResolvedValue(undefined);
    mocks.isBoardMasterDeletable.mockResolvedValue(true);
  });

  async function openSettings(user: ReturnType<typeof userEvent.setup>) {
    render(<BoardMasterListClient />);
    await user.click(screen.getByRole('button', { name: '첫 번째 게시판 설정 편집' }));
    return {
      dialog: await screen.findByRole('dialog'),
      title: await screen.findByRole('textbox', { name: '게시판 명칭' }),
      description: screen.getByRole('textbox', { name: '게시판 소개' }),
      cancel: screen.getByRole('button', { name: '취소' }),
      submit: screen.getByRole('button', { name: '설정 적용하기' }),
    };
  }

  it('선택한 단일 행의 bbsId 하나만 bulk 상태 변경에 전달한다', async () => {
    const user = userEvent.setup();
    render(<BoardMasterListClient />);

    // [2026-08-25 A1 이행] 표에 화면 고유 접근 이름을 부여했다(같은 페이지의 여러 표를 구분).
    const table = screen.getByRole('table', { name: '게시판 마스터 목록' });
    const checkboxes = within(table).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    await user.click(checkboxes[1]);
    await user.click(screen.getByRole('button', { name: /일괄 활성화/ }));

    await waitFor(() => expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledOnce());
    expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledWith(['BBS-A'], 'Y');
  });

  it.each([
    {
      idleLabel: '일괄 활성화',
      pendingLabel: '활성화 처리 중...',
      status: 'Y',
      errorMessage: '일괄 활성화 서버 오류',
    },
    {
      idleLabel: '일괄 비활성',
      pendingLabel: '비활성화 처리 중...',
      status: 'N',
      errorMessage: '일괄 비활성화 서버 오류',
    },
  ])('$idleLabel는 같은 tick의 write를 한 번만 보내고 실패 후 선택을 보존한다', async ({
    idleLabel,
    pendingLabel,
    status,
    errorMessage,
  }) => {
    let rejectWrite!: (reason?: unknown) => void;
    mocks.batchUpdateBoardMasterStatus.mockReturnValueOnce(new Promise((_, reject) => {
      rejectWrite = reject;
    }));
    render(<BoardMasterListClient />);
    const table = screen.getByRole('table', { name: '게시판 마스터 목록' });
    const firstRow = within(table).getAllByRole('checkbox')[1];
    fireEvent.click(firstRow);
    const action = screen.getByRole('button', { name: new RegExp(`${idleLabel}$`) });

    act(() => {
      fireEvent.click(action);
      fireEvent.click(action);
    });

    await waitFor(() => expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledTimes(1));
    expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledWith(['BBS-A'], status);
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    expect(action).toHaveAccessibleName(pendingLabel);
    expect(screen.getByRole('button', { name: new RegExp(`${status === 'Y' ? '일괄 비활성' : '일괄 활성화'}$`) })).toBeDisabled();
    expect(screen.getByRole('button', { name: /완전 말소$/ })).toBeDisabled();

    rejectWrite(new Error(errorMessage));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(errorMessage, 'error'));
    expect(firstRow).toBeChecked();
    expect(action).not.toBeDisabled();
    expect(action).not.toHaveAttribute('aria-busy');
    expect(action).toHaveAccessibleName(idleLabel);
  });

  it('완전 말소는 confirm 전에 잠금하고 실패 후 선택과 제어를 복구한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.batchDeleteBoardMastersPhysically.mockReturnValueOnce(new Promise((_, reject) => {
      rejectDelete = reject;
    }));
    render(<BoardMasterListClient />);
    const table = screen.getByRole('table', { name: '게시판 마스터 목록' });
    const firstRow = within(table).getAllByRole('checkbox')[1];
    fireEvent.click(firstRow);
    const action = screen.getByRole('button', { name: /완전 말소$/ });

    act(() => {
      fireEvent.click(action);
      fireEvent.click(action);
    });

    await waitFor(() => expect(mocks.batchDeleteBoardMastersPhysically).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    expect(action).toHaveAccessibleName('완전 말소 처리 중...');
    expect(screen.getByRole('button', { name: /일괄 활성화$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /일괄 비활성$/ })).toBeDisabled();

    rejectDelete(new Error('일괄 영구 삭제 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('일괄 영구 삭제 서버 오류', 'error'));
    expect(firstRow).toBeChecked();
    expect(action).not.toBeDisabled();
    expect(action).not.toHaveAttribute('aria-busy');
    expect(action).toHaveAccessibleName('완전 말소');
  });

  it('row delete가 먼저 진입하면 같은 tick의 bulk write를 차단한다', async () => {
    let resolveDelete!: () => void;
    mocks.deleteBoardMasterPhysically.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveDelete = resolve;
    }));
    render(<BoardMasterListClient />);
    const table = screen.getByRole('table', { name: '게시판 마스터 목록' });
    fireEvent.click(within(table).getAllByRole('checkbox')[1]);
    const rowDelete = screen.getByRole('button', { name: '첫 번째 게시판 DB에서 영구 물리삭제' });
    const bulkActivate = screen.getByRole('button', { name: '일괄 활성화' });

    act(() => {
      fireEvent.click(rowDelete);
      fireEvent.click(bulkActivate);
    });

    await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledTimes(1));
    expect(mocks.batchUpdateBoardMasterStatus).not.toHaveBeenCalled();
    expect(rowDelete).toBeDisabled();
    expect(rowDelete).toHaveAttribute('aria-busy', 'true');
    expect(rowDelete).toHaveAccessibleName('첫 번째 게시판 영구 삭제 처리 중');
    expect(bulkActivate).toBeDisabled();
    expect(bulkActivate).not.toHaveAttribute('aria-busy');

    resolveDelete();
    await waitFor(() => expect(rowDelete).not.toBeDisabled());
  });

  it('bulk write가 먼저 진입하면 같은 tick의 row delete를 차단한다', async () => {
    let resolveBulk!: () => void;
    mocks.batchUpdateBoardMasterStatus.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveBulk = resolve;
    }));
    render(<BoardMasterListClient />);
    const table = screen.getByRole('table', { name: '게시판 마스터 목록' });
    fireEvent.click(within(table).getAllByRole('checkbox')[1]);
    const bulkActivate = screen.getByRole('button', { name: '일괄 활성화' });
    const rowDelete = screen.getByRole('button', { name: '첫 번째 게시판 DB에서 영구 물리삭제' });

    act(() => {
      fireEvent.click(bulkActivate);
      fireEvent.click(rowDelete);
    });

    await waitFor(() => expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledTimes(1));
    expect(mocks.isBoardMasterDeletable).not.toHaveBeenCalled();
    expect(mocks.deleteBoardMasterPhysically).not.toHaveBeenCalled();
    expect(bulkActivate).toBeDisabled();
    expect(bulkActivate).toHaveAttribute('aria-busy', 'true');
    expect(bulkActivate).toHaveAccessibleName('활성화 처리 중...');
    expect(rowDelete).toBeDisabled();
    expect(rowDelete).toHaveAttribute('aria-busy', 'false');
    expect(rowDelete).toHaveAccessibleName('첫 번째 게시판 DB에서 영구 물리삭제');

    resolveBulk();
    await waitFor(() => expect(bulkActivate).not.toBeDisabled());
  });

  it('100자를 넘는 게시판 명칭을 update sink로 보내지 않는다', async () => {
    const user = userEvent.setup();
    const fields = await openSettings(user);
    fireEvent.change(fields.title, { target: { value: '가'.repeat(101) } });

    await user.click(fields.submit);

    expect(mocks.updateBoardMaster).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 100자/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.title).toHaveFocus());
  });

  it('저장 pending 중 닫기를 막고 서버 필드 오류 뒤 modal·입력·summary를 보존한다', async () => {
    let rejectUpdate!: (reason?: unknown) => void;
    mocks.updateBoardMaster.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectUpdate = reject;
    }));
    const user = userEvent.setup();
    const fields = await openSettings(user);
    await user.clear(fields.title);
    await user.type(fields.title, '변경된 게시판');

    fireEvent.click(fields.submit);

    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.submit).toHaveAccessibleName('저장 중...');
    expect(fields.cancel).toBeDisabled();
    fireEvent.click(fields.cancel);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('dialog')).toBeVisible();

    act(() => rejectUpdate({
      response: {
        data: { errors: [{ field: 'bbsTtl', message: '이미 사용 중인 게시판 명칭입니다.' }] },
      },
    }));

    expect(await screen.findAllByText('이미 사용 중인 게시판 명칭입니다.')).not.toHaveLength(0);
    expect(fields.title).toHaveValue('변경된 게시판');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('이미 사용 중인 게시판 명칭입니다.');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(fields.cancel).toBeEnabled();
    await waitFor(() => expect(fields.title).toHaveFocus());
  });

  it('저장 pending 중 연속 저장과 행 삭제를 모두 차단한다', async () => {
    let resolveUpdate!: () => void;
    mocks.updateBoardMaster.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    }));
    const user = userEvent.setup();
    const fields = await openSettings(user);
    const remove = screen.getByRole('button', { name: '첫 번째 게시판 DB에서 영구 물리삭제' });

    act(() => {
      fields.submit.click();
      remove.click();
      fields.submit.click();
    });

    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledTimes(1));
    expect(mocks.isBoardMasterDeletable).not.toHaveBeenCalled();
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.submit).toHaveAccessibleName('저장 중...');
    expect(remove).toBeDisabled();
    expect(screen.getByRole('button', { name: '첫 번째 게시판 설정 편집' })).toBeDisabled();
    resolveUpdate();
    await waitFor(() => expect(mocks.refetch).toHaveBeenCalled());
  });

  it('행 삭제 pending 중 편집 저장을 같은 tick에 시작하지 않는다', async () => {
    let resolveDeletable!: (value: boolean) => void;
    mocks.isBoardMasterDeletable.mockReturnValueOnce(new Promise<boolean>((resolve) => {
      resolveDeletable = resolve;
    }));
    const user = userEvent.setup();
    const fields = await openSettings(user);
    const remove = screen.getByRole('button', { name: '첫 번째 게시판 DB에서 영구 물리삭제' });

    act(() => {
      remove.click();
      fields.submit.click();
    });

    await waitFor(() => expect(mocks.isBoardMasterDeletable).toHaveBeenCalledTimes(1));
    expect(mocks.updateBoardMaster).not.toHaveBeenCalled();
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).not.toHaveAttribute('aria-busy');
    resolveDeletable(true);
    await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledTimes(1));
  });

  it('비활성화가 진행 중이면 같은 tick의 재요청을 막고 실패 후 행을 보존한다', async () => {
    mocks.boards[0].useYn = 'Y';
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    mocks.deleteBoardMaster.mockReturnValue(pendingDelete);
    render(<BoardMasterListClient />);
    const remove = screen.getByRole('button', { name: '첫 번째 게시판 대기 상태로 비활성화' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.deleteBoardMaster).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('첫 번째 게시판 비활성화 처리 중');

    rejectDelete(new Error('비활성화 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('비활성화 처리 중 오류가 발생했습니다.', 'error'));
    expect(screen.getByText('첫 번째 게시판')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
  });

  it('영구 삭제가 진행 중이면 같은 tick의 가용성 조회와 write를 한 번만 실행한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    mocks.deleteBoardMasterPhysically.mockReturnValue(pendingDelete);
    render(<BoardMasterListClient />);
    const remove = screen.getByRole('button', { name: '첫 번째 게시판 DB에서 영구 물리삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledTimes(1));
    expect(mocks.isBoardMasterDeletable).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('첫 번째 게시판 영구 삭제 처리 중');

    rejectDelete(new Error('영구 삭제 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('영구 삭제 서버 오류', 'error'));
    expect(screen.getByText('첫 번째 게시판')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
  });

  it('일반 서버 오류는 토스트로 안내하고 편집값을 보존한다', async () => {
    mocks.updateBoardMaster.mockRejectedValueOnce(new Error('저장 서버에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    const fields = await openSettings(user);
    await user.clear(fields.title);
    await user.type(fields.title, '보존할 게시판 명칭');

    await user.click(fields.submit);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('저장 서버에 연결할 수 없습니다.', 'error'));
    expect(fields.title).toHaveValue('보존할 게시판 명칭');
  });

  it('게시판 DTO의 제목/소개 경계와 Y/N 형식을 보존한다', () => {
    const valid = {
      bbsTtl: '가'.repeat(100),
      bbsExpln: '나'.repeat(4000),
      useYn: 'Y',
    };

    expect(boardMasterEditSchema.safeParse(valid).success).toBe(true);
    expect(boardMasterEditSchema.safeParse({ ...valid, bbsTtl: '   ' }).success).toBe(false);
    expect(boardMasterEditSchema.safeParse({ ...valid, bbsTtl: '가'.repeat(101) }).success).toBe(false);
    expect(boardMasterEditSchema.safeParse({ ...valid, bbsExpln: '나'.repeat(4001) }).success).toBe(false);
    expect(boardMasterEditSchema.safeParse({ ...valid, useYn: 'X' }).success).toBe(false);
    expect(boardMasterEditSchema.safeParse({ ...valid, bbsTtl: 123 }).success).toBe(false);
  });
});
