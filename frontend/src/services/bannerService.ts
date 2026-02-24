import client from '@/lib/api/client';
import { Banner } from '@/types/banner';

export const bannerService = {
  /**
   * 諛곕꼫 紐⑸줉 議고쉶 (Admin)
   */
  getBanners: async (params: { page?: number; size?: number; keyword?: string }) => {
    const response = await client.get('/banners', { params });
    return response;
  },

  /**
   * 諛섏쁺??諛곕꼫 紐⑸줉 議고쉶 (?꾩떆??
   */
  getReflectedBanners: async () => {
    const response = await client.get('/banners/reflected');
    return response;
  },

  /**
   * 諛곕꼫 ?곸꽭 議고쉶
   */
  getBanner: async (bannerId: string) => {
    const response = await client.get(`/banners/${bannerId}`);
    return response;
  },

  /**
   * 諛곕꼫 ?깅줉
   */
  createBanner: async (data: Banner) => {
    const response = await client.post('/banners', data);
    return response;
  },

  /**
   * 諛곕꼫 ?섏젙
   */
  updateBanner: async (bannerId: string, data: Banner) => {
    const response = await client.put(`/banners/${bannerId}`, data);
    return response;
  },

  /**
   * 諛곕꼫 ??젣
   */
  deleteBanner: async (bannerId: string) => {
    const response = await client.delete(`/banners/${bannerId}`);
    return response;
  }
};

