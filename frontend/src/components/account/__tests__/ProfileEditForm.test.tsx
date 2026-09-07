import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileEditForm } from '../ProfileEditForm';

/**
 * 👤 내 프로필 수정 폼 계약.
 *
 * [2026-09-08] 서버(`PUT /api/v1/users/me`)와 `userService.updateMe` 는 갖춰져 있었는데
 * 호출부가 0 이었다(operation-consumer-census 축 2 실측).
 *
 * 가장 중요한 축은 **무엇을 보내는가**다. `UserService.updateUser` 는 `null = 보내지 않음`으로
 * 보아 기존 값을 유지하고 `""` 는 '지움' 으로 반영하는 부분 수정 계약이다. 그런데 응답은
 * `@JsonInclude(NON_NULL)` 이라 값이 없는 필드가 아예 오지 않으므로, 폼이 전 필드를 늘 실어
 * 보내면 **서버에서 null 이던 필드가 전부 ""(지움)로 바뀐다**. 그래서 바꾼 필드만 싣는다.
 */
const mocks = vi.hoisted(() => ({ toast: vi.fn() }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const INITIAL = {
  userNm: '홍길동',
  emplNo: 'E-1001',
  emlAddr: 'hong@example.com',
  mblTelno: '01012345678',
};

function renderForm(
  onSubmit = vi.fn().mockResolvedValue(undefined),
  initialValues: Record<string, string> = INITIAL,
) {
  const onCancel = vi.fn();
  render(<ProfileEditForm initialValues={initialValues} onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
}

const change = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(new RegExp(`^${label}`)), { target: { value } });

const submit = () => fireEvent.click(screen.getByRole('button', { name: '저장' }));

describe('ProfileEditForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('서버가 내려준 현재 값으로 폼을 채운다', () => {
    renderForm();
    expect(screen.getByLabelText(/^이름/)).toHaveValue('홍길동');
    expect(screen.getByLabelText(/^사번/)).toHaveValue('E-1001');
    expect(screen.getByLabelText(/^이메일/)).toHaveValue('hong@example.com');
  });

  it('바꾼 필드만 보낸다 — 보내지 않은 필드는 서버가 기존 값을 유지한다', async () => {
    const { onSubmit } = renderForm();
    change('휴대전화', '01099998888');
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    // 이름은 서버 필수(@NotBlank)라 늘 싣는다. 손대지 않은 사번·이메일은 싣지 않는다.
    expect(onSubmit).toHaveBeenCalledWith({ userNm: '홍길동', mblTelno: '01099998888' });
  });

  it('비운 칸은 빈 문자열로 보낸다 — 지움 의도가 서버까지 간다', async () => {
    const { onSubmit } = renderForm();
    change('사번', '');
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ userNm: '홍길동', emplNo: '' });
  });

  it('원래 비어 있던 칸을 그대로 두면 보내지 않는다 — null 을 빈 문자열로 바꾸지 않는다', async () => {
    const { onSubmit } = renderForm(vi.fn().mockResolvedValue(undefined), { userNm: '홍길동' });
    submit();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ userNm: '홍길동' });
  });

  it('이름이 비면 transport 전에 막는다', async () => {
    const { onSubmit } = renderForm();
    change('이름', '');
    submit();

    expect(await screen.findByText('이름을 입력해 주세요.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('이메일 형식 위반을 화면이 먼저 막는다', async () => {
    const { onSubmit } = renderForm();
    change('이메일', 'not-an-email');
    submit();

    await waitFor(() => expect(onSubmit).not.toHaveBeenCalled());
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('소속·권한 필드는 이 폼에 두지 않고 그 사실을 말한다', () => {
    renderForm();
    expect(screen.queryByLabelText(/소속 그룹|부서|기관/)).toBeNull();
    expect(screen.getByText(/소속 그룹·부서·기관과 권한은 관리자가 관리합니다/)).toBeInTheDocument();
  });

  it('중복 제출을 막고 진행 상태를 드러내며 실패는 안내로 알리고 입력을 보존한다', async () => {
    let reject: (error: unknown) => void = () => undefined;
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((_, next) => { reject = next; }));
    renderForm(onSubmit);
    change('휴대전화', '01099998888');

    submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const button = screen.getByRole('button', { name: '저장 중…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    reject(new Error('서버 오류'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('서버 오류'), 'error'));
    expect(screen.getByLabelText(/^휴대전화/)).toHaveValue('01099998888');
    await waitFor(() => expect(screen.getByRole('button', { name: '저장' })).toBeEnabled());
  });

  it('서버 필드 오류는 그 자리에 붙인다', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: { data: { errors: [{ field: 'emlAddr', message: '이미 사용 중인 이메일입니다.' }] } },
    });
    renderForm(onSubmit);
    change('이메일', 'taken@example.com');
    submit();

    expect(await screen.findByText('이미 사용 중인 이메일입니다.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^이메일/)).toHaveValue('taken@example.com');
  });
});
