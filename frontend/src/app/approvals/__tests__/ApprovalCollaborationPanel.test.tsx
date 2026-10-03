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

    renderPanel({ canRemind: true, remindedToday: true });
    expect(screen.getByRole('button', { name: '오늘 재알림함' })).toBeDisabled();
  });

  it('아직 처리하지 않은 결재자를 바꾸면 확인 뒤 버전과 함께 보낸다 — 부재 중인 사람이 표시된다', async () => {
    renderPanel({ canReplaceApprover: true });
    expect(screen.getByText('부재 중')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '부장 결재자 바꾸기' }));
    fireEvent.click(screen.getByRole('button', { name: '새결재자 고르기' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ title: '결재자 바꾸기' })));
    await waitFor(() => expect(mocks.replaceApprover).toHaveBeenCalledWith(7, 'boss', 'NEW', 3));
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
});
