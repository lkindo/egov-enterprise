import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pageInProjection } from '@/test-utils/projection';

/**
 * 업무 보고 화면 동등성 그물(업무 허브 분해 W0). 업무 허브를 core 셸과 링크 기여로 나누기 전의 화면을 고정한다 — 이후 변경은 이
 * 기대값을 사유와 함께 바꿀 때만 화면을 바꿀 수 있다. W1 에서 바뀐 기대값은 메모 보고 화면에 들어갈 수 없는 사람의 안내 문장 하나다
 * (사유는 그 시험 옆).
 *
 * 고정하는 것: 문서 제목, h1·설명·현재 위치, 탭 줄(이름·순서·id·aria-selected·aria-controls)과 tabpanel 의 aria-labelledby,
 * 탭을 눌렀을 때의 목적지, '보고 등록'·검색 라벨·도구 막대 문구, '메모보고 관리' 링크(목적지 진입 권한 MEMO_RPT_READ 있음·없음).
 * 이 시험은 업무 보고 기능의 디렉터리에 있고 다른 기능의 화면을 import 하지 않는다(정밀 점검의 소스 생존 검사). 다른 기능의 탭과
 * 링크는 그 화면이 투영으로 빠진 생성물에서 기대값에서 뺀다.
 */

const SCHEDULE = '/smart-toolkit/schedule';
const MEMO_REPORTS = '/admin/operation/memo-reports';
const BASE_PERMISSIONS = ['WORK_RPT_READ', 'WORK_RPT_CREATE', 'WORK_RPT_UPDATE', 'WORK_RPT_DELETE'];

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  permissions: [] as string[],
  getReports: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn() }),
  usePathname: () => '/smart-toolkit/work-report',
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('next/server', () => ({ connection: async () => {} }));
vi.mock('@/lib/date/today-ymd', () => ({ getTodayYmd: () => '20260906' }));
vi.mock('@/contexts/AuthContext', () => {
  const auth = () => ({ user: { id: 'writer', role: 'ROLE_USER', permissions: mocks.permissions, authorizationVersion: 'v1' } });
  return { useAuth: auth, useOptionalAuth: auth };
});
vi.mock('@/services/business/user/MenuService', () => ({ menuService: { getHeadMenus: async () => [] } }));
vi.mock('@/services/business/user/ReportService', () => ({
  reportService: { getReports: mocks.getReports, createReport: vi.fn(), updateReport: vi.fn(), deleteReport: vi.fn() },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: vi.fn(), success: vi.fn(), error: vi.fn(), removeToast: () => {} }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));

import WorkReportPage, { metadata } from '../page';

async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{await WorkReportPage()}</QueryClientProvider>);
}

/** 보이는 탭(이름·선택). 원본은 셋이고, 생성물에서는 남은 기능의 탭만 있다. */
function expectedTabs() {
  return [
    ['업무 관리', 'false'],
    ['업무 보고', 'true'],
    ...(pageInProjection(SCHEDULE) ? [['일정', 'false']] : []),
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
  mocks.permissions = [...BASE_PERMISSIONS, 'MEMO_RPT_READ'];
  mocks.getReports.mockResolvedValue({
    list: [{ rptpSn: 31, rptTtl: '주간 업무 정리', rptYmd: '20260905', userId: 'writer', userNm: '홍길동' }],
    total: 1,
    totalPage: 1,
  });
});

describe('업무 보고 화면 동등성', () => {
  it('문서 제목과 h1·현재 위치·도구 막대 문구를 고정한다', async () => {
    expect(metadata.title).toBe('업무 보고 | 전자정부 표준프레임워크');
    await renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: '업무 보고' })).toBeInTheDocument();
    expect(crumbs()).toEqual(['홈', '나의 업무', '업무 보고']);
    expect(screen.getByText('내가 작성한 보고(관리자는 전체)')).toBeInTheDocument();
    expect(await screen.findByText('주간 업무 정리')).toBeInTheDocument();
  });

  it('탭 줄: 이름·순서·선택, 탭 id 와 aria-controls, tabpanel 의 aria-labelledby', async () => {
    await renderScreen();
    expect(tabs().map(tab => [tab.textContent, tab.getAttribute('aria-selected')])).toEqual(expectedTabs());
    const ids = tabs().map(tab => tab.id);
    expect(ids[0]).toBe('work-hub-tab-job');
    expect(ids[1]).toBe('work-hub-tab-report');
    if (pageInProjection(SCHEDULE)) expect(ids[2]).toBe('work-hub-tab-calendar');
    for (const tab of tabs()) expect(tab).toHaveAttribute('aria-controls', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('id', 'work-hub-tabpanel');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'work-hub-tab-report');
  });

  it('탭을 누르면 그 탭의 화면 경로로 간다', async () => {
    await renderScreen();
    fireEvent.click(screen.getByRole('tab', { name: '업무 관리' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/smart-toolkit/dept-job', { scroll: false });
    if (pageInProjection(SCHEDULE)) {
      fireEvent.click(screen.getByRole('tab', { name: '일정' }));
      expect(mocks.push).toHaveBeenLastCalledWith(SCHEDULE, { scroll: false });
    }
  });

  it('머리 동작과 검색: 보고 등록·보고 제목 검색, 업무함 관리·일정 등록은 없다', async () => {
    await renderScreen();
    expect(screen.getByRole('button', { name: '보고 등록' })).toBeInTheDocument();
    expect(within(screen.getByTestId('work-list-filter')).getByLabelText('보고 제목')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '업무함 관리' })).toBeNull();
    expect(screen.queryByRole('button', { name: '일정 등록' })).toBeNull();
  });

  if (pageInProjection(MEMO_REPORTS)) it('메모 보고 화면에 들어갈 수 있으면 링크와 안내 문장을 보인다', async () => {
    await renderScreen();
    expect(screen.getByRole('link', { name: '메모보고 관리' })).toHaveAttribute('href', MEMO_REPORTS);
    expect(screen.getByText('받는 사람 없이 남기는 개인 업무 기록입니다. 누군가에게 보고하려면 메모 보고를 쓰세요. 관리자 권한이면 전체 보고가 조회됩니다.'))
      .toBeInTheDocument();
  });

  /*
   * [W1 — 의도한 변화] 메모 보고를 안내하는 문장은 링크와 함께 숨는다. 종전에는 링크만 숨고 문장은 남아, 들어갈 수 없는 화면을
   * 안내했다. 메모 보고 화면의 진입 권한(MEMO_RPT_READ)은 기본 그룹 셋이 모두 가져 기본 그룹의 화면은 같다(사용자 확인 B2).
   */
  it('메모 보고 화면에 들어갈 수 없으면 링크와 안내 문장을 보이지 않는다', async () => {
    mocks.permissions = BASE_PERMISSIONS;
    await renderScreen();
    expect(screen.queryByRole('link', { name: '메모보고 관리' })).toBeNull();
    expect(screen.getByText('받는 사람 없이 남기는 개인 업무 기록입니다. 관리자 권한이면 전체 보고가 조회됩니다.')).toBeInTheDocument();
  });

  // 메모 보고가 없는 구성에서도 같다 — 링크 기여가 기능과 함께 지워진다.
  if (!pageInProjection(MEMO_REPORTS)) it('메모 보고가 없는 구성에서는 링크와 안내 문장이 없다', async () => {
    await renderScreen();
    expect(screen.queryByRole('link', { name: '메모보고 관리' })).toBeNull();
    expect(screen.getByText('받는 사람 없이 남기는 개인 업무 기록입니다. 관리자 권한이면 전체 보고가 조회됩니다.')).toBeInTheDocument();
  });
});
