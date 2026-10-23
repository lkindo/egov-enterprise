import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 운영 화면의 상단 고정 바꾸기(ADR-0040 결정 5·6, §5.4, D-12).
 *
 * 검증 축: ① 고정할 때 고른 종료일만 yyyyMMdd 로 보내고, 비우면 보내지 않아 서버가 기본 일수로 정한다(화면은 날짜를 계산하지 않고 그렇게
 * 말한다) ② 해제에는 종료일을 보내지 않는다 ③ 고정을 받지 않는 게시판에서는 새 고정·종료일 변경을 막고 해제만 연다 ④ 서버의 고정 종료일
 * 사유는 그 칸에, 상한·설정 사유는 대화상자 알림으로 보이고 대화상자를 남긴다 ⑤ 같은 틱 제출은 한 번이다. 버전은 보내지 않는다(고정은
 * 게시글 버전을 올리지 않는다).
 */
const mocks = vi.hoisted(() => ({ updatePostPin: vi.fn(), toast: vi.fn() }));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({
  boardAdminService: { updatePostPin: mocks.updatePostPin },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

import { BoardPostPinDialog } from '../BoardPostPinDialog';

const PLAIN = {
  pstSn: 7, bbsId: 'BBSMSTR_AAAAAAAAAAAA', pstTtl: '연차 안내', pstCn: '', useYn: 'Y', userId: 'u',
  postingStatus: 'POSTING' as const, version: 3, pinned: false,
};
const PINNED = { ...PLAIN, pinned: true, upendFixEndYmd: '20261130' };

function renderDialog(post: Record<string, unknown> = PLAIN, pinAllowed = true) {
  const handlers = { onClose: vi.fn(), onSaved: vi.fn() };
  render(<BoardPostPinDialog bbsId="BBSMSTR_AAAAAAAAAAAA" post={post as never} pinAllowed={pinAllowed} defaultDays={30} {...handlers} />);
  return handlers;
}

const pinSwitch = () => screen.getByRole('switch', { name: '상단 고정' });
const endDate = () => screen.getByLabelText('고정 종료일');
const save = () => screen.getByRole('button', { name: '상단 고정 저장' });
const afterCell = () => within(screen.getByRole('row', { name: /^상단 고정/ })).getAllByRole('cell')[1];

describe('BoardPostPinDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updatePostPin.mockResolvedValue(undefined);
  });

  it('고정 종료일을 비우고 고정하면 날짜를 보내지 않고, 서버가 기본 일수로 정한다고 말한다', async () => {
    const { onSaved, onClose } = renderDialog();
    expect(pinSwitch()).not.toBeChecked();
    expect(save()).toBeDisabled();
    fireEvent.click(pinSwitch());
    expect(endDate()).toHaveValue('');
    expect(screen.getByText('비우면 오늘부터 30일 뒤까지(서버가 정함). 그날까지 고정합니다.')).toBeInTheDocument();
    expect(afterCell()).toHaveTextContent('고정 · 오늘부터 30일 뒤까지(서버가 정함)');
    fireEvent.click(save());

    await waitFor(() => expect(mocks.updatePostPin).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { upendFixYn: 'Y' }));
    expect(mocks.toast).toHaveBeenCalledWith('[연차 안내] 글을 상단에 고정했습니다.', 'success');
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('고른 고정 종료일은 yyyyMMdd 로 보내고 버전은 보내지 않는다', async () => {
    renderDialog();
    fireEvent.click(pinSwitch());
    fireEvent.change(endDate(), { target: { value: '2026-12-31' } });
    expect(afterCell()).toHaveTextContent('고정 · ~2026-12-31');
    fireEvent.click(save());
    await waitFor(() => expect(mocks.updatePostPin).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { upendFixYn: 'Y', upendFixEndYmd: '20261231' }));
  });

  it('고정 중인 글은 지금 종료일을 보이고, 끄면 종료일 없이 해제로 보낸다', async () => {
    renderDialog(PINNED);
    expect(pinSwitch()).toBeChecked();
    expect(endDate()).toHaveValue('2026-11-30');
    expect(within(screen.getByRole('row', { name: /^상단 고정/ })).getAllByRole('cell')[0]).toHaveTextContent('고정 · ~2026-11-30');
    fireEvent.click(pinSwitch());
    expect(screen.queryByLabelText('고정 종료일')).toBeNull();
    expect(afterCell()).toHaveTextContent('고정 안 함');
    fireEvent.click(save());
    await waitFor(() => expect(mocks.updatePostPin).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { upendFixYn: 'N' }));
    expect(mocks.toast).toHaveBeenCalledWith('[연차 안내] 상단 고정을 해제했습니다.', 'success');
  });

  it('고정 중인 글의 종료일만 바꾸면 고정으로 새 종료일을 보낸다', async () => {
    renderDialog(PINNED);
    fireEvent.change(endDate(), { target: { value: '2027-01-15' } });
    fireEvent.click(save());
    await waitFor(() => expect(mocks.updatePostPin).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { upendFixYn: 'Y', upendFixEndYmd: '20270115' }));
    expect(mocks.toast).toHaveBeenCalledWith('[연차 안내] 상단 고정 종료일을 바꿨습니다.', 'success');
  });

  it('고정을 받지 않는 게시판에서는 새 고정을 막는다', () => {
    renderDialog(PLAIN, false);
    expect(screen.getByRole('note')).toHaveTextContent('이 게시판은 상단 고정을 받지 않습니다');
    expect(pinSwitch()).toBeDisabled();
    expect(save()).toBeDisabled();
  });

  it('고정을 받지 않는 게시판에서도 고정 중인 글은 해제할 수 있고 종료일은 바꿀 수 없다', async () => {
    renderDialog(PINNED, false);
    expect(pinSwitch()).not.toBeDisabled();
    expect(endDate()).toBeDisabled();
    fireEvent.click(pinSwitch());
    fireEvent.click(save());
    await waitFor(() => expect(mocks.updatePostPin).toHaveBeenCalledWith('BBSMSTR_AAAAAAAAAAAA', 7, { upendFixYn: 'N' }));
  });

  it('서버의 고정 종료일 사유는 그 칸에 붙인다 — 화면은 오늘을 계산하지 않는다', async () => {
    mocks.updatePostPin.mockRejectedValueOnce({ response: { status: 400, data: { message: '고정 종료일은 오늘이나 그 뒤로 정해 주세요.' } } });
    const { onClose } = renderDialog();
    fireEvent.click(pinSwitch());
    fireEvent.change(endDate(), { target: { value: '2020-01-01' } });
    fireEvent.click(save());
    await waitFor(() => expect(endDate()).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getAllByText('고정 종료일은 오늘이나 그 뒤로 정해 주세요.').length).toBeGreaterThan(0);
    expect(onClose).not.toHaveBeenCalled();
    expect(endDate()).toHaveValue('2020-01-01');
  });

  it('상한 초과처럼 글 전체에 걸린 서버 사유는 알림으로 보이고 대화상자를 남긴다', async () => {
    mocks.updatePostPin.mockRejectedValueOnce({ response: { status: 400, data: {
      message: '이 게시판은 상단 고정을 최대 5건까지 둡니다(지금 5건). 다른 고정을 해제하거나 상한을 올린 뒤 다시 고정해 주세요.',
    } } });
    const { onClose, onSaved } = renderDialog();
    fireEvent.click(pinSwitch());
    fireEvent.click(save());
    expect(await screen.findByRole('alert')).toHaveTextContent('이 게시판은 상단 고정을 최대 5건까지 둡니다(지금 5건).');
    expect(onClose).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(pinSwitch()).toBeChecked();
  });

  it('같은 틱의 두 번째 저장은 보내지 않고 저장 중에는 단추를 잠근다', async () => {
    let resolveWrite!: () => void;
    mocks.updatePostPin.mockReturnValueOnce(new Promise<void>((resolve) => { resolveWrite = resolve; }));
    renderDialog();
    fireEvent.click(pinSwitch());
    const form = save().closest('form')!;
    act(() => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    await waitFor(() => expect(mocks.updatePostPin).toHaveBeenCalledTimes(1));
    const pending = screen.getByRole('button', { name: '상단 고정 저장 중…' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolveWrite());
  });
});
