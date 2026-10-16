import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { COMMUNITY_BOARD_ID, HELP_FAQ_BOARD_ID, QNA_BOARD_ID, WIKI_BOARD_ID } from '@/config/board-ids';
import { inProjection } from '@/test-utils/projection';

/**
 * 지식 허브 동등성 그물(허브 분해 H0). 셸 소유를 게시판으로 옮기고 커뮤니티 탭을 기여로 바꾸기 전의 화면 동작을 고정한다.
 *
 * 고정하는 것: 탭 이름·순서·aria-selected, `?tab=`·`?bbsId=` 진입과 각 탭이 조회하는 게시판, 모르는 탭 값의 기본 탭,
 * 탭 전환의 URL(`bbsId` 를 버린다), 커뮤니티 탭의 머리 동작('커뮤니티 목록·가입'·관리자 '커뮤니티 관리').
 * 커뮤니티 탭은 커뮤니티의 hub-tabs-knowledge 기여다(허브 분해 H2) — 커뮤니티가 투영으로 빠진 생성물에서는 그 탭의 기대를 원장 판정으로 거른다.
 */
const communityInProjection = inProjection('frontend/src/extensions/community/hub-tabs-knowledge.ts');

const mocks = vi.hoisted(() => ({
  search: '',
  push: vi.fn(),
  replace: vi.fn(),
  getArticles: vi.fn(),
  permissions: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => '/admin/help/faq',
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'u', role: 'ROLE_ADMIN', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/services/business/knowledge/knowledgeService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/business/knowledge/knowledgeService')>()),
  knowledgeService: { getArticles: mocks.getArticles, getHotArticles: async () => ({ list: [] }), getStats: async () => ({}) },
}));
vi.mock('@/components/business/community/CommunityManageDialog', () => ({
  CommunityManageDialog: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog" aria-label="커뮤니티 관리" /> : null),
}));

import KnowledgeHubClient from '../KnowledgeHubClient';

// 페이지가 넘기는 기본 탭은 셸 고유 탭뿐이다(허브 분해 H2 — 기여 탭은 기본 탭이 될 수 없다).
function renderHub(search: string, defaultTab?: 'WIKI' | 'FAQ' | 'QNA') {
  mocks.search = search;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><KnowledgeHubClient defaultTab={defaultTab} /></QueryClientProvider>);
}

const tabState = () => within(screen.getByRole('tablist', { name: '지식 카테고리' })).getAllByRole('tab')
  .map(tab => [tab.querySelector('span span')?.textContent, tab.getAttribute('aria-selected')]);
const LABELS = ['위키', '자주 묻는 질문', '질의응답(Q&A)', ...(communityInProjection ? ['커뮤니티'] : [])];
const selected = (name: string) => LABELS.map(label => [label, String(label === name)]);
const queriedBoard = async (bbsId: string) =>
  waitFor(() => expect(mocks.getArticles).toHaveBeenCalledWith(expect.objectContaining({ bbsId, page: 0 })));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ['BOARD_READ'];
  mocks.getArticles.mockResolvedValue({ list: [], total: 0 });
});

describe('지식 허브 동등성(허브 분해 전)', () => {
  it('탭 이름·순서와 `?tab=` 해석, 각 탭이 조회하는 게시판', async () => {
    const cases: Array<[string, string, string]> = [
      ['tab=wiki', '위키', WIKI_BOARD_ID],
      ['tab=FAQ', '자주 묻는 질문', HELP_FAQ_BOARD_ID],
      ['tab=qna', '질의응답(Q&A)', QNA_BOARD_ID],
      ...(communityInProjection ? [['tab=COMMUNITY', '커뮤니티', COMMUNITY_BOARD_ID] as [string, string, string]] : []),
    ];
    for (const [search, label, bbsId] of cases) {
      const view = renderHub(search);
      expect(tabState()).toEqual(selected(label));
      expect(screen.getByRole('heading', { level: 1, name: label })).toBeInTheDocument();
      await queriedBoard(bbsId);
      view.unmount();
      mocks.getArticles.mockClear();
    }
  });

  it('`?bbsId=` 진입은 그 게시판의 탭을 연다(탭 값보다 먼저 본다)', async () => {
    renderHub(`bbsId=${QNA_BOARD_ID}&tab=WIKI`);
    expect(tabState()).toEqual(selected('질의응답(Q&A)'));
    await queriedBoard(QNA_BOARD_ID);
  });

  if (communityInProjection) it('`?bbsId=` 진입은 기여 탭의 게시판도 그 탭으로 연다', async () => {
    renderHub(`bbsId=${COMMUNITY_BOARD_ID}&tab=WIKI`);
    expect(tabState()).toEqual(selected('커뮤니티'));
    await queriedBoard(COMMUNITY_BOARD_ID);
  });

  it('모르는 탭 값은 페이지 기본 탭, 기본 탭이 없으면 위키를 연다', () => {
    const first = renderHub('tab=HARNESS', 'QNA');
    expect(tabState()).toEqual(selected('질의응답(Q&A)'));
    first.unmount();
    renderHub('tab=NOPE');
    expect(tabState()).toEqual(selected('위키'));
  });

  it('탭 전환은 `tab` 하나만 남기고 진입용 `bbsId` 를 버린다', () => {
    renderHub(`bbsId=${QNA_BOARD_ID}&page=2`);
    fireEvent.click(screen.getByRole('tab', { name: /위키/ }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/help/faq?tab=WIKI', { scroll: false });
  });

  // H0 그물은 이 전환을 커뮤니티 탭으로 보았다. H2 뒤 커뮤니티는 기여 탭이라 원장 판정으로 걸러 같은 기대를 지킨다.
  if (communityInProjection) it('기여 탭(커뮤니티)으로 바꿔도 `tab` 하나만 남기고 `bbsId` 를 버린다', () => {
    renderHub(`bbsId=${QNA_BOARD_ID}&page=2`);
    fireEvent.click(screen.getByRole('tab', { name: /커뮤니티/ }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/help/faq?tab=COMMUNITY', { scroll: false });
  });

  if (communityInProjection) it('커뮤니티 탭: 목록·가입은 누구에게나, 커뮤니티 관리는 COMMUNITY_READ_ALL 보유자에게만', async () => {
    const plain = renderHub('tab=COMMUNITY');
    fireEvent.click(screen.getByRole('button', { name: /커뮤니티 목록·가입/ }));
    expect(mocks.push).toHaveBeenCalledWith('/cop/cmy/selectCommunityList');
    expect(screen.queryByRole('button', { name: '커뮤니티 관리' })).toBeNull();
    plain.unmount();

    mocks.permissions = ['BOARD_READ', 'COMMUNITY_READ_ALL'];
    renderHub('tab=COMMUNITY');
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 관리' }));
    expect(screen.getByRole('dialog', { name: '커뮤니티 관리' })).toBeInTheDocument();
  });

  it('커뮤니티 밖 탭에는 커뮤니티 머리 동작이 없다', () => {
    mocks.permissions = ['BOARD_READ', 'COMMUNITY_READ_ALL'];
    for (const tab of ['WIKI', 'FAQ', 'QNA']) {
      const view = renderHub(`tab=${tab}`);
      expect(screen.queryByRole('button', { name: /커뮤니티 목록·가입/ })).toBeNull();
      expect(screen.queryByRole('button', { name: '커뮤니티 관리' })).toBeNull();
      view.unmount();
    }
  });
});
