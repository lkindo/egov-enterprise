'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import { readSavedThemeConfig, restoreThemeTokens } from '@/lib/theme/layout-theme';

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

/** 모드가 정해진 뒤에만 복원한다 — 다크 화면에 라이트 색이 잠깐이라도 덮이지 않게. */
function SavedThemeTokens() {
 const { resolvedTheme } = useTheme();
 React.useEffect(() => {
  if (!resolvedTheme) return;
  const saved = readSavedThemeConfig();
  if (saved) restoreThemeTokens(saved, resolvedTheme === 'dark');
 }, [resolvedTheme]);
 return null;
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
 return (
 <NextThemesProvider
 attribute="class"
 defaultTheme="light"
 enableSystem
 disableTransitionOnChange
 {...props}
 >
 <SavedThemeTokens />
 {children}
 </NextThemesProvider>
 );
}
