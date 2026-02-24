import client from '@/lib/api/client';
import { Popup } from '@/types/banner';

export const popupService = {
  /**
   * ?앹뾽 紐⑸줉 議고쉶 (Admin)
   */
  getPopups: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/popups', { params });
    return response;
  },

  /**
   * ?쒖꽦 ?앹뾽 紐⑸줉 議고쉶 (?꾩떆??
   */
  getActivePopups: async () => {
    const response = await client.get('/popups/active');
    return response;
  },

  /**
   * ?앹뾽 ?곸꽭 議고쉶
   */
  getPopup: async (popupId: string) => {
    const response = await client.get(`/popups/${popupId}`);
    return response;
  },

  /**
   * ?앹뾽 ?깅줉
   */
  createPopup: async (data: Popup) => {
    const response = await client.post('/popups', data);
    return response;
  },

  /**
   * ?앹뾽 ?섏젙
   */
  updatePopup: async (popupId: string, data: Popup) => {
    const response = await client.put(`/popups/${popupId}`, data);
    return response;
  },

  /**
   * ?앹뾽 ??젣
   */
  deletePopup: async (popupId: string) => {
    const response = await client.delete(`/popups/${popupId}`);
    return response;
  }
};

