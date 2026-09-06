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
const PAGE_PRESERVED_PARAMS = [{
  name: 'cat',
  allowedValues: ['LGN', 'USR', 'WEB'],
}] as const;

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

  it('removes page=1, preserves the approved category, and drops unknown query parameters', () => {
    navigation.query = 'cat=WEB&page=4&searchKeyword=person-name&keep=1';
    const { result } = renderHook(() => usePageParam('page', PAGE_PRESERVED_PARAMS));

    act(() => result.current[1](1));

    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/system/logs?cat=WEB',
      { scroll: false },
    );
  });

  it.each(['UNKNOWN', 'SYS'])('drops invalid or default root category %s when changing page', (category) => {
    navigation.query = `cat=${category}&page=1&searchKeyword=person-name`;
    const { result } = renderHook(() => usePageParam('page', PAGE_PRESERVED_PARAMS));

    act(() => result.current[1](2));

    expect(navigation.replace).toHaveBeenCalledWith('/admin/system/logs?page=2', { scroll: false });
  });

  it('does not carry root-only cat into a nested log route', () => {
    navigation.pathname = '/admin/system/logs/privacy';
    navigation.query = 'cat=WEB&page=1&searchKeyword=person-name';
    const { result } = renderHook(() => usePageParam());

    act(() => result.current[1](2));

    expect(navigation.replace).toHaveBeenCalledWith('/admin/system/logs/privacy?page=2', { scroll: false });
  });

  it('falls back from an unknown category and resets page when a valid tab is selected', () => {
    navigation.query = 'cat=UNKNOWN&page=3&searchKeyword=person-name&keep=1';
    const { result } = renderHook(() =>
      useTabParam(CATEGORIES, 'SYS', { paramName: 'cat', resetParams: ['page'] }),
    );

    expect(result.current[0]).toBe('SYS');

    act(() => result.current[1]('LGN'));

    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/system/logs?cat=LGN',
      { scroll: false },
    );
  });

  it('keeps the default category out of the URL and resets page', () => {
    navigation.query = 'cat=LGN&page=2&searchKeyword=person-name&keep=1';
    const { result } = renderHook(() =>
      useTabParam(CATEGORIES, 'SYS', { paramName: 'cat', resetParams: ['page'] }),
    );

    act(() => result.current[1]('SYS'));

    expect(navigation.replace).toHaveBeenCalledWith(
      '/admin/system/logs',
      { scroll: false },
    );
  });
});
