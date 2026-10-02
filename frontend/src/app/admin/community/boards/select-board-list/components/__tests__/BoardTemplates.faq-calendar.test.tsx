import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DynamicOptions, Loader } from 'next/dynamic';

/**
 * [2026-09-26 DIP V6] FAQ·캘린더 템플릿이 사실을 보이는지.
 *
 * - 목록 응답에는 본문(pstCn)이 없다. FAQ 답은 펼칠 때 상세 API 로 받아야 빈 칸이 되지 않는다.
 * - 캘린더 한 달 조회에는 상한이 있어, 넘으면 일부만 보인다고 말해야 빈 칸이 '일정 없음' 으로 읽히지 않는다.
 */
const mocks = vi.hoisted(() => ({
  getArticle: vi.fn(),
  waitForAnswerChunk: vi.fn(),
  loadAnswerChunk: vi.fn(),
  answerChunkSsr: undefined as boolean | undefined,
}));

// Keep the real dynamic component; only delay its module download for the pending-HTML contract.
vi.mock('next/dynamic', async (importOriginal) => {
  const original = await importOriginal<typeof import('next/dynamic')>();
  return {
    ...original,
    default: <P,>(loader: Loader<P> | DynamicOptions<P>, options?: DynamicOptions<P>) => {
      if (typeof loader !== 'function') return original.default(loader, options);
      mocks.answerChunkSsr = options?.ssr;
      return original.default(async () => {
        mocks.loadAnswerChunk();
        await mocks.waitForAnswerChunk();
        return loader();
      }, options);
    },
  };
});

vi.mock('@/services/business/knowledge/knowledgeService', () => ({
  knowledgeService: { getArticle: mocks.getArticle },
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

import { CalendarTemplate, FaqTemplate } from '../BoardTemplates';

const common = { bbsId: 'BBS-FAQ', querySearchWrd: '', handleLike: vi.fn(), pendingLikePstSn: null };

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('FAQ 템플릿', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.waitForAnswerChunk.mockResolvedValue(undefined);
  });

  it('🚨 펼친 뒤 정화 모듈이 준비될 때까지 원본 HTML을 그리지 않고 정상 서식만 보존한다', async () => {
    let finishChunk!: () => void;
    mocks.waitForAnswerChunk.mockReturnValueOnce(new Promise<void>((resolve) => { finishChunk = resolve; }));
    mocks.getArticle.mockResolvedValue({
      pstSn: 5,
      pstCn: '<p>연차는 <strong>15일</strong>입니다.</p><script>alert(1)</script><img src="x" onerror="alert(2)"><a href="javascript:alert(3)">유해 링크</a><a href="https://example.test/policy">정상 링크</a>',
    });
    const { container } = renderWithClient(
      <FaqTemplate {...common} list={[{ pstSn: 5, pstTtl: '연차는 며칠인가요?', crtDt: '2026-09-01' } as never]} />,
    );

    // 접힌 동안에는 부르지 않는다 — 목록을 여는 것만으로 모든 글의 조회수가 오르면 안 된다.
    expect(mocks.getArticle).not.toHaveBeenCalled();
    expect(mocks.loadAnswerChunk).not.toHaveBeenCalled();
    expect(mocks.answerChunkSsr).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: /연차는 며칠인가요/ }));

    await waitFor(() => expect(mocks.loadAnswerChunk).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('status')).toHaveTextContent('답변을 불러오는 중입니다.');
    expect(screen.queryByText('15일')).not.toBeInTheDocument();
    expect(container.querySelector('script, img, a')).toBeNull();
    finishChunk();
    expect(await screen.findByText('15일')).toBeInTheDocument();
    expect(mocks.getArticle).toHaveBeenCalledWith('BBS-FAQ', 5);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('[onerror]')).toBeNull();
    expect(screen.getByText('15일').tagName).toBe('STRONG');
    expect(screen.getByText('유해 링크')).not.toHaveAttribute('href');
    expect(screen.getByRole('link', { name: '정상 링크' })).toHaveAttribute('href', 'https://example.test/policy');
  });

  it('키보드로 FAQ를 펼치고 닫아도 답변 조회와 aria-expanded 의미를 보존한다', async () => {
    const user = userEvent.setup();
    mocks.getArticle.mockResolvedValue({ pstSn: 7, pstCn: '<p>키보드 답변</p>' });
    renderWithClient(<FaqTemplate {...common} list={[{ pstSn: 7, pstTtl: '키보드 질문' } as never]} />);
    const question = screen.getByRole('button', { name: /키보드 질문/ });
    await user.tab();
    expect(question).toHaveFocus();
    expect(question).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Enter}');
    expect(await screen.findByText('키보드 답변')).toBeInTheDocument();
    expect(question).toHaveAttribute('aria-expanded', 'true');
    expect(mocks.getArticle).toHaveBeenCalledWith('BBS-FAQ', 7);
    await user.keyboard('{Enter}');
    expect(question).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('키보드 답변')).not.toBeInTheDocument();
    expect(question).toHaveFocus();
  });

  it('답을 받지 못하면 빈 칸 대신 실패를 알리고 다시 시도할 수 있다', async () => {
    mocks.getArticle.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce({ pstSn: 6, pstCn: '<p>재시도 답</p>' });
    renderWithClient(<FaqTemplate {...common} list={[{ pstSn: 6, pstTtl: '질문' } as never]} />);

    fireEvent.click(screen.getByRole('button', { name: /질문/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('답변을 불러오지 못했습니다.');
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByText('재시도 답')).toBeInTheDocument();
  });
});

describe('캘린더 템플릿', () => {
  const props = {
    ...common,
    currentViewDate: new Date(2026, 8, 1),
    onPrevMonth: vi.fn(),
    onNextMonth: vi.fn(),
  };

  it('🚨 한 달 일정이 상한을 넘으면 일부만 보인다고 말한다', () => {
    render(<CalendarTemplate {...props} totalCount={130} list={[{ pstSn: 1, pstTtl: '행사', evntDt: '2026-09-15T10:00:00' } as never]} />);

    expect(screen.getByRole('status')).toHaveTextContent('이 달의 일정 130건 중 1건만 표시합니다.');
  });

  it('대조군: 모두 받았으면 알리지 않는다', () => {
    render(<CalendarTemplate {...props} totalCount={1} list={[{ pstSn: 1, pstTtl: '행사', evntDt: '2026-09-15T10:00:00' } as never]} />);

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('link', { name: '행사' })).toBeInTheDocument();
  });
});
