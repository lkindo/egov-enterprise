import type { ReactElement, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RewardManageClient from '../RewardManageClient';

const mocks = vi.hoisted(() => ({
  createReward: vi.fn(),
  getRewardList: vi.fn(),
  toast: vi.fn(),
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 쓰기 권한을 모두 가진 관리자로 렌더한다.
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['REWARD_READ', 'REWARD_CREATE', 'REWARD_UPDATE', 'REWARD_DELETE'], authorizationVersion: 'v1' } }) }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/operation/rewards',
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function TestModal({
    children,
    footer,
    isOpen,
    onClose,
    title,
  }: {
    children: ReactNode;
    footer?: ReactNode;
    isOpen: boolean;
    onClose?: () => void;
    title: string;
  }) {
    return isOpen ? (
      <section aria-label={title}>
        <button type="button" onClick={onClose}>모달 닫기 요청</button>
        {children}{footer}
      </section>
    ) : null;
  },
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({
    actions,
    children,
    filter,
    title,
  }: {
    actions?: ReactNode;
    children: ReactNode;
    filter?: ReactNode;
    title: string;
  }) => <main><h1>{title}</h1>{actions}{filter}{children}</main>,
}));

vi.mock('@/app/components/patterns/keyword-filter', () => ({
  KeywordFilter: ({ label }: { label: string }) => <input aria-label={label} />,
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: () => <div data-testid="data-table" />,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));


vi.mock('@/services/foundation/operation/RewardAdminService', () => ({
  rewardAdminService: {
    createReward: (...args: unknown[]) => mocks.createReward(...args),
    getRewardList: (...args: unknown[]) => mocks.getRewardList(...args),
  },
}));

const EMPTY_PAGE = { list: [], total: 0, page: 1, size: 10, totalPage: 1 };

function renderWithClient(node: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function fillTextBox(name: RegExp, value: string) {
  fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
}

function fillRewardForm() {
  fillTextBox(/^포상 명칭.*필수/, '모범 사원상');
  fillTextBox(/수상자 ID/, 'USER-001');
  fillTextBox(/포상 코드/, 'R01');
  fillTextBox(/포상 일자/, '20260826');
  fillTextBox(/공적 내용/, '공적 내용');
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, nextReject) => {
    resolve = next;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe('RewardManageClient useAppForm 소비', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRewardList.mockResolvedValue(EMPTY_PAGE);
    mocks.createReward.mockResolvedValue({});
  });

  it('Reward: invalid submit은 write 없이 summary와 첫 필드로 연결된다', async () => {
    renderWithClient(<RewardManageClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /포상 기록 등록/ }));
    const firstField = screen.getByRole('textbox', { name: /^포상 명칭.*필수/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    expect(firstField).toHaveAttribute('maxlength', '300');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    expect(mocks.createReward).not.toHaveBeenCalled();
  });

  it('Reward: server field error를 inline summary와 해당 필드에 연결한다', async () => {
    const message = '포상 명칭이 중복되었습니다.';
    mocks.createReward.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'rwardNm', message }] } },
    });
    renderWithClient(<RewardManageClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /포상 기록 등록/ }));
    fillRewardForm();

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    expect(await screen.findByText(message)).toBeVisible();
    const target = screen.getByRole('textbox', { name: /^포상 명칭.*필수/ });
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveValue('모범 사원상');
    expect(target).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.toast).not.toHaveBeenCalledWith('포상 기록 등록 중 오류가 발생했습니다.', 'error');
  });

  it('Reward: 등록 본문에 승인 필드를 싣지 않는다 — 승인 절차가 없어 계약에서 걷었다 (DIP I6 ③, 2026-10-19)', async () => {
    mocks.createReward.mockResolvedValueOnce({});
    renderWithClient(<RewardManageClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /포상 기록 등록/ }));
    fillRewardForm();

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    await waitFor(() => expect(mocks.createReward).toHaveBeenCalledTimes(1));
    const body = mocks.createReward.mock.calls[0][0];
    expect(body).toMatchObject({ rwardNm: '모범 사원상' });
    for (const serverOwned of ['confmAt', 'sanctnerId', 'sanctnDt', 'returnResn', 'ifmlAtrzSn']) {
      expect(body).not.toHaveProperty(serverOwned);
    }
  });

  it('Reward: 같은 tick의 중복 제출을 동기 lock으로 차단한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createReward.mockReturnValueOnce(pending.promise);
    renderWithClient(<RewardManageClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /포상 기록 등록/ }));
    fillRewardForm();
    const submit = screen.getByRole('button', { name: /최종 등록/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createReward).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve({}));
  });

  it('Reward: native submit을 지원하고 저장 중 닫기를 막아 서버 오류 위치를 보존한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createReward.mockReturnValueOnce(pending.promise);
    renderWithClient(<RewardManageClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /포상 기록 등록/ }));
    fillRewardForm();
    const modal = screen.getByRole('region', { name: '포상 기록 등록' });

    fireEvent.submit(modal.querySelector('form')!);

    await waitFor(() => expect(mocks.createReward).toHaveBeenCalledTimes(1));
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '모달 닫기 요청' }));
    expect(screen.getByRole('region', { name: '포상 기록 등록' })).toBeVisible();

    await act(async () => pending.reject({
      response: { data: { errors: [{ field: 'rwardNm', message: '저장할 수 없는 포상 명칭입니다.' }] } },
    }));
    expect(await screen.findByText('저장할 수 없는 포상 명칭입니다.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /^포상 명칭.*필수/ })).toHaveValue('모범 사원상');
    expect(cancel).toBeEnabled();
  });
});
