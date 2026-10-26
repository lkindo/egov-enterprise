import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: ['BBS_MST_READ', 'BBS_MST_UPDATE', 'BBS_MST_DELETE', 'MENU_READ'] as string[],
  updateBoardMaster: vi.fn(),
  isBoardMasterDeletable: vi.fn(),
  deleteBoardMasterPhysically: vi.fn(),
  invalidateQueries: vi.fn(),
  removeQueries: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  unsaved: vi.fn(),
  guardedNavigate: vi.fn(),
  useQuery: vi.fn(),
  pinQuery: { data: undefined as number | undefined, isError: false },
  access: { menuSource: null as unknown, groupSource: null as unknown, retry: vi.fn() },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: mocks.unsaved }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries, removeQueries: mocks.removeQueries }),
  useQuery: (options: unknown) => mocks.useQuery(options),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: {
    updateBoardMaster: mocks.updateBoardMaster,
    isBoardMasterDeletable: mocks.isBoardMasterDeletable,
    deleteBoardMasterPhysically: mocks.deleteBoardMasterPhysically,
  },
}));
vi.mock('../BoardChangeHistoryDialog', () => ({ BoardChangeHistoryDialog: () => <p>변경 이력 대화상자</p> }));
vi.mock('../../useBoardAccessSources', () => ({ useBoardAccessSources: () => mocks.access }));

import { BoardSettingsTab } from '../BoardSettingsTab';
import { QNA_BOARD_ID } from '@/config/board-ids';
import { boardTypeLabel } from '@/lib/board/board-types';

const BBS_ID = 'BBSMSTR_AAAAAAAAAAAA';
/** 앱이 쓰지 않는(허브 탭·지정 용도가 없는) 게시판. */
const PLAIN_BBS_ID = 'BBSMSTR_ZZZZZZZZZZZZ';
const DETAIL = {
  bbsId: BBS_ID, bbsTtl: '공지사항', bbsExpln: '전사 공지', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01',
  tmpltId: 'TMPLT_LIST', ansPsbltyYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 5_242_880,
  useYn: 'Y', ansYn: 'Y', stsfdgYn: 'Y', version: 4, designations: [] as ('NOTICE' | 'FAQ' | 'TASK' | 'QNA' | 'WIKI')[],
  rsvtPstgPsbltyYn: 'N',
  // [2026-10-23 ADR-0040 결정 5·6] 상세 응답의 필수 필드(NOT NULL DEFAULT 'N'·5·30 컬럼)다.
  upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30,
  // [2026-10-23 ADR-0040 결정 6·7] 상세 응답의 필수 필드(NOT NULL DEFAULT 'NONE'·'Y' 컬럼)다.
  prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y',
};

// 메뉴 원장·그룹 스냅숏(메뉴·접근 탭과 같은 판정 — board-menu-links). 활성 메뉴 하나는 일반 그룹에 보이고, 하나는 비활성이다.
const MENUS = [
  { menuNo: 3000000, menuNm: '소통·지식', upMenuSn: null, menuOrdr: 1, modernRoute: null, useYn: 'Y' },
  { menuNo: 3010000, menuNm: '공지', upMenuSn: 3000000, menuOrdr: 1, modernRoute: `/admin/community/boards/select-board-list?bbsId=${BBS_ID}`, useYn: 'Y' },
  { menuNo: 3020000, menuNm: '옛 공지', upMenuSn: 3000000, menuOrdr: 2, modernRoute: `/admin/community/boards/select-board-list?bbsId=${BBS_ID}`, useYn: 'N' },
];
const nav = (...ids: number[]) => ids.map((id) => ({ type: 'NAVIGATION', code: String(id) }));
const USER_GROUP = { code: 'ROLE_USER', name: '사용자', grants: [...nav(3000000, 3010000, 3020000), { type: 'OPERATION', code: 'BOARD_READ' }] };
const MENU_FOCUS_KEY = 'egov.menu-focus-handoff.v1:menu-focus';

function renderTab(detail: Record<string, unknown> = {}) {
  const onReload = vi.fn().mockResolvedValue(undefined);
  render(<BoardSettingsTab detail={{ ...DETAIL, ...detail } as never} onReload={onReload} />);
  return { onReload };
}

const changesStatus = () => screen.getByRole('status', { name: '' });

async function openReview() {
  fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
  return screen.findByRole('dialog', { name: '변경 내용 확인' });
}

const reviewRows = (review: HTMLElement) => within(review).getAllByRole('row').slice(1).map((row) => row.textContent);

/** 운영 화면 설정 탭(ADR-0040 §5.5·결정 9·10). */
describe('BoardSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.permissions = ['BBS_MST_READ', 'BBS_MST_UPDATE', 'BBS_MST_DELETE', 'MENU_READ'];
    mocks.updateBoardMaster.mockResolvedValue(undefined);
    mocks.isBoardMasterDeletable.mockResolvedValue(true);
    mocks.deleteBoardMasterPhysically.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
    // 저장하지 않은 변경 확인은 통과한 것으로 둔다 — 이동 동작은 원래 라우터(없으면 화면의 라우터)로 한다.
    mocks.guardedNavigate.mockImplementation(async (action: (router: null) => void) => { action(null); return true; });
    mocks.unsaved.mockImplementation(() => mocks.guardedNavigate);
    mocks.pinQuery = { data: undefined, isError: false };
    mocks.useQuery.mockImplementation((options: { enabled?: boolean }) => (options.enabled ? mocks.pinQuery : { data: undefined, isError: false }));
    mocks.access = { menuSource: { status: 'ready', menus: MENUS }, groupSource: { status: 'ready', groups: [USER_GROUP] }, retry: vi.fn() };
  });

  it('바꾼 것이 없으면 변경 0건이고 확인할 수 없다', () => {
    renderTab();
    expect(changesStatus()).toHaveTextContent('변경 0건');
    expect(screen.getByRole('button', { name: '변경 내용 확인' })).toBeDisabled();
  });

  it('변경을 확인 표로 보이고, 읽은 버전과 함께 저장하며 템플릿·유형·귀속은 보내지 않는다', async () => {
    const { onReload } = renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '전사 공지사항' } });
    fireEvent.click(screen.getByRole('switch', { name: /댓글 받기/ }));
    expect(changesStatus()).toHaveTextContent('변경 2건');
    expect(mocks.unsaved).toHaveBeenLastCalledWith({ dirty: true, pending: false });

    const review = await openReview();
    // [2026-10-26 ADR-0043 SET-06] 이 게시판은 지식 허브 FAQ 탭이 그린다 — 허브 탭 이름도 그대로라고 말한다.
    expect(reviewRows(review)).toEqual([
      '게시판 명칭공지사항전사 공지사항게시판 관리 목록과 이용 화면에 새 이름이 보입니다. 연결된 메뉴 이름은 바뀌지 않습니다 — 메뉴 관리에서 따로 바꿉니다. 지식 허브 탭 이름도 화면이 정해 그대로입니다.',
      '댓글 받기받음받지 않음새 댓글만 막습니다. 이미 달린 댓글은 그대로 보입니다.',
    ]);
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));

    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    const [bbsId, request] = mocks.updateBoardMaster.mock.calls[0];
    expect(bbsId).toBe(BBS_ID);
    expect(request).toMatchObject({ bbsTtl: '전사 공지사항', ansYn: 'N', stsfdgYn: 'Y', useYn: 'Y', version: 4, atchPsbltyFileSz: 5_242_880 });
    // 바꾸지 않은 비밀글 정책·추천 받기도 지금 값 그대로 함께 보낸다(화면은 늘 전체를 보낸다).
    expect(request).toMatchObject({ prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y' });
    for (const immutable of ['tmpltId', 'bbsTypeCd', 'bbsAtrbCd', 'cmntySn']) expect(request).not.toHaveProperty(immutable);
    await waitFor(() => expect(onReload).toHaveBeenCalled());
    expect(mocks.toast).toHaveBeenCalledWith('게시판 설정을 저장했습니다.', 'success');
    expect(changesStatus()).toHaveTextContent('변경 0건');
    // 이름·사용 여부는 목록·이용 화면 메타·선택지·변경 이력·커뮤니티 게시판 목록에도 보인다 — 모두 다시 읽는다.
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['board-masters'] });
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['community-boards'] });
  });

  // [2026-10-26 ADR-0043 SET-06] 이름을 바꿔도 연결 메뉴 이름은 그대로다 — 연결 메뉴를 보이고 메뉴 관리로 넘긴다.
  it('이름을 바꾸면 이름이 그대로 남는 연결 메뉴를 보이고, 메뉴 관리에서 열면 그 메뉴와 돌아올 곳을 넘긴다', async () => {
    renderTab({ designations: ['NOTICE'] });
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '전사 공지' } });
    const review = await openReview();
    expect(within(review).getByRole('row', { name: /게시판 명칭/ }))
      .toHaveTextContent('업무 홈 카드 제목과 지식 허브 탭 이름도 화면이 정해 그대로입니다.');
    const menus = within(review).getByRole('region', { name: '이름이 그대로 남는 연결 메뉴' });
    expect(within(menus).getByText('소통·지식 › 공지')).toBeInTheDocument();
    expect(within(menus).getByText('소통·지식 › 옛 공지')).toBeInTheDocument();
    expect(within(menus).getByText('비활성 메뉴')).toBeInTheDocument();

    fireEvent.click(within(menus).getByRole('button', { name: '옛 공지 메뉴를 메뉴 관리에서 열기' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus'));
    // 저장하지 않은 변경이 있으므로 이동 확인을 거친다.
    expect(mocks.guardedNavigate).toHaveBeenCalledOnce();
    expect(JSON.parse(window.sessionStorage.getItem(MENU_FOCUS_KEY) ?? '{}')).toMatchObject({
      menuSn: 3020000,
      returnTo: { route: `/admin/community/boards/master/${BBS_ID}`, label: '게시판 설정으로 돌아가기' },
    });
  });

  it('연결 메뉴가 없는 게시판의 이름을 바꾸면 메뉴 목록을 두지 않는다', async () => {
    renderTab({ bbsId: PLAIN_BBS_ID });
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '새 이름' } });
    const review = await openReview();
    expect(within(review).getByRole('row', { name: /게시판 명칭/ })).not.toHaveTextContent('화면이 정해 그대로입니다');
    expect(within(review).queryByRole('region', { name: '이름이 그대로 남는 연결 메뉴' })).toBeNull();
  });

  // [2026-10-26 ADR-0043 SET-03] 사용 안 함으로 바꿔도 메뉴는 남는다 — 활성 메뉴와 보이는 그룹을 나열하고 메뉴 관리로 넘긴다.
  it('사용 안 함으로 바꾸는 확인에 이 게시판을 가리키는 활성 메뉴와 보이는 그룹을 나열하고 메뉴 관리로 넘긴다', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('switch', { name: /게시판 사용/ }));
    const review = await openReview();
    const menus = within(review).getByRole('region', { name: '이 게시판을 가리키는 활성 메뉴' });
    expect(within(menus).getByText('소통·지식 › 공지')).toBeInTheDocument();
    expect(within(menus).getByText('활성 · 일반 그룹 표시: 사용자')).toBeInTheDocument();
    // 비활성 메뉴는 이용자에게 보이지 않으므로 나열하지 않는다.
    expect(within(menus).queryByText('소통·지식 › 옛 공지')).toBeNull();
    expect(within(menus).getByText(/메뉴를 누른 이용자는 이 게시판을 열 수 없습니다/)).toBeInTheDocument();

    fireEvent.click(within(menus).getByRole('button', { name: '공지 메뉴를 메뉴 관리에서 열기' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus'));
    expect(JSON.parse(window.sessionStorage.getItem(MENU_FOCUS_KEY) ?? '{}')).toMatchObject({
      menuSn: 3010000,
      returnTo: { route: `/admin/community/boards/master/${BBS_ID}`, label: '게시판 설정으로 돌아가기' },
    });
  });

  it('메뉴 이동 확인에서 머무르면 인계를 남기지 않고 이동하지 않는다', async () => {
    mocks.guardedNavigate.mockResolvedValue(false);
    renderTab();
    fireEvent.click(screen.getByRole('switch', { name: /게시판 사용/ }));
    const review = await openReview();
    fireEvent.click(within(review).getByRole('button', { name: '공지 메뉴를 메뉴 관리에서 열기' }));
    await waitFor(() => expect(mocks.guardedNavigate).toHaveBeenCalledOnce());
    expect(window.sessionStorage.getItem(MENU_FOCUS_KEY)).toBeNull();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('메뉴 원장을 볼 권한이 없으면 연결 메뉴를 확인할 수 없다고 말하고 메뉴가 없다고 추정하지 않는다', async () => {
    mocks.access.menuSource = { status: 'no-permission' };
    renderTab();
    fireEvent.click(screen.getByRole('switch', { name: /게시판 사용/ }));
    const review = await openReview();
    const menus = within(review).getByRole('region', { name: '이 게시판을 가리키는 활성 메뉴' });
    expect(menus).toHaveTextContent('메뉴 원장을 볼 권한(MENU_READ)이 없어 연결 메뉴를 확인할 수 없습니다.');
    expect(within(menus).queryByText(/활성 메뉴가 없습니다/)).toBeNull();
  });

  it('사용으로 바꾸는 확인은 메뉴가 비활성이거나 관리자 전용이어도 주소·통합 검색·게시판 선택지로 열린다고 말한다', async () => {
    renderTab({ useYn: 'N' });
    fireEvent.click(screen.getByRole('switch', { name: /게시판 사용/ }));
    const review = await openReview();
    expect(reviewRows(review)).toEqual([
      '게시판 사용사용 안 함사용이용자에게 열립니다. 메뉴가 비활성이거나 관리자 전용이어도 게시글 권한이 있는 로그인 사용자는 주소·통합 검색·게시판 선택지로 이 게시판을 엽니다.',
    ]);
    expect(within(review).queryByRole('region', { name: '이 게시판을 가리키는 활성 메뉴' })).toBeNull();
  });

  it('커뮤니티 귀속 게시판을 사용으로 바꾸면 승인 회원과 관리자에게만 열리고 입구가 커뮤니티 화면이라고 말한다', async () => {
    renderTab({ useYn: 'N', cmntySn: 7, community: { cmntySn: 7, cmntyNm: '연구 모임', inUse: true } });
    fireEvent.click(screen.getByRole('switch', { name: /게시판 사용/ }));
    const review = await openReview();
    expect(within(review).getByRole('row', { name: /게시판 사용/ }))
      .toHaveTextContent('귀속 커뮤니티의 승인 회원과 관리자에게 열립니다. 입구는 커뮤니티 화면이고, 통합 검색에는 나오지 않습니다.');
  });

  // [2026-10-23 ADR-0040 결정 3·6] 예약 게시는 새 미래 시작일만 연다 — 켜면 기록용 미래 시작일 글이 전환 진단 대상이라고 알린다.
  it('예약 게시를 켜면 영향과 전환 진단 안내를 보이고 설정 요청에 싣는다', async () => {
    renderTab();
    const reservation = screen.getByRole('switch', { name: /예약 게시/ });
    expect(reservation).not.toBeChecked();
    expect(screen.getByText(/기존 게시판 기본값: 받지 않음/)).toBeInTheDocument();
    fireEvent.click(reservation);
    expect(changesStatus()).toHaveTextContent('변경 1건');

    const review = await openReview();
    expect(reviewRows(review)).toEqual([
      '예약 게시받지 않음받음새 글에 오늘보다 뒤의 시작일을 받습니다. 그 글은 시작일까지 작성자와 게시판 관리자에게만 보입니다.',
    ]);
    expect(within(review).getByRole('note')).toHaveTextContent('전환 진단 대상');
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));
    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    expect(mocks.updateBoardMaster.mock.calls[0][1]).toMatchObject({ rsvtPstgPsbltyYn: 'Y', version: 4 });
  });

  it('예약 게시를 끄는 것은 새 미래 시작일만 막는다고 말한다', async () => {
    renderTab({ rsvtPstgPsbltyYn: 'Y' });
    fireEvent.click(screen.getByRole('switch', { name: /예약 게시/ }));
    const review = await openReview();
    expect(within(review).getByRole('row', { name: /예약 게시/ })).toHaveTextContent('새 미래 시작일만 막습니다. 이미 예약된 글은 시작일에 공개됩니다.');
    expect(within(review).queryByRole('note')).toBeNull();
  });

  // [2026-10-23 ADR-0040 결정 5·6] 상단 고정 설정은 새 고정만 정한다 — 상한·기본 일수는 고정을 받지 않는 동안 읽기 전용이다.
  it('상단 고정을 허용하고 상한·기본 일수를 바꾸면 영향과 함께 설정 요청에 싣는다', async () => {
    renderTab();
    const pinSwitch = screen.getByRole('switch', { name: /상단 고정 허용/ });
    const limit = screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' });
    const days = screen.getByRole('spinbutton', { name: '상단 고정 기본 일수(일)' });
    expect(pinSwitch).not.toBeChecked();
    expect(limit).toHaveValue(5);
    expect(days).toHaveValue(30);
    expect(limit).toHaveAttribute('readonly');
    expect(screen.getByText(/기존 게시판 기본값: 허용 안 함/)).toBeInTheDocument();
    expect(screen.getByText(/기존 게시판 기본값: 5건/)).toBeInTheDocument();
    expect(screen.getByText(/기존 게시판 기본값: 30일/)).toBeInTheDocument();
    // 상한의 범위는 생성 스키마(서버 @Min·@Max)에서 온다.
    expect(limit).toHaveAttribute('min', '1');
    expect(limit).toHaveAttribute('max', '100');
    expect(days).toHaveAttribute('max', '365');

    fireEvent.click(pinSwitch);
    expect(limit).not.toHaveAttribute('readonly');
    fireEvent.change(limit, { target: { value: '3' } });
    fireEvent.change(days, { target: { value: '14' } });
    expect(changesStatus()).toHaveTextContent('변경 3건');

    const review = await openReview();
    // 게시글 조회 대행 권한이 없으면 유효 고정 수를 읽지 않고, 읽지 않은 이유를 말한다(0 으로 보이지 않는다).
    expect(reviewRows(review)).toEqual([
      '상단 고정 허용허용 안 함허용운영 화면 게시물 탭에서 글을 상단에 고정할 수 있습니다(게시글 상단 고정 권한 필요).',
      '상단 고정 상한5건3건새 고정이 이 상한을 따릅니다. 줄여도 이미 고정된 글은 풀리지 않습니다. 지금 유효한 고정 수는 게시글 조회 대행 권한(BOARD_READ_ALL)이 있어야 보입니다.',
      '상단 고정 기본 일수30일14일고정 종료일을 비우고 고정할 때의 기간입니다. 이미 고정된 글의 종료일은 바뀌지 않습니다.',
    ]);
    expect(mocks.useQuery).not.toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));
    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    expect(mocks.updateBoardMaster.mock.calls[0][1]).toMatchObject({
      upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 3, upendFixBscDayCnt: 14, rsvtPstgPsbltyYn: 'N', version: 4,
    });
  });

  // [2026-10-26 ADR-0043 SET-10] 상한을 낮출 때 지금 유효한 고정 수를 서버 값(게시물 목록 pinned=true 의 전체 건수)으로 보인다.
  describe('상단 고정 상한을 낮출 때의 유효 고정 수', () => {
    beforeEach(() => {
      mocks.permissions = ['BBS_MST_READ', 'BBS_MST_UPDATE', 'BOARD_READ_ALL'];
    });

    it('새 상한 이상이 고정 중이면 그 수와 새 고정을 받지 않는 조건을 말한다', async () => {
      mocks.pinQuery = { data: 4, isError: false };
      renderTab({ upendFixPsbltyYn: 'Y' });
      fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' }), { target: { value: '3' } });
      const review = await openReview();
      expect(within(review).getByRole('row', { name: /상단 고정 상한/ })).toHaveTextContent(
        '새 고정이 이 상한을 따릅니다. 줄여도 이미 고정된 글은 풀리지 않습니다. 지금 유효한 고정 4건 — 고정이 3건보다 적어질 때까지 새 고정을 받지 않습니다.',
      );
      // 게시물 탭과 같은 조회(같은 조회 키)다 — 화면이 세지 않는다.
      expect(mocks.useQuery).toHaveBeenCalledWith(expect.objectContaining({
        enabled: true,
        queryKey: ['board-masters', 'detail', BBS_ID, 'posts', { page: 1, size: 1, pinned: true }],
      }));
    });

    it('새 상한보다 적게 고정 중이면 그 수만 보인다', async () => {
      mocks.pinQuery = { data: 2, isError: false };
      renderTab({ upendFixPsbltyYn: 'Y' });
      fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' }), { target: { value: '3' } });
      const review = await openReview();
      const row = within(review).getByRole('row', { name: /상단 고정 상한/ });
      expect(row).toHaveTextContent('지금 유효한 고정 2건.');
      expect(row).not.toHaveTextContent('새 고정을 받지 않습니다');
    });

    it('유효 고정 수를 불러오지 못하면 0 이 아니라 불러오지 못했다고 말한다', async () => {
      mocks.pinQuery = { data: undefined, isError: true };
      renderTab({ upendFixPsbltyYn: 'Y' });
      fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' }), { target: { value: '3' } });
      const review = await openReview();
      expect(within(review).getByRole('row', { name: /상단 고정 상한/ })).toHaveTextContent('지금 유효한 고정 수를 불러오지 못했습니다.');
    });

    it('상한을 올리면 유효 고정 수를 읽지 않는다', async () => {
      mocks.pinQuery = { data: 4, isError: false };
      renderTab({ upendFixPsbltyYn: 'Y' });
      fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' }), { target: { value: '8' } });
      const review = await openReview();
      expect(within(review).getByRole('row', { name: /상단 고정 상한/ }))
        .toHaveTextContent(/^상단 고정 상한5건8건새 고정이 이 상한을 따릅니다\. 줄여도 이미 고정된 글은 풀리지 않습니다\.$/);
      expect(mocks.useQuery).not.toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
    });
  });

  // [2026-10-26 ADR-0043 SET-04] 첨부를 끄면 본문 미디어도 막히고, 파일 수를 줄이면 이미 넘은 글은 파일을 더하기 전에 줄여야 한다.
  it('첨부 끄기·파일 수·파일당 크기 축소의 숨은 영향을 확인 표에 보인다', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('switch', { name: /파일 첨부 허용/ }));
    fireEvent.change(screen.getByRole('spinbutton', { name: /첨부 파일 수/ }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /파일당 크기/ }), { target: { value: '2' } });
    const review = await openReview();
    expect(reviewRows(review)).toEqual([
      '파일 첨부 허용허용허용 안 함새 첨부만 막습니다. 이미 붙은 파일은 그대로입니다. 본문 이미지·영상도 새로 넣을 수 없습니다.',
      '첨부 파일 수3개2개새로 붙이는 파일부터 이 상한을 적용합니다. 이미 상한을 넘은 글은 그대로 두지만, 그 글에 파일(본문 이미지·영상 포함)을 더하려면 먼저 상한 안으로 줄여야 합니다.',
      '파일당 크기5MB2MB새로 올리는 파일부터 이 크기를 적용합니다. 이미 붙은 파일은 이 크기보다 커도 그대로 둡니다.',
    ]);
  });

  it('첨부 상한을 늘리면 축소 영향을 말하지 않고, 상한 없음에서 상한을 두는 것은 축소로 본다', async () => {
    renderTab({ atchPsbltyFileSz: 0 });
    fireEvent.change(screen.getByRole('spinbutton', { name: /첨부 파일 수/ }), { target: { value: '5' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: /파일당 크기/ }), { target: { value: '2' } });
    const review = await openReview();
    expect(reviewRows(review)).toEqual([
      '첨부 파일 수3개5개—',
      '파일당 크기전역 상한2MB새로 올리는 파일부터 이 크기를 적용합니다. 이미 붙은 파일은 이 크기보다 커도 그대로 둡니다.',
    ]);
  });

  it('상단 고정 허용을 끄면 새 고정만 막는다고 말하고 상한·기본 일수는 그대로 보낸다', async () => {
    renderTab({ upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 7, upendFixBscDayCnt: 10 });
    fireEvent.click(screen.getByRole('switch', { name: /상단 고정 허용/ }));
    const review = await openReview();
    expect(within(review).getByRole('row', { name: /상단 고정 허용/ }))
      .toHaveTextContent('새 고정만 막습니다. 고정 중인 글은 고정 종료일까지 위에 남고 해제할 수 있습니다.');
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));
    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    expect(mocks.updateBoardMaster.mock.calls[0][1]).toMatchObject({ upendFixPsbltyYn: 'N', upendFixUplmtNocs: 7, upendFixBscDayCnt: 10 });
  });

  // [2026-10-23 ADR-0040 결정 7] 비밀글 정책은 앞으로 저장하는 글에만 적용된다 — 필수는 고친 글도 비밀글로 만든다고 말한다.
  it('비밀글 정책을 필수로 바꾸면 영향을 보이고 설정 요청에 싣는다', async () => {
    renderTab();
    const policy = screen.getByRole('combobox', { name: '비밀글 정책' });
    expect(policy).toHaveValue('NONE');
    expect(policy).toHaveAccessibleDescription(/기존 게시판 기본값: 없음/);
    fireEvent.change(policy, { target: { value: 'REQUIRED' } });
    expect(changesStatus()).toHaveTextContent('변경 1건');

    const review = await openReview();
    expect(reviewRows(review)).toEqual([
      '비밀글 정책없음필수앞으로 저장하는 글(새 글과 고친 글)은 늘 비밀글이 됩니다. 이미 있는 글은 고칠 때까지 그대로입니다.',
    ]);
    // 지정·질의응답 게시판이 아니면 경고가 없다.
    expect(within(review).queryByRole('note')).toBeNull();
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));
    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    expect(mocks.updateBoardMaster.mock.calls[0][1]).toMatchObject({ prvtPstPlcyCd: 'REQUIRED', rcmdtnUseYn: 'Y', version: 4 });
  });

  // [2026-10-23 ADR-0040 결정 6] 추천 받기를 꺼도 쌓인 수는 그대로이고 자기 추천은 거둘 수 있다.
  it('추천 받기를 끄면 새 추천만 막는다고 말하고 설정 요청에 싣는다', async () => {
    renderTab();
    const recommendation = screen.getByRole('switch', { name: /추천 받기/ });
    expect(recommendation).toBeChecked();
    expect(screen.getByText(/기존 게시판 기본값: 받음/)).toBeInTheDocument();
    fireEvent.click(recommendation);

    const review = await openReview();
    expect(reviewRows(review)).toEqual([
      '추천 받기받음받지 않음새 추천만 막습니다. 쌓인 추천 수는 그대로이고, 각자 자기 추천은 거둘 수 있습니다.',
    ]);
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));
    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    expect(mocks.updateBoardMaster.mock.calls[0][1]).toMatchObject({ rcmdtnUseYn: 'N', prvtPstPlcyCd: 'NONE' });
  });

  /*
    [2026-10-23 ADR-0040 결정 7] FAQ 지정 게시판을 필수로 두면 공개 FAQ 에서 빠지고, 질의응답 게시판은 1:1 문의(비밀)와 공개 질문이
    함께 있어 없음으로 두는 것이 의도다 — 경고는 칸 아래에 바로, 바꾸는 중이면 확인 표 아래에도 보인다(board-usage.ts).
  */
  it('FAQ 지정 게시판을 필수로 바꾸면 칸 아래와 확인 표 아래에 공개 FAQ 경고를 보인다', async () => {
    renderTab({ designations: ['FAQ'] });
    const policy = screen.getByRole('combobox', { name: '비밀글 정책' });
    expect(screen.queryByText(/공개 FAQ 에 실리지 않습니다/)).toBeNull();
    fireEvent.change(policy, { target: { value: 'REQUIRED' } });
    expect(policy).toHaveAccessibleDescription(/필수로 두면 앞으로 저장하는 글\(새 글과 고친 글\)은 공개 FAQ 에 실리지 않습니다/);

    const review = await openReview();
    expect(within(review).getByRole('note')).toHaveTextContent('공개 FAQ 에 실리지 않습니다');
  });

  // [2026-10-26 ADR-0043 결정 4] Q&A 게시판은 서버가 지정 용도(QNA)로 알려 준다(board-usage isHelpQnaBoard).
  it('질의응답 게시판은 없음이 아니면 1:1 문의와 공개 질문이 함께 있다고 알린다', () => {
    renderTab({ bbsId: QNA_BOARD_ID, tmpltId: 'TMPLT_QNA', designations: ['QNA'] });
    const policy = screen.getByRole('combobox', { name: '비밀글 정책' });
    expect(screen.queryByText(/지식 허브 질의응답\(공개\)이 이 게시판을 함께 씁니다/)).toBeNull();
    fireEvent.change(policy, { target: { value: 'OPTIONAL' } });
    expect(policy).toHaveAccessibleDescription(/지식 허브 질의응답\(공개\)이 이 게시판을 함께 씁니다/);
    fireEvent.change(policy, { target: { value: 'NONE' } });
    expect(screen.queryByText(/지식 허브 질의응답\(공개\)이 이 게시판을 함께 씁니다/)).toBeNull();
  });

  // [2026-10-26 ADR-0043] 비밀 문의 혼재는 지정 용도(Q&A)의 사실이다 — 마법사로 만든 새 질의응답형 게시판에는 없다.
  it('질의응답 화면 유형이어도 지정 용도가 Q&A 가 아니면 비밀 문의 혼재 제약을 보이지 않는다', () => {
    renderTab({ bbsId: PLAIN_BBS_ID, tmpltId: 'TMPLT_QNA', designations: [] });
    expect(screen.queryByRole('heading', { name: '이 게시판의 고정 제약' })).toBeNull();
    expect(screen.queryByText(/비밀 문의/)).toBeNull();
  });

  it('지정 용도가 Q&A 인 게시판은 화면 유형과 상관없이 비밀 문의와 공개 질문이 함께 있다고 고정 제약에 보인다', () => {
    renderTab({ bbsId: PLAIN_BBS_ID, tmpltId: 'TMPLT_LIST', designations: ['QNA'] });
    expect(screen.getByRole('heading', { name: '이 게시판의 고정 제약' })).toBeInTheDocument();
    expect(screen.getByText('질의응답 지정 게시판이라 비밀 문의(도움말 1:1 문의)와 공개 질문(지식 허브 질의응답)이 함께 있습니다.'))
      .toBeInTheDocument();
  });

  it('생성 스키마 범위를 넘는 고정 상한·비운 기본 일수는 확인으로 넘어가지 않고 필드에 알린다', async () => {
    renderTab({ upendFixPsbltyYn: 'Y' });
    fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' }), { target: { value: '101' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: '상단 고정 기본 일수(일)' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    expect(await screen.findByText('상단 고정 상한은 100건까지 정할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getAllByText('상단 고정 기본 일수를 숫자로 입력해 주세요.').length).toBeGreaterThan(0);
    expect(screen.getByRole('spinbutton', { name: '상단 고정 상한(건)' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('dialog', { name: '변경 내용 확인' })).toBeNull();
    expect(mocks.updateBoardMaster).not.toHaveBeenCalled();
  });

  it('다른 사용자가 먼저 고쳤으면(409) 덮어쓰지 않았다고 알리고 최신 값을 다시 읽되 입력은 남긴다', async () => {
    mocks.updateBoardMaster.mockRejectedValue({ response: { status: 409, data: { message: '다른 사용자가 먼저 수정했습니다.' } } });
    const { onReload } = renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '새 이름' } });
    fireEvent.click(within(await openReview()).getByRole('button', { name: '설정 저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('다른 사용자가 먼저 수정해 저장하지 않았습니다');
    expect(onReload).toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: '게시판 명칭' })).toHaveValue('새 이름');
    expect(changesStatus()).toHaveTextContent('변경 1건');
  });

  it('서버 상한을 넘는 첨부 파일 수는 확인으로 넘어가지 않고 필드에 알린다', async () => {
    renderTab();
    fireEvent.change(screen.getByRole('spinbutton', { name: /첨부 파일 수/ }), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    expect(await screen.findByText('서버는 한 번에 20개까지 받습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: '변경 내용 확인' })).toBeNull();
    expect(mocks.updateBoardMaster).not.toHaveBeenCalled();
  });

  it('지정 게시판을 사용 안 함으로 바꾸면 사용처를 확인 표 아래에 나열한다', async () => {
    renderTab({ designations: ['NOTICE'] });
    expect(screen.getByRole('heading', { name: '이 게시판의 고정 제약' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /게시판 사용/ }));
    const review = await openReview();
    expect(within(review).getByRole('note')).toHaveTextContent('공지 지정 게시판입니다');
    expect(within(review).getByText(/이용자에게 읽기·쓰기 모두 닫힙니다/)).toBeInTheDocument();
  });

  it('게시판 관리 수정 권한이 없으면 입력을 잠그고 저장 동작을 두지 않는다', () => {
    mocks.permissions = ['BBS_MST_READ'];
    renderTab();
    expect(screen.getByRole('textbox', { name: '게시판 명칭' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: '변경 내용 확인' })).toBeNull();
    expect(screen.getByText(/설정을 바꿀 권한이 없습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '변경 이력' })).toBeInTheDocument();
  });

  it('화면 유형·커뮤니티 귀속은 읽기 전용이고, 비어 있는 파일당 크기는 전역 상한이다', () => {
    renderTab({ atchPsbltyFileSz: null });
    expect(screen.getByText(boardTypeLabel('BBST02', 'TMPLT_LIST'))).toBeInTheDocument();
    expect(screen.getByText('없음')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /파일당 크기/ })).toHaveValue(0);
    expect(changesStatus()).toHaveTextContent('변경 0건');
  });

  // [2026-10-26 ADR-0043 결정 3] 커뮤니티 귀속은 번호가 아니라 이름·상태로 보인다 — 이름·상태는 커뮤니티 기능이 알려 준다.
  describe('커뮤니티 귀속', () => {
    it('이름과 사용 중 상태로 보이고 번호를 보이지 않는다', () => {
      renderTab({ cmntySn: 7, community: { cmntySn: 7, cmntyNm: '연구 모임', inUse: true } });
      expect(screen.getByText('연구 모임 — 승인 회원만 이용')).toBeInTheDocument();
      expect(screen.getByText('커뮤니티 상태: 사용 중')).toBeInTheDocument();
      expect(screen.queryByText(/커뮤니티 번호/)).toBeNull();
      expect(screen.queryByText(/아무도 이 게시판을 쓸 수 없습니다/)).toBeNull();
    });

    it('사용 중지된 커뮤니티면 관리자 외 아무도 쓸 수 없다고 경고한다', () => {
      renderTab({ cmntySn: 7, community: { cmntySn: 7, cmntyNm: '연구 모임', inUse: false } });
      expect(screen.getByText('커뮤니티 상태: 사용 중지')).toBeInTheDocument();
      expect(screen.getByRole('note')).toHaveTextContent('관리자 외에는 아무도 이 게시판을 쓸 수 없습니다.');
    });

    it('이름·상태를 모르면 번호와 확인 불가로 보이고 사용 중으로 추정하지 않는다', () => {
      renderTab({ cmntySn: 7, community: { cmntySn: 7, cmntyNm: null, inUse: null } });
      expect(screen.getByText('커뮤니티 번호 7(이름 확인 불가) — 승인 회원만 이용')).toBeInTheDocument();
      expect(screen.getByText('커뮤니티 상태: 확인 불가')).toBeInTheDocument();
      expect(screen.queryByText('커뮤니티 상태: 사용 중')).toBeNull();
    });
  });

  it('설정 저장은 같은 tick 의 두 번째 요청을 보내지 않고, 저장 중 잠그며, 실패하면 알리고 입력을 남긴다', async () => {
    let rejectSave!: (reason?: unknown) => void;
    mocks.updateBoardMaster.mockReturnValueOnce(new Promise((_, reject) => { rejectSave = reject; }));
    renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '새 이름' } });
    const review = await openReview();
    const save = within(review).getByRole('button', { name: '설정 저장' });

    act(() => {
      fireEvent.click(save);
      fireEvent.click(save);
    });

    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledTimes(1));
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    expect(save).toHaveAccessibleName('저장 중…');
    rejectSave(new Error('설정 저장 서버 오류'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('설정 저장 서버 오류', 'error'));
    expect(screen.getByRole('textbox', { name: '게시판 명칭' })).toHaveValue('새 이름');
  });

  describe('영구 삭제', () => {
    async function openPurge() {
      fireEvent.click(screen.getByRole('button', { name: '게시판 영구 삭제' }));
      return screen.findByRole('dialog', { name: '게시판 영구 삭제' });
    }

    it('같은 tick 의 두 번째 요청은 보내지 않고, 처리 중 잠그며, 실패하면 알리고 확인을 연 채 둔다', async () => {
      let rejectDelete!: (reason?: unknown) => void;
      mocks.deleteBoardMasterPhysically.mockReturnValueOnce(new Promise((_, reject) => { rejectDelete = reject; }));
      renderTab({ useYn: 'N' });
      const trigger = screen.getByRole('button', { name: '게시판 영구 삭제' });
      act(() => {
        fireEvent.click(trigger);
        fireEvent.click(trigger);
      });
      const dialog = await screen.findByRole('dialog', { name: '게시판 영구 삭제' });
      expect(mocks.isBoardMasterDeletable).toHaveBeenCalledTimes(1);
      const purge = within(dialog).getByRole('button', { name: '영구 삭제' });

      act(() => {
        fireEvent.click(purge);
        fireEvent.click(purge);
      });

      await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledTimes(1));
      expect(purge).toBeDisabled();
      expect(purge).toHaveAttribute('aria-busy', 'true');
      expect(purge).toHaveAccessibleName('게시판 영구 삭제 중…');
      rejectDelete(new Error('영구 삭제 서버 오류'));
      await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('영구 삭제 서버 오류', 'error'));
      expect(purge).not.toBeDisabled();
      expect(screen.getByRole('dialog', { name: '게시판 영구 삭제' })).toBeInTheDocument();
      expect(mocks.push).not.toHaveBeenCalled();
    });

    it('사용 중인 게시판은 영구 삭제할 수 없다고 미리 말한다', () => {
      renderTab();
      expect(screen.getByRole('button', { name: '게시판 영구 삭제' })).toBeDisabled();
      expect(screen.getByText('먼저 게시판 사용을 사용 안 함으로 바꿔 저장하세요.')).toBeInTheDocument();
    });

    it('글이 있었던 게시판은 따를 수 있는 사실만 말하고 확인을 열지 않는다', async () => {
      mocks.isBoardMasterDeletable.mockResolvedValue(false);
      renderTab({ useYn: 'N' });
      fireEvent.click(screen.getByRole('button', { name: '게시판 영구 삭제' }));
      await waitFor(() => expect(mocks.confirm).toHaveBeenCalledOnce());
      expect(mocks.confirm.mock.calls[0][0].message).toContain('글이 한 번이라도 있었던 게시판이라 영구 삭제할 수 없습니다');
      expect(screen.queryByRole('dialog', { name: '게시판 영구 삭제' })).toBeNull();
      expect(mocks.deleteBoardMasterPhysically).not.toHaveBeenCalled();
    });

    it('확인에 이 게시판을 가리키는 메뉴를 보이고, 영구 삭제하면 지우고 목록으로 돌아간다', async () => {
      renderTab({ useYn: 'N' });
      const dialog = await openPurge();
      expect(dialog).toHaveTextContent('[공지사항] 게시판과 그 설정을 영구 삭제합니다. 되돌릴 수 없습니다.');
      const menus = within(dialog).getByRole('region', { name: '이 게시판을 가리키는 메뉴' });
      expect(menus).toHaveTextContent('영구 삭제해도 아래 메뉴는 남아 없는 게시판을 가리킵니다.');
      expect(within(menus).getByText('소통·지식 › 공지')).toBeInTheDocument();
      expect(within(menus).getByText('소통·지식 › 옛 공지')).toBeInTheDocument();

      fireEvent.click(within(dialog).getByRole('button', { name: '영구 삭제' }));
      await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledWith(BBS_ID));
      expect(mocks.push).toHaveBeenCalledWith('/admin/community/boards/master');
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['board-masters'] });
      // 지운 게시판의 상세는 무효화 전에 캐시에서 뺀다 — 열린 운영 화면이 다시 읽어 404 를 띄우지 않는다.
      expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', BBS_ID] });
      expect(mocks.removeQueries.mock.invocationCallOrder[0]).toBeLessThan(mocks.invalidateQueries.mock.invocationCallOrder[0]);
    });

    it('확인에서 메뉴 관리에서 열기를 고르면 지우지 않고 그 메뉴와 돌아올 곳을 넘긴다', async () => {
      renderTab({ useYn: 'N' });
      const dialog = await openPurge();
      fireEvent.click(within(dialog).getByRole('button', { name: '공지 메뉴를 메뉴 관리에서 열기' }));
      await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/system/menus'));
      expect(JSON.parse(window.sessionStorage.getItem(MENU_FOCUS_KEY) ?? '{}')).toMatchObject({
        menuSn: 3010000,
        returnTo: { route: `/admin/community/boards/master/${BBS_ID}`, label: '게시판 설정으로 돌아가기' },
      });
      expect(mocks.deleteBoardMasterPhysically).not.toHaveBeenCalled();
    });

    it('연결 메뉴가 없으면 없다고 말한다', async () => {
      renderTab({ bbsId: PLAIN_BBS_ID, useYn: 'N' });
      const dialog = await openPurge();
      expect(within(dialog).getByRole('region', { name: '이 게시판을 가리키는 메뉴' })).toHaveTextContent('이 게시판을 가리키는 메뉴가 없습니다.');
    });

    // [2026-10-26 ADR-0043 결정 4] 앱이 지정해 쓰는 게시판은 서버가 영구 삭제를 거부한다(B007) — 화면은 단추를 끄고 같은 사유를 보인다.
    it('지정 게시판은 영구 삭제 단추를 끄고 서버와 같은 사유를 보인다', () => {
      renderTab({ useYn: 'N', designations: ['NOTICE', 'FAQ'] });
      const trigger = screen.getByRole('button', { name: '게시판 영구 삭제' });
      expect(trigger).toBeDisabled();
      expect(trigger).toHaveAccessibleDescription(
        '[공지사항] 게시판은 앱이 공지사항(업무 홈 공지 카드), 자주 묻는 질문(공개 FAQ·도움말) 용도로 지정해 쓰고 있어 영구 삭제할 수 없습니다. 쓰지 않으려면 사용 안 함으로 두십시오.',
      );
      fireEvent.click(trigger);
      expect(mocks.isBoardMasterDeletable).not.toHaveBeenCalled();
      expect(screen.queryByText('먼저 게시판 사용을 사용 안 함으로 바꿔 저장하세요.')).toBeNull();
    });

    it('화면이 모르던 지정 게시판을 서버가 거부하면(B007) 서버 사유를 그대로 알리고 최신 지정 용도를 다시 읽는다', async () => {
      const reason = '[공지사항] 게시판은 앱이 위키(지식 허브 위키 탭) 용도로 지정해 쓰고 있어 영구 삭제할 수 없습니다. 쓰지 않으려면 사용 안 함으로 두십시오.';
      mocks.deleteBoardMasterPhysically.mockRejectedValue({ response: { status: 409, data: { code: 'B007', message: reason } } });
      const { onReload } = renderTab({ useYn: 'N' });
      const dialog = await openPurge();
      fireEvent.click(within(dialog).getByRole('button', { name: '영구 삭제' }));

      await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(reason, 'error'));
      expect(onReload).toHaveBeenCalled();
      await waitFor(() => expect(screen.queryByRole('dialog', { name: '게시판 영구 삭제' })).toBeNull());
      expect(mocks.push).not.toHaveBeenCalled();
    });

    it('게시판 관리 삭제 권한이 없으면 영구 삭제 절차를 두지 않는다', () => {
      mocks.permissions = ['BBS_MST_READ', 'BBS_MST_UPDATE'];
      renderTab({ useYn: 'N' });
      expect(screen.queryByRole('button', { name: '게시판 영구 삭제' })).toBeNull();
    });
  });
});
