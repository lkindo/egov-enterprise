import React from 'react';
import { render, screen } from '@testing-library/react';
import type { LucideProps } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { HubHeader } from '../HubHeader';
import { HubInsightBadge } from '../HubInsightBadge';
import { HubListCard } from '../HubListCard';
import { HubSummaryCard } from '../HubSummaryCard';

// lucide-react 아이콘과 같은 forwardRef 객체다. 런타임 typeof가 `object`이므로
// 종전의 `typeof icon === 'function'` 구현에서는 렌더되지 않았다.
const ForwardIcon = React.forwardRef<SVGSVGElement, LucideProps>(({ size, ...props }, ref) => (
  <svg ref={ref} data-testid="forward-icon" data-size={String(size)} {...props} />
));
ForwardIcon.displayName = 'ForwardIcon';

describe('Hub 공통 컴포넌트', () => {
  it('forwardRef Lucide 컴포넌트를 HubHeader 아이콘으로 렌더링한다', () => {
    render(
      <HubHeader
        title="시스템"
        highlight="허브"
        subtitle="통합 관제"
        icon={ForwardIcon}
        actions={<button type="button">새로고침</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: '시스템 허브' })).toBeInTheDocument();
    expect(screen.getByTestId('forward-icon')).toHaveAttribute('data-size', '32');
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
  });

  it('이미 생성된 아이콘 요소의 크기는 덮어쓰지 않고 기본 아이콘도 제공한다', () => {
    const { rerender } = render(
      <HubInsightBadge label="실시간" icon={<ForwardIcon size={9} />} />,
    );
    expect(screen.getByTestId('forward-icon')).toHaveAttribute('data-size', '9');

    rerender(<HubInsightBadge label="기본" />);
    expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
  });

  it('목록 카드가 forwardRef 아이콘·항목·상세 링크와 빈 상태를 렌더링한다', () => {
    const { rerender } = render(
      <HubListCard
        title="최근 공지"
        icon={ForwardIcon}
        moreHref="/notices"
        items={[{ id: 1, title: '점검 안내', date: '2026-08-12', isNew: true }]}
      />,
    );

    expect(screen.getByTestId('forward-icon')).toHaveAttribute('data-size', '20');
    expect(screen.getByText('점검 안내')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '최근 공지 상세보기' })).toHaveAttribute('href', '/notices');

    rerender(<HubListCard title="최근 공지" icon={ForwardIcon} items={[]} />);
    expect(screen.getByText('데이터가 없습니다.')).toBeInTheDocument();
  });

  it('요약 카드의 장식 아이콘만 140px로 복제하고 추세를 표시한다', () => {
    render(
      <HubSummaryCard
        title="처리율"
        value="98"
        description="전일 대비"
        icon={<ForwardIcon size={24} />}
        trend={3}
        e2eLabel="processing-rate"
      />,
    );

    const icons = screen.getAllByTestId('forward-icon');
    expect(icons[0]).toHaveAttribute('data-size', '24');
    expect(icons[1]).toHaveAttribute('data-size', '140');
    expect(screen.getByText('3%')).toBeInTheDocument();
    expect(screen.getByText('processing-rate')).toHaveClass('sr-only');
  });
});
