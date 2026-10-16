import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationAction, NotificationActionOutcome, NotificationActionSettlement, SlotContributions } from '@/extensions/slots';

/*
  [2026-10-16] 알림 카드의 바로 처리 단추는 다른 기능이 notification-actions 슬롯에 기여한다. 이 시험은 알림 기능 소유의 호스트
  계약이라 결재에 기대지 않는다 — 결재가 없는 구성에도 남으므로 권한 코드도 알림 기능 것만 쓴다. 가짜 기여로 잠금·되돌리기·결과·실패 사유·노출 술어·[열기] 를 본다. 실제 결재 기여의 판정은
  src/queries/__tests__/approval-notification-action.test.ts 가 본다.
*/
const mocks = vi.hoisted(() => ({
  registry: [] as SlotContributions<'notification-actions'>[],
  user: { esntlId: 'APPROVER', authorizationVersion: 'v1', permissions: ['NOTI_DISPATCH'] as string[] },
  toast: vi.fn(),
}));
vi.mock('@/extensions/generated-notification-actions', () => ({ get notificationActions() { return mocks.registry; } }));
vi.mock('@/contexts/AuthContext', () => ({ useOptionalAuth: () => ({ user: mocks.user }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
import { AppNotificationDrawer } from '../app-notification-drawer';

const TURN_LINK = '/approvals?tab=PENDING&doc=41';
const notifications = [
  { id: 1, title: '결재 요청', message: '‘출장’ 를 확인해 주세요.', time: '2026-10-16T09:00:00', isRead: false, linkUrl: TURN_LINK },
  { id: 2, title: '결재 결과', message: '승인되었습니다.', time: '2026-10-16T09:01:00', isRead: false, linkUrl: '/approvals?tab=SUBMITTED&doc=41' },
];

function action(submit: NotificationAction['submit'], visibleWhen: NotificationAction['visibleWhen'] = { permissions: ['NOTI_DISPATCH'] }): NotificationAction {
  return {
    id: 'probe-approve', order: 10, label: '승인', busyLabel: '확인 중…', name: '결재 바로 승인',
    failureMessage: '결재를 승인하지 못했습니다.', visibleWhen,
    match: (linkUrl: string) => (linkUrl === TURN_LINK ? '41' : null),
    submit,
  };
}

function renderDrawer(withQueryClient = true) {
  const handlers = { onClose: vi.fn(), onMarkRead: vi.fn(), onMarkAllRead: vi.fn(), onDelete: vi.fn() };
  const drawer = <AppNotificationDrawer isOpen notifications={notifications} {...handlers} />;
  render(withQueryClient ? <QueryClientProvider client={new QueryClient()}>{drawer}</QueryClientProvider> : drawer);
  return handlers;
}

function deferred<T>() {
  let resolve!: (value: T) => void; let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe('AppNotificationDrawer notification-actions host', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.user.permissions = ['NOTI_DISPATCH'];
    mocks.registry = [];
  });

  it('기여가 고른 알림에만 단추와 [열기] 를 두고, 다른 알림은 종전 바로가기를 둔다', () => {
    mocks.registry = [[action(vi.fn())]];
    renderDrawer();
    expect(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' })).toHaveTextContent('승인');
    expect(screen.getByRole('link', { name: '열기: 결재 요청' })).toHaveAttribute('href', TURN_LINK);
    expect(screen.queryByRole('link', { name: '결재 요청 업무로 이동' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '결재 결과 업무로 이동' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재 바로 승인: 결재 결과' })).not.toBeInTheDocument();
  });

  it('노출 술어의 권한이 없으면 단추를 두지 않는다', () => {
    mocks.user.permissions = ['NOTI_READ'];
    mocks.registry = [[action(vi.fn())]];
    renderDrawer();
    expect(screen.queryByRole('button', { name: /결재 바로 승인/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '결재 요청 업무로 이동' })).toBeInTheDocument();
  });

  it('쿼리 클라이언트가 없는 곳에서는 단추를 두지 않는다', () => {
    mocks.registry = [[action(vi.fn())]];
    renderDrawer(false);
    expect(screen.queryByRole('button', { name: /결재 바로 승인/ })).not.toBeInTheDocument();
  });

  it('연달아 눌러도 한 번만 보내고, 되돌릴 수 있는 처리는 되돌리기를 둔 뒤 결과를 알린다', async () => {
    const settled = deferred<NotificationActionSettlement>();
    const undo = vi.fn(() => true);
    const submit = vi.fn(async (): Promise<NotificationActionOutcome> => ({ message: '10초 뒤 처리합니다.', undo, undoMs: 10_000, settled: settled.promise, undoneMessage: '되돌렸습니다.' }));
    mocks.registry = [[action(submit)]];
    const handlers = renderDrawer();
    const button = screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' });
    fireEvent.click(button); fireEvent.click(button); fireEvent.click(button);
    await screen.findByRole('button', { name: '되돌리기: 결재 요청' });
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ notificationId: 1, title: '결재 요청', target: '41' }));
    expect(handlers.onMarkRead).toHaveBeenCalledWith(1);
    expect(screen.getByText('10초 뒤 처리합니다.', { selector: 'p:not([aria-live])' })).toBeInTheDocument();
    await act(async () => { settled.resolve({ kind: 'done', message: '승인했습니다.' }); await settled.promise; });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('승인했습니다.', 'success'));
    expect(screen.queryByRole('button', { name: '되돌리기: 결재 요청' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' })).toBeDisabled();
    expect(undo).not.toHaveBeenCalled();
  });

  it('되돌리면 대기 처리를 취소하고, 뒤늦게 끝난 결과가 상태를 덮지 않는다', async () => {
    const settled = deferred<NotificationActionSettlement>();
    const undo = vi.fn(() => true);
    mocks.registry = [[action(async () => ({ message: '10초 뒤 처리합니다.', undo, undoMs: 10_000, settled: settled.promise, undoneMessage: '승인 처리를 되돌렸습니다.' }))]];
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' }));
    fireEvent.click(await screen.findByRole('button', { name: '되돌리기: 결재 요청' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('승인 처리를 되돌렸습니다.', { selector: 'p:not([aria-live])' })).toBeInTheDocument();
    await act(async () => { settled.resolve({ kind: 'done', message: '늦은 결과' }); await settled.promise; });
    expect(mocks.toast).not.toHaveBeenCalledWith('늦은 결과', 'success');
    expect(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' })).toBeEnabled();
  });

  it('같은 대기열을 나눠 쓰는 결재함에서 되돌려 settled 가 되돌림으로 끝나면, 카드도 되돌림으로 옮기고 이탈 경고를 거둔다', async () => {
    const settled = deferred<NotificationActionSettlement>();
    // 결재함이 먼저 취소했으므로 이 카드의 되돌리기는 할 일이 없다(누르면 '이미 보냈다' 고 잘못 말하던 결함).
    const undo = vi.fn(() => false);
    mocks.registry = [[action(async () => ({ message: '10초 뒤 처리합니다.', undo, undoMs: 10_000, settled: settled.promise, undoneMessage: '승인 처리를 되돌렸습니다.' }))]];
    renderDrawer();
    const approve = screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' });
    fireEvent.click(approve);
    await screen.findByRole('button', { name: '되돌리기: 결재 요청' });
    const queuedLeave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(queuedLeave);
    expect(queuedLeave.defaultPrevented).toBe(true);

    await act(async () => { settled.resolve({ kind: 'undone' }); await settled.promise; });

    expect(await screen.findByText('승인 처리를 되돌렸습니다.', { selector: 'p:not([aria-live])' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '되돌리기: 결재 요청' })).not.toBeInTheDocument();
    const leave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(false);
    expect(undo).not.toHaveBeenCalled();
    expect(mocks.toast).not.toHaveBeenCalled();
    // 대기 중에는 [승인] 자리에 되돌리기가 있었다 — 되돌림으로 옮기면 [승인] 이 다시 그려지고 누를 수 있다.
    expect(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' })).toBeEnabled();
  });

  it('판정 실패·서버 거부는 사유를 카드 아래 경보로, 무엇을 못 했는지는 토스트로 알리고 다시 누를 수 있다', async () => {
    const refused = Object.assign(new Error('refused'), { response: { status: 409, data: { message: '이미 처리됐거나 지금 내 차례가 아닙니다.' } } });
    const submit = vi.fn().mockRejectedValueOnce(refused);
    mocks.registry = [[action(submit)]];
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미 처리됐거나 지금 내 차례가 아닙니다.');
    expect(mocks.toast).toHaveBeenCalledWith('결재를 승인하지 못했습니다.', 'error');
    expect(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' })).toBeEnabled();
  });

  it('보낸 뒤의 서버 거부도 사유를 경보로 보인다', async () => {
    const settled = deferred<NotificationActionSettlement>();
    mocks.registry = [[action(async () => ({ message: '10초 뒤 처리합니다.', undo: () => true, undoMs: 10_000, settled: settled.promise }))]];
    renderDrawer();
    fireEvent.click(screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' }));
    await screen.findByRole('button', { name: '되돌리기: 결재 요청' });
    await act(async () => {
      settled.reject(Object.assign(new Error('forbidden'), { response: { status: 403, data: { message: '결재 권한이 없습니다.' } } }));
      await settled.promise.catch(() => undefined);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('결재 권한이 없습니다.');
  });

  it('바로 처리는 한 번만 보내고, 판정하는 동안 단추를 잠그며(aria-busy), 실패하면 사유를 보인다', async () => {
    let rejectWrite: (error: unknown) => void = () => undefined;
    const submit = vi.fn();
    submit.mockReturnValueOnce(new Promise((_, reject) => { rejectWrite = reject; }));
    mocks.registry = [[action(submit)]];
    renderDrawer();
    const approve = screen.getByRole('button', { name: '결재 바로 승인: 결재 요청' });

    act(() => { fireEvent.click(approve); fireEvent.click(approve); });

    // 호스트의 handleNotificationAction 이 기여의 action.submit 을 부른다 — 같은 알림은 한 번만이다.
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ notificationId: 1, target: '41' }));
    await waitFor(() => expect(approve).toBeDisabled());
    expect(approve).toHaveAttribute('aria-busy', 'true');
    expect(approve).toHaveTextContent('확인 중…');
    await act(async () => { rejectWrite(Object.assign(new Error('refused'), { response: { status: 403, data: { message: '결재 권한이 없습니다.' } } })); });

    expect(await screen.findByRole('alert')).toHaveTextContent('결재 권한이 없습니다.');
    expect(approve).toBeEnabled();
  });

  it('[열기] 는 읽음 처리하고 드로어를 닫는다', () => {
    mocks.registry = [[action(vi.fn())]];
    const handlers = renderDrawer();
    fireEvent.click(screen.getByRole('link', { name: '열기: 결재 요청' }));
    expect(handlers.onMarkRead).toHaveBeenCalledWith(1);
    expect(handlers.onClose).toHaveBeenCalled();
  });

});
