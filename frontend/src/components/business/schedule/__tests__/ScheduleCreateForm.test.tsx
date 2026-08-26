import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduleCreateForm } from '../ScheduleCreateForm';

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  submit: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

function renderForm(defaultYmd = '20260901') {
  return render(
    <ScheduleCreateForm
      defaultYmd={defaultYmd}
      onSubmit={mocks.submit}
      onCancel={mocks.cancel}
    />,
  );
}

function getFormFields() {
  const submit = screen.getByRole('button', { name: '일정 등록' });
  return {
    name: screen.getByRole('textbox', { name: /일정명/ }),
    begin: screen.getByLabelText(/시작일/),
    end: screen.getByLabelText(/종료일/),
    place: screen.getByRole('textbox', { name: '장소' }),
    content: screen.getByRole('textbox', { name: '내용' }),
    submit,
    form: submit.closest('form')!,
  };
}

describe('ScheduleCreateForm validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.submit.mockResolvedValue(undefined);
  });

  it('공백만 있는 일정명을 write sink로 보내지 않고 일정명으로 이동한다', async () => {
    const user = userEvent.setup();
    renderForm();
    const fields = getFormFields();
    await user.type(fields.name, '   ');

    fireEvent.submit(fields.form);

    expect(await screen.findAllByText(/일정명.*입력/)).not.toHaveLength(0);
    expect(mocks.submit).not.toHaveBeenCalled();
    await waitFor(() => expect(fields.name).toHaveFocus());
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
  });

  it('일정명 max+1을 write sink로 보내지 않고 일정명으로 이동한다', async () => {
    renderForm();
    const fields = getFormFields();
    fireEvent.change(fields.name, { target: { value: '가'.repeat(101) } });

    fireEvent.submit(fields.form);

    expect(mocks.submit).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 100자/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('실재하지 않는 YYYYMMDD를 write sink로 보내지 않고 시작일로 이동한다', async () => {
    const user = userEvent.setup();
    renderForm('20260231');
    const fields = getFormFields();
    await user.type(fields.name, '유효한 일정명');

    fireEvent.submit(fields.form);

    expect(await screen.findAllByText(/시작일.*확인/)).not.toHaveLength(0);
    expect(mocks.submit).not.toHaveBeenCalled();
    await waitFor(() => expect(fields.begin).toHaveFocus());
  });

  it('종료일이 시작일보다 빠르면 write sink를 차단하고 종료일로 이동한다', async () => {
    const user = userEvent.setup();
    renderForm();
    const fields = getFormFields();
    await user.type(fields.name, '날짜 범위 일정');
    fireEvent.change(fields.begin, { target: { value: '2026-09-02' } });
    fireEvent.change(fields.end, { target: { value: '2026-09-01' } });

    fireEvent.submit(fields.form);

    expect(mocks.submit).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/종료일.*시작일/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.end).toHaveFocus());
  });

  it('서버 필드 오류를 일정명에 연결하고 입력값을 보존한다', async () => {
    mocks.submit.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'schdlNm', message: '등록할 수 없는 일정명입니다.' }] } },
    });
    const user = userEvent.setup();
    renderForm();
    const fields = getFormFields();
    await user.type(fields.name, '보존할 일정명');
    await user.type(fields.place, '보존할 장소');

    fireEvent.submit(fields.form);

    expect(await screen.findAllByText('등록할 수 없는 일정명입니다.')).not.toHaveLength(0);
    expect(fields.name).toHaveValue('보존할 일정명');
    expect(fields.place).toHaveValue('보존할 장소');
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('일반 서버 오류는 토스트로 안내하고 입력값을 보존한다', async () => {
    mocks.submit.mockRejectedValueOnce(new Error('일정 서버에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    renderForm();
    const fields = getFormFields();
    await user.type(fields.name, '보존할 일정명');
    await user.type(fields.content, '보존할 일정 내용');

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('일정 서버에 연결할 수 없습니다.', 'error'));
    expect(fields.name).toHaveValue('보존할 일정명');
    expect(fields.content).toHaveValue('보존할 일정 내용');
  });

  it('저장 pending 중 동기 재제출해도 onSubmit을 한 번만 호출한다', async () => {
    let resolveSubmit!: () => void;
    mocks.submit.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    }));
    const user = userEvent.setup();
    renderForm();
    const fields = getFormFields();
    await user.type(fields.name, '중복 방지 일정');

    act(() => {
      fireEvent.submit(fields.form);
      fireEvent.submit(fields.form);
    });

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveSubmit();
    await waitFor(() => expect(fields.submit).not.toBeDisabled());
  });
});
