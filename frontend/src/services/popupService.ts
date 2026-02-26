import client from '@/lib/api/client';
import { Popup } from '@/types/banner';

export const popupService = {
  getPopups: async (params: { page?: number; size?: number; searchWrd?: string }, config?: any) => {
    return client.get<any>('/popups', { ...config, params });
  },

  getActivePopups: async (config?: any) => {
    return client.get<any>('/popups/active', config);
  },

  getPopup: async (popupId: string, config?: any) => {
    return client.get<any>(`/popups/${popupId}`, config);
  },

  createPopup: async (data: Popup, config?: any) => {
    return client.post('/popups', data, config);
  },

  updatePopup: async (popupId: string, data: Popup, config?: any) => {
    return client.put(`/popups/${popupId}`, data, config);
  },

  deletePopup: async (popupId: string, config?: any) => {
    return client.delete(`/popups/${popupId}`, config);
  }
};
