import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-23 ADR-0040 결정 3] 목록의 게시 상태 표지는 서버 판정(postingStatus) 그대로다. 예약·게시 종료 글은 작성자와 조회 대행
 * 권한자에게만 오고, 표지가 다른 사용자에게는 보이지 않는다는 사실을 말한다. 화면이 종료일을 브라우저의 오늘과 다시 비교하면, 서버가
 * 게시 중이라고 한 글에 '게시 종료' 가 붙는다(DEC-OPS-140).
 */
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

import { DefaultTemplate } from '../BoardTemplates';

describe('목록 템플릿 게시 상태·상단 고정 표지', () => {
  it('서버가 예약·게시 종료라고 한 글에만 표지를 붙이고, 게시 중인 글은 종료일 값과 무관하게 붙이지 않는다', () => {
    render(
      <DefaultTemplate
        bbsId="BBS-1"
        querySearchWrd=""
        handleLike={vi.fn()}
        pendingLikePstSn={null}
        likesOpen
        list={[
          { pstSn: 81, pstTtl: '게시 중 글', pstEndYmd: '20200101', postingStatus: 'POSTING' } as never,
          { pstSn: 82, pstTtl: '예약 글', pstBgngYmd: '20261201', postingStatus: 'SCHEDULED' } as never,
          { pstSn: 83, pstTtl: '끝난 글', pstEndYmd: '20261001', postingStatus: 'ENDED' } as never,
        ]}
      />,
    );

    const linkOf = (title: string) => screen.getAllByRole('link').find((link) => link.textContent?.startsWith(title))!;
    expect(within(linkOf('게시 중 글')).queryByText('게시 종료')).toBeNull();
    expect(within(linkOf('예약 글')).getByText('예약')).toHaveAttribute('title', '게시 시작일 2026-12-01 전이라 다른 사용자에게는 보이지 않습니다.');
    expect(within(linkOf('끝난 글')).getByText('게시 종료')).toBeInTheDocument();
  });

  // [2026-10-23 ADR-0040 결정 5] 기본 정렬에서 고정 글이 위에 오는 이유를 말한다 — 서버가 지금 고정 중이라고 한 글에만 붙인다.
  it('서버가 지금 고정 중이라고 한 글에만 상단 고정 표지를 붙인다', () => {
    render(
      <DefaultTemplate
        bbsId="BBS-1"
        querySearchWrd=""
        handleLike={vi.fn()}
        pendingLikePstSn={null}
        likesOpen
        list={[
          { pstSn: 91, pstTtl: '고정 글', pinned: true, upendFixEndYmd: '20261130', postingStatus: 'POSTING' } as never,
          { pstSn: 92, pstTtl: '일반 글', pinned: false, upendFixEndYmd: '20991231', postingStatus: 'POSTING' } as never,
        ]}
      />,
    );

    const linkOf = (title: string) => screen.getAllByRole('link').find((link) => link.textContent?.startsWith(title))!;
    expect(within(linkOf('고정 글')).getByText('상단 고정')).toHaveAttribute('title', '2026-11-30까지 게시판 목록 맨 위에 고정한 글입니다.');
    expect(within(linkOf('일반 글')).queryByText('상단 고정')).toBeNull();
  });
});
