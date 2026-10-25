import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ContentPageNotFound from '../[slug]/not-found';

describe('콘텐츠 페이지 없음 화면(ADR-0039 결정 9·ADR-0042)', () => {
  it('없거나 게시되지 않은 페이지를 같은 말로 알리고 안내 페이지 목록과 업무 홈으로 돌아갈 길을 준다', () => {
    render(<ContentPageNotFound />);
    expect(screen.getByRole('heading', { level: 1, name: '없거나 게시되지 않은 페이지입니다' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '안내 페이지 목록' })).toHaveAttribute('href', '/pages');
    expect(screen.getByRole('link', { name: '업무 홈으로' })).toHaveAttribute('href', '/');
  });
});
