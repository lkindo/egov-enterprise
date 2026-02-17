import client from '@/lib/api/client';
import { Popup } from '@/types/banner';

export const popupService = {
  /**
   * 팝업 목록 조회 (Admin)
   */
  getPopups: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/popups', { params });
    return response.data;
  },

  /**
   * 활성 팝업 목록 조회 (전시용)
   */
  getActivePopups: async () => {
    const response = await client.get('/popups/active');
    return response.data;
  },

  /**
   * 팝업 상세 조회
   */
  getPopup: async (popupId: string) => {
    const response = await client.get(`/popups/${popupId}`);
    return response.data;
  },

  /**
   * 팝업 등록
   */
  createPopup: async (data: Popup) => {
    const response = await client.post('/popups', data);
    return response.data;
  },

  /**
   * 팝업 수정
   */
  updatePopup: async (popupId: string, data: Popup) => {
    const response = await client.put(`/popups/${popupId}`, data);
    return response.data;
  },

  /**
   * 팝업 삭제
   */
  deletePopup: async (popupId: string) => {
    const response = await client.delete(`/popups/${popupId}`);
    return response.data;
  }
};
