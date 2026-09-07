import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChangePasswordForm } from '../ChangePasswordForm';

/**
 * 🔑 본인 비밀번호 변경 폼 계약.
 *
 * [2026-09-08] 서버(`PUT /api/v1/users/me/password`)와 `userService.changePassword` 는 갖춰져
 * 있었는데 호출부가 0 이었다(operation-consumer-census 축 2 실측). DEC-OPS-032 가 관리자
 * 초기화만 열면서 "로그인 화면에 비밀번호 찾기는 두지 않는다" 를 명시했는데, 조사해 보니
 * **본인이 자기 비밀번호를 바꾸는 경로도 없었다** — 정책이 아니라 누락이었다.
 *
 * 검증 축:
 *   1) 현재 비밀번호를 함께 보낸다(서버 계약이자 세션 탈취 방어).
 *   2) 확인 불일치·같은 비밀번호·길이 위반은 transport 전에 막는다.
 *   3) 실패해도 입력을 잃지 않는다 — 비밀번호를 세 칸이나 다시 치게 만들지 않는다.
 */
const mocks = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  const onCancel = vi.fn();
  render(<ChangePasswordForm onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
}

function fill(fields: { old?: string; next?: string; confirm?: string }) {
  if (fields.old !== undefined) {
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: fields.old } });
  }
  if (fields.next !== undefined) {
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: fields.next } });
  }
  if (fields.confirm !== undefined) {
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: fields.confirm } });
  }
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

describe('ChangePasswordForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('현재 비밀번호와 새 비밀번호를 함께 보낸다', async () => {
    const { onSubmit } = renderForm();
    fill({ old: 'Current1!', next: 'NewPassw0rd!', confirm: 'NewPassw0rd!' });
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith('Current1!', 'NewPassw0rd!');
  });

  it('확인 입력이 다르면 transport 전에 막는다', async () => {
    const { onSubmit } = renderForm();
    fill({ old: 'Current1!', next: 'NewPassw0rd!', confirm: 'Different1!' });
    submit();

    expect(await screen.findByText('새 비밀번호와 확인 입력이 일치하지 않습니다.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('새 비밀번호가 현재와 같으면 막는다 — 바꾸지 않은 변경을 성공으로 보이게 하지 않는다', async () => {
    const { onSubmit } = renderForm();
    fill({ old: 'Same0000!', next: 'Same0000!', confirm: 'Same0000!' });
    submit();

    expect(await screen.findByText('새 비밀번호가 현재 비밀번호와 같습니다.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('서버 계약 길이(8~20자)를 화면이 먼저 막는다', async () => {
    const { onSubmit } = renderForm();
    fill({ old: 'Current1!', next: 'short', confirm: 'short' });
    submit();

    expect(await screen.findByText('새 비밀번호는 8~20자여야 합니다.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('현재 비밀번호가 비면 막는다', async () => {
    const { onSubmit } = renderForm();
    fill({ next: 'NewPassw0rd!', confirm: 'NewPassw0rd!' });
    submit();

    expect(await screen.findByText('현재 비밀번호를 입력해 주세요.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('서버 필드 오류는 그 자리에 붙이고 입력을 보존한다', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: { data: { errors: [{ field: 'oldPassword', message: '현재 비밀번호가 일치하지 않습니다.' }] } },
    });
    renderForm(onSubmit);
    fill({ old: 'Wrong1234!', next: 'NewPassw0rd!', confirm: 'NewPassw0rd!' });
    submit();

    expect(await screen.findByText('현재 비밀번호가 일치하지 않습니다.')).toBeInTheDocument();
    // 세 칸을 다시 치게 만들지 않는다.
    expect(screen.getByLabelText('현재 비밀번호')).toHaveValue('Wrong1234!');
    expect(screen.getByLabelText('새 비밀번호')).toHaveValue('NewPassw0rd!');
  });

  it('필드 오류가 아닌 실패는 안내로 드러내고 입력을 보존한다', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('서버 오류'));
    renderForm(onSubmit);
    fill({ old: 'Current1!', next: 'NewPassw0rd!', confirm: 'NewPassw0rd!' });
    submit();

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('서버 오류'), 'error'));
    expect(screen.getByLabelText('새 비밀번호')).toHaveValue('NewPassw0rd!');
  });

  it('제출 중에는 중복 제출을 막는다', async () => {
    let resolve: () => void = () => undefined;
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((next) => { resolve = next; }));
    renderForm(onSubmit);
    fill({ old: 'Current1!', next: 'NewPassw0rd!', confirm: 'NewPassw0rd!' });

    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const button = screen.getByRole('button', { name: '변경 중…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolve();
    await waitFor(() => expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeEnabled());
  });

  it('비밀번호 입력은 자동완성 힌트를 표준대로 준다', () => {
    renderForm();
    expect(screen.getByLabelText('현재 비밀번호')).toHaveAttribute('autocomplete', 'current-password');
    expect(screen.getByLabelText('새 비밀번호')).toHaveAttribute('autocomplete', 'new-password');
    expect(screen.getByLabelText('현재 비밀번호')).toHaveAttribute('type', 'password');
  });
});
