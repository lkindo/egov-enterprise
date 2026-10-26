import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  params: new URLSearchParams(),
  permissions: ['BBS_MST_READ'] as string[],
  getBoardMaster: vi.fn(),
  back: vi.fn(),
  access: { menuSource: { status: 'no-permission' } as unknown, groupSource: { status: 'no-permission' } as unknown, retry: () => undefined },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push, back: mocks.back }),
  usePathname: () => '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA',
  useSearchParams: () => mocks.params,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { getBoardMaster: mocks.getBoardMaster },
}));
vi.mock('../../useBoardAccessSources', () => ({ useBoardAccessSources: () => mocks.access }));
// 위치 경로는 메뉴 트리를 읽는다 — 트리가 없으면 화면이 넘긴 경로를 쓴다.
vi.mock('@/services/business/user/MenuService', () => ({ menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) } }));
vi.mock('../BoardPostsTab', () => ({ BoardPostsTab: () => <p>게시물 패널</p> }));
vi.mock('../BoardSettingsTab', () => ({ BoardSettingsTab: () => <p>설정 패널</p> }));
vi.mock('../BoardAccessTab', () => ({ BoardAccessTab: () => <p>메뉴·접근 패널</p> }));

import { recordRoute, resetRouteHistory } from '@/lib/navigation/previous-route';
import { BoardOperationsClient } from '../BoardOperationsClient';

const DETAIL = {
  bbsId: 'BBSMSTR_AAAAAAAAAAAA', bbsTtl: '공지사항', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_LIST',
  fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, useYn: 'Y', version: 2, designations: ['NOTICE', 'FAQ'],
};

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><BoardOperationsClient bbsId="BBSMSTR_AAAAAAAAAAAA" /></QueryClientProvider>);
}

/** 게시판 운영 화면 셸(ADR-0040 결정 2) — 탭 권한·주소·없는 게시판·사용 안 함 안내. */
describe('BoardOperationsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.params = new URLSearchParams();
    mocks.permissions = ['BBS_MST_READ'];
    mocks.getBoardMaster.mockResolvedValue(DETAIL);
    mocks.access = { menuSource: { status: 'no-permission' }, groupSource: { status: 'no-permission' }, retry: () => undefined };
    resetRouteHistory();
  });

  it('머리에 이름·사용 상태·지정 용도를 보이고 기본은 설정 탭이다', async () => {
    renderClient();
    expect(await screen.findByRole('heading', { level: 1, name: '공지사항' })).toBeInTheDocument();
    expect(screen.getByText('사용 중')).toBeInTheDocument();
    expect(screen.getByText('공지 지정')).toBeInTheDocument();
    expect(screen.getByText('FAQ 지정')).toBeInTheDocument();
    expect(screen.getByText('설정 패널')).toBeInTheDocument();
  });

  it('게시물 조회 대행 권한이 없으면 게시물 탭이 없고 ?tab=posts 는 설정 탭으로 연다', async () => {
    mocks.params = new URLSearchParams('tab=posts');
    renderClient();
    await screen.findByText('설정 패널');
    expect(screen.queryByRole('tab', { name: '게시물' })).toBeNull();
    expect(screen.getByRole('tab', { name: '설정' })).toHaveAttribute('aria-selected', 'true');
  });

  it('게시물 조회 대행 권한이 있으면 게시물 탭을 연다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL'];
    mocks.params = new URLSearchParams('tab=posts');
    renderClient();
    expect(await screen.findByText('게시물 패널')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '게시물' })).toHaveAttribute('aria-selected', 'true');
  });

  it('모르는 탭은 설정 탭이다', async () => {
    mocks.params = new URLSearchParams('tab=menu');
    renderClient();
    expect(await screen.findByText('설정 패널')).toBeInTheDocument();
  });

  it('탭을 바꾸면 tab 만 다시 싣고(모르는 키·bbsId 는 버린다), 기본 탭이면 tab 을 지운다', async () => {
    mocks.params = new URLSearchParams('tab=settings&bbsId=BBSMSTR_ZZZZZZZZZZZZ&foo=1');
    renderClient();
    await screen.findByText('설정 패널');
    fireEvent.click(screen.getByRole('tab', { name: '메뉴·접근' }));
    expect(mocks.replace).toHaveBeenLastCalledWith('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA?tab=access', { scroll: false });
    fireEvent.click(screen.getByRole('tab', { name: '설정' }));
    expect(mocks.replace).toHaveBeenLastCalledWith('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA', { scroll: false });
  });

  it('사용 안 함 게시판이면 이용자에게 닫혀 있다고 알린다', async () => {
    mocks.getBoardMaster.mockResolvedValue({ ...DETAIL, useYn: 'N' });
    renderClient();
    expect(await screen.findByText('사용 안 함')).toBeInTheDocument();
    expect(screen.getByText(/이용자에게 읽기·쓰기 모두 닫혀 있고, 운영자는 글을 정리할 수 있습니다/)).toBeInTheDocument();
  });

  // [2026-10-26 ADR-0043, G5] 머리에 메뉴 상태·이용 범위·위치 경로를 보인다.
  it('머리에 위치 경로·메뉴 상태·이용 범위·화면 유형을 보인다', async () => {
    mocks.access = {
      menuSource: { status: 'ready', menus: [
        { menuNo: 2000000, menuNm: '소통·지식', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
        { menuNo: 2060000, menuNm: '자주 묻는 질문', upMenuSn: 2000000, menuOrdr: 1, modernRoute: '/admin/help/faq?tab=FAQ', useYn: 'Y' },
      ] },
      groupSource: { status: 'ready', groups: [{ code: 'ROLE_USER', name: '사용자', grants: [{ type: 'NAVIGATION', code: '2000000' }, { type: 'NAVIGATION', code: '2060000' }] }] },
      retry: () => undefined,
    };
    renderClient();
    await screen.findByRole('heading', { level: 1, name: '공지사항' });
    const trail = screen.getByRole('navigation', { name: '현재 위치' });
    expect(trail).toHaveTextContent('관리 센터');
    expect(trail).toHaveTextContent('콘텐츠 운영');
    expect(within(trail).getByRole('link', { name: '게시판 관리' })).toHaveAttribute('href', '/admin/community/boards/master');
    expect(within(trail).getByText('공지사항')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('메뉴 일반 그룹 표시 1')).toBeInTheDocument();
    expect(screen.getByText('이용 범위: 전체')).toBeInTheDocument();
    expect(screen.getByText('Enterprise List')).toBeInTheDocument();
  });

  it('메뉴 원장을 볼 권한이 없으면 메뉴 상태는 확인 권한 없음이다', async () => {
    renderClient();
    expect(await screen.findByText('메뉴 확인 권한 없음')).toBeInTheDocument();
  });

  it('유형 코드 짝이 정본과 다르면 템플릿 이름 옆에 그 사실을 덧붙인다', async () => {
    mocks.getBoardMaster.mockResolvedValue({ ...DETAIL, bbsTypeCd: 'BBST01', tmpltId: 'TMPLAT_BOARD_DEFAULT' });
    renderClient();
    expect(await screen.findByText('기본 목록형(레이아웃 미지정) · 유형 코드 짝 불일치(저장된 코드 BBST01)')).toBeInTheDocument();
  });

  it('귀속 커뮤니티가 사용 중지면 이용 범위와 함께 입구가 없다고 알리고, 모르면 확인 불가다', async () => {
    mocks.getBoardMaster.mockResolvedValue({ ...DETAIL, cmntySn: 7, community: { cmntySn: 7, cmntyNm: '개발 모임', inUse: false } });
    const { unmount } = renderClient();
    expect(await screen.findByText('이용 범위: ‘개발 모임’ 커뮤니티 회원')).toBeInTheDocument();
    expect(screen.getByText(/귀속 커뮤니티가 사용 중지라 이용자가 이 게시판에 들어갈 입구가 없습니다/)).toBeInTheDocument();
    unmount();

    mocks.getBoardMaster.mockResolvedValue({ ...DETAIL, cmntySn: 7 });
    renderClient();
    expect(await screen.findByText('이용 범위: 커뮤니티 회원 (커뮤니티 확인 불가)')).toBeInTheDocument();
  });

  // [ADR-0043] 마법사의 결과 화면은 화면 안 상태라 뒤로 가면 빈 마법사가 열린다 — 마법사에서 왔으면 목록으로 간다.
  it('목록으로는 게시판 관리 목록에서 왔을 때만 뒤로 가고, 마법사에서 왔으면 목록으로 간다', async () => {
    recordRoute('/admin/community/boards/maker');
    recordRoute('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA');
    const { unmount } = renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '목록으로' }));
    expect(mocks.back).not.toHaveBeenCalled();
    expect(mocks.push).toHaveBeenLastCalledWith('/admin/community/boards/master');
    unmount();

    resetRouteHistory();
    recordRoute('/admin/community/boards/master');
    recordRoute('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA');
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '목록으로' }));
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('없는 게시판이면 그렇게 말하고 탭을 그리지 않는다', async () => {
    mocks.getBoardMaster.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } });
    renderClient();
    expect(await screen.findByRole('heading', { name: '없는 게시판입니다' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
