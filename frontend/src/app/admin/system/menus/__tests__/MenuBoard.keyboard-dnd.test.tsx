import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';

/**
 * [2026-10-02 D1] 보드의 키보드 끌기 — dnd-kit 을 모의하지 않고 실제 키보드 센서로 끈다(jsdom 에서도 센서·알림 영역이 돈다).
 *
 * 화면 안내(aria-live polite 한 곳)와 dnd-kit 자체 알림 영역이 서로 반대로 말하지 않는지, 끌기 시작(=항목 고르기)이 상세의
 * 이름 칸으로 포커스를 빼앗지 않는지를 본다. 모의 끌기(MenuAdminClient.test)로는 dnd-kit 알림 영역이 아예 없어 볼 수 없다.
 */
const mocks = vi.hoisted(() => ({ confirm: vi.fn(), toast: vi.fn(), save: vi.fn(), reload: vi.fn(), matrix: vi.fn(), refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: mocks.refresh, back: vi.fn() }),
  usePathname: () => '/admin/system/menus',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav aria-label="현재 위치" /> }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'admin', permissions: ['MENU_READ', 'MENU_CREATE', 'MENU_UPDATE', 'MENU_DELETE'], authorizationVersion: 'v1' }, loading: false }),
}));
vi.mock('@/services/foundation/system/MenuAdminService', () => ({
  menuAdminService: { saveMenuStructure: mocks.save, getMenuStructure: mocks.reload },
}));
vi.mock('@/services/foundation/system/AuthorizationAdminService', () => ({
  authorizationAdminService: { getGrantMatrix: mocks.matrix },
}));

import MenuAdminClient from '../MenuAdminClient';

const menu = (menuNo: number, menuNm: string, upMenuSn: number | null, menuOrdr: number, modernRoute: string | null = null) => ({
  menuNo, menuNm, upMenuSn, menuOrdr, modernRoute, menuExpln: null, useYn: 'Y' as const, prgrmFileNm: null,
});
/*
  빈 영역(9) — 하위가 없어 삭제 예정으로 표시할 수 있다(키보드 센서는 위치 좌표가 없어 첫 놓을 곳인 그 영역 탭을 고른다).
  업무(1) ─ 결재(2) ─ 결재함(3), 권한별 메뉴(4)
*/
const MENUS = [
  menu(9, '빈 영역', null, 0),
  menu(1, '업무', null, 1),
  menu(2, '결재', 1, 1),
  menu(3, '결재함', 2, 1, '/approvals'),
  menu(4, '권한별 메뉴', 2, 2, '/admin/system/menus/by-authority'),
];

async function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () => {
    render(
      <QueryClientProvider client={client}>
        <React.Suspense fallback={<p>불러오는 중</p>}>
          <MenuAdminClient structurePromise={Promise.resolve({ data: { version: 'v1', menus: MENUS }, error: null })} />
        </React.Suspense>
      </QueryClientProvider>,
    );
  });
}

const tick = () => act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
const dndRegion = () => document.querySelector('[id^="DndLiveRegion"]');
const pageRegion = () => document.querySelector('p[aria-live="polite"]');

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  mocks.confirm.mockResolvedValue(true);
});

describe('키보드 끌기(실제 dnd-kit)', () => {
  it('놓을 수 없는 자리에 놓으면 끌기 안내도 옮겼다고 말하지 않고, 화면 안내가 이유를 말한다', async () => {
    await renderClient();
    fireEvent.click(screen.getByRole('button', { name: /^빈 영역 ID: / }));
    fireEvent.click(screen.getByRole('button', { name: '메뉴 삭제' }));
    fireEvent.click(screen.getByRole('tab', { name: /^업무/ }));

    const handle = screen.getByRole('button', { name: '결재함 끌어서 옮기기' });
    handle.focus();
    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    await tick();
    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
    await tick();
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    await tick();

    // 손잡이의 지시문은 보드에 맞는 문장이다 — 방향키로 다른 카드·영역 탭까지 가면 상위가 바뀐다.
    const describedBy = handle.getAttribute('aria-describedby');
    expect(describedBy ? document.getElementById(describedBy)?.textContent : '').toContain('다른 카드나 영역 탭 위에 놓으면 상위 메뉴가 바뀝니다.');
    expect(pageRegion()?.textContent).toContain('결재함 메뉴를 그 자리로 옮길 수 없습니다. 삭제 예정 메뉴 아래로는 옮길 수 없습니다.');
    expect(dndRegion()?.textContent ?? '').not.toContain('옮겼습니다');
    expect(dndRegion()?.textContent ?? '').toContain('삭제 예정 메뉴 아래로는 옮길 수 없습니다.');
  });

  it('새 메뉴를 만들었다 지운 뒤에도, 끌기를 시작하면(항목을 고르면) 포커스는 끌기 손잡이에 남는다', async () => {
    await renderClient();
    fireEvent.click(screen.getByRole('tab', { name: /^업무/ }));
    fireEvent.click(screen.getByRole('button', { name: '결재 아래 화면 추가' }));
    await tick();
    fireEvent.click(screen.getByRole('button', { name: '새 메뉴 지우기' }));
    await tick();
    // 다른 영역 탭에 다녀와 상세를 한 번 닫는다 — 다시 열리는 상세가 지난 포커스 요청을 다시 쓰면 안 된다.
    fireEvent.click(screen.getByRole('tab', { name: /^빈 영역/ }));
    fireEvent.click(screen.getByRole('tab', { name: /^업무/ }));
    expect(screen.getByText('메뉴를 선택하세요')).toBeInTheDocument();

    const handle = screen.getByRole('button', { name: '결재 끌어서 옮기기' });
    handle.focus();
    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    await tick();
    expect(screen.getByRole('button', { name: /^결재 ID: / })).toHaveAttribute('aria-current', 'true');
    expect(handle).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    await tick();
  });
});
