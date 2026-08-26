import { act, Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  confirm: vi.fn(),
  deleteArticle: vi.fn(),
  invalidateQueries: vi.fn(),
  likePost: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => ({ get: (key: string) => key === 'bbsId' ? 'BBS-1' : key === 'pstSn' ? '31' : null }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'owner-id', role: 'USER' } }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { likePost: mocks.likePost },
}));
vi.mock('@/app/actions/boardActions', () => ({ deleteBoardArticle: mocks.deleteArticle }));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({ knowledgeService: { getArticle: vi.fn() } }));
vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: { getFileList: vi.fn(), downloadFile: vi.fn() },
}));
vi.mock('@/components/features/comment/CommentSection', () => ({ default: () => <div data-testid="comments" /> }));
vi.mock('@/components/features/satisfaction/SatisfactionSection', () => ({ default: () => <div data-testid="satisfaction" /> }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData }: { initialData?: unknown }) => ({
    data: initialData,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import { BoardDetailClient } from '../BoardDetailClient';

const detailData = {
  article: {
    pstSn: 31,
    pstTtl: '보존할 게시글',
    pstCn: '작성 중인 본문',
    userId: 'owner-id',
    likeCnt: 2,
    inqCnt: 3,
  },
  masterInfo: { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST' },
  initialComments: [],
  fetchError: null,
};

async function renderDetail() {
  const dataPromise = Promise.resolve(detailData as any);
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>loading</div>}>
        <BoardDetailClient dataPromise={dataPromise} />
      </Suspense>,
    );
    await dataPromise;
  });
  return result;
}

describe('BoardDetailClient action pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteArticle.mockResolvedValue({ success: true });
    mocks.likePost.mockResolvedValue(undefined);
  });

  it('추천을 같은 tick에 한 번만 보내고 실패 시 낙관 값을 되돌린 뒤 재시도 상태를 남긴다', async () => {
    let rejectLike!: (reason?: unknown) => void;
    mocks.likePost.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectLike = reject;
    }));
    await renderDetail();
    const like = await screen.findByRole('button', { name: '게시글 추천' });

    act(() => {
      fireEvent.click(like);
      fireEvent.click(like);
    });

    expect(mocks.likePost).toHaveBeenCalledTimes(1);
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-busy', 'true');
    expect(like).toHaveAccessibleName('게시글 추천 처리 중');
    expect(like).toHaveTextContent('추천 3');
    expect(screen.getByRole('button', { name: '게시글 삭제' })).toBeDisabled();

    rejectLike(new Error('like failed'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('추천 처리 중 오류가 발생했습니다.', 'error'));
    expect(like).not.toBeDisabled();
    expect(like).toHaveAccessibleName('게시글 추천');
    expect(like).toHaveTextContent('추천 2');
  });

  it('삭제를 confirm 전에 선점하고 실패 뒤 게시글과 충돌 제어를 복구한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    mocks.deleteArticle.mockReturnValueOnce(new Promise((_, reject) => {
      rejectDelete = reject;
    }));
    await renderDetail();
    const remove = await screen.findByRole('button', { name: '게시글 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteArticle).toHaveBeenCalledTimes(1));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('게시글 삭제 중');
    expect(screen.getByRole('button', { name: '게시글 추천' })).toBeDisabled();

    rejectDelete(new Error('delete failed'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글 삭제 중 오류가 발생했습니다.', 'error'));
    expect(screen.getByRole('heading', { name: '보존할 게시글' })).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
    expect(remove).toHaveAccessibleName('게시글 삭제');
  });
});
