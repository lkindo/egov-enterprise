import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KnowledgeHubClient from '../KnowledgeHubClient';

const mocks = vi.hoisted(() => ({ getArticles: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/admin/help/faq', useSearchParams: () => new URLSearchParams('tab=FAQ') }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['BOARD_READ'] } }) }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({ knowledgeService: { getArticles: mocks.getArticles, getHotArticles: async () => ({ list: [] }), getStats: async () => ({}), getActivities: async () => [] } }));

describe('knowledge list server pagination', () => {
  beforeEach(() => {
    mocks.getArticles.mockReset().mockImplementation(async ({ page, orderBy }) => ({
      list: [{ pstSn: page * 20 + 1, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: `${orderBy}-페이지-${page + 1}`, inqCnt: 1 }], total: 41,
    }));
  });
  it('can reach later records and resets to page one for server-wide sorting and search', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KnowledgeHubClient defaultTab="FAQ" /></QueryClientProvider>);
    await screen.findByText('date-페이지-1');
    fireEvent.click(screen.getByRole('link', { name: '2' }));
    await screen.findByText('date-페이지-2');
    expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, size: 20, orderBy: 'date' }));
    fireEvent.click(screen.getByRole('button', { name: '조회순' }));
    await screen.findByText('views-페이지-1');
    expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, orderBy: 'views' }));
    fireEvent.click(screen.getByRole('link', { name: '3' }));
    await screen.findByText('views-페이지-3');
    fireEvent.change(screen.getByRole('textbox', { name: '지식 검색어' }), { target: { value: '검색어' } });
    await waitFor(() => expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, searchWrd: '검색어', orderBy: 'views' })));
  });
});
