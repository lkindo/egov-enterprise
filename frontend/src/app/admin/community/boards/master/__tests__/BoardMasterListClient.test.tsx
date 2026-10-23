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
  ],
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

const table = () => screen.getByRole('table', { name: '게시판 관리 목록' });
const rowOf = (name: string) => within(table()).getByText(name).closest('tr') as HTMLElement;

describe('BoardMasterListClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['BBS_MST_READ', 'BBS_MST_CREATE', 'BBS_MST_UPDATE', 'BBS_MST_DELETE'];
    mocks.pageInfo = { total: 2, totalPage: 1 };
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
    expect(within(notice).getByText('사용')).toBeInTheDocument();
    const calendar = rowOf('일정 게시판');
    // 짝이 아니면 정본 이름 대신 저장값과 그 사실을 보인다(DEC-OPS-332).
    expect(within(calendar).getByText('BBST03')).toBeInTheDocument();
    expect(within(calendar).getByText('템플릿 짝 불일치')).toBeInTheDocument();
    expect(within(calendar).getByText('사용 안 함')).toBeInTheDocument();
  });

  it('운영 화면과 이용 화면으로 간다 — 사용 안 함 게시판은 이용 화면을 열 수 없다고 미리 말한다', () => {
    render(<BoardMasterListClient />);
    fireEvent.click(within(rowOf('공지사항')).getByRole('button', { name: '공지사항 운영 화면 열기' }));
    expect(mocks.push).toHaveBeenLastCalledWith('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA');
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

  it('메뉴 원장을 볼 권한이 없으면 메뉴 연결 칸은 확인 권한 없음이다', () => {
    render(<BoardMasterListClient />);
    expect(within(rowOf('공지사항')).getByText('확인 권한 없음')).toBeInTheDocument();
  });

  it('메뉴 연결 칸은 메뉴 위치·근거·노출을 보이고, 메뉴 이름과 게시판 이름이 다르면 알린다', () => {
    mocks.access = {
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
    render(<BoardMasterListClient />);
    const calendar = rowOf('일정 게시판');
    expect(within(calendar).getByText('소통·지식 › 엔터프라이즈 위키')).toBeInTheDocument();
    expect(calendar.textContent).toContain('허브 탭 ?tab=WIKI');
    expect(calendar.textContent).toContain('관리자 그룹만');
    expect(calendar.textContent).toContain('메뉴 이름이 게시판 이름과 다름');
    expect(within(rowOf('공지사항')).getByText('연결 없음')).toBeInTheDocument();
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
