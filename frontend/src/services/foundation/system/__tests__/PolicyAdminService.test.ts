import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { policyAdminService } from '../PolicyAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
  }
}));

describe('PolicyAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRaw).mockImplementation(async (url, config) => {
      const data = await vi.mocked(client.get)(url, config);
      return {
        success: true,
        code: 'S000',
        message: 'success',
        data: data ?? (url === 'admin/system/policies' ? [] : {}),
      };
    });
    vi.mocked(client.requestRaw).mockImplementation(async ({ url, method, data, ...config }) => {
      if (!url) throw new Error('generated request URL is required');
      if (method === 'put') {
        await vi.mocked(client.put)(url, data, Object.keys(config).length > 0 ? config : undefined);
      }
      return { success: true, code: 'S000', message: 'success', data: null };
    });
  });

  it('getPolicies should call correct endpoint', async () => {
    await policyAdminService.getPolicies();
    // expected: admin/system/policies
    // current: admin/system/system/policies (due to bug)
    expect(client.get).toHaveBeenCalledWith('admin/system/policies', undefined);
  });

  it('getPolicy should call correct endpoint with type', async () => {
    await policyAdminService.getPolicy('privacy');
    expect(client.get).toHaveBeenCalledWith('admin/system/policies/privacy', undefined);
  });

  it('updatePolicy should call correct endpoint with data', async () => {
    const data = { plcyTtl: 'Updated Title', plcyCn: 'Updated Content' };
    await policyAdminService.updatePolicy('privacy', data);
    expect(client.put).toHaveBeenCalledWith('admin/system/policies/privacy', data, undefined);
  });
});
