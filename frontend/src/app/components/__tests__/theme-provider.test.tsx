import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '../theme-provider';
import { applyThemeTokens, readSavedThemeConfig, resetThemeTokens, writeSavedThemeConfig } from '@/lib/theme/layout-theme';

vi.mock('next-themes', () => ({ ThemeProvider: ({ children }: { children: ReactNode }) => children }));

const savedTheme = { primaryColor: '#f00', borderRadius: '1', layoutMode: 'MODERN' as const, sidebarWidth: 260 };

describe('브라우저 테마 저장과 전역 복원', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('style');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.removeAttribute('style');
  });

  it('서버 출력은 바꾸지 않고 저장된 토큰을 일반 화면의 새 로드에서 복원한다', () => {
    writeSavedThemeConfig(savedTheme);
    const page = <ThemeProvider><main>업무 화면</main></ThemeProvider>;
    expect(renderToString(page)).toContain('<main>업무 화면</main>');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    const first = render(page);
    expect(screen.getByRole('main')).toHaveTextContent('업무 화면');
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('0 100% 50%');
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('hsl(0 100% 50%)');
    expect(document.documentElement.style.getPropertyValue('--radius-hub-section')).toBe('2rem');
    first.unmount();
    document.documentElement.removeAttribute('style');
    render(page);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('0 100% 50%');
  });

  it.each(['{broken', 'null', '[]', '5'])('잘못 저장된 값 %s 때문에 기본 프로필이나 화면이 깨지지 않는다', (saved) => {
    localStorage.setItem('hub-theme-config', saved);
    render(<ThemeProvider><main>업무 화면</main></ThemeProvider>);
    expect(screen.getByRole('main')).toBeVisible();
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
  });

  it('저장소가 차단되어도 화면을 표시하고 기본 CSS 토큰을 유지한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage denied'); });
    render(<ThemeProvider><main>업무 화면</main></ThemeProvider>);
    expect(screen.getByRole('main')).toBeVisible();
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
  });

  it('저장값의 임의 CSS는 주입하지 않고 색상과 반경을 정규화한다', () => {
    localStorage.setItem('hub-theme-config', JSON.stringify({ primaryColor: 'url(https://invalid.example)', borderRadius: '999' }));
    render(<ThemeProvider><main>업무 화면</main></ThemeProvider>);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('221.2 100% 50%');
    expect(document.documentElement.style.getPropertyValue('--radius-hub-section')).toBe('3rem');
    expect(document.documentElement.style.cssText).not.toContain('url(');
  });

  it('초기화는 저장값과 적용 토큰을 지우고 다음 로드에서 되살리지 않는다', () => {
    writeSavedThemeConfig(savedTheme);
    applyThemeTokens(readSavedThemeConfig()!);
    document.documentElement.style.setProperty('--unrelated-token', 'keep');
    resetThemeTokens();
    expect(readSavedThemeConfig()).toBeNull();
    render(<ThemeProvider><main>업무 화면</main></ThemeProvider>);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('');
    expect(document.documentElement.style.getPropertyValue('--unrelated-token')).toBe('keep');
  });
});
