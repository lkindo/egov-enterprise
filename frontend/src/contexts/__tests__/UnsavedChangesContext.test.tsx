import { useContext, useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { UnsavedChangesProvider, useUnsavedChanges } from '../UnsavedChangesContext';

const mocks = vi.hoisted(() => ({ confirm: vi.fn(), toast: vi.fn() }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
const router = { bfcacheId: 'test-page', push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() };

function Editor({ pending = false }: { pending?: boolean }) {
  const [value, setValue] = useState('');
  const guardedRouter = useContext(AppRouterContext)!;
  const navigate = useUnsavedChanges({ dirty: Boolean(value), pending });
  return <>
    <input aria-label="편집" value={value} onChange={(event) => setValue(event.target.value)} />
    <button onClick={() => guardedRouter.push('/destination')}>화면 이동</button>
    <button onClick={() => guardedRouter.replace('/replacement', { scroll: false })}>탭 이동</button>
    <button onClick={() => void navigate(() => setValue(''))}>선택 변경</button>
    <a href="/linked">다른 화면</a><a href="#section">본문 이동</a><a href="/linked" target="_blank">새 창</a>
  </>;
}
function setup(pending = false) {
  return render(<AppRouterContext.Provider value={router}><UnsavedChangesProvider><Editor pending={pending} /></UnsavedChangesProvider></AppRouterContext.Provider>);
}
const edit = () => fireEvent.change(screen.getByRole('textbox'), { target: { value: '저장 전 내용' } });

describe('unsaved changes: navigation before unmount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(false);
    history.replaceState({ __NA: true, privateNextField: 'preserve' }, '', '/editing');
  });

  it('allows clean routes, blocks cancellation, and performs an approved push once', async () => {
    setup();
    fireEvent.click(screen.getByText('화면 이동'));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).not.toHaveBeenCalled();
    edit();
    fireEvent.click(screen.getByText('화면 이동'));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('textbox')).toHaveValue('저장 전 내용');
    mocks.confirm.mockResolvedValue(true);
    fireEvent.click(screen.getByText('화면 이동'));
    await waitFor(() => expect(router.push).toHaveBeenCalledTimes(2));
  });

  it('protects router.replace and local selections with the same confirmation', async () => {
    setup(); edit();
    fireEvent.click(screen.getByText('탭 이동'));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(router.replace).not.toHaveBeenCalled();
    mocks.confirm.mockResolvedValue(true);
    fireEvent.click(screen.getByText('선택 변경'));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    fireEvent.click(screen.getByText('탭 이동'));
    expect(router.replace).toHaveBeenCalledWith('/replacement', { scroll: false });
  });

  it('blocks navigation during a write even when there is no dirty value', () => {
    setup(true);
    fireEvent.click(screen.getByText('화면 이동'));
    expect(router.push).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('저장 중'), 'info');
  });

  it('does not queue multiple transitions while a confirmation is open', async () => {
    let finish!: (value: boolean) => void;
    mocks.confirm.mockImplementation(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    setup(); edit();
    fireEvent.click(screen.getByText('화면 이동'));
    fireEvent.click(screen.getByText('탭 이동'));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await act(async () => finish(true));
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('intercepts internal links but leaves in-page, new-tab and modified clicks alone', async () => {
    setup(); edit();
    fireEvent.click(screen.getByText('본문 이동'));
    fireEvent.click(screen.getByText('새 창'));
    fireEvent.click(screen.getByText('다른 화면'), { ctrlKey: true });
    expect(mocks.confirm).not.toHaveBeenCalled();
    mocks.confirm.mockResolvedValue(true);
    fireEvent.click(screen.getByText('다른 화면'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/linked'));
  });

  it('warns on reload only while dirty or pending and unregisters on unmount', () => {
    const view = setup();
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean); expect(clean.defaultPrevented).toBe(false);
    edit();
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty); expect(dirty.defaultPrevented).toBe(true);
    view.unmount();
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after); expect(after.defaultPrevented).toBe(false);
  });

  it('restores browser Back before confirmation, preserving Next state and the edited page on cancel', async () => {
    setup();
    history.pushState({ __NA: true, privateNextField: 'retained' }, '', '/second');
    edit();
    const visiblePop = vi.fn();
    window.addEventListener('popstate', visiblePop);
    try {
      history.back();
      await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
      expect(location.pathname).toBe('/second');
      expect(history.state).toMatchObject({ __NA: true, privateNextField: 'retained' });
      expect(visiblePop).not.toHaveBeenCalled();
      expect(screen.getByRole('textbox')).toHaveValue('저장 전 내용');
      mocks.confirm.mockResolvedValue(true);
      history.back();
      await waitFor(() => expect(location.pathname).toBe('/editing'));
      await waitFor(() => expect(visiblePop).toHaveBeenCalledTimes(1));
    } finally { window.removeEventListener('popstate', visiblePop); }
  });
});
