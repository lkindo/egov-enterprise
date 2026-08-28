/**
 * 기관코드 수신 — 화면이 약속하는 것과 서버가 하는 일이 같아야 한다.
 *
 * ── 무엇이 틀려 있었나 ──────────────────────────────────────────────────────────
 * '반영' 버튼은 확인 모달에서 "‘…’ 의 수신 내역을 **기관코드 원장에 반영합니다**. 반영 후에는
 * 되돌릴 수 없습니다." 라고 말하고, 성공하면 "성공적으로 반영되었습니다" 를 띄운 뒤 행을
 * '완료' 로 굳혔다.
 *
 * 서버는 원장을 건드리지 않는다 — `InstitutionCodeService.updateInstitutionCodeRecptn` 은 수신
 * 로그 행의 `procSe` 만 완료로 바꾼다. 원장(`tb_inst_cd`)에 쓰는 `institutionCodeRepository.save`
 * 는 저장소 전체에서 관리자 수기 등록(`insertInstitutionCode`) 한 곳에서만 호출된다.
 *
 * 그래서 이 버튼은 **원장을 그대로 둔 채 대기 신호만 지웠다.** 종전(400 으로 큰 소리를 내며
 * 실패)보다 나쁜 형태다 — 조용히 성공하므로 아무도 눈치채지 못한다.
 *
 * 원장 반영 자체를 구현하지 않은 이유는 `chgSeCd`(변경구분)의 값 도메인이 저장소 어디에도
 * 확정돼 있지 않기 때문이다(이 화면은 1/2/3, 백엔드 테스트는 "I", DB 주석은 '변경구분코드'
 * 뿐). 근거 없이 해석하면 코어 데이터를 잘못 덮어쓴다 — GAP-CODE-001 로 남겼다.
 */

import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getList: vi.fn(),
  getReceptions: vi.fn(),
  process: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    getInstitutionCodeList: mocks.getList,
    getInstitutionCodeRecptnList: mocks.getReceptions,
    processInstitutionCodeRecptn: mocks.process,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (v: string) => v }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ title, actions, filter, children }: {
    title: string; actions?: ReactNode; filter?: ReactNode; children: ReactNode;
  }) => <main><h1>{title}</h1>{actions}{filter}{children}</main>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ header: string; accessor: (item: Record<string, unknown>) => ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <div>
      {data.map((item, row) => (
        <div key={row}>{columns.map((column, index) => (
          <span key={`${row}-${index}`}>{column.accessor(item)}</span>
        ))}</div>
      ))}
    </div>
  ),
}));

import InstitutionCodeClient from '../InstitutionCodeClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const RECEPTION = {
  ocrnYmd: '20260828',
  instCd: 'A001',
  jobSn: 1,
  allInstNm: '서울특별시',
  chgSeCd: '1',
  procSe: '0',
};

const renderClient = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InstitutionCodeClient />
    </QueryClientProvider>,
  );
};

/** 수신 이력 탭으로 이동한다 — 반영 액션은 그 탭에만 있다. */
const openReceptionTab = async () => {
  fireEvent.click(screen.getByRole('tab', { name: /수신 이력/ }));
  await screen.findByText('서울특별시');
};

describe('기관코드 수신 처리 — 없는 원장 반영을 약속하지 않는다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getList.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    mocks.getReceptions.mockResolvedValue({ list: [RECEPTION], total: 1, totalPage: 1 });
    mocks.process.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('확인 문구가 원장이 바뀌지 않는다는 사실을 말한다', async () => {
    renderClient();
    await openReceptionTab();

    fireEvent.click(screen.getByRole('button', { name: '서울특별시 수신 건 처리 완료로 표시' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const message = String(mocks.confirm.mock.calls[0][0].message);
    expect(message).toContain('서울특별시');
    expect(message).toContain('기관코드 원장은 이 동작으로 바뀌지 않으며');
    // 서버가 하지 않는 일을 약속하지 않는다.
    expect(message).not.toContain('원장에 반영합니다');
  });

  it('성공 안내도 반영했다고 말하지 않는다', async () => {
    renderClient();
    await openReceptionTab();

    fireEvent.click(screen.getByRole('button', { name: '서울특별시 수신 건 처리 완료로 표시' }));

    await waitFor(() => expect(mocks.process).toHaveBeenCalledWith({
      ocrnYmd: '20260828', instCd: 'A001', jobSn: 1,
    }));
    await waitFor(() => expect(mocks.toast)
      .toHaveBeenCalledWith('수신 내역을 처리 완료로 표시했습니다.', 'success'));
    const said = mocks.toast.mock.calls.map((c) => String(c[0])).join(' ');
    expect(said).not.toMatch(/반영되었습니다/);
  });

  it('확인을 취소하면 아무것도 보내지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderClient();
    await openReceptionTab();

    fireEvent.click(screen.getByRole('button', { name: '서울특별시 수신 건 처리 완료로 표시' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.process).not.toHaveBeenCalled();
  });
});

describe('기관코드 변경 구분 — 모르는 값을 지어내지 않는다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getList.mockResolvedValue({ list: [], total: 0, totalPage: 1 });
    mocks.process.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('알 수 없는 변경 구분은 원문 그대로 보여 준다 — 종전에는 전부 신규로 떨어졌다', async () => {
    /*
     * chgSeCd 의 값 도메인은 확정돼 있지 않다. 종전 `typeMap[x] || typeMap['1']` 은 서버가
     * 무엇을 보내든 '신규' 로 표시해, 근거 없는 값을 실측값처럼 보이게 만들었다.
     */
    mocks.getReceptions.mockResolvedValue({
      list: [{ ...RECEPTION, chgSeCd: 'I' }], total: 1, totalPage: 1,
    });
    renderClient();
    await openReceptionTab();

    expect(screen.getByText('I')).toBeInTheDocument();
    expect(screen.queryByText('신규')).not.toBeInTheDocument();
  });

  it('아는 값은 그대로 라벨로 보여 준다', async () => {
    mocks.getReceptions.mockResolvedValue({
      list: [{ ...RECEPTION, chgSeCd: '2' }], total: 1, totalPage: 1,
    });
    renderClient();
    await openReceptionTab();

    expect(screen.getByText('수정')).toBeInTheDocument();
  });
});
