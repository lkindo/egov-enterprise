/* eslint-disable react/display-name */
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '../use-user';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect } from 'vitest';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useUser Hook', () => {
  it('should fetch user me details successfully via MSW', async () => {
    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.userId).toBe('admin');
    expect(result.current.data?.userNm).toBe('관리자');
    expect(result.current.data?.role).toBe('ROLE_ADMIN');
  });
});
