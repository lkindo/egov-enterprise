/**
 * 통계 허브 설문조사 탭(?tab=SURVEYS) — 동등성 고정(Phase 0c).
 *
 * 통계 허브는 core 셸과 게시판·설문 패널로 나뉠 예정이다. 설문 목록이 패널로 옮겨 가도 화면이 바이트 단위로
 * 같다는 것을 보이려고, 지금의 동작을 라우트 페이지와 URL 수준에서 고정한다.
 * ⚠ 패널 파일·서비스 모듈을 import 하거나 mock 하지 않는다 — 옮겨 가도 이 파일은 그대로 통과해야 한다.
 *   API 는 `@/lib/api/client` 에서, 반출은 공용 반출 컴포넌트에서만 가로챈다.
 */

import type { ComponentProps } from 'react';
import type { AxiosRequestConfig } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DataExportExcel as DataExportExcelComponent } from '@/app/components/ui/data-export-excel';

const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  getRaw: vi.fn<(url: string, config?: AxiosRequestConfig) => Promise<unknown>>(),
  requestRaw: vi.fn<(config: AxiosRequestConfig) => Promise<unknown>>(),
}));
vi.mock('@/lib/api/client', () => ({ default: client }));

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => '/admin/stats/screen',
  useSearchParams: () => nav.params,
}));

type ExportProps = ComponentProps<typeof DataExportExcelComponent>;
const exported = vi.hoisted(() => ({ last: null as unknown }));
vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: (props: unknown) => {
    exported.last = props;
    return <button type="button">내보내기</button>;
  },
}));

import ScreenStatsPage from '@/app/admin/stats/screen/page';

const SURVEYS_URL = 'admin/system/surveys';
const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });

type SurveyRow = { srvySn: number; srvyTtl: string; srvyBgngYmd: string | null; srvyEndYmd: string | null; srvyTmpltSn: number };

/** 오늘이 언제든 상태가 같도록 기간을 멀리 둔다(자정 경계와 무관). */
const SURVEYS: SurveyRow[] = [
  { srvySn: 11, srvyTtl: '사내 식당 만족도', srvyBgngYmd: '20000101', srvyEndYmd: '20991231', srvyTmpltSn: 1 },
  { srvySn: 12, srvyTtl: '', srvyBgngYmd: '19990101', srvyEndYmd: '19991231', srvyTmpltSn: 1 },
  { srvySn: 13, srvyTtl: '차년도 수요 조사', srvyBgngYmd: '20980101', srvyEndYmd: '20981231', srvyTmpltSn: 2 },
  { srvySn: 14, srvyTtl: '기간 미상 조사', srvyBgngYmd: null, srvyEndYmd: null, srvyTmpltSn: 2 },
];

let surveyResponse: () => Promise<unknown>;

function routeGet(url: string): Promise<unknown> {
  if (url === SURVEYS_URL) return surveyResponse();
  if (url.startsWith('admin/system/statistics/')) return Promise.resolve(envelope([]));
  return Promise.reject(new Error(`예상하지 못한 조회: ${url}`));
}

const surveyCalls = () => client.getRaw.mock.calls.filter(([url]) => url === SURVEYS_URL);

function renderHub(tab = 'SURVEYS') {
  nav.params = new URLSearchParams(`tab=${tab}`);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ScreenStatsPage />
    </QueryClientProvider>,
  );
}

// 전역 lucide mock 이 아이콘 이름을 글자로 그려 버튼 이름 앞에 붙는다 — 버튼은 끝맺음으로 찾는다.

/** 설문 행 — 제목(h4)에서 올라가 종료일 표기를 함께 품은 가장 가까운 요소. */
function rowOf(title: string): HTMLElement {
  let el: HTMLElement | null = screen.getByRole('heading', { level: 4, name: title });
  while (el && !el.textContent?.includes('종료일:')) el = el.parentElement;
  if (!el) throw new Error(`설문 행을 찾지 못했습니다: ${title}`);
  return el;
}

describe('통계 허브 설문조사 탭 — 동등성', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exported.last = null;
    surveyResponse = () => Promise.resolve(envelope({ list: SURVEYS, total: SURVEYS.length, page: 0, size: 10, totalPage: 1 }));
    client.getRaw.mockImplementation((url) => routeGet(url));
  });

  it('설문 목록을 조건 없이 한 번 조회하고 탭 제목과 현재 위치를 보인다', async () => {
    renderHub();

    await screen.findByRole('heading', { level: 4, name: '사내 식당 만족도' });
    expect(surveyCalls()).toEqual([[SURVEYS_URL, { params: { keyword: '' } }]]);
    expect(screen.getByRole('heading', { level: 1, name: '설문조사 결과 분석' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /설문조사 분석$/ })).toHaveAttribute('aria-current', 'page');
  });

  it('행마다 상태·종료일·제목을 서버 순서대로 보이고, 제목이 없으면 (제목 없음) 이다', async () => {
    renderHub();
    await screen.findByRole('heading', { level: 4, name: '사내 식당 만족도' });

    expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
      '사내 식당 만족도',
      '(제목 없음)',
      '차년도 수요 조사',
      '기간 미상 조사',
    ]);

    const expected: Array<[string, string, string]> = [
      ['사내 식당 만족도', '진행중', '종료일: 2099-12-31'],
      ['(제목 없음)', '종료', '종료일: 1999-12-31'],
      ['차년도 수요 조사', '예정', '종료일: 2098-12-31'],
      ['기간 미상 조사', '알 수 없음', '종료일: -'],
    ];
    for (const [title, status, endDate] of expected) {
      const row = rowOf(title);
      expect(row.textContent).toBe(`${status}${endDate}${title}`);
      expect(within(row).getByText(status)).toBeInTheDocument();
      expect(within(row).getByText(endDate)).toBeInTheDocument();
    }
  });

  it('반출은 stats_surveys 파일에 설문 4열을 화면 순서로 싣는다 — 제목은 원문 그대로다', async () => {
    renderHub();
    await screen.findByRole('heading', { level: 4, name: '사내 식당 만족도' });

    const props = exported.last as ExportProps;
    expect(props.filename).toBe('stats_surveys');
    expect(props.scope).toBe('loaded');
    expect(props.headers).toEqual([
      { label: '설문 일련번호', key: 'srvySn' },
      { label: '설문 제목', key: 'srvyTtl' },
      { label: '시작일', key: 'srvyBgngYmd' },
      { label: '종료일', key: 'srvyEndYmd' },
    ]);
    expect(props.data).toEqual([
      { srvySn: 11, srvyTtl: '사내 식당 만족도', srvyBgngYmd: '2000-01-01', srvyEndYmd: '2099-12-31' },
      { srvySn: 12, srvyTtl: '', srvyBgngYmd: '1999-01-01', srvyEndYmd: '1999-12-31' },
      { srvySn: 13, srvyTtl: '차년도 수요 조사', srvyBgngYmd: '2098-01-01', srvyEndYmd: '2098-12-31' },
      { srvySn: 14, srvyTtl: '기간 미상 조사', srvyBgngYmd: '-', srvyEndYmd: '-' },
    ]);
  });

  it('설문이 없으면 빈 상태 문구를 보이고 반출은 머리글만 남는다', async () => {
    surveyResponse = () => Promise.resolve(envelope({ list: [], total: 0, page: 0, size: 10, totalPage: 0 }));
    renderHub();

    expect(await screen.findByText('등록된 설문조사가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 4 })).not.toBeInTheDocument();
    const props = exported.last as ExportProps;
    expect(props.filename).toBe('stats_surveys');
    expect(props.data).toEqual([]);
    expect(props.headers.map((h) => h.key)).toEqual(['srvySn', 'srvyTtl', 'srvyBgngYmd', 'srvyEndYmd']);
  });

  it('조회에 실패하면 오류와 다시 시도를 보이고, 다시 시도는 설문 목록만 다시 부른다', async () => {
    surveyResponse = () => Promise.reject(new Error('network'));
    renderHub();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('설문조사 목록을 불러오지 못했습니다.');
    expect(alert).toHaveTextContent('잠시 후 다시 시도하거나 관리자에게 문의해 주세요.');
    expect(screen.queryByText('등록된 설문조사가 없습니다.')).not.toBeInTheDocument();
    expect(surveyCalls()).toHaveLength(1);
    const statsCallsBefore = client.getRaw.mock.calls.length - surveyCalls().length;

    surveyResponse = () => Promise.resolve(envelope({ list: SURVEYS.slice(0, 1), total: 1, page: 0, size: 10, totalPage: 1 }));
    fireEvent.click(within(alert).getByRole('button', { name: /다시 시도$/ }));

    await screen.findByRole('heading', { level: 4, name: '사내 식당 만족도' });
    expect(surveyCalls()).toHaveLength(2);
    expect(client.getRaw.mock.calls.length - surveyCalls().length).toBe(statsCallsBefore);
    expect(screen.queryByText('설문조사 목록을 불러오지 못했습니다.')).not.toBeInTheDocument();
  });

  it('통계 새로고침은 설문 탭에서 설문 목록도 다시 부른다', async () => {
    renderHub();
    await screen.findByRole('heading', { level: 4, name: '사내 식당 만족도' });
    expect(surveyCalls()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /통계 새로고침$/ }));

    await waitFor(() => expect(surveyCalls()).toHaveLength(2));
  });

  it('다른 탭에서는 설문 목록을 조회하지 않는다', async () => {
    renderHub('SYSTEM_STATS');

    await waitFor(() => expect(client.getRaw.mock.calls.some(([url]) => url === 'admin/system/statistics/connect')).toBe(true));
    expect(surveyCalls()).toHaveLength(0);
    expect(screen.queryByText('등록된 설문조사가 없습니다.')).not.toBeInTheDocument();
  });
});
