vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { menuAdminService } from '../MenuAdminService';

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

describe('MenuAdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(client.getRaw).mockResolvedValue({
      success: true,
      code: 'S000',
      message: '성공',
      data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
    });
    vi.mocked(client.requestRaw).mockResolvedValue({ success: true, code: 'S000', message: '성공' });
  });

  it('getMenuList should call correct API', async () => {
    await menuAdminService.getMenuList({ page: 1 });
    expect(client.getRaw).toHaveBeenCalledWith('admin/system/menus', expect.objectContaining({
      params: expect.objectContaining({ pageIndex: 2 }) 
    }));
  });
 
  it('createMenu should call post', async () => {
    const data = { menuNm: 'Test', menuOrdr: 1 };
    await menuAdminService.createMenu(data);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/menus',
      method: 'post',
      data,
    });
  });
 
  it('updateMenuOrder should call put', async () => {
    const data = [{ menuNo: 1, menuNm: 'Test', menuOrdr: 1 }];
    await menuAdminService.updateMenuOrder(data);
    expect(client.requestRaw).toHaveBeenCalledWith({
      url: 'admin/system/menus/batch-order',
      method: 'put',
      data,
      timeout: 120000,
    });
  });
});
