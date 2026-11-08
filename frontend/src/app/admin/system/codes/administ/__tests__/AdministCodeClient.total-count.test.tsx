import type { PropsWithChildren } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdministCodeClient from '../AdministCodeClient';

/**
 * 행정 구역 코드 목록이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `pageData?.total ?? 0` 으로 만들고 오류일 때만 비워, 첫 응답이 오기 전(또는
 * 오프라인으로 조회가 멈춘 동안)에는 툴바가 "총 0건" 을 보이고 aria-live 로 읽어 줬다 — 불러오는 중을 '데이터 없음' 으로
 * 말한다. 서버가 내려준 첫 페이지 자리표시자의 총 건수는 받은 값이므로 그대로 보인다.
 */
const mocks = vi.hoisted(() => ({ getAdministCodeList: vi.fn() }));

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: { getAdministCodeList: mocks.getAdministCodeList },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['ADMCODE_READ'], authorizationVersion: 'v1' } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('next/dynamic', () => ({ default: () => function TestModal() { return null; } }));
vi.mock('@/app/components/patterns/keyword-filter', () => ({ KeywordFilter: () => null }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, children }: PropsWithChildren<{ totalCount?: number }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {children}
    </main>
  ),
}));
// 실패 사례가 실패 상태에 닿은 뒤에 보게, 표가 받은 오류를 드러낸다(대기 중에도 총 건수는 '없음' 이라 그것만으로는 통과해 버린다).
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: unknown }) => <div>{error ? '표 오류' : null}</div>,
}));

const SEOUL = { admdstCd: '1100000000', admdstSeCd: '1', admdstZoneNm: '서울특별시', upAdmdstCd: '', useYn: 'Y' };

function renderList(initialData?: Parameters<typeof AdministCodeClient>[0]['initialData']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdministCodeClient initialData={initialData} />
    </QueryClientProvider>,
  );
}

describe('행정 구역 코드 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getAdministCodeList.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getAdministCodeList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getAdministCodeList.mockResolvedValue({ list: [], total: 7, page: 1, size: 10, totalPage: 1 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getAdministCodeList).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.getAdministCodeList.mockResolvedValue({ list: [], total: 7, page: 1, size: 10, totalPage: 1 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getAdministCodeList.mockRejectedValue(new Error('행정 구역 조회 실패'));
    renderList();

    await waitFor(() => expect(mocks.getAdministCodeList).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('표 오류')).toBeInTheDocument();
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 서버가 내려준 첫 페이지는 받은 값이다 — 응답을 기다리는 동안에도 그 총 건수(목록 길이가 아니라 서버 총계)를 보인다.
  it('서버가 내려준 첫 페이지가 있으면 응답 전에도 그 총 건수를 보인다', async () => {
    mocks.getAdministCodeList.mockReturnValue(new Promise(() => undefined));
    renderList({ list: [SEOUL], total: 42, page: 1, size: 10, totalPage: 5 });

    await waitFor(() => expect(mocks.getAdministCodeList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('42');
  });

  // 독립 검토 반례: 서버가 빈 첫 페이지를 정상으로 돌려줬으면 확인된 0건이다 — 선조회 실패(page.tsx 가 넘기는 null)와 가른다.
  it('서버가 빈 첫 페이지를 정상으로 내려줬으면 응답 전에도 확인된 0건을 보이고, 선조회가 실패했으면 비운다', async () => {
    mocks.getAdministCodeList.mockReturnValue(new Promise(() => undefined));
    const confirmed = renderList({ list: [], total: 0, page: 1, size: 10, totalPage: 0 });
    await waitFor(() => expect(mocks.getAdministCodeList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('0');
    confirmed.unmount();

    renderList(null);
    await waitFor(() => expect(mocks.getAdministCodeList).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });
});
