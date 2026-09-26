import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClientProvider, useQuery, type QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  createAppQueryClient,
  getHttpStatus,
  isPageShaped,
  keepPreviousPageData,
  shouldPromoteQueryError,
} from '../list-query-defaults';

/**
 * [2026-09-26 DIP C1·C2] 목록 쿼리의 공통 상태 규칙.
 *
 * C1 — 페이지를 바꾸는 동안 새 key 에 데이터가 없어 '총 0건' 을 읽고 페이저가 사라졌다가 나타났다.
 * C2 — 새 key 의 5xx 가 "최초 로드 실패" 로 판정돼, 이전 페이지가 보이던 화면 전체가 오류 경계로 교체됐다.
 */

const serverError = { response: { status: 503 } };

function page(total: number, ...ids: number[]) {
  return { list: ids.map((id) => ({ id })), total };
}

describe('list-query-defaults 판정', () => {
  it('페이지 모양은 list 배열과 숫자 total 을 함께 가진 응답뿐이다', () => {
    expect(isPageShaped(page(3, 1))).toBe(true);
    expect(isPageShaped([{ id: 1 }])).toBe(false);
    expect(isPageShaped({ list: [] })).toBe(false);
    expect(isPageShaped({ id: 1 })).toBe(false);
    expect(isPageShaped(undefined)).toBe(false);
  });

  it('이전 데이터는 페이지 모양일 때만 유지한다 — 항목별 배열·상세는 다른 항목의 것처럼 보이면 안 된다', () => {
    const previous = page(3, 1);
    expect(keepPreviousPageData(previous)).toBe(previous);
    expect(keepPreviousPageData([{ id: 1 }])).toBeUndefined();
    expect(keepPreviousPageData({ id: 1, name: '이전 상세' })).toBeUndefined();
  });

  it('상태 코드는 response.status 를 먼저 보고, 없으면 평탄화된 status·statusCode 를 본다', () => {
    expect(getHttpStatus({ response: { status: 502 } })).toBe(502);
    expect(getHttpStatus({ status: 500 })).toBe(500);
    expect(getHttpStatus({ statusCode: 404 })).toBe(404);
    expect(getHttpStatus(new Error('network'))).toBe(0);
    expect(getHttpStatus(null)).toBe(0);
  });

  it('최초 로드의 5xx 만 오류 경계로 올리고, 같은 목록 계열의 다른 페이지가 그려져 있으면 올리지 않는다', () => {
    const client = createAppQueryClient();
    const cache = client.getQueryCache();
    const build = (key: readonly unknown[]) => cache.build(client, { queryKey: key });

    const firstPage = build(['notes', 1]);
    expect(shouldPromoteQueryError(serverError, firstPage, client)).toBe(true);
    expect(shouldPromoteQueryError({ response: { status: 404 } }, firstPage, client)).toBe(false);

    client.setQueryData(['notes', 1], page(30, 1, 2));
    const secondPage = build(['notes', 2]);
    expect(shouldPromoteQueryError(serverError, secondPage, client)).toBe(false);

    // 다른 계열의 데이터는 이 목록이 그려졌다는 증거가 아니다.
    const otherFamily = build(['mails', 1]);
    expect(shouldPromoteQueryError(serverError, otherFamily, client)).toBe(true);

    // 배열 데이터는 페이지가 아니다 — 형제로 치지 않는다.
    client.setQueryData(['recipients', 7], [{ id: 1 }]);
    expect(shouldPromoteQueryError(serverError, build(['recipients', 8]), client)).toBe(true);

    // 이미 데이터가 있는 쿼리의 재조회 실패는 승격하지 않는다(종전 규칙 유지).
    expect(shouldPromoteQueryError(serverError, cache.find({ queryKey: ['notes', 1] })!, client)).toBe(false);
  });
});

function PagedList({ pageNo, fetchPage }: { pageNo: number; fetchPage: (pageNo: number) => Promise<ReturnType<typeof page>> }) {
  const { data, isError, isPlaceholderData } = useQuery({
    queryKey: ['notes', pageNo],
    queryFn: () => fetchPage(pageNo),
    retry: false,
  });
  if (isError) return <p role="alert">목록을 불러오지 못했습니다.</p>;
  return (
    <div>
      <p>총 {data?.total ?? 0}건</p>
      <p>{isPlaceholderData ? '이전 페이지 표시 중' : '현재 페이지'}</p>
    </div>
  );
}

class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>화면 전체 오류</p> : this.props.children;
  }
}

function renderList(client: QueryClient, pageNo: number, fetchPage: (pageNo: number) => Promise<ReturnType<typeof page>>) {
  return render(
    <QueryClientProvider client={client}>
      <Boundary>
        <PagedList pageNo={pageNo} fetchPage={fetchPage} />
      </Boundary>
    </QueryClientProvider>,
  );
}

describe('list-query-defaults 가 적용된 목록 화면', () => {
  it('다음 페이지를 불러오는 동안 총 건수를 0 으로 읽지 않는다 (C1)', async () => {
    const client = createAppQueryClient();
    let resolveSecond!: (value: ReturnType<typeof page>) => void;
    const fetchPage = (pageNo: number) => (pageNo === 1
      ? Promise.resolve(page(30, 1, 2))
      : new Promise<ReturnType<typeof page>>((resolve) => { resolveSecond = resolve; }));
    const view = renderList(client, 1, fetchPage);
    expect(await screen.findByText('총 30건')).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={client}>
        <Boundary>
          <PagedList pageNo={2} fetchPage={fetchPage} />
        </Boundary>
      </QueryClientProvider>,
    );
    expect(screen.getByText('총 30건')).toBeInTheDocument();
    expect(screen.getByText('이전 페이지 표시 중')).toBeInTheDocument();
    expect(screen.queryByText('총 0건')).not.toBeInTheDocument();

    await act(async () => resolveSecond(page(30, 3, 4)));
    await waitFor(() => expect(screen.getByText('현재 페이지')).toBeInTheDocument());
  });

  it('이전 페이지가 그려진 목록에서 다음 페이지의 5xx 는 화면 전체가 아니라 목록 안에서 알린다 (C2)', async () => {
    const client = createAppQueryClient();
    const fetchPage = (pageNo: number) => (pageNo === 1 ? Promise.resolve(page(30, 1, 2)) : Promise.reject(serverError));
    const view = renderList(client, 1, fetchPage);
    expect(await screen.findByText('총 30건')).toBeInTheDocument();

    view.rerender(
      <QueryClientProvider client={client}>
        <Boundary>
          <PagedList pageNo={2} fetchPage={fetchPage} />
        </Boundary>
      </QueryClientProvider>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('목록을 불러오지 못했습니다.');
    expect(screen.queryByText('화면 전체 오류')).not.toBeInTheDocument();
  });

  it('처음 여는 목록의 5xx 는 종전대로 오류 경계로 올린다', async () => {
    const client = createAppQueryClient();
    const original = console.error;
    console.error = () => undefined;
    try {
      renderList(client, 1, () => Promise.reject(serverError));
      expect(await screen.findByText('화면 전체 오류')).toBeInTheDocument();
    } finally {
      console.error = original;
    }
  });
});
