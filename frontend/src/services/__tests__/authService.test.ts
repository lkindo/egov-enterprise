vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, normalizeAuthUser } from '../foundation/auth/authService';
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
 const wireUser = {
   id: 'user01',
   name: 'Tester',
   esntlId: 'ESNTL_000000000001',
   role: 'ROLE_USER',
   userSe: 'USR',
   email: 'tester@example.test',
   pswd: 'must-not-enter-auth-state',
 };
 (api.get as any).mockResolvedValue(wireUser);

 const result = await authService.getCurrentUser();

 expect(api.get).toHaveBeenCalledWith('auth/me');
 expect(result).toEqual({
   id: 'user01',
   name: 'Tester',
   esntlId: 'ESNTL_000000000001',
   role: 'ROLE_USER',
   userSe: 'USR',
   email: 'tester@example.test',
 });
 expect(result).not.toHaveProperty('pswd');
 });

 it('does not synthesize esntlId from the human login id', () => {
   expect(normalizeAuthUser({ id: 'user01', name: 'Tester', role: 'USER' })).toEqual({
     id: 'user01',
     name: 'Tester',
     role: 'USER',
   });
 });

 it.each([
   null,
   {},
   { id: '', name: 'Tester' },
   { id: 'user01', name: '' },
   { id: ' user01', name: 'Tester' },
 ])('rejects an ambiguous current-user response: %j', (wireValue) => {
   expect(() => normalizeAuthUser(wireValue)).toThrow('현재 사용자 응답이 올바르지 않습니다.');
 });
});
