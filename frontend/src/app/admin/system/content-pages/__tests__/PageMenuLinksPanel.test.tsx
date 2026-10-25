import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PageMenuLinksPanel } from '../PageMenuLinksPanel';
import { findCmsPageMenuLinks } from '@/lib/cms/page-menu-links';
import type { GroupSource, MenuLinkMenuInput, MenuSource } from '@/lib/navigation/route-menu-links';

const mocks = vi.hoisted(() => ({ push: vi.fn(), toast: vi.fn(), handOffMenuFocus: vi.fn(), retry: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/navigation/target-handoff', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/navigation/target-handoff')>()),
  handOffMenuFocus: mocks.handOffMenuFocus,
}));
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } }) }));

const menus: MenuLinkMenuInput[] = [
  { menuNo: 1, menuNm: '관리 센터', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
  { menuNo: 2, menuNm: '이용 안내', upMenuSn: 1, menuOrdr: 1, modernRoute: '/pages/service-guide', useYn: 'Y' },
  { menuNo: 3, menuNm: '옛 안내', upMenuSn: 1, menuOrdr: 2, modernRoute: '/pages/service-guide?from=old', useYn: 'N' },
  { menuNo: 4, menuNm: '다른 안내', upMenuSn: 1, menuOrdr: 3, modernRoute: '/pages/service-guide-2', useYn: 'Y' },
];
const groups: GroupSource = {
  status: 'ready',
  groups: [
    { code: 'ROLE_USER', name: '일반 사용자', grants: [{ type: 'NAVIGATION', code: '1' }, { type: 'NAVIGATION', code: '2' }] },
  ],
};

function renderPanel(menuSource: MenuSource | null, groupSource: GroupSource | null) {
  const links = menuSource === null || groupSource === null ? null : findCmsPageMenuLinks('service-guide', menuSource, groupSource);
  return render(
    <PageMenuLinksPanel contsPathNm="service-guide" title="이용 안내" links={links}
      menuSource={menuSource} groupSource={groupSource} retry={mocks.retry} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  auth.permissions = ['MENU_READ'];
  mocks.handOffMenuFocus.mockReturnValue(true);
});

describe('PageMenuLinksPanel — 콘텐츠 페이지의 메뉴 연결(ADR-0042)', () => {
  it('원천을 확인하는 중이면 연결 없음으로 단정하지 않고 확인 중이라고 보인다', () => {
    renderPanel(null, groups);
    expect(screen.getByRole('status')).toHaveTextContent('메뉴 연결을 확인하는 중…');
    expect(screen.queryByText(/연결 없음/)).toBeNull();
  });

  it('메뉴 원장을 볼 권한이 없으면 확인 권한 없음으로 보인다', () => {
    renderPanel({ status: 'no-permission' }, { status: 'no-permission' });
    expect(screen.getByText(/메뉴 원장을 볼 권한\(MENU_READ\)이 없어 메뉴 연결을 확인할 수 없습니다/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다시 불러오기' })).toBeNull();
  });

  it('불러오지 못하면 확인 불가로 알리고 다시 불러오게 한다', () => {
    renderPanel({ status: 'failed' }, groups);
    expect(screen.getByRole('alert')).toHaveTextContent('메뉴 원장을 불러오지 못해 메뉴 연결을 확인할 수 없습니다(확인 불가)');
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(mocks.retry).toHaveBeenCalledTimes(1);
  });

  it('연결이 없으면 메뉴에 등록할 주소와 주소 복사를 준다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderPanel({ status: 'ready', menus: menus.filter((menu) => menu.menuNo !== 2 && menu.menuNo !== 3) }, groups);

    expect(screen.getByText('이 페이지를 가리키는 메뉴가 없습니다(연결 없음).')).toBeInTheDocument();
    expect(screen.getByText('/pages/service-guide')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '메뉴에 등록할 주소 복사' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('/pages/service-guide'));
    expect(mocks.toast).toHaveBeenCalledWith('메뉴에 등록할 주소를 복사했습니다.', 'success');
  });

  it('연결된 메뉴의 위치·활성·보이는 그룹을 보이고, 메뉴 관리에서 그 메뉴를 고른 채 연다', () => {
    renderPanel({ status: 'ready', menus }, groups);
    const table = screen.getByRole('table', { name: '이용 안내 메뉴 연결' });
    const rows = within(table).getAllByRole('row').slice(1);
    // 앞부분만 같은 주소(/pages/service-guide-2)는 연결이 아니다. 쿼리가 붙은 주소는 같은 화면이다.
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('관리 센터 › 이용 안내');
    expect(rows[0]).toHaveTextContent('활성');
    expect(rows[0]).toHaveTextContent('일반 그룹 표시: 일반 사용자');
    expect(rows[1]).toHaveTextContent('관리 센터 › 옛 안내');
    expect(rows[1]).toHaveTextContent('비활성');

    fireEvent.click(within(rows[0]).getByRole('button', { name: '이용 안내 메뉴 관리에서 열기' }));
    expect(mocks.handOffMenuFocus).toHaveBeenCalledWith({ menuSn: 2 });
    expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
  });

  it('그룹을 볼 권한이 없으면 보이는 그룹을 확인 권한 없음으로 보인다', () => {
    renderPanel({ status: 'ready', menus }, { status: 'no-permission' });
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('확인 권한 없음');
  });

  it('메뉴 관리 화면에 들어갈 수 없으면 여는 단추 대신 필요한 권한을 알린다', () => {
    auth.permissions = [];
    renderPanel({ status: 'ready', menus }, groups);
    expect(screen.queryByRole('button', { name: /메뉴 관리에서 열기/ })).toBeNull();
    expect(screen.getAllByText('메뉴 관리(메뉴 조회 권한 필요)')).toHaveLength(2);
  });

  it('브라우저 저장소에 넘기지 못하면 이동하지 않고 직접 찾으라고 알린다', () => {
    mocks.handOffMenuFocus.mockReturnValue(false);
    renderPanel({ status: 'ready', menus }, groups);
    fireEvent.click(screen.getByRole('button', { name: '이용 안내 메뉴 관리에서 열기' }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('메뉴 관리에서 직접 찾아 주세요'), 'error');
  });
});
