import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SmartNotificationHub } from '../smart-notification-hub';
import { announceNotificationsChanged, subscribeNotificationsChanged } from '@/lib/notifications/notification-sync';

/**
 * 알림 센터 목록 계약 (DIP B4 P2).
 *
 * 종전 화면은 헤더 드로어가 불러온 첫 10건만 보여 주고 검색·탭도 그 안에서만 걸렀다. 이제 서버 페이지·검색어·읽음 조건으로
 * 조회하고, 행에서 이동·읽음·삭제를, 위에서 서버 일괄 읽음을 한다. 변경은 헤더에 알려 배지를 다시 읽게 한다.
 */
const mocks = vi.hoisted(() => ({
  execute: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/lib/api/generated-api-client', () => ({ executeGeneratedOperation: mocks.execute }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

const UNREAD = { notiSn: 11, notiTtlNm: '결재 요청', notiCn: '검토해 주세요.', notiDt: '2026-09-26', readYn: 'N', linkUrl: '/approvals' };
const READ = { notiSn: 10, notiTtlNm: '공지 등록', notiCn: '새 공지가 있습니다.', notiDt: '2026-09-25', readYn: 'Y' };

type Descriptor = { id: string };
type Args = { query?: Record<string, unknown>; path?: Record<string, unknown> };

function serve(overrides: Partial<Record<string, (args: Args) => unknown>> = {}) {
  mocks.execute.mockImplementation(async (descriptor: Descriptor, args: Args) => {
    const override = overrides[descriptor.id];
    if (override) return override(args);
    switch (descriptor.id) {
      case 'getNotifications':
        return { list: [UNREAD, READ], total: 2, page: 0, size: 20, totalPage: 1 };
      case 'getUnreadCount':
        return 1;
      default:
        return null;
    }
  });
}

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SmartNotificationHub />
    </QueryClientProvider>,
  );
}

function calls(id: string) {
  return mocks.execute.mock.calls.filter(([descriptor]) => (descriptor as Descriptor).id === id);
}

describe('SmartNotificationHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    serve();
  });

  it('서버 페이지로 조회하고, 읽음 조건·검색어를 서버 조건으로 보낸다', async () => {
    const user = userEvent.setup();
    renderHub();
    await screen.findByText('결재 요청');
    expect(calls('getNotifications')[0]?.[1]).toEqual({ query: { page: 0, size: 20 } });

    await user.click(screen.getByRole('button', { name: /읽지 않은 알림/ }));
    await waitFor(() => expect(calls('getNotifications').at(-1)?.[1]).toEqual({ query: { readYn: 'N', page: 0, size: 20 } }));
    expect(screen.getByRole('button', { name: /읽지 않은 알림/ })).toHaveAttribute('aria-pressed', 'true');

    // 검색어는 입력만으로 조회하지 않고 조회(Enter)로 적용한다(G2).
    const input = screen.getByRole('textbox', { name: '알림 검색어' });
    await user.type(input, '결재');
    expect(calls('getNotifications').at(-1)?.[1]).toEqual({ query: { readYn: 'N', page: 0, size: 20 } });
    await user.type(input, '{Enter}');
    await waitFor(() => expect(calls('getNotifications').at(-1)?.[1])
      .toEqual({ query: { searchWrd: '결재', readYn: 'N', page: 0, size: 20 } }));
  });

  it('읽지 않은 알림 수를 서버 수치로 말한다', async () => {
    renderHub();
    expect(await screen.findByRole('button', { name: '읽지 않은 알림 1건' })).toBeInTheDocument();
  });

  it('행의 읽음 처리는 한 번만 보내고, 헤더에 알린 뒤 목록을 다시 읽는다', async () => {
    const headerListener = vi.fn();
    const unsubscribe = subscribeNotificationsChanged('header', headerListener);
    renderHub();
    const button = await screen.findByRole('button', { name: '결재 요청 읽음 처리' });
    const before = calls('getNotifications').length;

    // 같은 틱의 두 번 클릭 — 다시 그리기 전이라 disabled 가 아직 걸리지 않았다. 동기 잠금만 두 번째를 막는다.
    act(() => { button.click(); button.click(); });

    await waitFor(() => expect(headerListener).toHaveBeenCalledTimes(1));
    expect(calls('markAsRead')).toHaveLength(1);
    expect(calls('markAsRead')[0]?.[1]).toEqual({ path: { notiSn: 11 } });
    await waitFor(() => expect(calls('getNotifications').length).toBeGreaterThan(before));
    unsubscribe();
  });

  it('삭제는 대상을 밝혀 확인을 받고, 거절하면 보내지 않는다', async () => {
    renderHub();
    const button = await screen.findByRole('button', { name: '공지 등록 삭제' });

    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0]?.[0]).toEqual(expect.objectContaining({ variant: 'destructive', message: expect.stringContaining('공지 등록') }));
    expect(calls('deleteNotification')).toHaveLength(0);

    fireEvent.click(button);
    await waitFor(() => expect(calls('deleteNotification')).toHaveLength(1));
    expect(calls('deleteNotification')[0]?.[1]).toEqual({ path: { notiSn: 10 } });
    expect(mocks.toast).toHaveBeenCalledWith('알림을 삭제했습니다.', 'success');
  });

  it('삭제가 실패하면 알리고, 잠금을 풀어 다시 시도할 수 있다', async () => {
    serve({ deleteNotification: () => { throw new Error('서버 오류'); } });
    renderHub();
    const button = await screen.findByRole('button', { name: '공지 등록 삭제' });

    fireEvent.click(button);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(calls('deleteNotification')).toHaveLength(2));
  });

  it('모두 읽음은 서버 일괄 읽음을 한 번 부르고 옮긴 건수를 말한다', async () => {
    serve({ markAllAsRead: () => 5 });
    renderHub();
    await screen.findByText('결재 요청');
    const button = screen.getByRole('button', { name: '모두 읽음' });
    await waitFor(() => expect(button).toBeEnabled());

    act(() => { button.click(); button.click(); });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('알림 5건을 읽음 처리했습니다.', 'success'));
    expect(calls('markAllAsRead')).toHaveLength(1);
  });

  it('읽지 않은 알림이 없으면 모두 읽음을 누를 수 없다', async () => {
    serve({ getUnreadCount: () => 0 });
    renderHub();
    await screen.findByRole('button', { name: '읽지 않은 알림 0건' });
    expect(screen.getByRole('button', { name: '모두 읽음' })).toBeDisabled();
  });

  it('목적지가 있는 알림만 열 수 있고, 열면 읽음 처리 뒤 이동한다', async () => {
    renderHub();
    await screen.findByText('결재 요청');
    const table = screen.getByRole('table', { name: '받은 알림 목록' });
    expect(within(table).queryByRole('button', { name: '공지 등록 열기' })).not.toBeInTheDocument();

    fireEvent.click(within(table).getByRole('button', { name: '결재 요청 열기' }));

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/approvals'));
    expect(calls('markAsRead')[0]?.[1]).toEqual({ path: { notiSn: 11 } });
  });

  it('헤더가 알린 변경(새 알림·읽음)은 목록을 다시 읽는다', async () => {
    renderHub();
    await screen.findByText('결재 요청');
    const before = calls('getNotifications').length;

    await act(async () => { announceNotificationsChanged('header'); });

    await waitFor(() => expect(calls('getNotifications').length).toBeGreaterThan(before));
  });

  it('검색 결과가 없으면 검색어를 밝혀 말한다(G15)', async () => {
    const user = userEvent.setup();
    serve({ getNotifications: () => ({ list: [], total: 0, page: 0, size: 20, totalPage: 0 }) });
    renderHub();
    const input = await screen.findByRole('textbox', { name: '알림 검색어' });
    await user.type(input, '없는 알림{Enter}');
    expect(await screen.findByText('"없는 알림"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
  });
});
