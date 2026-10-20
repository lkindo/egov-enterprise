import type React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 통계 허브 공통 탭(통계 개요·사용자·시스템 활성)의 화면 계약.
 *
 * [2026-10-20] 하위 화면을 A7 셸(ReportPage)로 옮기고 시계열을 서버의 `{date, value}` 오름차순 한 모양(빈 날 0)으로 받는다. 요약은
 * 그 탭이 그리는 계열의 것(기간 합계·일 평균·가장 많은 날)이고, 차트·표·반출이 같은 조회 조건(기간·요청 구분)을 따른다. 통계 개요도
 * 같은 셸이 같은 내비게이션 아래에 그려, 개요에서 하위 화면으로·하위 화면에서 개요로 오간다. 종전의 Phase 0c 동치 기준선(모든 탭 요약
 * 카드·옆 카드·셸 정렬)은 이 변경이 의도해 바꾼다.
 *
 * 이 파일은 셸과 함께 모든 구성에 남는 **셸 전용** 시험이다 — 기능 레지스트리를 빈 배열로 대역한다(기능 탭은 기능 소유 시험이 본다).
 * 라우트 page 모듈만 렌더하고, 요청은 서비스가 아니라 URL(client.getRaw) 수준에서 관측한다.
 */
const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<unknown>>(),
  requestRaw: vi.fn(),
}));
const nav = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  pathname: '/admin/stats/user',
  params: new URLSearchParams(),
}));
const exported = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }));

vi.mock('@/lib/api/client', () => ({ default: api }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace, refresh: nav.refresh }),
  usePathname: () => nav.pathname,
  useSearchParams: () => nav.params,
}));
vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: (props: Record<string, unknown>) => {
    exported.props = props;
    return <button type="button">엑셀 다운로드</button>;
  },
}));
vi.mock('@/app/components/ui/observability-charts', () => ({
  SafeResponsiveContainer: () => <div data-testid="chart" />,
}));
// 셸 전용 — 기능이 넘기는 탭·요약 칸이 하나도 없는 구성(core)과 같다.
vi.mock('@/extensions/generated-stats-panels', () => ({ statsPanels: [] }));

import UserStatsPage from '../user/page';
import ScreenStatsPage from '../screen/page';
import IntelligenceHubClient from '../IntelligenceHubClient';
import AdminStatsClient from '../AdminStatsClient';

const BASE = 'admin/system/statistics';
const URL = { user: `${BASE}/user`, connect: `${BASE}/connect` } as const;

const NAV_LABELS = ['통계 개요', '사용자 통계', '시스템 활성'];
const PERIOD_EMPTY = '선택한 기간에 집계된 통계가 없습니다.';
const DEFAULT_PERIOD = '집계 구간: 최근 1개월(기간을 고르지 않으면 서버 기본값)';
const EMPTY_USER = { inqCnt: [], crtCnt: [], mdfcnCnt: [], delCnt: [] };

/** URL 별 응답 본문. 값이 없으면 그 경로의 빈 응답이다. */
const responses = new Map<string, unknown>();
/** URL 별 남은 실패 횟수. */
const failures = new Map<string, number>();

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
const points = (...pairs: [string, number][]) => pairs.map(([date, value]) => ({ date, value }));

/** 통계 경로로 나간 요청(경로 표시가 부르는 메뉴 조회는 뺀다). */
function requestedUrls(): string[] {
  return api.getRaw.mock.calls.map((call) => call[0]).filter((url) => url.startsWith(`${BASE}/`)).sort();
}

/** 통계 경로로 나간 요청의 설정. */
function statsCalls() {
  return api.getRaw.mock.calls.filter(([url]) => url.startsWith(`${BASE}/`));
}

function renderRoute(Page: () => React.JSX.Element, pathname: string, query = '') {
  nav.pathname = pathname;
  nav.params = new URLSearchParams(query);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
}

function renderOverview() {
  nav.pathname = '/admin/stats';
  nav.params = new URLSearchParams();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IntelligenceHubClient
        defaultTab="DASHBOARD"
        overview={<AdminStatsClient initialSummary={{ totalUsers: 3, todayConnects: 1, totalPosts: 0 }} initialConnectData={points(['2026-10-01', 2])} />}
      />
    </QueryClientProvider>,
  );
}

/** 전역 lucide 모킹이 아이콘 이름을 글자로 그리므로 아이콘을 뺀 글자만 읽는다. */
function visibleLabel(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-testid^="icon-"]').forEach((icon) => icon.remove());
  return clone.textContent?.trim() ?? '';
}

function navButtons(): HTMLElement[] {
  return within(screen.getByRole('navigation', { name: '통계 분석 뷰' })).getAllByRole('button');
}

function navButton(label: string): HTMLElement {
  const match = navButtons().find((button) => visibleLabel(button) === label);
  if (!match) throw new Error(`내비게이션 항목이 없습니다: ${label}`);
  return match;
}

/** 요약 칸(제목 문단 + 값 문단) 안의 값. */
function summaryValue(title: string): string {
  const summary = screen.getByTestId('report-summary');
  return (within(summary).getByText(title).nextElementSibling as HTMLElement).textContent ?? '';
}

/** 원본 표의 [일자, 건수] 행. */
function tableRows(): string[][] {
  const table = within(screen.getByTestId('report-source-table')).getByRole('table');
  return within(table).getAllByRole('row').slice(1)
    .map((row) => within(row).queryAllByRole('cell').map((cell) => cell.textContent?.trim() ?? ''))
    .filter((cells) => cells.length === 2);
}

describe('통계 허브 공통 탭', () => {
  beforeEach(() => {
    responses.clear();
    failures.clear();
    exported.props = undefined;
    nav.push.mockReset();
    nav.replace.mockReset();
    api.getRaw.mockReset().mockImplementation(async (url: string) => {
      const remaining = failures.get(url) ?? 0;
      if (remaining > 0) {
        failures.set(url, remaining - 1);
        throw new Error(`요청 실패: ${url}`);
      }
      if (responses.has(url)) return envelope(responses.get(url));
      return envelope(url === URL.user ? EMPTY_USER : []);
    });
  });

  describe('A7 셸과 내비게이션', () => {
    it.each([
      ['사용자', UserStatsPage, '/admin/stats/user', '사용자 통계 분석', '사용자 통계'],
      ['시스템 활성', ScreenStatsPage, '/admin/stats/screen', '시스템 활성 지표', '시스템 활성'],
    ])('%s 화면은 A7 셸의 h1·내비게이션·조회 조건·요약·집계 기준·원본 표를 그린다', async (_name, Page, pathname, title, activeLabel) => {
      renderRoute(Page, pathname);

      expect(screen.getByTestId('report-page')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
      expect(navButtons().map(visibleLabel)).toEqual(NAV_LABELS);
      expect(navButtons().filter((button) => button.getAttribute('aria-current') === 'page').map(visibleLabel)).toEqual([activeLabel]);
      // 내비게이션은 머리글 아래·조회 조건 위다.
      const navigation = screen.getByTestId('report-navigation');
      const filter = screen.getByRole('heading', { name: '조회 조건' });
      expect(navigation.compareDocumentPosition(filter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByTestId('report-basis')).toHaveTextContent(DEFAULT_PERIOD);
      expect(await screen.findByText(PERIOD_EMPTY)).toBeInTheDocument();
    });

    it('?tab= 은 본문 탭만 고른다 — 라우트가 있는 탭 값은 무시하고 그 라우트의 탭을 연다', async () => {
      renderRoute(UserStatsPage, '/admin/stats/user', 'tab=DASHBOARD');

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('사용자 통계 분석');
      await waitFor(() => expect(requestedUrls()).toEqual([URL.user]));
    });

    it.each([
      ['통계 개요', '/admin/stats'],
      ['시스템 활성', '/admin/stats/screen'],
    ])('사용자 화면에서 %s 은 %s 로 이동한다', async (label, route) => {
      renderRoute(UserStatsPage, '/admin/stats/user');
      await screen.findByText(PERIOD_EMPTY);

      fireEvent.click(navButton(label));

      expect(nav.push).toHaveBeenCalledWith(route, { scroll: false });
      expect(nav.replace).not.toHaveBeenCalled();
    });

    /*
     * 종전에는 '통계 개요' 탭이 내비게이션 없는 요약 화면으로 떨어져 되돌아갈 길이 끊겼다. 이제 개요도 같은 셸이 같은 내비게이션 아래에
     * 그린다 — 개요에서 하위 화면으로 바로 간다.
     */
    it('통계 개요는 같은 내비게이션 아래에 요약을 그리고 하위 화면으로 이동한다', async () => {
      renderOverview();

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('관리자 통계');
      expect(navButtons().map(visibleLabel)).toEqual(NAV_LABELS);
      expect(navButton('통계 개요')).toHaveAttribute('aria-current', 'page');
      // 개요는 서버가 미리 읽은 값을 그린다 — 브라우저에서 통계를 다시 조회하지 않는다.
      expect(requestedUrls()).toEqual([]);

      fireEvent.click(navButton('사용자 통계'));
      expect(nav.push).toHaveBeenCalledWith('/admin/stats/user', { scroll: false });
      fireEvent.click(navButton('통계 개요'));
      expect(nav.push).toHaveBeenCalledTimes(1);
    });
  });

  describe('조회', () => {
    it.each([
      ['사용자', UserStatsPage, '/admin/stats/user', [URL.user]],
      ['시스템 활성', ScreenStatsPage, '/admin/stats/screen', [URL.connect]],
    ])('%s 화면은 그 탭의 계열만 기간 없이 부른다(서버 기본값)', async (_name, Page, pathname, expected) => {
      renderRoute(Page, pathname);

      await screen.findByText(PERIOD_EMPTY);
      expect(requestedUrls()).toEqual(expected);
      statsCalls().forEach(([, config]) => {
        expect(config?.params?.fromDate).toBeUndefined();
        expect(config?.params?.toDate).toBeUndefined();
      });
    });
  });

  describe('요약·차트·원본 표가 같은 계열을 따른다', () => {
    it('성공 로그인 — 서버 순서 그대로 표에 싣고 0 인 날도 0 으로 보이며, 요약은 표와 같은 값에서 센다', async () => {
      responses.set(URL.connect, points(['2026-10-01', 12], ['2026-10-02', 0], ['2026-10-03', 3]));
      renderRoute(ScreenStatsPage, '/admin/stats/screen');

      await waitFor(() => expect(tableRows()).toEqual([['2026-10-01', '12'], ['2026-10-02', '0'], ['2026-10-03', '3']]));
      expect(summaryValue('기간 합계')).toBe('15');
      expect(summaryValue('일 평균')).toBe('5');
      expect(summaryValue('가장 많은 날')).toBe('2026-10-01 (12건)');
      expect(screen.getByRole('heading', { name: '일자별 성공 로그인 건수 추이' })).toBeInTheDocument();
      expect(screen.getByTestId('report-basis')).toHaveTextContent('일자별 성공 로그인 수');
    });

    it('기록이 하나도 없는 기간은 날마다 0 이고 가장 많은 날은 없음이다 — 미수집이 아니다', async () => {
      responses.set(URL.connect, points(['2026-10-01', 0], ['2026-10-02', 0]));
      renderRoute(ScreenStatsPage, '/admin/stats/screen');

      await waitFor(() => expect(tableRows()).toEqual([['2026-10-01', '0'], ['2026-10-02', '0']]));
      expect(summaryValue('기간 합계')).toBe('0');
      expect(summaryValue('가장 많은 날')).toBe('없음');
      expect(screen.queryByText('미수집')).not.toBeInTheDocument();
    });

    /*
     * 종전에는 질의가 조회 수까지 가져오고도 등록 수 하나만 실었다. 이제 서버가 네 계열을 내고 화면이 고른다 — 기본은 조회 요청이고,
     * 계열을 바꿔도 다시 조회하지 않는다(같은 응답의 다른 계열이다).
     */
    it('사용자 활동은 요청 구분(조회·등록·수정·삭제)을 골라 그 계열을 요약·표·반출에 싣는다', async () => {
      responses.set(URL.user, {
        inqCnt: points(['2026-10-01', 120], ['2026-10-02', 40]),
        crtCnt: points(['2026-10-01', 3], ['2026-10-02', 0]),
        mdfcnCnt: points(['2026-10-01', 2], ['2026-10-02', 5]),
        delCnt: points(['2026-10-01', 1], ['2026-10-02', 0]),
      });
      renderRoute(UserStatsPage, '/admin/stats/user');

      const picker = screen.getByRole('group', { name: '요청 구분' });
      expect(within(picker).getAllByRole('button').map((button) => button.textContent)).toEqual(['조회 요청', '등록 요청', '수정 요청', '삭제 요청']);
      expect(within(picker).getByRole('button', { name: '조회 요청' })).toHaveAttribute('aria-pressed', 'true');
      await waitFor(() => expect(tableRows()).toEqual([['2026-10-01', '120'], ['2026-10-02', '40']]));
      expect(summaryValue('기간 합계')).toBe('160');
      expect(screen.getByTestId('report-basis')).toHaveTextContent('조회 요청 수(HTTP GET·HEAD)');

      fireEvent.click(within(picker).getByRole('button', { name: '수정 요청' }));

      expect(within(picker).getByRole('button', { name: '수정 요청' })).toHaveAttribute('aria-pressed', 'true');
      expect(tableRows()).toEqual([['2026-10-01', '2'], ['2026-10-02', '5']]);
      expect(summaryValue('기간 합계')).toBe('7');
      expect(summaryValue('가장 많은 날')).toBe('2026-10-02 (5건)');
      expect(screen.getByRole('columnheader', { name: '수정 요청 건수' })).toBeInTheDocument();
      expect(screen.getByTestId('report-basis')).toHaveTextContent('수정 요청 수(HTTP PUT·PATCH)');
      expect(exported.props).toMatchObject({
        scope: 'loaded',
        filename: 'stats_user_stats',
        headers: [{ label: '집계 일자', key: 'date' }, { label: '수정 요청 건수', key: 'value' }],
        data: [{ date: '2026-10-01', value: 2 }, { date: '2026-10-02', value: 5 }],
      });
      expect(requestedUrls()).toEqual([URL.user]);
    });

    it('시스템 활성 화면은 성공 로그인을 stats_system_stats 파일로 내보낸다', async () => {
      responses.set(URL.connect, points(['2026-10-01', 11], ['2026-10-02', 0]));
      renderRoute(ScreenStatsPage, '/admin/stats/screen');

      await waitFor(() => expect((exported.props?.data as unknown[] | undefined)?.length).toBe(2));
      expect(exported.props).toMatchObject({
        scope: 'loaded',
        filename: 'stats_system_stats',
        headers: [{ label: '집계 일자', key: 'date' }, { label: '성공 로그인 건수', key: 'value' }],
        data: [{ date: '2026-10-01', value: 11 }, { date: '2026-10-02', value: 0 }],
      });
    });
  });

  describe('조회 실패', () => {
    it('계열 조회가 실패하면 요약이 0 이 아니라 조회 실패이고, 표의 다시 시도는 그 계열만 다시 부른다', async () => {
      failures.set(URL.connect, 1);
      responses.set(URL.connect, points(['2026-10-01', 8]));
      renderRoute(ScreenStatsPage, '/admin/stats/screen');

      const alert = await screen.findByRole('alert');
      expect(summaryValue('기간 합계')).toBe('조회 실패');
      expect(screen.queryByRole('heading', { name: '일자별 성공 로그인 건수 추이' })).not.toBeInTheDocument();

      api.getRaw.mockClear();
      fireEvent.click(within(alert).getByRole('button', { name: '데이터 다시 불러오기' }));

      await waitFor(() => expect(tableRows()).toEqual([['2026-10-01', '8']]));
      expect(requestedUrls()).toEqual([URL.connect]);
      expect(summaryValue('기간 합계')).toBe('8');
    });
  });

  describe('집계 기간', () => {
    it('프리셋을 고르면 날짜를 실어 다시 부르고 적용 구간을 집계 기준에 말한다 — 전체 프리셋은 없다', async () => {
      renderRoute(UserStatsPage, '/admin/stats/user');
      await screen.findByText(PERIOD_EMPTY);
      expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();

      api.getRaw.mockClear();
      fireEvent.click(screen.getByRole('button', { name: '최근 1주' }));

      await waitFor(() => expect(requestedUrls()).toEqual([URL.user]));
      const { fromDate, toDate } = statsCalls()[0][1]?.params as { fromDate: string; toDate: string };
      expect(fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(screen.getByTestId('report-basis')).toHaveTextContent(`집계 구간: ${fromDate} ~ ${toDate}`);
      expect(screen.getByTestId('report-basis')).not.toHaveTextContent(DEFAULT_PERIOD);
    });

    it('한쪽만 고른 기간은 보내지 않고 서버 기본값을 집계한다', async () => {
      renderRoute(ScreenStatsPage, '/admin/stats/screen');
      await screen.findByText(PERIOD_EMPTY);

      fireEvent.change(screen.getByLabelText('집계 기간 시작일'), { target: { value: '2026-09-01' } });

      expect(await screen.findByText('시작일과 종료일을 모두 입력해야 기간이 적용됩니다.')).toBeInTheDocument();
      statsCalls().forEach(([, config]) => expect(config?.params?.fromDate).toBeUndefined());
    });

    it('366일을 넘는 기간은 보내지 않고 그 이유를 말한다 — 366일은 보낸다', async () => {
      renderRoute(ScreenStatsPage, '/admin/stats/screen');
      await screen.findByText(PERIOD_EMPTY);

      fireEvent.change(screen.getByLabelText('집계 기간 시작일'), { target: { value: '2025-01-01' } });
      fireEvent.change(screen.getByLabelText('집계 기간 종료일'), { target: { value: '2026-01-02' } });

      expect(await screen.findByText(/조회 기간은 최대 366일입니다/)).toBeInTheDocument();
      statsCalls().forEach(([, config]) => expect(config?.params?.toDate).toBeUndefined());
      expect(screen.getByTestId('report-basis')).toHaveTextContent(DEFAULT_PERIOD);

      fireEvent.change(screen.getByLabelText('집계 기간 종료일'), { target: { value: '2026-01-01' } });

      await waitFor(() => expect(statsCalls().some(([, config]) => config?.params?.toDate === '2026-01-01')).toBe(true));
      expect(screen.queryByText(/조회 기간은 최대 366일입니다/)).not.toBeInTheDocument();
    });
  });

  describe('통계 새로고침', () => {
    it('새로고침은 꺼진 탭의 조회까지 다시 부른다(DEC-OPS-276 ②)', async () => {
      renderRoute(UserStatsPage, '/admin/stats/user');
      await screen.findByText(PERIOD_EMPTY);
      expect(requestedUrls()).toEqual([URL.user]);

      api.getRaw.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /통계 새로고침$/ }));

      await waitFor(() => expect(requestedUrls()).toEqual([URL.connect, URL.user].sort()));
    });
  });
});
