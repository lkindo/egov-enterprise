import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SurveyManageCreateClient from '../create/SurveyManageCreateClient';
import SurveyManageDetailClient from '../[id]/SurveyManageDetailClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  create: vi.fn(),
  detail: vi.fn(),
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
    getPollDetail: mocks.detail,
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
    mocks.detail.mockResolvedValue({
      pollSn: 7,
      pollNm: '기존 설문',
      pollBgngYmd: '20260826',
      pollEndYmd: '20260827',
      pollKndCd: '001',
      pollDsuseYn: 'N',
    });
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

  it('keeps detail values and focuses the invalid title instead of calling update', async () => {
    renderWithQueryClient(<SurveyManageDetailClient />);

    const title = await screen.findByLabelText('설문명 (필수)');
    fireEvent.change(title, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /설정 저장/ }));

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

  it('detail 저장은 같은 tick에 한 번만 전송한다', async () => {
    const pending = deferred<void>();
    mocks.update.mockReturnValueOnce(pending.promise);
    renderWithQueryClient(<SurveyManageDetailClient />);
    await screen.findByDisplayValue('기존 설문');
    const submit = screen.getByRole('button', { name: /설정 저장/ });

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

  it('detail 서버 필드 오류를 inline으로 연결하고 수정값을 유지한 채 해당 필드로 이동한다', async () => {
    mocks.update.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'pollNm', message: '수정할 수 없는 설문명입니다.' }] } },
    });
    renderWithQueryClient(<SurveyManageDetailClient />);
    const title = await screen.findByLabelText('설문명 (필수)');
    fireEvent.change(title, { target: { value: '사용자가 수정한 설문명' } });

    fireEvent.click(screen.getByRole('button', { name: /설정 저장/ }));

    expect(await screen.findByText('수정할 수 없는 설문명입니다.')).toBeVisible();
    expect(title).toHaveValue('사용자가 수정한 설문명');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(title).toHaveAttribute('aria-errormessage', 'pollNm-error');
    await waitFor(() => expect(title).toHaveFocus());
    expect(mocks.error).not.toHaveBeenCalled();
  });
});
