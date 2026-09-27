import { act, Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-27 DIP B5 F9] 게시글 화면이 게시판 설정(댓글·만족도)을 두 섹션에 그대로 넘기는가.
 * 설정을 모르면(메타 없음) 입력을 보이고 판정은 서버가 한다. 섹션 스텁은 받은 값을 data 속성으로 드러낸다.
 * (준비물은 Q&A 해결 표시 테스트와 같다.)
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
vi.mock('@/components/features/comment/CommentSection', () => ({
  default: ({ acceptsNewComments }: { acceptsNewComments?: boolean }) => <div data-testid="comments" data-accepts={String(acceptsNewComments)} />,
}));
vi.mock('@/components/features/satisfaction/SatisfactionSection', () => ({
  default: ({ acceptsNewRatings }: { acceptsNewRatings?: boolean }) => <div data-testid="satisfaction" data-accepts={String(acceptsNewRatings)} />,
}));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  mutationOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData }: { initialData?: unknown }) => ({ data: initialData, isError: false, refetch: vi.fn() }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { BoardDetailClient } from '../BoardDetailClient';

function detail(masterInfo: Record<string, unknown> | null) {
  return {
    article: { pstSn: 31, pstTtl: '글', pstCn: '본문', userId: 'owner-id', likeCnt: 0, inqCnt: 1 },
    masterInfo,
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

describe('BoardDetailClient 게시판 설정 전달 (DIP B5 F9)', () => {
  beforeEach(() => {
    mocks.searchParams = new Map([['bbsId', 'BBS_01'], ['pstSn', '31']]);
  });

  it('댓글·만족도를 끈 게시판은 두 섹션에 새 입력을 받지 않는다고 넘긴다', async () => {
    await renderDetail(detail({ bbsTtl: '공지', tmpltId: 'TMPLT_LIST', ansYn: 'N', stsfdgYn: 'N' }));

    expect(screen.getByTestId('comments').getAttribute('data-accepts')).toBe('false');
    expect(screen.getByTestId('satisfaction').getAttribute('data-accepts')).toBe('false');
  });

  it('켠 게시판은 입력을 받는다고 넘긴다', async () => {
    await renderDetail(detail({ bbsTtl: '공지', tmpltId: 'TMPLT_LIST', ansYn: 'Y', stsfdgYn: 'Y' }));
    expect(screen.getByTestId('comments').getAttribute('data-accepts')).toBe('true');
    expect(screen.getByTestId('satisfaction').getAttribute('data-accepts')).toBe('true');
  });
});
