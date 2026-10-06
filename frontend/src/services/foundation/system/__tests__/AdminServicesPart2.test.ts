vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { bannerAdminService } from '../BannerAdminService';
import { communityAdminService } from '../CommunityAdminService';

const clientMocks = vi.hoisted(() => ({
 get: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
 default: {
 getRaw: async (...args: unknown[]) => ({
 success: true,
 code: 'S000',
 message: '성공',
 data: await clientMocks.get(...args),
 }),
 }
}));

describe('Admin System Services Part 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clientMocks.get.mockResolvedValue({
      list: [],
      total: 0,
      page: 0,
      size: 10,
      totalPage: 0,
    });
  });

  it('BannerAdminService should call correct endpoints', async () => {
    await bannerAdminService.getBannerList({ page: 1 });
    expect(clientMocks.get).toHaveBeenCalledWith('admin/system/banners', expect.objectContaining({
      params: expect.objectContaining({ page: 1, keyword: '' })
    }));
  });

  it('CommunityAdminService should call correct endpoints', async () => {
    await communityAdminService.getCommunityList({ page: 0 });
    expect(clientMocks.get).toHaveBeenCalledWith('admin/content/community', expect.objectContaining({
      params: expect.objectContaining({ 
        page: 0, 
        searchCnd: '',
        searchWrd: ''
      })
    }));
  });
});
