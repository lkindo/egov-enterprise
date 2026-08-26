import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnlinePollAdminClient from '../OnlinePollAdminClient';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/survey/polls',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/services/foundation/system/OnlinePollAdminService', () => ({
  onlinePollAdminService: {
    getPollList: mocks.list,
    createPoll: mocks.create,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ success: mocks.success, error: mocks.error }),
}));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, filter, children }: {
    actions: React.ReactNode;
    filter: React.ReactNode;
    children: React.ReactNode;
  }) => <main>{actions}{filter}{children}</main>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: () => <div>설문 목록</div>,
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <section aria-label="신규 설문 등록">{children}</section>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <footer>{children}</footer>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OnlinePollAdminClient />
    </QueryClientProvider>,
  );
}

describe('OnlinePollAdminClient validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ list: [], total: 0 });
    mocks.create.mockResolvedValue(undefined);
  });

  it('blocks an incomplete poll and focuses its first invalid field', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 설문 등록/ }));

    const dialog = screen.getByRole('region', { name: '신규 설문 등록' });
    const title = within(dialog).getByLabelText('설문명');
    fireEvent.click(within(dialog).getByRole('button', { name: /설문 등록/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('설문명을 입력해 주세요.')).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('maps server field errors back to the editable value without closing the dialog', async () => {
    mocks.create.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'pollNm', message: '이미 사용 중인 설문명입니다.' }] } },
    });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 설문 등록/ }));
    const dialog = screen.getByRole('region', { name: '신규 설문 등록' });
    const title = within(dialog).getByLabelText('설문명');
    fireEvent.change(title, { target: { value: '중복 설문' } });
    fireEvent.change(within(dialog).getByLabelText('선택 항목 1 내용'), { target: { value: '찬성' } });
    fireEvent.change(within(dialog).getByLabelText('선택 항목 2 내용'), { target: { value: '반대' } });

    fireEvent.click(within(dialog).getByRole('button', { name: /설문 등록/ }));

    expect(await screen.findByText('이미 사용 중인 설문명입니다.')).toBeInTheDocument();
    expect(title).toHaveValue('중복 설문');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it('uses a synchronous pending guard to prevent duplicate create requests', async () => {
    let resolveCreate!: () => void;
    mocks.create.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveCreate = resolve; }));
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 설문 등록/ }));
    const dialog = screen.getByRole('region', { name: '신규 설문 등록' });
    fireEvent.change(within(dialog).getByLabelText('설문명'), { target: { value: '한 번만 등록' } });
    fireEvent.change(within(dialog).getByLabelText('선택 항목 1 내용'), { target: { value: '찬성' } });
    fireEvent.change(within(dialog).getByLabelText('선택 항목 2 내용'), { target: { value: '반대' } });

    const submit = within(dialog).getByRole('button', { name: /설문 등록/ });
    act(() => {
      submit.click();
      submit.click();
    });
    expect(mocks.create).toHaveBeenCalledTimes(1);

    resolveCreate();
    await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  });
});
