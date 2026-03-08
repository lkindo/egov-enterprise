import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { menuAdminService } from '../MenuAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('MenuAdminService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getMenuList should call correct API', async () => {
    await menuAdminService.getMenuList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/menus', { params: { page: 1 } });
  });

  it('createMenu should call post', async () => {
    const data = { menuNm: 'Test' };
    await menuAdminService.createMenu(data as any);
    expect(client.post).toHaveBeenCalledWith('/admin/system/menus', data, undefined);
  });

  it('updateMenuOrder should call put', async () => {
    const data = [{ menuNo: 1, sortOrdr: 1 }];
    await menuAdminService.updateMenuOrder(data as any);
    expect(client.put).toHaveBeenCalledWith('/admin/system/menus/batch-order', data, undefined);
  });
});
