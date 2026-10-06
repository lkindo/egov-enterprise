import React from 'react';
import { render, screen } from '@testing-library/react';
import type { LucideProps } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { HubHeader } from '../HubHeader';
import { HubMetricCard } from '../HubMetrics';
import type { LucideIcon } from 'lucide-react';

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
        headingLevel={1}
        actions={<button type="button">새로고침</button>}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: '시스템 허브' })).toBeInTheDocument();
    expect(screen.getByTestId('forward-icon')).toHaveAttribute('data-size', '22');
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
  });

  it('섹션 헤더는 기본 h2이고 페이지 제목으로 명시한 경우에만 h1을 렌더링한다', () => {
    const { rerender } = render(
      <HubHeader title="하위 관제" icon={ForwardIcon} />,
    );

    expect(screen.getByRole('heading', { level: 2, name: '하위 관제' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();

    rerender(<HubHeader title="독립 관제 화면" icon={ForwardIcon} headingLevel={1} />);
    expect(screen.getByRole('heading', { level: 1, name: '독립 관제 화면' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  // [2026-09-15 DEC-OPS-100] 상태를 넘기지 않은 지표 카드에 근거 없는 'NOMINAL' 배지를 붙이지 않는다.
  it('지표 카드는 넘겨받은 상태만 배지로 그린다', () => {
    const DotIcon = (() => null) as unknown as LucideIcon;
    const { rerender } = render(<HubMetricCard title="처리 건수" value={3} icon={DotIcon} />);
    expect(screen.queryByText('NOMINAL')).toBeNull();

    rerender(<HubMetricCard title="처리 건수" value={3} icon={DotIcon} status="정적 예시" />);
    expect(screen.getByText('정적 예시')).toBeInTheDocument();
  });
});
