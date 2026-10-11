import { act, Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [스크랩 슬롯] 게시글 상세의 '스크랩' 버튼은 스크랩 기능이 post-actions 슬롯에 기여한다. 이 시험은 **실제 레지스트리**로 게시글
 * 상세를 렌더해 원본 조립 경로(레지스트리 → 기여 → 쓰기 → 서비스)를 본다. 스크랩 디렉터리에 두어 스크랩과 함께 빠진다 — 게시판
 * 쪽 호스트 계약(잠금·토스트·완료 표시)은 게시판 시험이 가짜 기여로 본다. 게시글 상세의 스크랩을 누르는 E2E 는 없다.
 */
const mocks = vi.hoisted(() => ({
  createScrap: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  searchParams: new Map<string, string>(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: (key: string) => mocks.searchParams.get(key) ?? null }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'writer', esntlId: 'owner-id', role: 'USER', permissions: ['BOARD_UPDATE', 'BOARD_DELETE'], authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { likePost: vi.fn(), markQuestionSolved: vi.fn() } }));
vi.mock('@/app/actions/boardActions', () => ({ deleteBoardArticle: vi.fn() }));
vi.mock('@/services/business/user/ScrapService', () => ({ scrapService: { createScrap: mocks.createScrap } }));
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

import { BoardDetailClient } from '@/app/admin/community/boards/detail/BoardDetailClient';

async function renderDetail(pstTtl = '보존할 게시글') {
  const dataPromise = Promise.resolve({
    article: { pstSn: 31, pstTtl, pstCn: '본문', userId: 'owner-id', likeCnt: 2, inqCnt: 3 },
    masterInfo: { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST', requiredEditPermissions: [] },
    initialComments: [],
    fetchError: null,
  } as never);
  await act(async () => {
    render(
      <Suspense fallback={<div>loading</div>}>
        <BoardDetailClient dataPromise={dataPromise} />
      </Suspense>,
    );
    await dataPromise;
  });
}

describe('게시글 상세의 스크랩 버튼(스크랩 기여 조립)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams.clear();
    mocks.searchParams.set('bbsId', 'BBS-1');
    mocks.searchParams.set('pstSn', '31');
    mocks.createScrap.mockResolvedValue(1);
  });

  it('추천과 삭제 사이에 스크랩 버튼이 있다', async () => {
    await renderDetail();
    await screen.findByRole('button', { name: '게시글 스크랩' });

    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')).filter(Boolean);
    expect(names.indexOf('게시글 추천')).toBeLessThan(names.indexOf('게시글 스크랩'));
    expect(names.indexOf('게시글 스크랩')).toBeLessThan(names.indexOf('게시글 삭제'));
    expect(screen.getByRole('button', { name: '게시글 스크랩' })).toHaveTextContent('스크랩');
  });

  it('정본 경로·잘린 제목으로 저장하고 스크랩 목록을 다시 읽은 뒤 이번 방문에서 잠근다', async () => {
    const longTitle = '가'.repeat(150);
    await renderDetail(longTitle);

    fireEvent.click(await screen.findByRole('button', { name: '게시글 스크랩' }));

    await waitFor(() => expect(mocks.createScrap).toHaveBeenCalledTimes(1));
    // scrapNm 은 물리 컬럼 varchar(100) — 사용자가 길이를 조절할 수 있는 입력이 아니므로 잘라 보낸다.
    expect(mocks.createScrap).toHaveBeenCalledWith({
      scrapNm: '가'.repeat(100),
      scrapUrl: '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31',
      scrapExpln: `테스트 게시판 - ${'가'.repeat(100)}`,
      useYn: 'Y',
    });
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['scraps', 'list'] }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글을 스크랩 보관함에 저장했습니다.', 'success'));
    const done = await screen.findByRole('button', { name: '게시글 스크랩됨' });
    expect(done).toBeDisabled();
    expect(done).toHaveTextContent('스크랩됨');
  });

  it('nttId 별칭으로 들어와도 pstSn 정본 경로로 저장한다', async () => {
    mocks.searchParams.delete('pstSn');
    mocks.searchParams.set('nttId', '31');
    await renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '게시글 스크랩' }));

    await waitFor(() => expect(mocks.createScrap).toHaveBeenCalledWith(expect.objectContaining({
      scrapUrl: '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31',
    })));
  });

  it('서버 사유가 없는 실패는 스크랩 문구로 알리고 다시 누를 수 있다', async () => {
    mocks.createScrap.mockRejectedValueOnce(new Error('Request failed with status code 500'));
    await renderDetail();
    const scrap = await screen.findByRole('button', { name: '게시글 스크랩' });

    fireEvent.click(scrap);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('스크랩 저장 중 오류가 발생했습니다.', 'error'));
    expect(mocks.invalidateQueries).not.toHaveBeenCalled();
    await waitFor(() => expect(scrap).toBeEnabled());
  });
});
