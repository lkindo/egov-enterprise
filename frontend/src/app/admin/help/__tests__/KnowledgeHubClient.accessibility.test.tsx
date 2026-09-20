import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  // [2026-08-29] 탭을 스펙마다 바꿀 수 있게 한다. 종전에는 'tab=FAQ' 가 하드코딩돼 있어
  //   defaultTab 을 무엇으로 주든 화면이 FAQ 였고, Q&A 분기는 스펙이 닿지 못했다.
  search: 'tab=FAQ',
  statsLoading: false,
  articlesError: null as Error | null,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/help/faq',
  useRouter: () => ({ push: harness.push, replace: harness.replace }),
  useSearchParams: () => new URLSearchParams(harness.search),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ROLE_ADMIN' } }),
}));

const article = {
  pstSn: 101,
  bbsId: 'BBSMSTR_AAAAAAAAAAAA',
  pstTtl: '합성 FAQ 문서',
  inqCnt: 3,
  frstRegisterNm: '합성 작성자',
  frstRegisterPnttmStr: '2026-08-21',
  // [2026-08-29] statusCd 를 걷고 실재하는 Q&A 상태 컬럼을 쓴다. statusCd 는 백엔드에 없는
  //   필드였고(main 소스·Flyway 전체 grep 0건), 픽스처가 그 값을 넣고 있어 "화면이 없는
  //   필드를 읽는다" 는 사실이 이 스펙에서 보이지 않았다.
  qnaSttsCd: 'SOLVED',
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    const common = {
      isError: false,
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    };

    switch (queryKey[0]) {
      case 'knowledge-articles':
        if (harness.articlesError) {
          return { ...common, isError: true, error: harness.articlesError, data: undefined };
        }
        return { ...common, data: { list: [article], total: 1 } };
      case 'hot-articles':
        return { ...common, data: { list: [article] } };
      case 'knowledge-stats':
        if (harness.statsLoading) return { ...common, isLoading: true, data: undefined };
        return {
          ...common,
          data: { intelligenceScore: 80, totalViews: 3, topContributor: '합성 작성자' },
        };
      case 'knowledge-activities':
        return {
          ...common,
          data: [{ id: 'activity-1', title: '합성 FAQ 문서', user: '합성 작성자', time: '방금 전' }],
        };
      default:
        throw new Error(`unexpected query: ${queryKey[0]}`);
    }
  },
}));

import KnowledgeHubClient from '../KnowledgeHubClient';

describe('KnowledgeHubClient accessibility semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.search = 'tab=FAQ';
    harness.statsLoading = false;
    harness.articlesError = null;
  });

  it('uses semantic foregrounds on matching card surfaces and preserves truthful FAQ status', () => {
    render(<KnowledgeHubClient defaultTab="FAQ" />);

    expect(screen.getByRole('heading', { level: 1, name: '자주 묻는 질문' })).toBeVisible();
    expect(screen.getByText('문서를 검색하고 필요한 내용을 확인하세요.')).toHaveClass('text-muted-foreground');
    /*
     * [2026-09-20] A1 셸 이행으로 총계의 소유자가 화면에서 WorkListPage 결과 툴바로 옮겼다.
     * 셸은 수치만 강조하려고 `총 <span>N</span>건` 으로 쪼개 렌더하므로 getByText('총 1건')
     * 은 **원리적으로** 맞지 않는다(RTL 의 getNodeText 는 직계 텍스트 노드만 잇는다).
     * 그래서 선택자만 옮기고 단언의 내용은 둘 다 그대로 둔다 — 값(총 1건)과 대비(muted).
     * live region 이라는 사실까지 함께 고정해 종전보다 좁아지지 않게 한다.
     */
    const toolbar = screen.getByTestId('work-list-toolbar');
    expect(toolbar).toHaveTextContent('총 1건');
    expect(toolbar.querySelector('p[aria-live="polite"]')).toHaveClass('text-muted-foreground');
    expect(screen.getByRole('button', { name: '최신순' }))
      .toHaveClass('text-primary-foreground');
    /*
     * [2026-08-29] 종전에는 FAQ 행의 '공개' 배지 대비를 검사했다. 그 배지는 어떤 조건도 보지
     * 않는 고정 문자열이었다 — 읽던 필드 `statusCd` 는 이 제품의 백엔드에 존재하지 않아
     * (main 소스·Flyway 전체 grep 0건) 언제나 undefined 였고, 세 분기가 전부 기본값으로
     * 떨어져 FAQ·커뮤니티는 무조건 '공개', 위키는 무조건 '초안', Q&A 는 무조건 '미해결'
     * 이었다. 대비만 완벽한 거짓 상태였다.
     *
     * 배지는 실제 상태 컬럼이 있는 Q&A 에만 남겼으므로, 여기서는 **FAQ 에 상태가 없다**는
     * 사실을 고정한다. 상태 축이 생겨 배지를 되살리면 이 단언이 red 가 되어 알려 준다.
     */
    expect(screen.queryByText('공개')).toBeNull();
    expect(screen.queryByText('상태')).toBeNull();
    expect(screen.getByText('방금 전').parentElement).toHaveClass('text-muted-foreground');
    expect(screen.getByRole('heading', { name: '최근 활동' }).closest('.bg-card')).not.toHaveClass('hub-card-dark');

    const search = screen.getByRole('textbox', { name: '지식 검색어' });
    expect(search).toHaveClass('placeholder:text-muted-foreground');

    /*
     * [2026-09-20] 인기 문서 순위 숫자의 선택자를 크기 클래스(span.text-3xl — 30px 장식)에서
     * 의미 훅으로 옮겼다. 검사하는 것은 크기가 아니라 **대비**였고, 그 단언은 그대로다.
     */
    const hotItem = screen.getAllByRole('button', { name: '합성 FAQ 문서 상세 보기' })
      .find((button) => button.querySelector('[data-testid="hot-article-rank"]'));
    expect(hotItem, '인기 문서 항목을 찾지 못했다 — 단언이 vacuous 하다').toBeDefined();
    expect(hotItem?.querySelector('[data-testid="hot-article-rank"]')).toHaveClass('text-muted-foreground');
  });

  /**
   * [2026-08-29] Q&A 상태는 서버 값에서 온다.
   *
   * 종전에는 존재하지 않는 `statusCd` 를 읽어 답변이 끝난 문의도 빨간 '미해결' 로 보였다.
   * 판정은 값 도메인이 저장소 안에서 갈려 있어(엔티티 기본값 OPEN · 등록 경로 QA01 ·
   * 완료 SOLVED) 이미 있는 SSOT `isQnaSolved` 를 쓴다 — 여기서 자체 비교를 다시 만들면
   * 그 갈림이 화면마다 또 갈라진다.
   */
  it('Q&A 상태를 서버의 qnaSttsCd 로 판정한다 — 지어낸 고정값을 쓰지 않는다', () => {
    harness.search = 'tab=QNA';
    render(<KnowledgeHubClient defaultTab="QNA" />);

    expect(screen.getByText('해결됨')).toBeInTheDocument();
    expect(screen.queryByText('미해결')).toBeNull();
  });

  /**
   * [2026-09-15 DEC-OPS-100] 게시판 이용 현황은 불러오는 동안 0 을 쓰지 않는다.
   * 종전에는 조회 중 상태를 받지 않아 "게시글 수 0 · 누적 조회수 0" 이 먼저 보였다.
   */
  it('게시판 이용 현황은 불러오는 동안 0 이 아니라 불러오는 중을 말한다', () => {
    harness.statsLoading = true;
    render(<KnowledgeHubClient defaultTab="FAQ" />);

    for (const label of ['게시글 수', '누적 조회수', '최다 기여자']) {
      // [2026-09-20] 선택자만 장식 클래스(.hub-card-premium)에서 의미 훅으로 옮겼다.
      const card = screen.getByText(label).closest('[data-testid="board-stat-card"]') as HTMLElement;
      expect(card, `${label} 칸을 찾지 못했다 — 단언이 vacuous 하다`).not.toBeNull();
      expect(within(card).getByText('불러오는 중…')).toBeInTheDocument();
      expect(within(card).queryByText('0')).toBeNull();
    }
  });

  /**
   * [2026-09-15 DEC-OPS-100] 조회 실패 패널은 axios 가 만든 전송 오류 원문을 보이지 않는다.
   * 서버가 준 문장이나, axios 오류가 아닌 오류의 문장만 덧붙인다(server-error mustNotImply).
   */
  it('문서 목록 조회 실패 패널은 전송 오류 원문을 보이지 않고 사용자 문장만 보인다', () => {
    harness.articlesError = new Error('Request failed with status code 500');
    const { unmount } = render(<KnowledgeHubClient defaultTab="FAQ" />);
    const alert = screen.getByRole('alert');
    expect(within(alert).queryByText('Request failed with status code 500')).toBeNull();
    expect(within(alert).getByRole('button', { name: /다시 시도/ })).toBeInTheDocument();
    unmount();

    harness.articlesError = new Error('권한이 없습니다.');
    render(<KnowledgeHubClient defaultTab="FAQ" />);
    expect(within(screen.getByRole('alert')).getByText('권한이 없습니다.')).toBeInTheDocument();
  });
});
