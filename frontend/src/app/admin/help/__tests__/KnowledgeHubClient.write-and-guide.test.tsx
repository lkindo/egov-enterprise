import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inProjection } from '@/test-utils/projection';

/**
 * [2026-10-26 ADR-0043] 지식 허브의 글쓰기·안내·게시판 이름·글 상태 표지.
 *
 * - 0차 NAV-03·UX-10: 종전 '신규 등록' 단추는 권한을 보지 않아 공지·FAQ 처럼 추가 편집 권한이 필요한 게시판에서 일반 사용자를 쓸 수
 *   없는 작성 화면으로 보냈다. 글쓰기는 이용 목록과 같은 판정(BOARD_CREATE ∧ 게시판 추가 편집 권한 ∧ 사용 중)일 때만 연다.
 * - NAV-01 A안: 탭이 실제로 보여 주는 게시판 이름과 그 게시판 전체 화면 링크.
 * - NAV-11: 질의응답 탭에 나만 볼 문의(도움말 센터 1:1 문의)의 자리를 알린다.
 * - UX-02·03: 목록과 최근 활동이 서버 판정 표지(비밀글·상단 고정·예약)를 보인다.
 */
const mocks = vi.hoisted(() => ({
  search: 'tab=FAQ',
  push: vi.fn(),
  replace: vi.fn(),
  getArticles: vi.fn(),
  getBoardMeta: vi.fn(),
  user: { id: 'u', permissions: ['BOARD_READ', 'BOARD_CREATE'], authorizationVersion: 'v1' } as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => '/admin/help',
  useSearchParams: () => new URLSearchParams(mocks.search),
}));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: mocks.user });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { getBoardMeta: mocks.getBoardMeta } }));
vi.mock('@/services/business/knowledge/knowledgeService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/business/knowledge/knowledgeService')>()),
  knowledgeService: { getArticles: mocks.getArticles, getHotArticles: async () => ({ list: [] }), getStats: async () => ({}) },
}));

import KnowledgeHubClient from '../KnowledgeHubClient';

/**
 * 도움말 센터 1:1 문의 안내(문장·링크)는 도움말 기능의 마커 블록 안에 있다 — 도움말을 고르지 않은 생성물에서는 투영이 그 블록을 걷는다.
 * 그 블록과 함께 빠지는 도움말 소유 파일로 도움말이 구성에 있는지 가르고(가이드 §4.2), 없으면 안내가 없음을 단언한다. 원본은 늘 있다.
 */
const helpInProjection = inProjection('frontend/src/app/help/HelpClient.tsx');

const FAQ_BOARD = 'BBSMSTR_AAAAAAAAAAAA';
const QNA_BOARD = 'BBSMSTR_DDDDDDDDDDDD';

const meta = (overrides: Record<string, unknown> = {}) => ({
  bbsId: FAQ_BOARD,
  bbsTtl: '공지사항',
  inUse: true,
  requiredEditPermissions: [] as string[],
  prvtPstPlcyCd: 'NONE',
  ...overrides,
});

function renderHub(search = 'tab=FAQ') {
  mocks.search = search;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><KnowledgeHubClient /></QueryClientProvider>);
}

/** 글쓰기 진입. 부재 단언이 역할 이름만 바뀌어 저절로 성립하지 않게 글자로 찾는다. */
const writeEntry = () => screen.queryByText('글쓰기')?.closest('a, button') ?? null;
const metaSettled = () => waitFor(() => expect(mocks.getBoardMeta).toHaveBeenCalled());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'u', permissions: ['BOARD_READ', 'BOARD_CREATE'], authorizationVersion: 'v1' };
  mocks.getArticles.mockResolvedValue({ list: [], total: 0 });
  mocks.getBoardMeta.mockResolvedValue(meta());
});

describe('지식 허브 글쓰기 (NAV-03·UX-10)', () => {
  it('글쓰기 권한이 있고 추가 편집 권한이 없는 사용 중 게시판이면 그 게시판의 작성 화면으로 가는 글쓰기 링크를 둔다', async () => {
    renderHub();

    const write = await screen.findByRole('link', { name: '글쓰기' });
    expect(write).toHaveAttribute('href', `/admin/community/boards/insert-board-article?bbsId=${FAQ_BOARD}`);
    expect(screen.queryByText('신규 등록')).toBeNull();
    expect(mocks.getBoardMeta).toHaveBeenCalledWith(FAQ_BOARD, { suppressErrorToast: true });
  });

  it.each([
    ['글쓰기 권한이 없으면', { permissions: ['BOARD_READ'] }, {}],
    ['게시판이 요구하는 추가 편집 권한(공지·FAQ)을 다 갖지 않으면', { permissions: ['BOARD_READ', 'BOARD_CREATE', 'NOTICE_EDIT'] }, { requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'] }],
    ['사용 안 함 게시판이면', {}, { inUse: false }],
  ] as const)('%s 글쓰기를 두지 않는다', async (_case, userOverrides, metaOverrides) => {
    mocks.user = { ...mocks.user, ...userOverrides };
    mocks.getBoardMeta.mockResolvedValue(meta(metaOverrides));
    renderHub();

    await screen.findByRole('note');
    expect(writeEntry()).toBeNull();
  });

  it('대조군: 추가 편집 권한을 모두 가지면 지정 게시판에도 글쓰기를 둔다', async () => {
    mocks.user = { ...mocks.user, permissions: ['BOARD_READ', 'BOARD_CREATE', 'NOTICE_EDIT', 'FAQ_EDIT'] };
    mocks.getBoardMeta.mockResolvedValue(meta({ requiredEditPermissions: ['NOTICE_EDIT', 'FAQ_EDIT'] }));
    renderHub();

    expect(await screen.findByRole('link', { name: '글쓰기' })).toBeInTheDocument();
  });

  it('게시판 메타를 받지 못하면 판정 근거가 없어 글쓰기를 두지 않는다', async () => {
    mocks.getBoardMeta.mockRejectedValue(new Error('down'));
    renderHub();

    await screen.findByRole('note');
    expect(writeEntry()).toBeNull();
  });
});

describe('FAQ 탭의 질문 안내 (UX-10)', () => {
  if (helpInProjection) it('글을 쓸 수 없으면 질의응답 탭과 도움말 센터 1:1 문의를 안내하고, 탭 단추는 질의응답 탭을 연다', async () => {
    mocks.user = { ...mocks.user, permissions: ['BOARD_READ'] };
    renderHub();

    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent('질문은 질의응답(Q&A) 탭에 남겨 주세요. 나만 볼 문의는 도움말 센터의 1:1 문의를 이용하세요.');
    expect(within(note).getByRole('link', { name: '도움말 센터의 1:1 문의' })).toHaveAttribute('href', '/help');

    fireEvent.click(within(note).getByRole('button', { name: '질의응답(Q&A) 탭' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/help?tab=QNA', { scroll: false });
  });

  if (!helpInProjection) it('도움말이 없는 구성: 글을 쓸 수 없으면 질의응답 탭만 안내하고 1:1 문의는 말하지 않는다', async () => {
    mocks.user = { ...mocks.user, permissions: ['BOARD_READ'] };
    renderHub();

    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent(/^질문은 질의응답\(Q&A\) 탭에 남겨 주세요\.$/);
    expect(screen.queryByRole('link', { name: '도움말 센터의 1:1 문의' })).toBeNull();

    fireEvent.click(within(note).getByRole('button', { name: '질의응답(Q&A) 탭' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/help?tab=QNA', { scroll: false });
  });

  it('대조군: 글을 쓸 수 있으면 안내하지 않는다', async () => {
    renderHub();

    await screen.findByRole('link', { name: '글쓰기' });
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('질의응답 탭의 1:1 문의 안내 (NAV-11)', () => {
  if (helpInProjection) it('나만 볼 문의의 자리를 알리고, 비밀글 정책이 없음이면 이 탭의 글이 모두에게 보인다고 말한다', async () => {
    mocks.getBoardMeta.mockResolvedValue(meta({ bbsId: QNA_BOARD, bbsTtl: 'Q&A 게시판', prvtPstPlcyCd: 'NONE' }));
    renderHub('tab=QNA');

    await metaSettled();
    const note = await screen.findByText(/로그인한 모든 사용자가/);
    expect(note).toHaveTextContent('이 탭에 쓴 질문은 로그인한 모든 사용자가 볼 수 있습니다. 나만 볼 문의는 도움말 센터의 1:1 문의를 이용하세요.');
    expect(within(note).getByRole('link', { name: '도움말 센터의 1:1 문의' })).toHaveAttribute('href', '/help');
  });

  if (helpInProjection) it('비밀글 정책이 없음이 아니거나 모르면 공개 범위를 말하지 않는다', async () => {
    mocks.getBoardMeta.mockResolvedValue(meta({ bbsId: QNA_BOARD, prvtPstPlcyCd: 'OPTIONAL' }));
    renderHub('tab=QNA');

    const note = await screen.findByRole('note');
    await metaSettled();
    expect(note).toHaveTextContent('나만 볼 문의는 도움말 센터의 1:1 문의를 이용하세요.');
    expect(note).not.toHaveTextContent('로그인한 모든 사용자');
  });

  // 도움말이 없는 구성: 안내 문장·링크가 블록과 함께 빠지고 공개 범위 문장만 남는다. 정책이 없음이 아니면 단락이 비어 화면에서는
  // empty:hidden 으로 숨는다 — jsdom 은 CSS 를 적용하지 않으므로 글자로 부재를 본다.
  if (!helpInProjection) it('도움말이 없는 구성: 질의응답 탭은 공개 범위만 말하고 1:1 문의를 안내하지 않는다', async () => {
    mocks.getBoardMeta.mockResolvedValue(meta({ bbsId: QNA_BOARD, bbsTtl: 'Q&A 게시판', prvtPstPlcyCd: 'NONE' }));
    const { unmount } = renderHub('tab=QNA');

    await metaSettled();
    const note = await screen.findByText(/로그인한 모든 사용자가/);
    expect(note).toHaveTextContent(/^이 탭에 쓴 질문은 로그인한 모든 사용자가 볼 수 있습니다\.$/);
    expect(screen.queryByRole('link', { name: '도움말 센터의 1:1 문의' })).toBeNull();
    unmount();

    mocks.getBoardMeta.mockResolvedValue(meta({ bbsId: QNA_BOARD, prvtPstPlcyCd: 'OPTIONAL' }));
    renderHub('tab=QNA');
    const empty = await screen.findByRole('note');
    await metaSettled();
    expect(empty).not.toHaveTextContent('나만 볼 문의');
    expect(empty).not.toHaveTextContent('로그인한 모든 사용자');
    expect(screen.queryByRole('link', { name: '도움말 센터의 1:1 문의' })).toBeNull();
  });
});

describe('탭이 보여 주는 게시판 (NAV-01 A안)', () => {
  it('탭 머리가 실제 게시판 이름을 말하고, 열 수 있으면 그 게시판 전체 화면 링크를 둔다', async () => {
    renderHub();

    expect(await screen.findByText('공지사항 게시판의 글을 보여 줍니다. 제목으로 검색할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '자주 묻는 질문' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '이 게시판 전체 화면으로 보기' }))
      .toHaveAttribute('href', `/admin/community/boards/select-board-list?bbsId=${FAQ_BOARD}`);
  });

  it('이름이 이미 게시판으로 끝나면 덧붙이지 않는다', async () => {
    mocks.getBoardMeta.mockResolvedValue(meta({ bbsId: QNA_BOARD, bbsTtl: 'Q&A 게시판' }));
    renderHub('tab=QNA');

    expect(await screen.findByText('Q&A 게시판의 글을 보여 줍니다. 제목으로 검색할 수 있습니다.')).toBeInTheDocument();
  });

  it('메타를 받지 못하면 이름을 지어내지 않고 종전 설명만 두며 전체 화면 링크를 두지 않는다', async () => {
    mocks.getBoardMeta.mockRejectedValue(new Error('down'));
    renderHub();

    await screen.findByRole('note');
    expect(screen.getByText('문서를 검색하고 필요한 내용을 확인하세요.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '이 게시판 전체 화면으로 보기' })).toBeNull();
  });
});

describe('허브 목록·최근 활동의 글 상태 표지 (UX-02·03)', () => {
  beforeEach(() => {
    mocks.getArticles.mockResolvedValue({
      total: 2,
      list: [
        { pstSn: 1, bbsId: FAQ_BOARD, pstTtl: '오래된 고정 안내', crtDt: '2025-01-02T09:00:00', pinned: true, upendFixEndYmd: '20261231', postingStatus: 'POSTING', scrtYn: 'N' },
        { pstSn: 2, bbsId: FAQ_BOARD, pstTtl: '나만 볼 문의', crtDt: '2026-10-20T09:00:00', pinned: false, postingStatus: 'SCHEDULED', pstBgngYmd: '20261201', scrtYn: 'Y' },
      ],
    });
  });

  it('제목 칸이 서버 판정 표지를 잘리는 제목 단추 밖에 보인다', async () => {
    renderHub();

    // 표는 불러오는 동안에도 골격 행으로 먼저 있다 — 행이 채워질 때까지 기다린다.
    const table = await screen.findByRole('table');
    const titleOf = (title: string) => within(table).findByRole('button', { name: `${title} 상세 보기` });
    const pinnedTitle = await titleOf('오래된 고정 안내');
    const secretTitle = await titleOf('나만 볼 문의');
    const pinnedBadge = within(pinnedTitle.closest('td') as HTMLElement).getByText('상단 고정');
    expect(pinnedTitle.contains(pinnedBadge)).toBe(false);
    const secretCell = secretTitle.closest('td') as HTMLElement;
    expect(within(secretCell).getByText('비밀글')).toBeInTheDocument();
    expect(within(secretCell).getByText('예약')).toBeInTheDocument();
    expect(within(pinnedTitle.closest('td') as HTMLElement).queryByText('비밀글')).toBeNull();
  });

  it('최근 활동은 고정 글을 먼저 싣는다는 사실을 말하고 고정 글에 표지를 붙인다', async () => {
    renderHub();

    const section = (await screen.findByRole('heading', { name: '최근 활동' })).closest('section') as HTMLElement;
    expect(section).toHaveTextContent('상단 고정 글을 먼저, 그다음 최근 등록 순');
    const pinnedItem = (await within(section).findByText('오래된 고정 안내')).closest('li') as HTMLElement;
    expect(within(pinnedItem).getByText('상단 고정')).toBeInTheDocument();
    const recentItem = within(section).getByText('나만 볼 문의').closest('li') as HTMLElement;
    expect(within(recentItem).queryByText('상단 고정')).toBeNull();
  });
});
