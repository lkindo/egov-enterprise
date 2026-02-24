import client from '@/lib/api/client';
import { MenuResponse } from '@/types/menu';

export const menuService = {
  /**
   * Get GNB (Head) menus
   */
  getHeadMenus: async () => {
    const response = await client.get<MenuResponse>('/menu/head');
    return response;
  },

  /**
   * Get LNB (Left) menus by parent menu number
   */
  getLeftMenus: async (menuNo: number) => {
    const response = await client.get<MenuResponse>(`/menu/left?menuNo=${menuNo}`);
    return response;
  }
};

