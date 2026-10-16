import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listSavedLines: vi.fn(), getSavedLine: vi.fn(), createSavedLine: vi.fn(), updateSavedLine: vi.fn(), deleteSavedLine: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({ approvalUserService: mocks }));
import { ApprovalSavedLinesPanel, SAVED_LINE_LIMIT } from '../ApprovalSavedLinesPanel';

type Stage = { kind: 'APPROVAL' | 'AGREEMENT'; approverIds: string[] };
const TWO_STAGES: Stage[] = [{ kind: 'AGREEMENT', approverIds: ['BOSS', 'PEER'] }, { kind: 'APPROVAL', approverIds: ['FINAL'] }];

function renderPanel(stages: Stage[] = TWO_STAGES) {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } });
  const onApply = vi.fn(); const onNotice = vi.fn(); const onEmptyStages = vi.fn();
  render(<QueryClientProvider client={queryClient}>
    <ApprovalSavedLinesPanel stages={stages} disabled={false} onApply={onApply} onNotice={onNotice} onEmptyStages={onEmptyStages} />
  </QueryClientProvider>);
  return { onApply, onNotice, onEmptyStages };
}
function conflict(code: string, status = 409) {
  return Object.assign(new Error(`synthetic ${code}`), { response: { status, data: { code } } });
}
const summary = (savedLineSn: number, aplnNm: string) => ({ savedLineSn, aplnNm, stageCount: 2, approverCount: 3, mdfcnDt: '2026-10-16T09:30:00' });

async function openSave(name: string) {
  fireEvent.click(screen.getByRole('button', { name: '이 결재선 저장' }));
  fireEvent.change(await screen.findByLabelText('결재선 이름'), { target: { value: name } });
}

describe('ApprovalSavedLinesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSavedLines.mockResolvedValue([summary(1, '팀장 결재'), summary(2, '부서 합의')]);
    mocks.createSavedLine.mockResolvedValue(summary(3, '새 결재선'));
    mocks.updateSavedLine.mockResolvedValue(summary(1, '팀장 결재'));
    mocks.deleteSavedLine.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('나의 결재선을 펼치면 이름·단계·결재자 수를 보이고, 가져오면 지금 자격으로 다시 읽은 결재선을 넘긴다', async () => {
    const { onApply } = renderPanel();
    // 첫 시험은 모듈을 처음 읽는 시간까지 기다린다(병렬 실행에서 1초를 넘긴 적이 있다).
    const toggle = await screen.findByRole('button', { name: `나의 결재선 (2/${SAVED_LINE_LIMIT})` }, { timeout: 5000 });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('list', { name: '나의 결재선 목록' })).toHaveTextContent('팀장 결재 · 2단계 · 결재자 3명');
    const loaded = { savedLineSn: 1, aplnNm: '팀장 결재', droppedApproverCount: 1, droppedStageCount: 0,
      stages: [{ kind: 'APPROVAL', approvers: [{ esntlId: 'BOSS', userNm: '김결재', eligible: true }] }] };
    mocks.getSavedLine.mockResolvedValue(loaded);
    fireEvent.click(screen.getByRole('button', { name: '‘팀장 결재’ 결재선 가져오기' }));
    await waitFor(() => expect(onApply).toHaveBeenCalledWith(loaded));
    expect(mocks.getSavedLine).toHaveBeenCalledWith(1);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('가져온 결재선에 지금 지정할 수 있는 사람이 없으면 넣지 않고 빠진 사람 수를 말한다', async () => {
    const { onApply, onNotice } = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /^나의 결재선/ }));
    mocks.getSavedLine.mockResolvedValue({ savedLineSn: 2, aplnNm: '부서 합의', droppedApproverCount: 2, droppedStageCount: 1, stages: [] });
    fireEvent.click(await screen.findByRole('button', { name: '‘부서 합의’ 결재선 가져오기' }));
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith(expect.stringContaining('지정할 수 있는 사람이 없어 가져오지 않았습니다')));
    expect(onNotice).toHaveBeenCalledWith(expect.stringContaining('2명이 빠졌습니다'));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('지운 결재선을 가져오려 하면 404 를 말하고 목록을 다시 읽는다', async () => {
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /^나의 결재선/ }));
    mocks.getSavedLine.mockRejectedValue(conflict('C007', 404));
    fireEvent.click(await screen.findByRole('button', { name: '‘팀장 결재’ 결재선 가져오기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('‘팀장 결재’ 결재선을 찾을 수 없습니다');
    await waitFor(() => expect(mocks.listSavedLines).toHaveBeenCalledTimes(2));
  });

  it('이름이 비면 저장하지 않고 이름 칸의 오류로 알린다', async () => {
    renderPanel(); await openSave('   ');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('결재선 이름을 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByLabelText('결재선 이름')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.createSavedLine).not.toHaveBeenCalled();
  });

  it('편집기의 단계를 그대로 저장한다', async () => {
    const { onNotice, onEmptyStages } = renderPanel();
    await screen.findByRole('button', { name: /^나의 결재선 \(2/ });
    await openSave('  새 결재선 ');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.createSavedLine).toHaveBeenCalledWith({ aplnNm: '새 결재선', stages: TWO_STAGES }));
    expect(mocks.updateSavedLine).not.toHaveBeenCalled();
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith('‘새 결재선’ 결재선을 저장했습니다.'));
    expect(onEmptyStages).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('결재선 이름')).not.toBeInTheDocument();
  });

  it('결재자가 없는 단계가 하나라도 있으면 저장하지 않고 편집기의 단계 순서를 넘긴다 — 빼고 보내면 서버가 매기는 단계 번호가 어긋난다', async () => {
    // 1단계가 비고 2단계에 자격 없는 사람이 있으면, 빼고 보낸 종전 동작은 서버가 '1단계' 라고 답해 엉뚱한 단계를 가리켰다.
    const { onEmptyStages, onNotice } = renderPanel([
      { kind: 'APPROVAL', approverIds: [] }, { kind: 'APPROVAL', approverIds: ['RETIRED'] }, { kind: 'AGREEMENT', approverIds: [] },
    ]);
    await openSave('가운데 빈 결재선');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(onEmptyStages).toHaveBeenCalledWith([0, 2]));
    expect(mocks.createSavedLine).not.toHaveBeenCalled();
    expect(mocks.updateSavedLine).not.toHaveBeenCalled();
    expect(onNotice).not.toHaveBeenCalled();
    // 이름은 맞으므로 이름 칸은 오류가 아니고, 저장 칸은 열린 채 이름을 지킨다.
    expect(screen.getByLabelText('결재선 이름')).toHaveValue('가운데 빈 결재선');
    expect(screen.getByLabelText('결재선 이름')).not.toHaveAttribute('aria-invalid');
  });

  it('단계가 하나도 없으면 저장하지 않는다', async () => {
    renderPanel([]); await openSave('빈 결재선');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    // 이름 칸 아래와 오류 요약에 함께 보인다.
    expect(await screen.findAllByText(/결재자를 지정한 단계가 없어 저장할 수 없습니다/)).not.toHaveLength(0);
    expect(screen.getByLabelText('결재선 이름')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.createSavedLine).not.toHaveBeenCalled();
  });

  it('같은 이름이 있으면 바꿀지 묻고, 바꾸기를 고르면 그 결재선을 지금 결재선으로 바꾼다', async () => {
    const { onNotice } = renderPanel();
    await screen.findByRole('button', { name: /^나의 결재선 \(2/ });
    await openSave('팀장 결재');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.updateSavedLine).toHaveBeenCalledWith(1, { aplnNm: '팀장 결재', stages: TWO_STAGES }));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '나의 결재선 바꾸기' }));
    expect(mocks.createSavedLine).not.toHaveBeenCalled();
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith('‘팀장 결재’ 결재선을 지금 결재선으로 바꿨습니다.'));
  });

  it('같은 이름 바꾸기를 거절하면 아무것도 보내지 않는다', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderPanel(); await screen.findByRole('button', { name: /^나의 결재선 \(2/ });
    await openSave('팀장 결재');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.updateSavedLine).not.toHaveBeenCalled();
    expect(mocks.createSavedLine).not.toHaveBeenCalled();
  });

  it(`${SAVED_LINE_LIMIT}개가 차면 새 이름으로는 보내지 않고 지우라고 안내한다`, async () => {
    mocks.listSavedLines.mockResolvedValue(Array.from({ length: SAVED_LINE_LIMIT }, (_, index) => summary(index + 1, `결재선 ${index + 1}`)));
    renderPanel(); await screen.findByRole('button', { name: `나의 결재선 (${SAVED_LINE_LIMIT}/${SAVED_LINE_LIMIT})` });
    await openSave('스물한째');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${SAVED_LINE_LIMIT}개까지 저장할 수 있습니다`);
    expect(mocks.createSavedLine).not.toHaveBeenCalled();
  });

  it('서버가 상한(C014)·자격 거부(400)를 말하면 그 사유를 보이고 입력을 남긴다', async () => {
    renderPanel(); await screen.findByRole('button', { name: /^나의 결재선 \(2/ });
    mocks.createSavedLine.mockRejectedValueOnce(conflict('C014'));
    await openSave('경쟁');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(`${SAVED_LINE_LIMIT}개까지`);
    mocks.createSavedLine.mockRejectedValueOnce(Object.assign(new Error('bad'), {
      response: { status: 400, data: { code: 'C001', message: '2단계에 결재자로 지정할 수 없는 사람이 있어 저장하지 않았습니다.' } },
    }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('2단계에 결재자로 지정할 수 없는 사람이 있어 저장하지 않았습니다.'));
    expect(screen.getByLabelText('결재선 이름')).toHaveValue('경쟁');
  });

  it('저장을 연달아 눌러도 한 번만 보낸다', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mocks.createSavedLine.mockReturnValue(new Promise(done => { resolve = done; }));
    renderPanel(); await screen.findByRole('button', { name: /^나의 결재선 \(2/ });
    await openSave('한 번만');
    const save = screen.getByRole('button', { name: '저장' });
    fireEvent.click(save); fireEvent.click(save); fireEvent.click(save);
    await waitFor(() => expect(mocks.createSavedLine).toHaveBeenCalledTimes(1));
    resolve(summary(9, '한 번만'));
    await waitFor(() => expect(screen.queryByLabelText('결재선 이름')).not.toBeInTheDocument());
  });

  it('지우기는 확인을 받고 한 번만 지운다 — 거절하면 지우지 않는다', async () => {
    const { onNotice } = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /^나의 결재선/ }));
    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(await screen.findByRole('button', { name: '‘부서 합의’ 결재선 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: '나의 결재선 삭제' })));
    expect(mocks.deleteSavedLine).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '‘부서 합의’ 결재선 삭제' }));
    await waitFor(() => expect(mocks.deleteSavedLine).toHaveBeenCalledWith(2));
    expect(mocks.deleteSavedLine).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith('‘부서 합의’ 결재선을 지웠습니다.'));
  });

  it('결재선 삭제는 한 번만 보내고, 지우는 동안 다시 누를 수 없으며, 실패하면 사유를 보인다', async () => {
    // 지역 이름은 census 가 세는 write sink(deleteMutation.mutateAsync)와 같은 이름으로 둔다.
    const deleteMutation = mocks.deleteSavedLine;
    let rejectWrite: (error: unknown) => void = () => undefined;
    deleteMutation.mockReturnValueOnce(new Promise((_, reject) => { rejectWrite = reject; }));
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /^나의 결재선/ }));
    const remove = await screen.findByRole('button', { name: '‘팀장 결재’ 결재선 삭제' });

    act(() => { fireEvent.click(remove); fireEvent.click(remove); });

    await waitFor(() => expect(deleteMutation).toHaveBeenCalledTimes(1));
    expect(deleteMutation).toHaveBeenCalledWith(1);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(remove).toBeDisabled());
    expect(remove).toHaveAttribute('aria-busy', 'true');
    await act(async () => { rejectWrite(new Error('결재선을 지울 수 없습니다.')); });

    expect(await screen.findByRole('alert')).toHaveTextContent('결재선을 지울 수 없습니다.');
    await waitFor(() => expect(remove).toBeEnabled());
  });

  it('목록을 못 읽은 것을 저장한 결재선이 없는 것으로 보이지 않는다', async () => {
    mocks.listSavedLines.mockRejectedValue(new Error('synthetic network failure'));
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: /^나의 결재선/ }));
    expect(await screen.findByText('나의 결재선을 불러오지 못했습니다. 결재선은 그대로 지정할 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByText(/저장한 결재선이 없습니다/)).not.toBeInTheDocument();
  });
});
