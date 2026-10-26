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
const NEW_BOARD = 'BBSMSTR_0123456789AB';
const NEW_ROUTE = `/admin/community/boards/select-board-list?bbsId=${NEW_BOARD}`;
const DETAIL = {
  bbsId: WIKI, bbsTtl: '일정 게시판', bbsTypeCd: 'BBST05', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_CALENDAR',
  fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, useYn: 'Y', version: 1, designations: [] as string[],
};
/** 지식 허브 탭도 업무 홈 카드도 없는 새 게시판 — 이용자가 찾는 길은 메뉴뿐이다. */
const NEW_DETAIL = { ...DETAIL, bbsId: NEW_BOARD, bbsTtl: '새 게시판', bbsTypeCd: 'BBST02', tmpltId: 'TMPLT_LIST' };
const MENUS = [
  { menuNo: 2000000, menuNm: '소통·지식', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
  { menuNo: 2040000, menuNm: '엔터프라이즈 위키', upMenuSn: 2000000, menuOrdr: 1, modernRoute: '/admin/help/faq?tab=WIKI', useYn: 'Y' },
];
const NEW_MENU = { menuNo: 3000100, menuNm: '새 게시판', upMenuSn: 2000000, menuOrdr: 2, modernRoute: NEW_ROUTE, useYn: 'Y' };
const nav = (...ids: number[]) => ids.map((id) => ({ type: 'NAVIGATION', code: String(id) }));
const ADMIN = { code: 'ROLE_ADMIN', name: '관리자', grants: [...nav(2000000, 2040000, 3000100), { type: 'OPERATION', code: 'BOARD_READ' }] };
const USER = { code: 'ROLE_USER', name: '사용자', grants: [...nav(2000000, 2040000), { type: 'OPERATION', code: 'BOARD_READ' }] };
const USER_SEES_NEW = { ...USER, grants: [...USER.grants, ...nav(3000100)] };

function renderTab(detail: Record<string, unknown> = {}) {
  return render(<BoardAccessTab detail={{ ...DETAIL, ...detail } as never} />);
}

const readinessSection = () => screen.getByRole('region', { name: '공개 준비 점검' });
const pathsSection = () => screen.getByRole('region', { name: '이용자가 이미 닿는 길' });
const menusSection = () => screen.getByRole('region', { name: '메뉴 연결' });
const checkItem = (name: string) => within(readinessSection()).getByText(name).closest('li') as HTMLElement;

/** 운영 화면 메뉴·접근 탭(ADR-0040 결정 8·§5.6, 공개 준비 기준은 ADR-0043 결정 3). */
describe('BoardAccessTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.permissions = ['BBS_MST_READ', 'MENU_READ', 'AUTHRT_READ'];
    mocks.access = { menuSource: { status: 'ready', menus: MENUS }, groupSource: { status: 'ready', groups: [ADMIN, USER] }, retry: vi.fn() };
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('사용 중이고 이용자가 찾는 길이 있으면 공개 준비 통과이고, 메뉴 위치·근거·노출을 보인다', () => {
    renderTab();
    expect(screen.getByText('공개 준비 통과')).toBeInTheDocument();
    expect(checkItem('이용자가 찾는 길')).toHaveTextContent('있음 — 일반 그룹에 보이는 메뉴, 지식 허브 위키 탭');
    const row = screen.getByRole('row', { name: /소통·지식 › 엔터프라이즈 위키/ });
    expect(within(row).getByText('허브 탭 ?tab=WIKI')).toBeInTheDocument();
    expect(within(row).getByText('일반 그룹 표시: 관리자, 사용자')).toBeInTheDocument();
    expect(within(row).getByText(/메뉴 이름이 게시판 이름\(일정 게시판\)과 다릅니다/)).toBeInTheDocument();
  });

  // [ADR-0043 결정 3] 메뉴는 접근을 막지 않는다 — 허브 탭이 그리는 게시판은 메뉴가 관리자 그룹에만 보여도 찾는 길이 있다.
  it('지식 허브 탭이 그리는 게시판은 메뉴가 관리자 그룹에만 보여도 찾는 길이 있다', () => {
    mocks.access.groupSource = { status: 'ready', groups: [ADMIN, { ...USER, grants: [] }] };
    renderTab();
    expect(screen.getByText('공개 준비 통과')).toBeInTheDocument();
    expect(checkItem('이용자가 찾는 길')).toHaveTextContent('있음 — 지식 허브 위키 탭');
  });

  it('관리자 그룹에만 보이는 메뉴뿐이면 공개 준비를 통과하지 못하고 메뉴 연결로 안내한다(수용 시나리오 4)', () => {
    mocks.access.menuSource = { status: 'ready', menus: [...MENUS, NEW_MENU] };
    mocks.access.groupSource = { status: 'ready', groups: [ADMIN, USER] };
    renderTab(NEW_DETAIL);
    expect(screen.getByText('공개 준비 통과하지 못함')).toBeInTheDocument();
    expect(screen.getByText('관리자 그룹만: 관리자')).toBeInTheDocument();
    const item = checkItem('이용자가 찾는 길');
    expect(item).toHaveTextContent('일반 그룹에 보이는 활성 메뉴·지식 허브 탭·업무 홈 카드가 없습니다. 관리자 그룹에만 보이는 메뉴는 세지 않습니다.');
    // 연결된 메뉴를 고치는 곳은 아래 메뉴 연결 표다 — 주소를 바꾸지 않고 그 절 제목으로 초점을 옮긴다.
    fireEvent.click(within(item).getByRole('button', { name: '메뉴 연결 보기' }));
    expect(screen.getByRole('heading', { level: 2, name: '메뉴 연결' })).toHaveFocus();
  });

  it('일반 그룹에 보이는 메뉴가 생기면 메뉴로만 닿는 게시판도 통과다', () => {
    mocks.access.menuSource = { status: 'ready', menus: [...MENUS, NEW_MENU] };
    mocks.access.groupSource = { status: 'ready', groups: [ADMIN, USER_SEES_NEW] };
    renderTab(NEW_DETAIL);
    expect(screen.getByText('공개 준비 통과')).toBeInTheDocument();
  });

  it('메뉴 원장을 볼 권한이 없으면 확인 권한 없음과 확인 불가로 보이고 연결 없음으로 추정하지 않는다', () => {
    mocks.permissions = ['BBS_MST_READ', 'AUTHRT_READ'];
    mocks.access.menuSource = { status: 'no-permission' };
    renderTab(NEW_DETAIL);
    expect(screen.getByText(/메뉴 원장을 볼 권한\(MENU_READ\)이 없어 메뉴 연결을 확인할 수 없습니다/)).toBeInTheDocument();
    expect(screen.getByText('공개 준비 확인 불가')).toBeInTheDocument();
    expect(checkItem('이용자가 찾는 길')).toHaveTextContent('메뉴 원장이나 그룹을 볼 권한이 없어 메뉴로 닿는지 확인할 수 없습니다.');
    expect(screen.queryByText(/연결 없음/)).toBeNull();
    expect(screen.queryByRole('button', { name: '메뉴 관리에서 열기' })).toBeNull();
  });

  describe('커뮤니티 귀속 게시판(ADR-0043 결정 3)', () => {
    const bound = (inUse: boolean | null, cmntyNm: string | null = '개발 모임') =>
      ({ ...NEW_DETAIL, cmntySn: 7, community: { cmntySn: 7, cmntyNm, inUse } });

    it('커뮤니티가 이용 가능하면 메뉴 없이 통과이고, 메뉴 대신 커뮤니티 입구를 안내한다', () => {
      mocks.permissions = ['BBS_MST_READ', 'MENU_READ', 'AUTHRT_READ', 'MENU_CREATE', 'MENU_UPDATE'];
      renderTab(bound(true));
      expect(screen.getByText('공개 준비 통과')).toBeInTheDocument();
      expect(checkItem('이용자가 찾는 길')).toHaveTextContent('귀속 커뮤니티 화면으로 회원이 들어옵니다(‘개발 모임’ 커뮤니티 회원).');
      expect(within(menusSection()).getByText(/이 게시판의 입구는 커뮤니티 화면입니다/)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: '메뉴에 붙이기' })).toBeNull();
      expect(within(pathsSection()).getByText('나오지 않습니다 — 커뮤니티 귀속 게시판은 통합 검색에서 빠집니다.')).toBeInTheDocument();
    });

    it('귀속 커뮤니티가 사용 중지면 입구가 없어 통과하지 못한다', () => {
      renderTab(bound(false));
      expect(screen.getByText('공개 준비 통과하지 못함')).toBeInTheDocument();
      expect(checkItem('이용자가 찾는 길')).toHaveTextContent('귀속 커뮤니티가 사용 중지라 이용자가 들어갈 입구가 없습니다.');
      expect(within(pathsSection()).getByText('귀속 커뮤니티가 사용 중지라 입구가 없습니다.')).toBeInTheDocument();
    });

    it('귀속 커뮤니티를 확인할 수 없으면 확인 불가다', () => {
      renderTab(bound(null, null));
      expect(screen.getByText('공개 준비 확인 불가')).toBeInTheDocument();
      expect(checkItem('이용자가 찾는 길')).toHaveTextContent('귀속 커뮤니티의 사용 여부를 확인할 수 없습니다');
    });

    it('귀속 게시판에 일반 그룹에 보이는 메뉴가 있으면 경고한다', () => {
      mocks.access.menuSource = { status: 'ready', menus: [...MENUS, NEW_MENU] };
      mocks.access.groupSource = { status: 'ready', groups: [ADMIN, USER_SEES_NEW] };
      renderTab(bound(true));
      expect(screen.getByRole('note', { name: '공개 준비 경고' }))
        .toHaveTextContent('커뮤니티 귀속 게시판인데 일반 그룹에 보이는 메뉴가 있습니다.');
    });
  });

  it('사용 안 함 게시판은 설정 탭으로 가는 바로가기를 두고, 일반 그룹에 보이는 메뉴가 있으면 경고한다', () => {
    renderTab({ useYn: 'N' });
    expect(screen.getByText('공개 준비 통과하지 못함')).toBeInTheDocument();
    fireEvent.click(within(checkItem('게시판 사용')).getByRole('button', { name: '설정 탭에서 사용으로 바꾸기' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/community/boards/master/BBSMSTR_EEEEEEEEEEEE');
    expect(screen.getByRole('note', { name: '공개 준비 경고' })).toHaveTextContent('사용 안 함 게시판인데 일반 그룹에 보이는 활성 메뉴가 있습니다.');
    expect(screen.getByText('지금은 사용 안 함이라 위 길로 들어와도 이용자에게 닫혀 있습니다.')).toBeInTheDocument();
  });

  it('이용자가 이미 닿는 길은 통합 검색·업무 홈 카드·지식 허브 탭·커뮤니티 화면을 보인다', () => {
    renderTab({ designations: ['NOTICE', 'FAQ'], bbsId: 'BBSMSTR_AAAAAAAAAAAA', bbsTtl: '공지사항' });
    const paths = pathsSection();
    expect(within(paths).getByText('나옵니다 — 사용 중인 게시판의 글은 메뉴가 없어도 통합 검색 결과에 나옵니다.')).toBeInTheDocument();
    expect(within(paths).getByText('업무 홈 공지 카드')).toBeInTheDocument();
    expect(within(paths).getByText('자주 묻는 질문 탭')).toBeInTheDocument();
    expect(within(paths).getByText('해당 없음 — 커뮤니티 귀속 게시판이 아닙니다.')).toBeInTheDocument();
  });

  // 추가 조건은 서버 판정과 같다 — 지정 게시판 편집 권한은 쓰기 판정을 지나는 모든 동작에, 커뮤니티 조건은 조회 대행 권한 행만 면제한다.
  it('게시글 권한 표의 추가 조건이 서버의 쓰기·커뮤니티 판정과 같다', () => {
    renderTab({ designations: ['NOTICE'], cmntySn: 7 });
    const table = screen.getByRole('table', { name: '게시글 권한' });
    const conditionOf = (action: string) => within(table).getByRole('row', { name: new RegExp(`^${action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) })
      .querySelectorAll('td')[2].textContent ?? '';

    for (const action of ['글 쓰기', '내 글 고치기·해결 표시', '내 글 지우기', '남의 글 고치기', '남의 글 지우기', '게시 기간 바꾸기(운영 화면)',
      '상단 고정·해제(운영 화면)']) {
      expect(conditionOf(action)).toContain('공지 편집 권한(NOTICE_EDIT)');
      expect(conditionOf(action)).toContain('커뮤니티 승인 회원');
    }
    for (const action of ['글 보기', '추천', '내 추천 취소', '댓글 보기', '댓글 쓰기']) {
      expect(conditionOf(action)).not.toContain('NOTICE_EDIT');
      expect(conditionOf(action)).toContain('커뮤니티 승인 회원');
    }
    const readAll = conditionOf('비밀글·예약·게시 종료 글·사용 안 함 게시판 보기');
    expect(readAll).not.toContain('커뮤니티 승인 회원');
    expect(readAll).toContain('사용 안 함 게시판은 이 권한으로만 본다');
    // [2026-10-23 ADR-0040 결정 3] B1 부터 시작일도 집행한다 — 글 보기 조건은 종료일만이 아니라 게시 기간 전체를 말한다.
    expect(conditionOf('글 보기')).toContain('게시 기간 안(시작일 전·종료일 뒤 글은 글쓴이 본인만)');
    expect(conditionOf('글 보기')).not.toContain('게시 종료 전');
    expect(conditionOf('공개 FAQ 보기(FAQ 지정 게시판)')).toContain('게시 기간 안');
    expect(conditionOf('글 쓰기')).toContain('예약 게시를 받아야 함');
    expect(conditionOf('내 글 고치기·해결 표시')).toContain('게시가 시작된 글의 시작일은 게시글 전체 수정 권한(BOARD_UPDATE_ALL)도 있어야 바꿈');
    // 운영 화면의 게시 기간 바꾸기는 관리 API 라 관리자 역할도 필요하다(URL 게이트).
    expect(conditionOf('게시 기간 바꾸기(운영 화면)')).toContain('관리자 역할도 필요');
    // [2026-10-23 ADR-0040 결정 5·6] 상단 고정도 관리 API 다. 설정은 새 고정만 막고 해제는 늘 되며, 답글은 고정하지 않는다.
    expect(conditionOf('상단 고정·해제(운영 화면)')).toContain('관리자 역할도 필요');
    expect(conditionOf('상단 고정·해제(운영 화면)')).toContain('고정은 게시판이 상단 고정을 받을 때 상한까지(해제는 늘 가능)');
    expect(conditionOf('상단 고정·해제(운영 화면)')).toContain('원글만');
    expect(conditionOf('추천')).toContain('글을 볼 수 있어야 함');
    expect(conditionOf('댓글 쓰기')).toContain('글을 볼 수 있어야 함');
    // [2026-10-23 ADR-0040 결정 6·7] 추천은 게시판이 추천을 받을 때만, 내 추천 취소는 설정과 무관하다. 필수 비밀글 정책은 쓰기에 붙는다.
    expect(conditionOf('추천')).toContain('게시판이 추천을 받음');
    expect(conditionOf('내 추천 취소')).toContain('내가 한 추천만(추천을 받지 않는 게시판에서도 가능)');
    expect(conditionOf('내 추천 취소')).not.toContain('게시판이 추천을 받음');
    expect(conditionOf('글 쓰기')).toContain('비밀글 정책이 필수면 비밀글로 저장');
  });

  // 추천 취소는 추천과 같은 권한(BOARD_LIKE)이다 — 서버 바인딩(cancelLikePost)과 같다.
  it('내 추천 취소는 추천과 같은 권한을 요구한다', () => {
    renderTab();
    const table = screen.getByRole('table', { name: '게시글 권한' });
    const row = within(table).getByRole('row', { name: /^내 추천 취소/ });
    expect(within(row).getByText('BOARD_LIKE')).toBeInTheDocument();
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

  // [2026-10-23 ADR-0040 결정 5] 상단 고정 권한(BOARD_PIN)은 기본 배정이 없다 — 배정된 그룹이 없으면 그렇게 말하고 지어내지 않는다.
  it('상단 고정 권한은 그 권한을 가진 그룹만 보이고, 없으면 배정된 그룹 없음이다', () => {
    const table = () => screen.getByRole('table', { name: '게시글 권한' });
    const { unmount } = renderTab();
    const unassigned = within(table()).getByRole('row', { name: /^상단 고정·해제\(운영 화면\)/ });
    expect(within(unassigned).getByText('BOARD_PIN')).toBeInTheDocument();
    expect(within(unassigned).getByText('배정된 그룹 없음')).toBeInTheDocument();
    unmount();

    mocks.access.groupSource = { status: 'ready', groups: [
      { code: 'ROLE_BOARD_OPS', name: '게시판 운영', grants: [{ type: 'OPERATION', code: 'BOARD_PIN' }] },
      ADMIN,
    ] };
    renderTab();
    const assigned = within(table()).getByRole('row', { name: /^상단 고정·해제\(운영 화면\)/ });
    // 배정된 그룹 칸(필요한 권한 다음 칸)은 BOARD_PIN 을 가진 그룹만이다 — 관리자 그룹이라고 지어내지 않는다.
    expect(within(assigned).getAllByRole('cell')[1]).toHaveTextContent(/^게시판 운영$/);
  });

  it('메뉴 원천이 먼저 확정돼도 그룹 조회 중이면 판정하지 않고 확인하는 중이다', () => {
    mocks.permissions = ['BBS_MST_READ', 'AUTHRT_READ'];
    mocks.access.menuSource = { status: 'no-permission' };
    mocks.access.groupSource = null;
    renderTab({ designations: ['NOTICE'] });
    expect(screen.getAllByText('확인하는 중…', { selector: '[role="status"]' }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/그룹을 볼 권한이 없거나 불러오지 못해/)).toBeNull();
    expect(screen.queryByText('공개 준비 확인 불가')).toBeNull();
  });

  it('그룹을 볼 권한이 없으면 보이는 그룹과 배정된 그룹 칸이 확인 권한 없음이고, 편집 권한 배정은 확인 불가다', () => {
    mocks.permissions = ['BBS_MST_READ', 'MENU_READ'];
    mocks.access.groupSource = { status: 'no-permission' };
    renderTab({ designations: ['NOTICE'] });
    const row = screen.getByRole('row', { name: /소통·지식 › 엔터프라이즈 위키/ });
    expect(within(row).getByText('확인 권한 없음')).toBeInTheDocument();
    const permissions = screen.getByRole('table', { name: '게시글 권한' });
    expect(within(permissions).getAllByText('확인 권한 없음').length).toBeGreaterThan(0);
    expect(screen.getByText('공개 준비 확인 불가')).toBeInTheDocument();
    // 권한 화면을 열 수 없으면 고치는 곳 바로가기를 두지 않는다.
    expect(within(checkItem('지정 게시판 편집 권한 배정')).queryByRole('button')).toBeNull();
  });

  it('공지 지정 게시판인데 공지 편집 권한이 어느 그룹에도 없으면 그 권한을 알리고 권한 화면으로 가는 바로가기를 둔다', () => {
    renderTab({ designations: ['NOTICE'] });
    expect(screen.getByText('공개 준비 통과하지 못함')).toBeInTheDocument();
    expect(screen.getByText('어느 그룹에도 배정되지 않은 편집 권한: NOTICE_EDIT')).toBeInTheDocument();
    fireEvent.click(within(checkItem('지정 게시판 편집 권한 배정')).getByRole('button', { name: '권한 관리에서 배정하기' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/security/authority');
  });

  // [ADR-0043 결정 1] 메뉴 관리로 넘길 때 돌아갈 곳(이 탭)을 함께 싣는다 — 메뉴 관리가 '게시판 공개 준비로 돌아가기' 를 보인다.
  it('연결된 메뉴는 그 메뉴와 돌아갈 곳을 넘기고 메뉴 관리를 연다 — 주소에는 싣지 않는다', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 관리에서 열기' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
    expect(JSON.parse(window.sessionStorage.getItem('egov.menu-focus-handoff.v1:menu-focus') ?? '{}')).toMatchObject({
      menuSn: 2040000,
      returnTo: { route: '/admin/community/boards/master/BBSMSTR_EEEEEEEEEEEE?tab=access', label: '게시판 공개 준비로 돌아가기' },
    });
  });

  it('메뉴를 넘기지 못하면 이동하지 않고 알린다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: '메뉴 관리에서 열기' }));
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('메뉴를 넘기지 못했습니다'), 'error');
  });

  it('연결 없음이고 메뉴 등록·수정 권한이 없으면 요청을 안내하고 등록할 게시판 주소를 보인다', () => {
    renderTab(NEW_DETAIL);
    expect(screen.getByText('이 게시판을 가리키는 메뉴가 없습니다(연결 없음).')).toBeInTheDocument();
    expect(screen.getByText(/메뉴 연결은 메뉴 관리 권한\(메뉴 등록·수정\)이 있는 관리자에게 요청하세요/)).toBeInTheDocument();
    expect(screen.getByText(NEW_ROUTE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '메뉴 관리에서 열기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '메뉴에 붙이기' })).toBeNull();
    expect(screen.getByRole('button', { name: '주소 복사' })).toBeInTheDocument();
  });

  it('연결 없음이고 메뉴 등록·수정 권한이 있으면 메뉴에 붙이기가 게시판 주소·이름·돌아갈 곳을 넘기고 메뉴 관리를 연다', () => {
    mocks.permissions = ['BBS_MST_READ', 'MENU_READ', 'AUTHRT_READ', 'MENU_CREATE', 'MENU_UPDATE'];
    renderTab(NEW_DETAIL);
    // 공개 준비의 찾는 길 항목과 메뉴 연결 절에 같은 동작이 있다.
    expect(within(checkItem('이용자가 찾는 길')).getByRole('button', { name: '메뉴에 붙이기' })).toBeInTheDocument();
    fireEvent.click(within(menusSection()).getByRole('button', { name: '메뉴에 붙이기' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus');
    expect(JSON.parse(window.sessionStorage.getItem('egov.screen-handoff.v1:menu-add-screen') ?? '{}')).toMatchObject({
      route: NEW_ROUTE,
      label: '새 게시판',
      returnTo: { route: '/admin/community/boards/master/BBSMSTR_0123456789AB?tab=access', label: '게시판 공개 준비로 돌아가기' },
    });
  });

  it('메뉴에 붙이기를 넘기지 못하면 이동하지 않고 직접 등록할 주소를 보인다', () => {
    mocks.permissions = ['BBS_MST_READ', 'MENU_READ', 'AUTHRT_READ', 'MENU_CREATE', 'MENU_UPDATE'];
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('quota', 'QuotaExceededError'); });
    renderTab(NEW_DETAIL);
    fireEvent.click(within(menusSection()).getByRole('button', { name: '메뉴에 붙이기' }));
    expect(mocks.push).not.toHaveBeenCalled();
    const alert = within(menusSection()).getByRole('alert');
    expect(alert).toHaveTextContent('메뉴 관리에 게시판을 넘기지 못했습니다.');
    expect(within(alert).getByText(NEW_ROUTE)).toBeInTheDocument();
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
