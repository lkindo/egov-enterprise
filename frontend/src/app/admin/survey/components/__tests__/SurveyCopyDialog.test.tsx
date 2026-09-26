import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 설문 복제 대화상자 계약(2026-09-26 DIP B5 F6).
 *
 * 검증 축: ① 제목은 '[사본] 원본' 으로 채우고 기간은 비워 반드시 새로 고르게 한다(원본 기간 복사는 같은 설문을 둘 연다)
 * ② 날짜는 yyyyMMdd 로 보낸다 ③ 역순 기간은 보내지 않는다 ④ 같은 틱 제출은 한 번, 실패는 사유를 보이고 입력을 보존한다.
 */
const mocks = vi.hoisted(() => ({ copySurvey: vi.fn(), toast: vi.fn() }));

vi.mock('@/services/foundation/system/SurveyAdminService', () => ({
  surveyAdminService: { copySurvey: mocks.copySurvey },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { SurveyCopyDialog } from '../SurveyCopyDialog';

function renderDialog(onCopied = vi.fn()) {
  render(<SurveyCopyDialog source={{ srvySn: 201, srvyTtl: '만족도 조사' }} onClose={() => {}} onCopied={onCopied} />);
  return onCopied;
}

describe('SurveyCopyDialog (DIP B5 F6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('제목은 사본으로 채우고 기간은 비워 둔다 — 기간 없이는 보내지 않는다', async () => {
    renderDialog();

    expect(screen.getByRole('textbox', { name: /사본 제목/ })).toHaveValue('[사본] 만족도 조사');
    fireEvent.click(screen.getByRole('button', { name: '복제' }));

    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toBeInTheDocument();
    expect(mocks.copySurvey).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/시작일/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('새 기간을 yyyyMMdd 로 보내고 사본 번호를 돌려준다', async () => {
    mocks.copySurvey.mockResolvedValueOnce(305);
    const onCopied = renderDialog();

    fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-10-31' } });
    fireEvent.click(screen.getByRole('button', { name: '복제' }));

    await waitFor(() => expect(mocks.copySurvey).toHaveBeenCalledWith(201, {
      srvyTtl: '[사본] 만족도 조사', srvyBgngYmd: '20261001', srvyEndYmd: '20261031',
    }));
    await waitFor(() => expect(onCopied).toHaveBeenCalledWith(305));
    expect(mocks.toast).toHaveBeenCalledWith('설문을 복제했습니다. 사본을 선택했습니다.', 'success');
  });

  it('종료일이 시작일보다 앞이면 보내지 않고 종료일에 사유를 붙인다', async () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-10-31' } });
    fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: '복제' }));

    expect(await screen.findByText('종료일은 시작일과 같거나 뒤여야 합니다.')).toBeInTheDocument();
    expect(mocks.copySurvey).not.toHaveBeenCalled();
  });

  it('복제는 pending 시작 전 동기 잠금으로 한 번만 보내고 실패하면 입력을 보존한다', async () => {
    let rejectCopy!: (reason?: unknown) => void;
    mocks.copySurvey.mockReturnValueOnce(new Promise((_, reject) => { rejectCopy = reject; }));
    const onCopied = renderDialog();
    fireEvent.change(screen.getByLabelText(/시작일/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText(/종료일/), { target: { value: '2026-10-31' } });
    const submit = screen.getByRole('button', { name: '복제' });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(mocks.copySurvey).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');

    await act(async () => rejectCopy(new Error('Network Error')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('설문을 복제하지 못했습니다.', 'error'));
    expect(screen.getByLabelText(/시작일/)).toHaveValue('2026-10-01');
    expect(onCopied).not.toHaveBeenCalled();
  });
});
