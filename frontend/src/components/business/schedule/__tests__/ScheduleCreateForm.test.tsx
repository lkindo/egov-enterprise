import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduleCreateForm, type ScheduleFormValues } from '../ScheduleCreateForm';

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
    fireEvent.change(fields.name, { target: { value: '가'.repeat(301) } });

    fireEvent.submit(fields.form);

    expect(mocks.submit).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 300자/)).not.toHaveLength(0);
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

/**
 * ⚠ [전체 치환 왕복 계약] 일정 수정은 부분 수정이 아니다.
 *
 * `PUT /api/v1/schedules/{schdlSn}` 이 도달하는 `Schedule.updateAll`
 * (business-app/src/main/java/nuri/business/domain/schedule/Schedule.java)은 10개 필드를
 * **조건 없이** 대입한다 — 요청 본문에 없는 필드는 기존 값이 유지되는 게 아니라 null 로 지워진다.
 * 그런데 이 폼은 6개(일정명·시작일·종료일·장소·내용·공유 범위)만 묻는다. 따라서 나머지
 * `schdlKndCd`·`schdlImprtCd`·`reptSeCd` 는 defaultValues 로 되돌려 싣는 것이 **유일한 보존 수단**이다.
 *
 * 특히 `schdlImprtCd` 는 /smart-toolkit/schedule/dept 가 'A'(전체)로 저장하는 값이다 —
 * 빠뜨리면 그 화면에서 만든 일정을 work-hub 모달에서 이름만 고쳐도 중요도가 사라지는
 * **교차 화면 데이터 유실**이 된다. 화면 하나만 보고는 드러나지 않으므로 계약으로 고정한다.
 *
 * 반대 방향도 같이 막는다 — "그러면 initialData 를 통째로 펼치면 되지 않나" 가 자연스러운
 * 오답인데, `updateScheduleOperation.requestForbiddenPaths`(schdlSn·schdlIpAddr·schdlPicId·
 * frstRgtrId·crtDt·lastMdfrId·mdfcnDt·schdlDeptId)에 걸려 `assertForbiddenPathsAbsent` 가
 * HTTP 요청 전에 throw 한다. 즉 수정이 통째로 죽는다(ScheduleDeptClient 가 실제로 그랬다).
 * 그래서 '빠뜨리지 않는다' 와 '넘치게 싣지 않는다' 를 한 쌍으로 단언한다.
 */
describe('ScheduleCreateForm 수정 모드 전체 치환 왕복', () => {
  /** 목록 행이 실제로 들고 오는 모양 — 폼이 묻는 값·묻지 않는 값·서버 소유 값이 섞여 있다. */
  const editInitialData: Partial<ScheduleFormValues> = {
    schdlNm: '기존 부서 회의',
    schdlCn: '기존 내용',
    schdlBgngYmd: '20260910',
    schdlEndYmd: '20260910',
    schdlPlcNm: '기존 장소',
    schdlSeCd: '1',
    // 폼이 묻지 않지만 updateAll 이 덮어쓰는 3필드 — 이 describe 의 본체다.
    schdlKndCd: 'B',
    schdlImprtCd: 'A',
    reptSeCd: 'N',
    // 서버 소유(requestForbiddenPaths) — 실려 나가면 전송 전에 throw 된다.
    schdlSn: 4021,
    schdlPicId: 'USR0000001',
    schdlDeptId: 'DEPT001',
    schdlIpAddr: '10.0.0.1',
    frstRgtrId: 'USR0000001',
    lastMdfrId: 'USR0000001',
  };

  function renderEditForm() {
    return render(
      <ScheduleCreateForm
        mode="edit"
        initialData={editInitialData}
        defaultYmd="20260901"
        onSubmit={mocks.submit}
        onCancel={mocks.cancel}
      />,
    );
  }

  function getEditFormFields() {
    const submit = screen.getByRole('button', { name: '일정 수정' });
    return {
      name: screen.getByRole('textbox', { name: /일정명/ }),
      submit,
      form: submit.closest('form')!,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.submit.mockResolvedValue(undefined);
  });

  it('일정명만 고쳐 제출해도 schdlKndCd·schdlImprtCd·reptSeCd 가 원래 값 그대로 실려 간다', async () => {
    renderEditForm();
    const fields = getEditFormFields();
    fireEvent.change(fields.name, { target: { value: '이름만 고친 회의' } });

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    const payload = mocks.submit.mock.calls[0][0] as ScheduleFormValues;

    // 사용자가 고친 필드는 새 값으로 간다.
    expect(payload.schdlNm).toBe('이름만 고친 회의');
    // 묻지 않은 3필드는 기존 값 그대로. 빠지면 updateAll 이 null 로 덮어쓴다.
    expect(payload.schdlKndCd).toBe('B');
    expect(payload.schdlImprtCd).toBe('A');
    expect(payload.reptSeCd).toBe('N');
    // 묻는 나머지 필드도 함께 보존된다(전체 치환이므로 하나라도 빠지면 지워진다).
    expect(payload.schdlCn).toBe('기존 내용');
    expect(payload.schdlPlcNm).toBe('기존 장소');
    expect(payload.schdlBgngYmd).toBe('20260910');
    expect(payload.schdlEndYmd).toBe('20260910');
    expect(payload.schdlSeCd).toBe('1');
  });

  it('왕복시키더라도 updateSchedule 이 금지한 서버 소유 필드는 싣지 않는다', async () => {
    renderEditForm();
    const fields = getEditFormFields();
    fireEvent.change(fields.name, { target: { value: '금지 경로 확인용 일정' } });

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.submit).toHaveBeenCalledTimes(1));
    const payload = mocks.submit.mock.calls[0][0] as ScheduleFormValues;

    // initialData 를 통째로 펼치는 '오답 수정' 이 들어오면 여기서 red 가 된다.
    // 이 값들이 실리면 assertForbiddenPathsAbsent 가 HTTP 전에 throw 해 수정이 통째로 죽는다.
    for (const forbidden of [
      'schdlSn', 'schdlIpAddr', 'schdlPicId', 'frstRgtrId', 'crtDt', 'lastMdfrId', 'mdfcnDt', 'schdlDeptId',
    ]) {
      expect(payload).not.toHaveProperty(forbidden);
    }
  });

  it('세 필드에는 입력 컨트롤이 없다 — 사용자가 고칠 수 없으므로 왕복 말고는 보존 경로가 없다', () => {
    renderEditForm();
    const fields = getEditFormFields();
    const controls = Array.from(
      fields.form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select'),
    );

    // 폼이 실제로 묻는 것은 6개뿐이다: 일정명·시작일·종료일·장소·내용·부서 공유 체크박스.
    expect(controls).toHaveLength(6);
    // 세 코드는 이름으로도 값으로도 화면에 없다 — 사용자 정정 경로가 존재하지 않는다는 대조군이다.
    for (const hidden of ['schdlKndCd', 'schdlImprtCd', 'reptSeCd']) {
      expect(controls.some((control) => control.getAttribute('name') === hidden)).toBe(false);
    }
    const shownValues = controls.map((control) => control.value);
    expect(shownValues).not.toContain('B');
    expect(shownValues).not.toContain('A');
    expect(shownValues).not.toContain('N');
  });
});
