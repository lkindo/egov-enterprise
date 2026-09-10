import { act, Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  confirm: vi.fn(),
  createScrap: vi.fn(),
  deleteArticle: vi.fn(),
  invalidateQueries: vi.fn(),
  likePost: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  toast: vi.fn(),
  // 테스트가 바꿀 수 있는 검색 파라미터. 종전 mock 은 키를 하드코딩해 pstSn 이 아닌 키는 무조건
  // null 이었고, 그래서 nttId 별칭 경로를 시험하는 것이 원리적으로 불가능했다.
  searchParams: new Map<string, string>(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => ({ get: (key: string) => mocks.searchParams.get(key) ?? null }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: ['BOARD_UPDATE', 'BOARD_DELETE'], authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { likePost: mocks.likePost },
}));
vi.mock('@/app/actions/boardActions', () => ({ deleteBoardArticle: mocks.deleteArticle }));
vi.mock('@/services/business/user/ScrapService', () => ({
  scrapService: { createScrap: mocks.createScrap },
}));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({ knowledgeService: { getArticle: vi.fn() } }));
vi.mock('@/services/foundation/file/FileService', () => ({
  fileService: { getFileList: vi.fn(), downloadFile: vi.fn() },
}));
vi.mock('@/components/features/comment/CommentSection', () => ({ default: () => <div data-testid="comments" /> }));
vi.mock('@/components/features/satisfaction/SatisfactionSection', () => ({ default: () => <div data-testid="satisfaction" /> }));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  mutationOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData }: { initialData?: unknown }) => ({
    data: initialData,
    isError: false,
    refetch: vi.fn(),
  }),
  useMutation: (options?: { mutationFn?: (args: unknown) => Promise<unknown> }) => ({
    mutateAsync: vi.fn().mockImplementation(async (args) => options?.mutationFn ? options.mutationFn(args) : undefined),
    isPending: false,
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
    mocks.searchParams.clear();
    mocks.searchParams.set('bbsId', 'BBS-1');
    mocks.searchParams.set('pstSn', '31');
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteArticle.mockResolvedValue({ success: true });
    mocks.likePost.mockResolvedValue(undefined);
    mocks.createScrap.mockResolvedValue(1);
  });

  /**
   * 스크랩은 되돌릴 수 없는 생성은 아니지만 (사용자, URL) 유일성 제약이 서버·스키마에 없어
   * 누를 때마다 보관함 행이 하나씩 는다. 저장에 성공하면 이 화면에서 다시 누르지 못하게 잠근다.
   */
  it('스크랩은 같은 tick 중복을 막고 pending 상태와 실패 사유를 드러낸다', async () => {
    // 지역 이름은 census 가 세는 write sink(createScrapMutation.mutateAsync)와 같은 이름으로 둔다.
    const createScrapMutation = mocks.createScrap;
    let rejectScrap!: (reason?: unknown) => void;
    createScrapMutation.mockReturnValueOnce(new Promise((_, reject) => {
      rejectScrap = reject;
    }));
    await renderDetail();
    const scrap = await screen.findByRole('button', { name: '게시글 스크랩' });

    act(() => {
      fireEvent.click(scrap);
      fireEvent.click(scrap);
    });

    await waitFor(() => expect(createScrapMutation).toHaveBeenCalledTimes(1));
    expect(createScrapMutation).toHaveBeenCalledWith(expect.objectContaining({
      scrapNm: '보존할 게시글',
      // 스크랩 URL 은 목록에서 내부 링크로 되살아나야 하므로 앱의 정본 경로 형태로 저장한다.
      scrapUrl: '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31',
      useYn: 'Y',
    }));
    expect(scrap).toBeDisabled();
    expect(scrap).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '게시글 추천' })).toBeDisabled();

    rejectScrap(new Error('스크랩 저장소를 사용할 수 없습니다.'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '스크랩 저장소를 사용할 수 없습니다.',
      'error',
    ));
    expect(scrap).toBeEnabled();
  });

  /**
   * 서버·스키마에 (사용자, URL) 유일성 제약이 없어 누를 때마다 보관함 행이 하나씩 는다.
   * 저장에 성공하면 이 화면에서 다시 누르지 못하게 잠근다(새로고침하면 풀린다).
   */
  it('스크랩에 성공하면 버튼이 잠기고 다시 눌러도 저장하지 않는다', async () => {
    await renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: '게시글 스크랩' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글을 스크랩 보관함에 저장했습니다.', 'success'));
    const scrapped = await screen.findByRole('button', { name: '게시글 스크랩됨' });
    expect(scrapped).toBeDisabled();

    fireEvent.click(scrapped);
    expect(mocks.createScrap).toHaveBeenCalledTimes(1);
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

/**
 * 레거시 nttId 별칭 (PD-UX-002 Q4).
 *
 * 서버(`page.tsx`)는 `params.pstSn || params.nttId` 로 **두 키를 다 받는데** 클라이언트는 pstSn 만
 * 읽고 있었다. 그래서 `?nttId=` 로 들어오면 글은 정상 렌더되지만 클라이언트 전체가 0번 글로
 * 동작했다 — 화면이 "게시글 번호: 0", 수정 버튼이 0번 글로 이동, 댓글·만족도 섹션에도 0 전달.
 * 추천만 hasValidPstSn 가드에 막혀 조용히 아무 일도 하지 않았다.
 *
 * ⚠ 이 테스트가 red 인데 별칭 지원을 지워 통과시키면 기존 링크·북마크가 다시 0번 글로 떨어진다.
 */
describe('레거시 nttId 별칭', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams.clear();
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteArticle.mockResolvedValue({ success: true });
    mocks.likePost.mockResolvedValue(undefined);
  });

  it('nttId 로만 들어와도 클라이언트가 같은 게시글 번호로 동작한다', async () => {
    mocks.searchParams.set('bbsId', 'BBS-1');
    mocks.searchParams.set('nttId', '31');

    await renderDetail();

    // 종전에는 여기가 "게시글 번호: 0" 이었다.
    expect(screen.getByText(/게시글 번호: 31/)).toBeInTheDocument();
  });

  it('nttId 로 들어와도 추천이 죽지 않는다', async () => {
    mocks.searchParams.set('bbsId', 'BBS-1');
    mocks.searchParams.set('nttId', '31');

    await renderDetail();
    fireEvent.click(screen.getByRole('button', { name: /추천/ }));

    await waitFor(() => { expect(mocks.likePost).toHaveBeenCalledWith('BBS-1', 31); });
  });

  it('두 키가 같이 오면 canonical 인 pstSn 이 이긴다', async () => {
    mocks.searchParams.set('bbsId', 'BBS-1');
    mocks.searchParams.set('pstSn', '31');
    mocks.searchParams.set('nttId', '999');

    await renderDetail();

    expect(screen.getByText(/게시글 번호: 31/)).toBeInTheDocument();
  });

  it('어느 키도 없으면 유효한 번호로 위장하지 않는다', async () => {
    mocks.searchParams.set('bbsId', 'BBS-1');

    await renderDetail();
    fireEvent.click(screen.getByRole('button', { name: /추천/ }));

    // 가드가 살아 있어야 한다 — 0번 글에 추천을 보내지 않는다.
    expect(mocks.likePost).not.toHaveBeenCalled();
  });
});
