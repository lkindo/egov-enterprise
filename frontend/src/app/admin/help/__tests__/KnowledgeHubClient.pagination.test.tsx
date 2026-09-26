import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KnowledgeHubClient from '../KnowledgeHubClient';

const mocks = vi.hoisted(() => ({ getArticles: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/admin/help/faq', useSearchParams: () => new URLSearchParams('tab=FAQ') }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['BOARD_READ'] } }) }));
vi.mock('@/services/business/knowledge/knowledgeService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/business/knowledge/knowledgeService')>()),
  knowledgeService: { getArticles: mocks.getArticles, getHotArticles: async () => ({ list: [] }), getStats: async () => ({}) },
}));

describe('knowledge list server pagination', () => {
  beforeEach(() => {
    mocks.getArticles.mockReset().mockImplementation(async ({ page, orderBy }) => ({
      list: [{ pstSn: page * 20 + 1, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: `${orderBy}-페이지-${page + 1}`, inqCnt: 1 }], total: 41,
    }));
  });
  it('can reach later records and resets to page one for server-wide sorting and search', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KnowledgeHubClient defaultTab="FAQ" /></QueryClientProvider>);
    // 최근 활동도 같은 첫 쪽을 보이므로 목록 항목 버튼으로 찾는다.
    await screen.findByRole('button', { name: 'date-페이지-1 상세 보기' });
    // [DIP B5 F10] 최근 활동은 기본 목록과 같은 조회다 — 첫 화면은 게시판을 한 번만 부른다.
    expect(mocks.getArticles).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('link', { name: '2' }));
    await screen.findByText('date-페이지-2');
    expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 20, orderBy: 'date' }));
    fireEvent.click(screen.getByRole('button', { name: '조회순' }));
    await screen.findByText('views-페이지-1');
    expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, orderBy: 'views' }));
    fireEvent.click(screen.getByRole('link', { name: '3' }));
    await screen.findByText('views-페이지-3');
    fireEvent.change(screen.getByRole('textbox', { name: '지식 검색어' }), { target: { value: '검색어' } });
    // [DIP C9] 검색어는 조회 버튼이나 Enter 로 적용한다.
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, searchWrd: '검색어', orderBy: 'views' })));
  });

  it('🚨 검색 안내가 실제 범위(제목)를 말한다 — 서버는 제목만 찾는다 (DIP V9)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KnowledgeHubClient defaultTab="FAQ" /></QueryClientProvider>);
    const input = await screen.findByRole('textbox', { name: '지식 검색어' });

    expect(input).toHaveAttribute('placeholder', '제목 검색...');
    fireEvent.change(input, { target: { value: '연차' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ searchCnd: '0', searchWrd: '연차' })));
  });

  it('검색어는 입력만으로 조회하지 않는다 (DIP C9)', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KnowledgeHubClient defaultTab="FAQ" /></QueryClientProvider>);
    const input = await screen.findByRole('textbox', { name: '지식 검색어' });
    await waitFor(() => expect(mocks.getArticles).toHaveBeenCalled());
    const calls = mocks.getArticles.mock.calls.length;

    fireEvent.change(input, { target: { value: '입력 중' } });
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(mocks.getArticles).toHaveBeenCalledTimes(calls);
  });
});
