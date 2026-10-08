/**
 * 설문 관리 허브의 '설문지 및 서비스 이용 현황' 요약 — 동등성 고정(Phase 0c).
 *
 * 통계 서비스·DTO 가 business-core 로 옮겨 가고 통계 허브가 셸과 패널로 나뉘어도 이 요약은 같아야 한다.
 * 라우트 페이지를 그대로 렌더하고 API 는 `@/lib/api/client` 에서 URL 로만 가로챈다 — 서비스 모듈이나
 * 허브 자식 컴포넌트는 mock 하지 않는다.
 *
 * 고정하는 것: 카드 3장의 이름·값·단위(값이 없으면 '—' 이고 단위를 붙이지 않는다), 일부 조회 실패 문구 3종,
 * 다시 시도는 실패한 조회만 다시 부른다는 것, 실패하면 <summary> 끝에 ' — 일부 조회 실패' 가 붙는다는 것.
 */

import type { AxiosRequestConfig } from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => '/admin/survey/hub',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['SURVEY_READ_ALL', 'POLL_READ'], authorizationVersion: 'v1' } }),
}));

import SurveyHubPage from '../page';

const SURVEYS_URL = 'admin/system/surveys';
const SUMMARY_URL = 'admin/system/statistics/summary';
const SUMMARY_TITLE = '설문지 및 서비스 이용 현황';
const envelope = (data: unknown) => ({ success: true, code: 'S000', message: '성공', data });
const fail = () => Promise.reject(new Error('network'));

let surveys: () => Promise<unknown>;
let summary: () => Promise<unknown>;

const surveyCount = (total: number | null) => () => Promise.resolve(envelope({ list: [], total, page: 0, size: 1, totalPage: 1 }));
const summaryOf = (data: { totalUsers: number | null; totalPosts: number | null; todayConnects: number | null }) =>
  () => Promise.resolve(envelope(data));

const emptyPage = () => Promise.resolve(envelope({ list: [], total: 0, page: 0, size: 10, totalPage: 0 }));

/** 요약의 설문지 건수 조회 — 한 건짜리 페이지다. 같은 URL 의 다른 조회(문항 패널의 설문지 선택지)와 가른다. */
const isCountQuery = (url: string, config?: AxiosRequestConfig) =>
  url === SURVEYS_URL && (config?.params as { size?: number } | undefined)?.size === 1;

function routeGet(url: string, config?: AxiosRequestConfig): Promise<unknown> {
  if (isCountQuery(url, config)) return surveys();
  if (url === SUMMARY_URL) return summary();
  // 허브가 embed 하는 목록·패널의 조회 — 요약과 무관하므로 빈 페이지로 둔다.
  if (url === SURVEYS_URL || url === 'polls') return emptyPage();
  return Promise.reject(new Error(`예상하지 못한 조회: ${url}`));
}

const countCalls = () => client.getRaw.mock.calls.filter(([url, config]) => isCountQuery(url, config));
const callsTo = (target: string) => client.getRaw.mock.calls.filter(([url]) => url === target);

function renderHub() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SurveyHubPage />
    </QueryClientProvider>,
  );
}

/** 카드 값 — 이름에서 올라가 값 제목(h3)을 품은 가장 가까운 요소의 h3. */
function cardValue(label: string): HTMLElement {
  let el: HTMLElement | null = screen.getByText(label);
  while (el && !el.querySelector('h3')) el = el.parentElement;
  if (!el) throw new Error(`요약 카드를 찾지 못했습니다: ${label}`);
  return el.querySelector('h3')!;
}

/** 요약의 <summary> — 허브가 embed 하는 목록에도 <summary> 가 있어 제목으로 가른다. */
function summaryElement(): HTMLElement {
  return screen.getByText((_, node) => node?.tagName === 'SUMMARY' && !!node.textContent?.startsWith(SUMMARY_TITLE));
}

/** 지표가 그려질 때까지(스켈레톤이 걷힐 때까지) 기다린다. */
const settled = () => screen.findByText('등록된 설문지');

// 전역 lucide mock 이 아이콘 이름을 글자로 그려 버튼 이름 앞에 붙는다 — 버튼은 끝맺음으로 찾는다.
const RETRY = { name: /다시 시도$/ };

describe('설문 관리 허브 요약 — 동등성', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    surveys = surveyCount(7);
    summary = summaryOf({ totalUsers: 1234, totalPosts: 5, todayConnects: null });
    client.getRaw.mockImplementation((url, config) => routeGet(url, config));
  });

  it('설문지 건수는 한 건짜리 첫 페이지로, 사용자·접속은 요약 통계로 한 번씩 조회한다', async () => {
    renderHub();
    await settled();

    expect(countCalls()).toEqual([[SURVEYS_URL, { params: { keyword: '', page: 0, size: 1 } }]]);
    expect(callsTo(SUMMARY_URL)).toEqual([[SUMMARY_URL, undefined]]);
  });

  it('카드 3장은 이름·값·단위를 보이고, 값이 없으면 단위 없이 — 로 표기한다', async () => {
    renderHub();
    await settled();

    expect(cardValue('등록된 설문지').textContent).toBe('7건');
    expect(within(cardValue('등록된 설문지')).getByText('건')).toBeInTheDocument();
    expect(cardValue('총 사용자').textContent).toBe('1,234명');
    expect(within(cardValue('총 사용자')).getByText('명')).toBeInTheDocument();
    expect(cardValue('오늘 접속').textContent).toBe('—');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(summaryElement().textContent).toBe(SUMMARY_TITLE);
  });

  it('0 은 값이고 — 가 아니다 — 서버가 주지 않은 값만 — 다', async () => {
    surveys = surveyCount(null);
    summary = summaryOf({ totalUsers: null, totalPosts: null, todayConnects: 0 });
    renderHub();
    await settled();

    expect(cardValue('등록된 설문지').textContent).toBe('—');
    expect(cardValue('총 사용자').textContent).toBe('—');
    expect(cardValue('오늘 접속').textContent).toBe('0회');
  });

  it('설문 건수만 실패하면 그 사실을 말하고 다시 시도는 설문 건수만 다시 부른다', async () => {
    surveys = fail;
    renderHub();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('요약 지표를 불러오지 못했습니다.');
    expect(within(alert).getByText('설문 건수를 조회하지 못했습니다. 아래 목록은 별도로 조회됩니다.')).toBeInTheDocument();
    expect(summaryElement().textContent).toBe(`${SUMMARY_TITLE} — 일부 조회 실패`);
    expect(cardValue('등록된 설문지').textContent).toBe('—');
    expect(cardValue('총 사용자').textContent).toBe('1,234명');

    surveys = surveyCount(7);
    fireEvent.click(within(alert).getByRole('button', RETRY));

    await waitFor(() => expect(cardValue('등록된 설문지').textContent).toBe('7건'));
    expect(countCalls()).toHaveLength(2);
    expect(callsTo(SUMMARY_URL)).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(summaryElement().textContent).toBe(SUMMARY_TITLE);
  });

  it('요약 통계만 실패하면 그 사실을 말하고 다시 시도는 요약 통계만 다시 부른다', async () => {
    summary = fail;
    renderHub();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('접속 요약을 조회하지 못했습니다. 아래 목록은 별도로 조회됩니다.')).toBeInTheDocument();
    expect(summaryElement().textContent).toBe(`${SUMMARY_TITLE} — 일부 조회 실패`);
    expect(cardValue('등록된 설문지').textContent).toBe('7건');
    expect(cardValue('총 사용자').textContent).toBe('—');
    expect(cardValue('오늘 접속').textContent).toBe('—');

    summary = summaryOf({ totalUsers: 1234, totalPosts: 5, todayConnects: 3 });
    fireEvent.click(within(alert).getByRole('button', RETRY));

    await waitFor(() => expect(cardValue('오늘 접속').textContent).toBe('3회'));
    expect(callsTo(SUMMARY_URL)).toHaveLength(2);
    expect(countCalls()).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('둘 다 실패하면 둘 다 말하고 다시 시도는 둘을 한 번씩 다시 부른다', async () => {
    surveys = fail;
    summary = fail;
    renderHub();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('설문 건수와 접속 요약을 모두 조회하지 못했습니다. 아래 목록은 별도로 조회됩니다.')).toBeInTheDocument();
    expect(summaryElement().textContent).toBe(`${SUMMARY_TITLE} — 일부 조회 실패`);
    expect(['등록된 설문지', '총 사용자', '오늘 접속'].map((label) => cardValue(label).textContent)).toEqual(['—', '—', '—']);

    fireEvent.click(within(alert).getByRole('button', RETRY));

    await waitFor(() => expect(countCalls()).toHaveLength(2));
    await waitFor(() => expect(callsTo(SUMMARY_URL)).toHaveLength(2));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
