import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// 이 파일은 실제 번역 런타임을 본다 — 공통 설정의 한국어 고정 대역을 푼다.
vi.unmock('use-intl');

const nav = vi.hoisted(() => ({ pathname: '/login', refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: nav.refresh }),
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

import { I18nProvider } from '../I18nProvider';
import { messagesFor } from '../messages';
import { ApplicationFrame } from '@/app/components/layout/ApplicationFrame';
import { LocaleSwitcher } from '@/app/components/layout/LocaleSwitcher';
import { FormErrorSummary } from '@/components/ui/form';
import { useTranslations } from 'use-intl';

function frame(locale: 'ko' | 'en') {
  return render(
    <I18nProvider locale={locale} messages={messagesFor(locale)}>
      <ApplicationFrame header={<header>H</header>} sidebar={<aside>S</aside>} footer={<footer>F</footer>}>
        <FormErrorSummary errors={{ userId: 'X' }} labels={{ userId: 'ID' }} />
      </ApplicationFrame>
    </I18nProvider>,
  );
}

/** 화면 로케일(ADR-0063) — 번역을 마친 화면만 영어로, 나머지는 한국어 영역으로 그린다. */
describe('i18n 렌더링', () => {
  it('영어 로케일의 번역 화면(로그인)은 틀의 고정 문구를 영어로 그리고 한국어 안내를 두지 않는다', () => {
    nav.pathname = '/login';
    frame('en');
    expect(screen.getByText('Skip to main content')).toBeInTheDocument();
    expect(screen.queryByTestId('korean-only-notice')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('1 input error — Check what you entered.');
  });

  it('영어 로케일의 미번역 화면은 틀 전체를 lang="ko" 영역과 한국어 카탈로그로 감싸고, 그 사실을 영어로 한 줄 알린다', () => {
    nav.pathname = '/approvals';
    const { container } = frame('en');
    expect(screen.getByTestId('korean-only-notice')).toHaveTextContent('This page is available in Korean only.');
    const region = container.querySelector('[lang="ko"]');
    expect(region).not.toBeNull();
    expect(within(region as HTMLElement).getByText('본문 바로가기')).toBeInTheDocument();
    // 공용 부품도 영역 안에서는 한국어다 — 한 화면 안에서 언어가 섞이지 않는다.
    expect(within(region as HTMLElement).getByRole('alert')).toHaveTextContent('입력 오류 1개 — 입력 내용을 확인해 주세요.');
  });

  it('한국어 로케일은 어느 화면이든 그대로 그리고 안내를 두지 않는다', () => {
    nav.pathname = '/approvals';
    frame('ko');
    expect(screen.queryByTestId('korean-only-notice')).toBeNull();
    expect(screen.getByText('본문 바로가기')).toBeInTheDocument();
  });

  it('로케일 선택기는 언어 이름을 그 언어로 보이고, 고르면 쿠키를 쓰고 서버 렌더를 다시 받는다', () => {
    nav.refresh.mockClear();
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
    render(<I18nProvider locale="ko" messages={messagesFor('ko')}><LocaleSwitcher /></I18nProvider>);
    const group = screen.getByRole('group', { name: '언어' });
    const english = within(group).getByRole('button', { name: 'English' });
    expect(english).toHaveAttribute('lang', 'en');
    expect(within(group).getByRole('button', { name: '한국어' })).toHaveAttribute('aria-pressed', 'true');

    english.click();

    expect(document.cookie).toContain('NEXT_LOCALE=en');
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it('없는 카탈로그 키는 개발·시험에서 숨기지 않고 실패한다', () => {
    const Missing = () => {
      const t = useTranslations('login');
      return <p>{t('no-such-key' as never)}</p>;
    };
    expect(() => render(<I18nProvider locale="en" messages={messagesFor('en')}><Missing /></I18nProvider>)).toThrow();
  });
});
