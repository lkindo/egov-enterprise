import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
/*
  [2026-09-12 §A3-1] 등록이 전용 페이지에서 목록 위 모달로 바뀌었다.
  계약(검증 인라인 연결·서버 필드 오류 귀속·동기 잠금)은 그대로이고 그릇만 바뀐다.
*/
import { SurveyFormDialog } from '../SurveyFormDialog';

const onSaved = vi.fn();
const SurveyManageCreateClient = () => (
  <SurveyFormDialog isOpen mode="create" onClose={() => {}} onSaved={onSaved} />
);

/*
  [2026-09-12 §A3-1] 수정도 전용 라우트를 떠나 같은 모달이 소유한다. 상세 라우트는 열람만 남는다.
  계약(검증 인라인 연결·서버 필드 오류 귀속·동기 잠금)은 그대로이고 그릇만 바뀐다 —
  그래서 이 3건은 **삭제가 아니라 소유자 이동**이다.
*/
const SurveyManageEditClient = () => (
  <SurveyFormDialog
    isOpen
    mode="edit"
    pollSn={7}
    initialValues={{
      pollNm: '기존 설문',
      pollKndCd: '001',
      pollDsuseYn: 'N',
      beginDate: new Date(2026, 7, 26),
      endDate: new Date(2026, 7, 27),
    }}
    onClose={() => {}}
    onSaved={onSaved}
  />
);

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
  useParams: () => ({ id: '7' }),
}));
vi.mock('@/services/business/user/poll/PollUserService', () => ({
  createPoll: mocks.create,
  pollUserService: {
    updatePoll: mocks.update,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}));
vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect: (date: Date) => void }) => (
    <button type="button" onClick={() => onSelect(new Date(2026, 7, 26))}>2026년 8월 26일 선택</button>
  ),
}));
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectTrigger: ({ children, ...props }: React.ComponentProps<'button'>) => <button type="button" {...props}>{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

function renderWithQueryClient(node: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((next) => { resolve = next; });
  return { promise, resolve };
}

describe('survey manage validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.create.mockResolvedValue(undefined);
    mocks.update.mockResolvedValue(undefined);
  });

  it('does not create an invalid poll and focuses the first invalid field', async () => {
    renderWithQueryClient(<SurveyManageCreateClient />);

    const title = screen.getByLabelText('설문명 (필수)');
    fireEvent.click(screen.getByRole('button', { name: /설문 등록/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('설문명을 입력해 주세요.')).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('수정 모달은 빈 설문명을 보내지 않고 그 입력으로 포커스를 옮긴다', async () => {
    renderWithQueryClient(<SurveyManageEditClient />);

    const title = await screen.findByLabelText('설문명 (필수)');
    fireEvent.change(title, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /설문 수정/ }));

    expect(mocks.update).not.toHaveBeenCalled();
    expect(await screen.findByText('설문명을 입력해 주세요.')).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('create 저장은 같은 tick에 한 번만 전송한다', async () => {
    const pending = deferred<void>();
    mocks.create.mockReturnValueOnce(pending.promise);
    renderWithQueryClient(<SurveyManageCreateClient />);
    fireEvent.change(screen.getByLabelText('설문명 (필수)'), { target: { value: '신규 설문' } });
    const dates = screen.getAllByRole('button', { name: '2026년 8월 26일 선택' });
    fireEvent.click(dates[0]);
    fireEvent.click(dates[1]);
    const submit = screen.getByRole('button', { name: /설문 등록/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    await act(async () => pending.resolve());
  });

  it('수정 저장은 같은 tick에 한 번만 전송한다', async () => {
    const pending = deferred<void>();
    mocks.update.mockReturnValueOnce(pending.promise);
    renderWithQueryClient(<SurveyManageEditClient />);
    await screen.findByDisplayValue('기존 설문');
    const submit = screen.getByRole('button', { name: /설문 수정/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    await act(async () => pending.resolve());
  });

  it('create 서버 필드 오류를 inline으로 연결하고 입력값을 유지한 채 해당 필드로 이동한다', async () => {
    mocks.create.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'pollNm', message: '동일한 설문명이 이미 존재합니다.' }] } },
    });
    renderWithQueryClient(<SurveyManageCreateClient />);
    const title = screen.getByLabelText('설문명 (필수)');
    fireEvent.change(title, { target: { value: '입력한 신규 설문' } });
    const dates = screen.getAllByRole('button', { name: '2026년 8월 26일 선택' });
    fireEvent.click(dates[0]);
    fireEvent.click(dates[1]);

    fireEvent.click(screen.getByRole('button', { name: /설문 등록/ }));

    expect(await screen.findByText('동일한 설문명이 이미 존재합니다.')).toBeVisible();
    expect(title).toHaveValue('입력한 신규 설문');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAttribute('aria-errormessage', 'pollNm-error');
    await waitFor(() => expect(title).toHaveFocus());
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it('수정 모달이 서버 필드 오류를 inline으로 연결하고 수정값을 유지한 채 해당 필드로 이동한다', async () => {
    mocks.update.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'pollNm', message: '수정할 수 없는 설문명입니다.' }] } },
    });
    renderWithQueryClient(<SurveyManageEditClient />);
    const title = await screen.findByLabelText('설문명 (필수)');
    fireEvent.change(title, { target: { value: '사용자가 수정한 설문명' } });

    fireEvent.click(screen.getByRole('button', { name: /설문 수정/ }));

    expect(await screen.findByText('수정할 수 없는 설문명입니다.')).toBeVisible();
    expect(title).toHaveValue('사용자가 수정한 설문명');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAttribute('aria-errormessage', 'pollNm-error');
    await waitFor(() => expect(title).toHaveFocus());
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
