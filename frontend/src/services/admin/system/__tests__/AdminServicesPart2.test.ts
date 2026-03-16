import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { bannerAdminService } from '../BannerAdminService';
import { communityAdminService } from '../CommunityAdminService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('Admin System Services Part 2', () => {
  beforeEach(() => vi.clearAllMocks());

  it('BannerAdminService should call correct endpoints', async () => {
    await bannerAdminService.getBannerList({ page: 1 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/banners', expect.objectContaining({
      params: expect.objectContaining({ page: 1 })
    }));
  });

  it('CommunityAdminService should call correct endpoints', async () => {
    // CommunityAdminService uses AdminService which prepends /admin/system
    await communityAdminService.getCommunityList({ page: 0 });
    expect(client.get).toHaveBeenCalledWith('/admin/system/communities', expect.objectContaining({
      params: { page: 0 }
    }));
  });
});
