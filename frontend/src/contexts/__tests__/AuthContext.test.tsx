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

// Mock the authService
vi.mock('@/services/foundation/auth/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
    }
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
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
});
