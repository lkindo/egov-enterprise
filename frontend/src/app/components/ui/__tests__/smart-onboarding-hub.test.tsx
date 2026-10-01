import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SmartOnboardingHub } from '../smart-onboarding-hub';
import { requestOnboarding } from '@/lib/navigation/onboarding-bridge';

const navigation = vi.hoisted(() => ({ pathname: '/admin/work-hub' }));

vi.unmock('@/components/ui/dialog');

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

/**
 * [2026-10-01] 사용 안내는 저절로 모달로 열리지 않는다 — 종전에는 첫 방문 2초 뒤 모달이 하던 일의 포커스를 가져갔다.
 * 처음 온 사용자에게는 포커스를 가져가지 않는 배너만 보이고, 안내는 배너나 계정 메뉴의 '사용 안내' 로 연다.
 */
async function openFromBanner() {
  fireEvent.click(screen.getByRole('button', { name: '사용 안내 보기' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(100); });
  return screen.getByRole('dialog', { name: '업무 포털 둘러보기' });
}

describe('SmartOnboardingHub', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    navigation.pathname = '/admin/work-hub';
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('첫 방문에도 모달을 저절로 열지 않고 포커스를 가져가지 않는 배너만 보인다', async () => {
    render(
      <>
        <button type="button">배경 작업</button>
        <SmartOnboardingHub />
      </>,
    );
    const backgroundAction = screen.getByRole('button', { name: '배경 작업' });
    backgroundAction.focus();
    await act(async () => { await vi.advanceTimersByTimeAsync(5_000); });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '사용 안내' })).toBeInTheDocument();
    expect(backgroundAction).toHaveFocus();
  });

  it('배너에서 연 안내는 정직한 이름의 모달이고, 축소 프로필에 없는 고객지원을 안내하지 않는다', async () => {
    render(
      <>
        <button type="button">배경 작업</button>
        <SmartOnboardingHub />
      </>,
    );
    const dialog = await openFromBanner();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription();
    expect(dialog).not.toHaveTextContent(/AI|Intelligence|실시간 시스템 관측|고객지원/);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(dialog.className).toContain('overflow-y-auto');
  });

  it('Escape 로 닫으면 완료를 기록하고 원래 포커스로 돌아가며, 배너도 다시 보이지 않는다', async () => {
    render(
      <>
        <button type="button">원래 작업</button>
        <SmartOnboardingHub />
      </>,
    );
    const originalAction = screen.getByRole('button', { name: '원래 작업' });
    originalAction.focus();
    await openFromBanner();

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('egov_smart_tour_v1')).toBe('true');
    expect(originalAction).toHaveFocus();
    expect(screen.queryByRole('region', { name: '사용 안내' })).not.toBeInTheDocument();
  });

  it('계정 메뉴의 사용 안내 요청으로 이미 본 사용자도 다시 연다', async () => {
    localStorage.setItem('egov_smart_tour_v1', 'true');
    render(<SmartOnboardingHub />);
    expect(screen.queryByRole('region', { name: '사용 안내' })).not.toBeInTheDocument();

    act(() => requestOnboarding());
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByRole('dialog', { name: '업무 포털 둘러보기' })).toBeInTheDocument();
  });

  it('인증 화면에서는 배너도 두지 않는다', async () => {
    navigation.pathname = '/login';
    render(<SmartOnboardingHub />);
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '사용 안내' })).not.toBeInTheDocument();
  });
});
