import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-01] 목록의 추천 버튼은 서버 판정(recommended)으로 이미 추천한 글을 '추천함' 으로 보인다.
 * 종전에는 알 수 없어 이미 추천한 글에도 같은 버튼이 있었고, 누르면 409 로 비로소 알았다.
 * [2026-10-23 ADR-0040 결정 6] 추천이 닫혀 있으면(추천 권한 없음·사용 안 함·추천을 받지 않는 게시판 — 판정은 BoardListClient) 단추
 * 대신 쌓인 수만 보인다. 목록은 토글하지 않는다 — 추천 취소는 상세 화면에서 한다.
 */
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

import { DefaultTemplate, GalleryTemplate, QnaTemplate } from '../BoardTemplates';

const LIST = [
  { pstSn: 71, pstTtl: '새 글', likeCnt: 1, recommended: false } as never,
  { pstSn: 72, pstTtl: '추천한 글', likeCnt: 9, recommended: true } as never,
];

describe('목록 템플릿 추천 버튼', () => {
  it('이미 추천한 글은 추천함으로 보이고 누를 수 없다, 아닌 글은 그대로 누를 수 있다', () => {
    const handleLike = vi.fn();
    render(
      <DefaultTemplate
        bbsId="BBS-1"
        querySearchWrd=""
        handleLike={handleLike}
        pendingLikePstSn={null}
        likesOpen
        list={LIST}
      />,
    );

    const done = screen.getAllByRole('button', { name: '추천한 글 추천함' })[0];
    expect(done).toBeDisabled();
    expect(done).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(done);
    expect(handleLike).not.toHaveBeenCalled();

    const open = screen.getAllByRole('button', { name: '새 글 추천' })[0];
    expect(open).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(open);
    expect(handleLike).toHaveBeenCalledWith(expect.anything(), 71);
  });

  it.each([
    ['기본', DefaultTemplate],
    ['갤러리', GalleryTemplate],
    ['질의응답', QnaTemplate],
  ] as const)('추천이 닫혀 있으면(%s 템플릿) 단추 없이 쌓인 수만 보인다 — 내가 추천한 글도 목록에서 거두지 않는다', (_name, Template) => {
    const handleLike = vi.fn();
    render(
      <Template
        bbsId="BBS-1"
        querySearchWrd=""
        handleLike={handleLike}
        pendingLikePstSn={null}
        likesOpen={false}
        list={LIST}
      />,
    );

    expect(screen.queryAllByRole('button', { name: /추천/ })).toHaveLength(0);
    // 수는 그대로 보인다 — 숨기면 쌓인 추천이 사라진 것처럼 보인다(설정은 새 추천만 막는다).
    //   아이콘 대역(시험 환경은 아이콘 이름을 글자로 그린다)은 빼고 읽는다.
    expect(screen.getAllByText(/^추천/).map((node) => node.textContent?.replace(/[A-Za-z]/g, '').replace(/\s+/g, ' ').trim())).toEqual(
      expect.arrayContaining(['추천 1', '추천 9']),
    );
    expect(handleLike).not.toHaveBeenCalled();
  });
});
