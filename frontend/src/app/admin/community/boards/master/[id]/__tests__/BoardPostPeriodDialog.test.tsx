import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 운영 화면의 일정 바꾸기(ADR-0040 결정 3·10, D12·D-11·D-13).
 *
 * 검증 축: ① 바꾼 날짜만 yyyyMMdd 로, 읽은 버전과 함께 보낸다 ② 시작≤종료·이미 있는 날짜 비우기는 보내지 않는다 ③ 게시 중인 글의 시작일을
 * 바꾸면 숨겨질 수 있음을 확인받는다 ④ 409 는 덮어쓰지 않았다고 알리고 목록을 다시 읽게 하며 입력과 대화상자를 남긴다 ⑤ 서버의 게시 기간
 * 사유는 그 날짜 칸에 붙인다 ⑥ 같은 틱 제출은 한 번이다. 오늘과의 비교는 화면이 하지 않는다 — 서버 사유로만 보인다.
 */
const mocks = vi.hoisted(() => ({ updatePostPeriod: vi.fn(), toast: vi.fn() }));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { updatePostPeriod: mocks.updatePostPeriod },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { BoardPostPeriodDialog } from '../BoardPostPeriodDialog';

const POSTING = {
  pstSn: 7, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: '연차 안내', pstCn: '', useYn: 'Y', userId: 'u',
  pstBgngYmd: '20261001', pstEndYmd: '20261231', postingStatus: 'POSTING' as const, version: 3,
};

function renderDialog(post: Record<string, unknown> = POSTING, reservationClosed = false) {
  const handlers = { onClose: vi.fn(), onSaved: vi.fn(), onConflict: vi.fn() };
  render(<BoardPostPeriodDialog bbsId="BBSMSTR_AAAAAAAAAAAA" post={post as never} reservationClosed={reservationClosed} {...handlers} />);
  return handlers;
}

const begin = () => screen.getByLabelText('게시 시작일');
const end = () => screen.getByLabelText('게시 종료일');
const save = () => screen.getByRole('button', { name: '일정 저장' });

describe('BoardPostPeriodDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updatePostPeriod.mockResolvedValue(undefined);
  });

  it('지금 값을 보이고, 바꾼 날짜만 읽은 버전과 함께 보낸다', async () => {
    const { onSaved, onClose } = renderDialog();
    expect(begin()).toHaveValue('2026-10-01');
    expect(end()).toHaveValue('2026-12-31');
    expect(save()).toBeDisabled();

    fireEvent.change(end(), { target: { value: '2027-01-31' } });
    expect(screen.getByRole('row', { name: /게시 종료일/ })).toHaveTextContent('2026-12-312027-01-31');
    fireEvent.click(save());

    await waitFor(() => expect(mocks.updatePostPeriod).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { pstEndYmd: '20270131', version: 3 }));
    expect(mocks.toast).toHaveBeenCalledWith('[연차 안내] 게시 기간을 바꿨습니다.', 'success');
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('종료일이 시작일보다 앞이면 보내지 않고 종료일 칸에 알린다', async () => {
    renderDialog();
    fireEvent.change(end(), { target: { value: '2026-09-01' } });
    fireEvent.click(save());
    expect(await screen.findByText('종료일은 시작일과 같거나 뒤여야 합니다.')).toBeInTheDocument();
    expect(end()).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.updatePostPeriod).not.toHaveBeenCalled();
  });

  it('이미 있는 종료일은 여기서 비우지 않는다 — 해제는 일괄 처리로 안내한다(D-13)', async () => {
    renderDialog();
    fireEvent.change(end(), { target: { value: '' } });
    fireEvent.click(save());
    expect((await screen.findAllByText(/기한을 없애려면 목록에서 글을 고른 뒤 ‘종료일 해제하기’를 쓰세요/)).length).toBeGreaterThan(0);
    expect(end()).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.updatePostPeriod).not.toHaveBeenCalled();
  });

  it('게시 중인 글의 시작일을 바꾸면 숨겨질 수 있음을 확인받은 뒤에만 보낸다', async () => {
    renderDialog();
    fireEvent.change(begin(), { target: { value: '2026-11-15' } });
    fireEvent.click(save());
    expect(await screen.findByText('시작일을 바꾸면 그날까지 이용자에게 숨겨질 수 있습니다. 확인란을 선택해 주세요.')).toBeInTheDocument();
    expect(mocks.updatePostPeriod).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox', { name: /시작일을 오늘보다 뒤로 정하면 그날까지 이용자에게 숨겨집니다/ }));
    fireEvent.click(save());
    await waitFor(() => expect(mocks.updatePostPeriod).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { pstBgngYmd: '20261115', version: 3 }));
  });

  it('예약 글은 시작일을 오늘로 당기는 데 확인을 받지 않는다', async () => {
    renderDialog({ ...POSTING, pstBgngYmd: '20261201', postingStatus: 'SCHEDULED' });
    fireEvent.change(begin(), { target: { value: '2026-10-23' } });
    expect(screen.queryByRole('checkbox')).toBeNull();
    fireEvent.click(save());
    await waitFor(() => expect(mocks.updatePostPeriod).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { pstBgngYmd: '20261023', version: 3 }));
  });

  it('다른 사람이 먼저 고쳤으면(409) 덮어쓰지 않았다고 알리고 목록을 다시 읽게 하며 입력과 대화상자를 남긴다', async () => {
    mocks.updatePostPeriod.mockRejectedValueOnce({ response: { status: 409, data: { message: '다른 사용자가 먼저 수정했습니다.' } } });
    const { onConflict, onClose, onSaved } = renderDialog();
    fireEvent.change(end(), { target: { value: '2027-01-31' } });
    fireEvent.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('다른 사용자가 먼저 이 글을 고쳐 저장하지 않았습니다');
    expect(onConflict).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(end()).toHaveValue('2027-01-31');
  });

  it('서버의 게시 기간 사유는 그 날짜 칸에 붙인다 — 화면은 오늘을 계산하지 않는다', async () => {
    mocks.updatePostPeriod.mockRejectedValueOnce({ response: { status: 400, data: {
      message: '이 게시판은 예약 게시를 받지 않습니다. 게시 시작일은 오늘이나 그 이전으로 정해 주세요.',
    } } });
    renderDialog({ ...POSTING, postingStatus: 'ENDED' }, true);
    expect(screen.getByText(/이 게시판은 예약 게시를 받지 않아 시작일을 오늘보다 뒤로 바꿀 수 없습니다/)).toBeInTheDocument();
    fireEvent.change(begin(), { target: { value: '2026-11-30' } });
    fireEvent.click(save());
    await waitFor(() => expect(begin()).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getAllByText('이 게시판은 예약 게시를 받지 않습니다. 게시 시작일은 오늘이나 그 이전으로 정해 주세요.').length).toBeGreaterThan(0);
  });

  it('같은 틱의 두 번째 저장은 보내지 않고 저장 중에는 단추를 잠근다', async () => {
    let resolveWrite!: () => void;
    mocks.updatePostPeriod.mockReturnValueOnce(new Promise<void>((resolve) => { resolveWrite = resolve; }));
    renderDialog();
    fireEvent.change(end(), { target: { value: '2027-01-31' } });
    const form = save().closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await waitFor(() => expect(mocks.updatePostPeriod).toHaveBeenCalledTimes(1));
    const pending = screen.getByRole('button', { name: '일정 저장 중…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolveWrite());
  });
});
