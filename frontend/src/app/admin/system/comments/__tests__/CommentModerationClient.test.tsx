import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 댓글 및 평가 관리 화면(허브 분해 H6). 종전 감시 허브 '사용자 의견 관리' 탭의 시험을 옮겼다 — 기대값(검색 없음, 확인 후 삭제,
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
  getBoardOptions: vi.fn(),
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
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { getBoardOptions: mocks.getBoardOptions },
}));
vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: (props: Record<string, unknown>) => {
    mocks.exported = props;
    return <button type="button">{String(props.filename)} 반출</button>;
  },
}));

import CommentModerationClient from '../CommentModerationClient';

const commentRow = { ansSn: 44, ansCn: '삭제할 댓글', wrterId: 'writer', wrterNm: '홍길동', bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstSn: 7, crtDt: '2026-10-01T09:05:33' };
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
    mocks.getBoardOptions.mockResolvedValue([{ bbsId: 'BBSMSTR_AAAAAAAAAAAA', bbsTtl: '공지사항' }, { bbsId: 'BBSMSTR_BBBBBBBBBBBB', bbsTtl: '업무게시판' }]);
  });

  it('메뉴 이름을 제목으로 하고, 쪽 번호를 URL 에서 읽어 댓글만 조회한다 — 로그 탭이 없다', async () => {
    renderScreen('page=2');

    expect(screen.getByRole('heading', { level: 1, name: '댓글 및 평가 관리' })).toBeInTheDocument();
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    expect(mocks.comments).toHaveBeenCalledWith({ page: 2, size: 50 });
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByText(/만족도 평가는 각 게시글 화면에서 관리합니다/)).toBeInTheDocument();
  });

  it('검색어 입력을 두지 않고(서버가 받지 않는다), 쪽 이동은 아는 키만 URL 에 싣는다', async () => {
    renderScreen('page=1&q=x');
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    // 글 번호 조건(서버 pstSn)은 있지만 내용·작성자 검색어 칸은 없다.
    expect(screen.queryByRole('textbox', { name: /검색/ })).toBeNull();
    expect(screen.getAllByRole('textbox')).toEqual([screen.getByRole('textbox', { name: '글 번호' })]);

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

  it('목록에서 숨겨지고 화면에서 복구할 수 없음을 확인한 뒤 삭제하고 상세를 닫는다', async () => {
    renderScreen();

    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 44 상세 열기' }));
    expect(screen.getByRole('region', { name: '선택한 댓글 상세' })).toBeInTheDocument();
    expect(document.querySelector('button button')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '댓글 삭제',
      message: expect.stringContaining('삭제한 댓글은 목록에 표시되지 않으며, 이 화면에서 복구할 수 없습니다.'),
      confirmText: '삭제',
      variant: 'destructive',
    })));
    await waitFor(() => expect(mocks.deleteComment).toHaveBeenCalledWith(44));
    expect(mocks.toast).toHaveBeenCalledWith('댓글이 성공적으로 삭제되었습니다.', 'success');
    await waitFor(() => expect(screen.queryByRole('region', { name: '선택한 댓글 상세' })).toBeNull());
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
    expect(within(screen.getByRole('region', { name: '선택한 댓글 상세' })).getByText(/삭제할 댓글/)).toBeInTheDocument();
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

  // ── [2026-10-26 ADR-0043 1차 OPS-06] 게시판·글 조건과 맥락 ─────────────────────────────────────────────────────────────

  it('이동 경로는 메뉴 위치(관리 센터 › 콘텐츠 운영)를 따른다', async () => {
    renderScreen();
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    expect(screen.getByText('콘텐츠 운영')).toBeInTheDocument();
    expect(screen.queryByText('시스템관리')).toBeNull();
  });

  it('주소의 게시판·글 조건으로 댓글을 읽고 조건 칸에 그 값을 보인다', async () => {
    auth.permissions = [...FULL_PERMISSIONS, 'BOARD_READ'];
    renderScreen('bbsId=BBSMSTR_AAAAAAAAAAAA&pstSn=7&page=2');
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    expect(mocks.comments).toHaveBeenCalledWith({ page: 2, size: 50, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstSn: 7 });
    expect(screen.getByRole('textbox', { name: '글 번호' })).toHaveValue('7');
    await waitFor(() => expect(screen.getByRole('combobox', { name: '게시판' })).toHaveDisplayValue('공지사항'));
  });

  it('형식이 맞지 않는 주소 조건은 서버에 보내지 않는다', async () => {
    renderScreen('bbsId=BBS%20X%27--&pstSn=7abc');
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    expect(mocks.comments).toHaveBeenCalledWith({ page: 1, size: 50 });
  });

  it('게시판을 고르고 글 번호를 넣어 조회하면 1쪽부터 그 조건을 주소에 싣는다', async () => {
    auth.permissions = [...FULL_PERMISSIONS, 'BOARD_READ'];
    // 쪽은 응답의 전체 쪽(2) 안이어야 한다 — 밖이면 표의 쪽 맞춤(use-page-clamp)이 주소를 바꾸려 하고, 시험의 라우터는 주소를 바꾸지 않아
    // 맞춤이 끝나지 않는다.
    renderScreen('page=2');
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('option', { name: '업무게시판' })).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox', { name: '게시판' }), { target: { value: 'BBSMSTR_BBBBBBBBBBBB' } });
    // 고르기만 해서는 다시 조회하지 않는다(G2).
    expect(mocks.replace).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: '글 번호' }), { target: { value: '12' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin/system/comments?bbsId=BBSMSTR_BBBBBBBBBBBB&pstSn=12', { scroll: false }));
  });

  it('글 번호가 숫자가 아니면 조회하지 않고 그 칸의 사유를 알린다', async () => {
    renderScreen();
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '글 번호' }), { target: { value: '12a' } });
    fireEvent.submit(screen.getByRole('search'));
    expect(await screen.findByRole('alert')).toHaveTextContent('글 번호는 1 이상의 숫자로 입력하세요. 조회 조건은 바뀌지 않았습니다.');
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('초기화하면 게시판·글 조건과 쪽을 모두 지운다', async () => {
    renderScreen('bbsId=BBSMSTR_AAAAAAAAAAAA&pstSn=7&page=2');
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin/system/comments', { scroll: false }));
  });

  it('조건이 있는 채 쪽을 옮기면 조건을 그대로 둔다', async () => {
    renderScreen('bbsId=BBSMSTR_AAAAAAAAAAAA');
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/admin/system/comments?bbsId=BBSMSTR_AAAAAAAAAAAA&page=2', { scroll: false }));
  });

  it('게시판 이름·글 번호(상세 링크)·작성일 열을 보이고, 선택지에 없는 게시판은 ID 로 보인다', async () => {
    auth.permissions = [...FULL_PERMISSIONS, 'BOARD_READ'];
    mocks.comments.mockResolvedValue(page([commentRow, { ...commentRow, ansSn: 45, ansCn: '쉬는 게시판 댓글', bbsId: 'BBSMSTR_CCCCCCCCCCCC', pstSn: 9 }]));
    renderScreen();
    const row = (await screen.findByText('삭제할 댓글')).closest('tr') as HTMLElement;
    await waitFor(() => expect(within(row).getByText('공지사항')).toBeInTheDocument());
    expect(within(row).getByRole('link', { name: '글 7 상세 보기' })).toHaveAttribute('href', '/admin/community/boards/detail?bbsId=BBSMSTR_AAAAAAAAAAAA&pstSn=7');
    expect(within(row).getByText('2026-10-01 09:05')).toBeInTheDocument();
    const inactiveRow = screen.getByText('쉬는 게시판 댓글').closest('tr') as HTMLElement;
    expect(within(inactiveRow).getByText('BBSMSTR_CCCCCCCCCCCC')).toBeInTheDocument();
  });

  it('게시판 읽기 권한이 없으면 선택지를 부르지 않고 게시판 ID 로 보인다', async () => {
    renderScreen();
    const row = (await screen.findByText('삭제할 댓글')).closest('tr') as HTMLElement;
    expect(within(row).getByText('BBSMSTR_AAAAAAAAAAAA')).toBeInTheDocument();
    expect(mocks.getBoardOptions).not.toHaveBeenCalled();
  });

  it('선택한 댓글은 응답 원문(JSON) 대신 항목별로 보인다', async () => {
    auth.permissions = [...FULL_PERMISSIONS, 'BOARD_READ'];
    renderScreen();
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 44 상세 열기' }));
    const region = screen.getByRole('region', { name: '선택한 댓글 상세' });
    await waitFor(() => expect(within(region).getByText('공지사항')).toBeInTheDocument());
    expect(within(region).getByRole('link', { name: '7 글 상세 보기' })).toHaveAttribute('href', '/admin/community/boards/detail?bbsId=BBSMSTR_AAAAAAAAAAAA&pstSn=7');
    expect(within(region).getByText('홍길동')).toBeInTheDocument();
    expect(within(region).getByText('2026-10-01 09:05')).toBeInTheDocument();
    expect(within(region).queryByText(/"ansSn"/)).toBeNull();
  });

  it('삭제 확인은 작성자 이름으로 대상을 밝힌다', async () => {
    renderScreen();
    expect(await screen.findByText('삭제할 댓글')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '댓글 44 상세 열기' }));
    fireEvent.click(screen.getByRole('button', { name: '댓글 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('댓글(작성자: 홍길동)'),
    })));
  });
});
