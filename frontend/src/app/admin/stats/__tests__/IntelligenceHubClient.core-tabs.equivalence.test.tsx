import type React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [Phase 0c] 통계 허브 공통 탭(사용자·시스템 활성·통계 개요)의 동치 기준선.
 * [2026-10-19] 운영 보고서 탭은 쓰는 쪽이 없는 원장만 읽어 라우트·조회 API·메뉴(V2_134)와 함께 걷었다.
 *
 * 통계 서비스·DTO 를 business-core 로 옮기고 허브를 core 셸 + 게시판·설문 패널로 가르는 리팩터링이
 * 화면 동작을 바꾸지 않았음을 증명하려고 지금 동작을 그대로 고정한다. 모듈 배치와 무관하게 남도록
 * 라우트 page 모듈만 렌더하고, 요청은 서비스가 아니라 URL(client.getRaw) 수준에서 관측한다.
 *
 * 이 파일은 셸과 함께 모든 구성에 남는 **셸 전용** 시험이다. [허브 분해 H4] 게시판·설문 탭은 stats-panels 기여가 되어, 기능 레지스트리를
 * 빈 배열로 대역해 셸이 기능을 모르고도 같은 동작을 하는지 본다(기능 탭은 기능 소유 시험이 본다 — 게시판·설문 동등성 시험). 그래서
 * 이 파일에는 pack 마커가 없고 모든 구성에서 기대값이 같다.
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
  pathname: '/admin/stats/user',
  params: new URLSearchParams(),
}));
const exported = vi.hoisted(() => ({ props: undefined as Record<string, unknown> | undefined }));

vi.mock('@/lib/api/client', () => ({ default: api }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
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

const BASE = 'admin/system/statistics';
const URL = {
  user: `${BASE}/user`,
  bbs: `${BASE}/bbs`,
  connect: `${BASE}/connect`,
  dataUsage: `${BASE}/data-usage`,
} as const;

const NAV_LABELS = ['통계 개요', '사용자 통계', '시스템 활성'];
/*
 * 통계 개요 탭이 탭 전용으로 더 부르는 조회는 없다. [허브 분해 H4] 종전에는 게시판이 있으면 게시물 집계도 불렀지만 개요는 그 값을
 * 쓰지 않았다(쓰지 않는 조회) — 걷었다. 게시물 집계는 콘텐츠 지표 탭에서만 부른다(게시판 동등성 시험).
 */
/** 통계 새로고침이 다시 부르는 조회 전부(꺼진 탭의 조회 포함). 기능 탭의 조회는 그 기능 소유 시험이 본다. */
const REFRESH_URLS: string[] = [URL.user, URL.connect];
const STATS_HEADERS = [
  { label: '집계 일자', key: 'statsDate' },
  { label: '집계 건수', key: 'statsCo' },
];
const SUMMARY_ALERT = /일부 통계를 불러오지 못했습니다/;
const PERIOD_EMPTY = '선택한 기간에 집계된 통계가 없습니다.';
const UNINSTRUMENTED_EMPTY = '이 지표는 아직 수집되지 않습니다. 기간을 바꿔도 결과는 달라지지 않습니다.';
const DEFAULT_PERIOD = '집계 구간: 최근 1개월(기간을 고르지 않으면 서버 기본값)';

/** URL 별 응답 본문. 값이 없으면 빈 배열이다. */
const responses = new Map<string, unknown>();
/** URL 별 남은 실패 횟수. */
const failures = new Map<string, number>();

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });

function requestedUrls(): string[] {
  return api.getRaw.mock.calls.map((call) => call[0]).sort();
}

function sorted(...urls: string[]): string[] {
  return [...urls].sort();
}

function renderRoute(Page: () => React.JSX.Element, pathname: string, query = '') {
  nav.pathname = pathname;
  nav.params = new URLSearchParams(query);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
}

/** 전역 lucide 모킹이 아이콘 이름을 글자로 그리므로 아이콘을 뺀 글자만 읽는다. */
function visibleLabel(element: HTMLElement): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('[data-testid^="icon-"]').forEach((icon) => icon.remove());
  return clone.textContent?.trim() ?? '';
}

/** 요약 카드(h5 라벨 + 값) 안에서 값을 찾는다. */
function summaryCard(label: string): HTMLElement {
  return screen.getByText(`_ ${label}`).parentElement as HTMLElement;
}

/** 왼쪽 '성공 로그인' 카드. */
function sidebarCard(): HTMLElement {
  return screen.getByRole('heading', { name: '성공 로그인' }).parentElement as HTMLElement;
}

describe('통계 허브 공통 탭 동치 기준선', () => {
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
      return envelope([]);
    });
  });

  describe('제목·내비게이션', () => {
    it.each([
      ['사용자', UserStatsPage, '/admin/stats/user', '', '사용자 통계 분석', '사용자 통계'],
      ['시스템 활성', ScreenStatsPage, '/admin/stats/screen', '', '시스템 활성 지표', '시스템 활성'],
      ['통계 개요(?tab=DASHBOARD)', UserStatsPage, '/admin/stats/user', 'tab=DASHBOARD', '통계 개요', '통계 개요'],
    ])('%s 화면은 h1 과 내비게이션을 순서대로 보이고 현재 항목만 aria-current 다', async (_name, Page, pathname, query, title, activeLabel) => {
      renderRoute(Page, pathname, query);

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
      const buttons = within(screen.getByRole('navigation', { name: '통계 분석 뷰' })).getAllByRole('button');
      expect(buttons.map(visibleLabel)).toEqual(NAV_LABELS);
      expect(buttons.filter((button) => button.getAttribute('aria-current') === 'page').map(visibleLabel))
        .toEqual([activeLabel]);
      await screen.findByText('_ 사용자 등록 요청 수');
    });
  });

  describe('진입 시 조회하는 URL', () => {
    it.each([
      ['사용자', UserStatsPage, '/admin/stats/user', '', sorted(URL.user, URL.connect), PERIOD_EMPTY],
      ['시스템 활성', ScreenStatsPage, '/admin/stats/screen', '', sorted(URL.user, URL.connect), PERIOD_EMPTY],
      ['통계 개요(?tab=DASHBOARD)', UserStatsPage, '/admin/stats/user', 'tab=DASHBOARD', sorted(URL.user, URL.connect), PERIOD_EMPTY],
    ])('%s 화면은 사용자·접속을 늘 부르고 탭 전용 조회만 더한다', async (_name, Page, pathname, query, expected, settled) => {
      renderRoute(Page, pathname, query);

      await waitFor(() => expect(requestedUrls()).toEqual(expected));
      await screen.findByText(settled);
      expect(requestedUrls()).toEqual(expected);
      // 기간을 고르지 않으면 날짜 파라미터를 싣지 않는다(서버 기본값).
      api.getRaw.mock.calls.forEach(([, config]) => {
        expect(config?.params?.fromDate).toBeUndefined();
        expect(config?.params?.toDate).toBeUndefined();
      });
    });
  });

  describe('요약 카드', () => {
    it('사용자·성공 로그인 카드는 집계 합계를 보이고, 기능 기여가 없으면 다른 요약 카드는 없다', async () => {
      responses.set(URL.user, [{ statsDate: '20261001', statsCo: 3 }, { statsDate: '20261002', statsCo: 4 }]);
      responses.set(URL.connect, [{ statsDate: '20261001', statsCo: 1200 }, { statsDate: '20261002', statsCo: 34 }]);
      responses.set(URL.dataUsage, [{ statsDate: '20261001', statsCo: 99 }]);
      renderRoute(UserStatsPage, '/admin/stats/user');

      await screen.findByText('_ 사용자 등록 요청 수');
      const total = (1234).toLocaleString();
      expect(within(summaryCard('사용자 등록 요청 수')).getByText('7')).toBeInTheDocument();
      expect(within(summaryCard('성공 로그인 수')).getByText(total)).toBeInTheDocument();
      // 자료 이용 카드는 게시판 기여의 요약 칸이다 — 셸 혼자서는 그리지 않는다(값 99 도 어디에도 찍히지 않는다).
      expect(screen.queryByText('_ 자료 이용 건수')).not.toBeInTheDocument();
      expect(screen.queryByText('99')).not.toBeInTheDocument();
      expect(within(sidebarCard()).getByText(total)).toBeInTheDocument();
      expect(within(sidebarCard()).getByText('최근 1개월 성공 로그인 합계')).toBeInTheDocument();
      expect(screen.queryByText(SUMMARY_ALERT)).not.toBeInTheDocument();
    });

    it('접속 조회가 실패하면 요약 오류 알림을 보이고 그 카드만 — 로 둔다', async () => {
      responses.set(URL.user, [{ statsDate: '20261001', statsCo: 5 }]);
      failures.set(URL.connect, Number.POSITIVE_INFINITY);
      renderRoute(ScreenStatsPage, '/admin/stats/screen');

      expect(await screen.findByText(SUMMARY_ALERT)).toBeInTheDocument();
      expect(within(summaryCard('사용자 등록 요청 수')).getByText('5')).toBeInTheDocument();
      expect(within(summaryCard('성공 로그인 수')).getByText('—')).toBeInTheDocument();
      expect(within(sidebarCard()).getByText('—')).toBeInTheDocument();
      expect(within(sidebarCard()).getByText('접속 통계를 불러오지 못했습니다')).toBeInTheDocument();
      // 시스템 활성 탭의 차트는 접속 집계를 그리므로 차트도 오류 상태다.
      expect(screen.getByText('통계 데이터를 불러오지 못했습니다.')).toBeInTheDocument();
    });
  });

  describe('빈 차트 문구', () => {
    it.each([
      ['사용자', UserStatsPage, '/admin/stats/user', PERIOD_EMPTY],
      ['시스템 활성', ScreenStatsPage, '/admin/stats/screen', PERIOD_EMPTY],
    ])('%s 화면의 빈 결과 문구', async (_name, Page, pathname, message) => {
      renderRoute(Page, pathname);

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(screen.queryByText(message === PERIOD_EMPTY ? UNINSTRUMENTED_EMPTY : PERIOD_EMPTY)).not.toBeInTheDocument();
    });

    it('통계 개요 탭은 접속 집계를 차트로 그리고 기간 문구를 쓴다', async () => {
      responses.set(URL.user, [{ statsDate: '20261001', statsCo: 2 }]);
      renderRoute(UserStatsPage, '/admin/stats/user', 'tab=DASHBOARD');

      expect(await screen.findByText(PERIOD_EMPTY)).toBeInTheDocument();
    });
  });

  describe('차트 오류와 다시 시도', () => {
    /*
     * [2026-10-19] 종전에는 운영 보고서 탭(차트 전용 조회)으로 보았다. 그 탭을 걷어 셸 탭의 차트는 모두 요약 카드와 같은 조회를
     * 그린다 — 시스템 활성 탭의 접속 조회로 본다. 그 조회는 요약 카드도 쓰므로 요약 오류 알림이 함께 뜨고 함께 사라진다.
     */
    it('시스템 활성 차트 조회가 실패하면 차트가 오류이고, 다시 시도는 그 URL 만 다시 부른다', async () => {
      failures.set(URL.connect, 1);
      responses.set(URL.connect, [{ statsDate: '20261001', statsCo: 8 }]);
      renderRoute(ScreenStatsPage, '/admin/stats/screen');

      const chartError = await screen.findByText('통계 데이터를 불러오지 못했습니다.');
      const alert = chartError.closest('[role="alert"]') as HTMLElement;
      expect(alert).not.toBeNull();
      expect(alert).toHaveTextContent('잠시 후 다시 시도하거나 관리자에게 문의해 주세요.');
      await screen.findByText('_ 사용자 등록 요청 수');

      api.getRaw.mockClear();
      fireEvent.click(within(alert).getByRole('button', { name: /다시 시도$/ }));

      await waitFor(() => expect(screen.queryByText('통계 데이터를 불러오지 못했습니다.')).not.toBeInTheDocument());
      expect(requestedUrls()).toEqual([URL.connect]);
      expect(screen.queryByText(SUMMARY_ALERT)).not.toBeInTheDocument();
    });
  });

  describe('집계 기간', () => {
    it('기간을 고르지 않으면 서버 기본값 구간을 말하고, 프리셋을 고르면 날짜를 실어 다시 부른다', async () => {
      renderRoute(UserStatsPage, '/admin/stats/user');
      await screen.findByText(PERIOD_EMPTY);
      expect(screen.getByText(DEFAULT_PERIOD)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '전체' })).not.toBeInTheDocument();

      api.getRaw.mockClear();
      fireEvent.click(screen.getByRole('button', { name: '최근 1주' }));

      await waitFor(() => expect(requestedUrls()).toEqual(sorted(URL.user, URL.connect)));
      const [, firstConfig] = api.getRaw.mock.calls[0];
      const { fromDate, toDate } = firstConfig?.params as { fromDate: string; toDate: string };
      expect(fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      api.getRaw.mock.calls.forEach(([, config]) => expect(config?.params).toEqual({ fromDate, toDate }));
      expect(await screen.findByText(`집계 구간: ${fromDate} ~ ${toDate}`)).toBeInTheDocument();
      expect(screen.queryByText(DEFAULT_PERIOD)).not.toBeInTheDocument();
      expect(within(sidebarCard()).getByText('선택 기간 성공 로그인 합계')).toBeInTheDocument();
    });
  });

  describe('내보내기', () => {
    it.each([
      ['사용자', UserStatsPage, '/admin/stats/user', '', 'stats_user_stats', URL.user],
      ['시스템 활성', ScreenStatsPage, '/admin/stats/screen', '', 'stats_system_stats', URL.connect],
      ['통계 개요(?tab=DASHBOARD)', UserStatsPage, '/admin/stats/user', 'tab=DASHBOARD', 'stats_dashboard', URL.connect],
    ])('%s 화면은 그 탭이 그리는 집계를 stats_<탭> 파일로 내보낸다', async (_name, Page, pathname, query, filename, source) => {
      responses.set(source, [{ statsDate: '20261001', statsCo: 11 }, { statsDate: '20261002', statsCo: 0 }]);
      renderRoute(Page, pathname, query);

      await waitFor(() => expect((exported.props?.data as unknown[] | undefined)?.length).toBe(2));
      expect(exported.props).toMatchObject({
        scope: 'loaded',
        filename,
        headers: STATS_HEADERS,
        data: [{ statsDate: '2026-10-01', statsCo: 11 }, { statsDate: '2026-10-02', statsCo: 0 }],
      });
    });
  });

  describe('통계 새로고침', () => {
    it('새로고침은 비활성 탭 조회까지 모든 URL 을 다시 부른다', async () => {
      renderRoute(UserStatsPage, '/admin/stats/user');
      await screen.findByText(PERIOD_EMPTY);
      expect(requestedUrls()).toEqual(sorted(URL.user, URL.connect));

      api.getRaw.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /통계 새로고침$/ }));

      await waitFor(() => expect(requestedUrls()).toEqual(sorted(...REFRESH_URLS)));
    });

    it('통계 개요 탭에서도 같은 URL 을 모두 다시 부른다', async () => {
      renderRoute(UserStatsPage, '/admin/stats/user', 'tab=DASHBOARD');
      await waitFor(() => expect(requestedUrls()).toEqual(sorted(URL.user, URL.connect)));
      await screen.findByText(PERIOD_EMPTY);

      api.getRaw.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /통계 새로고침$/ }));

      await waitFor(() => expect(requestedUrls()).toEqual(sorted(...REFRESH_URLS)));
    });
  });
});
