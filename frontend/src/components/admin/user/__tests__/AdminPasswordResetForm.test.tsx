import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ toast: vi.fn() }));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import { AdminPasswordResetForm } from '../AdminPasswordResetForm';

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function renderForm(overrides: Partial<React.ComponentProps<typeof AdminPasswordResetForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onCancel = vi.fn();
  const view = render(
    <AdminPasswordResetForm targetLabel="홍길동(user1)" onSubmit={onSubmit} onCancel={onCancel} {...overrides} />,
  );
  return { ...view, onSubmit, onCancel };
}

function fill(newPassword: string, confirmPassword: string) {
  fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: newPassword } });
  fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: confirmPassword } });
}

/**
 * [2026-09-05] 관리자 비밀번호 초기화 UI. API·서비스 메서드는 있었지만 호출부가 0건이었다.
 */
describe('AdminPasswordResetForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('대상을 보여 주고 8~20자·확인 일치를 요약과 인라인 오류로 연결한다', async () => {
    const { onSubmit } = renderForm();

    expect(screen.getByText('대상: 홍길동(user1)')).toBeInTheDocument();

    fill('short', 'different');
    fireEvent.submit(screen.getByRole('form', { name: '비밀번호 초기화 폼' }));

    const summary = await screen.findByRole('alert');
    expect(summary).toHaveTextContent('새 비밀번호는 8~20자여야 합니다.');
    expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByLabelText('새 비밀번호')).toHaveFocus());
    expect(onSubmit).not.toHaveBeenCalled();

    fill('LongEnough1!', 'LongEnough2!');
    fireEvent.submit(screen.getByRole('form', { name: '비밀번호 초기화 폼' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('새 비밀번호와 확인 입력이 일치하지 않습니다.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  /**
   * 제출 액션의 네 성질을 한 테스트에서 함께 증명한다(폼 validation census 요구 축):
   * ① 진행 중 재클릭이 두 번째 제출을 만들지 않는다 ② disabled + aria-busy 로 드러낸다
   * ③ 서버 거절을 실제로 주입한다 ④ 거절 사유가 보이고 입력이 보존된다.
   */
  it('진행 중에는 한 번만 보내고 상태를 드러내며, 실패 뒤 입력을 보존하고 사유를 알린다', async () => {
    const pending = deferred<void>();
    const onSubmit = vi.fn().mockReturnValueOnce(pending.promise);
    renderForm({ onSubmit });

    fill('LongEnough1!', 'LongEnough1!');
    const submit = screen.getByRole('button', { name: '비밀번호 초기화' });
    act(() => {
      fireEvent.click(submit);
      fireEvent.click(submit);
    });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith('LongEnough1!');
    const busy = screen.getByRole('button', { name: '초기화 중…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');

    await act(async () => {
      pending.reject(new Error('권한이 없습니다.'));
    });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('권한이 없습니다.', 'error'));
    expect(screen.getByLabelText('새 비밀번호')).toHaveValue('LongEnough1!');
    expect(screen.getByRole('button', { name: '비밀번호 초기화' })).toBeEnabled();
  });

  it('서버 필드 오류는 해당 입력에 연결한다', async () => {
    const onSubmit = vi.fn().mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'newPassword', message: '최근 사용한 비밀번호입니다.' }] } },
    });
    renderForm({ onSubmit });

    fill('LongEnough1!', 'LongEnough1!');
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 초기화' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('최근 사용한 비밀번호입니다.');
    expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.toast).not.toHaveBeenCalled();
  });

  it('다른 쓰기 작업이 진행 중이면 폼을 잠근다', () => {
    renderForm({ externalBusy: true });
    expect(screen.getByRole('button', { name: '비밀번호 초기화' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
  });
});
