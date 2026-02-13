import client from '@/lib/api/client';
import { Banner, Popup } from '@/types/banner';

export const bannerService = {
  /**
   * 배너 목록 조회 (Admin)
   */
  getBanners: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/banners', { params });
    return response.data;
  },

  /**
   * 배너 등록
   */
  createBanner: async (data: FormData) => {
    const response = await client.post('/admin/banners', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  /**
   * 팝업 목록 조회 (Admin)
   */
  getPopups: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/popups', { params });
    return response.data;
  },

  /**
   * 팝업 설정 저장
   */
  savePopup: async (data: Partial<Popup>) => {
    const response = await client.post('/admin/popups', data);
    return response.data;
  }
};
