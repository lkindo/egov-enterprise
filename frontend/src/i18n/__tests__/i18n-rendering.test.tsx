import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { ReactNode } from 'react';

// 이 파일은 실제 번역 런타임을 본다 — 공통 설정의 한국어 고정 대역을 푼다.
vi.unmock('use-intl');
// 전역 알림을 실제 토스트 공급자로 본다(공통 설정은 토스트 모듈을 대역으로 바꿔 둔다).
vi.unmock('@/app/components/ui/toast');

const nav = vi.hoisted(() => ({ pathname: '/login', refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: nav.refresh }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const sonner = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), sonner) }));

import { I18nProvider } from '../I18nProvider';
import { LocaleBoundary } from '../LocaleBoundary';
import { messagesFor } from '../messages';
import { catalogKey } from '../catalog';
import type { AppLocale } from '../locales';
import { ApplicationFrame } from '@/app/components/layout/ApplicationFrame';
import { LocaleSwitcher } from '@/app/components/layout/LocaleSwitcher';
import { FormErrorSummary } from '@/components/ui/form';
import { ToastProvider } from '@/app/components/ui/toast';
import { useManualFormValidation } from '@/hooks/useManualFormValidation';
import { useTranslations } from 'use-intl';

/** 루트 레이아웃처럼 감싼다 — 고른 로케일이 한국어가 아니면 한국어 카탈로그도 넘긴다. */
function Boundary({ preferred, children }: { preferred: AppLocale; children: ReactNode }) {
  return (
    <LocaleBoundary preferred={preferred} messages={messagesFor(preferred)} koreanMessages={preferred === 'ko' ? undefined : messagesFor('ko')}>
      {children}
    </LocaleBoundary>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return <ApplicationFrame header={<header>H</header>} sidebar={<nav>S</nav>} footer={<footer>F</footer>}>{children}</ApplicationFrame>;
}

afterEach(() => {
  document.documentElement.lang = 'ko';
  nav.refresh.mockClear();
  z.setErrorMap(undefined as never);
});

/** 화면 로케일(ADR-0063) — 번역을 마친 화면만 영어로, 나머지는 한국어로 그리고 문서 언어를 한국어로 둔다. */
describe('i18n 렌더링', () => {
  it('영어 로케일의 번역 화면(로그인)은 틀의 고정 문구를 영어로 그리고 문서 언어를 영어로 둔다', () => {
    nav.pathname = '/login';
    render(<Boundary preferred="en"><Frame><FormErrorSummary errors={{ userId: 'X' }} labels={{ userId: 'ID' }} /></Frame></Boundary>);
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(screen.queryByTestId('korean-only-notice')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('1 input error — Check what you entered.');
    expect(document.documentElement.lang).toBe('en');
  });

  it('영어 로케일의 미번역 화면은 한국어로 그리고 문서 언어를 한국어로 두며, 그 사실을 고른 언어(영어)로 한 줄 알린다', () => {
    nav.pathname = '/approvals';
    render(<Boundary preferred="en"><Frame><FormErrorSummary errors={{ userId: 'X' }} labels={{ userId: 'ID' }} /></Frame></Boundary>);
    const notice = screen.getByTestId('korean-only-notice');
    expect(notice).toHaveTextContent('This page is available in Korean only.');
    expect(notice).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('complementary', { name: 'Language notice' })).toBe(notice);
    // 문서 언어가 한국어라 본문 밖에 그려지는 대화상자·토스트(포털)도 한국어로 읽힌다.
    expect(document.documentElement.lang).toBe('ko');
    expect(screen.getByText('본문 바로가기')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('입력 오류 1개 — 입력 내용을 확인해 주세요.');
  });

  it('한국어 로케일은 어느 화면이든 그대로 그리고 안내를 두지 않는다', () => {
    nav.pathname = '/approvals';
    render(<Boundary preferred="ko"><Frame><p>본문</p></Frame></Boundary>);
    expect(screen.queryByTestId('korean-only-notice')).toBeNull();
    expect(screen.getByText('본문 바로가기')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ko');
  });

  it('번역 원장은 정확한 경로만 번역 화면으로 본다 — 아래 경로는 따로 적을 때까지 한국어 화면이다', () => {
    nav.pathname = '/login/reset';
    render(<Boundary preferred="en"><Frame><p>본문</p></Frame></Boundary>);
    expect(screen.getByTestId('korean-only-notice')).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('ko');
  });

  it.each([
    ['미번역 화면', '/approvals', 'ko' as const, 'en' as const],
    ['미번역 화면', '/approvals', 'en' as const, 'ko' as const],
    ['번역 화면', '/login', 'ko' as const, 'en' as const],
  ])('%s에서 로케일을 바꿔도(%s: %s → %s) 작성 중인 입력과 그 요소가 남는다', (_label, pathname, from, to) => {
    nav.pathname = pathname;
    const { rerender } = render(<Boundary preferred={from}><Frame><input aria-label="draft" defaultValue="" /></Frame></Boundary>);
    const input = screen.getByLabelText('draft') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '작성 중' } });

    rerender(<Boundary preferred={to}><Frame><input aria-label="draft" defaultValue="" /></Frame></Boundary>);

    expect(screen.getByLabelText('draft')).toBe(input);
    expect(input.value).toBe('작성 중');
  });

  it('미번역 화면의 언어 선택기는 고른 로케일(영어)을 눌린 상태로 보이고, 한국어를 고르면 한국어로 돌아간다', () => {
    nav.pathname = '/approvals';
    document.cookie = 'NEXT_LOCALE=en; path=/';
    render(<Boundary preferred="en"><LocaleSwitcher /></Boundary>);
    // 선택기는 한국어 화면 안에 있으므로 묶음 이름은 한국어다. 언어 이름은 그 언어로 적는다.
    const group = screen.getByRole('group', { name: '언어' });
    expect(within(group).getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true');
    const korean = within(group).getByRole('button', { name: '한국어' });
    expect(korean).toHaveAttribute('aria-pressed', 'false');

    korean.click();

    expect(document.cookie).toContain('NEXT_LOCALE=ko');
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it('번역 화면의 언어 선택기는 언어 이름을 그 언어로 보이고, 고르면 쿠키를 쓰고 서버 렌더를 다시 받는다', () => {
    nav.pathname = '/login';
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
    render(<Boundary preferred="ko"><LocaleSwitcher /></Boundary>);
    const group = screen.getByRole('group', { name: '언어' });
    const english = within(group).getByRole('button', { name: 'English' });
    expect(english).toHaveAttribute('lang', 'en');
    expect(within(group).getByRole('button', { name: '한국어' })).toHaveAttribute('aria-pressed', 'true');

    english.click();

    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it('이미 보이는 검증 오류는 로케일을 바꾸면 새 언어로 다시 그린다(키·원인을 저장한다)', () => {
    nav.pathname = '/login';
    const schema = z.object({ userId: z.string().min(1, catalogKey('login.userIdRequired')), memo: z.string().max(3) });
    function Form() {
      const validation = useManualFormValidation(schema, { labels: { userId: 'ID', memo: 'Memo' } });
      return (
        <form>
          <button type="button" onClick={() => validation.validate({ userId: '', memo: 'long text' })}>check</button>
          <button type="button" onClick={() => validation.setFormErrors({ root: catalogKey('mfa.failure') })}>fail</button>
          <p data-testid="userId">{validation.errors.userId}</p>
          <p data-testid="memo">{validation.errors.memo}</p>
          <p data-testid="root">{validation.errors.root}</p>
        </form>
      );
    }
    const { rerender } = render(<Boundary preferred="en"><Form /></Boundary>);
    act(() => screen.getByRole('button', { name: 'check' }).click());
    expect(screen.getByTestId('userId')).toHaveTextContent('Enter your user ID.');
    expect(screen.getByTestId('memo')).toHaveTextContent('Memo: enter up to 3 characters.');

    rerender(<Boundary preferred="ko"><Form /></Boundary>);
    expect(screen.getByTestId('userId')).toHaveTextContent('아이디를 입력해 주세요.');
    expect(screen.getByTestId('memo')).toHaveTextContent('Memo: 최대 3자까지 입력할 수 있습니다.');

    act(() => screen.getByRole('button', { name: 'fail' }).click());
    expect(screen.getByTestId('root')).toHaveTextContent(messagesFor('ko').mfa.failure);
    rerender(<Boundary preferred="en"><Form /></Boundary>);
    expect(screen.getByTestId('root')).toHaveTextContent(messagesFor('en').mfa.failure);
  });

  it('한국어 문장 검증 메시지는 한국어로 그리는 화면에서만 그대로 쓴다', () => {
    const schema = z.object({ memo: z.string().max(3, '세 글자까지 입력해 주세요.') });
    function Form() {
      const validation = useManualFormValidation(schema, { labels: { memo: 'Memo' } });
      return <><button type="button" onClick={() => validation.validate({ memo: 'long' })}>check</button><p data-testid="memo">{validation.errors.memo}</p></>;
    }
    nav.pathname = '/approvals';
    const untranslated = render(<Boundary preferred="en"><Form /></Boundary>);
    act(() => screen.getByRole('button', { name: 'check' }).click());
    expect(screen.getByTestId('memo')).toHaveTextContent('세 글자까지 입력해 주세요.');
    untranslated.unmount();

    nav.pathname = '/login';
    render(<Boundary preferred="en"><Form /></Boundary>);
    act(() => screen.getByRole('button', { name: 'check' }).click());
    expect(screen.getByTestId('memo')).toHaveTextContent('Memo: enter up to 3 characters.');
  });

  it('서버 문구가 없는 전송 실패의 전역 알림은 지금 화면의 로케일로 그린다', () => {
    vi.useFakeTimers();
    try {
      nav.pathname = '/login';
      const english = render(<Boundary preferred="en"><ToastProvider><p>x</p></ToastProvider></Boundary>);
      act(() => {
        window.dispatchEvent(new CustomEvent('api-error', { detail: { message: '서버에 연결하지 못했습니다.', status: undefined, transport: 'offline' } }));
        vi.runOnlyPendingTimers();
      });
      expect(sonner.error).toHaveBeenLastCalledWith(messagesFor('en').transport.offline, expect.anything());
      english.unmount();

      nav.pathname = '/approvals';
      render(<Boundary preferred="en"><ToastProvider><p>x</p></ToastProvider></Boundary>);
      act(() => {
        window.dispatchEvent(new CustomEvent('api-error', { detail: { message: '서버에 연결하지 못했습니다.', status: undefined, transport: 'timeout' } }));
        vi.runOnlyPendingTimers();
      });
      expect(sonner.error).toHaveBeenLastCalledWith(messagesFor('ko').transport.timeout, expect.anything());
    } finally {
      vi.useRealTimers();
    }
  });

  it('없는 카탈로그 키는 개발·시험에서 숨기지 않고 실패한다', () => {
    const Missing = () => {
      const t = useTranslations('login');
      return <p>{t('no-such-key' as never)}</p>;
    };
    expect(() => render(<I18nProvider locale="en" messages={messagesFor('en')}><Missing /></I18nProvider>)).toThrow();
  });
});
