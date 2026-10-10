import type React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inProjection } from '@/test-utils/projection';

// '설문조사 분석' 탭은 설문 팩이 넘긴다 — 그 탭 파일이 투영으로 빠진 생성물에서는 이 시험을 등록하지 않는다(원본에서는 그대로다).

/**
 * [Phase 0c] 통계 허브의 게시물·자료 이용 탭 동치 기준선.
 *
 * 자료 이용 집계(DtaUseStats)를 게시판 패키지로 옮기고 이 두 탭을 게시판 패널로 가르는 리팩터링이
 * 화면 동작을 바꾸지 않았음을 증명하려고 지금 동작을 그대로 고정한다. 라우트 page 모듈만 렌더하고
 * 요청은 URL(client.getRaw) 수준에서 관측한다.
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
  pathname: '/admin/stats/board',
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

import BoardStatsPage from '../page';
import DataUsageStatsPage from '../../data-usage/page';

const BASE = 'admin/system/statistics';
const URL = {
  user: `${BASE}/user`,
  bbs: `${BASE}/bbs`,
  connect: `${BASE}/connect`,
  dataUsage: `${BASE}/data-usage`,
  report: `${BASE}/report`,
  surveys: 'admin/system/surveys',
} as const;

const SUMMARY_ALERT = /일부 통계를 불러오지 못했습니다/;
const CHART_ERROR = '통계 데이터를 불러오지 못했습니다.';
const PERIOD_EMPTY = '선택한 기간에 집계된 통계가 없습니다.';
const UNINSTRUMENTED_EMPTY = '이 지표는 아직 수집되지 않습니다. 기간을 바꿔도 결과는 달라지지 않습니다.';

const responses = new Map<string, unknown>();
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

function navButton(label: string): HTMLElement {
  const buttons = within(screen.getByRole('navigation', { name: '통계 분석 뷰' })).getAllByRole('button');
  const match = buttons.find((button) => visibleLabel(button) === label);
  if (!match) throw new Error(`내비게이션 항목이 없습니다: ${label}`);
  return match;
}

function summaryCard(label: string): HTMLElement {
  return screen.getByText(`_ ${label}`).parentElement as HTMLElement;
}

function sidebarCard(): HTMLElement {
  return screen.getByRole('heading', { name: '성공 로그인' }).parentElement as HTMLElement;
}

describe('통계 허브 게시물·자료 이용 탭 동치 기준선', () => {
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
      return envelope(url === URL.surveys ? { list: [], total: 0, page: 0, size: 10, totalPage: 0 } : []);
    });
  });

  describe('제목과 조회 범위', () => {
    it.each([
      ['게시물', BoardStatsPage, '/admin/stats/board', '콘텐츠 지표 분석', '콘텐츠 지표',
        sorted(URL.user, URL.connect, URL.bbs), 'stats_content_stats', PERIOD_EMPTY],
      ['자료 이용', DataUsageStatsPage, '/admin/stats/data-usage', '자료이용현황 분석', '자료이용현황',
        sorted(URL.user, URL.connect, URL.dataUsage), 'stats_data_usage', UNINSTRUMENTED_EMPTY],
    ])('%s 화면은 h1·현재 항목·조회 URL·내보내기 파일명·빈 결과 문구를 지킨다',
      async (_name, Page, pathname, title, activeLabel, expectedUrls, filename, emptyMessage) => {
        renderRoute(Page, pathname);

        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
        expect(navButton(activeLabel)).toHaveAttribute('aria-current', 'page');
        expect(await screen.findByText(emptyMessage)).toBeInTheDocument();
        expect(requestedUrls()).toEqual(expectedUrls);
        expect(exported.props).toMatchObject({ scope: 'loaded', filename });
      });
  });

  describe('자료 이용 건수 카드', () => {
    it.each([
      ['게시물', BoardStatsPage, '/admin/stats/board'],
      ['자료 이용', DataUsageStatsPage, '/admin/stats/data-usage'],
    ])('%s 화면에서도 자료 이용 집계 값과 무관하게 미수집으로 보인다', async (_name, Page, pathname) => {
      responses.set(URL.dataUsage, [{ statsDate: '20261001', statsCo: 99 }]);
      responses.set(URL.bbs, [{ statsDate: '20261001', statsCo: 12 }]);
      renderRoute(Page, pathname);

      await screen.findByText('_ 자료 이용 건수');
      await waitFor(() => expect((exported.props?.data as unknown[] | undefined)?.length).toBe(1));
      expect(within(summaryCard('자료 이용 건수')).getByText('미수집')).toBeInTheDocument();
      expect(within(summaryCard('자료 이용 건수')).queryByText('99')).not.toBeInTheDocument();
    });

    it('자료 이용 탭의 차트·내보내기는 자료 이용 집계를 그대로 쓴다', async () => {
      responses.set(URL.dataUsage, [{ statsDate: '20261001', statsCo: 99 }]);
      renderRoute(DataUsageStatsPage, '/admin/stats/data-usage');

      await waitFor(() => expect(exported.props?.data).toEqual([{ statsDate: '2026-10-01', statsCo: 99 }]));
      expect(screen.queryByText(UNINSTRUMENTED_EMPTY)).not.toBeInTheDocument();
    });

    it('게시물 탭의 차트·내보내기는 게시물 집계를 쓴다', async () => {
      responses.set(URL.bbs, [{ statsDate: '20261002', statsCo: 12 }]);
      renderRoute(BoardStatsPage, '/admin/stats/board');

      await waitFor(() => expect(exported.props?.data).toEqual([{ statsDate: '2026-10-02', statsCo: 12 }]));
      expect(screen.queryByText(PERIOD_EMPTY)).not.toBeInTheDocument();
    });
  });

  describe('조회 실패', () => {
    it('자료 이용 탭에서 자료 이용 조회가 실패하면 요약 오류 상태가 된다(현행)', async () => {
      responses.set(URL.user, [{ statsDate: '20261001', statsCo: 5 }]);
      responses.set(URL.connect, [{ statsDate: '20261001', statsCo: 6 }]);
      failures.set(URL.dataUsage, Number.POSITIVE_INFINITY);
      renderRoute(DataUsageStatsPage, '/admin/stats/data-usage');

      expect(await screen.findByText(SUMMARY_ALERT)).toBeInTheDocument();
      expect(screen.getByText(CHART_ERROR)).toBeInTheDocument();
      // 사용자·접속 카드는 자기 조회 결과를 그대로 보인다.
      expect(within(summaryCard('사용자 등록 요청 수')).getByText('5')).toBeInTheDocument();
      expect(within(summaryCard('성공 로그인 수')).getByText('6')).toBeInTheDocument();
      expect(within(summaryCard('자료 이용 건수')).getByText('미수집')).toBeInTheDocument();
      // 왼쪽 성공 로그인 카드는 요약 오류 전체를 따른다.
      expect(within(sidebarCard()).getByText('—')).toBeInTheDocument();
      expect(within(sidebarCard()).getByText('접속 통계를 불러오지 못했습니다')).toBeInTheDocument();
    });

    it('게시물 탭에서 게시물 조회가 실패하면 차트만 오류이고 요약은 정상이다', async () => {
      responses.set(URL.connect, [{ statsDate: '20261001', statsCo: 6 }]);
      failures.set(URL.bbs, Number.POSITIVE_INFINITY);
      renderRoute(BoardStatsPage, '/admin/stats/board');

      expect(await screen.findByText(CHART_ERROR)).toBeInTheDocument();
      expect(screen.queryByText(SUMMARY_ALERT)).not.toBeInTheDocument();
      expect(within(sidebarCard()).getByText('6')).toBeInTheDocument();
      expect(within(sidebarCard()).getByText('최근 1개월 성공 로그인 합계')).toBeInTheDocument();
    });
  });

  describe('내비게이션 경로', () => {
    it.each([
      ['통계 개요', '/admin/stats'],
      ['사용자 통계', '/admin/stats/user'],
      ['시스템 활성', '/admin/stats/screen'],
      ['자료이용현황', '/admin/stats/data-usage'],
      ['운영 보고서', '/admin/stats/report'],
    ])('게시물 화면에서 %s 은 %s 로 이동한다', async (label, route) => {
      renderRoute(BoardStatsPage, '/admin/stats/board');
      await screen.findByText(PERIOD_EMPTY);

      fireEvent.click(navButton(label));

      expect(nav.push).toHaveBeenCalledTimes(1);
      expect(nav.push).toHaveBeenCalledWith(route, { scroll: false });
      expect(nav.replace).not.toHaveBeenCalled();
    });

    if (inProjection('frontend/src/app/admin/survey/components/StatsHubSurveyTab.tsx')) it('설문조사 분석은 전용 라우트 없이 현재 경로의 tab 쿼리만 바꾸고 다른 쿼리는 버린다', async () => {
      renderRoute(BoardStatsPage, '/admin/stats/board', 'foo=bar');
      await screen.findByText(PERIOD_EMPTY);

      fireEvent.click(navButton('설문조사 분석'));

      expect(nav.replace).toHaveBeenCalledTimes(1);
      expect(nav.replace).toHaveBeenCalledWith('/admin/stats/board?tab=SURVEYS', { scroll: false });
      expect(nav.push).not.toHaveBeenCalled();
    });

    it('현재 항목을 다시 누르면 이동하지 않고, 자료 이용 화면의 콘텐츠 지표는 게시물 경로로 간다', async () => {
      renderRoute(DataUsageStatsPage, '/admin/stats/data-usage');
      await screen.findByText(UNINSTRUMENTED_EMPTY);

      fireEvent.click(navButton('자료이용현황'));
      expect(nav.push).not.toHaveBeenCalled();
      expect(nav.replace).not.toHaveBeenCalled();

      fireEvent.click(navButton('콘텐츠 지표'));
      expect(nav.push).toHaveBeenCalledWith('/admin/stats/board', { scroll: false });
    });
  });
});
