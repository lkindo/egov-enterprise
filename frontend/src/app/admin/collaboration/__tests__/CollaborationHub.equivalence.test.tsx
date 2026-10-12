import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inProjection, pageInProjection } from '@/test-utils/projection';

/**
 * 협업 허브 동등성 그물(허브 분해 H0). 허브를 셸과 탭 기여로 나누기 전의 화면 동작을 고정한다 — 이후 변경은 이 기대값을
 * 사유와 함께 바꿀 때만 화면을 바꿀 수 있다. H1 에서 바뀐 기대값은 메일 발송 링크의 위치 하나다(사유는 그 단언 옆).
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
  permissions: [] as string[],
}));
const FULL_PERMISSIONS = ['NOTE_READ', 'SCRAP_READ', 'SCRAP_CREATE', 'SCRAP_UPDATE', 'ADBK_READ', 'MAIL_SEND'];

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => '/admin/collaboration',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'admin', role: 'ROLE_ADMIN', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
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
  mocks.permissions = FULL_PERMISSIONS;
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

describe('협업 허브 동등성', () => {
  // 셸은 core 라 어느 구성에서도 남는다 — 제목은 탭이 없는 구성에서도 같다.
  it('제목은 구성과 무관하게 같다', () => {
    renderHub('');
    expect(screen.getByRole('heading', { level: 1, name: '협업 및 네트워크 허브' })).toBeInTheDocument();
  });

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

  /*
   * [허브 분해 H5] 탭은 그 탭이 부르는 목록 API 의 권한(쪽지 NOTE_READ·스크랩 SCRAP_READ)으로 보인다. 종전에는 허브에 들어온 누구에게나
   * 보였고 목록이 403 이었다. 기본 그룹은 두 권한을 모두 가져 화면이 같다.
   */
  if (bothTabsInProjection) it('[H5] 쪽지 조회 권한이 없으면 쪽지 탭이 없고 ?tab=MESSAGES 는 남은 탭을 연다', () => {
    mocks.permissions = FULL_PERMISSIONS.filter((code) => code !== 'NOTE_READ');
    renderHub('tab=MESSAGES');
    expect(tabState()).toEqual([['스크랩', 'true']]);
    expect(mocks.getReceivedNotes).not.toHaveBeenCalled();
  });

  if (bothTabsInProjection) it('[H5] 스크랩 조회 권한이 없으면 스크랩 탭이 없다', () => {
    mocks.permissions = FULL_PERMISSIONS.filter((code) => code !== 'SCRAP_READ');
    renderHub('tab=SCRAPS', 'SCRAPS');
    expect(tabState()).toEqual([['쪽지', 'true']]);
  });

  // 두 권한이 모두 없는 사용자 정의 그룹은 탭이 하나도 없다. 그때 구성 탓이 아니라 권한 탓이라고 말한다(허브 분해 검토).
  if (bothTabsInProjection) it('[H5] 쪽지·스크랩 조회 권한이 모두 없으면 권한이 없다고 말하고 목록을 부르지 않는다', () => {
    mocks.permissions = FULL_PERMISSIONS.filter((code) => code !== 'NOTE_READ' && code !== 'SCRAP_READ');
    renderHub('tab=MESSAGES');
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('협업 목록 조회 권한이 없습니다. 필요하면 시스템 관리자에게 문의해 주세요.');
    expect(mocks.getReceivedNotes).not.toHaveBeenCalled();
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
    // [허브 분해 H1 — 의도한 변화] 메일 발송 링크는 쪽지 탭의 주 동작이 아니라 허브 머리의 메일 기여 링크라 스크랩 탭에서도 보인다.
    //   종전에는 쪽지 탭 안의 문자열 링크라 메일 없이 쪽지만 고른 생성물에서 404 로 갔다(GAP-COMPOSE-001).
    if (pageInProjection(MAIL_SEND)) {
      expect(screen.getByRole('link', { name: '신규 발송' })).toHaveAttribute('href', MAIL_SEND);
    }

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
