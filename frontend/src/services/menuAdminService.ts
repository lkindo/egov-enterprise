import client from '@/lib/api/client';
import { MenuInfo, MenuResponse } from '@/types/menu';

export const menuAdminService = {
  getMenus: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get<any>('/admin/menus', { params });
    return response;
  },

  getAllMenus: async () => {
    const response = await client.get<any>('/admin/menus/all');
    return response;
  },

  getMenu: async (id: number) => {
    const response = await client.get<any>(`/admin/menus/${id}`);
    return response;
  },

  createMenu: async (data: Partial<MenuInfo>) => {
    const response = await client.post('/admin/menus', data);
    return response;
  },

  updateMenu: async (id: number, data: Partial<MenuInfo>) => {
    const response = await client.put(`/admin/menus/${id}`, data);
    return response;
  },

  updateOrders: async (menus: MenuInfo[]) => {
    const response = await client.put('/admin/menus/batch-order', menus);
    return response;
  },

  deleteMenu: async (id: number) => {
    const response = await client.delete(`/admin/menus/${id}`);
    return response;
  }
};

