import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import EventManagementClient from '../EventManagementClient';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  getEvents: vi.fn(),
  replace: vi.fn(),
  toast: vi.fn(),
}));

// 쓰기 버튼은 그 동작의 기능 권한으로 보인다 — 기본은 쓰기 권한을 모두 가진 관리자이고, 표시 판정 테스트만 권한을 줄인다.
const READ_ONLY_PERMISSIONS = ['EVENT_READ'];
const FULL_PERMISSIONS = [...READ_ONLY_PERMISSIONS, 'EVENT_CREATE', 'EVENT_UPDATE', 'EVENT_DELETE'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));
beforeEach(() => { auth.permissions = FULL_PERMISSIONS; });

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/operation/events',
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/services/foundation/operation/eventService', () => ({
  eventService: {
    createEvent: mocks.createEvent,
    deleteEvent: mocks.deleteEvent,
    getEvent: mocks.getEvent,
    getEvents: mocks.getEvents,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));


vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, filter, children }: { actions?: ReactNode; filter?: ReactNode; children?: ReactNode }) => (
    <main>{actions}{filter}{children}</main>
  ),
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: any) => (
    <div data-testid="event-list">
      {data.map((item: any, rowIndex: number) => (
        <div key={item.evntSn ?? rowIndex}>
          {columns.map((column: any, columnIndex: number) => (
            <span key={columnIndex}>{column.accessor(item, rowIndex)}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EventManagementClient />
    </QueryClientProvider>,
  );
}

async function openCreateDialog(user: ReturnType<typeof userEvent.setup>) {
  renderClient();
  await user.click(screen.getByRole('button', { name: /행사 등록/ }));
  const dialog = await screen.findByRole('dialog');
  const scope = within(dialog);
  const submit = scope.getByRole('button', { name: /행사 등록/ });
  return {
    dialog,
    name: scope.getByRole('textbox', { name: '행사 명칭' }),
    content: scope.getByRole('textbox', { name: '상세 내용' }),
    begin: scope.getByLabelText('행사 시작일'),
    end: scope.getByLabelText('행사 종료일'),
    capacity: scope.getByRole('spinbutton', { name: '참여 정원 (명)' }),
    cancel: scope.getByRole('button', { name: '취소' }),
    submit,
    form: submit.closest('form')!,
  };
}

async function enterValidEvent(user: ReturnType<typeof userEvent.setup>) {
  const fields = await openCreateDialog(user);
  await user.type(fields.name, '사내 행사');
  await user.type(fields.content, '사내 행사 상세 내용');
  fireEvent.change(fields.begin, { target: { value: '2026-09-01' } });
  fireEvent.change(fields.end, { target: { value: '2026-09-02' } });
  fireEvent.change(fields.capacity, { target: { value: '20' } });
  return fields;
}

describe('EventManagementClient create validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.createEvent.mockResolvedValue(1);
    mocks.deleteEvent.mockResolvedValue(undefined);
    mocks.getEvents.mockResolvedValue({ list: [], total: 0 });
  });

  it('행사명 max+1을 write sink로 보내지 않고 해당 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    const fields = await enterValidEvent(user);
    fireEvent.change(fields.name, { target: { value: '가'.repeat(201) } });

    fireEvent.submit(fields.form);

    expect(mocks.createEvent).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 200자/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('종료일이 시작일보다 빠르면 write sink를 차단하고 종료일로 이동한다', async () => {
    const user = userEvent.setup();
    const fields = await enterValidEvent(user);
    fireEvent.change(fields.end, { target: { value: '2026-08-31' } });

    fireEvent.submit(fields.form);

    expect(mocks.createEvent).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/종료일.*시작일/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.end).toHaveFocus());
  });

  it('음수 참여 정원을 write sink로 보내지 않는다', async () => {
    const user = userEvent.setup();
    const fields = await enterValidEvent(user);
    fireEvent.change(fields.capacity, { target: { value: '-1' } });

    fireEvent.submit(fields.form);

    expect(mocks.createEvent).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/0명 이상/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.capacity).toHaveFocus());
  });

  it('필수값이 비어 있으면 summary와 inline 오류를 보이고 첫 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    const fields = await openCreateDialog(user);

    fireEvent.submit(fields.form);

    expect(mocks.createEvent).not.toHaveBeenCalled();
    await waitFor(() => expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument());
    expect(await screen.findAllByText(/행사 명칭.*입력/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('등록 pending 중 닫기를 막고 서버 필드 오류 뒤 modal·입력·summary를 보존한다', async () => {
    let rejectCreate!: (reason?: unknown) => void;
    mocks.createEvent.mockReturnValueOnce(new Promise<number>((_, reject) => {
      rejectCreate = reject;
    }));
    const user = userEvent.setup();
    const fields = await enterValidEvent(user);

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.createEvent).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.submit).toHaveAccessibleName('등록 중...');
    expect(fields.cancel).toBeDisabled();
    fireEvent.click(fields.cancel);
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('dialog')).toBeVisible();

    await act(async () => rejectCreate({
      response: { data: { errors: [{ field: 'evntNm', message: '등록할 수 없는 행사 명칭입니다.' }] } },
    }));

    expect(await screen.findAllByText('등록할 수 없는 행사 명칭입니다.')).not.toHaveLength(0);
    expect(fields.name).toHaveValue('사내 행사');
    expect(fields.content).toHaveValue('사내 행사 상세 내용');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('등록할 수 없는 행사 명칭입니다.');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(fields.cancel).toBeEnabled();
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('일반 서버 오류는 토스트로 안내하고 입력값을 보존한다', async () => {
    mocks.createEvent.mockRejectedValueOnce(new Error('행사 서버에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    const fields = await enterValidEvent(user);

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('행사 서버에 연결할 수 없습니다.', 'error'));
    expect(fields.name).toHaveValue('사내 행사');
    expect(fields.content).toHaveValue('사내 행사 상세 내용');
  });

  it('등록 pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveCreate!: (value: number) => void;
    mocks.createEvent.mockReturnValueOnce(new Promise<number>((resolve) => {
      resolveCreate = resolve;
    }));
    const user = userEvent.setup();
    const fields = await enterValidEvent(user);

    act(() => {
      fireEvent.submit(fields.form);
      fireEvent.submit(fields.form);
    });

    await waitFor(() => expect(mocks.createEvent).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.submit).toHaveAccessibleName('등록 중...');
    resolveCreate(1);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('행사가 성공적으로 생성되었습니다.', 'success'));
  });

  it('행사 삭제는 같은 tick의 재요청을 막고 실패 후 행을 보존한다', async () => {
    mocks.getEvents.mockResolvedValue({
      list: [{
        evntSn: 7,
        evntNm: '보존할 행사',
        evntCn: '본문',
        evntBgngYmd: '20260901',
        evntEndYmd: '20260902',
        evntUseCnt: 20,
      }],
      total: 1,
    });
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    mocks.deleteEvent.mockReturnValue(pendingDelete);
    renderClient();
    const remove = await screen.findByRole('button', { name: '보존할 행사 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.deleteEvent).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('보존할 행사 삭제 중');

    rejectDelete({ isAxiosError: true, message: 'Request failed with status code 500', response: { status: 500 } });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('행사 삭제에 실패했습니다.', 'error'));
    expect(screen.getByText('보존할 행사')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
  });

  it('검색어는 입력만으로 조회하지 않고 조회 버튼이나 Enter 로 적용한다 (DIP C9)', async () => {
    renderClient();
    await waitFor(() => expect(mocks.getEvents).toHaveBeenCalled());
    const calls = mocks.getEvents.mock.calls.length;

    fireEvent.change(screen.getByLabelText('행사 명칭 · 상세 내용'), { target: { value: '워크숍' } });
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mocks.getEvents).toHaveBeenCalledTimes(calls);

    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.getEvents).toHaveBeenLastCalledWith(expect.objectContaining({ searchWrd: '워크숍', page: 0 })));
  });

  it('외부인사가 남은 행사의 삭제 거부는 서버가 준 사유와 건수를 그대로 보인다', async () => {
    mocks.getEvents.mockResolvedValue({
      list: [{ evntSn: 8, evntNm: '외부인사 행사', evntCn: '본문', evntBgngYmd: '20260901', evntEndYmd: '20260902', evntUseCnt: 5 }],
      total: 1,
    });
    const reason = '외부인사 2명이 등록된 행사는 삭제할 수 없습니다. 외부인사를 먼저 삭제하세요.';
    mocks.deleteEvent.mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: reason } } });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '외부인사 행사 삭제' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(reason, 'error'));
    expect(mocks.toast).not.toHaveBeenCalledWith('행사 삭제에 실패했습니다.', 'error');
  });
});

/*
 * [2026-10-01] 쓰기 버튼은 그 동작의 기능 권한으로 보인다.
 * 이 화면은 조회 권한(EVENT_READ)만으로 들어올 수 있어, 종전에는 조회만 맡은 사람에게도 등록·수정·삭제가 모두 보였고
 * 누른 뒤에야 403 을 만났다. 표시 판정일 뿐이며 서버 인가는 그대로 집행된다.
 */
describe('EventManagementClient 쓰기 권한 표시', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getEvents.mockResolvedValue({
      list: [{ evntSn: 7, evntNm: '가을 워크숍', evntCn: '본문', evntBgngYmd: '20260901', evntEndYmd: '20260902', evntUseCnt: 20 }],
      total: 1,
    });
  });

  it('조회 권한만 있으면 행사 등록·수정·삭제 버튼을 보이지 않는다', async () => {
    auth.permissions = READ_ONLY_PERMISSIONS;
    renderClient();

    // 목록은 그대로 읽힌다 — 가리는 것은 쓰기 동작뿐이다.
    expect(await screen.findByText('가을 워크숍')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /행사 등록/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '가을 워크숍 수정' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '가을 워크숍 삭제' })).not.toBeInTheDocument();
  });

  it('수정 권한이 없어도 상세는 조회 전용 창으로 읽을 수 있다 — 입력은 잠기고 저장 버튼은 없다', async () => {
    // 상세 내용·담당자·준비사항은 목록 열에 없다. 수정 버튼을 가리기만 하면 조회 담당자는 그 값을 볼 길을 잃는다.
    auth.permissions = READ_ONLY_PERMISSIONS;
    mocks.getEvent.mockResolvedValue({
      evntSn: 7, evntNm: '가을 워크숍', evntCn: '본문', picNm: '김담당', prepMttr: '버스 2대',
      evntBgngYmd: '20260901', evntEndYmd: '20260902', evntUseCnt: 20,
    });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '가을 워크숍 상세 보기' }));

    expect(await screen.findByText('행사 상세')).toBeInTheDocument();
    const prep = await screen.findByRole('textbox', { name: '준비사항' });
    await waitFor(() => expect(prep).toHaveValue('버스 2대'));
    expect(prep).toBeDisabled();
    expect(screen.queryByRole('button', { name: '변경 사항 저장' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument();
  });

  it('권한은 동작마다 따로 본다 — 수정 권한만 있으면 수정 버튼만 보인다', async () => {
    auth.permissions = [...READ_ONLY_PERMISSIONS, 'EVENT_UPDATE'];
    renderClient();

    expect(await screen.findByRole('button', { name: '가을 워크숍 수정' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '가을 워크숍 삭제' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /행사 등록/ })).not.toBeInTheDocument();
  });
});
