import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { visibleEntries } from '@/extensions/slots';
import memoReportSections from '@/extensions/memoreport/home-sections';
import { HOME_SECTION_PERMISSIONS, expectedVisibleWhen } from '@/__tests__/cross-stack/home-section-permissions';

/**
 * [2026-10-20] 업무 홈의 '읽지 않은 받은 보고' 카드(메모 보고 기여). 메모 보고 디렉터리에 두어 메모 보고와 함께 빠진다.
 *
 * - 노출: 카드가 부르는 받은 보고 API 의 권한(MEMO_RPT_READ)이 있는 주체에게만 보인다. 서버 바인딩 대조는
 *   cross-stack/home-section-permission-bindings.test.ts 가 같은 기대값으로 본다.
 * - 내용: 받은 보고(최신순)에서 받은 사람이 아직 열지 않은 것(첫 열람 시각 없음)을 센다. 한 번에 받는 상한(100건)만큼 읽고, 받은
 *   보고가 그보다 많으면 범위를 밝힌다. 목적지는 받은 보고 탭(기본 탭)이다.
 */
const api = vi.hoisted(() => ({
  getReceivedReports: vi.fn(),
  user: { id: 'user', permissions: ['MEMO_RPT_READ'], authorizationVersion: 'v1' } as { id: string; permissions: string[]; authorizationVersion: string },
}));
vi.mock('@/services/business/memoreport/memoReportService', () => ({
  memoReportService: { getReceivedReports: api.getReceivedReports },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: api.user }) }));

const { MemoReportReceivedCard } = await import('@/app/components/dashboard/MemoReportHome');

type Subject = null | { id: string; permissions: string[]; authorizationVersion?: string };
const SUBJECTS = {
  granted: { id: 'user', permissions: ['DASHBOARD_READ', 'MEMO_RPT_READ'], authorizationVersion: 'v1' },
  // 근접 오답: 보고를 쓸 수만 있다.
  writeOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'MEMO_RPT_CREATE'], authorizationVersion: 'v1' },
  signedOut: null,
  noVersion: { id: 'user', permissions: ['MEMO_RPT_READ'] },
} satisfies Record<string, Subject>;

describe('업무 홈 받은 보고 카드의 노출(메모 보고 기여)', () => {
  it.each(Object.keys(SUBJECTS) as (keyof typeof SUBJECTS)[])('노출 행렬 — 주체 %s', (subject) => {
    expect(visibleEntries(SUBJECTS[subject], [memoReportSections]).map(entry => entry.id))
      .toEqual(subject === 'granted' ? ['memo-reports-received'] : []);
  });

  it('술어는 받은 보고 API 의 권한(서버 바인딩 대조와 같은 기대값)이고, 요약 카드 줄에 놓인다', () => {
    expect(memoReportSections.map(entry => [entry.id, entry.visibleWhen]))
      .toEqual(expectedVisibleWhen(HOME_SECTION_PERMISSIONS.memoreport.sections));
    expect(memoReportSections.map(entry => [entry.placement, entry.order])).toEqual([['cards', 22]]);
  });
});

describe('읽지 않은 받은 보고 카드의 내용', () => {
  const renderCard = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ul><MemoReportReceivedCard /></ul>
    </QueryClientProvider>,
  );
  const report = (memoRptSn: number, rptTtl: string, rptrInqDt: string | null) => ({ memoRptSn, rptTtl, rptrInqDt });

  beforeEach(() => {
    vi.clearAllMocks();
    api.user = { id: 'user', permissions: ['MEMO_RPT_READ'], authorizationVersion: 'v1' };
  });

  it('첫 열람이 없는 보고를 세고 최근 미열람 두 건의 제목을 덧붙이며 받은 보고 화면으로 잇는다', async () => {
    api.getReceivedReports.mockResolvedValue({
      list: [report(9, '주간 보고', null), report(8, '읽은 보고', '2026-10-19T10:00:00'), report(7, '월간 보고', null), report(6, '분기 보고', null)],
      total: 4,
    });
    renderCard();

    const link = await screen.findByRole('link', { name: /^읽지 않은 받은 보고/ });
    await waitFor(() => expect(link).toHaveTextContent('읽지 않은 받은 보고3건'));
    expect(link).toHaveAttribute('href', '/admin/operation/memo-reports');
    expect(api.getReceivedReports).toHaveBeenCalledWith({ page: 1, size: 100 });
    const items = within(screen.getByRole('list', { name: '읽지 않은 받은 보고 최근 항목' })).getAllByRole('listitem');
    expect(items.map(item => item.textContent)).toEqual(['주간 보고', '월간 보고']);
    expect(screen.queryByText(/에서 셌습니다/)).toBeNull();
  });

  it('받은 보고가 한 번에 읽는 상한보다 많으면 센 범위를 밝힌다', async () => {
    api.getReceivedReports.mockResolvedValue({ list: [report(9, '주간 보고', null)], total: 250 });
    renderCard();

    expect(await screen.findByText('최근 받은 보고 1건에서 셌습니다.')).toBeInTheDocument();
  });

  it('받은 보고 화면에 들어갈 수 없으면 이동을 약속하지 않는다(라우트 게이트와 같은 판정)', async () => {
    api.user = { id: 'user', permissions: [], authorizationVersion: 'v1' };
    api.getReceivedReports.mockResolvedValue({ list: [], total: 0 });
    renderCard();

    expect(await screen.findByText('0건')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('조회에 실패하면 0건이 아니라 조회 실패라고 말한다', async () => {
    api.getReceivedReports.mockRejectedValue(new Error('down'));
    renderCard();

    const link = await screen.findByRole('link', { name: /^읽지 않은 받은 보고/ });
    await waitFor(() => expect(link).toHaveTextContent('조회 실패'));
    expect(screen.queryByText('0건')).toBeNull();
  });
});
