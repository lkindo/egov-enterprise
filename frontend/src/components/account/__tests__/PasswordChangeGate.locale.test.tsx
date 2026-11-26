import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// 실제 번역 런타임으로 본다(ADR-0063) — 공통 설정의 한국어 고정 대역을 푼다.
vi.unmock('use-intl');

const mocks = vi.hoisted(() => ({
  user: { id: 'user1', name: '사용자', passwordChangeRequired: true as const },
  refresh: vi.fn(),
  pathname: '/login',
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, logout: vi.fn() }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/business/user/userService', () => ({ userService: { changePassword: vi.fn() } }));
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

import { PasswordChangeGate } from '../PasswordChangeGate';
import { LocaleBoundary } from '@/i18n/LocaleBoundary';
import { messagesFor } from '@/i18n/messages';
import { effectiveBrowserLocale } from '@/i18n/surfaces';

afterEach(() => {
  mocks.refresh.mockClear();
  mocks.pathname = '/login';
  window.history.replaceState({}, '', '/');
  document.documentElement.lang = 'ko';
  document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
});

/**
 * 임시 비밀번호 관문은 아직 한국어로만 제공한다. 번역을 마친 경로(/login)에서 열려도 경로가 아니라 이 화면으로 판정한다 —
 * 영어를 고른 사용자에게도 문서 언어·폼 검증 문구·API 언어가 한국어이고, 그 사실을 영어로 한 줄 알린다(Codex 2차 검토 반례).
 */
describe('PasswordChangeGate 화면 로케일 (ADR-0063)', () => {
  it('영어를 고른 사용자가 /login 에서 관문을 만나도 한국어 화면으로 그리고 검증 오류도 한국어다', async () => {
    document.cookie = 'NEXT_LOCALE=en; path=/';
    window.history.replaceState({}, '', '/login');
    render(
      <LocaleBoundary preferred="en" messages={messagesFor('en')} koreanMessages={messagesFor('ko')}>
        <PasswordChangeGate><p>Sign in</p></PasswordChangeGate>
      </LocaleBoundary>,
    );

    expect(screen.getByRole('main')).toHaveAttribute('lang', 'ko');
    await waitFor(() => expect(document.documentElement.lang).toBe('ko'));
    expect(screen.getByTestId('korean-only-notice')).toHaveTextContent('This page is available in Korean only.');
    expect(effectiveBrowserLocale(), '관문에서 보내는 요청도 한국어 문구를 받는다').toBe('ko');

    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => expect(screen.getByText('현재 비밀번호를 입력해 주세요.', { selector: 'p' })).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/입력 오류 3개/);
    expect(document.body.textContent).not.toMatch(/enter at least|input errors|\(required\)/);
  });

  it('열려 있던 번역 화면 위에 관문이 나중에 나타나면 서버 렌더를 한 번 다시 받아 그 경로의 문서 제목이 관문을 반영한다', async () => {
    window.history.replaceState({}, '', '/login');
    render(
      <LocaleBoundary preferred="en" messages={messagesFor('en')} koreanMessages={messagesFor('ko')}>
        <PasswordChangeGate><p>Sign in</p></PasswordChangeGate>
      </LocaleBoundary>,
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it('번역을 마치지 않은 경로(제목이 이미 한국어)나 한국어를 고른 경우에는 다시 받지 않는다', async () => {
    mocks.pathname = '/search';
    window.history.replaceState({}, '', '/search');
    const untranslated = render(
      <LocaleBoundary preferred="en" messages={messagesFor('en')} koreanMessages={messagesFor('ko')}>
        <PasswordChangeGate><p>업무</p></PasswordChangeGate>
      </LocaleBoundary>,
    );
    await waitFor(() => expect(document.documentElement.lang).toBe('ko'));
    untranslated.unmount();
    mocks.pathname = '/login';
    render(
      <LocaleBoundary preferred="ko" messages={messagesFor('ko')}>
        <PasswordChangeGate><p>로그인</p></PasswordChangeGate>
      </LocaleBoundary>,
    );
    await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument());
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it('관문이 사라지면 문서 언어·요청 언어·안내가 로그인 화면(영어)으로 돌아가고, 탭 제목은 건드리지 않는다(경로 메타데이터가 정한다)', async () => {
    document.cookie = 'NEXT_LOCALE=en; path=/';
    window.history.replaceState({}, '', '/login');
    document.title = 'Sign in | test';
    const view = render(
      <LocaleBoundary preferred="en" messages={messagesFor('en')} koreanMessages={messagesFor('ko')}>
        <PasswordChangeGate><p>Sign in</p></PasswordChangeGate>
      </LocaleBoundary>,
    );
    await waitFor(() => expect(document.documentElement.lang).toBe('ko'));
    expect(document.title).toBe('Sign in | test');

    mocks.user = { ...mocks.user, passwordChangeRequired: undefined as never };
    view.rerender(
      <LocaleBoundary preferred="en" messages={messagesFor('en')} koreanMessages={messagesFor('ko')}>
        <PasswordChangeGate><p>Sign in</p></PasswordChangeGate>
      </LocaleBoundary>,
    );

    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    expect(document.title).toBe('Sign in | test');
    expect(screen.queryByTestId('korean-only-notice')).toBeNull();
    expect(effectiveBrowserLocale()).toBe('en');
    mocks.user = { id: 'user1', name: '사용자', passwordChangeRequired: true };
  });
});
