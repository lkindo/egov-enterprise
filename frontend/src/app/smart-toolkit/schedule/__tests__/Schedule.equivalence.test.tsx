import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageInProjection } from '@/test-utils/projection';

/**
 * 일정 화면 동등성 그물(업무 허브 분해 W0). 업무 허브를 core 셸과 링크 기여로 나누기 전의 화면을 고정한다 — 이후 변경은 이 기대값을
 * 사유와 함께 바꿀 때만 화면을 바꿀 수 있다.
 *
 * 고정하는 것: 문서 제목, h1·설명·현재 위치, 탭 줄(이름·순서·id·aria-selected·aria-controls)과 tabpanel 의 aria-labelledby,
 * 탭을 눌렀을 때의 목적지, '일정 등록'·도구 막대의 기준 월, 검색 없음, 이 달 일정 목록. 이 시험은 일정 기능의 디렉터리에 있고
 * 다른 기능의 화면을 import 하지 않는다. 업무 보고 탭은 그 화면이 투영으로 빠진 생성물에서 기대값에서 뺀다.
 */

const WORK_REPORT = '/smart-toolkit/work-report';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  getMonth: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
  usePathname: () => '/smart-toolkit/schedule',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('@/lib/date/today-ymd', () => ({ getTodayYmd: () => '20260906' }));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({
    user: { id: 'writer', role: 'ROLE_USER', permissions: ['SCHEDULE_READ', 'SCHEDULE_CREATE', 'MEMO_RPT_READ', 'DEPT_BOX_READ'], authorizationVersion: 'v1' },
  });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/services/business/user/MenuService', () => ({ menuService: { getHeadMenus: async () => [] } }));
vi.mock('@/services/business/schedule/deptScheduleService', () => ({
  getDeptScheduleMonthList: mocks.getMonth,
  createDeptSchedule: vi.fn(),
  updateDeptSchedule: vi.fn(),
  deleteDeptSchedule: vi.fn(),
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn(), success: vi.fn(), error: vi.fn(), removeToast: () => {} }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));

import SchedulePage, { metadata } from '../page';

async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{await SchedulePage()}</QueryClientProvider>);
}

function expectedTabs() {
  return [
    ['업무 관리', 'false'],
    ...(pageInProjection(WORK_REPORT) ? [['업무 보고', 'false']] : []),
    ['일정', 'true'],
  ];
}

/** 아이콘(시험 대역은 이름을 글자로 그린다)을 뺀 글자. */
const textWithoutIcons = (element: Element) => {
  const copy = element.cloneNode(true) as Element;
  copy.querySelectorAll('[data-testid^="icon-"]').forEach(icon => icon.remove());
  return copy.textContent?.trim();
};
const crumbs = () => within(screen.getByRole('navigation', { name: '현재 위치' })).getAllByRole('listitem').map(textWithoutIcons);
const tabs = () => within(screen.getByRole('tablist', { name: '업무 영역 선택' })).getAllByRole('tab');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getMonth.mockResolvedValue([
    { schdlSn: 7, schdlNm: '분기 점검 회의', schdlBgngYmd: '20260910', schdlEndYmd: '20260910', editable: true, deletable: true },
  ]);
});

describe('일정 화면 동등성', () => {
  it('문서 제목과 h1·설명·현재 위치·기준 월을 고정한다', async () => {
    expect(metadata.title).toBe('일정 관리 | 전자정부 표준프레임워크');
    await renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: '일정' })).toBeInTheDocument();
    expect(screen.getByText('월간 일정을 조회합니다. 날짜를 선택하면 그 날짜의 일정만 표시합니다.')).toBeInTheDocument();
    expect(crumbs()).toEqual(['홈', '나의 업무', '일정']);
    expect(screen.getByText('2026년 9월 기준')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '2026년 9월 전체 일정' })).toBeInTheDocument();
    expect(await screen.findByText('분기 점검 회의')).toBeInTheDocument();
    expect(mocks.getMonth).toHaveBeenCalledWith({ yearMonth: '202609' });
  });

  it('탭 줄: 이름·순서·선택, 탭 id 와 aria-controls, tabpanel 의 aria-labelledby', async () => {
    await renderScreen();
    expect(tabs().map(tab => [tab.textContent, tab.getAttribute('aria-selected')])).toEqual(expectedTabs());
    expect(tabs().map(tab => tab.id)).toEqual([
      'work-hub-tab-job',
      ...(pageInProjection(WORK_REPORT) ? ['work-hub-tab-report'] : []),
      'work-hub-tab-calendar',
    ]);
    for (const tab of tabs()) expect(tab).toHaveAttribute('aria-controls', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'work-hub-tab-calendar');
  });

  it('탭을 누르면 그 탭의 화면 경로로 간다', async () => {
    await renderScreen();
    fireEvent.click(screen.getByRole('tab', { name: '업무 관리' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/smart-toolkit/dept-job', { scroll: false });
    if (pageInProjection(WORK_REPORT)) {
      fireEvent.click(screen.getByRole('tab', { name: '업무 보고' }));
      expect(mocks.push).toHaveBeenLastCalledWith(WORK_REPORT, { scroll: false });
    }
  });

  it('머리 동작: 일정 등록만 있고 검색·보고 등록·메모보고 관리·업무함 관리는 없다', async () => {
    await renderScreen();
    expect(screen.getByRole('button', { name: '일정 등록' })).toBeInTheDocument();
    expect(screen.queryByTestId('work-list-filter')).toBeNull();
    expect(screen.queryByRole('button', { name: '보고 등록' })).toBeNull();
    expect(screen.queryByRole('link', { name: '메모보고 관리' })).toBeNull();
    expect(screen.queryByRole('button', { name: '업무함 관리' })).toBeNull();
  });
});
