import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  getPosts: vi.fn(),
  getBoardMeta: vi.fn(),
  updatePostPeriodsInBatch: vi.fn(),
  updatePostPeriod: vi.fn(),
  updatePostPinsInBatch: vi.fn(),
  updatePostPin: vi.fn(),
  getBoardChangeHistory: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  permissions: ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_UPDATE_ALL'] as string[],
  requiredEditPermissions: [] as string[],
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
  usePathname: () => '/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA',
  useSearchParams: () => new URLSearchParams('tab=posts'),
}));
vi.mock('@/services/business/user/board/BoardUserService', () => ({
  boardUserService: { getPosts: mocks.getPosts, getBoardMeta: mocks.getBoardMeta },
}));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: {
    updatePostPeriodsInBatch: mocks.updatePostPeriodsInBatch,
    updatePostPeriod: mocks.updatePostPeriod,
    updatePostPinsInBatch: mocks.updatePostPinsInBatch,
    updatePostPin: mocks.updatePostPin,
    getBoardChangeHistory: mocks.getBoardChangeHistory,
  },
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

import { BoardPostsTab } from '../BoardPostsTab';

const BBS_ID = 'BBSMSTR_AAAAAAAAAAAA';
const DETAIL = {
  bbsId: BBS_ID, bbsTtl: '공지사항', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01', tmpltId: 'TMPLT_LIST', ansPsbltyYn: 'N',
  fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, useYn: 'Y', version: 4, designations: [], rsvtPstgPsbltyYn: 'Y',
  upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30,
};
const POSTS = [
  // 서버가 게시 중이라고 판정한 글 — 종료일 값이 브라우저 기준으로 지났어도 화면은 게시 중으로 그린다(DEC-OPS-140).
  { pstSn: 7, bbsId: BBS_ID, pstTtl: '연차 안내', userNm: '홍길동', crtDt: '2026-10-01T09:00:00', pstBgngYmd: '20261001', pstEndYmd: '20200101', scrtYn: 'Y', useYn: 'Y', userId: 'u', pstCn: '', postingStatus: 'POSTING', version: 2, pinned: true, upendFixEndYmd: '20261130' },
  { pstSn: 8, bbsId: BBS_ID, pstTtl: '다음 달 공지', userNm: '김', crtDt: '2026-10-02T09:00:00', pstBgngYmd: '20261201', useYn: 'Y', userId: 'u', pstCn: '', postingStatus: 'SCHEDULED', version: 0, pinned: false },
];

function renderTab(detail: Record<string, unknown> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const { unmount } = render(<QueryClientProvider client={client}><BoardPostsTab detail={{ ...DETAIL, ...detail } as never} /></QueryClientProvider>);
  return { invalidate, unmount };
}

/** [ADR-0043 1차 OPS-10] 유효 고정 수 조회(같은 목록 API 의 pinned=true·크기 1) — 목록 조회와 나눠 센다. */
const isPinCountCall = (params: Record<string, unknown>) => params.size === 1 && params.pinned === true;
const listCalls = () => mocks.getPosts.mock.calls.filter(([, params]) => !isPinCountCall(params as Record<string, unknown>));
const lastListCall = () => listCalls().at(-1);

/** 표에서 고른 뒤에만 보이는 선택 처리 단추 이름들. */
const bulkActionNames = () => ['종료일 바꾸기', '종료일 해제하기', '상단 고정하기', '고정 해제하기']
  .filter((name) => screen.queryByRole('button', { name: new RegExp(`^${name}$`) }) !== null);

const table = () => screen.getByRole('table', { name: '공지사항 게시물 목록' });

/** 운영 화면 게시물 탭(ADR-0040 §5.4) — B1: 서버 게시 상태·조회 조건·일정 바꾸기·종료일 일괄 처리. */
describe('BoardPostsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 조회 조건·쪽은 세션 목록 상태에 남는다 — 시험끼리 섞이지 않게 비운다.
    window.sessionStorage.clear();
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_UPDATE_ALL'];
    mocks.requiredEditPermissions = [];
    mocks.getPosts.mockImplementation(async (_bbsId: string, params: Record<string, unknown>) => (isPinCountCall(params)
      ? { list: [POSTS[0]], total: 1, totalPage: 1 }
      : { list: POSTS, total: 2, totalPage: 1 }));
    mocks.getBoardMeta.mockImplementation(async () => ({ requiredEditPermissions: mocks.requiredEditPermissions }));
    mocks.updatePostPeriodsInBatch.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('1 기반 쪽으로 이 게시판의 글을 읽고 서버 게시 상태·게시 기간·비밀글을 보인다', async () => {
    renderTab();
    expect(await screen.findByText('연차 안내')).toBeInTheDocument();
    expect(mocks.getPosts).toHaveBeenCalledWith(BBS_ID, { page: 1, size: 20 });
    const firstRow = within(table()).getByRole('row', { name: /연차 안내/ });
    // 종료일(2020-01-01)이 지났어도 서버 판정이 게시 중이면 그대로 그린다 — 화면이 날짜로 다시 계산하지 않는다.
    expect(within(firstRow).getByText('게시 중')).toBeInTheDocument();
    expect(within(firstRow).queryByText('게시 종료')).toBeNull();
    expect(within(firstRow).getByText('2026-10-01 ~ 2020-01-01')).toBeInTheDocument();
    expect(within(firstRow).getByText('비밀글')).toBeInTheDocument();
    expect(within(within(table()).getByRole('row', { name: /다음 달 공지/ })).getByText('예약')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '게시물' })).toBeInTheDocument();
  });

  it('글을 고르면 글 상세를 연다', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '연차 안내 글 상세 열기' }));
    expect(mocks.push).toHaveBeenCalledWith(`/admin/community/boards/detail?bbsId=${BBS_ID}&pstSn=7`);
  });

  it.each([
    ['조회 대행 권한만 있으면', ['BBS_MST_READ', 'BOARD_READ_ALL'], [] as string[], false],
    ['게시글 전체 수정 권한이 있으면', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_UPDATE_ALL'], [] as string[], true],
    ['지정 게시판의 편집 권한이 없으면', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_UPDATE_ALL'], ['NOTICE_EDIT'], false],
    ['지정 게시판의 편집 권한까지 있으면', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_UPDATE_ALL', 'NOTICE_EDIT'], ['NOTICE_EDIT'], true],
  ])('%s 일정 바꾸기·선택 처리가 %s', async (_label, permissions, required, visible) => {
    mocks.permissions = permissions;
    mocks.requiredEditPermissions = required;
    renderTab();
    await screen.findByText('연차 안내');
    await waitFor(() => expect(mocks.getBoardMeta).toHaveBeenCalledWith(BBS_ID));
    if (visible) {
      expect(await screen.findByRole('button', { name: '연차 안내 일정 바꾸기' })).toBeInTheDocument();
      expect(within(table()).getAllByRole('checkbox').length).toBeGreaterThan(0);
    } else {
      // 메타를 받은 뒤에도 보이지 않는다.
      await act(async () => { await Promise.resolve(); });
      expect(screen.queryByRole('button', { name: '연차 안내 일정 바꾸기' })).toBeNull();
      expect(within(table()).queryAllByRole('checkbox')).toHaveLength(0);
    }
  });

  it('조회 조건은 조회·Enter 로만 적용하고 1쪽으로 돌아가며 주소를 바꾸지 않는다', async () => {
    renderTab();
    await screen.findByText('연차 안내');
    fireEvent.change(screen.getByRole('combobox', { name: '게시 상태' }), { target: { value: 'SCHEDULED' } });
    // 고르기만 해서는 다시 조회하지 않는다(G2).
    expect(listCalls()).toHaveLength(1);

    fireEvent.change(screen.getByRole('textbox', { name: '검색어' }), { target: { value: '공지' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(lastListCall()).toEqual([BBS_ID, {
      page: 1, size: 20, searchCnd: '0', searchWrd: '공지', postingStatus: 'SCHEDULED',
    }]));
    // 조회 조건은 URL 밖 상태다(결정 2) — 라우터를 부르지 않는다.
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it('조회 조건을 바꿔 선택이 풀리면 몇 건을 풀었는지 알린다', async () => {
    renderTab();
    await screen.findByRole('button', { name: '연차 안내 일정 바꾸기' });
    fireEvent.click(within(table()).getByRole('checkbox', { name: '연차 안내 선택' }));
    fireEvent.change(screen.getByRole('combobox', { name: '게시 상태' }), { target: { value: 'ENDED' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(screen.getByText('조회 조건을 바꿔 선택한 1건을 해제했습니다.')).toBeInTheDocument());
    expect(screen.getByText('조회 조건을 바꿔 선택한 1건을 해제했습니다.')).toHaveAttribute('role', 'status');
  });

  it('종료일 해제하기는 대상을 확인받고 CLEAR_END 로 보낸 뒤 운영 목록·변경 이력·이용 화면을 다시 읽는다', async () => {
    const { invalidate } = renderTab();
    await screen.findByRole('button', { name: '연차 안내 일정 바꾸기' });
    fireEvent.click(within(table()).getByRole('checkbox', { name: '연차 안내 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /종료일 해제하기$/ }));

    await waitFor(() => expect(mocks.updatePostPeriodsInBatch).toHaveBeenCalledOnce());
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '종료일 해제하기', detailsLabel: '대상 글' }));
    expect(mocks.updatePostPeriodsInBatch).toHaveBeenCalledWith(BBS_ID, { action: 'CLEAR_END', pstSns: [7] });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('1건의 게시 종료일을 해제했습니다.', 'success'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', BBS_ID, 'posts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', BBS_ID, 'change-history'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['boardList', BBS_ID] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['article-detail', BBS_ID] });
    // 처리한 글을 고른 채로 두지 않는다(선택 범위가 바뀐다).
    await waitFor(() => expect(within(table()).getByRole('checkbox', { name: '연차 안내 선택' })).not.toBeChecked());
  });

  it('같은 tick 의 두 번째 종료일 해제는 보내지 않고, 서버가 전체를 거부하면 사유를 알리고 선택을 보존한다', async () => {
    let rejectWrite!: (reason?: unknown) => void;
    mocks.updatePostPeriodsInBatch.mockReturnValueOnce(new Promise((_, reject) => { rejectWrite = reject; }));
    renderTab();
    await screen.findByRole('button', { name: '연차 안내 일정 바꾸기' });
    const row = within(table()).getByRole('checkbox', { name: '연차 안내 선택' });
    fireEvent.click(row);
    const action = screen.getByRole('button', { name: /종료일 해제하기$/ });

    act(() => {
      fireEvent.click(action);
      fireEvent.click(action);
    });

    await waitFor(() => expect(mocks.updatePostPeriodsInBatch).toHaveBeenCalledTimes(1));
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    rejectWrite({ response: { status: 404, data: { message: '게시글을 찾을 수 없습니다.' } } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글을 찾을 수 없습니다.', 'error'));
    expect(row).toBeChecked();
    expect(action).not.toBeDisabled();
  });

  it('종료일 바꾸기는 고른 글로 대화상자를 연다', async () => {
    renderTab();
    await screen.findByRole('button', { name: '연차 안내 일정 바꾸기' });
    fireEvent.click(within(table()).getByRole('checkbox', { name: '다음 달 공지 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /종료일 바꾸기$/ }));
    const dialog = await screen.findByRole('dialog', { name: '종료일 바꾸기' });
    expect(within(dialog).getByText('대상 1건')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '선택한 1건 종료일 바꾸기' })).toBeInTheDocument();
    expect(mocks.updatePostPeriodsInBatch).not.toHaveBeenCalled();
  });

  it('일정 바꾸기는 그 글의 일정 대화상자를 연다', async () => {
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '다음 달 공지 일정 바꾸기' }));
    const dialog = await screen.findByRole('dialog', { name: '일정 바꾸기' });
    expect(within(dialog).getByText('다음 달 공지')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('게시 시작일')).toHaveValue('2026-12-01');
  });

  // ── B2 상단 고정(ADR-0040 결정 5·6, §5.4) ──────────────────────────────────────────────────────────────────────

  it('상단 고정 칸은 서버가 고정 중이라고 한 글만 종료일과 함께 보이고, 툴바에 게시판의 고정 상한·기본 일수를 보인다', async () => {
    renderTab();
    await screen.findByText('연차 안내');
    const pinnedRow = within(table()).getByRole('row', { name: /연차 안내/ });
    expect(within(pinnedRow).getByText('고정 · ~2026-11-30')).toBeInTheDocument();
    expect(within(pinnedRow).getByText('상단 고정')).toBeInTheDocument();
    const plainRow = within(table()).getByRole('row', { name: /다음 달 공지/ });
    expect(within(plainRow).queryByText('상단 고정')).toBeNull();
    expect(within(plainRow).queryByText(/^고정 · /)).toBeNull();
    // 고정 수는 화면이 세지 않는다 — 게시판 설정과 서버가 센 유효 고정 수를 보인다.
    expect(screen.getByText('고정 상한 5건 · 기본 30일')).toBeInTheDocument();
    expect(await screen.findByText('유효 고정 1건')).toBeInTheDocument();
  });

  // [ADR-0043 1차 OPS-10] 이 쪽의 고정 글(1건)이 아니라 서버 total 을 쓰는지 보려고 total 을 다르게 둔다.
  it('툴바의 유효 고정 수는 서버가 센 고정 중 글의 전체 건수다', async () => {
    mocks.getPosts.mockImplementation(async (_bbsId: string, params: Record<string, unknown>) => (isPinCountCall(params)
      ? { list: [POSTS[0]], total: 4, totalPage: 4 }
      : { list: POSTS, total: 2, totalPage: 1 }));
    renderTab();
    expect(await screen.findByText('유효 고정 4건')).toBeInTheDocument();
    expect(mocks.getPosts).toHaveBeenCalledWith(BBS_ID, { page: 1, size: 1, pinned: true });
    expect(screen.getByText('고정 상한 5건 · 기본 30일')).toBeInTheDocument();
  });

  it('유효 고정 수를 읽지 못하면 0건이 아니라 조회 실패라고 말한다', async () => {
    mocks.getPosts.mockImplementation(async (_bbsId: string, params: Record<string, unknown>) => {
      if (isPinCountCall(params)) throw new Error('고정 수 조회 실패');
      return { list: POSTS, total: 2, totalPage: 1 };
    });
    renderTab();
    expect(await screen.findByText('유효 고정 조회 실패')).toBeInTheDocument();
    expect(screen.queryByText(/유효 고정 0건/)).toBeNull();
  });

  it('고정을 받지 않는 게시판에서는 툴바에 고정 상한을 보이지 않고, 남은 고정 글이 있으면 그 수만 알린다', async () => {
    renderTab({ upendFixPsbltyYn: 'N' });
    await screen.findByText('연차 안내');
    expect(screen.queryByText(/고정 상한/)).toBeNull();
    expect(await screen.findByText('유효 고정 1건 · 새 고정은 받지 않습니다')).toBeInTheDocument();
  });

  it.each([
    ['고정 글', true],
    ['고정 아닌 글', false],
  ] as const)('상단 고정 조건 %s 는 조회로만 적용하고 pinned=%s 로 읽으며 주소를 바꾸지 않는다', async (label, pinned) => {
    renderTab();
    await screen.findByText('연차 안내');
    fireEvent.change(screen.getByRole('combobox', { name: '상단 고정' }), { target: { value: pinned ? 'Y' : 'N' } });
    expect(screen.getByRole('combobox', { name: '상단 고정' })).toHaveDisplayValue(label);
    expect(listCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(lastListCall()).toEqual([BBS_ID, { page: 1, size: 20, pinned }]));
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it.each([
    ['상단 고정 권한만 있으면 고정 동작만', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'], [] as string[], {}, ['상단 고정하기', '고정 해제하기'], false, true],
    ['게시글 전체 수정 권한만 있으면 일정 동작만', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_UPDATE_ALL'], [] as string[], {}, ['종료일 바꾸기', '종료일 해제하기'], true, false],
    ['두 권한이 있으면 모두', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_UPDATE_ALL', 'BOARD_PIN'], [] as string[], {}, ['종료일 바꾸기', '종료일 해제하기', '상단 고정하기', '고정 해제하기'], true, true],
    // 설정은 새 고정만 막는다 — 해제는 늘 된다(결정 6).
    ['고정을 받지 않는 게시판이면 고정 해제만', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'], [] as string[], { upendFixPsbltyYn: 'N' }, ['고정 해제하기'], false, true],
  ])('%s 보인다', async (_label, permissions, required, detail, expectedBulk, schedule, pin) => {
    mocks.permissions = permissions;
    mocks.requiredEditPermissions = required;
    renderTab(detail);
    await screen.findByText('연차 안내');
    await waitFor(() => expect(within(table()).getAllByRole('checkbox').length).toBeGreaterThan(0));
    fireEvent.click(within(table()).getByRole('checkbox', { name: '연차 안내 선택' }));
    await waitFor(() => expect(bulkActionNames()).toEqual(expectedBulk));
    expect(screen.queryByRole('button', { name: '연차 안내 일정 바꾸기' }) !== null).toBe(schedule);
    expect(screen.queryByRole('button', { name: '연차 안내 상단 고정 바꾸기' }) !== null).toBe(pin);
  });

  it('고정을 받지 않는 게시판에서는 고정 중인 글에만 상단 고정 바꾸기(해제용)가 있다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'];
    renderTab({ upendFixPsbltyYn: 'N' });
    expect(await screen.findByRole('button', { name: '연차 안내 상단 고정 바꾸기' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '다음 달 공지 상단 고정 바꾸기' })).toBeNull();
  });

  it('지정 게시판의 편집 권한이 없으면 상단 고정 권한이 있어도 고정 동작이 없다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'];
    mocks.requiredEditPermissions = ['NOTICE_EDIT'];
    renderTab();
    await screen.findByText('연차 안내');
    await waitFor(() => expect(mocks.getBoardMeta).toHaveBeenCalledWith(BBS_ID));
    await act(async () => { await Promise.resolve(); });
    expect(screen.queryByRole('button', { name: '연차 안내 상단 고정 바꾸기' })).toBeNull();
    expect(within(table()).queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('고정 해제하기는 고정 중인 글만 확인받아 해제로 보내고 운영 목록·변경 이력·이용 화면을 다시 읽는다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'];
    mocks.updatePostPinsInBatch.mockResolvedValue(undefined);
    const { invalidate } = renderTab();
    await screen.findByRole('button', { name: '연차 안내 상단 고정 바꾸기' });
    fireEvent.click(within(table()).getByRole('checkbox', { name: '연차 안내 선택' }));
    fireEvent.click(within(table()).getByRole('checkbox', { name: '다음 달 공지 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /^고정 해제하기$/ }));

    await waitFor(() => expect(mocks.updatePostPinsInBatch).toHaveBeenCalledOnce());
    // 서버는 해제에도 답글을 거부한다 — 고정 중이 아닌 글은 보내지 않는다.
    expect(mocks.updatePostPinsInBatch).toHaveBeenCalledWith(BBS_ID, { pstSns: [7], upendFixYn: 'N' });
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '고정 해제하기', detailsLabel: '해제할 글' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('1건의 상단 고정을 해제했습니다.', 'success'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', BBS_ID, 'posts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', BBS_ID, 'change-history'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['boardList', BBS_ID] });
    await waitFor(() => expect(within(table()).getByRole('checkbox', { name: '연차 안내 선택' })).not.toBeChecked());
  });

  it('고른 글에 고정 중인 글이 없으면 고정 해제를 보내지 않고 알린다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'];
    renderTab();
    await screen.findByRole('button', { name: '연차 안내 상단 고정 바꾸기' });
    fireEvent.click(within(table()).getByRole('checkbox', { name: '다음 달 공지 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /^고정 해제하기$/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('고른 글 가운데 상단 고정 중인 글이 없어 바꾸지 않았습니다.', 'info'));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.updatePostPinsInBatch).not.toHaveBeenCalled();
  });

  it('같은 tick 의 두 번째 고정 해제는 보내지 않고, 서버가 전체를 거부하면 사유를 알리고 선택을 보존한다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'];
    let rejectWrite!: (reason?: unknown) => void;
    mocks.updatePostPinsInBatch.mockReturnValueOnce(new Promise((_, reject) => { rejectWrite = reject; }));
    renderTab();
    await screen.findByRole('button', { name: '연차 안내 상단 고정 바꾸기' });
    const row = within(table()).getByRole('checkbox', { name: '연차 안내 선택' });
    fireEvent.click(row);
    const action = screen.getByRole('button', { name: /^고정 해제하기$/ });

    act(() => {
      fireEvent.click(action);
      fireEvent.click(action);
    });

    await waitFor(() => expect(mocks.updatePostPinsInBatch).toHaveBeenCalledTimes(1));
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute('aria-busy', 'true');
    expect(action).toHaveTextContent('고정 해제하는 중…');
    // 처리 중에는 다른 선택 처리·행 동작도 잠근다.
    expect(screen.getByRole('button', { name: /^상단 고정하기$/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: '연차 안내 상단 고정 바꾸기' })).toBeDisabled();
    rejectWrite({ response: { status: 404, data: { message: '게시글을 찾을 수 없습니다.' } } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('게시글을 찾을 수 없습니다.', 'error'));
    expect(row).toBeChecked();
    expect(action).not.toBeDisabled();
  });

  it('상단 고정하기는 고른 글로 고정 입력 대화상자를 연다 — 기본 일수를 안내하고 아직 보내지 않는다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'];
    renderTab();
    await screen.findByRole('button', { name: '연차 안내 상단 고정 바꾸기' });
    fireEvent.click(within(table()).getByRole('checkbox', { name: '다음 달 공지 선택' }));
    fireEvent.click(screen.getByRole('button', { name: /^상단 고정하기$/ }));
    const dialog = await screen.findByRole('dialog', { name: '상단 고정하기' });
    expect(within(dialog).getByText('대상 1건')).toBeInTheDocument();
    expect(within(dialog).getByText(/비우면 오늘부터 30일 뒤까지\(서버가 정함\)/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '선택한 1건 상단 고정하기' })).toBeInTheDocument();
    expect(mocks.updatePostPinsInBatch).not.toHaveBeenCalled();
  });

  it('상단 고정 바꾸기는 그 글의 고정 대화상자를 지금 고정 상태로 연다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_PIN'];
    renderTab();
    fireEvent.click(await screen.findByRole('button', { name: '연차 안내 상단 고정 바꾸기' }));
    const dialog = await screen.findByRole('dialog', { name: '상단 고정 바꾸기' });
    expect(within(dialog).getByRole('switch', { name: '상단 고정' })).toBeChecked();
    expect(within(dialog).getByLabelText('고정 종료일')).toHaveValue('2026-11-30');
    expect(mocks.updatePostPin).not.toHaveBeenCalled();
  });

  // ── [2026-10-26 ADR-0043 1차] 글 쓰기·복귀·검색 구분·값 표시·Q&A·댓글 관리 바로가기 ─────────────────────────────────────────

  it.each([
    ['등록 권한이 없으면', ['BBS_MST_READ', 'BOARD_READ_ALL'], [] as string[], {}, false],
    ['등록 권한이 있으면', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_CREATE'], [] as string[], {}, true],
    // 사용 안 함 게시판도 운영자는 글을 준비할 수 있다(ADR-0040 결정 1).
    ['사용 안 함 게시판이어도 등록 권한이 있으면', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_CREATE'], [] as string[], { useYn: 'N' }, true],
    ['지정 게시판의 편집 권한이 없으면', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_CREATE'], ['NOTICE_EDIT'], {}, false],
    ['지정 게시판의 편집 권한까지 있으면', ['BBS_MST_READ', 'BOARD_READ_ALL', 'BOARD_CREATE', 'NOTICE_EDIT'], ['NOTICE_EDIT'], {}, true],
  ])('%s 글 쓰기 링크가 %s', async (_label, permissions, required, detail, visible) => {
    mocks.permissions = permissions;
    mocks.requiredEditPermissions = required;
    renderTab(detail);
    await screen.findByText('연차 안내');
    await waitFor(() => expect(mocks.getBoardMeta).toHaveBeenCalledWith(BBS_ID));
    if (visible) {
      const write = await screen.findByRole('link', { name: '공지사항에 글 쓰기' });
      expect(write).toHaveAttribute('href', `/admin/community/boards/insert-board-article?bbsId=${BBS_ID}`);
    } else {
      // 메타를 받은 뒤에도 보이지 않는다.
      await act(async () => { await Promise.resolve(); });
      expect(screen.queryByRole('link', { name: /글 쓰기/ })).toBeNull();
    }
  });

  it.each([
    ['본문', '1'],
    ['작성자', '2'],
  ] as const)('검색 구분 %s 는 조회로만 적용하고 searchCnd=%s 로 읽는다', async (label, searchCnd) => {
    renderTab();
    await screen.findByText('연차 안내');
    fireEvent.change(screen.getByRole('combobox', { name: '검색 구분' }), { target: { value: searchCnd } });
    expect(screen.getByRole('combobox', { name: '검색 구분' })).toHaveDisplayValue(label);
    expect(screen.getByRole('textbox', { name: '검색어' })).toHaveAttribute('placeholder', `${label} 검색`);
    fireEvent.change(screen.getByRole('textbox', { name: '검색어' }), { target: { value: '홍길동' } });
    expect(listCalls()).toHaveLength(1);
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(lastListCall()).toEqual([BBS_ID, { page: 1, size: 20, searchCnd, searchWrd: '홍길동' }]));
  });

  it('검색어 없이 검색 구분만 고르면 조건으로 보내지 않는다', async () => {
    renderTab();
    await screen.findByText('연차 안내');
    fireEvent.change(screen.getByRole('combobox', { name: '검색 구분' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('combobox', { name: '게시 상태' }), { target: { value: 'ENDED' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(lastListCall()).toEqual([BBS_ID, { page: 1, size: 20, postingStatus: 'ENDED' }]));
  });

  /*
    [OPS-01] 글 상세의 '목록으로' 는 뒤로 가기로 이 탭에 돌아온다 — 탭은 새로 마운트되므로 조건·쪽·크기를 세션 목록 상태로 되살려야
    방금 보던 목록으로 돌아온다. 다시 마운트해 같은 조건으로 읽는지, 고르는 칸도 그 조건을 보이는지 본다.
  */
  it('상세에 다녀와 다시 열려도 적용한 조건·쪽·크기로 읽고 조건 칸에 그 값을 보인다', async () => {
    mocks.getPosts.mockImplementation(async (_bbsId: string, params: Record<string, unknown>) => (isPinCountCall(params)
      ? { list: [], total: 0, totalPage: 0 }
      : { list: POSTS, total: 120, totalPage: 3 }));
    const first = renderTab();
    await screen.findByText('연차 안내');
    fireEvent.change(screen.getByRole('combobox', { name: '검색 구분' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('combobox', { name: '게시 상태' }), { target: { value: 'SCHEDULED' } });
    fireEvent.change(screen.getByRole('textbox', { name: '검색어' }), { target: { value: '홍길동' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(lastListCall()?.[1]).toMatchObject({ page: 1, searchCnd: '2', searchWrd: '홍길동' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));
    await waitFor(() => expect(lastListCall()?.[1]).toMatchObject({ page: 2 }));
    first.unmount();

    mocks.getPosts.mockClear();
    renderTab();
    await waitFor(() => expect(lastListCall()).toEqual([BBS_ID, {
      page: 2, size: 20, searchCnd: '2', searchWrd: '홍길동', postingStatus: 'SCHEDULED',
    }]));
    expect(screen.getByRole('textbox', { name: '검색어' })).toHaveValue('홍길동');
    expect(screen.getByRole('combobox', { name: '검색 구분' })).toHaveDisplayValue('작성자');
    expect(screen.getByRole('combobox', { name: '게시 상태' })).toHaveDisplayValue('예약');
    // 조건은 URL 밖 상태다(결정 2).
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('기억한 조건은 게시판마다 따로다 — 다른 게시판은 기본 조건으로 연다', async () => {
    const first = renderTab();
    await screen.findByText('연차 안내');
    fireEvent.change(screen.getByRole('combobox', { name: '게시 상태' }), { target: { value: 'ENDED' } });
    fireEvent.submit(screen.getByRole('search'));
    await waitFor(() => expect(lastListCall()?.[1]).toMatchObject({ postingStatus: 'ENDED' }));
    first.unmount();

    mocks.getPosts.mockClear();
    renderTab({ bbsId: 'BBSMSTR_BBBBBBBBBBBB' });
    await waitFor(() => expect(lastListCall()).toEqual(['BBSMSTR_BBBBBBBBBBBB', { page: 1, size: 20 }]));
  });

  it('조회·댓글 수는 목록 응답에 실린 값만 제목 아래에 보이고 없는 값은 0 으로 지어내지 않는다', async () => {
    mocks.getPosts.mockImplementation(async (_bbsId: string, params: Record<string, unknown>) => (isPinCountCall(params)
      ? { list: [], total: 0, totalPage: 0 }
      : { list: [{ ...POSTS[0], inqCnt: 1234, commentCnt: 3 }, POSTS[1]], total: 2, totalPage: 1 }));
    renderTab();
    await screen.findByText('연차 안내');
    expect(within(within(table()).getByRole('row', { name: /연차 안내/ })).getByText('조회 1,234 · 댓글 3')).toBeInTheDocument();
    const plainRow = within(table()).getByRole('row', { name: /다음 달 공지/ });
    expect(within(plainRow).queryByText(/조회 0|댓글 0/)).toBeNull();
  });

  it('변경 이력 단추는 이 게시판의 변경 이력 대화상자를 연다', async () => {
    mocks.getBoardChangeHistory.mockResolvedValue({ list: [], total: 0, totalPage: 0 });
    renderTab();
    await screen.findByText('연차 안내');
    fireEvent.click(screen.getByRole('button', { name: '변경 이력' }));
    expect(await screen.findByRole('dialog', { name: '공지사항 변경 이력' })).toBeInTheDocument();
    await waitFor(() => expect(mocks.getBoardChangeHistory).toHaveBeenCalledWith(BBS_ID, { page: 1, size: 10 }));
  });

  it('Q&A 게시판이면 해결 상태 열(미해결·해결됨)과 해결 상태 조건을 두고 qnaStatus 로 읽는다', async () => {
    mocks.getPosts.mockImplementation(async (_bbsId: string, params: Record<string, unknown>) => (isPinCountCall(params)
      ? { list: [], total: 0, totalPage: 0 }
      : { list: [{ ...POSTS[0], qnaSttsCd: 'SOLVED' }, { ...POSTS[1], qnaSttsCd: 'OPEN' }], total: 2, totalPage: 1 }));
    renderTab({ tmpltId: 'TMPLT_QNA' });
    await screen.findByText('연차 안내');
    expect(within(table()).getByRole('columnheader', { name: '해결 상태' })).toBeInTheDocument();
    expect(within(within(table()).getByRole('row', { name: /연차 안내/ })).getByText('해결됨')).toBeInTheDocument();
    expect(within(within(table()).getByRole('row', { name: /다음 달 공지/ })).getByText('미해결')).toBeInTheDocument();
    expect(screen.queryByText('답변 대기')).toBeNull();

    fireEvent.change(screen.getByRole('combobox', { name: '해결 상태' }), { target: { value: 'OPEN' } });
    expect(screen.getByRole('combobox', { name: '해결 상태' })).toHaveDisplayValue('미해결');
    expect(listCalls()).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(lastListCall()).toEqual([BBS_ID, { page: 1, size: 20, qnaStatus: 'OPEN' }]));
  });

  it('Q&A 가 아닌 게시판에는 해결 상태 열·조건이 없다', async () => {
    renderTab();
    await screen.findByText('연차 안내');
    expect(within(table()).queryByRole('columnheader', { name: '해결 상태' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: '해결 상태' })).toBeNull();
  });

  it('댓글 관리 권한이 있으면 글마다 그 게시판·글 조건으로 댓글 관리를 여는 링크를 둔다', async () => {
    mocks.permissions = ['BBS_MST_READ', 'BOARD_READ_ALL', 'COMMENT_READ_ALL'];
    renderTab();
    const link = await screen.findByRole('link', { name: '연차 안내 댓글 관리' });
    expect(link).toHaveAttribute('href', `/admin/system/comments?bbsId=${BBS_ID}&pstSn=7`);
  });

  it('댓글 관리 권한이 없으면 댓글 관리 링크를 두지 않는다 — 들어가도 라우트가 막는다', async () => {
    renderTab();
    await screen.findByText('연차 안내');
    expect(screen.queryAllByRole('link', { name: /댓글 관리/ })).toHaveLength(0);
  });
});
