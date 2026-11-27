import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LogExportReasonDialog } from '../log-export-reason-dialog';

describe('LogExportReasonDialog', () => {
  it('빈 사유·1자 사유는 제출을 막고 오류 요약으로 초점을 옮기며, 유효 사유면 정규화된 값으로 onConfirm 을 호출한다', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
      <LogExportReasonDialog
        isOpen
        onClose={onClose}
        title="로그인 로그 내보내기"
        totalCount={12}
        onConfirm={onConfirm}
      />,
    );

    const textarea = screen.getByLabelText('내보내기 사유');
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getAllByText(/사유를 2~200자로 입력하세요/).length).toBeGreaterThan(0);
    await waitFor(() => expect(textarea).toHaveFocus());

    fireEvent.change(textarea, { target: { value: '  a ' } });
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }));
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.change(textarea, { target: { value: '  월간\t점검  ' } });
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith('월간 점검'));
    expect(onClose).toHaveBeenCalled();
  });

  it('실패 시 입력 사유를 유지하고 오류 메시지를 표시한다', async () => {
    const onConfirm = vi.fn().mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          message: '사유를 다시 입력해 주세요.',
          errors: [{ field: 'reason', message: '서버 사유 오류' }],
        },
      },
    });
    const onClose = vi.fn();
    render(
      <LogExportReasonDialog
        isOpen
        onClose={onClose}
        title="로그인 로그 내보내기"
        onConfirm={onConfirm}
      />,
    );

    const textarea = screen.getByLabelText('내보내기 사유') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '월간 점검' } });
    fireEvent.click(screen.getByRole('button', { name: '내보내기' }));

    await waitFor(() => expect(screen.getByText(/입력한 사유는 유지됩니다/)).toBeInTheDocument());
    expect(screen.getAllByText('서버 사유 오류').length).toBeGreaterThan(0);
    expect(textarea.value).toBe('월간 점검');
    expect(onClose).not.toHaveBeenCalled();
  });
});
