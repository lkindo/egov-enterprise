'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { applyThemeTokens, readSavedThemeConfig } from '@/lib/theme/layout-theme';

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
 React.useEffect(() => {
  const saved = readSavedThemeConfig();
  if (saved) applyThemeTokens(saved);
 }, []);

 return (
 <NextThemesProvider
 attribute="class"
 defaultTheme="light"
 enableSystem
 disableTransitionOnChange
 {...props}
 >
 {children}
 </NextThemesProvider>
 );
}
