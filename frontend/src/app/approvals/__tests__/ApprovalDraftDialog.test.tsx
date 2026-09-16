import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createDraft: vi.fn(), resubmit: vi.fn(), getDetail: vi.fn(), getTaskTypes: vi.fn(), toast: vi.fn(), confirm: vi.fn() }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { esntlId: 'DRAFTER' } }) }));
vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({ approvalUserService: mocks }));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children, closeDisabled, onClose }: { isOpen: boolean; title: string; children: React.ReactNode; closeDisabled?: boolean; onClose: () => void }) => isOpen ? <div role="dialog" aria-label={title}><button disabled={closeDisabled} onClick={onClose}>모달 닫기</button>{children}</div> : null,
}));
vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect, onClose }: { isOpen: boolean; onSelect: (user: { esntlId: string; userNm: string }) => void; onClose: () => void }) => isOpen ? <div aria-label="사용자 선택">
    {[['BOSS', '김결재'], ['PEER', '이합의'], ['FINAL', '박최종'], ['DRAFTER', '나']].map(([esntlId, userNm]) => <button key={esntlId} type="button" onClick={() => { onSelect({ esntlId, userNm }); onClose(); }}>피커에서 {userNm} 선택</button>)}
  </div> : null,
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
function pick(stage: number, name: string, adding = false) {
  fireEvent.click(screen.getByRole('button', { name: `${stage}단계 결재자 ${adding ? '추가' : '선택'}` }));
  fireEvent.click(screen.getByRole('button', { name: `피커에서 ${name} 선택` }));
}
async function reviewSingle() { await fillContent(); pick(1, '김결재'); fireEvent.click(screen.getByRole('button', { name: '다음' })); }

describe('ApprovalDraftDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(false);
    mocks.getTaskTypes.mockResolvedValue([{ dtlCd: '01', dtlCdNm: '일반', useYn: 'Y' }, { dtlCd: '99', dtlCdNm: '폐기', useYn: 'N' }]);
    mocks.createDraft.mockResolvedValue(88); mocks.resubmit.mockResolvedValue(88);
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
    pick(1, '김결재'); fireEvent.click(screen.getByRole('button', { name: '다음' }));
    expect(screen.getByLabelText('상신 결재선 미리보기')).toHaveTextContent('전원 승인 (1명)');
    expect(screen.getByText(/누구든 한 명이 반려하면 문서 전체가 반려/)).toBeInTheDocument();
    expect(mocks.createDraft).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith({ taskSeCd: '01', docTtl: '출장 승인 요청', docCn: '출장 일정과 예산을 확인해 주세요.', reqYmd: '20260916', stages: [{ kind: 'APPROVAL', approverIds: ['BOSS'] }] }));
    expect(onCreated).toHaveBeenCalledWith(88); expect(onClose).toHaveBeenCalled();
  });
  it('순차 단계 안의 여러 명과 합의 전원 동의를 미리보기와 요청에 보존한다', async () => {
    renderDialog(); await fillContent(); pick(1, '김결재'); pick(1, '이합의', true);
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' })); pick(2, '박최종');
    const kinds = screen.getAllByLabelText('단계 유형'); fireEvent.change(kinds[1], { target: { value: 'AGREEMENT' } });
    fireEvent.click(screen.getByRole('button', { name: '다음' }));
    const preview = screen.getByLabelText('상신 결재선 미리보기');
    expect(preview).toHaveTextContent('1단계 · 결재 · 전원 승인 (2명)');
    expect(preview).toHaveTextContent('2단계 · 합의 · 전원 동의 (1명)');
    fireEvent.click(screen.getByRole('button', { name: '결재 상신' }));
    await waitFor(() => expect(mocks.createDraft).toHaveBeenCalledWith(expect.objectContaining({ stages: [{ kind: 'APPROVAL', approverIds: ['BOSS', 'PEER'] }, { kind: 'AGREEMENT', approverIds: ['FINAL'] }] })));
  });
  it('중복 사용자와 자기 결재를 추가하지 않고 이유를 알린다', async () => {
    renderDialog(); await fillContent(); pick(1, '김결재'); pick(1, '김결재', true);
    expect(screen.getByRole('status')).toHaveTextContent('이미 결재선에 지정된 사람입니다.');
    expect(within(screen.getByLabelText('1단계 결재자')).getAllByRole('listitem')).toHaveLength(1);
    pick(1, '나', true);
    expect(screen.getByRole('status')).toHaveTextContent('자신을 결재자로 지정할 수 없습니다.');
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' })); pick(2, '김결재');
    expect(screen.getByRole('status')).toHaveTextContent('이미 결재선에 지정된 사람입니다.');
    expect(mocks.createDraft).not.toHaveBeenCalled();
  });
  it('키보드로 단계 순서를 바꾸고 이동한 카드에 초점을 유지한다', async () => {
    const user = userEvent.setup(); renderDialog(); await fillContent(); pick(1, '김결재');
    fireEvent.click(screen.getByRole('button', { name: '다음 단계 추가' })); pick(2, '이합의');
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
