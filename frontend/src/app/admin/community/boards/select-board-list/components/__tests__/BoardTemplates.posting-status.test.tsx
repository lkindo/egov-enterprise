import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-23 ADR-0040 결정 3] 목록의 게시 상태 표지는 서버 판정(postingStatus) 그대로다. 예약·게시 종료 글은 작성자와 조회 대행
 * 권한자에게만 오고, 표지가 다른 사용자에게는 보이지 않는다는 사실을 말한다. 화면이 종료일을 브라우저의 오늘과 다시 비교하면, 서버가
 * 게시 중이라고 한 글에 '게시 종료' 가 붙는다(DEC-OPS-140).
 *
 * [2026-10-26 ADR-0043 UX-02·03·14] 일곱 템플릿이 모두 같은 표지 묶음(비밀글·상단 고정·예약·게시 종료)을 보이고, 표지는 잘리는 제목
 * 링크 밖에 둔다. 종전에는 허브형·캘린더·FAQ 가 표지를 그리지 않았고, 나머지는 표지를 링크 안(잘림 영역)에 넣어 긴 제목에서 잘렸다.
 */
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/services/business/knowledge/knowledgeService', () => ({ knowledgeService: { getArticle: vi.fn() } }));

import {
  CalendarTemplate, DefaultTemplate, FaqTemplate, GalleryTemplate, HubTemplate, QnaTemplate, WikiTemplate,
} from '../BoardTemplates';

const common = { bbsId: 'BBS-1', querySearchWrd: '', handleLike: vi.fn(), pendingLikePstSn: null, likesOpen: true };

/** 제목 링크가 든 행(표의 tr·카드·목록 항목). 표지는 링크가 아니라 이 행 안에 있어야 한다. */
const rowOf = (title: string) => {
  const link = screen.getAllByRole('link').find((element) => element.textContent?.includes(title));
  expect(link, `${title} 링크를 찾지 못했다 — 단언이 vacuous 하다`).toBeDefined();
  return link!.closest('tr, article, li') as HTMLElement;
};

describe('목록 템플릿 게시 상태·상단 고정 표지', () => {
  it('서버가 예약·게시 종료라고 한 글에만 표지를 붙이고, 게시 중인 글은 종료일 값과 무관하게 붙이지 않는다', () => {
    render(
      <DefaultTemplate
        {...common}
        list={[
          { pstSn: 81, pstTtl: '게시 중 글', pstEndYmd: '20200101', postingStatus: 'POSTING' } as never,
          { pstSn: 82, pstTtl: '예약 글', pstBgngYmd: '20261201', postingStatus: 'SCHEDULED' } as never,
          { pstSn: 83, pstTtl: '끝난 글', pstEndYmd: '20261001', postingStatus: 'ENDED' } as never,
        ]}
      />,
    );

    expect(within(rowOf('게시 중 글')).queryByText('게시 종료')).toBeNull();
    expect(within(rowOf('예약 글')).getByText('예약')).toHaveAttribute('title', '게시 시작일 2026-12-01 전이라 다른 사용자에게는 보이지 않습니다.');
    expect(within(rowOf('끝난 글')).getByText('게시 종료')).toBeInTheDocument();
  });

  // [2026-10-23 ADR-0040 결정 5] 기본 정렬에서 고정 글이 위에 오는 이유를 말한다 — 서버가 지금 고정 중이라고 한 글에만 붙인다.
  it('서버가 지금 고정 중이라고 한 글에만 상단 고정 표지를 붙인다', () => {
    render(
      <DefaultTemplate
        {...common}
        list={[
          { pstSn: 91, pstTtl: '고정 글', pinned: true, upendFixEndYmd: '20261130', postingStatus: 'POSTING' } as never,
          { pstSn: 92, pstTtl: '일반 글', pinned: false, upendFixEndYmd: '20991231', postingStatus: 'POSTING' } as never,
        ]}
      />,
    );

    expect(within(rowOf('고정 글')).getByText('상단 고정')).toHaveAttribute('title', '2026-11-30까지 게시판 목록 맨 위에 고정한 글입니다.');
    expect(within(rowOf('일반 글')).queryByText('상단 고정')).toBeNull();
  });

  // [2026-10-26 ADR-0043 UX-14] 링크는 truncate 로 잘린다 — 표지가 그 안에 있으면 긴 제목에서 보이지 않는다.
  it('표지는 잘리는 제목 링크 밖에 둔다', () => {
    render(
      <DefaultTemplate
        {...common}
        list={[{ pstSn: 93, pstTtl: '아주 긴 제목'.repeat(20), pinned: true, scrtYn: 'Y', postingStatus: 'SCHEDULED', pstBgngYmd: '20261201' } as never]}
      />,
    );

    const link = screen.getByRole('link');
    for (const label of ['상단 고정', '예약', '비밀글']) {
      const badge = within(rowOf('아주 긴 제목')).getByText(label);
      expect(link.contains(badge), `${label} 표지가 잘리는 링크 안에 있다`).toBe(false);
    }
  });

  // [2026-10-26 ADR-0043 UX-15] 번호는 표시 순서다 — 고정 글이 가장 큰 번호를 받아 최신 글처럼 보이지 않게 '고정' 으로 쓴다.
  it('상단 고정 글은 번호 대신 고정이라고 쓰고, 나머지 글의 번호는 표시 순서 그대로다', () => {
    render(
      <DefaultTemplate
        {...common}
        page={1}
        totalCount={12}
        list={[
          { pstSn: 1, pstTtl: '오래된 고정 글', pinned: true } as never,
          { pstSn: 30, pstTtl: '최신 글', pinned: false } as never,
        ]}
      />,
    );

    expect(within(rowOf('오래된 고정 글')).getAllByRole('cell')[0]).toHaveTextContent(/^고정$/);
    expect(within(rowOf('최신 글')).getAllByRole('cell')[0]).toHaveTextContent(/^11$/);
  });
});

describe('비밀글 표지 (UX-03)', () => {
  it('서버가 비밀글이라고 한 글에만 아이콘과 글자로 표지를 붙이고, 볼 수 있는 사람을 화면낭독기 문장으로 알린다', () => {
    render(
      <DefaultTemplate
        {...common}
        list={[
          { pstSn: 1, pstTtl: '나만 볼 문의', scrtYn: 'Y' } as never,
          { pstSn: 2, pstTtl: '공개 질문', scrtYn: 'N' } as never,
        ]}
      />,
    );

    const badge = within(rowOf('나만 볼 문의')).getByText('비밀글');
    expect(badge).toHaveTextContent('비밀글 · 작성자와 관리자만 볼 수 있습니다');
    expect(badge).not.toHaveAttribute('title');
    expect(within(rowOf('공개 질문')).queryByText('비밀글')).toBeNull();
  });
});

describe('일곱 템플릿이 같은 표지를 보인다 (UX-02)', () => {
  const stateful = {
    pstTtl: '상태 있는 글',
    scrtYn: 'Y',
    pinned: true,
    upendFixEndYmd: '20261130',
    postingStatus: 'SCHEDULED',
    pstBgngYmd: '20261201',
    crtDt: '2026-09-15T10:00:00',
    evntDt: '2026-09-15T10:00:00',
  };

  it.each([
    ['허브형', HubTemplate, { page: 2 }],
    ['갤러리', GalleryTemplate, {}],
    ['질의응답', QnaTemplate, {}],
    ['캘린더', CalendarTemplate, { currentViewDate: new Date(2026, 8, 1), onPrevMonth: vi.fn(), onNextMonth: vi.fn(), totalCount: 1 }],
    ['FAQ', FaqTemplate, {}],
    ['위키', WikiTemplate, {}],
    ['기본 목록', DefaultTemplate, {}],
  ] as const)('%s 템플릿', (_name, Template, extra) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Component = Template as unknown as React.ComponentType<Record<string, unknown>>;
    render(
      <QueryClientProvider client={client}>
        <Component {...common} {...extra} list={[{ pstSn: 5, ...stateful }, { pstSn: 6, pstTtl: '평범한 글', crtDt: '2026-09-16T10:00:00' }]} />
      </QueryClientProvider>,
    );

    expect(screen.getAllByText('비밀글')).toHaveLength(1);
    expect(screen.getAllByText('상단 고정')).toHaveLength(1);
    expect(screen.getAllByText('예약')).toHaveLength(1);
  });
});

// [2026-10-26 ADR-0043 UX-15·16] 목록과 상세는 분류 이름을 같은 정본에서 읽는다 — 정의된 이름이 없는 코드(옛 자료)는 내보이지 않는다.
describe('질의응답 목록의 분류 이름', () => {
  it('분류 코드를 화면에 그대로 내보이지 않고 상세와 같은 이름을 보인다', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <QnaTemplate {...common} list={[
          { pstSn: 7, pstTtl: '옛 분류 질문', crtDt: '2026-09-16T10:00:00', qnaCatCd: 'CAT02' },
          { pstSn: 8, pstTtl: '기본 분류 질문', crtDt: '2026-09-16T10:00:00', qnaCatCd: 'CAT01' },
        ] as never} />
      </QueryClientProvider>,
    );

    expect(within(rowOf('옛 분류 질문')).getByText('분류 일반')).toBeInTheDocument();
    expect(within(rowOf('기본 분류 질문')).getByText('분류 일반')).toBeInTheDocument();
    expect(screen.queryByText(/CAT0/)).toBeNull();
  });
});
