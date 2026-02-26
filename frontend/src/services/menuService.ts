import client from '@/lib/api/client';
import { MenuInfo } from '@/types/menu';

export const menuService = {
  /**
   * Get GNB (Head) menus
   */
  getHeadMenus: async (config?: any): Promise<MenuInfo[]> => {
    const response: any = await client.get('/menu/head', config);
    return response.list || [];
  },

  /**
   * Get LNB (Left) menus by parent menu number
   */
  getLeftMenus: async (menuNo: number, config?: any): Promise<MenuInfo[]> => {
    const response: any = await client.get(`/menu/left?menuNo=${menuNo}`, config);
    return response.list || [];
  }
};

