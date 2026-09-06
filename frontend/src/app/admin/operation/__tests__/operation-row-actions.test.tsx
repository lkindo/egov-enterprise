import type { ReactElement, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExternalHrClient from '../external-hr/ExternalHrClient';
import RewardManageClient from '../rewards/RewardManageClient';

/**
 * 🛠 운영 도메인 정정 경로 — 외부인사·포상의 행 액션(수정·삭제) 계약.
 *
 * [2026-09-05 DEC-OPS-036] 종전에는 두 화면 모두 등록만 되고 고칠 수 없었다(감사 D11-01). 판정은
 * "어느 식별자로 어떤 sink 를 부르는가" 다 — 외부인사는 복합키(evntSn·otsdHrId)를 경로로 보내고 그
 * 두 입력은 수정 모달에서 잠긴다. 삭제는 확인 후 한 번만 부르고, pending 동안 disabled·aria-busy 이며,
 * 실패는 토스트로 드러난다(폼 검증 census 의 destructive action 계약).
 */
const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getExternalHrList: vi.fn(),
  createExternalHr: vi.fn(),
  updateExternalHr: vi.fn(),
  deleteExternalHr: vi.fn(),
  getRewardList: vi.fn(),
  createReward: vi.fn(),
  updateReward: vi.fn(),
  deleteReward: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/operation/external-hr',
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
vi.mock('@/services/foundation/operation/eventService', () => ({
  eventService: { getEvents: (...args: unknown[]) => mocks.getEvents(...args) },
}));
vi.mock('@/services/foundation/operation/OperationAdminService', () => ({
  operationAdminService: {
    getExternalHrList: (...args: unknown[]) => mocks.getExternalHrList(...args),
    createExternalHr: (...args: unknown[]) => mocks.createExternalHr(...args),
    updateExternalHr: (...args: unknown[]) => mocks.updateExternalHr(...args),
    deleteExternalHr: (...args: unknown[]) => mocks.deleteExternalHr(...args),
    getRewardList: (...args: unknown[]) => mocks.getRewardList(...args),
    createReward: (...args: unknown[]) => mocks.createReward(...args),
    updateReward: (...args: unknown[]) => mocks.updateReward(...args),
    deleteReward: (...args: unknown[]) => mocks.deleteReward(...args),
  },
}));

const HR = {
  evntSn: 1, otsdHrId: 'HR-001', otsdHrNm: '홍길동', ogdpInstNm: '테스트 기관',
  areaNo: '02', mdTelno: '1234', endTelno: '5678', emlAddr: 'hong@example.com', brdtYmd: '19900101',
};
/**
 * 식별자만 있는 행 — API·이관으로 최소 필드만 들어오면 이 모습이다.
 * 서버 DTO·엔티티·물리 컬럼 어디에도 이 값들이 필수라는 선언이 없다(DEC-OPS-045).
 */
const SPARSE_HR = {
  evntSn: 1, otsdHrId: 'HR-002', otsdHrNm: null, ogdpInstNm: null,
  areaNo: null, mdTelno: null, endTelno: null, emlAddr: null, brdtYmd: null,
};

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

describe('ExternalHrClient 행 액션', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvents.mockResolvedValue({ list: [{ evntSn: 1, evntNm: '가을 워크숍' }], total: 1, page: 1, size: 200, totalPage: 1 });
    mocks.getExternalHrList.mockResolvedValue(pageOf(HR));
    mocks.updateExternalHr.mockResolvedValue(HR);
    mocks.deleteExternalHr.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('수정을 누르면 값이 채워진 수정 모달이 열리고 식별자 입력은 잠기며, 저장은 update 를 복합키로 부른다', async () => {
    renderWithClient(<ExternalHrClient initialPage={pageOf(HR)} />);
    fireEvent.click(await screen.findByRole('button', { name: '홍길동 수정' }));

    const modal = await screen.findByRole('region', { name: '외부 인사 정보 수정' });
    const scope = within(modal);
    expect(scope.getByRole('textbox', { name: /외부인사 ID/ })).toHaveValue('HR-001');
    expect(scope.getByRole('textbox', { name: /외부인사 ID/ })).toBeDisabled();
    expect(scope.getByRole('combobox', { name: /소속 행사/ })).toBeDisabled();
    expect(scope.getByRole('textbox', { name: /^성명/ })).toHaveValue('홍길동');

    fireEvent.change(scope.getByRole('textbox', { name: /^성명/ }), { target: { value: '홍길순' } });
    fireEvent.click(scope.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateExternalHr).toHaveBeenCalledTimes(1));
    expect(mocks.updateExternalHr).toHaveBeenCalledWith(1, 'HR-001', expect.objectContaining({ otsdHrNm: '홍길순', emlAddr: 'hong@example.com' }));
    expect(mocks.createExternalHr).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('외부인사 정보를 수정했습니다.', 'success');
  });

  it('빈 칸이 많은 행도 이름만 고쳐 저장된다 — 등록 필수 규칙을 수정에 강제하지 않는다', async () => {
    mocks.getExternalHrList.mockResolvedValue(pageOf(SPARSE_HR));
    mocks.updateExternalHr.mockResolvedValue(SPARSE_HR);
    renderWithClient(<ExternalHrClient initialPage={pageOf(SPARSE_HR)} />);

    fireEvent.click(await screen.findByRole('button', { name: 'HR-002 수정' }));
    const modal = await screen.findByRole('region', { name: '외부 인사 정보 수정' });
    const scope = within(modal);

    // 소속기관·연락처·이메일·생년월일은 비어 있는 그대로 둔다.
    fireEvent.change(scope.getByRole('textbox', { name: /^성명/ }), { target: { value: '김철수' } });
    fireEvent.click(scope.getByRole('button', { name: '수정 저장' }));

    await waitFor(() => expect(mocks.updateExternalHr).toHaveBeenCalledTimes(1));
    expect(mocks.updateExternalHr).toHaveBeenCalledWith(1, 'HR-002', expect.objectContaining({ otsdHrNm: '김철수' }));
    expect(mocks.toast).toHaveBeenCalledWith('외부인사 정보를 수정했습니다.', 'success');
  });

  it('수정에서도 형식은 본다 — 이메일이 형식에 맞지 않으면 저장하지 않는다', async () => {
    mocks.getExternalHrList.mockResolvedValue(pageOf(SPARSE_HR));
    renderWithClient(<ExternalHrClient initialPage={pageOf(SPARSE_HR)} />);

    fireEvent.click(await screen.findByRole('button', { name: 'HR-002 수정' }));
    const modal = await screen.findByRole('region', { name: '외부 인사 정보 수정' });
    const scope = within(modal);

    fireEvent.change(scope.getByRole('textbox', { name: /^이메일/ }), { target: { value: 'not-an-email' } });
    fireEvent.click(scope.getByRole('button', { name: '수정 저장' }));

    await waitFor(() =>
      expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/));
    expect(mocks.updateExternalHr).not.toHaveBeenCalled();
  });

  it('등록은 종전대로 필수를 요구한다 — 완화는 수정 모드에만 적용된다', async () => {
    renderWithClient(<ExternalHrClient initialPage={pageOf(HR)} />);

    fireEvent.click(await screen.findByRole('button', { name: /인사 등록/ }));
    const modal = await screen.findByRole('region', { name: '외부 인사 정보 등록' });
    const scope = within(modal);

    await screen.findByRole('option', { name: '가을 워크숍' });
    fireEvent.change(scope.getByRole('combobox', { name: /소속 행사/ }), { target: { value: '1' } });
    fireEvent.change(scope.getByRole('textbox', { name: /외부인사 ID/ }), { target: { value: 'HR-003' } });
    fireEvent.change(scope.getByRole('textbox', { name: /^성명/ }), { target: { value: '이영희' } });
    fireEvent.click(scope.getByRole('button', { name: '최종 등록' }));

    await waitFor(() =>
      expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/));
    expect(mocks.createExternalHr).not.toHaveBeenCalled();
  });

  it('삭제는 확인 후 delete 를 한 번만 부르고, pending 동안 disabled·aria-busy 이며, 실패는 토스트로 드러낸다', async () => {
    const pending = deferred<void>();
    mocks.deleteExternalHr.mockReturnValue(pending.promise);
    renderWithClient(<ExternalHrClient initialPage={pageOf(HR)} />);
    const remove = await screen.findByRole('button', { name: '홍길동 삭제' });

    fireEvent.click(remove);
    fireEvent.click(remove);

    await waitFor(() => expect(mocks.deleteExternalHr).toHaveBeenCalledTimes(1));
    expect(mocks.deleteExternalHr).toHaveBeenCalledWith(1, 'HR-001');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive' }));
    const busy = screen.getByRole('button', { name: '홍길동 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('삭제 권한이 없습니다.')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 권한이 없습니다.', 'error'));
    await waitFor(() => expect(screen.getByRole('button', { name: '홍길동 삭제' })).not.toBeDisabled());
  });

  it('확인을 취소하면 delete 를 부르지 않는다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    renderWithClient(<ExternalHrClient initialPage={pageOf(HR)} />);
    fireEvent.click(await screen.findByRole('button', { name: '홍길동 삭제' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteExternalHr).not.toHaveBeenCalled();
  });
});

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
