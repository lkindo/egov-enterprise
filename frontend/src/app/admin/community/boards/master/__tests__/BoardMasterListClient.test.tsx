import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BoardMasterListClient } from '../BoardMasterListClient';

/**
 * 게시판 관리 목록(ADR-0040 §5.2). 설정 편집·영구 삭제는 운영 화면 설정 탭으로 옮겼고(BoardSettingsTab 시험), 행의 단건 비활성화는
 * 일괄 사용 상태 바꾸기로 흡수했다. 여기서는 조회 조건·열·일괄 사용 상태 바꾸기·운영 화면 진입을 본다.
 */
const mocks = vi.hoisted(() => ({
  batchUpdateBoardMasterStatus: vi.fn(),
  confirm: vi.fn(),
  push: vi.fn(),
  refetch: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
  permissions: ['BBS_MST_READ', 'BBS_MST_CREATE', 'BBS_MST_UPDATE', 'BBS_MST_DELETE'] as string[],
  /** 화면이 마지막으로 요청한 목록 조회 키. 조회 조건이 서버 조회에 실리는지 본다. */
  lastQueryKey: undefined as unknown,
  pageInfo: { total: 2, totalPage: 1 },
  access: {
    menuSource: { status: 'no-permission' } as unknown,
    groupSource: { status: 'no-permission' } as unknown,
    retry: () => undefined,
  },
  boards: [
    {
      bbsId: 'BBSMSTR_AAAAAAAAAAAA',
      bbsTtl: '공지사항',
      // [2026-10-16 DEC-OPS-332] 서버는 유형 이름을 싣지 않는다 — 코드와 템플릿만 온다.
      bbsTypeCd: 'BBST02',
      bbsAtrbCd: 'BBSA01',
      tmpltId: 'TMPLT_LIST',
      useYn: 'Y',
      designations: ['NOTICE', 'FAQ'],
    },
    {
      bbsId: 'BBSMSTR_EEEEEEEEEEEE',
      bbsTtl: '일정 게시판',
      // 시드처럼 코드와 템플릿이 정본의 짝이 아니다(BBST03 은 정본에서 갤러리다).
      bbsTypeCd: 'BBST03',
      bbsAtrbCd: 'BBSA01',
      tmpltId: 'TMPLT_CALENDAR',
      useYn: 'N',
      designations: [],
    },
  ] as Record<string, unknown>[],
}));

vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: (options: { queryKey?: unknown }) => {
    mocks.lastQueryKey = options.queryKey;
    return {
      data: { list: mocks.boards, ...mocks.pageInfo },
      isLoading: false,
      isError: false,
      error: null,
      refetch: mocks.refetch,
      dataUpdatedAt: Date.UTC(2026, 9, 23, 1, 2, 3),
    };
  },
}));
vi.mock('../useBoardAccessSources', () => ({ useBoardAccessSources: () => mocks.access }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  // WorkListPage 의 브레드크럼이 현재 경로·쿼리를 읽는다.
  usePathname: () => '/admin/community/boards/master',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/services/business/user/MenuService', () => ({
  menuService: { getHeadMenus: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { batchUpdateBoardMasterStatus: mocks.batchUpdateBoardMasterStatus },
}));

/** 위키 메뉴(허브 탭 → 일정 게시판)가 관리자 그룹에만 보이는 메뉴 원장. 공지사항은 연결이 없다. */
const READY_ACCESS = {
  menuSource: {
    status: 'ready',
    menus: [
      { menuNo: 2000000, menuNm: '소통·지식', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
      { menuNo: 2040000, menuNm: '엔터프라이즈 위키', upMenuSn: 2000000, menuOrdr: 1, modernRoute: '/admin/help/faq?tab=WIKI', useYn: 'Y' },
    ],
  },
  groupSource: { status: 'ready', groups: [{ code: 'ROLE_ADMIN', name: '관리자', grants: [{ type: 'NAVIGATION', code: '2000000' }, { type: 'NAVIGATION', code: '2040000' }] }] },
  retry: () => undefined,
};

const INITIAL_BOARDS = mocks.boards;

const table = () => screen.getByRole('table', { name: '게시판 관리 목록' });
const rowOf = (name: string) => within(table()).getByText(name).closest('tr') as HTMLElement;

describe('BoardMasterListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['BBS_MST_READ', 'BBS_MST_CREATE', 'BBS_MST_UPDATE', 'BBS_MST_DELETE'];
    mocks.pageInfo = { total: 2, totalPage: 1 };
    mocks.boards = INITIAL_BOARDS;
    mocks.lastQueryKey = undefined;
    mocks.access = { menuSource: { status: 'no-permission' }, groupSource: { status: 'no-permission' }, retry: () => undefined };
    mocks.batchUpdateBoardMasterStatus.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('선택한 행만 사용으로 바꾸고, 바꾸기 전에 대상을 확인받는다', async () => {
    const user = userEvent.setup();
    render(<BoardMasterListClient />);
    const checkboxes = within(table()).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);

    await user.click(checkboxes[2]);
    await user.click(screen.getByRole('button', { name: /사용으로 바꾸기$/ }));

    await waitFor(() => expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledOnce());
    expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledWith(['BBSMSTR_EEEEEEEEEEEE'], 'Y');
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '게시판 사용으로 바꾸기' }));
    // 사용 여부는 운영 화면 상세(버전)·이용 화면 메타·선택지에도 보인다 — 목록만이 아니라 뿌리 키 전체를 다시 읽는다.
    await waitFor(() => expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['board-masters'] }));
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['community-boards'] });
  });

  it('확인을 취소하면 바꾸지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<BoardMasterListClient />);
    await user.click(within(table()).getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: /사용 안 함으로 바꾸기$/ }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.batchUpdateBoardMasterStatus).not.toHaveBeenCalled();
  });

  it('사용 안 함으로 바꾸는 대상에 앱이 직접 쓰는 게시판이 있으면 사용처를 나열한다', async () => {
    const user = userEvent.setup();
    render(<BoardMasterListClient />);
    await user.click(within(table()).getAllByRole('checkbox')[0]);
    await user.click(screen.getByRole('button', { name: /사용 안 함으로 바꾸기$/ }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());

    const options = mocks.confirm.mock.calls[0][0];
    expect(options).toMatchObject({ title: '게시판 사용 안 함으로 바꾸기', variant: 'destructive' });
    render(<>{options.details}</>);
    expect(screen.getByText(/\[공지사항\] 공지 지정 게시판입니다/)).toBeInTheDocument();
    expect(screen.getByText(/\[공지사항\] FAQ 지정 게시판입니다/)).toBeInTheDocument();
    // 허브 FAQ 탭이 그리는 게시판(공지사항과 같은 ID)이다.
    expect(screen.getByText(/\[공지사항\] 지식 허브의 자주 묻는 질문 탭이 이 게시판을 보입니다/)).toBeInTheDocument();
    await waitFor(() => expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledWith(
      ['BBSMSTR_AAAAAAAAAAAA', 'BBSMSTR_EEEEEEEEEEEE'], 'N'));
  });

  // [2026-10-26 ADR-0043 SET-03] 메뉴 원장은 읽었지만 그룹을 판정하지 못하면(그룹 확인 권한 없음) 노출 메뉴 없음으로 추정하지 않는다.
  it('사용 안 함 확인은 보이는 그룹을 판정하지 못한 활성 메뉴가 있으면 확인하라고 말한다', async () => {
    mocks.access = { menuSource: READY_ACCESS.menuSource, groupSource: { status: 'no-permission' }, retry: () => undefined };
    const user = userEvent.setup();
    render(<BoardMasterListClient />);
    // 위키 메뉴(허브 WIKI 탭)가 가리키는 일정 게시판만 고른다.
    await user.click(within(rowOf('일정 게시판')).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /사용 안 함으로 바꾸기$/ }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());

    render(<>{mocks.confirm.mock.calls[0][0].details}</>);
    expect(screen.getByText('메뉴 연결이나 그 메뉴가 보이는 그룹을 확인할 수 없는 게시판이 있습니다. 메뉴 관리에서 확인하세요.')).toBeInTheDocument();
    expect(screen.queryByText(/일반 그룹에 보이는 메뉴가 남습니다/)).toBeNull();
  });

  it('같은 tick 의 두 번째 요청은 보내지 않고, 실패하면 알리고 선택을 보존한다', async () => {
    let rejectWrite!: (reason?: unknown) => void;
    mocks.batchUpdateBoardMasterStatus.mockReturnValueOnce(new Promise((_, reject) => { rejectWrite = reject; }));
    render(<BoardMasterListClient />);
    const firstRow = within(table()).getAllByRole('checkbox')[1];
    fireEvent.click(firstRow);
    const action = screen.getByRole('button', { name: /사용으로 바꾸기$/ });

    act(() => {
      fireEvent.click(action);
      fireEvent.click(action);
    });

    await waitFor(() => expect(mocks.batchUpdateBoardMasterStatus).toHaveBeenCalledTimes(1));
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    rejectWrite(new Error('일괄 서버 오류'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('일괄 서버 오류', 'error'));
    expect(firstRow).toBeChecked();
    expect(action).not.toBeDisabled();
  });

  it('게시판 관리 수정 권한이 없으면 선택·일괄 동작을 두지 않는다', () => {
    mocks.permissions = ['BBS_MST_READ'];
    render(<BoardMasterListClient />);
    expect(within(table()).queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /사용 안 함으로 바꾸기$/ })).toBeNull();
  });

  it('게시판 사용 조건은 조회를 눌러야 적용되고 첫 페이지로 돌아가며, 초기화하면 전체다', async () => {
    const user = userEvent.setup();
    render(<BoardMasterListClient />);
    await user.selectOptions(screen.getByRole('combobox', { name: '게시판 사용' }), 'N');
    expect(mocks.lastQueryKey).toEqual(['board-masters', 'list', { searchKeyword: '', searchUseYn: undefined, page: 1, size: 10 }]);
    await user.click(screen.getByRole('button', { name: '조회' }));
    expect(mocks.lastQueryKey).toEqual(['board-masters', 'list', { searchKeyword: '', searchUseYn: 'N', page: 1, size: 10 }]);
    await user.click(screen.getByRole('button', { name: '초기화' }));
    expect(mocks.lastQueryKey).toEqual(['board-masters', 'list', { searchKeyword: '', searchUseYn: undefined, page: 1, size: 10 }]);
    expect(screen.getByRole('combobox', { name: '게시판 사용' })).toHaveValue('');
  });

  it('지정 용도·화면 유형·짝 불일치·사용 상태를 보인다', () => {
    render(<BoardMasterListClient />);
    const notice = rowOf('공지사항');
    expect(within(notice).getByText('공지 지정')).toBeInTheDocument();
    expect(within(notice).getByText('FAQ 지정')).toBeInTheDocument();
    expect(within(notice).getByText('Enterprise List')).toBeInTheDocument();
    expect(within(notice).queryByText(/유형 코드 짝 불일치/)).toBeNull();
    expect(within(notice).getByText('사용')).toBeInTheDocument();
    const calendar = rowOf('일정 게시판');
    // [2026-10-26 ADR-0043 결정 5] 이름은 템플릿으로 정하고, 유형 코드 짝이 정본과 다르면 그 사실을 덧붙인다.
    expect(within(calendar).getByText('Event Calendar')).toBeInTheDocument();
    expect(within(calendar).getByText('유형 코드 짝 불일치(저장된 코드 BBST03)')).toBeInTheDocument();
    expect(within(calendar).getByText('사용 안 함')).toBeInTheDocument();
  });

  it('내장 레이아웃이 아닌 템플릿은 기본 목록형(레이아웃 미지정)으로 보인다 — 코드를 보이지 않는다', () => {
    mocks.boards = [{ ...mocks.boards[0], bbsTypeCd: 'BBST01', tmpltId: 'TMPLAT_BOARD_DEFAULT' }, mocks.boards[1]];
    render(<BoardMasterListClient />);
    const notice = rowOf('공지사항');
    expect(within(notice).getByText('기본 목록형(레이아웃 미지정)')).toBeInTheDocument();
    expect(within(notice).getByText('유형 코드 짝 불일치(저장된 코드 BBST01)')).toBeInTheDocument();
  });

  // [2026-10-26 ADR-0043, G4] 이름은 운영 화면 링크이고, 행마다 탭 바로가기가 있다. 게시물 탭은 조회 대행 권한이 있을 때만이다.
  it('게시판 이름과 탭 바로가기는 운영 화면의 탭으로 가고, 게시물 조회 대행 권한이 없으면 게시물 탭이 없다', () => {
    render(<BoardMasterListClient />);
    const notice = rowOf('공지사항');
    expect(within(notice).getByRole('link', { name: '공지사항' }))
      .toHaveAttribute('href', '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA');
    expect(within(notice).getByRole('link', { name: '공지사항 설정 탭 열기' }))
      .toHaveAttribute('href', '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA');
    expect(within(notice).getByRole('link', { name: '공지사항 메뉴·접근 탭 열기' }))
      .toHaveAttribute('href', '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA?tab=access');
    expect(within(notice).queryByRole('link', { name: '공지사항 게시물 탭 열기' })).toBeNull();
  });

  it('게시물 조회 대행 권한이 있으면 이름이 게시물 탭으로 가고 게시물 탭 바로가기가 생긴다', () => {
    mocks.permissions = [...mocks.permissions, 'BOARD_READ_ALL'];
    render(<BoardMasterListClient />);
    const notice = rowOf('공지사항');
    expect(within(notice).getByRole('link', { name: '공지사항' }))
      .toHaveAttribute('href', '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA?tab=posts');
    expect(within(notice).getByRole('link', { name: '공지사항 게시물 탭 열기' }))
      .toHaveAttribute('href', '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA?tab=posts');
  });

  it('이용 화면으로 간다 — 사용 안 함 게시판은 이용 화면을 열 수 없다고 미리 말한다', () => {
    render(<BoardMasterListClient />);
    fireEvent.click(within(rowOf('공지사항')).getByRole('button', { name: '공지사항 이용 화면 열기' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/admin/community/boards/select-board-list?bbsId=BBSMSTR_AAAAAAAAAAAA');
    expect(within(rowOf('일정 게시판')).getByRole('button', { name: '일정 게시판 사용 안 함 게시판이라 이용 화면을 열 수 없습니다' }))
      .toBeDisabled();
  });

  // [2026-10-23 ADR-0040 결정 1] 조회 대행 권한자는 사용 안 함 게시판의 목록도 연다 — 운영 화면의 같은 단추와 같은 판정이다.
  it('조회 대행 권한이 있으면 사용 안 함 게시판의 이용 화면도 연다', () => {
    mocks.permissions = [...mocks.permissions, 'BOARD_READ_ALL'];
    render(<BoardMasterListClient />);
    fireEvent.click(within(rowOf('일정 게시판')).getByRole('button', { name: '일정 게시판 이용 화면 열기' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/admin/community/boards/select-board-list?bbsId=BBSMSTR_EEEEEEEEEEEE');
  });

  it('메뉴 원장을 볼 권한이 없으면 메뉴 연결 칸은 확인 권한 없음이고 메뉴 연결 조건을 쓸 수 없다', () => {
    render(<BoardMasterListClient />);
    expect(within(rowOf('공지사항')).getByText('확인 권한 없음')).toBeInTheDocument();
    const filter = screen.getByRole('combobox', { name: '메뉴 연결' });
    expect(filter).toBeDisabled();
    expect(filter).toHaveAccessibleDescription('메뉴 원장을 볼 권한이 없어 거를 수 없습니다.');
  });

  it('메뉴 연결 칸은 상태 요약 아래에 메뉴 위치·근거·노출을 보이고, 메뉴 이름과 게시판 이름이 다르면 알린다', () => {
    mocks.access = READY_ACCESS;
    render(<BoardMasterListClient />);
    const calendar = rowOf('일정 게시판');
    expect(within(calendar).getByText('소통·지식 › 엔터프라이즈 위키')).toBeInTheDocument();
    expect(calendar.textContent).toContain('허브 탭 ?tab=WIKI');
    // 요약 배지와 상세 나열이 모두 '관리자 그룹만'이다.
    expect(within(calendar).getAllByText(/관리자 그룹만/)).toHaveLength(2);
    expect(calendar.textContent).toContain('메뉴 이름이 게시판 이름과 다름');
    expect(within(rowOf('공지사항')).getByText('연결 없음')).toBeInTheDocument();
  });

  it('이용 범위는 귀속이 없으면 전체, 귀속이면 커뮤니티 회원이고 사용 중지·확인 불가를 알린다', () => {
    mocks.boards = [
      mocks.boards[0],
      { ...mocks.boards[1], community: { cmntySn: 7, cmntyNm: '개발 모임', inUse: false } },
      { ...mocks.boards[1], bbsId: 'BBSMSTR_0123456789AB', bbsTtl: '모르는 귀속', community: { cmntySn: 8, cmntyNm: null, inUse: null } },
    ];
    render(<BoardMasterListClient />);
    expect(within(rowOf('공지사항')).getByText('전체')).toBeInTheDocument();
    const stopped = rowOf('일정 게시판');
    expect(within(stopped).getByText('‘개발 모임’ 커뮤니티 회원')).toBeInTheDocument();
    expect(within(stopped).getByText('커뮤니티 사용 중지 — 이용자가 들어갈 입구가 없습니다')).toBeInTheDocument();
    expect(within(rowOf('모르는 귀속')).getByText('커뮤니티 확인 불가')).toBeInTheDocument();
  });

  /*
    [2026-10-26 ADR-0043, G4] 메뉴 연결 조건은 서버 조건이 아니라 현재 페이지의 행만 거른다(설계서 §5.2). 다른 페이지의 게시판을 '해당
    없음'처럼 보이지 않도록 적용 범위를 밝힌다 — 범위 고지 계약(정렬 범위 고지 선례).
  */
  describe('메뉴 연결 조건의 범위 고지', () => {
    const SCOPE = /메뉴 연결 조건은 이 페이지 2건 가운데에서만 거릅니다 — 1건이 맞습니다\./;

    it('조회를 누르면 현재 페이지의 행만 거르고, 서버 조회 조건에는 싣지 않으며, 범위를 밝힌다', async () => {
      mocks.access = READY_ACCESS;
      mocks.pageInfo = { total: 25, totalPage: 3 };
      const user = userEvent.setup();
      render(<BoardMasterListClient />);
      await user.selectOptions(screen.getByRole('combobox', { name: '메뉴 연결' }), 'none');
      // 조회 전에는 거르지 않는다.
      expect(within(table()).getByText('일정 게시판')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '조회' }));

      expect(mocks.lastQueryKey).toEqual(['board-masters', 'list', { searchKeyword: '', searchUseYn: undefined, page: 1, size: 10 }]);
      expect(within(table()).getByText('공지사항')).toBeInTheDocument();
      expect(within(table()).queryByText('일정 게시판')).toBeNull();
      const notice = screen.getByText(SCOPE);
      expect(notice).toHaveAttribute('role', 'status');
      expect(notice).toHaveTextContent('다른 페이지의 게시판은 페이지를 넘겨 확인하세요.');
    });

    it('맞는 행이 없으면 이 페이지에 없다고 말하고 전체에 없다고 말하지 않는다', async () => {
      mocks.access = READY_ACCESS;
      const user = userEvent.setup();
      render(<BoardMasterListClient />);
      await user.selectOptions(screen.getByRole('combobox', { name: '메뉴 연결' }), 'general');
      await user.click(screen.getByRole('button', { name: '조회' }));
      expect(screen.getByText('이 페이지에는 메뉴 연결 조건에 맞는 게시판이 없습니다.')).toBeInTheDocument();
      expect(screen.getByText(/이 페이지 2건 가운데에서만 거릅니다 — 0건이 맞습니다\./)).toHaveAttribute('role', 'status');
    });

    it('초기화하면 거르지 않고 범위 고지도 사라진다', async () => {
      mocks.access = READY_ACCESS;
      const user = userEvent.setup();
      render(<BoardMasterListClient />);
      await user.selectOptions(screen.getByRole('combobox', { name: '메뉴 연결' }), 'none');
      await user.click(screen.getByRole('button', { name: '조회' }));
      await user.click(screen.getByRole('button', { name: '초기화' }));
      expect(within(table()).getByText('일정 게시판')).toBeInTheDocument();
      expect(screen.queryByText(/메뉴 연결 조건은 이 페이지/)).toBeNull();
      expect(screen.getByRole('combobox', { name: '메뉴 연결' })).toHaveValue('');
    });
  });

  it('게시판이 한 페이지를 넘으면 페이저로 다음 페이지를 조회하고, 검색은 첫 페이지로 돌아간다', async () => {
    mocks.pageInfo = { total: 25, totalPage: 3 };
    const user = userEvent.setup();
    render(<BoardMasterListClient />);
    const pager = screen.getByRole('navigation', { name: '페이지 탐색' });
    await user.click(within(pager).getByRole('button', { name: '2 페이지' }));
    expect(mocks.lastQueryKey).toEqual(['board-masters', 'list', { searchKeyword: '', searchUseYn: undefined, page: 2, size: 10 }]);
    await user.type(screen.getByRole('textbox', { name: '게시판명' }), '공지{Enter}');
    expect(mocks.lastQueryKey).toEqual(['board-masters', 'list', { searchKeyword: '공지', searchUseYn: undefined, page: 1, size: 10 }]);
  });
});
