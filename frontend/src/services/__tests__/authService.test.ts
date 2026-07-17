vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../foundation/auth/authService';
import api from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
 default: {
 post: vi.fn(),
 get: vi.fn(),
 },
}));

describe('authService', () => {
 beforeEach(() => {
 vi.clearAllMocks();
 });

 it('login should call api.post with credentials', async () => {
 const mockResponse = { result: { accessToken: 'token', role: 'ROLE_USER' } };
 (api.post as any).mockResolvedValue(mockResponse);

 const loginData = { id: 'testuser', password: 'password' };
 const result = await authService.login(loginData);

 // baseURL:'' 오버라이드로 Route Handler 직결(이중 프리픽스 회귀 방어)
 expect(api.post).toHaveBeenCalledWith('/api/auth/login', loginData, { baseURL: '' });
 expect(result).toEqual(mockResponse);
 });

 it('logout should call api.post', async () => {
 (api.post as any).mockResolvedValue({ result: null });

 await authService.logout();

 expect(api.post).toHaveBeenCalledWith('/api/auth/logout', undefined, { baseURL: '' });
 });

 it('reissue should call api.post', async () => {
 const mockResponse = { result: { accessToken: 'new-token' } };
 (api.post as any).mockResolvedValue(mockResponse);

 const result = await authService.reissue();

 expect(api.post).toHaveBeenCalledWith('/api/auth/reissue', undefined, { baseURL: '' });
 expect(result).toEqual(mockResponse);
 });

 it('getCurrentUser should call api.get', async () => {
 const mockResponse = { result: { id: 'user01', name: 'Tester' } };
 (api.get as any).mockResolvedValue(mockResponse);

 const result = await authService.getCurrentUser();

 expect(api.get).toHaveBeenCalledWith('auth/me');
 expect(result).toEqual(mockResponse);
 });
});
