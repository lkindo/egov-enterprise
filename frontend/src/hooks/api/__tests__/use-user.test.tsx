/* eslint-disable react/display-name */
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from '../use-user';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: { id: 'admin', authorizationVersion: 'v1' } as { id: string; authorizationVersion: string } | null }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

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
    auth.user = { id: 'admin', authorizationVersion: 'v1' };
    const { result } = renderHook(() => useUser(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.userId).toBe('admin');
    expect(result.current.data?.userNm).toBe('관리자');
    expect(result.current.data?.role).toBe('ROLE_ADMIN');
  });

  it('does not fetch the former account after logout', () => {
    auth.user = null;
    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });
});
