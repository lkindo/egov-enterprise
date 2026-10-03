import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createDraft: vi.fn(), resubmit: vi.fn(), getDetail: vi.fn(), getTaskTypes: vi.fn(), getLineSuggestions: vi.fn(), checkApprovers: vi.fn(), searchAssignableUsers: vi.fn(), toast: vi.fn(), confirm: vi.fn(),
  listTemporaryDrafts: vi.fn(), getTemporaryDraft: vi.fn(), createTemporaryDraft: vi.fn(), updateTemporaryDraft: vi.fn(), deleteTemporaryDraft: vi.fn() }));
// 기안자. 임시저장 동작은 기안 권한(APPROVAL_CREATE)이 있어야 보인다 — 권한을 빼는 시험은 permissions 를 바꾼다.
const auth = vi.hoisted(() => ({ user: { esntlId: 'DRAFTER', authorizationVersion: 'test-v1', permissions: ['APPROVAL_CREATE'] as string[] } }));
// 피커가 찾는 사람들. 홍기안은 기안자 본인이다.
const PEOPLE = [['BOSS', '김결재'], ['PEER', '이합의'], ['FINAL', '박최종'], ['DRAFTER', '홍기안']].map(([esntlId, userNm]) => ({ esntlId, userNm, deptNm: '기획팀', absent: false }));
const searchPeople = async (keyword: string) => PEOPLE.filter(person => person.userNm.includes(keyword));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: auth.user }) }));
vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({ approvalUserService: mocks }));
vi.mock('@/services/business/user/UserSearchService', () => ({ userSearchService: { searchAssignableUsers: mocks.searchAssignableUsers } }));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children, closeDisabled, onClose }: { isOpen: boolean; title: string; children: React.ReactNode; closeDisabled?: boolean; onClose: () => void }) => isOpen ? <div role="dialog" aria-label={title}><button disabled={closeDisabled} onClick={onClose}>모달 닫기</button>{children}</div> : null,
}));
vi.mock('@/components/ui/select', () => {
  const passthrough = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return {
    Select: ({ value, onValueChange, children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) => <select aria-label="업무 구분" value={value} onChange={event => onValueChange(event.target.value)}><option value="">업무 구분을 선택하세요</option>{children}</select>,
    SelectContent: passthrough, SelectTrigger: passthrough, SelectValue: () => null,
    SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>,
  };
});
import { ApprovalDraftDialog } from '../ApprovalDraftDialog';

function renderDialog(props: Partial<React.ComponentProps<typeof ApprovalDraftDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const onClose = vi.fn(); const onCreated = vi.fn();
  return { onClose, onCreated, ...render(<QueryClientProvider client={queryClient}><ApprovalDraftDialog isOpen onClose={onClose} onCreated={onCreated} {...props} /></QueryClientProvider>) };
}
async function fillContent() {
  fireEvent.change(await screen.findByRole('combobox', { name: '업무 구분' }), { target: { value: '01' } });
  fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '출장 승인 요청' } });
  fireEvent.change(screen.getByLabelText('본문 (선택)'), { target: { value: '출장 일정과 예산을 확인해 주세요.' } });
  fireEvent.change(screen.getByLabelText('신청일'), { target: { value: '2026-09-16' } });
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
}
/** 단계의 피커를 펼쳐 이름으로 찾고, 한 사람을 넣은 뒤 접는다. */
async function pick(stage: number, name: string, adding = false) {
  fireEvent.click(screen.getByRole('button', { name: `${stage}단계 결재자 ${adding ? '추가' : '선택'}` }));
  const picker = await screen.findByRole('group', { name: `${stage}단계 결재자 고르기` });
  await search(picker, name);
  fireEvent.click(await within(picker).findByRole('button', { name: new RegExp(`^${name}`) }));
  fireEvent.click(within(picker).getByRole('button', { name: '다 골랐어요' }));
}
async function search(picker: HTMLElement, name: string) {
  fireEvent.change(within(picker).getByRole('textbox', { name: '결재자 이름 검색' }), { target: { value: name } });
  fireEvent.click(within(picker).getByRole('button', { name: '찾기' }));
  await within(picker).findByText(/명을 찾았습니다|찾는 사람이 없습니다/);
}
async function reviewSingle() { await fillContent(); await pick(1, '김결재'); fireEvent.click(screen.getByRole('button', { name: '다음' })); }

describe('ApprovalDraftDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user.permissions = ['APPROVAL_CREATE'];
    mocks.listTemporaryDrafts.mockResolvedValue([]);
    mocks.confirm.mockResolvedValue(false);
    mocks.getTaskTypes.mockResolvedValue([{ dtlCd: '01', dtlCdNm: '일반', useYn: 'Y' }, { dtlCd: '99', dtlCdNm: '폐기', useYn: 'N' }]);
    mocks.createDraft.mockResolvedValue(88); mocks.resubmit.mockResolvedValue(88);
    mocks.searchAssignableUsers.mockImplementation(searchPeople);
    mocks.getLineSuggestions.mockResolvedValue({ lines: [], otherLines: [], recentApprovers: [] }); mocks.checkApprovers.mockResolvedValue([]);
  });
  it('업무 구분이 없으면 사실을 표시하고 상신 흐름을 막는다', async () => {
    mocks.getTaskTypes.mockResolvedValue([]); renderDialog();
    expect(await screen.findByText('등록된 업무 구분이 없어 결재를 올릴 수 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: '결재 기안 폼' }));
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it('목록 조회 실패를 빈 선택지와 구분하고 재시도한다', async () => {
    mocks.getTaskTypes.mockRejectedValueOnce(new Error('synthetic network failure')); renderDialog();
    expect(await screen.findByText('업무 구분을 불러오지 못했습니다.')).toBeInTheDocument();
    expect(screen.queryByText('등록된 업무 구분이 없어 결재를 올릴 수 없습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('option', { name: '일반' })).toBeInTheDocument();
  });
  it('필수 제목과 업무 구분을 요약하고 내용 작성 단계에 머무른다', async () => {
    renderDialog(); await screen.findByRole('combobox', { name: '업무 구분' });
    expect(screen.queryByRole('option', { name: '폐기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('제목을 입력해 주세요.');
    expect(summary).toHaveTextContent('업무 구분을 선택해 주세요.');
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it('각 단계와 최종 확인을 통과한 단일 결재 요청만 전송한다', async () => {
    const { onCreated, onClose } = renderDialog(); await fillContent();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이 단계의 결재자를 선택해 주세요.');
    expect(mocks.createDraft).not.toHaveBeenCalled();
    await pick(1, '김결재'); fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByLabelText('상신 결재선 미리보기')).toHaveTextContent('전원 승인 (1명)');
    expect(screen.getByText(/누구든 한 명이 반려하면 문서 전체가 반려/)).toBeInTheDocument();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith({ taskSeCd: '01', docTtl: '출장 승인 요청', docCn: '출장 일정과 예산을 확인해 주세요.', reqYmd: '20260916', stages: [{ kind: 'APPROVAL', approverIds: ['BOSS'] }] }));
    expect(onCreated).toHaveBeenCalledWith(88); expect(onClose).toHaveBeenCalled();
  });
  it('순차 단계 안의 여러 명과 합의 전원 동의를 미리보기와 요청에 보존한다', async () => {
    renderDialog(); await fillContent(); await pick(1, '김결재'); await pick(1, '이합의', true);
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' })); await pick(2, '박최종');
    const kinds = screen.getAllByLabelText('단계 유형'); fireEvent.change(kinds[1], { target: { value: 'AGREEMENT' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    const preview = screen.getByLabelText('상신 결재선 미리보기');
    expect(preview).toHaveTextContent('1단계 · 결재 · 전원 승인 (2명)');
    expect(preview).toHaveTextContent('2단계 · 합의 · 전원 동의 (1명)');
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ stages: [{ kind: 'APPROVAL', approverIds: ['BOSS', 'PEER'] }, { kind: 'AGREEMENT', approverIds: ['FINAL'] }] })));
  });
  it('다른 단계에 있는 사람과 기안자 본인은 피커에서 사유와 함께 고를 수 없다', async () => {
    renderDialog(); await fillContent(); await pick(1, '김결재');
    expect(within(screen.getByLabelText('1단계 결재자')).getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' }));
    fireEvent.click(screen.getByRole('button', { name: '2단계 결재자 선택' }));
    const picker = await screen.findByRole('group', { name: '2단계 결재자 고르기' });
    await search(picker, '김결재');
    expect(within(picker).getByRole('button', { name: /^김결재.*이미 다른 단계에 있습니다/ })).toBeDisabled();
    await search(picker, '홍기안');
    expect(within(picker).getByRole('button', { name: /^홍기안.*본인/ })).toBeDisabled();
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it('펼친 피커는 여러 명을 차례로 넣고 다시 누르면 빼며, 결재 권한이 없는 사람은 막는다 (2026-10-03)', async () => {
    mocks.checkApprovers.mockImplementation(async (ids: string[]) => ids.map(id => ({ esntlId: id, eligible: id !== 'FINAL', ineligibleReason: id === 'FINAL' ? 'NO_PERMISSION' : undefined })));
    mocks.searchAssignableUsers.mockImplementation(async () => PEOPLE);
    renderDialog(); await fillContent();
    fireEvent.click(screen.getByRole('button', { name: '1단계 결재자 선택' }));
    expect(screen.getByRole('button', { name: '1단계 결재자 선택' })).toHaveAttribute('aria-expanded', 'true');
    const picker = await screen.findByRole('group', { name: '1단계 결재자 고르기' });
    await search(picker, '결재');
    await waitFor(() => expect(within(picker).getByRole('button', { name: /^박최종.*결재 권한 없음/ })).toBeDisabled());
    fireEvent.click(within(picker).getByRole('button', { name: /^김결재/ }));
    fireEvent.click(within(picker).getByRole('button', { name: /^이합의/ }));
    expect(within(screen.getByLabelText('1단계 결재자')).getAllByRole('listitem')).toHaveLength(2);
    expect(within(picker).getByRole('button', { name: /^김결재/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(within(picker).getByRole('button', { name: /^김결재/ }));
    expect(within(screen.getByLabelText('1단계 결재자')).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('김결재를 1단계에서 뺐습니다.')).toBeInTheDocument();
    fireEvent.click(within(picker).getByRole('button', { name: '다 골랐어요' }));
    expect(screen.queryByRole('group', { name: '1단계 결재자 고르기' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ stages: [{ kind: 'APPROVAL', approverIds: ['PEER'] }] })));
  });
  it('피커는 사람 찾기가 실패하면 결과 없음이 아니라 실패라고 말하고, 자격 확인이 실패해도 고르게 둔다', async () => {
    mocks.searchAssignableUsers.mockRejectedValueOnce(new Error('network'));
    mocks.checkApprovers.mockRejectedValue(new Error('network'));
    renderDialog(); await fillContent();
    fireEvent.click(screen.getByRole('button', { name: '1단계 결재자 선택' }));
    const picker = await screen.findByRole('group', { name: '1단계 결재자 고르기' });
    fireEvent.change(within(picker).getByRole('textbox', { name: '결재자 이름 검색' }), { target: { value: '김결재' } });
    fireEvent.click(within(picker).getByRole('button', { name: '찾기' }));
    expect(await within(picker).findByText('사용자를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
    await search(picker, '김결재');
    expect(within(picker).getByRole('button', { name: /^김결재/ })).toBeEnabled();
  });
  it('키보드로 단계 순서를 바꾸고 이동한 카드에 초점을 유지한다', async () => {
    const user = userEvent.setup(); renderDialog(); await fillContent(); await pick(1, '김결재');
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' })); await pick(2, '이합의');
    fireEvent.change(screen.getAllByLabelText('단계 유형')[1], { target: { value: 'AGREEMENT' } });
    screen.getByRole('button', { name: '2단계 위로 이동' }).focus(); await user.keyboard('{Enter}');
    await waitFor(() => expect(screen.getByRole('heading', { name: '1단계 · 합의' })).toHaveFocus());
    expect(screen.getByRole('status')).toHaveTextContent('2단계를 1단계로 이동했습니다.');
    fireEvent.click(screen.getByRole('button', { name: '다음' })); fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ stages: [{ kind: 'AGREEMENT', approverIds: ['PEER'] }, { kind: 'APPROVAL', approverIds: ['BOSS'] }] })));
  });
  it('10단계를 넘겨 추가할 수 없다', async () => {
    renderDialog(); await fillContent(); for (let index = 1; index < 10; index++) fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' }));
    expect(within(screen.getByLabelText('결재선 단계')).getAllByRole('listitem')).toHaveLength(10);
    expect(screen.getByRole('button', { name: '다음 단계 추가' })).toBeDisabled();
  });
  it('단계별 10명과 전체 50명 한도를 구분하고 제외 후 여유를 반영한다', async () => {
    const stages = Array.from({ length: 5 }, (_, stageIndex) => ({ order: stageIndex + 1, kind: 'APPROVAL' as const, status: 'CANCELLED' as const,
      approvers: Array.from({ length: 10 }, (_, personIndex) => ({ userId: `member_${stageIndex}_${personIndex}`, userNm: `검토자${stageIndex}_${personIndex}`, status: 'CANCELLED' as const })),
    }));
    renderDialog({ resubmission: { ifmlAtrzSn: 88, aplcntId: 'DRAFTER', taskSeCd: '01', docTtl: '한도 시험', docCn: '', version: 1, stages } });
    await screen.findByRole('combobox', { name: '업무 구분' }); fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText('5/10단계 · 50/50명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 단계 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '1단계 결재자 추가' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2단계 결재자 추가' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '검토자0_0 결재선에서 제외' }));
    expect(screen.getByText('5/10단계 · 49/50명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다음 단계 추가' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '1단계 결재자 추가' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '2단계 결재자 추가' })).toBeDisabled();
  });
  it('서버 실패 후 작성 내용과 결재선을 유지하고 재시도할 수 있다', async () => {
    mocks.createDraft.mockRejectedValueOnce(new Error('synthetic API failure')); const { onClose, onCreated } = renderDialog(); await reviewSingle();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('synthetic API failure');
    expect(onClose).not.toHaveBeenCalled(); expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText('상신 결재선 미리보기')).toHaveTextContent('김결재');
    fireEvent.click(screen.getByRole('button', { name: '이전' })); fireEvent.click(screen.getByRole('button', { name: '이전' }));
    expect(screen.getByLabelText('제목 (필수)')).toHaveValue('출장 승인 요청'); expect(screen.getByLabelText('본문 (선택)')).toHaveValue('출장 일정과 예산을 확인해 주세요.');
  });
  it('요청 중 반복 제출과 모달 닫기를 즉시 막고 실패 후 잠금을 해제한다', async () => {
    let reject!: (error: Error) => void; mocks.createDraft.mockImplementation(() => new Promise((_resolve, failure) => { reject = failure; }));
    const { onClose } = renderDialog(); await reviewSingle();
    const submit = screen.getByRole('button', { name: '결재 상신' });
    act(() => { fireEvent.click(submit); fireEvent.submit(screen.getByRole('form', { name: '결재 기안 폼' })); });
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '상신 중…' })).toBeDisabled();
    const close = screen.getByRole('button', { name: '모달 닫기' }); expect(close).toBeDisabled(); fireEvent.click(close); expect(onClose).not.toHaveBeenCalled();
    await act(async () => reject(new Error('synthetic failure')));
    await waitFor(() => expect(close).toBeEnabled());
  });
  it('작성 중 닫기를 취소하면 입력을 보존한다', async () => {
    const { onClose } = renderDialog(); await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '작성 중 제목' } }); fireEvent.click(screen.getByRole('button', { name: '모달 닫기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled(); expect(screen.getByLabelText('제목 (필수)')).toHaveValue('작성 중 제목');
  });
  it('재상신은 기존 내용을 채우고 결재선을 재확인한 후 동일 id와 버전을 보낸다', async () => {
    renderDialog({ resubmission: { ifmlAtrzSn: 88, aplcntId: 'DRAFTER', taskSeCd: '01', docTtl: '반려된 문서', docCn: '이전 내용', version: 7, aprvYn: 'R', atrzCycl: 1, stages: [{ order: 1, kind: 'APPROVAL', status: 'REJECTED', approvers: [{ userId: 'BOSS', userNm: '김결재', status: 'REJECTED' }] }] } });
    await screen.findByRole('combobox', { name: '업무 구분' }); expect(screen.getByLabelText('제목 (필수)')).toHaveValue('반려된 문서');
    fireEvent.change(screen.getByLabelText('본문 (선택)'), { target: { value: '수정한 내용' } }); fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByText(/결재자와 순서를 다시 확인/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' })); fireEvent.click(screen.getByRole('button', { name: '새 차수로 재상신' }));
    await waitFor(() => expect(mocks.resubmit).toHaveBeenCalledWith(88, expect.objectContaining({ docCn: '수정한 내용', stages: [{ kind: 'APPROVAL', approverIds: ['BOSS'] }], version: 7 })));
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it('409 재상신은 입력을 보존하고 최신 상태 확인 후에만 최신 버전으로 재시도한다', async () => {
    const draft = { ifmlAtrzSn: 88, aplcntId: 'DRAFTER', taskSeCd: '01', docTtl: '기존 제목', docCn: '이전 내용', version: 7, aprvYn: 'W', atrzCycl: 1, stages: [{ order: 1, kind: 'APPROVAL' as const, status: 'CANCELLED' as const, approvers: [{ userId: 'BOSS', userNm: '김결재', status: 'CANCELLED' as const }] }] };
    mocks.resubmit.mockRejectedValueOnce({ response: { status: 409 } }); mocks.getDetail.mockResolvedValue({ ...draft, version: 8, docCn: '서버에서 수정한 내용', canResubmit: true });
    renderDialog({ resubmission: draft }); await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.change(screen.getByLabelText('본문 (선택)'), { target: { value: '내가 작성한 내용' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' })); fireEvent.click(screen.getByRole('button', { name: '다음' })); fireEvent.click(screen.getByRole('button', { name: '새 차수로 재상신' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('입력은 유지됩니다.'); expect(screen.getByRole('button', { name: '새 차수로 재상신' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '최신 문서 확인' }));
    await screen.findByText('서버에서 수정한 내용');
    expect(screen.getByText(/최신 문서를 불러왔습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' })); fireEvent.click(screen.getByRole('button', { name: '새 차수로 재상신' }));
    await waitFor(() => expect(mocks.resubmit).toHaveBeenLastCalledWith(88, expect.objectContaining({ version: 8, docCn: '내가 작성한 내용' })));
  });
});

/** 2026-10-03 결재 동선 개선 — 기안을 빠르게: 내가 썼던 결재선·최근 결재자·업무 양식·마지막 업무 구분·복제·사전 확인. */
describe('ApprovalDraftDialog 기안 보조', () => {
  const suggestionData = {
    lines: [{ taskSeCd: '01', taskSeNm: '일반', useCount: 3, lastReqYmd: '20260930', stages: [
      { kind: 'APPROVAL', approvers: [{ esntlId: 'BOSS', userNm: '김결재', eligible: true }] },
      { kind: 'AGREEMENT', approvers: [{ esntlId: 'PEER', userNm: '이합의', eligible: true }] },
    ] }],
    otherLines: [],
    recentApprovers: [
      { esntlId: 'FINAL', userNm: '박최종', eligible: true, absent: true },
      { esntlId: 'GONE', userNm: '퇴사자', eligible: false, ineligibleReason: 'INACTIVE' },
    ],
  };
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    auth.user.permissions = ['APPROVAL_CREATE'];
    mocks.listTemporaryDrafts.mockResolvedValue([]);
    mocks.confirm.mockResolvedValue(false);
    mocks.getTaskTypes.mockResolvedValue([{ dtlCd: '01', dtlCdNm: '일반', useYn: 'Y', dtlCdExpln: '목적:\n금액:' }, { dtlCd: '99', dtlCdNm: '폐기', useYn: 'N' }]);
    mocks.createDraft.mockResolvedValue(88);
    mocks.searchAssignableUsers.mockImplementation(searchPeople);
    mocks.getLineSuggestions.mockResolvedValue(suggestionData);
    mocks.checkApprovers.mockImplementation(async (ids: string[]) => ids.map(id => ({ esntlId: id, eligible: true, absent: id === 'FINAL' })));
  });

  it('내가 썼던 결재선을 가져오고 최근 결재자를 더해 상신하며, 부재 중인 결재자를 미리 알린다', async () => {
    renderDialog(); await fillContent();
    await waitFor(() => expect(mocks.getLineSuggestions).toHaveBeenCalledWith('01'));
    fireEvent.click(await screen.findByRole('button', { name: /일반 결재선 가져오기/ }));
    expect(screen.getByRole('list', { name: '2단계 결재자' })).toHaveTextContent('이합의');
    // [2026-10-03 F22] 지정할 수 없는 사유는 화면에 보인다(종전에는 aria-label 에만 있었다). 누를 수 없는 사람은 버튼이 아니다.
    expect(screen.getByText('· 지정할 수 없음(사용 중이 아닌 계정)')).toBeVisible();
    expect(screen.queryByRole('button', { name: /퇴사자/ })).not.toBeInTheDocument();
    // 이름에 부재 표시가 함께 실린다 — 종전 aria-label 은 '부재 중' 을 덮었다.
    fireEvent.click(screen.getByRole('button', { name: '박최종 부재 중 결재자로 더하기' }));
    expect(screen.getByRole('list', { name: '2단계 결재자' })).toHaveTextContent('박최종');

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(mocks.checkApprovers).toHaveBeenCalledWith(['BOSS', 'PEER', 'FINAL']));
    expect(await screen.findByText(/부재 중인 결재자가 있습니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({
      stages: [{ kind: 'APPROVAL', approverIds: ['BOSS'] }, { kind: 'AGREEMENT', approverIds: ['PEER', 'FINAL'] }],
    })));
  });

  it('결재자가 될 수 없는 사람이 있으면 이름과 사유를 밝히고 상신을 막는다', async () => {
    // 피커에서 고를 때는 결재자가 될 수 있었는데, 상신 직전에 권한이 회수된 경우다.
    mocks.checkApprovers.mockResolvedValueOnce([{ esntlId: 'BOSS', eligible: true }]).mockResolvedValue([{ esntlId: 'BOSS', userNm: '김결재', eligible: false, ineligibleReason: 'NO_PERMISSION' }]);
    renderDialog(); await reviewSingle();
    expect(await screen.findByText(/결재자로 지정할 수 없는 사람이 있습니다: 김결재\(결재 권한 없음\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 상신' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: '결재 기안 폼' }));
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });

  it('결재선을 고친 뒤 늦게 도착한 앞 사전 확인은 고친 결재선의 상신을 막지 않는다 (F7)', async () => {
    // 피커도 같은 확인을 부른다 — 최종 확인으로 넘어갈 때의 첫 사전 확인만 붙잡아 늦게 돌려준다.
    let holdNext = false;
    let resolveFirst!: (profiles: unknown) => void;
    mocks.checkApprovers.mockImplementation((ids: string[]) => {
      if (holdNext) { holdNext = false; return new Promise((resolve) => { resolveFirst = resolve; }); }
      return Promise.resolve(ids.map(id => ({ esntlId: id, eligible: true })));
    });
    renderDialog(); await fillContent(); await pick(1, '김결재');
    holdNext = true;
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(resolveFirst).toBeTypeOf('function'));

    // 확인을 기다리는 사이 이전으로 돌아가 김결재를 빼고 이합의를 넣는다.
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    fireEvent.click(screen.getByRole('button', { name: '김결재 결재선에서 제외' }));
    await pick(1, '이합의');
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(mocks.checkApprovers).toHaveBeenCalledWith(['PEER']));

    await act(async () => { resolveFirst([{ esntlId: 'BOSS', userNm: '김결재', eligible: false, ineligibleReason: 'NO_PERMISSION' }]); });
    expect(screen.queryByText(/결재자로 지정할 수 없는 사람이 있습니다/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 상신' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ stages: [{ kind: 'APPROVAL', approverIds: ['PEER'] }] })));
  });

  it('사전 확인이 실패해도 상신은 막지 않는다 — 서버가 상신 때 같은 규칙으로 다시 본다', async () => {
    mocks.checkApprovers.mockRejectedValue(new Error('network'));
    renderDialog(); await reviewSingle();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledTimes(1));
  });

  it('업무 구분의 본문 양식을 넣고, 상신하면 그 업무 구분을 다음 기안에 기억한다', async () => {
    const first = renderDialog();
    fireEvent.change(await screen.findByRole('combobox', { name: '업무 구분' }), { target: { value: '01' } });
    fireEvent.click(screen.getByRole('button', { name: '업무 양식 넣기' }));
    expect(screen.getByLabelText('본문 (선택)')).toHaveValue('목적:\n금액:');
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '양식 요청' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await pick(1, '김결재'); fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ taskSeCd: '01', docCn: '목적:\n금액:' })));
    first.unmount();

    renderDialog();
    expect(await screen.findByRole('combobox', { name: '업무 구분' })).toHaveValue('01');
  });

  it('기억한 업무 구분이 더는 쓰이지 않으면 고르지 않은 상태로 시작한다', async () => {
    window.localStorage.setItem('approval.lastTaskType.DRAFTER', '99');
    renderDialog();
    expect(await screen.findByRole('combobox', { name: '업무 구분' })).toHaveValue('');
  });

  it('복제해서 새로 기안하면 내용과 결재선을 가져오되 새 문서로 상신한다', async () => {
    const template = { ifmlAtrzSn: 5, taskSeCd: '01', aplcntId: 'DRAFTER', docTtl: '지난 출장', docCn: '지난 본문', version: 9,
      stages: [{ order: 1, kind: 'APPROVAL', status: 'APPROVED', approvers: [{ userId: 'BOSS', userNm: '김결재', status: 'APPROVED' }] }] };
    renderDialog({ template: template as never });
    expect(screen.getByRole('dialog', { name: '복제해서 새로 기안' })).toBeInTheDocument();
    expect(screen.getByLabelText('제목 (필수)')).toHaveValue('지난 출장');
    await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByText(/복제한 문서의 결재선입니다/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ docTtl: '지난 출장', stages: [{ kind: 'APPROVAL', approverIds: ['BOSS'] }] })));
    expect(mocks.resubmit).not.toHaveBeenCalled();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
/** 서버 오류 응답 — 409 는 상태가 같아도 코드(C013 버전 충돌·C014 상한)로 길이 갈린다. */
const serverError = (status: number, code: string, message = '서버 거절') => ({ response: { status, data: { success: false, code, message } } });

/** 2026-10-03 D3 — 기안 서버 임시저장: 저장·이어 쓰기·삭제·충돌. */
describe('ApprovalDraftDialog 기안 임시저장 (D3)', () => {
  const SUMMARY = { temporaryDraftSn: 7, taskSeCd: '01', taskSeNm: '일반', docTtl: '출장 준비', approverCount: 2, version: 3, mdfcnDt: '2026-10-03T09:30:00' };
  const DETAIL = { ...SUMMARY, docCn: '숙박 예산 확인', stages: [{ kind: 'APPROVAL', approvers: [
    { esntlId: 'BOSS', userNm: '김결재', deptNm: '기획팀', eligible: true },
    // 사용 중이 아닌 계정은 서버가 이름을 싣지 않는다 — 식별자를 이름 자리에 보이지 않는다.
    { esntlId: 'GONE', eligible: false, ineligibleReason: 'INACTIVE' },
  ] }] };
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    auth.user.permissions = ['APPROVAL_CREATE'];
    mocks.confirm.mockResolvedValue(false);
    mocks.getTaskTypes.mockResolvedValue([{ dtlCd: '01', dtlCdNm: '일반', useYn: 'Y' }]);
    mocks.createDraft.mockResolvedValue(88);
    mocks.searchAssignableUsers.mockImplementation(searchPeople);
    mocks.getLineSuggestions.mockResolvedValue({ lines: [], otherLines: [], recentApprovers: [] });
    mocks.checkApprovers.mockImplementation(async (ids: string[]) => ids.map(id => ({ esntlId: id, eligible: true })));
    mocks.listTemporaryDrafts.mockResolvedValue([]);
    mocks.createTemporaryDraft.mockResolvedValue({ temporaryDraftSn: 7, version: 0, mdfcnDt: '2026-10-03T14:05:12' });
    mocks.updateTemporaryDraft.mockResolvedValue({ temporaryDraftSn: 7, version: 1, mdfcnDt: '2026-10-03T14:06:40' });
    mocks.getTemporaryDraft.mockResolvedValue(DETAIL);
    mocks.deleteTemporaryDraft.mockResolvedValue(undefined);
  });

  it('기안 임시저장은 저장하는 동안 다시 누를 수 없고 입력을 잠그며, 실패하면 입력을 유지하고 사유를 보인다', async () => {
    // 지역 이름은 census 가 세는 write sink(saveTemporaryMutation.mutateAsync)와 같은 이름으로 둔다.
    const saveTemporaryMutation = mocks.createTemporaryDraft;
    const pending = deferred<unknown>();
    saveTemporaryMutation.mockReturnValueOnce(pending.promise);
    const { onClose } = renderDialog(); await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '쓰다 만 기안' } });
    const save = screen.getByRole('button', { name: '기안 임시저장' });

    act(() => { fireEvent.click(save); fireEvent.click(save); });

    await waitFor(() => expect(saveTemporaryMutation).toHaveBeenCalledTimes(1));
    expect(saveTemporaryMutation).toHaveBeenCalledWith({ taskSeCd: '', docTtl: '쓰다 만 기안', docCn: '', stages: [] });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('aria-busy', 'true');
    // 저장 중에 고친 내용이 저장된 것으로 표시되지 않도록 입력과 닫기를 잠근다.
    expect(screen.getByLabelText('제목 (필수)')).toBeDisabled();
    expect(screen.getByRole('button', { name: '모달 닫기' })).toBeDisabled();
    await act(async () => { pending.reject(new Error('잠시 후 다시 시도해 주세요.')); });

    expect(await screen.findByText('잠시 후 다시 시도해 주세요.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('잠시 후 다시 시도해 주세요.');
    expect(screen.getByLabelText('제목 (필수)')).toHaveValue('쓰다 만 기안');
    expect(save).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('결재자가 없는 단계는 빼고 저장하며 저장 전·후에 말하고, 다시 저장하면 받은 버전으로 같은 임시저장을 바꾼다', async () => {
    const { onClose } = renderDialog(); await fillContent();
    expect(screen.getByText('결재자가 없는 단계는 임시저장하지 않습니다.')).toBeInTheDocument();
    await pick(1, '김결재');
    expect(screen.queryByText('결재자가 없는 단계는 임시저장하지 않습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' }));
    expect(screen.getByText('결재자가 없는 단계는 임시저장하지 않습니다.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    await waitFor(() => expect(mocks.createTemporaryDraft).toHaveBeenCalledWith({
      taskSeCd: '01', docTtl: '출장 승인 요청', docCn: '출장 일정과 예산을 확인해 주세요.', stages: [{ kind: 'APPROVAL', approverIds: ['BOSS'] }],
    }));
    // 신청일(2026-09-16)은 오늘이 아니고 임시저장하지 않는다 — 그 사실을 함께 말한다.
    expect(await screen.findByText('임시저장했습니다 · 2026-10-03 14:05. 결재자가 없는 단계 1개는 저장하지 않았습니다. 신청일은 저장하지 않습니다 — 이어 쓰면 오늘 날짜로 시작합니다.')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('임시저장했습니다'), 'success');

    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '출장 승인 요청(수정)' } });
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    await waitFor(() => expect(mocks.updateTemporaryDraft).toHaveBeenCalledWith(7, expect.objectContaining({ docTtl: '출장 승인 요청(수정)', version: 0 })));
    expect(mocks.createTemporaryDraft).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/임시저장했습니다 · 2026-10-03 14:06/)).toBeInTheDocument();

    // 오늘이 아닌 신청일은 저장되지 않은 변경으로 남는다 — 저장한 뒤에도 닫을 때 묻는다(신청일이 오늘이면 묻지 않는 것은 위 증거 테스트가 본다).
    fireEvent.click(screen.getByRole('button', { name: '모달 닫기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('저장할 내용이 하나도 없으면 보내지 않고 그 사실을 말한다', async () => {
    renderDialog(); await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('저장할 내용이 없습니다.');
    expect(mocks.createTemporaryDraft).not.toHaveBeenCalled();
  });

  it('창을 열 때 이어 쓸지 묻지 않고, 목록에서 고르면 본문·결재선을 채우며 지금 지정할 수 없는 결재자를 사유와 함께 밝힌다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY, { temporaryDraftSn: 9, version: 0, approverCount: 0, mdfcnDt: '2026-10-02T18:00:00' }]);
    mocks.checkApprovers.mockImplementation(async (ids: string[]) => ids.map(id => ({ esntlId: id, eligible: id !== 'GONE', ineligibleReason: id === 'GONE' ? 'INACTIVE' : undefined })));
    renderDialog();
    expect(await screen.findByRole('heading', { name: '임시저장한 기안 (2/20)' })).toBeInTheDocument();
    expect(screen.getByText(/제목 없는 기안 · 결재자 0명 · 2026-10-02 18:00/)).toBeInTheDocument();
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.getTemporaryDraft).not.toHaveBeenCalled();
    expect(screen.getByLabelText('제목 (필수)')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: '‘출장 준비’ 이어 쓰기' }));
    await waitFor(() => expect(mocks.getTemporaryDraft).toHaveBeenCalledWith(7));
    await waitFor(() => expect(screen.getByLabelText('제목 (필수)')).toHaveValue('출장 준비'));
    expect(screen.getByLabelText('본문 (선택)')).toHaveValue('숙박 예산 확인');
    expect(screen.getByRole('combobox', { name: '업무 구분' })).toHaveValue('01');
    expect(screen.getByText(/결재자로 지정할 수 없는 사람이 있습니다: 알 수 없는 사용자\(사용 중이 아닌 계정\)/)).toBeInTheDocument();
    expect(screen.getByText('지금 이어 쓰는 중')).toBeInTheDocument();
    expect(mocks.confirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    const firstStage = screen.getByRole('list', { name: '1단계 결재자' });
    expect(firstStage).toHaveTextContent('김결재');
    expect(firstStage).toHaveTextContent('알 수 없는 사용자');
    expect(firstStage).not.toHaveTextContent('GONE');
    // 기존 사전 확인이 상신을 막는다.
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByText(/결재자로 지정할 수 없는 사람이 있습니다: 알 수 없는 사용자\(사용 중이 아닌 계정\)\. ‘이전’/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 상신' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    fireEvent.click(screen.getByRole('button', { name: '알 수 없는 사용자 결재선에서 제외' }));
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '결재 상신' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({ docTtl: '출장 준비', stages: [{ kind: 'APPROVAL', approverIds: ['BOSS'] }] }),
      { temporaryDraftSn: 7, version: 3 },
    ));
  });

  it('작성 중에 다른 임시저장을 이어 쓰려 하면 바꿀지 묻고, 계속 작성을 고르면 입력을 그대로 둔다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY]);
    renderDialog(); await screen.findByRole('heading', { name: '임시저장한 기안 (1/20)' });
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '지금 쓰는 기안' } });
    fireEvent.click(screen.getByRole('button', { name: '‘출장 준비’ 이어 쓰기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '임시저장으로 바꾸기', cancelText: '계속 작성' })));
    expect(mocks.getTemporaryDraft).not.toHaveBeenCalled();
    expect(screen.getByLabelText('제목 (필수)')).toHaveValue('지금 쓰는 기안');
  });

  it('임시저장 삭제는 확인 뒤 한 번만 지우고, 지우는 동안 다시 누를 수 없으며, 실패하면 사유를 보인다', async () => {
    // 지역 이름은 census 가 세는 write sink(deleteTemporaryMutation.mutateAsync)와 같은 이름으로 둔다.
    const deleteTemporaryMutation = mocks.deleteTemporaryDraft;
    const pending = deferred<void>();
    deleteTemporaryMutation.mockReturnValueOnce(pending.promise);
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY]);
    mocks.confirm.mockResolvedValue(true);
    renderDialog();
    const remove = await screen.findByRole('button', { name: '‘출장 준비’ 임시저장 삭제' });

    act(() => { fireEvent.click(remove); fireEvent.click(remove); });

    await waitFor(() => expect(deleteTemporaryMutation).toHaveBeenCalledTimes(1));
    expect(deleteTemporaryMutation).toHaveBeenCalledWith(7);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '임시저장 삭제', variant: 'destructive' }));
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.reject(new Error('임시저장을 지울 수 없습니다.')); });

    expect(await screen.findByRole('alert')).toHaveTextContent('임시저장을 지울 수 없습니다.');
    expect(remove).toBeEnabled();
  });

  it('삭제를 확인하지 않으면 지우지 않는다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY]);
    renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: '‘출장 준비’ 임시저장 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.deleteTemporaryDraft).not.toHaveBeenCalled();
  });

  it('이어 쓴 임시저장이 이미 상신·변경되어 상신이 409(C013)이면 갇히지 않고, 연결을 끊으면 새 문서로 상신한다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY]);
    mocks.getTemporaryDraft.mockResolvedValue({ ...DETAIL, stages: [{ kind: 'APPROVAL', approvers: [{ esntlId: 'BOSS', userNm: '김결재', eligible: true }] }] });
    mocks.createDraft.mockRejectedValueOnce(serverError(409, 'C013'));
    renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: '‘출장 준비’ 이어 쓰기' }));
    await waitFor(() => expect(screen.getByLabelText('제목 (필수)')).toHaveValue('출장 준비'));
    fireEvent.click(screen.getByRole('button', { name: '다음' })); fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(await screen.findByRole('button', { name: '결재 상신' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('이어 쓴 임시저장이 이미 상신되었거나 다른 곳에서 바뀌었습니다.');
    expect(screen.getByRole('button', { name: '결재 상신' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '기안 임시저장' })).toBeDisabled();
    // 편집해도 안내와 선택지는 남는다 — 사라지면 이유 없이 상신이 잠긴다.
    fireEvent.click(screen.getByRole('button', { name: '이전' }));
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' }));
    expect(screen.getByRole('alert')).toHaveTextContent('이어 쓴 임시저장이');
    fireEvent.click(screen.getByRole('button', { name: '2단계 삭제' }));

    fireEvent.click(screen.getByRole('button', { name: '연결을 끊고 계속 작성' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    fireEvent.click(await screen.findByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledTimes(2));
    expect(mocks.createDraft.mock.lastCall).toEqual([expect.objectContaining({ docTtl: '출장 준비' })]);
  });

  it('임시저장 없는 새 기안의 409 는 최신 문서 확인에 가두지 않고 다시 상신할 수 있다', async () => {
    mocks.createDraft.mockRejectedValueOnce(serverError(409, 'C008', '같은 요청이 이미 처리되었습니다.'));
    renderDialog(); await reviewSingle();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('같은 요청이 이미 처리되었습니다.');
    expect(screen.queryByRole('button', { name: '최신 문서 확인' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '결재 상신' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledTimes(2));
  });

  it('임시저장 상한(409 C014)은 지우라고 안내하고 버전 충돌로 다루지 않으며, 목록이 가득 차면 저장 버튼을 사유와 함께 막는다', async () => {
    mocks.createTemporaryDraft.mockRejectedValueOnce(serverError(409, 'C014'));
    const first = renderDialog(); await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '스무 번째 넘는 기안' } });
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('임시저장은 20건까지 둘 수 있습니다.');
    expect(alert).toHaveTextContent('쓰지 않는 임시저장을 지운 뒤');
    expect(alert).not.toHaveTextContent('다른 곳에서');
    expect(screen.queryByRole('button', { name: '연결을 끊고 계속 작성' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '기안 임시저장' })).toBeEnabled();
    first.unmount();

    mocks.listTemporaryDrafts.mockResolvedValue(Array.from({ length: 20 }, (_, index) => ({ ...SUMMARY, temporaryDraftSn: index + 1, docTtl: `기안 ${index + 1}` })));
    renderDialog();
    expect(await screen.findByRole('heading', { name: '임시저장한 기안 (20/20)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '기안 임시저장' })).toBeDisabled();
    expect(screen.getByText(/임시저장은 20건까지 둘 수 있습니다\. .*지워야 새로 저장할 수 있습니다\./)).toBeInTheDocument();
  });

  it('다시 저장이 409(C013)이면 덮어쓰지 않고, 최신 임시저장을 불러온 뒤 그 버전으로 저장한다', async () => {
    mocks.updateTemporaryDraft.mockRejectedValueOnce(serverError(409, 'C013'));
    mocks.getTemporaryDraft.mockResolvedValue({ ...DETAIL, version: 5, docTtl: '다른 곳에서 고친 제목', stages: [] });
    mocks.confirm.mockResolvedValue(true);
    renderDialog(); await screen.findByRole('combobox', { name: '업무 구분' });
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '처음 제목' } });
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    await waitFor(() => expect(mocks.createTemporaryDraft).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByLabelText('제목 (필수)')).toBeEnabled());
    fireEvent.change(screen.getByLabelText('제목 (필수)'), { target: { value: '고친 제목' } });
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('다른 곳에서 이 임시저장을 고쳤습니다.');
    expect(screen.getByRole('button', { name: '기안 임시저장' })).toBeDisabled();
    expect(screen.getByLabelText('제목 (필수)')).toHaveValue('고친 제목');

    fireEvent.click(screen.getByRole('button', { name: '최신 임시저장 불러오기' }));
    await waitFor(() => expect(screen.getByLabelText('제목 (필수)')).toHaveValue('다른 곳에서 고친 제목'));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '최신 내용으로 바꾸기' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    await waitFor(() => expect(mocks.updateTemporaryDraft).toHaveBeenLastCalledWith(7, expect.objectContaining({ version: 5 })));
  });

  it('임시저장 목록을 못 읽으면 경고로 끼어들지 않고 상태로 알리며 다시 불러온다', async () => {
    mocks.listTemporaryDrafts.mockRejectedValueOnce(new Error('network'));
    renderDialog();
    expect(await screen.findByText(/임시저장한 기안을 불러오지 못했습니다\./)).toBeInTheDocument();
    expect(screen.getByText(/임시저장한 기안을 불러오지 못했습니다\./).closest('[role="status"]')).not.toBeNull();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY]);
    fireEvent.click(screen.getByRole('button', { name: '임시저장 목록 다시 불러오기' }));
    expect(await screen.findByRole('heading', { name: '임시저장한 기안 (1/20)' })).toBeInTheDocument();
  });

  it('기억해 둔 업무 구분만으로는 저장할 내용으로 보지 않는다 — 빈 임시저장이 상한을 차지하지 않고, 직접 고르면 저장한다', async () => {
    mocks.getTaskTypes.mockResolvedValue([{ dtlCd: '01', dtlCdNm: '일반', useYn: 'Y' }, { dtlCd: '02', dtlCdNm: '출장', useYn: 'Y' }]);
    window.localStorage.setItem('approval.lastTaskType.DRAFTER', '01');
    renderDialog();
    await waitFor(() => expect(screen.getByRole('combobox', { name: '업무 구분' })).toHaveValue('01'));
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('저장할 내용이 없습니다.');
    expect(mocks.createTemporaryDraft).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', { name: '업무 구분' }), { target: { value: '02' } });
    fireEvent.click(screen.getByRole('button', { name: '기안 임시저장' }));
    await waitFor(() => expect(mocks.createTemporaryDraft).toHaveBeenCalledWith(expect.objectContaining({ taskSeCd: '02' })));
  });

  it('복제 기안 창에도 임시저장 목록이 있고, 이어 쓰면 복제한 내용을 바꾸기 전에 묻는다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY]);
    renderDialog({ template: { ifmlAtrzSn: 50, aplcntId: 'DRAFTER', taskSeCd: '01', docTtl: '복제한 기안', docCn: '복제 본문', stages: [] } });
    expect(await screen.findByRole('heading', { name: '임시저장한 기안 (1/20)' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '‘출장 준비’ 이어 쓰기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ confirmText: '임시저장으로 바꾸기' })));
    expect(mocks.getTemporaryDraft).not.toHaveBeenCalled();
    expect(screen.getByLabelText('제목 (필수)')).toHaveValue('복제한 기안');
  });

  it('삭제가 실패하면(다른 곳에서 이미 상신·삭제) 사유를 말하고 목록을 다시 읽어 사라진 행을 남기지 않는다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValueOnce([SUMMARY]).mockResolvedValue([]);
    mocks.deleteTemporaryDraft.mockRejectedValueOnce(serverError(404, 'C006', '대상을 찾을 수 없습니다.'));
    mocks.confirm.mockResolvedValue(true);
    renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: '‘출장 준비’ 임시저장 삭제' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('임시저장을 찾을 수 없습니다.');
    await waitFor(() => expect(screen.queryByRole('button', { name: '‘출장 준비’ 임시저장 삭제' })).not.toBeInTheDocument());
    expect(mocks.listTemporaryDrafts.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('복제 창에서 임시저장을 이어 쓰면 더는 복제한 문서라고 말하지 않는다 — 창 제목과 결재선 안내가 바뀐다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValue([SUMMARY]);
    mocks.confirm.mockResolvedValue(true);
    mocks.getTemporaryDraft.mockResolvedValue({ ...DETAIL, stages: [{ kind: 'APPROVAL', approvers: [{ esntlId: 'BOSS', userNm: '김결재', eligible: true }] }] });
    renderDialog({ template: { ifmlAtrzSn: 50, aplcntId: 'DRAFTER', taskSeCd: '01', docTtl: '복제한 기안', docCn: '복제 본문', stages: [] } });
    expect(await screen.findByRole('dialog', { name: '복제해서 새로 기안' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '‘출장 준비’ 이어 쓰기' }));
    await waitFor(() => expect(screen.getByLabelText('제목 (필수)')).toHaveValue('출장 준비'));

    expect(screen.getByRole('dialog', { name: '새 결재 기안' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(await screen.findByRole('button', { name: /1단계 결재자/ })).toBeInTheDocument();
    expect(screen.queryByText('복제한 문서의 결재선입니다. 결재자와 순서를 다시 확인해 주세요.')).not.toBeInTheDocument();
  });

  it('제목이 같은 임시저장은 이어 쓰기·삭제 버튼과 삭제 확인에 저장 시각을 붙여 가른다', async () => {
    mocks.listTemporaryDrafts.mockResolvedValue([
      { temporaryDraftSn: 11, docTtl: '', approverCount: 1, version: 0, mdfcnDt: '2026-10-03T09:30:00' },
      { temporaryDraftSn: 12, docTtl: '  ', approverCount: 0, version: 0, mdfcnDt: '2026-10-02T18:00:00' },
      SUMMARY,
    ]);
    renderDialog();
    expect(await screen.findByRole('button', { name: '‘제목 없는 기안 · 2026-10-03 09:30’ 이어 쓰기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '‘제목 없는 기안 · 2026-10-02 18:00’ 이어 쓰기' })).toBeInTheDocument();
    // 제목이 하나뿐인 임시저장은 종전처럼 제목만 쓴다.
    expect(screen.getByRole('button', { name: '‘출장 준비’ 이어 쓰기' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '‘제목 없는 기안 · 2026-10-02 18:00’ 임시저장 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('‘제목 없는 기안 · 2026-10-02 18:00’ 임시저장을 지웁니다.'),
    })));
  });

  it('최종 확인은 신청일도 보인다 — 임시저장이 신청일을 저장하지 않으므로 상신 전에 다시 볼 수 있어야 한다', async () => {
    renderDialog(); await fillContent(); await pick(1, '김결재');
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    const summary = await screen.findByText('신청일');
    expect(summary.closest('div')).toHaveTextContent('2026-09-16');
  });

  it('재상신과 기안 권한이 없는 사람에게는 임시저장을 보이지 않고 목록도 읽지 않는다', async () => {
    renderDialog({ resubmission: { ifmlAtrzSn: 88, aplcntId: 'DRAFTER', taskSeCd: '01', docTtl: '반려된 문서', version: 7, stages: [] } });
    await screen.findByRole('combobox', { name: '업무 구분' });
    expect(screen.queryByRole('button', { name: '기안 임시저장' })).not.toBeInTheDocument();
    expect(mocks.listTemporaryDrafts).not.toHaveBeenCalled();
    cleanup();

    auth.user.permissions = [];
    renderDialog(); await screen.findByRole('combobox', { name: '업무 구분' });
    expect(screen.queryByRole('button', { name: '기안 임시저장' })).not.toBeInTheDocument();
    expect(mocks.listTemporaryDrafts).not.toHaveBeenCalled();
  });
});
