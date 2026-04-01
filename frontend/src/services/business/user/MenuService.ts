import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { MenuInfo } from '@/types/foundation/menu';

class MenuService extends ApiService {
  constructor() {
    super('/menus');
  }

  /**
   * GNB(Head) 硫붾돱 紐⑸줉 조회
   */
  async getHeadMenus(config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    try {
      const res = await this.get<{ list: MenuInfo[] }>('/head', config);
      return res?.list || [];
    } catch {
      console.warn('Failed to fetch head menus:', error);
      return [];
    }
  }

  /**
   * LNB(Left) 硫붾돱 紐⑸줉 조회 - ?곸쐞 硫붾돱 踰덊샇 湲곗?
   */
  async getLeftMenus(menuNo: number, config?: AxiosRequestConfig): Promise<MenuInfo[]> {
    try {
      const res = await this.get<{ list: MenuInfo[] }>(`/left?menuNo=${menuNo}`, config);
      return res?.list || [];
    } catch {
      console.warn('Failed to fetch left menus:', error);
      return [];
    }
  }
}

export const menuService = new MenuService();
