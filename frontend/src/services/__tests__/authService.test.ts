vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService, normalizeAuthUser } from '../foundation/auth/authService';
import api from '@/lib/api/client';

const reissueSessionMock = vi.fn();
vi.mock('@/lib/api/client', () => ({
 default: {
 post: vi.fn(),
 get: vi.fn(),
 },
 reissueSession: (...args: unknown[]) => reissueSessionMock(...args),
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

 // 재발급은 client.post 를 직접 부르지 않는다. 백엔드가 리프레시 토큰을 회전시키므로
 // 자동 재발급(인터셉터)과 **같은 단일 실행**을 공유해야 하고, 그 소유자가 reissueSession 이다.
 // 여기서 client.post 로 되돌아가면 두 경로가 각자 쏘아 늦은 쪽이 401 이 되는 회귀가 재발한다.
 it('reissue 는 단일 실행 reissueSession 에 위임하고 client.post 를 쓰지 않는다', async () => {
 reissueSessionMock.mockResolvedValue(undefined);

 await authService.reissue();

 expect(reissueSessionMock).toHaveBeenCalledTimes(1);
 expect(api.post).not.toHaveBeenCalled();
 });

 it('reissue 실패는 호출자에게 그대로 전파된다', async () => {
 reissueSessionMock.mockRejectedValue(new Error('401 Unauthorized'));

 await expect(authService.reissue()).rejects.toThrow('401 Unauthorized');
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
