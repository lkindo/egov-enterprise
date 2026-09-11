import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SurveyStatsClient from './SurveyStatsClient';
const mocks = vi.hoisted(() => ({ push: vi.fn(), getSurveys: vi.fn(), search: '' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }), useSearchParams: () => new URLSearchParams(mocks.search) }));
vi.mock('@/services/foundation/survey/SurveyAdminService', () => ({ surveyAdminService: { getSurveys: mocks.getSurveys } }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('../components/SurveyStatsPanel', () => ({ SurveyStatsPanel: ({ srvySn }: { srvySn: number | null }) => <p>조회 대상: {srvySn ?? '미선택'}</p> }));
function setup() {return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SurveyStatsClient /></QueryClientProvider>);}

describe('survey statistics selection', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.search = ''; mocks.getSurveys.mockImplementation(async ({ page }) => ({ list: [{ srvySn: page ? 22 : 11, srvyTtl: page ? '두 번째 설문' : '첫 설문' }], total: 12 })); });
  it('selects by name across pages and resets the query page when searching', async () => {
    setup(); await screen.findByRole('button', { name: '첫 설문' });
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: '2' }));
    fireEvent.click(await screen.findByRole('button', { name: '두 번째 설문' }));
    expect(mocks.push).toHaveBeenCalledWith('/survey/stats?srvySn=22');
    fireEvent.change(screen.getByRole('textbox', { name: '설문 제목' }), { target: { value: '검색' } });
    await waitFor(() => expect(mocks.getSurveys).toHaveBeenLastCalledWith({ page: 0, size: 10, keyword: '검색' }, expect.objectContaining({ signal: expect.any(AbortSignal) })));
  });
  it('renders a bookmarked result even when the optional selection list fails', async () => {
    mocks.search = 'srvySn=22'; mocks.getSurveys.mockRejectedValue(new Error('synthetic failure'));
    setup();
    expect(screen.getByText('조회 대상: 22')).toBeVisible();
    fireEvent.click(screen.getByText('다른 설문지 선택'));
    expect(await screen.findByRole('alert')).toHaveTextContent('설문지를 불러오지 못했습니다.');
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeVisible();
  });
});
