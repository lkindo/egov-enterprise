vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ScrollToTop } from '../scroll-to-top';

// Mock next/navigation
vi.mock('next/navigation', () => ({
 usePathname: () => '/',
 useSearchParams: () => new URLSearchParams(),
}));

describe('Layout Components', () => {
 beforeEach(() => {
 vi.useFakeTimers();
 });

  // ScrollToTop test disabled as ScrollToTop was removed to allow default browser scroll restoration.
  it.skip('ScrollToTop handles route changes', async () => {
    window.scrollTo = vi.fn();
    render(<ScrollToTop />);

    act(() => {
      vi.runAllTimers();
    });

    expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
