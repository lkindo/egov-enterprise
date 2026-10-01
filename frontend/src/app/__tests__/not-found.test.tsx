import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import NotFound from '../not-found';

/** [2026-10-01] 404 의 '이전으로' 는 돌아갈 기록이 있을 때만 둔다 — 새 탭에서는 눌러도 아무 일이 없었다. */
describe('404 화면', () => {
  afterEach(() => vi.restoreAllMocks());

  it('기록이 없으면 이전으로를 두지 않고 홈 이동만 둔다, 영문 장식 문구도 없다', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    render(<NotFound />);
    expect(screen.queryByRole('button', { name: /이전으로/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /홈으로 이동/ })).toHaveAttribute('href', '/');
    expect(screen.queryByText(/Electronic Government/)).not.toBeInTheDocument();
  });

  it('기록이 있으면 이전으로를 둔다', () => {
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(3);
    render(<NotFound />);
    expect(screen.getByRole('button', { name: /이전으로/ })).toBeInTheDocument();
  });
});
