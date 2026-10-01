import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isPostingEnded, PostingEndedBadge } from '../PostingEndedBadge';

vi.mock('@/lib/hooks/use-today-ymd', () => ({ useTodayStorageYmd: () => '20261001' }));

/** 게시 종료 표시(2026-10-01 결정 23). 서버와 같이 종료일 당일까지는 게시 중이다. */
describe('PostingEndedBadge', () => {
  it('종료일이 오늘보다 앞일 때만 끝난 글이다 — 당일과 형식이 틀린 값은 끝나지 않았다', () => {
    expect(isPostingEnded('20260930', '20261001')).toBe(true);
    expect(isPostingEnded('2026-09-30', '20261001')).toBe(true);
    expect(isPostingEnded('20261001', '20261001')).toBe(false);
    expect(isPostingEnded('', '20261001')).toBe(false);
    expect(isPostingEnded('2026-9-30', '20261001')).toBe(false);
    expect(isPostingEnded('20260930', '')).toBe(false);
  });

  it('끝난 글에만 표시를 그린다', () => {
    const { rerender } = render(<PostingEndedBadge pstEndYmd="20260930" />);
    expect(screen.getByText('게시 종료')).toBeInTheDocument();
    rerender(<PostingEndedBadge pstEndYmd="20261231" />);
    expect(screen.queryByText('게시 종료')).toBeNull();
  });
});
