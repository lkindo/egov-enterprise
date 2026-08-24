import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PagePagination } from '../PagePagination';

describe('PagePagination', () => {
  it('경계 페이지의 이동 링크를 비활성화하고 탭 순서에서 제외한다', () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <PagePagination total={21} page={1} size={20} onPageChange={onPageChange} />,
    );

    const previous = screen.getByRole('link', { name: '이전 페이지로 이동' });
    const next = screen.getByRole('link', { name: '다음 페이지로 이동' });

    expect(previous).toHaveAttribute('aria-disabled', 'true');
    expect(previous).toHaveAttribute('tabindex', '-1');
    expect(next).not.toHaveAttribute('aria-disabled');

    fireEvent.click(previous);
    expect(onPageChange).not.toHaveBeenCalled();
    fireEvent.click(next);
    expect(onPageChange).toHaveBeenLastCalledWith(2);

    onPageChange.mockClear();
    rerender(<PagePagination total={21} page={2} size={20} onPageChange={onPageChange} />);

    expect(screen.getByRole('link', { name: '다음 페이지로 이동' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('link', { name: '다음 페이지로 이동' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('link', { name: '이전 페이지로 이동' })).not.toHaveAttribute('aria-disabled');

    fireEvent.click(screen.getByRole('link', { name: '다음 페이지로 이동' }));
    expect(onPageChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: '이전 페이지로 이동' }));
    expect(onPageChange).toHaveBeenLastCalledWith(1);
  });
});
