vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../AuthContext';
import { authService } from '@/services/foundation/auth/authService';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AUTHORIZATION_CHANGED_EVENT } from '@/lib/auth/authorization-state';

// Mock the authService
vi.mock('@/services/foundation/auth/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('AuthContext', () => {
  let queryClient: QueryClient;
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}><AuthProvider>{children}</AuthProvider></QueryClientProvider>
  );

  it('로그인 성공 시 사용자 정보를 조회하여 세션을 설정해야 함', async () => {
    const mockUser = { id: 'test', name: 'Test User', role: 'USER' };
    const mockLoginResponse = { accessToken: 'mock-token', role: 'USER' };

    (authService.login as any).mockResolvedValue(mockLoginResponse);
    (authService.getCurrentUser as any).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.login({ id: 'test', password: 'password' });
    });

    expect(authService.login).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('로그아웃 시 사용자 세션 정보가 비워져야 함', async () => {
    (authService.logout as any).mockResolvedValue({});
    localStorage.setItem('egov-board-draft:v2:user-1:BBS-1:create:new', 'draft');
    localStorage.setItem('egov-draft-board_insert_BBS-1', 'legacy');
    localStorage.setItem('autosave_bbs_write', 'legacy');
    localStorage.setItem('unrelated-preference', 'keep');

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.logout();
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('egov-board-draft:v2:user-1:BBS-1:create:new')).toBeNull();
    expect(localStorage.getItem('egov-draft-board_insert_BBS-1')).toBeNull();
    expect(localStorage.getItem('autosave_bbs_write')).toBeNull();
    expect(localStorage.getItem('unrelated-preference')).toBe('keep');
  });

  it('초기화 시 사용자 정보를 조회하여 세션 유지를 확인해야 함', async () => {
    const mockUser = { id: 'test', name: 'Test User' };
    (authService.getCurrentUser as any).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(authService.getCurrentUser).toHaveBeenCalled();
      expect(result.current.user).toEqual(mockUser);
    });
  });

  it('로그인 실패 시 에러를 던져야 함', async () => {
    (authService.login as any).mockRejectedValue(new Error('Login Failed'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(async () => {
      await act(async () => {
        await result.current.login({ id: 'bad', password: 'bad' });
      });
    }).rejects.toThrow('로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.');
  });

  it('AuthProvider 외부에서 useAuth 사용 시 에러를 던져야 함', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
    
    consoleSpy.mockRestore();
  });

  it('clears account-specific cached data when a different account is authenticated', async () => {
    const first = { id: 'first', name: 'First', groups: ['USER'], permissions: [], authorizationVersion: 'v1' };
    const second = { id: 'second', name: 'Second', groups: ['USER'], permissions: [], authorizationVersion: 'v2' };
    vi.mocked(authService.getCurrentUser).mockResolvedValue(first);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('first'));
    queryClient.setQueryData(['menus', 'head'], ['first-account-menu']);
    queryClient.setQueryData(['private-records'], ['first-account-record']);
    vi.mocked(authService.login).mockResolvedValue({ role: 'USER', groups: ['USER'], permissions: [], authorizationVersion: 'v2' });
    vi.mocked(authService.getCurrentUser).mockResolvedValue(second);
    await act(async () => result.current.login({ id: 'second', password: 'example' }));
    expect(result.current.user?.id).toBe('second');
    expect(queryClient.getQueryData(['menus', 'head'])).toBeUndefined();
    expect(queryClient.getQueryData(['private-records'])).toBeUndefined();
  });

  it('re-fetches revoked grants on the authorization signal and clears protected cache', async () => {
    const granted = { id: 'same', name: 'Same', groups: ['EDITOR'], permissions: ['EXAMPLE_UPDATE'], authorizationVersion: 'v1' };
    const revoked = { ...granted, groups: [], permissions: [], authorizationVersion: 'v2' };
    vi.mocked(authService.getCurrentUser).mockResolvedValue(granted);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.authorizationVersion).toBe('v1'));
    queryClient.setQueryData(['menus', 'head'], ['privileged-menu']);
    vi.mocked(authService.getCurrentUser).mockResolvedValue(revoked);
    await act(async () => { window.dispatchEvent(new Event(AUTHORIZATION_CHANGED_EVENT)); });
    await waitFor(() => expect(result.current.user?.permissions).toEqual([]));
    expect(queryClient.getQueryData(['menus', 'head'])).toBeUndefined();
  });

  it('does not restore a logged-out account from a delayed identity response', async () => {
    let finish!: (value: Awaited<ReturnType<typeof authService.getCurrentUser>>) => void;
    vi.mocked(authService.getCurrentUser).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    vi.mocked(authService.logout).mockResolvedValue();
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => result.current.logout());
    await act(async () => finish({ id: 'previous', name: 'Previous', groups: ['ADMIN'], permissions: ['EXAMPLE_UPDATE'], authorizationVersion: 'old' }));
    expect(result.current.user).toBeNull();
  });

  it('discards a pre-revocation check that resolves after the fresh authorization response', async () => {
    let finishOld!: (value: Awaited<ReturnType<typeof authService.getCurrentUser>>) => void;
    vi.mocked(authService.getCurrentUser).mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    const revoked = { id: 'same', name: 'Same', groups: [], permissions: [], authorizationVersion: 'new' };
    vi.mocked(authService.getCurrentUser).mockResolvedValue(revoked);
    await act(async () => { window.dispatchEvent(new Event(AUTHORIZATION_CHANGED_EVENT)); });
    await act(async () => finishOld({ ...revoked, permissions: ['EXAMPLE_UPDATE'], authorizationVersion: 'old' }));
    expect(result.current.user).toEqual(revoked);
  });
});
