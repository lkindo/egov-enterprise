import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({
  pathname: '/admin/system/logs',
  query: '',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => new URLSearchParams(navigation.query),
}));

import { usePageParam, useTabParam } from '../use-log-url-state';

const CATEGORIES = ['SYS', 'LGN', 'USR', 'WEB'] as const;

describe('log URL state', () => {
  beforeEach(() => {
    navigation.pathname = '/admin/system/logs';
    navigation.query = '';
    navigation.replace.mockReset();
  });

  it('derives a positive integer page and falls back to page 1 for invalid values', () => {
    navigation.query = 'page=3.8';
    const valid = renderHook(() => usePageParam());
    expect(valid.result.current[0]).toBe(3);
    valid.unmount();

    navigation.query = 'page=0';
    const invalid = renderHook(() => usePageParam());
    expect(invalid.result.current[0]).toBe(1);
  });

  it('removes page=1 while preserving unrelated query parameters', () => {
    navigation.query = 'cat=WEB&page=4&keep=1';
    const { result } = renderHook(() => usePageParam());

    act(() => result.current[1](1));

    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/system/logs?cat=WEB&keep=1',
      { scroll: false },
    );
  });

  it('falls back from an unknown category and resets page when a valid tab is selected', () => {
    navigation.query = 'cat=UNKNOWN&page=3&keep=1';
    const { result } = renderHook(() =>
      useTabParam(CATEGORIES, 'SYS', { paramName: 'cat', resetParams: ['page'] }),
    );

    expect(result.current[0]).toBe('SYS');

    act(() => result.current[1]('LGN'));

    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/system/logs?cat=LGN&keep=1',
      { scroll: false },
    );
  });

  it('keeps the default category out of the URL and resets page', () => {
    navigation.query = 'cat=LGN&page=2&keep=1';
    const { result } = renderHook(() =>
      useTabParam(CATEGORIES, 'SYS', { paramName: 'cat', resetParams: ['page'] }),
    );

    act(() => result.current[1]('SYS'));

    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/system/logs?keep=1',
      { scroll: false },
    );
  });
});
