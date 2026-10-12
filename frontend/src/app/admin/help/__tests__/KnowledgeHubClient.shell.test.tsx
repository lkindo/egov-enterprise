import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 지식 허브 게시판 셸의 호스트 계약(허브 분해 H2). 셸 고유 탭은 위키·FAQ·Q&A 이고 다른 기능의 탭은 hub-tabs 레지스트리에서 온다 —
 * 여기서는 레지스트리를 가짜 기여로 바꿔 셸이 하는 일만 본다. 실제 커뮤니티 탭은 커뮤니티 디렉터리의 시험이 실제 레지스트리로 본다.
 */

const mocks = vi.hoisted(() => ({ search: '', getArticles: vi.fn(), tabs: [] as unknown[] }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/admin/help',
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'u', permissions: ['BOARD_READ'], authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/services/business/knowledge/knowledgeService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/business/knowledge/knowledgeService')>()),
  knowledgeService: { getArticles: mocks.getArticles, getHotArticles: async () => ({ list: [] }), getStats: async () => ({}) },
}));
vi.mock('@/extensions/generated-hub-tabs', () => ({ hubTabs: [mocks.tabs] }));

import KnowledgeHubClient from '../KnowledgeHubClient';

const Actions = () => <button type="button">가짜 머리 동작</button>;
const tab = (id: string, order: number, label: string, bbsId: string, hub = 'knowledge') =>
  ({ id, hub, order, label, view: { description: `${label} 설명`, icon: BookOpen, bbsId, Actions }, visibleWhen: { always: '시험' } });

function renderHub(search: string) {
  mocks.search = search;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><KnowledgeHubClient /></QueryClientProvider>);
}
const tabNames = () => within(screen.getByRole('tablist', { name: '지식 카테고리' })).getAllByRole('tab')
  .map((element) => [element.querySelector('span span')?.textContent, element.getAttribute('aria-selected')]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getArticles.mockResolvedValue({ list: [], total: 0 });
  // 다른 허브의 탭은 그리지 않는다. 대역 모듈이 같은 배열을 들고 있어 제자리에서 바꾼다.
  mocks.tabs.splice(0, Infinity, tab('LOUNGE', 50, '라운지', 'BBSMSTR_LOUNGE'), tab('SCRAPS', 5, '스크랩', 'X', 'collaboration'),
    tab('CLUB', 40, '동호회', 'BBSMSTR_CLUB'));
});

describe('지식 허브 게시판 셸', () => {
  it('셸 고유 탭 뒤에 자기 허브의 기여 탭을 order 순으로 붙이고, 기여 탭은 그 게시판을 조회하며 머리 동작을 둔다', async () => {
    renderHub('tab=club');
    expect(tabNames()).toEqual([['위키', 'false'], ['자주 묻는 질문', 'false'], ['질의응답(Q&A)', 'false'], ['동호회', 'true'], ['라운지', 'false']]);
    expect(screen.getByText('동호회 설명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '가짜 머리 동작' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.getArticles).toHaveBeenCalledWith(expect.objectContaining({ bbsId: 'BBSMSTR_CLUB' })));
  });

  it('`?bbsId=` 는 기여 탭의 게시판도 그 탭으로 연다', () => {
    renderHub('bbsId=BBSMSTR_LOUNGE');
    expect(tabNames().find(([, selected]) => selected === 'true')).toEqual(['라운지', 'true']);
  });

  it('셸 고유 탭에는 기여의 머리 동작이 없다', () => {
    renderHub('tab=FAQ');
    expect(screen.queryByRole('button', { name: '가짜 머리 동작' })).toBeNull();
  });

  it('기여가 없는 구성에서는 탭 셋만 있고, 기여 탭 값은 기본 탭(위키)으로 떨어진다', () => {
    mocks.tabs.splice(0, Infinity);
    renderHub('tab=COMMUNITY');
    expect(tabNames()).toEqual([['위키', 'true'], ['자주 묻는 질문', 'false'], ['질의응답(Q&A)', 'false']]);
  });
});
