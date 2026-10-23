import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  permissions: ['BBS_MST_READ', 'BBS_MST_UPDATE', 'BBS_MST_DELETE'] as string[],
  updateBoardMaster: vi.fn(),
  isBoardMasterDeletable: vi.fn(),
  deleteBoardMasterPhysically: vi.fn(),
  invalidateQueries: vi.fn(),
  removeQueries: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  unsaved: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/contexts/UnsavedChangesContext', () => ({ useUnsavedChanges: mocks.unsaved }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@tanstack/react-query', () => ({
  queryOptions: <T,>(options: T) => options,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries, removeQueries: mocks.removeQueries }),
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

import { BoardSettingsTab } from '../BoardSettingsTab';
import { QNA_BOARD_ID } from '@/config/board-ids';

const DETAIL = {
  bbsId: 'BBSMSTR_AAAAAAAAAAAA', bbsTtl: '공지사항', bbsExpln: '전사 공지', bbsTypeCd: 'BBST02', bbsAtrbCd: 'BBSA01',
  tmpltId: 'TMPLT_LIST', ansPsbltyYn: 'N', fileAtchPsbltyYn: 'Y', atchPsbltyFileQty: 3, atchPsbltyFileSz: 5_242_880,
  useYn: 'Y', ansYn: 'Y', stsfdgYn: 'Y', version: 4, designations: [] as ('NOTICE' | 'FAQ' | 'TASK')[],
  rsvtPstgPsbltyYn: 'N',
  // [2026-10-23 ADR-0040 결정 5·6] 상세 응답의 필수 필드(NOT NULL DEFAULT 'N'·5·30 컬럼)다.
  upendFixPsbltyYn: 'N', upendFixUplmtNocs: 5, upendFixBscDayCnt: 30,
  // [2026-10-23 ADR-0040 결정 6·7] 상세 응답의 필수 필드(NOT NULL DEFAULT 'NONE'·'Y' 컬럼)다.
  prvtPstPlcyCd: 'NONE', rcmdtnUseYn: 'Y',
};

function renderTab(detail: Partial<typeof DETAIL> = {}) {
  const onReload = vi.fn().mockResolvedValue(undefined);
  render(<BoardSettingsTab detail={{ ...DETAIL, ...detail } as never} onReload={onReload} />);
  return { onReload };
}

const changesStatus = () => screen.getByRole('status', { name: '' });

/** 운영 화면 설정 탭(ADR-0040 §5.5·결정 9·10). */
describe('BoardSettingsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['BBS_MST_READ', 'BBS_MST_UPDATE', 'BBS_MST_DELETE'];
    mocks.updateBoardMaster.mockResolvedValue(undefined);
    mocks.isBoardMasterDeletable.mockResolvedValue(true);
    mocks.deleteBoardMasterPhysically.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));

    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    const rows = within(review).getAllByRole('row').slice(1).map((row) => row.textContent);
    expect(rows).toEqual([
      '게시판 명칭공지사항전사 공지사항—',
      '댓글 받기받음받지 않음새 댓글만 막습니다. 이미 달린 댓글은 그대로 보입니다.',
    ]);
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));

    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    const [bbsId, request] = mocks.updateBoardMaster.mock.calls[0];
    expect(bbsId).toBe('BBSMSTR_AAAAAAAAAAAA');
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

  // [2026-10-23 ADR-0040 결정 3·6] 예약 게시는 새 미래 시작일만 연다 — 켜면 기록용 미래 시작일 글이 전환 진단 대상이라고 알린다.
  it('예약 게시를 켜면 영향과 전환 진단 안내를 보이고 설정 요청에 싣는다', async () => {
    renderTab();
    const reservation = screen.getByRole('switch', { name: /예약 게시/ });
    expect(reservation).not.toBeChecked();
    expect(screen.getByText(/기존 게시판 기본값: 받지 않음/)).toBeInTheDocument();
    fireEvent.click(reservation);
    expect(changesStatus()).toHaveTextContent('변경 1건');
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));

    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    expect(within(review).getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual([
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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));

    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    expect(within(review).getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual([
      '상단 고정 허용허용 안 함허용운영 화면 게시물 탭에서 글을 상단에 고정할 수 있습니다(게시글 상단 고정 권한 필요).',
      '상단 고정 상한5건3건새 고정이 이 상한을 따릅니다. 줄여도 이미 고정된 글은 풀리지 않습니다.',
      '상단 고정 기본 일수30일14일고정 종료일을 비우고 고정할 때의 기간입니다. 이미 고정된 글의 종료일은 바뀌지 않습니다.',
    ]);
    fireEvent.click(within(review).getByRole('button', { name: '설정 저장' }));
    await waitFor(() => expect(mocks.updateBoardMaster).toHaveBeenCalledOnce());
    expect(mocks.updateBoardMaster.mock.calls[0][1]).toMatchObject({
      upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 3, upendFixBscDayCnt: 14, rsvtPstgPsbltyYn: 'N', version: 4,
    });
  });

  it('상단 고정 허용을 끄면 새 고정만 막는다고 말하고 상한·기본 일수는 그대로 보낸다', async () => {
    renderTab({ upendFixPsbltyYn: 'Y', upendFixUplmtNocs: 7, upendFixBscDayCnt: 10 });
    fireEvent.click(screen.getByRole('switch', { name: /상단 고정 허용/ }));
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));

    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    expect(within(review).getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual([
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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));

    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    expect(within(review).getAllByRole('row').slice(1).map((row) => row.textContent)).toEqual([
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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));

    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
    expect(within(review).getByRole('note')).toHaveTextContent('공개 FAQ 에 실리지 않습니다');
  });

  it('질의응답 게시판은 없음이 아니면 1:1 문의와 공개 질문이 함께 있다고 알린다', () => {
    renderTab({ bbsId: QNA_BOARD_ID, tmpltId: 'TMPLT_QNA' });
    const policy = screen.getByRole('combobox', { name: '비밀글 정책' });
    expect(screen.queryByText(/지식 허브 질의응답\(공개\)이 이 게시판을 함께 씁니다/)).toBeNull();
    fireEvent.change(policy, { target: { value: 'OPTIONAL' } });
    expect(policy).toHaveAccessibleDescription(/지식 허브 질의응답\(공개\)이 이 게시판을 함께 씁니다/);
    fireEvent.change(policy, { target: { value: 'NONE' } });
    expect(screen.queryByText(/지식 허브 질의응답\(공개\)이 이 게시판을 함께 씁니다/)).toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '변경 내용 확인' })).getByRole('button', { name: '설정 저장' }));

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
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
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
    renderTab({ atchPsbltyFileSz: null as unknown as number });
    expect(screen.getByText('Enterprise List')).toBeInTheDocument();
    expect(screen.getByText('없음')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /파일당 크기/ })).toHaveValue(0);
    expect(changesStatus()).toHaveTextContent('변경 0건');
  });

  it('설정 저장은 같은 tick 의 두 번째 요청을 보내지 않고, 저장 중 잠그며, 실패하면 알리고 입력을 남긴다', async () => {
    let rejectSave!: (reason?: unknown) => void;
    mocks.updateBoardMaster.mockReturnValueOnce(new Promise((_, reject) => { rejectSave = reject; }));
    renderTab();
    fireEvent.change(screen.getByRole('textbox', { name: '게시판 명칭' }), { target: { value: '새 이름' } });
    fireEvent.click(screen.getByRole('button', { name: '변경 내용 확인' }));
    const review = await screen.findByRole('dialog', { name: '변경 내용 확인' });
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
    it('같은 tick 의 두 번째 요청은 보내지 않고, 처리 중 잠그며, 실패하면 알린다', async () => {
      let rejectDelete!: (reason?: unknown) => void;
      mocks.deleteBoardMasterPhysically.mockReturnValueOnce(new Promise((_, reject) => { rejectDelete = reject; }));
      renderTab({ useYn: 'N' });
      const purge = screen.getByRole('button', { name: '게시판 영구 삭제' });

      act(() => {
        fireEvent.click(purge);
        fireEvent.click(purge);
      });

      await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledTimes(1));
      expect(mocks.isBoardMasterDeletable).toHaveBeenCalledTimes(1);
      expect(purge).toBeDisabled();
      expect(purge).toHaveAttribute('aria-busy', 'true');
      rejectDelete(new Error('영구 삭제 서버 오류'));
      await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('영구 삭제 서버 오류', 'error'));
      expect(purge).not.toBeDisabled();
      expect(mocks.push).not.toHaveBeenCalled();
    });

    it('사용 중인 게시판은 영구 삭제할 수 없다고 미리 말한다', () => {
      renderTab();
      expect(screen.getByRole('button', { name: '게시판 영구 삭제' })).toBeDisabled();
      expect(screen.getByText('먼저 게시판 사용을 사용 안 함으로 바꿔 저장하세요.')).toBeInTheDocument();
    });

    it('글이 있었던 게시판은 따를 수 있는 사실만 말하고 지우지 않는다', async () => {
      mocks.isBoardMasterDeletable.mockResolvedValue(false);
      renderTab({ useYn: 'N' });
      fireEvent.click(screen.getByRole('button', { name: '게시판 영구 삭제' }));
      await waitFor(() => expect(mocks.confirm).toHaveBeenCalledOnce());
      expect(mocks.confirm.mock.calls[0][0].message).toContain('글이 한 번이라도 있었던 게시판이라 영구 삭제할 수 없습니다');
      expect(mocks.deleteBoardMasterPhysically).not.toHaveBeenCalled();
    });

    it('확인하면 지우고 목록으로 돌아간다', async () => {
      renderTab({ useYn: 'N' });
      fireEvent.click(screen.getByRole('button', { name: '게시판 영구 삭제' }));
      await waitFor(() => expect(mocks.deleteBoardMasterPhysically).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA'));
      expect(mocks.push).toHaveBeenCalledWith('/admin/community/boards/master');
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['board-masters'] });
      // 지운 게시판의 상세는 무효화 전에 캐시에서 뺀다 — 열린 운영 화면이 다시 읽어 404 를 띄우지 않는다.
      expect(mocks.removeQueries).toHaveBeenCalledWith({ queryKey: ['board-masters', 'detail', 'BBSMSTR_AAAAAAAAAAAA'] });
      expect(mocks.removeQueries.mock.invocationCallOrder[0]).toBeLessThan(mocks.invalidateQueries.mock.invocationCallOrder[0]);
    });

    it('게시판 관리 삭제 권한이 없으면 영구 삭제 절차를 두지 않는다', () => {
      mocks.permissions = ['BBS_MST_READ', 'BBS_MST_UPDATE'];
      renderTab({ useYn: 'N' });
      expect(screen.queryByRole('button', { name: '게시판 영구 삭제' })).toBeNull();
    });
  });
});
