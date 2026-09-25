import { act, Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-25 DIP I3] Q&A 해결 표시.
 *
 * 해결 상태 컬럼과 목록 배지는 있었지만 SOLVED 로 바꾸는 경로가 없어 답을 받은 질문도 계속 '접수' 로 남았다.
 * 버튼은 Q&A 템플릿 게시판에서, 아직 해결되지 않은 글에, 수정 권한이 있는 사람에게만 보인다.
 */
const mocks = vi.hoisted(() => ({
  markQuestionSolved: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  user: { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: ['BOARD_UPDATE', 'BOARD_DELETE'], authorizationVersion: 'v1' },
  searchParams: new Map<string, string>(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => mocks.searchParams.get(key) ?? null }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { likePost: vi.fn(), markQuestionSolved: mocks.markQuestionSolved },
}));
vi.mock('@/app/actions/boardActions', () => ({ deleteBoardArticle: vi.fn() }));
vi.mock('@/services/business/user/ScrapService', () => ({ scrapService: { createScrap: vi.fn() } }));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({ knowledgeService: { getArticle: vi.fn() } }));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: { getFileList: vi.fn() } }));
vi.mock('@/components/features/comment/CommentSection', () => ({ default: () => <div data-testid="comments" /> }));
vi.mock('@/components/features/satisfaction/SatisfactionSection', () => ({ default: () => <div data-testid="satisfaction" /> }));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  mutationOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData }: { initialData?: unknown }) => ({ data: initialData, isError: false, refetch: vi.fn() }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { BoardDetailClient } from '../BoardDetailClient';

function detail(tmpltId: string, qnaSttsCd: string, userId = 'owner-id') {
  return {
    article: { pstSn: 31, pstTtl: '질문', pstCn: '본문', userId, qnaSttsCd, likeCnt: 0, inqCnt: 1 },
    masterInfo: { bbsTtl: 'Q&A', tmpltId },
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

describe('BoardDetailClient 권한으로 막힌 글 (DIP V9)', () => {
  it('🚨 403 은 재시도를 권하지 않고 권한 안내와 돌아갈 길만 준다', async () => {
    mocks.searchParams.set('bbsId', 'BBS-4');
    await renderDetail({
      article: null,
      masterInfo: null,
      initialComments: [],
      fetchError: '이 게시글을 볼 권한이 없습니다. 회원 전용 게시판이거나 작성자와 관리자만 볼 수 있는 글입니다.',
      forbidden: true,
    } as never);

    expect(screen.getByRole('heading', { name: '볼 수 없는 게시글입니다' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 시도' })).toBeNull();
    expect(screen.getByRole('button', { name: '목록으로 돌아가기' })).toBeInTheDocument();
  });

  it('대조군: 일반 조회 실패는 다시 시도를 준다', async () => {
    await renderDetail({ article: null, masterInfo: null, initialComments: [], fetchError: '게시글을 불러오지 못했습니다.' } as never);

    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });
});

describe('BoardDetailClient Q&A 해결 표시', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams.clear();
    mocks.searchParams.set('bbsId', 'QNA');
    mocks.searchParams.set('pstSn', '31');
    mocks.user = { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: ['BOARD_UPDATE', 'BOARD_DELETE'], authorizationVersion: 'v1' };
    mocks.markQuestionSolved.mockResolvedValue(undefined);
  });

  it('작성자는 해결되지 않은 Q&A 질문을 해결됨으로 표시하고 글을 다시 읽는다', async () => {
    await renderDetail(detail('TMPLT_QNA', 'QA01'));

    fireEvent.click(screen.getByRole('button', { name: '해결됨으로 표시' }));

    await waitFor(() => expect(mocks.markQuestionSolved).toHaveBeenCalledWith('QNA', 31));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['article-detail', 'QNA', 31] });
    expect(mocks.toast).toHaveBeenCalledWith('질문을 해결됨으로 표시했습니다.', 'success');
  });

  it.each([
    ['이미 해결된 질문', detail('TMPLT_QNA', 'SOLVED')],
    ['Q&A 가 아닌 게시판', detail('TMPLT_LIST', 'OPEN')],
    ['남의 질문(전체 수정 권한 없음)', detail('TMPLT_QNA', 'QA01', 'someone-else')],
  ])('%s 에는 버튼을 보이지 않는다', async (_name, data) => {
    await renderDetail(data);

    expect(screen.queryByRole('button', { name: '해결됨으로 표시' })).toBeNull();
  });

  it('서버가 거부하면 사유를 알리고 두 번 누를 수 없게 잠갔다가 푼다', async () => {
    mocks.markQuestionSolved.mockRejectedValueOnce(new Error('권한이 없습니다.'));
    await renderDetail(detail('TMPLT_QNA', 'QA01'));

    const button = screen.getByRole('button', { name: '해결됨으로 표시' });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(mocks.markQuestionSolved).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: '해결됨으로 표시' })).not.toBeDisabled());
  });
});
