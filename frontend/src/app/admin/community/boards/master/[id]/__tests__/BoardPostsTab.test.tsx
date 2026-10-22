import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ push: vi.fn(), getPosts: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA',
  useSearchParams: () => new URLSearchParams('tab=posts'),
}));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { getPosts: mocks.getPosts } }));

import { BoardPostsTab } from '../BoardPostsTab';

/** 운영 화면 게시물 탭(ADR-0040 §5.4) — A2 는 목록(제목·작성자·작성일·게시 기간)만 보인다. */
describe('BoardPostsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPosts.mockResolvedValue({
      list: [
        { pstSn: 7, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: '연차 안내', userNm: '홍길동', crtDt: '2026-10-01T09:00:00', pstBgngYmd: '20261001', pstEndYmd: '20261231', scrtYn: 'Y', useYn: 'Y', userId: 'u', pstCn: '' },
        { pstSn: 8, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: '기간 없는 글', userNm: '김', crtDt: '2026-10-02T09:00:00', useYn: 'Y', userId: 'u', pstCn: '' },
      ],
      total: 2,
      totalPage: 1,
    });
  });

  function renderTab() {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><BoardPostsTab bbsId="BBSMSTR_AAAAAAAAAAAA" boardName="공지사항" /></QueryClientProvider>);
  }

  it('1 기반 쪽으로 이 게시판의 글을 읽고 게시 기간·비밀글을 보인다', async () => {
    renderTab();
    expect(await screen.findByText('연차 안내')).toBeInTheDocument();
    expect(mocks.getPosts).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', { page: 1, size: 20 });
    expect(screen.getByText('2026-10-01 ~ 2026-12-31')).toBeInTheDocument();
    expect(screen.getByText('기간 없음')).toBeInTheDocument();
    expect(screen.getByText('비밀글')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '게시물' })).toBeInTheDocument();
  });

  it('글을 고르면 글 상세를 연다', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '연차 안내 글 상세 열기' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/community/boards/detail?bbsId=BBSMSTR_AAAAAAAAAAAA&pstSn=7');
  });
});
