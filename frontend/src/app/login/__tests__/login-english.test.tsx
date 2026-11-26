import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

// 실제 번역 런타임으로 영어 로그인 화면을 그린다(ADR-0063) — 공통 설정의 한국어 고정 대역을 푼다.
vi.unmock('use-intl');

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), user: null, loading: false }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/login',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
  useParams: () => ({}),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, exit: _exit, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, initial: _initial, animate: _animate, transition: _transition, exit: _exit, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => true,
}));

import LoginClient from '../LoginClient';
import { LocaleBoundary } from '@/i18n/LocaleBoundary';
import { messagesFor } from '@/i18n/messages';
import { ApplicationFrame } from '@/app/components/layout/ApplicationFrame';
import { Footer } from '@/app/components/layout/footer';

/**
 * 화면 완결성의 렌더 증거 — 영어로 그린 로그인 화면에 `lang="ko"` 표지 없는 한글이 남지 않는다. 글자뿐 아니라 보조기술이 읽는 속성
 * (aria-label·placeholder·title·alt)도 본다. 가져온 상수·다른 모듈의 문구처럼 소스 검사가 보지 못하는 경로를 여기서 잡는다.
 */
function unmarkedHangul(root: HTMLElement): string[] {
  const found: string[] = [];
  const language = (node: Element | null) => node?.closest('[lang]')?.getAttribute('lang') ?? document.documentElement.lang;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? '';
    if (/[가-힣]/.test(text) && language(node.parentElement) !== 'ko') found.push(`text: ${text.trim().slice(0, 40)}`);
  }
  for (const element of root.querySelectorAll('*')) {
    for (const attribute of ['aria-label', 'placeholder', 'title', 'alt']) {
      const value = element.getAttribute(attribute);
      if (value && /[가-힣]/.test(value) && language(element) !== 'ko') found.push(`${attribute}: ${value.slice(0, 40)}`);
    }
  }
  return found;
}

function englishLogin() {
  document.documentElement.lang = 'en';
  return render(
    <LocaleBoundary preferred="en" messages={messagesFor('en')} koreanMessages={messagesFor('ko')}>
      <ApplicationFrame header={null} sidebar={null} footer={<Footer />}>
        <LoginClient />
      </ApplicationFrame>
    </LocaleBoundary>,
  );
}

describe('영어 로그인 화면의 완결성 (ADR-0063)', () => {
  it('처음 그린 화면과 빈 제출 뒤의 오류까지 lang 표지 없는 한글이 없다', async () => {
    const { container } = englishLogin();
    expect(screen.getByRole('button', { name: /Sign in/ })).toBeInTheDocument();
    expect(unmarkedHangul(container)).toEqual([]);

    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    await waitFor(() => expect(screen.getByText('Enter your user ID.')).toBeInTheDocument());
    expect(screen.getByRole('alert')).toHaveTextContent(/2 input errors/);
    expect(unmarkedHangul(container)).toEqual([]);
  });

  afterEach(() => z.setErrorMap(undefined as never));

  it('비밀번호 길이 상한(전역 오류 맵의 한국어 문장)도 영어 화면에서는 영어 안내로 바꾼다', async () => {
    // 앱의 전역 오류 맵(providers.tsx)처럼 한국어 문장을 준다 — 영어 화면이 그 문장을 그대로 보이면 안 된다.
    z.setErrorMap((issue) => (issue.code === 'too_big' ? { message: '최대 128자 이하로 입력해야 합니다.' } : undefined));
    englishLogin();
    fireEvent.change(screen.getByLabelText(/User ID/), { target: { value: 'user01' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'x'.repeat(129) } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/ }));

    await waitFor(() => expect(screen.getByText('Password: enter up to 128 characters.')).toBeInTheDocument());
  });

  it('검사가 실제로 잡는다 — 표지 없는 한글을 넣으면 붉다', () => {
    const { container } = englishLogin();
    const leak = document.createElement('p');
    leak.textContent = '로그인';
    container.appendChild(leak);
    expect(unmarkedHangul(container)).toEqual(['text: 로그인']);
  });
});
