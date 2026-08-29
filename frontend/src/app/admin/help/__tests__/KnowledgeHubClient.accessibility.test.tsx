import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  // [2026-08-29] 탭을 스펙마다 바꿀 수 있게 한다. 종전에는 'tab=FAQ' 가 하드코딩돼 있어
  //   defaultTab 을 무엇으로 주든 화면이 FAQ 였고, Q&A 분기는 스펙이 닿지 못했다.
  search: 'tab=FAQ',
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
        return { ...common, data: { list: [article], total: 1 } };
      case 'hot-articles':
        return { ...common, data: { list: [article] } };
      case 'knowledge-stats':
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
  });

  it('uses contrast-safe semantic foregrounds for inverse surfaces and FAQ status text', () => {
    render(<KnowledgeHubClient defaultTab="FAQ" />);

    expect(screen.getByText('자주 묻는 질문 데이터셋'))
      .toHaveClass('text-surface-inverse-muted');
    expect(screen.getByText('총 1건')).toHaveClass('text-surface-inverse-muted');
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
    expect(screen.getByText('방금 전').parentElement).toHaveClass('text-surface-inverse-muted');

    const search = screen.getByRole('textbox', { name: '지식 검색어' });
    expect(search).toHaveClass('placeholder:text-surface-inverse-muted');

    const hotItem = screen.getAllByRole('button', { name: '합성 FAQ 문서 상세 보기' })
      .find((button) => button.querySelector('span.text-3xl'));
    expect(hotItem?.querySelector('span.text-3xl')).toHaveClass('text-muted-foreground');
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
});
