import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inProjection, pageInProjection } from '@/test-utils/projection';

/**
 * 협업 허브 동등성 그물(허브 분해 H0). 허브를 셸과 탭 기여로 나누기 전의 화면 동작을 고정한다 — 이후 변경은 이 기대값을
 * 사유와 함께 바꿀 때만 화면을 바꿀 수 있다.
 *
 * 고정하는 것: 제목, 탭 이름·순서·aria-selected 와 `?tab=` 해석, 탭 전환의 URL(허용 키만 남긴다), 탭 전환이 검색어를
 * 비우는 것, 탭별 설명·머리 동작('주소록 관리'·'신규 발송'·'스크랩 등록')·도구 막대 링크, 행을 눌렀을 때의 목적지.
 * 서비스는 대역하고 화면 구성 요소는 실제 것을 그린다. 쪽지·스크랩이 투영으로 빠진 생성물에서는 그 탭의 시험을 등록하지 않는다.
 */

const NOTE_SERVICE = 'frontend/src/services/business/user/NoteService.ts';
const SCRAP_SERVICE = 'frontend/src/services/business/user/ScrapService.ts';
const ADDRESS_BOOK_LIST = '/admin/collaboration/address-book/select-address-book-list';
const MAIL_SEND = '/admin/collaboration/mail-send';
const bothTabsInProjection = inProjection([NOTE_SERVICE, SCRAP_SERVICE]);

const mocks = vi.hoisted(() => ({
  query: '',
  rerender: () => {},
  push: vi.fn(),
  replace: vi.fn(),
  getReceivedNotes: vi.fn(),
  scrapRows: [] as Array<Record<string, unknown>>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => '/admin/collaboration',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/contexts/AuthContext', () => {
  const user = { id: 'admin', role: 'ROLE_ADMIN', permissions: ['NOTE_READ', 'SCRAP_READ', 'SCRAP_CREATE', 'SCRAP_UPDATE', 'ADBK_READ', 'MAIL_SEND'], authorizationVersion: 'v1' };
  return { useAuth: () => ({ user }), useOptionalAuth: () => ({ user }) };
});
vi.mock('@/services/business/user/NoteService', () => ({
  noteService: { getReceivedNotes: mocks.getReceivedNotes },
}));
vi.mock('@/queries/scrap-query-options', () => ({
  scrapKeys: { all: ['scraps'], lists: () => ['scraps', 'list'] },
  scrapQueryOptions: {
    list: () => ({
      queryKey: ['scraps', 'list'],
      queryFn: async () => ({ list: mocks.scrapRows, total: mocks.scrapRows.length }),
    }),
  },
  scrapMutationOptions: {
    create: () => ({ mutationFn: vi.fn() }),
    update: () => ({ mutationFn: vi.fn() }),
  },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn(), success: vi.fn(), error: vi.fn(), removeToast: () => {} }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));

import CollaborationHubClient from '../CollaborationHubClient';

function renderHub(query: string, defaultTab = 'MESSAGES') {
  mocks.query = query;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const tree = () => (
    <QueryClientProvider client={client}>
      <CollaborationHubClient defaultTab={defaultTab} />
    </QueryClientProvider>
  );
  const view = render(tree());
  // 라우터가 주소를 바꾸면 다시 그린다 — 허브는 탭을 URL 에서 읽는다.
  mocks.rerender = () => view.rerender(tree());
  return view;
}

const tabState = () => within(screen.getByRole('tablist', { name: '협업 데이터 구분' })).getAllByRole('tab')
  .map(tab => [tab.textContent, tab.getAttribute('aria-selected')]);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getReceivedNotes.mockResolvedValue({
    list: [{ noteSn: 5, noteSj: '주간 회의 안내', openYn: 'N', trnsmiterNm: '홍길동', crtDt: '2026-10-01 09:00:00' }],
    total: 1,
  });
  mocks.scrapRows = [{ scrapSn: 17, scrapNm: '참고 자료', scrapUrl: 'https://example.com/reference', scrapExpln: '', crtDt: '2026-10-02' }];
  mocks.replace.mockImplementation((url: string) => {
    mocks.query = url.split('?')[1] ?? '';
    act(() => mocks.rerender());
  });
});

describe('협업 허브 동등성(허브 분해 전)', () => {
  if (bothTabsInProjection) it('제목과 탭 이름·순서, `?tab=` 해석과 기본 탭을 고정한다', async () => {
    const first = renderHub('');
    expect(screen.getByRole('heading', { level: 1, name: '협업 및 네트워크 허브' })).toBeInTheDocument();
    expect(tabState()).toEqual([['쪽지', 'true'], ['스크랩', 'false']]);
    await screen.findByText('주간 회의 안내');
    first.unmount();

    // 대소문자를 가리지 않는다.
    renderHub('tab=scraps');
    expect(tabState()).toEqual([['쪽지', 'false'], ['스크랩', 'true']]);
  });

  if (bothTabsInProjection) it('모르는 탭 값은 페이지 기본 탭을 연다', () => {
    renderHub('tab=COMMUNITY', 'SCRAPS');
    expect(tabState()).toEqual([['쪽지', 'false'], ['스크랩', 'true']]);
  });

  if (bothTabsInProjection) it('탭 전환은 `tab` 하나만 남기고 다른 쿼리는 버린다', async () => {
    renderHub('tab=MESSAGES&q=%ED%99%8D&page=3');
    fireEvent.click(screen.getByRole('tab', { name: '스크랩' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/collaboration?tab=SCRAPS', { scroll: false });
    expect(tabState()).toEqual([['쪽지', 'false'], ['스크랩', 'true']]);
  });

  if (bothTabsInProjection) it('쪽지 탭: 설명·검색·머리 동작·행 목적지', async () => {
    renderHub('tab=MESSAGES');
    expect(screen.getByText('내가 받은 쪽지를 조회합니다. 제목을 선택하면 쪽지함으로 이동합니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('쪽지 제목·내용')).toBeInTheDocument();
    if (pageInProjection(MAIL_SEND)) {
      expect(screen.getByRole('link', { name: '신규 발송' })).toHaveAttribute('href', MAIL_SEND);
    }
    if (pageInProjection(ADDRESS_BOOK_LIST)) {
      expect(screen.getByRole('link', { name: '주소록 관리' })).toHaveAttribute('href', ADDRESS_BOOK_LIST);
    }
    expect(screen.queryByRole('button', { name: /스크랩 등록/ })).toBeNull();
    expect(screen.queryByRole('link', { name: '스크랩 전체 목록' })).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: '쪽지함 열기' }));
    expect(mocks.push).toHaveBeenCalledWith('/note');
  });

  if (bothTabsInProjection) it('스크랩 탭: 설명·검색 없음·머리 동작·도구 막대 링크·행은 수정 모달', async () => {
    renderHub('tab=SCRAPS');
    expect(screen.getByText('내가 저장한 스크랩을 조회합니다. 제목을 선택하면 상세로 이동합니다.')).toBeInTheDocument();
    // 스크랩 API 는 검색 파라미터가 없어 검색 칸을 두지 않는다.
    expect(screen.queryByRole('search')).toBeNull();
    expect(screen.getByRole('button', { name: /스크랩 등록/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '스크랩 전체 목록' })).toHaveAttribute('href', '/admin/collaboration/scraps/selectScrapList');
    if (pageInProjection(ADDRESS_BOOK_LIST)) {
      expect(screen.getByRole('link', { name: '주소록 관리' })).toHaveAttribute('href', ADDRESS_BOOK_LIST);
    }
    // 허브 분해 전에는 메일 발송 링크가 쪽지 탭의 주 동작이었다.
    expect(screen.queryByRole('link', { name: '신규 발송' })).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: '참고 자료 스크랩 열기' }));
    expect(await screen.findByText('스크랩 수정')).toBeInTheDocument();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  if (bothTabsInProjection) it('탭을 바꿨다 돌아오면 쪽지 검색어가 비어 있다', async () => {
    renderHub('tab=MESSAGES');
    fireEvent.change(screen.getByLabelText('쪽지 제목·내용'), { target: { value: '회의' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.getReceivedNotes).toHaveBeenLastCalledWith(expect.objectContaining({ searchWrd: '회의' })));

    fireEvent.click(screen.getByRole('tab', { name: '스크랩' }));
    fireEvent.click(screen.getByRole('tab', { name: '쪽지' }));
    expect(screen.getByLabelText('쪽지 제목·내용')).toHaveValue('');
    await waitFor(() => expect(mocks.getReceivedNotes).toHaveBeenLastCalledWith(expect.objectContaining({ searchWrd: '' })));
  });
});
