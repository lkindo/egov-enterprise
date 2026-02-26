import client from '@/lib/api/client';
import { Banner } from '@/types/banner';

export const bannerService = {
  getBanners: async (params: { page?: number; size?: number; keyword?: string }, config?: any) => {
    return client.get<any>('/banners', { ...config, params });
  },

  getReflectedBanners: async (config?: any) => {
    return client.get<any>('/banners/reflected', config);
  },

  getBanner: async (bannerId: string, config?: any) => {
    return client.get<any>(`/banners/${bannerId}`, config);
  },

  createBanner: async (data: Banner, config?: any) => {
    return client.post('/banners', data, config);
  },

  updateBanner: async (bannerId: string, data: Banner, config?: any) => {
    return client.put(`/banners/${bannerId}`, data, config);
  },

  deleteBanner: async (bannerId: string, config?: any) => {
    return client.delete(`/banners/${bannerId}`, config);
  }
};
