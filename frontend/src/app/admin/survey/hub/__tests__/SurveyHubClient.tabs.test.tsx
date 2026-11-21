import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => mocks.searchParams,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['POLL_READ_ALL'] } }),
}));
vi.mock('@/lib/auth/page-access', () => ({ canOpenPage: () => true }));
vi.mock('@/services/foundation/system/SurveyAdminService', () => ({
  surveyAdminService: { getSurveyList: vi.fn().mockResolvedValue({ list: [], total: 0 }) },
}));
vi.mock('@/services/foundation/system/StatsAdminService', () => ({
  statsAdminService: { getSummary: vi.fn().mockResolvedValue({ totalUsers: 0, todayConnects: 0 }) },
}));
vi.mock('../../manage/SurveyManageClient', () => ({ default: () => <div data-testid="panel-manage" /> }));
vi.mock('../../stats/SurveyStatsClient', () => ({ default: () => <div data-testid="panel-stats" /> }));
vi.mock('../../components/SurveyQuestionsPanel', () => ({ default: () => <div data-testid="panel-questions" /> }));
vi.mock('../../components/SurveyTemplatesPanel', () => ({ default: () => <div data-testid="panel-templates" /> }));

import { SurveyHubClient } from '../SurveyHubClient';

describe('SurveyHubClient StandardTabs 전환 및 키보드 내비게이션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchParams = new URLSearchParams();
  });

  it('StandardTabs role=tablist/tab/tabpanel 연결과 방향키 탐색을 제공한다', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <SurveyHubClient />
      </QueryClientProvider>,
    );

    const tablist = screen.getByRole('tablist', { name: '설문조사 관리 탭' });
    const manageTab = screen.getByRole('tab', { name: '여론조사 관리' });
    const questionsTab = screen.getByRole('tab', { name: '설문지·문항' });
    const panel = screen.getByRole('tabpanel');

    expect(manageTab).toHaveAttribute('aria-selected', 'true');
    expect(questionsTab).toHaveAttribute('aria-selected', 'false');
    expect(panel).toHaveAttribute('aria-labelledby', manageTab.id);
    expect(manageTab).toHaveAttribute('aria-controls', panel.id);
    expect(tablist).toContainElement(manageTab);

    manageTab.focus();
    fireEvent.keyDown(manageTab, { key: 'ArrowRight' });
    expect(questionsTab).toHaveFocus();
    expect(mocks.replace).toHaveBeenCalledWith('/admin/survey/hub?tab=questions', { scroll: false });
  });
});
