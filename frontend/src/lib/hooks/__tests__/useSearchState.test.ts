import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useSearchState } from '../use-search-state';

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/test-page',
  useSearchParams: () => new URLSearchParams('?keyword=existing'),
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
    
    expect(pushMock).toHaveBeenCalledWith('/test-page?keyword=new+search');
  });
});
