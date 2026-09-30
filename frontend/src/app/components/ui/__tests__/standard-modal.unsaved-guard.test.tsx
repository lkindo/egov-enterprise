import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDirtyCloseGuard } from '@/hooks/useDirtyCloseGuard';
import { StandardModal } from '../standard-modal';

const mocks = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

/**
 * [2026-10-01] 모달의 사고성 닫기(Esc·배경·X) 보호.
 *
 * 화면이 dirty 를 계산해 넘기는 `useDirtyCloseGuard` 는 9곳만 쓰고 있었다. 나머지 폼 모달 약 20곳은 Esc 한 번에
 * 입력이 경고 없이 사라졌다. StandardModal 이 "연 뒤로 폼에 입력이 있었는가" 를 직접 보고 닫기 전에 확인한다.
 */
function FormModal({ onClose, isOpen = true }: { onClose: () => void; isOpen?: boolean }) {
  return (
    <StandardModal isOpen={isOpen} onClose={onClose} title="등록">
      <form>
        <label>
          이름
          <input name="name" />
        </label>
      </form>
    </StandardModal>
  );
}

describe('StandardModal 미저장 닫기 보호', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
  });

  it('폼에 입력한 뒤 Esc 로 닫으면 먼저 확인하고, 계속 편집을 고르면 닫지 않는다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    mocks.confirm.mockResolvedValue(false);
    render(<FormModal onClose={onClose} />);

    await user.type(screen.getByRole('textbox', { name: '이름' }), '홍길동');
    await user.keyboard('{Escape}');

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '저장하지 않은 변경',
      confirmText: '변경 버리고 닫기',
      cancelText: '계속 편집',
    }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: '이름' })).toHaveValue('홍길동');
  });

  it('변경 버리고 닫기를 고르면 닫는다 — X 버튼과 배경 클릭도 같은 확인을 거친다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FormModal onClose={onClose} />);
    await user.type(screen.getByRole('textbox', { name: '이름' }), '홍');

    await user.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);

    const backdrop = screen.getByRole('dialog', { name: '등록' }).parentElement?.firstElementChild;
    fireEvent.pointerDown(backdrop as Element, { button: 0, ctrlKey: false });
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(2));
  });

  it('입력이 없으면 확인 없이 바로 닫는다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<FormModal onClose={onClose} />);

    screen.getByRole('textbox', { name: '이름' }).focus();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('조회 조건(role="search")의 입력은 저장할 변경이 아니다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <StandardModal isOpen onClose={onClose} title="회원 관리">
        <form role="search">
          <label>
            검색어
            <input name="keyword" />
          </label>
        </form>
      </StandardModal>,
    );

    await user.type(screen.getByLabelText('검색어'), '홍');
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('저장하고 닫은 뒤 다시 열면 앞선 입력을 미저장으로 세지 않는다', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const view = render(<FormModal onClose={onClose} />);
    await user.type(screen.getByRole('textbox', { name: '이름' }), '홍길동');

    // 화면이 저장에 성공해 스스로 닫는다 — 닫기 요청이 아니므로 확인하지 않는다.
    view.rerender(<FormModal onClose={onClose} isOpen={false} />);
    expect(mocks.confirm).not.toHaveBeenCalled();

    view.rerender(<FormModal onClose={onClose} />);
    screen.getByRole('textbox', { name: '이름' }).focus();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).not.toHaveBeenCalled();
  });

  it('화면이 useDirtyCloseGuard 로 이미 확인을 걸었으면 한 번만 묻는다', async () => {
    const close = vi.fn();
    const user = userEvent.setup();
    function Guarded() {
      const [dirty, setDirty] = useState(false);
      const requestClose = useDirtyCloseGuard(dirty, close);
      return (
        <StandardModal isOpen onClose={requestClose} title="수정">
          <form>
            <label>
              제목
              <input name="title" onChange={() => setDirty(true)} />
            </label>
          </form>
        </StandardModal>
      );
    }
    render(<Guarded />);
    await user.type(screen.getByRole('textbox', { name: '제목' }), '가');

    await act(async () => { await user.keyboard('{Escape}'); });

    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });
});
