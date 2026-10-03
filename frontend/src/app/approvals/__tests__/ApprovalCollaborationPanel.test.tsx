import { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  remind: vi.fn(),
  replaceApprover: vi.fn(),
  answerSupplement: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/business/user/approval/ApprovalUserService', () => ({ approvalUserService: mocks }));
vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (user: { esntlId: string; userNm: string }) => void }) => (
    isOpen ? <button type="button" onClick={() => onSelect({ esntlId: 'NEW', userNm: '새결재자' })}>새결재자 고르기</button> : null
  ),
}));

import { ApprovalCollaborationPanel } from '../ApprovalCollaborationPanel';
import type { InformalSanctionDto } from '@/services/business/user/approval/ApprovalUserService';

const base: InformalSanctionDto = {
  ifmlAtrzSn: 7,
  taskSeCd: '01',
  aplcntId: 'owner',
  docTtl: '출장 신청',
  docCn: '원래 본문',
  version: 3,
  aprvYn: 'A',
  stages: [{
    order: 1,
    kind: 'APPROVAL',
    status: 'ACTIVE',
    approvers: [{ userId: 'boss', userNm: '부장', status: 'ACTIVE', absent: true }],
  }],
} as InformalSanctionDto;

function renderPanel(document: Partial<InformalSanctionDto>, canWrite = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApprovalCollaborationPanel document={{ ...base, ...document } as InformalSanctionDto} canWrite={canWrite} disabled={false} />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => { resolve = next; reject = fail; });
  return { promise, resolve, reject };
}

describe('ApprovalCollaborationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.remind.mockResolvedValue(1);
    mocks.replaceApprover.mockResolvedValue(undefined);
    mocks.answerSupplement.mockResolvedValue(undefined);
  });

  it('보완 답변은 비어 있으면 보내지 않고, 본문을 고치면 고친 본문을 함께 보낸다', async () => {
    renderPanel({ canAnswerSupplement: true, openSupplement: { askedBy: 'boss', askedByNm: '부장', question: '금액을 적어 주세요' } });
    expect(screen.getByText('금액을 적어 주세요')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '보완 답변 보내기' }));
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('보완 답변을 입력해 주세요.');
    expect(mocks.answerSupplement).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox', { name: /보완 답변/ }), { target: { value: '45만 원입니다' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '본문도 고치기' }));
    fireEvent.change(screen.getByRole('textbox', { name: /고친 본문/ }), { target: { value: '원래 본문\n교육비 45만 원' } });
    fireEvent.click(screen.getByRole('button', { name: '보완 답변 보내기' }));

    await waitFor(() => expect(mocks.answerSupplement).toHaveBeenCalledWith(7, { answer: '45만 원입니다', docCn: '원래 본문\n교육비 45만 원', version: 3 }));
    expect(mocks.toast).toHaveBeenCalledWith('보완 답변과 고친 본문을 보냈습니다. 앞서 한 승인은 유지됩니다.', 'success');
  });

  it('보완 답변은 보내는 동안 다시 보낼 수 없고, 실패하면 사유를 보이며 입력을 남긴다', async () => {
    const pending = deferred<void>();
    mocks.answerSupplement.mockReturnValueOnce(pending.promise);
    renderPanel({ canAnswerSupplement: true, openSupplement: { askedBy: 'boss', question: '금액?' } });
    fireEvent.change(screen.getByRole('textbox', { name: /보완 답변/ }), { target: { value: '답' } });
    const submit = screen.getByRole('button', { name: '보완 답변 보내기' });
    act(() => { fireEvent.click(submit); fireEvent.click(submit); });

    await waitFor(() => expect(mocks.answerSupplement).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: '보내는 중…' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.reject(new Error('서버 장애')); });

    expect(await screen.findByText('서버 장애 입력한 답변은 유지됩니다.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /보완 답변/ })).toHaveValue('답');
    expect(mocks.toast).toHaveBeenCalledWith('보완 답변을 보내지 못했습니다.', 'error');
  });

  it('재알림은 하루 한 번이다 — 오늘 이미 보냈으면 버튼이 그 사실을 말하고 막힌다', async () => {
    const { unmount } = renderPanel({ canRemind: true });
    fireEvent.click(screen.getByRole('button', { name: '차례인 결재자에게 재알림' }));
    await waitFor(() => expect(mocks.remind).toHaveBeenCalledWith(7));
    expect(mocks.toast).toHaveBeenCalledWith('지금 차례인 1명에게 다시 알렸습니다.', 'success');
    unmount();

    // [2026-10-03 F13·F15] 서버는 오늘 보냈으면 canRemind 를 끄고 remindedToday 를 켠다(InformalSanctionService:
    //   canRemind = drafter && !remindedToday). 종전 fixture(canRemind:true + remindedToday:true)는 서버가 보낼 수 없는
    //   조합이라, 실제 조합에서 버튼과 안내가 통째로 사라지는 결함을 가렸다.
    renderPanel({ canRemind: false, remindedToday: true });
    const reminded = screen.getByRole('button', { name: '오늘 재알림함' });
    expect(reminded).toHaveAttribute('aria-disabled', 'true');
    expect(reminded).toHaveAccessibleDescription(/오늘 이미 재알림을 보냈습니다.*내일 다시 보낼 수 있습니다/);
    expect(screen.getByText(/오늘 이미 재알림을 보냈습니다/)).toBeVisible();
    fireEvent.click(reminded);
    expect(mocks.remind).toHaveBeenCalledTimes(1);
  });

  it('아직 처리하지 않은 결재자를 바꾸면 확인 뒤 버전과 함께 보낸다 — 부재 중인 사람이 표시된다', async () => {
    renderPanel({ canReplaceApprover: true });
    expect(screen.getByText('부재 중')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '부장 결재자 바꾸기' }));
    fireEvent.click(screen.getByRole('button', { name: '새결재자 고르기' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '결재자 바꾸기' })));
    await waitFor(() => expect(mocks.replaceApprover).toHaveBeenCalledWith(7, 'boss', 'NEW', 3));
  });

  it('아직 차례가 아닌 결재자를 바꾸면 새 결재자에게는 차례가 되면 알린다고 말한다 — 두 사람 모두에게 바로 알린다고 하지 않는다 (F16)', async () => {
    // 서버 replaceApprover 는 빠지는 사람에게는 늘, 새 결재자에게는 바꾼 자리가 ACTIVE 일 때만 바로 알린다.
    renderPanel({ canReplaceApprover: true, stages: [
      { order: 1, kind: 'APPROVAL', status: 'ACTIVE', approvers: [{ userId: 'boss', userNm: '부장', status: 'ACTIVE' }] },
      { order: 2, kind: 'APPROVAL', status: 'WAITING', approvers: [{ userId: 'chief', userNm: '본부장', status: 'WAITING' }] },
    ] });
    fireEvent.click(screen.getByRole('button', { name: '본부장 결재자 바꾸기' }));
    fireEvent.click(screen.getByRole('button', { name: '새결재자 고르기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    const waitingMessage = mocks.confirm.mock.calls[0][0].message as string;
    expect(waitingMessage).not.toContain('두 사람 모두에게');
    expect(waitingMessage).toContain('새결재자에게는 그 단계 차례가 되면 알립니다');
    await waitFor(() => expect(mocks.replaceApprover).toHaveBeenCalledWith(7, 'chief', 'NEW', 3));

    fireEvent.click(screen.getByRole('button', { name: '부장 결재자 바꾸기' }));
    fireEvent.click(screen.getByRole('button', { name: '새결재자 고르기' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
    expect(mocks.confirm.mock.calls[1][0].message).toContain('새결재자에게는 지금 차례라고 알립니다');
  });

  it('본문도 고치기를 체크했지만 본문을 고치지 않았으면 본문을 보냈다고 말하지 않는다 (F23)', async () => {
    renderPanel({ canAnswerSupplement: true, openSupplement: { askedBy: 'boss', question: '금액?' } });
    fireEvent.change(screen.getByRole('textbox', { name: /보완 답변/ }), { target: { value: '45만 원입니다' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '본문도 고치기' }));
    fireEvent.click(screen.getByRole('button', { name: '보완 답변 보내기' }));

    await waitFor(() => expect(mocks.answerSupplement).toHaveBeenCalledWith(7, { answer: '45만 원입니다', version: 3 }));
    expect(mocks.toast).toHaveBeenCalledWith('보완 답변을 보냈습니다. 본문은 고친 내용이 없어 그대로 두었습니다.', 'success');
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.stringContaining('고친 본문을 보냈습니다'), 'success');
  });

  it('보완 답변·결재자 바꾸기가 끝나면 포커스를 남는 제목으로 옮긴다 — 문서 처음으로 빠지지 않는다 (F24)', async () => {
    renderPanel({
      canAnswerSupplement: true, canReplaceApprover: true, openSupplement: { askedBy: 'boss', question: '금액?' },
      processHistory: [{ type: 'ASK', actorNm: '부장', content: '금액?', at: '2026-10-02T09:00:00' }],
    });
    fireEvent.change(screen.getByRole('textbox', { name: /보완 답변/ }), { target: { value: '답' } });
    fireEvent.click(screen.getByRole('button', { name: '보완 답변 보내기' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: '처리 기록' })).toHaveFocus());

    (document.activeElement as HTMLElement).blur();
    fireEvent.click(screen.getByRole('button', { name: '부장 결재자 바꾸기' }));
    fireEvent.click(screen.getByRole('button', { name: '새결재자 고르기' }));
    await waitFor(() => expect(mocks.replaceApprover).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('heading', { name: '결재 진행 관리' })).toHaveFocus());
  });

  it('기안 권한이 없으면 서버 힌트가 참이어도 쓰기 버튼을 보이지 않고 처리 기록만 보인다', () => {
    renderPanel({
      canRemind: true, canReplaceApprover: true, canAnswerSupplement: true,
      openSupplement: { askedBy: 'boss', question: '금액?' },
      processHistory: [{ type: 'REVISE', actorNm: '기안자', content: '고치기 전 본문', at: '2026-10-02T09:00:00' }],
    }, false);
    expect(screen.queryByRole('button', { name: /재알림/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /결재자 바꾸기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '보완 답변 보내기' })).not.toBeInTheDocument();
    expect(screen.getByText('본문 수정')).toBeInTheDocument();
    expect(screen.getByText('고치기 전 본문 보기')).toBeInTheDocument();
  });

  it('재알림은 보내는 동안 다시 누를 수 없고, 실패하면 서버가 말한 사유를 보인다', async () => {
    // 지역 이름은 census 가 세는 write sink(remindMutation.mutateAsync)와 같은 이름으로 둔다.
    const remindMutation = mocks.remind;
    const pending = deferred<number>();
    remindMutation.mockReturnValueOnce(pending.promise);
    renderPanel({ canRemind: true });
    const remind = screen.getByRole('button', { name: '차례인 결재자에게 재알림' });

    act(() => { fireEvent.click(remind); fireEvent.click(remind); });

    await waitFor(() => expect(remindMutation).toHaveBeenCalledTimes(1));
    expect(remind).toBeDisabled();
    expect(remind).toHaveAttribute('aria-busy', 'true');
    await act(async () => { pending.reject(new Error('오늘은 이미 재알림을 보냈습니다.')); });

    expect(await screen.findByRole('alert')).toHaveTextContent('오늘은 이미 재알림을 보냈습니다.');
    expect(mocks.toast).toHaveBeenCalledWith('재알림을 보내지 못했습니다.', 'error');
    expect(remind).toBeEnabled();
  });

  it('본문도 고치기를 풀었다가 다시 켜면 버린 수정이 아니라 지금 본문에서 시작한다 — 버린 수정이 고친 본문으로 가지 않는다', async () => {
    renderPanel({ canAnswerSupplement: true, openSupplement: { askedBy: 'boss', question: '금액?' } });
    const revise = screen.getByRole('checkbox', { name: '본문도 고치기' });
    fireEvent.click(revise);
    fireEvent.change(screen.getByRole('textbox', { name: /고친 본문/ }), { target: { value: '버릴 수정' } });
    fireEvent.click(revise);
    fireEvent.click(revise);

    expect(screen.getByRole('textbox', { name: /고친 본문/ })).toHaveValue('원래 본문');
    fireEvent.change(screen.getByRole('textbox', { name: /보완 답변/ }), { target: { value: '답' } });
    fireEvent.click(screen.getByRole('button', { name: '보완 답변 보내기' }));
    await waitFor(() => expect(mocks.answerSupplement).toHaveBeenCalledWith(7, { answer: '답', version: 3 }));
  });
});
