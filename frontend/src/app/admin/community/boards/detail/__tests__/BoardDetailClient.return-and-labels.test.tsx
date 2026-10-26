import { act, Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordRoute, resetRouteHistory } from '@/lib/navigation/previous-route';

/**
 * [2026-10-26 ADR-0043 1차 OPS-01·OPS-06·UX-16] 게시글 상세의 복귀·삭제 뒤 이동·실패 사유·표기.
 *
 * - '목록으로' 와 삭제 뒤 이동은 같은 판정이다. 운영 화면 게시물 탭이나 댓글 관리에서 왔으면 뒤로 가 그 화면의 조건·쪽을 살린다. 다른 곳에서
 *   왔으면 이 글의 게시판 목록으로 가되, 삭제 뒤에는 지운 글의 상세를 방문 기록에 남기지 않게 바꿔 끼운다(replace).
 * - 삭제 실패는 권한(403)과 이미 없는 글(404)을 나눠 말한다.
 * - 등록일은 'yyyy-MM-dd HH:mm', Q&A 는 '미해결 / 해결됨' 과 '일반' 분류로 부른다(코드 값을 보이지 않는다).
 */
const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  confirm: vi.fn(),
  deleteArticle: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  user: { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: ['BOARD_UPDATE', 'BOARD_DELETE'], authorizationVersion: 'v1' },
  searchParams: new Map<string, string>(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, back: mocks.back, replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => ({ get: (key: string) => mocks.searchParams.get(key) ?? null }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { likePost: vi.fn(), cancelLikePost: vi.fn(), markQuestionSolved: vi.fn() },
}));
vi.mock('@/app/actions/boardActions', () => ({ deleteBoardArticle: mocks.deleteArticle }));
vi.mock('@/extensions/generated-post-actions', () => ({ postActions: [] }));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({ knowledgeService: { getArticle: vi.fn() } }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: { getFileList: vi.fn(), downloadFile: vi.fn() } }));
vi.mock('@/components/features/comment/CommentSection', () => ({ default: () => <div data-testid="comments" /> }));
vi.mock('@/components/features/satisfaction/SatisfactionSection', () => ({ default: () => <div data-testid="satisfaction" /> }));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  mutationOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData }: { initialData?: unknown }) => ({ data: initialData, isError: false, refetch: vi.fn() }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { BoardDetailClient, formatPostedAt } from '../BoardDetailClient';

const BBS_ID = 'BBSMSTR_AAAAAAAAAAAA';
const LIST_FALLBACK = `/admin/community/boards/select-board-list?bbsId=${BBS_ID}`;

function detail(article: Record<string, unknown> = {}, master: Record<string, unknown> = {}) {
  return {
    article: { pstSn: 31, pstTtl: '연차 안내', pstCn: '본문', userId: 'owner-id', likeCnt: 0, inqCnt: 1, crtDt: '2026-10-01T09:05:33', ...article },
    masterInfo: { bbsTtl: '공지사항', tmpltId: 'TMPLT_LIST', requiredEditPermissions: [], ...master },
    initialComments: [],
    fetchError: null,
  };
}

async function renderDetail(data: ReturnType<typeof detail>) {
  const dataPromise = Promise.resolve(data as never);
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <BoardDetailClient dataPromise={dataPromise} />
      </Suspense>,
    );
    await dataPromise;
  });
}

/** 앱 안에서 `from` 화면을 거쳐 이 상세로 왔다(직전 경로 기록). */
function arriveFrom(from: string) {
  recordRoute(from);
  recordRoute('/admin/community/boards/detail');
}

describe('BoardDetailClient 복귀·삭제·표기 (ADR-0043 1차)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRouteHistory();
    mocks.searchParams.clear();
    mocks.searchParams.set('bbsId', BBS_ID);
    mocks.searchParams.set('pstSn', '31');
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteArticle.mockResolvedValue({ success: true, message: '' });
  });

  it.each([
    ['운영 화면 게시물 탭', `/admin/community/boards/master/${BBS_ID}`],
    ['댓글 관리', '/admin/system/comments'],
    ['이용자 게시판 목록', '/admin/community/boards/select-board-list'],
  ])('%s에서 왔으면 목록으로는 뒤로 가 그 화면의 조건을 살린다', async (_label, from) => {
    arriveFrom(from);
    await renderDetail(detail());
    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    expect(mocks.back).toHaveBeenCalledOnce();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('목록이 아닌 곳(딥링크)에서 왔으면 목록으로는 이 글의 게시판 목록으로 간다', async () => {
    await renderDetail(detail());
    fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    expect(mocks.push).toHaveBeenCalledWith(LIST_FALLBACK);
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it('운영 화면 게시물 탭에서 와 삭제하면 그 탭으로 돌아가고 운영 목록·이용 목록을 다시 읽는다', async () => {
    arriveFrom(`/admin/community/boards/master/${BBS_ID}`);
    await renderDetail(detail());
    fireEvent.click(screen.getByRole('button', { name: '게시글 삭제' }));

    await waitFor(() => expect(mocks.back).toHaveBeenCalledOnce());
    expect(mocks.deleteArticle).toHaveBeenCalledOnce();
    expect(mocks.toast).toHaveBeenCalledWith('게시글이 삭제되었습니다.', 'success');
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['boardList', BBS_ID] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', BBS_ID, 'posts'] });
    // 지운 글의 상세는 다시 읽지 않는다(404 를 부른다).
    expect(mocks.invalidateQueries).not.toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['article-detail', BBS_ID] }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  // 뒤로 가기는 남은 캐시로 그린다 — 지식 허브·게시글 모아보기·댓글 관리의 목록도 지운 글을 다시 그리지 않게 무효화한다.
  it('지식 허브에서 와 삭제하면 허브로 돌아가고 허브·모아보기·댓글 관리 목록을 다시 읽는다', async () => {
    arriveFrom('/admin/help');
    await renderDetail(detail());
    fireEvent.click(screen.getByRole('button', { name: '게시글 삭제' }));

    await waitFor(() => expect(mocks.back).toHaveBeenCalledOnce());
    for (const queryKey of [['knowledge-articles'], ['hot-articles'], ['knowledge-stats'], ['community-board', BBS_ID], ['comments', 'admin', 'list']]) {
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey });
    }
  });

  it('목록이 아닌 곳에서 와 삭제하면 게시판 목록으로 바꿔 끼운다 — 지운 글의 상세를 방문 기록에 남기지 않는다', async () => {
    await renderDetail(detail());
    fireEvent.click(screen.getByRole('button', { name: '게시글 삭제' }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith(LIST_FALLBACK));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it.each([
    [403, '이 게시글을 삭제할 권한이 없습니다. 권한이 바뀌었을 수 있습니다. 게시글은 그대로입니다.'],
    [404, '이미 삭제됐거나 찾을 수 없는 게시글입니다. 목록으로 돌아가 확인하세요.'],
  ])('삭제가 %s 로 거부되면 그 사유를 말하고 화면에 머문다', async (status, message) => {
    mocks.deleteArticle.mockResolvedValue({ success: false, message: '게시글 삭제 중 오류가 발생했습니다.', status });
    arriveFrom(`/admin/community/boards/master/${BBS_ID}`);
    await renderDetail(detail());
    fireEvent.click(screen.getByRole('button', { name: '게시글 삭제' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(message, 'error'));
    expect(mocks.back).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('삭제 실패에 상태가 없으면 서버 액션의 문장을 그대로 알린다', async () => {
    mocks.deleteArticle.mockResolvedValue({ success: false, message: '게시글 삭제 중 오류가 발생했습니다.' });
    await renderDetail(detail());
    fireEvent.click(screen.getByRole('button', { name: '게시글 삭제' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글 삭제 중 오류가 발생했습니다.', 'error'));
  });

  it('등록일을 yyyy-MM-dd HH:mm 으로 보이고 전송 원문(T)을 보이지 않는다', async () => {
    await renderDetail(detail());
    expect(screen.getByText('2026-10-01 09:05')).toBeInTheDocument();
    expect(screen.queryByText(/2026-10-01T/)).toBeNull();
  });

  it.each([
    ['2026-10-01T09:05:33', '2026-10-01 09:05'],
    ['2026-10-01 09:05:33.123', '2026-10-01 09:05'],
    ['2026-10-01', '2026-10-01'],
    ['', '-'],
    [undefined, '-'],
    ['어제', '-'],
  ])('formatPostedAt(%s) 은 %s 다', (value, expected) => {
    expect(formatPostedAt(value)).toBe(expected);
  });

  it('Q&A 글은 질문 본문·해결 상태(미해결)·분류(일반)를 보이고 분류 코드(CAT01)를 보이지 않는다', async () => {
    await renderDetail(detail({ qnaSttsCd: 'OPEN', qnaCatCd: 'CAT01' }, { tmpltId: 'TMPLT_QNA' }));
    expect(screen.getByRole('heading', { level: 2, name: '질문' })).toBeInTheDocument();
    expect(screen.getByText('미해결')).toBeInTheDocument();
    expect(screen.getByText('일반')).toBeInTheDocument();
    expect(screen.queryByText('CAT01')).toBeNull();
    expect(screen.queryByText('답변 대기')).toBeNull();
  });

  it('해결로 표시한 Q&A 글은 해결됨이다', async () => {
    await renderDetail(detail({ qnaSttsCd: 'SOLVED' }, { tmpltId: 'TMPLT_QNA' }));
    expect(screen.getByText('해결됨')).toBeInTheDocument();
  });

  it('Q&A 가 아닌 게시판의 글에는 해결 상태·분류가 없고 본문 제목은 본문이다', async () => {
    await renderDetail(detail({ qnaSttsCd: 'OPEN', qnaCatCd: 'CAT01' }));
    expect(screen.getByRole('heading', { level: 2, name: '본문' })).toBeInTheDocument();
    expect(screen.queryByText('해결 상태')).toBeNull();
    expect(screen.queryByText('분류')).toBeNull();
  });
});
