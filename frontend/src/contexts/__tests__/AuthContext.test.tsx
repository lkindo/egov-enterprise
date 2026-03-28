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

 it('로그인 성공 시 사용자 정보와 토큰을 저장해야 함', async () => {
 const mockUser = { id: 'test', name: 'Test User', role: 'USER' };
 const mockLoginResponse = { accessToken: 'mock-token', role: 'USER' };

 (authService.login as any).mockResolvedValue(mockLoginResponse);
 (authService.getCurrentUser as any).mockResolvedValue(mockUser);

 const { result } = renderHook(() => useAuth(), { wrapper });

 await act(async () => {
 await result.current.login({ id: 'test', password: 'password' });
 });

 expect(authService.login).toHaveBeenCalled();
 expect(localStorage.getItem('accessToken')).toBe('mock-token');
 await waitFor(() => {
 expect(result.current.user).toEqual(mockUser);
 });
 });

 it('로그아웃 시 사용자 정보와 토큰을 제거해야 함', async () => {
 localStorage.setItem('accessToken', 'mock-token');
 (authService.logout as any).mockResolvedValue({});

 const { result } = renderHook(() => useAuth(), { wrapper });

 await act(async () => {
 await result.current.logout();
 });

 expect(authService.logout).toHaveBeenCalled();
 expect(localStorage.getItem('accessToken')).toBeNull();
 expect(result.current.user).toBeNull();
 });

 it('초기화 시 토큰이 있으면 사용자 정보를 확인해야 함', async () => {
 localStorage.setItem('accessToken', 'mock-token');
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
 }).rejects.toThrow('Login Failed');
 });

 it('AuthProvider 외부에서 useAuth 사용 시 에러를 던져야 함', () => {
 // console.error suppression for expected error
 const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
 
 expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider');
 
 consoleSpy.mockRestore();
 });
});
