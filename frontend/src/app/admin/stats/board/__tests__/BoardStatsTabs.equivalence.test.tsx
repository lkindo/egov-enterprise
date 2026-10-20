import type React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AxiosRequestConfig } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inProjection } from '@/test-utils/projection';

// '설문조사 분석' 탭은 설문의 stats-panels 기여다 — 그 기여가 투영으로 빠진 생성물에서는 그 탭을 쓰는 시험을 등록하지 않는다(원본에서는 그대로다).
const SURVEY_CONTRIBUTION = 'frontend/src/extensions/survey/stats-panels.ts';

/**
 * 통계 허브의 게시물·자료 이용 탭(게시판의 stats-panels 기여) 화면 계약.
 *
 * [Phase 0c] 이 두 탭을 게시판 패널로 가른 리팩터링의 동치 기준선이었다. [2026-10-20] 하위 화면을 A7 셸로 옮기며 의도해 바꾼 것 —
 * 요약은 그 탭의 계열(기간 합계·일 평균·가장 많은 날)이고, 미수집 축(자료 이용)은 요약 값이 '미수집' 이다. 모든 탭에 걸치던 '자료 이용
 * 건수' 칸·옆 카드는 걷었다. 서버가 `{date, value}` 오름차순으로 내므로 셸은 받은 순서 그대로 그린다. 라우트 page 모듈만 렌더하고
 * 요청은 URL(client.getRaw) 수준에서 관측한다.
 *
 * [허브 분해 H4] 통계 셸은 로그인 주체로 기여의 노출 술어(그 화면에 들어갈 수 있는가)를 판정하므로 통계 조회 권한을 가진 주체를
 * 대역한다 — 대역이 없으면 탭이 조용히 숨어 '없음' 단언이 거짓 green 이 된다. 그래서 탭의 존재를 양성으로 단언한다.
 */
// 설문 탭(설문 기여)은 설문 목록 조회 권한으로 보인다(허브 분해 H5) — 전체 구성 순서를 보려고 함께 준다.
const FULL_USER = { permissions: ['STATS_ADMIN_READ', 'SURVEY_READ_ALL'], authorizationVersion: 'test' };
const auth = vi.hoisted(() => ({ user: null as unknown, loading: false }));
vi.mock('@/contexts/AuthContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/AuthContext')>()),
  useOptionalAuth: () => ({ user: auth.user, loading: auth.loading }),
}));
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
  useRouter: () => ({ push: nav.push, replace: nav.replace, refresh: vi.fn() }),
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
  surveys: 'admin/system/surveys',
} as const;

const PERIOD_EMPTY = '선택한 기간에 집계된 통계가 없습니다.';
const UNINSTRUMENTED_EMPTY = '이 지표는 아직 수집되지 않습니다. 기간을 바꿔도 결과는 달라지지 않습니다.';

const responses = new Map<string, unknown>();
const failures = new Map<string, number>();

const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
const points = (...pairs: [string, number][]) => pairs.map(([date, value]) => ({ date, value }));

/** 통계·설문 경로로 나간 요청(경로 표시가 부르는 메뉴 조회는 뺀다). */
function requestedUrls(): string[] {
  return api.getRaw.mock.calls.map((call) => call[0]).filter((url) => url.startsWith('admin/system/')).sort();
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

function navLabels(): string[] {
  return within(screen.getByRole('navigation', { name: '통계 분석 뷰' })).getAllByRole('button').map(visibleLabel);
}

function navButton(label: string): HTMLElement {
  const buttons = within(screen.getByRole('navigation', { name: '통계 분석 뷰' })).getAllByRole('button');
  const match = buttons.find((button) => visibleLabel(button) === label);
  if (!match) throw new Error(`내비게이션 항목이 없습니다: ${label}`);
  return match;
}

/** 요약 칸(제목 문단 + 값 문단) 안의 값. */
function summaryValue(title: string): string {
  const summary = screen.getByTestId('report-summary');
  return (within(summary).getByText(title).nextElementSibling as HTMLElement).textContent ?? '';
}

describe('통계 허브 게시물·자료 이용 탭', () => {
  beforeEach(() => {
    auth.user = FULL_USER;
    auth.loading = false;
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
      if (url === URL.surveys) return envelope({ list: [], total: 0, page: 1, size: 10, totalPage: 0 });
      if (url === URL.user) return envelope({ inqCnt: [], crtCnt: [], mdfcnCnt: [], delCnt: [] });
      return envelope([]);
    });
  });

  describe('제목과 조회 범위', () => {
    it.each([
      ['게시물', BoardStatsPage, '/admin/stats/board', '콘텐츠 지표 분석', '콘텐츠 지표',
        [URL.bbs], 'stats_content_stats', PERIOD_EMPTY, '일자별 등록 게시글 수'],
      ['자료 이용', DataUsageStatsPage, '/admin/stats/data-usage', '자료이용현황 분석', '자료이용현황',
        [URL.dataUsage], 'stats_data_usage', UNINSTRUMENTED_EMPTY, '수집되지 않는다'],
    ])('%s 화면은 A7 셸의 h1·현재 항목·그 탭의 조회·내보내기 파일명·빈 결과 문구·집계 기준을 지킨다',
      async (_name, Page, pathname, title, activeLabel, expectedUrls, filename, emptyMessage, basis) => {
        renderRoute(Page, pathname);

        expect(screen.getByTestId('report-page')).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(title);
        expect(navButton(activeLabel)).toHaveAttribute('aria-current', 'page');
        expect(await screen.findByText(emptyMessage)).toBeInTheDocument();
        expect(requestedUrls()).toEqual(expectedUrls);
        expect(exported.props).toMatchObject({ scope: 'loaded', filename });
        expect(screen.getByTestId('report-basis')).toHaveTextContent(basis);
      });
  });

  // 권한 상태를 아직 모르면 기능 탭이 아직 보이지 않는다 — 그 라우트를 다른 탭으로 떨어뜨려 다른 제목·차트를 보이지 않는다(허브 분해 검토).
  it.each([
    ['게시물', BoardStatsPage, '/admin/stats/board'],
    ['자료 이용', DataUsageStatsPage, '/admin/stats/data-usage'],
  ])('%s 화면은 권한 상태를 확인하는 동안 다른 탭이 아니라 진입 골격을 그린다', (_name, Page, pathname) => {
    auth.user = null;
    auth.loading = true;
    renderRoute(Page, pathname);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('관리자 통계를 불러오는 중');
    expect(screen.queryByText('통계 개요')).toBeNull();
    expect(screen.queryByRole('navigation', { name: '통계 분석 뷰' })).toBeNull();
  });

  describe('요약·원본 표', () => {
    it('게시물 탭은 서버의 일자별 게시글 수를 그대로 표·반출에 싣고 요약은 그 값에서 센다', async () => {
      responses.set(URL.bbs, points(['2026-10-01', 1], ['2026-10-02', 0], ['2026-10-03', 3]));
      renderRoute(BoardStatsPage, '/admin/stats/board');

      await waitFor(() => expect(exported.props?.data).toEqual(points(['2026-10-01', 1], ['2026-10-02', 0], ['2026-10-03', 3])));
      expect(summaryValue('기간 합계')).toBe('4');
      expect(summaryValue('가장 많은 날')).toBe('2026-10-03 (3건)');
      expect(screen.getByRole('columnheader', { name: '콘텐츠 지표 건수' })).toBeInTheDocument();
      expect(screen.queryByText(PERIOD_EMPTY)).not.toBeInTheDocument();
      expect(screen.queryByText('미수집')).not.toBeInTheDocument();
    });

    /*
     * 자료 이용 기록에는 쓰는 쪽이 없다 — 요약은 0 이 아니라 '미수집' 이다(DEC-OPS-100). 기록이 들어오면(시험의 99) 표·반출은 그 값을
     * 그대로 보이지만, 요약은 측정하는 축이 아니라는 기여의 고지를 따른다.
     */
    it('자료 이용 탭의 요약은 값과 무관하게 미수집이고, 표·반출은 받은 기록을 그대로 쓴다', async () => {
      responses.set(URL.dataUsage, points(['2026-10-01', 99]));
      renderRoute(DataUsageStatsPage, '/admin/stats/data-usage');

      await waitFor(() => expect(exported.props?.data).toEqual(points(['2026-10-01', 99])));
      for (const title of ['기간 합계', '일 평균', '가장 많은 날']) expect(summaryValue(title)).toBe('미수집');
      expect(within(screen.getByTestId('report-summary')).queryByText('99')).not.toBeInTheDocument();
      expect(screen.queryByText(UNINSTRUMENTED_EMPTY)).not.toBeInTheDocument();
    });

    it('자료 이용 탭은 기록이 없어도 요약에 0 을 찍지 않는다', async () => {
      renderRoute(DataUsageStatsPage, '/admin/stats/data-usage');

      expect(await screen.findByText(UNINSTRUMENTED_EMPTY)).toBeInTheDocument();
      expect(summaryValue('기간 합계')).toBe('미수집');
      expect(within(screen.getByTestId('report-summary')).queryByText('0')).not.toBeInTheDocument();
    });
  });

  describe('조회 실패', () => {
    it('게시물 조회가 실패하면 표가 오류이고 요약은 조회 실패다', async () => {
      failures.set(URL.bbs, Number.POSITIVE_INFINITY);
      renderRoute(BoardStatsPage, '/admin/stats/board');

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(summaryValue('기간 합계')).toBe('조회 실패');
    });

    it('자료 이용 조회가 실패해도 요약은 미수집이다 — 측정하지 않는 축이다', async () => {
      failures.set(URL.dataUsage, Number.POSITIVE_INFINITY);
      renderRoute(DataUsageStatsPage, '/admin/stats/data-usage');

      expect(await screen.findByRole('alert')).toBeInTheDocument();
      expect(summaryValue('기간 합계')).toBe('미수집');
    });
  });

  describe('기능 탭의 노출과 새로고침', () => {
    it('게시물 화면의 내비게이션에 게시판 탭 둘이 셸 탭 사이 자리에 있다', async () => {
      renderRoute(BoardStatsPage, '/admin/stats/board');
      await screen.findByText(PERIOD_EMPTY);
      expect(navLabels().filter((label) => label !== '설문조사 분석'))
        .toEqual(['통계 개요', '사용자 통계', '콘텐츠 지표', '시스템 활성', '자료이용현황']);
    });

    if (inProjection(SURVEY_CONTRIBUTION)) it('게시판·설문 기여가 모두 있으면 내비게이션은 종전 순서 그대로다', async () => {
      renderRoute(BoardStatsPage, '/admin/stats/board');
      await screen.findByText(PERIOD_EMPTY);
      expect(navLabels()).toEqual(['통계 개요', '사용자 통계', '콘텐츠 지표', '시스템 활성', '자료이용현황', '설문조사 분석']);
    });

    it('통계 조회 권한이 없는 주체에게는 게시판 탭이 보이지 않고, 그 라우트는 성공 로그인 탭으로 연다', async () => {
      const saved = auth.user;
      auth.user = { permissions: [], authorizationVersion: 'test' };
      try {
        renderRoute(BoardStatsPage, '/admin/stats/board');
        await screen.findByText(PERIOD_EMPTY);
        expect(navLabels()).not.toContain('콘텐츠 지표');
        expect(navLabels()).not.toContain('자료이용현황');
        // 탭이 없으면 기본 탭 값도 받지 않는다 — 개요 자료가 없는 하위 라우트라 성공 로그인 탭으로 연다.
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('시스템 활성 지표');
        expect(requestedUrls()).toEqual([URL.connect]);
      } finally {
        auth.user = saved;
      }
    });

    it('통계 새로고침은 꺼진 게시판 탭의 조회(자료 이용)까지 다시 부른다', async () => {
      renderRoute(BoardStatsPage, '/admin/stats/board');
      await screen.findByText(PERIOD_EMPTY);
      expect(requestedUrls()).not.toContain(URL.dataUsage);

      api.getRaw.mockClear();
      fireEvent.click(screen.getByRole('button', { name: /통계 새로고침$/ }));

      await waitFor(() => expect(requestedUrls()).toEqual(expect.arrayContaining([URL.bbs, URL.dataUsage])));
    });
  });

  describe('내비게이션 경로', () => {
    it.each([
      ['통계 개요', '/admin/stats'],
      ['사용자 통계', '/admin/stats/user'],
      ['시스템 활성', '/admin/stats/screen'],
      ['자료이용현황', '/admin/stats/data-usage'],
    ])('게시물 화면에서 %s 은 %s 로 이동한다', async (label, route) => {
      renderRoute(BoardStatsPage, '/admin/stats/board');
      await screen.findByText(PERIOD_EMPTY);

      fireEvent.click(navButton(label));

      expect(nav.push).toHaveBeenCalledTimes(1);
      expect(nav.push).toHaveBeenCalledWith(route, { scroll: false });
      expect(nav.replace).not.toHaveBeenCalled();
    });

    if (inProjection(SURVEY_CONTRIBUTION)) it('설문조사 분석은 전용 라우트 없이 현재 경로의 tab 쿼리만 바꾸고 다른 쿼리는 버린다', async () => {
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

  describe('조회 기간', () => {
    it('게시물 탭은 고른 기간을 게시물 집계에 싣는다', async () => {
      renderRoute(BoardStatsPage, '/admin/stats/board');
      await screen.findByText(PERIOD_EMPTY);

      fireEvent.change(screen.getByLabelText('집계 기간 시작일'), { target: { value: '2026-10-01' } });
      fireEvent.change(screen.getByLabelText('집계 기간 종료일'), { target: { value: '2026-10-03' } });

      await waitFor(() => expect(api.getRaw.mock.calls.some(([url, config]) => url === URL.bbs
        && config?.params?.fromDate === '2026-10-01' && config?.params?.toDate === '2026-10-03')).toBe(true));
      expect(screen.getByTestId('report-basis')).toHaveTextContent('집계 구간: 2026-10-01 ~ 2026-10-03');
    });
  });
});
