import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInfo } from '@/services/foundation/auth/authService';
import type { MenuInfo } from '@/types/foundation/menu';
import { Header } from '../header';

/**
 * 👤 헤더 계정 메뉴의 내 정보 수정 경계 계약.
 *
 * [2026-09-08] 서버(`PUT /api/v1/users/me`)와 `userService.updateMe` 는 갖춰져 있었는데
 * 호출부가 0 이었다(operation-consumer-census 축 2 실측).
 *
 * 이 파일이 고정하는 것은 **합성 경계**다 — 검증·오류·입력 보존은 자식 폼(`ProfileEditForm`)이
 * 소유하고 헤더는 현재 값을 읽어 넘기고 저장을 부른다. 그래서 여기서는 자식이 저장을 부를 때의
 * 정확한 호출 횟수·인자·진행 중 잠금·실패 처리를 본다(폼 검증 census 의 composed 증거 요건).
 */
const testState = vi.hoisted(() => ({
  user: null as UserInfo | null,
  logout: vi.fn(async () => undefined),
  getMe: vi.fn(),
  updateMe: vi.fn(),
  changePassword: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: 'light' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: testState.user, logout: testState.logout }),
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({
    isSidebarOpen: false,
    toggleSidebar: vi.fn(),
    activeMenuNo: 1000000,
    setActiveMenuNo: vi.fn(),
  }),
}));

vi.mock('@/lib/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    error: null,
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('../../ui/app-notification-drawer', () => ({
  AppNotificationDrawer: () => null,
}));

vi.mock('../HeaderSearchParamSync', () => ({
  HeaderSearchParamSync: () => null,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: testState.toast }),
}));

vi.mock('@/services/business/user/userService', () => ({
  userService: {
    getMe: (...args: unknown[]) => testState.getMe(...args),
    updateMe: (...args: unknown[]) => testState.updateMe(...args),
    changePassword: (...args: unknown[]) => testState.changePassword(...args),
  },
}));

const headMenus: MenuInfo[] = [
  {
    menuNo: 1000000,
    menuNm: '업무 공간',
    upperMenuId: 0,
    upMenuSn: 0,
    menuOrdr: 1,
    modernRoute: '/admin/work-hub',
  },
];

const CURRENT_USER: UserInfo = { id: 'staff-1', name: '홍길동', role: 'USER', userSe: 'USR', groups: ['USER'], permissions: [], authorizationVersion: 'v1' };

function renderHeader() {
  testState.user = CURRENT_USER;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Header initialMenus={headMenus} />
    </QueryClientProvider>,
  );
}

async function openProfileDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '사용자 계정 메뉴' }));
  await user.click(screen.getByRole('button', { name: '내 정보 수정' }));
  return screen.findByRole('button', { name: '저장' });
}

describe('Header 내 정보 수정 경계', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.getMe.mockResolvedValue({
      userId: 'staff-1',
      userNm: '홍길동',
      emplNo: 'E-1001',
      mblTelno: '01012345678',
    });
    testState.updateMe.mockResolvedValue(undefined);
  });

  it('현재 값을 먼저 읽어 폼을 채운다 — 빈 폼을 지움 의도로 저장하게 두지 않는다', async () => {
    const user = userEvent.setup();
    renderHeader();
    await openProfileDialog(user);

    expect(testState.getMe).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/^이름/)).toHaveValue('홍길동');
    expect(screen.getByLabelText(/^사번/)).toHaveValue('E-1001');
  });

  it('저장 중에는 잠기고 실패해도 입력이 남으며 저장은 한 번만 나간다', async () => {
    const user = userEvent.setup();
    let reject: (error: unknown) => void = () => undefined;
    testState.updateMe.mockReturnValue(new Promise((_, next) => { reject = next; }));

    renderHeader();
    const saveButton = await openProfileDialog(user);

    const phone = screen.getByLabelText(/^휴대전화/);
    await user.clear(phone);
    await user.type(phone, '01099998888');
    await user.click(saveButton);

    await waitFor(() => expect(testState.updateMe).toHaveBeenCalledTimes(1));
    // 바꾼 필드만 나간다 — 서버가 null 을 '보내지 않음'(유지)으로 보기 때문이다.
    expect(testState.updateMe).toHaveBeenCalledWith({ userNm: '홍길동', mblTelno: '01099998888' });

    const pendingButton = screen.getByRole('button', { name: '저장 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    await user.click(pendingButton);
    expect(testState.updateMe).toHaveBeenCalledTimes(1);

    reject(new Error('서버 오류'));
    await waitFor(() => expect(testState.toast).toHaveBeenCalledWith(expect.stringContaining('서버 오류'), 'error'));
    expect(screen.getByLabelText(/^휴대전화/)).toHaveValue('01099998888');
  });

  it('현재 값을 읽지 못하면 다이얼로그를 열지 않고 이유를 말한다', async () => {
    const user = userEvent.setup();
    testState.getMe.mockRejectedValue(new Error('조회 실패'));

    renderHeader();
    await user.click(await screen.findByRole('button', { name: '사용자 계정 메뉴' }));
    await user.click(screen.getByRole('button', { name: '내 정보 수정' }));

    await waitFor(() => expect(testState.toast).toHaveBeenCalledWith(expect.stringContaining('조회 실패'), 'error'));
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(testState.updateMe).not.toHaveBeenCalled();
  });
});

/**
 * [2026-09-14] 서버가 비밀번호 변경과 함께 refresh token 을 폐기한다. 헤더가 세션을 그대로 두면
 * access token 만료 시점에 사용자는 이유 없이 로그아웃되므로, 성공 즉시 알리고 로그아웃한다.
 * 실패하면 세션을 끊지 않는다 — 현재 비밀번호를 틀린 입력이 로그아웃으로 이어지면 안 된다.
 */
describe('Header 비밀번호 변경 뒤 세션 처리', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function submitPasswordChange(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: '사용자 계정 메뉴' }));
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }));
    await user.type(await screen.findByLabelText('현재 비밀번호'), 'Oldpass1!');
    await user.type(screen.getByLabelText('새 비밀번호'), 'Newpass1!');
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'Newpass1!');
    const form = screen.getByRole('form', { name: '비밀번호 변경 폼' });
    await user.click(within(form).getByRole('button', { name: '비밀번호 변경' }));
  }

  it('성공하면 다시 로그인하라고 알리고 로그아웃한다', async () => {
    const user = userEvent.setup();
    testState.changePassword.mockResolvedValue(undefined);

    renderHeader();
    await submitPasswordChange(user);

    await waitFor(() => expect(testState.logout).toHaveBeenCalledTimes(1));
    expect(testState.changePassword).toHaveBeenCalledWith('Oldpass1!', 'Newpass1!');
    expect(testState.toast).toHaveBeenCalledWith(expect.stringContaining('다시 로그인'), 'success');
  });

  it('실패하면 로그아웃하지 않는다', async () => {
    const user = userEvent.setup();
    testState.changePassword.mockRejectedValue(new Error('현재 비밀번호가 일치하지 않습니다.'));

    renderHeader();
    await submitPasswordChange(user);

    await waitFor(() => expect(testState.toast).toHaveBeenCalledWith(expect.stringContaining('일치하지 않습니다'), 'error'));
    expect(testState.logout).not.toHaveBeenCalled();
  });
});
