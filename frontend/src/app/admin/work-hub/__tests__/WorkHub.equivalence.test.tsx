import type { ReactElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageInProjection } from '@/test-utils/projection';

/**
 * 나의 업무(/admin/work-hub)와 업무 관리(/smart-toolkit/dept-job) 동등성 그물(업무 허브 분해 W0). 업무 허브를 core 셸과 링크 기여로
 * 나누기 전의 화면을 고정한다 — 이후 변경은 이 기대값을 사유와 함께 바꿀 때만 화면을 바꿀 수 있다. W1 에서 바뀐 기대값은 나의 업무의
 * 문서 제목 하나다(사유는 그 줄 옆). 업무 관리 라우트의 탭 줄은 분해 전에는 레이아웃이, 지금은 page 가 그린다 — 그물은 사용자가 보는
 * 화면 전체를 렌더하므로 기대값은 같다.
 *
 * 고정하는 것: 문서 제목, h1·설명·현재 위치, 탭 줄(이름·순서·id·aria-selected·aria-controls)과 tabpanel, 탭을 눌렀을 때의 목적지,
 * '업무 등록'·업무명 검색, '업무함 관리'(DEPT_BOX_READ 있음·없음). 두 라우트는 같은 업무 관리 목록을 연다. 업무 보고·일정 탭은 그
 * 화면이 투영으로 빠진 생성물에서 기대값에서 빼고, 남은 탭이 업무 관리 하나면 탭 줄과 tabpanel 이 없다.
 */

const WORK_REPORT = '/smart-toolkit/work-report';
const SCHEDULE = '/smart-toolkit/schedule';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: '/admin/work-hub',
  permissions: [] as string[],
  getDeptJobList: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('@/lib/date/today-ymd', () => ({ getTodayYmd: () => '20260906' }));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'writer', esntlId: 'USR_W', role: 'ROLE_USER', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/services/business/user/MenuService', () => ({ menuService: { getHeadMenus: async () => [] } }));
vi.mock('@/services/business/user/deptJob/DeptJobUserService', () => ({
  deptJobUserService: { getDeptJobList: mocks.getDeptJobList, createDeptJob: vi.fn(), deleteDeptJob: vi.fn() },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn(), success: vi.fn(), error: vi.fn(), removeToast: () => {} }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));

import WorkHubPage, { metadata as workHubMetadata } from '../page';
import DeptJobPage, { metadata as deptJobMetadata } from '@/app/smart-toolkit/dept-job/page';

const ROUTES: ReadonlyArray<{ route: string; title: string; screen: () => Promise<ReactElement> }> = [
  // [W1] 문서 제목은 메뉴 이름 '나의 업무' 를 따른다 — 이 화면은 업무 관리 목록만 그리는데 종전 제목은 보고·일정을 말했다.
  { route: '/admin/work-hub', title: '나의 업무 | 전자정부 표준프레임워크', screen: () => WorkHubPage() },
  // 분해 전에는 레이아웃이 탭 줄을 넘겼다. 레이아웃을 걷은 뒤에는 page 가 사용자가 보는 화면 전체다.
  { route: '/smart-toolkit/dept-job', title: '부서 업무 목록 | 전자정부 표준프레임워크', screen: () => DeptJobPage() },
];

async function renderScreen(route: (typeof ROUTES)[number]) {
  mocks.pathname = route.route;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{await route.screen()}</QueryClientProvider>);
}

/** 보이는 탭(이름·선택·id). 업무 관리가 먼저이고, 생성물에서는 남은 기능의 탭만 있다. */
function expectedTabs() {
  return [
    ['업무 관리', 'true', 'work-hub-tab-job'],
    ...(pageInProjection(WORK_REPORT) ? [['업무 보고', 'false', 'work-hub-tab-report']] : []),
    ...(pageInProjection(SCHEDULE) ? [['일정', 'false', 'work-hub-tab-calendar']] : []),
  ];
}
const contributedTabsInProjection = expectedTabs().length > 1;

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
  mocks.permissions = ['DEPT_JOB_READ', 'DEPT_JOB_CREATE', 'DEPT_BOX_READ'];
  mocks.getDeptJobList.mockResolvedValue({
    list: [{ deptTaskSn: 41, deptTaskNm: '예산 집행 점검', deptTaskBoxNm: '재무', picNm: '홍길동', prrtyRnk: '2' }],
    total: 1,
    totalPage: 1,
  });
});

describe.each(ROUTES)('$route 동등성', (route) => {
  it('문서 제목과 h1·설명·현재 위치·목록을 고정한다', async () => {
    expect(route.route === '/admin/work-hub' ? workHubMetadata.title : deptJobMetadata.title).toBe(route.title);
    await renderScreen(route);
    expect(screen.getByRole('heading', { level: 1, name: '업무 관리' })).toBeInTheDocument();
    expect(screen.getByText('부서 업무의 담당자·우선순위·업무함을 조회합니다.')).toBeInTheDocument();
    expect(crumbs()).toEqual(['홈', '나의 업무', '업무 관리']);
    expect(await screen.findByText('예산 집행 점검')).toBeInTheDocument();
  });

  if (!contributedTabsInProjection) it('기여 탭이 없으면 탭 줄도 tabpanel 도 없다', async () => {
    await renderScreen(route);
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tabpanel')).toBeNull();
  });

  if (contributedTabsInProjection) it('탭 줄: 이름·순서·선택·id·aria-controls 와 tabpanel', async () => {
    await renderScreen(route);
    expect(tabs().map(tab => [tab.textContent, tab.getAttribute('aria-selected'), tab.id])).toEqual(expectedTabs());
    for (const tab of tabs()) expect(tab).toHaveAttribute('aria-controls', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'work-hub-tab-job');
  });

  if (contributedTabsInProjection) it('탭을 누르면 그 탭의 화면 경로로 간다', async () => {
    await renderScreen(route);
    fireEvent.click(screen.getByRole('tab', { name: '업무 관리' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/smart-toolkit/dept-job', { scroll: false });
    for (const [name, href] of [['업무 보고', WORK_REPORT], ['일정', SCHEDULE]]) {
      if (!pageInProjection(href)) continue;
      fireEvent.click(screen.getByRole('tab', { name }));
      expect(mocks.push).toHaveBeenLastCalledWith(href, { scroll: false });
    }
  });

  it('머리 동작과 검색: 업무 등록·업무명 검색, 업무함 관리는 업무함 조회 권한이 있을 때만', async () => {
    const first = await renderScreen(route);
    expect(screen.getByRole('button', { name: '업무 등록' })).toBeInTheDocument();
    expect(within(screen.getByTestId('work-list-filter')).getByLabelText('업무명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '업무함 관리' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '보고 등록' })).toBeNull();
    expect(screen.queryByRole('button', { name: '일정 등록' })).toBeNull();
    expect(screen.queryByRole('link', { name: '메모보고 관리' })).toBeNull();
    first.unmount();

    mocks.permissions = ['DEPT_JOB_READ', 'DEPT_JOB_CREATE'];
    await renderScreen(route);
    expect(screen.queryByRole('button', { name: '업무함 관리' })).toBeNull();
  });
});
