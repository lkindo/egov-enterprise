import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 운영 화면의 종료일 일괄 바꾸기(ADR-0040 결정 10, §5.4). 서버가 모든 대상을 다시 판정해 하나라도 맞지 않으면 전체를 거부한다 —
 * 대화상자는 그 사유를 그대로 보이고 열어 둔다(아무것도 바뀌지 않았다). 새 종료일은 꼭 고르고, 오늘과의 비교는 서버가 한다.
 */
const mocks = vi.hoisted(() => ({ updatePostPeriodsInBatch: vi.fn(), updatePostPinsInBatch: vi.fn(), toast: vi.fn() }));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { updatePostPeriodsInBatch: mocks.updatePostPeriodsInBatch, updatePostPinsInBatch: mocks.updatePostPinsInBatch },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { BoardPostBatchDialog } from '../BoardPostBatchDialog';

const POSTS = [
  { pstSn: 7, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: '연차 안내', pstCn: '', useYn: 'Y', userId: 'u' },
  { pstSn: 9, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: '보안 점검', pstCn: '', useYn: 'Y', userId: 'u' },
];

function renderDialog(mode: 'END_DATE' | 'PIN' = 'END_DATE') {
  const handlers = { onClose: vi.fn(), onDone: vi.fn(), onConflict: vi.fn() };
  render(<BoardPostBatchDialog bbsId="BBSMSTR_AAAAAAAAAAAA" mode={mode} posts={POSTS} defaultDays={30} {...handlers} />);
  return handlers;
}

const submit = () => screen.getByRole('button', { name: '선택한 2건 종료일 바꾸기' });

describe('BoardPostBatchDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updatePostPeriodsInBatch.mockResolvedValue(undefined);
  });

  it('대상 제목·번호와 건수를 보이고, 새 종료일 없이는 보내지 않는다', async () => {
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: '종료일 바꾸기' });
    expect(within(dialog).getByText('대상 2건')).toBeInTheDocument();
    expect(within(dialog).getByText(/연차 안내/)).toBeInTheDocument();
    fireEvent.click(submit());
    expect(await screen.findByText('새 게시 종료일을 골라 주세요.')).toBeInTheDocument();
    expect(mocks.updatePostPeriodsInBatch).not.toHaveBeenCalled();
  });

  it('고른 글 모두를 END_DATE 로 보내고 마친 뒤 목록을 다시 읽게 한다', async () => {
    const { onDone, onClose } = renderDialog();
    fireEvent.change(screen.getByLabelText(/새 게시 종료일/), { target: { value: '2026-12-31' } });
    fireEvent.click(submit());
    await waitFor(() => expect(mocks.updatePostPeriodsInBatch).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', {
      action: 'END_DATE', pstSns: [7, 9], pstEndYmd: '20261231',
    }));
    expect(mocks.toast).toHaveBeenCalledWith('2건의 게시 종료일을 바꿨습니다.', 'success');
    expect(onDone).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('서버가 전체를 거부하면 사유를 그대로 알리고 대화상자와 입력을 남긴다', async () => {
    mocks.updatePostPeriodsInBatch.mockRejectedValueOnce({ response: { status: 400, data: {
      message: '시작일보다 이른 종료일이 되는 글이 있어 아무것도 바꾸지 않았습니다: 9',
    } } });
    const { onDone, onClose } = renderDialog();
    fireEvent.change(screen.getByLabelText(/새 게시 종료일/), { target: { value: '2026-10-25' } });
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('시작일보다 이른 종료일이 되는 글이 있어 아무것도 바꾸지 않았습니다: 9');
    expect(onDone).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/새 게시 종료일/)).toHaveValue('2026-10-25');
  });

  it('그 사이 다른 사람이 고쳤으면(409) 알리고 목록을 다시 읽게 한다', async () => {
    mocks.updatePostPeriodsInBatch.mockRejectedValueOnce({ response: { status: 409, data: { message: '충돌' } } });
    const { onConflict, onDone } = renderDialog();
    fireEvent.change(screen.getByLabelText(/새 게시 종료일/), { target: { value: '2026-12-31' } });
    fireEvent.click(submit());
    expect(await screen.findByRole('alert')).toHaveTextContent('그 사이 다른 사용자가 고른 글을 고쳐 아무것도 바꾸지 않았습니다');
    expect(onConflict).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('같은 틱의 두 번째 제출은 보내지 않고 처리 중에는 단추를 잠근다', async () => {
    let resolveWrite!: () => void;
    mocks.updatePostPeriodsInBatch.mockReturnValueOnce(new Promise<void>((resolve) => { resolveWrite = resolve; }));
    renderDialog();
    fireEvent.change(screen.getByLabelText(/새 게시 종료일/), { target: { value: '2026-12-31' } });
    const form = submit().closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await waitFor(() => expect(mocks.updatePostPeriodsInBatch).toHaveBeenCalledTimes(1));
    const pending = screen.getByRole('button', { name: '종료일 바꾸는 중…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolveWrite());
  });

  // [2026-10-23 ADR-0040 결정 5] 상단 고정하기 — 고정 종료일은 비울 수 있고(서버가 기본 일수로 정한다) 상한은 서버가 잠그고 판정한다.
  describe('상단 고정하기(PIN)', () => {
    const pinSubmit = () => screen.getByRole('button', { name: '선택한 2건 상단 고정하기' });

    it('고정 종료일을 비우면 날짜 없이 고른 글 모두를 고정으로 보내고, 서버가 기본 일수로 정한다고 말한다', async () => {
      const { onDone, onClose } = renderDialog('PIN');
      const dialog = screen.getByRole('dialog', { name: '상단 고정하기' });
      expect(within(dialog).getByText('대상 2건')).toBeInTheDocument();
      expect(within(dialog).getByText('비우면 오늘부터 30일 뒤까지(서버가 정함). 그날까지 고정합니다.')).toBeInTheDocument();
      expect(screen.getByLabelText('고정 종료일')).not.toBeRequired();
      fireEvent.click(pinSubmit());
      await waitFor(() => expect(mocks.updatePostPinsInBatch).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', { pstSns: [7, 9], upendFixYn: 'Y' }));
      expect(mocks.updatePostPeriodsInBatch).not.toHaveBeenCalled();
      expect(mocks.toast).toHaveBeenCalledWith('2건을 상단에 고정했습니다.', 'success');
      expect(onDone).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    it('고른 고정 종료일은 yyyyMMdd 로 보낸다', async () => {
      renderDialog('PIN');
      fireEvent.change(screen.getByLabelText('고정 종료일'), { target: { value: '2026-12-31' } });
      fireEvent.click(pinSubmit());
      await waitFor(() => expect(mocks.updatePostPinsInBatch).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', {
        pstSns: [7, 9], upendFixYn: 'Y', upendFixEndYmd: '20261231',
      }));
    });

    it('상한 초과·답글처럼 전체를 거부한 사유는 알림으로 보이고 대화상자와 선택을 남긴다', async () => {
      mocks.updatePostPinsInBatch.mockRejectedValueOnce({ response: { status: 400, data: {
        message: '이 게시판은 상단 고정을 최대 5건까지 둡니다(지금 4건). 다른 고정을 해제하거나 상한을 올린 뒤 다시 고정해 주세요.',
      } } });
      const { onDone, onClose } = renderDialog('PIN');
      fireEvent.click(pinSubmit());
      expect(await screen.findByRole('alert')).toHaveTextContent('이 게시판은 상단 고정을 최대 5건까지 둡니다(지금 4건).');
      expect(onDone).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('서버의 고정 종료일 사유는 그 칸에 붙인다 — 화면은 오늘을 계산하지 않는다', async () => {
      mocks.updatePostPinsInBatch.mockRejectedValueOnce({ response: { status: 400, data: { message: '고정 종료일은 오늘이나 그 뒤로 정해 주세요.' } } });
      renderDialog('PIN');
      fireEvent.change(screen.getByLabelText('고정 종료일'), { target: { value: '2020-01-01' } });
      fireEvent.click(pinSubmit());
      await waitFor(() => expect(screen.getByLabelText('고정 종료일')).toHaveAttribute('aria-invalid', 'true'));
      expect(screen.getAllByText('고정 종료일은 오늘이나 그 뒤로 정해 주세요.').length).toBeGreaterThan(0);
      // 칸에 붙였으므로 대화상자 전체 알림(서버 사유 문단)으로는 다시 보이지 않는다.
      expect(document.querySelector('p[role="alert"]')).toBeNull();
      expect(screen.getByLabelText('고정 종료일')).toHaveValue('2020-01-01');
    });
  });
});
