import { render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalCommandCenter } from '../global-command-center';
import { GlobalShortcutProvider } from '../global-shortcut-provider';

/**
 * 명령 센터 바로가기의 렌더 경로(허브 분해 H1). 바로가기는 기능의 shell-links 기여(command-center 배치)이고, 명령 센터는 레지스트리만
 * 읽는다. 여기서는 레지스트리를 가짜 기여로 바꿔 명령 센터가 하는 일만 본다 — command-center 배치만 옵션(이름·설명)이 되고, 고르면
 * 그 href 로 가며, 다른 배치(머리글·바닥글·협업 허브 머리)는 나오지 않고, 노출 술어는 라우트 게이트와 같은 판정이다.
 * 노출 판정은 실제 함수(visibleEntries → canOpenPage)를 쓴다. /admin/system/menus 는 모든 구성에 남는 core 화면(MENU_READ)이다.
 */

const mocks = vi.hoisted(() => {
  const icon = () => null;
  return {
    push: vi.fn(),
    replace: vi.fn(),
    user: undefined as { id: string; permissions?: string[]; authorizationVersion?: string } | undefined,
    links: [
      [
        { id: 'menus', placement: 'command-center', order: 20, href: '/admin/system/menus', label: '메뉴 바로가기', icon,
          description: '메뉴 관리 화면으로 이동', visibleWhen: { page: '/admin/system/menus' } },
        { id: 'header-only', placement: 'header', order: 5, href: '/help', label: '머리글 전용', icon, visibleWhen: { page: '/help' } },
      ],
      [
        { id: 'search', placement: 'command-center', order: 10, href: '/search', label: '검색 바로가기', icon,
          description: '통합 검색으로 이동', visibleWhen: { page: '/search' } },
        { id: 'hub-only', placement: 'collaboration-hub', order: 1, href: '/admin/collaboration/mail-send', label: '협업 허브 전용',
          visibleWhen: { page: '/admin/collaboration/mail-send' } },
        { id: 'footer-only', placement: 'footer', order: 1, href: '/help', label: '바닥글 전용', visibleWhen: { page: '/help' } },
      ],
    ] as unknown[][],
  };
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ logout: vi.fn(), user: mocks.user }),
}));
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: {
    getHeadMenus: vi.fn().mockResolvedValue([]),
    getLeftMenus: vi.fn().mockResolvedValue([]),
    getMyBookmarks: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/extensions/generated-shell-links', () => ({ shellLinks: mocks.links }));

function Harness() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalShortcutProvider>
        <button type="button">커맨드 센터 호출 위치</button>
        <GlobalCommandCenter />
      </GlobalShortcutProvider>
    </QueryClientProvider>
  );
}

async function openCommandCenter(user: ReturnType<typeof userEvent.setup>) {
  render(<Harness />);
  screen.getByRole('button', { name: '커맨드 센터 호출 위치' }).focus();
  await user.keyboard('{Control>}k{/Control}');
  await screen.findByRole('dialog', { name: '글로벌 커맨드 센터' });
  return screen.findAllByRole('option');
}

const names = (options: HTMLElement[]) => options.map((option) => option.getAttribute('aria-label'));

describe('명령 센터 바로가기(shell-links 의 command-center 배치)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('command-center 배치만 order 순 옵션(이름·설명)이 되고, 고르면 그 href 로 간다', async () => {
    mocks.user = { id: 'staff01', permissions: ['MENU_READ'], authorizationVersion: 'v1' };
    const user = userEvent.setup();
    const options = await openCommandCenter(user);

    expect(names(options)).toEqual(['검색 바로가기', '메뉴 바로가기', '로그아웃']);
    const menus = screen.getByRole('option', { name: '메뉴 바로가기' });
    expect(within(menus).getByText('메뉴 관리 화면으로 이동')).toBeInTheDocument();
    expect(within(screen.getByRole('option', { name: '검색 바로가기' })).getByText('통합 검색으로 이동')).toBeInTheDocument();
    for (const other of ['머리글 전용', '바닥글 전용', '협업 허브 전용']) {
      expect(screen.queryByRole('option', { name: other })).toBeNull();
    }

    await user.click(menus);
    expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
  });

  it('목적지 화면에 들어갈 수 없는 사람에게는 그 바로가기를 보이지 않는다(라우트 게이트와 같은 판정)', async () => {
    mocks.user = { id: 'staff02', permissions: [], authorizationVersion: 'v1' };
    const user = userEvent.setup();
    const options = await openCommandCenter(user);

    // /search 는 /admin 밖이라 페이지 게이트가 없다 — 늘 보인다.
    expect(names(options)).toEqual(['검색 바로가기', '로그아웃']);
  });
});
