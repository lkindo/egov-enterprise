/**
 * 셸 링크·머리글 위젯 슬롯의 렌더 계약(슬롯 단계 PR-6).
 *
 * 머리글의 도움말 아이콘, 바닥글의 '고객지원', 머리글의 알림 벨은 셸 파일의 마커 블록이 아니라 기능의 슬롯 기여다
 * (src/extensions/help/shell-links.ts · src/extensions/notification/header-widgets.ts). 셸은 레지스트리를 읽어 그린다.
 * 여기서 고정하는 것:
 *  - 기여가 있으면 셸이 그 항목을 종전과 같은 자리·모양으로 그린다(머리글 링크는 아이콘 단추로 md 이상에서만 보인다).
 *  - 알림 벨은 NOTI_READ 가 있을 때만 그려진다 — 권한 상태를 모르면(버전 없음) 그리지 않는다.
 *  - 기여가 투영으로 빠진 생성물에는 항목이 없다. 시험 등록은 조건부로 하지 않고 본문에서 기대값을 나눈다(투영 원장).
 *  - 바닥글은 링크 항목이 없으면 링크 묶음(빈 div)도 그리지 않는다.
 * 셸 소스의 정적 사실(바닥글에 슬롯 밖 링크 없음, 머리글 링크 자리가 넓은 화면에서 숨지 않음)은 셸 접근성 계약이, 기여 데이터의
 * 규칙(바닥글 항목의 머리글 짝 등)은 경계 계약(scripts/reusable-frontend-boundaries-contract.test.mjs)이 본다.
 *
 * 이 파일은 레지스트리와 알림 벨 컴포넌트를 정적으로 import 하지 않는다 — 그래야 기여가 빠진 생성물에서도 연쇄로 지워지지 않고 돈다.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserInfo } from '@/services/foundation/auth/authService';
import { inProjection } from '@/test-utils/projection';
import { Footer } from '../footer';
import { Header } from '../header';

const HELP = 'frontend/src/extensions/help/shell-links.ts';
const BELL = 'frontend/src/extensions/notification/header-widgets.ts';

// useNotifications 는 벨 컴포넌트가 마운트될 때만 불린다 — 벨 안의 같은 판정(이중 방어)에 가리지 않고 슬롯 술어를 본다.
const testState = vi.hoisted(() => ({
  user: null as UserInfo | null,
  useNotifications: vi.fn(() => ({
    notifications: [], unreadCount: 0, error: null, markAsRead: () => undefined, markAllAsRead: () => undefined, refresh: () => undefined,
  })),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: vi.fn(), resolvedTheme: 'light' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: testState.user, logout: vi.fn() }),
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({ isSidebarOpen: false, toggleSidebar: vi.fn(), activeMenuNo: 0, setActiveMenuNo: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-notifications', () => ({ useNotifications: testState.useNotifications }));

vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../../ui/app-notification-drawer', () => ({ AppNotificationDrawer: () => null }));
vi.mock('../HeaderSearchParamSync', () => ({ HeaderSearchParamSync: () => null }));

function signIn(permissions: string[], authorizationVersion = 'v1') {
  testState.user = { id: 'shell-user', name: '셸 사용자', groups: [], permissions, authorizationVersion } as unknown as UserInfo;
}

function renderHeader() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Header initialMenus={[]} />
    </QueryClientProvider>,
  );
}

/** a 가 b 보다 문서에서 앞에 있다. */
const precedes = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('셸 링크·머리글 위젯 슬롯', () => {
  beforeEach(() => {
    testState.user = null;
    testState.useNotifications.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.doUnmock('@/extensions/generated-shell-links');
    vi.resetModules();
  });

  it('도움말 셸 링크는 머리글(아이콘, md 이상)과 바닥글에 /help 로 그려지고, 기여가 빠진 생성물에는 둘 다 없다', () => {
    signIn([]);
    renderHeader();
    render(<Footer />);

    if (inProjection(HELP)) {
      const headerLink = screen.getByRole('link', { name: '도움말' });
      expect(headerLink).toHaveAttribute('href', '/help');
      expect(headerLink).toHaveAttribute('title', '도움말');
      expect(headerLink).toHaveClass('hidden', 'md:flex', 'text-muted-foreground');
      expect(headerLink.firstElementChild, '머리글 링크는 아이콘 단추다').not.toBeNull();
      // 자리는 종전과 같다 — 통합 검색 뒤, 테마 전환 앞.
      expect(precedes(screen.getByRole('link', { name: '통합 검색' }), headerLink)).toBe(true);
      expect(precedes(headerLink, screen.getByRole('button', { name: '테마 변경' }))).toBe(true);

      expect(screen.getByRole('link', { name: '고객지원' })).toHaveAttribute('href', '/help');
    } else {
      expect(screen.queryByRole('link', { name: '도움말' })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: '고객지원' })).not.toBeInTheDocument();
    }
  });

  it('알림 벨은 NOTI_READ 가 있을 때만 테마 전환 뒤에 그려지고(권한 상태를 모르면 없다), 알림 기여가 빠진 생성물에는 없다', () => {
    signIn(['NOTI_READ']);
    const { unmount } = renderHeader();
    if (inProjection(BELL)) {
      const bell = screen.getByRole('button', { name: '알림' });
      expect(precedes(screen.getByRole('button', { name: '테마 변경' }), bell)).toBe(true);
      expect(precedes(bell, screen.getByRole('button', { name: /사용자 계정 메뉴$/ }))).toBe(true);
      expect(testState.useNotifications).toHaveBeenCalled();
    } else {
      expect(screen.queryByRole('button', { name: '알림' })).not.toBeInTheDocument();
    }
    unmount();

    for (const [permissions, version] of [[[], 'v1'], [['NOTI_READ'], '']] as const) {
      signIn([...permissions], version);
      testState.useNotifications.mockClear();
      const { unmount: unmountWithout } = renderHeader();
      expect(screen.getByRole('button', { name: '테마 변경' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '알림' }), `${permissions.join(',') || '권한 없음'} · 버전 '${version}'`).not.toBeInTheDocument();
      expect(testState.useNotifications, `벨이 마운트됐습니다: ${permissions.join(',') || '권한 없음'} · 버전 '${version}'`).not.toHaveBeenCalled();
      unmountWithout();
    }
  });

  it('바닥글은 링크 항목이 없으면 링크 묶음도 그리지 않는다', async () => {
    vi.resetModules();
    vi.doMock('@/extensions/generated-shell-links', () => ({ shellLinks: [] }));
    const { Footer: EmptyFooter } = await import('../footer');
    const { container } = render(<EmptyFooter />);

    expect(container.querySelectorAll('a')).toHaveLength(0);
    // 바닥글 행에는 저작권 문단 묶음 하나만 남는다(빈 링크 묶음 div 가 없다).
    expect(container.querySelector('footer > div')?.children).toHaveLength(1);
  });
});
