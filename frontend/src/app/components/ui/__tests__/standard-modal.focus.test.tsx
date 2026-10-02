import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { StandardModal } from '../standard-modal';
import { ConfirmProvider } from '../confirm-modal';

vi.unmock('@/components/ui/dialog');
vi.unmock('@/app/components/ui/confirm-modal');

function ControlledModal() {
  const [open, setOpen] = useState(false);
  return <ConfirmProvider>
    <button onClick={() => setOpen(true)}>과업 편집 열기</button>
    <StandardModal isOpen={open} onClose={() => setOpen(false)} title="과업 편집">
      <form>
        <label htmlFor="focus-task-title">과업 제목</label>
        <input id="focus-task-title" name="title" aria-label="과업 제목" />
        <button type="button">편집 완료</button>
      </form>
    </StandardModal>
  </ConfirmProvider>;
}

describe('controlled modal keyboard focus with real Radix', () => {
  it('starts at the title and keeps forward and reverse Tab inside the modal', async () => {
    const user = userEvent.setup(); render(<ControlledModal />);
    const invoker = screen.getByRole('button', { name: '과업 편집 열기' });
    await user.tab(); await user.keyboard('{Enter}');
    const dialog = screen.getByRole('dialog', { name: '과업 편집' });
    const title = within(dialog).getByRole('heading', { name: '과업 편집' });
    await waitFor(() => expect(title).toHaveFocus());
    await user.tab({ shift: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    await user.tab(); expect(within(dialog).getByRole('button', { name: '닫기' })).toHaveFocus();
    await user.tab(); expect(within(dialog).getByRole('textbox', { name: '과업 제목' })).toHaveFocus();
    await user.tab(); expect(within(dialog).getByRole('button', { name: '편집 완료' })).toHaveFocus();
    await user.tab(); expect(within(dialog).getByRole('button', { name: '닫기' })).toHaveFocus();
    await user.tab({ shift: true }); expect(within(dialog).getByRole('button', { name: '편집 완료' })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(invoker).toHaveFocus());
  });

  it('Escape returns focus to the keyboard invoker when the form is clean', async () => {
    const user = userEvent.setup(); render(<ControlledModal />);
    const invoker = screen.getByRole('button', { name: '과업 편집 열기' });
    await user.tab(); expect(invoker).toHaveFocus(); await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: '과업 편집' })).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '과업 편집' })).not.toBeInTheDocument());
    await waitFor(() => expect(invoker).toHaveFocus());
  });

  it('continuing a dirty close keeps the form and input; discarding restores the original invoker', async () => {
    const user = userEvent.setup(); render(<ControlledModal />);
    const invoker = screen.getByRole('button', { name: '과업 편집 열기' });
    await user.tab(); await user.keyboard('{Enter}');
    const input = screen.getByRole('textbox', { name: '과업 제목' });
    await user.tab(); await user.type(input, '보존할 제목'); await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: '저장하지 않은 변경' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: '계속 편집' }));
    expect(screen.getByRole('dialog', { name: '과업 편집' })).toBeVisible(); expect(input).toHaveValue('보존할 제목');
    await user.keyboard('{Escape}'); await user.click(screen.getByRole('button', { name: '변경 버리고 닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '과업 편집' })).not.toBeInTheDocument());
    await waitFor(() => expect(invoker).toHaveFocus());
  });
});
