import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/components/ui/standard-chart-wrapper', () => ({
  StandardChartWrapper: () => <div data-testid="connect-chart" />,
}));

import AdminStatsClient from '../AdminStatsClient';

/** 요약 칸은 제목 문단과 값 문단을 한 상자에 담는다. */
function summaryCard(title: string): HTMLElement {
  return screen.getByText(title).parentElement as HTMLElement;
}

/**
 * 표 하단 합계는 `총 <span>N</span>건` 으로 텍스트가 여러 노드에 나뉜다. getByText 는 요소의 직접
 * 텍스트만 비교해 이 문구를 잡지 못하므로 렌더 결과 전체 텍스트에서 공백을 무시하고 찾는다.
 */
function renderedTotal(container: HTMLElement): RegExpMatchArray | null {
  return (container.textContent ?? '').match(/총\s*(\d[\d,]*)\s*건/);
}

/**
 * [2026-09-15 DEC-OPS-100] 통계 화면은 조회 실패와 읽을 수 없는 값을 0 으로 쓰지 않는다.
 *
 * 종전에는 서버 컴포넌트가 실패를 잡아 요약을 null 로 넘겼는데, 화면이 `?? 0` 으로 그려
 * "통계 데이터 조회 실패" 경고 바로 옆에 "누적 사용자 0" 이 보였다. 수집 일수와 표의 총 건수도
 * 같은 경로에서 "0일"·"총 0건" 을 말했다.
 */
describe('AdminStatsClient 요약 수치', () => {
  it('조회에 실패하면 요약 칸과 수집 일수에 0 대신 조회 실패를 말하고 총 0건을 그리지 않는다', () => {
    const { container } = render(
      <AdminStatsClient
        initialSummary={null}
        initialConnectData={[]}
        loadError="통계 데이터를 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 새로고침해 주세요."
      />,
    );

    for (const title of ['누적 사용자', '금일 접속', '누적 게시물']) {
      expect(within(summaryCard(title)).getByText('조회 실패')).toBeInTheDocument();
      expect(within(summaryCard(title)).queryByText('0')).toBeNull();
    }
    expect(screen.getByText(/수집된 일수 조회 실패/)).toBeInTheDocument();
    expect(renderedTotal(container)).toBeNull();
  });

  it('값이 있으면 그 값을, 읽을 수 없는 값은 0 이 아니라 - 로 보인다', () => {
    const { container } = render(
      <AdminStatsClient
        initialSummary={{ totalUsers: 1234, todayConnects: null, totalPosts: 0 }}
        initialConnectData={[{ statsDate: '20260915', name: '09/15', statsCo: 5 }]}
      />,
    );

    expect(within(summaryCard('누적 사용자')).getByText('1,234')).toBeInTheDocument();
    expect(within(summaryCard('금일 접속')).getByText('-')).toBeInTheDocument();
    expect(within(summaryCard('누적 게시물')).getByText('0')).toBeInTheDocument();
    expect(screen.getByText(/수집된 일수 1일/)).toBeInTheDocument();
    // 양성 대조 — 합계 문구를 실제로 찾을 수 있어야 위 실패 단언이 의미가 있다.
    expect(renderedTotal(container)?.[1]).toBe('1');
  });
});
