import type { ReactElement, ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExternalHrClient from '../external-hr/ExternalHrClient';
import RewardManageClient from '../rewards/RewardManageClient';

const mocks = vi.hoisted(() => ({
  getEvents: vi.fn(),
  createExternalHr: vi.fn(),
  createReward: vi.fn(),
  getExternalHrList: vi.fn(),
  getRewardList: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/operation/external-hr',
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

vi.mock('@/services/foundation/operation/eventService', () => ({
  eventService: {
    getEvents: (...args: unknown[]) => mocks.getEvents(...args),
  },
}));

vi.mock('@/services/foundation/operation/OperationAdminService', () => ({
  operationAdminService: {
    createExternalHr: (...args: unknown[]) => mocks.createExternalHr(...args),
    createReward: (...args: unknown[]) => mocks.createReward(...args),
    getExternalHrList: (...args: unknown[]) => mocks.getExternalHrList(...args),
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

async function fillExternalHrForm() {
  // 컨트롤이 숫자 입력에서 선택으로 바뀌었다(대상 변경이지 단언 약화가 아니다).
  // 선택지는 조회 후 채워진다 — 옵션이 렌더되기 전에 값을 바꾸면 select 가 무시한다.
  await screen.findByRole('option', { name: '가을 워크숍' });
  fireEvent.change(screen.getByRole('combobox', { name: /소속 행사/ }), { target: { value: '1' } });
  fillTextBox(/외부인사 ID/, 'HR-001');
  fillTextBox(/^성명.*필수/, '홍길동');
  fillTextBox(/소속기관/, '테스트 기관');
  fillTextBox(/지역번호/, '02');
  fillTextBox(/국번/, '1234');
  fillTextBox(/종번/, '5678');
  fillTextBox(/^이메일.*필수/, 'tester@example.com');
  fillTextBox(/생년월일/, '19900101');
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

describe('operation useAppForm consumers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getExternalHrList.mockResolvedValue(EMPTY_PAGE);
    mocks.getRewardList.mockResolvedValue(EMPTY_PAGE);
    // [2026-08-28] 행사 일련번호 자유 입력 → 선택. 선택지가 있어야 폼을 채울 수 있다.
    mocks.getEvents.mockResolvedValue({ list: [{ evntSn: 1, evntNm: '가을 워크숍' }], total: 1, totalPage: 1 });
    mocks.createExternalHr.mockResolvedValue({});
    mocks.createReward.mockResolvedValue({});
  });

  it('ExternalHr: invalid submit은 write 없이 summary와 첫 필드로 연결된다', async () => {
    renderWithClient(<ExternalHrClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /인사 등록/ }));
    const firstField = screen.getByRole('combobox', { name: /소속 행사/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('textbox', { name: /외부인사 ID/ })).toHaveAttribute('maxlength', '20');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    expect(mocks.createExternalHr).not.toHaveBeenCalled();
  });

  it('ExternalHr: server field error를 보존한 값과 해당 필드에 연결한다', async () => {
    const message = '이미 등록된 외부인사입니다.';
    mocks.createExternalHr.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'otsdHrNm', message }] } },
    });
    renderWithClient(<ExternalHrClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /인사 등록/ }));
    await fillExternalHrForm();

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    expect(await screen.findByText(message)).toBeVisible();
    const target = screen.getByRole('textbox', { name: /^성명.*필수/ });
    await waitFor(() => expect(target).toHaveFocus());
    expect(target).toHaveValue('홍길동');
    expect(target).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.toast).not.toHaveBeenCalledWith('등록 중 오류가 발생했습니다.', 'error');
  });

  it('ExternalHr: 같은 tick의 중복 제출을 동기 lock으로 차단한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createExternalHr.mockReturnValueOnce(pending.promise);
    renderWithClient(<ExternalHrClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /인사 등록/ }));
    await fillExternalHrForm();
    const submit = screen.getByRole('button', { name: /최종 등록/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.createExternalHr).toHaveBeenCalledTimes(1));
    await act(async () => pending.resolve({}));
  });

  it('ExternalHr: native submit을 지원하고 저장 중 닫기를 막아 서버 오류 위치를 보존한다', async () => {
    const pending = deferred<Record<string, never>>();
    mocks.createExternalHr.mockReturnValueOnce(pending.promise);
    renderWithClient(<ExternalHrClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /인사 등록/ }));
    await fillExternalHrForm();
    const modal = screen.getByRole('region', { name: '외부 인사 정보 등록' });
    const formElement = modal.querySelector('form')!;

    fireEvent.submit(formElement);

    await waitFor(() => expect(mocks.createExternalHr).toHaveBeenCalledTimes(1));
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '모달 닫기 요청' }));
    expect(screen.getByRole('region', { name: '외부 인사 정보 등록' })).toBeVisible();

    await act(async () => pending.reject({
      response: { data: { errors: [{ field: 'otsdHrNm', message: '저장할 수 없는 외부인사입니다.' }] } },
    }));
    expect(await screen.findByText('저장할 수 없는 외부인사입니다.')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /^성명.*필수/ })).toHaveValue('홍길동');
    expect(cancel).toBeEnabled();
  });

  it('Reward: invalid submit은 write 없이 summary와 첫 필드로 연결된다', async () => {
    renderWithClient(<RewardManageClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /포상 기록 등록/ }));
    const firstField = screen.getByRole('textbox', { name: /^포상 명칭.*필수/ });

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    await waitFor(() => expect(firstField).toHaveFocus());
    expect(firstField).toHaveAttribute('aria-required', 'true');
    expect(firstField).toHaveAttribute('aria-invalid', 'true');
    expect(firstField).toHaveAttribute('maxlength', '100');
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

  it('ExternalHr: 폼이 묻지 않은 필드는 지어내 보내지 않는다', async () => {
    // 종전에는 gndrCd:'M' 과 crTypeCd:'STANDARD' 를 덧붙여, 성별을 한 번도 묻지 않는 이 화면이
    // 등록되는 모든 외부 인사를 남성으로 저장했다. 두 컬럼 모두 nullable 이고 읽는 곳도 없다.
    // 이 계약은 "화면이 받지 않은 값을 payload 가 창작하지 않는다"를 고정한다.
    renderWithClient(<ExternalHrClient initialPage={EMPTY_PAGE} />);
    fireEvent.click(screen.getByRole('button', { name: /인사 등록/ }));
    await fillExternalHrForm();

    fireEvent.click(screen.getByRole('button', { name: /최종 등록/ }));

    await waitFor(() => expect(mocks.createExternalHr).toHaveBeenCalledTimes(1));
    const payload = mocks.createExternalHr.mock.calls[0][0] as Record<string, unknown>;

    expect(payload).not.toHaveProperty('gndrCd');
    expect(payload).not.toHaveProperty('crTypeCd');
    // 사용자가 실제로 입력한 값은 그대로 전달돼야 한다 — 축소가 아니라 창작만 막는 계약이다.
    expect(payload.otsdHrNm).toBe('홍길동');
    expect(payload.otsdHrId).toBe('HR-001');
  });
});
