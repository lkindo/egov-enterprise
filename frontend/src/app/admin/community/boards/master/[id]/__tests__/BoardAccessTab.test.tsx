import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: ['BBS_MST_READ', 'MENU_READ', 'AUTHRT_READ'] as string[],
  push: vi.fn(),
  toast: vi.fn(),
  access: { menuSource: null as unknown, groupSource: null as unknown, retry: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('../../useBoardAccessSources', () => ({ useBoardAccessSources: () => mocks.access }));

import { BoardAccessTab } from '../BoardAccessTab';

const WIKI = 'BBSMSTR_EEEEEEEEEEEE';
const DETAIL = {
  bbsId: WIKI, bbsTtl: '일정 게시판', bbsTypeCd: 'BBST05', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_CALENDAR',
  fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, useYn: 'Y', version: 1, designations: [] as string[],
};
const MENUS = [
  { menuNo: 2000000, menuNm: '소통·지식', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
  { menuNo: 2040000, menuNm: '엔터프라이즈 위키', upMenuSn: 2000000, menuOrdr: 1, modernRoute: '/admin/help/faq?tab=WIKI', useYn: 'Y' },
];
const nav = (...ids: number[]) => ids.map((id) => ({ type: 'NAVIGATION', code: String(id) }));
const ADMIN = { code: 'ROLE_ADMIN', name: '관리자', grants: [...nav(2000000, 2040000), { type: 'OPERATION', code: 'BOARD_READ' }] };
const USER = { code: 'ROLE_USER', name: '사용자', grants: [...nav(2000000, 2040000), { type: 'OPERATION', code: 'BOARD_READ' }] };

function renderTab(detail: Partial<typeof DETAIL> = {}) {
  return render(<BoardAccessTab detail={{ ...DETAIL, ...detail } as never} />);
}

/** 운영 화면 메뉴·접근 탭(ADR-0040 결정 8·§5.6). */
describe('BoardAccessTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.permissions = ['BBS_MST_READ', 'MENU_READ', 'AUTHRT_READ'];
    mocks.access = { menuSource: { status: 'ready', menus: MENUS }, groupSource: { status: 'ready', groups: [ADMIN, USER] }, retry: vi.fn() };
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('사용 중이고 일반 그룹에 보이는 메뉴가 있으면 공개 준비 통과이고, 메뉴 위치·근거·노출을 보인다', () => {
    renderTab();
    expect(screen.getByText('공개 준비 통과')).toBeInTheDocument();
    const row = screen.getByRole('row', { name: /소통·지식 › 엔터프라이즈 위키/ });
    expect(within(row).getByText('허브 탭 ?tab=WIKI')).toBeInTheDocument();
    expect(within(row).getByText('일반 그룹 표시: 관리자, 사용자')).toBeInTheDocument();
    expect(within(row).getByText(/메뉴 이름이 게시판 이름\(일정 게시판\)과 다릅니다/)).toBeInTheDocument();
  });

  it('관리자 그룹에만 보이면 공개 준비를 통과하지 못한다(수용 시나리오 4)', () => {
    mocks.access.groupSource = { status: 'ready', groups: [ADMIN, { ...USER, grants: [] }] };
    renderTab();
    expect(screen.getByText('공개 준비 통과하지 못함')).toBeInTheDocument();
    expect(screen.getByText('관리자 그룹만: 관리자')).toBeInTheDocument();
    expect(screen.getByText('일반 그룹에 보이는 활성 메뉴가 없습니다.')).toBeInTheDocument();
  });

  it('메뉴 원장을 볼 권한이 없으면 확인 권한 없음과 확인 불가로 보이고 연결 없음으로 추정하지 않는다', () => {
    mocks.permissions = ['BBS_MST_READ', 'AUTHRT_READ'];
    mocks.access.menuSource = { status: 'no-permission' };
    renderTab();
    expect(screen.getByText(/메뉴 원장을 볼 권한\(MENU_READ\)이 없어 메뉴 연결을 확인할 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText('공개 준비 확인 불가')).toBeInTheDocument();
    expect(screen.queryByText(/연결 없음/)).toBeNull();
    expect(screen.queryByRole('button', { name: '메뉴 관리에서 열기' })).toBeNull();
  });

  // 추가 조건은 서버 판정과 같다 — 지정 게시판 편집 권한은 쓰기 판정을 지나는 모든 동작에, 커뮤니티 조건은 조회 대행 권한 행만 면제한다.
  it('게시글 권한 표의 추가 조건이 서버의 쓰기·커뮤니티 판정과 같다', () => {
    renderTab({ designations: ['NOTICE'], cmntySn: 7 } as never);
    const table = screen.getByRole('table', { name: '게시글 권한' });
    const conditionOf = (action: string) => within(table).getByRole('row', { name: new RegExp(`^${action}`) })
      .querySelectorAll('td')[2].textContent ?? '';

    for (const action of ['글 쓰기', '내 글 고치기·해결 표시', '내 글 지우기', '남의 글 고치기', '남의 글 지우기']) {
      expect(conditionOf(action)).toContain('공지 편집 권한(NOTICE_EDIT)');
      expect(conditionOf(action)).toContain('커뮤니티 승인 회원');
    }
    for (const action of ['글 보기', '추천', '댓글 보기', '댓글 쓰기']) {
      expect(conditionOf(action)).not.toContain('NOTICE_EDIT');
      expect(conditionOf(action)).toContain('커뮤니티 승인 회원');
    }
    const readAll = conditionOf('비밀글·게시 종료 글·사용 안 함 게시판 보기');
    expect(readAll).not.toContain('커뮤니티 승인 회원');
    expect(readAll).toContain('사용 안 함 게시판은 이 권한으로만 본다');
    // 시작일(예약)은 B1 전까지 집행하지 않는다 — 기간 조건은 게시 종료일만 말한다.
    expect(conditionOf('글 보기')).toContain('게시 종료 전');
    expect(conditionOf('글 보기')).not.toContain('게시 기간');
    expect(conditionOf('추천')).toContain('글을 볼 수 있어야 함');
    expect(conditionOf('댓글 쓰기')).toContain('글을 볼 수 있어야 함');
  });

  // 대행 권한은 기본 권한을 포함하지 않는다 — 남의 글 고치기는 BOARD_UPDATE 와 BOARD_UPDATE_ALL 을 모두 가진 그룹만 할 수 있다.
  it('배정된 그룹은 동작에 필요한 권한을 모두 가진 그룹만이다', () => {
    const op = (code: string) => ({ type: 'OPERATION', code });
    mocks.access.groupSource = { status: 'ready', groups: [
      { code: 'ROLE_EDITOR', name: '편집자', grants: [op('BOARD_UPDATE'), op('BOARD_UPDATE_ALL')] },
      { code: 'ROLE_HALF', name: '대행만', grants: [op('BOARD_UPDATE_ALL')] },
    ] };
    renderTab();
    const table = screen.getByRole('table', { name: '게시글 권한' });
    const row = within(table).getByRole('row', { name: /^남의 글 고치기/ });
    expect(within(row).getByText('BOARD_UPDATE + BOARD_UPDATE_ALL')).toBeInTheDocument();
    expect(within(row).getByText('편집자')).toBeInTheDocument();
    expect(within(row).queryByText(/대행만/)).toBeNull();
  });

  it('메뉴 원천이 먼저 확정돼도 그룹 조회 중이면 판정하지 않고 확인하는 중이다', () => {
    mocks.permissions = ['BBS_MST_READ', 'AUTHRT_READ'];
    mocks.access.menuSource = { status: 'no-permission' };
    mocks.access.groupSource = null;
    renderTab({ designations: ['NOTICE'] });
    expect(screen.getByText('확인하는 중…', { selector: '[role="status"]' })).toBeInTheDocument();
    expect(screen.queryByText(/그룹을 볼 권한이 없거나 불러오지 못해/)).toBeNull();
    expect(screen.queryByText('공개 준비 확인 불가')).toBeNull();
  });

  it('그룹을 볼 권한이 없으면 보이는 그룹과 배정된 그룹 칸이 확인 권한 없음이다', () => {
    mocks.permissions = ['BBS_MST_READ', 'MENU_READ'];
    mocks.access.groupSource = { status: 'no-permission' };
    renderTab();
    const row = screen.getByRole('row', { name: /소통·지식 › 엔터프라이즈 위키/ });
    expect(within(row).getByText('확인 권한 없음')).toBeInTheDocument();
    const permissions = screen.getByRole('table', { name: '게시글 권한' });
    expect(within(permissions).getAllByText('확인 권한 없음').length).toBeGreaterThan(0);
    expect(screen.getByText('공개 준비 확인 불가')).toBeInTheDocument();
  });

  it('공지 지정 게시판인데 공지 편집 권한이 어느 그룹에도 없으면 그 권한을 알리고 통과하지 못한다', () => {
    renderTab({ designations: ['NOTICE'] });
    expect(screen.getByText('공개 준비 통과하지 못함')).toBeInTheDocument();
    expect(screen.getByText('어느 그룹에도 배정되지 않은 편집 권한: NOTICE_EDIT')).toBeInTheDocument();
  });

  it('연결된 메뉴는 그 메뉴를 넘기고 메뉴 관리를 연다 — 주소에는 싣지 않는다', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 관리에서 열기' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
    expect(JSON.parse(window.sessionStorage.getItem('egov.menu-focus-handoff.v1:menu-focus') ?? '{}')).toMatchObject({ menuSn: 2040000 });
  });

  it('메뉴를 넘기지 못하면 이동하지 않고 알린다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 관리에서 열기' }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('메뉴를 넘기지 못했습니다'), 'error');
  });

  it('연결 없음이면 등록할 게시판 주소를 보이고 인계 단추를 두지 않는다', () => {
    renderTab({ bbsId: 'BBSMSTR_0123456789AB', bbsTtl: '새 게시판' });
    expect(screen.getByText('이 게시판을 가리키는 메뉴가 없습니다(연결 없음).')).toBeInTheDocument();
    expect(screen.getByText('/admin/community/boards/select-board-list?bbsId=BBSMSTR_0123456789AB')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '메뉴 관리에서 열기' })).toBeNull();
    expect(screen.getByRole('button', { name: '주소 복사' })).toBeInTheDocument();
  });

  it('게시글 권한 표는 모든 게시판 공통 권한과 실제 배정 그룹을 보이고, 이용자를 나누는 수단을 사실대로 말한다', () => {
    renderTab();
    const permissions = screen.getByRole('table', { name: '게시글 권한' });
    expect(within(within(permissions).getByRole('row', { name: /^글 보기/ })).getByText('관리자, 사용자')).toBeInTheDocument();
    expect(screen.getByText(/게시판별로 이용자를 나누는 수단은 커뮤니티 귀속 하나뿐입니다/)).toBeInTheDocument();
  });

  it('원천을 불러오는 동안에는 확인하는 중이다', () => {
    mocks.access.menuSource = null;
    renderTab();
    expect(screen.getAllByText(/확인하는 중/).length).toBeGreaterThan(0);
  });
});
