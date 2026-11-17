import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 스크랩 목록 — 원본 게시글을 지금 열 수 있는지(targetAvailable).
 *
 * [2026-11-17 평가 후속] 스크랩은 주소만 보관해, 원본 글이 삭제·비공개 전환·게시 기간 종료가 되어도 목록에서는 알 수 없었다.
 * 서버가 게시판 글 스크랩마다 열람 판정을 담아 주고(false = 지금은 열 수 없음, null = 외부·일반 주소라 판정 대상 아님), 화면은
 * false 일 때만 안내를 붙인다. 판정이 없는(null) 행에 안내를 붙이면 외부 주소까지 '열 수 없음' 으로 잘못 말한다.
 */
const mocks = vi.hoisted(() => ({ getMyScraps: vi.fn() }));

vi.mock('@/services/business/user/ScrapService', () => ({
  scrapService: { getMyScraps: mocks.getMyScraps },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/collaboration/scraps/selectScrapList',
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ children }: React.PropsWithChildren) => <main>{children}</main>,
}));
// 표의 계약은 표 자신의 시험이 본다. 여기서는 이 화면이 정한 열의 내용만 행마다 그린다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data, columns }: {
    data?: Array<{ scrapSn: number }>;
    columns: Array<{ header: string; accessor: unknown }>;
  }) => (
    <div>
      {(data ?? []).map((row) => (
        <section key={row.scrapSn} data-testid={`row-${row.scrapSn}`}>
          {columns.map((column) => (
            <div key={column.header}>
              {typeof column.accessor === 'function' ? (column.accessor as (r: unknown) => React.ReactNode)(row) : null}
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
}));

const { default: ScrapListClient } = await import('../selectScrapList/ScrapListClient');

const NOTICE = /원본 글을 지금은 열 수 없어요/u;

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ScrapListClient />
    </QueryClientProvider>,
  );
}

describe('스크랩 목록 — 원본 글 열람 가능 여부', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('서버가 열 수 없다고 판정한 게시글 스크랩에만 안내를 붙인다 — 열리는 글·외부 주소에는 붙이지 않는다', async () => {
    mocks.getMyScraps.mockResolvedValue({
      list: [
        { scrapSn: 1, scrapNm: '닫힌 글', scrapUrl: '/cop/bbs/selectArticleDetail?bbsId=B1&pstSn=9', useYn: 'Y', targetAvailable: false },
        { scrapSn: 2, scrapNm: '열린 글', scrapUrl: '/cop/bbs/selectArticleDetail?bbsId=B1&pstSn=8', useYn: 'Y', targetAvailable: true },
        { scrapSn: 3, scrapNm: '외부 주소', scrapUrl: 'https://example.com/a', useYn: 'Y', targetAvailable: null },
      ],
      total: 3,
      totalPage: 1,
    });
    renderList();

    await waitFor(() => expect(screen.getByTestId('row-1')).toBeInTheDocument());
    expect(screen.getByTestId('row-1')).toHaveTextContent(NOTICE);
    expect(screen.getByTestId('row-2')).not.toHaveTextContent(NOTICE);
    expect(screen.getByTestId('row-3')).not.toHaveTextContent(NOTICE);
  });
});
