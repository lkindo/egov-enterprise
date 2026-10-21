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
import { AUTHORIZATION_CHANGED_EVENT, isSignedOut, markSignedIn } from '@/lib/auth/authorization-state';

const sessionBroadcast = vi.hoisted(() => ({
  handler: null as null | ((message: { type: 'signed-out' } | { type: 'signed-in' }) => void),
  announce: vi.fn(),
}));
vi.mock('@/lib/auth/session-broadcast', () => ({
  announceSession: sessionBroadcast.announce,
  listenSession: (handler: (message: { type: 'signed-out' } | { type: 'signed-in' }) => void) => {
    sessionBroadcast.handler = handler;
    return () => { sessionBroadcast.handler = null; };
  },
}));

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

  it('MFA 도전에서는 현재 사용자 조회나 일반 세션 승격을 하지 않는다', async () => {
    vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('signed out'));
    vi.mocked(authService.login).mockResolvedValue({ authenticationStage: 'MFA_REQUIRED', mfaChallengeExpiresAt: '2026-12-31T00:00:00Z' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.mocked(authService.getCurrentUser).mockClear();
    await act(async () => {
      expect(await result.current.login({ id: 'test', password: 'password' })).toMatchObject({ authenticationStage: 'MFA_REQUIRED' });
    });
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it('MFA 등록 진입은 사용자 캐시를 폐기하고 늦은 세션 조회와 focus 재조회를 막는다', async () => {
    const user = { id: 'fixture', esntlId: 'opaque', name: 'Fixture', role: 'USER', groups: ['ROLE_USER'], permissions: [], authorizationVersion: 'v1' };
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(user);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('fixture'));
    queryClient.setQueryData(['private-data'], { fixture: true });
    let resolve!: (value: typeof user) => void;
    vi.mocked(authService.getCurrentUser).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    let pending!: Promise<void>;
    act(() => { pending = result.current.checkAuth(); });
    act(() => result.current.enterMfaChallenge());
    expect(result.current.user).toBeNull();
    expect(result.current.mfaPending).toBe(true);
    expect(queryClient.getQueryData(['private-data'])).toBeUndefined();
    expect(isSignedOut()).toBe(true);
    await act(async () => { resolve(user); await pending; });
    vi.mocked(authService.getCurrentUser).mockClear();
    await act(async () => { window.dispatchEvent(new Event('focus')); await result.current.checkAuth(); });
    expect(authService.getCurrentUser).not.toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.mfaPending).toBe(true);
    await act(async () => { await result.current.logout(); });
    expect(result.current.mfaPending).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('이전 로그인 성공이 추가 인증 대기를 해제하지 않으며 새 로그인만 일반 세션을 복구한다', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null as never);
    let resolve!: (value: Awaited<ReturnType<typeof authService.login>>) => void;
    vi.mocked(authService.login).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let previousLogin!: Promise<unknown>;
    act(() => { previousLogin = result.current.login({ id: 'fixture', password: 'fixture-password' }); });
    act(() => result.current.enterMfaChallenge());
    const authenticated = { authenticationStage: 'AUTHENTICATED' as const, role: 'ROLE_USER', groups: ['ROLE_USER'], permissions: [], authorizationVersion: 'v2' };
    await act(async () => { resolve(authenticated); await expect(previousLogin).rejects.toThrow(); });
    expect(result.current.mfaPending).toBe(true);
    expect(result.current.user).toBeNull();

    const user = { id: 'fixture', name: 'Fixture', ...authenticated };
    vi.mocked(authService.login).mockResolvedValueOnce(authenticated);
    vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(user);
    await act(async () => { await result.current.login({ id: 'fixture', password: 'fixture-password' }); });
    expect(result.current.mfaPending).toBe(false);
    expect(result.current.user?.id).toBe('fixture');
  });

  it.each([
    ['MFA_REQUIRED', 'logout'], ['ENROLLMENT_REQUIRED', 'logout'],
    ['MFA_REQUIRED', 'login'], ['ENROLLMENT_REQUIRED', 'login'],
  ] as const)('늦은 %s 응답은 더 최근 %s 결과를 지우거나 대기를 복구하지 않는다', async (stage, latest) => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null as never);
    let resolve!: (value: Awaited<ReturnType<typeof authService.login>>) => void;
    vi.mocked(authService.login).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    let previousLogin!: Promise<unknown>;
    act(() => { previousLogin = result.current.login({ id: 'previous', password: 'fixture-password' }); });
    if (latest === 'logout') await act(async () => { await result.current.logout(); });
    else {
      vi.mocked(authService.login).mockResolvedValueOnce({ authenticationStage: 'AUTHENTICATED', role: 'ROLE_USER', groups: [], permissions: [], authorizationVersion: 'new' });
      vi.mocked(authService.getCurrentUser).mockResolvedValueOnce({ id: 'current', name: 'Current', groups: [], permissions: [], authorizationVersion: 'new' });
      await act(async () => { await result.current.login({ id: 'current', password: 'fixture-password' }); });
    }
    await act(async () => {
      resolve({ authenticationStage: stage, mfaChallengeExpiresAt: '2026-12-31T00:00:00Z' });
      await expect(previousLogin).rejects.toThrow();
    });
    expect(result.current.mfaPending).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.user?.id ?? null).toBe(latest === 'login' ? 'current' : null);
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

  it('🚨 로그아웃은 캐시를 비우기 전에 요청을 막고, 다시 로그인하면 푼다 (DIP B4)', async () => {
    markSignedIn();
    const mockUser = { id: 'test', name: 'Test User', role: 'USER' };
    (authService.getCurrentUser as any).mockResolvedValue(mockUser);
    (authService.login as any).mockResolvedValue({});
    let signedOutWhenCleared: boolean | undefined;
    const clear = queryClient.clear.bind(queryClient);
    vi.spyOn(queryClient, 'clear').mockImplementation(() => { signedOutWhenCleared ??= isSignedOut(); clear(); });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(mockUser));
    signedOutWhenCleared = undefined;

    await act(async () => { await result.current.logout(); });
    expect(signedOutWhenCleared).toBe(true);
    expect(isSignedOut()).toBe(true);

    await act(async () => { await result.current.login({ id: 'test', password: 'password' }); });
    expect(isSignedOut()).toBe(false);
  });

  it('[결정 17] 로그인·로그아웃을 다른 탭에 알린다', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'test', name: 'Test', groups: [], permissions: [], authorizationVersion: 'v1' });
    vi.mocked(authService.login).mockResolvedValue({ role: 'USER' } as never);
    vi.mocked(authService.logout).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login({ id: 'test', password: 'password' }); });
    expect(sessionBroadcast.announce).toHaveBeenCalledWith({ type: 'signed-in' });
    await act(async () => { await result.current.logout(); });
    expect(sessionBroadcast.announce).toHaveBeenLastCalledWith({ type: 'signed-out' });
  });

  it('[결정 17] 다른 탭이 로그아웃하면 만료 안내 없이 로그인 화면으로 가고, 다시 로그인하면 현재 사용자를 다시 묻는다', async () => {
    const replace = vi.fn();
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, replace } });
    vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: 'test', name: 'Test', groups: [], permissions: [], authorizationVersion: 'v1' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user?.id).toBe('test'));

    vi.mocked(authService.getCurrentUser).mockClear();
    act(() => sessionBroadcast.handler?.({ type: 'signed-in' }));
    await waitFor(() => expect(authService.getCurrentUser).toHaveBeenCalled());

    act(() => sessionBroadcast.handler?.({ type: 'signed-out' }));
    expect(result.current.user).toBeNull();
    expect(isSignedOut()).toBe(true);
    expect(replace).toHaveBeenCalledWith('/login');
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
