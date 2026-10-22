import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CommunityBoardClient from '../CommunityBoardClient';

/**
 * 게시글 모아보기(`/admin/community/board`) 동등성 그물(Phase 2 커뮤니티 후속 C0).
 *
 * 이 화면을 게시판 기능 소유로 옮기고 조회 시점을 조회/Enter(G2)로 바꾸는 동안 사용자에게 보이는 행동이 같아야 한다.
 * 게시판 전환·행·새 게시글 목적지·`?bbsId=` 진입·조회 실패를 고정한다. 바뀌는 것은 검색어 조회 시점 한 가지다.
 */
const BOARD_OPTIONS = [
  { value: 'BBSMSTR_AAAAAAAAAAAA', label: '공지사항' },
  { value: 'BBSMSTR_CCCCCCCCCCCC', label: '업무게시판' },
];

const mocks = vi.hoisted(() => ({
  params: new Map<string, string>(),
  push: vi.fn(),
  getPosts: vi.fn(),
  boardOptions: {
    options: [] as { value: string; label: string }[],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => mocks.params.get(key) ?? null }),
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { getPosts: mocks.getPosts } }));
vi.mock('@/hooks/api/use-board-options', () => ({
  useBoardOptions: () => mocks.boardOptions,
}));

const post = (pstSn: number, title: string) => ({ pstSn, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: title, userNm: '홍길동', crtDt: '2026-10-01 09:00:00', inqCnt: 3, commentCnt: 1 });

function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CommunityBoardClient /></QueryClientProvider>);
}

const lastQuery = () => mocks.getPosts.mock.calls.at(-1);

describe('게시글 모아보기 동등성', () => {
  beforeEach(() => {
    mocks.params.clear();
    mocks.push.mockReset();
    mocks.getPosts.mockReset();
    mocks.getPosts.mockResolvedValue({ list: [post(7, '첫 공지')], total: 25 });
    mocks.boardOptions.options = BOARD_OPTIONS;
    mocks.boardOptions.isLoading = false;
    mocks.boardOptions.error = null;
    mocks.boardOptions.refetch.mockReset();
  });

  // [2026-10-23 ADR-0040 결정 11] 선택지가 서버에서 오므로 비거나 실패할 수 있다. 시드 폴백으로 덮지 않고 사실대로 알린다.
  it('이용할 수 있는 게시판이 없으면 그렇게 알린다', async () => {
    mocks.boardOptions.options = [];
    renderScreen();
    expect(await screen.findByText('지금 이용할 수 있는 게시판이 없습니다.')).toBeInTheDocument();
  });

  it('선택지를 불러오지 못하면 알리고 다시 불러올 수 있다', async () => {
    mocks.boardOptions.options = [];
    mocks.boardOptions.error = new Error('503');
    renderScreen();
    expect(await screen.findByText('게시판 목록을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('지금 이용할 수 있는 게시판이 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(mocks.boardOptions.refetch).toHaveBeenCalled();
  });

  it('선택지가 있으면 빈 상태 안내를 보이지 않는다', async () => {
    renderScreen();
    await screen.findByText('첫 공지');
    expect(screen.queryByText('지금 이용할 수 있는 게시판이 없습니다.')).toBeNull();
  });

  it('주소 없이 들어오면 공지사항 1페이지를 조회한다', async () => {
    renderScreen();
    expect(await screen.findByText('첫 공지')).toBeInTheDocument();
    expect(mocks.getPosts).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', expect.objectContaining({ page: 1, size: 10 }));
  });

  it('?bbsId= 로 들어오면 그 게시판으로 시작한다', async () => {
    mocks.params.set('bbsId', 'BBSMSTR_CCCCCCCCCCCC');
    renderScreen();
    await screen.findByText('첫 공지');
    expect(mocks.getPosts.mock.calls.every(([bbsId]) => bbsId === 'BBSMSTR_CCCCCCCCCCCC')).toBe(true);
    expect((screen.getByLabelText('게시판 선택') as HTMLSelectElement).value).toBe('BBSMSTR_CCCCCCCCCCCC');
  });

  it('게시판을 바꾸면 그 게시판의 1페이지를 조회한다', async () => {
    renderScreen();
    await screen.findByText('첫 공지');
    fireEvent.click(screen.getByRole('button', { name: '2 페이지로 이동' }));
    await waitFor(() => expect(lastQuery()?.[1]).toEqual(expect.objectContaining({ page: 2 })));
    fireEvent.change(screen.getByLabelText('게시판 선택'), { target: { value: 'BBSMSTR_CCCCCCCCCCCC' } });
    await waitFor(() => expect(lastQuery()).toEqual(['BBSMSTR_CCCCCCCCCCCC', expect.objectContaining({ page: 1 })]));
  });

  it('행을 누르면 그 게시글 상세로 간다', async () => {
    renderScreen();
    fireEvent.click(await screen.findByRole('button', { name: '첫 공지 게시글 보기' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/community/boards/detail?bbsId=BBSMSTR_AAAAAAAAAAAA&pstSn=7');
  });

  it('새 게시글은 고른 게시판의 작성 화면으로 간다', async () => {
    renderScreen();
    await screen.findByText('첫 공지');
    fireEvent.change(screen.getByLabelText('게시판 선택'), { target: { value: 'BBSMSTR_CCCCCCCCCCCC' } });
    fireEvent.click(screen.getByRole('button', { name: /새 게시글/ }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/community/boards/insert-board-article?bbsId=BBSMSTR_CCCCCCCCCCCC');
  });

  it('조회 실패는 0건이 아니라 오류와 다시 시도로 보인다', async () => {
    mocks.getPosts.mockRejectedValue(new Error('서버 오류'));
    renderScreen();
    expect(await screen.findByRole('alert')).toHaveTextContent('게시글을 불러오지 못했습니다');
    expect(screen.queryByText('표시할 게시글이 없습니다')).toBeNull();
    const calls = mocks.getPosts.mock.calls.length;
    mocks.getPosts.mockResolvedValue({ list: [post(8, '다시 불러온 글')], total: 1 });
    fireEvent.click(screen.getByRole('button', { name: /다시 시도/ }));
    expect(await screen.findByText('다시 불러온 글')).toBeInTheDocument();
    expect(mocks.getPosts.mock.calls.length).toBeGreaterThan(calls);
  });

  // 이행 뒤 바뀐 유일한 행동: 조회 시점은 조회 또는 Enter 다(카탈로그 G2). 종전에는 입력을 디바운스해 바로 조회했다.
  it('검색어로 그 게시판의 1페이지를 조회한다', async () => {
    renderScreen();
    await screen.findByText('첫 공지');
    fireEvent.click(screen.getByRole('button', { name: '2 페이지로 이동' }));
    await waitFor(() => expect(lastQuery()?.[1]).toEqual(expect.objectContaining({ page: 2 })));
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '예산' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(lastQuery()).toEqual(['BBSMSTR_AAAAAAAAAAAA', expect.objectContaining({ page: 1, searchWrd: '예산' })]));
  });

  it('입력만으로는 조회하지 않는다', async () => {
    renderScreen();
    await screen.findByText('첫 공지');
    const calls = mocks.getPosts.mock.calls.length;
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '예산' } });
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(mocks.getPosts.mock.calls.length).toBe(calls);
    expect(mocks.getPosts.mock.calls.some(([, params]) => params.searchWrd === '예산')).toBe(false);
  });

  it('검색 결과가 없으면 데이터 없음이 아니라 검색 결과 없음으로 말한다', async () => {
    mocks.getPosts.mockResolvedValue({ list: [], total: 0 });
    renderScreen();
    expect(await screen.findByText('선택한 게시판에 등록된 게시글이 없습니다.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('제목'), { target: { value: '예산' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(await screen.findByText('"예산"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
  });
});
