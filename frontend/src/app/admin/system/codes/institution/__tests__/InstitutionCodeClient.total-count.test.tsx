import type { PropsWithChildren, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InstitutionCodeClient from '../InstitutionCodeClient';

/**
 * 공공기관 코드 화면이 셸 툴바에 넘기는 총 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 지금 탭 조회의 `data?.total ?? 0` 으로 만들고 오류도 거르지 않아, 첫 응답 전·오프라인
 * 정지·조회 실패에 툴바가 "총 0건" 을 보이고 aria-live 로 읽어 줬다 — 불러오는 중이나 실패를 '데이터 없음' 으로 말한다.
 * 판정은 지금 탭의 조회로 한다. 서버가 내려준 첫 페이지 자리표시자의 총 건수는 받은 값이므로 그대로 보인다.
 */
const mocks = vi.hoisted(() => ({ getList: vi.fn(), getReceptions: vi.fn() }));

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    getInstitutionCodeList: mocks.getList,
    getInstitutionCodeRecptnList: mocks.getReceptions,
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['INST_CODE_READ'], authorizationVersion: 'v1' } }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수만 본다(탭 전환 단추는 actions 에 있다).
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, actions, children }: PropsWithChildren<{ totalCount?: number; actions?: ReactNode }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {actions}
      {children}
    </main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

const INSTITUTION = { instCd: 'A001', allInstNm: '서울특별시', lwtrkInstNm: '서울특별시', telno: '', ablYn: '0' };

function renderList(initialData?: Parameters<typeof InstitutionCodeClient>[0]['initialData']) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InstitutionCodeClient initialData={initialData} />
    </QueryClientProvider>,
  );
}

describe('공공기관 코드 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReceptions.mockReturnValue(new Promise(() => undefined));
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getList.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getList.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getList).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 낸다', async () => {
    mocks.getList.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
  });

  // 종전에는 오류를 거르지 않아 실패도 "총 0건" 이었다.
  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getList.mockRejectedValue(new Error('기관 코드 조회 실패'));
    renderList();

    await waitFor(() => expect(mocks.getList).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
  });

  // 서버가 내려준 첫 페이지는 받은 값이다 — 응답을 기다리는 동안에도 그 총 건수(목록 길이가 아니라 서버 총계)를 보인다.
  it('서버가 내려준 첫 페이지가 있으면 응답 전에도 그 총 건수를 보인다', async () => {
    mocks.getList.mockReturnValue(new Promise(() => undefined));
    renderList({ list: [INSTITUTION], total: 42, page: 1, size: 10, totalPage: 5 });

    await waitFor(() => expect(mocks.getList).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('42');
  });

  it('수신 이력 탭은 그 탭의 조회로 판정한다 — 받기 전에는 비우고, 받으면 그 총 건수를 낸다', async () => {
    mocks.getList.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    let resolveReceptions: (page: unknown) => void = () => undefined;
    mocks.getReceptions.mockReturnValue(new Promise((done) => { resolveReceptions = done; }));
    renderList();
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));

    fireEvent.click(screen.getByRole('tab', { name: /수신 이력/ }));
    await waitFor(() => expect(mocks.getReceptions).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');

    resolveReceptions({ list: [], total: 3, totalPage: 1 });
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('3'));
  });

  // 첫 조회 실패는 받은 값이 없어 data 가드로도 비지만, 다시 조회가 실패하면 앞서 받은 값이 남는다 — 그때는 오류 가드가 비운다.
  it('다시 조회하는 동안은 받은 총 건수를 유지하고, 다시 조회가 실패하면 내린다', async () => {
    let rejectRefetch: (error: unknown) => void = () => undefined;
    mocks.getList
      .mockResolvedValueOnce({ list: [], total: 7, totalPage: 1 })
      .mockReturnValueOnce(new Promise((_, fail) => { rejectRefetch = fail; }));
    renderList();
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));

    // 탭을 다녀오면 기관 목록 조회가 다시 켜지며 다시 조회한다(앞서 받은 값은 남아 있다).
    fireEvent.click(screen.getByRole('tab', { name: /수신 이력/ }));
    fireEvent.click(screen.getByRole('tab', { name: /기관 목록/ }));
    await waitFor(() => expect(mocks.getList).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7');

    rejectRefetch(new Error('기관 코드 다시 조회 실패'));
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
  });

  it('수신 이력 조회가 실패하면 기관 목록이 성공했어도 총 건수를 내지 않는다', async () => {
    mocks.getList.mockResolvedValue({ list: [], total: 7, totalPage: 1 });
    mocks.getReceptions.mockRejectedValue(new Error('수신 이력 조회 실패'));
    renderList();
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));

    fireEvent.click(screen.getByRole('tab', { name: /수신 이력/ }));
    await waitFor(() => expect(mocks.getReceptions).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
  });
});
