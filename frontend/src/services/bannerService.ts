import client from '@/lib/api/client';
import { Banner } from '@/types/banner';

export const bannerService = {
  /**
   * 배너 목록 조회 (Admin)
   */
  getBanners: async (params: { page?: number; size?: number; keyword?: string }) => {
    const response = await client.get('/banners', { params });
    return response.data;
  },

  /**
   * 반영된 배너 목록 조회 (전시용)
   */
  getReflectedBanners: async () => {
    const response = await client.get('/banners/reflected');
    return response.data;
  },

  /**
   * 배너 상세 조회
   */
  getBanner: async (bannerId: string) => {
    const response = await client.get(`/banners/${bannerId}`);
    return response.data;
  },

  /**
   * 배너 등록
   */
  createBanner: async (data: Banner) => {
    const response = await client.post('/banners', data);
    return response.data;
  },

  /**
   * 배너 수정
   */
  updateBanner: async (bannerId: string, data: Banner) => {
    const response = await client.put(`/banners/${bannerId}`, data);
    return response.data;
  },

  /**
   * 배너 삭제
   */
  deleteBanner: async (bannerId: string) => {
    const response = await client.delete(`/banners/${bannerId}`);
    return response.data;
  }
};
