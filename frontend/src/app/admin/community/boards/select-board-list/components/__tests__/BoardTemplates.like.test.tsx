import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * [2026-10-01] 목록의 추천 버튼은 서버 판정(recommended)으로 이미 추천한 글을 '추천함' 으로 보인다.
 * 종전에는 알 수 없어 이미 추천한 글에도 같은 버튼이 있었고, 누르면 409 로 비로소 알았다.
 */
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));

import { DefaultTemplate } from '../BoardTemplates';

describe('목록 템플릿 추천 버튼', () => {
  it('이미 추천한 글은 추천함으로 보이고 누를 수 없다, 아닌 글은 그대로 누를 수 있다', () => {
    const handleLike = vi.fn();
    render(
      <DefaultTemplate
        bbsId="BBS-1"
        querySearchWrd=""
        handleLike={handleLike}
        pendingLikePstSn={null}
        list={[
          { pstSn: 71, pstTtl: '새 글', likeCnt: 1, recommended: false } as never,
          { pstSn: 72, pstTtl: '추천한 글', likeCnt: 9, recommended: true } as never,
        ]}
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
});
