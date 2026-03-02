import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { codeAdminService } from '../CodeAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('CodeAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getClCodes should call correct API', async () => {
    (client.get as any).mockResolvedValue({ resultList: [] });
    await codeAdminService.getClCodes({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/codes/cl', { params: { page: 1 } });
  });

  it('createGroup should call post with data', async () => {
    const data = { codeId: 'GRP01', codeIdNm: 'Group 1' };
    await codeAdminService.createGroup(data as any);
    expect(client.post).toHaveBeenCalledWith('/admin/codes/cmmn', data);
  });

  it('updateDetail should call put with correct path', async () => {
    const data = { code: 'CD01', codeNm: 'Code 1' };
    await codeAdminService.updateDetail('GRP01', 'CD01', data as any);
    expect(client.put).toHaveBeenCalledWith('/admin/codes/detail/GRP01/CD01', data);
  });

  it('deleteClCode should call delete with id', async () => {
    await codeAdminService.deleteClCode('CL01');
    expect(client.delete).toHaveBeenCalledWith('/admin/codes/cl/CL01');
  });
});
