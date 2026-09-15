import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>();
  const Pass = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return { ...actual, ResponsiveContainer: Pass, PieChart: Pass, Pie: Pass, Cell: () => null };
});
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }));

import { GaugeChart } from '../observability-charts';

/**
 * [2026-09-15 DEC-OPS-100] 사용률을 읽지 못한 게이지는 0% 가 아니다(formatRules.number.unknownAsZero).
 * 종전에는 서비스가 조회 실패를 0 으로 돌려주고 게이지가 그 0 을 그대로 그려, 실패와 유휴가 같은 화면이었다.
 */
describe('GaugeChart 측정값 없음', () => {
  it('값이 없으면 0% 대신 측정값 없음을 그리고 임계 경고도 띄우지 않는다', () => {
    const { container } = render(<GaugeChart value={null} title="CPU_LOAD" unit="%" />);

    expect(screen.getByText('측정값 없음')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/0%/);
    expect(screen.queryByText('CRITICAL THRESHOLD')).toBeNull();
  });

  it('측정된 0 은 0% 로 그린다', () => {
    render(<GaugeChart value={0} title="CPU_LOAD" unit="%" />);

    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.queryByText('측정값 없음')).toBeNull();
  });
});
