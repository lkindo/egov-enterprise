import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdministCodeClient from '../AdministCodeClient';

/**
 * 🗺️ 행정 구역 코드 정정 경로 계약.
 *
 * [2026-09-08] 이 화면은 등록만 있어 코드나 명칭을 잘못 넣으면 되돌릴 방법이 없었다 —
 * 서버의 `updateAdministCode`·`deleteAdministCode` 는 있는데 화면 호출부가 0 이었다
 * (operation-consumer-census 축 2 실측).
 *
 * 이 파일이 고정하는 것:
 *   1) 수정은 기존 값으로 열리고 **식별 코드는 잠긴다**(PK 를 바꾸는 것은 다른 코드를
 *      만드는 일이지 이 코드를 고치는 일이 아니다).
 *   2) 삭제는 확인을 거치고, 확인 본문이 대상 코드·명칭과 하위 코드 제약을 밝힌다.
 *   3) 삭제 진행 중 재진입이 막히고 실패는 서버 메시지 그대로 드러난다 —
 *      하위 코드가 있으면 서버가 409 로 거부하므로 그 이유가 사용자에게 닿아야 한다.
 */
const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createAdministCode: vi.fn(),
  deleteAdministCode: vi.fn(),
  getAdministCodeList: vi.fn(),
  toast: vi.fn(),
  updateAdministCode: vi.fn(),
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 기본은 모든 쓰기 권한을 가진 관리자이고, 표시 판정 테스트만 권한을 줄인다.
const FULL_PERMISSIONS = ['ADMCODE_READ', 'ADMCODE_CREATE', 'ADMCODE_UPDATE', 'ADMCODE_DELETE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));

vi.mock('next/dynamic', () => ({
  default: () => function TestModal({
    children,
    footer,
    isOpen,
    title,
  }: {
    children: ReactNode;
    footer?: ReactNode;
    isOpen: boolean;
    title: string;
  }) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children, title }: { actions?: ReactNode; children: ReactNode; title: string }) => (
    <main><h1>{title}</h1>{actions}{children}</main>
  ),
}));

vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ label }: { label: string }) => <input aria-label={label} />,
}));

// 행 액션을 보려면 컬럼 accessor 를 실제로 렌더해야 한다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: { header: string; accessor: (row: Record<string, string>) => ReactNode }[];
    data: Record<string, string>[];
  }) => (
    <table>
      <tbody>
        {data.map((row) => (
          <tr key={row.admdstCd}>
            {columns.map((column) => <td key={column.header}>{column.accessor(row)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('@/components/ui/hub/HubStatusBadge', () => ({
  HubStatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

vi.mock('@/services/foundation/system/CodeAdminService', () => ({
  codeAdminService: {
    createAdministCode: (...args: unknown[]) => mocks.createAdministCode(...args),
    updateAdministCode: (...args: unknown[]) => mocks.updateAdministCode(...args),
    deleteAdministCode: (...args: unknown[]) => mocks.deleteAdministCode(...args),
    getAdministCodeList: (...args: unknown[]) => mocks.getAdministCodeList(...args),
  },
}));

const SEOUL = {
  admdstCd: '1100000000',
  admdstSeCd: '1',
  admdstZoneNm: '서울특별시',
  upAdmdstCd: '',
  useYn: 'Y',
};

function renderClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdministCodeClient initialData={{ list: [SEOUL], total: 1, page: 1, size: 10, totalPage: 1 }} />
    </QueryClientProvider>,
  );
}

describe('AdministCodeClient 정정 경로', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.permissions = FULL_PERMISSIONS;
    mocks.getAdministCodeList.mockResolvedValue({ list: [SEOUL], total: 1, page: 1, size: 10, totalPage: 1 });
    mocks.updateAdministCode.mockResolvedValue(undefined);
    mocks.deleteAdministCode.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('수정은 기존 값으로 열리고 식별 코드를 잠근다', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '서울특별시 수정' }));

    expect(await screen.findByRole('region', { name: '행정 구역 코드 수정' })).toBeInTheDocument();
    const codeInput = screen.getByDisplayValue('1100000000');
    expect(codeInput).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('서울특별시')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /저장$/ })).toBeInTheDocument();
  });

  it('수정 저장은 대상 코드와 함께 갱신 값을 보낸다', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '서울특별시 수정' }));
    await screen.findByRole('region', { name: '행정 구역 코드 수정' });

    fireEvent.change(screen.getByDisplayValue('서울특별시'), { target: { value: '서울특별시(정정)' } });
    fireEvent.click(screen.getByRole('button', { name: /저장$/ }));

    await waitFor(() => expect(mocks.updateAdministCode).toHaveBeenCalledTimes(1));
    expect(mocks.updateAdministCode).toHaveBeenCalledWith(
      '1100000000',
      expect.objectContaining({ admdstZoneNm: '서울특별시(정정)', admdstSeCd: '1', useYn: 'Y' }),
    );
    expect(mocks.createAdministCode).not.toHaveBeenCalled();
  });

  it('상위가 없는 최상위 구역도 저장된다 — 서버에 없는 필수 규칙을 화면이 만들지 않는다', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '서울특별시 수정' }));
    await screen.findByRole('region', { name: '행정 구역 코드 수정' });

    // 상위 코드는 비어 있다(서울특별시는 최상위). 서버 DTO 에도 물리 컬럼에도 필수가 아니다.
    fireEvent.click(screen.getByRole('button', { name: /저장$/ }));

    await waitFor(() => expect(mocks.updateAdministCode).toHaveBeenCalledTimes(1));
    expect(mocks.updateAdministCode).toHaveBeenCalledWith(
      '1100000000',
      expect.objectContaining({ upAdmdstCd: '' }),
    );
  });

  it('삭제 확인을 취소하면 서버를 부르지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '서울특별시 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive',
      message: expect.stringContaining('1100000000'),
    }));
    // 하위 코드 제약을 확인 본문이 미리 말한다 — 눌러 보고 실패로 알게 하지 않는다.
    expect(mocks.confirm.mock.calls[0][0].message).toContain('하위 코드');
    expect(mocks.deleteAdministCode).not.toHaveBeenCalled();
  });

  it('삭제 중에는 재진입을 막고 진행을 드러내며 실패 사유를 그대로 알린다', async () => {
    let reject: (error: unknown) => void = () => undefined;
    mocks.deleteAdministCode.mockReturnValue(new Promise((_, next) => { reject = next; }));

    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '서울특별시 삭제' }));

    await waitFor(() => expect(mocks.deleteAdministCode).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', { name: '서울특별시 삭제' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    expect(pendingButton).toHaveTextContent('삭제 중…');

    fireEvent.click(pendingButton);
    expect(mocks.deleteAdministCode).toHaveBeenCalledTimes(1);

    reject({ response: { data: { message: '하위 행정구역 코드 3건이 이 코드를 상위로 두고 있어 삭제할 수 없습니다.' } } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      expect.stringContaining('하위 행정구역 코드 3건'),
      'error',
    ));
  });

  /*
   * [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다.
   * 이 화면은 ADMCODE_READ 만으로 들어올 수 있어, 종전에는 조회만 맡은 담당자에게도 등록·수정·삭제가 모두 보였다.
   */
  it('조회 권한만 있으면 신규 등록·수정·삭제를 보이지 않는다', async () => {
    auth.permissions = ['ADMCODE_READ'];
    renderClient();

    // 목록은 그대로 읽힌다 — 가리는 것은 쓰기 동작뿐이다.
    expect(await screen.findByText('서울특별시')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /신규 등록/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '서울특별시 수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '서울특별시 삭제' })).not.toBeInTheDocument();
  });

  it('권한은 동작마다 따로 본다 — 수정 권한만 있으면 수정만 보인다', async () => {
    auth.permissions = ['ADMCODE_READ', 'ADMCODE_UPDATE'];
    renderClient();

    expect(await screen.findByRole('button', { name: '서울특별시 수정' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '서울특별시 삭제' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /신규 등록/ })).not.toBeInTheDocument();
  });
});
