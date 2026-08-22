import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const harness = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/help/faq',
  useRouter: () => ({ push: harness.push, replace: harness.replace }),
  useSearchParams: () => new URLSearchParams('tab=FAQ'),
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
  statusCd: 'Y',
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
  });

  it('uses contrast-safe semantic foregrounds for inverse surfaces and FAQ status text', () => {
    render(<KnowledgeHubClient defaultTab="FAQ" />);

    expect(screen.getByText('자주 묻는 질문 데이터셋'))
      .toHaveClass('text-surface-inverse-muted');
    expect(screen.getByText('총 1건')).toHaveClass('text-surface-inverse-muted');
    expect(screen.getByRole('button', { name: '최신순' }))
      .toHaveClass('text-primary-foreground');
    expect(screen.getByText('공개')).toHaveClass('text-success-emphasis');
    expect(screen.getByText('방금 전').parentElement).toHaveClass('text-surface-inverse-muted');

    const search = screen.getByRole('textbox', { name: '지식 검색어' });
    expect(search).toHaveClass('placeholder:text-surface-inverse-muted');

    const hotItem = screen.getAllByRole('button', { name: '합성 FAQ 문서 상세 보기' })
      .find((button) => button.querySelector('span.text-3xl'));
    expect(hotItem?.querySelector('span.text-3xl')).toHaveClass('text-muted-foreground');
  });
});
