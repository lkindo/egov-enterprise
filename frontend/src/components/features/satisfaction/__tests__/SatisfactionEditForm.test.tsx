import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SatisfactionEditForm } from '../SatisfactionEditForm';

/**
 * ⭐ 만족도 수정 폼 계약.
 *
 * [2026-09-08] ADR-0011 이 만족도 수정을 인증된 owner-or-admin 으로 열어 뒀는데 화면에는
 * 등록·삭제만 있었다(operation-consumer-census 축 1 이 `update` 를 소비 0 으로 지목).
 *
 * 이 폼이 지키는 것:
 *   1) 기존 점수·내용으로 열린다 — 다시 처음부터 매기게 하지 않는다.
 *   2) 검증은 등록과 같은 규격이다(점수 미선택 차단).
 *   3) 실패해도 편집 값을 잃지 않고 서버 판정을 그대로 보여준다 — 권한은 화면이 추측하지 않는다.
 */
const ITEM = { dgstfnSn: 7, dgstfnScr: 2, dgstfnCn: '보통입니다', userNm: '홍길동', useYn: 'Y' };

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined), item = ITEM) {
  const onCancel = vi.fn();
  render(<SatisfactionEditForm item={item} onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
}

const save = () => fireEvent.click(screen.getByRole('button', { name: '만족도 저장' }));

describe('SatisfactionEditForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('기존 점수·내용으로 열린다', () => {
    renderForm();
    expect(screen.getByLabelText('만족도 의견 수정')).toHaveValue('보통입니다');
    const group = screen.getByRole('radiogroup', { name: '만족도 점수 수정' });
    expect(within(group).getByRole('radio', { name: '2점' })).toBeChecked();
  });

  it('점수와 내용을 보낸다 — 서버가 갱신하는 두 필드다', async () => {
    const { onSubmit } = renderForm();
    const group = screen.getByRole('radiogroup', { name: '만족도 점수 수정' });
    fireEvent.click(within(group).getByRole('radio', { name: '5점' }));
    fireEvent.change(screen.getByLabelText('만족도 의견 수정'), { target: { value: '다시 보니 좋았습니다' } });
    save();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      dgstfnScr: 5,
      dgstfnCn: '다시 보니 좋았습니다',
    }));
  });

  it('점수를 지우면 transport 전에 막는다', async () => {
    const { onSubmit } = renderForm(vi.fn().mockResolvedValue(undefined), { ...ITEM, dgstfnScr: 0 });
    save();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('실패는 서버 판정을 그대로 알리고 편집 값을 지킨다', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('수정 권한이 없습니다.'));
    renderForm(onSubmit);
    fireEvent.change(screen.getByLabelText('만족도 의견 수정'), { target: { value: '고친 내용' } });
    save();

    expect(await screen.findByText('수정 권한이 없습니다.')).toBeInTheDocument();
    expect(screen.getByLabelText('만족도 의견 수정')).toHaveValue('고친 내용');
  });

  it('서버 필드 오류는 그 자리에 붙인다', async () => {
    const onSubmit = vi.fn().mockRejectedValue({
      response: { data: { errors: [{ field: 'dgstfnCn', message: '의견이 너무 깁니다.' }] } },
    });
    renderForm(onSubmit);
    save();

    expect(await screen.findByText('의견이 너무 깁니다.')).toBeInTheDocument();
  });

  it('저장 중에는 잠기고 중복 제출을 막는다', async () => {
    let resolve: () => void = () => undefined;
    const onSubmit = vi.fn().mockReturnValue(new Promise<void>((next) => { resolve = next; }));
    renderForm(onSubmit);
    save();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const button = screen.getByRole('button', { name: '만족도 저장 중…' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);

    resolve();
    await waitFor(() => expect(screen.getByRole('button', { name: '만족도 저장' })).toBeEnabled());
  });
});
