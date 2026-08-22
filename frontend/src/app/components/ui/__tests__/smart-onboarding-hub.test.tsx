import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SmartOnboardingHub } from '../smart-onboarding-hub';

const navigation = vi.hoisted(() => ({ pathname: '/admin/work-hub' }));

vi.unmock('@/components/ui/dialog');

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
}));

async function openFirstUseTour() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(2_000);
    await vi.advanceTimersByTimeAsync(100);
  });
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

  it('exposes an honestly labelled modal and moves focus inside on first use', async () => {
    render(
      <>
        <button type="button">배경 작업</button>
        <SmartOnboardingHub />
      </>,
    );
    const backgroundAction = screen.getByRole('button', { name: '배경 작업' });
    backgroundAction.focus();

    const dialog = await openFirstUseTour();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription();
    expect(dialog).not.toHaveTextContent(/AI|Intelligence|실시간 시스템 관측|안정적인 서비스 운영을 보장|워크플로우 프로세스 캔버스|하이크-데이터/);
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.queryByRole('button', { name: '배경 작업' })).not.toBeInTheDocument();
  });

  it('closes with Escape, records completion, and restores the previous focus', async () => {
    render(
      <>
        <button type="button">원래 작업</button>
        <SmartOnboardingHub />
      </>,
    );
    const originalAction = screen.getByRole('button', { name: '원래 작업' });
    originalAction.focus();
    await openFirstUseTour();

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' });
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('egov_smart_tour_v1')).toBe('true');
    expect(originalAction).toHaveFocus();
  });

  it('does not interrupt the authentication route', async () => {
    navigation.pathname = '/login';
    render(<SmartOnboardingHub />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
