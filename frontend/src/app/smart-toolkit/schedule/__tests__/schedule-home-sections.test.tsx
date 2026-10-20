import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { visibleEntries } from '@/extensions/slots';
import scheduleSections from '@/extensions/schedule/home-sections';
import { HOME_SECTION_PERMISSIONS, expectedVisibleWhen } from '@/__tests__/cross-stack/home-section-permissions';

/**
 * [2026-10-20] 업무 홈의 '오늘 일정' 카드(일정 기여). 일정 디렉터리에 두어 일정과 함께 빠진다 — 업무 홈 레지스트리는 import 하지
 * 않는다(소비자 표).
 *
 * - 노출: 카드가 부르는 월별 일정 API 의 권한(SCHEDULE_READ)이 있는 주체에게만 보인다. 권한 상태를 모르면 보이지 않는다. 그 권한이
 *   서버 바인딩·기본 그룹과 같은지는 cross-stack/home-section-permission-bindings.test.ts 가 본다(같은 기대값).
 * - 내용: 달력과 같은 월별 조회에서 오늘이 기간 안에 드는 일정만 센다(종료일이 없으면 시작일 하루). 기간 조회(/schedules/range)는
 *   부르지 않는다. 조회에 실패하면 0건이 아니라 '조회 실패' 다.
 */
const api = vi.hoisted(() => ({ getDeptScheduleMonthList: vi.fn(), getDeptScheduleByRange: vi.fn() }));
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: api.getDeptScheduleMonthList,
  deptScheduleService: { getDeptScheduleByRange: api.getDeptScheduleByRange },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' } }) }));

const { ScheduleTodayCard } = await import('@/app/components/dashboard/ScheduleHome');

type Subject = null | { id: string; permissions: string[]; authorizationVersion?: string };
const SUBJECTS = {
  granted: { id: 'user', permissions: ['DASHBOARD_READ', 'SCHEDULE_READ'], authorizationVersion: 'v1' },
  // 근접 오답: 업무 홈은 보지만 일정 조회 권한이 없다(쓰기 권한만 있다).
  writeOnly: { id: 'user', permissions: ['DASHBOARD_READ', 'SCHEDULE_CREATE'], authorizationVersion: 'v1' },
  signedOut: null,
  noVersion: { id: 'user', permissions: ['SCHEDULE_READ'] },
} satisfies Record<string, Subject>;

describe('업무 홈 오늘 일정 카드의 노출(일정 기여)', () => {
  it.each(Object.keys(SUBJECTS) as (keyof typeof SUBJECTS)[])('노출 행렬 — 주체 %s', (subject) => {
    expect(visibleEntries(SUBJECTS[subject], [scheduleSections]).map(entry => entry.id))
      .toEqual(subject === 'granted' ? ['schedule-today'] : []);
  });

  it('술어는 월별 일정 API 의 권한(서버 바인딩 대조와 같은 기대값)이고, 요약 카드 줄에 놓인다', () => {
    expect(scheduleSections.map(entry => [entry.id, entry.visibleWhen]))
      .toEqual(expectedVisibleWhen(HOME_SECTION_PERMISSIONS.schedule.sections));
    expect(scheduleSections.map(entry => [entry.placement, entry.order])).toEqual([['cards', 24]]);
  });
});

describe('오늘 일정 카드의 내용', () => {
  const renderCard = () => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ul><ScheduleTodayCard /></ul>
    </QueryClientProvider>,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 20, 9, 0, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('이번 달 월별 조회에서 오늘이 기간 안에 드는 일정만 세고 제목 두 건을 덧붙인다', async () => {
    api.getDeptScheduleMonthList.mockResolvedValue([
      { schdlSn: 1, schdlNm: '주간 회의', schdlBgngYmd: '20261020', schdlEndYmd: '20261020' },
      { schdlSn: 2, schdlNm: '출장', schdlBgngYmd: '20261018', schdlEndYmd: '20261022' },
      { schdlSn: 3, schdlNm: '하루 일정', schdlBgngYmd: '20261020', schdlEndYmd: '' },
      { schdlSn: 4, schdlNm: '지난 일정', schdlBgngYmd: '20261001', schdlEndYmd: '20261002' },
      { schdlSn: 5, schdlNm: '다음 일정', schdlBgngYmd: '20261021', schdlEndYmd: '20261021' },
    ]);
    renderCard();

    const link = await screen.findByRole('link', { name: /^오늘 일정/ });
    await waitFor(() => expect(link).toHaveTextContent('오늘 일정3건'));
    expect(link).toHaveAttribute('href', '/smart-toolkit/schedule');
    expect(api.getDeptScheduleMonthList).toHaveBeenCalledWith({ yearMonth: '202610' });
    expect(api.getDeptScheduleByRange).not.toHaveBeenCalled();
    const items = within(screen.getByRole('list', { name: '오늘 일정 최근 항목' })).getAllByRole('listitem').map(item => item.textContent);
    expect(items).toEqual(['주간 회의', '출장']);
  });

  it('오늘 일정이 없으면 0건이고 항목 목록을 두지 않는다', async () => {
    api.getDeptScheduleMonthList.mockResolvedValue([]);
    renderCard();

    const link = await screen.findByRole('link', { name: /^오늘 일정/ });
    await waitFor(() => expect(link).toHaveTextContent('오늘 일정0건'));
    expect(screen.queryByRole('list', { name: '오늘 일정 최근 항목' })).toBeNull();
  });

  it('조회에 실패하면 0건이 아니라 조회 실패라고 말한다', async () => {
    api.getDeptScheduleMonthList.mockRejectedValue(new Error('down'));
    renderCard();

    const link = await screen.findByRole('link', { name: /^오늘 일정/ });
    await waitFor(() => expect(link).toHaveTextContent('오늘 일정조회 실패'));
    expect(screen.queryByText('0건')).toBeNull();
  });
});
