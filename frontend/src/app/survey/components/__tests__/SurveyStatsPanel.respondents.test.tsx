import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-26 DIP V8] 비율의 분모를 말한다.
 *
 * 복수선택 문항은 항목 비율 합이 100% 를 넘는다. 무엇 대비 비율인지 밝히지 않으면 10명 중 6명이
 * 고른 60% 를 '전체 선택의 60%' 로 읽는다.
 */
const mocks = vi.hoisted(() => ({ getSurveyStats: vi.fn() }));
vi.mock('@/lib/api/survey', () => ({ getSurveyStats: mocks.getSurveyStats }));

import { SurveyStatsPanel } from '../SurveyStatsPanel';

describe('설문 통계 패널', () => {
  it('🚨 항목 비율 옆에 응답자 수 기준을 밝힌다', async () => {
    mocks.getSurveyStats.mockResolvedValue([
      { srvyQstnSn: 1, qstnCn: '관심 분야', qstnTypeCd: '1', srvyArtclSn: 11, artclCn: '교육', count: 6, percentage: 60, respondentCount: 10 },
    ]);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><SurveyStatsPanel srvySn={1} /></QueryClientProvider>);

    expect(await screen.findByText(/6 명 \(60%\) · 응답자 10명 기준/)).toBeInTheDocument();
  });
});
