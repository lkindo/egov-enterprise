import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { authService } from '../authService';

vi.mock('@/lib/api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  }
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login should call post /auth/login with correct data', async () => {
    const loginData = { id: 'admin', password: 'password' };
    const mockRes = { accessToken: 'token123', role: 'ROLE_ADMIN' };
    (client.post as any).mockResolvedValue(mockRes);

    const result = await authService.login(loginData);

    expect(client.post).toHaveBeenCalledWith('auth/login', loginData);
    expect(result).toEqual(mockRes);
  });

  it('logout should call post /auth/logout', async () => {
    await authService.logout();
    expect(client.post).toHaveBeenCalledWith('auth/logout');
  });

  it('getCurrentUser should call get /auth/me', async () => {
    const mockUser = { id: 'admin', name: 'Admin User' };
    (client.get as any).mockResolvedValue(mockUser);

    const result = await authService.getCurrentUser();

    expect(client.get).toHaveBeenCalledWith('auth/me');
    expect(result).toEqual(mockUser);
  });

  it('reissue should call post /auth/reissue', async () => {
    const mockRes = { accessToken: 'new-token' };
    (client.post as any).mockResolvedValue(mockRes);

    const result = await authService.reissue();

    expect(client.post).toHaveBeenCalledWith('auth/reissue');
    expect(result).toEqual(mockRes);
  });
});
