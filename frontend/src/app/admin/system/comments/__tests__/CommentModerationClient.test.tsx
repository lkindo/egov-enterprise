import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 댓글 및 평가 관리 화면(허브 분해 H6). 종전 감시 허브 '사용자 의견 관리' 탭의 시험을 옮겼다 — 기대값(검색 없음, 확인 후 영구 삭제,
 * 동기 선점·처리 중 표시·실패 뒤 재시도, 삭제 대행 권한으로만 보이는 삭제 버튼)은 그대로다. 이 파일은 댓글 기능과 함께 지워지므로
 * 투영 게이트가 필요 없다. 화면 이름은 메뉴 이름이고, 행 동작의 접근 이름은 목록 이름('댓글')을 쓴다.
 */

const mocks = vi.hoisted(() => ({
  query: '',
  replace: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  comments: vi.fn(),
  deleteComment: vi.fn(),
  exported: undefined as Record<string, unknown> | undefined,
}));

// Census action sink(`deleteCommentMutation.mutateAsync`)과 같은 이름의 테스트 alias.
// query-options 내부 mutationFn까지 내려간 실제 write 호출을 이 alias로 관측한다.
const deleteCommentMutation = mocks.deleteComment;

const FULL_PERMISSIONS = ['COMMENT_READ_ALL', 'COMMENT_DELETE_ALL'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/system/comments',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/CommentAdminService', () => ({
  commentAdminService: { getComments: mocks.comments, deleteComment: mocks.deleteComment },
}));
vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: (props: Record<string, unknown>) => {
    mocks.exported = props;
    return <button type="button">{String(props.filename)} 반출</button>;
  },
}));

import CommentModerationClient from '../CommentModerationClient';

const commentRow = { ansSn: 44, ansCn: '삭제할 댓글', wrterId: 'writer' };
const page = (list: unknown[]) => ({ list, total: list.length, totalPage: 2 });

function renderScreen(query = '') {
  mocks.query = query;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><CommentModerationClient /></QueryClientProvider>);
}

describe('댓글 및 평가 관리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = FULL_PERMISSIONS;
    mocks.query = '';
    mocks.exported = undefined;
    mocks.confirm.mockResolvedValue(true);
    mocks.comments.mockResolvedValue(page([commentRow]));
    mocks.deleteComment.mockResolvedValue(undefined);
  });

  it('메뉴 이름을 제목으로 하고, 쪽 번호를 URL 에서 읽어 댓글만 조회한다 — 로그 탭이 없다', async () => {
    renderScreen('page=2');

    expect(screen.getByRole('heading', { level: 1, name: '댓글 및 평가 관리' })).toBeInTheDocument();
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    expect(mocks.comments).toHaveBeenCalledWith({ page: 2, size: 50 });
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText(/만족도 평가는 각 게시글 화면에서 관리합니다/)).toBeInTheDocument();
  });

  it('검색 입력을 두지 않고, 쪽 이동은 page 하나만 URL 에 싣는다', async () => {
    renderScreen('page=1&q=x');
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin/system/comments?page=2', { scroll: false }));
  });

  it('현재 쪽의 댓글을 댓글목록 파일로 반출한다', async () => {
    renderScreen();
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    await waitFor(() => expect((mocks.exported?.data as unknown[] | undefined)?.length).toBe(1));
    expect(mocks.exported).toMatchObject({ scope: 'page', filename: '댓글목록' });
    expect((mocks.exported?.headers as { key: string }[]).map((header) => header.key))
      .toEqual(['ansSn', 'ansCn', 'wrterId', 'wrterNm', 'crtDt', 'bbsId', 'pstSn']);
  });

  it('확인 뒤 영구 삭제하고 상세를 닫는다', async () => {
    renderScreen();

    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 44 상세 열기' }));
    expect(screen.getByRole('region', { name: '선택 항목 상세' })).toBeInTheDocument();
    expect(document.querySelector('button button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '댓글 영구 삭제',
      variant: 'destructive',
    })));
    await waitFor(() => expect(mocks.deleteComment).toHaveBeenCalledWith(44));
    expect(mocks.toast).toHaveBeenCalledWith('댓글이 성공적으로 삭제되었습니다.', 'success');
    await waitFor(() => expect(screen.queryByRole('region', { name: '선택 항목 상세' })).toBeNull());
  });

  it('댓글 삭제는 confirm 전에 동기 선점하고 시작 버튼에 pending 상태를 알리며 실패 후 재시도할 수 있다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    deleteCommentMutation.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectDelete = reject;
    }));
    renderScreen();

    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 44 상세 열기' }));
    const remove = screen.getByRole('button', { name: '댓글 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(deleteCommentMutation).toHaveBeenCalledTimes(1));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('댓글 삭제 중');

    rejectDelete(new Error('댓글 삭제 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('댓글 삭제 서버 오류', 'error'));
    expect(within(screen.getByRole('region', { name: '선택 항목 상세' })).getByText(/삭제할 댓글/)).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
    expect(remove).not.toHaveAttribute('aria-busy');
    expect(remove).toHaveAccessibleName('댓글 삭제');
  });

  /*
   * [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다. 조회만 맡은 담당자에게는 목록만 보인다 — 본인 댓글 삭제 권한은 이
   * 관리자 삭제를 열지 않는다.
   */
  it.each([
    { label: '조회 권한만 있으면', permissions: ['COMMENT_READ_ALL'] },
    { label: '본인 댓글 삭제 권한만 있어도', permissions: ['COMMENT_READ_ALL', 'COMMENT_DELETE'] },
  ])('$label 댓글 삭제 버튼을 보이지 않는다 — 목록과 선택은 그대로다', async ({ permissions }) => {
    auth.permissions = permissions;
    renderScreen();

    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 44 상세 열기' }));
    expect(screen.queryByRole('button', { name: '댓글 삭제' })).toBeNull();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
