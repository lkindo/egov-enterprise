import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-26 DIP B5 F6] 결과 통계 xlsx 내려받기. 같은 틱의 두 번째 클릭은 막고, 실패는 사유를 보인다.
 */
const mocks = vi.hoisted(() => ({ getSurveyStats: vi.fn(), downloadSurveyStatsXlsx: vi.fn() }));
vi.mock('@/lib/api/survey', () => ({
  getSurveyStats: mocks.getSurveyStats,
  downloadSurveyStatsXlsx: mocks.downloadSurveyStatsXlsx,
}));

import { SurveyStatsPanel } from '../SurveyStatsPanel';

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><SurveyStatsPanel srvySn={7} /></QueryClientProvider>);
}

describe('설문 통계 패널 — 결과 내려받기 (DIP B5 F6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSurveyStats.mockResolvedValue([
      { srvyQstnSn: 1, qstnCn: '만족하십니까', qstnTypeCd: '1', srvyArtclSn: 11, artclCn: '예', count: 3, percentage: 75, respondentCount: 4 },
    ]);
  });

  it('내려받기는 한 번만 부르고 진행 중에는 잠기며 실패 사유를 보인다', async () => {
    let rejectDownload!: (reason?: unknown) => void;
    mocks.downloadSurveyStatsXlsx.mockReturnValueOnce(new Promise((_, reject) => { rejectDownload = reject; }));
    renderPanel();
    const button = await screen.findByRole('button', { name: '결과를 엑셀로 내려받기' });

    act(() => {
      button.click();
      button.click();
    });

    await waitFor(() => expect(mocks.downloadSurveyStatsXlsx).toHaveBeenCalledTimes(1));
    expect(mocks.downloadSurveyStatsXlsx).toHaveBeenCalledWith(7);
    const pending = screen.getByRole('button', { name: '내려받는 중…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');

    await act(async () => rejectDownload(new Error('Network Error')));
    expect(await screen.findByRole('alert')).toHaveTextContent('결과 파일을 내려받지 못했습니다.');
    expect(screen.getByRole('button', { name: '결과를 엑셀로 내려받기' })).toBeEnabled();
  });

  it('성공하면 오류 문구를 두지 않는다', async () => {
    mocks.downloadSurveyStatsXlsx.mockResolvedValueOnce(undefined);
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: '결과를 엑셀로 내려받기' }));

    await waitFor(() => expect(mocks.downloadSurveyStatsXlsx).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole('button', { name: '결과를 엑셀로 내려받기' })).toBeEnabled());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
