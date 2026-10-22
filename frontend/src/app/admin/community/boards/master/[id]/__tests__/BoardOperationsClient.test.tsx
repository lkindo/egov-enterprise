import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  params: new URLSearchParams(),
  permissions: ['BBS_MST_READ'] as string[],
  getBoardMaster: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push, back: vi.fn() }),
  usePathname: () => '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA',
  useSearchParams: () => mocks.params,
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { getBoardMaster: mocks.getBoardMaster },
}));
vi.mock('../BoardPostsTab', () => ({ BoardPostsTab: () => <p>게시물 패널</p> }));
vi.mock('../BoardSettingsTab', () => ({ BoardSettingsTab: () => <p>설정 패널</p> }));
vi.mock('../BoardAccessTab', () => ({ BoardAccessTab: () => <p>메뉴·접근 패널</p> }));

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

  it('없는 게시판이면 그렇게 말하고 탭을 그리지 않는다', async () => {
    mocks.getBoardMaster.mockRejectedValue({ isAxiosError: true, response: { status: 404, data: {} } });
    renderClient();
    expect(await screen.findByRole('heading', { name: '없는 게시판입니다' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
