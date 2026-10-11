import { act, Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
  [스크랩 슬롯] 부가 동작은 다른 기능이 post-actions 슬롯에 기여한다. 이 시험은 게시판 소유의 호스트 계약이라 스크랩에 기대지 않는다 —
  가짜 기여(probe)로 잠금·토스트·완료 표시를 본다. 실제 스크랩 기여의 조립은 스크랩 디렉터리의 시험(board-detail-scrap-action)이 본다.
  가짜 기여의 쓰기 함수 이름은 호스트가 부르는 이름(submit)과 같게 둔다 — 폼 검증 census 가 그 이름을 이 시험의 증거로 대조한다.
*/
const mocks = vi.hoisted(() => {
  const submit = vi.fn();
  const probe = {
    id: 'probe',
    order: 10,
    label: '보관',
    doneLabel: '보관됨',
    name: '게시글 보관',
    busyName: '게시글 보관 중',
    doneName: '게시글 보관됨',
    icon: () => null,
    successMessage: '게시글을 보관했습니다.',
    failureMessage: '보관 중 오류가 발생했습니다.',
    oncePerVisit: true,
    submit,
    visibleWhen: { always: '시험용 가짜 기여' },
  };
  return {
    back: vi.fn(),
    confirm: vi.fn(),
    submit,
    probe,
    registry: [[probe]] as unknown[][],
    deleteArticle: vi.fn(),
    invalidateQueries: vi.fn(),
    likePost: vi.fn(),
    markQuestionSolved: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    toast: vi.fn(),
    // 테스트가 바꿀 수 있는 검색 파라미터. 종전 mock 은 키를 하드코딩해 pstSn 이 아닌 키는 무조건
    // null 이었고, 그래서 nttId 별칭 경로를 시험하는 것이 원리적으로 불가능했다.
    searchParams: new Map<string, string>(),
  };
});

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
  boardUserService: { likePost: mocks.likePost, markQuestionSolved: mocks.markQuestionSolved },
}));
vi.mock('@/app/actions/boardActions', () => ({ deleteBoardArticle: mocks.deleteArticle }));
// 레지스트리는 시험마다 바꿀 수 있게 getter 로 둔다(빈 레지스트리 = 기여한 기능이 빠진 구성).
vi.mock('@/extensions/generated-post-actions', () => ({
  get postActions() { return mocks.registry; },
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
  masterInfo: { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST', requiredEditPermissions: [] },
  initialComments: [],
  fetchError: null,
};

async function renderDetail(articleOverrides: Record<string, unknown> = {}, masterOverrides: Record<string, unknown> = {}) {
  const dataPromise = Promise.resolve({
    ...detailData,
    article: { ...detailData.article, ...articleOverrides },
    masterInfo: { ...detailData.masterInfo, ...masterOverrides },
  } as any);
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
    mocks.submit.mockResolvedValue(undefined);
    mocks.registry = [[mocks.probe]];
  });

  /**
   * 부가 동작(슬롯 기여)은 호스트가 잠금·토스트·완료 표시를 소유한다. 기여는 submit 하나만 주고, 호스트가 같은 tick 중복을
   * 막으며 진행 중·실패 사유를 드러낸다. 맥락(정본 경로·제목·게시판 이름)은 호스트가 만든다.
   */
  it('부가 동작은 같은 tick 중복을 막고 맥락을 넘기며 pending 상태와 실패 사유를 드러낸다', async () => {
    // 지역 이름은 census 가 세는 write sink(action.submit)의 끝 이름과 같게 둔다 — 폼 검증 census 의 증거 대조.
    const submit = mocks.submit;
    let rejectSubmit!: (reason?: unknown) => void;
    submit.mockReturnValueOnce(new Promise((_, reject) => {
      rejectSubmit = reject;
    }));
    await renderDetail();
    const action = await screen.findByRole('button', { name: '게시글 보관' });

    act(() => {
      fireEvent.click(action);
      fireEvent.click(action);
    });

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith({
      bbsId: 'BBS-1',
      pstSn: 31,
      title: '보존할 게시글',
      boardTitle: '테스트 게시판',
      // 스크랩 URL 처럼 목록에서 내부 링크로 되살아나야 하는 값은 앱의 정본 경로 형태다.
      canonicalPath: '/admin/community/boards/detail?bbsId=BBS-1&pstSn=31',
      queryClient: expect.objectContaining({ invalidateQueries: mocks.invalidateQueries }),
    });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    expect(action).toHaveAccessibleName('게시글 보관 중');
    expect(screen.getByRole('button', { name: '게시글 추천' })).toBeDisabled();

    rejectSubmit(new Error('보관소를 사용할 수 없습니다.'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('보관소를 사용할 수 없습니다.', 'error'));
    expect(action).toBeEnabled();
    expect(action).toHaveAccessibleName('게시글 보관');
  });

  it('서버 사유가 없는 실패는 기여의 실패 문구로 알린다', async () => {
    mocks.submit.mockRejectedValueOnce(new Error('Request failed with status code 500'));
    await renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '게시글 보관' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('보관 중 오류가 발생했습니다.', 'error'));
  });

  /**
   * oncePerVisit 동작(스크랩)은 서버·스키마에 유일성 제약이 없어 누를 때마다 행이 하나씩 는다.
   * 성공하면 이 화면에서 다시 누르지 못하게 잠근다(새로고침하면 풀린다).
   */
  it('oncePerVisit 동작에 성공하면 완료 표시로 잠기고 다시 눌러도 보내지 않는다', async () => {
    await renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: '게시글 보관' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글을 보관했습니다.', 'success'));
    const done = await screen.findByRole('button', { name: '게시글 보관됨' });
    expect(done).toBeDisabled();
    expect(done).toHaveTextContent('보관됨');

    fireEvent.click(done);
    expect(mocks.submit).toHaveBeenCalledTimes(1);
  });

  it('oncePerVisit 가 아닌 동작은 성공 뒤에도 다시 누를 수 있다', async () => {
    mocks.registry = [[{ ...mocks.probe, oncePerVisit: false }]];
    await renderDetail();
    const action = await screen.findByRole('button', { name: '게시글 보관' });

    fireEvent.click(action);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글을 보관했습니다.', 'success'));
    await waitFor(() => expect(action).toBeEnabled());
    expect(action).toHaveAccessibleName('게시글 보관');

    fireEvent.click(action);
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(2));
  });

  it('부가 동작은 추천과 삭제 사이에 order 순서로 놓인다', async () => {
    mocks.registry = [[{ ...mocks.probe, id: 'later', order: 20, name: '나중 동작' }], [mocks.probe]];
    await renderDetail();
    await screen.findByRole('button', { name: '게시글 보관' });

    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label')).filter(Boolean);
    const at = (name: string) => names.indexOf(name);
    expect(at('게시글 추천')).toBeLessThan(at('게시글 보관'));
    expect(at('게시글 보관')).toBeLessThan(at('나중 동작'));
    expect(at('나중 동작')).toBeLessThan(at('게시글 삭제'));
  });

  it('기여가 없는 구성(빈 레지스트리)에서는 부가 동작 버튼이 없고 추천·삭제는 그대로다', async () => {
    mocks.registry = [];
    await renderDetail();

    await screen.findByRole('button', { name: '게시글 추천' });
    expect(screen.queryByRole('button', { name: /게시글 보관/ })).toBeNull();
    expect(screen.getByRole('button', { name: '게시글 삭제' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '게시글 추천' }));
    await waitFor(() => expect(mocks.likePost).toHaveBeenCalledWith('BBS-1', 31));
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

    // 서버 사유가 없는 전송 오류는 일반 문구로 알린다.
    rejectLike(new Error('Request failed with status code 500'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('추천 처리 중 오류가 발생했습니다.', 'error'));
    expect(like).not.toBeDisabled();
    expect(like).toHaveAccessibleName('게시글 추천');
    expect(like).toHaveTextContent('추천 2');
  });

  it('이미 추천한 글이면 서버 사유(409)를 그대로 알리고 추천수를 되돌린다 (DIP I6 ④)', async () => {
    mocks.likePost.mockRejectedValueOnce({ response: { status: 409, data: { message: '이미 추천한 게시글입니다.' } } });
    await renderDetail();
    const like = await screen.findByRole('button', { name: '게시글 추천' });

    fireEvent.click(like);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('이미 추천한 게시글입니다.', 'error'));
    expect(like).toHaveTextContent('추천 2');
  });

  it('이미 추천한 글(서버 판정)은 추천함으로 보이고 누를 수 없다 — 409 를 미리 막는다 (2026-10-01)', async () => {
    await renderDetail({ recommended: true });
    const like = await screen.findByRole('button', { name: '게시글 추천함' });

    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-pressed', 'true');
    expect(like).toHaveTextContent('추천함 2');
    fireEvent.click(like);
    expect(mocks.likePost).not.toHaveBeenCalled();
  });

  it('추천에 성공하면 같은 방문에서 추천함으로 바뀐다 (2026-10-01)', async () => {
    await renderDetail();
    fireEvent.click(await screen.findByRole('button', { name: '게시글 추천' }));

    const done = await screen.findByRole('button', { name: '게시글 추천함' });
    expect(done).toHaveTextContent('추천함 3');
    expect(done).toBeDisabled();
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

  /*
    [잠금 동등성] 추천·삭제·해결 표시·부가 동작(스크랩 등 슬롯 기여)은 잠금 하나(actionPendingRef + activeAction)를 함께 쓴다.
    부가 동작이 이 잠금을 잃으면(기여가 자기 잠금을 가지면) 삭제 확인·진행 중에 스크랩이 나가거나 스크랩 저장 중에 글이
    지워진다(설계서 §16.4). 아래 네 시험이 버튼 상태와 같은 tick 의 재진입을 함께 본다.
  */
  it('삭제 확인·진행 중에는 부가 동작도 누를 수 없다', async () => {
    let answerConfirm!: (value: boolean) => void;
    mocks.confirm.mockReturnValueOnce(new Promise<boolean>((resolve) => {
      answerConfirm = resolve;
    }));
    let rejectDelete!: (reason?: unknown) => void;
    mocks.deleteArticle.mockReturnValueOnce(new Promise((_, reject) => {
      rejectDelete = reject;
    }));
    await renderDetail();
    const action = await screen.findByRole('button', { name: '게시글 보관' });

    fireEvent.click(screen.getByRole('button', { name: '게시글 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    // 확인 대화상자가 열려 있는 동안
    expect(action).toBeDisabled();
    fireEvent.click(action);

    await act(async () => { answerConfirm(true); });
    await waitFor(() => expect(mocks.deleteArticle).toHaveBeenCalledTimes(1));
    // 서버 삭제가 진행 중인 동안
    expect(action).toBeDisabled();
    fireEvent.click(action);
    expect(mocks.submit).not.toHaveBeenCalled();

    rejectDelete(new Error('delete failed'));
    await waitFor(() => expect(action).toBeEnabled());
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it('부가 동작 진행 중에는 추천·삭제를 누를 수 없다', async () => {
    let resolveSubmit!: () => void;
    mocks.submit.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    }));
    await renderDetail();

    fireEvent.click(await screen.findByRole('button', { name: '게시글 보관' }));
    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    const like = screen.getByRole('button', { name: '게시글 추천' });
    const remove = screen.getByRole('button', { name: '게시글 삭제' });
    expect(like).toBeDisabled();
    expect(remove).toBeDisabled();
    fireEvent.click(like);
    fireEvent.click(remove);
    expect(mocks.likePost).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();

    await act(async () => { resolveSubmit(); });
    await waitFor(() => expect(remove).toBeEnabled());
    expect(like).toBeEnabled();
  });

  it.each([
    ['부가 동작 → 삭제', 'post'],
    ['삭제 → 부가 동작', 'delete'],
  ] as const)('같은 tick 에 %s 순서로 눌러도 먼저 누른 하나만 나간다', async (_order, first) => {
    mocks.confirm.mockResolvedValue(false);
    await renderDetail();
    const action = await screen.findByRole('button', { name: '게시글 보관' });
    const remove = screen.getByRole('button', { name: '게시글 삭제' });

    // 화면 상태(disabled)가 반영되기 전이므로 두 번째 클릭을 막는 것은 ref 다.
    act(() => {
      fireEvent.click(first === 'post' ? action : remove);
      fireEvent.click(first === 'post' ? remove : action);
    });

    await waitFor(() => expect(remove).toBeEnabled());
    expect(mocks.submit).toHaveBeenCalledTimes(first === 'post' ? 1 : 0);
    expect(mocks.confirm).toHaveBeenCalledTimes(first === 'post' ? 0 : 1);
  });

  it('해결 표시 중에는 부가 동작을 누를 수 없다', async () => {
    let resolveSolve!: () => void;
    mocks.markQuestionSolved.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveSolve = resolve;
    }));
    await renderDetail({ qnaSttsCd: 'OPEN' }, { tmpltId: 'TMPLT_QNA' });
    const action = await screen.findByRole('button', { name: '게시글 보관' });

    fireEvent.click(screen.getByRole('button', { name: '해결됨으로 표시' }));
    await waitFor(() => expect(mocks.markQuestionSolved).toHaveBeenCalledTimes(1));
    expect(action).toBeDisabled();
    fireEvent.click(action);
    expect(mocks.submit).not.toHaveBeenCalled();

    await act(async () => { resolveSolve(); });
    await waitFor(() => expect(action).toBeEnabled());
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
