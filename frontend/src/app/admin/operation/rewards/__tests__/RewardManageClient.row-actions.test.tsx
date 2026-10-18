import type { ReactElement, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RewardManageClient from '../RewardManageClient';

/**
 * 🛠 운영 도메인 정정 경로 — 포상의 행 액션(수정·삭제) 계약.
 *
 * [2026-09-05 DEC-OPS-036] 종전에는 포상가 등록만 되고 고칠 수 없었다(감사 D11-01). 판정은
 * "어느 식별자로 어떤 sink 를 부르는가" 다 — 포상 일련번호(rwrdSn)로 수정·삭제하고 승인 상태는 건드리지 않는다. 삭제는 확인 후 한 번만 부르고, pending 동안 disabled·aria-busy 이며,
 * 실패는 토스트로 드러난다(폼 검증 census 의 destructive action 계약).
 *
 * 외부인사·포상은 따로 고르는 기능이라 시험도 화면마다 둔다 — 한 파일에 섞으면 한쪽만 고른 생성물에서 두 시험이 함께 사라진다.
 */
const mocks = vi.hoisted(() => ({
  getRewardList: vi.fn(),
  createReward: vi.fn(),
  updateReward: vi.fn(),
  deleteReward: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 기본은 쓰기 권한을 모두 가진 관리자이고, 표시 판정 테스트만 권한을 줄인다.
const READ_ONLY_PERMISSIONS = ['REWARD_READ'];
const FULL_PERMISSIONS = [...READ_ONLY_PERMISSIONS, 'REWARD_CREATE', 'REWARD_UPDATE', 'REWARD_DELETE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));
beforeEach(() => { auth.permissions = FULL_PERMISSIONS; });

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/operation/rewards',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function TestModal({
    children, footer, isOpen, onClose, title,
  }: { children: ReactNode; footer?: ReactNode; isOpen: boolean; onClose?: () => void; title: string }) {
    return isOpen ? (
      <section aria-label={title}>
        <button type="button" onClick={onClose}>모달 닫기 요청</button>
        {children}{footer}
      </section>
    ) : null;
  },
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children, filter, title }: { actions?: ReactNode; children: ReactNode; filter?: ReactNode; title: string }) => (
    <main><h1>{title}</h1>{actions}{filter}{children}</main>
  ),
}));

vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ label }: { label: string }) => <input aria-label={label} />,
}));

// 행 액션은 표의 열 accessor 안에 산다 — 열을 실제로 렌더하는 표 mock 이어야 버튼이 보인다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ header: string; accessor: string | ((item: never, index: number) => ReactNode) }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <table>
      <tbody>
        {data.map((item, rowIndex) => (
          <tr key={rowIndex}>
            {columns.map((column, columnIndex) => (
              <td key={columnIndex}>
                {typeof column.accessor === 'function'
                  ? column.accessor(item as never, rowIndex)
                  : String(item[column.accessor] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/operation/RewardAdminService', () => ({
  rewardAdminService: {
    getRewardList: (...args: unknown[]) => mocks.getRewardList(...args),
    createReward: (...args: unknown[]) => mocks.createReward(...args),
    updateReward: (...args: unknown[]) => mocks.updateReward(...args),
    deleteReward: (...args: unknown[]) => mocks.deleteReward(...args),
  },
}));

const REWARD = { rwrdSn: 7, rwardNm: '모범 사원상', rwardwnrId: 'USER-001', rwardCode: 'R01', rwardDe: '20260826', pblenCn: '공적 내용' };

function pageOf<T>(item: T) {
  return { list: [item], total: 1, page: 1, size: 10, totalPage: 1 };
}

function renderWithClient(node: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, nextReject) => { resolve = next; reject = nextReject; });
  return { promise, resolve, reject };
}

describe('RewardManageClient 행 액션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRewardList.mockResolvedValue(pageOf(REWARD));
    mocks.updateReward.mockResolvedValue(REWARD);
    mocks.deleteReward.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('수정을 누르면 값이 채워진 수정 모달이 열리고, 저장은 update 를 rwrdSn 으로 부르며 승인 상태를 건드리지 않는다', async () => {
    renderWithClient(<RewardManageClient initialPage={pageOf(REWARD)} />);
    fireEvent.click(await screen.findByRole('button', { name: '모범 사원상 수정' }));

    const modal = await screen.findByRole('region', { name: '포상 기록 수정' });
    const scope = within(modal);
    expect(scope.getByRole('textbox', { name: /^포상 명칭/ })).toHaveValue('모범 사원상');
    expect(scope.getByRole('textbox', { name: /수상자 ID/ })).toHaveValue('USER-001');

    fireEvent.change(scope.getByRole('textbox', { name: /^포상 명칭/ }), { target: { value: '우수 사원상' } });
    fireEvent.click(scope.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateReward).toHaveBeenCalledTimes(1));
    expect(mocks.updateReward).toHaveBeenCalledWith(7, expect.objectContaining({ rwardNm: '우수 사원상', rwardCode: 'R01' }));
    expect(mocks.updateReward.mock.calls[0][1]).not.toHaveProperty('confmAt');
    expect(mocks.createReward).not.toHaveBeenCalled();
  });

  it('삭제는 확인 후 delete 를 한 번만 부르고, pending 동안 disabled·aria-busy 이며, 실패는 토스트로 드러낸다', async () => {
    const pending = deferred<void>();
    mocks.deleteReward.mockReturnValue(pending.promise);
    renderWithClient(<RewardManageClient initialPage={pageOf(REWARD)} />);
    const remove = await screen.findByRole('button', { name: '모범 사원상 삭제' });

    fireEvent.click(remove);
    fireEvent.click(remove);

    await waitFor(() => expect(mocks.deleteReward).toHaveBeenCalledTimes(1));
    expect(mocks.deleteReward).toHaveBeenCalledWith(7);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    const busy = screen.getByRole('button', { name: '모범 사원상 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('포상 서버 오류')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('포상 서버 오류', 'error'));
    await waitFor(() => expect(screen.getByRole('button', { name: '모범 사원상 삭제' })).not.toBeDisabled());
  });

  it('확인을 취소하면 delete 를 부르지 않는다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    renderWithClient(<RewardManageClient initialPage={pageOf(REWARD)} />);
    fireEvent.click(await screen.findByRole('button', { name: '모범 사원상 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteReward).not.toHaveBeenCalled();
  });
});

/*
 * [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다.
 * 포상 화면은 조회 권한(REWARD_READ)만으로 들어올 수 있어, 종전에는 조회만 맡은 사람에게도 등록·수정·삭제가 모두 보였고
 * 누른 뒤에야 403 을 만났다. 표시 판정일 뿐이며 서버 인가는 그대로 집행된다.
 */
describe('포상 쓰기 권한 표시', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRewardList.mockResolvedValue(pageOf(REWARD));
  });

  it('조회 권한만 있으면 포상 기록 등록·수정·삭제 버튼을 보이지 않는다', async () => {
    auth.permissions = READ_ONLY_PERMISSIONS;
    renderWithClient(<RewardManageClient initialPage={pageOf(REWARD)} />);

    expect(await screen.findByText('모범 사원상')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '포상 기록 등록' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모범 사원상 수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모범 사원상 삭제' })).not.toBeInTheDocument();
  });

  it('수정 권한이 없어도 공적 내용은 조회 전용 창으로 읽을 수 있다 — 입력은 잠기고 저장 버튼은 없다', async () => {
    // 공적 내용은 목록 열에 없다. 수정 버튼을 가리기만 하면 조회 담당자는 그 값을 볼 길을 잃는다.
    auth.permissions = READ_ONLY_PERMISSIONS;
    renderWithClient(<RewardManageClient initialPage={pageOf(REWARD)} />);
    fireEvent.click(await screen.findByRole('button', { name: '모범 사원상 상세 보기' }));

    const scope = within(await screen.findByRole('region', { name: '포상 기록 상세' }));
    expect(scope.getByRole('textbox', { name: /^포상 명칭/ })).toHaveValue('모범 사원상');
    expect(scope.getByRole('textbox', { name: /^포상 명칭/ })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '수정 저장' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
    expect(mocks.updateReward).not.toHaveBeenCalled();
  });

  it('포상 권한은 동작마다 따로 본다 — 등록 권한만 있으면 등록 버튼만 보인다', async () => {
    auth.permissions = [...READ_ONLY_PERMISSIONS, 'REWARD_CREATE'];
    renderWithClient(<RewardManageClient initialPage={pageOf(REWARD)} />);

    expect(await screen.findByRole('button', { name: '포상 기록 등록' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모범 사원상 수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '모범 사원상 삭제' })).not.toBeInTheDocument();
  });
});

/*
  [2026-10-18 V2_133] 동시 수정 — 창을 열 때 읽은 버전을 그대로 보내고, 서버가 409 로 거부하면 그 사유를 보이며
  덮어쓰지 않는다. 입력한 내용은 창에 남기고 목록을 다시 읽는다.
*/
describe('RewardManageClient 동시 수정', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRewardList.mockResolvedValue(pageOf({ ...REWARD, version: 3 }));
    mocks.confirm.mockResolvedValue(true);
  });

  it('수정 저장은 창을 열 때 읽은 버전을 함께 보낸다', async () => {
    mocks.updateReward.mockResolvedValue(REWARD);
    renderWithClient(<RewardManageClient initialPage={pageOf({ ...REWARD, version: 3 })} />);
    fireEvent.click(await screen.findByRole('button', { name: '모범 사원상 수정' }));
    const scope = within(await screen.findByRole('region', { name: '포상 기록 수정' }));
    fireEvent.click(scope.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateReward).toHaveBeenCalledTimes(1));
    expect(mocks.updateReward).toHaveBeenCalledWith(7, expect.objectContaining({ version: 3 }));
  });

  it('서버가 409 로 거부하면 서버 사유를 보이고 창을 닫지 않으며 목록을 다시 읽는다', async () => {
    const conflict = '다른 사용자가 먼저 수정했습니다. 저장하지 않았으니 최신 내용을 다시 불러온 뒤 고쳐 주세요.';
    mocks.updateReward.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: conflict } } });
    renderWithClient(<RewardManageClient initialPage={pageOf({ ...REWARD, version: 3 })} />);
    fireEvent.click(await screen.findByRole('button', { name: '모범 사원상 수정' }));
    const modal = await screen.findByRole('region', { name: '포상 기록 수정' });
    fireEvent.change(within(modal).getByRole('textbox', { name: /^포상 명칭/ }), { target: { value: '내가 고친 이름' } });
    const listCallsBefore = mocks.getRewardList.mock.calls.length;
    fireEvent.click(within(modal).getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(conflict, 'error'));
    expect(screen.getByRole('region', { name: '포상 기록 수정' })).toBeInTheDocument();
    expect(within(modal).getByRole('textbox', { name: /^포상 명칭/ })).toHaveValue('내가 고친 이름');
    await waitFor(() => expect(mocks.getRewardList.mock.calls.length).toBeGreaterThan(listCallsBefore));
  });
});
