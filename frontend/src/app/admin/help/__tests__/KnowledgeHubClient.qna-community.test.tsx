import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KnowledgeHubClient from '../KnowledgeHubClient';

/**
 * [2026-10-01 결정 20] Q&A 탭은 '미해결만'(OPEN) 으로 좁히고, 커뮤니티 탭은 커뮤니티 목록·가입 화면으로 잇는다.
 * 종전에는 답변 대기 값이 OPEN·QA01 두 가지라 하나의 조건으로 걸 수 없었고, 커뮤니티 탭에서 가입할 길이 없었다.
 */
const mocks = vi.hoisted(() => ({ getArticles: vi.fn(), push: vi.fn(), tab: 'QNA' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
  usePathname: () => '/admin/help/faq',
  useSearchParams: () => new URLSearchParams(`tab=${mocks.tab}`),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['BOARD_READ'] } }) }));
vi.mock('@/services/business/knowledge/knowledgeService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/business/knowledge/knowledgeService')>()),
  knowledgeService: { getArticles: mocks.getArticles, getHotArticles: async () => ({ list: [] }), getStats: async () => ({}) },
}));

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><KnowledgeHubClient /></QueryClientProvider>);
}

describe('지식 허브 Q&A·커뮤니티', () => {
  beforeEach(() => {
    mocks.push.mockReset();
    mocks.getArticles.mockReset().mockResolvedValue({ list: [], total: 0 });
  });

  it('Q&A 탭의 미해결만은 OPEN 으로 조회하고 1쪽으로 돌아간다, 다시 누르면 조건을 푼다', async () => {
    mocks.tab = 'QNA';
    renderHub();
    const toggle = await screen.findByRole('button', { name: '미해결만' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ qnaStatus: 'OPEN', page: 0 })));
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.getArticles).toHaveBeenLastCalledWith(expect.objectContaining({ qnaStatus: undefined })));
  });

  it('Q&A 가 아닌 탭에는 미해결 조건이 없다', async () => {
    mocks.tab = 'FAQ';
    renderHub();
    await waitFor(() => expect(mocks.getArticles).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '미해결만' })).not.toBeInTheDocument();
  });

  it('커뮤니티 탭은 권한과 무관하게 커뮤니티 목록·가입 화면으로 잇는다', async () => {
    mocks.tab = 'COMMUNITY';
    renderHub();
    fireEvent.click(await screen.findByRole('button', { name: /커뮤니티 목록·가입/ }));
    expect(mocks.push).toHaveBeenCalledWith('/cop/cmy/selectCommunityList');
  });
});
