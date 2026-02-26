import client from '@/lib/api/client';
import { MenuInfo, MenuResponse } from '@/types/menu';

export const menuAdminService = {
  getMenus: async (params: { page?: number; size?: number; searchWrd?: string }, config?: any) => {
    return client.get<any>('/admin/menus', { ...config, params });
  },

  getAllMenus: async (config?: any) => {
    return client.get<any>('/admin/menus/all', config);
  },

  getMenu: async (id: number, config?: any) => {
    return client.get<any>(`/admin/menus/${id}`, config);
  },

  createMenu: async (data: Partial<MenuInfo>, config?: any) => {
    return client.post('/admin/menus', data, config);
  },

  updateMenu: async (id: number, data: Partial<MenuInfo>, config?: any) => {
    return client.put(`/admin/menus/${id}`, data, config);
  },

  updateOrders: async (menus: MenuInfo[], config?: any) => {
    return client.put('/admin/menus/batch-order', menus, config);
  },

  deleteMenu: async (id: number, config?: any) => {
    return client.delete(`/admin/menus/${id}`, config);
  }
};

