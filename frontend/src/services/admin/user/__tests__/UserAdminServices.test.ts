import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { userAdminService } from '../UserAdminService';
import { loginPolicyAdminService } from '../LoginPolicyAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Admin User & Policy Services', () => {
  beforeEach(() => vi.clearAllMocks());

  it('userAdminService calls correct endpoints', async () => {
    (client.get as any).mockResolvedValue({ list: [], paginationInfo: {} });
    await userAdminService.getUsers({ pageIndex: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/users', expect.any(Object));
  });

  it('loginPolicyAdminService calls correct endpoints', async () => {
    await loginPolicyAdminService.getPolicies({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('/admin/user/login-policies', expect.objectContaining({
      params: expect.objectContaining({ pageIndex: 1 })
    }));
  });
});
