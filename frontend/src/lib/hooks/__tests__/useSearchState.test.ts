vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSearchState } from '../use-search-state';

// Mock next/navigation
const replaceMock = vi.fn();
vi.mock('next/navigation', () => ({
 useRouter: () => ({ replace: replaceMock }),
 usePathname: () => '/test-page',
 useSearchParams: () => new URLSearchParams('?keyword=existing&token=must-not-survive'),
}));

describe('useSearchState hook', () => {
 it('should initialize with values from URL and defaults', () => {
 const { result } = renderHook(() => useSearchState({
 keyword: '',
 other: 'default'
 }));

 expect(result.current.values.keyword).toBe('existing');
 expect(result.current.values.other).toBe('default');
 });

 it('should update URL when setSearchValues is called', () => {
 const { result } = renderHook(() => useSearchState({ keyword: '' }));

 act(() => {
 result.current.setSearchValues({ keyword: 'new search' });
 });

 expect(replaceMock).toHaveBeenCalledWith('/test-page?keyword=new+search');
 });

 it('drops query keys that the caller did not declare', () => {
 const { result } = renderHook(() => useSearchState({ keyword: '' }));

 act(() => {
 result.current.setSearchValues({ keyword: 'allowed' });
 });

 expect(replaceMock).toHaveBeenLastCalledWith('/test-page?keyword=allowed');
 expect(replaceMock.mock.lastCall?.[0]).not.toContain('token');
 });
});
