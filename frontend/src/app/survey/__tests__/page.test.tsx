import { vi, describe, it, expect, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mocks = vi.hoisted(() => ({ getSurveys: vi.fn(), push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/survey',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/services/foundation/survey/SurveyAdminService', () => ({
  surveyAdminService: { getSurveys: mocks.getSurveys },
}));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => null }));

import SurveyListPage from '../page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: {
    retry: false,
    // 앱의 최초 5xx 오류 승격 정책 아래에서도 이 목록은 자체 재시도를 제공해야 한다.
    throwOnError: (error) => 'status' in error && Number(error.status) >= 500,
  } } });
  return render(<QueryClientProvider client={client}><SurveyListPage /></QueryClientProvider>);
}

const survey = (srvySn: number) => ({
  srvySn, srvyTtl: `${srvySn}번째 설문`, srvyBgngYmd: '20000101', srvyEndYmd: '29991231',
});

describe('설문 목록 탐색과 복구', () => {
  beforeEach(() => vi.resetAllMocks());

  it('첫 10건 뒤의 설문으로 이동하고 상세를 열 수 있다', async () => {
    mocks.getSurveys.mockImplementation(async ({ page, size }) => ({
      list: page === 0 ? Array.from({ length: 10 }, (_, index) => survey(index + 1)) : [survey(11)],
      total: 11, totalPage: 2, page, size,
    }));
    renderPage();
    expect(await screen.findByText('1번째 설문')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    expect(await screen.findByText('11번째 설문')).toBeInTheDocument();
    expect(mocks.getSurveys).toHaveBeenLastCalledWith({ page: 1, size: 10 }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(screen.getByRole('button', { name: '다음 페이지' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '11번째 설문 설문 응답 열기' }));
    expect(mocks.push).toHaveBeenCalledWith('/survey/11');
    fireEvent.click(screen.getByRole('button', { name: '이전 페이지' }));
    expect(await screen.findByText('1번째 설문')).toBeInTheDocument();
  });

  it.each([undefined, 503])('조회 실패(%s)를 빈 목록과 구분하고 같은 페이지를 다시 요청한다', async (status) => {
    mocks.getSurveys.mockRejectedValueOnce(Object.assign(new Error('목록 조회 실패'), { status }))
      .mockResolvedValueOnce({ list: [survey(1)], total: 1, totalPage: 1, page: 0, size: 10 });
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('목록 조회 실패');
    expect(screen.queryByText('등록된 설문 조사가 없습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '데이터 다시 불러오기' }));
    expect(await screen.findByText('1번째 설문')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(mocks.getSurveys).toHaveBeenCalledTimes(2);
  });

  it('성공한 빈 응답에서만 등록된 설문이 없다고 안내한다', async () => {
    mocks.getSurveys.mockResolvedValue({ list: [], total: 0, totalPage: 0, page: 0, size: 10 });
    renderPage();
    expect(await screen.findByText('등록된 설문 조사가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음 페이지' })).not.toBeInTheDocument();
  });
});
