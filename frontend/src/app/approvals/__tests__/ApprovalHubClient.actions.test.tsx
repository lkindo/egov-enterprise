import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancelDraft: vi.fn(),
  confirm: vi.fn(),
  confirmMutation: vi.fn(),
  createDraft: vi.fn(),
  getMyHistory: vi.fn(),
  getPending: vi.fn(),
  getProcessed: vi.fn(),
  getReferenced: vi.fn(),
  addReferences: vi.fn(),
  getTaskTypes: vi.fn(),
  getDetail: vi.fn(),
  requestSupplement: vi.fn(),
  replaceApprover: vi.fn(),
  answerSupplement: vi.fn(),
  toast: vi.fn(),
}));

// 알림 링크(?tab=…&doc=…)로 여는 경우를 테스트마다 바꾼다. 주소는 jsdom 의 location 이 정본이다 — 화면이 알림 링크를
//   주소에서 지우면(history.replaceState) useSearchParams 도 그대로 따라간다(App Router 와 같은 동작).
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/approvals',
  useSearchParams: () => new URLSearchParams(window.location.search),
  useParams: () => ({}),
}));
function openLink(search: string) {
  window.history.replaceState(null, '', search ? `/approvals?${search}` : '/approvals');
}

// 결재자 바꾸기의 사람 고르기는 자기 테스트가 있다. 여기서는 고른 결과만 돌려준다.
vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (user: { esntlId: string; userNm: string }) => void }) => (
    isOpen ? <button type="button" onClick={() => onSelect({ esntlId: 'NEW', userNm: '새결재자' })}>새결재자 고르기</button> : null
  ),
}));

// 기안 다이얼로그는 자기 테스트(ApprovalDraftDialog.test.tsx)가 있다. 여기서는 열림 상태만 본다.
vi.mock('../ApprovalDraftDialog', () => ({
  ApprovalDraftDialog: ({ isOpen }: { isOpen: boolean }) => (
    isOpen ? <div role="dialog" aria-label="새 결재 기안">기안 다이얼로그</div> : null
  ),
}));

vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));
// 버튼은 서버 힌트와 기능 권한을 함께 본다 — 기본은 결재 권한을 모두 가진 사용자이고, 표시 판정 테스트만 권한을 줄인다.
const FULL_PERMISSIONS = ['APPROVAL_READ', 'APPROVAL_CREATE', 'APPROVAL_APPROVE', 'APPROVAL_CANCEL'];
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { esntlId: 'approver', permissions: auth.permissions, authorizationVersion: 'v1' } }),
}));

vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({
  SANCTION_STATUS: {
    REQUESTED: 'A',
    APPROVED: 'C',
    REJECTED: 'R',
    WITHDRAWN: 'W',
  },
  isSanctionPending: (value?: string) => value === 'A',
  approvalUserService: {
    cancelDraft: mocks.cancelDraft,
    confirm: mocks.confirmMutation,
    createDraft: mocks.createDraft,
    getMyHistory: mocks.getMyHistory,
    getPending: mocks.getPending,
    getProcessed: mocks.getProcessed,
    getReferenced: mocks.getReferenced,
    addReferences: mocks.addReferences,
    getTaskTypes: mocks.getTaskTypes,
    getDetail: mocks.getDetail,
    requestSupplement: mocks.requestSupplement,
    replaceApprover: mocks.replaceApprover,
    answerSupplement: mocks.answerSupplement,
  },
}));

vi.mock('@/app/components/patterns/master-detail-page', () => ({
  MasterDetailPage: ({
    actions,
    detail,
    detailActions,
    master,
    navigation,
  }: {
    actions?: React.ReactNode;
    detail?: React.ReactNode;
    detailActions?: React.ReactNode;
    master?: React.ReactNode;
    navigation?: React.ReactNode;
  }) => (
    <main>
      {actions}
      {navigation}
      <aside>{master}</aside>
      <section>
        {detailActions}
        {detail}
      </section>
    </main>
  ),
}));

vi.mock('../ApprovalStepper', () => ({
  ApprovalStepper: ({ accessibleLabel = '결재선 진행' }: { accessibleLabel?: string }) => (
    <ol aria-label={accessibleLabel}><li>결재 단계</li></ol>
  ),
}));

import ApprovalHubClient from '../ApprovalHubClient';
import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext';

const pendingApproval = {
  ifmlAtrzSn: 73,
  aplcntId: 'drafter',
  aplcntNm: '기안자',
  aprvrId: 'approver',
  aprvrNm: '결재자',
  aprvYn: 'A',
  reqYmd: '20260830',
  taskSeCd: 'LEAVE',
  taskSeNm: '휴가 신청',
};

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  const tree = () => (
    <QueryClientProvider client={queryClient}>
      <UnsavedChangesProvider><ApprovalHubClient /></UnsavedChangesProvider>
    </QueryClientProvider>
  );
  const view = render(tree());
  // 알림 링크를 다시 누른 것처럼 주소가 바뀐 뒤 같은 화면을 다시 그린다.
  return { ...view, rerenderClient: () => view.rerender(tree()) };
}

describe('ApprovalHubClient handleAction pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    openLink('');
    auth.permissions = FULL_PERMISSIONS;
    mocks.requestSupplement.mockResolvedValue(undefined);
    mocks.replaceApprover.mockResolvedValue(undefined);
    mocks.answerSupplement.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
    mocks.cancelDraft.mockResolvedValue(undefined);
    mocks.confirmMutation.mockResolvedValue(undefined);
    mocks.getMyHistory.mockResolvedValue({ list: [], total: 0 });
    mocks.getProcessed.mockResolvedValue({ list: [], total: 0 });
    mocks.getTaskTypes.mockResolvedValue([]);
    mocks.getPending.mockResolvedValue({ list: [pendingApproval], total: 1 });
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, version: 2, canApprove: id !== 74 && id !== 75, canWithdraw: id === 74, canResubmit: false }));
  });

  /**
   * [2026-09-05] 종전 '결재 처리 이력' 탭은 신청자 기준(getMyHistory)을 불렀다. 탭 세 개가 각각
   * 이름이 약속하는 서비스를 부르고, '새 결재 기안' 은 페이지 이동이 아니라 다이얼로그를 연다.
   */
  it('🚨 제목은 조회/Enter 로, 요청일 기간·상태는 고르면 바로 서버 조건으로 보낸다 (DIP B5 F4)', async () => {
    renderClient();
    await screen.findByText('휴가 신청');

    // 대기 탭에는 상태 조건이 없다(대기함은 늘 대기 문서다).
    expect(screen.queryByLabelText('문서 상태')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('제목·번호'), { target: { value: '휴가' } });
    expect(mocks.getPending).not.toHaveBeenCalledWith(expect.objectContaining({ keyword: '휴가' }));
    fireEvent.submit(screen.getByLabelText('제목·번호').closest('form')!);
    await waitFor(() => expect(mocks.getPending).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 20, keyword: '휴가' })));

    fireEvent.click(screen.getByRole('button', { name: '최근 1주' }));
    await waitFor(() => expect(mocks.getPending).toHaveBeenCalledWith(expect.objectContaining({
      keyword: '휴가', fromYmd: expect.stringMatching(/^\d{8}$/), toYmd: expect.stringMatching(/^\d{8}$/),
    })));

    fireEvent.click(screen.getByRole('tab', { name: '내가 올린 결재' }));
    fireEvent.change(await screen.findByLabelText('문서 상태'), { target: { value: 'R' } });
    await waitFor(() => expect(mocks.getMyHistory).toHaveBeenCalledWith(expect.objectContaining({ keyword: '휴가', status: 'R' })));
  });

  it('🚨 조건에 맞는 문서가 없으면 조건 결과가 없다고 말한다 — 대기함이 비었다고 말하지 않는다 (DIP B5 F4, G15)', async () => {
    renderClient();
    await screen.findByText('휴가 신청');
    mocks.getPending.mockResolvedValue({ list: [], total: 0 });

    fireEvent.click(screen.getByRole('button', { name: '최근 1일' }));
    expect(await screen.findByText('조건에 맞는 결재가 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('대기 중인 결재가 없습니다.')).not.toBeInTheDocument();
  });

  it('🚨 대기 탭은 조건과 무관한 전체 대기 건수를 배지로 보이고 보조기술에도 알린다 (DIP B5 F4)', async () => {
    mocks.getPending.mockResolvedValue({ list: [pendingApproval], total: 3 });
    renderClient();

    const pendingTab = await screen.findByRole('tab', { name: '대기 중인 결재' });
    await waitFor(() => expect(pendingTab).toHaveAccessibleDescription('대기 중인 결재 3건'));
    expect(mocks.getPending).toHaveBeenCalledWith({ page: 0, size: 1 });
  });

  it('세 탭이 각각 이름이 약속하는 목록을 부르고 기안 버튼은 다이얼로그를 연다', async () => {
    mocks.getMyHistory.mockResolvedValue({
      list: [{ ...pendingApproval, ifmlAtrzSn: 74, taskSeNm: '내가 올린 건' }], total: 1,
    });
    mocks.getProcessed.mockResolvedValue({
      list: [{ ...pendingApproval, ifmlAtrzSn: 75, aprvYn: 'C', taskSeNm: '내가 처리한 건' }], total: 1,
    });
    renderClient();

    await screen.findByText('휴가 신청');
    expect(mocks.getPending).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '결재 문서 보관함' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '내가 올린 결재' }));
    await screen.findByText('내가 올린 건');
    expect(mocks.getMyHistory).toHaveBeenCalledWith({ page: 0, size: 20 });
    // 신청자 탭에서는 승인·반려 버튼이 없다 — 결재자만 확정한다.
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '내가 처리한 결재' }));
    await screen.findByText('내가 처리한 건');
    expect(mocks.getProcessed).toHaveBeenCalledWith({ page: 0, size: 20 });
    // 상태 조건의 선택지에도 같은 말이 있어 목록 안에서 찾는다(DIP B5 F4).
    expect(within(screen.getByRole('list', { name: '내가 처리한 결재 목록' })).getByText('승인 완료')).toBeInTheDocument();

    expect(screen.queryByRole('dialog', { name: '새 결재 기안' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '새 결재 기안' }));
    expect(screen.getByRole('dialog', { name: '새 결재 기안' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '새 결재 기안' })).not.toBeInTheDocument();
  });

  /**
   * [2026-09-05] 종전에는 `{ page: 0, size: 50 }` 한 페이지만 받고 페이저가 없어 51번째 문서부터
   * 도달 불가였다. 페이지를 넘기면 서버 페이지가 바뀌고 이전 페이지의 선택은 해제된다.
   */
  it('목록이 한 페이지를 넘으면 페이저로 다음 페이지를 조회하고 stale 선택을 해제한다', async () => {
    const secondPageItem = { ...pendingApproval, ifmlAtrzSn: 99, taskSeNm: '두 번째 페이지 건' };
    mocks.getPending.mockImplementation(async ({ page }: { page: number }) => (
      page === 0
        ? { list: [pendingApproval], total: 45 }
        : { list: [secondPageItem], total: 45 }
    ));
    renderClient();

    await screen.findByText('휴가 신청');
    expect(mocks.getPending).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(await screen.findByRole('button', { name: '결재 승인' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: '2' }));

    await screen.findByText('두 번째 페이지 건');
    expect(mocks.getPending).toHaveBeenCalledWith({ page: 1, size: 20 });
    expect(screen.queryByText('휴가 신청')).not.toBeInTheDocument();
    // 페이지가 바뀌면 이전 선택(#73)은 stale 이므로 상세는 새 페이지 첫 항목으로 간다.
    expect(screen.getByRole('button', { name: /두 번째 페이지 건 #99 상세 열기/ })).toHaveAttribute('aria-current', 'true');
  });

  it('마지막 페이지가 비면 마지막 페이지로 되돌려 빈 대기함에 갇히지 않는다 (DIP C4)', async () => {
    const lastPageItem = { ...pendingApproval, ifmlAtrzSn: 98, taskSeNm: '세 번째 페이지 건' };
    let total = 45;
    mocks.getPending.mockImplementation(async ({ page }: { page: number }) => {
      if (page === 2) return { list: total > 40 ? [lastPageItem] : [], total };
      return { list: [{ ...pendingApproval, ifmlAtrzSn: 70 + page, taskSeNm: `${page + 1}페이지 건` }], total };
    });
    renderClient();
    await screen.findByText('1페이지 건');
    fireEvent.click(screen.getByRole('link', { name: '3' }));
    await screen.findByText('세 번째 페이지 건');

    // 마지막 페이지의 유일한 문서가 처리돼 전체가 40건(2페이지)으로 줄었다.
    total = 40;
    fireEvent.click(screen.getByRole('button', { name: '결재함 목록 새로고침' }));

    expect(await screen.findByText('2페이지 건')).toBeInTheDocument();
    expect(mocks.getPending).toHaveBeenLastCalledWith({ page: 1, size: 20 });
  });

  it('공백 반려 사유는 요약과 inline 오류로 연결하고 첫 오류 입력에 초점을 둔다', async () => {
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' });
    fireEvent.change(reason, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '결재 반려' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('반려 사유');
    expect(summary).toHaveTextContent('반려 사유를 입력해 주세요.');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(reason).toHaveFocus());
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.confirmMutation).not.toHaveBeenCalled();
  });

  it('서버 reason 오류를 필드에 연결하고 반려 입력값을 보존한다', async () => {
    const confirmMutation = mocks.confirmMutation;
    confirmMutation.mockRejectedValueOnce({
      response: {
        data: {
          errors: [{ field: 'reason', message: '반려 사유를 더 구체적으로 입력해 주세요.' }],
        },
      },
    });
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' });
    fireEvent.change(reason, { target: { value: '현재 입력은 유지되어야 합니다.' } });
    fireEvent.click(screen.getByRole('button', { name: '결재 반려' }));

    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    const summary = await screen.findByRole('alert', { name: /입력 오류/ });
    expect(summary).toHaveTextContent('반려 사유를 더 구체적으로 입력해 주세요.');
    expect(reason).toHaveAttribute('aria-invalid', 'true');
    expect(reason).toHaveValue('현재 입력은 유지되어야 합니다.');
  });

  it('결재 승인은 확인 대화 없이 되돌리기 대기열에 오르고, 연타는 한 번만 잡으며 실패 사유를 보인다 (2026-10-03)', async () => {
    const confirmMutation = mocks.confirmMutation;
    const pending = deferred<void>();
    confirmMutation.mockReturnValueOnce(pending.promise);
    renderClient();

    const approve = await screen.findByRole('button', { name: '결재 승인' });
    act(() => {
      fireEvent.click(approve);
      fireEvent.click(approve);
    });

    expect(mocks.confirm).not.toHaveBeenCalled();
    expect((await screen.findAllByText(/10초 뒤 처리합니다/)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: / 되돌리기$/ })).toHaveLength(1);
    expect(confirmMutation).not.toHaveBeenCalled();
    expect(approve).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: / 지금 처리$/ }));
    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '결재 승인' })).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '결재 반려' })).toBeDisabled();

    await act(async () => {
      pending.reject(new Error('결재 승인 API 장애'));
    });

    // 토스트는 무엇을 못 했는지만, 사유는 화면 안 안내가 말한다(실패 1회 = 토스트 1개).
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('결재를 승인하지 못했습니다.', 'error'));
    expect(mocks.toast).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('결재 승인 API 장애 입력한 의견은 유지됩니다.');
    expect(screen.getByText('휴가 신청')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '결재 승인' })).not.toHaveAttribute('aria-busy');
  });

  it('되돌리기를 누르면 서버에 보내지 않고 문서를 다시 대기 상태로 둔다 (2026-10-03)', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '결재 승인' }));
    fireEvent.click(await screen.findByRole('button', { name: / 되돌리기$/ }));

    expect(screen.queryAllByText(/10초 뒤 처리합니다/)).toHaveLength(0);
    expect(await screen.findByText(/처리를 되돌렸습니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled();
    expect(mocks.confirmMutation).not.toHaveBeenCalled();
  });

  it('보완 요청은 의견 칸의 글을 질문으로 보내고 비어 있으면 보내지 않는다 (2026-10-03 D7)', async () => {
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, version: 5, canApprove: true, canRequestSupplement: true }));
    renderClient();
    const ask = await screen.findByRole('button', { name: '보완 요청' });

    fireEvent.click(ask);
    expect(await screen.findByText('보완을 요청할 내용을 의견 칸에 적어 주세요.', { selector: 'p' })).toBeInTheDocument();
    expect(mocks.requestSupplement).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' }), { target: { value: '  금액을 적어 주세요  ' } });
    fireEvent.click(ask);
    await waitFor(() => expect(mocks.requestSupplement).toHaveBeenCalledWith(73, '금액을 적어 주세요', 5));
    expect(mocks.confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('보완을 요청했습니다. 기안자가 답하면 알림이 옵니다.', 'success'));
  });

  it('보완 요청이 열려 있으면 결재자에게 보완 요청 버튼을 보이지 않는다', async () => {
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, version: 5, canApprove: true, canRequestSupplement: false,
      openSupplement: { askedBy: 'peer', askedByNm: '동료', question: '이미 물었습니다' } }));
    renderClient();
    await screen.findByRole('button', { name: '결재 승인' });
    expect(screen.queryByRole('button', { name: '보완 요청' })).not.toBeInTheDocument();
    expect(screen.getByText('이미 물었습니다')).toBeInTheDocument();
  });

  it('여러 건을 고르면 한 번 확인하고 차례로 승인하며, 업무 구분별로 한꺼번에 고를 수 있다 (2026-10-03)', async () => {
    const doc = (sn: number, task: string, name: string) => ({ ...pendingApproval, ifmlAtrzSn: sn, taskSeCd: task, taskSeNm: name, docTtl: `${name} ${sn}`, version: sn, canApprove: true });
    mocks.getPending.mockResolvedValue({ list: [doc(81, 'TRIP', '출장'), doc(82, 'TRIP', '출장'), doc(83, 'EDU', '교육')], total: 3 });
    mocks.confirmMutation.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('이미 처리된 결재입니다.'));
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '출장 2건 고르기' }));
    expect(screen.getByRole('checkbox', { name: '출장 81 여러 건 승인에 고르기' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '교육 83 여러 건 승인에 고르기' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: '선택한 2건 승인' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '2건 승인' })));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledTimes(2));
    expect(mocks.confirmMutation).toHaveBeenNthCalledWith(1, 81, 'C', undefined, 81);
    expect(mocks.confirmMutation).toHaveBeenNthCalledWith(2, 82, 'C', undefined, 82);
    expect(await screen.findByRole('alert')).toHaveTextContent('1건은 승인했고 1건은 처리하지 못했습니다.');
    expect(screen.getByRole('alert')).toHaveTextContent('출장 82');
    expect(mocks.toast).toHaveBeenCalledWith('1건을 승인하지 못했습니다.', 'error');
  });

  it('알림 링크의 탭과 문서 번호로 연다 — 목록의 이 페이지에 없는 문서도 상세를 불러온다 (2026-10-03 D1)', async () => {
    openLink('tab=SUBMITTED&doc=91');
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 12, taskSeNm: '다른 문서' }], total: 1 });
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, docTtl: '알림으로 연 문서', version: 1 }));
    renderClient();

    await waitFor(() => expect(mocks.getMyHistory).toHaveBeenCalled());
    expect(mocks.getPending).not.toHaveBeenCalledWith(expect.objectContaining({ size: 20 }));
    await waitFor(() => expect(mocks.getDetail).toHaveBeenCalledWith(91));
    expect(await screen.findByRole('heading', { name: '알림으로 연 문서 · 1차' })).toBeInTheDocument();
  });

  it('형식이 틀린 링크 값은 버리고 기본 화면으로 연다', async () => {
    openLink('tab=ADMIN&doc=1%20OR%201');
    renderClient();
    await waitFor(() => expect(mocks.getPending).toHaveBeenCalled());
    await waitFor(() => expect(mocks.getDetail).toHaveBeenCalledWith(73));
    expect(mocks.getMyHistory).not.toHaveBeenCalled();
  });

  it('집중 모드에서는 J·K 로 문서를 옮기고 A 로 승인하며, 입력 중인 글자는 단축키로 보지 않는다', async () => {
    const doc = (sn: number, name: string) => ({ ...pendingApproval, ifmlAtrzSn: sn, taskSeNm: name });
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서')], total: 2 });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '집중 모드' }));
    expect(screen.getByRole('button', { name: '집중 모드' })).toHaveAttribute('aria-pressed', 'true');
    await screen.findByRole('button', { name: '결재 승인' });

    fireEvent.keyDown(window, { key: 'j' });
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    fireEvent.keyDown(await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' }), { key: 'a' });
    expect(screen.queryAllByText(/10초 뒤 처리합니다/)).toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.keyDown(window, { key: 'a' });
    expect((await screen.findAllByText(/10초 뒤 처리합니다/)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: / 되돌리기$/ }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByRole('button', { name: '집중 모드' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('내가 올린 결재 목록은 지금 차례인 사람과 부재·보완 요청을 보인다 (2026-10-03)', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 40, aplcntId: 'approver', docTtl: '출장 신청',
      currentStageSince: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      openSupplement: { askedBy: 'boss', question: '금액?' },
      stages: [{ order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [{ userId: 'boss', userNm: '부장', status: 'ACTIVE', absent: true }] }] }], total: 1 });
    renderClient();
    fireEvent.click(await screen.findByRole('tab', { name: '내가 올린 결재' }));
    expect(await screen.findByText(/지금 차례: 부장/)).toBeInTheDocument();
    expect(screen.getByText('· 3일째 대기')).toBeInTheDocument();
    expect(screen.getByText('보완 요청 중')).toBeInTheDocument();
  });

  /**
   * 기안 취소(철회) — 되돌릴 수 없는 동작이므로 확인 → 동기 선점 → 실패 노출을 모두 지킨다.
   *
   * 서버는 신청자 본인 + 대기('A') 상태만 허용한다(InformalSanctionService#deleteInformalSanction).
   * 화면도 같은 조건에서만 버튼을 띄운다 — '내가 올린 결재' 탭 + 대기 상태.
   */
  it('기안 취소는 내가 올린 대기 건에만 뜨고, 대상 문서 번호를 밝힌 확인 뒤 철회한다', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 74 }], total: 1 });
    renderClient();

    // 결재 대기함(결재자 시점)에는 기안 취소가 없다 — 남의 기안을 철회할 수 없다.
    await screen.findByText('휴가 신청');
    expect(screen.queryByRole('button', { name: '결재 회수' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '내가 올린 결재' }));
    const cancel = await screen.findByRole('button', { name: '결재 회수' });
    fireEvent.click(cancel);

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0].message).toContain('#74');
    expect(mocks.confirm.mock.calls[0][0].variant).toBe('destructive');
    await waitFor(() => expect(mocks.cancelDraft).toHaveBeenCalledWith(74, 2));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('문서를 회수했습니다. 처리 이력은 보존됩니다.', 'success'));
  });

  it('기안 취소는 확인 대기 중에도 재진입을 막고 pending 상태·실패 사유를 드러낸다', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 74 }], total: 1 });
    // 지역 이름은 census 가 세는 write sink(cancelMutation.mutateAsync)와 같은 이름으로 둔다.
    const cancelMutation = mocks.cancelDraft;
    const pending = deferred<void>();
    cancelMutation.mockReturnValueOnce(pending.promise);
    renderClient();

    fireEvent.click(await screen.findByRole('tab', { name: '내가 올린 결재' }));
    const cancel = await screen.findByRole('button', { name: '결재 회수' });

    act(() => {
      fireEvent.click(cancel);
      fireEvent.click(cancel);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cancelMutation).toHaveBeenCalledTimes(1));
    expect(cancel).toBeDisabled();
    expect(cancel).toHaveAttribute('aria-busy', 'true');

    // 서버가 이유를 말하면(예: '신청 상태인 경우에만 삭제할 수 있습니다.') 그대로 드러낸다 —
    // 고정 문구로 덮으면 사용자가 왜 실패했는지 알 수 없다.
    await act(async () => {
      pending.reject(new Error('신청 상태인 경우에만 삭제할 수 있습니다.'));
    });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('결재를 회수하지 못했습니다.', 'error'));
    expect(screen.getByRole('alert')).toHaveTextContent('신청 상태인 경우에만 삭제할 수 있습니다.');
    expect(cancel).toBeEnabled();
  });

  it('확인 대화에서 취소하면 아무것도 지우지 않고 잠금을 푼다', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 74 }], total: 1 });
    mocks.confirm.mockResolvedValue(false);
    renderClient();

    fireEvent.click(await screen.findByRole('tab', { name: '내가 올린 결재' }));
    const cancel = await screen.findByRole('button', { name: '결재 회수' });
    fireEvent.click(cancel);

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.cancelDraft).not.toHaveBeenCalled();
    await waitFor(() => expect(cancel).toBeEnabled());
  });

  it('결재 반려는 중복 실행을 막고 실패 뒤 입력 사유를 보존한다', async () => {
    const confirmMutation = mocks.confirmMutation;
    const pending = deferred<void>();
    confirmMutation.mockReturnValueOnce(pending.promise);
    renderClient();

    const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' });
    fireEvent.change(reason, { target: { value: '예산 코드 확인이 필요합니다.' } });
    const reject = screen.getByRole('button', { name: '결재 반려' });

    act(() => {
      fireEvent.click(reject);
      fireEvent.click(reject);
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    expect(confirmMutation).toHaveBeenCalledWith(73, 'R', '예산 코드 확인이 필요합니다.', 2);
    expect(reject).toBeDisabled();
    expect(reject).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '결재 승인' })).toBeDisabled();

    await act(async () => {
      pending.reject(new Error('결재 반려 API 장애'));
    });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('결재를 반려하지 못했습니다.', 'error'));
    expect(reason).toHaveValue('예산 코드 확인이 필요합니다.');
    expect(reject).toBeEnabled();
    expect(reject).not.toHaveAttribute('aria-busy');
  });

  it('신청 상태와 대기 탭만으로 승인 권한을 추론하지 않는다', async () => {
    mocks.getDetail.mockResolvedValue({ ...pendingApproval, version: 2, canApprove: false, canWithdraw: false, canResubmit: false });
    renderClient(); await screen.findByText('휴가 신청');
    await waitFor(() => expect(mocks.getDetail).toHaveBeenCalledWith(73));
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재 반려' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재 회수' })).not.toBeInTheDocument();
  });

  it('합의 동의를 실제 단계와 버전으로 전송하고 승인 의견을 보존한다', async () => {
    mocks.getDetail.mockResolvedValue({ ...pendingApproval, version: 4, canApprove: true, stages: [{ order: 1, kind: 'AGREEMENT', status: 'ACTIVE', approvers: [{ userId: 'approver', status: 'ACTIVE' }] }] });
    renderClient(); const agree = await screen.findByRole('button', { name: '합의 동의' });
    fireEvent.change(screen.getByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' }), { target: { value: '검토한 내용에 동의합니다.' } });
    fireEvent.click(agree);
    fireEvent.click(await screen.findByRole('button', { name: / 지금 처리$/ }));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledWith(73, 'C', '검토한 내용에 동의합니다.', 4));
  });

  it('처리한 문서의 바로 다음 문서로 넘어가고, 마지막이었으면 바로 앞 문서로 간다 (DIP C8)', async () => {
    // 종전에는 처리한 문서가 아닌 첫 문서로 가서, 목록 중간에서 처리하면 매번 맨 위로 되돌아갔다.
    const doc = (sn: number, name: string) => ({ ...pendingApproval, ifmlAtrzSn: sn, taskSeNm: name });
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서'), doc(73, '셋째 문서')], total: 3 });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '둘째 문서 #72 상세 열기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    fireEvent.click(await screen.findByRole('button', { name: '결재 승인' }));

    // 되돌리기 대기 중에도 다음 문서로 바로 넘어간다 — 처리를 기다리지 않는다.
    await waitFor(() => expect(screen.getByRole('button', { name: '셋째 문서 #73 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    expect(mocks.confirmMutation).not.toHaveBeenCalled();

    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    for (const now of screen.getAllByRole('button', { name: / 지금 처리$/ })) fireEvent.click(now);
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledTimes(2));
  });

  it('작성 중 의견이 있는 문서 선택 변경을 취소하면 의견과 기존 선택을 보존한다', async () => {
    mocks.getPending.mockResolvedValue({ list: [pendingApproval, { ...pendingApproval, ifmlAtrzSn: 99, taskSeNm: '다음 문서' }], total: 2 });
    renderClient(); const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' });
    fireEvent.change(reason, { target: { value: '작성 중 검토 의견' } }); mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(screen.getByRole('button', { name: '다음 문서 #99 상세 열기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '저장하지 않은 변경' })));
    expect(reason).toHaveValue('작성 중 검토 의견');
    expect(screen.getByRole('button', { name: '휴가 신청 #73 상세 열기' })).toHaveAttribute('aria-current', 'true');
    mocks.confirm.mockResolvedValueOnce(true);
    fireEvent.click(screen.getByRole('button', { name: '다음 문서 #99 상세 열기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '다음 문서 #99 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    expect(await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' })).toHaveValue('');
  });

  it('[2026-10-01] 다른 결재자가 먼저 반려했으면 서버가 말한 사유를 보이고 목록을 다시 읽는다', async () => {
    // 종전에는 사유 없는 400 이라 무슨 일이 있었는지 알 수 없었고, 사라진 문서가 목록에 남았다.
    mocks.confirmMutation.mockRejectedValueOnce({
      isAxiosError: true,
      response: { status: 409, data: { message: '이미 반려된 결재입니다. 처리할 수 없습니다. 최신 상태를 확인해 주세요.' } },
    });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '결재 승인' }));
    fireEvent.click(await screen.findByRole('button', { name: / 지금 처리$/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 반려된 결재입니다. 처리할 수 없습니다.');
    const listReads = mocks.getPending.mock.calls.length;
    await waitFor(() => expect(mocks.getPending.mock.calls.length).toBeGreaterThan(listReads - 1));
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '최신 문서 확인' })).toBeInTheDocument();
  });

  it('[2026-10-01] 결재 기능 권한이 없으면 서버 힌트가 참이어도 기안·승인·반려 버튼을 보이지 않는다', async () => {
    auth.permissions = ['APPROVAL_READ'];
    renderClient();

    expect(await screen.findByText('휴가 신청')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '새 결재 기안' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '결재 반려' })).not.toBeInTheDocument();
  });

  it('목록 항목에 문서 번호를 보인다 — 알림이 말하는 번호로 찾을 수 있다', async () => {
    renderClient();
    expect(await screen.findByText(/번호 73/)).toBeInTheDocument();
  });

  it('409 후 의견을 유지하고 최신 상세를 확인하기 전 재처리를 막는다', async () => {
    mocks.confirmMutation.mockRejectedValueOnce({ response: { status: 409 } });
    renderClient(); const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' });
    fireEvent.change(reason, { target: { value: '입력을 보존할 의견' } }); fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    fireEvent.click(await screen.findByRole('button', { name: / 지금 처리$/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('입력한 의견은 유지됩니다.');
    expect(reason).toHaveValue('입력을 보존할 의견');
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    mocks.getDetail.mockResolvedValue({ ...pendingApproval, version: 3, canApprove: true });
    fireEvent.click(screen.getByRole('button', { name: '최신 문서 확인' }));
    fireEvent.click(await screen.findByRole('button', { name: '결재 승인' }));
    fireEvent.click(await screen.findByRole('button', { name: / 지금 처리$/ }));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenLastCalledWith(73, 'C', '입력을 보존할 의견', 3));
  });

  it('목록 새로고침으로 문서가 사라져도 의견을 다른 첫 문서로 옮기지 않는다', async () => {
    renderClient(); const reason = await screen.findByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' });
    fireEvent.change(reason, { target: { value: '73번 문서의 검토 의견' } });
    mocks.getPending.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 99, taskSeNm: '다른 첫 문서' }], total: 1 });
    fireEvent.click(screen.getByRole('button', { name: '결재함 목록 새로고침' }));
    await screen.findByText('다른 첫 문서');
    expect(screen.getByText(/입력은 이 문서에 보존했습니다/)).toBeInTheDocument();
    expect(reason).toHaveValue('73번 문서의 검토 의견'); expect(reason).toHaveAttribute('readonly');
    expect(screen.queryByRole('button', { name: '결재 승인' })).not.toBeInTheDocument();
    expect(mocks.getDetail).not.toHaveBeenCalledWith(99);
    expect(mocks.confirmMutation).not.toHaveBeenCalled();
  });

  it('이력에 현재 차수만 있으면 이전 차수 이력을 표시하지 않는다', async () => {
    mocks.getDetail.mockResolvedValue({
      ...pendingApproval, docTtl: '최초 문서', docCn: '최초 본문', atrzCycl: 1,
      history: [{ atrzCycl: 1, docTtl: '최초 문서', docCn: '최초 본문', aprvYn: 'A', stages: [] }],
    });
    renderClient();
    await screen.findByRole('heading', { name: '최초 문서 · 1차' });
    expect(screen.queryByRole('region', { name: '이전 차수 이력' })).not.toBeInTheDocument();
    expect(screen.getAllByText('최초 본문')).toHaveLength(1);
    expect(screen.getByRole('list', { name: '결재선 진행' })).toBeInTheDocument();
  });

  it('전체 이력에서 이전 차수만 표시하고 현재 문서와 결재선 이름을 구분한다', async () => {
    mocks.getDetail.mockResolvedValue({
      ...pendingApproval, docTtl: '보완된 문서', docCn: '현재 본문', version: 3, atrzCycl: 2, canApprove: false,
      history: [
        { atrzCycl: 1, docTtl: '최초 문서', docCn: '이전 본문', aprvYn: 'R', stages: [] },
        { atrzCycl: 2, docTtl: '보완된 문서', docCn: '현재 본문', aprvYn: 'A', stages: [] },
      ],
    });
    renderClient();
    await screen.findByRole('heading', { name: '보완된 문서 · 2차' });
    expect(screen.getAllByText('현재 본문')).toHaveLength(1);
    expect(screen.getByText('1차 · 최초 문서 · 반려')).toBeInTheDocument();
    expect(screen.getByText('이전 본문')).toBeInTheDocument();
    expect(screen.queryByText('2차 · 보완된 문서 · 대기')).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: '결재선 진행' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('1차 · 최초 문서 · 반려'));
    expect(screen.getByRole('list', { name: '1차 결재선 진행' })).toBeInTheDocument();
  });

  it('여러 건 승인은 한 번만 실행되고 처리 중 잠기며, 실패한 문서를 사유와 함께 밝힌다', async () => {
    const doc = (sn: number) => ({ ...pendingApproval, ifmlAtrzSn: sn, docTtl: `휴가 ${sn}`, version: sn, canApprove: true });
    mocks.getPending.mockResolvedValue({ list: [doc(91), doc(92)], total: 2 });
    // 지역 이름은 census 가 세는 write sink(confirmMutation.mutateAsync)와 같은 이름으로 둔다.
    const confirmMutation = mocks.confirmMutation;
    const pending = deferred<void>();
    confirmMutation.mockReturnValueOnce(pending.promise);
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '휴가 신청 2건 고르기' }));
    const bulk = screen.getByRole('button', { name: '선택한 2건 승인' });

    act(() => { fireEvent.click(bulk); fireEvent.click(bulk); });

    await waitFor(() => expect(confirmMutation).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(bulk).toBeDisabled();
    expect(bulk).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.reject(new Error('이미 반려된 결재입니다.')); });

    expect(await screen.findByRole('alert')).toHaveTextContent('1건은 승인했고 1건은 처리하지 못했습니다.');
    expect(screen.getByRole('alert')).toHaveTextContent('‘휴가 91’: 이미 반려된 결재입니다.');
    expect(mocks.toast).toHaveBeenCalledWith('1건을 승인하지 못했습니다.', 'error');
  });

  it('보완 요청은 한 번만 보내고 처리 중 잠기며, 실패하면 의견을 남긴 채 사유를 보인다', async () => {
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, version: 5, canApprove: true, canRequestSupplement: true }));
    // 지역 이름은 census 가 세는 write sink(supplementMutation.mutateAsync)와 같은 이름으로 둔다.
    const supplementMutation = mocks.requestSupplement;
    const pending = deferred<void>();
    supplementMutation.mockReturnValueOnce(pending.promise);
    renderClient();
    const ask = await screen.findByRole('button', { name: '보완 요청' });
    const reason = screen.getByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' });
    fireEvent.change(reason, { target: { value: '금액을 적어 주세요' } });

    act(() => { fireEvent.click(ask); fireEvent.click(ask); });

    await waitFor(() => expect(supplementMutation).toHaveBeenCalledTimes(1));
    expect(ask).toBeDisabled();
    expect(ask).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.reject(new Error('이미 열린 보완 요청이 있습니다.')); });

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 열린 보완 요청이 있습니다. 입력한 의견은 유지됩니다.');
    expect(mocks.toast).toHaveBeenCalledWith('결재를 보완 요청하지 못했습니다.', 'error');
    expect(reason).toHaveValue('금액을 적어 주세요');
  });

  it('고쳐서 다시 올리기는 회수를 한 번만 보내고 처리 중 잠기며, 실패하면 사유를 보인다', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [{ ...pendingApproval, ifmlAtrzSn: 74 }], total: 1 });
    // 지역 이름은 census 가 세는 write sink(cancelMutation.mutateAsync)와 같은 이름으로 둔다.
    const cancelMutation = mocks.cancelDraft;
    const pending = deferred<void>();
    cancelMutation.mockReturnValueOnce(pending.promise);
    renderClient();
    fireEvent.click(await screen.findByRole('tab', { name: '내가 올린 결재' }));
    const revise = await screen.findByRole('button', { name: '고쳐서 다시 올리기' });

    act(() => { fireEvent.click(revise); fireEvent.click(revise); });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '고쳐서 다시 올리기' })));
    await waitFor(() => expect(cancelMutation).toHaveBeenCalledTimes(1));
    expect(revise).toBeDisabled();
    expect(revise).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.reject(new Error('이미 승인이 끝난 결재입니다.')); });

    expect(await screen.findByRole('alert')).toHaveTextContent('이미 승인이 끝난 결재입니다.');
    expect(mocks.toast).toHaveBeenCalledWith('결재를 회수하지 못했습니다.', 'error');
    expect(screen.queryByRole('dialog', { name: '새 결재 기안' })).not.toBeInTheDocument();
  });
});

/** 2026-10-03 결재 동선 개선 검토(F4~F25) — 되돌리기·집중 모드·알림 링크·여러 건 승인의 결함 수정. */
describe('ApprovalHubClient 결재 동선 검토 수정', () => {
  const OPINION = '결재 의견 (반려·보완 요청 시 필수)';
  const doc = (sn: number, docTtl: string, extra: Record<string, unknown> = {}) => (
    { ...pendingApproval, ifmlAtrzSn: sn, docTtl, taskSeCd: 'TRIP', taskSeNm: '출장', version: sn, canApprove: true, ...extra });
  // 상세도 서버처럼 제목을 싣는다 — 처리 예정 영역은 상세의 제목으로 문서를 부른다.
  const TITLES: Record<number, string> = { 71: '첫 문서', 72: '둘째 문서', 81: '출장 81', 82: '출장 82', 99: '다음 쪽 문서' };

  beforeEach(() => {
    vi.clearAllMocks();
    openLink('');
    auth.permissions = FULL_PERMISSIONS;
    mocks.confirm.mockResolvedValue(true);
    mocks.confirmMutation.mockResolvedValue(undefined);
    mocks.replaceApprover.mockResolvedValue(undefined);
    mocks.answerSupplement.mockResolvedValue(undefined);
    mocks.getMyHistory.mockResolvedValue({ list: [], total: 0 });
    mocks.getProcessed.mockResolvedValue({ list: [], total: 0 });
    mocks.getTaskTypes.mockResolvedValue([]);
    mocks.getPending.mockResolvedValue({ list: [pendingApproval], total: 1 });
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, docTtl: TITLES[id], version: 2, canApprove: true }));
  });

  it('여러 건 승인은 이미 처리 예정에 오른 문서를 다시 보내지 않고, 확인 문구가 실제로 보내는 건수를 말한다 (F4)', async () => {
    mocks.getPending.mockResolvedValue({ list: [doc(81, '출장 81'), doc(82, '출장 82'), doc(83, '교육 83', { taskSeCd: 'EDU', taskSeNm: '교육' })], total: 3 });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '출장 2건 고르기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());

    // 단건으로 승인한 문서는 여러 건 선택에서 빠진다 — 되돌려도 다시 고른 것으로 남지 않는다.
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    fireEvent.click(await screen.findByRole('button', { name: '‘출장 81’ 승인 되돌리기' }));
    expect(await screen.findByRole('checkbox', { name: '출장 81 여러 건 승인에 고르기' })).not.toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: '출장 2건 고르기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '출장 81 #81 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    await screen.findByRole('button', { name: '‘출장 81’ 승인 되돌리기' });

    fireEvent.click(screen.getByRole('button', { name: '선택한 1건 승인' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      confirmText: '1건 승인', message: expect.stringContaining('선택한 1건을 의견 없이 승인합니다'),
    })));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledTimes(1));
    expect(mocks.confirmMutation).toHaveBeenCalledWith(82, 'C', undefined, 82);
    expect(mocks.confirmMutation).not.toHaveBeenCalledWith(81, expect.anything(), expect.anything(), expect.anything());
  });

  it('고른 뒤 다시 읽은 목록에서 승인할 수 없게 된 문서(보완 요청 중·승인 힌트 꺼짐)는 여러 건 승인에서 보내지 않는다 (F4)', async () => {
    const trips = [doc(81, '출장 81'), doc(82, '출장 82'), doc(86, '출장 86'), doc(83, '교육 83', { taskSeCd: 'EDU', taskSeNm: '교육' })];
    mocks.getPending.mockResolvedValue({ list: trips, total: 4 });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '출장 3건 고르기' }));

    // 다른 결재자가 보완을 요청했고(82), 다른 결재자가 먼저 처리해 내 승인 힌트가 꺼졌다(86).
    mocks.getPending.mockResolvedValue({ list: [
      trips[0], { ...trips[1], openSupplement: { askedBy: 'peer', question: '금액?' } }, { ...trips[2], canApprove: false }, trips[3],
    ], total: 4 });
    fireEvent.click(screen.getByRole('button', { name: '결재함 목록 새로고침' }));
    fireEvent.click(await screen.findByRole('button', { name: '선택한 1건 승인' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '1건 승인' })));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledTimes(1));
    expect(mocks.confirmMutation).toHaveBeenCalledWith(81, 'C', undefined, 81);
  });

  it('여러 건 승인 확인 문구는 모든 문서가 다음 단계로 넘어간다고 단정하지 않고 합의 단계를 동의로 부른다 (F20)', async () => {
    const agreement = { stages: [{ order: 1, kind: 'AGREEMENT', status: 'ACTIVE', approvers: [{ userId: 'approver', status: 'ACTIVE' }] }] };
    mocks.getPending.mockResolvedValue({ list: [doc(84, '출장 84'), doc(85, '출장 85', agreement)], total: 2 });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '출장 2건 고르기' }));
    fireEvent.click(screen.getByRole('button', { name: '선택한 2건 승인' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const message = mocks.confirm.mock.calls[0][0].message as string;
    expect(message).not.toContain('다음 단계 결재자에게 차례가 넘어갑니다');
    expect(message).toContain('합의 단계 1건은 동의');
    expect(message).toContain('마지막 단계면 완료됩니다');
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('2건을 처리했습니다.', 'success'));
  });

  it('승인을 되돌리면 승인과 함께 적었던 의견을 다시 채운다 (F9·F17)', async () => {
    renderClient();
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.change(screen.getByRole('textbox', { name: OPINION }), { target: { value: '다음 분기에 반영 바랍니다' } });
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: OPINION })).toHaveValue(''));

    fireEvent.click(await screen.findByRole('button', { name: /승인 되돌리기$/ }));
    await waitFor(() => expect(screen.getByRole('textbox', { name: OPINION })).toHaveValue('다음 분기에 반영 바랍니다'));
    expect(await screen.findByText(/적었던 의견을 다시 채웠습니다/)).toBeInTheDocument();
    expect(mocks.confirmMutation).not.toHaveBeenCalled();
  });

  it('승인이 늦게 실패해도 다른 문서에 쓰던 의견을 덮지 않고, 실패한 문서의 의견은 그 문서를 다시 열면 채운다 (F5)', async () => {
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서')], total: 2 });
    mocks.confirmMutation.mockRejectedValueOnce(new Error('결재 서버 장애'));
    renderClient();
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.change(screen.getByRole('textbox', { name: OPINION }), { target: { value: '첫 문서 의견' } });
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));

    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.change(screen.getByRole('textbox', { name: OPINION }), { target: { value: '둘째 문서 의견' } });
    fireEvent.click(screen.getByRole('button', { name: '‘첫 문서’ 승인 지금 처리' }));

    expect(await screen.findByText(/‘첫 문서’ 승인하지 못했습니다\. 결재 서버 장애/)).toBeInTheDocument();
    expect(screen.getByText(/문서를 다시 열면 채웁니다/)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: OPINION })).toHaveValue('둘째 문서 의견');
    expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true');
    expect(mocks.toast).toHaveBeenCalledWith('결재를 승인하지 못했습니다.', 'error');

    // 첫 문서를 다시 열면(작성 중 의견을 버리는 확인을 거쳐) 맡아 둔 의견이 채워진다.
    fireEvent.click(screen.getByRole('button', { name: '첫 문서 #71 상세 열기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '첫 문서 #71 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    await waitFor(() => expect(screen.getByRole('textbox', { name: OPINION })).toHaveValue('첫 문서 의견'));
  });

  it('처리 예정 행의 버튼은 문서마다 이름이 다르고, 목록 페이지를 옮겨도 문서 이름을 보이며, ‘지금 처리’ 뒤 포커스가 남는다 (F19·F25)', async () => {
    mocks.getPending.mockImplementation(async ({ page }: { page: number }) => (
      page === 0 ? { list: [doc(71, '첫 문서'), doc(72, '둘째 문서')], total: 25 } : { list: [doc(99, '다음 쪽 문서')], total: 25 }
    ));
    renderClient();
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));

    const queueRegion = await screen.findByRole('region', { name: '처리 예정' });
    expect(within(queueRegion).getByRole('button', { name: '‘첫 문서’ 승인 되돌리기' })).toBeInTheDocument();
    expect(within(queueRegion).getByRole('button', { name: '‘둘째 문서’ 승인 지금 처리' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: '2' }));
    await screen.findByText('다음 쪽 문서');
    expect(within(screen.getByRole('region', { name: '처리 예정' })).getByText(/‘첫 문서’ 승인을 10초 뒤 처리합니다/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '‘첫 문서’ 승인 지금 처리' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '‘둘째 문서’ 승인 되돌리기' })).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: '‘둘째 문서’ 승인 지금 처리' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '다음 쪽 문서 #99 상세 열기' })).toHaveFocus());
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledTimes(2));
  });

  it('여러 건 승인 영역은 이름 있는 영역으로 보조기술에 드러난다 (F25)', async () => {
    mocks.getPending.mockResolvedValue({ list: [doc(81, '출장 81'), doc(82, '출장 82')], total: 2 });
    renderClient();
    expect(await screen.findByRole('region', { name: '여러 건 승인' })).toBeInTheDocument();
  });

  it('결재자를 바꿔 문서 버전이 올라가도 작성 중인 보완 답변은 그대로 남는다 (F6)', async () => {
    let version = 5;
    mocks.getDetail.mockImplementation(async (id: number) => ({
      ...pendingApproval, ifmlAtrzSn: id, docTtl: `출장 신청 v${version}`, aplcntId: 'approver', version, canApprove: false,
      canAnswerSupplement: true, canReplaceApprover: true,
      openSupplement: { askedBy: 'boss', askedByNm: '부장', question: '금액을 적어 주세요' },
      stages: [
        { order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [{ userId: 'boss', userNm: '부장', status: 'ACTIVE' }] },
        { order: 2, kind: 'APPROVAL', status: 'WAITING', approvers: [{ userId: 'chief', userNm: '본부장', status: 'WAITING' }] },
      ],
    }));
    mocks.replaceApprover.mockImplementation(async () => { version += 1; });
    renderClient();

    fireEvent.change(await screen.findByRole('textbox', { name: /보완 답변/ }), { target: { value: '45만 원입니다' } });
    fireEvent.click(screen.getByRole('button', { name: '본부장 결재자 바꾸기' }));
    fireEvent.click(screen.getByRole('button', { name: '새결재자 고르기' }));
    await waitFor(() => expect(mocks.replaceApprover).toHaveBeenCalledWith(73, 'chief', 'NEW', 5));

    // 다시 읽은 상세(버전 6)가 그려진 뒤에도 답변이 남는다.
    expect(await screen.findByRole('heading', { name: '출장 신청 v6 · 1차' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /보완 답변/ })).toHaveValue('45만 원입니다');
  });

  it('집중 모드의 R 은 의견 칸으로 옮긴 뒤 Ctrl+Enter 로 반려를 마치고, 칸 안의 Esc 는 집중 모드를 끝내지 않는다 (F8)', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '집중 모드' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());

    fireEvent.keyDown(window, { key: 'r' });
    const reason = screen.getByRole('textbox', { name: OPINION });
    await waitFor(() => expect(reason).toHaveFocus());
    expect(screen.getByText(/Ctrl\+Enter 를 누르면 반려합니다/)).toBeInTheDocument();
    expect(screen.queryByText(/다시 R 을 누르세요/)).not.toBeInTheDocument();

    fireEvent.change(reason, { target: { value: '서류 미비' } });
    fireEvent.keyDown(reason, { key: 'Enter', ctrlKey: true });
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '결재 반려' })));
    await waitFor(() => expect(mocks.confirmMutation).toHaveBeenCalledWith(73, 'R', '서류 미비', 2));

    const again = await screen.findByRole('textbox', { name: OPINION });
    again.focus();
    fireEvent.keyDown(again, { key: 'Escape' });
    expect(screen.getByRole('button', { name: '집중 모드' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(screen.getByRole('button', { name: '휴가 신청 #73 상세 열기' })).toHaveFocus());
  });

  it('집중 모드라도 대화상자가 열려 있으면 단축키로 뒤에 가려진 문서를 옮기거나 승인하지 않는다 (F10·F14)', async () => {
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서')], total: 2 });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '집중 모드' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: '새 결재 기안' }));
    const dialog = await screen.findByRole('dialog', { name: '새 결재 기안' });
    fireEvent.keyDown(dialog, { key: 'a' });
    fireEvent.keyDown(window, { key: 'j' });

    expect(screen.queryByRole('region', { name: '처리 예정' })).not.toBeInTheDocument();
    expect(screen.queryAllByText(/10초 뒤 처리합니다/)).toHaveLength(0);
    expect(screen.getByRole('button', { name: '첫 문서 #71 상세 열기' })).toHaveAttribute('aria-current', 'true');
  });

  it('대기함을 떠나면 집중 모드가 꺼진다 — 다른 탭에 안내와 단축키가 남지 않는다 (F11·F18)', async () => {
    mocks.getMyHistory.mockResolvedValue({ list: [doc(74, '첫 올린 건'), doc(76, '둘째 올린 건')], total: 2 });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '집중 모드' }));
    expect(screen.getByText(/집중 모드 · J 다음 문서/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '내가 올린 결재' }));
    await screen.findByText('첫 올린 건');
    expect(screen.queryByText(/집중 모드 · J 다음 문서/)).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'j' });
    expect(screen.getByRole('button', { name: '첫 올린 건 #74 상세 열기' })).toHaveAttribute('aria-current', 'true');

    fireEvent.click(screen.getByRole('tab', { name: '대기 중인 결재' }));
    expect(await screen.findByRole('button', { name: '집중 모드' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('같은 알림 링크를 다시 눌러도 그 문서를 다시 연다 — 연 링크는 주소에서 지운다 (F12)', async () => {
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서')], total: 2 });
    openLink('tab=PENDING&doc=72');
    const { rerenderClient } = renderClient();
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    await waitFor(() => expect(window.location.search).toBe(''));

    fireEvent.click(screen.getByRole('button', { name: '첫 문서 #71 상세 열기' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '첫 문서 #71 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    const detailReads = mocks.getDetail.mock.calls.filter(([id]) => id === 72).length;

    // 같은 문서의 재알림 링크를 누른다.
    openLink('tab=PENDING&doc=72');
    rerenderClient();
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    await waitFor(() => expect(mocks.getDetail.mock.calls.filter(([id]) => id === 72).length).toBeGreaterThan(detailReads));
  });

  it('‘오늘 차례가 됨’ 은 한국 달력 날짜로 판정한다 — 어제 밤 차례가 된 문서는 오늘 새벽에 1일째다 (F21)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-10-02T16:00:00Z')); // 한국 2026-10-03 01:00
      const turn = (sn: number, docTtl: string, since: string) => doc(sn, docTtl, {
        aplcntId: 'approver', currentStageSince: since,
        stages: [{ order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [{ userId: 'boss', userNm: '부장', status: 'ACTIVE' }] }],
      });
      mocks.getMyHistory.mockResolvedValue({ list: [
        turn(40, '어제 밤 문서', '2026-10-02T23:00:00'),
        turn(41, '오늘 새벽 문서', '2026-10-03T00:30:00'),
      ], total: 2 });
      renderClient();
      fireEvent.click(await screen.findByRole('tab', { name: '내가 올린 결재' }));
      const yesterday = await screen.findByRole('button', { name: '어제 밤 문서 #40 상세 열기' });
      expect(yesterday).toHaveTextContent('· 1일째 대기');
      expect(yesterday).not.toHaveTextContent('오늘 차례가 됨');
      expect(screen.getByRole('button', { name: '오늘 새벽 문서 #41 상세 열기' })).toHaveTextContent('· 오늘 차례가 됨');
    } finally {
      vi.useRealTimers();
    }
  });

  it('다른 문서에 공백만 적어 둔 채 승인이 실패하면 실패한 문서를 다시 고르고 안내도 그 문서에 붙인다 (F5 잔여)', async () => {
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서')], total: 2 });
    mocks.confirmMutation.mockRejectedValueOnce(new Error('결재 서버 장애'));
    renderClient();
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결재 승인' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));

    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    // 의견이 아닌 공백만 적어 둔다 — 작성 중 의견으로 보지 않는다(이동 확인도 묻지 않는다).
    fireEvent.change(screen.getByRole('textbox', { name: OPINION }), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: '‘첫 문서’ 승인 지금 처리' }));

    await waitFor(() => expect(screen.getByRole('button', { name: '첫 문서 #71 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    expect(await screen.findByRole('alert')).toHaveTextContent('결재 서버 장애');
    expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).not.toHaveAttribute('aria-current', 'true');
  });

  it('의견을 쓰던 중 알림 링크로 옮기면(이동 확인을 거친 뒤) 그 의견을 버리고 링크 문서를 연다', async () => {
    mocks.getPending.mockResolvedValue({ list: [doc(71, '첫 문서'), doc(72, '둘째 문서')], total: 2 });
    const { rerenderClient } = renderClient();
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 승인' })).toBeEnabled());
    fireEvent.change(screen.getByRole('textbox', { name: OPINION }), { target: { value: '첫 문서 의견' } });

    openLink('tab=PENDING&doc=72');
    rerenderClient();

    await waitFor(() => expect(screen.getByRole('button', { name: '둘째 문서 #72 상세 열기' })).toHaveAttribute('aria-current', 'true'));
    expect(screen.getByRole('textbox', { name: OPINION })).toHaveValue('');
  });
});

/**
 * 2026-10-04 D4 — 참조자. '참조된 결재' 탭은 참조 축 API 를 부르고, 참조자가 연 문서는 읽기만 한다. 처리 버튼은 서버 힌트로만
 * 판단한다(참조자에게는 모두 거짓이다). 알림 링크 `?tab=REFERENCED&doc=N` 이 그 탭의 문서를 연다.
 */
describe('ApprovalHubClient 참조된 결재 (D4)', () => {
  const referenced = {
    ifmlAtrzSn: 55, aplcntId: 'drafter', aplcntNm: '기안자', aprvYn: 'R', reqYmd: '20261001', taskSeCd: 'TRIP', taskSeNm: '출장',
    docTtl: '참조로 받은 출장 결재', atrzCycl: 2, referenceViewer: true,
  };
  // 참조자가 보는 상세 — 쓰기 힌트는 서버가 모두 끈다. 참조자는 이전 차수 이력까지 읽는다.
  const referencedDetail = {
    ...referenced, canApprove: false, canWithdraw: false, canResubmit: false, canRemind: false, canReplaceApprover: false,
    canRequestSupplement: false, canAnswerSupplement: false, canAddReference: false,
    references: [{ userId: 'approver', userNm: '나참조', deptNm: '총무팀', atrzCycl: 1, designator: 'DRAFTER' }],
    history: [
      { atrzCycl: 1, docTtl: '참조로 받은 출장 결재', docCn: '1차 본문', aprvYn: 'R', stages: [] },
      { atrzCycl: 2, docTtl: '참조로 받은 출장 결재', docCn: '2차 본문', aprvYn: 'R', stages: [] },
    ],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    openLink('');
    auth.permissions = FULL_PERMISSIONS;
    mocks.confirm.mockResolvedValue(true);
    mocks.getTaskTypes.mockResolvedValue([]);
    mocks.getPending.mockResolvedValue({ list: [pendingApproval], total: 1 });
    mocks.getMyHistory.mockResolvedValue({ list: [], total: 0 });
    mocks.getProcessed.mockResolvedValue({ list: [], total: 0 });
    mocks.getReferenced.mockResolvedValue({ list: [referenced], total: 1 });
    mocks.getDetail.mockImplementation(async (id: number) => (id === 55
      ? referencedDetail
      : { ...pendingApproval, ifmlAtrzSn: id, version: 2, canApprove: true, canAddReference: true, references: [] }));
  });

  it('참조된 결재 탭은 참조 축 목록을 다른 탭과 같은 조건으로 부르고, 행에 참조 표시를 붙인다', async () => {
    renderClient();
    await screen.findByText('휴가 신청');
    fireEvent.click(screen.getByRole('tab', { name: '참조된 결재' }));
    const list = await screen.findByRole('list', { name: '참조된 결재 목록' });
    expect(mocks.getReferenced).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(within(list).getByText('참조')).toBeInTheDocument();
    expect(within(list).getByText('반려됨')).toBeInTheDocument();
    // 상태 조건은 문서의 지금 상태다 — 대기함처럼 떼지 않는다.
    fireEvent.change(screen.getByLabelText('문서 상태'), { target: { value: 'C' } });
    await waitFor(() => expect(mocks.getReferenced).toHaveBeenCalledWith(expect.objectContaining({ page: 0, size: 20, status: 'C' })));
    // 참조는 결재 대기가 아니다 — 대기 건수와 대기함 목록에는 섞이지 않는다.
    expect(mocks.getPending).not.toHaveBeenCalledWith(expect.objectContaining({ status: 'C' }));
  });

  it('참조된 결재가 없으면 그 사실과 어떻게 생기는지를 말한다', async () => {
    mocks.getReferenced.mockResolvedValue({ list: [], total: 0 });
    renderClient();
    await screen.findByText('휴가 신청');
    fireEvent.click(screen.getByRole('tab', { name: '참조된 결재' }));
    expect(await screen.findByText('참조된 결재가 없습니다. 다른 사람이 나를 참조자로 지정하면 여기에서 읽을 수 있습니다.')).toBeInTheDocument();
  });

  it('알림 링크 ?tab=REFERENCED 로 그 탭과 문서를 연다 — 대기함 아래에 열지 않는다', async () => {
    openLink('tab=REFERENCED&doc=55');
    renderClient();
    await waitFor(() => expect(screen.getByRole('tab', { name: '참조된 결재' })).toHaveAttribute('aria-selected', 'true'));
    await waitFor(() => expect(mocks.getReferenced).toHaveBeenCalledWith({ page: 0, size: 20 }));
    expect(mocks.getPending).not.toHaveBeenCalledWith(expect.objectContaining({ size: 20 }));
    await waitFor(() => expect(mocks.getDetail).toHaveBeenCalledWith(55));
    expect(await screen.findByRole('heading', { name: '참조로 받은 출장 결재 · 2차' })).toBeInTheDocument();
  });

  it('참조자가 연 문서는 읽기만 한다 — 결재 권한이 있어도 처리 버튼이 없고, 참조자 목록과 이전 차수 이력을 읽는다', async () => {
    openLink('tab=REFERENCED&doc=55');
    renderClient();
    expect(await screen.findByText('참조로 받은 문서입니다. 읽기만 할 수 있으며, 문서가 승인·반려·회수되어도 계속 읽을 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: '참조자 목록' })).toHaveTextContent('나참조');
    expect(screen.getByRole('region', { name: '이전 차수 이력' })).toHaveTextContent('1차 · 참조로 받은 출장 결재 · 반려');
    for (const name of ['결재 승인', '결재 반려', '보완 요청', '결재 회수', '고쳐서 다시 올리기', '수정 후 재상신', '복제해서 새로 기안', '참조자 추가']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(screen.queryByRole('textbox', { name: '결재 의견 (반려·보완 요청 시 필수)' })).not.toBeInTheDocument();
  });

  it('이전 차수 참조자가 이 차수 결재자가 되면 읽기 전용이라고 말하지 않고 대기함에 참조 표시도 붙이지 않는다 — 처리할 차례가 있다', async () => {
    // 개정 1: 참조는 차수마다 기록되고, 이전 차수 참조자는 다음 차수 결재자가 될 수 있다. 서버는 referenceViewer 와 처리 힌트를 함께 준다.
    mocks.getPending.mockResolvedValue({ list: [{ ...pendingApproval, referenceViewer: true, canApprove: true }], total: 1 });
    mocks.getDetail.mockImplementation(async (id: number) => ({ ...pendingApproval, ifmlAtrzSn: id, version: 2, referenceViewer: true, canApprove: true, canRequestSupplement: true, references: [] }));
    renderClient();
    expect(await screen.findByRole('button', { name: '결재 승인' })).toBeInTheDocument();
    expect(screen.queryByText(/참조로 받은 문서입니다/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '대기 중인 결재 목록' })).queryByText('참조')).not.toBeInTheDocument();
  });

  it('이전 차수 참조자가 이 차수의 다음 단계 결재자(아직 차례 전)이면 참조된 결재 탭에서 열어도 읽기 전용이라고 말하지 않는다', async () => {
    // 1차 참조자였던 나(approver)를 기안자가 2차 결재선 2단계에 넣었다. 1단계가 진행 중이라 내 차례는 아직이다(WAITING).
    const waitingLine = [
      { order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [{ userId: 'boss', userNm: '부장', status: 'ACTIVE' }] },
      { order: 2, kind: 'APPROVAL', status: 'WAITING', approvers: [{ userId: 'approver', userNm: '나참조', status: 'WAITING' }] },
    ];
    mocks.getReferenced.mockResolvedValue({ list: [{ ...referenced, aprvYn: 'A', stages: waitingLine }], total: 1 });
    mocks.getDetail.mockImplementation(async () => ({ ...referencedDetail, aprvYn: 'A', stages: waitingLine }));
    openLink('tab=REFERENCED&doc=55');
    renderClient();
    expect(await screen.findByRole('heading', { name: '참조로 받은 출장 결재 · 2차' })).toBeInTheDocument();
    expect(screen.queryByText(/참조로 받은 문서입니다/)).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: '참조된 결재 목록' })).queryByText('참조')).not.toBeInTheDocument();
  });

  it('참조자가 아닌 결재자에게는 읽기 전용 안내를 보이지 않고, 서버가 허락하면 참조자 추가를 상세에 둔다', async () => {
    renderClient();
    expect(await screen.findByRole('button', { name: '결재 승인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '참조자 추가' })).toBeInTheDocument();
    expect(screen.queryByText(/참조로 받은 문서입니다/)).not.toBeInTheDocument();
  });
});
