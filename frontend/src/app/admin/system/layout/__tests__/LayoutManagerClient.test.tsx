import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { readSavedThemeConfig, resetThemeTokens } from '@/lib/theme/layout-theme';
import LayoutManagerClient from '../LayoutManagerClient';

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

afterEach(() => {
  resetThemeTokens();
  document.documentElement.style.removeProperty('--test-unrelated-token');
});

it('미리보기만 바꾸다가 적용한 설정을 이 브라우저에 저장하고 기본값 복원 시 지운다', () => {
  resetThemeTokens();
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--test-unrelated-token', 'keep');
  render(<LayoutManagerClient />);

  fireEvent.change(screen.getByRole('slider', { name: '곡률 베이스 값(rem)' }), { target: { value: '1.2' } });
  const preview = screen.getByText('실시간 시뮬레이터').closest<HTMLElement>('[style*="--radius-hub-section"]');
  expect(preview?.style.getPropertyValue('--radius-hub-section')).toBe('2.4rem');
  expect(rootStyle.getPropertyValue('--radius-hub-section')).toBe('');
  expect(readSavedThemeConfig()).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: '이 브라우저에 적용' }));
  expect(rootStyle.getPropertyValue('--radius-hub-section')).toBe('2.4rem');
  expect(readSavedThemeConfig()?.borderRadius).toBe('1.2');

  fireEvent.click(screen.getByRole('button', { name: '기본값 복원' }));
  expect(rootStyle.getPropertyValue('--radius-hub-section')).toBe('');
  expect(readSavedThemeConfig()).toBeNull();
  expect(rootStyle.getPropertyValue('--test-unrelated-token')).toBe('keep');
});
