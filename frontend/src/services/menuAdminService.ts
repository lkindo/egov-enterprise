import client from '@/lib/api/client';
import { MenuInfo, MenuResponse } from '@/types/menu';

export const menuAdminService = {
  getMenus: async (params: { page?: number; size?: number; searchWrd?: string }, config?: any) => {
    return client.get<any>('/admin/system/menus', { ...config, params });
  },

  getAllMenus: async (config?: any) => {
    return client.get<any>('/admin/system/menus/all', config);
  },

  getMenu: async (id: number, config?: any) => {
    return client.get<any>(`/admin/system/menus/${id}`, config);
  },

  createMenu: async (data: Partial<MenuInfo>, config?: any) => {
    return client.post('/admin/system/menus', data, config);
  },

  updateMenu: async (id: number, data: Partial<MenuInfo>, config?: any) => {
    return client.put(`/admin/system/menus/${id}`, data, config);
  },

  updateOrders: async (menus: MenuInfo[], config?: any) => {
    return client.put('/admin/system/menus/batch-order', menus, config);
  },

  deleteMenu: async (id: number, config?: any) => {
    return client.delete(`/admin/system/menus/${id}`, config);
  }
};

