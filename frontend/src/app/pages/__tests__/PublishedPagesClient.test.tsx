import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublishedPagesClient } from '../PublishedPagesClient';

const mocks = vi.hoisted(() => ({
  getPublishedPages: vi.fn(),
  permissions: [] as string[],
}));

vi.mock('@/services/business/cms/CmsService', () => ({ cmsService: { getPublishedPages: mocks.getPublishedPages } }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));

const pageOf = (list: { contsPathNm: string; contsTtl: string; contsExpln?: string; publishedAt?: string }[], total = list.length) =>
  ({ list, total, page: 1, size: 10, totalPage: Math.max(1, Math.ceil(total / 10)) });

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><PublishedPagesClient /></QueryClientProvider>);
}

beforeEach(() => {
  mocks.getPublishedPages.mockReset();
  mocks.permissions = [];
});

describe('PublishedPagesClient — 사용자용 안내 페이지 목록(ADR-0042)', () => {
  it('게시본 제목·요약·게시일을 보이고 제목이 그 페이지로 잇는다', async () => {
    mocks.getPublishedPages.mockResolvedValue(pageOf([
      { contsPathNm: 'leave-guide', contsTtl: '휴가 신청 안내', contsExpln: '휴가 신청 절차', publishedAt: '2026-10-20T09:30:00' },
    ]));
    renderList();
    const link = await screen.findByRole('link', { name: '휴가 신청 안내' });
    expect(link).toHaveAttribute('href', '/pages/leave-guide');
    expect(screen.getByRole('heading', { level: 2, name: '휴가 신청 안내' })).toBeInTheDocument();
    expect(screen.getByText('휴가 신청 절차')).toBeInTheDocument();
    expect(screen.getByText('2026-10-20')).toHaveAttribute('datetime', '2026-10-20');
    expect(screen.getByText('게시된 안내 페이지 1건')).toBeInTheDocument();
    expect(mocks.getPublishedPages).toHaveBeenCalledWith({ keyword: '', page: 1, size: 10 },
      expect.objectContaining({ suppressErrorToast: true }));
  });

  it('처음부터 게시된 페이지가 없으면 데이터 없음으로 말한다(검색 조건 안내 없음)', async () => {
    mocks.getPublishedPages.mockResolvedValue(pageOf([]));
    renderList();
    const empty = await screen.findByTestId('published-pages-empty');
    expect(empty).toHaveTextContent('게시된 안내 페이지가 없습니다.');
    expect(empty).toHaveTextContent('관리자가 안내 페이지를 게시하면 이 목록에 보입니다.');
    expect(empty).not.toHaveTextContent('검색');
    expect(within(empty).queryByRole('link')).toBeNull();
  });

  it('작성할 수 있는 사람에게는 빈 목록에서 콘텐츠 페이지 관리로 잇는다', async () => {
    mocks.permissions = ['CMS_ADMIN_READ'];
    mocks.getPublishedPages.mockResolvedValue(pageOf([]));
    renderList();
    const empty = await screen.findByTestId('published-pages-empty');
    expect(within(empty).getByRole('link', { name: '콘텐츠 페이지 관리' })).toHaveAttribute('href', '/admin/system/content-pages');
  });

  it('검색어에 맞는 것이 없으면 결과 없음으로 말하고, 검색어는 주소가 아니라 화면 상태로 서버에 보낸다', async () => {
    mocks.getPublishedPages.mockImplementation(async ({ keyword }: { keyword: string }) => (keyword
      ? pageOf([])
      : pageOf([{ contsPathNm: 'leave-guide', contsTtl: '휴가 신청 안내' }])));
    renderList();
    await screen.findByRole('link', { name: '휴가 신청 안내' });
    fireEvent.change(screen.getByLabelText('제목·요약'), { target: { value: '출장' } });
    fireEvent.submit(screen.getByRole('search', { name: '안내 페이지 찾기' }));
    const empty = await screen.findByTestId('published-pages-empty');
    expect(empty).toHaveTextContent('"출장"에 대한 검색 결과가 없습니다.');
    expect(empty).toHaveTextContent('다른 검색어로 찾거나 초기화를 눌러 전체 목록을 보세요.');
    expect(mocks.getPublishedPages).toHaveBeenLastCalledWith({ keyword: '출장', page: 1, size: 10 }, expect.anything());
    expect(window.location.search).toBe('');

    fireEvent.click(screen.getByRole('button', { name: '초기화' }));
    expect(await screen.findByRole('link', { name: '휴가 신청 안내' })).toBeInTheDocument();
  });

  it('조회에 실패하면 목록 자리에서 알리고 다시 시도할 수 있다 — 빈 목록으로 위장하지 않는다', async () => {
    mocks.getPublishedPages.mockRejectedValueOnce(new Error('503'))
      .mockResolvedValueOnce(pageOf([{ contsPathNm: 'leave-guide', contsTtl: '휴가 신청 안내' }]));
    renderList();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('안내 페이지 목록을 불러오지 못했습니다.');
    expect(screen.queryByTestId('published-pages-empty')).toBeNull();
    fireEvent.click(within(alert).getByRole('button', { name: '다시 시도' }));
    await waitFor(() => expect(screen.getByRole('link', { name: '휴가 신청 안내' })).toBeInTheDocument());
  });
});
