import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { policyAdminService } from '../PolicyAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
  }
}));

// raw transport 가 envelope 를 만들기 전에 거치는 어댑터. 테스트는 method 별 호출을 여기서 단언한다.
const transport = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
};

describe('PolicyAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRaw).mockImplementation(async (url, config) => {
      const data = await transport.get(url, config);
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
        await transport.put(url, data, Object.keys(config).length > 0 ? config : undefined);
      }
      if (method === 'post') {
        await transport.post(url, data, Object.keys(config).length > 0 ? config : undefined);
      }
      return { success: true, code: 'S000', message: 'success', data: null };
    });
  });

  it('getPolicies should call correct endpoint', async () => {
    await policyAdminService.getPolicies();
    // expected: admin/system/policies
    // current: admin/system/system/policies (due to bug)
    expect(transport.get).toHaveBeenCalledWith('admin/system/policies', undefined);
  });

  it('getPolicy should call correct endpoint with type', async () => {
    await policyAdminService.getPolicy('privacy');
    expect(transport.get).toHaveBeenCalledWith('admin/system/policies/privacy', undefined);
  });

  it('updatePolicy should call correct endpoint with data', async () => {
    const data = { plcyTtl: 'Updated Title', plcyCn: 'Updated Content' };
    await policyAdminService.updatePolicy('privacy', data);
    expect(transport.put).toHaveBeenCalledWith('admin/system/policies/privacy', data, undefined);
  });

  it('createPolicy uses POST and cannot silently use the update upsert', async () => {
    const data = { plcyTtl: '새 정책', plcyCn: '새 본문' };
    await policyAdminService.createPolicy('INTERNAL', data);
    expect(transport.post).toHaveBeenCalledWith('admin/system/policies/INTERNAL', data, undefined);
    expect(transport.put).not.toHaveBeenCalled();
  });
});
